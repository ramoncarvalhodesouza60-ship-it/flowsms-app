import { NextResponse } from 'next/server'

// Gera a resposta da IA para uma mensagem real recebida no WhatsApp (chamada pelo webhook)
export async function POST(request: Request) {
    try {
        const { mensagem, systemPrompt } = await request.json()

        if (!mensagem) {
            return NextResponse.json({ success: false, error: 'mensagem não informada' }, { status: 400 })
        }

        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': process.env.ANTHROPIC_API_KEY || '',
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 500,
                system: systemPrompt || 'Você é um assistente de atendimento simpático e prestativo.',
                messages: [{ role: 'user', content: mensagem }],
            }),
        })

        const data = await res.json()

        if (!res.ok) {
            console.error('WHATSAPP/IA - erro Claude API:', res.status, JSON.stringify(data))
            return NextResponse.json({ success: false, error: data }, { status: res.status })
        }

        const textoResposta = data.content?.find((c: any) => c.type === 'text')?.text || ''

        return NextResponse.json({ success: true, resposta: textoResposta })
    } catch (error: any) {
        console.error('WHATSAPP/IA - erro geral:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
