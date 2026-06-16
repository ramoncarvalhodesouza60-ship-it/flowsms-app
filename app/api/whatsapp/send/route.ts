import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    const body = await req.json()
    const telefone = body.telefone
    const mensagem = body.mensagem

    const token = process.env.WHATSAPP_TOKEN
    const phoneId = process.env.WHATSAPP_PHONE_ID

    const url = 'https://graph.facebook.com/v19.0/' + phoneId + '/messages'

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
    if (data.messages) {
        return NextResponse.json({ success: true })
    }
    return NextResponse.json({ success: false, error: data })
}