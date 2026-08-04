import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const clienteId = cookieStore.get('flowsms_cliente_session')?.value

        if (!clienteId) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
        }

        const records: any[] = []
        await new Promise<void>((resolve, reject) => {
            const opcoes: any = {
                maxRecords: 100,
                filterByFormula: '{empresa} = "' + clienteId + '"',
            }
            base('Contato').select(opcoes).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    pageRecords.forEach((record: any) => {
                        records.push({
                            id: record.id,
                            nome: record.get('Name'),
                            telefone: record.get('Phone'),
                            status: record.get('Status'),
                        })
                    })
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })

        return NextResponse.json({ success: true, contatos: records })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}