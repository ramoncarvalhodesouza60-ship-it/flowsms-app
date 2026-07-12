import { NextResponse } from 'next/server'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function POST(request: Request) {
    try {
        const { email, senha } = await request.json()

        if (!email || !senha) {
            return NextResponse.json({ success: false, error: 'Email e senha são obrigatórios' }, { status: 400 })
        }

        let clienteEncontrado: any = null

        await new Promise<void>((resolve, reject) => {
            const formula = 'AND({email} = "' + email + '", {senha} = "' + senha + '", {ativo} = TRUE())'
            base('Clientes').select({ filterByFormula: formula, maxRecords: 1 }).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    pageRecords.forEach((record: any) => {
                        clienteEncontrado = {
                            email: record.get('email'),
                            empresa: record.get('empresa'),
                            whatsapp: !!record.get('whatsapp_token'),
                            ramal: false,
                            ramalNumero: null,
                            limiteSMS: record.get('limiteSMS') || 0,
                            limiteWhatsApp: record.get('limiteWhatsApp') || 0,
                        }
                    })
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })

        if (clienteEncontrado) {
            return NextResponse.json({ success: true, cliente: clienteEncontrado })
        }

        return NextResponse.json({ success: false, error: 'Email ou senha incorretos' })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}