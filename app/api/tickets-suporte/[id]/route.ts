import { NextRequest, NextResponse } from 'next/server';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const TICKETS_TABLE_ID = 'tblkQtQ43853vRNi3'; // TicketsSuporte

// GET: busca um ticket específico pelo ID
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        const response = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TICKETS_TABLE_ID}/${id}`,
            {
                headers: {
                    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                },
            }
        );

        if (!response.ok) {
            return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 });
        }

        const record = await response.json();
        const ticket = {
            id: record.id,
            empresa: record.fields.empresa || '',
            email_cliente: record.fields.email_cliente || '',
            categoria: record.fields.categoria || '',
            mensagens: record.fields.mensagens ? JSON.parse(record.fields.mensagens) : [],
            status: record.fields.status || 'Aberto',
            atendente_id: record.fields.atendente_id || '',
            criado_em: record.fields.criado_em || '',
        };

        return NextResponse.json({ ticket });
    } catch (error) {
        console.error('Erro ao buscar ticket:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}

// PATCH: adiciona mensagem e/ou atualiza status/atendente do ticket
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();
        const { nova_mensagem, remetente, status, atendente_id } = body;

        // Busca o ticket atual pra pegar o histórico de mensagens existente
        const buscaResponse = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TICKETS_TABLE_ID}/${id}`,
            {
                headers: {
                    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                },
            }
        );

        if (!buscaResponse.ok) {
            return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 });
        }

        const registroAtual = await buscaResponse.json();
        let mensagens = registroAtual.fields.mensagens
            ? JSON.parse(registroAtual.fields.mensagens)
            : [];

        if (nova_mensagem) {
            mensagens.push({
                remetente: remetente || 'cliente', // 'cliente' ou 'atendente'
                texto: nova_mensagem,
                data: new Date().toISOString(),
            });
        }

        const fieldsAtualizados: any = {
            mensagens: JSON.stringify(mensagens),
        };

        if (status) fieldsAtualizados.status = status;
        if (atendente_id !== undefined) fieldsAtualizados.atendente_id = atendente_id;

        const response = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TICKETS_TABLE_ID}/${id}`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fields: fieldsAtualizados }),
            }
        );

        if (!response.ok) {
            const erro = await response.text();
            return NextResponse.json({ error: 'Erro ao atualizar ticket', detalhe: erro }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar ticket:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}