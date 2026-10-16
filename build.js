// page.html is the source for both targets:
//   - the artifact publishes page.html as is
//   - the phone app is page.html + shim.js + manifest, written to docs/ for GitHub Pages
// Run: node build.js
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const here = __dirname, out = path.join(here, 'docs');
fs.mkdirSync(out, { recursive: true });

const page = fs.readFileSync(path.join(here, 'page.html'), 'utf8');
const head = '<link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#1B1713">' +
  '<link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="icon-192.png">';
const shim = '<script>\n' + fs.readFileSync(path.join(here, 'shim.js'), 'utf8') + '</script>\n';
if (!page.includes('</head><body>')) throw new Error('page.html must start with the document skeleton');
const app = page.replace('</head><body>', head + '</head><body>\n' + shim);
fs.writeFileSync(path.join(out, 'index.html'), app);
fs.copyFileSync(path.join(here, 'sw.js'), path.join(out, 'sw.js'));
fs.writeFileSync(path.join(out, '.nojekyll'), '');
fs.writeFileSync(path.join(out, 'manifest.webmanifest'), JSON.stringify({
  name: '만다라트 계획표', short_name: '계획표', lang: 'ko', start_url: './', scope: './',
  display: 'standalone', orientation: 'portrait', background_color: '#1B1713', theme_color: '#1B1713',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
  ]
}, null, 2));

// icon: dark square, amber ring with a check, drawn into a raw PNG
function png(size) {
  const bg = [0x1B, 0x17, 0x13], fg = [0xE0, 0x8A, 0x3C];
  const c = size / 2, R = size * 0.30, w = size * 0.035;
  const segDist = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  };
  const s = size / 100;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const px = x + 0.5, py = y + 0.5;
      const ring = Math.abs(Math.hypot(px - c, py - c) - R) - w;
      const tick = Math.min(segDist(px, py, 38 * s, 51 * s, 46 * s, 59 * s), segDist(px, py, 46 * s, 59 * s, 63 * s, 41 * s)) - w;
      const a = Math.max(0, Math.min(1, 0.5 - Math.min(ring, tick)));
      const o = y * (size * 3 + 1) + 1 + x * 3;
      for (let k = 0; k < 3; k++) raw[o + k] = Math.round(bg[k] + (fg[k] - bg[k]) * a);
    }
  }
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = 0xFFFFFFFF; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([l, td, cr]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
fs.writeFileSync(path.join(out, 'icon-192.png'), png(192));
fs.writeFileSync(path.join(out, 'icon-512.png'), png(512));
console.log('built docs/:', fs.readdirSync(out).join(', '));
