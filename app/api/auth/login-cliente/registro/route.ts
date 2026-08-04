import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function POST(request: Request) {
    try {
        const { email, senha, nome, clienteId } = await request.json()

        if (!email || !senha || !clienteId) {
            return NextResponse.json({ success: false, error: 'Email, senha e clienteId são obrigatórios' }, { status: 400 })
        }

        let jaExiste = false
        await new Promise<void>((resolve, reject) => {
            const formula = 'LOWER({email}) = "' + email.toLowerCase() + '"'
            base('Usuarios').select({ filterByFormula: formula, maxRecords: 1 }).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    if (pageRecords.length > 0) jaExiste = true
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })

        if (jaExiste) {
            return NextResponse.json({ success: false, error: 'Já existe um usuário com esse email' }, { status: 409 })
        }

        const senhaHash = await bcrypt.hash(senha, 10)

        const criado = await base('Usuarios').create([
            {
                fields: {
                    email,
                    senha: senhaHash,
                    nome: nome || '',
                    clienteId,
                    criadoEm: new Date().toISOString(),
                },
            },
        ])

        return NextResponse.json({ success: true, usuario: { id: criado[0].id, email, nome, clienteId } })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}