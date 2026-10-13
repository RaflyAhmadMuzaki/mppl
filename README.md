# SIMPEL

## Menjalankan aplikasi dengan database lokal

1. Install dependencies sekali dengan `npm install`.
2. Jalankan `npm run dev`.
3. Buka alamat Vite yang tampil di terminal (umumnya `http://127.0.0.1:5173`).
4. Hentikan server dengan `Ctrl+C` setelah selesai.

Perintah tersebut menjalankan API Node.js dan Vite. API hanya mendengarkan di
`127.0.0.1`; aplikasi dan database ini hanya tersedia di komputer yang
menjalankannya, bukan layanan online atau penyimpanan bersama antarperangkat.

## Penyimpanan dan pencadangan

Laporan, foto laporan, status, serta riwayat perubahan status disimpan secara
permanen di `data/simpel.sqlite`. File itu dibuat otomatis dan sengaja
dikecualikan dari Git. Data tidak memiliki masa kedaluwarsa, tetapi dapat hilang
jika file database terhapus, disk rusak, atau komputer hilang.

Untuk mencadangkan data, hentikan `npm run dev`, lalu salin
`data/simpel.sqlite` ke media penyimpanan aman. Simpan cadangan di luar folder
Git/repository; file database dapat berisi data pribadi dan foto pelapor.
Untuk pemulihan, hentikan aplikasi dan kembalikan salinan ke lokasi tersebut.

Pada kunjungan pertama setelah pembaruan, laporan yang sebelumnya tersimpan di
`localStorage` browser akan dipindahkan satu kali ke SQLite. Data browser lama
tidak dihapus otomatis. Setelah pemindahan, buka aplikasi menggunakan alamat
lokal Vite yang sama agar permintaan API diproksikan ke server lokal.

Login masyarakat/admin dan OTP masih memakai mekanisme frontend yang sudah
ada. Database lokal ini ditujukan untuk demo satu komputer; autentikasi dan API
belum dirancang sebagai layanan produksi yang aman untuk diakses publik.
