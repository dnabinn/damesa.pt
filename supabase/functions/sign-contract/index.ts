import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token, signerName } = await req.json()

    if (!token || !signerName) {
      return new Response(JSON.stringify({ error: 'Token e nome são obrigatórios.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? 'desconhecido'
    const signedAt = new Date().toISOString()
    const signedDate = new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })

    const supabase = createClient(
      'https://jdkbywroucgwrfpirloa.supabase.co',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. Fetch contract
    const { data: contract, error: fetchErr } = await supabase
      .from('contracts')
      .select('id, token, status, restaurant_id, contract_html')
      .eq('token', token)
      .single()

    if (fetchErr || !contract) {
      return new Response(JSON.stringify({ error: 'Contrato não encontrado.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (contract.status === 'signed') {
      return new Response(JSON.stringify({ error: 'Este contrato já foi assinado.' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Inject typed name as cursive signature into stored contract HTML
    const signatureBlock = `<div style="font-family:'Dancing Script','Segoe Script','Comic Sans MS',cursive;font-size:28px;color:#1c1612;letter-spacing:1px;padding:6px 0 2px;">${signerName}</div>`
    const updatedHtml = (contract.contract_html ?? '').replace(
      '<div style="height:60px;border-bottom:1px solid #1c1612;margin-bottom:6px;"></div>',
      `${signatureBlock}<div style="border-bottom:1px solid #1c1612;margin-bottom:6px;"></div>`
    )

    // 3. Save signature to DB
    const { error: updateErr } = await supabase
      .from('contracts')
      .update({
        status: 'signed',
        signer_name: signerName,
        signed_at: signedAt,
        signer_ip: ip,
        contract_html: updatedHtml,
      })
      .eq('id', contract.id)

    if (updateErr) throw new Error(`Erro ao guardar assinatura: ${updateErr.message}`)

    // 4. Mark restaurant as signed
    await supabase
      .from('restaurants')
      .update({ contract_status: 'signed' })
      .eq('id', contract.restaurant_id)

    // 5. Fetch restaurant details for emails
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('name, email, plan')
      .eq('id', contract.restaurant_id)
      .single()

    const resendKey = Deno.env.get('RESEND_API_KEY')!
    const isPro = (restaurant?.plan ?? 'lite') === 'pro'

    // 6. Confirmation email to restaurant
    if (restaurant?.email) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Da Mesa <reservas@damesa.pt>',
          to: [restaurant.email],
          subject: `✅ Contrato assinado — ${restaurant.name}`,
          html: `<!DOCTYPE html>
<html lang="pt"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#1c1612;padding:28px 40px;text-align:center;">
      <div style="font-family:Georgia,serif;font-size:26px;color:#fff;">Da <span style="color:#e07060;">Mesa</span></div>
    </div>
    <div style="padding:40px;">
      <div style="text-align:center;font-size:48px;margin-bottom:16px;">✅</div>
      <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:normal;color:#1c1612;text-align:center;margin:0 0 20px;">Contrato assinado com sucesso!</h2>
      <p style="color:#4a3a2e;font-size:15px;line-height:1.6;margin:0 0 20px;text-align:center;">
        Olá, <strong>${signerName}</strong>!<br>
        O contrato com a <strong>Da Mesa</strong> para o restaurante <strong>${restaurant.name}</strong> foi assinado.
      </p>
      <div style="background:#faf7f2;border-radius:10px;padding:16px 20px;margin-bottom:24px;font-size:14px;color:#4a3a2e;line-height:1.8;">
        <div><strong>Plano:</strong> ${isPro ? 'Pro — €22,00 + IVA/mês + €1,00 + IVA/reserva' : 'Lite — Gratuito'}</div>
        <div><strong>Assinado por:</strong> ${signerName}</div>
        <div><strong>Data:</strong> ${signedDate}</div>
      </div>
      <p style="color:#4a3a2e;font-size:14px;line-height:1.6;margin:0;">
        Em breve entraremos em contacto. Qualquer dúvida: <a href="mailto:reservas@damesa.pt" style="color:#c0392b;">reservas@damesa.pt</a> · <strong>+351 933 142 586</strong>
      </p>
    </div>
    <div style="background:#faf7f2;padding:20px 40px;text-align:center;border-top:1px solid #e8dfd4;">
      <p style="color:#9a8a7e;font-size:12px;margin:0;">Da Mesa · damesa.pt · reservas@damesa.pt</p>
    </div>
  </div>
</body></html>`,
        }),
      })
    }

    // 7. Notify Nabin
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Da Mesa <reservas@damesa.pt>',
        to: ['dnabinn@gmail.com'],
        subject: `📝 Contrato assinado — ${restaurant?.name ?? 'restaurante'}`,
        html: `<p style="font-family:sans-serif;">O contrato de <strong>${restaurant?.name ?? '—'}</strong> foi assinado por <strong>${signerName}</strong> em ${signedDate}.<br><br>IP: <code>${ip}</code></p>`,
      }),
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('sign-contract error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
