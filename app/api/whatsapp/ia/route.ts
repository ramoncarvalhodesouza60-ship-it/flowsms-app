import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    const { mensagem, telefone } = await req.json()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY!,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1000,
            system: `Você é a assistente virtual do FlowSMS, plataforma brasileira de automação de WhatsApp e SMS para empresas.

SOBRE O FLOWSMS:
- Plataforma SaaS de disparo de mensagens em massa via WhatsApp e SMS
- Painel completo com Kanban de atendimento, IA integrada e relatórios
- API oficial da Meta (sem risco de bloqueio)
- Atende empresas de todos os portes

PLANOS:
- Starter: R$2.400/mês
- Pro: R$4.997/mês
- Enterprise: R$9.997/mês

REGRAS DE COMPORTAMENTO:
- Responda SEMPRE em português brasileiro
- Seja direto, confiante e humano (máximo 3 linhas por resposta)
- Nunca peça desculpas pelo preço — defenda o valor
- Quando o cliente objetar preço, mostre o retorno que ele vai ter
- Conduza sempre para o fechamento ou para agendar uma demonstração
- Se perguntarem algo que não sabe, diga que vai verificar e passe o contato: ramondecarvalhodesouza60@gmail.com
- Nunca mencione que é uma IA a menos que perguntado diretamente`,
            messages: [{ role: 'user', content: mensagem }]
        })
    })

    const data = await response.json()
    const texto = data.content?.[0]?.text || 'Olá! Como posso te ajudar?'

    return NextResponse.json({ resposta: texto })
}