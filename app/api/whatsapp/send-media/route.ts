import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    const body = await req.json()
    const telefone = body.telefone
    const mediaUrl = body.mediaUrl
    const tipo = body.tipo // 'audio' | 'image' | 'video' | 'document'
    const nomeArquivo = body.nomeArquivo // usado so para 'document'

    const token = process.env.WHATSAPP_TOKEN
    const phoneId = process.env.WHATSAPP_PHONE_ID

    try {
        // PASSO 1: baixar o arquivo do Vercel Blob
        const arquivoResposta = await fetch(mediaUrl)
        if (!arquivoResposta.ok) {
            return NextResponse.json({ success: false, error: 'Nao foi possivel baixar o arquivo da URL fornecida' })
        }
        const arquivoBuffer = await arquivoResposta.arrayBuffer()
        const contentType = arquivoResposta.headers.get('content-type') || 'application/octet-stream'

        // PASSO 2: fazer upload do arquivo direto para os servidores da Meta
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
            // Upload para a Meta falhou - retorna o erro real, em vez de seguir e mascarar o problema
            return NextResponse.json({ success: false, error: uploadData })
        }

        const mediaId = uploadData.id

        // PASSO 3: enviar a mensagem usando o media_id (em vez do link)
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
        // Retorna o erro real da Meta, em vez de só "success: false" sem detalhe
        return NextResponse.json({ success: false, error: data })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message })
    }
}