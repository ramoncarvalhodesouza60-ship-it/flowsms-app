import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'chave-temporaria-trocar-no-env')

export interface SessaoPayload {
    email: string
    empresa: string
    admin: boolean
}

export async function criarToken(payload: SessaoPayload): Promise<string> {
    return await new SignJWT(payload as any)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secret)
}

export async function verificarToken(token: string): Promise<SessaoPayload | null> {
    try {
        const { payload } = await jwtVerify(token, secret)
        return payload as unknown as SessaoPayload
    } catch {
        return null
    }
}
import { NextRequest, NextResponse } from 'next/server'

// Verifica se a requisição tem sessão válida E se a empresa da sessão bate com a empresa pedida.
// Retorna null se estiver tudo certo, ou uma resposta de erro pronta para devolver direto.
export async function validarSessaoEEmpresa(
    request: NextRequest,
    empresaSolicitada: string
): Promise<NextResponse | null> {
    const cookie = request.cookies.get('sessao')

    if (!cookie) {
        return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
    }

    const sessao = await verificarToken(cookie.value)

    if (!sessao) {
        return NextResponse.json({ success: false, error: 'Sessão inválida' }, { status: 401 })
    }

    // Admin pode acessar qualquer empresa; cliente comum só a própria
    if (!sessao.admin && sessao.empresa !== empresaSolicitada) {
        return NextResponse.json({ success: false, error: 'Acesso negado a esta empresa' }, { status: 403 })
    }

    return null
}