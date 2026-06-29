'use client'
import { useState, useRef, useEffect } from 'react'

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

const colunas = [
    { id: 'novo', label: 'Novo', cor: '#74c7ec', bg: 'rgba(116,199,236,0.08)', borda: 'rgba(116,199,236,0.2)' },
    { id: 'em_atendimento', label: 'Em Atendimento', cor: '#f9e2af', bg: 'rgba(249,226,175,0.08)', borda: 'rgba(249,226,175,0.2)' },
    { id: 'proposta', label: 'Proposta Enviada', cor: '#FF6B00', bg: 'rgba(255,107,0,0.08)', borda: 'rgba(255,107,0,0.2)' },
    { id: 'convertido', label: 'Convertido', cor: '#22c55e', bg: 'rgba(34,197,94,0.08)', borda: 'rgba(34,197,94,0.2)' },
    { id: 'perdido', label: 'Perdido', cor: '#f38ba8', bg: 'rgba(243,139,168,0.08)', borda: 'rgba(243,139,168,0.2)' },
]

type MensagemAirtable = {
    id: string
    telefone: string
    mensagem: string
    tipo: 'enviada' | 'recebida'
    horario: string
    empresa: string
    nomeContato?: string | null
    statusContato?: string | null
}

type Contato = {
    id: string // usamos o telefone como id único do contato
    nome: string
    temNome: boolean
    telefone: string
    ultimaMensagem: string
    horario: string
    naoLidas: number
    status: string
    etapa: string
}

type MensagemView = {
    id: string
    texto: string
    tipo: 'enviada' | 'recebida' | 'ia'
    horario: string
    midia?: { tipo: string; url: string; nome: string }
}

function formatarHora(iso: string) {
    try {
        return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } catch {
        return iso
    }
}

export default function WhatsApp() {
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState<string | null>(null)
    const [mensagensRaw, setMensagensRaw] = useState<MensagemAirtable[]>([])
    const [contatos, setContatos] = useState<Contato[]>([])
    const [etapasPorTelefone, setEtapasPorTelefone] = useState<Record<string, string>>({})
    const [conversaSelecionada, setConversaSelecionada] = useState<Contato | null>(null)
    const [novaMensagem, setNovaMensagem] = useState('')
    const [busca, setBusca] = useState('')
    const [iaAtiva, setIaAtiva] = useState(true)
    const [view, setView] = useState<'conversas' | 'kanban'>('conversas')
    const [dragId, setDragId] = useState<string | null>(null)
    const [mostrarRespostas, setMostrarRespostas] = useState(false)
    const [mostrarTags, setMostrarTags] = useState(false)
    const [tagsPorContato, setTagsPorContato] = useState<Record<string, string[]>>({})
    const [mostrarMidia, setMostrarMidia] = useState(false)
    const [gravandoAudio, setGravandoAudio] = useState(false)
    const [enviando, setEnviando] = useState(false)
    const [cadastrando, setCadastrando] = useState(false)
    const [nomeParaCadastro, setNomeParaCadastro] = useState('')
    const [mostrarCadastro, setMostrarCadastro] = useState(false)

    const inputFotoRef = useRef<HTMLInputElement>(null)
    const inputVideoRef = useRef<HTMLInputElement>(null)
    const inputArquivoRef = useRef<HTMLInputElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const mensagensEndRef = useRef<HTMLDivElement>(null)

    const horarioAtual = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    // Busca mensagens do Airtable e monta a lista de contatos agrupando por telefone
    async function carregarMensagens() {
        try {
            setCarregando(true)
            setErro(null)
            const res = await fetch('/api/whatsapp/mensagens')
            const data = await res.json()
            if (!Array.isArray(data)) {
                setErro('Não foi possível carregar as mensagens.')
                setCarregando(false)
                return
            }
            setMensagensRaw(data)

            // Agrupa por telefone para montar a lista de contatos
            const porTelefone = new Map<string, MensagemAirtable[]>()
            data.forEach((m: MensagemAirtable) => {
                if (!m.telefone) return
                if (!porTelefone.has(m.telefone)) porTelefone.set(m.telefone, [])
                porTelefone.get(m.telefone)!.push(m)
            })

            const novosContatos: Contato[] = []
            porTelefone.forEach((msgs, telefone) => {
                const ordenadas = [...msgs].sort((a, b) => new Date(a.horario).getTime() - new Date(b.horario).getTime())
                const ultima = ordenadas[ordenadas.length - 1]
                const nomeReal = ordenadas.find(m => m.nomeContato)?.nomeContato
                const statusReal = ordenadas.find(m => m.statusContato)?.statusContato
                novosContatos.push({
                    id: telefone,
                    nome: nomeReal || telefone,
                    temNome: Boolean(nomeReal),
                    telefone,
                    ultimaMensagem: ultima?.mensagem || '',
                    horario: ultima ? formatarHora(ultima.horario) : '',
                    naoLidas: 0,
                    status: statusReal || 'offline',
                    etapa: etapasPorTelefone[telefone] || 'novo',
                })
            })

            // Ordena pelo mais recente
            novosContatos.sort((a, b) => (a.horario < b.horario ? 1 : -1))

            setContatos(novosContatos)
            if (novosContatos.length > 0 && !conversaSelecionada) {
                setConversaSelecionada(novosContatos[0])
            }
            setCarregando(false)
        } catch (e: any) {
            setErro('Erro ao carregar mensagens: ' + e.message)
            setCarregando(false)
        }
    }

    useEffect(() => {
        carregarMensagens()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    useEffect(() => {
        mensagensEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [mensagensRaw])

    async function enviarMensagem() {
        if (!novaMensagem.trim() || !conversaSelecionada) return
        const texto = novaMensagem
        setNovaMensagem('')
        setEnviando(true)

        // Atualiza tela imediatamente (otimista)
        const otimista: MensagemAirtable = {
            id: 'temp-' + Date.now(),
            telefone: conversaSelecionada.telefone,
            mensagem: texto,
            tipo: 'enviada',
            horario: new Date().toISOString(),
            empresa: '',
        }
        setMensagensRaw(prev => [...prev, otimista])

        try {
            // 1. Envia de fato via WhatsApp (Meta)
            await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telefone: conversaSelecionada.telefone, mensagem: texto }),
            })

            // 2. Salva no Airtable como histórico
            await fetch('/api/whatsapp/mensagens', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telefone: conversaSelecionada.telefone, mensagem: texto, tipo: 'enviada' }),
            })

            // 3. Recarrega para refletir o estado real do Airtable
            await carregarMensagens()
        } catch (e) {
            setErro('Falha ao enviar mensagem.')
        } finally {
            setEnviando(false)
        }
    }

    // Sobe o arquivo para o Vercel Blob (via /api/whatsapp/upload) e devolve a URL pública
    async function subirArquivo(arquivo: File | Blob, nomeArquivo: string): Promise<string | null> {
        try {
            const formData = new FormData()
            formData.append('file', arquivo, nomeArquivo)
            const res = await fetch('/api/whatsapp/upload', { method: 'POST', body: formData })
            const data = await res.json()
            if (data.success) return data.url
            setErro('Falha ao subir arquivo: ' + (data.error || 'erro desconhecido'))
            return null
        } catch (e: any) {
            setErro('Falha ao subir arquivo: ' + e.message)
            return null
        }
    }

    async function enviarMidia(arquivo: File) {
        if (!conversaSelecionada) return
        setMostrarMidia(false)
        setEnviando(true)

        const tipoMeta = arquivo.type.startsWith('image/') ? 'image' : arquivo.type.startsWith('video/') ? 'video' : 'document'
        const tipoLabel = tipoMeta === 'image' ? 'imagem' : tipoMeta === 'video' ? 'video' : 'arquivo'

        try {
            const urlPublica = await subirArquivo(arquivo, arquivo.name)
            if (!urlPublica) return

            await fetch('/api/whatsapp/send-media', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telefone: conversaSelecionada.telefone, mediaUrl: urlPublica, tipo: tipoMeta, nomeArquivo: arquivo.name }),
            })

            await fetch('/api/whatsapp/mensagens', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telefone: conversaSelecionada.telefone, mensagem: '[' + tipoLabel + '] ' + urlPublica, tipo: 'enviada' }),
            })

            await carregarMensagens()
        } catch (e: any) {
            setErro('Falha ao enviar mídia: ' + e.message)
        } finally {
            setEnviando(false)
        }
    }

    async function toggleAudio() {
        if (gravandoAudio) {
            mediaRecorderRef.current?.stop()
            setGravandoAudio(false)
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                const mediaRecorder = new MediaRecorder(stream)
                mediaRecorderRef.current = mediaRecorder
                audioChunksRef.current = []
                mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
                mediaRecorder.onstop = async () => {
                    stream.getTracks().forEach(t => t.stop())
                    if (!conversaSelecionada) return

                    const mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : MediaRecorder.isTypeSupported('audio/ogg') ? 'audio/ogg' : 'audio/webm'
                    const extensao = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm'
                    const blob = new Blob(audioChunksRef.current, { type: mimeType })

                    setEnviando(true)
                    try {
                        const urlPublica = await subirArquivo(blob, 'audio-' + Date.now() + '.' + extensao)
                        if (!urlPublica) return

                        await fetch('/api/whatsapp/send-media', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ telefone: conversaSelecionada.telefone, mediaUrl: urlPublica, tipo: 'audio' }),
                        })

                        await fetch('/api/whatsapp/mensagens', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ telefone: conversaSelecionada.telefone, mensagem: '[audio] ' + urlPublica, tipo: 'enviada' }),
                        })

                        await carregarMensagens()
                    } catch (e: any) {
                        setErro('Falha ao enviar áudio: ' + e.message)
                    } finally {
                        setEnviando(false)
                    }
                }
                mediaRecorder.start()
                setGravandoAudio(true)
            } catch {
                alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.')
            }
        }
    }

    async function cadastrarContato() {
        if (!conversaSelecionada || !nomeParaCadastro.trim()) return
        setCadastrando(true)
        try {
            await fetch('/api/contatos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: nomeParaCadastro, telefone: conversaSelecionada.telefone, empresa: '' }),
            })
            setMostrarCadastro(false)
            setNomeParaCadastro('')
            await carregarMensagens()
        } catch {
            setErro('Falha ao cadastrar contato.')
        } finally {
            setCadastrando(false)
        }
    }

    function moverParaColuna(telefone: string, novaEtapa: string) {
        setEtapasPorTelefone(prev => ({ ...prev, [telefone]: novaEtapa }))
        setContatos(prev => prev.map(c => c.id === telefone ? { ...c, etapa: novaEtapa } : c))
        if (conversaSelecionada?.id === telefone) {
            setConversaSelecionada(prev => prev ? { ...prev, etapa: novaEtapa } : prev)
        }
    }

    function toggleTag(contatoId: string, tagId: string) {
        setTagsPorContato(prev => {
            const atual = prev[contatoId] || []
            const novas = atual.includes(tagId) ? atual.filter(t => t !== tagId) : [...atual, tagId]
            return { ...prev, [contatoId]: novas }
        })
    }

    const conversasFiltradas = contatos.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()) || c.telefone.includes(busca))

    // Detecta se a mensagem é uma mídia salva com prefixo [tipo] e extrai a URL
    function extrairMidia(texto: string | null | undefined): { tipo: string; url: string; nome: string } | null {
        if (!texto) return null
        const match = texto.match(/^\[(audio|imagem|video|arquivo)\]\s*(.+)$/)
        if (!match) return null
        const tipoBruto = match[1]
        const conteudo = match[2]
        const tipo = tipoBruto === 'imagem' ? 'imagem' : tipoBruto === 'video' ? 'video' : tipoBruto === 'audio' ? 'audio' : 'arquivo'
        return { tipo, url: conteudo, nome: conteudo.split('/').pop() || 'arquivo' }
    }

    const msgAtual: MensagemView[] = conversaSelecionada
        ? mensagensRaw
            .filter(m => m.telefone === conversaSelecionada.telefone)
            .sort((a, b) => new Date(a.horario).getTime() - new Date(b.horario).getTime())
            .map(m => {
                const midia = extrairMidia(m.mensagem)
                return {
                    id: m.id,
                    texto: midia ? '' : m.mensagem,
                    tipo: m.tipo,
                    horario: formatarHora(m.horario),
                    midia: midia || undefined,
                }
            })
        : []

    const etapaAtual = conversaSelecionada?.etapa || 'novo'
    const tagsAtual = conversaSelecionada ? (tagsPorContato[conversaSelecionada.id] || []) : []

    const btnStyle = (ativo?: boolean): React.CSSProperties => ({
        background: ativo ? 'rgba(255,107,0,0.2)' : '#1a1a1a',
        border: `1px solid ${ativo ? 'rgba(255,107,0,0.4)' : '#2a2a2a'}`,
        color: ativo ? '#FF6B00' : '#aaa',
        padding: '5px 10px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '11px',
        fontFamily: 'Arial',
    })

    if (carregando) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', height: '100vh', background: '#0a0a0a', fontFamily: 'Arial' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid #1a1a1a', borderTopColor: '#FF6B00', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ color: '#555', fontSize: '13px' }}>Carregando conversas...</span>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0a', fontFamily: 'Arial, sans-serif' }}>

            {/* TOP BAR */}
            <div style={{ background: '#111', borderBottom: '1px solid #1e1e1e', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <a href="/" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textDecoration: 'none' }}>← Voltar ao Dashboard</a>
                    <span style={{ color: '#FF6B00', fontSize: '16px', fontWeight: 800 }}>
                        Flow<span style={{ color: 'white' }}>SMS</span>
                        <span style={{ color: '#555', fontWeight: 400, fontSize: '14px' }}> — WhatsApp</span>
                    </span>
                    {erro && <span style={{ color: '#f38ba8', fontSize: '11px' }}>{erro}</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={carregarMensagens} style={btnStyle()}>🔄 Atualizar</button>
                    <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: '8px', padding: '3px', gap: '2px' }}>
                        <button onClick={() => setView('conversas')} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: view === 'conversas' ? '#FF6B00' : 'transparent', color: view === 'conversas' ? 'white' : '#555', fontFamily: 'Arial' }}>
                            💬 Conversas
                        </button>
                        <button onClick={() => setView('kanban')} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: view === 'kanban' ? '#FF6B00' : 'transparent', color: view === 'kanban' ? 'white' : '#555', fontFamily: 'Arial' }}>
                            📋 Kanban
                        </button>
                    </div>
                    <div onClick={() => setIaAtiva(!iaAtiva)} style={{ background: iaAtiva ? '#22c55e22' : '#55555522', color: iaAtiva ? '#22c55e' : '#555', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${iaAtiva ? '#22c55e33' : '#33333333'}` }}>
                        {iaAtiva ? '🤖 IA Ativa' : '👤 Manual'}
                    </div>
                </div>
            </div>

            {contatos.length === 0 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#555', fontFamily: 'Arial' }}>
                    <div style={{ fontSize: '36px', opacity: 0.4 }}>💬</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#777' }}>Nenhuma conversa ainda</div>
                    <div style={{ fontSize: '12px', color: '#444' }}>As mensagens aparecerão aqui quando alguém escrever no WhatsApp.</div>
                </div>
            )}

            {/* VIEW CONVERSAS */}
            {view === 'conversas' && contatos.length > 0 && conversaSelecionada && (
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                    {/* SIDEBAR */}
                    <div style={{ width: '320px', background: '#111', borderRight: '1px solid #1e1e1e', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e1e' }}>
                            <input placeholder="🔍 Buscar conversa..." value={busca} onChange={e => setBusca(e.target.value)}
                                style={{ width: '100%', padding: '8px 12px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '20px', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {conversasFiltradas.map(c => {
                                const col = colunas.find(k => k.id === c.etapa)
                                const tags = tagsPorContato[c.id] || []
                                return (
                                    <div key={c.id} onClick={() => setConversaSelecionada(c)}
                                        style={{ padding: '12px 16px', borderBottom: '1px solid #161616', cursor: 'pointer', background: conversaSelecionada.id === c.id ? '#1a1a1a' : 'transparent', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                        <div style={{ position: 'relative', flexShrink: 0 }}>
                                            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: c.temNome ? '#FF6B0033' : '#33333355', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: c.temNome ? '16px' : '18px', fontWeight: 700, color: c.temNome ? '#FF6B00' : '#777' }}>{c.temNome ? c.nome[0] : '👤'}</div>
                                            <div style={{ position: 'absolute', bottom: '1px', right: '1px', width: '9px', height: '9px', borderRadius: '50%', background: c.status === 'online' ? '#22c55e' : '#555', border: '2px solid #111' }} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                                <span style={{ color: c.temNome ? 'white' : '#999', fontSize: '13px', fontWeight: 600, fontStyle: c.temNome ? 'normal' : 'italic' }}>{c.temNome ? c.nome : c.telefone}</span>
                                                <span style={{ color: '#555', fontSize: '10px' }}>{c.horario}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                <span style={{ color: '#666', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>{c.ultimaMensagem}</span>
                                                <div style={{ display: 'flex', gap: '3px' }}>
                                                    {col && <span style={{ fontSize: '8px', color: col.cor, background: col.bg, padding: '1px 5px', borderRadius: '8px' }}>{col.label}</span>}
                                                    {c.naoLidas > 0 && <span style={{ background: '#22c55e', color: 'white', borderRadius: '50%', width: '15px', height: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700 }}>{c.naoLidas}</span>}
                                                </div>
                                            </div>
                                            {tags.length > 0 && (
                                                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                                                    {tags.map(tagId => {
                                                        const tag = tagsDisponiveis.find(t => t.id === tagId)
                                                        return tag ? <span key={tagId} style={{ fontSize: '8px', color: tag.cor, background: tag.bg, padding: '1px 5px', borderRadius: '8px', fontWeight: 600 }}>{tag.label}</span> : null
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* CONVERSA */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                        {/* HEADER */}
                        <div style={{ padding: '12px 20px', borderBottom: '1px solid #1e1e1e', background: '#111', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: conversaSelecionada.temNome ? '#FF6B0033' : '#33333355', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: conversaSelecionada.temNome ? '14px' : '16px', fontWeight: 700, color: conversaSelecionada.temNome ? '#FF6B00' : '#777' }}>{conversaSelecionada.temNome ? conversaSelecionada.nome[0] : '👤'}</div>
                                <div>
                                    <div style={{ color: conversaSelecionada.temNome ? 'white' : '#999', fontSize: '14px', fontWeight: 600, fontStyle: conversaSelecionada.temNome ? 'normal' : 'italic' }}>
                                        {conversaSelecionada.temNome ? conversaSelecionada.nome : 'Sem cadastro'}
                                    </div>
                                    <div style={{ color: '#555', fontSize: '11px' }}>{conversaSelecionada.telefone}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <select value={etapaAtual} onChange={e => moverParaColuna(conversaSelecionada.id, e.target.value)}
                                    style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '6px', color: 'white', padding: '5px 8px', fontSize: '11px', cursor: 'pointer', outline: 'none', fontFamily: 'Arial' }}>
                                    {colunas.map(col => <option key={col.id} value={col.id}>{col.label}</option>)}
                                </select>
                                {!conversaSelecionada.temNome && (
                                    <button onClick={() => { setMostrarCadastro(!mostrarCadastro); setMostrarTags(false); setMostrarRespostas(false); setMostrarMidia(false) }}
                                        style={{ ...btnStyle(mostrarCadastro), color: '#22c55e', border: '1px solid rgba(34,197,94,0.4)' }}>
                                        ➕ Cadastrar
                                    </button>
                                )}
                                <button onClick={() => { setMostrarTags(!mostrarTags); setMostrarRespostas(false); setMostrarMidia(false) }} style={btnStyle(mostrarTags)}>🏷️ Tags</button>
                                <button style={btnStyle()}>📞 Ligar</button>
                                <button onClick={() => setIaAtiva(!iaAtiva)} style={{ ...btnStyle(iaAtiva), background: iaAtiva ? '#FF6B00' : '#1a1a1a', color: 'white' }}>
                                    {iaAtiva ? '🤖 IA ON' : '👤 Manual'}
                                </button>
                            </div>
                        </div>

                        {/* PAINEL CADASTRO DE CONTATO */}
                        {mostrarCadastro && (
                            <div style={{ padding: '10px 20px', background: '#0f0f0f', borderBottom: '1px solid #1e1e1e', display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                                <span style={{ color: '#555', fontSize: '11px' }}>Nome:</span>
                                <input
                                    value={nomeParaCadastro}
                                    onChange={e => setNomeParaCadastro(e.target.value)}
                                    placeholder="Nome do contato"
                                    onKeyDown={e => e.key === 'Enter' && cadastrarContato()}
                                    style={{ flex: 1, maxWidth: '240px', padding: '6px 12px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Arial' }}
                                />
                                <button onClick={cadastrarContato} disabled={cadastrando || !nomeParaCadastro.trim()}
                                    style={{ background: '#22c55e', border: 'none', color: 'white', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: 'Arial', opacity: cadastrando || !nomeParaCadastro.trim() ? 0.5 : 1 }}>
                                    {cadastrando ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        )}

                        {/* PAINEL TAGS */}
                        {mostrarTags && (
                            <div style={{ padding: '10px 20px', background: '#0f0f0f', borderBottom: '1px solid #1e1e1e', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
                                <span style={{ color: '#555', fontSize: '11px', marginRight: '4px' }}>Tags:</span>
                                {tagsDisponiveis.map(tag => {
                                    const ativa = tagsAtual.includes(tag.id)
                                    return (
                                        <button key={tag.id} onClick={() => toggleTag(conversaSelecionada.id, tag.id)}
                                            style={{ background: ativa ? tag.bg : 'transparent', border: `1px solid ${ativa ? tag.cor : '#2a2a2a'}`, color: ativa ? tag.cor : '#555', padding: '4px 10px', borderRadius: '20px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: 'Arial' }}>
                                            {ativa ? '✓ ' : ''}{tag.label}
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {/* MENSAGENS */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#0d0d0d' }}>
                            {msgAtual.map(msg => (
                                <div key={msg.id} style={{ display: 'flex', justifyContent: msg.tipo === 'recebida' ? 'flex-start' : 'flex-end' }}>
                                    {msg.tipo === 'ia' && <div style={{ fontSize: '11px', color: '#22c55e', marginRight: '6px', alignSelf: 'flex-end', marginBottom: '4px' }}>🤖</div>}
                                    <div style={{
                                        maxWidth: '60%', padding: '10px 14px',
                                        borderRadius: msg.tipo === 'recebida' ? '0 12px 12px 12px' : '12px 0 12px 12px',
                                        background: msg.tipo === 'recebida' ? '#1a1a1a' : msg.tipo === 'ia' ? '#22c55e22' : '#FF6B00',
                                        color: msg.tipo === 'recebida' ? '#ddd' : msg.tipo === 'ia' ? '#22c55e' : 'white',
                                        fontSize: '13px', lineHeight: 1.5,
                                        border: msg.tipo === 'ia' ? '1px solid #22c55e33' : 'none'
                                    }}>
                                        {msg.midia ? (
                                            <div>
                                                {msg.midia.tipo === 'imagem' && <img src={msg.midia.url} alt="foto" style={{ maxWidth: '200px', borderRadius: '8px', display: 'block' }} />}
                                                {msg.midia.tipo === 'video' && <video src={msg.midia.url} controls style={{ maxWidth: '200px', borderRadius: '8px', display: 'block' }} />}
                                                {msg.midia.tipo === 'audio' && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                                            <span>🎙️</span>
                                                            <span style={{ fontSize: '11px', opacity: 0.7 }}>Áudio</span>
                                                        </div>
                                                        {msg.midia.url && <audio src={msg.midia.url} controls style={{ maxWidth: '220px', height: '36px' }} preload="auto" />}
                                                    </div>
                                                )}
                                                {msg.midia.tipo === 'arquivo' && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span>📎</span>
                                                        <a href={msg.midia.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'inherit' }}>{msg.midia.nome}</a>
                                                    </div>
                                                )}
                                            </div>
                                        ) : msg.texto}
                                        <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px', textAlign: 'right' }}>{msg.horario}</div>
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
                                            style={{ background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.25)', color: '#FF6B00', padding: '5px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: 'Arial' }}>
                                            ⚡ {r.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Mídia */}
                            {mostrarMidia && (
                                <div style={{ padding: '10px 20px', borderBottom: '1px solid #1e1e1e', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button onClick={() => inputFotoRef.current?.click()}
                                        style={{ background: 'rgba(116,199,236,0.1)', border: '1px solid rgba(116,199,236,0.3)', color: '#74c7ec', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Arial', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        📷 Foto
                                    </button>
                                    <button onClick={() => inputVideoRef.current?.click()}
                                        style={{ background: 'rgba(249,226,175,0.1)', border: '1px solid rgba(249,226,175,0.3)', color: '#f9e2af', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Arial', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        🎥 Vídeo
                                    </button>
                                    <button onClick={() => inputArquivoRef.current?.click()}
                                        style={{ background: 'rgba(166,227,161,0.1)', border: '1px solid rgba(166,227,161,0.3)', color: '#a6e3a1', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Arial', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        📎 Arquivo
                                    </button>
                                    <button onClick={toggleAudio}
                                        style={{ background: gravandoAudio ? 'rgba(243,139,168,0.2)' : 'rgba(243,139,168,0.1)', border: `1px solid ${gravandoAudio ? '#f38ba8' : 'rgba(243,139,168,0.3)'}`, color: '#f38ba8', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Arial', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {gravandoAudio ? '⏹️ Parar' : '🎙️ Áudio'}
                                    </button>
                                    {gravandoAudio && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f38ba8', fontSize: '12px' }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f38ba8', animation: 'pulse 1s infinite' }} />
                                            Gravando...
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Inputs ocultos */}
                            <input ref={inputFotoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && enviarMidia(e.target.files[0])} />
                            <input ref={inputVideoRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && enviarMidia(e.target.files[0])} />
                            <input ref={inputArquivoRef} type="file" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && enviarMidia(e.target.files[0])} />

                            <div style={{ padding: '14px 20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {iaAtiva && (
                                    <div style={{ background: '#22c55e22', border: '1px solid #22c55e33', color: '#22c55e', padding: '5px 10px', borderRadius: '20px', fontSize: '10px', whiteSpace: 'nowrap' }}>
                                        🤖 IA respondendo
                                    </div>
                                )}
                                {/* Botão Mídia */}
                                <button onClick={() => { setMostrarMidia(!mostrarMidia); setMostrarRespostas(false); setMostrarTags(false) }}
                                    style={{ width: '36px', height: '36px', borderRadius: '50%', background: mostrarMidia ? '#FF6B00' : '#1a1a1a', border: '1px solid #2a2a2a', color: mostrarMidia ? 'white' : '#555', cursor: 'pointer', fontSize: '16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    📎
                                </button>
                                {/* Botão Respostas Rápidas */}
                                <button onClick={() => { setMostrarRespostas(!mostrarRespostas); setMostrarMidia(false); setMostrarTags(false) }}
                                    style={{ width: '36px', height: '36px', borderRadius: '50%', background: mostrarRespostas ? '#FF6B00' : '#1a1a1a', border: '1px solid #2a2a2a', color: mostrarRespostas ? 'white' : '#555', cursor: 'pointer', fontSize: '14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    ⚡
                                </button>
                                <input
                                    placeholder={enviando ? 'Enviando...' : 'Digite uma mensagem...'}
                                    value={novaMensagem}
                                    disabled={enviando}
                                    onChange={e => setNovaMensagem(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && enviarMensagem()}
                                    style={{ flex: 1, padding: '11px 16px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '24px', color: 'white', fontSize: '13px', outline: 'none', fontFamily: 'Arial' }}
                                />
                                <button onClick={enviarMensagem} disabled={enviando}
                                    style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#FF6B00', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0, opacity: enviando ? 0.6 : 1 }}>
                                    ➤
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW KANBAN */}
            {view === 'kanban' && contatos.length > 0 && (
                <div style={{ flex: 1, overflowX: 'auto', padding: '24px', display: 'flex', gap: '16px' }}>
                    {colunas.map(col => {
                        const cards = contatos.filter(c => c.etapa === col.id)
                        return (
                            <div key={col.id}
                                onDragOver={e => e.preventDefault()}
                                onDrop={() => { if (dragId !== null) { moverParaColuna(dragId, col.id); setDragId(null) } }}
                                style={{ minWidth: '240px', maxWidth: '240px', background: col.bg, border: `1px solid ${col.borda}`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <span style={{ color: col.cor, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{col.label}</span>
                                    <span style={{ background: col.borda, color: col.cor, borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>{cards.length}</span>
                                </div>
                                {cards.map(c => {
                                    const tags = tagsPorContato[c.id] || []
                                    return (
                                        <div key={c.id} draggable onDragStart={() => setDragId(c.id)}
                                            onClick={() => { setConversaSelecionada(c); setView('conversas') }}
                                            style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '12px', cursor: 'grab' }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                                                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: c.temNome ? '#FF6B0033' : '#33333355', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: c.temNome ? '12px' : '14px', fontWeight: 700, color: c.temNome ? '#FF6B00' : '#777', flexShrink: 0 }}>{c.temNome ? c.nome[0] : '👤'}</div>
                                                <div>
                                                    <div style={{ color: c.temNome ? 'white' : '#999', fontSize: '12px', fontWeight: 600, fontStyle: c.temNome ? 'normal' : 'italic' }}>{c.temNome ? c.nome : 'Sem cadastro'}</div>
                                                    <div style={{ color: '#555', fontSize: '10px' }}>{c.telefone}</div>
                                                </div>
                                            </div>
                                            <div style={{ color: '#666', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '6px' }}>{c.ultimaMensagem}</div>
                                            {tags.length > 0 && (
                                                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginBottom: '6px' }}>
                                                    {tags.map(tagId => {
                                                        const tag = tagsDisponiveis.find(t => t.id === tagId)
                                                        return tag ? <span key={tagId} style={{ fontSize: '8px', color: tag.cor, background: tag.bg, padding: '1px 5px', borderRadius: '8px', fontWeight: 600 }}>{tag.label}</span> : null
                                                    })}
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: '#444', fontSize: '10px' }}>{c.horario}</span>
                                                {c.naoLidas > 0 && <span style={{ background: '#22c55e', color: 'white', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700 }}>{c.naoLidas}</span>}
                                            </div>
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
