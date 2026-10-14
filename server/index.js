import { createServer } from 'node:http';
import { openDatabase, serializeReport, validateReport } from './database.js';
import { INITIAL_REPORTS } from '../src/js/data-seed.js';

const HOST = '127.0.0.1';
const PORT = Number(process.env.API_PORT || 3001);
const MAX_BODY_BYTES = 13 * 1024 * 1024;
const db = openDatabase();

const selectAllReports = db.prepare('SELECT * FROM reports ORDER BY created_at DESC, id DESC');
const selectReport = db.prepare('SELECT * FROM reports WHERE id = ?');
const insertReport = db.prepare(`
  INSERT INTO reports (
    id, judul, kategori, wilayah, alamat, lat, lng, deskripsi, foto,
    status, tanggal, pelapor, emailPelapor, catatanPetugas, completed_at
  ) VALUES (
    @id, @judul, @kategori, @wilayah, @alamat, @lat, @lng, @deskripsi, @foto,
    @status, @tanggal, @pelapor, @emailPelapor, @catatanPetugas,
    CASE WHEN @status = 'Selesai' THEN CURRENT_TIMESTAMP ELSE NULL END
  )
`);
const updateReport = db.prepare(`
  UPDATE reports
  SET status = @status,
      catatanPetugas = @catatanPetugas,
      updated_at = CURRENT_TIMESTAMP,
      completed_at = CASE
        WHEN @status = 'Selesai' THEN COALESCE(completed_at, CURRENT_TIMESTAMP)
        ELSE NULL
      END
  WHERE id = @id
`);
const deleteExpiredReports = db.prepare(`
  DELETE FROM reports
  WHERE status = 'Selesai'
    AND completed_at <= datetime('now', '-24 hours')
`);
const insertHistory = db.prepare(`
  INSERT INTO report_status_history (report_id, status_sebelumnya, status_baru, catatan)
  VALUES (@id, @statusSebelumnya, @statusBaru, @catatan)
`);
const getMetadata = db.prepare('SELECT value FROM app_metadata WHERE key = ?');
const setMetadata = db.prepare(`
  INSERT INTO app_metadata (key, value) VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error('Ukuran permintaan terlalu besar.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('Format JSON tidak valid.');
    error.statusCode = 400;
    throw error;
  }
}

function listReports(response) {
  deleteExpiredReports.run();
  sendJson(response, 200, { reports: selectAllReports.all().map(serializeReport) });
}

function createReport(response, input) {
  const report = validateReport(input);
  try {
    insertReport.run(report);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' || error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      sendJson(response, 409, { error: 'ID laporan sudah digunakan. Silakan kirim ulang laporan.' });
      return;
    }
    throw error;
  }
  sendJson(response, 201, { report: serializeReport(selectReport.get(report.id)) });
}

function changeReport(response, reportId, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Object.assign(new Error('Data perubahan status tidak valid.'), { statusCode: 400 });
  }
  const status = input.status;
  const catatanPetugas = input.catatanPetugas;
  const validStatuses = ['Menunggu Verifikasi', 'Diproses', 'Selesai', 'Ditolak'];
  if (!validStatuses.includes(status) || typeof catatanPetugas !== 'string' || catatanPetugas.length > 2000) {
    throw Object.assign(new Error('Status atau catatan petugas tidak valid.'), { statusCode: 400 });
  }
  const current = selectReport.get(reportId);
  if (!current) {
    sendJson(response, 404, { error: 'Laporan tidak ditemukan.' });
    return;
  }

  const transaction = db.transaction(() => {
    updateReport.run({ id: reportId, status, catatanPetugas: catatanPetugas.trim() });
    if (current.status !== status || current.catatanPetugas !== catatanPetugas.trim()) {
      insertHistory.run({
        id: reportId,
        statusSebelumnya: current.status,
        statusBaru: status,
        catatan: catatanPetugas.trim()
      });
    }
  });
  transaction();
  sendJson(response, 200, { report: serializeReport(selectReport.get(reportId)) });
}

function migrateLegacyReports(response, input) {
  if (getMetadata.get('legacy_reports_migrated')) {
    sendJson(response, 200, { migrated: false, reason: 'already-migrated' });
    return;
  }
  if (!input || !Array.isArray(input.reports)) {
    throw Object.assign(new Error('Daftar laporan lama tidak valid.'), { statusCode: 400 });
  }
  if (input.reports.length > 1000) {
    throw Object.assign(new Error('Jumlah laporan lama melebihi batas.'), { statusCode: 400 });
  }

  const reports = input.reports.map(validateReport);
  const transaction = db.transaction(() => {
    const reportsToImport = reports.length === 0
      && selectAllReports.all().length === 0
      ? INITIAL_REPORTS.map(validateReport)
      : reports;
    for (const report of reportsToImport) {
      insertReport.run(report);
    }
    setMetadata.run('legacy_reports_migrated', new Date().toISOString());
    return reportsToImport.length;
  });
  try {
    const migrated = transaction();
    sendJson(response, 200, { migrated });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' || error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      sendJson(response, 409, { error: 'Migrasi dihentikan karena ID laporan lama bertabrakan dengan data SQLite.' });
      return;
    }
    throw error;
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${HOST}:${PORT}`);
  try {
    if (request.method === 'GET' && url.pathname === '/api/health') {
      sendJson(response, 200, { status: 'ok', database: 'connected' });
      return;
    }
    if (request.method === 'GET' && url.pathname === '/api/reports') {
      listReports(response);
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/reports') {
      createReport(response, await readJson(request));
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/migrate/legacy-reports') {
      migrateLegacyReports(response, await readJson(request));
      return;
    }
    const reportMatch = url.pathname.match(/^\/api\/reports\/([^/]+)$/);
    if (request.method === 'PATCH' && reportMatch) {
      changeReport(response, decodeURIComponent(reportMatch[1]), await readJson(request));
      return;
    }
    sendJson(response, 404, { error: 'Endpoint tidak ditemukan.' });
  } catch (error) {
    const statusCode = error.statusCode || (error.message?.startsWith('Kolom ') || error.message?.includes('valid') || error.message?.includes('Koordinat') || error.message?.includes('Foto laporan') ? 400 : 500);
    if (statusCode >= 500) console.error('[SIMPEL API] Permintaan gagal:', error);
    sendJson(response, statusCode, { error: statusCode >= 500 ? 'Terjadi kesalahan saat mengakses database lokal.' : error.message });
  }
});

deleteExpiredReports.run();
const reportCleanupInterval = setInterval(() => {
  try {
    deleteExpiredReports.run();
  } catch (error) {
    console.error('[SIMPEL API] Gagal menghapus laporan selesai yang kedaluwarsa:', error);
  }
}, 60_000);
reportCleanupInterval.unref();

server.listen(PORT, HOST, () => {
  console.log(`[SIMPEL API] SQLite tersambung di ${HOST}:${PORT}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
