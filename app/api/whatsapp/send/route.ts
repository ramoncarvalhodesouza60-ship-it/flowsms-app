import { NextRequest, NextResponse } from 'next/server'
import { verificarToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
    const cookie = req.cookies.get('sessao')
    if (!cookie) {
        return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
    }
    const sessao = await verificarToken(cookie.value)
    if (!sessao) {
        return NextResponse.json({ success: false, error: 'Sessão inválida' }, { status: 401 })
    }

    const body = await req.json()
    const telefone = body.telefone
    const mensagem = body.mensagem

    const token = body.token || process.env.WHATSAPP_TOKEN
    const phoneId = body.phoneNumberId || process.env.WHATSAPP_PHONE_ID

    const url = 'https://graph.facebook.com/v21.0/' + phoneId + '/messages'

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: telefone,
            type: 'text',
            text: { body: mensagem },
        }),
    })

    const data = await res.json()
    console.log('SEND RESPONSE:', JSON.stringify(data))

    if (data.messages) {
        return NextResponse.json({ success: true })
    }
    return NextResponse.json({ success: false, error: data })
}