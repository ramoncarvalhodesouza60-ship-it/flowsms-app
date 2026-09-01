'use client'
import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import JarvasWidget from '@/components/JarvasWidget'

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

const colunasPadrao = [
    { id: 'novo', label: 'Novo', cor: '#74c7ec' },
    { id: 'em_atendimento', label: 'Em Atendimento', cor: '#f9e2af' },
    { id: 'proposta', label: 'Proposta Enviada', cor: '#FF6B00' },
    { id: 'convertido', label: 'Convertido', cor: '#22c55e' },
    { id: 'perdido', label: 'Perdido', cor: '#f38ba8' },
    { id: 'entregue', label: 'Entregue', cor: '#a78bfa' },
]

// Converte uma cor hex (#RRGGBB) em rgba com opacidade, para gerar fundo/borda das colunas dinamicamente
function hexParaRgba(hex: string, alpha: number): string {
    const limpo = hex.replace('#', '')
    const bigint = parseInt(limpo, 16)
    const r = (bigint >> 16) & 255
    const g = (bigint >> 8) & 255
    const b = bigint & 255
    return `rgba(${r},${g},${b},${alpha})`
}
type MensagemAirtable = {
    id: string
    telefone: string
    mensagem: string
    tipo: 'enviada' | 'recebida'
    horario: string
    empresa: string
    nomeContato?: string | null
    statusContato?: string | null
    etapaContato?: string | null
}

type Contato = {
    id: string
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

type ContatoCSV = {
    nome: string
    telefone: string
}

type ResultadoDisparo = {
    telefone: string
    sucesso: boolean
    erro?: string
}

function formatarHora(iso: string) {
    try {
        return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } catch {
        return iso
    }
}

// Normaliza telefone para o formato que a Meta espera: 5511999999999 (sem +, espaços ou símbolos)
function normalizarTelefone(raw: string): string {
    let limpo = raw.replace(/\D/g, '')
    if (limpo.length >= 10 && !limpo.startsWith('55')) {
        limpo = '55' + limpo
    }
    return limpo
}

export default function WhatsApp() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', color: '#555', fontFamily: 'Arial' }}>
                Carregando...
            </div>
        }>
            <WhatsAppConteudo />
        </Suspense>
    )
}

function WhatsAppConteudo() {
    const searchParams = useSearchParams()
    const empresaAtual = searchParams.get('empresa') || ''

    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState<string | null>(null)
    const [mensagensRaw, setMensagensRaw] = useState<MensagemAirtable[]>([])
    const [contatos, setContatos] = useState<Contato[]>([])
    const [etapasPorTelefone, setEtapasPorTelefone] = useState<Record<string, string>>({})
    const [conversaSelecionada, setConversaSelecionada] = useState<Contato | null>(null)
    const [novaMensagem, setNovaMensagem] = useState('')
    const [busca, setBusca] = useState('')
    const [iaAtiva, setIaAtiva] = useState(true)
    const [view, setView] = useState<'conversas' | 'kanban' | 'disparos'>('conversas')
    const [dragId, setDragId] = useState<string | null>(null)
    const [colunas, setColunas] = useState(colunasPadrao)
    const [colunasCarregadas, setColunasCarregadas] = useState(false)
    const [editandoColunas, setEditandoColunas] = useState(false)
    const [dragColunaId, setDragColunaId] = useState<string | null>(null)
    const [novaColunaLabel, setNovaColunaLabel] = useState('')
    const [mostrarRespostas, setMostrarRespostas] = useState(false)
    const [mostrarTags, setMostrarTags] = useState(false)
    const [tagsPorContato, setTagsPorContato] = useState<Record<string, string[]>>({})
    const [mostrarMidia, setMostrarMidia] = useState(false)
    const [gravandoAudio, setGravandoAudio] = useState(false)
    const [enviando, setEnviando] = useState(false)
    const [cadastrando, setCadastrando] = useState(false)
    const [nomeParaCadastro, setNomeParaCadastro] = useState('')
    const [mostrarCadastro, setMostrarCadastro] = useState(false)

    // ESTADOS DA TELA DE DISPAROS
    const [contatosCSV, setContatosCSV] = useState<ContatoCSV[]>([])
    const [nomeArquivoCSV, setNomeArquivoCSV] = useState('')
    const [templateName, setTemplateName] = useState('oferta_construcao')
    const [languageCode, setLanguageCode] = useState('pt_BR')
    const [quantidadeDisparo, setQuantidadeDisparo] = useState(100)
    const [jaEnviadosSet, setJaEnviadosSet] = useState<Set<string>>(new Set())
    const [historicoWA, setHistoricoWA] = useState<Set<string>>(new Set())
    const [mostrarRepetidosWA, setMostrarRepetidosWA] = useState(false)
    const [disparando, setDisparando] = useState(false)
    const [progressoAtual, setProgressoAtual] = useState(0)
    const [progressoTotal, setProgressoTotal] = useState(0)
    const [resultadosDisparo, setResultadosDisparo] = useState<ResultadoDisparo[]>([])
    const [erroDisparo, setErroDisparo] = useState<string | null>(null)

    const inputFotoRef = useRef<HTMLInputElement>(null)
    const inputVideoRef = useRef<HTMLInputElement>(null)
    const inputArquivoRef = useRef<HTMLInputElement>(null)
    const inputCSVRef = useRef<HTMLInputElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const mensagensEndRef = useRef<HTMLDivElement>(null)

    const horarioAtual = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    async function carregarColunas() {
        try {
            const res = await fetch('/api/kanban-colunas?empresa=' + encodeURIComponent(empresaAtual))
            const data = await res.json()
            if (data.success && Array.isArray(data.colunas) && data.colunas.length > 0) {
                setColunas(data.colunas)
            }
        } catch (e) {
            console.error('Erro ao carregar colunas:', e)
        }
        setColunasCarregadas(true)
    }

    async function salvarColunas(novasColunas: typeof colunasPadrao) {
        setColunas(novasColunas)
        try {
            await fetch('/api/kanban-colunas', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ empresa: empresaAtual, colunas: novasColunas }),
            })
        } catch (e) {
            console.error('Erro ao salvar colunas:', e)
        }
    }

    function adicionarColuna() {
        if (!novaColunaLabel.trim()) return
        const coresDisponiveis = ['#74c7ec', '#f9e2af', '#FF6B00', '#22c55e', '#f38ba8', '#a78bfa', '#fab387', '#94e2d5']
        const cor = coresDisponiveis[colunas.length % coresDisponiveis.length]
        const id = 'col_' + Date.now()
        salvarColunas([...colunas, { id, label: novaColunaLabel.trim(), cor }])
        setNovaColunaLabel('')
    }

    function renomearColuna(id: string, novoLabel: string) {
        salvarColunas(colunas.map(c => c.id === id ? { ...c, label: novoLabel } : c))
    }

    function mudarCorColuna(id: string, novaCor: string) {
        salvarColunas(colunas.map(c => c.id === id ? { ...c, cor: novaCor } : c))
    }

    function deletarColuna(id: string) {
        if (colunas.length <= 1) return
        salvarColunas(colunas.filter(c => c.id !== id))
    }

    function reordenarColunas(idArrastado: string, idAlvo: string) {
        if (idArrastado === idAlvo) return
        const lista = [...colunas]
        const indiceOrigem = lista.findIndex(c => c.id === idArrastado)
        const indiceDestino = lista.findIndex(c => c.id === idAlvo)
        if (indiceOrigem === -1 || indiceDestino === -1) return
        const [item] = lista.splice(indiceOrigem, 1)
        lista.splice(indiceDestino, 0, item)
        salvarColunas(lista)
    }

    // Liga/desliga a coluna como etapa de "conversão" (libera atendente + manda agradecimento automático)
    function toggleConversaoColuna(id: string) {
        salvarColunas(colunas.map((c: any) => c.id === id ? { ...c, ehConversao: !c.ehConversao } : c))
    }

    // Atualiza a mensagem de agradecimento personalizada dessa coluna de conversão (localmente, salva no blur)
    function mudarMensagemConversao(id: string, texto: string) {
        setColunas(prev => prev.map((c: any) => c.id === id ? { ...c, mensagemConversao: texto } : c) as typeof colunasPadrao)
    }

    // Salva a mensagem de conversão no Airtable só quando o campo perde o foco (evita salvar a cada letra digitada)
    function salvarMensagemConversao() {
        salvarColunas(colunas)
    }

    async function carregarMensagens(silencioso = false) {
        try {
            if (!silencioso) setCarregando(true)
            setErro(null)
            const res = await fetch('/api/whatsapp/mensagens?empresa=' + encodeURIComponent(empresaAtual))
            const data = await res.json()
            if (!Array.isArray(data)) {
                setErro('Não foi possível carregar as mensagens.')
                if (!silencioso) setCarregando(false)
                return
            }
            setMensagensRaw(data)

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
                // Usa etapa do Airtable se disponível, senão usa estado local, senão 'novo'
                const etapaAirtable = ordenadas.find(m => (m as any).etapaContato)?.etapaContato
                novosContatos.push({
                    id: telefone,
                    nome: nomeReal || telefone,
                    temNome: Boolean(nomeReal),
                    telefone,
                    ultimaMensagem: ultima?.mensagem || '',
                    horario: ultima ? formatarHora(ultima.horario) : '',
                    naoLidas: 0,
                    status: statusReal || 'offline',
                    etapa: etapasPorTelefone[telefone] || etapaAirtable || 'novo',
                })
            })

            if (!silencioso) {
                // Primeira carga: ordena normalmente, mais recente no topo
                novosContatos.sort((a, b) => (a.horario < b.horario ? 1 : -1))
                setContatos(novosContatos)
                if (novosContatos.length > 0 && !conversaSelecionada) {
                    setConversaSelecionada(novosContatos[0])
                }
            } else {
                // Atualização automática: NÃO reordena a lista (igual ao WhatsApp real) —
                // só atualiza os dados de cada contato existente e adiciona os novos no topo
                const mapaNovos = new Map(novosContatos.map(c => [c.id, c]))
                setContatos(prev => {
                    const idsAntigos = new Set(prev.map(c => c.id))
                    const atualizados = prev.map(c => mapaNovos.get(c.id) || c)
                    const novosDeVerdade = novosContatos.filter(c => !idsAntigos.has(c.id))
                    return [...novosDeVerdade, ...atualizados]
                })
                // Atualiza a conversa aberta (se houver) sem trocar a seleção
                setConversaSelecionada(prev => {
                    if (!prev) return prev
                    const atualizado = mapaNovos.get(prev.id)
                    return atualizado ? { ...prev, ultimaMensagem: atualizado.ultimaMensagem, horario: atualizado.horario, status: atualizado.status, etapa: atualizado.etapa, nome: atualizado.nome, temNome: atualizado.temNome } : prev
                })
            }
            if (!silencioso) setCarregando(false)
        } catch (e: any) {
            setErro('Erro ao carregar mensagens: ' + e.message)
            if (!silencioso) setCarregando(false)
        }
    }

    useEffect(() => {
        carregarMensagens()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [empresaAtual])

    // Atualiza as conversas automaticamente a cada 8 segundos, em segundo plano, sem travar a tela nem tirar você de onde está mexendo
    useEffect(() => {
        if (!empresaAtual) return
        const intervalo = setInterval(() => {
            carregarMensagens(true)
        }, 8000)
        return () => clearInterval(intervalo)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [empresaAtual])


    useEffect(() => {
        if (empresaAtual) carregarColunas()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [empresaAtual])

    useEffect(() => {
        if (empresaAtual) {
            fetch('/api/uso?empresa=' + encodeURIComponent(empresaAtual))
                .then(r => r.json())
                .then(data => {
                    if (data.success && data.whatsapp?.telefonesUsados) {
                        setHistoricoWA(new Set(data.whatsapp.telefonesUsados))
                    }
                })
                .catch(e => console.error('Erro ao carregar histórico WA:', e))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [empresaAtual])
    useEffect(() => {
        mensagensEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [mensagensRaw])

    useEffect(() => {
        if (empresaAtual) {
            fetch('/api/contatos/tags?empresa=' + encodeURIComponent(empresaAtual))
                .then(r => r.json())
                .then(data => { if (data.success) setTagsPorContato(data.tags) })
                .catch(e => console.error('Erro ao carregar tags:', e))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [empresaAtual])

    async function enviarMensagem() {
        if (!novaMensagem.trim() || !conversaSelecionada) return
        const texto = novaMensagem
        setNovaMensagem('')
        setEnviando(true)

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
            await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telefone: conversaSelecionada.telefone, mensagem: texto }),
            })

            await fetch('/api/whatsapp/mensagens', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telefone: conversaSelecionada.telefone, mensagem: texto, tipo: 'enviada', empresa: empresaAtual }),
            })

            await carregarMensagens(true)
        } catch (e) {
            setErro('Falha ao enviar mensagem.')
        } finally {
            setEnviando(false)
        }
    }

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
                body: JSON.stringify({ telefone: conversaSelecionada.telefone, mensagem: '[' + tipoLabel + '] ' + urlPublica, tipo: 'enviada', empresa: empresaAtual }),
            })

            await carregarMensagens(true)
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
                            body: JSON.stringify({ telefone: conversaSelecionada.telefone, mensagem: '[audio] ' + urlPublica, tipo: 'enviada', empresa: empresaAtual }),
                        })

                        await carregarMensagens(true)
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
            await carregarMensagens(true)
        } catch {
            setErro('Falha ao cadastrar contato.')
        } finally {
            setCadastrando(false)
        }
    }

    async function moverParaColuna(telefone: string, novaEtapa: string) {
        // Atualiza estado local imediatamente (otimista)
        setEtapasPorTelefone(prev => ({ ...prev, [telefone]: novaEtapa }))
        setContatos(prev => prev.map(c => c.id === telefone ? { ...c, etapa: novaEtapa } : c))
        if (conversaSelecionada?.id === telefone) {
            setConversaSelecionada(prev => prev ? { ...prev, etapa: novaEtapa } : prev)
        }

        // Salva no Airtable
        try {
            await fetch('/api/contatos/etapa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telefone, etapa: novaEtapa, empresa: empresaAtual }),
            })
        } catch (e) {
            console.error('Erro ao salvar etapa no Airtable:', e)
        }
    }

    function toggleTag(contatoId: string, tagId: string) {
        setTagsPorContato(prev => {
            const atual = prev[contatoId] || []
            const novas = atual.includes(tagId) ? atual.filter(t => t !== tagId) : [...atual, tagId]

            fetch('/api/contatos/tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telefone: contatoId, tags: novas }),
            }).catch(e => console.error('Erro ao salvar tags:', e))

            return { ...prev, [contatoId]: novas }
        })
    }

    // ===== FUNÇÕES DA TELA DE DISPAROS =====

    function processarCSV(texto: string): ContatoCSV[] {
        const linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0)
        const resultado: ContatoCSV[] = []

        for (let i = 0; i < linhas.length; i++) {
            const linha = linhas[i]
            // Pula cabeçalho se a primeira linha não tiver números
            if (i === 0 && !/\d/.test(linha)) continue

            const partes = linha.split(',').map(p => p.trim().replace(/^"|"$/g, ''))
            if (partes.length === 0) continue

            let nome = ''
            let telefoneRaw = ''

            if (partes.length >= 2) {
                nome = partes[0]
                telefoneRaw = partes[1]
            } else {
                telefoneRaw = partes[0]
                nome = ''
            }

            const telefone = normalizarTelefone(telefoneRaw)
            if (telefone.length >= 12) {
                resultado.push({ nome: nome || telefone, telefone })
            }
        }

        return resultado
    }

    function handleUploadCSV(arquivo: File) {
        setNomeArquivoCSV(arquivo.name)
        setErroDisparo(null)
        setResultadosDisparo([])
        const reader = new FileReader()
        reader.onload = (e) => {
            const texto = e.target?.result as string
            const lista = processarCSV(texto)
            if (lista.length === 0) {
                setErroDisparo('Nenhum contato válido encontrado no arquivo. Verifique o formato: Nome,Telefone')
                return
            }
            setContatosCSV(lista)
            if (lista.length < quantidadeDisparo) {
                setQuantidadeDisparo(lista.length)
            }
        }
        reader.onerror = () => setErroDisparo('Erro ao ler o arquivo CSV.')
        reader.readAsText(arquivo, 'UTF-8')
    }

    // Filtra os contatos que ainda não receberam disparo nesta sessão, até a quantidade selecionada
    function obterContatosParaDisparo(): ContatoCSV[] {
        const disponiveis = contatosCSV.filter(c => !todosJaEnviadosWA.has(c.telefone))
        return disponiveis.slice(0, quantidadeDisparo)
    }

    async function executarDisparo() {
        const lista = obterContatosParaDisparo()
        if (lista.length === 0) {
            setErroDisparo('Não há contatos novos disponíveis para disparo. Importe um novo CSV ou aumente a quantidade.')
            return
        }
        if (!templateName.trim()) {
            setErroDisparo('Informe o nome do template aprovado pela Meta.')
            return
        }

        setDisparando(true)
        setErroDisparo(null)
        setResultadosDisparo([])
        setProgressoTotal(lista.length)
        setProgressoAtual(0)

        const telefones = lista.map(c => c.telefone)

        try {
            const res = await fetch('/api/whatsapp/disparar-template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contatos: telefones, templateName, languageCode }),
            })
            const data = await res.json()

            if (data.success) {
                setResultadosDisparo(data.resultados || [])
                setProgressoAtual(lista.length)

                // Marca todos como enviados (sucesso ou falha) para não tentar de novo automaticamente
                setJaEnviadosSet(prev => {
                    const novo = new Set(prev)
                    telefones.forEach(t => novo.add(t))
                    return novo
                })
                setHistoricoWA(prev => {
                    const novo = new Set(prev)
                    telefones.forEach(t => novo.add(t))
                    return novo
                })
            } else {
                setErroDisparo(data.error || 'Erro ao disparar campanha.')
            }
        } catch (e: any) {
            setErroDisparo('Erro ao disparar: ' + e.message)
        } finally {
            setDisparando(false)
        }
    }

    function limparCampanha() {
        setContatosCSV([])
        setNomeArquivoCSV('')
        setResultadosDisparo([])
        setErroDisparo(null)
        setProgressoAtual(0)
        setProgressoTotal(0)
    }

    const conversasFiltradas = contatos.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()) || c.telefone.includes(busca))

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

    const todosJaEnviadosWA = new Set([...historicoWA, ...jaEnviadosSet])
    const disponiveisParaDisparo = contatosCSV.filter(c => !todosJaEnviadosWA.has(c.telefone)).length
    const repetidosWA = contatosCSV.filter(c => todosJaEnviadosWA.has(c.telefone))
    const enviadosNestaCampanha = resultadosDisparo.filter(r => r.sucesso).length
    const falhasNestaCampanha = resultadosDisparo.filter(r => !r.sucesso).length

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
                    <button onClick={() => carregarMensagens()} style={btnStyle()}>🔄 Atualizar</button>
                    <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: '8px', padding: '3px', gap: '2px' }}>
                        <button onClick={() => setView('conversas')} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: view === 'conversas' ? '#FF6B00' : 'transparent', color: view === 'conversas' ? 'white' : '#555', fontFamily: 'Arial' }}>
                            💬 Conversas
                        </button>
                        <button onClick={() => setView('kanban')} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: view === 'kanban' ? '#FF6B00' : 'transparent', color: view === 'kanban' ? 'white' : '#555', fontFamily: 'Arial' }}>
                            📋 Kanban
                        </button>
                        <button onClick={() => setView('disparos')} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: view === 'disparos' ? '#FF6B00' : 'transparent', color: view === 'disparos' ? 'white' : '#555', fontFamily: 'Arial' }}>
                            🚀 Disparos
                        </button>
                    </div>
                    <div onClick={() => setIaAtiva(!iaAtiva)} style={{ background: iaAtiva ? '#22c55e22' : '#55555522', color: iaAtiva ? '#22c55e' : '#555', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${iaAtiva ? '#22c55e33' : '#33333333'}` }}>
                        {iaAtiva ? '🤖 IA Ativa' : '👤 Manual'}
                    </div>
                </div>
            </div>

            {/* VIEW DISPAROS */}
            {view === 'disparos' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ maxWidth: '720px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        <div>
                            <h2 style={{ color: 'white', fontSize: '20px', fontWeight: 800, margin: 0 }}>🚀 Disparo em Massa por Template</h2>
                            <p style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>Importe sua lista, escolha a quantidade e dispare o template aprovado pela Meta.</p>
                        </div>

                        {erroDisparo && (
                            <div style={{ background: 'rgba(243,139,168,0.1)', border: '1px solid rgba(243,139,168,0.3)', color: '#f38ba8', padding: '12px 16px', borderRadius: '10px', fontSize: '13px' }}>
                                ⚠️ {erroDisparo}
                            </div>
                        )}

                        {/* PASSO 1: UPLOAD CSV */}
                        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '14px', padding: '20px' }}>
                            <div style={{ color: '#FF6B00', fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>1. Importar lista de contatos</div>
                            <input ref={inputCSVRef} type="file" accept=".csv,.txt" style={{ display: 'none' }}
                                onChange={e => e.target.files?.[0] && handleUploadCSV(e.target.files[0])} />
                            <button onClick={() => inputCSVRef.current?.click()}
                                style={{ background: '#1a1a1a', border: '1px dashed #333', color: '#888', padding: '16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', width: '100%', fontFamily: 'Arial' }}>
                                📁 {nomeArquivoCSV || 'Clique para selecionar arquivo CSV'}
                            </button>
                            <div style={{ color: '#444', fontSize: '11px', marginTop: '8px' }}>Formato esperado: Nome,Telefone (uma linha por contato). Se não tiver nome, só o telefone também funciona.</div>

                            {contatosCSV.length > 0 && (
                                <div style={{ marginTop: '14px' }}>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '10px' }}>
                                        <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                                            ✓ {contatosCSV.length} total
                                        </div>
                                        <div style={{ background: 'rgba(116,199,236,0.1)', border: '1px solid rgba(116,199,236,0.3)', color: '#74c7ec', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                                            🆕 {disponiveisParaDisparo} novos
                                        </div>
                                        {repetidosWA.length > 0 && (
                                            <div style={{ background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.3)', color: '#FF6B00', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                                onClick={() => setMostrarRepetidosWA(!mostrarRepetidosWA)}>
                                                ⚠️ {repetidosWA.length} já receberam {mostrarRepetidosWA ? '▲' : '▼'}
                                            </div>
                                        )}
                                        <button onClick={limparCampanha} style={{ background: 'none', border: 'none', color: '#555', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline', marginLeft: 'auto' }}>
                                            Limpar lista
                                        </button>
                                    </div>
                                    {mostrarRepetidosWA && repetidosWA.length > 0 && (
                                        <div style={{ background: 'rgba(255,107,0,0.05)', border: '1px solid rgba(255,107,0,0.2)', borderRadius: '8px', padding: '10px', maxHeight: '160px', overflowY: 'auto' }}>
                                            <div style={{ color: '#FF6B00', fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>⚠️ Estes números já receberam disparo anteriormente:</div>
                                            {repetidosWA.map((c, i) => (
                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,107,0,0.08)', fontSize: '11px' }}>
                                                    <span style={{ color: '#888' }}>{c.nome !== c.telefone ? c.nome : ''}</span>
                                                    <span style={{ color: '#FF6B00', fontFamily: 'monospace' }}>{c.telefone}</span>
                                                </div>
                                            ))}
                                            <div style={{ color: '#666', fontSize: '10px', marginTop: '8px' }}>Você pode disparar mesmo assim se quiser.</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* PASSO 2: CONFIGURAÇÃO DO TEMPLATE */}
                        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '14px', padding: '20px' }}>
                            <div style={{ color: '#FF6B00', fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>2. Configurar template</div>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '6px' }}>Nome do template aprovado</label>
                                    <input value={templateName} onChange={e => setTemplateName(e.target.value)}
                                        style={{ width: '100%', padding: '10px 14px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'Arial' }} />
                                </div>
                                <div style={{ width: '120px' }}>
                                    <label style={{ color: '#666', fontSize: '11px', display: 'block', marginBottom: '6px' }}>Idioma</label>
                                    <input value={languageCode} onChange={e => setLanguageCode(e.target.value)}
                                        style={{ width: '100%', padding: '10px 14px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'Arial' }} />
                                </div>
                            </div>
                        </div>

                        {/* PASSO 3: QUANTIDADE */}
                        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '14px', padding: '20px' }}>
                            <div style={{ color: '#FF6B00', fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>3. Quantidade de disparos nesta campanha</div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <input type="number" min={1} max={disponiveisParaDisparo || 1} value={quantidadeDisparo}
                                    onChange={e => setQuantidadeDisparo(Math.max(1, parseInt(e.target.value) || 1))}
                                    style={{ width: '120px', padding: '10px 14px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none', fontFamily: 'Arial', fontWeight: 700 }} />
                                <span style={{ color: '#666', fontSize: '12px' }}>de {disponiveisParaDisparo} contatos disponíveis</span>
                                {disponiveisParaDisparo > 0 && (
                                    <button onClick={() => setQuantidadeDisparo(disponiveisParaDisparo)}
                                        style={{ background: 'none', border: '1px solid #2a2a2a', color: '#888', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Arial' }}>
                                        Selecionar todos
                                    </button>
                                )}
                            </div>
                            <div style={{ color: '#444', fontSize: '11px', marginTop: '8px' }}>
                                Os contatos já disparados nesta sessão não serão reenviados automaticamente — isso evita duplicar mensagens para a mesma pessoa.
                            </div>
                        </div>

                        {/* BOTÃO DE DISPARO */}
                        <button onClick={executarDisparo} disabled={disparando || contatosCSV.length === 0}
                            style={{
                                background: disparando ? '#333' : '#FF6B00', border: 'none', color: 'white', padding: '16px',
                                borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: disparando || contatosCSV.length === 0 ? 'not-allowed' : 'pointer',
                                fontFamily: 'Arial', opacity: contatosCSV.length === 0 ? 0.4 : 1
                            }}>
                            {disparando ? `Disparando... ${progressoAtual}/${progressoTotal}` : `🚀 Disparar para ${Math.min(quantidadeDisparo, disponiveisParaDisparo)} contatos`}
                        </button>

                        {/* BARRA DE PROGRESSO */}
                        {disparando && (
                            <div style={{ background: '#1a1a1a', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
                                <div style={{ background: '#FF6B00', height: '100%', width: `${progressoTotal > 0 ? (progressoAtual / progressoTotal) * 100 : 0}%`, transition: 'width 0.3s' }} />
                            </div>
                        )}

                        {/* RESULTADOS */}
                        {resultadosDisparo.length > 0 && (
                            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '14px', padding: '20px' }}>
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
                                    <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, flex: 1, textAlign: 'center' }}>
                                        ✓ {enviadosNestaCampanha} enviados
                                    </div>
                                    {falhasNestaCampanha > 0 && (
                                        <div style={{ background: 'rgba(243,139,168,0.1)', border: '1px solid rgba(243,139,168,0.3)', color: '#f38ba8', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, flex: 1, textAlign: 'center' }}>
                                            ✗ {falhasNestaCampanha} falharam
                                        </div>
                                    )}
                                </div>
                                <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                                    {resultadosDisparo.map((r, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 4px', borderBottom: '1px solid #1a1a1a', fontSize: '12px' }}>
                                            <span style={{ color: '#888' }}>{r.telefone}</span>
                                            <span style={{ color: r.sucesso ? '#22c55e' : '#f38ba8' }}>{r.sucesso ? '✓ Enviado' : '✗ ' + (r.erro || 'Falhou')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {contatos.length === 0 && view !== 'disparos' && (
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
                                                    {col && <span style={{ fontSize: '8px', color: col.cor, background: hexParaRgba(col.cor, 0.15), padding: '1px 5px', borderRadius: '8px' }}>{col.label}</span>}
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
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '16px 24px 0', display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditandoColunas(!editandoColunas)} style={{ background: editandoColunas ? '#FF6B00' : '#1a1a1a', border: '1px solid #2a2a2a', color: editandoColunas ? 'white' : '#888', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Arial' }}>
                            {editandoColunas ? '✓ Concluir edição' : '✏️ Editar colunas'}
                        </button>
                    </div>
                    <div style={{ flex: 1, overflowX: 'auto', padding: '16px 24px 24px', display: 'flex', gap: '16px' }}>
                        {colunas.map((col: any) => {
                            const cards = contatos.filter(c => c.etapa === col.id)
                            const bg = hexParaRgba(col.cor, 0.08)
                            const borda = hexParaRgba(col.cor, 0.2)
                            return (
                                <div key={col.id}
                                    draggable={editandoColunas}
                                    onDragStart={() => editandoColunas && setDragColunaId(col.id)}
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={() => {
                                        if (editandoColunas && dragColunaId) { reordenarColunas(dragColunaId, col.id); setDragColunaId(null) }
                                        else if (dragId !== null) { moverParaColuna(dragId, col.id); setDragId(null) }
                                    }}
                                    style={{ minWidth: '300px', maxWidth: '300px', background: bg, border: `1px solid ${borda}`, borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', cursor: editandoColunas ? 'grab' : 'default' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '8px' }}>
                                        {editandoColunas ? (
                                            <input value={col.label} onChange={e => renomearColuna(col.id, e.target.value)}
                                                style={{ flex: 1, background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: '6px', color: col.cor, fontSize: '12px', fontWeight: 700, padding: '4px 8px', outline: 'none', fontFamily: 'Arial' }} />
                                        ) : (
                                            <span style={{ color: col.cor, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{col.label}</span>
                                        )}
                                        {editandoColunas ? (
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                                                <input type="color" value={col.cor} onChange={e => mudarCorColuna(col.id, e.target.value)}
                                                    style={{ width: '22px', height: '22px', padding: 0, border: 'none', borderRadius: '5px', cursor: 'pointer', background: 'transparent' }} />
                                                <button onClick={() => deletarColuna(col.id)} disabled={colunas.length <= 1}
                                                    style={{ background: 'rgba(243,139,168,0.15)', border: 'none', color: '#f38ba8', width: '22px', height: '22px', borderRadius: '5px', cursor: colunas.length <= 1 ? 'not-allowed' : 'pointer', fontSize: '12px', opacity: colunas.length <= 1 ? 0.3 : 1 }}>
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <span style={{ background: borda, color: col.cor, borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>{cards.length}</span>
                                        )}
                                    </div>

                                    {/* Marcar como conversão + mensagem personalizada (só no modo edição) */}
                                    {editandoColunas && (
                                        <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '8px', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: col.ehConversao ? '#22c55e' : '#888', cursor: 'pointer', fontWeight: 600 }}>
                                                <input type="checkbox" checked={!!col.ehConversao} onChange={() => toggleConversaoColuna(col.id)}
                                                    style={{ cursor: 'pointer' }} />
                                                Marcar como conversão
                                            </label>
                                            {col.ehConversao && (
                                                <textarea
                                                    value={col.mensagemConversao || ''}
                                                    onChange={e => mudarMensagemConversao(col.id, e.target.value)}
                                                    onBlur={salvarMensagemConversao}
                                                    placeholder="Mensagem de agradecimento (opcional — deixe vazio para usar a padrão)"
                                                    rows={2}
                                                    style={{ width: '100%', background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#ccc', fontSize: '11px', padding: '6px 8px', outline: 'none', fontFamily: 'Arial', resize: 'vertical', boxSizing: 'border-box' }}
                                                />
                                            )}
                                        </div>
                                    )}

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
                        {editandoColunas && (
                            <div style={{ minWidth: '260px', maxWidth: '260px', background: '#111', border: '1px dashed #2a2a2a', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px', height: 'fit-content' }}>
                                <span style={{ color: '#888', fontSize: '12px', fontWeight: 700 }}>+ Nova coluna</span>
                                <input value={novaColunaLabel} onChange={e => setNovaColunaLabel(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && adicionarColuna()}
                                    placeholder="Nome da coluna"
                                    style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: 'white', fontSize: '12px', padding: '8px 12px', outline: 'none', fontFamily: 'Arial' }} />
                                <button onClick={adicionarColuna} disabled={!novaColunaLabel.trim()}
                                    style={{ background: '#FF6B00', border: 'none', color: 'white', padding: '8px', borderRadius: '8px', cursor: novaColunaLabel.trim() ? 'pointer' : 'not-allowed', fontSize: '12px', fontWeight: 700, fontFamily: 'Arial', opacity: novaColunaLabel.trim() ? 1 : 0.4 }}>
                                    Adicionar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {empresaAtual !== 'FlowSMS Admin' && (
                <JarvasWidget empresa={empresaAtual} emailCliente="" />
            )}
        </div>
    )
}