import { NextRequest, NextResponse } from 'next/server'
import { validarSessaoEEmpresa } from '@/lib/auth'

export async function GET(request: NextRequest) {
    try {
        const id = request.nextUrl.searchParams.get('id') || ''
        const empresa = request.nextUrl.searchParams.get('empresa') || ''

        const erro = await validarSessaoEEmpresa(request, empresa)
        if (erro) return erro

        if (!id) {
            return NextResponse.json({ success: false, error: 'id obrigatório' }, { status: 400 })
        }

        const key = process.env.SMSDEV_API_KEY
        const res = await fetch(`https://api.smsdev.com.br/v1/dlr?key=${key}&id=${id}`)
        const data = await res.json()

        return NextResponse.json({ success: true, status: data })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}