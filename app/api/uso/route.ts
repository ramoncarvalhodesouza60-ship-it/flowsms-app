import { NextRequest, NextResponse } from 'next/server'
import { validarSessaoEEmpresa } from '@/lib/auth'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

function limitesDoMesAtual() {
    const agora = new Date()
    const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1)
    const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 1)
    return { inicio: inicio.toISOString(), fim: fim.toISOString() }
}

export async function GET(request: NextRequest) {
    try {
        const empresa = request.nextUrl.searchParams.get('empresa') || ''
        if (!empresa) {
            return NextResponse.json({ success: false, error: 'empresa é obrigatória' }, { status: 400 })
        }

        const erro = await validarSessaoEEmpresa(request, empresa)
        if (erro) return erro

        const { inicio, fim } = limitesDoMesAtual()

        let totalWhatsApp = 0
        const telefonesUsados = new Set<string>()

        await new Promise<void>((resolve, reject) => {
            const formula = 'AND({empresa} = "' + empresa + '", {tipo} = "enviada", {horario} >= "' + inicio + '", {horario} < "' + fim + '")'
            base('Mensagens').select({ filterByFormula: formula, maxRecords: 5000 }).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    pageRecords.forEach((record: any) => {
                        totalWhatsApp++
                        const tel = record.get('telefone')
                        if (tel) telefonesUsados.add(String(tel).replace(/\D/g, ''))
                    })
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })

        let totalSMSNovo = 0
        const telefonesSMSUsados = new Set<string>()

        await new Promise<void>((resolve, reject) => {
            const formula = 'AND({empresa} = "' + empresa + '", {tipo} = "sms", {horario} >= "' + inicio + '", {horario} < "' + fim + '")'
            base('Mensagens').select({ filterByFormula: formula, maxRecords: 5000 }).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    pageRecords.forEach((record: any) => {
                        totalSMSNovo++
                        const tel = record.get('telefone')
                        if (tel) telefonesSMSUsados.add(String(tel).replace(/\D/g, ''))
                    })
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })

        let totalSMSAntigo = 0

        await new Promise<void>((resolve, reject) => {
            const formula = '{SMS Enviados} = TRUE()'
            base('Contato').select({ filterByFormula: formula, maxRecords: 5000 }).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    pageRecords.forEach((record: any) => {
                        totalSMSAntigo++
                        const tel = record.get('Phone')
                        if (tel) telefonesSMSUsados.add(String(tel).replace(/\D/g, ''))
                    })
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })

        const totalSMS = totalSMSNovo + totalSMSAntigo

        return NextResponse.json({
            success: true,
            whatsapp: {
                usados: totalWhatsApp,
                telefonesUsados: Array.from(telefonesUsados),
            },
            sms: {
                usados: totalSMS,
                telefonesUsados: Array.from(telefonesSMSUsados),
            },
        })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}