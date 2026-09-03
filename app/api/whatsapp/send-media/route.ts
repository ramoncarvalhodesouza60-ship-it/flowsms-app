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
    const mediaUrl = body.mediaUrl
    const tipo = body.tipo
    const nomeArquivo = body.nomeArquivo

    const token = body.token || process.env.WHATSAPP_TOKEN
    const phoneId = body.phoneNumberId || process.env.WHATSAPP_PHONE_ID

    if (!token || !phoneId) {
        return NextResponse.json({ success: false, error: 'Token ou phoneNumberId não configurado para este cliente' })
    }

    try {
        const arquivoResposta = await fetch(mediaUrl)
        if (!arquivoResposta.ok) {
            return NextResponse.json({ success: false, error: 'Nao foi possivel baixar o arquivo da URL fornecida' })
        }
        const arquivoBuffer = await arquivoResposta.arrayBuffer()
        const contentType = arquivoResposta.headers.get('content-type') || 'application/octet-stream'

        const formData = new FormData()
        formData.append('messaging_product', 'whatsapp')
        formData.append('file', new Blob([arquivoBuffer], { type: contentType }))

        const uploadUrl = 'https://graph.facebook.com/v19.0/' + phoneId + '/media'

        const uploadResposta = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + token,
            },
            body: formData,
        })

        const uploadData = await uploadResposta.json()

        if (!uploadData.id) {
            return NextResponse.json({ success: false, error: uploadData })
        }

        const mediaId = uploadData.id

        const mediaPayload: any = { id: mediaId }
        if (tipo === 'document' && nomeArquivo) {
            mediaPayload.filename = nomeArquivo
        }

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
                type: tipo,
                [tipo]: mediaPayload,
            }),
        })

        const data = await res.json()

        if (data.messages) {
            return NextResponse.json({ success: true })
        }
        return NextResponse.json({ success: false, error: data })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message })
    }
}