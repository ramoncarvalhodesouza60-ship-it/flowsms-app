import { NextRequest, NextResponse } from 'next/server'
import { validarSessaoOuInterno } from '@/lib/auth'

export async function POST(request: NextRequest) {
    try {
        const erro = await validarSessaoOuInterno(request)
        if (erro) return erro

        const { telefone, produto, valor, forma_pagamento, empresa, emailCliente, telefoneAdminCliente, whatsappToken, whatsappPhoneNumberId } =
            await request.json()

        console.log('NOTIFICAR - dados recebidos:', JSON.stringify({ telefone, produto, valor, forma_pagamento, empresa, emailCliente, telefoneAdminCliente }))

        const baseId = process.env.AIRTABLE_BASE_ID
        const apiKey = process.env.AIRTABLE_API_KEY
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://flowsms.com.br'

        const pedidosUrl = 'https://api.airtable.com/v0/' + baseId + '/Pedidos'
        const airtableRes = await fetch(pedidosUrl, {
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fields: {
                    cliente_telefone: telefone,
                    produto: produto || 'Não especificado',
                    valor: valor || 0,
                    forma_pagamento: forma_pagamento || 'Não especificado',
                    empresa: empresa || '',
                    data: new Date().toISOString(),
                    status: 'Pendente',
                },
                typecast: true,
            }),
        })
        const airtableData = await airtableRes.json()
        console.log('NOTIFICAR - resposta Airtable:', airtableRes.status, JSON.stringify(airtableData))

        const mensagemNotificacao =
            '🔔 Novo pedido detectado!\n\n' +
            '📱 Cliente: ' + telefone + '\n' +
            '📦 Produto: ' + (produto || 'Não especificado') + '\n' +
            '💰 Valor: R$ ' + (valor || '0') + '\n' +
            '💳 Pagamento: ' + (forma_pagamento || 'Não especificado') + '\n\n' +
            'Acesse o painel pra confirmar ou recusar este pedido.'

        if (telefoneAdminCliente) {
            try {
                const waRes = await fetch(baseUrl + '/api/whatsapp/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-chave-interna': process.env.CHAVE_INTERNA || '',
                    },
                    body: JSON.stringify({
                        telefone: telefoneAdminCliente,
                        mensagem: mensagemNotificacao,
                        token: whatsappToken || process.env.WHATSAPP_TOKEN,
                        phoneNumberId: whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_ID,
                    }),
                })
                const waData = await waRes.json()
                console.log('NOTIFICAR - resposta WhatsApp:', waRes.status, JSON.stringify(waData))
            } catch (e) {
                console.error('NOTIFICAR - Erro ao enviar WhatsApp:', e)
            }
        } else {
            console.log('NOTIFICAR - telefoneAdminCliente vazio, WhatsApp não enviado')
        }

        if (emailCliente) {
            try {
                const emailRes = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: 'FlowSMS <onboarding@resend.dev>',
                        to: emailCliente,
                        subject: '🔔 Novo pedido detectado - ' + (empresa || 'FlowSMS'),
                        html:
                            '<h2>Novo pedido detectado!</h2>' +
                            '<p><strong>Cliente:</strong> ' + telefone + '</p>' +
                            '<p><strong>Produto:</strong> ' + (produto || 'Não especificado') + '</p>' +
                            '<p><strong>Valor:</strong> R$ ' + (valor || '0') + '</p>' +
                            '<p><strong>Pagamento:</strong> ' + (forma_pagamento || 'Não especificado') + '</p>' +
                            '<p>Acesse o painel do FlowSMS pra confirmar ou recusar este pedido.</p>',
                    }),
                })
                const emailData = await emailRes.json()
                console.log('NOTIFICAR - resposta Resend:', emailRes.status, JSON.stringify(emailData))
            } catch (e) {
                console.error('NOTIFICAR - Erro ao enviar e-mail:', e)
            }
        } else {
            console.log('NOTIFICAR - emailCliente vazio, e-mail não enviado')
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('NOTIFICAR - Erro geral:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}