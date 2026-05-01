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
        <div style="height:60px;display:flex;align-items:flex-end;padding-bottom:4px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 58" width="200" height="54" style="display:block;">
            <path d="M8,46 L8,10 L26,40 L26,10" stroke="#1c1612" stroke-width="2.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M34,30 Q34,21 43,21 Q52,21 52,30 Q52,38 43,38 Q34,38 34,38 L34,46" stroke="#1c1612" stroke-width="2.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M58,10 L58,38 Q58,46 68,38 Q77,30 68,30 Q58,22 58,30" stroke="#1c1612" stroke-width="2.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M82,23 L82,38" stroke="#1c1612" stroke-width="2.1" fill="none" stroke-linecap="round"/>
            <circle cx="82" cy="17" r="2.2" fill="#1c1612"/>
            <path d="M89,38 L89,23 Q89,18 97,18 Q105,18 105,25 L105,38" stroke="#1c1612" stroke-width="2.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M6,50 Q55,55 108,50 Q135,46 165,52" stroke="#1c1612" stroke-width="1.3" fill="none" stroke-linecap="round" opacity="0.45"/>
          </svg>
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
