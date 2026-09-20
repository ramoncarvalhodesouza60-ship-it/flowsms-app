import { NextRequest, NextResponse } from 'next/server'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

const TABELAS = ['Contato', 'Mensagens', 'Clientes', 'Pedidos', 'Produtos', 'Atendentes', 'TicketsSuporte', 'AtendentesSuporte', 'LogsAuditoria']

function paraCSV(registros: any[]): string {
    if (registros.length === 0) return 'Sem registros'

    const colunas = new Set<string>()
    registros.forEach(r => Object.keys(r.fields).forEach(c => colunas.add(c)))
    const colunasArray = Array.from(colunas)

    const escapar = (valor: any): string => {
        if (valor === undefined || valor === null) return ''
        const texto = typeof valor === 'object' ? JSON.stringify(valor) : String(valor)
        if (texto.includes(',') || texto.includes('"') || texto.includes('\n')) {
            return '"' + texto.replace(/"/g, '""') + '"'
        }
        return texto
    }

    const cabecalho = colunasArray.join(',')
    const linhas = registros.map(r => colunasArray.map(c => escapar(r.fields[c])).join(','))

    return [cabecalho, ...linhas].join('\n')
}

async function buscarTabela(nomeTabela: string): Promise<any[]> {
    const registros: any[] = []
    await new Promise<void>((resolve, reject) => {
        base(nomeTabela).select({ maxRecords: 5000 }).eachPage(
            (pageRecords: any[], fetchNextPage: () => void) => {
                pageRecords.forEach((record: any) => {
                    registros.push({ fields: record.fields })
                })
                fetchNextPage()
            },
            (err: any) => { if (err) reject(err); else resolve() }
        )
    })
    return registros
}

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization')
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        const anexos: { filename: string; content: string }[] = []

        for (const tabela of TABELAS) {
            try {
                const registros = await buscarTabela(tabela)
                const csv = paraCSV(registros)
                anexos.push({
                    filename: `${tabela}.csv`,
                    content: Buffer.from(csv, 'utf-8').toString('base64'),
                })
            } catch (e) {
                console.error(`Erro ao exportar tabela ${tabela}:`, e)
            }
        }

        const dataHoje = new Date().toLocaleDateString('pt-BR')

        const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'FlowSMS <onboarding@resend.dev>',
                to: 'ramondecarvalhosouza60@gmail.com',
                subject: `📦 Backup semanal FlowSMS - ${dataHoje}`,
                html: `<p>Backup automático semanal gerado em ${dataHoje}, com ${anexos.length} tabelas exportadas.</p>`,
                attachments: anexos,
            }),
        })

        const emailData = await emailRes.json()

        return NextResponse.json({ success: true, tabelas: anexos.length, email: emailData })
    } catch (error: any) {
        console.error('Erro no backup automático:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}