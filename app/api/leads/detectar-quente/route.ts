import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { historico } = await request.json()

        if (!Array.isArray(historico) || historico.length === 0) {
            return NextResponse.json({ lead_quente: false })
        }

        // Monta um resumo simples da conversa pra análise
        const conversaTexto = historico
            .map((h: { tipo: string; mensagem: string }) => (h.tipo === 'recebida' ? 'Cliente: ' : 'Atendente: ') + h.mensagem)
            .join('\n')

        const prompt = `Você é um sistema de análise de conversas de vendas. Analise a conversa abaixo entre um cliente e um atendente (IA) de uma loja, e determine se o CLIENTE está demonstrando um interesse FORTE de compra (é um "lead quente"), mesmo que ainda não tenha confirmado o pedido.
 
Conversa:
${conversaTexto}
 
Regras importantes:
- Considere "lead quente" quando o cliente pergunta preço E demonstra intenção de avançar (ex: "quero comprar", "como faço pra pagar", "vocês entregam?", "posso fazer o pedido"), ou já está claramente decidido, mesmo sem ter confirmado 100%
- NÃO considere "lead quente" perguntas isoladas e frias, tipo só "quanto custa" sem continuidade, ou "oi"/saudações, ou dúvidas genéricas sem sinal de decisão
- Responda APENAS com um JSON, sem texto antes ou depois, neste formato exato: {"lead_quente": true} ou {"lead_quente": false}`

        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': process.env.ANTHROPIC_API_KEY || '',
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 100,
                messages: [{ role: 'user', content: prompt }],
            }),
        })

        const data = await res.json()
        const textoResposta = data?.content?.[0]?.text || '{"lead_quente": false}'
        const textoLimpo = textoResposta.replace(/```json|```/g, '').trim()

        let resultado
        try {
            resultado = JSON.parse(textoLimpo)
        } catch {
            resultado = { lead_quente: false }
        }

        return NextResponse.json(resultado)
    } catch (error: any) {
        console.error('Erro ao detectar lead quente:', error)
        return NextResponse.json({ lead_quente: false, error: error.message })
    }
}
