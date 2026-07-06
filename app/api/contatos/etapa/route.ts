import { NextRequest, NextResponse } from 'next/server'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

function normalizarTelefone(tel: string) {
    return (tel || '').replace(/\D/g, '')
}

export async function POST(req: NextRequest) {
    try {
        const { telefone, etapa } = await req.json()

        if (!telefone || !etapa) {
            return NextResponse.json({ success: false, error: 'telefone e etapa são obrigatorios' }, { status: 400 })
        }

        const telNorm = normalizarTelefone(telefone)

        // Busca o contato pelo telefone
        const records: any[] = []
        await new Promise<void>((resolve, reject) => {
            base('Contato').select({ maxRecords: 500 }).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    pageRecords.forEach((record: any) => {
                        const tel = record.get('Phone') || ''
                        if (normalizarTelefone(tel) === telNorm) {
                            records.push(record)
                        }
                    })
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })

        if (records.length === 0) {
            // Contato nao existe ainda — cria com telefone e etapa
            await base('Contato').create({
                'Phone': telefone,
                'etapa': etapa,
            })
            return NextResponse.json({ success: true, criado: true })
        }

        // Atualiza a etapa do contato existente
        await base('Contato').update(records[0].id, { etapa: etapa })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
