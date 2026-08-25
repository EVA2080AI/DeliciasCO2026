// Una sola vez (y cuando cambie el logo): genera las versiones optimizadas de los assets locales.
// Uso: node scripts/optimize-static.mjs
import sharp from 'sharp';
import { existsSync, mkdirSync, statSync, unlinkSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const IMG = 'src/assets/images';
const PUB = 'public';
const kb = (p) => `${Math.round(statSync(p).size / 1024)} KB`;

const toWebp = async (src, dest, width, quality = 80) => {
  await sharp(src).rotate().resize({ width, withoutEnlargement: true }).webp({ quality, effort: 5 }).toFile(dest);
  console.log(`${src} (${kb(src)}) → ${dest} (${kb(dest)})`);
};
const toPng = async (src, dest, size) => {
  await sharp(src).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9, palette: true }).toFile(dest);
  console.log(`${src} → ${dest} (${kb(dest)})`);
};

mkdirSync(PUB, { recursive: true });

// Logo: WebP 256 px para la app + PNGs para PWA/iOS/favicon
const logo = `${IMG}/logo.png`;
await sharp(logo).resize({ width: 256 }).webp({ quality: 90, alphaQuality: 90 }).toFile(`${IMG}/logo.webp`);
console.log(`${logo} (${kb(logo)}) → ${IMG}/logo.webp (${kb(`${IMG}/logo.webp`)})`);
await toPng(logo, `${PUB}/pwa-192.png`, 192);
await toPng(logo, `${PUB}/pwa-512.png`, 512);
await toPng(logo, `${PUB}/apple-touch-icon.png`, 180);
await toPng(logo, `${PUB}/favicon-32.png`, 32);
await toPng(logo, `${PUB}/logo.png`, 512); // compat: enlaces antiguos a /logo.png

// og:image 1200×630 (JPEG: WhatsApp/Facebook no renderizan WebP)
await sharp(`${IMG}/hero-pastel.jpg`).resize(1200, 630, { fit: 'cover', position: 'attention' }).jpeg({ quality: 82, mozjpeg: true }).toFile(`${PUB}/og-image.jpg`);
console.log(`→ ${PUB}/og-image.jpg (${kb(`${PUB}/og-image.jpg`)})`);

// Fotos usadas como fallback en el sitio
const photos = [
  ['hero-pastel.jpg', 'hero-pastel.webp', 1600],
  ['pastel-real.jpg', 'pastel-real.webp', 1200],
  ['cafe-premium.jpg', 'cafe-premium.webp', 800],
  ['pan-de-bono.jpg', 'pan-de-bono.webp', 800],
  ['empanada.jpg', 'empanada.webp', 800],
  ['pastel-carne.jpg', 'pastel-carne.webp', 800],
  ['products/pastel-pollo.jpg', 'pastel-pollo.webp', 800],
  ['products/almojabana.jpg', 'almojabana.webp', 800],
  ['products/chocolate-queso.jpg', 'chocolate-queso.webp', 800],
];
for (const [src, dest, width] of photos) await toWebp(`${IMG}/${src}`, `${IMG}/${dest}`, width);

// Limpieza: quedan solo los .webp (los .jpg/.png originales viven en el historial de git)
for (const f of readdirSync(IMG)) {
  const p = path.join(IMG, f);
  if (statSync(p).isFile() && /\.(jpe?g|png)$/i.test(f)) { unlinkSync(p); console.log(`borrado ${p}`); }
}
if (existsSync(`${IMG}/products`)) { rmSync(`${IMG}/products`, { recursive: true }); console.log(`borrado ${IMG}/products/`); }
