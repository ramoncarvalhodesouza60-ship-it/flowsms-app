'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Mono:wght@700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #050508; font-family: 'Inter', sans-serif; color: white; }
  input::placeholder { color: rgba(255,255,255,0.2); }
  input:focus { outline: none; }
  .inp-focus:focus { border-color: rgba(255,107,0,0.6) !important; background: rgba(255,107,0,0.06) !important; box-shadow: 0 0 0 3px rgba(255,107,0,0.1) !important; }
  .glow-btn:hover { transform: translateY(-2px); }
`

const inp: React.CSSProperties = {
    width: '100%',
    padding: '14px 18px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    color: 'white',
    fontSize: '14px',
    fontFamily: 'Inter, sans-serif',
    transition: 'all 0.2s',
}

export default function LoginCliente() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [senha, setSenha] = useState('')
    const [erro, setErro] = useState('')
    const [loading, setLoading] = useState(false)

    async function entrar() {
        setErro('')
        if (!email || !senha) {
            setErro('Preencha e-mail e senha.')
            return
        }
        setLoading(true)
        try {
            const res = await fetch('/api/auth/login-cliente', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha }),
            })
            const data = await res.json()
            if (data.success) {
                router.push('/cliente/dashboard')
            } else {
                setErro(data.error || 'Email ou senha incorretos')
            }
        } catch {
            setErro('Erro ao conectar. Tente novamente.')
        }
        setLoading(false)
    }

    return (
        <main style={{ background: '#050508', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <style>{globalStyles}</style>

            <div style={{ width: '100%', maxWidth: '440px', padding: '0 24px' }}>
                <div style={{
                    background: 'rgba(5,5,8,0.85)',
                    backdropFilter: 'blur(40px)',
                    border: '1px solid rgba(255,107,0,0.2)',
                    borderRadius: '24px',
                    padding: '48px 40px',
                    boxShadow: '0 0 100px rgba(255,107,0,0.08), 0 32px 64px rgba(0,0,0,0.8)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '1px', marginBottom: '32px' }}>
                        <span style={{ color: '#FF6B00', fontSize: '20px', fontWeight: 900, fontFamily: 'Space Mono, monospace' }}>Flow</span>
                        <span style={{ color: 'white', fontSize: '20px', fontWeight: 900, fontFamily: 'Space Mono, monospace' }}>SMS</span>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', fontWeight: 400, marginLeft: '8px' }}>— Área do Cliente</span>
                    </div>

                    <h1 style={{ fontSize: '26px', fontWeight: 900, marginBottom: '6px' }}>Bem-vindo</h1>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', marginBottom: '32px' }}>
                        Acesse sua conta para gerenciar sua loja
                    </p>

                    <div style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>E-mail</label>
                        <input className="inp-focus" type="email" placeholder="seu@email.com" value={email}
                            onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && entrar()} style={inp} />
                    </div>
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Senha</label>
                        <input className="inp-focus" type="password" placeholder="••••••••" value={senha}
                            onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key === 'Enter' && entrar()} style={inp} />
                    </div>

                    {erro && (
                        <div style={{ background: 'rgba(243,139,168,0.08)', border: '1px solid rgba(243,139,168,0.2)', borderRadius: '10px', padding: '12px 16px', color: '#f38ba8', fontSize: '13px', marginBottom: '20px' }}>
                            ⚠ {erro}
                        </div>
                    )}

                    <button className="glow-btn" onClick={entrar} disabled={loading} style={{
                        width: '100%', padding: '16px',
                        background: loading ? 'rgba(255,107,0,0.5)' : 'linear-gradient(135deg, #FF6B00, #ff8c33)',
                        color: 'white', border: 'none', borderRadius: '12px',
                        fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                        fontFamily: 'Inter, sans-serif',
                    }}>
                        {loading ? 'Verificando...' : 'Entrar →'}
                    </button>

                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '11px', marginTop: '20px' }}>
                        Não tem acesso ainda? Fale com quem contratou o FlowSMS pra você.
                    </p>
                </div>
            </div>
        </main>
    )
}