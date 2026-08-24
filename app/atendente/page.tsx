'use client'
import { useState, useEffect, useRef } from 'react'

function normalizarTelefone(raw: string): string {
    return (raw || '').replace(/\D/g, '')
}

function formatarHora(iso: string) {
    try {
        return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } catch {
        return iso
    }
}

function hexParaRgba(hex: string, alpha: number): string {
    const limpo = (hex || '#888888').replace('#', '')
    const bigint = parseInt(limpo, 16)
    const r = (bigint >> 16) & 255
    const g = (bigint >> 8) & 255
    const b = bigint & 255
    return `rgba(${r},${g},${b},${alpha})`
}

const tagsDisponiveis = [
    { id: 'quente', label: 'Quente', cor: '#f38ba8', bg: 'rgba(243,139,168,0.15)' },
    { id: 'frio', label: 'Frio', cor: '#74c7ec', bg: 'rgba(116,199,236,0.15)' },
    { id: 'vip', label: 'VIP', cor: '#f9e2af', bg: 'rgba(249,226,175,0.15)' },
    { id: 'urgente', label: 'Urgente', cor: '#FF6B00', bg: 'rgba(255,107,0,0.15)' },
    { id: 'indicacao', label: 'Indicação', cor: '#a6e3a1', bg: 'rgba(166,227,161,0.15)' },
]

const respostasRapidas = [
    { label: 'Saudação', texto: 'Olá! Tudo bem? Sou da equipe de atendimento. Como posso te ajudar hoje?' },
    { label: 'Preço', texto: 'Ótima pergunta! Nossos valores variam conforme o produto. Pode me dizer qual te interessa?' },
    { label: 'Aguarde', texto: 'Perfeito! Vou verificar essa informação para você agora mesmo. Um momento! 😊' },
    { label: 'Agendamento', texto: 'Que tal agendarmos uma conversa? Me diga sua disponibilidade e combinamos!' },
    { label: 'Obrigado', texto: 'Muito obrigado pelo contato! Qualquer dúvida estarei aqui para te ajudar. 🙏' },
    { label: 'Fechamento', texto: 'Perfeito! Vou processar tudo agora. Você receberá a confirmação em breve!' },
]

type MensagemRaw = {
    id: string
    telefone: string
    mensagem: string
    tipo: 'enviada' | 'recebida'
    horario: string
    nomeContato: string | null
    etapaContato: string
    atendimentoAtivo: boolean
}

type Contato = {
    telefone: string
    nome: string | null
    ultimaMensagem: string
    horario: string
    etapa: string
    atendimentoAtivo: boolean
}

export default function AtendentePage() {
    const [email, setEmail] = useState('')
    const [senha, setSenha] = useState('')
    const [erroLogin, setErroLogin] = useState('')
    const [loadingLogin, setLoadingLogin] = useState(false)
    const [atendente, setAtendente] = useState<any>(null)
    const [disponivel, setDisponivel] = useState(true)

    const [mensagensRaw, setMensagensRaw] = useState<MensagemRaw[]>([])
    const [colunas, setColunas] = useState<any[]>([])
    const [carregando, setCarregando] = useState(false)
    const [view, setView] = useState<'conversas' | 'kanban'>('conversas')
    const [conversaSelecionada, setConversaSelecionada] = useState<string | null>(null)
    const [novaMensagem, setNovaMensagem] = useState('')
    const [enviando, setEnviando] = useState(false)
    const [mostrarRespostas, setMostrarRespostas] = useState(false)
    const [mostrarTags, setMostrarTags] = useState(false)
    const [tagsPorContato, setTagsPorContato] = useState<Record<string, string[]>>({})
    const mensagensEndRef = useRef<HTMLDivElement>(null)

    async function entrar() {
        setLoadingLogin(true)
        setErroLogin('')
        try {
            const res = await fetch('/api/atendentes/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha }),
            })
            const data = await res.json()
            if (data.success) {
                setAtendente(data.atendente)
                setDisponivel(data.atendente.disponivel)
            } else {
                setErroLogin(data.error || 'Email ou senha incorretos')
            }
        } catch {
            setErroLogin('Erro ao conectar. Tente novamente.')
        }
        setLoadingLogin(false)
    }

    async function carregarConversas() {
        if (!atendente) return
        setCarregando(true)
        try {
            const res = await fetch('/api/atendentes/conversas?atendenteId=' + atendente.id)
            const data = await res.json()
            if (data.success) {
                setMensagensRaw(data.mensagens)
                setColunas(data.colunas)
            }
        } catch (e) { console.error(e) }
        setCarregando(false)
    }

    useEffect(() => {
        if (atendente) carregarConversas()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [atendente])

    // Atualiza as conversas automaticamente a cada 8 segundos, sem precisar apertar F5
    useEffect(() => {
        if (!atendente) return
        const intervalo = setInterval(() => {
            carregarConversas()
        }, 8000)
        return () => clearInterval(intervalo)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [atendente])

    useEffect(() => {
        if (atendente) {
            fetch('/api/contatos/tags?empresa=' + encodeURIComponent(atendente.empresa))
                .then(r => r.json())
                .then(data => { if (data.success) setTagsPorContato(data.tags) })
                .catch(e => console.error('Erro ao carregar tags:', e))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [atendente])

    useEffect(() => {
        mensagensEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [mensagensRaw, conversaSelecionada])

    async function alternarDisponivel() {
        const novoValor = !disponivel
        setDisponivel(novoValor)
        try {
            await fetch('/api/atendentes/disponibilidade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ atendenteId: atendente.id, disponivel: novoValor }),
            })
        } catch (e) { console.error(e) }
    }

    async function enviarMensagem() {
        if (!novaMensagem.trim() || !conversaSelecionada) return
        const texto = novaMensagem
        setNovaMensagem('')
        setEnviando(true)
        try {
            await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telefone: conversaSelecionada, mensagem: texto }),
            })
            await fetch('/api/whatsapp/mensagens', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telefone: conversaSelecionada, mensagem: texto, tipo: 'enviada', empresa: atendente.empresa }),
            })
            await carregarConversas()
        } catch (e) {
            console.error(e)
        }
        setEnviando(false)
    }

    async function moverEtapa(telefone: string, novaEtapa: string) {
        setMensagensRaw(prev => prev.map(m => m.telefone === telefone ? { ...m, etapaContato: novaEtapa } : m))
        try {
            await fetch('/api/contatos/etapa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telefone, etapa: novaEtapa, empresa: atendente.empresa }),
            })
        } catch (e) { console.error(e) }
    }

    async function finalizarAtendimento(telefone: string) {
        try {
            await fetch('/api/atendentes/finalizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telefone }),
            })
            await carregarConversas()
            setConversaSelecionada(null)
        } catch (e) { console.error(e) }
    }

    function toggleTag(telefone: string, tagId: string) {
        setTagsPorContato(prev => {
            const atual = prev[telefone] || []
            const novas = atual.includes(tagId) ? atual.filter(t => t !== tagId) : [...atual, tagId]

            fetch('/api/contatos/tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telefone, tags: novas }),
            }).catch(e => console.error('Erro ao salvar tags:', e))

            return { ...prev, [telefone]: novas }
        })
    }

    // Agrupa as mensagens em lista de contatos únicos
    const contatosMap = new Map<string, Contato>()
    mensagensRaw.forEach(m => {
        const existente = contatosMap.get(m.telefone)
        if (!existente || new Date(m.horario) > new Date(existente.horario)) {
            contatosMap.set(m.telefone, {
                telefone: m.telefone,
                nome: m.nomeContato,
                ultimaMensagem: m.mensagem,
                horario: m.horario,
                etapa: m.etapaContato,
                atendimentoAtivo: m.atendimentoAtivo,
            })
        }
    })
    const contatos = Array.from(contatosMap.values())
        .filter(c => c.atendimentoAtivo)
        .sort((a, b) => new Date(b.horario).getTime() - new Date(a.horario).getTime())

    const msgAtual = conversaSelecionada
        ? mensagensRaw
            .filter(m => m.telefone === conversaSelecionada)
            .sort((a, b) => new Date(a.horario).getTime() - new Date(b.horario).getTime())
        : []

    const contatoAtual = conversaSelecionada ? contatosMap.get(conversaSelecionada) : null
    const tagsAtual = conversaSelecionada ? (tagsPorContato[conversaSelecionada] || []) : []

    // ==================== LOGIN ====================
    if (!atendente) {
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

                    {erroLogin && (
                        <div style={{ background: 'rgba(243,139,168,0.08)', border: '1px solid rgba(243,139,168,0.2)', color: '#f38ba8', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>
                            ⚠️ {erroLogin}
                        </div>
                    )}

                    <button
                        onClick={entrar}
                        disabled={loadingLogin}
                        style={{
                            width: '100%', padding: '14px',
                            background: loadingLogin ? 'rgba(255,107,0,0.5)' : 'linear-gradient(135deg,#FF6B00,#ff8c33)',
                            color: 'white', border: 'none', borderRadius: '10px',
                            fontSize: '14px', fontWeight: 700, cursor: loadingLogin ? 'not-allowed' : 'pointer',
                            fontFamily: 'Inter, sans-serif',
                        }}>
                        {loadingLogin ? 'Verificando...' : 'Entrar'}
                    </button>
                </div>
            </main>
        )
    }

    // ==================== PAINEL ====================
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0d', fontFamily: 'Inter, sans-serif' }}>

            {/* TOP BAR */}
            <div style={{ background: '#111', borderBottom: '1px solid #1e1e1e', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ color: '#FF6B00', fontSize: '15px', fontWeight: 800 }}>
                        {atendente.nome}
                    </span>
                    <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: '8px', padding: '3px', gap: '2px' }}>
                        <button onClick={() => setView('conversas')} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: view === 'conversas' ? '#FF6B00' : 'transparent', color: view === 'conversas' ? 'white' : '#555', fontFamily: 'Inter, sans-serif' }}>
                            💬 Conversas
                        </button>
                        <button onClick={() => setView('kanban')} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: view === 'kanban' ? '#FF6B00' : 'transparent', color: view === 'kanban' ? 'white' : '#555', fontFamily: 'Inter, sans-serif' }}>
                            📋 Kanban
                        </button>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={alternarDisponivel} style={{
                        background: disponivel ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${disponivel ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
                        color: disponivel ? '#22c55e' : '#888',
                        padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                    }}>
                        {disponivel ? '🟢 Disponível' : '⚪ Indisponível'}
                    </button>
                    <button onClick={() => setAtendente(null)} style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.06)', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>
                        Sair
                    </button>
                </div>
            </div>

            {carregando && contatos.length === 0 && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>Carregando...</div>
            )}

            {!carregando && contatos.length === 0 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#555' }}>
                    <div style={{ fontSize: '36px', opacity: 0.4 }}>💬</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#777' }}>Nenhuma conversa atribuída ainda</div>
                </div>
            )}

            {/* VIEW CONVERSAS */}
            {view === 'conversas' && contatos.length > 0 && (
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    <div style={{ width: '300px', background: '#111', borderRight: '1px solid #1e1e1e', overflowY: 'auto', flexShrink: 0 }}>
                        {contatos.map(c => (
                            <div key={c.telefone} onClick={() => setConversaSelecionada(c.telefone)}
                                style={{ padding: '12px 16px', borderBottom: '1px solid #161616', cursor: 'pointer', background: conversaSelecionada === c.telefone ? '#1a1a1a' : 'transparent' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ color: c.nome ? 'white' : '#999', fontSize: '13px', fontWeight: 600, fontStyle: c.nome ? 'normal' : 'italic' }}>{c.nome || c.telefone}</span>
                                    <span style={{ color: '#555', fontSize: '10px' }}>{formatarHora(c.horario)}</span>
                                </div>
                                <div style={{ color: '#666', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.ultimaMensagem}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {!conversaSelecionada && (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444' }}>Selecione uma conversa</div>
                        )}
                        {conversaSelecionada && contatoAtual && (
                            <>
                                <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e1e1e', background: '#111', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                                    <div>
                                        <div style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>{contatoAtual.nome || 'Sem cadastro'}</div>
                                        <div style={{ color: '#555', fontSize: '11px' }}>{conversaSelecionada}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <button onClick={() => { setMostrarTags(!mostrarTags); setMostrarRespostas(false) }}
                                            style={{
                                                background: mostrarTags ? 'rgba(255,107,0,0.2)' : '#1a1a1a',
                                                border: `1px solid ${mostrarTags ? 'rgba(255,107,0,0.4)' : '#2a2a2a'}`,
                                                color: mostrarTags ? '#FF6B00' : '#aaa',
                                                padding: '7px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif'
                                            }}>
                                            🏷️ Tags
                                        </button>
                                        <button onClick={() => finalizarAtendimento(conversaSelecionada)} style={{ background: 'rgba(243,139,168,0.1)', border: '1px solid rgba(243,139,168,0.3)', color: '#f38ba8', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                                            Finalizar atendimento
                                        </button>
                                    </div>
                                </div>

                                {/* PAINEL TAGS */}
                                {mostrarTags && (
                                    <div style={{ padding: '10px 20px', background: '#0f0f0f', borderBottom: '1px solid #1e1e1e', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
                                        <span style={{ color: '#555', fontSize: '11px', marginRight: '4px' }}>Tags:</span>
                                        {tagsDisponiveis.map(tag => {
                                            const ativa = tagsAtual.includes(tag.id)
                                            return (
                                                <button key={tag.id} onClick={() => toggleTag(conversaSelecionada, tag.id)}
                                                    style={{ background: ativa ? tag.bg : 'transparent', border: `1px solid ${ativa ? tag.cor : '#2a2a2a'}`, color: ativa ? tag.cor : '#555', padding: '4px 10px', borderRadius: '20px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                                                    {ativa ? '✓ ' : ''}{tag.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}

                                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#0d0d0d' }}>
                                    {msgAtual.map(msg => (
                                        <div key={msg.id} style={{ display: 'flex', justifyContent: msg.tipo === 'recebida' ? 'flex-start' : 'flex-end' }}>
                                            <div style={{
                                                maxWidth: '60%', padding: '10px 14px',
                                                borderRadius: msg.tipo === 'recebida' ? '0 12px 12px 12px' : '12px 0 12px 12px',
                                                background: msg.tipo === 'recebida' ? '#1a1a1a' : '#FF6B00',
                                                color: msg.tipo === 'recebida' ? '#ddd' : 'white',
                                                fontSize: '13px', lineHeight: 1.5,
                                            }}>
                                                {msg.mensagem}
                                                <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px', textAlign: 'right' }}>{formatarHora(msg.horario)}</div>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={mensagensEndRef} />
                                </div>

                                {/* INPUT */}
                                <div style={{ background: '#111', borderTop: '1px solid #1e1e1e', flexShrink: 0 }}>

                                    {/* Respostas rápidas */}
                                    {mostrarRespostas && (
                                        <div style={{ padding: '10px 20px', borderBottom: '1px solid #1e1e1e', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {respostasRapidas.map((r, i) => (
                                                <button key={i} onClick={() => { setNovaMensagem(r.texto); setMostrarRespostas(false) }}
                                                    style={{ background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.25)', color: '#FF6B00', padding: '5px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                                                    ⚡ {r.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div style={{ padding: '14px 20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        {/* Botão Respostas Rápidas */}
                                        <button onClick={() => { setMostrarRespostas(!mostrarRespostas); setMostrarTags(false) }}
                                            style={{ width: '36px', height: '36px', borderRadius: '50%', background: mostrarRespostas ? '#FF6B00' : '#1a1a1a', border: '1px solid #2a2a2a', color: mostrarRespostas ? 'white' : '#555', cursor: 'pointer', fontSize: '14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            ⚡
                                        </button>
                                        <input
                                            placeholder={enviando ? 'Enviando...' : 'Digite uma mensagem...'}
                                            value={novaMensagem}
                                            disabled={enviando}
                                            onChange={e => setNovaMensagem(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && enviarMensagem()}
                                            style={{ flex: 1, padding: '11px 16px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '24px', color: 'white', fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif' }}
                                        />
                                        <button onClick={enviarMensagem} disabled={enviando}
                                            style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#FF6B00', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0, opacity: enviando ? 0.6 : 1 }}>
                                            ➤
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* VIEW KANBAN */}
            {view === 'kanban' && contatos.length > 0 && (
                <div style={{ flex: 1, overflowX: 'auto', padding: '24px', display: 'flex', gap: '16px' }}>
                    {colunas.map(col => {
                        const cards = contatos.filter(c => c.etapa === col.id)
                        const bg = hexParaRgba(col.cor, 0.08)
                        const borda = hexParaRgba(col.cor, 0.2)
                        return (
                            <div key={col.id} style={{ minWidth: '280px', maxWidth: '280px', background: bg, border: `1px solid ${borda}`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: col.cor, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>{col.label}</span>
                                    <span style={{ background: borda, color: col.cor, borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>{cards.length}</span>
                                </div>
                                {cards.map(c => {
                                    const tags = tagsPorContato[c.telefone] || []
                                    return (
                                        <div key={c.telefone} onClick={() => { setConversaSelecionada(c.telefone); setView('conversas') }}
                                            style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '12px', cursor: 'pointer' }}>
                                            <div style={{ color: c.nome ? 'white' : '#999', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{c.nome || c.telefone}</div>
                                            <div style={{ color: '#666', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '8px' }}>{c.ultimaMensagem}</div>
                                            {tags.length > 0 && (
                                                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                                    {tags.map(tagId => {
                                                        const tag = tagsDisponiveis.find(t => t.id === tagId)
                                                        return tag ? <span key={tagId} style={{ fontSize: '8px', color: tag.cor, background: tag.bg, padding: '1px 5px', borderRadius: '8px', fontWeight: 600 }}>{tag.label}</span> : null
                                                    })}
                                                </div>
                                            )}
                                            <select value={c.etapa} onChange={e => { e.stopPropagation(); moverEtapa(c.telefone, e.target.value) }} onClick={e => e.stopPropagation()}
                                                style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '6px', color: 'white', padding: '5px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                                                {colunas.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
                                            </select>
                                        </div>
                                    )
                                })}
                                {cards.length === 0 && <div style={{ color: '#333', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>Nenhum lead</div>}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
