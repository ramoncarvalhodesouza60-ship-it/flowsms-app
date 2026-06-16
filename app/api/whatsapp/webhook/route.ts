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
            // Formato ISO, igual ao usado pela rota /api/whatsapp/mensagens e pela tela de conversas.
            // Antes estava como "14:32" (string curta), o que quebrava ordenação e formatação na tela.
            const horario = new Date().toISOString()

            const baseId = process.env.AIRTABLE_BASE_ID
            const tableId = process.env.AIRTABLE_MENSAGENS_ID
            const apiKey = process.env.AIRTABLE_API_KEY

            const url = 'https://api.airtable.com/v0/' + baseId + '/' + tableId

            await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer ' + apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fields: {
                        telefone: telefone,
                        mensagem: texto,
                        tipo: 'recebida',
                        horario: horario,
                        // TODO: quando houver mais de um cliente (ex: Marcelo) usando o mesmo app da Meta,
                        // identificar a empresa pelo Phone Number ID que recebeu a mensagem (value.metadata.phone_number_id),
                        // cruzando com a tabela Clientes, em vez de usar um valor fixo.
                        empresa: 'FlowSMS Admin',
                    }
                })
            })
        }
    } catch (e) {
        console.error('Webhook error:', e)
    }
    return NextResponse.json({ status: 'ok' })
}