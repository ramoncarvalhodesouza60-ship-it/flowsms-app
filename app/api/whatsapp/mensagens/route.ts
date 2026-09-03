import { NextRequest, NextResponse } from 'next/server'
import { validarSessaoEEmpresa } from '@/lib/auth'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

function normalizarTelefone(tel: string) {
    return (tel || '').replace(/\D/g, '')
}

export async function GET(request: NextRequest) {
    try {
        const empresa = request.nextUrl.searchParams.get('empresa') || ''

        const erro = await validarSessaoEEmpresa(request, empresa)
        if (erro) return erro

        // 1. Busca mensagens
        const records: any[] = []
        await new Promise<void>((resolve, reject) => {
            const opcoes: any = { maxRecords: 500, sort: [{ field: 'horario', direction: 'asc' }] }
            if (empresa) opcoes.filterByFormula = '{empresa} = "' + empresa + '"'
            base('Mensagens').select(opcoes).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    pageRecords.forEach((record: any) => {
                        records.push({
                            id: record.id,
                            telefone: record.get('telefone'),
                            mensagem: record.get('mensagem'),
                            tipo: record.get('tipo'),
                            horario: record.get('horario'),
                            empresa: record.get('empresa'),
                        })
                    })
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })

        // 2. Busca contatos para cruzar nome + status + etapa pelo telefone
        const contatos: any[] = []
        await new Promise<void>((resolve, reject) => {
            base('Contato').select({ maxRecords: 500 }).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    pageRecords.forEach((record: any) => {
                        contatos.push({
                            nome: record.get('Name'),
                            telefone: record.get('Phone'),
                            status: record.get('Status'),
                            etapa: record.get('etapa') || null,
                            empresa: record.get('empresa'),
                        })
                    })
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })

        const mapaContatos = new Map<string, { nome: string; status: string; etapa: string | null }>()
        contatos.forEach(c => {
            if (c.telefone) {
                mapaContatos.set(normalizarTelefone(c.telefone), {
                    nome: c.nome,
                    status: c.status,
                    etapa: c.etapa,
                })
            }
        })

        const comNome = records.map(r => {
            const info = mapaContatos.get(normalizarTelefone(r.telefone))
            return {
                ...r,
                nomeContato: info?.nome || null,
                statusContato: info?.status || null,
                etapaContato: info?.etapa || null,
            }
        })

        return NextResponse.json(comNome)
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const { telefone, mensagem, tipo, empresa } = await request.json()
        if (!telefone || !mensagem || !tipo) {
            return NextResponse.json({ error: 'telefone, mensagem e tipo são obrigatórios' }, { status: 400 })
        }

        const erro = await validarSessaoEEmpresa(request, empresa || '')
        if (erro) return erro

        const record = await base('Mensagens').create({
            'telefone': telefone,
            'mensagem': mensagem,
            'tipo': tipo,
            'horario': new Date().toISOString(),
            'empresa': empresa || '',
        })
        return NextResponse.json({ success: true, id: record.id })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}