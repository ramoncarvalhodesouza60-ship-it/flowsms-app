import { NextRequest, NextResponse } from 'next/server'
import { validarSessaoOuInterno } from '@/lib/auth'

export async function POST(request: NextRequest) {
    try {
        const erro = await validarSessaoOuInterno(request)
        if (erro) return erro

        const { mensagemCliente, respostaIA, historico } = await request.json()

        const apiKey = process.env.ANTHROPIC_API_KEY

        const conversaTexto = Array.isArray(historico) && historico.length > 0
            ? historico.map((h: { tipo: string; mensagem: string }) => (h.tipo === 'recebida' ? 'Cliente: ' : 'Atendente: ') + h.mensagem).join('\n')
            : ''

        const prompt = `Você é um sistema de análise de conversas de vendas. Analise a conversa abaixo entre um cliente e um atendente (IA) de uma empresa, e determine se o CLIENTE acabou de CONFIRMAR um pedido de compra (não apenas demonstrar interesse ou fazer pergunta).

Histórico completo da conversa até agora:
${conversaTexto}

Última troca:
Mensagem do cliente: "${mensagemCliente}"
Resposta do atendente: "${respostaIA}"
 
Regras importantes:
- Considere TODO o histórico da conversa para achar o valor/preço combinado, mesmo que tenha sido mencionado em mensagens anteriores, não só na última troca
- Só considere como pedido confirmado se DUAS coisas aconteceram: (1) o cliente expressou claramente a intenção de comprar/fechar (ex: "quero sim", "pode confirmar", "vou levar", "fechado", "pode mandar", "vou pagar no pix", qualquer confirmação de forma de pagamento), E (2) existe um valor/preço real e específico estabelecido em algum ponto da conversa para esse pedido (não vale "R$ 0" ou preço não mencionado)
- Se o cliente demonstrou intenção de compra mas NUNCA existiu um valor real calculado em nenhum ponto da conversa, isso NÃO conta como pedido confirmado — é só interesse forte, não confirmação
- Perguntas, dúvidas, ou expressões vagas de interesse ("vou pensar", "talvez", "quanto custa") NÃO contam como confirmação
- Se não houver confirmação clara COM valor definido em algum ponto da conversa, responda apenas: {"pedido_confirmado": false}
- Se houver confirmação clara E valor definido, extraia o máximo de informação possível da conversa (mesmo que o valor tenha sido dito antes) e responda EXATAMENTE neste formato JSON, sem nenhum texto antes ou depois:
{"pedido_confirmado": true, "produto": "nome do produto/serviço mencionado ou 'Não especificado'", "valor": número, "forma_pagamento": "forma de pagamento mencionada ou 'Não especificado'"}
 
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

        const textoLimpo = textoResposta.replace(/```json|```/g, '').trim()

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