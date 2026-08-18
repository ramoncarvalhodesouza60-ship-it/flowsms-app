import { NextResponse } from 'next/server'
import { verificarRateLimit, obterIP } from '@/lib/rateLimit'

export const maxDuration = 60

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
                        foto: record.get('foto') || null,
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
    {
        name: 'mostrar_foto_produto',
        description: 'Envia a foto de um produto específico para o cliente ver, além da resposta em texto. Use quando o cliente demonstrar interesse claro em um produto que tem foto cadastrada (ex: perguntou detalhes dele, ou está decidindo se compra). Não use para todo produto mencionado de forma genérica, só quando ajudar a decisão do cliente.',
        input_schema: {
            type: 'object' as const,
            properties: {
                nome_produto: {
                    type: 'string' as const,
                    description: 'O nome exato do produto (como aparece no catálogo) cuja foto deve ser enviada.',
                },
            },
            required: ['nome_produto'],
        },
    },
]

// Gera a resposta da IA para uma mensagem real recebida no WhatsApp (chamada pelo webhook)
export async function POST(request: Request) {
    try {
        const ip = obterIP(request)
        const rate = verificarRateLimit(ip, 'whatsapp-ia', 30, 60 * 1000)

        if (!rate.permitido) {
            console.error('WHATSAPP/IA - rate limit atingido para IP:', ip)
            return NextResponse.json({ success: false, error: 'Limite de requisições atingido' }, { status: 429 })
        }

        const { historico, systemPrompt, empresa } = await request.json()

        if (!Array.isArray(historico) || historico.length === 0) {
            return NextResponse.json({ success: false, error: 'histórico não informado ou vazio' }, { status: 400 })
        }

        const systemFinal = systemPrompt || 'Você é um assistente de atendimento simpático e prestativo.'

        // Converte o histórico (tipo 'recebida'/'enviada') para o formato que a Claude API espera (role 'user'/'assistant')
        const mensagens: any[] = historico.map((h: { tipo: string; mensagem: string }) => ({
            role: h.tipo === 'recebida' ? 'user' : 'assistant',
            content: h.mensagem,
        }))

        let produtosCache: any[] | null = null
        let imagemParaEnviar: string | null = null

        for (let rodada = 0; rodada < 4; rodada++) {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
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

            const data = await res.json()

            if (!res.ok) {
                console.error('WHATSAPP/IA - erro Claude API:', res.status, JSON.stringify(data))
                return NextResponse.json({ success: false, error: data }, { status: res.status })
            }

            const chamadasFerramenta = data.content?.filter((c: any) => c.type === 'tool_use') || []

            if (chamadasFerramenta.length === 0) {
                const textoResposta = data.content?.find((c: any) => c.type === 'text')?.text || ''
                return NextResponse.json({ success: true, resposta: textoResposta, imagemUrl: imagemParaEnviar })
            }

            mensagens.push({ role: 'assistant', content: data.content })

            const resultados: any[] = []

            for (const chamada of chamadasFerramenta) {
                let resultadoFerramenta: any = null

                if (chamada.name === 'buscar_catalogo') {
                    if (!produtosCache) produtosCache = await buscarProdutos(empresa || '')
                    resultadoFerramenta = produtosCache
                } else if (chamada.name === 'mostrar_foto_produto') {
                    if (!produtosCache) produtosCache = await buscarProdutos(empresa || '')
                    const nomeProcurado = (chamada.input?.nome_produto || '').toLowerCase()
                    const produto = produtosCache.find((p: any) => (p.nome || '').toLowerCase().includes(nomeProcurado))
                    if (produto?.foto) {
                        imagemParaEnviar = produto.foto
                        resultadoFerramenta = { enviado: true }
                    } else {
                        resultadoFerramenta = { enviado: false, motivo: 'Produto não encontrado ou sem foto cadastrada' }
                    }
                } else {
                    resultadoFerramenta = { erro: 'Ferramenta desconhecida' }
                }

                resultados.push({
                    type: 'tool_result',
                    tool_use_id: chamada.id,
                    content: JSON.stringify(resultadoFerramenta),
                })
            }

            mensagens.push({ role: 'user', content: resultados })
        }

        return NextResponse.json({ success: true, resposta: 'Um momento, já te retorno!', imagemUrl: imagemParaEnviar })
    } catch (error: any) {
        console.error('WHATSAPP/IA - erro geral:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
