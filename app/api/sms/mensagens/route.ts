import { NextRequest, NextResponse } from 'next/server'
import { validarSessaoEEmpresa } from '@/lib/auth'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function GET(request: NextRequest) {
    try {
        const empresa = request.nextUrl.searchParams.get('empresa') || ''

        const erro = await validarSessaoEEmpresa(request, empresa)
        if (erro) return erro

        const mensagens: any[] = []
        await new Promise<void>((resolve, reject) => {
            const formula = 'AND({tipo} = "sms", {empresa} = "' + empresa + '")'
            const opcoes: any = { maxRecords: 500, filterByFormula: formula, sort: [{ field: 'horario', direction: 'desc' }] }
            base('Mensagens').select(opcoes).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    pageRecords.forEach((record: any) => {
                        mensagens.push({
                            id: record.id,
                            telefone: record.get('telefone'),
                            mensagem: record.get('mensagem'),
                            horario: record.get('horario'),
                            idSms: record.get('id_sms') || null,
                        })
                    })
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })

        return NextResponse.json({ success: true, mensagens })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}