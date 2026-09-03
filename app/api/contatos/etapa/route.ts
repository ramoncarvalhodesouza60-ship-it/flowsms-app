import { NextRequest, NextResponse } from 'next/server'
import { validarSessaoEEmpresa } from '@/lib/auth'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

function normalizarTelefone(tel: string) {
    return (tel || '').replace(/\D/g, '')
}

export async function POST(req: NextRequest) {
    try {
        const { telefone, etapa, empresa } = await req.json()

        if (!telefone || !etapa) {
            return NextResponse.json({ success: false, error: 'telefone e etapa são obrigatorios' }, { status: 400 })
        }

        const erro = await validarSessaoEEmpresa(req, empresa || '')
        if (erro) return erro

        const telNorm = normalizarTelefone(telefone)

        const records: any[] = []
        await new Promise<void>((resolve, reject) => {
            base('Contato').select({ maxRecords: 500 }).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    pageRecords.forEach((record: any) => {
                        const tel = record.get('Phone') || ''
                        if (normalizarTelefone(tel) === telNorm) {
                            records.push(record)
                        }
                    })
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })

        let contatoId: string
        if (records.length === 0) {
            const novoRecord = await base('Contato').create({
                'Phone': telefone,
                'etapa': etapa,
            })
            contatoId = novoRecord.id
        } else {
            await base('Contato').update(records[0].id, { etapa: etapa })
            contatoId = records[0].id
        }

        if (empresa) {
            let colunas: any[] = []
            let whatsappToken: string | null = null
            let phoneNumberId: string | null = null

            await new Promise<void>((resolve, reject) => {
                const formula = '{empresa} = "' + empresa + '"'
                base('Clientes').select({ filterByFormula: formula, maxRecords: 1 }).eachPage(
                    (pageRecords: any[], fetchNextPage: () => void) => {
                        pageRecords.forEach((record: any) => {
                            const bruto = record.get('kanban_colunas')
                            if (bruto) {
                                try { colunas = JSON.parse(bruto) } catch { }
                            }
                            whatsappToken = record.get('whatsapp_token') || null
                            phoneNumberId = record.get('phone_number_id') || null
                        })
                        fetchNextPage()
                    },
                    (err: any) => { if (err) reject(err); else resolve() }
                )
            })

            const colunaAtual = colunas.find((c: any) => c.id === etapa)

            if (colunaAtual?.ehConversao) {
                await base('Contato').update(contatoId, { atendimento_ativo: false })

                if (whatsappToken && phoneNumberId) {
                    const mensagem = colunaAtual.mensagemConversao?.trim() ||
                        'Muito obrigado pela confiança! 😊 Foi um prazer atender você. Qualquer coisa, estamos por aqui!'

                    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://flowsms.com.br'
                    try {
                        await fetch(baseUrl + '/api/whatsapp/send', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-chave-interna': process.env.CHAVE_INTERNA || '',
                            },
                            body: JSON.stringify({
                                telefone,
                                mensagem,
                                token: whatsappToken,
                                phoneNumberId: phoneNumberId,
                            }),
                        })
                    } catch (e) {
                        console.error('Erro ao enviar mensagem de conversão:', e)
                    }
                }
            }
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}