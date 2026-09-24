import { NextRequest, NextResponse } from 'next/server'
import { validarSessaoEEmpresa, registrarLog } from '@/lib/auth'

export async function POST(request: NextRequest) {
    try {
        const { telefone, motivo, empresa } = await request.json()

        const erro = await validarSessaoEEmpresa(request, empresa || '')
        if (erro) return erro

        if (!telefone || !motivo) {
            return NextResponse.json({ success: false, error: 'telefone e motivo obrigatórios' }, { status: 400 })
        }

        await registrarLog(
            'sistema',
            'denunciou_contato',
            `Telefone ${telefone} — Motivo: ${motivo}`,
            empresa
        )

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}