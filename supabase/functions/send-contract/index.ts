import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function generateContractHtml(restaurant: {
  name: string
  email: string
  owner_legal_name: string
  razao_social: string | null
  restaurant_nif: string | null
  billing_address: string | null
  address: string | null
  city: string | null
  plan: string | null
}): string {
  const today = new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })
  const isPro = (restaurant.plan ?? 'lite') === 'pro'
  const planLabel = isPro ? 'Pro' : 'Lite'
  const billingAddr = restaurant.billing_address || restaurant.address || '—'
  const razao = restaurant.razao_social || restaurant.name
  const nif = restaurant.restaurant_nif || '—'

  const liteFeatures = [
    'Página do restaurante na plataforma damesa.pt',
    'Visibilidade online e melhoria de SEO',
    'Perfil completo: fotos, menu e informações de contacto',
    'Avaliações verificadas de clientes reais',
  ]

  const proFeatures = [
    ...liteFeatures,
    'Sistema de reservas online em tempo real',
    'Painel de gestão de reservas (web + app mobile)',
    'Notificações instantâneas por email e push',
    'Widget de reservas incorporável no seu website',
    'Histórico completo de clientes e reservas',
    'Relatórios e estatísticas de desempenho',
    'Suporte prioritário por email e telefone',
  ]

  const features = isPro ? proFeatures : liteFeatures

  const featureRows = features.map(f =>
    `<tr><td style="padding:7px 0;border-bottom:1px solid #f0ebe4;width:28px;vertical-align:top;">
      <span style="color:#27ae60;font-size:13pt;">✓</span>
    </td><td style="padding:7px 0 7px 10px;border-bottom:1px solid #f0ebe4;font-size:10.5pt;vertical-align:top;">${f}</td></tr>`
  ).join('')

  const proOnlyNote = isPro ? '' : `<tr><td style="padding:7px 0;width:28px;vertical-align:top;">
    <span style="color:#bbb;font-size:13pt;">✗</span>
  </td><td style="padding:7px 0 7px 10px;font-size:10.5pt;color:#aaa;vertical-align:top;">Sistema de reservas online (disponível no plano Pro)</td></tr>`

  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 11pt; color: #1c1612; background: #fff; }
  .page { max-width: 800px; margin: 0 auto; padding: 0; }
  .section-header { background: #1c1612; color: #fff; padding: 10px 18px; font-size: 10pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; margin: 28px 0 0; }
  .section-header.red { background: #c0392b; }
  table.info-table { width: 100%; border-collapse: collapse; border: 1px solid #ddd; }
  table.info-table td { padding: 9px 14px; border-bottom: 1px solid #eee; font-size: 10.5pt; vertical-align: top; }
  table.info-table td:first-child { width: 38%; background: #faf7f2; font-weight: bold; color: #4a3a2e; }
  table.pricing-table { width: 100%; border-collapse: collapse; margin-top: 0; }
  table.pricing-table th { background: #2c2018; color: #fff; padding: 10px 14px; text-align: left; font-size: 10pt; letter-spacing: 0.5px; }
  table.pricing-table th:not(:first-child) { text-align: center; }
  table.pricing-table td { padding: 10px 14px; border-bottom: 1px solid #eee; font-size: 10.5pt; }
  table.pricing-table td:not(:first-child) { text-align: center; }
  table.pricing-table tr.highlight td { background: #fff8e1; font-weight: bold; }
  .plan-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 10pt; font-weight: bold; letter-spacing: 1px; }
  .plan-pro { background: #b8860b; color: #fff; }
  .plan-lite { background: #6c757d; color: #fff; }
  .footer-strip { background: #faf7f2; border-top: 2px solid #1c1612; padding: 14px 0; text-align: center; margin-top: 40px; font-size: 9pt; color: #7a6a5e; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
<div class="page">

  <!-- ── HEADER ── -->
  <div style="background:#1c1612;padding:28px 32px 24px;display:flex;align-items:center;justify-content:space-between;">
    <div>
      <div style="font-family:Georgia,serif;font-size:30pt;color:#fff;font-weight:normal;letter-spacing:1px;">
        Da <span style="color:#e07060;">Mesa</span>
      </div>
      <div style="font-size:9pt;letter-spacing:4px;text-transform:uppercase;color:#8a7a6a;margin-top:4px;">damesa.pt</div>
    </div>
    <div style="text-align:right;color:#ccc;">
      <div style="font-size:14pt;font-weight:bold;color:#fff;letter-spacing:0.5px;">Formulário de Contrato</div>
      <div style="font-size:9pt;margin-top:6px;color:#a09080;">Lisboa, ${today}</div>
      <div style="margin-top:8px;"><span class="plan-badge plan-${isPro ? 'pro' : 'lite'}">${planLabel}</span></div>
    </div>
  </div>

  <!-- ── RESTAURANT INFO ── -->
  <div class="section-header">Informações do Restaurante</div>
  <table class="info-table">
    <tr><td>Nome do restaurante</td><td><strong>${restaurant.name}</strong></td></tr>
    <tr><td>Endereço do restaurante</td><td>${restaurant.address ?? '—'}${restaurant.city ? ', ' + restaurant.city : ''}</td></tr>
    <tr><td>Nome do representante legal</td><td>${restaurant.owner_legal_name}</td></tr>
    <tr><td>E-mail do representante legal</td><td>${restaurant.email}</td></tr>
    <tr><td>Razão Social</td><td>${razao}</td></tr>
    <tr><td>NIF</td><td>${nif}</td></tr>
    <tr><td>Endereço de faturação</td><td>${billingAddr}</td></tr>
    <tr><td>Plano contratado</td><td><span class="plan-badge plan-${isPro ? 'pro' : 'lite'}" style="font-size:9pt;">${planLabel}</span></td></tr>
  </table>

  <!-- ── PLAN & FEATURES ── -->
  <div class="section-header red">Plano e Serviços Incluídos — ${planLabel}${isPro ? ' · €22,00 + IVA/mês' : ' · Gratuito'}</div>
  <div style="padding:16px 18px;border:1px solid #ddd;border-top:none;">
    <table style="width:100%;border-collapse:collapse;">
      ${featureRows}
      ${proOnlyNote}
    </table>
  </div>

  <!-- ── PRICING ── -->
  <div class="section-header">Condições Comerciais</div>
  <table class="pricing-table">
    <thead>
      <tr>
        <th>Descrição</th>
        <th>Plano Lite</th>
        <th>Plano Pro</th>
      </tr>
    </thead>
    <tbody>
      <tr class="${isPro ? '' : 'highlight'}">
        <td>Mensalidade de subscrição</td>
        <td>€0,00</td>
        <td>€22,00</td>
      </tr>
      <tr>
        <td>Comissão por reserva confirmada</td>
        <td>—</td>
        <td>€1,00 por pessoa reserva</td>
      </tr>
      <tr>
        <td>Faturação</td>
        <td>—</td>
        <td>Final de cada mês (mensalidade + reservas do mês)</td>
      </tr>
      <tr>
        <td>IVA</td>
        <td colspan="2" style="text-align:center;">23% sobre todos os valores</td>
      </tr>
    </tbody>
  </table>
  <div style="padding:10px 14px;background:#faf7f2;border:1px solid #ddd;border-top:none;font-size:9.5pt;color:#7a6a5e;">
    Todos os preços indicados excluem IVA à taxa legal em vigor (23%). O plano contratado pelo restaurante é o <strong>${planLabel}</strong>${isPro ? `, com mensalidade de <strong>€22,00 + IVA = €27,06/mês</strong> e comissão de <strong>€1,00 + IVA por reserva bem-sucedida</strong>, debitada no final de cada mês.` : ', sem qualquer custo associado.'}</div>

  <!-- ── SERVICE CONDITIONS ── -->
  <div class="section-header">Condições de Serviço</div>
  <div style="padding:18px;border:1px solid #ddd;border-top:none;font-size:10.5pt;line-height:1.8;">
    <p style="margin-bottom:12px;">
      Este Contrato tem um período inicial de <strong>doze (12) meses</strong> a partir da data de assinatura. Será automaticamente renovado por períodos sucessivos de <strong>doze (12) meses</strong>, a menos que seja rescindido por qualquer uma das partes mediante aviso prévio escrito de <strong>trinta (30) dias</strong>, enviado por e-mail para <strong>reservas@damesa.pt</strong> ou por carta registada.
    </p>
    <p style="margin-bottom:12px;">
      <strong>Taxa de reativação:</strong> Em caso de suspensão a pedido do restaurante, a posterior reativação do serviço implicará o pagamento de uma taxa de <strong>€125,00 + IVA</strong>.
    </p>
    <p style="margin-bottom:12px;">
      <strong>Pagamento:</strong> O pagamento é efetuado por <strong>Débito Direto SEPA</strong> no último dia útil de cada mês. Em caso de incumprimento, a Da Mesa reserva-se o direito de suspender o acesso à plataforma após 15 dias de atraso.
    </p>
    <p>
      <strong>Rescisão antecipada:</strong> A rescisão antes do fim do período inicial não dá direito a reembolso das mensalidades já faturadas.
    </p>
  </div>

  <!-- ── CONTENT AUTHORIZATION ── -->
  <div class="section-header">Autorização de Utilização de Conteúdo</div>
  <div style="padding:18px;border:1px solid #ddd;border-top:none;font-size:10.5pt;line-height:1.8;">
    <p>O Restaurante confirma que possui os direitos legais sobre as fotografias, logótipos e menus disponibilizados no seu website e redes sociais, e autoriza expressamente a <strong>Da Mesa</strong> a utilizá-los na plataforma <strong>damesa.pt</strong> e respetiva aplicação móvel para fins comerciais e de promoção do restaurante.</p>
  </div>

  <!-- ── TERMS ── -->
  <div class="section-header">Termos e Condições Gerais</div>
  <div style="padding:18px;border:1px solid #ddd;border-top:none;font-size:10.5pt;line-height:1.8;">
    <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;">
      <div style="width:16px;height:16px;border:2px solid #1c1612;border-radius:3px;flex-shrink:0;margin-top:2px;background:#1c1612;display:flex;align-items:center;justify-content:center;">
        <span style="color:#fff;font-size:10pt;line-height:1;">✓</span>
      </div>
      <p>Li e aceito os termos deste formulário de contrato e as <strong>Condições Gerais de Utilização e Venda da Da Mesa</strong>, disponíveis em <strong>damesa.pt/pages/terms.html</strong>. Garanto que tenho plena autorização para assinar em nome do restaurante.</p>
    </div>
    <p style="font-size:9.5pt;color:#7a6a5e;">
      A assinatura eletrónica é juridicamente vinculativa ao abrigo do Regulamento eIDAS (UE) 2016/910. O nome do signatário, endereço IP e data/hora são registados como prova legal de assinatura.
    </p>
  </div>

  <!-- ── SIGNATURES ── -->
  <div style="padding:28px 18px;border:1px solid #ddd;border-top:none;margin-top:0;">
    <p style="font-size:10.5pt;margin-bottom:28px;">Lisboa, ${today}</p>
    <div style="display:flex;gap:40px;flex-wrap:wrap;">

      <!-- DA MESA side -->
      <div style="flex:1;min-width:220px;">
        <div style="font-size:9pt;color:#7a6a5e;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Pela Da Mesa</div>
        <div style="height:80px;display:flex;align-items:flex-end;padding-bottom:4px;">
          <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQAAAH0CAMAAAD8CC+4AAAACXBIWXMAAA7EAAAOxAGVKw4bAAAB8lBMVEVHcEwUFBQdHR0eHh4XFxceHh4dHR0dHR0dHR0dHR0eHh4eHh4cHBweHh4bGxsdHR0dHR0cHBwdHR0eHh4eHh4eHh4dHR0bGxsdHR0aGhodHR0cHBweHh4dHR0dHR0dHR0eHh4dHR0eHh4dHR0dHR0dHR0dHR0eHh4eHh4aGhocHBwdHR0dHR0cHBwdHR0dHR0dHR0dHR0dHR0dHR0SEhIdHR0dHR0dHR0eHh4dHR0dHR0eHh4cHBwcHBwgICAdHR0dHR0eHh4eHh4eHh4aGhodHR0dHR0dHR0cHBweHh4YGBgdHR0dHR0bGxsbGxscHBwdHR0cHBwdHR0eHh4eHh4dHR0dHR0eHh4REREeHh4eHh4eHh4aGhobGxscHBwdHR0dHR0dHR0aGhoeHh4eHh4eHh4eHh4eHh4eHh4QEBAeHh4bGxsdHR0dHR0dHR0cHBwYGBgeHh4eHh4eHh4aGhobGxscHBweHh4eHh4eHh4cHBweHh4VFRUZGRkdHR0dHR0dHR0dHR0cHBweHh4dHR0dHR0eHh4eHh4cHBwdHR0dHR0eHh4XFxcdHR0dHR0eHh4aGhodHR0XFxcdHR0eHh4eHh4ZGRkdHR0eHh4eHh4eHh4fHx8ZGRkeHh4cHBwbGxsAAAAAAAAAAAAbGxseHh4dHR095XHyAAAApHRSTlMADfTuFt7jwPYaTOZT1jjrNT/a8vErhRynCk8lEdKvqel7X9Hlhu219zEJnso3jMh0LIOhDlBzYnjDtrxtWwiwnIDEoydrlbhkZhXHlktCSH0u88y7aEZuD8aaiB4vQI/hpRR/PM6rRFYQkkFYcWFKIKzdpDoTEiJVcJDVGDKYk9m/fl2t1NiKXFcjOwvci74oPSG6mbMfspF3Mxkp4HZUBwMFnkbnhaMAAAVCaVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8P3hwYWNrZXQgYmVnaW49J++7vycgaWQ9J1c1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCc/Pgo8eDp4bXBtZXRhIHhtbG5zOng9J2Fkb2JlOm5zOm1ldGEvJz4KPHJkZjpSREYgeG1sbnM6cmRmPSdodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjJz4KCiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0nJwogIHhtbG5zOkF0dHJpYj0naHR0cDovL25zLmF0dHJpYnV0aW9uLmNvbS9hZHMvMS4wLyc+CiAgPEF0dHJpYjpBZHM+CiAgIDxyZGY6U2VxPgogICAgPHJkZjpsaSByZGY6cGFyc2VUeXBlPSdSZXNvdXJjZSc+CiAgICAgPEF0dHJpYjpDcmVhdGVkPjIwMjYtMDUtMDY8L0F0dHJpYjpDcmVhdGVkPgogICAgIDxBdHRyaWI6RGF0YT57JnF1b3Q7ZG9jJnF1b3Q7OiZxdW90O0RBSEkyaGZreURZJnF1b3Q7LCZxdW90O3VzZXImcXVvdDs6JnF1b3Q7VUFDVTBQR3VDaHMmcXVvdDssJnF1b3Q7YnJhbmQmcXVvdDs6JnF1b3Q7QkFDVTBBUG1mZFUmcXVvdDt9PC9BdHRyaWI6RGF0YT4KICAgICA8QXR0cmliOkV4dElkPmY0MzQwYjM2LWYzYjItNGYyMi05NjhiLTlmYWNlYWI4MmVhOTwvQXR0cmliOkV4dElkPgogICAgIDxBdHRyaWI6RmJJZD41MjUyNjU5MTQxNzk1ODA8L0F0dHJpYjpGYklkPgogICAgIDxBdHRyaWI6VG91Y2hUeXBlPjI8L0F0dHJpYjpUb3VjaFR5cGU+CiAgICA8L3JkZjpsaT4KICAgPC9yZGY6U2VxPgogIDwvQXR0cmliOkFkcz4KIDwvcmRmOkRlc2NyaXB0aW9uPgoKIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PScnCiAgeG1sbnM6ZGM9J2h0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvJz4KICA8ZGM6dGl0bGU+CiAgIDxyZGY6QWx0PgogICAgPHJkZjpsaSB4bWw6bGFuZz0neC1kZWZhdWx0Jz5VbnRpdGxlZCBkZXNpZ24gLSAxPC9yZGY6bGk+CiAgIDwvcmRmOkFsdD4KICA8L2RjOnRpdGxlPgogPC9yZGY6RGVzY3JpcHRpb24+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpwZGY9J2h0dHA6Ly9ucy5hZG9iZS5jb20vcGRmLzEuMy8n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" style="height:72px;width:auto;display:block;" alt="Assinatura Nabin Kumar Dahal" />
        </div>
        <div style="border-bottom:1px solid #1c1612;margin-bottom:6px;"></div>
        <div style="font-size:10.5pt;font-weight:bold;">Nabin Kumar Dahal</div>
        <div style="font-size:9pt;color:#7a6a5e;">NIF 302 941 282</div>
        <div style="font-size:9pt;color:#7a6a5e;">Da Mesa · damesa.pt</div>
      </div>

      <!-- RESTAURANT side -->
      <div style="flex:1;min-width:220px;">
        <div style="font-size:9pt;color:#7a6a5e;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Pelo Restaurante</div>
        <div style="height:60px;border-bottom:1px solid #1c1612;margin-bottom:6px;"></div>
        <div style="font-size:10.5pt;font-weight:bold;">${restaurant.owner_legal_name}</div>
        <div style="font-size:9pt;color:#7a6a5e;">${razao}</div>
        <div style="font-size:9pt;color:#7a6a5e;">NIF ${nif}</div>
      </div>

    </div>
  </div>

  <!-- ── FOOTER ── -->
  <div class="footer-strip">
    Da Mesa · damesa.pt · reservas@damesa.pt · +351 933 142 586<br>
    Nabin Kumar Dahal · NIF 302 941 282 · Rua de Xabregas 12, Lote A, 1900-440 Lisboa
  </div>

</div>
</body>
</html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { restaurantId } = await req.json()

    if (!restaurantId) {
      return new Response(JSON.stringify({ error: 'Missing restaurantId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      'https://jdkbywroucgwrfpirloa.supabase.co',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. Fetch restaurant with all contract fields
    const { data: restaurant, error: restError } = await supabase
      .from('restaurants')
      .select('id, name, email, owner_legal_name, razao_social, restaurant_nif, billing_address, address, city, plan')
      .eq('id', restaurantId)
      .single()

    if (restError || !restaurant) {
      throw new Error(`Restaurant not found: ${restError?.message ?? 'no data'}`)
    }

    if (!restaurant.owner_legal_name) {
      throw new Error('Nome do representante legal é obrigatório para gerar o contrato.')
    }
    if (!restaurant.email) {
      throw new Error('O restaurante não tem email configurado.')
    }

    // 2. Generate contract HTML
    const contractHtml = generateContractHtml(restaurant)

    // 3. Generate secure token
    const token = crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36)

    // 4. Insert contract record
    const { error: insertError } = await supabase
      .from('contracts')
      .insert({
        restaurant_id: restaurantId,
        token,
        contract_html: contractHtml,
        status: 'pending',
      })

    if (insertError) {
      throw new Error(`Failed to insert contract: ${insertError.message}`)
    }

    // 5. Update restaurant: mark contract as sent
    await supabase
      .from('restaurants')
      .update({ contract_status: 'sent', contract_envelope_id: token })
      .eq('id', restaurantId)

    // 6. Send signing email via Resend
    const signingUrl = `https://damesa.pt/contrato/${token}`
    const resendKey = Deno.env.get('RESEND_API_KEY')!
    const isPro = (restaurant.plan ?? 'lite') === 'pro'

    const emailHtml = `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#1c1612;padding:28px 40px;text-align:center;">
      <div style="font-family:Georgia,serif;font-size:28px;color:#fff;font-weight:normal;">Da <span style="color:#e07060;">Mesa</span></div>
      <div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#8a7a6a;margin-top:4px;">damesa.pt</div>
    </div>
    <div style="padding:40px;">
      <div style="display:inline-block;background:${isPro ? '#b8860b' : '#6c757d'};color:#fff;padding:4px 16px;border-radius:20px;font-size:12px;font-weight:bold;letter-spacing:1px;margin-bottom:20px;">Plano ${isPro ? 'Pro' : 'Lite'}</div>
      <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:normal;color:#1c1612;margin:0 0 16px;">Contrato de Prestação de Serviços</h2>
      <p style="color:#4a3a2e;font-size:15px;line-height:1.6;margin:0 0 12px;">
        Olá, <strong>${restaurant.owner_legal_name}</strong>,
      </p>
      <p style="color:#4a3a2e;font-size:15px;line-height:1.6;margin:0 0 24px;">
        O contrato da <strong>Da Mesa</strong> para o restaurante <strong>${restaurant.name}</strong> está pronto para assinar. Por favor clique no botão abaixo para rever e assinar electronicamente.
      </p>
      <div style="background:#faf7f2;border-radius:10px;padding:16px 20px;margin-bottom:24px;font-size:14px;color:#4a3a2e;">
        <div style="margin-bottom:6px;"><strong>Plano:</strong> ${isPro ? 'Pro — €22,00 + IVA/mês + €1,00 + IVA/reserva' : 'Lite — Gratuito'}</div>
        <div style="margin-bottom:6px;"><strong>Duração:</strong> 12 meses com renovação automática</div>
        <div><strong>Rescisão:</strong> 30 dias de pré-aviso por escrito</div>
      </div>
      <div style="text-align:center;margin:32px 0;">
        <a href="${signingUrl}" style="display:inline-block;background:#c0392b;color:#fff;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
          ✍ Assinar o Contrato →
        </a>
      </div>
      <p style="color:#7a6a5e;font-size:12px;line-height:1.5;margin:0 0 8px;">
        Ou copie este link para o seu browser:<br>
        <a href="${signingUrl}" style="color:#c0392b;word-break:break-all;">${signingUrl}</a>
      </p>
      <hr style="border:none;border-top:1px solid #e8dfd4;margin:28px 0;"/>
      <p style="color:#9a8a7e;font-size:12px;line-height:1.5;margin:0;">
        A assinatura eletrónica é juridicamente vinculativa ao abrigo do Regulamento eIDAS (UE) 2016/910. O nome, IP e data/hora serão registados como prova de assinatura.
      </p>
    </div>
    <div style="background:#faf7f2;padding:20px 40px;text-align:center;border-top:1px solid #e8dfd4;">
      <p style="color:#9a8a7e;font-size:12px;margin:0;">Da Mesa · <a href="https://damesa.pt" style="color:#9a8a7e;">damesa.pt</a> · reservas@damesa.pt · +351 933 142 586</p>
    </div>
  </div>
</body>
</html>`

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Da Mesa <reservas@damesa.pt>',
        to: [restaurant.email],
        subject: `Contrato Da Mesa — ${restaurant.name} · Por favor assine para ativar o serviço`,
        html: emailHtml,
      }),
    })

    if (!emailRes.ok) {
      const errText = await emailRes.text()
      console.warn('Email send warning:', errText)
    }

    return new Response(JSON.stringify({ success: true, token, signingUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('send-contract error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
