import { NextResponse } from 'next/server'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

async function buscarProdutos(empresa: string) {
    const records: any[] = []
    await new Promise<void>((resolve, reject) => {
        const opcoes: any = { maxRecords: 200 }
        if (empresa) opcoes.filterByFormula = '{empresa} = "' + empresa + '"'
        base('Produtos').select(opcoes).eachPage(
            (pageRecords: any[], fetchNextPage: () => void) => {
                pageRecords.forEach((record: any) => {
                    records.push({
                        nome: record.get('nome'),
                        variacao: record.get('variacao'),
                        preco: record.get('preco'),
                        estoque: record.get('estoque'),
                    })
                })
                fetchNextPage()
            },
            (err: any) => { if (err) reject(err); else resolve() }
        )
    })
    return records
}

const ferramentas = [
    {
        name: 'buscar_catalogo',
        description: 'Busca a lista de produtos, variações, preços e estoque disponíveis no catálogo da loja. Use sempre que o cliente perguntar sobre produtos, preços, disponibilidade ou quiser fazer um pedido.',
        input_schema: {
            type: 'object' as const,
            properties: {},
        },
    },
]

// Gera a resposta da IA para uma mensagem real recebida no WhatsApp (chamada pelo webhook)
export async function POST(request: Request) {
    try {
        const { mensagem, systemPrompt, empresa } = await request.json()

        if (!mensagem) {
            return NextResponse.json({ success: false, error: 'mensagem não informada' }, { status: 400 })
        }

        const systemFinal = systemPrompt || 'Você é um assistente de atendimento simpático e prestativo.'
        const mensagens: any[] = [{ role: 'user', content: mensagem }]

        // Primeira chamada — a IA decide se precisa consultar o catálogo
        let res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': process.env.ANTHROPIC_API_KEY || '',
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 500,
                system: systemFinal,
                tools: ferramentas,
                messages: mensagens,
            }),
        })

        let data = await res.json()

        if (!res.ok) {
            console.error('WHATSAPP/IA - erro Claude API:', res.status, JSON.stringify(data))
            return NextResponse.json({ success: false, error: data }, { status: res.status })
        }

        // Se a IA pediu para usar a ferramenta de catálogo, busca e manda de volta
        const chamadaFerramenta = data.content?.find((c: any) => c.type === 'tool_use' && c.name === 'buscar_catalogo')

        if (chamadaFerramenta) {
            const produtos = await buscarProdutos(empresa || '')

            mensagens.push({ role: 'assistant', content: data.content })
            mensagens.push({
                role: 'user',
                content: [
                    {
                        type: 'tool_result',
                        tool_use_id: chamadaFerramenta.id,
                        content: JSON.stringify(produtos),
                    },
                ],
            })

            // Segunda chamada — agora com os dados do catálogo, a IA gera a resposta final
            res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': process.env.ANTHROPIC_API_KEY || '',
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-6',
                    max_tokens: 500,
                    system: systemFinal,
                    tools: ferramentas,
                    messages: mensagens,
                }),
            })

            data = await res.json()

            if (!res.ok) {
                console.error('WHATSAPP/IA - erro Claude API (2ª chamada):', res.status, JSON.stringify(data))
                return NextResponse.json({ success: false, error: data }, { status: res.status })
            }
        }

        const textoResposta = data.content?.find((c: any) => c.type === 'text')?.text || ''

        return NextResponse.json({ success: true, resposta: textoResposta })
    } catch (error: any) {
        console.error('WHATSAPP/IA - erro geral:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
