'use client'
import { useState } from 'react'

const conversasExemplo = [
    { id: 1, nome: 'João Silva', telefone: '+5511999999999', ultimaMensagem: 'Olá, quero saber mais sobre o produto', horario: '14:32', naoLidas: 2, status: 'online' },
    { id: 2, nome: 'Maria Santos', telefone: '+5521988888888', ultimaMensagem: 'Qual o preço?', horario: '13:15', naoLidas: 0, status: 'offline' },
    { id: 3, nome: 'Carlos Oliveira', telefone: '+5531977777777', ultimaMensagem: 'Pode me ligar?', horario: '11:45', naoLidas: 1, status: 'offline' },
    { id: 4, nome: 'Ana Beatriz', telefone: '+5541966666666', ultimaMensagem: 'Obrigada!', horario: '10:20', naoLidas: 0, status: 'offline' },
]

const mensagensExemplo: Record<number, any[]> = {
    1: [
        { id: 1, texto: 'Olá João! Temos uma oferta especial para você. Interessado?', tipo: 'enviada', horario: '14:30' },
        { id: 2, texto: 'Olá, quero saber mais sobre o produto', tipo: 'recebida', horario: '14:32' },
        { id: 3, texto: 'Claro! Qual produto te interessa?', tipo: 'ia', horario: '14:32' },
    ],
    2: [
        { id: 1, texto: 'Olá Maria! Temos uma oferta especial para você!', tipo: 'enviada', horario: '13:10' },
        { id: 2, texto: 'Qual o preço?', tipo: 'recebida', horario: '13:15' },
    ],
    3: [
        { id: 1, texto: 'Olá Carlos! Temos novidades para você!', tipo: 'enviada', horario: '11:40' },
        { id: 2, texto: 'Pode me ligar?', tipo: 'recebida', horario: '11:45' },
    ],
    4: [
        { id: 1, texto: 'Olá Ana! Aproveite nossa promoção!', tipo: 'enviada', horario: '10:15' },
        { id: 2, texto: 'Obrigada!', tipo: 'recebida', horario: '10:20' },
    ],
}

export default function WhatsApp() {
    const [conversaSelecionada, setConversaSelecionada] = useState(conversasExemplo[0])
    const [mensagens, setMensagens] = useState(mensagensExemplo)
    const [novaMensagem, setNovaMensagem] = useState('')
    const [busca, setBusca] = useState('')
    const [iaAtiva, setIaAtiva] = useState(true)

    function enviarMensagem() {
        if (!novaMensagem.trim()) return
        const nova = {
            id: Date.now(),
            texto: novaMensagem,
            tipo: 'enviada',
            horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }
        setMensagens(prev => ({
            ...prev,
            [conversaSelecionada.id]: [...(prev[conversaSelecionada.id] || []), nova]
        }))
        setNovaMensagem('')
    }

    const conversasFiltradas = conversasExemplo.filter(c =>
        c.nome.toLowerCase().includes(busca.toLowerCase())
    )

    const msgAtual = mensagens[conversaSelecionada.id] || []

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#0a0a0a', fontFamily: 'Arial, sans-serif' }}>
            <a href="/" style={{ position: 'fixed', top: '16px', right: '16px', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', textDecoration: 'none', zIndex: 100 }}>← Voltar</a>

            {/* SIDEBAR ESQUERDA */}
            <div style={{ width: '360px', background: '#111', borderRight: '1px solid #1e1e1e', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

                {/* HEADER */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e1e1e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <a href="/dashboard" style={{ color: '#aaa', fontSize: '12px', textDecoration: 'none', marginBottom: '4px', display: 'block' }}>← Voltar ao SMS</a>
                        <div style={{ color: '#555', fontSize: '11px', marginTop: '2px' }}>WhatsApp Business</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ background: iaAtiva ? '#22c55e22' : '#55555522', color: iaAtiva ? '#22c55e' : '#555', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }} onClick={() => setIaAtiva(!iaAtiva)}>
                            {iaAtiva ? '🤖 IA Ativa' : '👤 Manual'}
                        </div>
                    </div>
                </div>

                {/* BUSCA */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e1e' }}>
                    <input
                        placeholder="🔍 Buscar conversa..."
                        value={busca}
                        onChange={e => setBusca(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '20px', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const }}
                    />
                </div>

                {/* LISTA DE CONVERSAS */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {conversasFiltradas.map(c => (
                        <div
                            key={c.id}
                            onClick={() => setConversaSelecionada(c)}
                            style={{ padding: '14px 16px', borderBottom: '1px solid #161616', cursor: 'pointer', background: conversaSelecionada.id === c.id ? '#1a1a1a' : 'transparent', display: 'flex', gap: '12px', alignItems: 'center', transition: 'background .15s' }}
                        >
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#FF6B0033', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: '#FF6B00' }}>
                                    {c.nome[0]}
                                </div>
                                <div style={{ position: 'absolute', bottom: '1px', right: '1px', width: '10px', height: '10px', borderRadius: '50%', background: c.status === 'online' ? '#22c55e' : '#555', border: '2px solid #111' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                                    <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>{c.nome}</span>
                                    <span style={{ color: '#555', fontSize: '11px' }}>{c.horario}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#666', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{c.ultimaMensagem}</span>
                                    {c.naoLidas > 0 && (
                                        <span style={{ background: '#22c55e', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', flexShrink: 0 }}>{c.naoLidas}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ÁREA DA CONVERSA */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

                {/* HEADER DA CONVERSA */}
                <div style={{ padding: '14px 24px', borderBottom: '1px solid #1e1e1e', background: '#111', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#FF6B0033', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: '#FF6B00' }}>
                            {conversaSelecionada.nome[0]}
                        </div>
                        <div>
                            <div style={{ color: 'white', fontSize: '15px', fontWeight: '600' }}>{conversaSelecionada.nome}</div>
                            <div style={{ color: '#555', fontSize: '12px' }}>{conversaSelecionada.telefone}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#aaa', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>📞 Ligar</button>
                        <button style={{ background: iaAtiva ? '#FF6B00' : '#1a1a1a', border: '1px solid #2a2a2a', color: 'white', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }} onClick={() => setIaAtiva(!iaAtiva)}>
                            {iaAtiva ? '🤖 IA respondendo' : '👤 Assumir conversa'}
                        </button>
                    </div>
                </div>

                {/* MENSAGENS */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#0d0d0d' }}>
                    {msgAtual.map(msg => (
                        <div key={msg.id} style={{ display: 'flex', justifyContent: msg.tipo === 'recebida' ? 'flex-start' : 'flex-end' }}>
                            {msg.tipo === 'ia' && (
                                <div style={{ fontSize: '11px', color: '#22c55e', marginRight: '6px', alignSelf: 'flex-end', marginBottom: '4px' }}>🤖</div>
                            )}
                            <div style={{
                                maxWidth: '60%',
                                padding: '10px 14px',
                                borderRadius: msg.tipo === 'recebida' ? '0 12px 12px 12px' : '12px 0 12px 12px',
                                background: msg.tipo === 'recebida' ? '#1a1a1a' : msg.tipo === 'ia' ? '#22c55e22' : '#FF6B00',
                                color: msg.tipo === 'recebida' ? '#ddd' : msg.tipo === 'ia' ? '#22c55e' : 'white',
                                fontSize: '13px',
                                lineHeight: '1.5',
                                border: msg.tipo === 'ia' ? '1px solid #22c55e33' : 'none'
                            }}>
                                {msg.texto}
                                <div style={{ fontSize: '10px', opacity: .6, marginTop: '4px', textAlign: 'right' }}>{msg.horario}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* INPUT */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid #1e1e1e', background: '#111', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {iaAtiva && (
                        <div style={{ background: '#22c55e22', border: '1px solid #22c55e33', color: '#22c55e', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                            🤖 IA respondendo
                        </div>
                    )}
                    <input
                        placeholder="Digite uma mensagem..."
                        value={novaMensagem}
                        onChange={e => setNovaMensagem(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && enviarMensagem()}
                        style={{ flex: 1, padding: '12px 16px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '24px', color: 'white', fontSize: '14px', outline: 'none' }}
                    />
                    <button
                        onClick={enviarMensagem}
                        style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#FF6B00', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}
                    >
                        ➤
                    </button>
                </div>
            </div>
        </div>
    )
}