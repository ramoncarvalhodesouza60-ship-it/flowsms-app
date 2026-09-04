import { NextRequest, NextResponse } from 'next/server'
import { verificarToken } from '@/lib/auth'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

function normalizarTelefone(tel: string) {
    return (tel || '').replace(/\D/g, '')
}

async function buscarRegistroContato(telefone: string) {
    let record: any = null
    await new Promise<void>((resolve, reject) => {
        const semMais = telefone.replace('+', '')
        const formula = 'OR({Phone} = "' + telefone + '", {Phone} = "+' + semMais + '", {Phone} = "' + semMais + '")'
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

export async function GET(request: NextRequest) {
    try {
        const cookie = request.cookies.get('sessao')
        if (!cookie) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
        const sessao = await verificarToken(cookie.value)
        if (!sessao) return NextResponse.json({ success: false, error: 'Sessão inválida' }, { status: 401 })

        const mapa: Record<string, string[]> = {}

        await new Promise<void>((resolve, reject) => {
            const opcoes: any = { maxRecords: 1000 }
            if (!sessao.admin) {
                opcoes.filterByFormula = '{empresa} = "' + sessao.empresa + '"'
            }
            base('Contato').select(opcoes).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    pageRecords.forEach((record: any) => {
                        const telefone = record.get('Phone')
                        const tagsBruto = record.get('tags')
                        if (telefone && tagsBruto) {
                            const chave = normalizarTelefone(telefone)
                            mapa[chave] = String(tagsBruto).split(',').map((t: string) => t.trim()).filter(Boolean)
                        }
                    })
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })

        return NextResponse.json({ success: true, tags: mapa })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const cookie = request.cookies.get('sessao')
        if (!cookie) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
        const sessao = await verificarToken(cookie.value)
        if (!sessao) return NextResponse.json({ success: false, error: 'Sessão inválida' }, { status: 401 })

        const { telefone, tags } = await request.json()
        if (!telefone) {
            return NextResponse.json({ success: false, error: 'telefone é obrigatório' }, { status: 400 })
        }

        const record = await buscarRegistroContato(telefone)
        if (!record) {
            return NextResponse.json({ success: false, error: 'Contato não encontrado' }, { status: 404 })
        }

        const empresaDoRegistro = record.get('empresa')
        if (!sessao.admin && sessao.empresa !== empresaDoRegistro) {
            return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 })
        }

        const valor = Array.isArray(tags) ? tags.join(',') : ''
        await base('Contato').update(record.id, { tags: valor })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}