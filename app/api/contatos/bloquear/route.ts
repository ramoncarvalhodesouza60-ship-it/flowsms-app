import { NextRequest, NextResponse } from 'next/server'
import { validarSessaoEEmpresa, registrarLog } from '@/lib/auth'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

async function buscarContatoPorTelefone(telefone: string, empresa: string): Promise<any | null> {
    let record: any = null
    await new Promise<void>((resolve, reject) => {
        const formula = 'AND({telefone} = "' + telefone + '", {empresa} = "' + empresa + '")'
        base('Contato').select({ filterByFormula: formula, maxRecords: 1 }).eachPage(
            (pageRecords: any[], fetchNextPage: () => void) => {
                pageRecords.forEach((r: any) => { record = r })
                fetchNextPage()
            },
            (err: any) => { if (err) reject(err); else resolve() }
        )
    })
    return record
}

async function buscarClientePorEmpresa(empresa: string): Promise<any | null> {
    let record: any = null
    await new Promise<void>((resolve, reject) => {
        const formula = '{empresa} = "' + empresa + '"'
        base('Clientes').select({ filterByFormula: formula, maxRecords: 1 }).eachPage(
            (pageRecords: any[], fetchNextPage: () => void) => {
                pageRecords.forEach((r: any) => { record = r })
                fetchNextPage()
            },
            (err: any) => { if (err) reject(err); else resolve() }
        )
    })
    return record
}

export async function POST(request: NextRequest) {
    try {
        const { telefone, empresa, bloquear } = await request.json()

        const erro = await validarSessaoEEmpresa(request, empresa || '')
        if (erro) return erro

        if (!telefone) {
            return NextResponse.json({ success: false, error: 'telefone obrigatório' }, { status: 400 })
        }

        // Marca/desmarca no Airtable (isso já faz o webhook parar de processar o número)
        const contato = await buscarContatoPorTelefone(telefone, empresa)
        if (contato) {
            await base('Contato').update(contato.id, { bloqueado: !!bloquear })
        }

        // Se for bloquear, tenta também bloquear oficialmente via Meta Graph API
        if (bloquear) {
            const cliente = await buscarClientePorEmpresa(empresa)
            const token = cliente?.get('whatsapp_token')
            const phoneNumberId = cliente?.get('phone_number_id')

            if (token && phoneNumberId) {
                try {
                    await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/block_users`, {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            messaging_product: 'whatsapp',
                            block_users: [{ user: telefone }],
                        }),
                    })
                } catch (e) {
                    console.error('Erro ao bloquear via Meta (não crítico, já bloqueado localmente):', e)
                }
            }
        }

        await registrarLog(
            'sistema',
            bloquear ? 'bloqueou_contato' : 'desbloqueou_contato',
            `Telefone ${telefone}`,
            empresa
        )

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}