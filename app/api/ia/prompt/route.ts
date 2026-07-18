import { NextResponse } from 'next/server'

// Salva o novo system_prompt no registro do cliente, na tabela Clientes do Airtable
export async function PATCH(request: Request) {
    try {
        const { clienteId, system_prompt } = await request.json()

        if (!clienteId) {
            return NextResponse.json({ success: false, error: 'clienteId não informado' }, { status: 400 })
        }

        const baseId = process.env.AIRTABLE_BASE_ID
        const apiKey = process.env.AIRTABLE_API_KEY
        const tabelaClientes = process.env.AIRTABLE_CLIENTES_ID

        const url = 'https://api.airtable.com/v0/' + baseId + '/' + tabelaClientes + '/' + clienteId

        const res = await fetch(url, {
            method: 'PATCH',
            headers: {
                Authorization: 'Bearer ' + apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fields: {
                    system_prompt: system_prompt || '',
                },
            }),
        })

        const data = await res.json()

        if (!res.ok) {
            console.error('IA/PROMPT - erro Airtable:', res.status, JSON.stringify(data))
            return NextResponse.json({ success: false, error: data }, { status: res.status })
        }

        return NextResponse.json({ success: true, cliente: data })
    } catch (error: any) {
        console.error('IA/PROMPT - erro geral:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
