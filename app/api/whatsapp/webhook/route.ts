import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const VERIFY_TOKEN = 'flowsms2024'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        return new NextResponse(challenge, { status: 200 })
    }
    return new NextResponse('Forbidden', { status: 403 })
}

// Busca as últimas N mensagens dessa conversa (telefone + empresa) no Airtable,
// já ordenadas do mais antigo pro mais recente, no formato que a IA espera.
async function buscarHistoricoConversa(baseId: string, tableId: string, apiKey: string, telefone: string, empresa: string) {
    const filtro = 'AND({telefone} = "' + telefone + '", {empresa} = "' + empresa + '")'
    const url = 'https://api.airtable.com/v0/' + baseId + '/' + tableId +
        '?filterByFormula=' + encodeURIComponent(filtro) +
        '&sort[0][field]=horario&sort[0][direction]=desc&maxRecords=30'

    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + apiKey } })
    const data = await res.json()

    const registros = (data.records || [])
        .map((r: any) => ({ tipo: r.fields.tipo, mensagem: r.fields.mensagem }))
        .reverse() // volta pra ordem cronológica (mais antigo primeiro)

    return registros
}

export async function POST(req: NextRequest) {
    const body = await req.json()

    try {
        const entry = body.entry?.[0]
        const changes = entry?.changes?.[0]
        const value = changes?.value
        const messages = value?.messages
        const phoneNumberId = value?.metadata?.phone_number_id as string | undefined
        console.log('PHONE NUMBER ID RECEBIDO:', phoneNumberId)

        if (messages && messages.length > 0) {
            const msg = messages[0]
            const telefone = msg.from
            const texto = msg.text?.body || ''
            const horario = new Date().toISOString()

            const baseId = process.env.AIRTABLE_BASE_ID
            const tableId = process.env.AIRTABLE_MENSAGENS_ID
            const clientesId = process.env.AIRTABLE_CLIENTES_ID
            const apiKey = process.env.AIRTABLE_API_KEY
            const url = 'https://api.airtable.com/v0/' + baseId + '/' + tableId
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://flowsms.com.br'

            // 1. Busca o cliente pelo phone_number_id
            let systemPrompt: string | null = null
            let empresa = 'FlowSMS Admin'
            let clienteToken: string | null = null
            let clientePhoneNumberId: string | null = null
            let clienteEmail: string | null = null
            let clienteTelefoneAdmin: string | null = null

            if (phoneNumberId) {
                const clientesUrl = 'https://api.airtable.com/v0/' + baseId + '/' + clientesId
                    + '?filterByFormula=' + encodeURIComponent('AND({phone_number_id}="' + phoneNumberId + '", NOT({excluir_do_webhook}))')

                const clientesRes = await fetch(clientesUrl, {
                    headers: { Authorization: 'Bearer ' + apiKey }
                })
                const clientesData = await clientesRes.json()
                const cliente = clientesData.records?.[0]?.fields

                if (cliente) {
                    systemPrompt = cliente.system_prompt || null
                    empresa = cliente.empresa || 'FlowSMS Admin'
                    clienteToken = cliente.whatsapp_token || null
                    clientePhoneNumberId = cliente.phone_number_id || null
                    clienteEmail = cliente.email || null
                    clienteTelefoneAdmin = cliente.telefone_admin || null
                }
            }

            // 2. Salva mensagem recebida no Airtable
            await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer ' + apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fields: { telefone, mensagem: texto, tipo: 'recebida', horario, empresa }
                })
            })

            // 2.4. Verifica se essa conversa já está sendo atendida por um humano (atendimento_ativo + atendente_id)
            let jaAtendidoPorHumano = false
            try {
                const contatoUrl = 'https://api.airtable.com/v0/' + baseId + '/Contato'
                    + '?filterByFormula=' + encodeURIComponent('{Phone} = "' + telefone + '"')
                const contatoRes = await fetch(contatoUrl, { headers: { Authorization: 'Bearer ' + apiKey } })
                const contatoData = await contatoRes.json()
                const registro = contatoData.records?.[0]?.fields
                jaAtendidoPorHumano = !!(registro?.atendimento_ativo && registro?.atendente_id)
            } catch (e) {
                console.error('Erro ao checar status de atendimento:', e)
            }

            // 2.5. Verifica se o cliente pediu explicitamente pra falar com um atendente humano
            let pediuHumano = false
            try {
                const humanoRes = await fetch(baseUrl + '/api/leads/detectar-humano', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mensagem: texto })
                })
                const humanoData = await humanoRes.json()
                pediuHumano = !!humanoData?.quer_humano

                if (pediuHumano) {
                    await fetch(baseUrl + '/api/atendentes/distribuir', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ telefone, empresa })
                    })
                }
            } catch (e) {
                console.error('Erro ao verificar pedido de atendente humano:', e)
            }

            console.log('DEBUG ATENDIMENTO:', { jaAtendidoPorHumano, pediuHumano, telefone })

            // 3. Se já está com atendente humano (e não é o pedido de transferência agora), a IA não responde —
            // deixa o atendente ver e responder manualmente pelo painel dele.
            if (texto && jaAtendidoPorHumano && !pediuHumano) {
                // Não faz nada — mensagem já foi salva no passo 2, atendente vê no painel dele
            } else if (texto) {
                let resposta: string
                let imagemUrl: string | null = null

                if (pediuHumano) {
                    resposta = 'Entendido! 😊 Já avisei nossa equipe e um atendente vai continuar seu atendimento em breve. Só um instante!'
                } else {
                    const historico = await buscarHistoricoConversa(baseId!, tableId!, apiKey!, telefone, empresa)

                    const iaRes = await fetch(baseUrl + '/api/whatsapp/ia', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ historico, systemPrompt, empresa })
                    })

                    const iaData = await iaRes.json()
                    resposta = iaData.resposta
                    imagemUrl = iaData.imagemUrl
                }

                if (resposta) {
                    // 4. Envia resposta da IA via WhatsApp usando token e phone_number_id do cliente
                    await fetch(baseUrl + '/api/whatsapp/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            telefone,
                            mensagem: resposta,
                            token: clienteToken,
                            phoneNumberId: clientePhoneNumberId,
                        })
                    })

                    // 5. Salva resposta da IA no Airtable
                    await fetch(url, {
                        method: 'POST',
                        headers: {
                            Authorization: 'Bearer ' + apiKey,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            fields: {
                                telefone,
                                mensagem: resposta,
                                tipo: 'enviada',
                                horario: new Date().toISOString(),
                                empresa
                            }
                        })
                    })

                    // 5.5. Se a IA decidiu mostrar a foto de um produto, envia como imagem separada
                    if (imagemUrl) {
                        try {
                            await fetch(baseUrl + '/api/whatsapp/send-media', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    telefone,
                                    mediaUrl: imagemUrl,
                                    tipo: 'image',
                                    token: clienteToken,
                                    phoneNumberId: clientePhoneNumberId,
                                })
                            })

                            await fetch(url, {
                                method: 'POST',
                                headers: {
                                    Authorization: 'Bearer ' + apiKey,
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    fields: {
                                        telefone,
                                        mensagem: '[Foto de produto enviada]',
                                        tipo: 'enviada',
                                        horario: new Date().toISOString(),
                                        empresa
                                    }
                                })
                            })
                        } catch (e) {
                            console.error('Erro ao enviar foto do produto:', e)
                        }
                    }

                    // 6. Detecta se o cliente confirmou um pedido nessa troca de mensagens
                    try {
                        const detectarRes = await fetch(baseUrl + '/api/pedidos/detectar', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ mensagemCliente: texto, respostaIA: resposta })
                        })
                        const detectarData = await detectarRes.json()

                        // 7. Se detectou pedido confirmado, salva e notifica o cliente dono da conversa
                        if (detectarData?.pedido_confirmado) {
                            await fetch(baseUrl + '/api/pedidos/notificar', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    telefone,
                                    produto: detectarData.produto,
                                    valor: detectarData.valor,
                                    forma_pagamento: detectarData.forma_pagamento,
                                    empresa,
                                    emailCliente: clienteEmail,
                                    telefoneAdminCliente: clienteTelefoneAdmin,
                                })
                            })
                        }
                    } catch (e) {
                        console.error('Erro ao detectar/notificar pedido:', e)
                    }

                    // 8. Detecta se o lead está "quente" (interesse forte, mesmo sem pedido confirmado) e notifica
                    try {
                        const historicoAtualizado = await buscarHistoricoConversa(baseId!, tableId!, apiKey!, telefone, empresa)

                        const quenteRes = await fetch(baseUrl + '/api/leads/detectar-quente', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ historico: historicoAtualizado })
                        })
                        const quenteData = await quenteRes.json()

                        if (quenteData?.lead_quente) {
                            await fetch(baseUrl + '/api/leads/notificar-quente', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ telefone, empresa })
                            })
                        }
                    } catch (e) {
                        console.error('Erro ao detectar/notificar lead quente:', e)
                    }
                }
            }
        }
    } catch (e) {
        console.error('Webhook error:', e)
        console.error('Webhook error details:', JSON.stringify(e))
    }

    return new NextResponse('OK', { status: 200 })
}
