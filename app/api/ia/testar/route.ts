import { NextRequest, NextResponse } from 'next/server'
import { verificarToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
    try {
        const cookie = request.cookies.get('sessao')
        if (!cookie) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
        }
        const sessao = await verificarToken(cookie.value)
        if (!sessao) {
            return NextResponse.json({ success: false, error: 'Sessão inválida' }, { status: 401 })
        }

        const { system_prompt, mensagem } = await request.json()

        if (!system_prompt || !mensagem) {
            return NextResponse.json({ success: false, error: 'Preencha o prompt e a mensagem de teste' }, { status: 400 })
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
                system: system_prompt,
                messages: [{ role: 'user', content: mensagem }],
            }),
        })

        const data = await res.json()

        if (!res.ok) {
            console.error('IA/TESTAR - erro Claude API:', res.status, JSON.stringify(data))
            return NextResponse.json({ success: false, error: data }, { status: res.status })
        }

        const textoResposta = data.content?.find((c: any) => c.type === 'text')?.text || ''

        return NextResponse.json({ success: true, resposta: textoResposta })
    } catch (error: any) {
        console.error('IA/TESTAR - erro geral:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}