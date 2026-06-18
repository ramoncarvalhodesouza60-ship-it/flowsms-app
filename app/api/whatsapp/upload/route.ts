import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ success: false, error: 'Nenhum arquivo enviado' }, { status: 400 })
        }

        // Nome único para evitar colisão entre arquivos com o mesmo nome
        const nomeUnico = Date.now() + '-' + file.name.replace(/\s+/g, '-')

        const blob = await put(nomeUnico, file, {
            access: 'public',
        })

        return NextResponse.json({ success: true, url: blob.url, contentType: file.type })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}