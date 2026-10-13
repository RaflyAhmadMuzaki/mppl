import { normalizeLegacyReport } from './data-seed.js';

export const ADMIN_USERS = [
  {
    email: 'admin@simpel.go.id',
    nama: 'Ir. Hendy Kusuma',
    role: 'admin',
    nip: '19880412 201201 1 004',
    instansi: 'Dinas Lingkungan Hidup Kota'
  },
  {
    email: 'petugas.dlh@simpel.go.id',
    nama: 'Budi Santoso, S.T.',
    role: 'admin',
    nip: '19920815 201503 1 008',
    instansi: 'Suku Dinas Perkim & Kebersihan'
  }
];

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Server database mengirim respons yang tidak valid (${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(payload.error || `Permintaan database gagal (${response.status}).`);
  }
  return payload;
}

function getLegacyReports() {
  const stored = localStorage.getItem('simpel_reports');
  if (!stored) return [];

  try {
    const reports = JSON.parse(stored);
    if (!Array.isArray(reports)) {
      throw new Error('Format data laporan lama tidak valid.');
    }
    return reports.map(normalizeLegacyReport);
  } catch (error) {
    console.error('[SIMPEL] Data laporan lama tidak dapat dibaca:', error);
    throw new Error('Data laporan lama di browser rusak. Data lama tidak dihapus; periksa penyimpanan browser sebelum melanjutkan.');
  }
}

export async function loadReports() {
  const migrationKey = 'simpel_sqlite_legacy_reports_migrated';
  if (localStorage.getItem(migrationKey) !== 'true') {
    await apiRequest('/api/migrate/legacy-reports', {
      method: 'POST',
      body: JSON.stringify({ reports: getLegacyReports() })
    });
    localStorage.setItem(migrationKey, 'true');
  }

  const payload = await apiRequest('/api/reports');
  if (!Array.isArray(payload.reports)) {
    throw new Error('Server database tidak mengembalikan daftar laporan yang valid.');
  }
  return payload.reports;
}

export async function createReport(report) {
  const payload = await apiRequest('/api/reports', {
    method: 'POST',
    body: JSON.stringify(report)
  });
  return payload.report;
}

export async function updateReport(reportId, status, catatanPetugas) {
  const payload = await apiRequest(`/api/reports/${encodeURIComponent(reportId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, catatanPetugas })
  });
  return payload.report;
}
