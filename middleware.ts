import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verificarToken } from '@/lib/auth'

// Rotas que exigem sessão válida (qualquer cliente logado)
const ROTAS_PROTEGIDAS = ['/whatsapp']

// Rotas que exigem sessão de admin especificamente
const ROTAS_ADMIN = ['/suporte-admin']

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    const precisaProtegerComum = ROTAS_PROTEGIDAS.some(rota => pathname.startsWith(rota))
    const precisaProtegerAdmin = ROTAS_ADMIN.some(rota => pathname.startsWith(rota))

    if (!precisaProtegerComum && !precisaProtegerAdmin) {
        return NextResponse.next()
    }

    const cookie = request.cookies.get('sessao')

    if (!cookie) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    const sessao = await verificarToken(cookie.value)

    if (!sessao) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    if (precisaProtegerAdmin && !sessao.admin) {
        return NextResponse.redirect(new URL('/whatsapp?empresa=' + encodeURIComponent(sessao.empresa), request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/whatsapp/:path*', '/suporte-admin/:path*'],
}