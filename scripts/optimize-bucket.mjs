// Re-optimiza TODAS las imágenes del bucket `product-images` desde tu máquina (sharp) y actualiza
// las referencias en la base de datos. Misma lógica que Admin > Medios > "Optimizar imágenes".
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/optimize-bucket.mjs --dry-run
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/optimize-bucket.mjs
//   ... --delete-originals   (segunda pasada, tras verificar el sitio)
//   ... --delete-orphans     (borra archivos que ninguna fila referencia)
//
// La service-role key NUNCA se guarda en el repo: pásala solo como variable de entorno.
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// Dos modos de autenticación:
//   a) SUPABASE_SERVICE_ROLE_KEY                               (clave secreta del proyecto)
//   b) SUPABASE_ANON_KEY + SUPABASE_ADMIN_EMAIL/PASSWORD      (sesión de un usuario con rol admin)
const URL_ = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!URL_ || (!SERVICE_KEY && !(ANON_KEY && process.env.SUPABASE_ADMIN_EMAIL && process.env.SUPABASE_ADMIN_PASSWORD))) {
  console.error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_ANON_KEY + SUPABASE_ADMIN_EMAIL/PASSWORD)');
  process.exit(1);
}
const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry-run');
const DELETE_ORIGINALS = args.has('--delete-originals');
const DELETE_ORPHANS = args.has('--delete-orphans');

const BUCKET = 'product-images';
const PUBLIC_PREFIX = `/storage/v1/object/public/${BUCKET}/`;
const CACHE_CONTROL = '31536000';
const sb = createClient(URL_, SERVICE_KEY ?? ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
if (!SERVICE_KEY) {
  const { error } = await sb.auth.signInWithPassword({ email: process.env.SUPABASE_ADMIN_EMAIL, password: process.env.SUPABASE_ADMIN_PASSWORD });
  if (error) { console.error('Login admin falló:', error.message); process.exit(1); }
  console.log(`Sesión admin: ${process.env.SUPABASE_ADMIN_EMAIL}`);
}

// Mismos presets que src/lib/imageCompression.ts (tamaño máx. y calidad)
const PRESETS = {
  product: { width: 1200, quality: 80, maxKB: 180, thumb: true },
  section: { width: 1600, quality: 80, maxKB: 250, thumb: true },
  hero: { width: 1920, quality: 78, maxKB: 300, thumb: true },
  blog: { width: 1600, quality: 80, maxKB: 250, thumb: true },
  cover: { width: 1600, quality: 75, maxKB: 300, thumb: false },
  logo: { width: 256, quality: 90, maxKB: 50, thumb: false, alpha: true },
  og: { width: 1200, quality: 85, maxKB: 300, thumb: false, jpeg: true },
  thumb: { width: 192, quality: 75, maxKB: 20 },
};
const rank = (p) => PRESETS[p].width + (PRESETS[p].thumb ? 1 : 0);
const kb = (n) => `${Math.round(n / 1024)} KB`;
const stripExt = (p) => p.replace(/\.[a-z0-9]+$/i, '');
const isThumb = (p) => /-thumb\.webp$/i.test(p);
const thumbFor = (p) => `${stripExt(p)}-thumb.webp`;
const isImage = (p) => /\.(png|jpe?g|webp|gif|avif|bmp|tiff?)$/i.test(p);
const publicUrl = (p) => `${URL_}${PUBLIC_PREFIX}${p.split('/').map(encodeURIComponent).join('/')}`;
const pathFromUrl = (u) => {
  if (typeof u !== 'string') return null;
  try {
    const { pathname } = new URL(u);
    const i = pathname.indexOf(PUBLIC_PREFIX);
    return i === -1 ? null : decodeURIComponent(pathname.slice(i + PUBLIC_PREFIX.length)) || null;
  } catch { return null; }
};

// ── Listado recursivo ──────────────────────────────────────────────────────────
const listAll = async () => {
  const out = [];
  const walk = async (prefix, depth) => {
    let offset = 0;
    for (;;) {
      const { data, error } = await sb.storage.from(BUCKET).list(prefix, { limit: 200, offset, sortBy: { column: 'name', order: 'asc' } });
      if (error) throw error;
      if (!data?.length) break;
      for (const o of data) {
        if (o.name === '.emptyFolderPlaceholder') continue;
        const path = prefix ? `${prefix}/${o.name}` : o.name;
        if (!o.id && !o.metadata) { if (depth < 3) await walk(path, depth + 1); continue; }
        out.push({ path, size: o.metadata?.size ?? 0, mime: o.metadata?.mimetype ?? null });
      }
      if (data.length < 200) break;
      offset += 200;
    }
  };
  await walk('', 0);
  return out;
};

// ── Referencias en la DB ───────────────────────────────────────────────────────
const collectUrls = (v, acc = []) => {
  if (typeof v === 'string') { if (pathFromUrl(v)) acc.push(v); }
  else if (Array.isArray(v)) v.forEach((x) => collectUrls(x, acc));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => collectUrls(x, acc));
  return acc;
};
const replaceDeep = (v, oldPath, newUrl) => {
  if (typeof v === 'string') return pathFromUrl(v) === oldPath ? newUrl : v;
  if (Array.isArray(v)) return v.map((x) => replaceDeep(x, oldPath, newUrl));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, replaceDeep(x, oldPath, newUrl)]));
  return v;
};
const collectRefs = async () => {
  const refs = new Map();
  const add = (url, loc) => { const p = pathFromUrl(url); if (!p) return; refs.set(p, [...(refs.get(p) ?? []), loc]); };
  const q = async (t, cols) => { const { data, error } = await sb.from(t).select(cols); if (error) throw error; return data ?? []; };
  (await q('products', 'id,image_url')).forEach((r) => add(r.image_url, { table: 'products', id: r.id, column: 'image_url' }));
  (await q('blog_posts', 'id,image_url')).forEach((r) => add(r.image_url, { table: 'blog_posts', id: r.id, column: 'image_url' }));
  (await q('page_sections', 'id,image_url,metadata')).forEach((r) => {
    add(r.image_url, { table: 'page_sections', id: r.id, column: 'image_url' });
    collectUrls(r.metadata).forEach((u) => add(u, { table: 'page_sections', id: r.id, column: 'metadata' }));
  });
  (await q('site_settings', 'key,value')).forEach((r) => add(r.value, { table: 'site_settings', key: r.key }));
  return refs;
};

const presetForKey = (k) => (k === 'brand_logo' ? 'logo' : k === 'seo_og_image' ? 'og' : k === 'login_cover_image' ? 'cover' : 'section');
const presetForPath = (path) => {
  const name = path.split('/').pop();
  if (path.startsWith('site/')) return presetForKey(name.replace(/[-.].*$/, ''));
  if (name.startsWith('product-')) return 'product';
  if (name.startsWith('slide-')) return 'hero';
  if (name.startsWith('blog-')) return 'blog';
  return 'section';
};
const presetForItem = (path, refs) => {
  if (!refs.length) return presetForPath(path);
  return refs
    .map((r) => (r.table === 'site_settings' ? presetForKey(r.key) : r.table === 'products' ? 'product' : r.table === 'blog_posts' ? 'blog' : r.column === 'metadata' ? 'hero' : 'section'))
    .sort((a, b) => rank(b) - rank(a))[0];
};

// ── Plan ───────────────────────────────────────────────────────────────────────
const plan = (objects, refs) => {
  const existing = new Set(objects.map((o) => o.path));
  const unique = (base, ext) => { let c = `${base}.${ext}`, n = 1; while (existing.has(c)) c = `${base}-${n++}.${ext}`; existing.add(c); return c; };
  return objects.filter((o) => isImage(o.path)).map((o) => {
    const r = refs.get(o.path) ?? [];
    if (isThumb(o.path)) {
      const parent = o.path.replace(/-thumb\.webp$/i, '.webp');
      return { ...o, refs: r, preset: 'thumb', action: existing.has(parent) && (refs.get(parent)?.length ?? 0) > 0 ? 'thumb' : 'orphan' };
    }
    const preset = presetForItem(o.path, r);
    const spec = PRESETS[preset];
    if (!r.length) return { ...o, refs: r, preset, action: 'orphan' };
    const ext = spec.jpeg ? 'jpg' : 'webp';
    const already = new RegExp(`\\.${ext}$`, 'i').test(o.path);
    if (already && o.size <= spec.maxKB * 1024 * 1.25) {
      return spec.thumb && !existing.has(thumbFor(o.path)) ? { ...o, refs: r, preset, action: 'thumb-only', thumbPath: thumbFor(o.path) } : { ...o, refs: r, preset, action: 'skip' };
    }
    const newPath = unique(already ? `${stripExt(o.path)}-opt` : stripExt(o.path), ext);
    return { ...o, refs: r, preset, action: 'convert', newPath, thumbPath: spec.thumb ? thumbFor(newPath) : undefined };
  });
};

// ── Ejecución ──────────────────────────────────────────────────────────────────
const encode = async (buf, preset) => {
  const spec = PRESETS[preset];
  let img = sharp(buf, { animated: false }).rotate().resize({ width: spec.width, height: spec.width, fit: 'inside', withoutEnlargement: true });
  if (spec.jpeg) return { buf: await img.flatten({ background: '#ffffff' }).jpeg({ quality: spec.quality, mozjpeg: true }).toBuffer(), type: 'image/jpeg' };
  let q = spec.quality;
  for (;;) {
    const out = await img.webp({ quality: q, effort: 5, alphaQuality: spec.alpha ? 90 : 80 }).toBuffer();
    if (out.length <= spec.maxKB * 1024 || q <= 45) return { buf: out, type: 'image/webp' };
    q -= 8;
  }
};
const upload = async (path, buf, type) => {
  const { error } = await sb.storage.from(BUCKET).upload(path, buf, { cacheControl: CACHE_CONTROL, contentType: type, upsert: true });
  if (error) throw error;
};
const download = async (path) => {
  const { data, error } = await sb.storage.from(BUCKET).download(path);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
};
const updateRefs = async (oldPath, newUrl, refs) => {
  for (const ref of refs) {
    if (ref.table === 'site_settings') { const { error } = await sb.from('site_settings').update({ value: newUrl }).eq('key', ref.key); if (error) throw error; continue; }
    if (ref.column === 'image_url') { const { error } = await sb.from(ref.table).update({ image_url: newUrl }).eq('id', ref.id); if (error) throw error; continue; }
    const { data, error } = await sb.from('page_sections').select('metadata').eq('id', ref.id).single(); if (error) throw error;
    const { error: e2 } = await sb.from('page_sections').update({ metadata: replaceDeep(data.metadata, oldPath, newUrl) }).eq('id', ref.id); if (e2) throw e2;
  }
};
const verifyRefs = async (oldPath, refs) => {
  for (const ref of refs) {
    let urls = [];
    if (ref.table === 'site_settings') { const { data } = await sb.from('site_settings').select('value').eq('key', ref.key).single(); urls = [data?.value]; }
    else if (ref.column === 'image_url') { const { data } = await sb.from(ref.table).select('image_url').eq('id', ref.id).single(); urls = [data?.image_url]; }
    else { const { data } = await sb.from('page_sections').select('metadata').eq('id', ref.id).single(); urls = collectUrls(data?.metadata); }
    if (urls.some((u) => pathFromUrl(u) === oldPath)) throw new Error('la DB sigue apuntando al original');
  }
};
const head = async (path, type) => {
  const res = await fetch(publicUrl(path), { method: 'HEAD' });
  if (!res.ok) throw new Error(`HEAD ${res.status} en ${path}`);
  const ct = res.headers.get('content-type') ?? '';
  if (type && !ct.startsWith(type)) throw new Error(`content-type ${ct} en ${path}`);
};

const objects = await listAll();
const refs = await collectRefs();
const items = plan(objects, refs);
const counts = {};
for (const it of items) counts[it.action] = (counts[it.action] ?? 0) + 1;
console.log(`Objetos: ${objects.length} (${kb(objects.reduce((s, o) => s + o.size, 0))}) · plan:`, counts);
for (const it of items.filter((i) => i.action !== 'thumb' && i.action !== 'skip').sort((a, b) => b.size - a.size)) {
  console.log(`  ${it.action.padEnd(10)} ${kb(it.size).padStart(8)}  ${it.preset.padEnd(7)} ${it.path}${it.newPath ? ` → ${it.newPath}` : ''}  [${it.refs.map((r) => r.table === 'site_settings' ? r.key : r.table).join(',') || 'sin uso'}]`);
}
if (DRY) { console.log('\n--dry-run: nada modificado'); process.exit(0); }

let saved = 0, ok = 0, errors = 0;
for (const it of items) {
  try {
    if (it.action === 'convert') {
      const src = await download(it.path);
      const main = await encode(src, it.preset);
      await upload(it.newPath, main.buf, main.type);
      if (it.thumbPath) { const t = await encode(src, 'thumb'); await upload(it.thumbPath, t.buf, t.type); }
      await head(it.newPath, main.type);
      await updateRefs(it.path, publicUrl(it.newPath), it.refs);
      await verifyRefs(it.path, it.refs);
      if (DELETE_ORIGINALS) { const { error } = await sb.storage.from(BUCKET).remove([it.path]); if (error) throw error; }
      saved += it.size - main.buf.length; ok++;
      console.log(`✓ ${it.path} ${kb(it.size)} → ${it.newPath} ${kb(main.buf.length)}`);
    } else if (it.action === 'thumb-only') {
      const src = await download(it.path);
      const t = await encode(src, 'thumb');
      await upload(it.thumbPath, t.buf, t.type);
      ok++; console.log(`✓ miniatura ${it.thumbPath}`);
    } else if (it.action === 'orphan' && DELETE_ORPHANS) {
      const { error } = await sb.storage.from(BUCKET).remove([it.path]); if (error) throw error;
      saved += it.size; ok++; console.log(`🗑 ${it.path} (${kb(it.size)})`);
    }
  } catch (e) {
    errors++; console.error(`✗ ${it.path}: ${e.message ?? e}`);
  }
}
// referencias rotas tras la pasada
const after = new Set((await listAll()).map((o) => o.path));
const broken = [...(await collectRefs()).keys()].filter((p) => !after.has(p));
console.log(`\nListo: ${ok} ok, ${errors} errores, ahorro ${kb(saved)}${broken.length ? `\n⚠️ referencias rotas: ${broken.join(', ')}` : '\nSin referencias rotas.'}`);
