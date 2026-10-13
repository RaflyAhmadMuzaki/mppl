// PWA Setup & Install Prompt Helper

let deferredPrompt = null;

export function initPWA() {
  // 1. Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    });
  }

  // 2. Listen for BeforeInstallPrompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const pwaBanner = document.getElementById('pwa-install-banner');
    if (pwaBanner) {
      pwaBanner.classList.remove('hidden');
    }
  });

  // Handle Install button click
  const installBtn = document.getElementById('btn-install-pwa');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) {
        alert("PWA siap dipasang melalui menu browser (Add to Home Screen).");
        return;
      }
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      deferredPrompt = null;
      const pwaBanner = document.getElementById('pwa-install-banner');
      if (pwaBanner) pwaBanner.classList.add('hidden');
    });
  }

  // 3. Online/Offline detection
  const updateOnlineStatus = () => {
    const badge = document.getElementById('offline-badge');
    if (badge) {
      if (!navigator.onLine) {
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  };

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();
}
