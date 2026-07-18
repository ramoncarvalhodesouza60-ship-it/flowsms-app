import { NextResponse } from 'next/server'

// Lista os templates de mensagem cadastrados na Meta pro cliente
// IMPORTANTE: precisa do campo whatsapp_business_account_id salvo no registro do cliente no Airtable
// (é diferente do phone_number_id que já usamos hoje pro envio de mensagens)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const wabaId = searchParams.get('wabaId')
        const token = searchParams.get('token')

        if (!wabaId || !token) {
            return NextResponse.json(
                { success: false, error: 'wabaId ou token não configurados para este cliente' },
                { status: 400 }
            )
        }

        const url = 'https://graph.facebook.com/v21.0/' + wabaId + '/message_templates'

        const res = await fetch(url, {
            headers: { Authorization: 'Bearer ' + token },
        })

        const data = await res.json()

        if (!res.ok) {
            console.error('TEMPLATES - erro Meta API:', res.status, JSON.stringify(data))
            return NextResponse.json({ success: false, error: data }, { status: res.status })
        }

        return NextResponse.json({ success: true, templates: data.data || [] })
    } catch (error: any) {
        console.error('TEMPLATES - erro geral:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
