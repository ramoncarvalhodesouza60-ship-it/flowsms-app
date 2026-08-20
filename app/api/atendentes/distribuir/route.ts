import { NextResponse } from 'next/server'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

function normalizarTelefone(tel: string) {
    return (tel || '').replace(/\D/g, '')
}

export async function POST(request: Request) {
    try {
        const { telefone, empresa } = await request.json()

        if (!telefone || !empresa) {
            return NextResponse.json({ success: false, error: 'telefone e empresa são obrigatórios' }, { status: 400 })
        }

        const telNorm = normalizarTelefone(telefone)

        // 1. Verifica se o contato já existe (se já foi atribuído antes, não mexe de novo)
        let contatoRecord: any = null
        await new Promise<void>((resolve, reject) => {
            base('Contato').select({ maxRecords: 500 }).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    pageRecords.forEach((record: any) => {
                        const tel = record.get('Phone') || ''
                        if (normalizarTelefone(tel) === telNorm) contatoRecord = record
                    })
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })

        // Só bloqueia nova distribuição se o atendimento anterior AINDA estiver ativo
        // (se foi finalizado, precisa poder atribuir de novo)
        if (contatoRecord && contatoRecord.get('atendente_id') && contatoRecord.get('atendimento_ativo')) {
            return NextResponse.json({ success: true, ja_atribuido: true })
        }

        // 2. Busca todos os atendentes ativos dessa empresa
        const atendentes: any[] = []
        await new Promise<void>((resolve, reject) => {
            const formula = 'AND({empresa} = "' + empresa + '", {ativo} = TRUE())'
            base('Atendentes').select({ filterByFormula: formula, maxRecords: 200 }).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    pageRecords.forEach((record: any) => {
                        atendentes.push({
                            id: record.id,
                            disponivel: !!record.get('disponivel'),
                            capacidadeMaxima: record.get('capacidade_maxima') || 10,
                        })
                    })
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })

        // 3. Conta quantas conversas ativas cada atendente tem agora
        const todosContatos: any[] = []
        await new Promise<void>((resolve, reject) => {
            base('Contato').select({ maxRecords: 1000 }).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    pageRecords.forEach((record: any) => {
                        if (record.get('atendimento_ativo') && record.get('atendente_id')) {
                            todosContatos.push({ atendenteId: record.get('atendente_id') })
                        }
                    })
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })

        const cargaPorAtendente: Record<string, number> = {}
        todosContatos.forEach(c => {
            cargaPorAtendente[c.atendenteId] = (cargaPorAtendente[c.atendenteId] || 0) + 1
        })

        // 4. Filtra só os disponíveis e com espaço, pega o(s) com menor carga
        const elegiveis = atendentes.filter(a => {
            const carga = cargaPorAtendente[a.id] || 0
            return a.disponivel && carga < a.capacidadeMaxima
        })

        if (elegiveis.length === 0) {
            // Ninguém disponível/com espaço — cai pro dono, não atribui atendente
            return NextResponse.json({ success: true, atribuido: false, motivo: 'Nenhum atendente disponível, ficou com o dono' })
        }

        const menorCarga = Math.min(...elegiveis.map(a => cargaPorAtendente[a.id] || 0))
        const empatados = elegiveis.filter(a => (cargaPorAtendente[a.id] || 0) === menorCarga)
        const escolhido = empatados[Math.floor(Math.random() * empatados.length)]

        // 5. Salva a atribuição no Contato (cria se não existir, atualiza se já existir sem atendente)
        if (contatoRecord) {
            await base('Contato').update(contatoRecord.id, {
                atendente_id: escolhido.id,
                atendimento_ativo: true,
            })
        } else {
            await base('Contato').create({
                'Phone': telefone,
                'atendente_id': escolhido.id,
                'atendimento_ativo': true,
            })
        }

        return NextResponse.json({ success: true, atribuido: true, atendenteId: escolhido.id })
    } catch (error: any) {
        console.error('Erro ao distribuir lead:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

