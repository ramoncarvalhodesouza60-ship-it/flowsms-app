import { NextResponse } from 'next/server'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function POST(request: Request) {
  try {
    const { telefone, mensagem, contatoId } = await request.json()
    const numero = telefone.replace(/\D/g, '')
    const key = process.env.SMSDEV_API_KEY
    const url = 'https://api.smsdev.com.br/v1/send?key=' + key + '&type=9&number=' + numero + '&msg=' + encodeURIComponent(mensagem)
    const res = await fetch(url)
    const data = await res.json()

    if (data[0]?.situacao === 'OK') {
      if (contatoId) {
        await base('Contato').update(contatoId, {
          'SMS Enviados': true
        })
      }
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ success: false, error: data[0]?.descricao || 'SMS enviado com sucesso!' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}