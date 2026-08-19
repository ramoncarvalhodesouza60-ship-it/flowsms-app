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
            base('Atendentes').select(opcoes).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    pageRecords.forEach((record: any) => {
                        records.push({
                            id: record.id,
                            nome: record.get('nome'),
                            email: record.get('email'),
                            disponivel: !!record.get('disponivel'),
                            capacidadeMaxima: record.get('capacidade_maxima') || 10,
                            ativo: record.get('ativo') !== false,
                        })
                    })
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })
        return NextResponse.json({ success: true, atendentes: records })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const { nome, email, senha, empresa, capacidadeMaxima } = await request.json()

        if (!nome || !email || !senha || !empresa) {
            return NextResponse.json({ success: false, error: 'Nome, e-mail, senha e empresa são obrigatórios' }, { status: 400 })
        }

        const record = await base('Atendentes').create({
            'nome': nome,
            'email': email,
            'senha': senha,
            'empresa': empresa,
            'disponivel': true,
            'capacidade_maxima': Number(capacidadeMaxima) || 10,
            'ativo': true,
        })
        return NextResponse.json({ success: true, id: record.id })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { id, nome, email, senha, disponivel, capacidadeMaxima, ativo } = await request.json()
        if (!id) {
            return NextResponse.json({ success: false, error: 'id é obrigatório' }, { status: 400 })
        }

        const campos: any = {}
        if (nome !== undefined) campos['nome'] = nome
        if (email !== undefined) campos['email'] = email
        if (senha !== undefined && senha !== '') campos['senha'] = senha
        if (disponivel !== undefined) campos['disponivel'] = disponivel
        if (capacidadeMaxima !== undefined) campos['capacidade_maxima'] = Number(capacidadeMaxima)
        if (ativo !== undefined) campos['ativo'] = ativo

        const result = await base('Atendentes').update(id, campos)
        return NextResponse.json({ success: true, id: result.id })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { id } = await request.json()
        await base('Atendentes').destroy(id)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
