import fs from 'fs';
import path from 'path';

const dir = './public/icons';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

// Generate simple valid PNG icon (using raw canvas or SVG fallback)
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="128" fill="#0f172a"/>
  <circle cx="256" cy="256" r="200" fill="#1e293b" stroke="#10b981" stroke-width="12"/>
  <!-- Leaf and City Icon -->
  <path d="M256 120 C180 120 140 180 140 260 C140 340 200 380 256 380 C312 380 372 340 372 260 C372 180 332 120 256 120 Z" fill="#10b981" opacity="0.85"/>
  <path d="M256 160 Q320 220 256 350 Q192 220 256 160 Z" fill="#059669"/>
  <path d="M256 170 L256 360" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
  <!-- City Skyline Silhouette -->
  <path d="M160 360 L160 280 L190 280 L190 360 L210 360 L210 240 L250 240 L250 360 L270 360 L270 260 L310 260 L310 360 L340 360 L340 310 L360 310 L360 360 Z" fill="#0f172a" opacity="0.9"/>
  <circle cx="256" cy="110" r="18" fill="#34d399"/>
</svg>`;

fs.writeFileSync('./public/icons/icon.svg', svgIcon);
console.log("SVG Icon generated!");
