import { NextRequest, NextResponse } from 'next/server'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

function normalizarTelefone(tel: string) {
    return (tel || '').replace(/\D/g, '')
}

// Colunas padrão, usadas quando a empresa ainda não personalizou nada
// (igual ao app/api/kanban-colunas/route.ts, pra manter consistência)
const colunasPadrao = [
    { id: 'novo', label: 'Novo', cor: '#74c7ec' },
    { id: 'em_atendimento', label: 'Em Atendimento', cor: '#f9e2af' },
    { id: 'proposta', label: 'Proposta Enviada', cor: '#FF6B00' },
    { id: 'convertido', label: 'Convertido', cor: '#22c55e' },
    { id: 'perdido', label: 'Perdido', cor: '#f38ba8' },
    { id: 'entregue', label: 'Entregue', cor: '#a78bfa' },
]

async function buscarColunas(empresa: string) {
    if (!empresa) return colunasPadrao
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

    const bruto = record?.get('kanban_colunas')
    if (!bruto) return colunasPadrao
    try {
        const colunas = JSON.parse(bruto)
        if (Array.isArray(colunas) && colunas.length > 0) return colunas
    } catch {
        // JSON inválido salvo por engano — volta pro padrão
    }
    return colunasPadrao
}

export async function GET(request: NextRequest) {
    try {
        const atendenteId = request.nextUrl.searchParams.get('atendenteId') || ''
        if (!atendenteId) {
            return NextResponse.json({ success: false, error: 'atendenteId é obrigatório' }, { status: 400 })
        }

        // 1. Busca o atendente pra saber a empresa dele
        const atendenteRecord = await base('Atendentes').find(atendenteId)
        const empresa = atendenteRecord.get('empresa') || ''

        // 2. Busca as colunas do Kanban dessa empresa
        const colunas = await buscarColunas(empresa)

        // 3. Busca só os contatos atribuídos a esse atendente e com atendimento ativo
        const contatos: any[] = []
        await new Promise<void>((resolve, reject) => {
            const formula = 'AND({atendente_id} = "' + atendenteId + '", {atendimento_ativo} = TRUE())'
            base('Contato').select({ filterByFormula: formula, maxRecords: 500 }).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    pageRecords.forEach((record: any) => {
                        contatos.push({
                            nome: record.get('Name'),
                            telefone: record.get('Phone'),
                            etapa: record.get('etapa') || null,
                            atendimentoAtivo: !!record.get('atendimento_ativo'),
                        })
                    })
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })

        const telefonesAtendente = new Set(contatos.map(c => normalizarTelefone(c.telefone)))
        const mapaContatos = new Map<string, { nome: string | null; etapa: string | null; atendimentoAtivo: boolean }>()
        contatos.forEach(c => {
            if (c.telefone) {
                mapaContatos.set(normalizarTelefone(c.telefone), {
                    nome: c.nome || null,
                    etapa: c.etapa,
                    atendimentoAtivo: c.atendimentoAtivo,
                })
            }
        })

        // Se o atendente não tem nenhum contato atribuído, já retorna vazio (evita puxar mensagens à toa)
        if (telefonesAtendente.size === 0) {
            return NextResponse.json({ success: true, mensagens: [], colunas })
        }

        // 4. Busca as mensagens da empresa e filtra só as dos telefones desse atendente
        const mensagens: any[] = []
        await new Promise<void>((resolve, reject) => {
            const opcoes: any = { maxRecords: 1000, sort: [{ field: 'horario', direction: 'asc' }] }
            if (empresa) opcoes.filterByFormula = '{empresa} = "' + empresa + '"'
            base('Mensagens').select(opcoes).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    pageRecords.forEach((record: any) => {
                        const telefone = record.get('telefone')
                        if (telefonesAtendente.has(normalizarTelefone(telefone))) {
                            const info = mapaContatos.get(normalizarTelefone(telefone))
                            mensagens.push({
                                id: record.id,
                                telefone: telefone,
                                mensagem: record.get('mensagem'),
                                tipo: record.get('tipo'),
                                horario: record.get('horario'),
                                nomeContato: info?.nome || null,
                                etapaContato: info?.etapa || null,
                                atendimentoAtivo: info?.atendimentoAtivo ?? true,
                            })
                        }
                    })
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })

        return NextResponse.json({ success: true, mensagens, colunas })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
