import { NextResponse } from 'next/server'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function POST(request: Request) {
  try {
    const { telefone, mensagem, contatoId, empresa } = await request.json()
    const numero = telefone.replace(/\D/g, '')
    const key = process.env.SMSDEV_API_KEY
    const url = 'https://api.smsdev.com.br/v1/send?key=' + key + '&type=9&number=' + numero + '&msg=' + encodeURIComponent(mensagem)
    const res = await fetch(url)
    const data = await res.json()

    // DIAGNÓSTICO TEMPORÁRIO: sempre salva no Airtable, independente da situacao,
    // e devolve a resposta crua da SMSDev pra vermos o que ela realmente retorna.
    if (contatoId) {
      await base('Contato').update(contatoId, {
        'SMS Enviados': true
      })
    }

    await base('Mensagens').create({
      'telefone': telefone,
      'mensagem': mensagem,
      'tipo': 'sms',
      'horario': new Date().toISOString(),
      'empresa': empresa || '',
    })

    return NextResponse.json({ success: true, debug_smsdev_response: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
