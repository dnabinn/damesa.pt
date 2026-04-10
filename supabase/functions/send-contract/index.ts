import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DOCUSEAL_API_KEY = 'Kt9fZ8zHwBdp7mNNJD8aHbhSnaV36478aN2Pm1zYAT2'
const DOCUSEAL_API = 'https://api.docuseal.co'

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

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.7;
      color: #1c1612;
      background: #fff;
      padding: 48px 64px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #c0392b;
      padding-bottom: 20px;
      margin-bottom: 32px;
    }
    .logo {
      font-size: 28pt;
      font-weight: normal;
      letter-spacing: 1px;
    }
    .logo span { color: #c0392b; }
    .logo-sub {
      font-size: 9pt;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #7a6a5e;
      margin-top: 4px;
    }
    h1 {
      font-size: 13pt;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin: 32px 0 28px;
      color: #1c1612;
    }
    .parties {
      background: #faf7f2;
      border: 1px solid #e8dfd4;
      border-radius: 8px;
      padding: 20px 24px;
      margin-bottom: 28px;
      font-size: 11pt;
    }
    .parties p { margin-bottom: 10px; }
    .parties p:last-child { margin-bottom: 0; }
    .parties strong { color: #1c1612; }
    .clause {
      margin-bottom: 20px;
    }
    .clause-title {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
      color: #1c1612;
    }
    .clause p { font-size: 11pt; }
    .signatures {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #e8dfd4;
    }
    .sig-row {
      display: flex;
      gap: 48px;
      margin-top: 32px;
    }
    .sig-block {
      flex: 1;
    }
    .sig-label {
      font-size: 10pt;
      color: #7a6a5e;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }
    .sig-name {
      font-size: 11pt;
      margin-top: 8px;
    }
    .sig-line {
      border-bottom: 1px solid #1c1612;
      height: 40px;
      margin-bottom: 6px;
    }
    .footer-note {
      margin-top: 40px;
      font-size: 9pt;
      color: #7a6a5e;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Da <span>Mesa</span></div>
    <div class="logo-sub">damesa.pt</div>
  </div>

  <h1>Contrato de Prestação de Serviços</h1>

  <div class="parties">
    <p><strong>PRESTADOR:</strong> Nabin Kumar Dahal, NIF n.º 302 941 282, domiciliado na Rua de Xabregas 12, Lote A, 1900-440 Lisboa (doravante "Da Mesa")</p>
    <p><strong>CLIENTE:</strong> ${restaurant.owner_legal_name}, representante do restaurante <strong>${restaurant.name}</strong>, com endereço de e-mail ${restaurant.email} (doravante "Restaurante")</p>
  </div>

  <div class="clause">
    <div class="clause-title">1. Objeto do Contrato</div>
    <p>A Da Mesa disponibiliza ao Restaurante acesso à plataforma digital damesa.pt para gestão de reservas online e captação de clientes, incluindo: página de restaurante na plataforma, sistema de reservas em tempo real, painel de gestão de reservas, widget de reservas incorporável e notificações por e-mail.</p>
  </div>

  <div class="clause">
    <div class="clause-title">2. Remuneração</div>
    <p>O Restaurante pagará à Da Mesa a mensalidade de €40,00 (quarenta euros), acrescida de IVA à taxa legal em vigor (23%), perfazendo €49,20 (quarenta e nove euros e vinte cêntimos) por mês.</p>
  </div>

  <div class="clause">
    <div class="clause-title">3. Condições de Pagamento</div>
    <p>O pagamento será efetuado por Débito Direto SEPA, no último dia de cada mês. O Restaurante autoriza expressamente a Da Mesa a cobrar o montante acordado através do mandato SEPA estabelecido. O não pagamento de qualquer mensalidade, sem regularização no prazo de 15 dias, poderá dar origem à suspensão do acesso à plataforma.</p>
  </div>

  <div class="clause">
    <div class="clause-title">4. Duração e Renovação</div>
    <p>O presente contrato entra em vigor na data da sua assinatura, por prazo indeterminado, renovando-se automaticamente de mês em mês.</p>
  </div>

  <div class="clause">
    <div class="clause-title">5. Rescisão</div>
    <p>Qualquer das partes pode rescindir o contrato mediante aviso prévio por escrito de 30 (trinta) dias, enviado por e-mail para o endereço da outra parte. A rescisão não dá direito a reembolso de mensalidades já faturadas.</p>
  </div>

  <div class="clause">
    <div class="clause-title">6. Obrigações da Da Mesa</div>
    <p>A Da Mesa compromete-se a: manter a plataforma operacional com disponibilidade mínima de 99% (excetuando manutenções programadas); prestar suporte técnico ao Restaurante; garantir a segurança dos dados armazenados.</p>
  </div>

  <div class="clause">
    <div class="clause-title">7. Obrigações do Restaurante</div>
    <p>O Restaurante compromete-se a: fornecer informações verídicas sobre o estabelecimento; manter os dados de contacto e horários atualizados; não utilizar a plataforma para fins ilícitos ou que prejudiquem terceiros.</p>
  </div>

  <div class="clause">
    <div class="clause-title">8. Propriedade Intelectual</div>
    <p>A plataforma damesa.pt, o seu código, design e conteúdos são propriedade exclusiva da Da Mesa. O Restaurante mantém a titularidade das informações e imagens que forneça à plataforma.</p>
  </div>

  <div class="clause">
    <div class="clause-title">9. Proteção de Dados Pessoais</div>
    <p>O tratamento de dados pessoais realiza-se em conformidade com o Regulamento Geral sobre a Proteção de Dados (RGPD – Regulamento UE 2016/679) e legislação nacional aplicável. A Da Mesa atua como responsável pelo tratamento dos dados de utilizadores da plataforma e como subcontratante dos dados fornecidos pelo Restaurante. Os dados serão tratados exclusivamente para a prestação dos serviços previstos neste contrato.</p>
  </div>

  <div class="clause">
    <div class="clause-title">10. Confidencialidade</div>
    <p>As partes comprometem-se a manter confidenciais todas as informações trocadas no âmbito deste contrato, não as divulgando a terceiros sem consentimento prévio por escrito da outra parte.</p>
  </div>

  <div class="clause">
    <div class="clause-title">11. Limitação de Responsabilidade</div>
    <p>A Da Mesa não se responsabiliza por danos indiretos, lucros cessantes ou perdas resultantes de falhas temporárias do serviço. A responsabilidade total da Da Mesa fica limitada ao valor da mensalidade paga no mês em que ocorreu o dano.</p>
  </div>

  <div class="clause">
    <div class="clause-title">12. Alterações ao Contrato</div>
    <p>A Da Mesa reserva-se o direito de alterar as condições deste contrato, comunicando ao Restaurante com antecedência mínima de 30 dias. O não cancelamento do serviço no prazo indicado constituirá aceitação das novas condições.</p>
  </div>

  <div class="clause">
    <div class="clause-title">13. Lei Aplicável e Foro Competente</div>
    <p>O presente contrato é regulado pela lei portuguesa. Para resolução de quaisquer litígios emergentes, as partes elegem o Tribunal da Comarca de Lisboa, com expressa renúncia a qualquer outro.</p>
  </div>

  <div class="signatures">
    <p style="font-size:11pt;">Lisboa, ${today}</p>

    <div class="sig-row">
      <div class="sig-block">
        <div class="sig-label">Pela Da Mesa</div>
        <div class="sig-line"></div>
        <div class="sig-name">Nabin Kumar Dahal</div>
      </div>
      <div class="sig-block">
        <div class="sig-label">Pelo Restaurante</div>
        <div class="sig-line">{{Assinatura do Restaurante:signature}}</div>
        <div class="sig-name">Nome: ${restaurant.owner_legal_name}</div>
        <div style="margin-top:10px;font-size:10pt;">Data: {{Data:date}}</div>
      </div>
    </div>
  </div>

  <div class="footer-note">
    Da Mesa · damesa.pt · reservas@damesa.pt<br>
    Nabin Kumar Dahal · NIF 302 941 282 · Rua de Xabregas 12, Lote A, 1900-440 Lisboa
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

    // 2. Generate Portuguese contract HTML
    const contractHtml = generateContractHtml(restaurant)

    // 3. Create DocuSeal template from HTML
    const templateRes = await fetch(`${DOCUSEAL_API}/templates/html`, {
      method: 'POST',
      headers: {
        'X-Auth-Token': DOCUSEAL_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html: contractHtml,
        name: `Contrato Da Mesa - ${restaurant.name}`,
      }),
    })

    if (!templateRes.ok) {
      const err = await templateRes.text()
      throw new Error(`DocuSeal template creation failed: ${err}`)
    }

    const template = await templateRes.json()
    const templateId = template.id

    if (!templateId) {
      throw new Error(`DocuSeal did not return a template ID. Response: ${JSON.stringify(template)}`)
    }

    // 4. Create DocuSeal submission
    const submissionRes = await fetch(`${DOCUSEAL_API}/submissions`, {
      method: 'POST',
      headers: {
        'X-Auth-Token': DOCUSEAL_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_id: templateId,
        send_email: true,
        submitters: [
          {
            email: restaurant.email,
            name: restaurant.owner_legal_name,
            role: 'Restaurante',
          },
        ],
      }),
    })

    if (!submissionRes.ok) {
      const err = await submissionRes.text()
      throw new Error(`DocuSeal submission creation failed: ${err}`)
    }

    const submissionData = await submissionRes.json()
    // DocuSeal returns array of submitters or an object with id
    const submissionId = Array.isArray(submissionData)
      ? submissionData[0]?.submission_id ?? submissionData[0]?.id
      : submissionData.id ?? submissionData.submission_id

    const signingUrl = Array.isArray(submissionData)
      ? submissionData[0]?.embed_src ?? submissionData[0]?.slug
      : submissionData.embed_src ?? null

    if (!submissionId) {
      throw new Error(`DocuSeal did not return a submission ID. Response: ${JSON.stringify(submissionData)}`)
    }

    // 5. Update restaurant in DB
    const { error: dbError } = await supabase
      .from('restaurants')
      .update({
        contract_status: 'sent',
        contract_envelope_id: String(submissionId),
      })
      .eq('id', restaurantId)

    if (dbError) {
      throw new Error(`DB update error: ${dbError.message}`)
    }

    return new Response(JSON.stringify({
      success: true,
      submissionId,
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
