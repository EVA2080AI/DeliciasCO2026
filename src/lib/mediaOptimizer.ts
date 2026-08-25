/**
 * Re-optimización de las imágenes YA subidas al bucket (plan Free: sin transformaciones).
 * Corre en el navegador con la sesión del admin: lista el bucket, detecta dónde se usa cada
 * imagen, la re-comprime a WebP (+ miniatura), sube a una RUTA NUEVA, actualiza las referencias
 * en la base de datos, verifica y —solo si se pide— borra el original.
 */
import { supabase } from '@/integrations/supabase/client';
import { IMAGE_PRESETS, compressImage, extForMime, makeVariants, stripExt, type ImagePreset } from '@/lib/imageCompression';
import { BUCKET, bucketPathFromUrl, isThumbPath, publicUrlForPath, thumbPathFor } from '@/lib/imageUrls';
import { CACHE_CONTROL } from '@/lib/storage';

export type BucketObject = { path: string; size: number; mime: string | null; createdAt?: string };

export type RefLocation =
  | { table: 'products' | 'blog_posts' | 'page_sections'; id: string; column: 'image_url' }
  | { table: 'page_sections'; id: string; column: 'metadata' }
  | { table: 'site_settings'; key: string };

export type PlanAction = 'convert' | 'thumb-only' | 'skip' | 'orphan' | 'thumb';

export type PlanItem = {
  path: string;
  size: number;
  mime: string | null;
  preset: ImagePreset;
  action: PlanAction;
  reason: string;
  refs: RefLocation[];
  newPath?: string;
  thumbPath?: string;
};

export type ItemResult = {
  path: string;
  action: PlanAction;
  status: 'ok' | 'skipped' | 'error';
  newPath?: string;
  before: number;
  after?: number;
  error?: string;
};

export type RunOptions = {
  deleteOriginals: boolean;
  deleteOrphans: boolean;
  onProgress: (done: number, total: number, last: ItemResult) => void;
  signal?: AbortSignal;
};

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif|bmp|tiff?)$/i;

export const isImagePath = (path: string) => IMAGE_EXT.test(path);

/** Lista recursiva del bucket (raíz + carpetas como `site/`). */
export const listAllObjects = async (): Promise<BucketObject[]> => {
  const out: BucketObject[] = [];
  const walk = async (prefix: string, depth: number) => {
    const limit = 200;
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(prefix, { limit, offset, sortBy: { column: 'name', order: 'asc' } });
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const o of data) {
        if (o.name === '.emptyFolderPlaceholder') continue;
        const path = prefix ? `${prefix}/${o.name}` : o.name;
        const isFolder = !o.id && !o.metadata;
        if (isFolder) {
          if (depth < 3) await walk(path, depth + 1);
          continue;
        }
        const meta = (o.metadata ?? {}) as { size?: number; mimetype?: string };
        out.push({ path, size: meta.size ?? 0, mime: meta.mimetype ?? null, createdAt: o.created_at });
      }
      if (data.length < limit) break;
      offset += limit;
    }
  };
  await walk('', 0);
  return out;
};

/** Devuelve todas las URLs del bucket que aparezcan como strings dentro de un JSON arbitrario. */
export const collectUrlsDeep = (value: unknown, acc: string[] = []): string[] => {
  if (typeof value === 'string') {
    if (bucketPathFromUrl(value)) acc.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectUrlsDeep(v, acc));
  } else if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((v) => collectUrlsDeep(v, acc));
  }
  return acc;
};

/** Reemplaza (inmutablemente) cualquier string cuya ruta de bucket sea `oldPath` por `newUrl`. */
export const replaceUrlsDeep = <T,>(value: T, oldPath: string, newUrl: string): T => {
  if (typeof value === 'string') {
    return (bucketPathFromUrl(value) === oldPath ? newUrl : value) as unknown as T;
  }
  if (Array.isArray(value)) return value.map((v) => replaceUrlsDeep(v, oldPath, newUrl)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = replaceUrlsDeep(v, oldPath, newUrl);
    return out as T;
  }
  return value;
};

/** Mapa ruta-en-bucket → lugares de la DB que la referencian. */
export const collectReferences = async (): Promise<Map<string, RefLocation[]>> => {
  const refs = new Map<string, RefLocation[]>();
  const add = (url: string | null | undefined, loc: RefLocation) => {
    const p = bucketPathFromUrl(url);
    if (!p) return;
    const arr = refs.get(p) ?? [];
    arr.push(loc);
    refs.set(p, arr);
  };

  const [products, posts, sections, settings] = await Promise.all([
    supabase.from('products').select('id,image_url'),
    supabase.from('blog_posts').select('id,image_url'),
    supabase.from('page_sections').select('id,image_url,metadata'),
    supabase.from('site_settings').select('key,value'),
  ]);
  for (const r of [products, posts, sections, settings]) if (r.error) throw r.error;

  products.data?.forEach((p) => add(p.image_url, { table: 'products', id: p.id, column: 'image_url' }));
  posts.data?.forEach((p) => add(p.image_url, { table: 'blog_posts', id: p.id, column: 'image_url' }));
  sections.data?.forEach((s) => {
    add(s.image_url, { table: 'page_sections', id: s.id, column: 'image_url' });
    for (const url of collectUrlsDeep(s.metadata)) add(url, { table: 'page_sections', id: s.id, column: 'metadata' });
  });
  settings.data?.forEach((s) => add(s.value, { table: 'site_settings', key: s.key }));
  return refs;
};

const presetRank = (p: ImagePreset) => IMAGE_PRESETS[p].maxWidthOrHeight + (IMAGE_PRESETS[p].thumb ? 1 : 0);

const presetForSettingKey = (key: string): ImagePreset => {
  if (key === 'brand_logo') return 'logo';
  if (key === 'seo_og_image') return 'og';
  if (key === 'login_cover_image') return 'cover';
  return 'section';
};

/** Preset por nombre de archivo (cuando no hay referencias que lo indiquen). */
export const presetForPath = (path: string): ImagePreset => {
  const name = path.split('/').pop() ?? path;
  if (path.startsWith('site/')) return presetForSettingKey(name.replace(/[-.].*$/, ''));
  if (name.startsWith('product-')) return 'product';
  if (name.startsWith('slide-')) return 'hero';
  if (name.startsWith('blog-')) return 'blog';
  return 'section';
};

/** Preset según DÓNDE se usa la imagen (gana el de mayor resolución si se usa en varios sitios). */
export const presetForItem = (path: string, refs: RefLocation[]): ImagePreset => {
  if (refs.length === 0) return presetForPath(path);
  const candidates = refs.map((r): ImagePreset => {
    if (r.table === 'site_settings') return presetForSettingKey(r.key);
    if (r.table === 'products') return 'product';
    if (r.table === 'blog_posts') return 'blog';
    return r.column === 'metadata' ? 'hero' : 'section';
  });
  return candidates.sort((a, b) => presetRank(b) - presetRank(a))[0];
};

export const formatBytes = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

/** Plan idempotente: qué hacer con cada objeto del bucket. */
export const planOptimization = (objects: BucketObject[], refs: Map<string, RefLocation[]>): PlanItem[] => {
  const existing = new Set(objects.map((o) => o.path));
  const uniquePath = (base: string, ext: string) => {
    let candidate = `${base}.${ext}`;
    let n = 1;
    while (existing.has(candidate)) candidate = `${base}-${n++}.${ext}`;
    existing.add(candidate);
    return candidate;
  };

  return objects
    .filter((o) => isImagePath(o.path))
    .map((o): PlanItem => {
      const itemRefs = refs.get(o.path) ?? [];
      const base = { path: o.path, size: o.size, mime: o.mime, refs: itemRefs };

      if (isThumbPath(o.path)) {
        const parent = o.path.replace(/-thumb\.webp$/i, '.webp');
        const parentUsed = existing.has(parent) && (refs.get(parent)?.length ?? 0) > 0;
        return parentUsed
          ? { ...base, preset: 'thumb', action: 'thumb', reason: 'Miniatura de una imagen en uso' }
          : { ...base, preset: 'thumb', action: 'orphan', reason: 'Miniatura sin imagen principal' };
      }

      const preset = presetForItem(o.path, itemRefs);
      const spec = IMAGE_PRESETS[preset];

      if (itemRefs.length === 0) {
        return { ...base, preset, action: 'orphan', reason: 'No se usa en ninguna parte del sitio' };
      }

      const targetExt = extForMime(spec.fileType);
      const alreadyTargetFormat = new RegExp(`\\.${targetExt}$`, 'i').test(o.path);
      const budget = spec.maxSizeMB * 1024 * 1024 * 1.25;
      const hasThumb = existing.has(thumbPathFor(o.path));

      if (alreadyTargetFormat && o.size <= budget) {
        if (spec.thumb && !hasThumb) {
          return { ...base, preset, action: 'thumb-only', reason: 'Ya optimizada, falta la miniatura', thumbPath: thumbPathFor(o.path) };
        }
        return { ...base, preset, action: 'skip', reason: 'Ya optimizada' };
      }

      const stem = alreadyTargetFormat ? `${stripExt(o.path)}-opt` : stripExt(o.path);
      const newPath = uniquePath(stem, targetExt);
      return {
        ...base,
        preset,
        action: 'convert',
        reason: alreadyTargetFormat ? `Pesa ${formatBytes(o.size)} (máx. ${formatBytes(budget)})` : `${(o.mime ?? 'imagen').replace('image/', '').toUpperCase()} → ${targetExt.toUpperCase()}`,
        newPath,
        thumbPath: spec.thumb ? thumbPathFor(newPath) : undefined,
      };
    });
};

export const summarizePlan = (plan: PlanItem[]) => {
  const by = (a: PlanAction) => plan.filter((p) => p.action === a);
  const convert = by('convert');
  return {
    convert: convert.length,
    thumbOnly: by('thumb-only').length,
    skip: by('skip').length,
    orphan: by('orphan').length,
    thumbs: by('thumb').length,
    bytesToConvert: convert.reduce((s, p) => s + p.size, 0),
    orphanBytes: by('orphan').reduce((s, p) => s + p.size, 0),
  };
};

// ─── Ejecución ────────────────────────────────────────────────────────────────

const fetchBlob = async (path: string): Promise<Blob> => {
  const res = await fetch(publicUrlForPath(path), { cache: 'no-store' });
  if (!res.ok) throw new Error(`No se pudo descargar (${res.status})`);
  return res.blob();
};

const upload = async (path: string, file: File) => {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: CACHE_CONTROL,
    contentType: file.type,
    upsert: true, // la ruta es nueva; upsert solo hace idempotente un reintento tras fallo parcial
  });
  if (error) throw error;
};

const verifyUploaded = async (path: string, expectedType?: string) => {
  const res = await fetch(publicUrlForPath(path), { method: 'HEAD', cache: 'no-store' });
  if (!res.ok) throw new Error(`Verificación fallida: ${path} responde ${res.status}`);
  const ct = res.headers.get('content-type') ?? '';
  if (expectedType && !ct.startsWith(expectedType)) throw new Error(`Verificación fallida: ${path} es ${ct}`);
};

const updateReferences = async (oldPath: string, newUrl: string, refs: RefLocation[]) => {
  for (const ref of refs) {
    if (ref.table === 'site_settings') {
      const { error } = await supabase.from('site_settings').update({ value: newUrl }).eq('key', ref.key);
      if (error) throw error;
      continue;
    }
    if (ref.column === 'image_url') {
      const { error } = await supabase.from(ref.table).update({ image_url: newUrl }).eq('id', ref.id);
      if (error) throw error;
      continue;
    }
    // page_sections.metadata: releer y reemplazar en profundidad (cubre slides[].img y cualquier clave futura)
    const { data, error } = await supabase.from('page_sections').select('metadata').eq('id', ref.id).single();
    if (error) throw error;
    const next = replaceUrlsDeep(data.metadata, oldPath, newUrl);
    const { error: upErr } = await supabase.from('page_sections').update({ metadata: next as never }).eq('id', ref.id);
    if (upErr) throw upErr;
  }
};

/** Relee las filas tocadas y confirma que ninguna sigue apuntando a la ruta vieja. */
const verifyReferencesMoved = async (oldPath: string, refs: RefLocation[]) => {
  for (const ref of refs) {
    let urls: string[] = [];
    if (ref.table === 'site_settings') {
      const { data } = await supabase.from('site_settings').select('value').eq('key', ref.key).single();
      urls = [data?.value ?? ''];
    } else if (ref.column === 'image_url') {
      const { data } = await supabase.from(ref.table).select('image_url').eq('id', ref.id).single();
      urls = [data?.image_url ?? ''];
    } else {
      const { data } = await supabase.from('page_sections').select('metadata').eq('id', ref.id).single();
      urls = collectUrlsDeep(data?.metadata);
    }
    if (urls.some((u) => bucketPathFromUrl(u) === oldPath)) {
      throw new Error('La base de datos sigue apuntando al archivo original');
    }
  }
};

export const removePaths = async (paths: string[]) => {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) throw error;
};

const fileFromBlob = (blob: Blob, path: string, mime: string | null) =>
  new File([blob], path.split('/').pop() ?? 'image', { type: blob.type || mime || 'image/jpeg' });

export const runOptimization = async (plan: PlanItem[], opts: RunOptions): Promise<ItemResult[]> => {
  const work = plan.filter(
    (p) => p.action === 'convert' || p.action === 'thumb-only' || (p.action === 'orphan' && opts.deleteOrphans),
  );
  const results: ItemResult[] = [];
  let done = 0;

  for (const item of work) {
    if (opts.signal?.aborted) break;
    const result: ItemResult = { path: item.path, action: item.action, status: 'ok', before: item.size };
    try {
      if (item.action === 'convert' && item.newPath) {
        const original = fileFromBlob(await fetchBlob(item.path), item.path, item.mime);
        const { main, thumb } = await makeVariants(original, item.preset);
        await upload(item.newPath, main);
        if (thumb && item.thumbPath) await upload(item.thumbPath, thumb);
        await verifyUploaded(item.newPath, main.type);
        const newUrl = publicUrlForPath(item.newPath);
        await updateReferences(item.path, newUrl, item.refs);
        await verifyReferencesMoved(item.path, item.refs);
        result.newPath = item.newPath;
        result.after = main.size;
        if (opts.deleteOriginals) {
          const oldThumb = thumbPathFor(item.path);
          await removePaths(oldThumb !== item.thumbPath ? [item.path, oldThumb] : [item.path]);
        }
      } else if (item.action === 'thumb-only' && item.thumbPath) {
        const original = fileFromBlob(await fetchBlob(item.path), item.path, item.mime);
        const thumb = await compressImage(original, 'thumb');
        await upload(item.thumbPath, thumb);
        await verifyUploaded(item.thumbPath, 'image/');
        result.after = item.size;
      } else if (item.action === 'orphan') {
        await removePaths([item.path]);
        result.after = 0;
      } else {
        result.status = 'skipped';
      }
    } catch (err) {
      result.status = 'error';
      result.error = err instanceof Error ? err.message : String(err);
    }
    results.push(result);
    done += 1;
    opts.onProgress(done, work.length, result);
  }
  return results;
};

/** Comprueba que la sesión actual puede escribir en el bucket (RLS exige rol admin en user_roles). */
export const probeWritePermission = async (): Promise<{ ok: boolean; message?: string }> => {
  const probePath = `__probe/${Date.now()}.txt`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(probePath, new Blob(['ok'], { type: 'text/plain' }), { upsert: true });
  if (error) {
    return { ok: false, message: error.message };
  }
  await supabase.storage.from(BUCKET).remove([probePath]);
  return { ok: true };
};

/** Referencias rotas: filas de la DB que apuntan a objetos que ya no existen. */
export const findBrokenReferences = async (objects: BucketObject[]): Promise<{ path: string; refs: RefLocation[] }[]> => {
  const existing = new Set(objects.map((o) => o.path));
  const refs = await collectReferences();
  const broken: { path: string; refs: RefLocation[] }[] = [];
  refs.forEach((locs, path) => {
    if (!existing.has(path)) broken.push({ path, refs: locs });
  });
  return broken;
};
