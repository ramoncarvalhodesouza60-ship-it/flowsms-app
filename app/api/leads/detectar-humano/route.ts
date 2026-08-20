import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { mensagem } = await request.json()

        if (!mensagem) {
            return NextResponse.json({ quer_humano: false })
        }

        const prompt = `Analise a mensagem abaixo, enviada por um cliente para o atendimento de uma empresa via WhatsApp, e determine se ele está pedindo EXPLICITAMENTE para falar com um atendente humano/pessoa de verdade (não com a IA/robô).
 
Mensagem do cliente: "${mensagem}"
 
Regras importantes:
- Só considere "Sim" se o pedido for claro e direto (ex: "quero falar com um atendente", "posso falar com uma pessoa?", "quero falar com humano", "chama alguém", "não quero falar com robô")
- Perguntas normais sobre produto, preço, ou dúvidas gerais NÃO contam, mesmo que pareçam frustradas
- Responda APENAS com um JSON, sem texto antes ou depois, neste formato exato: {"quer_humano": true} ou {"quer_humano": false}`

        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': process.env.ANTHROPIC_API_KEY || '',
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 80,
                messages: [{ role: 'user', content: prompt }],
            }),
        })

        const data = await res.json()
        const textoResposta = data?.content?.[0]?.text || '{"quer_humano": false}'
        const textoLimpo = textoResposta.replace(/```json|```/g, '').trim()

        let resultado
        try {
            resultado = JSON.parse(textoLimpo)
        } catch {
            resultado = { quer_humano: false }
        }

        return NextResponse.json(resultado)
    } catch (error: any) {
        console.error('Erro ao detectar pedido de humano:', error)
        return NextResponse.json({ quer_humano: false, error: error.message })
    }
}