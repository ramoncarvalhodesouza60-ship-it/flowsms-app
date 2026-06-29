import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    const body = await req.json()
    const telefone = body.telefone
    const templateName = body.templateName
    const languageCode = body.languageCode || 'pt_BR'

    const phoneNumberId = process.env.WHATSAPP_PHONE_ID
    const token = process.env.WHATSAPP_TOKEN

    const res = await fetch('https://graph.facebook.com/v21.0/' + phoneNumberId + '/messages', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: telefone,
            type: 'template',
            template: {
                name: templateName,
                language: { code: languageCode }
            }
        })
    })

    const data = await res.json()
    console.log('META RESPONSE:', JSON.stringify(data))

    if (data.messages && data.messages[0]?.id) {
        return NextResponse.json({ success: true, messageId: data.messages[0].id })
    }

    return NextResponse.json({ success: false, error: data })
}