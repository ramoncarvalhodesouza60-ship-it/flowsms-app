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
            system: `Você é um assistente de vendas direto e confiante, especialista em negociação. 
Responda sempre em português brasileiro, de forma curta e objetiva (máximo 3 linhas).
Nunca peça desculpas pelo preço. Quando o cliente objetar, mude o foco para o valor.
Conduza sempre para o fechamento. Seja humano, não robótico.`,
            messages: [{ role: 'user', content: mensagem }]
        })
    })

    const data = await response.json()
    const texto = data.content?.[0]?.text || 'Olá! Como posso te ajudar?'

    return NextResponse.json({ resposta: texto })
}