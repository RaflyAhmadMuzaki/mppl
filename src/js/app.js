import { loadReports, createReport, updateReport } from './data.js';
import { getCurrentUser, logoutUser, sendOTP, verifyOTP, getMailInbox, loginAdminWithPassword, cancelPendingOTP } from './auth.js';
import { initPickerMap, locateUser, searchLocation, initDistributionMap } from './map.js';
import { renderCharts } from './charts.js';
import { initPWA } from './pwa.js';

let reports = [];
let selectedLat = null;
let selectedLng = null;
let selectedAddress = '';
let selectedRegion = '';
let selectedAccuracy = null;
let currentImageBase64 = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize PWA Service Worker
  initPWA();

  try {
    reports = await loadReports();
  } catch (error) {
    showDatabaseError(error);
  }

  // 2. Setup Auth Gate & 3D Flip Card
  setupAuthGate();

  // 3. Render Initial Reports & Charts
  renderReportsList();
  renderAdminTable();

  // 4. Setup Form & Event Handlers
  setupFormHandlers();
  setupInboxModalHandlers();
});

export function openAuthGate(mode = 'masyarakat', reason = '') {
  const authGate = document.getElementById('auth-gate-screen');
  const cardInner = document.getElementById('flip-card-container');
  const backAdminMode = document.getElementById('card-back-admin-mode');
  const backRegisterMode = document.getElementById('card-back-register-mode');
  const reasonBadge = document.getElementById('gate-reason-badge');

  if (!authGate) return;

  if (reason && reasonBadge) {
    reasonBadge.textContent = reason;
    reasonBadge.classList.remove('hidden');
  } else if (reasonBadge) {
    reasonBadge.classList.add('hidden');
  }

  if (mode === 'admin') {
    if (backAdminMode) backAdminMode.classList.remove('hidden');
    if (backRegisterMode) backRegisterMode.classList.add('hidden');
    if (cardInner) cardInner.classList.add('flipped');
  } else {
    if (cardInner) cardInner.classList.remove('flipped');
  }

  authGate.classList.remove('hidden');
}

export function closeAuthGate() {
  const authGate = document.getElementById('auth-gate-screen');
  if (authGate) authGate.classList.add('hidden');
}

// Auth Gate locking & unlocking
function checkAuthGate() {
  const user = getCurrentUser();
  const authGate = document.getElementById('auth-gate-screen');
  const appWrapper = document.getElementById('main-app-wrapper');

  if (appWrapper) appWrapper.classList.remove('hidden');
  updateAuthUI();

  if (user) {
    if (authGate) authGate.classList.add('hidden');
    updateRoleViews(user.role);
    renderAdminTable();
  } else {
    // Mode Tamu: web langsung bisa dijelajahi tanpa wajib login
    updateRoleViews('masyarakat');
    renderAdminTable();
  }

  requestAnimationFrame(() => {
    initPickerMap(updateSelectedLocation);
    initDistributionMap(reports, 'All');
    renderCharts(reports);
  });
}

// Update Header User UI
function updateAuthUI() {
  const user = getCurrentUser();
  const userBadge = document.getElementById('user-profile-badge');
  const userNameEl = document.getElementById('user-name-text');
  const userRoleEl = document.getElementById('user-role-text');
  const btnOpenLogin = document.getElementById('btn-open-login');
  const guestFormNotice = document.getElementById('guest-form-notice');

  if (user) {
    if (userBadge) userBadge.classList.remove('hidden');
    if (btnOpenLogin) btnOpenLogin.classList.add('hidden');
    if (guestFormNotice) guestFormNotice.classList.add('hidden');
    if (userNameEl) userNameEl.textContent = user.nama || user.email;
    if (userRoleEl) userRoleEl.textContent = user.role === 'admin' ? 'Petugas Admin' : 'Masyarakat';
  } else {
    if (userBadge) userBadge.classList.add('hidden');
    if (btnOpenLogin) btnOpenLogin.classList.remove('hidden');
    if (guestFormNotice) guestFormNotice.classList.remove('hidden');
  }
}

// Setup 3D Flip Card & Auth Logic
function setupAuthGate() {
  checkAuthGate();

  const authGate = document.getElementById('auth-gate-screen');
  const cardInner = document.getElementById('flip-card-container');
  const backAdminMode = document.getElementById('card-back-admin-mode');
  const backRegisterMode = document.getElementById('card-back-register-mode');

  // Modal Close Handlers
  const btnCloseFront = document.getElementById('btn-close-gate-front');
  const btnCloseBack = document.getElementById('btn-close-gate-back');
  if (btnCloseFront) btnCloseFront.onclick = () => closeAuthGate();
  if (btnCloseBack) btnCloseBack.onclick = () => closeAuthGate();

  if (authGate) {
    authGate.addEventListener('click', (e) => {
      if (e.target === authGate) closeAuthGate();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && authGate && !authGate.classList.contains('hidden')) {
      closeAuthGate();
    }
  });

  // Header Login Button
  const btnOpenLogin = document.getElementById('btn-open-login');
  if (btnOpenLogin) {
    btnOpenLogin.onclick = () => openAuthGate('masyarakat');
  }

  // Notice Banner Button in Form
  const btnLoginFromForm = document.getElementById('btn-login-from-form');
  if (btnLoginFromForm) {
    btnLoginFromForm.onclick = () => openAuthGate('masyarakat', 'Silakan masuk untuk menyampaikan pengaduan resmi.');
  }

  // Hero Sampaikan Aduan Button (prompts login if not authenticated)
  const btnHeroLapor = document.getElementById('btn-hero-lapor');
  if (btnHeroLapor) {
    btnHeroLapor.addEventListener('click', (e) => {
      const user = getCurrentUser();
      if (!user) {
        e.preventDefault();
        openAuthGate('masyarakat', 'Silakan masuk terlebih dahulu untuk menyampaikan aduan.');
        showToast('Login Diperlukan', 'Silakan login terlebih dahulu untuk menyampaikan aduan.');
      }
    });
  }

  // Main Nav "Buat Laporan" Link (prompts login if not authenticated)
  const navUserForm = document.querySelector('nav a[href="#section-user-form"]');
  if (navUserForm) {
    navUserForm.addEventListener('click', (e) => {
      const user = getCurrentUser();
      if (!user) {
        e.preventDefault();
        openAuthGate('masyarakat', 'Silakan masuk terlebih dahulu untuk membuat laporan pengaduan.');
        showToast('Login Diperlukan', 'Silakan login terlebih dahulu untuk membuat laporan pengaduan.');
      }
    });
  }

  // 1. Flip to Admin Mode
  const btnFlipAdmin = document.getElementById('btn-flip-to-admin');
  if (btnFlipAdmin) {
    btnFlipAdmin.onclick = () => {
      backAdminMode.classList.remove('hidden');
      backRegisterMode.classList.add('hidden');
      cardInner.classList.add('flipped');
    };
  }

  // 2. Flip to Register Mode
  const btnFlipRegister = document.getElementById('btn-flip-to-register');
  if (btnFlipRegister) {
    btnFlipRegister.onclick = () => {
      backRegisterMode.classList.remove('hidden');
      backAdminMode.classList.add('hidden');
      cardInner.classList.add('flipped');
    };
  }

  // 3. Flip Back to Front (Masyarakat Login)
  const btnFlipBack1 = document.getElementById('btn-flip-back-to-masyarakat-from-admin');
  const btnFlipBack2 = document.getElementById('btn-flip-back-to-masyarakat-from-reg');

  if (btnFlipBack1) btnFlipBack1.onclick = () => cardInner.classList.remove('flipped');
  if (btnFlipBack2) btnFlipBack2.onclick = () => cardInner.classList.remove('flipped');

  const backToEmailMasyarakat = document.getElementById('btn-gate-back-to-email-masyarakat');
  if (backToEmailMasyarakat) {
    backToEmailMasyarakat.onclick = () => {
      cancelPendingOTP();
      document.getElementById('gate-front-step2').classList.add('hidden');
      document.getElementById('gate-front-step1').classList.remove('hidden');
      document.getElementById('gate-masyarakat-otp-input').value = '';
      document.getElementById('gate-masyarakat-email').focus();
    };
  }

  const backToEmailRegister = document.getElementById('btn-gate-back-to-email-reg');
  if (backToEmailRegister) {
    backToEmailRegister.onclick = () => {
      cancelPendingOTP();
      document.getElementById('gate-reg-step2').classList.add('hidden');
      document.getElementById('gate-reg-step1').classList.remove('hidden');
      document.getElementById('gate-reg-otp-input').value = '';
      document.getElementById('reg-email').focus();
    };
  }

  // Admin Demo Selector change listener
  const adminSelector = document.getElementById('admin-demo-selector');
  const adminEmailInput = document.getElementById('gate-admin-email');
  if (adminSelector && adminEmailInput) {
    adminSelector.addEventListener('change', (e) => {
      adminEmailInput.value = e.target.value;
    });
  }

  // --- OTP Flow 1: Login Masyarakat (Front) ---
  const btnSendOTPMasy = document.getElementById('btn-gate-send-otp-masyarakat');
  if (btnSendOTPMasy) {
    btnSendOTPMasy.onclick = async () => {
      const email = document.getElementById('gate-masyarakat-email').value.trim();
      const nama = document.getElementById('gate-masyarakat-nama').value.trim();

      try {
        btnSendOTPMasy.disabled = true;
        btnSendOTPMasy.textContent = "Mengirim OTP ke Email...";
        await sendOTP(email, nama);
        
        document.getElementById('gate-front-step1').classList.add('hidden');
        document.getElementById('gate-front-step2').classList.remove('hidden');
        document.getElementById('gate-masyarakat-target-email').textContent = email;
        btnSendOTPMasy.disabled = false;
        btnSendOTPMasy.textContent = "Kirim Kode OTP Ke Email";
      } catch (err) {
        alert(err.message);
        btnSendOTPMasy.disabled = false;
        btnSendOTPMasy.textContent = "Kirim Kode OTP Ke Email";
      }
    };
  }

  const btnVerifyOTPMasy = document.getElementById('btn-gate-verify-otp-masyarakat');
  if (btnVerifyOTPMasy) {
    btnVerifyOTPMasy.onclick = () => {
      const code = document.getElementById('gate-masyarakat-otp-input').value.trim();
      try {
        const res = verifyOTP(code);
        if (res.success) {
          checkAuthGate();
          showToast(`Selamat Datang, ${res.user.nama}!`, "Berhasil masuk ke SIMPEL sebagai Masyarakat.");
        }
      } catch (err) {
        alert(err.message);
      }
    };
  }

  const btnResendOTPMasy = document.getElementById('btn-gate-resend-otp-masyarakat');
  if (btnResendOTPMasy) {
    btnResendOTPMasy.onclick = async () => {
      const email = document.getElementById('gate-masyarakat-email').value.trim();
      const nama = document.getElementById('gate-masyarakat-nama').value.trim();
      try {
        btnResendOTPMasy.disabled = true;
        await sendOTP(email, nama);
        showToast('Kode OTP Dikirim Ulang', `Periksa email ${email} untuk kode terbaru.`);
      } catch (err) {
        alert(err.message);
      } finally {
        btnResendOTPMasy.disabled = false;
      }
    };
  }

  // --- Password Login: Petugas Admin (Back Mode A) ---
  const btnToggleAdminPwd = document.getElementById('btn-toggle-admin-pwd');
  const adminPwdInput = document.getElementById('gate-admin-password');
  if (btnToggleAdminPwd && adminPwdInput) {
    btnToggleAdminPwd.onclick = () => {
      adminPwdInput.type = adminPwdInput.type === 'password' ? 'text' : 'password';
    };
  }

  const btnLoginAdmin = document.getElementById('btn-gate-login-admin');
  if (btnLoginAdmin) {
    btnLoginAdmin.onclick = () => {
      const email = document.getElementById('gate-admin-email').value.trim();
      const password = adminPwdInput ? adminPwdInput.value : '';

      try {
        const res = loginAdminWithPassword(email, password);
        if (res.success) {
          checkAuthGate();
          showToast(`Akses Petugas Diberikan: ${res.user.nama}`, "Selamat bertugas di Portal Admin SIMPEL.");
        }
      } catch (err) {
        alert(err.message);
      }
    };
  }

  // --- OTP Flow 3: Registrasi Masyarakat (Back Mode B) ---
  const btnSendOTPReg = document.getElementById('btn-gate-send-otp-reg');
  if (btnSendOTPReg) {
    btnSendOTPReg.onclick = async () => {
      const email = document.getElementById('reg-email').value.trim();
      const nama = document.getElementById('reg-nama').value.trim();
      try {
        btnSendOTPReg.disabled = true;
        btnSendOTPReg.textContent = "Mengirim OTP...";
        await sendOTP(email, nama);
        
        document.getElementById('gate-reg-step1').classList.add('hidden');
        document.getElementById('gate-reg-step2').classList.remove('hidden');
        document.getElementById('gate-reg-target-email').textContent = email;
        btnSendOTPReg.disabled = false;
        btnSendOTPReg.textContent = "Kirim Kode OTP Registrasi";
      } catch (err) {
        alert(err.message);
        btnSendOTPReg.disabled = false;
        btnSendOTPReg.textContent = "Kirim Kode OTP Registrasi";
      }
    };
  }

  const btnVerifyOTPReg = document.getElementById('btn-gate-verify-otp-reg');
  if (btnVerifyOTPReg) {
    btnVerifyOTPReg.onclick = () => {
      const code = document.getElementById('gate-reg-otp-input').value.trim();
      try {
        const res = verifyOTP(code);
        if (res.success) {
          checkAuthGate();
          showToast("Registrasi Berhasil!", `Akun ${res.user.nama} berhasil dibuat.`);
        }
      } catch (err) {
        alert(err.message);
      }
    };
  }

  const btnResendOTPReg = document.getElementById('btn-gate-resend-otp-reg');
  if (btnResendOTPReg) {
    btnResendOTPReg.onclick = async () => {
      const email = document.getElementById('reg-email').value.trim();
      const nama = document.getElementById('reg-nama').value.trim();
      try {
        btnResendOTPReg.disabled = true;
        await sendOTP(email, nama);
        showToast('Kode OTP Dikirim Ulang', `Periksa email ${email} untuk kode terbaru.`);
      } catch (err) {
        alert(err.message);
      } finally {
        btnResendOTPReg.disabled = false;
      }
    };
  }

  // Logout Handler
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      logoutUser();
      checkAuthGate();
      showToast("Anda Telah Keluar", "Silakan login kembali untuk mengakses SIMPEL.");
    };
  }

  const navigationButton = document.getElementById('btn-toggle-navigation');
  const navigation = document.getElementById('main-navigation');
  if (navigationButton && navigation) {
    navigationButton.addEventListener('click', () => {
      const isOpen = navigation.classList.toggle('is-open');
      navigationButton.setAttribute('aria-expanded', String(isOpen));
      navigationButton.setAttribute('aria-label', isOpen ? 'Tutup navigasi' : 'Buka navigasi');
      const icon = navigationButton.querySelector('.nav-toggle-icon');
      if (icon) icon.textContent = isOpen ? '✕' : '☰';
    });

    navigation.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navigation.classList.remove('is-open');
        navigationButton.setAttribute('aria-expanded', 'false');
        navigationButton.setAttribute('aria-label', 'Buka navigasi');
        const icon = navigationButton.querySelector('.nav-toggle-icon');
        if (icon) icon.textContent = '☰';
      });
    });
  }

  function showDatabaseError(error) {
    console.error('[SIMPEL] Database lokal tidak dapat dimuat:', error);
    const notice = document.createElement('div');
    notice.setAttribute('role', 'alert');
    notice.className = 'fixed z-[100] top-4 left-1/2 -translate-x-1/2 w-[min(92vw,42rem)] rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-950 shadow-xl';
    notice.innerHTML = `
      <p class="font-bold">Database lokal belum tersambung</p>
      <p class="mt-1">${escapeHtml(error.message)}</p>
      <p class="mt-1">Jalankan aplikasi dengan <code>npm run dev</code>, lalu muat ulang halaman.</p>
      <button type="button" class="mt-2 rounded bg-rose-800 px-3 py-1.5 font-semibold text-white">Coba lagi</button>
    `;
    notice.querySelector('button').addEventListener('click', () => window.location.reload());
    document.body.appendChild(notice);
  }
}

function updateRoleViews(role) {
  const adminSection = document.getElementById('section-admin-panel');
  const userFormSection = document.getElementById('section-user-form');
  const userNavLinks = document.querySelectorAll('[data-nav-role="masyarakat"]');
  const adminNavLink = document.querySelector('[data-nav-role="admin"]');
  const header = document.querySelector('#main-app-wrapper > header');
  const navigation = document.getElementById('main-navigation');
  const navigationButton = document.getElementById('btn-toggle-navigation');
  const inboxButton = document.getElementById('btn-open-inbox');
  const statusSection = document.getElementById('status-laporan');
  const publicHero = [
    'hero-kicker-public',
    'hero-title-public',
    'hero-description-public',
    'hero-actions-public',
    'hero-note-public'
  ];
  const adminHero = [
    'hero-kicker-admin',
    'hero-title-admin',
    'hero-description-admin',
    'hero-actions-admin',
    'hero-note-admin'
  ];

  userNavLinks.forEach(link => link.classList.toggle('hidden', role === 'admin'));
  if (adminNavLink) adminNavLink.classList.toggle('hidden', role !== 'admin');
  if (header) header.dataset.role = role;
  publicHero.forEach(id => document.getElementById(id)?.classList.toggle('hidden', role === 'admin'));
  adminHero.forEach(id => document.getElementById(id)?.classList.toggle('hidden', role !== 'admin'));
  if (statusSection) statusSection.classList.toggle('hidden', role === 'admin');
  if (navigation) navigation.classList.remove('is-open');
  if (navigationButton) {
    navigationButton.setAttribute('aria-expanded', 'false');
    navigationButton.setAttribute('aria-label', 'Buka navigasi');
  }
  if (navigationButton) {
    const icon = navigationButton.querySelector('.nav-toggle-icon');
    if (icon) icon.textContent = '☰';
  }
  if (inboxButton) inboxButton.classList.toggle('hidden', role === 'admin');
  
  if (role === 'admin') {
    if (adminSection) adminSection.classList.remove('hidden');
    if (userFormSection) userFormSection.classList.add('hidden');
  } else {
    if (adminSection) adminSection.classList.add('hidden');
    if (userFormSection) userFormSection.classList.remove('hidden');
  }
}

// Setup Form Submission & Geo Picker
function setupFormHandlers() {
  const btnGPS = document.getElementById('btn-use-gps');
  if (btnGPS) {
    btnGPS.addEventListener('click', () => {
      setLocationHelp('Meminta lokasi perangkat… pastikan izin lokasi browser aktif.');
      locateUser(updateSelectedLocation, setLocationHelp);
    });
  }

  const locationSearch = document.getElementById('input-cari-lokasi');
  const searchButton = document.getElementById('btn-cari-lokasi');
  const searchForLocation = async () => {
    try {
      searchButton.disabled = true;
      setLocationHelp('Mencari lokasi di Indonesia…');
      await searchLocation(locationSearch.value, updateSelectedLocation);
      setLocationHelp('Lokasi ditemukan. Klik peta atau geser pin untuk menyesuaikannya.');
    } catch (error) {
      setLocationHelp(error.message);
    } finally {
      searchButton.disabled = false;
    }
  };
  if (searchButton && locationSearch) {
    searchButton.addEventListener('click', searchForLocation);
    locationSearch.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        searchForLocation();
      }
    });
  }

  const photoInput = document.getElementById('input-foto');
  const previewImg = document.getElementById('preview-foto');
  if (photoInput && previewImg) {
    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        alert('Pilih file gambar sebagai bukti laporan.');
        currentImageBase64 = null;
        photoInput.value = '';
        previewImg.classList.add('hidden');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('Ukuran foto maksimal 10 MB.');
        currentImageBase64 = null;
        photoInput.value = '';
        previewImg.classList.add('hidden');
        return;
      }
      compressImage(file).then(imageData => {
        currentImageBase64 = imageData;
        previewImg.src = imageData;
        previewImg.classList.remove('hidden');
      }).catch(error => {
        console.error('[Laporan] Gagal memproses foto:', error);
        currentImageBase64 = null;
        photoInput.value = '';
        previewImg.classList.add('hidden');
        alert('Foto tidak dapat diproses. Silakan pilih gambar lain.');
      });
    });
  }

  const formLaporan = document.getElementById('form-laporan-lingkungan');
  if (formLaporan) {
    formLaporan.addEventListener('submit', async (e) => {
      e.preventDefault();

      const user = getCurrentUser();
      if (!user) {
        openAuthGate('masyarakat', 'Silakan masuk terlebih dahulu untuk mengirim laporan pengaduan.');
        showToast('Login Diperlukan', 'Anda harus masuk/login terlebih dahulu untuk mengirimkan aduan!');
        return;
      }

      const judul = document.getElementById('input-judul').value.trim();
      const kategori = document.getElementById('input-kategori').value;
      const wilayah = document.getElementById('input-wilayah').value;
      const deskripsi = document.getElementById('input-deskripsi').value.trim();

      if (!judul || !deskripsi) {
        alert("Harap isi semua kolom judul dan deskripsi!");
        return;
      }
      if (!Number.isFinite(selectedLat) || !Number.isFinite(selectedLng)) {
        alert("Pilih lokasi laporan melalui pencarian, tombol lokasi saya, atau klik titik pada peta.");
        return;
      }
      if (!currentImageBase64) {
        alert("Unggah bukti foto sebelum mengirim laporan.");
        return;
      }

      const newReport = {
        id: createReportId(),
        judul: judul,
        kategori: kategori,
        wilayah: wilayah || selectedRegion || 'Wilayah tidak terdeteksi',
        alamat: selectedAddress,
        lat: selectedLat,
        lng: selectedLng,
        deskripsi: deskripsi,
        foto: currentImageBase64,
        status: "Menunggu Verifikasi",
        tanggal: formatLocalDate(new Date()),
        pelapor: user.nama || user.email,
        emailPelapor: user.email,
        catatanPetugas: "Laporan baru masuk, menunggu penugasan verifikator dari Dinas Terkait."
      };

      const submitButton = formLaporan.querySelector('[type="submit"]');
      try {
        if (submitButton) submitButton.disabled = true;
        const savedReport = await createReport(newReport);
        reports = [savedReport, ...reports];
      } catch (error) {
        alert(error.message);
        return;
      } finally {
        if (submitButton) submitButton.disabled = false;
      }

      renderReportsList();
      renderAdminTable();
      renderCharts(reports);
      initDistributionMap(reports, 'All');

      formLaporan.reset();
      currentImageBase64 = null;
      if (previewImg) previewImg.classList.add('hidden');
      updateSelectedLocation(selectedLat, selectedLng, selectedAddress);

      showToast("Laporan Berhasil Terkirim!", "Laporan Anda telah tercatat dan sedang menunggu verifikasi petugas.");
    });
  }
}

function updateSelectedLocation(lat, lng, address, accuracy = null, region = '') {
  selectedLat = lat;
  selectedLng = lng;
  selectedAddress = address;
  selectedAccuracy = Number.isFinite(accuracy) ? accuracy : null;
  selectedRegion = region || '';
  const addrInput = document.getElementById('input-alamat');
  if (addrInput) addrInput.value = address;
  const regionInput = document.getElementById('input-wilayah');
  if (regionInput) regionInput.value = selectedRegion;
  const addressDisplay = document.getElementById('input-alamat-display');
  if (addressDisplay) addressDisplay.textContent = address ? `📍 ${address}` : 'Pilih lokasi di peta atau gunakan GPS.';
  const coordEl = document.getElementById('coord-display');
  if (coordEl) coordEl.textContent = Number.isFinite(lat) && Number.isFinite(lng)
    ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    : 'Koordinat belum dipilih';
  const accuracyEl = document.getElementById('location-accuracy');
  if (accuracyEl) {
    accuracyEl.textContent = selectedAccuracy === null
      ? 'Lokasi dipilih manual; akurasi koordinat GPS tidak tersedia.'
      : `Akurasi perkiraan perangkat: ±${Math.round(selectedAccuracy)} m. Anda dapat menggeser pin untuk mengoreksi lokasi.`;
  }
}

function setLocationHelp(message) {
  const help = document.getElementById('location-help');
  if (help) help.textContent = message;
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      try {
        const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Canvas is not available'));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          if (!blob) {
            reject(new Error('Image encoding failed'));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error || new Error('Image read failed'));
          reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.82);
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('Image decode failed'));
    };
    image.src = imageUrl;
  });
}

function formatLocalDate(date) {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function createReportId() {
  const year = new Date().getFullYear();
  const prefix = `LAP-${year}-`;
  const latestNumber = reports.reduce((latest, report) => {
    if (!report.id.startsWith(prefix)) return latest;
    const number = Number(report.id.slice(prefix.length));
    return Number.isInteger(number) ? Math.max(latest, number) : latest;
  }, 0);
  return `${prefix}${String(latestNumber + 1).padStart(3, '0')}`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

// Render Reports List
function renderReportsList() {
  const container = document.getElementById('list-laporan-masyarakat');
  const totalCountEl = document.getElementById('stat-total');
  const pendingCountEl = document.getElementById('stat-pending');
  const processCountEl = document.getElementById('stat-process');
  const doneCountEl = document.getElementById('stat-done');

  const pending = reports.filter(r => r.status === 'Menunggu Verifikasi').length;
  const process = reports.filter(r => r.status === 'Diproses').length;
  const done = reports.filter(r => r.status === 'Selesai').length;

  if (totalCountEl) totalCountEl.textContent = reports.length;
  if (pendingCountEl) pendingCountEl.textContent = pending;
  if (processCountEl) processCountEl.textContent = process;
  if (doneCountEl) doneCountEl.textContent = done;

  if (!container) return;
  container.innerHTML = '';

  reports.slice(0, 6).forEach(report => {
    let statusBg = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    let step1 = 'bg-emerald-500 text-white';
    let step2 = 'bg-slate-700 text-slate-400';
    let step3 = 'bg-slate-700 text-slate-400';
    let rejectedState = '';

    if (report.status === 'Diproses') {
      statusBg = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      step2 = 'bg-blue-500 text-white';
    } else if (report.status === 'Selesai') {
      statusBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      step2 = 'bg-blue-500 text-white';
      step3 = 'bg-emerald-500 text-white';
    } else if (report.status === 'Ditolak') {
      statusBg = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      rejectedState = '<p class="text-xs text-rose-300 mt-2 font-bold">Laporan ditolak oleh petugas.</p>';
    }

    const card = document.createElement('div');
    card.className = 'bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 hover:border-slate-600 transition-all shadow-xl flex flex-col md:flex-row gap-5';
    const reportPhoto = report.foto
      ? `<img src="${escapeHtml(report.foto)}" alt="${escapeHtml(report.judul)}" class="w-full md:w-48 h-36 object-cover rounded-xl border border-slate-700 shadow-md"/>`
      : `<div role="img" aria-label="Foto bukti tidak tersedia" class="w-full md:w-48 h-36 rounded-xl border border-slate-700 bg-slate-900 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs"><span class="text-2xl" aria-hidden="true">📷</span><span>Foto bukti tidak tersedia</span></div>`;
    card.innerHTML = `
      ${reportPhoto}
      <div class="flex-1 flex flex-col justify-between">
        <div>
          <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span class="px-3 py-1 rounded-full text-xs font-bold border ${statusBg}">
              ${escapeHtml(report.status)}
            </span>
            <span class="text-xs text-slate-400">📅 ${escapeHtml(report.tanggal)} • ${escapeHtml(report.id)}</span>
          </div>
          <h3 class="text-lg font-bold text-slate-100 mb-1">${escapeHtml(report.judul)}</h3>
          <p class="text-xs text-slate-400 mb-3 line-clamp-2">${escapeHtml(report.deskripsi)}</p>
          <div class="text-xs text-slate-300 flex items-center gap-2 mb-4 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
            <span>📍 <b>${escapeHtml(report.wilayah)}</b> (${escapeHtml(report.alamat)})</span>
          </div>
        </div>

        <div class="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <div class="flex justify-between items-center text-[11px] font-semibold text-slate-400 mb-2">
            <span class="text-slate-300">Tracking Status Real-Time:</span>
            <span class="text-emerald-400">Pelapor: ${escapeHtml(report.pelapor)}</span>
          </div>
          <div class="relative flex items-center justify-between text-[10px] font-medium">
            <div class="flex items-center gap-1">
              <span class="w-5 h-5 rounded-full ${step1} flex items-center justify-center font-bold">1</span>
              <span>Diterima</span>
            </div>
            <div class="h-0.5 flex-1 mx-2 bg-slate-700"></div>
            <div class="flex items-center gap-1">
              <span class="w-5 h-5 rounded-full ${step2} flex items-center justify-center font-bold">2</span>
              <span>Diproses</span>
            </div>
            <div class="h-0.5 flex-1 mx-2 bg-slate-700"></div>
            <div class="flex items-center gap-1">
              <span class="w-5 h-5 rounded-full ${step3} flex items-center justify-center font-bold">3</span>
              <span>Selesai</span>
            </div>
          </div>
          ${report.catatanPetugas ? `<p class="text-xs text-emerald-300 mt-2 font-mono bg-emerald-950/40 p-2 rounded border border-emerald-900/50">💬 <b>Catatan Petugas:</b> ${escapeHtml(report.catatanPetugas)}</p>` : ''}
          ${rejectedState}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// Render Admin Verification Table
function renderAdminTable() {
  const tbody = document.getElementById('table-admin-reports');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (getCurrentUser()?.role !== 'admin') return;

  reports.forEach((report) => {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-800 hover:bg-slate-800/40 transition-colors text-xs';
    tr.innerHTML = `
      <td class="p-3 font-mono font-bold text-emerald-400">${escapeHtml(report.id)}</td>
      <td class="p-3 text-slate-200">
        <div class="font-bold text-slate-100">${escapeHtml(report.judul)}</div>
        <div class="text-[11px] text-slate-400">${escapeHtml(report.alamat)}</div>
      </td>
      <td class="p-3 text-slate-300">${escapeHtml(report.kategori)} / <b>${escapeHtml(report.wilayah)}</b></td>
      <td class="p-3 text-slate-300">${escapeHtml(report.pelapor)}<br><span class="text-[10px] text-slate-400">${escapeHtml(report.emailPelapor)}</span></td>
      <td class="p-3">
        <span class="px-2.5 py-1 rounded-full font-bold text-[10px] ${
          report.status === 'Selesai' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
          report.status === 'Diproses' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
          report.status === 'Ditolak' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
          'bg-amber-500/20 text-amber-400 border border-amber-500/30'
        }">${escapeHtml(report.status)}</span>
      </td>
      <td class="p-3">
        <button data-id="${escapeHtml(report.id)}" class="btn-action-update px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition shadow">
          Kelola Status
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll('.btn-action-update').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      openAdminUpdateModal(id);
    });
  });
}

function openAdminUpdateModal(reportId) {
  if (getCurrentUser()?.role !== 'admin') {
    alert('Akses petugas diperlukan untuk mengubah status laporan.');
    return;
  }
  const report = reports.find(r => r.id === reportId);
  if (!report) return;

  const modal = document.getElementById('modal-admin-action');
  if (!modal) return;

  document.getElementById('admin-modal-id').textContent = report.id;
  document.getElementById('admin-modal-judul').textContent = report.judul;
  document.getElementById('admin-modal-status-select').value = report.status;
  document.getElementById('admin-modal-catatan').value = report.catatanPetugas || '';

  modal.classList.remove('hidden');

  const saveBtn = document.getElementById('btn-save-admin-action');
  saveBtn.onclick = async () => {
    if (getCurrentUser()?.role !== 'admin') {
      alert('Sesi petugas tidak valid. Silakan masuk kembali.');
      return;
    }
    const newStatus = document.getElementById('admin-modal-status-select').value;
    const newCatatan = document.getElementById('admin-modal-catatan').value.trim();

    try {
      saveBtn.disabled = true;
      const updatedReport = await updateReport(reportId, newStatus, newCatatan);
      reports = reports.map(item => item.id === reportId ? updatedReport : item);
    } catch (error) {
      alert(error.message);
      return;
    } finally {
      saveBtn.disabled = false;
    }
    renderReportsList();
    renderAdminTable();
    renderCharts(reports);
    initDistributionMap(reports, 'All');

    modal.classList.add('hidden');
    showToast("Status Diperbarui!", `Laporan ${report.id} kini berstatus: ${newStatus}`);
  };
}

// Setup Inbox Modal Handler
function setupInboxModalHandlers() {
  const openBtn = document.getElementById('btn-open-inbox');
  const modal = document.getElementById('modal-inbox');
  const closeBtn = document.getElementById('btn-close-inbox');

  if (openBtn) openBtn.onclick = () => renderInboxMessages();
  if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');
}

function renderInboxMessages() {
  const modal = document.getElementById('modal-inbox');
  const listContainer = document.getElementById('inbox-mail-list');
  if (!modal || !listContainer) return;

  const mails = getMailInbox();
  listContainer.innerHTML = '';

  if (mails.length === 0) {
    listContainer.innerHTML = `<div class="p-8 text-center text-slate-400">Belum ada email OTP yang terkirim.</div>`;
  } else {
    mails.forEach(mail => {
      const el = document.createElement('div');
      el.className = 'bg-slate-800 p-4 rounded-xl border border-slate-700 mb-3 shadow';
      el.innerHTML = `
        <div class="flex justify-between items-center mb-1">
          <span class="font-bold text-emerald-400 text-xs">${escapeHtml(mail.subject)}</span>
          <span class="text-[10px] text-slate-400">${escapeHtml(mail.time)} (${escapeHtml(mail.date)})</span>
        </div>
        <p class="text-xs text-slate-300 mb-2"><b>Penerima:</b> ${escapeHtml(mail.name)} (${escapeHtml(mail.to)})</p>
        <div class="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-line">${escapeHtml(mail.body)}</div>
      `;
      listContainer.appendChild(el);
    });
  }

  modal.classList.remove('hidden');
}

// Utility Toast Notification
function showToast(title, message) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-5 right-5 z-[99999] bg-emerald-600 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3 border border-emerald-400 animate-bounce-once';
  toast.innerHTML = `
    <span class="text-2xl">✅</span>
    <div>
      <h4 class="font-bold text-sm">${escapeHtml(title)}</h4>
      <p class="text-xs text-emerald-100">${escapeHtml(message)}</p>
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
