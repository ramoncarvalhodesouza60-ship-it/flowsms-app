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
    return NextResponse.json(records)
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
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()
    await base('Contato').destroy(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
} export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body
    if (!id || !status) {
      return NextResponse.json({ error: 'id e status são obrigatórios', id, status }, { status: 400 })
    }
    const result = await base('Contato').update(id, { 'Status': status })
    return NextResponse.json({ success: true, id: result.id })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      statusCode: error.statusCode,
      detail: error.error
    }, { status: 500 })
  }
}
