import { NextRequest, NextResponse } from 'next/server'

const VERIFY_TOKEN = 'flowsms2024'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        return new NextResponse(challenge, { status: 200 })
    }
    return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(req: NextRequest) {
    const body = await req.json()

    try {
        const entry = body.entry?.[0]
        const changes = entry?.changes?.[0]
        const value = changes?.value
        const messages = value?.messages

        if (messages && messages.length > 0) {
            const msg = messages[0]
            const telefone = msg.from
            const texto = msg.text?.body || ''
            const horario = new Date().toISOString()

            const baseId = process.env.AIRTABLE_BASE_ID
            const tableId = process.env.AIRTABLE_MENSAGENS_ID
            const apiKey = process.env.AIRTABLE_API_KEY
            const url = 'https://api.airtable.com/v0/' + baseId + '/' + tableId

            // 1. Salva mensagem recebida no Airtable
            await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer ' + apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fields: {
                        telefone,
                        mensagem: texto,
                        tipo: 'recebida',
                        horario,
                        empresa: 'FlowSMS Admin',
                    }
                })
            })

            // 2. Chama a IA e responde automaticamente
            if (texto) {
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://flowsms.com.br'

                const iaRes = await fetch(baseUrl + '/api/whatsapp/ia', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mensagem: texto, telefone })
                })

                const iaData = await iaRes.json()
                const resposta = iaData.resposta

                if (resposta) {
                    // 3. Envia resposta da IA via WhatsApp
                    await fetch(baseUrl + '/api/whatsapp/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ telefone, mensagem: resposta })
                    })

                    // 4. Salva resposta da IA no Airtable
                    await fetch(url, {
                        method: 'POST',
                        headers: {
                            Authorization: 'Bearer ' + apiKey,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            fields: {
                                telefone,
                                mensagem: resposta,
                                tipo: 'enviada',
                                horario: new Date().toISOString(),
                                empresa: 'FlowSMS Admin',
                            }
                        })
                    })
                }
            }
        }
    } catch (e) {
        console.error('Webhook error:', e)
    }
    return NextResponse.json({ status: 'ok' })
}