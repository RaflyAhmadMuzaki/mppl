import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DATABASE_PATH = resolve(
  process.env.SIMPEL_DATABASE_PATH || resolve(PROJECT_ROOT, 'data', 'simpel.sqlite')
);

export function openDatabase(databasePath = DATABASE_PATH) {
  mkdirSync(dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = FULL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      judul TEXT NOT NULL,
      kategori TEXT NOT NULL,
      wilayah TEXT NOT NULL,
      alamat TEXT NOT NULL,
      lat REAL NOT NULL CHECK (lat BETWEEN -90 AND 90),
      lng REAL NOT NULL CHECK (lng BETWEEN -180 AND 180),
      deskripsi TEXT NOT NULL,
      foto TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('Menunggu Verifikasi', 'Diproses', 'Selesai', 'Ditolak')),
      tanggal TEXT NOT NULL,
      pelapor TEXT NOT NULL,
      emailPelapor TEXT NOT NULL,
      catatanPetugas TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS report_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      status_sebelumnya TEXT NOT NULL,
      status_baru TEXT NOT NULL,
      catatan TEXT NOT NULL DEFAULT '',
      diubah_oleh TEXT NOT NULL DEFAULT 'Petugas',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
  `);

  const reportColumns = db.pragma('table_info(reports)');
  if (!reportColumns.some(column => column.name === 'completed_at')) {
    db.exec('ALTER TABLE reports ADD COLUMN completed_at TEXT');
  }
  db.exec(`
    UPDATE reports
    SET completed_at = updated_at
    WHERE status = 'Selesai' AND completed_at IS NULL
  `);

  return db;
}

export function serializeReport(row) {
  if (!row) return null;
  return {
    id: row.id,
    judul: row.judul,
    kategori: row.kategori,
    wilayah: row.wilayah,
    alamat: row.alamat,
    lat: row.lat,
    lng: row.lng,
    deskripsi: row.deskripsi,
    foto: row.foto,
    status: row.status,
    tanggal: row.tanggal,
    pelapor: row.pelapor,
    emailPelapor: row.emailPelapor,
    catatanPetugas: row.catatanPetugas
  };
}

export function validateReport(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Data laporan tidak valid.');
  }

  const requiredTextFields = [
    ['id', 80],
    ['judul', 180],
    ['kategori', 100],
    ['wilayah', 180],
    ['alamat', 1000],
    ['deskripsi', 5000],
    ['tanggal', 40],
    ['pelapor', 180],
    ['emailPelapor', 254]
  ];
  const report = {};
  for (const [field, maxLength] of requiredTextFields) {
    const value = input[field];
    if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
      throw new Error(`Kolom ${field} wajib diisi dan maksimal ${maxLength} karakter.`);
    }
    report[field] = value.trim();
  }

  report.lat = Number(input.lat);
  report.lng = Number(input.lng);
  if (!Number.isFinite(report.lat) || report.lat < -90 || report.lat > 90
      || !Number.isFinite(report.lng) || report.lng < -180 || report.lng > 180) {
    throw new Error('Koordinat lokasi laporan tidak valid.');
  }

  if (typeof input.foto !== 'string' || input.foto.length > 12_000_000) {
    throw new Error('Foto laporan tidak valid atau ukurannya terlalu besar.');
  }
  report.foto = input.foto;
  report.status = input.status || 'Menunggu Verifikasi';
  if (!['Menunggu Verifikasi', 'Diproses', 'Selesai', 'Ditolak'].includes(report.status)) {
    throw new Error('Status laporan tidak valid.');
  }
  report.catatanPetugas = typeof input.catatanPetugas === 'string'
    ? input.catatanPetugas.trim().slice(0, 2000)
    : '';
  return report;
}
