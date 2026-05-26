import { NextRequest, NextResponse } from 'next/server'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function GET(request: NextRequest) {
  try {
    const empresa = request.nextUrl.searchParams.get('empresa') || ''
    const records: any[] = []
    await new Promise<void>((resolve, reject) => {
      const filtro = empresa ? 'empresa = "' + empresa + '"' : ''
      const opcoes: any = { maxRecords: 100 }
      if (filtro) opcoes.filterByFormula = '{empresa} = "' + empresa + '"'
      base('Contato').select(opcoes).eachPage(
        (pageRecords: any[], fetchNextPage: () => void) => {
          pageRecords.forEach((record: any) => {
            records.push({
              id: record.id,
              nome: record.get('Name'),
              telefone: record.get('Phone'),
              status: record.get('Status'),
              smsEnviado: record.get('SMS Enviados'),
              empresa: record.get('empresa'),
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

export async function POST(request: NextRequest) {
  try {
    const { nome, telefone, empresa } = await request.json()
    const record = await base('Contato').create({
      'Name': nome,
      'Phone': telefone,
      'Status': 'Aguardando retorno',
      'empresa': empresa
    })
    return NextResponse.json({ success: true, id: record.id })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}