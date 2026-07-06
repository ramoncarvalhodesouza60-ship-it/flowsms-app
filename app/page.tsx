'use client'
import { useState, useEffect, useRef } from 'react'

const empresas: any[] = [
  {
    email: 'admin@flowsms.com',
    senha: '123456',
    empresa: 'FlowSMS Admin',
    whatsapp: true,
    ramal: true,
    ramalNumero: '+1 252 690 3012',
    limiteSMS: 999999,
    limiteWhatsApp: 999999,
  },
  {
    email: 'nycollas@empresa.com',
    senha: 'nycollas123',
    empresa: 'Empresa Nycollas',
    whatsapp: true,
    ramal: false,
    ramalNumero: null,
    limiteSMS: 20000,
    limiteWhatsApp: 0,
  },
]

const statusColors: Record<string, { bg: string; color: string; dot: string }> = {
  'Aguardando retorno': { bg: 'rgba(249,226,175,0.12)', color: '#f9e2af', dot: '#f9e2af' },
  'Não interessado': { bg: 'rgba(243,139,168,0.12)', color: '#f38ba8', dot: '#f38ba8' },
  'Sem resposta': { bg: 'rgba(108,117,125,0.12)', color: '#888', dot: '#888' },
  'Convertido': { bg: 'rgba(166,227,161,0.12)', color: '#a6e3a1', dot: '#a6e3a1' },
}

const G = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Space+Mono:wght@700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#070709;font-family:'Plus Jakarta Sans',sans-serif;}
.orb{position:fixed;border-radius:50%;filter:blur(80px);opacity:.13;pointer-events:none;z-index:0;}
.orb1{width:520px;height:520px;background:radial-gradient(circle,#FF6B00,transparent);top:-120px;left:-120px;animation:f1 9s ease-in-out infinite;}
.orb2{width:420px;height:420px;background:radial-gradient(circle,#ff4500,transparent);bottom:-100px;right:-80px;animation:f2 11s ease-in-out infinite;}
.orb3{width:320px;height:320px;background:radial-gradient(circle,#ff8c33,transparent);top:50%;left:55%;transform:translate(-50%,-50%);animation:f3 7s ease-in-out infinite;}
@keyframes f1{0%,100%{transform:translate(0,0)}40%{transform:translate(40px,-40px)}70%{transform:translate(-20px,30px)}}
@keyframes f2{0%,100%{transform:translate(0,0)}35%{transform:translate(-30px,30px)}65%{transform:translate(25px,-20px)}}
@keyframes f3{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.15)}}
.grid-bg{position:fixed;inset:0;background-image:linear-gradient(rgba(255,107,0,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,107,0,.025) 1px,transparent 1px);background-size:60px 60px;z-index:0;pointer-events:none;}
.particle{position:fixed;border-radius:50%;background:#FF6B00;animation:twinkle var(--dur) ease-in-out infinite var(--delay);opacity:0;pointer-events:none;z-index:0;}
@keyframes twinkle{0%,100%{opacity:0;transform:scale(0)}50%{opacity:.5;transform:scale(1)}}
.z1{position:relative;z-index:1;}
input::placeholder,textarea::placeholder{color:rgba(255,255,255,.2);}
input:focus,textarea:focus{outline:none;border-color:#FF6B00!important;background:rgba(255,107,0,.08)!important;box-shadow:0 0 0 3px rgba(255,107,0,.12);}
.row-hover:hover td{background:rgba(255,107,0,.03);}
.tab-btn:hover{color:rgba(255,255,255,.7)!important;}
.del-btn:hover{background:rgba(243,139,168,.15)!important;color:#f38ba8!important;border-color:rgba(243,139,168,.3)!important;}
.card:hover{border-color:rgba(255,107,0,.3)!important;transform:translateY(-2px);box-shadow:0 8px 32px rgba(255,107,0,.08);}
.card{transition:all .2s;}
.btn-main{transition:all .2s;}
.btn-main:hover:not(:disabled){background:#ff8c33!important;transform:translateY(-1px);box-shadow:0 12px 32px rgba(255,107,0,.4)!important;}
.btn-ghost-hover:hover:not(:disabled){background:rgba(255,107,0,.08)!important;}
::-webkit-scrollbar{width:4px;}
::-webkit-scrollbar-thumb{background:#333;border-radius:4px;}
`

function Particles() {
  return (
    <>
      {Array.from({ length: 28 }).map((_, i) => (
        <div key={i} className="particle" style={{
          left: `${Math.random() * 100}vw`,
          top: `${Math.random() * 100}vh`,
          width: Math.random() > 0.5 ? '2px' : '3px',
          height: Math.random() > 0.5 ? '2px' : '3px',
          ['--dur' as any]: `${3 + Math.random() * 3}s`,
          ['--delay' as any]: `${Math.random() * 4}s`,
        }} />
      ))}
    </>
  )
}

function BgFx() {
  return (
    <>
      <style>{G}</style>
      <div className="orb orb1" />
      <div className="orb orb2" />
      <div className="orb orb3" />
      <div className="grid-bg" />
      <Particles />
    </>
  )
}

const inp: React.CSSProperties = {
  width: '100%', padding: '13px 16px',
  background: 'rgba(255,107,0,0.05)',
  border: '1px solid rgba(255,107,0,0.4)',
  borderRadius: '12px', color: 'white',
  fontSize: '14px', fontFamily: "'Plus Jakarta Sans', sans-serif",
  transition: 'all .2s',
}

type ContatoCSV = { nome: string; telefone: string }
type ResultadoSMS = { telefone: string; sucesso: boolean; erro?: string }

function normalizarTelefone(raw: string): string {
  return raw.replace(/\D/g, '')
}

export default function Home() {
  const [logado, setLogado] = useState(false)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
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
  const [filtroStatus, setFiltroStatus] = useState('Todos')
  const [smsUsados, setSmsUsados] = useState(0)
  const [whatsAppUsados, setWhatsAppUsados] = useState(0)
  const [waTelefone, setWaTelefone] = useState('')
  const [waMensagem, setWaMensagem] = useState('')
  const [waStatus, setWaStatus] = useState('')
  const [waEnviando, setWaEnviando] = useState(false)

  // Estados do disparo em massa SMS
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
  const inputSmsCSVRef = useRef<HTMLInputElement>(null)

  function entrar() {
    const encontrada = empresas.find(e => e.email === email && e.senha === senha)
    if (encontrada) {
      setEmpresaAtual(encontrada.empresa)
      setConfigEmpresa(encontrada)
      setLogado(true)
    } else setErro('Email ou senha incorretos')
  }

  async function carregarUso(empresa: string) {
    try {
      const res = await fetch('/api/uso?empresa=' + encodeURIComponent(empresa))
      const data = await res.json()
      if (data.success) {
        setSmsUsados(data.sms.usados)
        setWhatsAppUsados(data.whatsapp.usados)
      }
    } catch (e) {
      console.error('Erro ao carregar uso:', e)
    }
  }

  async function carregarContatos() {
    const res = await fetch('/api/contatos?empresa=' + encodeURIComponent(empresaAtual))
    const data = await res.json()
    if (Array.isArray(data)) setContatos(data)
  }

  async function atualizarStatus(id: string, status: string) {
    await fetch('/api/contatos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    })
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
      const telefone = partes[1]?.trim().replace(/"/g, '')
      if (nome && telefone) {
        await fetch('/api/contatos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, telefone, empresa: empresaAtual }) })
      }
    }
    carregarContatos()
  }

  useEffect(() => {
    if (logado && empresaAtual) {
      carregarContatos()
      carregarUso(empresaAtual)
    }
  }, [logado, empresaAtual])

  async function adicionarContato() {
    if (!novoNome || !novoTel) return
    setAdicionando(true)
    const res = await fetch('/api/contatos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: novoNome, telefone: novoTel, empresa: empresaAtual }) })
    const data = await res.json()
    if (data.success) { setNovoNome(''); setNovoTel(''); carregarContatos() }
    setAdicionando(false)
  }

  async function dispararSMS() {
    if (!telefone || !mensagem) { setStatus('Preencha o telefone e a mensagem!'); return }
    if (smsUsados >= (configEmpresa?.limiteSMS || 0)) {
      setStatus('❌ Limite de SMS atingido! Entre em contato para renovar seu plano.')
      return
    }
    setEnviando(true); setStatus('')
    try {
      const res = await fetch('/api/sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefone, mensagem, contatoId: null, empresa: empresaAtual }) })
      const data = await res.json()
      if (data.success) {
        setSmsUsados(prev => prev + 1)
        setStatus('✓ SMS enviado com sucesso!')
        setTelefone(''); setMensagem('')
      } else setStatus('Erro: ' + data.error)
    } catch { setStatus('Erro ao enviar SMS') }
    setEnviando(false)
  }

  // ===== DISPARO EM MASSA SMS =====
  function processarCSVSMS(texto: string): ContatoCSV[] {
    const linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    const resultado: ContatoCSV[] = []
    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i]
      if (i === 0 && !/\d/.test(linha)) continue
      const partes = linha.split(',').map(p => p.trim().replace(/^"|"$/g, ''))
      let nome = '', telefoneRaw = ''
      if (partes.length >= 2) { nome = partes[0]; telefoneRaw = partes[1] }
      else { telefoneRaw = partes[0]; nome = '' }
      const tel = normalizarTelefone(telefoneRaw)
      if (tel.length >= 10) resultado.push({ nome: nome || tel, telefone: tel })
    }
    return resultado
  }

  function handleUploadCSVSMS(arquivo: File) {
    setSmsNomeArquivo(arquivo.name)
    setSmsErroCampanha(null)
    setSmsResultados([])
    const reader = new FileReader()
    reader.onload = (e) => {
      const texto = e.target?.result as string
      const lista = processarCSVSMS(texto)
      if (lista.length === 0) { setSmsErroCampanha('Nenhum contato válido encontrado. Formato: Nome,Telefone'); return }
      setSmsCSV(lista)
      if (lista.length < smsQuantidade) setSmsQuantidade(lista.length)
    }
    reader.onerror = () => setSmsErroCampanha('Erro ao ler o arquivo.')
    reader.readAsText(arquivo, 'UTF-8')
  }

  const smsDisponiveis = smsCSV.filter(c => !smsJaEnviados.has(c.telefone)).length

  async function executarDisparoSMS() {
    if (!smsMensagemMassa.trim()) { setSmsErroCampanha('Digite a mensagem antes de disparar.'); return }
    const limite = configEmpresa?.limiteSMS || 0
    const disponivelPlano = limite - smsUsados
    if (disponivelPlano <= 0) { setSmsErroCampanha('❌ Limite de SMS atingido! Entre em contato para renovar seu plano.'); return }

    const lista = smsCSV.filter(c => !smsJaEnviados.has(c.telefone)).slice(0, Math.min(smsQuantidade, disponivelPlano))
    if (lista.length === 0) { setSmsErroCampanha('Não há contatos disponíveis para disparo.'); return }

    setSmsDisparando(true)
    setSmsErroCampanha(null)
    setSmsResultados([])
    setSmsProgressoTotal(lista.length)
    setSmsProgressoAtual(0)

    let enviados = 0
    const resultados: ResultadoSMS[] = []

    for (const contato of lista) {
      try {
        const res = await fetch('/api/sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telefone: contato.telefone, mensagem: smsMensagemMassa, contatoId: null, empresa: empresaAtual })
        })
        const data = await res.json()
        if (data.success) {
          enviados++
          resultados.push({ telefone: contato.telefone, sucesso: true })
        } else {
          resultados.push({ telefone: contato.telefone, sucesso: false, erro: data.error || 'Falhou' })
        }
      } catch (e: any) {
        resultados.push({ telefone: contato.telefone, sucesso: false, erro: e.message })
      }
      setSmsProgressoAtual(prev => prev + 1)
      // Pequeno delay para não sobrecarregar
      await new Promise(r => setTimeout(r, 200))
    }

    setSmsUsados(prev => prev + enviados)
    setSmsResultados(resultados)
    setSmsJaEnviados(prev => {
      const novo = new Set(prev)
      lista.forEach(c => novo.add(c.telefone))
      return novo
    })
    setSmsDisparando(false)
  }

  function limparCampanhaSMS() {
    setSmsCSV([])
    setSmsNomeArquivo('')
    setSmsResultados([])
    setSmsErroCampanha(null)
    setSmsProgressoAtual(0)
    setSmsProgressoTotal(0)
  }

  async function enviarWhatsApp() {
    if (!waTelefone || !waMensagem) { setWaStatus('Preencha o telefone e a mensagem!'); return }
    if (whatsAppUsados >= (configEmpresa?.limiteWhatsApp || 0)) { setWaStatus('❌ Limite atingido!'); return }
    setWaEnviando(true); setWaStatus('')
    try {
      const res = await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefone: waTelefone, mensagem: waMensagem }) })
      const data = await res.json()
      if (data.success) {
        await fetch('/api/whatsapp/mensagens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefone: waTelefone, mensagem: waMensagem, tipo: 'enviada', empresa: empresaAtual }) })
        setWhatsAppUsados(prev => prev + 1)
        setWaStatus('✓ WhatsApp enviado!')
        setWaTelefone(''); setWaMensagem('')
      } else setWaStatus('Erro: ' + JSON.stringify(data.error))
    } catch { setWaStatus('Erro ao enviar') }
    setWaEnviando(false)
  }

  async function dispararWhatsAppParaTodos() {
    if (!waMensagem) { setWaStatus('Digite a mensagem!'); return }
    const limite = configEmpresa?.limiteWhatsApp || 0
    const disponiveis = limite - whatsAppUsados
    if (disponiveis <= 0) { setWaStatus('❌ Limite de WhatsApp atingido!'); return }
    setWaEnviando(true)
    let enviados = 0, erros = 0
    for (const contato of contatos) {
      if (!contato.telefone) continue
      if (whatsAppUsados + enviados >= limite) break
      try {
        const res = await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefone: contato.telefone, mensagem: waMensagem }) })
        const data = await res.json()
        if (data.success) {
          enviados++
          await fetch('/api/whatsapp/mensagens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefone: contato.telefone, mensagem: waMensagem, tipo: 'enviada', empresa: empresaAtual }) })
        } else erros++
      } catch { erros++ }
    }
    setWhatsAppUsados(prev => prev + enviados)
    setWaStatus(`✓ ${enviados} enviados, ${erros} erros.`)
    setWaEnviando(false)
  }

  const initials = empresaAtual.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const contatosFiltrados = contatos.filter((c: any) => filtroStatus === 'Todos' || c.status === filtroStatus)
  const limiteSMS = configEmpresa?.limiteSMS || 1
  const limiteWhatsApp = configEmpresa?.limiteWhatsApp || 1
  const porcentagemSMS = Math.min((smsUsados / limiteSMS) * 100, 100)
  const porcentagemWA = Math.min((whatsAppUsados / limiteWhatsApp) * 100, 100)
  const corBarra = porcentagemSMS >= 90 ? '#f38ba8' : porcentagemSMS >= 70 ? '#f9e2af' : '#FF6B00'
  const linkWhatsApp = '/whatsapp?empresa=' + encodeURIComponent(empresaAtual)
  const smsEnviadosCampanha = smsResultados.filter(r => r.sucesso).length
  const smsFailsCampanha = smsResultados.filter(r => !r.sucesso).length

  if (!logado) return (
    <main style={{ background: '#070709', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <BgFx />
      <div className="z1" style={{ width: '100%', maxWidth: '420px', background: 'rgba(10,10,12,0.85)', border: '1px solid rgba(255,107,0,0.4)', borderRadius: '24px', padding: '44px 40px', backdropFilter: 'blur(30px)', boxShadow: '0 0 80px rgba(255,107,0,0.08), 0 32px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '32px' }}>
          <span style={{ color: '#FF6B00', fontSize: '22px', fontWeight: 900, fontFamily: "'Space Mono', monospace" }}>Flow</span>
          <span style={{ color: 'white', fontSize: '22px', fontWeight: 900, fontFamily: "'Space Mono', monospace" }}>SMS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <div style={{ width: '20px', height: '2px', background: '#FF6B00', borderRadius: '2px' }} />
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', color: '#FF6B00', textTransform: 'uppercase' }}>Área do Cliente</span>
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '6px' }}>Bem-vindo ao <span style={{ color: '#FF6B00' }}>FlowSMS</span></h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '36px' }}>Gerencie SMS e WhatsApp em um só lugar 🚀</p>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '8px' }}>E-mail</label>
          <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && entrar()} style={inp} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '8px' }}>Senha</label>
          <input type="password" placeholder="••••••••" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key === 'Enter' && entrar()} style={inp} />
        </div>
        {erro && <div style={{ background: 'rgba(243,139,168,0.1)', border: '1px solid rgba(243,139,168,0.25)', borderRadius: '10px', padding: '10px 14px', color: '#f38ba8', fontSize: '13px', marginBottom: '16px' }}>{erro}</div>}
        <button className="btn-main" onClick={entrar} style={{ width: '100%', padding: '16px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 800, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: '0 8px 24px rgba(255,107,0,0.3)', letterSpacing: '0.3px' }}>
          Entrar no Sistema →
        </button>
      </div>
    </main>
  )

  return (
    <main style={{ background: '#070709', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'white' }}>
      <BgFx />
      <nav className="z1" style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(7,7,9,0.85)', borderBottom: '1px solid rgba(255,107,0,0.1)', padding: '0 32px', height: '64px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <span style={{ color: '#FF6B00', fontSize: '20px', fontWeight: 900, fontFamily: "'Space Mono', monospace" }}>Flow</span>
          <span style={{ color: 'white', fontSize: '20px', fontWeight: 900, fontFamily: "'Space Mono', monospace" }}>SMS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#FF6B00,#ff9a4d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: 'white' }}>{initials}</div>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>{empresaAtual}</span>
          <button onClick={() => setLogado(false)} style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Sair</button>
        </div>
      </nav>

      <div className="z1" style={{ padding: '32px', maxWidth: '960px', margin: '0 auto' }}>
        {/* Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '32px' }}>
          <div className="card" style={{ background: 'rgba(255,107,0,0.04)', border: '1px solid rgba(255,107,0,0.1)', borderRadius: '16px', padding: '24px', cursor: 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>SMS Enviados</span>
              <span style={{ fontSize: '20px' }}>📨</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#FF6B00', lineHeight: 1, letterSpacing: '-1px' }}>
              {smsUsados.toLocaleString('pt-BR')}
              {configEmpresa?.limiteSMS !== 999999 && <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}> / {configEmpresa?.limiteSMS?.toLocaleString('pt-BR')}</span>}
            </div>
            {configEmpresa?.limiteSMS !== 999999 && (
              <>
                <div style={{ marginTop: '12px', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${porcentagemSMS}%`, background: corBarra, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ fontSize: '11px', color: porcentagemSMS >= 90 ? '#f38ba8' : 'rgba(255,255,255,0.2)', marginTop: '6px' }}>
                  {porcentagemSMS >= 90 ? '⚠️ Limite quase atingido!' : `${(limiteSMS - smsUsados).toLocaleString('pt-BR')} SMS restantes`}
                </div>
              </>
            )}
          </div>
          <div className="card" style={{ background: 'rgba(255,107,0,0.04)', border: '1px solid rgba(255,107,0,0.1)', borderRadius: '16px', padding: '24px', cursor: 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Contatos</span>
              <span style={{ fontSize: '20px' }}>👥</span>
            </div>
            <div style={{ fontSize: '40px', fontWeight: 900, color: '#74c7ec', lineHeight: 1, letterSpacing: '-1px' }}>{contatos.length}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', marginTop: '8px' }}>na base de dados</div>
          </div>
          <div className="card" style={{ background: 'rgba(255,107,0,0.04)', border: '1px solid rgba(255,107,0,0.1)', borderRadius: '16px', padding: '24px', cursor: 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Aguardando</span>
              <span style={{ fontSize: '20px' }}>⏳</span>
            </div>
            <div style={{ fontSize: '40px', fontWeight: 900, color: '#f9e2af', lineHeight: 1, letterSpacing: '-1px' }}>{contatos.filter((c: any) => c.status === 'Aguardando retorno').length}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', marginTop: '8px' }}>retorno pendente</div>
          </div>
        </div>

        {/* Tabs principais */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '4px', width: 'fit-content', marginBottom: '24px' }}>
          {[
            ['sms', '📨 Disparar SMS'],
            ['contatos', '👥 Contatos'],
            ...(configEmpresa?.ramal ? [['ramal', '📞 Ramal']] : []),
            ...(configEmpresa?.whatsapp ? [['whatsapp', '💬 WhatsApp']] : []),
          ].map(([aba, label]) => (
            <button key={aba} className="tab-btn" onClick={() => setAbaAtiva(aba)} style={{ padding: '9px 22px', borderRadius: '11px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, background: abaAtiva === aba ? '#FF6B00' : 'transparent', color: abaAtiva === aba ? 'white' : 'rgba(255,255,255,0.3)', fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all .2s' }}>{label}</button>
          ))}
        </div>

        {/* ABA SMS */}
        {abaAtiva === 'sms' && (
          <div style={{ background: 'rgba(255,107,0,0.03)', border: '1px solid rgba(255,107,0,0.1)', borderRadius: '16px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800 }}>Disparar SMS</h2>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '3px', gap: '2px' }}>
                <button onClick={() => setSmsSubAba('individual')} style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, background: smsSubAba === 'individual' ? '#FF6B00' : 'transparent', color: smsSubAba === 'individual' ? 'white' : 'rgba(255,255,255,0.3)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  📱 Individual
                </button>
                <button onClick={() => setSmsSubAba('massa')} style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, background: smsSubAba === 'massa' ? '#FF6B00' : 'transparent', color: smsSubAba === 'massa' ? 'white' : 'rgba(255,255,255,0.3)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  🚀 Disparo em Massa
                </button>
              </div>
            </div>

            {/* Sub-aba Individual */}
            {smsSubAba === 'individual' && (
              <>
                <input type="text" placeholder="Telefone (+5511999999999)" value={telefone} onChange={e => setTelefone(e.target.value)} style={{ ...inp, marginBottom: '12px' }} />
                <textarea placeholder="Digite a mensagem..." value={mensagem} onChange={e => setMensagem(e.target.value)} rows={4} style={{ ...inp, marginBottom: '6px', resize: 'none' }} />
                <div style={{ textAlign: 'right', fontSize: '11px', color: mensagem.length > 140 ? '#f38ba8' : 'rgba(255,255,255,0.2)', marginBottom: '16px' }}>{mensagem.length}/160 caracteres</div>
                {status && <div style={{ background: status.includes('✓') ? 'rgba(166,227,161,0.1)' : 'rgba(243,139,168,0.1)', border: `1px solid ${status.includes('✓') ? 'rgba(166,227,161,0.25)' : 'rgba(243,139,168,0.25)'}`, borderRadius: '10px', padding: '10px 14px', color: status.includes('✓') ? '#a6e3a1' : '#f38ba8', fontSize: '13px', marginBottom: '16px' }}>{status}</div>}
                <button className="btn-main" onClick={dispararSMS} disabled={enviando || smsUsados >= limiteSMS} style={{ width: '100%', padding: '14px', background: (enviando || smsUsados >= limiteSMS) ? '#333' : '#FF6B00', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 800, cursor: (enviando || smsUsados >= limiteSMS) ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {enviando ? 'Enviando...' : smsUsados >= limiteSMS ? '❌ Limite Atingido' : '📨 Enviar SMS'}
                </button>
              </>
            )}

            {/* Sub-aba Disparo em Massa */}
            {smsSubAba === 'massa' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {smsErroCampanha && (
                  <div style={{ background: 'rgba(243,139,168,0.1)', border: '1px solid rgba(243,139,168,0.3)', color: '#f38ba8', padding: '12px 16px', borderRadius: '10px', fontSize: '13px' }}>
                    ⚠️ {smsErroCampanha}
                  </div>
                )}

                {/* Passo 1: CSV */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,107,0,0.15)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ color: '#FF6B00', fontSize: '12px', fontWeight: 700, marginBottom: '10px' }}>1. Importar lista de contatos</div>
                  <input ref={inputSmsCSVRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleUploadCSVSMS(e.target.files[0])} />
                  <button onClick={() => inputSmsCSVRef.current?.click()}
                    style={{ background: 'rgba(255,107,0,0.05)', border: '1px dashed rgba(255,107,0,0.3)', color: '#888', padding: '14px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', width: '100%', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    📁 {smsNomeArquivo || 'Clique para selecionar arquivo CSV'}
                  </button>
                  <div style={{ color: '#444', fontSize: '11px', marginTop: '6px' }}>Formato: Nome,Telefone (uma por linha). Só o telefone também funciona.</div>
                  {smsCSV.length > 0 && (
                    <div style={{ marginTop: '12px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                        ✓ {smsCSV.length} contatos carregados
                      </div>
                      <div style={{ color: '#666', fontSize: '12px' }}>{smsDisponiveis} ainda não receberam nesta sessão</div>
                      <button onClick={limparCampanhaSMS} style={{ background: 'none', border: 'none', color: '#555', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline', marginLeft: 'auto' }}>Limpar</button>
                    </div>
                  )}
                </div>

                {/* Passo 2: Mensagem */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,107,0,0.15)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ color: '#FF6B00', fontSize: '12px', fontWeight: 700, marginBottom: '10px' }}>2. Mensagem do disparo</div>
                  <textarea placeholder="Digite a mensagem que será enviada para todos..." value={smsMensagemMassa} onChange={e => setSmsMensagemMassa(e.target.value)} rows={4}
                    style={{ ...inp, resize: 'none', marginBottom: '6px' }} />
                  <div style={{ textAlign: 'right', fontSize: '11px', color: smsMensagemMassa.length > 140 ? '#f38ba8' : 'rgba(255,255,255,0.2)' }}>{smsMensagemMassa.length}/160 caracteres</div>
                </div>

                {/* Passo 3: Quantidade */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,107,0,0.15)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ color: '#FF6B00', fontSize: '12px', fontWeight: 700, marginBottom: '10px' }}>3. Quantidade de disparos nesta campanha</div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input type="number" min={1} max={Math.min(smsDisponiveis, limiteSMS - smsUsados) || 1} value={smsQuantidade}
                      onChange={e => setSmsQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{ width: '120px', padding: '10px 14px', background: 'rgba(255,107,0,0.05)', border: '1px solid rgba(255,107,0,0.4)', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }} />
                    <span style={{ color: '#666', fontSize: '12px' }}>de {smsDisponiveis} contatos disponíveis</span>
                    {smsDisponiveis > 0 && (
                      <button onClick={() => setSmsQuantidade(Math.min(smsDisponiveis, limiteSMS - smsUsados))}
                        style={{ background: 'none', border: '1px solid rgba(255,107,0,0.2)', color: '#888', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        Máximo disponível
                      </button>
                    )}
                  </div>
                  <div style={{ color: '#444', fontSize: '11px', marginTop: '6px' }}>
                    Limite do plano: {(limiteSMS - smsUsados).toLocaleString('pt-BR')} SMS restantes este mês
                  </div>
                </div>

                {/* Botão disparar */}
                <button onClick={executarDisparoSMS} disabled={smsDisparando || smsCSV.length === 0 || !smsMensagemMassa.trim()}
                  style={{ background: smsDisparando ? '#333' : '#FF6B00', border: 'none', color: 'white', padding: '16px', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: (smsDisparando || smsCSV.length === 0 || !smsMensagemMassa.trim()) ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: (smsCSV.length === 0 || !smsMensagemMassa.trim()) ? 0.4 : 1 }}>
                  {smsDisparando ? `Disparando... ${smsProgressoAtual}/${smsProgressoTotal}` : `🚀 Disparar para ${Math.min(smsQuantidade, smsDisponiveis)} contatos`}
                </button>

                {/* Barra de progresso */}
                {smsDisparando && (
                  <div style={{ background: '#1a1a1a', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
                    <div style={{ background: '#FF6B00', height: '100%', width: `${smsProgressoTotal > 0 ? (smsProgressoAtual / smsProgressoTotal) * 100 : 0}%`, transition: 'width 0.3s' }} />
                  </div>
                )}

                {/* Resultados */}
                {smsResultados.length > 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,107,0,0.15)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, flex: 1, textAlign: 'center' }}>
                        ✓ {smsEnviadosCampanha} enviados
                      </div>
                      {smsFailsCampanha > 0 && (
                        <div style={{ background: 'rgba(243,139,168,0.1)', border: '1px solid rgba(243,139,168,0.3)', color: '#f38ba8', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, flex: 1, textAlign: 'center' }}>
                          ✗ {smsFailsCampanha} falharam
                        </div>
                      )}
                    </div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {smsResultados.map((r, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px', borderBottom: '1px solid rgba(255,107,0,0.05)', fontSize: '12px' }}>
                          <span style={{ color: '#888' }}>{r.telefone}</span>
                          <span style={{ color: r.sucesso ? '#22c55e' : '#f38ba8' }}>{r.sucesso ? '✓ Enviado' : '✗ ' + (r.erro || 'Falhou')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ABA CONTATOS */}
        {abaAtiva === 'contatos' && (
          <div style={{ background: 'rgba(255,107,0,0.03)', border: '1px solid rgba(255,107,0,0.1)', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '24px' }}>Contatos</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', marginBottom: '20px' }}>
              <input placeholder="Nome" value={novoNome} onChange={e => setNovoNome(e.target.value)} style={inp} />
              <input placeholder="Telefone (+5511...)" value={novoTel} onChange={e => setNovoTel(e.target.value)} style={inp} />
              <button className="btn-main" onClick={adicionarContato} disabled={adicionando} style={{ padding: '12px 20px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {adicionando ? '...' : '+ Adicionar'}
              </button>
            </div>
            <label style={{ background: 'rgba(255,107,0,0.05)', border: '1px solid rgba(255,107,0,0.12)', borderRadius: '8px', padding: '9px 16px', color: 'rgba(255,255,255,0.35)', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              📁 Importar CSV
              <input type="file" accept=".csv" onChange={e => e.target.files && importarCSV(e.target.files[0])} style={{ display: 'none' }} />
            </label>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', marginBottom: '20px' }}>Formato: Nome, Telefone (uma por linha)</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {['Todos', 'Aguardando retorno', 'Não interessado', 'Sem resposta'].map(f => (
                <button key={f} onClick={() => setFiltroStatus(f)} style={{ padding: '6px 14px', borderRadius: '20px', border: `1px solid ${filtroStatus === f ? '#FF6B00' : 'rgba(255,107,0,0.15)'}`, cursor: 'pointer', fontSize: '12px', fontWeight: 700, background: filtroStatus === f ? '#FF6B00' : 'transparent', color: filtroStatus === f ? 'white' : 'rgba(255,255,255,0.3)', fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all .2s' }}>{f}</button>
              ))}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,107,0,0.08)' }}>
                  {['Nome', 'Telefone', 'Status', 'Alterar', ''].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {contatosFiltrados.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '14px' }}>Nenhum contato encontrado</td></tr>
                ) : contatosFiltrados.map(c => {
                  const sc = statusColors[c.status] || statusColors['Aguardando retorno']
                  return (
                    <tr key={c.id} className="row-hover" style={{ borderBottom: '1px solid rgba(255,107,0,0.05)', transition: 'background .15s' }}>
                      <td style={{ padding: '14px 12px', color: 'white', fontSize: '14px', fontWeight: 600 }}>{c.nome}</td>
                      <td style={{ padding: '14px 12px', color: 'rgba(255,255,255,0.35)', fontSize: '12px', fontFamily: "'Space Mono', monospace" }}>{c.telefone}</td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{ background: sc.bg, color: sc.color, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: sc.dot }} />
                          {c.status || 'Aguardando retorno'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <select onChange={e => atualizarStatus(c.id, e.target.value)} defaultValue={c.status || 'Aguardando retorno'} style={{ background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.2)', borderRadius: '8px', color: 'white', padding: '6px 10px', fontSize: '12px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none' }}>
                          <option>Aguardando retorno</option>
                          <option>Não interessado</option>
                          <option>Sem resposta</option>
                          <option>Convertido</option>
                        </select>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <button className="del-btn" onClick={() => deletarContato(c.id)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.08)', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all .2s' }}>Deletar</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ABA RAMAL */}
        {abaAtiva === 'ramal' && (
          <div style={{ background: 'rgba(255,107,0,0.03)', border: '1px solid rgba(255,107,0,0.1)', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '8px' }}>Ramal Virtual</h2>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', marginBottom: '24px' }}>Número para receber ligações dos clientes</p>
            <div style={{ background: 'rgba(255,107,0,0.06)', border: '1px solid rgba(255,107,0,0.2)', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#FF6B00', fontSize: '22px', fontWeight: 900, fontFamily: "'Space Mono', monospace" }}>{configEmpresa?.ramalNumero || 'Em breve'}</div>
                <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', marginTop: '6px' }}>Twilio — Aguardando upgrade</div>
              </div>
              <span style={{ background: 'rgba(249,226,175,0.12)', color: '#f9e2af', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>⏳ Pendente</span>
            </div>
          </div>
        )}

        {/* ABA WHATSAPP */}
        {abaAtiva === 'whatsapp' && (
          <div style={{ background: 'rgba(255,107,0,0.03)', border: '1px solid rgba(255,107,0,0.1)', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>💬 WhatsApp</h2>
            <a href={linkWhatsApp} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#25d366', color: 'white', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontSize: '13px', fontWeight: 800, marginBottom: '24px' }}>
              💬 Abrir Conversas ao Vivo →
            </a>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '28px' }}>
              {[
                { label: 'Mensagens', val: whatsAppUsados, icon: '💬', color: '#25d366' },
                { label: 'Contatos', val: contatos.length, icon: '👥', color: '#74c7ec' },
                { label: 'Aguardando', val: contatos.filter((c: any) => c.status === 'Aguardando retorno').length, icon: '⏳', color: '#f9e2af' },
              ].map(({ label, val, icon, color }) => (
                <div key={label} style={{ background: 'rgba(255,107,0,0.04)', border: '1px solid rgba(255,107,0,0.1)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, letterSpacing: '1px', fontWeight: 700 }}>{label}</span>
                    <span>{icon}</span>
                  </div>
                  <div style={{ fontSize: '36px', fontWeight: 900, color, lineHeight: 1 }}>{val}</div>
                </div>
              ))}
            </div>
            {configEmpresa?.limiteWhatsApp !== 999999 && (
              <div style={{ marginBottom: '20px', background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.15)', borderRadius: '10px', padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>WhatsApp usados este mês</span>
                  <span style={{ fontSize: '11px', color: '#25d366', fontWeight: 700 }}>{whatsAppUsados} / {configEmpresa?.limiteWhatsApp}</span>
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${porcentagemWA}%`, background: porcentagemWA >= 90 ? '#f38ba8' : '#25d366', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ fontSize: '11px', color: porcentagemWA >= 90 ? '#f38ba8' : 'rgba(255,255,255,0.2)', marginTop: '6px' }}>
                  {porcentagemWA >= 90 ? '⚠️ Limite quase atingido!' : `${(limiteWhatsApp - whatsAppUsados).toLocaleString('pt-BR')} mensagens restantes`}
                </div>
              </div>
            )}
            <input type="text" placeholder="Telefone (+5511999999999)" value={waTelefone} onChange={e => setWaTelefone(e.target.value)} style={{ ...inp, marginBottom: '12px' }} />
            <textarea placeholder="Digite a mensagem WhatsApp..." rows={4} value={waMensagem} onChange={e => setWaMensagem(e.target.value)} style={{ ...inp, marginBottom: '16px', resize: 'none' as const }} />
            {waStatus && <div style={{ background: waStatus.includes('✓') ? 'rgba(37,211,102,0.1)' : 'rgba(243,139,168,0.1)', border: `1px solid ${waStatus.includes('✓') ? 'rgba(37,211,102,0.25)' : 'rgba(243,139,168,0.25)'}`, borderRadius: '10px', padding: '10px 14px', color: waStatus.includes('✓') ? '#25d366' : '#f38ba8', fontSize: '13px', marginBottom: '16px' }}>{waStatus}</div>}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={enviarWhatsApp} disabled={waEnviando} style={{ flex: 1, padding: '14px', background: waEnviando ? '#333' : '#25d366', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 800, cursor: waEnviando ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {waEnviando ? 'Enviando...' : '💬 Enviar WhatsApp'}
              </button>
              <button onClick={dispararWhatsAppParaTodos} disabled={waEnviando} style={{ flex: 1, padding: '14px', background: 'transparent', color: '#25d366', border: '1px solid #25d36660', borderRadius: '10px', fontSize: '14px', fontWeight: 800, cursor: waEnviando ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {waEnviando ? 'Enviando...' : '🚀 Disparar para Todos'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}