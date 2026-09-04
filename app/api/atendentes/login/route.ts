import { NextResponse } from 'next/server'
import { verificarRateLimit, obterIP } from '@/lib/rateLimit'
import bcrypt from 'bcryptjs'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function POST(request: Request) {
    try {
        const ip = obterIP(request)
        const rate = verificarRateLimit(ip, 'login-atendente', 5, 5 * 60 * 1000)

        if (!rate.permitido) {
            return NextResponse.json(
                { success: false, error: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.' },
                { status: 429 }
            )
        }

        const { email, senha } = await request.json()

        if (!email || !senha) {
            return NextResponse.json({ success: false, error: 'Email e senha são obrigatórios' }, { status: 400 })
        }

        let registroEncontrado: any = null

        await new Promise<void>((resolve, reject) => {
            const formula = 'AND({email} = "' + email + '", {ativo} = TRUE())'
            base('Atendentes').select({ filterByFormula: formula, maxRecords: 1 }).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    pageRecords.forEach((record: any) => {
                        registroEncontrado = {
                            id: record.id,
                            senhaSalva: record.get('senha'),
                            nome: record.get('nome'),
                            email: record.get('email'),
                            empresa: record.get('empresa'),
                            disponivel: !!record.get('disponivel'),
                            capacidadeMaxima: record.get('capacidade_maxima') || 10,
                        }
                    })
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })

        if (!registroEncontrado) {
            return NextResponse.json({ success: false, error: 'Email ou senha incorretos' })
        }

        const senhaSalva: string = registroEncontrado.senhaSalva || ''
        const jaEstaComHash = senhaSalva.startsWith('$2a$') || senhaSalva.startsWith('$2b$') || senhaSalva.startsWith('$2y$')

        let senhaCorreta = false
        if (jaEstaComHash) {
            senhaCorreta = await bcrypt.compare(senha, senhaSalva)
        } else {
            senhaCorreta = senha === senhaSalva
        }

        if (!senhaCorreta) {
            return NextResponse.json({ success: false, error: 'Email ou senha incorretos' })
        }

        const { senhaSalva: _omitir, ...atendenteEncontrado } = registroEncontrado

        return NextResponse.json({ success: true, atendente: atendenteEncontrado })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}