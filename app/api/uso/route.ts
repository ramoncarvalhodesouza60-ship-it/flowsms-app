import { NextRequest, NextResponse } from 'next/server'

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

        const { inicio, fim } = limitesDoMesAtual()

        // Conta WhatsApp — mensagens do tipo 'enviada' no mês atual
        // OBS: campo "horario" é Single line text no Airtable, não Date.
        // Como o valor é ISO 8601 (ex: 2026-06-18T06:15:04.979Z), a comparação
        // de texto (>=, <) funciona corretamente, ao contrário de IS_AFTER/IS_BEFORE
        // que exigem um campo de Data de verdade.
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

        // Conta SMS novos — tipo 'sms' na tabela Mensagens (após nossa correção)
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

        // Conta SMS antigos — campo 'SMS Enviados' na tabela Contato (antes da correção)
        let totalSMSAntigo = 0

        await new Promise<void>((resolve, reject) => {
            // Busca contatos com SMS marcado — sem filtro de empresa pois os antigos não tinham empresa
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