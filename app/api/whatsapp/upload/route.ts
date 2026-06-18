import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

// Mapeia o mime type real do arquivo para a extensao correta.
// Isso evita o erro "mismatched MIME type" da Meta, que ocorre quando
// a extensao do nome do arquivo nao corresponde ao Content-Type real.
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
        const formData = await request.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ success: false, error: 'Nenhum arquivo enviado' }, { status: 400 })
        }

        // Descobre a extensao correta baseada no mime type REAL do arquivo,
        // em vez de confiar no nome que veio do front-end.
        const extensaoCorreta = extensaoPorMimeType(file.type)

        // Nome base sem extensao, limpo de espacos
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