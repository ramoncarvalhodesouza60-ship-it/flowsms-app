import { NextRequest, NextResponse } from 'next/server';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const TICKETS_TABLE_ID = 'tblkQtQ43853vRNi3'; // TicketsSuporte

// GET: lista tickets (opcionalmente filtrados por empresa ou status)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa');
    const status = searchParams.get('status');

    let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TICKETS_TABLE_ID}?sort[0][field]=criado_em&sort[0][direction]=desc`;

    const filtros: string[] = [];
    if (empresa) filtros.push(`{empresa}='${empresa}'`);
    if (status) filtros.push(`{status}='${status}'`);
    if (filtros.length > 0) {
      const formula = filtros.length === 1 ? filtros[0] : `AND(${filtros.join(',')})`;
      url += `&filterByFormula=${encodeURIComponent(formula)}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
    });

    if (!response.ok) {
      const erro = await response.text();
      return NextResponse.json({ error: 'Erro ao buscar tickets', detalhe: erro }, { status: 500 });
    }

    const data = await response.json();
    const tickets = data.records.map((record: any) => ({
      id: record.id,
      empresa: record.fields.empresa || '',
      email_cliente: record.fields.email_cliente || '',
      categoria: record.fields.categoria || '',
      mensagens: record.fields.mensagens ? JSON.parse(record.fields.mensagens) : [],
      status: record.fields.status || 'Aberto',
      atendente_id: record.fields.atendente_id || '',
      criado_em: record.fields.criado_em || '',
    }));

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('Erro ao buscar tickets de suporte:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST: cria um novo ticket de suporte
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { empresa, email_cliente, categoria, mensagem_inicial } = body;

    if (!empresa || !mensagem_inicial) {
      return NextResponse.json({ error: 'empresa e mensagem_inicial são obrigatórios' }, { status: 400 });
    }

    const mensagens = [
      {
        remetente: 'cliente',
        texto: mensagem_inicial,
        data: new Date().toISOString(),
      },
    ];

    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TICKETS_TABLE_ID}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            empresa,
            email_cliente: email_cliente || '',
            categoria: categoria || 'Outras dúvidas',
            mensagens: JSON.stringify(mensagens),
            status: 'Aberto',
          },
        }),
      }
    );

    if (!response.ok) {
      const erro = await response.text();
      return NextResponse.json({ error: 'Erro ao criar ticket', detalhe: erro }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, ticket_id: data.id });
  } catch (error) {
    console.error('Erro ao criar ticket de suporte:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}