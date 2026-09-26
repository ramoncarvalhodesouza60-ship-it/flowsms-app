import { NextRequest, NextResponse } from 'next/server';
import { verificarToken } from '@/lib/auth'

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const TICKETS_TABLE_ID = 'tblkQtQ43853vRNi3'; // TicketsSuporte

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_REMETENTE = process.env.EMAIL_REMETENTE || 'suporte@flowsms.com.br';
const EMAIL_ADMIN_ALERTAS = process.env.EMAIL_ADMIN_ALERTAS;

async function enviarEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY não configurada — e-mail não enviado');
    return;
  }
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `FlowSMS Suporte <${EMAIL_REMETENTE}>`,
        to: [to],
        subject,
        html,
      }),
    });
    if (!resp.ok) {
      const erro = await resp.text();
      console.error('Erro ao enviar e-mail via Resend:', erro);
    }
  } catch (e) {
    console.error('Erro ao enviar e-mail:', e);
  }
}

function emailNotificacaoAdmin(empresa: string, categoria: string, mensagem: string) {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff;">
    <div style="background: #0a0a0a; padding: 24px; text-align: center;">
      <span style="color: #FF6B00; font-size: 20px; font-weight: 800;">FlowSMS</span>
    </div>
    <div style="padding: 28px; border: 1px solid #eee; border-top: none;">
      <h2 style="color: #111; font-size: 18px; margin: 0 0 16px;">🎫 Novo ticket de suporte</h2>
      <p style="color: #444; font-size: 14px; line-height: 1.6;"><strong>Empresa:</strong> ${empresa}</p>
      <p style="color: #444; font-size: 14px; line-height: 1.6;"><strong>Categoria:</strong> ${categoria}</p>
      <div style="background: #f7f7f7; border-radius: 8px; padding: 14px 16px; margin: 16px 0; color: #333; font-size: 14px; line-height: 1.6;">
        ${mensagem}
      </div>
      <a href="https://flowsms.com.br/suporte-admin" style="display: inline-block; background: #FF6B00; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 700;">
        Abrir painel de suporte
      </a>
    </div>
  </div>`;
}

function emailConfirmacaoCliente(empresa: string, categoria: string) {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff;">
    <div style="background: #0a0a0a; padding: 24px; text-align: center;">
      <span style="color: #FF6B00; font-size: 20px; font-weight: 800;">FlowSMS</span>
    </div>
    <div style="padding: 28px; border: 1px solid #eee; border-top: none;">
      <h2 style="color: #111; font-size: 18px; margin: 0 0 16px;">Recebemos sua mensagem</h2>
      <p style="color: #444; font-size: 14px; line-height: 1.6;">
        Olá! Confirmamos o recebimento da sua solicitação de suporte (categoria: <strong>${categoria}</strong>).
      </p>
      <p style="color: #444; font-size: 14px; line-height: 1.6;">
        Nossa equipe já foi notificada e vai te responder o mais breve possível por aqui mesmo, dentro do sistema.
      </p>
      <p style="color: #999; font-size: 12px; margin-top: 24px;">
        FlowSMS — Automação de WhatsApp e SMS para o seu negócio
      </p>
    </div>
  </div>`;
}

// GET: lista tickets (só admin, usado no painel /suporte-admin)
export async function GET(request: NextRequest) {
  try {
    const cookie = request.cookies.get('sessao')
    if (!cookie) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const sessao = await verificarToken(cookie.value)
    if (!sessao) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })
    if (!sessao.admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

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

// POST: cria um novo ticket de suporte (qualquer cliente logado pode abrir, dono do próprio ticket)
export async function POST(request: NextRequest) {
  try {
    const cookie = request.cookies.get('sessao')
    if (!cookie) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const sessao = await verificarToken(cookie.value)
    if (!sessao) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

    const body = await request.json();
    const { empresa, email_cliente, categoria, mensagem_inicial } = body;

    if (!empresa || !mensagem_inicial) {
      return NextResponse.json({ error: 'empresa e mensagem_inicial são obrigatórios' }, { status: 400 });
    }

    if (!sessao.admin && sessao.empresa !== empresa) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const categoriaFinal = categoria || 'Outras dúvidas';

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
            categoria: categoriaFinal,
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

    // E-mails são best-effort: se falharem, não derrubam a criação do ticket
    if (EMAIL_ADMIN_ALERTAS) {
      enviarEmail({
        to: EMAIL_ADMIN_ALERTAS,
        subject: `🎫 Novo ticket de suporte — ${empresa}`,
        html: emailNotificacaoAdmin(empresa, categoriaFinal, mensagem_inicial),
      });
    }
    if (email_cliente) {
      enviarEmail({
        to: email_cliente,
        subject: 'Recebemos sua mensagem — Suporte FlowSMS',
        html: emailConfirmacaoCliente(empresa, categoriaFinal),
      });
    }

    return NextResponse.json({ success: true, ticket_id: data.id });
  } catch (error) {
    console.error('Erro ao criar ticket de suporte:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}