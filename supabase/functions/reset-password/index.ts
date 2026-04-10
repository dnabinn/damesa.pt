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
    const { loginEmail } = await req.json()

    // Validate it ends with @damesa.pt
    if (!loginEmail || !loginEmail.endsWith('@damesa.pt')) {
      return new Response(
        JSON.stringify({ error: 'O email deve terminar em @damesa.pt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendKey = Deno.env.get('RESEND_API_KEY')!

    const supabase = createClient(supabaseUrl, serviceKey)

    // Look up restaurant by damesa_email
    const { data: restaurant, error: restError } = await supabase
      .from('restaurants')
      .select('id, name, slug, email, damesa_email')
      .eq('damesa_email', loginEmail)
      .single()

    if (restError || !restaurant) {
      return new Response(
        JSON.stringify({ error: 'Email não encontrado. Verifique o email Da Mesa introduzido.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!restaurant.email) {
      return new Response(
        JSON.stringify({ error: 'Este restaurante não tem email de contacto configurado. Contacte o suporte Da Mesa.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate recovery link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: loginEmail,
      options: {
        redirectTo: 'https://damesa.pt/pages/owner-login.html',
      },
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.error('Link generation error:', linkError)
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar link de recuperação. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const recoveryLink = linkData.properties.action_link

    // Send email via Resend to the restaurant's real contact email
    const emailHtml = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e8dfd4;">
    <!-- Header -->
    <div style="background:#1c1612;padding:32px 40px;text-align:center;">
      <div style="font-family:Georgia,serif;font-size:28px;color:#fff;letter-spacing:0.5px;">
        Da <span style="color:#e07060;">Mesa</span>
      </div>
      <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#b0a090;margin-top:6px;">
        Portal do Restaurante
      </div>
    </div>

    <!-- Body -->
    <div style="padding:40px;">
      <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:normal;color:#1c1612;margin:0 0 12px;">
        Recuperar palavra-passe
      </h1>
      <p style="font-size:15px;color:#7a6a5e;line-height:1.6;margin:0 0 24px;">
        Recebemos um pedido para redefinir a palavra-passe da conta <strong>${restaurant.name}</strong> no portal Da Mesa.
      </p>
      <p style="font-size:14px;color:#7a6a5e;line-height:1.6;margin:0 0 32px;">
        Clique no botão abaixo para criar uma nova palavra-passe. Este link expira em 1 hora.
      </p>

      <!-- CTA Button -->
      <div style="text-align:center;margin-bottom:32px;">
        <a href="${recoveryLink}"
           style="display:inline-block;background:#c0392b;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
          Redefinir palavra-passe →
        </a>
      </div>

      <p style="font-size:12px;color:#b0a090;line-height:1.6;margin:0;text-align:center;">
        Se não pediu esta recuperação, ignore este email.<br />
        A sua palavra-passe permanece inalterada.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#faf7f2;padding:20px 40px;border-top:1px solid #e8dfd4;text-align:center;">
      <p style="font-size:12px;color:#b0a090;margin:0;">
        <strong style="color:#1c1612;font-family:Georgia,serif;">Da Mesa</strong> · reservas@damesa.pt · damesa.pt
      </p>
    </div>
  </div>
</body>
</html>`

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Da Mesa <reservas@damesa.pt>',
        to: [restaurant.email],
        subject: 'Recuperar palavra-passe — Da Mesa',
        html: emailHtml,
      }),
    })

    if (!emailRes.ok) {
      const emailErr = await emailRes.text()
      console.error('Resend error:', emailErr)
      return new Response(
        JSON.stringify({ error: 'Erro ao enviar email. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('reset-password error:', err)
    return new Response(
      JSON.stringify({ error: 'Erro interno. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
