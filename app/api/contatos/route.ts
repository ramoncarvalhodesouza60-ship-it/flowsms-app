import { NextResponse } from "next/server"
import Airtable from "airtable"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!)

export async function GET() {
  try {
    const records: any[] = []
    await new Promise<void>((resolve, reject) => {
      base("Contato").select({ maxRecords: 100 }).eachPage(
        (pageRecords: any[], fetchNextPage: () => void) => {
          pageRecords.forEach((record: any) => {
            records.push({ id: record.id, nome: record.get("Name"), telefone: record.get("Phone"), status: record.get("Status"), smsEnviado: record.get("SMS Enviados") })
          })
          fetchNextPage()
        },
        (err: any) => { err ? reject(err) : resolve() }
      )
    })
    return NextResponse.json(records)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { nome, telefone } = await request.json()
    const record = await base("Contato").create({ "Name": nome, "Phone": telefone, "Status": "Aguardando retorno" })
    return NextResponse.json({ success: true, id: record.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json()
    await base("Contato").update(id, { "Status": status })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    await base("Contato").destroy(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
