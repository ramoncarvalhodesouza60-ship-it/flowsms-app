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
        const phoneNumberId = value?.metadata?.phone_number_id as string | undefined
        console.log('PHONE NUMBER ID RECEBIDO:', phoneNumberId)

        if (messages && messages.length > 0) {
            const msg = messages[0]
            const telefone = msg.from
            const texto = msg.text?.body || ''
            const horario = new Date().toISOString()

            const baseId = process.env.AIRTABLE_BASE_ID
            const tableId = process.env.AIRTABLE_MENSAGENS_ID
            const clientesId = process.env.AIRTABLE_CLIENTES_ID
            const apiKey = process.env.AIRTABLE_API_KEY
            const url = 'https://api.airtable.com/v0/' + baseId + '/' + tableId
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://flowsms.com.br'

            // 1. Busca o cliente pelo phone_number_id
            let systemPrompt: string | null = null
            let empresa = 'FlowSMS Admin'
            let clienteToken: string | null = null
            let clientePhoneNumberId: string | null = null

            if (phoneNumberId) {
                const clientesUrl = 'https://api.airtable.com/v0/' + baseId + '/' + clientesId
                    + '?filterByFormula=' + encodeURIComponent('{phone_number_id}="' + phoneNumberId + '"')

                const clientesRes = await fetch(clientesUrl, {
                    headers: { Authorization: 'Bearer ' + apiKey }
                })
                const clientesData = await clientesRes.json()
                const cliente = clientesData.records?.[0]?.fields

                if (cliente) {
                    systemPrompt = cliente.system_prompt || null
                    empresa = cliente.empresa || 'FlowSMS Admin'
                    clienteToken = cliente.whatsapp_token || null
                    clientePhoneNumberId = cliente.phone_number_id || null
                }
            }

            // 2. Salva mensagem recebida no Airtable
            await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer ' + apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fields: { telefone, mensagem: texto, tipo: 'recebida', horario, empresa }
                })
            })

            // 3. Chama a IA com o system prompt do cliente
            if (texto) {
                const iaRes = await fetch(baseUrl + '/api/whatsapp/ia', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mensagem: texto, systemPrompt })
                })

                const iaData = await iaRes.json()
                const resposta = iaData.resposta

                if (resposta) {
                    // 4. Envia resposta da IA via WhatsApp usando token e phone_number_id do cliente
                    await fetch(baseUrl + '/api/whatsapp/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            telefone,
                            mensagem: resposta,
                            token: clienteToken,
                            phoneNumberId: clientePhoneNumberId,
                        })
                    })

                    // 5. Salva resposta da IA no Airtable
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
                                empresa
                            }
                        })
                    })
                }
            }
        }
    } catch (e) {
        console.error('Webhook error:', e)
        console.error('Webhook error details:', JSON.stringify(e))
    }

    return new NextResponse('OK', { status: 200 })
}
