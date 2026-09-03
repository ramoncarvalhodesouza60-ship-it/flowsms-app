import { NextRequest, NextResponse } from 'next/server'
import { verificarToken } from '@/lib/auth'

export async function PATCH(request: NextRequest) {
    try {
        const { clienteId, system_prompt } = await request.json()

        if (!clienteId) {
            return NextResponse.json({ success: false, error: 'clienteId não informado' }, { status: 400 })
        }

        const cookie = request.cookies.get('sessao')
        if (!cookie) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
        }
        const sessao = await verificarToken(cookie.value)
        if (!sessao) {
            return NextResponse.json({ success: false, error: 'Sessão inválida' }, { status: 401 })
        }

        const baseId = process.env.AIRTABLE_BASE_ID
        const apiKey = process.env.AIRTABLE_API_KEY
        const tabelaClientes = process.env.AIRTABLE_CLIENTES_ID

        // Confirma que o registro pertence à empresa da sessão (a não ser que seja admin)
        if (!sessao.admin) {
            const urlBusca = 'https://api.airtable.com/v0/' + baseId + '/' + tabelaClientes + '/' + clienteId
            const resBusca = await fetch(urlBusca, {
                headers: { Authorization: 'Bearer ' + apiKey },
            })
            const dataBusca = await resBusca.json()
            const empresaDoRegistro = dataBusca?.fields?.empresa

            if (empresaDoRegistro !== sessao.empresa) {
                return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 })
            }
        }

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