export const INITIAL_REPORTS = [
  {
    id: 'LAP-2026-001',
    judul: 'Tumpukan Sampah Liar Menggangu Jalan',
    kategori: 'Sampah',
    wilayah: 'Jakarta',
    alamat: 'Area permukiman, Jakarta',
    lat: -6.2088,
    lng: 106.8456,
    deskripsi: 'Tumpukan sampah rumah tangga meluber ke pinggir jalan utama sejak 3 hari lalu. Menimbulkan bau tidak sedap dan kerumunan lalat.',
    foto: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
    status: 'Menunggu Verifikasi',
    tanggal: '2026-10-04 09:15',
    pelapor: 'Ahmad Subagja',
    emailPelapor: 'ahmad.subagja@gmail.com',
    catatanPetugas: 'Laporan baru masuk, menunggu penugasan verifikator dari Dinas Lingkungan Hidup.'
  },
  {
    id: 'LAP-2026-002',
    judul: 'Kerusakan Jalan & Drainase Tersumbat',
    kategori: 'Jalan & Fasilitas',
    wilayah: 'Jakarta',
    alamat: 'Kawasan permukiman, Jakarta',
    lat: -6.185,
    lng: 106.82,
    deskripsi: 'Jalan berlubang cukup dalam disertai genangan air akibat drainase tersumbat limbah pabrik ringan.',
    foto: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    status: 'Diproses',
    tanggal: '2026-10-03 14:30',
    pelapor: 'Nabilah Safawani',
    emailPelapor: 'nabilah.safawani@gmail.com',
    catatanPetugas: 'Tim Lapangan PU & Perkim telah diterjunkan ke lokasi untuk penyedotan air dan pembersihan gorong-gorong.'
  },
  {
    id: 'LAP-2026-003',
    judul: 'Pencemaran Limbah Cair Keruh di Bantaran Sungai',
    kategori: 'Air & Drainase',
    wilayah: 'Sungai Ciliwung, Jakarta',
    alamat: 'Bantaran Sungai Ciliwung, Jakarta',
    lat: -6.225,
    lng: 106.85,
    deskripsi: 'Terlihat cairan hitam dan berbuih mengalir dari pipa pembuangan tak berizin menuju ke aliran sungai.',
    foto: 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&w=600&q=80',
    status: 'Selesai',
    tanggal: '2026-10-02 11:00',
    pelapor: 'Rafly Ahmad',
    emailPelapor: 'rafly.ahmad@gmail.com',
    catatanPetugas: 'Penutupan saluran limbah ilegal selesai dilaksanakan oleh Dinas LH & Satpol PP. Sampel air telah diuji di lab.'
  },
  {
    id: 'LAP-2026-004',
    judul: 'Pohon Lapuk Berbahaya di Taman Kota',
    kategori: 'Ruang Terbuka',
    wilayah: 'Jakarta',
    alamat: 'Taman kota, Jakarta',
    lat: -6.215,
    lng: 106.83,
    deskripsi: 'Pohon besar rantingnya sudah miring dan hampir roboh ke wahana bermain anak. Mohon segera dipangkas.',
    foto: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80',
    status: 'Diproses',
    tanggal: '2026-10-04 08:00',
    pelapor: 'Raihan Fadhila',
    emailPelapor: 'raihan.fadhila@gmail.com',
    catatanPetugas: 'Jadwal pemangkasan oleh Dinas Pertamanan jam 13:00 WIB.'
  },
  {
    id: 'LAP-2026-005',
    judul: 'Lampu Penerangan Jalan Umum (PJU) Mati Total',
    kategori: 'Lainnya',
    wilayah: 'Jakarta',
    alamat: 'Jalan lingkungan, Jakarta',
    lat: -6.198,
    lng: 106.86,
    deskripsi: 'Sebanyak 4 tiang lampu jalan mati sejak seminggu lalu. Rawan kejahatan pada malam hari.',
    foto: '',
    status: 'Menunggu Verifikasi',
    tanggal: '2026-10-04 10:20',
    pelapor: 'Qoisy Ahmad',
    emailPelapor: 'qoisy.ahmad@gmail.com',
    catatanPetugas: 'Telah diterima, menunggu verifikasi suku dinas Perhubungan/Dishub.'
  }
];

const LEGACY_CATEGORY_LABELS = {
  'Pakisi Utara': 'Jalan & Fasilitas',
  'Pakisi Air': 'Air & Drainase'
};

const LEGACY_REGION_LABELS = {
  'Pakisi Utara': 'Jakarta',
  'Pakisi Air': 'Jakarta',
  'Pulau Jabra': 'Jakarta'
};

const LEGACY_ADDRESS_LABELS = {
  'Jl. Mereka No. 10, RT 04/RW 02': 'Area permukiman, Jakarta',
  'Kawasan Industri Pulau Jabra Blok C2': 'Kawasan permukiman, Jakarta',
  'Bantaran Sungai Ciliwung RT 01/RW 05': 'Bantaran Sungai Ciliwung, Jakarta',
  'Area Bermain Taman Kota Utama': 'Taman kota, Jakarta',
  'Jl. Pemuda No. 45': 'Jalan lingkungan, Jakarta'
};

const LEGACY_STICK_PHOTO = 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80';

export function normalizeLegacyReport(report) {
  return {
    ...report,
    kategori: LEGACY_CATEGORY_LABELS[report.kategori] || report.kategori,
    wilayah: LEGACY_REGION_LABELS[report.wilayah] || report.wilayah,
    alamat: LEGACY_ADDRESS_LABELS[report.alamat] || report.alamat,
    foto: report.id === 'LAP-2026-005' && report.foto === LEGACY_STICK_PHOTO ? '' : report.foto
  };
}
