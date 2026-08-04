import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function POST(request: Request) {
    try {
        const { email, senha } = await request.json()

        if (!email || !senha) {
            return NextResponse.json({ success: false, error: 'Email e senha são obrigatórios' }, { status: 400 })
        }

        let usuarioEncontrado: any = null

        await new Promise<void>((resolve, reject) => {
            const formula = 'LOWER({email}) = "' + email.toLowerCase() + '"'
            base('Usuarios').select({ filterByFormula: formula, maxRecords: 1 }).eachPage(
                (pageRecords: any[], fetchNextPage: () => void) => {
                    pageRecords.forEach((record: any) => {
                        usuarioEncontrado = {
                            id: record.id,
                            email: record.get('email'),
                            senhaHash: record.get('senha'),
                            nome: record.get('nome'),
                            clienteId: record.get('clienteId'),
                        }
                    })
                    fetchNextPage()
                },
                (err: any) => { if (err) reject(err); else resolve() }
            )
        })

        if (!usuarioEncontrado) {
            return NextResponse.json({ success: false, error: 'Email ou senha incorretos' })
        }

        const senhaCorreta = await bcrypt.compare(senha, usuarioEncontrado.senhaHash)
        if (!senhaCorreta) {
            return NextResponse.json({ success: false, error: 'Email ou senha incorretos' })
        }

        const response = NextResponse.json({
            success: true,
            usuario: { nome: usuarioEncontrado.nome, email: usuarioEncontrado.email, clienteId: usuarioEncontrado.clienteId },
        })

        response.cookies.set('flowsms_cliente_session', usuarioEncontrado.clienteId, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
        })

        return response
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}