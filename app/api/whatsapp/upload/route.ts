import { NextRequest, NextResponse } from 'next/server'
import { verificarToken } from '@/lib/auth'
import { put } from '@vercel/blob'

function extensaoPorMimeType(mimeType: string): string | null {
    const mapa: Record<string, string> = {
        'audio/mp4': 'mp4',
        'audio/m4a': 'm4a',
        'audio/x-m4a': 'm4a',
        'audio/aac': 'aac',
        'audio/mpeg': 'mp3',
        'audio/mp3': 'mp3',
        'audio/amr': 'amr',
        'audio/ogg': 'ogg',
        'audio/webm': 'webm',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'video/mp4': 'mp4',
        'video/3gpp': '3gp',
    }
    return mapa[mimeType] || null
}

export async function POST(request: NextRequest) {
    try {
        const cookie = request.cookies.get('sessao')
        if (!cookie) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
        }
        const sessao = await verificarToken(cookie.value)
        if (!sessao) {
            return NextResponse.json({ success: false, error: 'Sessão inválida' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ success: false, error: 'Nenhum arquivo enviado' }, { status: 400 })
        }

        const extensaoCorreta = extensaoPorMimeType(file.type)

        const nomeBase = file.name
            .replace(/\s+/g, '-')
            .replace(/\.[^/.]+$/, '')

        const extensaoFinal = extensaoCorreta || file.name.split('.').pop() || 'bin'

        const nomeUnico = Date.now() + '-' + nomeBase + '.' + extensaoFinal

        const blob = await put(nomeUnico, file, {
            access: 'public',
            contentType: file.type,
        })

        return NextResponse.json({ success: true, url: blob.url, contentType: file.type })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}