// Edge Function: avisa por correo cuando entra una cotización o un pedido nuevo.
//
// Se dispara con un Database Webhook (Supabase → Database → Webhooks) configurado así:
//   - Tabla: public.quotations  (evento INSERT)  → HTTP POST a esta función
//   - Tabla: public.orders      (evento INSERT)  → HTTP POST a esta función
//   Header:  Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>  (o el anon key + verify_jwt)
//
// Secretos (supabase secrets set ...):
//   RESEND_API_KEY   → clave de https://resend.com (remitente/dominio verificado)
//   NOTIFY_FROM      → p. ej. "Delicias Colombianas <pedidos@elmejorpasteldepollodc.com>"
//   NOTIFY_TO        → (opcional) correo destino fijo; si falta se usa site_settings.notification_email
//   WEBHOOK_SECRET   → (opcional) valor esperado en el header x-webhook-secret
//
// Despliegue: supabase functions deploy notify-new-lead --no-verify-jwt
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type WebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: 'quotations' | 'orders' | string;
  schema: string;
  record: Record<string, unknown> | null;
};

const toWaNumber = (raw: unknown): string => {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.length === 10 ? `57${digits}` : digits;
};

const cop = (n: unknown) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(n) || 0);

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

const itemsHtml = (items: unknown) => {
  if (!Array.isArray(items)) return '';
  const rows = items
    .map((i) => {
      const it = i as Record<string, unknown>;
      const name = it.name ?? (it.product as Record<string, unknown> | undefined)?.name ?? '';
      const qty = it.quantity ?? '';
      const subtotal = it.subtotal ?? (Number((it.product as Record<string, unknown> | undefined)?.price) || 0) * (Number(qty) || 0);
      return `<tr><td style="padding:4px 8px">${esc(qty)}×</td><td style="padding:4px 8px">${esc(name)}</td><td style="padding:4px 8px;text-align:right">${cop(subtotal)}</td></tr>`;
    })
    .join('');
  return `<table style="border-collapse:collapse;margin:8px 0">${rows}</table>`;
};

const buildEmail = (table: string, r: Record<string, unknown>) => {
  const isQuote = table === 'quotations';
  const phone = String(r.phone ?? r.customer_phone ?? '');
  const name = String(r.contact_name ?? r.customer_name ?? '');
  const company = isQuote ? String(r.company_name ?? '') : '';
  const wa = toWaNumber(phone);
  const subject = isQuote
    ? `Nueva cotización empresarial: ${company || name} (${cop(r.total)})`
    : `Nuevo pedido web: ${name} (${cop(r.total)})`;

  const lines: string[] = [];
  if (company) lines.push(`<b>Empresa:</b> ${esc(company)}${r.nit ? ` (NIT ${esc(r.nit)})` : ''}`);
  lines.push(`<b>Contacto:</b> ${esc(name)}`);
  lines.push(`<b>Teléfono:</b> ${esc(phone)}${wa ? ` — <a href="https://wa.me/${wa}">Escribir por WhatsApp</a>` : ''}`);
  if (r.email || r.customer_email) lines.push(`<b>Email:</b> ${esc(r.email ?? r.customer_email)}`);
  if (r.delivery_type) lines.push(`<b>Entrega:</b> ${r.delivery_type === 'pickup' ? 'Recoger en sede' : 'Envío a domicilio'}`);
  if (r.sede) lines.push(`<b>Sede:</b> ${esc(r.sede)}`);
  if (r.address || r.delivery_address) lines.push(`<b>Dirección:</b> ${esc(r.address ?? r.delivery_address)}`);
  if (r.requested_date) lines.push(`<b>Fecha solicitada:</b> ${esc(r.requested_date)}`);
  if (r.notes) lines.push(`<b>Notas:</b> ${esc(r.notes)}`);

  const html = `
    <div style="font-family:system-ui,sans-serif;color:#222;max-width:640px">
      <h2 style="margin:0 0 12px">${esc(subject)}</h2>
      <p>${lines.join('<br>')}</p>
      ${itemsHtml(r.items)}
      <p style="font-size:18px"><b>Total: ${cop(r.total)}</b></p>
      <p style="color:#666;font-size:12px">Gestiona esta ${isQuote ? 'cotización' : 'orden'} en el panel: /admin/${isQuote ? 'quotations' : 'orders'}</p>
    </div>`;
  return { subject, html };
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const expectedSecret = Deno.env.get('WEBHOOK_SECRET');
  if (expectedSecret && req.headers.get('x-webhook-secret') !== expectedSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }
  if (payload.type !== 'INSERT' || !payload.record || !['quotations', 'orders'].includes(payload.table)) {
    return new Response(JSON.stringify({ skipped: true }), { headers: { 'content-type': 'application/json' } });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let to = Deno.env.get('NOTIFY_TO') ?? '';
  if (!to) {
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'notification_email').maybeSingle();
    to = data?.value ?? '';
  }
  if (!to) return new Response(JSON.stringify({ skipped: 'no notification_email configured' }), { headers: { 'content-type': 'application/json' } });

  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('NOTIFY_FROM') ?? 'Delicias Colombianas <onboarding@resend.dev>';
  if (!apiKey) return new Response('RESEND_API_KEY missing', { status: 500 });

  const { subject, html } = buildEmail(payload.table, payload.record);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: to.split(',').map((s) => s.trim()).filter(Boolean), subject, html }),
  });
  const body = await res.text();
  return new Response(body, { status: res.ok ? 200 : 502, headers: { 'content-type': 'application/json' } });
});
