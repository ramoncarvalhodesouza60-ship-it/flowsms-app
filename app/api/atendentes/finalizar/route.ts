import { NextRequest, NextResponse } from 'next/server'
import { verificarToken } from '@/lib/auth'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

function normalizarTelefone(tel: string) {
    return (tel || '').replace(/\D/g, '')
}

export async function POST(request: NextRequest) {
    try {
        const cookie = request.cookies.get('sessao')
        if (!cookie) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
        const sessao = await verificarToken(cookie.value)
        if (!sessao) return NextResponse.json({ success: false, error: 'Sessão inválida' }, { status: 401 })

        const { telefone } = await request.json()

        if (!telefone) {
            return NextResponse.json({ success: false, error: 'telefone é obrigatório' }, { status: 400 })
        }

        const telNorm = normalizarTelefone(telefone)

        let contatoRecord: any = null
        await new Promise<void>((resolve, reject) => {
            base('Contato').select({ maxRecords: 500 }).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    pageRecords.forEach((record: any) => {
                        const tel = record.get('Phone') || ''
                        if (normalizarTelefone(tel) === telNorm) contatoRecord = record
                    })
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })

        if (!contatoRecord) {
            return NextResponse.json({ success: false, error: 'Contato não encontrado' }, { status: 404 })
        }

        await base('Contato').update(contatoRecord.id, { atendimento_ativo: false })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}