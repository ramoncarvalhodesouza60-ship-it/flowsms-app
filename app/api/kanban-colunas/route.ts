import { NextRequest, NextResponse } from 'next/server'
import { validarSessaoEEmpresa } from '@/lib/auth'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

const colunasPadrao = [
    { id: 'novo', label: 'Novo', cor: '#74c7ec' },
    { id: 'em_atendimento', label: 'Em Atendimento', cor: '#f9e2af' },
    { id: 'proposta', label: 'Proposta Enviada', cor: '#FF6B00' },
    { id: 'convertido', label: 'Convertido', cor: '#22c55e' },
    { id: 'perdido', label: 'Perdido', cor: '#f38ba8' },
    { id: 'entregue', label: 'Entregue', cor: '#a78bfa' },
]

async function buscarRecordCliente(empresa: string): Promise<any | null> {
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

export async function GET(request: NextRequest) {
    try {
        const empresa = request.nextUrl.searchParams.get('empresa') || ''

        const erro = await validarSessaoEEmpresa(request, empresa)
        if (erro) return erro

        const record = await buscarRecordCliente(empresa)

        const bruto = record?.get('kanban_colunas')
        if (!bruto) {
            return NextResponse.json({ success: true, colunas: colunasPadrao })
        }

        try {
            const colunas = JSON.parse(bruto)
            if (Array.isArray(colunas) && colunas.length > 0) {
                return NextResponse.json({ success: true, colunas })
            }
        } catch {
        }

        return NextResponse.json({ success: true, colunas: colunasPadrao })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { empresa, colunas } = await request.json()

        const erro = await validarSessaoEEmpresa(request, empresa || '')
        if (erro) return erro

        if (!Array.isArray(colunas) || colunas.length === 0) {
            return NextResponse.json({ success: false, error: 'É preciso ter pelo menos 1 coluna' }, { status: 400 })
        }

        const record = await buscarRecordCliente(empresa)
        if (!record) {
            return NextResponse.json({ success: false, error: 'Cliente não encontrado' }, { status: 404 })
        }

        await base('Clientes').update(record.id, {
            'kanban_colunas': JSON.stringify(colunas),
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}