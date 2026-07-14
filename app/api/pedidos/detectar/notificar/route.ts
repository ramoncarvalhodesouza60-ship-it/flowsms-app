import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { telefone, produto, valor, forma_pagamento, empresa, emailCliente, telefoneAdminCliente } =
            await request.json()

        const baseId = process.env.AIRTABLE_BASE_ID
        const apiKey = process.env.AIRTABLE_API_KEY
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://flowsms.com.br'

        // 1. Salva o pedido no Airtable, com status "Pendente" (aguardando confirmação manual do cliente)
        const pedidosUrl = 'https://api.airtable.com/v0/' + baseId + '/Pedidos'
        await fetch(pedidosUrl, {
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
            }),
        })

        const mensagemNotificacao =
            '🔔 Novo pedido detectado!\n\n' +
            '📱 Cliente: ' + telefone + '\n' +
            '📦 Produto: ' + (produto || 'Não especificado') + '\n' +
            '💰 Valor: R$ ' + (valor || '0') + '\n' +
            '💳 Pagamento: ' + (forma_pagamento || 'Não especificado') + '\n\n' +
            'Acesse o painel pra confirmar ou recusar este pedido.'

        // 2. Notifica via WhatsApp, no número pessoal do cliente dono desse pedido (se ele tiver cadastrado)
        if (telefoneAdminCliente) {
            try {
                await fetch(baseUrl + '/api/whatsapp/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        telefone: telefoneAdminCliente,
                        mensagem: mensagemNotificacao,
                        token: process.env.WHATSAPP_TOKEN,
                        phoneNumberId: process.env.WHATSAPP_PHONE_ID,
                    }),
                })
            } catch (e) {
                console.error('Erro ao enviar notificação WhatsApp:', e)
            }
        }

        // 3. Notifica via e-mail, no e-mail do cliente dono desse pedido (se ele tiver cadastrado)
        if (emailCliente) {
            try {
                await fetch('https://api.resend.com/emails', {
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
            } catch (e) {
                console.error('Erro ao enviar notificação e-mail:', e)
            }
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Erro ao notificar pedido:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}