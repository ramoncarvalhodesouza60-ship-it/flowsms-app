'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function BotaoSair() {
    const router = useRouter()
    const [saindo, setSaindo] = useState(false)

    async function sair() {
        setSaindo(true)
        await fetch('/api/auth/logout', { method: 'POST' })
        router.push('/cliente/login')
        router.refresh()
    }

    return (
        <button onClick={sair} disabled={saindo} style={{
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.4)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: saindo ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontFamily: 'Inter, sans-serif',
        }}>
            {saindo ? 'Saindo...' : 'Sair'}
        </button>
    )
}