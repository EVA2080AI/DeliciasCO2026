import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CMS_KEYS, invalidateCms } from '@/lib/cmsSync';
import { AlertTriangle, CheckCircle2, Loader2, Sparkles, X, XCircle } from 'lucide-react';
import {
  collectReferences,
  findBrokenReferences,
  formatBytes,
  listAllObjects,
  planOptimization,
  probeWritePermission,
  runOptimization,
  summarizePlan,
  type ItemResult,
  type PlanAction,
  type PlanItem,
} from '@/lib/mediaOptimizer';

type Props = { isOpen: boolean; onClose: () => void; onFinished: () => void };
type Stage = 'idle' | 'analyzing' | 'planned' | 'running' | 'done';

const ACTION_LABEL: Record<PlanAction, { label: string; cls: string }> = {
  convert: { label: 'Convertir', cls: 'bg-primary/10 text-primary' },
  'thumb-only': { label: 'Solo miniatura', cls: 'bg-blue-500/10 text-blue-600' },
  skip: { label: 'Ya optimizada', cls: 'bg-green-500/10 text-green-600' },
  orphan: { label: 'Huérfana', cls: 'bg-amber-500/10 text-amber-600' },
  thumb: { label: 'Miniatura', cls: 'bg-muted text-muted-foreground' },
};

const describeRefs = (item: PlanItem) => {
  if (item.refs.length === 0) return '—';
  const parts = item.refs.map((r) => {
    if (r.table === 'site_settings') return `ajuste ${r.key}`;
    if (r.table === 'products') return 'producto';
    if (r.table === 'blog_posts') return 'blog';
    return r.column === 'metadata' ? 'slide hero' : 'sección';
  });
  return [...new Set(parts)].join(', ');
};


export const OptimizeMediaDialog = ({ isOpen, onClose, onFinished }: Props) => {
  const qc = useQueryClient();
  const [stage, setStage] = useState<Stage>('idle');
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteOriginals, setDeleteOriginals] = useState(false);
  const [deleteOrphans, setDeleteOrphans] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<ItemResult[]>([]);
  const [broken, setBroken] = useState<{ path: string }[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStage('idle');
    setPlan([]);
    setResults([]);
    setError(null);
    setBroken([]);
    probeWritePermission().then((r) => setPermissionError(r.ok ? null : r.message ?? 'Sin permiso'));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stage !== 'running') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, stage, onClose]);

  const summary = useMemo(() => summarizePlan(plan), [plan]);

  const analyze = async () => {
    setStage('analyzing');
    setError(null);
    try {
      const [objects, refs] = await Promise.all([listAllObjects(), collectReferences()]);
      setPlan(planOptimization(objects, refs));
      setStage('planned');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStage('idle');
    }
  };

  const execute = async () => {
    setStage('running');
    setResults([]);
    const controller = new AbortController();
    abortRef.current = controller;
    const total = plan.filter((p) => p.action === 'convert' || p.action === 'thumb-only' || (p.action === 'orphan' && deleteOrphans)).length;
    setProgress({ done: 0, total });
    try {
      const res = await runOptimization(plan, {
        deleteOriginals,
        deleteOrphans,
        signal: controller.signal,
        onProgress: (done, tot, last) => {
          setProgress({ done, total: tot });
          setResults((prev) => [...prev, last]);
        },
      });
      setResults(res);
      const objects = await listAllObjects();
      setBroken(await findBrokenReferences(objects));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      invalidateCms(qc, [...CMS_KEYS.products, ...CMS_KEYS.settings, ...CMS_KEYS.sections, ...CMS_KEYS.blog]);
      setStage('done');
      onFinished();
    }
  };

  if (!isOpen) return null;

  const okCount = results.filter((r) => r.status === 'ok').length;
  const errCount = results.filter((r) => r.status === 'error').length;
  const savedBytes = results.reduce((s, r) => s + (r.status === 'ok' && r.after !== undefined ? Math.max(0, r.before - r.after) : 0), 0);
  const canRun = stage === 'planned' && !permissionError && (summary.convert + summary.thumbOnly > 0 || (deleteOrphans && summary.orphan > 0));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={() => stage !== 'running' && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="optimize-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card w-full max-w-5xl max-h-[88vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 id="optimize-title" className="font-display text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Optimizar imágenes
            </h2>
            <p className="text-sm text-muted-foreground">
              Convierte las imágenes existentes a WebP con miniaturas y actualiza el sitio para usarlas.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={stage === 'running'}
            className="p-2 rounded-xl hover:bg-secondary text-muted-foreground transition-colors disabled:opacity-40"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {permissionError && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Tu usuario no puede escribir en el almacenamiento.</p>
                <p className="text-xs opacity-80 mt-0.5">
                  Necesita el rol <code>admin</code> en la tabla <code>user_roles</code>. Detalle: {permissionError}
                </p>
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
              <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}

          {stage === 'idle' && (
            <div className="text-center py-10">
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                Primero analizamos el almacenamiento: qué imágenes pesan de más, dónde se usan y cuáles ya no se usan.
                <br />
                El análisis no modifica nada.
              </p>
              <button
                onClick={analyze}
                disabled={!!permissionError}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" /> Analizar
              </button>
            </div>
          )}

          {stage === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p>Analizando imágenes y referencias…</p>
            </div>
          )}

          {(stage === 'planned' || stage === 'running' || stage === 'done') && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <Stat label="A convertir" value={`${summary.convert}`} hint={formatBytes(summary.bytesToConvert)} />
                <Stat label="Solo miniatura" value={`${summary.thumbOnly}`} />
                <Stat label="Ya optimizadas" value={`${summary.skip}`} />
                <Stat label="Huérfanas" value={`${summary.orphan}`} hint={formatBytes(summary.orphanBytes)} />
              </div>

              {stage === 'planned' && (
                <div className="flex flex-col sm:flex-row gap-4 p-3 rounded-xl bg-secondary/40 border text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={deleteOriginals} onChange={(e) => setDeleteOriginals(e.target.checked)} className="accent-primary" />
                    Eliminar originales tras verificar
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={deleteOrphans} onChange={(e) => setDeleteOrphans(e.target.checked)} className="accent-primary" />
                    Eliminar huérfanas ({summary.orphan})
                  </label>
                  <span className="text-xs text-muted-foreground sm:ml-auto">
                    Recomendado: ejecuta primero sin borrar, revisa el sitio y vuelve a ejecutar con «huérfanas».
                  </span>
                </div>
              )}

              {stage === 'running' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-primary" /> Procesando {progress.done}/{progress.total}…</span>
                    <button onClick={() => abortRef.current?.abort()} className="text-xs text-muted-foreground hover:text-destructive">Detener</button>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
                  </div>
                </div>
              )}

              {stage === 'done' && (
                <div className={`flex items-start gap-3 p-3 rounded-xl text-sm ${errCount ? 'bg-amber-500/10 text-amber-700' : 'bg-green-500/10 text-green-700'}`}>
                  {errCount ? <AlertTriangle className="w-4 h-4 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 mt-0.5" />}
                  <div>
                    <p className="font-semibold">{okCount} imágenes procesadas{errCount ? `, ${errCount} con error` : ''}. Ahorro: {formatBytes(savedBytes)}.</p>
                    {broken.length > 0 ? (
                      <p className="text-xs mt-1">⚠️ {broken.length} referencia(s) apuntan a archivos inexistentes: {broken.map((b) => b.path).join(', ')}</p>
                    ) : (
                      <p className="text-xs mt-1 opacity-80">Todas las referencias del sitio apuntan a archivos existentes.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="rounded-xl border overflow-hidden">
                <div className="overflow-x-auto max-h-[40vh]">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary/60 text-muted-foreground sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-semibold">Archivo</th>
                        <th className="text-right p-2 font-semibold">Tamaño</th>
                        <th className="text-left p-2 font-semibold">Uso</th>
                        <th className="text-left p-2 font-semibold">Acción</th>
                        <th className="text-left p-2 font-semibold">Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan
                        .filter((p) => p.action !== 'thumb')
                        .sort((a, b) => b.size - a.size)
                        .map((p) => {
                          const res = results.find((r) => r.path === p.path);
                          return (
                            <tr key={p.path} className="border-t">
                              <td className="p-2 font-mono truncate max-w-[260px]" title={p.path}>{p.path}</td>
                              <td className="p-2 text-right tabular-nums whitespace-nowrap">
                                {formatBytes(p.size)}
                                {res?.status === 'ok' && res.after !== undefined && res.action === 'convert' && (
                                  <span className="text-green-600"> → {formatBytes(res.after)}</span>
                                )}
                              </td>
                              <td className="p-2 text-muted-foreground">{describeRefs(p)}</td>
                              <td className="p-2">
                                <span className={`px-2 py-0.5 rounded-full font-semibold ${ACTION_LABEL[p.action].cls}`}>{ACTION_LABEL[p.action].label}</span>
                              </td>
                              <td className="p-2 text-muted-foreground">
                                {res?.status === 'error' ? <span className="text-destructive">{res.error}</span> : res?.status === 'ok' ? <span className="text-green-600">Listo</span> : p.reason}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t bg-secondary/20">
          {stage === 'done' && (
            <button onClick={analyze} className="px-4 py-2 rounded-xl border text-sm hover:bg-secondary">Analizar de nuevo</button>
          )}
          <button onClick={onClose} disabled={stage === 'running'} className="px-4 py-2 rounded-xl border text-sm hover:bg-secondary disabled:opacity-40">
            {stage === 'done' ? 'Cerrar' : 'Cancelar'}
          </button>
          {stage === 'planned' && (
            <button
              onClick={execute}
              disabled={!canRun}
              className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 text-sm"
            >
              <Sparkles className="w-4 h-4" /> Ejecutar
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="p-3 rounded-xl border bg-background">
    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="font-display text-xl font-bold">{value}</p>
    {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

export default OptimizeMediaDialog;
