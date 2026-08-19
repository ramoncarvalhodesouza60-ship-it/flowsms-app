'use client'
import { useState } from 'react'

export default function LoginAtendente() {
    const [email, setEmail] = useState('')
    const [senha, setSenha] = useState('')
    const [erro, setErro] = useState('')
    const [loading, setLoading] = useState(false)
    const [atendente, setAtendente] = useState<any>(null)

    async function entrar() {
        setLoading(true)
        setErro('')
        try {
            const res = await fetch('/api/atendentes/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha }),
            })
            const data = await res.json()
            if (data.success) {
                setAtendente(data.atendente)
            } else {
                setErro(data.error || 'Email ou senha incorretos')
            }
        } catch {
            setErro('Erro ao conectar. Tente novamente.')
        }
        setLoading(false)
    }

    // Placeholder temporário — na próxima parte, isso vira o painel de verdade (conversas + kanban)
    if (atendente) {
        return (
            <main style={{ background: '#0a0a0d', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'Inter, sans-serif' }}>
                <div>
                    <h1>Bem-vindo, {atendente.nome}! 👋</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)' }}>Empresa: {atendente.empresa}</p>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginTop: '12px' }}>
                        (o painel de conversas ainda vai ser construído aqui)
                    </p>
                </div>
            </main>
        )
    }

    return (
        <main style={{ background: '#0a0a0d', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
            <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,107,0,0.2)',
                borderRadius: '20px',
                padding: '40px',
                width: '100%',
                maxWidth: '380px',
            }}>
                <h1 style={{ color: 'white', fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>Área do Atendente</h1>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginBottom: '28px' }}>Entre com as credenciais que você recebeu</p>

                <input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && entrar()}
                    style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: 'white', fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' }}
                />
                <input
                    type="password"
                    placeholder="••••••••"
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && entrar()}
                    style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: 'white', fontSize: '14px', marginBottom: '20px', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' }}
                />

                {erro && (
                    <div style={{ background: 'rgba(243,139,168,0.08)', border: '1px solid rgba(243,139,168,0.2)', color: '#f38ba8', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>
                        ⚠️ {erro}
                    </div>
                )}

                <button
                    onClick={entrar}
                    disabled={loading}
                    style={{
                        width: '100%', padding: '14px',
                        background: loading ? 'rgba(255,107,0,0.5)' : 'linear-gradient(135deg,#FF6B00,#ff8c33)',
                        color: 'white', border: 'none', borderRadius: '10px',
                        fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                        fontFamily: 'Inter, sans-serif',
                    }}>
                    {loading ? 'Verificando...' : 'Entrar'}
                </button>
            </div>
        </main>
    )
}
