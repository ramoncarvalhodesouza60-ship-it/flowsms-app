import { NextRequest, NextResponse } from 'next/server'
import { verificarToken } from '@/lib/auth'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function POST(request: NextRequest) {
    try {
        const { atendenteId, disponivel } = await request.json()

        if (!atendenteId) {
            return NextResponse.json({ success: false, error: 'atendenteId é obrigatório' }, { status: 400 })
        }

        const cookie = request.cookies.get('sessao')
        if (!cookie) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
        const sessao = await verificarToken(cookie.value)
        if (!sessao) return NextResponse.json({ success: false, error: 'Sessão inválida' }, { status: 401 })

        const registro = await base('Atendentes').find(atendenteId)
        const empresaDoRegistro = registro.get('empresa')

        if (!sessao.admin && sessao.empresa !== empresaDoRegistro) {
            return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 })
        }

        await base('Atendentes').update(atendenteId, { disponivel: !!disponivel })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}