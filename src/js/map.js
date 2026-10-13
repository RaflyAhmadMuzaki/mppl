// Leaflet maps for report geotagging and report distribution.

let pickerMap = null;
let pickerMarker = null;
let pickerAccuracyCircle = null;
let distributionMap = null;
let distributionLayerGroup = null;
let geocodingRequestId = 0;

const DEFAULT_CENTER = [-2.5, 118];
const DEFAULT_ZOOM = 4;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function getRegion(address) {
  return address.state_district
    || address.city
    || address.county
    || address.state
    || address.country
    || 'Wilayah tidak terdeteksi';
}

function getPinIcon() {
  return L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
}

function updatePickerMarker(lat, lng, accuracy = null, onLocationSelect = () => {}) {
  if (!pickerMap) return;
  const position = [lat, lng];

  if (!pickerMarker) {
    pickerMarker = L.marker(position, { draggable: true, icon: getPinIcon() }).addTo(pickerMap);
    pickerMarker.on('dragend', () => {
      const point = pickerMarker.getLatLng();
      updateSelectedCoordinates(point.lat, point.lng, null, onLocationSelect);
    });
  } else {
    pickerMarker.setLatLng(position);
  }

  if (pickerAccuracyCircle) {
    pickerAccuracyCircle.remove();
    pickerAccuracyCircle = null;
  }
  if (Number.isFinite(accuracy) && accuracy > 0) {
    pickerAccuracyCircle = L.circle(position, {
      radius: accuracy,
      color: '#16834d',
      fillColor: '#16834d',
      fillOpacity: 0.12,
      weight: 1
    }).addTo(pickerMap);
  }
}

async function updateSelectedCoordinates(lat, lng, accuracy, onLocationSelect) {
  const requestId = ++geocodingRequestId;
  updatePickerMarker(lat, lng, accuracy, onLocationSelect);
  onLocationSelect(
    lat,
    lng,
    `Koordinat: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    accuracy,
    'Wilayah tidak terdeteksi'
  );

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    if (!response.ok) throw new Error(`Reverse geocoding failed (${response.status})`);
    const data = await response.json();
    if (requestId !== geocodingRequestId) return;

    onLocationSelect(
      lat,
      lng,
      data.display_name || `Koordinat: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      accuracy,
      getRegion(data.address || {})
    );
  } catch (error) {
    if (requestId !== geocodingRequestId) return;
    console.warn('[Peta] Alamat lokasi tidak dapat dimuat:', error);
    onLocationSelect(
      lat,
      lng,
      `Koordinat: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      accuracy,
      'Wilayah tidak terdeteksi'
    );
  }
}

export function initPickerMap(onLocationSelect) {
  const container = document.getElementById('map-picker');
  if (!container || typeof L === 'undefined') return;

  if (pickerMap) {
    pickerMap.remove();
    pickerMap = null;
    pickerMarker = null;
    pickerAccuracyCircle = null;
  }

  pickerMap = L.map(container).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(pickerMap);

  pickerMap.on('click', event => {
    updateSelectedCoordinates(event.latlng.lat, event.latlng.lng, null, onLocationSelect);
  });
  pickerMap.invalidateSize();
}

export async function searchLocation(query, onLocationSelect) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) throw new Error('Masukkan nama kota, kabupaten, atau alamat yang ingin dicari.');
  if (!pickerMap) throw new Error('Peta belum siap. Silakan tunggu sebentar lalu coba lagi.');

  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    limit: '1',
    countrycodes: 'id',
    q: normalizedQuery
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
  if (!response.ok) throw new Error(`Pencarian lokasi gagal (${response.status}). Coba lagi.`);
  const results = await response.json();
  if (!results.length) throw new Error('Lokasi tidak ditemukan di Indonesia. Coba nama kota atau kabupaten lain.');

  const result = results[0];
  const lat = Number(result.lat);
  const lng = Number(result.lon);
  pickerMap.setView([lat, lng], 15);
  updatePickerMarker(lat, lng, null, onLocationSelect);
  geocodingRequestId++;
  onLocationSelect(
    lat,
    lng,
    result.display_name || `Koordinat: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    null,
    getRegion(result.address || {})
  );
}

export function locateUser(onLocationSelect, onStatus = () => {}) {
  if (!navigator.geolocation) {
    onStatus('Browser ini tidak mendukung lokasi perangkat. Cari lokasi atau tandai langsung di peta.');
    return;
  }

  if (!pickerMap) {
    onStatus('Peta belum siap. Silakan tunggu sebentar lalu coba lagi.');
    return;
  }

  let bestAccuracy = Infinity;
  let watchId;
  let finished = false;

  const finish = status => {
    if (finished) return;
    finished = true;
    window.clearTimeout(timeoutId);
    navigator.geolocation.clearWatch(watchId);
    onStatus(status);
  };

  const timeoutId = window.setTimeout(() => {
    if (bestAccuracy === Infinity) {
      finish('Lokasi perangkat tidak ditemukan. Periksa izin lokasi, atau pilih titik secara manual di peta.');
    } else {
      finish(`Lokasi diperbarui. Akurasi perkiraan terbaik: ±${Math.round(bestAccuracy)} m; sesuaikan pin bila perlu.`);
    }
  }, 15000);

  watchId = navigator.geolocation.watchPosition(
    position => {
      const { latitude, longitude, accuracy } = position.coords;
      if (accuracy >= bestAccuracy) return;

      bestAccuracy = accuracy;
      pickerMap.setView([latitude, longitude], 16);
      updatePickerMarker(latitude, longitude, accuracy, onLocationSelect);
      onStatus(`Mendapatkan posisi terbaik… akurasi sementara ±${Math.round(accuracy)} m.`);
      updateSelectedCoordinates(latitude, longitude, accuracy, onLocationSelect);

      if (accuracy <= 50) {
        finish(`Lokasi diperbarui. Akurasi perkiraan: ±${Math.round(accuracy)} m.`);
      }
    },
    error => {
      if (error.code === error.PERMISSION_DENIED) {
        finish('Izin lokasi ditolak. Aktifkan izin lokasi browser, atau pilih titik secara manual di peta.');
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        finish('Perangkat tidak dapat menentukan lokasi. Coba di luar ruangan atau tandai titik di peta.');
      } else if (bestAccuracy < Infinity) {
        finish(`Lokasi perangkat tidak diperbarui. Akurasi terakhir ±${Math.round(bestAccuracy)} m.`);
      } else {
        finish('Waktu untuk mendapatkan lokasi habis. Coba lagi atau tandai titik secara manual di peta.');
      }
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
  );
}

export function initDistributionMap(reports, selectedCategory = 'All') {
  const container = document.getElementById('map-distribution');
  if (!container || typeof L === 'undefined') return;

  if (!distributionMap) {
    distributionMap = L.map(container).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(distributionMap);
    distributionLayerGroup = L.layerGroup().addTo(distributionMap);
  } else {
    distributionLayerGroup.clearLayers();
  }
  distributionMap.invalidateSize();

  const filtered = selectedCategory === 'All'
    ? reports
    : reports.filter(report => report.kategori.toLowerCase() === selectedCategory.toLowerCase());

  filtered.forEach(report => {
    let colorClass = 'bg-amber-500';
    if (report.status === 'Diproses') colorClass = 'bg-blue-500';
    if (report.status === 'Selesai') colorClass = 'bg-emerald-500';
    if (report.status === 'Ditolak') colorClass = 'bg-rose-500';

    const customHtmlIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div class="relative group">
          <div class="w-8 h-8 ${colorClass} text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white font-bold text-xs transform hover:scale-125 transition-transform duration-200 cursor-pointer">
            📍
          </div>
          <div class="absolute -top-1 -right-1 w-3 h-3 ${colorClass} rounded-full animate-ping"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker([report.lat, report.lng], { icon: customHtmlIcon });
    const popupPhoto = report.foto
      ? `<img src="${escapeHtml(report.foto)}" alt="${escapeHtml(report.judul)}" class="w-full h-28 object-cover rounded-lg mb-2 shadow-sm"/>`
      : '<div role="img" aria-label="Foto bukti tidak tersedia" class="w-full h-28 rounded-lg mb-2 bg-slate-100 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs"><span class="text-xl" aria-hidden="true">📷</span><span>Foto bukti tidak tersedia</span></div>';
    const popupContent = `
      <div class="p-1 max-w-xs font-sans text-slate-800">
        ${popupPhoto}
        <div class="flex items-center justify-between gap-2 mb-1">
          <span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
            report.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800' :
              report.status === 'Diproses' ? 'bg-blue-100 text-blue-800' :
                report.status === 'Ditolak' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
            }">${escapeHtml(report.status)}</span>
            <span class="text-[11px] text-slate-500">${escapeHtml(report.tanggal.split(' ')[0])}</span>
        </div>
        <h4 class="font-bold text-sm text-slate-900 leading-tight mb-1">${escapeHtml(report.judul)}</h4>
        <p class="text-xs text-slate-600 line-clamp-2 mb-2">${escapeHtml(report.deskripsi)}</p>
        <div class="text-[11px] text-slate-500 flex items-center gap-1 border-t border-slate-100 pt-1">
            <span>🏢 Wilayah: <b>${escapeHtml(report.wilayah)}</b></span>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent);
    distributionLayerGroup.addLayer(marker);
  });
}
