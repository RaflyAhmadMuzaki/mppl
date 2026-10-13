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
            '#10b981', // Sampah (Emerald)
            '#3b82f6', // Jalan & Fasilitas (Blue)
            '#06b6d4', // Air & Drainase (Cyan)
            '#8b5cf6', // Ruang Terbuka (Purple)
            '#64748b'  // Lainnya (Slate)
          ],
          borderWidth: 2,
          borderColor: '#0f172a'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              font: { family: 'Source Sans 3, sans-serif', size: 11 }
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
            '#f59e0b', // Amber
            '#3b82f6', // Blue
            '#10b981', // Green
            '#ef4444'  // Red
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
            ticks: { color: '#94a3b8', font: { family: 'Source Sans 3, sans-serif' } },
            grid: { display: false }
          },
          y: {
            ticks: { color: '#94a3b8', stepSize: 1 },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
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
          backgroundColor: '#06b6d4',
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
            ticks: { color: '#94a3b8', stepSize: 1 },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            beginAtZero: true
          },
          y: {
            ticks: { color: '#94a3b8', font: { family: 'Source Sans 3, sans-serif' } },
            grid: { display: false }
          }
        }
      }
    });
  }
}
