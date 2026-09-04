import { NextRequest, NextResponse } from 'next/server'
import { validarSessaoOuInterno } from '@/lib/auth'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

function normalizarTelefone(tel: string) {
    return (tel || '').replace(/\D/g, '')
}

export async function POST(request: NextRequest) {
    try {
        const erro = await validarSessaoOuInterno(request)
        if (erro) return erro

        const { telefone, empresa } = await request.json()

        if (!telefone || !empresa) {
            return NextResponse.json({ success: false, error: 'telefone e empresa são obrigatórios' }, { status: 400 })
        }

        const telNorm = normalizarTelefone(telefone)

        let contatoRecord: any = null
        await new Promise<void>((resolve, reject) => {
            base('Contato').select({ maxRecords: 500 }).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    pageRecords.forEach((record: any) => {
                        const tel = record.get('Phone') || ''
                        if (normalizarTelefone(tel) === telNorm) contatoRecord = record
                    })
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })

        const etapaAtual = contatoRecord?.get('etapa') || 'novo'
        const jaNotificadaNestaEtapa = contatoRecord?.get('etapa_notificada_quente') || null

        if (jaNotificadaNestaEtapa === etapaAtual) {
            return NextResponse.json({ success: true, notificado: false, motivo: 'Já notificado nesta etapa' })
        }

        let telefoneAdmin: string | null = null
        let whatsappToken: string | null = null
        let phoneNumberId: string | null = null

        await new Promise<void>((resolve, reject) => {
            const formula = '{empresa} = "' + empresa + '"'
            base('Clientes').select({ filterByFormula: formula, maxRecords: 1 }).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    pageRecords.forEach((record: any) => {
                        telefoneAdmin = record.get('telefone_admin') || null
                        whatsappToken = record.get('whatsapp_token') || null
                        phoneNumberId = record.get('phone_number_id') || null
                    })
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })

        if (!telefoneAdmin) {
            return NextResponse.json({ success: true, notificado: false, motivo: 'Cliente sem telefone_admin cadastrado' })
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://flowsms.com.br'
        const nomeContato = contatoRecord?.get('Name') || telefone

        const mensagem =
            '🔥 Lead quente detectado!\n\n' +
            '📱 Cliente: ' + nomeContato + ' (' + telefone + ')\n\n' +
            'Esse contato está demonstrando forte interesse de compra. Vale dar atenção especial nessa conversa!'

        await fetch(baseUrl + '/api/whatsapp/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-chave-interna': process.env.CHAVE_INTERNA || '',
            },
            body: JSON.stringify({
                telefone: telefoneAdmin,
                mensagem,
                token: whatsappToken,
                phoneNumberId: phoneNumberId,
            }),
        })

        if (contatoRecord) {
            await base('Contato').update(contatoRecord.id, { etapa_notificada_quente: etapaAtual })
        }

        return NextResponse.json({ success: true, notificado: true })
    } catch (error: any) {
        console.error('Erro ao notificar lead quente:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}