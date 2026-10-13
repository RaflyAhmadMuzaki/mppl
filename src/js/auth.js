import { ADMIN_USERS } from './data.js';

// EmailJS Configuration Keys
const EMAILJS_CONFIG = {
  SERVICE_ID: "service_vo0exbc",
  TEMPLATE_ID: "template_5pg81ct",
  PUBLIC_KEY: "6h5g2PK9bo1oKvatZ"
};

let pendingOTP = null;
let pendingUser = null;
let pendingOTPExpiresAt = 0;

if (typeof window !== 'undefined' && window.emailjs) {
  try {
    window.emailjs.init({ publicKey: EMAILJS_CONFIG.PUBLIC_KEY });
  } catch (err) {
    console.warn('[EmailJS] Init warning:', err);
  }
}

export function getCurrentUser() {
  const session = localStorage.getItem('simpel_user');
  if (!session) return null;

  try {
    const user = JSON.parse(session);
    if (!user || typeof user.email !== 'string' || !['admin', 'masyarakat'].includes(user.role)) {
      return null;
    }
    if (user.role === 'admin' && !ADMIN_USERS.some(admin => admin.email.toLowerCase() === user.email.toLowerCase())) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  localStorage.setItem('simpel_user', JSON.stringify(user));
}

export function logoutUser() {
  localStorage.removeItem('simpel_user');
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getMailInbox() {
  const mails = localStorage.getItem('simpel_inbox');
  if (!mails) return [];
  try {
    return JSON.parse(mails);
  } catch {
    return [];
  }
}

function addMailToInbox(email, otpCode, name, isRealEmailSent = true) {
  const inbox = getMailInbox();
  const mailSubject = "Kode OTP Verifikasi Masuk - SIMPEL";

  const newMail = {
    id: Date.now(),
    to: email,
    name: name || "Masyarakat SIMPEL",
    subject: mailSubject,
    code: otpCode,
    sentToGmail: isRealEmailSent,
    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    body: `Halo ${name || 'Pengguna'},\n\nKode OTP verifikasi Anda untuk masuk ke Sistem Informasi Pelaporan Lingkungan (SIMPEL) adalah:\n\n👉 ${otpCode} 👈\n\nStatus: ${isRealEmailSent ? '✅ Terkirim ke Gmail Asli (' + email + ')' : 'ℹ️ Simulasi Mode'}\n\nKode ini berlaku selama 5 menit.`
  };
  inbox.unshift(newMail);
  localStorage.setItem('simpel_inbox', JSON.stringify(inbox));
  return newMail;
}

// Password-based Admin Login (Fast & Practical)
export function loginAdminWithPassword(email, password) {
  if (!email || !email.includes('@')) {
    throw new Error("Format Email Admin tidak valid!");
  }
  const normalizedEmail = email.trim().toLowerCase();
  const adminMatch = ADMIN_USERS.find(u => u.email.toLowerCase() === normalizedEmail);
  if (!adminMatch) {
    throw new Error("Email tersebut tidak terdaftar sebagai akun petugas SIMPEL.");
  }
  if (!password) {
    throw new Error("Masukkan password petugas admin!");
  }

  if (password.trim() !== 'admin123' && password.trim() !== 'petugas123') {
    throw new Error("Password petugas salah. Periksa kembali atau hubungi administrator.");
  }

  const adminUser = {
    email: normalizedEmail,
    nama: adminMatch.nama,
    role: "admin",
    instansi: adminMatch.instansi,
    loggedInAt: new Date().toISOString()
  };

  setCurrentUser(adminUser);
  return { success: true, user: adminUser };
}

export function cancelPendingOTP() {
  pendingOTP = null;
  pendingUser = null;
  pendingOTPExpiresAt = 0;
}

// Send OTP for Masyarakat Login & Register
export async function sendOTP(email, name) {
  if (!email || !email.includes('@') || !email.includes('.')) {
    throw new Error("Format alamat email tidak valid! Gunakan email asli seperti nama@gmail.com");
  }

  const code = generateOTP();
  pendingOTP = code;
  pendingOTPExpiresAt = Date.now() + 5 * 60 * 1000;
  pendingUser = {
    email: email.trim().toLowerCase(),
    nama: name || email.split('@')[0],
    role: 'masyarakat'
  };

  let realEmailSuccess = false;

  if (typeof window !== 'undefined' && window.emailjs) {
    try {
      const templateParams = {
        to_email: pendingUser.email,
        to_name: pendingUser.nama,
        passcode: code,
        otp_code: code,
        role_name: 'Masyarakat'
      };

      const response = await window.emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        templateParams
      );
      console.log('[EmailJS] Email sent successfully!', response.status, response.text);
      realEmailSuccess = true;
    } catch (err) {
      console.warn('[EmailJS] Real email send failed, falling back to simulator:', err);
    }
  }

  const mail = addMailToInbox(pendingUser.email, code, pendingUser.nama, realEmailSuccess);
  showMailNotification(mail, realEmailSuccess);

  return { success: true, email: pendingUser.email, code: code, sentToGmail: realEmailSuccess };
}

// Verify OTP
export function verifyOTP(inputCode) {
  if (!pendingOTP || !pendingUser) {
    throw new Error("Sesi OTP telah kadaluarsa. Silakan minta kode OTP baru.");
  }
  if (Date.now() > pendingOTPExpiresAt) {
    pendingOTP = null;
    pendingUser = null;
    pendingOTPExpiresAt = 0;
    throw new Error("Kode OTP telah kedaluwarsa. Silakan minta kode baru.");
  }

  if (inputCode.trim() === pendingOTP) {
    const user = {
      ...pendingUser,
      loggedInAt: new Date().toISOString()
    };
    setCurrentUser(user);
    pendingOTP = null;
    pendingUser = null;
    pendingOTPExpiresAt = 0;
    return { success: true, user: user };
  } else {
    throw new Error("Kode OTP salah! Periksa kembali email Anda.");
  }
}

// Visual Toast Banner showing OTP Email Arrival
function showMailNotification(mail, isRealEmailSent) {
  const existingNotification = document.getElementById('otp-mail-toast');
  if (existingNotification) existingNotification.remove();

  const toast = document.createElement('div');
  toast.id = 'otp-mail-toast';
  toast.className = 'fixed top-5 right-5 z-[99999] max-w-md bg-slate-900 text-white rounded-2xl shadow-2xl border border-emerald-500/50 p-4 transform transition-all duration-300 translate-y-0 animate-bounce-once';
  
  const statusBadge = isRealEmailSent
    ? `<span class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded">✉️ Terkirim ke Gmail Asli</span>`
    : `<span class="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded">📬 Mode Simulasi</span>`;
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);

  toast.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
      </div>
      <div class="flex-1 text-sm">
        <div class="flex justify-between items-center mb-1">
          <span class="font-bold text-emerald-400 text-xs uppercase tracking-wider">Email OTP SIMPEL</span>
          ${statusBadge}
        </div>
        <p class="font-semibold text-slate-100 text-xs">Ke: ${escapeHtml(mail.to)}</p>
        <div class="mt-2 bg-slate-800 p-2.5 rounded-lg border border-slate-700">
          <p class="text-xs text-slate-300">Kode OTP Anda:</p>
          <p class="text-xl font-mono font-bold tracking-widest text-emerald-400 mt-0.5">${escapeHtml(mail.code)}</p>
        </div>
        <p class="text-[11px] text-slate-400 mt-2">${isRealEmailSent ? 'Silakan periksa Inbox / Spam Gmail Anda!' : 'Salin kode di atas atau buka tombol Inbox Email.'}</p>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="text-slate-400 hover:text-white text-lg font-bold">✕</button>
    </div>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 15000);
}
