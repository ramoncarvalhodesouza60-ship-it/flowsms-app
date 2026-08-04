'use client'
import { useEffect, useState } from 'react'

type Contato = {
    id: string
    nome: string
    telefone: string
    status: string
}

const statusColors: Record<string, { bg: string; color: string }> = {
    'Aguardando retorno': { bg: 'rgba(249,226,175,0.1)', color: '#f9e2af' },
    'Não interessado': { bg: 'rgba(243,139,168,0.1)', color: '#f38ba8' },
    'Sem resposta': { bg: 'rgba(108,117,125,0.1)', color: '#888' },
    'Convertido': { bg: 'rgba(166,227,161,0.1)', color: '#a6e3a1' },
}

export default function MeusContatos() {
    const [contatos, setContatos] = useState<Contato[]>([])
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState('')

    useEffect(() => {
        fetch('/api/cliente/contatos')
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    setContatos(data.contatos)
                } else {
                    setErro(data.error || 'Erro ao carregar contatos')
                }
                setCarregando(false)
            })
            .catch(() => {
                setErro('Erro ao carregar contatos')
                setCarregando(false)
            })
    }, [])

    return (
        <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '20px', padding: '28px', marginTop: '16px',
        }}>
            <div style={{ fontSize: '13px', color: '#FF6B00', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
                👥 Meus Contatos
            </div>

            {carregando && (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '16px 0' }}>Carregando...</div>
            )}

            {erro && (
                <div style={{ background: 'rgba(243,139,168,0.08)', border: '1px solid rgba(243,139,168,0.2)', color: '#f38ba8', padding: '12px 16px', borderRadius: '10px', fontSize: '13px' }}>
                    ⚠️ {erro}
                </div>
            )}

            {!carregando && !erro && contatos.length === 0 && (
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px', padding: '16px 0', textAlign: 'center' }}>
                    Nenhum contato ainda.
                </div>
            )}

            {!carregando && contatos.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {contatos.map(c => {
                        const sc = statusColors[c.status] || statusColors['Aguardando retorno']
                        return (
                            <div key={c.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '12px 14px', background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px',
                            }}>
                                <div>
                                    <div style={{ color: 'white', fontSize: '13px', fontWeight: 600 }}>{c.nome || 'Sem nome'}</div>
                                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontFamily: 'monospace' }}>{c.telefone}</div>
                                </div>
                                <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                                    {c.status || 'Aguardando retorno'}
                                </span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}