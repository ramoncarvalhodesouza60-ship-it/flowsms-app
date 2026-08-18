'use client'
import { useState, useEffect, useRef } from 'react'

// Matrix rain canvas component
function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const chars = 'FLOWSMS01アイウエオカキクケコサシスセソタチツテトナニヌネノ∑∆∏∫≈≠①②③'
    const fontSize = 13
    const cols = Math.floor(canvas.width / fontSize)
    const drops: number[] = Array(cols).fill(1)

    function draw() {
      ctx!.fillStyle = 'rgba(0,0,0,0.04)'
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height)

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)]
        const x = i * fontSize

        const progress = drops[i] / (canvas!.height / fontSize)
        if (progress < 0.05) {
          ctx!.fillStyle = '#ffffff'
          ctx!.shadowColor = '#FF6B00'
          ctx!.shadowBlur = 10
        } else if (progress < 0.15) {
          ctx!.fillStyle = '#FF6B00'
          ctx!.shadowColor = '#FF6B00'
          ctx!.shadowBlur = 8
        } else if (progress < 0.35) {
          ctx!.fillStyle = 'rgba(255,107,0,0.85)'
          ctx!.shadowBlur = 0
        } else if (progress < 0.6) {
          ctx!.fillStyle = 'rgba(255,107,0,0.45)'
          ctx!.shadowBlur = 0
        } else {
          ctx!.fillStyle = 'rgba(255,107,0,0.15)'
          ctx!.shadowBlur = 0
        }

        ctx!.font = `bold ${fontSize}px monospace`
        ctx!.fillText(char, x, drops[i] * fontSize)
        ctx!.shadowBlur = 0

        if (drops[i] * fontSize > canvas!.height && Math.random() > 0.972) {
          drops[i] = 0
        }
        drops[i]++
      }
    }

    const interval = setInterval(draw, 40)
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)
    return () => { clearInterval(interval); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, opacity: 0.7 }} />
}

// Floating orbs
function Orbs() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,0,0.15) 0%, transparent 70%)', top: '-200px', left: '-200px', animation: 'orb1 12s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,0,0.1) 0%, transparent 70%)', bottom: '-150px', right: '-100px', animation: 'orb2 15s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,150,0,0.08) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', animation: 'orb3 8s ease-in-out infinite' }} />
      <style>{`
        @keyframes orb1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(80px,60px) scale(1.1)} }
        @keyframes orb2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-60px,-80px) scale(1.15)} }
        @keyframes orb3 { 0%,100%{transform:translate(-50%,-50%) scale(1)} 50%{transform:translate(-50%,-50%) scale(1.3)} }
      `}</style>
    </div>
  )
}

// Grid lines
function GridLines() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
      backgroundImage: 'linear-gradient(rgba(255,107,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,0,0.03) 1px, transparent 1px)',
      backgroundSize: '60px 60px'
    }} />
  )
}

const statusColors: Record<string, { bg: string; color: string; dot: string }> = {
  'Aguardando retorno': { bg: 'rgba(249,226,175,0.12)', color: '#f9e2af', dot: '#f9e2af' },
  'Não interessado': { bg: 'rgba(243,139,168,0.12)', color: '#f38ba8', dot: '#f38ba8' },
  'Sem resposta': { bg: 'rgba(108,117,125,0.12)', color: '#888', dot: '#888' },
  'Convertido': { bg: 'rgba(166,227,161,0.12)', color: '#a6e3a1', dot: '#a6e3a1' },
}

type ContatoCSV = { nome: string; telefone: string }
type ResultadoSMS = { telefone: string; sucesso: boolean; erro?: string }

function normalizarTelefone(raw: string): string {
  return raw.replace(/\D/g, '')
}

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Mono:wght@700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #050508; font-family: 'Inter', sans-serif; color: white; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: rgba(255,107,0,0.3); border-radius: 4px; }
  input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
  input:focus, textarea:focus { outline: none; }
  
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(255,107,0,0.3); }
    50% { box-shadow: 0 0 40px rgba(255,107,0,0.6), 0 0 80px rgba(255,107,0,0.2); }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes scanline {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  .login-card {
    animation: slideUp 0.6s ease forwards;
  }
  .glow-btn {
    animation: pulse-glow 3s ease-in-out infinite;
    transition: all 0.2s;
  }
  .glow-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 60px rgba(255,107,0,0.8) !important;
  }
  .nav-link:hover { color: white !important; }
  .side-btn:hover { color: white !important; background: rgba(255,255,255,0.03) !important; }
  .card-hover { transition: all 0.2s; }
  .card-hover:hover { border-color: rgba(255,107,0,0.4) !important; transform: translateY(-2px); box-shadow: 0 8px 32px rgba(255,107,0,0.1) !important; }
  .row-hover:hover td { background: rgba(255,107,0,0.03); }
  .del-btn:hover { background: rgba(243,139,168,0.15) !important; color: #f38ba8 !important; }
  .inp-focus:focus { border-color: rgba(255,107,0,0.6) !important; background: rgba(255,107,0,0.06) !important; box-shadow: 0 0 0 3px rgba(255,107,0,0.1) !important; }
 
  .hamburger-btn { display: none; }
  .sidebar-overlay { display: none; }
 
  @media (max-width: 860px) {
    .app-sidebar {
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      transform: translateX(-100%);
      transition: transform 0.25s ease;
      z-index: 110;
    }
    .app-sidebar.open { transform: translateX(0); }
    .hamburger-btn { display: flex !important; }
    .sidebar-overlay.open {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 105;
      backdrop-filter: blur(2px);
    }
    .app-content { padding: 20px !important; }
  }
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

// FlowSMS Logo Component
function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: { box: 28, text: 14 }, md: { box: 36, text: 20 }, lg: { box: 48, text: 28 } }
  const s = sizes[size]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        width: s.box, height: s.box,
        borderRadius: '8px',
        background: 'linear-gradient(145deg, #FF8C00 0%, #FF5500 60%, #cc3300 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(255,107,0,0.6), 0 0 40px rgba(255,107,0,0.2)',
        flexShrink: 0,
        position: 'relative' as const,
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', background: 'rgba(255,255,255,0.1)', borderRadius: '8px 8px 0 0' }} />
        <span style={{
          color: 'white',
          fontSize: s.box * 0.58,
          fontWeight: 700,
          fontFamily: 'Georgia, "Times New Roman", serif',
          lineHeight: 1,
          textShadow: '0 1px 4px rgba(0,0,0,0.3)',
          position: 'relative' as const,
          zIndex: 1,
        }}>F</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '1px' }}>
        <span style={{ color: '#FF6B00', fontSize: s.text, fontWeight: 900, fontFamily: 'Space Mono, monospace', letterSpacing: '-0.5px' }}>Flow</span>
        <span style={{ color: 'white', fontSize: s.text, fontWeight: 900, fontFamily: 'Space Mono, monospace', letterSpacing: '-0.5px' }}>SMS</span>
      </div>
    </div>
  )
}

export default function Home() {
  const [logado, setLogado] = useState(false)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [empresaAtual, setEmpresaAtual] = useState('')
  const [configEmpresa, setConfigEmpresa] = useState<any>(null)
  const [telefone, setTelefone] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [status, setStatus] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [contatos, setContatos] = useState<any[]>([])
  const [novoNome, setNovoNome] = useState('')
  const [novoTel, setNovoTel] = useState('')
  const [adicionando, setAdicionando] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState('sms')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('Todos')
  const [smsUsados, setSmsUsados] = useState(0)
  const [whatsAppUsados, setWhatsAppUsados] = useState(0)
  const [waTelefone, setWaTelefone] = useState('')
  const [waMensagem, setWaMensagem] = useState('')
  const [waStatus, setWaStatus] = useState('')
  const [waEnviando, setWaEnviando] = useState(false)
  const [historicoSMS, setHistoricoSMS] = useState<Set<string>>(new Set())
  const [historicoWA, setHistoricoWA] = useState<Set<string>>(new Set())
  const [smsSubAba, setSmsSubAba] = useState<'individual' | 'massa'>('individual')
  const [smsCSV, setSmsCSV] = useState<ContatoCSV[]>([])
  const [smsNomeArquivo, setSmsNomeArquivo] = useState('')
  const [smsMensagemMassa, setSmsMensagemMassa] = useState('')
  const [smsQuantidade, setSmsQuantidade] = useState(100)
  const [smsJaEnviados, setSmsJaEnviados] = useState<Set<string>>(new Set())
  const [smsDisparando, setSmsDisparando] = useState(false)
  const [smsProgressoAtual, setSmsProgressoAtual] = useState(0)
  const [smsProgressoTotal, setSmsProgressoTotal] = useState(0)
  const [smsResultados, setSmsResultados] = useState<ResultadoSMS[]>([])
  const [smsErroCampanha, setSmsErroCampanha] = useState<string | null>(null)
  const [mostrarListaSMS, setMostrarListaSMS] = useState(false)
  const inputSmsCSVRef = useRef<HTMLInputElement>(null)

  // Estados da aba IA / Assistente
  const [iaPrompt, setIaPrompt] = useState('')
  const [iaSalvando, setIaSalvando] = useState(false)
  const [iaStatus, setIaStatus] = useState('')
  const [iaMensagemTeste, setIaMensagemTeste] = useState('')
  const [iaRespostaTeste, setIaRespostaTeste] = useState('')
  const [iaTestando, setIaTestando] = useState(false)

  // Estados da aba Templates
  const [templatesLista, setTemplatesLista] = useState<any[]>([])
  const [templatesCarregando, setTemplatesCarregando] = useState(false)
  const [templatesErro, setTemplatesErro] = useState('')
  const [templatesCarregou, setTemplatesCarregou] = useState(false)

  // Estados da aba Catálogo
  const [produtosLista, setProdutosLista] = useState<any[]>([])
  const [produtosCarregando, setProdutosCarregando] = useState(false)
  const [produtoNome, setProdutoNome] = useState('')
  const [produtoVariacao, setProdutoVariacao] = useState('')
  const [produtoPreco, setProdutoPreco] = useState('')
  const [produtoEstoque, setProdutoEstoque] = useState('')
  const [produtoSalvando, setProdutoSalvando] = useState(false)
  const [produtoErro, setProdutoErro] = useState('')
  const [produtoFoto, setProdutoFoto] = useState('')
  const [produtoFotoEnviando, setProdutoFotoEnviando] = useState(false)
  const [produtoEditandoId, setProdutoEditandoId] = useState<string | null>(null)
  // Estados da aba Perfil WhatsApp
  const [perfilAbout, setPerfilAbout] = useState('')
  const [perfilDescricao, setPerfilDescricao] = useState('')
  const [perfilFotoUrl, setPerfilFotoUrl] = useState('')
  const [perfilFotoNova, setPerfilFotoNova] = useState('')
  const [perfilNomeAtual, setPerfilNomeAtual] = useState('')
  const [perfilNomeStatus, setPerfilNomeStatus] = useState('')
  const [perfilCarregando, setPerfilCarregando] = useState(false)
  const [perfilSalvando, setPerfilSalvando] = useState(false)
  const [perfilErro, setPerfilErro] = useState('')
  const [perfilCarregou, setPerfilCarregou] = useState(false)

  // Estados da tela de Configurações
  const [configAberta, setConfigAberta] = useState(false)
  const [configTelefoneAdmin, setConfigTelefoneAdmin] = useState('')
  const [configCarregando, setConfigCarregando] = useState(false)
  const [configSalvando, setConfigSalvando] = useState(false)
  const [configErro, setConfigErro] = useState('')
  const [configSucesso, setConfigSucesso] = useState(false)
  async function entrar() {
    setLoading(true)
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      })
      const data = await res.json()
      if (data.success) {
        setEmpresaAtual(data.cliente.empresa)
        setConfigEmpresa(data.cliente)
        setIaPrompt(data.cliente.system_prompt || '')
        setLogado(true)
      } else {
        setErro(data.error || 'Email ou senha incorretos')
      }
    } catch (e) {
      setErro('Erro ao conectar. Tente novamente.')
    }
    setLoading(false)
  }

  async function carregarUso(empresa: string) {
    try {
      const res = await fetch('/api/uso?empresa=' + encodeURIComponent(empresa))
      const data = await res.json()
      if (data.success) {
        setSmsUsados(data.sms.usados)
        setWhatsAppUsados(data.whatsapp.usados)
        setHistoricoSMS(new Set(data.sms.telefonesUsados || []))
        setHistoricoWA(new Set(data.whatsapp.telefonesUsados || []))
      }
    } catch (e) { console.error(e) }
  }

  async function carregarContatos() {
    const res = await fetch('/api/contatos?empresa=' + encodeURIComponent(empresaAtual))
    const data = await res.json()
    if (Array.isArray(data)) setContatos(data)
  }

  useEffect(() => {
    if (logado && empresaAtual) { carregarContatos(); carregarUso(empresaAtual) }
  }, [logado, empresaAtual])

  async function atualizarStatus(id: string, s: string) {
    await fetch('/api/contatos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: s }) })
    setTimeout(() => carregarContatos(), 1000)
  }

  async function deletarContato(id: string) {
    await fetch('/api/contatos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    carregarContatos()
  }

  async function importarCSV(arquivo: File) {
    const texto = await arquivo.text()
    const linhas = texto.split('\n').filter(l => l.trim())
    for (const linha of linhas.slice(1)) {
      const partes = linha.split(',')
      const nome = partes[0]?.trim().replace(/"/g, '')
      const tel = partes[1]?.trim().replace(/"/g, '')
      if (nome && tel) await fetch('/api/contatos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, telefone: tel, empresa: empresaAtual }) })
    }
    carregarContatos()
  }

  async function adicionarContato() {
    if (!novoNome || !novoTel) return
    setAdicionando(true)
    await fetch('/api/contatos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: novoNome, telefone: novoTel, empresa: empresaAtual }) })
    setNovoNome(''); setNovoTel(''); carregarContatos(); setAdicionando(false)
  }

  async function dispararSMS() {
    if (!telefone || !mensagem) { setStatus('Preencha o telefone e a mensagem!'); return }
    if (smsUsados >= (configEmpresa?.limiteSMS || 0)) { setStatus('❌ Limite atingido!'); return }
    setEnviando(true); setStatus('')
    try {
      const res = await fetch('/api/sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefone, mensagem, contatoId: null, empresa: empresaAtual }) })
      const data = await res.json()
      if (data.success) { setSmsUsados(p => p + 1); setStatus('✓ SMS enviado!'); setTelefone(''); setMensagem('') }
      else setStatus('Erro: ' + data.error)
    } catch { setStatus('Erro ao enviar') }
    setEnviando(false)
  }

  function processarCSVSMS(texto: string): ContatoCSV[] {
    const linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    const resultado: ContatoCSV[] = []
    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i]
      if (i === 0 && !/\d/.test(linha)) continue
      const partes = linha.split(',').map(p => p.trim().replace(/^"|"$/g, ''))
      const telefoneRaw = partes.length >= 2 ? partes[1] : partes[0]
      const nome = partes.length >= 2 ? partes[0] : ''
      const tel = normalizarTelefone(telefoneRaw)
      if (tel.length >= 10) resultado.push({ nome: nome || tel, telefone: tel })
    }
    return resultado
  }

  function handleUploadCSVSMS(arquivo: File) {
    setSmsNomeArquivo(arquivo.name); setSmsErroCampanha(null); setSmsResultados([])
    const reader = new FileReader()
    reader.onload = (e) => {
      const lista = processarCSVSMS(e.target?.result as string)
      if (lista.length === 0) { setSmsErroCampanha('Nenhum contato válido.'); return }
      setSmsCSV(lista)
      if (lista.length < smsQuantidade) setSmsQuantidade(lista.length)
    }
    reader.readAsText(arquivo, 'UTF-8')
  }

  const todosJaEnviadosSMS = new Set([...historicoSMS, ...smsJaEnviados])
  const smsNovos = smsCSV.filter(c => !todosJaEnviadosSMS.has(c.telefone))
  const smsRepetidos = smsCSV.filter(c => todosJaEnviadosSMS.has(c.telefone))

  async function executarDisparoSMS() {
    if (!smsMensagemMassa.trim()) { setSmsErroCampanha('Digite a mensagem.'); return }
    const limite = configEmpresa?.limiteSMS || 0
    const disponivelPlano = limite - smsUsados
    if (disponivelPlano <= 0) { setSmsErroCampanha('❌ Limite atingido!'); return }
    const todaLista = smsCSV.slice(0, Math.min(smsQuantidade, disponivelPlano))
    if (todaLista.length === 0) { setSmsErroCampanha('Nenhum contato disponível.'); return }
    setSmsDisparando(true); setSmsErroCampanha(null); setSmsResultados([])
    setSmsProgressoTotal(todaLista.length); setSmsProgressoAtual(0)
    let enviados = 0
    const resultados: ResultadoSMS[] = []
    for (const contato of todaLista) {
      try {
        const res = await fetch('/api/sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefone: contato.telefone, mensagem: smsMensagemMassa, contatoId: null, empresa: empresaAtual }) })
        const data = await res.json()
        if (data.success) { enviados++; resultados.push({ telefone: contato.telefone, sucesso: true }) }
        else resultados.push({ telefone: contato.telefone, sucesso: false, erro: data.error || 'Falhou' })
      } catch (e: any) { resultados.push({ telefone: contato.telefone, sucesso: false, erro: e.message }) }
      setSmsProgressoAtual(p => p + 1)
      await new Promise(r => setTimeout(r, 200))
    }
    setSmsUsados(p => p + enviados); setSmsResultados(resultados)
    setSmsJaEnviados(prev => { const n = new Set(prev); todaLista.forEach(c => n.add(c.telefone)); return n })
    setHistoricoSMS(prev => { const n = new Set(prev); todaLista.forEach(c => n.add(c.telefone)); return n })
    setSmsDisparando(false)
  }

  function limparCampanhaSMS() { setSmsCSV([]); setSmsNomeArquivo(''); setSmsResultados([]); setSmsErroCampanha(null); setSmsProgressoAtual(0); setSmsProgressoTotal(0); setMostrarListaSMS(false) }

  async function salvarPrompt() {
    if (!configEmpresa?.id) { setIaStatus('❌ Cliente sem ID identificado'); return }
    setIaSalvando(true); setIaStatus('')
    try {
      const res = await fetch('/api/ia/prompt', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clienteId: configEmpresa.id, system_prompt: iaPrompt }) })
      const data = await res.json()
      if (data.success) { setIaStatus('✓ Instruções salvas!'); setConfigEmpresa((prev: any) => ({ ...prev, system_prompt: iaPrompt })) }
      else setIaStatus('Erro ao salvar')
    } catch { setIaStatus('Erro ao salvar') }
    setIaSalvando(false)
  }

  async function testarPrompt() {
    if (!iaMensagemTeste.trim()) return
    setIaTestando(true); setIaRespostaTeste('')
    try {
      const res = await fetch('/api/ia/testar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system_prompt: iaPrompt, mensagem: iaMensagemTeste }) })
      const data = await res.json()
      if (data.success) setIaRespostaTeste(data.resposta)
      else setIaRespostaTeste('Erro ao testar. Tente novamente.')
    } catch { setIaRespostaTeste('Erro ao testar. Tente novamente.') }
    setIaTestando(false)
  }
  async function carregarProdutos() {
    setProdutosCarregando(true)
    try {
      const res = await fetch('/api/produtos?empresa=' + encodeURIComponent(empresaAtual))
      const data = await res.json()
      if (data.success) setProdutosLista(data.produtos)
    } catch (e) { console.error(e) }
    setProdutosCarregando(false)
  }

  async function enviarFotoProduto(arquivo: File) {
    setProdutoFotoEnviando(true)
    try {
      const formData = new FormData()
      formData.append('file', arquivo)
      const res = await fetch('/api/whatsapp/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) {
        setProdutoFoto(data.url)
      } else {
        setProdutoErro('Erro ao enviar foto: ' + (data.error || 'desconhecido'))
      }
    } catch (e: any) {
      setProdutoErro('Erro ao enviar foto: ' + e.message)
    }
    setProdutoFotoEnviando(false)
  }
  async function criarProduto() {
    if (!produtoNome.trim()) return
    setProdutoSalvando(true)
    setProdutoErro('')
    try {
      const res = await fetch('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: produtoNome,
          variacao: produtoVariacao,
          preco: produtoPreco,
          estoque: produtoEstoque,
          foto: produtoFoto,
          empresa: empresaAtual,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setProdutoNome(''); setProdutoVariacao(''); setProdutoPreco(''); setProdutoEstoque(''); setProdutoFoto('')
        carregarProdutos()
      } else {
        setProdutoErro(data.error || 'Erro ao salvar produto')
      }
    } catch (e: any) {
      setProdutoErro('Erro de conexão: ' + e.message)
    }
    setProdutoSalvando(false)
  }

  async function salvarEdicaoProduto() {
    if (!produtoNome.trim() || !produtoEditandoId) return
    setProdutoSalvando(true)
    setProdutoErro('')
    try {
      const res = await fetch('/api/produtos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: produtoEditandoId,
          nome: produtoNome,
          variacao: produtoVariacao,
          preco: produtoPreco,
          estoque: produtoEstoque,
          foto: produtoFoto,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setProdutoNome(''); setProdutoVariacao(''); setProdutoPreco(''); setProdutoEstoque(''); setProdutoFoto(''); setProdutoEditandoId(null)
        carregarProdutos()
      } else {
        setProdutoErro(data.error || 'Erro ao salvar edição')
      }
    } catch (e: any) {
      setProdutoErro('Erro de conexão: ' + e.message)
    }
    setProdutoSalvando(false)
  }

  function iniciarEdicaoProduto(p: any) {
    setProdutoEditandoId(p.id)
    setProdutoNome(p.nome || '')
    setProdutoVariacao(p.variacao || '')
    setProdutoPreco(String(p.preco || ''))
    setProdutoEstoque(String(p.estoque || ''))
    setProdutoFoto(p.foto || '')
  }

  function cancelarEdicaoProduto() {
    setProdutoEditandoId(null)
    setProdutoNome(''); setProdutoVariacao(''); setProdutoPreco(''); setProdutoEstoque(''); setProdutoFoto('')
  }
  async function carregarPerfil() {
    setPerfilCarregando(true)
    setPerfilErro('')
    try {
      const res = await fetch('/api/whatsapp/perfil?empresa=' + encodeURIComponent(empresaAtual))
      const data = await res.json()
      if (data.success) {
        setPerfilAbout(data.about || '')
        setPerfilDescricao(data.description || '')
        setPerfilFotoUrl(data.fotoUrl || '')
        setPerfilNomeAtual(data.nomeAtual || '')
        setPerfilNomeStatus(data.nomeStatus || '')
      } else {
        setPerfilErro(data.error || 'Erro ao carregar perfil')
      }
    } catch (e: any) {
      setPerfilErro('Erro de conexão: ' + e.message)
    }
    setPerfilCarregando(false)
  }

  function converterFotoPerfil(arquivo: File) {
    const leitor = new FileReader()
    leitor.onload = () => {
      const img = new window.Image()
      img.onload = () => {
        // Redimensiona para no máximo 640x640 e converte para JPEG,
        // já que a Meta só aceita JPEG para foto de perfil
        const canvas = document.createElement('canvas')
        const tamanho = 640
        canvas.width = tamanho
        canvas.height = tamanho
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        // Centraliza cortando em quadrado
        const lado = Math.min(img.width, img.height)
        const offsetX = (img.width - lado) / 2
        const offsetY = (img.height - lado) / 2
        ctx.drawImage(img, offsetX, offsetY, lado, lado, 0, 0, tamanho, tamanho)
        const jpegBase64 = canvas.toDataURL('image/jpeg', 0.9)
        setPerfilFotoNova(jpegBase64)
      }
      img.src = leitor.result as string
    }
    leitor.readAsDataURL(arquivo)
  }

  async function salvarPerfil() {
    setPerfilSalvando(true)
    setPerfilErro('')
    try {
      const res = await fetch('/api/whatsapp/perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa: empresaAtual,
          about: perfilAbout,
          description: perfilDescricao,
          fotoBase64: perfilFotoNova || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setPerfilFotoNova('')
        carregarPerfil()
      } else {
        setPerfilErro(data.error || 'Erro ao salvar perfil')
      }
    } catch (e: any) {
      setPerfilErro('Erro de conexão: ' + e.message)
    }
    setPerfilSalvando(false)
  }

  async function carregarConfig() {
    setConfigCarregando(true)
    setConfigErro('')
    try {
      const res = await fetch('/api/config-cliente?empresa=' + encodeURIComponent(empresaAtual))
      const data = await res.json()
      if (data.success) {
        setConfigTelefoneAdmin(data.telefoneAdmin || '')
      } else {
        setConfigErro(data.error || 'Erro ao carregar configurações')
      }
    } catch (e: any) {
      setConfigErro('Erro de conexão: ' + e.message)
    }
    setConfigCarregando(false)
  }

  async function salvarConfig() {
    setConfigSalvando(true)
    setConfigErro('')
    setConfigSucesso(false)
    try {
      const res = await fetch('/api/config-cliente', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresa: empresaAtual, telefoneAdmin: configTelefoneAdmin }),
      })
      const data = await res.json()
      if (data.success) {
        setConfigSucesso(true)
        setTimeout(() => setConfigSucesso(false), 3000)
      } else {
        setConfigErro(data.error || 'Erro ao salvar')
      }
    } catch (e: any) {
      setConfigErro('Erro de conexão: ' + e.message)
    }
    setConfigSalvando(false)
  }

  function abrirConfig() {
    setConfigAberta(true)
    carregarConfig()
  }

  async function deletarProduto(id: string) {
    await fetch('/api/produtos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    carregarProdutos()
  }

  async function carregarTemplates() {
    if (!configEmpresa?.whatsapp_business_account_id || !configEmpresa?.whatsapp_token) {
      setTemplatesErro('faltaConfig')
      setTemplatesCarregou(true)
      return
    }
    setTemplatesCarregando(true); setTemplatesErro('')
    try {
      const res = await fetch('/api/templates?wabaId=' + encodeURIComponent(configEmpresa.whatsapp_business_account_id) + '&token=' + encodeURIComponent(configEmpresa.whatsapp_token))
      const data = await res.json()
      if (data.success) setTemplatesLista(data.templates)
      else setTemplatesErro('erroApi')
    } catch { setTemplatesErro('erroApi') }
    setTemplatesCarregando(false); setTemplatesCarregou(true)
  }

  async function enviarWhatsApp() {
    if (!waTelefone || !waMensagem) { setWaStatus('Preencha os campos!'); return }
    if (whatsAppUsados >= (configEmpresa?.limiteWhatsApp || 0)) { setWaStatus('❌ Limite atingido!'); return }
    setWaEnviando(true); setWaStatus('')
    try {
      const res = await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefone: waTelefone, mensagem: waMensagem }) })
      const data = await res.json()
      if (data.success) {
        await fetch('/api/whatsapp/mensagens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefone: waTelefone, mensagem: waMensagem, tipo: 'enviada', empresa: empresaAtual }) })
        setWhatsAppUsados(p => p + 1); setWaStatus('✓ Enviado!'); setWaTelefone(''); setWaMensagem('')
      } else setWaStatus('Erro: ' + JSON.stringify(data.error))
    } catch { setWaStatus('Erro ao enviar') }
    setWaEnviando(false)
  }

  const initials = empresaAtual.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const contatosFiltrados = contatos.filter((c: any) => filtroStatus === 'Todos' || c.status === filtroStatus)
  const limiteSMS = configEmpresa?.limiteSMS || 1
  const limiteWhatsApp = configEmpresa?.limiteWhatsApp || 1
  const pctSMS = Math.min((smsUsados / limiteSMS) * 100, 100)
  const pctWA = Math.min((whatsAppUsados / limiteWhatsApp) * 100, 100)
  const corBarraSMS = pctSMS >= 90 ? '#f38ba8' : pctSMS >= 70 ? '#f9e2af' : '#FF6B00'
  const linkWhatsApp = '/whatsapp?empresa=' + encodeURIComponent(empresaAtual)
  const smsEnviadosCampanha = smsResultados.filter(r => r.sucesso).length
  const smsFailsCampanha = smsResultados.filter(r => !r.sucesso).length

  // Itens do menu lateral — adicionar novos itens aqui no futuro (Pedidos, Pagamentos, etc.)
  const abas = [
    { id: 'sms', icon: '📨', label: 'Disparar SMS' },
    { id: 'contatos', icon: '👥', label: 'Contatos' },
    { id: 'catalogo', icon: '🛒', label: 'Catálogo' },
    { id: 'ia', icon: '🤖', label: 'IA / Assistente' },
    { id: 'templates', icon: '📄', label: 'Templates' },

    ...(configEmpresa?.ramal ? [{ id: 'ramal', icon: '📞', label: 'Ramal' }] : []),
    ...(configEmpresa?.whatsapp ? [{ id: 'whatsapp', icon: '💬', label: 'WhatsApp' }] : []),
  ]
  function selecionarAba(id: string) {
    setAbaAtiva(id)
    setSidebarOpen(false)
    if (id === 'templates' && !templatesCarregou) carregarTemplates()
    if (id === 'catalogo' && produtosLista.length === 0) carregarProdutos()
    if (id === 'whatsapp' && !perfilCarregou) { setPerfilCarregou(true); carregarPerfil() }
  }

  // ==================== LOGIN ====================
  if (!logado) return (
    <main style={{ background: '#050508', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <style>{globalStyles}</style>
      <MatrixRain />
      <Orbs />
      <GridLines />

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, rgba(255,107,0,0.4), transparent)', animation: 'scanline 8s linear infinite', zIndex: 1, pointerEvents: 'none' }} />

      <div className="login-card" style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '440px', padding: '0 24px' }}>
        <div style={{
          background: 'rgba(5,5,8,0.85)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,107,0,0.2)',
          borderRadius: '24px',
          padding: '48px 40px',
          boxShadow: '0 0 100px rgba(255,107,0,0.08), 0 32px 64px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
          <div style={{ marginBottom: '32px' }}>
            <Logo size="lg" />
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.2)', borderRadius: '20px', padding: '4px 12px', marginBottom: '20px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF6B00', animation: 'blink 2s infinite' }} />
            <span style={{ fontSize: '11px', color: '#FF6B00', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Sistema Online</span>
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '6px', letterSpacing: '-0.5px' }}>
            Bem-vindo de volta
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', marginBottom: '32px' }}>
            Acesse sua plataforma de automação
          </p>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>E-mail</label>
            <input
              className="inp-focus"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && entrar()}
              style={inp}
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Senha</label>
            <input
              className="inp-focus"
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && entrar()}
              style={inp}
            />
          </div>

          {erro && (
            <div style={{ background: 'rgba(243,139,168,0.08)', border: '1px solid rgba(243,139,168,0.2)', borderRadius: '10px', padding: '12px 16px', color: '#f38ba8', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠</span> {erro}
            </div>
          )}

          <button
            className="glow-btn"
            onClick={entrar}
            disabled={loading}
            style={{
              width: '100%', padding: '16px',
              background: loading ? 'rgba(255,107,0,0.5)' : 'linear-gradient(135deg, #FF6B00, #ff8c33)',
              color: 'white', border: 'none', borderRadius: '12px',
              fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Inter, sans-serif', letterSpacing: '0.3px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
            {loading ? (
              <>
                <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'orb1 0.6s linear infinite' }} />
                Verificando...
              </>
            ) : 'Entrar no Sistema →'}
          </button>

          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '11px', marginTop: '20px' }}>
            flowsms.com.br · Plataforma Segura
          </p>
        </div>
      </div>
    </main>
  )

  // ==================== DASHBOARD ====================
  return (
    <main style={{ background: '#050508', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: 'white', position: 'relative' }}>
      <style>{globalStyles}</style>
      <Orbs />
      <GridLines />

      {/* Overlay do menu no mobile */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <div style={{ display: 'flex', position: 'relative', zIndex: 1 }}>

        {/* MENU LATERAL */}
        <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`} style={{
          width: '240px',
          minWidth: '240px',
          background: 'rgba(5,5,8,0.95)',
          borderRight: '1px solid rgba(255,107,0,0.1)',
          backdropFilter: 'blur(20px)',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          height: '100vh',
          position: 'sticky',
          top: 0,
        }}>
          <div style={{ padding: '0 8px', marginBottom: '28px' }}>
            <Logo size="sm" />
          </div>

          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700, padding: '0 8px', marginBottom: '8px' }}>Menu</span>

          {abas.map(aba => (
            <button key={aba.id} className="side-btn" onClick={() => selecionarAba(aba.id)} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600, textAlign: 'left', width: '100%',
              background: abaAtiva === aba.id ? 'linear-gradient(135deg,#FF6B00,#ff8c33)' : 'transparent',
              color: abaAtiva === aba.id ? 'white' : 'rgba(255,255,255,0.4)',
              fontFamily: 'Inter, sans-serif', transition: 'all .2s',
              boxShadow: abaAtiva === aba.id ? '0 4px 12px rgba(255,107,0,0.3)' : 'none',
            }}>
              <span style={{ fontSize: '15px' }}>{aba.icon}</span> {aba.label}
            </button>
          ))}
          <a href="/asaas" style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 14px', borderRadius: '10px',
            fontSize: '13px', fontWeight: 600, textAlign: 'left', width: '100%',
            background: 'transparent',
            color: 'rgba(255,255,255,0.4)',
            fontFamily: 'Inter, sans-serif', transition: 'all .2s',
            textDecoration: 'none', boxSizing: 'border-box',
          }} className="side-btn">
            <span style={{ fontSize: '15px' }}>💳</span> Criar Subconta
          </a>

          <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', marginBottom: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'linear-gradient(135deg,#FF6B00,#ff9a4d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>{initials}</div>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{empresaAtual}</span>
              <button onClick={abrirConfig} title="Configurações" style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '15px', padding: '4px', flexShrink: 0 }}>
                ⚙️
              </button>
            </div>
            <button onClick={() => setLogado(false)} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.06)', padding: '9px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>
              Sair
            </button>
          </div>
        </aside>

        {/* CONTEÚDO */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Barra superior */}
          <nav style={{
            position: 'sticky', top: 0, zIndex: 50,
            background: 'rgba(5,5,8,0.9)',
            borderBottom: '1px solid rgba(255,107,0,0.1)',
            backdropFilter: 'blur(20px)',
            padding: '0 24px', height: '64px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} style={{
                display: 'none', alignItems: 'center', justifyContent: 'center',
                width: '36px', height: '36px', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px',
                color: 'white', cursor: 'pointer', fontSize: '16px',
              }}>☰</button>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                {abas.find(a => a.id === abaAtiva)?.label}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '20px', padding: '4px 12px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', animation: 'blink 2s infinite' }} />
              <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600 }}>Online</span>
            </div>
          </nav>

          <div className="app-content" style={{ padding: '32px', maxWidth: '980px', position: 'relative', zIndex: 1 }}>

            {/* Cards de métricas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '32px' }}>
              {[
                {
                  label: 'SMS Enviados', icon: '📨', value: smsUsados.toLocaleString('pt-BR'),
                  limit: configEmpresa?.limiteSMS !== 999999 ? configEmpresa?.limiteSMS : null,
                  color: '#FF6B00', pct: pctSMS, corBarra: corBarraSMS,
                  sub: configEmpresa?.limiteSMS !== 999999 ? `${(limiteSMS - smsUsados).toLocaleString('pt-BR')} restantes` : 'Ilimitado'
                },
                { label: 'Contatos', icon: '👥', value: contatos.length.toString(), color: '#74c7ec', sub: 'na base de dados' },
                { label: 'Aguardando', icon: '⏳', value: contatos.filter((c: any) => c.status === 'Aguardando retorno').length.toString(), color: '#f9e2af', sub: 'retorno pendente' },
              ].map(card => (
                <div key={card.label} className="card-hover" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', cursor: 'default' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600 }}>{card.label}</span>
                    <span style={{ fontSize: '20px' }}>{card.icon}</span>
                  </div>
                  <div style={{ fontSize: '36px', fontWeight: 900, color: card.color, lineHeight: 1, letterSpacing: '-1px' }}>
                    {card.value}
                    {card.limit && <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}> /{card.limit.toLocaleString('pt-BR')}</span>}
                  </div>
                  {card.pct !== undefined && card.limit && (
                    <div style={{ marginTop: '12px', height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${card.pct}%`, background: card.corBarra, borderRadius: '4px', transition: 'width 0.5s ease', boxShadow: `0 0 8px ${card.corBarra}` }} />
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '8px' }}>{card.sub}</div>
                </div>
              ))}
            </div>

            {/* ABA SMS */}
            {abaAtiva === 'sms' && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Disparar SMS</h2>
                  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '3px', gap: '2px' }}>
                    <button onClick={() => setSmsSubAba('individual')} style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: smsSubAba === 'individual' ? 'linear-gradient(135deg,#FF6B00,#ff8c33)' : 'transparent', color: smsSubAba === 'individual' ? 'white' : 'rgba(255,255,255,0.3)', fontFamily: 'Inter, sans-serif', boxShadow: smsSubAba === 'individual' ? '0 2px 8px rgba(255,107,0,0.3)' : 'none' }}>
                      📱 Individual
                    </button>
                    <button onClick={() => setSmsSubAba('massa')} style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: smsSubAba === 'massa' ? 'linear-gradient(135deg,#FF6B00,#ff8c33)' : 'transparent', color: smsSubAba === 'massa' ? 'white' : 'rgba(255,255,255,0.3)', fontFamily: 'Inter, sans-serif', boxShadow: smsSubAba === 'massa' ? '0 2px 8px rgba(255,107,0,0.3)' : 'none' }}>
                      🚀 Disparo em Massa
                    </button>
                  </div>
                </div>

                {smsSubAba === 'individual' && (
                  <>
                    <input className="inp-focus" type="text" placeholder="Telefone (+5511999999999)" value={telefone} onChange={e => setTelefone(e.target.value)} style={{ ...inp, marginBottom: '12px' }} />
                    <textarea className="inp-focus" placeholder="Digite a mensagem..." value={mensagem} onChange={e => setMensagem(e.target.value)} rows={4} style={{ ...inp, marginBottom: '6px', resize: 'none' }} />
                    <div style={{ textAlign: 'right', fontSize: '11px', color: mensagem.length > 140 ? '#f38ba8' : 'rgba(255,255,255,0.2)', marginBottom: '16px' }}>{mensagem.length}/160</div>
                    {status && <div style={{ background: status.includes('✓') ? 'rgba(34,197,94,0.08)' : 'rgba(243,139,168,0.08)', border: `1px solid ${status.includes('✓') ? 'rgba(34,197,94,0.2)' : 'rgba(243,139,168,0.2)'}`, borderRadius: '10px', padding: '10px 14px', color: status.includes('✓') ? '#22c55e' : '#f38ba8', fontSize: '13px', marginBottom: '16px' }}>{status}</div>}
                    <button onClick={dispararSMS} disabled={enviando || smsUsados >= limiteSMS} style={{ width: '100%', padding: '14px', background: (enviando || smsUsados >= limiteSMS) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#FF6B00,#ff8c33)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: (enviando || smsUsados >= limiteSMS) ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: (enviando || smsUsados >= limiteSMS) ? 'none' : '0 4px 16px rgba(255,107,0,0.3)' }}>
                      {enviando ? 'Enviando...' : smsUsados >= limiteSMS ? '❌ Limite Atingido' : '📨 Enviar SMS'}
                    </button>
                  </>
                )}

                {smsSubAba === 'massa' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {smsErroCampanha && <div style={{ background: 'rgba(243,139,168,0.08)', border: '1px solid rgba(243,139,168,0.2)', color: '#f38ba8', padding: '12px 16px', borderRadius: '10px', fontSize: '13px' }}>⚠️ {smsErroCampanha}</div>}

                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px' }}>
                      <div style={{ color: '#FF6B00', fontSize: '12px', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>1. Importar lista</div>
                      <input ref={inputSmsCSVRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleUploadCSVSMS(e.target.files[0])} />
                      <button onClick={() => inputSmsCSVRef.current?.click()} style={{ background: 'rgba(255,107,0,0.04)', border: '1px dashed rgba(255,107,0,0.2)', color: '#888', padding: '14px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', width: '100%', fontFamily: 'Inter, sans-serif' }}>
                        📁 {smsNomeArquivo || 'Clique para selecionar CSV'}
                      </button>
                      {smsCSV.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>✓ {smsCSV.length} total</span>
                            <span style={{ background: 'rgba(116,199,236,0.08)', border: '1px solid rgba(116,199,236,0.2)', color: '#74c7ec', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>🆕 {smsNovos.length} novos</span>
                            {smsRepetidos.length > 0 && <span style={{ background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.2)', color: '#FF6B00', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }} onClick={() => setMostrarListaSMS(!mostrarListaSMS)}>⚠️ {smsRepetidos.length} já receberam</span>}
                            <button onClick={limparCampanhaSMS} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline', marginLeft: 'auto' }}>Limpar</button>
                          </div>
                          {mostrarListaSMS && smsRepetidos.length > 0 && (
                            <div style={{ background: 'rgba(255,107,0,0.04)', border: '1px solid rgba(255,107,0,0.15)', borderRadius: '8px', padding: '10px', maxHeight: '140px', overflowY: 'auto' }}>
                              <div style={{ color: '#FF6B00', fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>Já receberam anteriormente:</div>
                              {smsRepetidos.map((c, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '11px', borderBottom: '1px solid rgba(255,107,0,0.06)' }}><span style={{ color: '#666' }}>{c.nome}</span><span style={{ color: '#FF6B00', fontFamily: 'monospace' }}>{c.telefone}</span></div>)}
                              <div style={{ color: '#555', fontSize: '10px', marginTop: '6px' }}>Pode disparar mesmo assim.</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px' }}>
                      <div style={{ color: '#FF6B00', fontSize: '12px', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>2. Mensagem</div>
                      <textarea className="inp-focus" placeholder="Mensagem para todos os contatos..." value={smsMensagemMassa} onChange={e => setSmsMensagemMassa(e.target.value)} rows={3} style={{ ...inp, resize: 'none', marginBottom: '4px' }} />
                      <div style={{ textAlign: 'right', fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>{smsMensagemMassa.length}/160</div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px' }}>
                      <div style={{ color: '#FF6B00', fontSize: '12px', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>3. Quantidade</div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input type="number" min={1} max={smsCSV.length} value={smsQuantidade} onChange={e => setSmsQuantidade(Math.max(1, parseInt(e.target.value) || 1))} style={{ width: '110px', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none', fontFamily: 'Inter, sans-serif', fontWeight: 700 }} />
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>de {smsCSV.length} na lista · {(limiteSMS - smsUsados).toLocaleString('pt-BR')} restantes no plano</span>
                      </div>
                    </div>

                    <button onClick={executarDisparoSMS} disabled={smsDisparando || smsCSV.length === 0 || !smsMensagemMassa.trim()} style={{ background: smsDisparando ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#FF6B00,#ff8c33)', border: 'none', color: 'white', padding: '16px', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: (smsDisparando || smsCSV.length === 0) ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: smsCSV.length === 0 ? 0.4 : 1, boxShadow: smsCSV.length > 0 && !smsDisparando ? '0 4px 20px rgba(255,107,0,0.4)' : 'none' }}>
                      {smsDisparando ? `Disparando... ${smsProgressoAtual}/${smsProgressoTotal}` : `🚀 Disparar para ${Math.min(smsQuantidade, smsCSV.length)} contatos`}
                    </button>

                    {smsDisparando && <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', height: '6px', overflow: 'hidden' }}><div style={{ background: 'linear-gradient(90deg,#FF6B00,#ff8c33)', height: '100%', width: `${smsProgressoTotal > 0 ? (smsProgressoAtual / smsProgressoTotal) * 100 : 0}%`, transition: 'width 0.3s', boxShadow: '0 0 10px rgba(255,107,0,0.5)' }} /></div>}

                    {smsResultados.length > 0 && (
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px' }}>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, flex: 1, textAlign: 'center' }}>✓ {smsEnviadosCampanha} enviados</div>
                          {smsFailsCampanha > 0 && <div style={{ background: 'rgba(243,139,168,0.08)', border: '1px solid rgba(243,139,168,0.2)', color: '#f38ba8', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, flex: 1, textAlign: 'center' }}>✗ {smsFailsCampanha} falharam</div>}
                        </div>
                        <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                          {smsResultados.map((r, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 2px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '11px' }}><span style={{ color: 'rgba(255,255,255,0.3)' }}>{r.telefone}</span><span style={{ color: r.sucesso ? '#22c55e' : '#f38ba8' }}>{r.sucesso ? '✓' : '✗ ' + (r.erro || '')}</span></div>)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ABA CONTATOS */}
            {abaAtiva === 'contatos' && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '28px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '24px' }}>Contatos</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', marginBottom: '16px' }}>
                  <input className="inp-focus" placeholder="Nome" value={novoNome} onChange={e => setNovoNome(e.target.value)} style={inp} />
                  <input className="inp-focus" placeholder="Telefone (+5511...)" value={novoTel} onChange={e => setNovoTel(e.target.value)} style={inp} />
                  <button onClick={adicionarContato} disabled={adicionando} style={{ padding: '12px 20px', background: 'linear-gradient(135deg,#FF6B00,#ff8c33)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 12px rgba(255,107,0,0.3)' }}>
                    {adicionando ? '...' : '+ Adicionar'}
                  </button>
                </div>
                <label style={{ background: 'rgba(255,107,0,0.04)', border: '1px solid rgba(255,107,0,0.1)', borderRadius: '8px', padding: '8px 14px', color: 'rgba(255,255,255,0.3)', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                  📁 Importar CSV
                  <input type="file" accept=".csv" onChange={e => e.target.files && importarCSV(e.target.files[0])} style={{ display: 'none' }} />
                </label>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {['Todos', 'Aguardando retorno', 'Não interessado', 'Sem resposta'].map(f => (
                    <button key={f} onClick={() => setFiltroStatus(f)} style={{ padding: '5px 12px', borderRadius: '20px', border: `1px solid ${filtroStatus === f ? 'rgba(255,107,0,0.5)' : 'rgba(255,255,255,0.06)'}`, cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: filtroStatus === f ? 'rgba(255,107,0,0.1)' : 'transparent', color: filtroStatus === f ? '#FF6B00' : 'rgba(255,255,255,0.3)', fontFamily: 'Inter, sans-serif' }}>{f}</button>
                  ))}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {['Nome', 'Telefone', 'Status', 'Alterar', ''].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {contatosFiltrados.length === 0
                      ? <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '14px' }}>Nenhum contato encontrado</td></tr>
                      : contatosFiltrados.map(c => {
                        const sc = statusColors[c.status] || statusColors['Aguardando retorno']
                        return (
                          <tr key={c.id} className="row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '13px 12px', color: 'white', fontSize: '14px', fontWeight: 600 }}>{c.nome}</td>
                            <td style={{ padding: '13px 12px', color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontFamily: 'Space Mono, monospace' }}>{c.telefone}</td>
                            <td style={{ padding: '13px 12px' }}>
                              <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: sc.dot }} />
                                {c.status || 'Aguardando retorno'}
                              </span>
                            </td>
                            <td style={{ padding: '13px 12px' }}>
                              <select onChange={e => atualizarStatus(c.id, e.target.value)} defaultValue={c.status || 'Aguardando retorno'} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: 'white', padding: '6px 10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', outline: 'none' }}>
                                <option>Aguardando retorno</option>
                                <option>Não interessado</option>
                                <option>Sem resposta</option>
                                <option>Convertido</option>
                              </select>
                            </td>
                            <td style={{ padding: '13px 12px', textAlign: 'right' }}>
                              <button className="del-btn" onClick={() => deletarContato(c.id)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }}>Deletar</button>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ABA IA / ASSISTENTE */}
            {abaAtiva === 'ia' && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '28px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>🤖 IA / Assistente</h2>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', marginBottom: '24px' }}>
                  Ensine a IA como ela deve se comportar nas conversas do WhatsApp — tom de voz, produtos, dúvidas comuns e quando transferir pra um atendente humano.
                </p>

                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Instruções da IA</label>
                <textarea
                  className="inp-focus"
                  placeholder="Ex: Você é o assistente virtual da [Empresa]. Responda de forma simpática e objetiva. Nossos produtos são... Quando o cliente demonstrar forte interesse em fechar, confirme os dados do pedido claramente..."
                  value={iaPrompt}
                  onChange={e => setIaPrompt(e.target.value)}
                  rows={10}
                  style={{ ...inp, marginBottom: '8px', resize: 'vertical', fontFamily: 'Space Mono, monospace', fontSize: '13px', lineHeight: 1.6 }}
                />
                <div style={{ textAlign: 'right', fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginBottom: '16px' }}>{iaPrompt.length} caracteres</div>

                {iaStatus && (
                  <div style={{ background: iaStatus.includes('✓') ? 'rgba(34,197,94,0.08)' : 'rgba(243,139,168,0.08)', border: `1px solid ${iaStatus.includes('✓') ? 'rgba(34,197,94,0.2)' : 'rgba(243,139,168,0.2)'}`, borderRadius: '10px', padding: '10px 14px', color: iaStatus.includes('✓') ? '#22c55e' : '#f38ba8', fontSize: '13px', marginBottom: '16px' }}>
                    {iaStatus}
                  </div>
                )}

                <button onClick={salvarPrompt} disabled={iaSalvando} style={{ width: '100%', padding: '14px', background: iaSalvando ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#FF6B00,#ff8c33)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: iaSalvando ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: '28px', boxShadow: iaSalvando ? 'none' : '0 4px 16px rgba(255,107,0,0.3)' }}>
                  {iaSalvando ? 'Salvando...' : '💾 Salvar instruções'}
                </button>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '24px' }}>
                  <div style={{ color: '#FF6B00', fontSize: '12px', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Testar antes de salvar</div>
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', marginBottom: '14px' }}>Simule uma pergunta de cliente e veja como a IA responderia com as instruções acima.</p>
                  <input className="inp-focus" type="text" placeholder="Ex: Qual o valor do plano básico?" value={iaMensagemTeste} onChange={e => setIaMensagemTeste(e.target.value)} onKeyDown={e => e.key === 'Enter' && testarPrompt()} style={{ ...inp, marginBottom: '12px' }} />
                  <button onClick={testarPrompt} disabled={iaTestando || !iaMensagemTeste.trim()} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: (iaTestando || !iaMensagemTeste.trim()) ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: '16px' }}>
                    {iaTestando ? 'Pensando...' : '▶ Testar resposta'}
                  </button>
                  {iaRespostaTeste && (
                    <div style={{ background: 'rgba(255,107,0,0.04)', border: '1px solid rgba(255,107,0,0.15)', borderRadius: '12px', padding: '16px' }}>
                      <div style={{ fontSize: '10px', color: '#FF6B00', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '8px' }}>Resposta simulada</div>
                      <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{iaRespostaTeste}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ABA TEMPLATES */}
            {abaAtiva === 'templates' && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '28px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>📄 Templates de Mensagem</h2>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', marginBottom: '24px' }}>
                  Mensagens pré-aprovadas pela Meta, usadas pra iniciar conversas com clientes fora da janela de 24h.
                </p>

                {templatesCarregando && (
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '20px', textAlign: 'center' }}>Carregando templates...</div>
                )}

                {!templatesCarregando && templatesErro === 'faltaConfig' && (
                  <div style={{ background: 'rgba(249,226,175,0.06)', border: '1px solid rgba(249,226,175,0.2)', borderRadius: '14px', padding: '20px' }}>
                    <div style={{ color: '#f9e2af', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>⏳ Ainda não configurado</div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', lineHeight: 1.6 }}>
                      Essa tela ainda depende de uma conexão adicional com a conta comercial da Meta pra esse cliente. Assim que essa configuração for feita, os templates aprovados aparecem aqui automaticamente.
                    </p>
                  </div>
                )}

                {!templatesCarregando && templatesErro === 'erroApi' && (
                  <div style={{ background: 'rgba(243,139,168,0.06)', border: '1px solid rgba(243,139,168,0.2)', borderRadius: '14px', padding: '20px' }}>
                    <div style={{ color: '#f38ba8', fontSize: '13px', fontWeight: 700 }}>⚠️ Não foi possível carregar os templates agora</div>
                  </div>
                )}

                {!templatesCarregando && !templatesErro && templatesLista.length === 0 && templatesCarregou && (
                  <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px', padding: '20px', textAlign: 'center' }}>Nenhum template encontrado</div>
                )}

                {!templatesCarregando && templatesLista.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {templatesLista.map((t: any) => (
                      <div key={t.id || t.name} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>{t.name}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>{t.category} · {t.language}</div>
                        </div>
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px',
                          background: t.status === 'APPROVED' ? 'rgba(34,197,94,0.1)' : t.status === 'REJECTED' ? 'rgba(243,139,168,0.1)' : 'rgba(249,226,175,0.1)',
                          color: t.status === 'APPROVED' ? '#22c55e' : t.status === 'REJECTED' ? '#f38ba8' : '#f9e2af',
                        }}>{t.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* ABA CATÁLOGO */}
            {abaAtiva === 'catalogo' && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '28px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>🛒 Catálogo de Produtos</h2>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', marginBottom: '24px' }}>
                  Cadastre seus produtos para a IA consultar preço e estoque durante as conversas.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                  <div style={{ width: '70px', height: '70px', borderRadius: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {produtoFotoEnviando ? (
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>...</span>
                    ) : produtoFoto ? (
                      <img src={produtoFoto} alt="Foto do produto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '22px', opacity: 0.2 }}>📷</span>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'inline-block', padding: '9px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter, sans-serif' }}>
                      {produtoFoto ? 'Trocar foto' : 'Adicionar foto (opcional)'}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) enviarFotoProduto(f) }} />
                    </label>
                    {produtoFoto && (
                      <button onClick={() => setProdutoFoto('')} style={{ marginLeft: '8px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>
                        remover
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 120px auto', gap: '10px', marginBottom: '20px' }}>
                  <input className="inp-focus" placeholder="Nome do produto" value={produtoNome} onChange={e => setProdutoNome(e.target.value)} style={inp} />
                  <input className="inp-focus" placeholder="Variação (ex: 5kg, Azul)" value={produtoVariacao} onChange={e => setProdutoVariacao(e.target.value)} style={inp} />
                  <input className="inp-focus" type="number" placeholder="Preço" value={produtoPreco} onChange={e => setProdutoPreco(e.target.value)} style={inp} />
                  <input className="inp-focus" type="number" placeholder="Estoque" value={produtoEstoque} onChange={e => setProdutoEstoque(e.target.value)} style={inp} />
                  <button onClick={produtoEditandoId ? salvarEdicaoProduto : criarProduto} disabled={produtoSalvando} style={{ padding: '12px 20px', background: 'linear-gradient(135deg,#FF6B00,#ff8c33)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 12px rgba(255,107,0,0.3)' }}>
                    {produtoSalvando ? '...' : produtoEditandoId ? 'Salvar edição' : '+ Adicionar'}
                  </button>
                  {produtoEditandoId && (
                    <button onClick={cancelarEdicaoProduto} style={{ padding: '12px 16px', background: 'transparent', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>
                      Cancelar
                    </button>
                  )}
                </div>

                {produtoErro && (
                  <div style={{ background: 'rgba(243,139,168,0.08)', border: '1px solid rgba(243,139,168,0.2)', color: '#f38ba8', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>
                    ⚠️ {produtoErro}
                  </div>
                )}

                {produtosCarregando && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '20px', textAlign: 'center' }}>Carregando...</div>}

                {!produtosCarregando && produtosLista.length === 0 && (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '14px' }}>Nenhum produto cadastrado ainda</div>
                )}

                {!produtosCarregando && produtosLista.length > 0 && (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {['', 'Nome', 'Variação', 'Preço', 'Estoque', ''].map((h, i) => <th key={i} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {produtosLista.map((p: any) => (
                        <tr key={p.id} className="row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '8px 12px' }}>
                            {p.foto ? (
                              <img src={p.foto} alt={p.nome} style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', opacity: 0.15 }}>📷</div>
                            )}
                          </td>
                          <td style={{ padding: '13px 12px', color: 'white', fontSize: '14px', fontWeight: 600 }}>{p.nome}</td>
                          <td style={{ padding: '13px 12px', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>{p.variacao}</td>
                          <td style={{ padding: '13px 12px', color: '#FF6B00', fontSize: '13px', fontWeight: 700 }}>R$ {Number(p.preco).toFixed(2)}</td>
                          <td style={{ padding: '13px 12px', color: p.estoque > 0 ? 'rgba(255,255,255,0.5)' : '#f38ba8', fontSize: '13px' }}>{p.estoque}</td>
                          <td style={{ padding: '13px 12px', textAlign: 'right' }}>
                            <button onClick={() => iniciarEdicaoProduto(p)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontFamily: 'Inter, sans-serif', marginRight: '6px' }}>Editar</button>
                            <button className="del-btn" onClick={() => deletarProduto(p.id)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontFamily: 'Inter, sans-serif' }}>Deletar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}



            {/* ABA RAMAL */}
            {abaAtiva === 'ramal' && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '28px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>Ramal Virtual</h2>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px', marginBottom: '24px' }}>Número dedicado para receber ligações</p>
                <div style={{ background: 'rgba(255,107,0,0.04)', border: '1px solid rgba(255,107,0,0.15)', borderRadius: '14px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: '#FF6B00', fontSize: '24px', fontWeight: 900, fontFamily: 'Space Mono, monospace' }}>{configEmpresa?.ramalNumero || 'Em breve'}</div>
                    <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', marginTop: '6px' }}>Aguardando upgrade</div>
                  </div>
                  <span style={{ background: 'rgba(249,226,175,0.08)', border: '1px solid rgba(249,226,175,0.2)', color: '#f9e2af', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>⏳ Pendente</span>
                </div>
              </div>
            )}

            {/* MODAL DE CONFIGURAÇÕES */}
            {configAberta && (
              <div onClick={() => setConfigAberta(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div onClick={e => e.stopPropagation()} style={{ background: '#0a0a0d', border: '1px solid rgba(255,107,0,0.2)', borderRadius: '20px', padding: '28px', maxWidth: '440px', width: '100%', boxShadow: '0 32px 64px rgba(0,0,0,0.8)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '17px', fontWeight: 800 }}>⚙️ Configurações</h2>
                    <button onClick={() => setConfigAberta(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '18px' }}>✕</button>
                  </div>

                  {configCarregando && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '20px 0', textAlign: 'center' }}>Carregando...</div>}

                  {!configCarregando && (
                    <>
                      {configErro && (
                        <div style={{ background: 'rgba(243,139,168,0.08)', border: '1px solid rgba(243,139,168,0.2)', color: '#f38ba8', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>
                          ⚠️ {configErro}
                        </div>
                      )}

                      {configSucesso && (
                        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>
                          ✓ Salvo com sucesso!
                        </div>
                      )}

                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                          WhatsApp para notificações
                        </label>
                        <input
                          className="inp-focus"
                          type="text"
                          placeholder="+5511999999999"
                          value={configTelefoneAdmin}
                          onChange={e => setConfigTelefoneAdmin(e.target.value)}
                          style={inp}
                        />
                        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', marginTop: '8px', lineHeight: 1.5 }}>
                          Número que recebe avisos de novos pedidos e leads quentes.
                        </p>
                      </div>

                      <button onClick={salvarConfig} disabled={configSalvando} style={{ width: '100%', padding: '13px', background: configSalvando ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#FF6B00,#ff8c33)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: configSalvando ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
                        {configSalvando ? 'Salvando...' : 'Salvar'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ABA WHATSAPP */}
            {abaAtiva === 'whatsapp' && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '28px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>💬 WhatsApp</h2>
                <a href={linkWhatsApp} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg,#25d366,#20ba58)', color: 'white', padding: '10px 20px', borderRadius: '12px', textDecoration: 'none', fontSize: '13px', fontWeight: 700, marginBottom: '24px', boxShadow: '0 4px 16px rgba(37,211,102,0.3)' }}>
                  💬 Abrir Conversas ao Vivo →
                </a>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '24px' }}>
                  {[{ label: 'Mensagens', val: whatsAppUsados, icon: '💬', color: '#25d366' }, { label: 'Contatos', val: contatos.length, icon: '👥', color: '#74c7ec' }, { label: 'Aguardando', val: contatos.filter((c: any) => c.status === 'Aguardando retorno').length, icon: '⏳', color: '#f9e2af' }].map(({ label, val, icon, color }) => (
                    <div key={label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' as const, letterSpacing: '1px', fontWeight: 600 }}>{label}</span>
                        <span>{icon}</span>
                      </div>
                      <div style={{ fontSize: '32px', fontWeight: 900, color, lineHeight: 1 }}>{val}</div>
                    </div>
                  ))}
                </div>
                {configEmpresa?.limiteWhatsApp !== 999999 && (
                  <div style={{ marginBottom: '20px', background: 'rgba(37,211,102,0.04)', border: '1px solid rgba(37,211,102,0.1)', borderRadius: '12px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>WhatsApp usados este mês</span>
                      <span style={{ fontSize: '11px', color: '#25d366', fontWeight: 700 }}>{whatsAppUsados} / {configEmpresa?.limiteWhatsApp}</span>
                    </div>
                    <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pctWA}%`, background: pctWA >= 90 ? '#f38ba8' : '#25d366', borderRadius: '4px', transition: 'width 0.5s', boxShadow: '0 0 8px rgba(37,211,102,0.4)' }} />
                    </div>
                  </div>
                )}
                <input className="inp-focus" type="text" placeholder="Telefone (+5511999999999)" value={waTelefone} onChange={e => setWaTelefone(e.target.value)} style={{ ...inp, marginBottom: '12px' }} />
                <textarea className="inp-focus" placeholder="Mensagem WhatsApp..." rows={4} value={waMensagem} onChange={e => setWaMensagem(e.target.value)} style={{ ...inp, marginBottom: '16px', resize: 'none' as const }} />
                {waStatus && <div style={{ background: waStatus.includes('✓') ? 'rgba(37,211,102,0.08)' : 'rgba(243,139,168,0.08)', border: `1px solid ${waStatus.includes('✓') ? 'rgba(37,211,102,0.2)' : 'rgba(243,139,168,0.2)'}`, borderRadius: '10px', padding: '10px 14px', color: waStatus.includes('✓') ? '#25d366' : '#f38ba8', fontSize: '13px', marginBottom: '16px' }}>{waStatus}</div>}
                <button onClick={enviarWhatsApp} disabled={waEnviando} style={{ width: '100%', padding: '14px', background: waEnviando ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#25d366,#20ba58)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: waEnviando ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: waEnviando ? 'none' : '0 4px 16px rgba(37,211,102,0.3)' }}>
                  {waEnviando ? 'Enviando...' : '💬 Enviar WhatsApp'}
                </button>

                {/* Sub-seção: Perfil do WhatsApp */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '32px', paddingTop: '28px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>🏢 Perfil do WhatsApp</h3>
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', marginBottom: '20px' }}>
                    Foto e descrição que seus clientes veem ao abrir a conversa.
                  </p>

                  {perfilCarregando && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '20px', textAlign: 'center' }}>Carregando...</div>}

                  {!perfilCarregando && (
                    <>
                      {perfilErro && (
                        <div style={{ background: 'rgba(243,139,168,0.08)', border: '1px solid rgba(243,139,168,0.2)', color: '#f38ba8', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '20px' }}>
                          ⚠️ {perfilErro}
                        </div>
                      )}

                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px', padding: '16px 18px', marginBottom: '24px' }}>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Nome de exibição</div>
                        <div style={{ fontSize: '15px', color: 'white', fontWeight: 700, marginBottom: '4px' }}>{perfilNomeAtual || '—'}</div>
                        <div style={{ fontSize: '12px', color: perfilNomeStatus === 'APPROVED' ? '#4ade80' : 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>
                          Status: {perfilNomeStatus || 'desconhecido'}
                        </div>
                        <a href="https://business.facebook.com/wa/manage" target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#FF6B00', textDecoration: 'none', fontWeight: 600 }}>
                          Trocar nome no WhatsApp Manager →
                        </a>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {perfilFotoNova ? (
                            <img src={perfilFotoNova} alt="Nova foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : perfilFotoUrl ? (
                            <img src={perfilFotoUrl} alt="Foto atual" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '26px', opacity: 0.2 }}>🏢</span>
                          )}
                        </div>
                        <label style={{ display: 'inline-block', padding: '9px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter, sans-serif' }}>
                          Trocar foto
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) converterFotoPerfil(f) }} />
                        </label>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>Frase curta (about) — máx. 139 caracteres</label>
                        <input className="inp-focus" value={perfilAbout} onChange={e => setPerfilAbout(e.target.value.slice(0, 139))} placeholder="Ex: Atendimento rápido via WhatsApp" style={{ ...inp, width: '100%' }} />
                      </div>

                      <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>Descrição — máx. 512 caracteres</label>
                        <textarea value={perfilDescricao} onChange={e => setPerfilDescricao(e.target.value.slice(0, 512))} placeholder="Conte um pouco sobre sua empresa..." rows={3} style={{ ...inp, width: '100%', resize: 'vertical', fontFamily: 'Inter, sans-serif' }} />
                      </div>

                      <button onClick={salvarPerfil} disabled={perfilSalvando} style={{ padding: '12px 24px', background: 'linear-gradient(135deg,#FF6B00,#ff8c33)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 12px rgba(255,107,0,0.3)' }}>
                        {perfilSalvando ? 'Salvando...' : 'Salvar perfil'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
