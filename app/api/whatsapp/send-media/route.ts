import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    const body = await req.json()
    const telefone = body.telefone
    const mediaUrl = body.mediaUrl
    const tipo = body.tipo // 'audio' | 'image' | 'video' | 'document'
    const nomeArquivo = body.nomeArquivo // usado só para 'document'

    const token = process.env.WHATSAPP_TOKEN
    const phoneId = process.env.WHATSAPP_PHONE_ID

    const url = 'https://graph.facebook.com/v19.0/' + phoneId + '/messages'

    // Monta o objeto de mídia de acordo com o tipo, conforme exigido pela API da Meta
    const mediaPayload: any = { link: mediaUrl }
    if (tipo === 'document' && nomeArquivo) {
        mediaPayload.filename = nomeArquivo
    }

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: telefone,
            type: tipo,
            [tipo]: mediaPayload,
        }),
    })

    const data = await res.json()
    if (data.messages) {
        return NextResponse.json({ success: true })
    }
    return NextResponse.json({ success: false, error: data })
}