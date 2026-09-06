import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const VERIFY_TOKEN = 'flowsms2024'

function headersInternos() {
    return {
        'Content-Type': 'application/json',
        'x-chave-interna': process.env.CHAVE_INTERNA || '',
    }
}

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

async function buscarHistoricoConversa(baseId: string, tableId: string, apiKey: string, telefone: string, empresa: string) {
    const filtro = 'AND({telefone} = "' + telefone + '", {empresa} = "' + empresa + '")'
    const url = 'https://api.airtable.com/v0/' + baseId + '/' + tableId +
        '?filterByFormula=' + encodeURIComponent(filtro) +
        '&sort[0][field]=horario&sort[0][direction]=desc&maxRecords=30'

    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + apiKey } })
    const data = await res.json()

    const registros = (data.records || [])
        .map((r: any) => ({ tipo: r.fields.tipo, mensagem: r.fields.mensagem }))
        .reverse()

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

            let jaAtendidoPorHumano = false
            try {
                const contatoUrl = 'https://api.airtable.com/v0/' + baseId + '/Contato'
                    + '?filterByFormula=' + encodeURIComponent('OR({Phone} = "' + telefone + '", {Phone} = "+' + telefone + '")')
                const contatoRes = await fetch(contatoUrl, { headers: { Authorization: 'Bearer ' + apiKey } })
                const contatoData = await contatoRes.json()
                const registro = contatoData.records?.[0]?.fields
                jaAtendidoPorHumano = !!(registro?.atendimento_ativo && registro?.atendente_id)
            } catch (e) {
                console.error('Erro ao checar status de atendimento:', e)
            }

            let pediuHumano = false
            if (!jaAtendidoPorHumano) {
                try {
                    const humanoRes = await fetch(baseUrl + '/api/leads/detectar-humano', {
                        method: 'POST',
                        headers: headersInternos(),
                        body: JSON.stringify({ mensagem: texto })
                    })
                    const humanoData = await humanoRes.json()
                    pediuHumano = !!humanoData?.quer_humano

                    if (pediuHumano) {
                        await fetch(baseUrl + '/api/atendentes/distribuir', {
                            method: 'POST',
                            headers: headersInternos(),
                            body: JSON.stringify({ telefone, empresa })
                        })
                    }
                } catch (e) {
                    console.error('Erro ao verificar pedido de atendente humano:', e)
                }
            }

            console.log('DEBUG ATENDIMENTO:', { jaAtendidoPorHumano, pediuHumano, telefone })

            if (texto && jaAtendidoPorHumano && !pediuHumano) {
                // Não faz nada
            } else if (texto) {
                let resposta: string
                let imagemUrl: string | null = null

                if (pediuHumano) {
                    resposta = 'Entendido! 😊 Já avisei nossa equipe e um atendente vai continuar seu atendimento em breve. Só um instante!'
                } else {
                    const historico = await buscarHistoricoConversa(baseId!, tableId!, apiKey!, telefone, empresa)

                    const iaRes = await fetch(baseUrl + '/api/whatsapp/ia', {
                        method: 'POST',
                        headers: headersInternos(),
                        body: JSON.stringify({ historico, systemPrompt, empresa })
                    })

                    const iaData = await iaRes.json()
                    resposta = iaData.resposta
                    imagemUrl = iaData.imagemUrl
                }

                if (resposta) {
                    await fetch(baseUrl + '/api/whatsapp/send', {
                        method: 'POST',
                        headers: headersInternos(),
                        body: JSON.stringify({
                            telefone,
                            mensagem: resposta,
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
                                mensagem: resposta,
                                tipo: 'enviada',
                                horario: new Date().toISOString(),
                                empresa
                            }
                        })
                    })

                    if (imagemUrl) {
                        try {
                            await fetch(baseUrl + '/api/whatsapp/send-media', {
                                method: 'POST',
                                headers: headersInternos(),
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

                    try {
                        const historicoParaPedido = await buscarHistoricoConversa(baseId!, tableId!, apiKey!, telefone, empresa)
                        const detectarRes = await fetch(baseUrl + '/api/pedidos/detectar', {
                            method: 'POST',
                            headers: headersInternos(),
                            body: JSON.stringify({ mensagemCliente: texto, respostaIA: resposta, historico: historicoParaPedido })
                        })
                        const detectarData = await detectarRes.json()

                        if (detectarData?.pedido_confirmado) {
                            await fetch(baseUrl + '/api/pedidos/notificar', {
                                method: 'POST',
                                headers: headersInternos(),
                                body: JSON.stringify({
                                    telefone,
                                    produto: detectarData.produto,
                                    valor: detectarData.valor,
                                    forma_pagamento: detectarData.forma_pagamento,
                                    empresa,
                                    emailCliente: clienteEmail,
                                    telefoneAdminCliente: clienteTelefoneAdmin,
                                    whatsappToken: clienteToken,
                                    whatsappPhoneNumberId: clientePhoneNumberId,
                                })
                            })
                        }
                    } catch (e) {
                        console.error('Erro ao detectar/notificar pedido:', e)
                    }

                    try {
                        const historicoAtualizado = await buscarHistoricoConversa(baseId!, tableId!, apiKey!, telefone, empresa)

                        const quenteRes = await fetch(baseUrl + '/api/leads/detectar-quente', {
                            method: 'POST',
                            headers: headersInternos(),
                            body: JSON.stringify({ historico: historicoAtualizado })
                        })
                        const quenteData = await quenteRes.json()

                        if (quenteData?.lead_quente) {
                            await fetch(baseUrl + '/api/leads/notificar-quente', {
                                method: 'POST',
                                headers: headersInternos(),
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