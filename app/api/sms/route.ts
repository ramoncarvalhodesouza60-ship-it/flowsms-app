import { NextRequest, NextResponse } from 'next/server'
import { validarSessaoEEmpresa } from '@/lib/auth'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function POST(request: NextRequest) {
  try {
    const { telefone, mensagem, contatoId, empresa } = await request.json()

    const erro = await validarSessaoEEmpresa(request, empresa || '')
    if (erro) return erro

    const numero = telefone.replace(/\D/g, '')
    const key = process.env.SMSDEV_API_KEY
    const url = 'https://api.smsdev.com.br/v1/send?key=' + key + '&type=9&number=' + numero + '&msg=' + encodeURIComponent(mensagem)
    const res = await fetch(url)
    const data = await res.json()

    if (data?.situacao === 'OK') {
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

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: data?.descricao || 'Falha ao enviar SMS' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}