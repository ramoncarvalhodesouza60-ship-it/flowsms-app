'use client'

import { useState, useEffect, useRef } from 'react'

interface Ticket {
    id: string
    empresa: string
    email_cliente: string
    categoria: string
    mensagens: { remetente: string; texto: string; data: string }[]
    status: string
    atendente_id: string
    criado_em: string
}

export default function SuporteAdmin() {
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [ticketSelecionado, setTicketSelecionado] = useState<Ticket | null>(null)
    const [novaMensagem, setNovaMensagem] = useState('')
    const [carregando, setCarregando] = useState(true)
    const [filtroStatus, setFiltroStatus] = useState<'Todos' | 'Aberto' | 'Em atendimento' | 'Resolvido'>('Todos')
    const pollingRef = useRef<NodeJS.Timeout | null>(null)

    async function carregarTickets() {
        try {
            const res = await fetch('/api/tickets-suporte')
            const data = await res.json()
            if (data.tickets) {
                setTickets(data.tickets)
                // Atualiza o ticket selecionado também, se ainda estiver aberto
                if (ticketSelecionado) {
                    const atualizado = data.tickets.find((t: Ticket) => t.id === ticketSelecionado.id)
                    if (atualizado) setTicketSelecionado(atualizado)
                }
            }
        } catch (e) {
            console.error('Erro ao carregar tickets:', e)
        }
        setCarregando(false)
    }

    useEffect(() => {
        carregarTickets()
        pollingRef.current = setInterval(carregarTickets, 8000)
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function responder() {
        if (!novaMensagem.trim() || !ticketSelecionado) return
        const texto = novaMensagem
        setNovaMensagem('')

        // Atualização otimista
        setTicketSelecionado(prev =>
            prev
                ? { ...prev, mensagens: [...prev.mensagens, { remetente: 'atendente', texto, data: new Date().toISOString() }] }
                : prev
        )

        await fetch(`/api/tickets-suporte/${ticketSelecionado.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nova_mensagem: texto,
                remetente: 'atendente',
                status: 'Em atendimento',
            }),
        })

        carregarTickets()
    }

    async function mudarStatus(novoStatus: string) {
        if (!ticketSelecionado) return
        setTicketSelecionado(prev => (prev ? { ...prev, status: novoStatus } : prev))
        await fetch(`/api/tickets-suporte/${ticketSelecionado.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: novoStatus }),
        })
        carregarTickets()
    }

    const ticketsFiltrados = tickets.filter(t => filtroStatus === 'Todos' || t.status === filtroStatus)

    const corStatus = (status: string) => {
        if (status === 'Aberto') return '#FF6B00'
        if (status === 'Em atendimento') return '#f9e2af'
        return '#22c55e'
    }

    if (carregando) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', color: '#555', fontFamily: 'Arial' }}>
                Carregando tickets...
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#0a0a0a', fontFamily: 'Arial, sans-serif' }}>
            {/* LISTA DE TICKETS */}
            <div style={{ width: '340px', background: '#111', borderRight: '1px solid #1e1e1e', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #1e1e1e' }}>
                    <div style={{ color: '#FF6B00', fontSize: '15px', fontWeight: 800, marginBottom: '10px' }}>
                        🎧 Suporte — Tickets
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {(['Todos', 'Aberto', 'Em atendimento', 'Resolvido'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setFiltroStatus(s)}
                                style={{
                                    background: filtroStatus === s ? '#FF6B00' : '#1a1a1a',
                                    color: filtroStatus === s ? 'white' : '#888',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '4px 10px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    fontFamily: 'Arial',
                                }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {ticketsFiltrados.length === 0 && (
                        <div style={{ padding: '20px', color: '#555', fontSize: '13px', textAlign: 'center' }}>
                            Nenhum ticket por aqui.
                        </div>
                    )}
                    {ticketsFiltrados.map(t => {
                        const ultima = t.mensagens[t.mensagens.length - 1]
                        return (
                            <div
                                key={t.id}
                                onClick={() => setTicketSelecionado(t)}
                                style={{
                                    padding: '14px 16px',
                                    borderBottom: '1px solid #161616',
                                    cursor: 'pointer',
                                    background: ticketSelecionado?.id === t.id ? '#1a1a1a' : 'transparent',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ color: 'white', fontSize: '13px', fontWeight: 600 }}>{t.empresa || 'Sem nome'}</span>
                                    <span style={{ color: corStatus(t.status), fontSize: '10px', fontWeight: 700 }}>{t.status}</span>
                                </div>
                                <div style={{ color: '#666', fontSize: '11px', marginBottom: '4px' }}>{t.categoria}</div>
                                <div style={{ color: '#555', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {ultima?.texto}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* CONVERSA */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {!ticketSelecionado ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '14px' }}>
                        Selecione um ticket para responder
                    </div>
                ) : (
                    <>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e1e1e', background: '#111', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ color: 'white', fontSize: '15px', fontWeight: 700 }}>{ticketSelecionado.empresa}</div>
                                <div style={{ color: '#555', fontSize: '11px' }}>{ticketSelecionado.categoria} {ticketSelecionado.email_cliente && `· ${ticketSelecionado.email_cliente}`}</div>
                            </div>
                            <select
                                value={ticketSelecionado.status}
                                onChange={e => mudarStatus(e.target.value)}
                                style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '6px', color: 'white', padding: '6px 10px', fontSize: '12px', fontFamily: 'Arial' }}
                            >
                                <option value="Aberto">Aberto</option>
                                <option value="Em atendimento">Em atendimento</option>
                                <option value="Resolvido">Resolvido</option>
                            </select>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#0d0d0d' }}>
                            {ticketSelecionado.mensagens.map((m, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: m.remetente === 'atendente' ? 'flex-end' : 'flex-start' }}>
                                    <div
                                        style={{
                                            maxWidth: '60%',
                                            padding: '10px 14px',
                                            borderRadius: m.remetente === 'atendente' ? '12px 0 12px 12px' : '0 12px 12px 12px',
                                            background: m.remetente === 'atendente' ? '#FF6B00' : '#1a1a1a',
                                            color: m.remetente === 'atendente' ? 'white' : '#ddd',
                                            fontSize: '13px',
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        {m.texto}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ padding: '14px 20px', borderTop: '1px solid #1e1e1e', background: '#111', display: 'flex', gap: '8px' }}>
                            <input
                                value={novaMensagem}
                                onChange={e => setNovaMensagem(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && responder()}
                                placeholder="Digite sua resposta..."
                                style={{ flex: 1, padding: '11px 16px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '24px', color: 'white', fontSize: '13px', outline: 'none', fontFamily: 'Arial' }}
                            />
                            <button
                                onClick={responder}
                                style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#FF6B00', border: 'none', cursor: 'pointer', color: 'white', fontSize: '16px' }}
                            >
                                ➤
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}