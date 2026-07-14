import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { mensagemCliente, respostaIA } = await request.json()

        const apiKey = process.env.ANTHROPIC_API_KEY

        const prompt = `Você é um sistema de análise de conversas de vendas. Analise a troca de mensagens abaixo entre um cliente e um atendente (IA) de uma empresa, e determine se o CLIENTE acabou de CONFIRMAR um pedido de compra (não apenas demonstrar interesse ou fazer pergunta).

Mensagem do cliente: "${mensagemCliente}"
Resposta do atendente: "${respostaIA}"

Regras importantes:
- Só considere como pedido confirmado se o cliente expressou claramente a intenção de comprar/fechar (ex: "quero sim", "pode confirmar", "vou levar", "fechado", "pode mandar")
- Perguntas, dúvidas, ou expressões vagas de interesse ("vou pensar", "talvez", "quanto custa") NÃO contam como confirmação
- Se não houver confirmação clara, responda apenas: {"pedido_confirmado": false}
- Se houver confirmação clara, extraia o máximo de informação possível da conversa e responda EXATAMENTE neste formato JSON, sem nenhum texto antes ou depois:
{"pedido_confirmado": true, "produto": "nome do produto/serviço mencionado ou 'Não especificado'", "valor": número ou null se não mencionado, "forma_pagamento": "forma de pagamento mencionada ou 'Não especificado'"}

Responda APENAS o JSON, nada mais.`

        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey || '',
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 300,
                messages: [{ role: 'user', content: prompt }],
            }),
        })

        const data = await res.json()
        const textoResposta = data?.content?.[0]?.text || '{"pedido_confirmado": false}'

        // Remove possíveis blocos de markdown json que a IA às vezes adiciona
        const textoLimpo = textoResposta.replace(/json|```/g, '').trim()

        let resultado
        try {
            resultado = JSON.parse(textoLimpo)
        } catch {
            resultado = { pedido_confirmado: false }
        }
        console.log('RESULTADO DETECÇÃO DE PEDIDO:', JSON.stringify(resultado))
        console.log('TEXTO BRUTO DA IA:', textoResposta)

        return NextResponse.json(resultado)
    } catch (error: any) {
        console.error('Erro ao detectar pedido:', error)
        return NextResponse.json({ pedido_confirmado: false, error: error.message })
    }
}