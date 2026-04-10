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
      return new Response(JSON.stringify({ error: 'Missing token or signerName' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      'https://jdkbywroucgwrfpirloa.supabase.co',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. Look up the contract by token
    const { data: contract, error: findError } = await supabase
      .from('contracts')
      .select('id, status, restaurant_id, token')
      .eq('token', token)
      .single()

    if (findError || !contract) {
      return new Response(JSON.stringify({ error: 'Contrato não encontrado.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (contract.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Este contrato já foi assinado.' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Extract IP and User-Agent
    const signerIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('x-real-ip') ??
      'unknown'
    const signerUa = req.headers.get('user-agent') ?? 'unknown'
    const signedAt = new Date().toISOString()

    // 3. Update the contract record
    const { error: contractUpdateError } = await supabase
      .from('contracts')
      .update({
        status: 'signed',
        signed_at: signedAt,
        signer_name: signerName,
        signer_ip: signerIp,
        signer_ua: signerUa,
      })
      .eq('id', contract.id)

    if (contractUpdateError) {
      throw new Error(`Failed to update contract: ${contractUpdateError.message}`)
    }

    // 4. Fetch restaurant details for emails
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, name, email')
      .eq('id', contract.restaurant_id)
      .single()

    // 5. Update restaurant contract_status to 'signed'
    await supabase
      .from('restaurants')
      .update({ contract_status: 'signed' })
      .eq('id', contract.restaurant_id)

    const resendKey = Deno.env.get('RESEND_API_KEY')!
    const signedDateFormatted = new Date(signedAt).toLocaleString('pt-PT', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon',
    })

    // 6. Send confirmation email to restaurant
    if (restaurant?.email) {
      const confirmHtml = `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#1c1612;padding:28px 40px;text-align:center;">
      <div style="font-family:Georgia,serif;font-size:26px;color:#fff;font-weight:normal;">Da <span style="color:#e07060;">Mesa</span></div>
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8a7a6a;margin-top:4px;">damesa.pt</div>
    </div>
    <div style="padding:40px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;background:#e8f5e9;color:#2e7d32;border-radius:50%;width:60px;height:60px;line-height:60px;font-size:28px;text-align:center;">✓</div>
      </div>
      <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:normal;color:#1c1612;margin:0 0 16px;text-align:center;">Contrato assinado com sucesso</h2>
      <p style="color:#4a3a2e;font-size:15px;line-height:1.6;margin:0 0 24px;text-align:center;">
        O seu contrato com a Da Mesa para o restaurante <strong>${restaurant.name}</strong> foi assinado eletronicamente.
      </p>
      <div style="background:#faf7f2;border:1px solid #e8dfd4;border-radius:8px;padding:20px 24px;margin-bottom:24px;font-size:13px;color:#4a3a2e;line-height:1.7;">
        <div><strong>Signatário:</strong> ${signerName}</div>
        <div><strong>Data/Hora:</strong> ${signedDateFormatted}</div>
        <div><strong>Referência:</strong> ${token}</div>
      </div>
      <p style="color:#7a6a5e;font-size:13px;line-height:1.5;margin:0;">
        Guarde este email como comprovativo da sua assinatura eletrónica. O contrato está juridicamente vinculativo ao abrigo do Regulamento eIDAS (UE) 2016/910.
      </p>
    </div>
    <div style="background:#faf7f2;padding:20px 40px;text-align:center;border-top:1px solid #e8dfd4;">
      <p style="color:#9a8a7e;font-size:12px;margin:0;">Da Mesa · <a href="https://damesa.pt" style="color:#9a8a7e;">damesa.pt</a> · reservas@damesa.pt</p>
    </div>
  </div>
</body>
</html>`

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Da Mesa <reservas@damesa.pt>',
          to: [restaurant.email],
          subject: `Contrato assinado — Da Mesa · ${restaurant.name}`,
          html: confirmHtml,
        }),
      })
    }

    // 7. Send notification email to Nabin
    const adminHtml = `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#1c1612;padding:28px 40px;text-align:center;">
      <div style="font-family:Georgia,serif;font-size:26px;color:#fff;font-weight:normal;">Da <span style="color:#e07060;">Mesa</span></div>
    </div>
    <div style="padding:40px;">
      <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:normal;color:#1c1612;margin:0 0 24px;">Novo contrato assinado</h2>
      <div style="background:#faf7f2;border:1px solid #e8dfd4;border-radius:8px;padding:20px 24px;font-size:13px;color:#4a3a2e;line-height:1.9;">
        <div><strong>Restaurante:</strong> ${restaurant?.name ?? contract.restaurant_id}</div>
        <div><strong>Signatário:</strong> ${signerName}</div>
        <div><strong>Email:</strong> ${restaurant?.email ?? '—'}</div>
        <div><strong>Data/Hora:</strong> ${signedDateFormatted}</div>
        <div><strong>IP:</strong> ${signerIp}</div>
        <div><strong>User-Agent:</strong> <span style="word-break:break-all;font-size:11px;">${signerUa}</span></div>
        <div><strong>Token:</strong> <span style="font-family:monospace;font-size:11px;word-break:break-all;">${token}</span></div>
      </div>
    </div>
  </div>
</body>
</html>`

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Da Mesa <reservas@damesa.pt>',
        to: ['hello@dnabinn.eu'],
        subject: `✅ Contrato assinado — ${restaurant?.name ?? 'Restaurante'}`,
        html: adminHtml,
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
