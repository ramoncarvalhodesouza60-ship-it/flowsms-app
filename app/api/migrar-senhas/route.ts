import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

// Rota de uso único: converte todas as senhas em texto puro da tabela Clientes para hash bcrypt.
// Protegida por uma chave simples para evitar execução acidental ou por terceiros.
export async function POST(request: Request) {
    try {
        const { chave } = await request.json()

        if (chave !== process.env.CHAVE_MIGRACAO) {
            return NextResponse.json({ success: false, error: 'Chave inválida' }, { status: 403 })
        }

        const resultados: { email: string; status: string }[] = []

        await new Promise<void>((resolve, reject) => {
            base('Clientes').select({}).eachPage(
                async (pageRecords: any[], fetchNextPage: () => void) => {
                    for (const record of pageRecords) {
                        const email = record.get('email')
                        const senhaAtual: string = record.get('senha') || ''

                        const jaEstaComHash = senhaAtual.startsWith('$2a$') || senhaAtual.startsWith('$2b$') || senhaAtual.startsWith('$2y$')

                        if (jaEstaComHash || !senhaAtual) {
                            resultados.push({ email, status: 'já estava em hash ou vazio, pulado' })
                            continue
                        }

                        const hash = await bcrypt.hash(senhaAtual, 10)

                        await base('Clientes').update(record.id, { senha: hash })
                        resultados.push({ email, status: 'convertido com sucesso' })
                    }
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })

        return NextResponse.json({ success: true, resultados })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}