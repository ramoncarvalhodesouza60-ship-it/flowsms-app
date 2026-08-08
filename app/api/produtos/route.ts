import { NextRequest, NextResponse } from 'next/server'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function GET(request: NextRequest) {
    try {
        const empresa = request.nextUrl.searchParams.get('empresa') || ''
        const records: any[] = []
        await new Promise<void>((resolve, reject) => {
            const opcoes: any = { maxRecords: 200 }
            if (empresa) opcoes.filterByFormula = '{empresa} = "' + empresa + '"'
            base('Produtos').select(opcoes).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    pageRecords.forEach((record: any) => {
                        records.push({
                            id: record.id,
                            nome: record.get('nome'),
                            variacao: record.get('variacao'),
                            preco: record.get('preco'),
                            estoque: record.get('estoque'),
                            empresa: record.get('empresa'),
                        })
                    })
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })
        return NextResponse.json({ success: true, produtos: records })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const { nome, variacao, preco, estoque, empresa } = await request.json()

        if (!nome || !empresa) {
            return NextResponse.json({ success: false, error: 'Nome e empresa são obrigatórios' }, { status: 400 })
        }

        const record = await base('Produtos').create({
            'nome': nome,
            'variacao': variacao || '',
            'preco': Number(preco) || 0,
            'estoque': Number(estoque) || 0,
            'empresa': empresa,
        })
        return NextResponse.json({ success: true, id: record.id })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { id, nome, variacao, preco, estoque } = await request.json()
        if (!id) {
            return NextResponse.json({ success: false, error: 'id é obrigatório' }, { status: 400 })
        }

        const campos: any = {}
        if (nome !== undefined) campos['nome'] = nome
        if (variacao !== undefined) campos['variacao'] = variacao
        if (preco !== undefined) campos['preco'] = Number(preco)
        if (estoque !== undefined) campos['estoque'] = Number(estoque)

        const result = await base('Produtos').update(id, campos)
        return NextResponse.json({ success: true, id: result.id })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { id } = await request.json()
        await base('Produtos').destroy(id)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}