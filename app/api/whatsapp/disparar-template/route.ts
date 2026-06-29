import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    const body = await req.json()
    const contatos = body.contatos
    const templateName = body.templateName
    const languageCode = body.languageCode

    if (!contatos || !Array.isArray(contatos) || contatos.length === 0) {
        return NextResponse.json({ success: false, error: 'Nenhum contato fornecido' })
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_ID
    const token = process.env.WHATSAPP_TOKEN

    const resultados: { telefone: string; sucesso: boolean; erro?: string }[] = []

    for (const telefone of contatos) {
        try {
            const url = 'https://graph.facebook.com/v21.0/' + phoneNumberId + '/messages'

            const res = await fetch(url, {
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
                        name: templateName || 'oferta_construcao',
                        language: { code: languageCode || 'pt_BR' }
                    }
                })
            })

            const data = await res.json()
            console.log('META RESPONSE ' + telefone + ': ' + JSON.stringify(data))

            if (data.messages && data.messages[0] && data.messages[0].id) {
                resultados.push({ telefone: telefone, sucesso: true })
            } else {
                const erroMsg = data.error ? data.error.message : 'Erro desconhecido'
                resultados.push({ telefone: telefone, sucesso: false, erro: erroMsg })
            }

            await new Promise(function (r) { setTimeout(r, 500) })

        } catch (e: any) {
            resultados.push({ telefone: telefone, sucesso: false, erro: e.message })
        }
    }

    const enviados = resultados.filter(function (r) { return r.sucesso }).length
    const falhas = resultados.filter(function (r) { return !r.sucesso }).length

    return NextResponse.json({ success: true, enviados: enviados, falhas: falhas, resultados: resultados })
}