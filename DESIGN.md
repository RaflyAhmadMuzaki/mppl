Panduan Desain Antarmuka (UI/UX) - Proyek MPPL

Dokumen ini berisi panduan standar visual dan tata letak antarmuka antarmuka pengguna (UI/UX). Tujuan dari dokumen ini adalah menjaga konsistensi tampilan, tata letak, dan responsivitas aplikasi tanpa mengubah fungsi atau alur bisnis yang telah ditetapkan.

1. Skema Warna (Color Palette)

Aplikasi menggunakan pendekatan warna netral dengan satu warna aksen utama agar antarmuka terlihat bersih, profesional, dan nyaman dibaca dalam waktu lama.

Warna Utama (Primary): #1E40AF (Deep Blue) - Digunakan untuk tombol aksi utama, header tabel, dan elemen aktif.

Warna Sekunder: #64748B (Slate Gray) - Digunakan untuk teks pendukung, border, dan elemen yang tidak dominan.

Latar Belakang (Background): #F8FAFC (Off-White) - Menjaga kontras layar agar tidak terlalu silau.

Permukaan (Card / Container): #FFFFFF (Pure White) - Digunakan sebagai latar panel data, form, dan kartu.

Indikator Status:

Sukses: #15803D (Green)

Peringatan: #B45309 (Amber)

Bahaya / Error: #B91C1C (Red)

Netral / Informasi: #0369A1 (Sky Blue)

2. Tipografi (Typography)

Penggunaan font diseragamkan memakai sistem font bawaan (system font stack) untuk menjaga performa rendering layar.

Font Family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.

Hierarki Ukuran Teks:

Judul Halaman (H1): 24px | Semi-Bold (font-weight: 600) | Line-height: 1.2

Judul Seksi / Modal (H2): 18px | Semi-Bold (font-weight: 600) | Line-height: 1.3

Sub-judul / Label Form (H3): 14px | Medium (font-weight: 500) | Line-height: 1.4

Teks Bodi / Isi Tabel: 14px | Regular (font-weight: 400) | Line-height: 1.5

Teks Keterangan (Caption / Badge): 12px | Regular (font-weight: 400)

3. Tata Letak & Spasi (Layout & Spacing)

Sistem menggunakan grid fleksibel berbasis 4px / 8px base grid untuk menjaga konsistensi jarak antar elemen.

Margin Utama Halaman: 24px pada layar desktop, 16px pada layar perangkat seluler.

Jarak Antar Elemen (Gap):

Antar komponen besar (Card/Panel): 16px - 24px.

Antar elemen internal (Input & Label, Tombol & Teks): 8px - 12px.

Ukuran Container Maksimal: 1280px (Centering alignment).

4. Standar Komponen UI

A. Tombol (Buttons)

Primary Button: Latar belakang warna utama (#1E40AF), teks putih. Digunakan hanya untuk satu aksi utama per area (misal: Simpan, Tambah Data).

Secondary Button: Latar belakang netral (#E2E8F0), teks (#334155). Digunakan untuk aksi sekunder (misal: Batal, Kembali).

Danger Button: Latar belakang merah (#B91C1C), teks putih. Digunakan khusus tindakan destruktif (misal: Hapus).

Ukuran Standar: Tinggi 38px - 40px, padding horizontal 16px, border-radius 6px.

B. Form & Input Field

Tampilan Standar: Border 1px solid (#CBD5E1), latar belakang putih, border-radius 6px, tinggi 38px.

Status Fokus (Focus State): Border berubah menjadi warna utama dengan efek outline ring samar 2px.

Pesan Error Input: Teks kecil (12px) berwarna merah tepat di bawah input field yang bersangkutan.

C. Tabel Data

Header Tabel: Latar belakang abu-abu terang (#F1F5F9), teks bold rata kiri, padding 12px 16px.

Baris Data: Padding 12px 16px, border bawah 1px solid (#E2E8F0).

Efek Hover: Warna baris berubah sedikit lebih gelap (#F8FAFC) saat kursor diarahkan ke atasnya.

D. Kartu Informasi (Cards)

Latar belakang putih, border solid 1px (#E2E8F0), tanpa box-shadow yang tebal (gunakan subtle shadow jika diperlukan).

Inner Padding: 16px hingga 20px.

5. Status Feedback & Responsivitas

State Interaktif:

Hover: Warna tombol / link menjadi sedikit lebih gelap (sekitar 10%).

Disabled: Warna elemen menjadi abu-abu pudar (#94A3B8), kursor berubah menjadi not-allowed, dan elemen tidak dapat diklik.

Loading: Tampilkan indikator spinner sederhana atau skeleton loader pada area yang sedang memproses data.

Penyesuaian Responsif (Mobile Breakdown):

Layar < 768px: Menu navigasi disembunyikan dalam tombol hamburger.

Tabel data pada layar kecil dapat di-scroll secara horizontal (overflow-x: auto) tanpa merusak layout utama halaman.

Layout kolom (grid 2/3 kolom) otomatis berubah menjadi 1 kolom vertikal.