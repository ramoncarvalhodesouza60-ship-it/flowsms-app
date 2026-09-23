import { NextRequest, NextResponse } from 'next/server'
import { validarSessaoEEmpresa } from '@/lib/auth'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

function normalizarTelefone(tel: string) {
    return (tel || '').replace(/\D/g, '')
}

// Busca as respostas (MO) na SMSDev, salva as que ainda não existem no Airtable,
// e devolve a lista completa de respostas da empresa (já salvas)
export async function GET(request: NextRequest) {
    try {
        const empresa = request.nextUrl.searchParams.get('empresa') || ''

        const erro = await validarSessaoEEmpresa(request, empresa)
        if (erro) return erro

        // Busca na SMSDev as respostas recebidas
        const key = process.env.SMSDEV_API_KEY
        const smsDevRes = await fetch(`https://api.smsdev.com.br/v1/inbox?key=${key}&status=0`)
        const smsDevData = await smsDevRes.json()

        // Se vierem respostas novas, salva as que ainda não existem (evita duplicar)
        if (Array.isArray(smsDevData?.data)) {
            for (const item of smsDevData.data) {
                const telefone = item.number || item.telefone || ''
                const mensagem = item.msg || item.message || ''
                const idOriginal = String(item.refer || item.id || '')

                if (!telefone || !mensagem) continue

                // Confere se já existe esse registro (mesmo id) pra não duplicar
                let jaExiste = false
                await new Promise<void>((resolve, reject) => {
                    const formula = '{id_sms_original} = "' + idOriginal + '"'
                    base('RespostasSMS').select({ filterByFormula: formula, maxRecords: 1 }).eachPage(
                        (pageRecords: any[], fetchNextPage: () => void) => {
                            if (pageRecords.length > 0) jaExiste = true
                            fetchNextPage()
                        },
                        (err: any) => { if (err) reject(err); else resolve() }
                    )
                })

                if (!jaExiste) {
                    await base('RespostasSMS').create({
                        telefone: normalizarTelefone(telefone),
                        mensagem,
                        id_sms_original: idOriginal,
                        lida: false,
                        empresa,
                    })
                }
            }
        }

        // Busca todas as respostas salvas dessa empresa, pra devolver pro front-end
        const respostas: any[] = []
        await new Promise<void>((resolve, reject) => {
            const formula = empresa ? '{empresa} = "' + empresa + '"' : ''
            const opcoes: any = { maxRecords: 500 }
            if (formula) opcoes.filterByFormula = formula
            base('RespostasSMS').select(opcoes).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    pageRecords.forEach((record: any) => {
                        respostas.push({
                            id: record.id,
                            telefone: record.get('telefone'),
                            mensagem: record.get('mensagem'),
                            lida: !!record.get('lida'),
                            recebidoEm: record.get('recebido_em'),
                        })
                    })
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })

        return NextResponse.json({ success: true, respostas })
    } catch (error: any) {
        console.error('Erro ao buscar inbox SMS:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// Marca uma resposta como lida
export async function PATCH(request: NextRequest) {
    try {
        const { id, empresa } = await request.json()
        if (!id) return NextResponse.json({ success: false, error: 'id obrigatório' }, { status: 400 })

        const erro = await validarSessaoEEmpresa(request, empresa || '')
        if (erro) return erro

        await base('RespostasSMS').update(id, { lida: true })
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}