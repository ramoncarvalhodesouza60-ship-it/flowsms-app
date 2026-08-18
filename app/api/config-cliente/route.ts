import { NextRequest, NextResponse } from 'next/server'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

async function buscarRecordCliente(empresa: string): Promise<any | null> {
    let record: any = null
    await new Promise<void>((resolve, reject) => {
        const formula = '{empresa} = "' + empresa + '"'
        base('Clientes').select({ filterByFormula: formula, maxRecords: 1 }).eachPage(
            (pageRecords: any[], fetchNextPage: () => void) => {
                pageRecords.forEach((r: any) => { record = r })
                fetchNextPage()
            },
            (err: any) => { if (err) reject(err); else resolve() }
        )
    })
    return record
}

export async function GET(request: NextRequest) {
    try {
        const empresa = request.nextUrl.searchParams.get('empresa') || ''
        const record = await buscarRecordCliente(empresa)

        if (!record) {
            return NextResponse.json({ success: false, error: 'Cliente não encontrado' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            telefoneAdmin: record.get('telefone_admin') || '',
            email: record.get('email') || '',
        })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { empresa, telefoneAdmin } = await request.json()

        const record = await buscarRecordCliente(empresa)
        if (!record) {
            return NextResponse.json({ success: false, error: 'Cliente não encontrado' }, { status: 404 })
        }

        await base('Clientes').update(record.id, {
            'telefone_admin': telefoneAdmin || '',
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
