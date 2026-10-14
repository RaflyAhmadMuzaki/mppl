// Chart.js Statistics Module matching PDF Slide 4

let categoryChartInstance = null;
let statusChartInstance = null;
let regionChartInstance = null;

export function renderCharts(reports) {
  if (typeof Chart === 'undefined') return;

  // 1. Calculate Category breakdown
  const categoryCounts = {
    'Sampah': 0,
    'Jalan & Fasilitas': 0,
    'Air & Drainase': 0,
    'Ruang Terbuka': 0,
    'Lainnya': 0
  };

  // 2. Calculate Status breakdown
  const statusCounts = {
    'Menunggu Verifikasi': 0,
    'Diproses': 0,
    'Selesai': 0,
    'Ditolak': 0
  };
  const regionCounts = new Map();

  reports.forEach(r => {
    // Map categories dynamically or fallback
    const legacyCategories = {
      'Pakisi Utara': 'Jalan & Fasilitas',
      'Pakisi Air': 'Air & Drainase'
    };
    const cat = legacyCategories[r.kategori] || r.kategori;
    if (!Object.prototype.hasOwnProperty.call(categoryCounts, cat)) {
      categoryCounts['Lainnya'] += 1;
    } else {
      categoryCounts[cat] += 1;
    }

    let st = r.status;
    if (Object.prototype.hasOwnProperty.call(statusCounts, st)) {
      statusCounts[st] += 1;
    }
    regionCounts.set(r.wilayah, (regionCounts.get(r.wilayah) || 0) + 1);
  });

  // Render Category Donut Chart
  const categoryCtx = document.getElementById('chart-kategori');
  if (categoryCtx) {
    if (categoryChartInstance) categoryChartInstance.destroy();

    categoryChartInstance = new Chart(categoryCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(categoryCounts),
        datasets: [{
          data: Object.values(categoryCounts),
          backgroundColor: [
            '#15803d', // Sampah (Emerald)
            '#0369a1', // Jalan & Fasilitas (Sky)
            '#0e7490', // Air & Drainase (Cyan)
            '#7c3aed', // Ruang Terbuka (Purple)
            '#64748b'  // Lainnya (Slate)
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#475569',
              font: { family: 'Inter, system-ui, sans-serif', size: 11 }
            }
          }
        },
        cutout: '70%'
      }
    });
  }

  // Render Status Bar Chart
  const statusCtx = document.getElementById('chart-status');
  if (statusCtx) {
    if (statusChartInstance) statusChartInstance.destroy();

    statusChartInstance = new Chart(statusCtx, {
      type: 'bar',
      data: {
        labels: ['Menunggu Verifikasi', 'Diproses', 'Selesai', 'Ditolak'],
        datasets: [{
          label: 'Jumlah Aduan',
          data: [
            statusCounts['Menunggu Verifikasi'],
            statusCounts['Diproses'],
            statusCounts['Selesai'],
            statusCounts['Ditolak']
          ],
          backgroundColor: [
            '#d97706', // Amber
            '#0369a1', // Sky
            '#15803d', // Green
            '#b91c1c'  // Red
          ],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            ticks: { color: '#64748b', font: { family: 'Inter, system-ui, sans-serif' } },
            grid: { display: false }
          },
          y: {
            ticks: { color: '#64748b', stepSize: 1 },
            grid: { color: '#e2e8f0' },
            beginAtZero: true
          }
        }
      }
    });
  }

  const regionCtx = document.getElementById('chart-wilayah');
  if (regionCtx) {
    if (regionChartInstance) regionChartInstance.destroy();
    const regions = [...regionCounts.entries()].sort((a, b) => b[1] - a[1]);
    regionChartInstance = new Chart(regionCtx, {
      type: 'bar',
      data: {
        labels: regions.map(([region]) => region),
        datasets: [{
          label: 'Jumlah Aduan',
          data: regions.map(([, count]) => count),
          backgroundColor: '#0e7490',
          borderRadius: 8
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { color: '#64748b', stepSize: 1 },
            grid: { color: '#e2e8f0' },
            beginAtZero: true
          },
          y: {
            ticks: { color: '#64748b', font: { family: 'Inter, system-ui, sans-serif' } },
            grid: { display: false }
          }
        }
      }
    });
  }
}
