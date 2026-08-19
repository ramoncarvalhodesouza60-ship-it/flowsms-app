import { NextResponse } from 'next/server'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function POST(request: Request) {
    try {
        const { atendenteId, disponivel } = await request.json()

        if (!atendenteId) {
            return NextResponse.json({ success: false, error: 'atendenteId é obrigatório' }, { status: 400 })
        }

        await base('Atendentes').update(atendenteId, { disponivel: !!disponivel })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
