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
  city: string | null
}): string {
  const today = new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })

  return `<div style="font-family:Georgia,'Times New Roman',serif;font-size:12pt;line-height:1.7;color:#1c1612;">

  <div style="text-align:center;border-bottom:2px solid #c0392b;padding-bottom:20px;margin-bottom:32px;">
    <div style="font-size:28pt;font-weight:normal;letter-spacing:1px;">Da <span style="color:#c0392b;">Mesa</span></div>
    <div style="font-size:9pt;letter-spacing:3px;text-transform:uppercase;color:#7a6a5e;margin-top:4px;">damesa.pt</div>
  </div>

  <h2 style="font-size:13pt;font-weight:bold;text-align:center;text-transform:uppercase;letter-spacing:2px;margin:32px 0 28px;color:#1c1612;">Contrato de Prestação de Serviços</h2>

  <div style="background:#faf7f2;border:1px solid #e8dfd4;border-radius:8px;padding:20px 24px;margin-bottom:28px;font-size:11pt;">
    <p style="margin-bottom:10px;"><strong>PRESTADOR:</strong> Da Mesa, <span style="font-size:9.5pt;color:#9a8a7e;">(Nabin Kumar Dahal, NIF n.º 302 941 282)</span>, domiciliada na Rua de Xabregas 12, Lote A, 1900-440 Lisboa (doravante "Da Mesa")</p>
    <p style="margin-bottom:0;"><strong>CLIENTE:</strong> ${restaurant.owner_legal_name}, representante do restaurante <strong>${restaurant.name}</strong>, com endereço de e-mail ${restaurant.email} (doravante "Restaurante")</p>
  </div>

  <div style="margin-bottom:20px;">
    <div style="font-size:11pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;color:#1c1612;">1. Objeto do Contrato</div>
    <p style="font-size:11pt;">A Da Mesa disponibiliza ao Restaurante acesso à plataforma digital damesa.pt para gestão de reservas online e captação de clientes, incluindo: página de restaurante na plataforma, sistema de reservas em tempo real, painel de gestão de reservas, widget de reservas incorporável e notificações por e-mail.</p>
  </div>

  <div style="margin-bottom:20px;">
    <div style="font-size:11pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;color:#1c1612;">2. Remuneração</div>
    <p style="font-size:11pt;">O Restaurante pagará à Da Mesa a mensalidade de €40,00 (quarenta euros), acrescida de IVA à taxa legal em vigor (23%), perfazendo €49,20 (quarenta e nove euros e vinte cêntimos) por mês.</p>
  </div>

  <div style="margin-bottom:20px;">
    <div style="font-size:11pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;color:#1c1612;">3. Condições de Pagamento</div>
    <p style="font-size:11pt;">O pagamento será efetuado por Débito Direto SEPA, no último dia de cada mês. O Restaurante autoriza expressamente a Da Mesa a cobrar o montante acordado através do mandato SEPA estabelecido. O não pagamento de qualquer mensalidade, sem regularização no prazo de 15 dias, poderá dar origem à suspensão do acesso à plataforma.</p>
  </div>

  <div style="margin-bottom:20px;">
    <div style="font-size:11pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;color:#1c1612;">4. Duração e Renovação</div>
    <p style="font-size:11pt;">O presente contrato entra em vigor na data da sua assinatura, por prazo indeterminado, renovando-se automaticamente de mês em mês.</p>
  </div>

  <div style="margin-bottom:20px;">
    <div style="font-size:11pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;color:#1c1612;">5. Rescisão</div>
    <p style="font-size:11pt;">Qualquer das partes pode rescindir o contrato mediante aviso prévio por escrito de 30 (trinta) dias, enviado por e-mail para o endereço da outra parte. A rescisão não dá direito a reembolso de mensalidades já faturadas.</p>
  </div>

  <div style="margin-bottom:20px;">
    <div style="font-size:11pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;color:#1c1612;">6. Obrigações da Da Mesa</div>
    <p style="font-size:11pt;">A Da Mesa compromete-se a: manter a plataforma operacional com disponibilidade mínima de 99% (excetuando manutenções programadas); prestar suporte técnico ao Restaurante; garantir a segurança dos dados armazenados.</p>
  </div>

  <div style="margin-bottom:20px;">
    <div style="font-size:11pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;color:#1c1612;">7. Obrigações do Restaurante</div>
    <p style="font-size:11pt;">O Restaurante compromete-se a: fornecer informações verídicas sobre o estabelecimento; manter os dados de contacto e horários atualizados; não utilizar a plataforma para fins ilícitos ou que prejudiquem terceiros.</p>
  </div>

  <div style="margin-bottom:20px;">
    <div style="font-size:11pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;color:#1c1612;">8. Propriedade Intelectual</div>
    <p style="font-size:11pt;">A plataforma damesa.pt, o seu código, design e conteúdos são propriedade exclusiva da Da Mesa. O Restaurante mantém a titularidade das informações e imagens que forneça à plataforma.</p>
  </div>

  <div style="margin-bottom:20px;">
    <div style="font-size:11pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;color:#1c1612;">9. Proteção de Dados Pessoais</div>
    <p style="font-size:11pt;">O tratamento de dados pessoais realiza-se em conformidade com o Regulamento Geral sobre a Proteção de Dados (RGPD – Regulamento UE 2016/679) e legislação nacional aplicável. A Da Mesa atua como responsável pelo tratamento dos dados de utilizadores da plataforma e como subcontratante dos dados fornecidos pelo Restaurante. Os dados serão tratados exclusivamente para a prestação dos serviços previstos neste contrato.</p>
  </div>

  <div style="margin-bottom:20px;">
    <div style="font-size:11pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;color:#1c1612;">10. Confidencialidade</div>
    <p style="font-size:11pt;">As partes comprometem-se a manter confidenciais todas as informações trocadas no âmbito deste contrato, não as divulgando a terceiros sem consentimento prévio por escrito da outra parte.</p>
  </div>

  <div style="margin-bottom:20px;">
    <div style="font-size:11pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;color:#1c1612;">11. Limitação de Responsabilidade</div>
    <p style="font-size:11pt;">A Da Mesa não se responsabiliza por danos indiretos, lucros cessantes ou perdas resultantes de falhas temporárias do serviço. A responsabilidade total da Da Mesa fica limitada ao valor da mensalidade paga no mês em que ocorreu o dano.</p>
  </div>

  <div style="margin-bottom:20px;">
    <div style="font-size:11pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;color:#1c1612;">12. Alterações ao Contrato</div>
    <p style="font-size:11pt;">A Da Mesa reserva-se o direito de alterar as condições deste contrato, comunicando ao Restaurante com antecedência mínima de 30 dias. O não cancelamento do serviço no prazo indicado constituirá aceitação das novas condições.</p>
  </div>

  <div style="margin-bottom:28px;">
    <div style="font-size:11pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;color:#1c1612;">13. Lei Aplicável e Foro Competente</div>
    <p style="font-size:11pt;">O presente contrato é regulado pela lei portuguesa. Para resolução de quaisquer litígios emergentes, as partes elegem o Tribunal da Comarca de Lisboa, com expressa renúncia a qualquer outro.</p>
  </div>

  <div style="padding-top:32px;border-top:1px solid #e8dfd4;margin-top:8px;">
    <p style="font-size:11pt;">Lisboa, ${today}</p>
    <div style="display:flex;gap:48px;margin-top:32px;flex-wrap:wrap;">
      <div style="flex:1;min-width:200px;">
        <div style="font-size:10pt;color:#7a6a5e;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Pela Da Mesa</div>
        <!-- Nabin's signature -->
        <div style="height:56px;display:flex;align-items:flex-end;padding-bottom:4px;margin-bottom:0;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 54" width="220" height="54" style="display:block;">
            <!-- N -->
            <path d="M8,44 L8,10 L26,38 L26,10" stroke="#1c1612" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <!-- a -->
            <path d="M32,28 Q32,20 40,20 Q48,20 48,28 Q48,36 40,36 Q32,36 32,36 L32,44" stroke="#1c1612" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <!-- b -->
            <path d="M54,10 L54,36 Q54,44 64,36 Q72,28 64,28 Q54,20 54,28" stroke="#1c1612" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <!-- i + dot -->
            <path d="M77,22 L77,36" stroke="#1c1612" stroke-width="2" fill="none" stroke-linecap="round"/>
            <circle cx="77" cy="17" r="2" fill="#1c1612"/>
            <!-- n -->
            <path d="M83,36 L83,22 Q83,18 90,18 Q97,18 97,24 L97,36" stroke="#1c1612" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <!-- flourish underline -->
            <path d="M6,48 Q60,52 100,48 Q130,44 160,50" stroke="#1c1612" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.5"/>
          </svg>
        </div>
        <div style="border-bottom:1px solid #1c1612;margin-bottom:6px;"></div>
        <div style="font-size:11pt;">Nabin Kumar Dahal</div>
        <div style="font-size:9pt;color:#7a6a5e;">NIF 302 941 282</div>
      </div>
      <div style="flex:1;min-width:200px;">
        <div style="font-size:10pt;color:#7a6a5e;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Pelo Restaurante</div>
        <div style="border-bottom:1px solid #1c1612;height:56px;margin-bottom:6px;"></div>
        <div style="font-size:11pt;">${restaurant.owner_legal_name}</div>
      </div>
    </div>
  </div>

  <div style="margin-top:40px;font-size:9pt;color:#7a6a5e;text-align:center;padding-top:20px;border-top:1px solid #e8dfd4;">
    Da Mesa · damesa.pt · reservas@damesa.pt<br>
    Nabin Kumar Dahal · NIF 302 941 282 · Rua de Xabregas 12, Lote A, 1900-440 Lisboa
  </div>
</div>`
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

    // 1. Fetch restaurant
    const { data: restaurant, error: restError } = await supabase
      .from('restaurants')
      .select('id, name, email, owner_legal_name, city')
      .eq('id', restaurantId)
      .single()

    if (restError || !restaurant) {
      throw new Error(`Restaurant not found: ${restError?.message ?? 'no data'}`)
    }

    if (!restaurant.owner_legal_name) {
      throw new Error('owner_legal_name is required to generate a contract. Set it in the billing modal first.')
    }

    if (!restaurant.email) {
      throw new Error('Restaurant email is required to send the contract.')
    }

    // 2. Generate contract HTML (body fragment for inline rendering)
    const contractHtml = generateContractHtml(restaurant)

    // 3. Generate secure unique token
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
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({
        contract_status: 'sent',
        contract_envelope_id: token,
      })
      .eq('id', restaurantId)

    if (updateError) {
      throw new Error(`DB update error: ${updateError.message}`)
    }

    // 6. Send signing email via Resend
    const signingUrl = `https://damesa.pt/contrato/${token}`
    const resendKey = Deno.env.get('RESEND_API_KEY')!

    const emailHtml = `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#1c1612;padding:28px 40px;text-align:center;">
      <div style="font-family:Georgia,serif;font-size:26px;color:#fff;font-weight:normal;">Da <span style="color:#e07060;">Mesa</span></div>
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8a7a6a;margin-top:4px;">damesa.pt</div>
    </div>
    <div style="padding:40px;">
      <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:normal;color:#1c1612;margin:0 0 16px;">Contrato de Prestação de Serviços</h2>
      <p style="color:#4a3a2e;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Olá, <strong>${restaurant.owner_legal_name}</strong>,
      </p>
      <p style="color:#4a3a2e;font-size:15px;line-height:1.6;margin:0 0 24px;">
        O seu contrato com a Da Mesa para o restaurante <strong>${restaurant.name}</strong> está pronto para assinar. Por favor, clique no botão abaixo para ler e assinar o contrato eletronicamente.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${signingUrl}" style="display:inline-block;background:#c0392b;color:#fff;text-decoration:none;padding:15px 36px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px;">Assinar o Contrato →</a>
      </div>
      <p style="color:#7a6a5e;font-size:13px;line-height:1.5;margin:0 0 8px;">
        Ou copie este link para o seu browser:<br>
        <a href="${signingUrl}" style="color:#c0392b;word-break:break-all;">${signingUrl}</a>
      </p>
      <hr style="border:none;border-top:1px solid #e8dfd4;margin:32px 0;"/>
      <p style="color:#9a8a7e;font-size:12px;line-height:1.5;margin:0;">
        A assinatura eletrónica é juridicamente vinculativa ao abrigo do Regulamento eIDAS (UE) 2016/910. O seu nome, endereço IP e data/hora serão registados como prova de assinatura.
      </p>
    </div>
    <div style="background:#faf7f2;padding:20px 40px;text-align:center;border-top:1px solid #e8dfd4;">
      <p style="color:#9a8a7e;font-size:12px;margin:0;">Da Mesa · <a href="https://damesa.pt" style="color:#9a8a7e;">damesa.pt</a> · reservas@damesa.pt</p>
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
        subject: `Contrato Da Mesa — ${restaurant.name} · Assinar antes de ativar o serviço`,
        html: emailHtml,
      }),
    })

    if (!emailRes.ok) {
      const errText = await emailRes.text()
      console.warn('Email send warning:', errText)
      // Don't throw — contract is created, email failure is non-fatal
    }

    return new Response(JSON.stringify({
      success: true,
      token,
      signingUrl,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('send-contract error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
