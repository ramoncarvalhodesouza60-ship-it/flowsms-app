'use client'
import { useState, useEffect } from 'react'

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
    whatsapp: false,
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

  function entrar() {
    const encontrada = empresas.find(e => e.email === email && e.senha === senha)
    if (encontrada) {
      setEmpresaAtual(encontrada.empresa)
      setConfigEmpresa(encontrada)
      setLogado(true)
    } else setErro('Email ou senha incorretos')
  }

  async function carregarContatos() {
    const res = await fetch('/api/contatos?empresa=' + encodeURIComponent(empresaAtual))
    const data = await res.json()
    if (Array.isArray(data)) {
      setContatos(data)
      // Conta SMS enviados reais do Airtable
      const enviados = data.filter((c: any) => c.smsEnviado).length
      setSmsUsados(enviados)
    }
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

  useEffect(() => { if (logado) carregarContatos() }, [logado])

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
    // Verifica limite
    if (smsUsados >= (configEmpresa?.limiteSMS || 0)) {
      setStatus('❌ Limite de SMS atingido! Entre em contato para renovar seu plano.')
      return
    }
    setEnviando(true); setStatus('')
    try {
      const res = await fetch('/api/sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefone, mensagem, contatoId: null }) })
      const data = await res.json()
      if (data.success) {
        setSmsUsados(prev => prev + 1)
        setStatus('✓ SMS enviado com sucesso!')
        setTelefone(''); setMensagem('')
      } else setStatus('Erro: ' + data.error)
    } catch { setStatus('Erro ao enviar SMS') }
    setEnviando(false)
  }

  async function dispararParaTodos() {
    if (!mensagem) { setStatus('Digite a mensagem antes de disparar!'); return }
    const limite = configEmpresa?.limiteSMS || 0
    const disponiveis = limite - smsUsados
    if (disponiveis <= 0) {
      setStatus('❌ Limite de SMS atingido! Entre em contato para renovar seu plano.')
      return
    }
    if (contatos.length > disponiveis) {
      setStatus(`⚠️ Você só tem ${disponiveis} SMS disponíveis mas tem ${contatos.length} contatos. Serão enviados apenas ${disponiveis}.`)
    }
    setEnviando(true)
    let enviados = 0, erros = 0
    for (const contato of contatos) {
      if (!contato.telefone) continue
      if (smsUsados + enviados >= limite) break
      try {
        const res = await fetch('/api/sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefone: contato.telefone, mensagem, contatoId: contato.id }) })
        const data = await res.json()
        if (data.success) enviados++; else erros++
      } catch { erros++ }
    }
    setSmsUsados(prev => prev + enviados)
    setStatus(`✓ ${enviados} enviados, ${erros} erros.`)
    carregarContatos(); setEnviando(false)
  }

  const initials = empresaAtual.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const contatosFiltrados = contatos.filter((c: any) => filtroStatus === 'Todos' || c.status === filtroStatus)
  const limiteSMS = configEmpresa?.limiteSMS || 1
  const porcentagemSMS = Math.min((smsUsados / limiteSMS) * 100, 100)
  const corBarra = porcentagemSMS >= 90 ? '#f38ba8' : porcentagemSMS >= 70 ? '#f9e2af' : '#FF6B00'

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

      {/* Navbar */}
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
          {/* Card SMS com barra de progresso */}
          <div className="card" style={{ background: 'rgba(255,107,0,0.04)', border: '1px solid rgba(255,107,0,0.1)', borderRadius: '16px', padding: '24px', cursor: 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>SMS Enviados</span>
              <span style={{ fontSize: '20px' }}>📨</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#FF6B00', lineHeight: 1, letterSpacing: '-1px' }}>
              {smsUsados.toLocaleString('pt-BR')}
              {configEmpresa?.limiteSMS !== 999999 && (
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}> / {configEmpresa?.limiteSMS?.toLocaleString('pt-BR')}</span>
              )}
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

        {/* Tabs */}
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

        {/* SMS */}
        {abaAtiva === 'sms' && (
          <div style={{ background: 'rgba(255,107,0,0.03)', border: '1px solid rgba(255,107,0,0.1)', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '24px' }}>Disparar SMS</h2>
            <input type="text" placeholder="Telefone (+5511999999999)" value={telefone} onChange={e => setTelefone(e.target.value)} style={{ ...inp, marginBottom: '12px' }} />
            <textarea placeholder="Digite a mensagem..." value={mensagem} onChange={e => setMensagem(e.target.value)} rows={4} style={{ ...inp, marginBottom: '6px', resize: 'none' }} />
            <div style={{ textAlign: 'right', fontSize: '11px', color: mensagem.length > 140 ? '#f38ba8' : 'rgba(255,255,255,0.2)', marginBottom: '16px' }}>{mensagem.length}/160 caracteres</div>
            {status && <div style={{ background: status.includes('✓') ? 'rgba(166,227,161,0.1)' : 'rgba(243,139,168,0.1)', border: `1px solid ${status.includes('✓') ? 'rgba(166,227,161,0.25)' : 'rgba(243,139,168,0.25)'}`, borderRadius: '10px', padding: '10px 14px', color: status.includes('✓') ? '#a6e3a1' : '#f38ba8', fontSize: '13px', marginBottom: '16px' }}>{status}</div>}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-main" onClick={dispararSMS} disabled={enviando || smsUsados >= limiteSMS} style={{ flex: 1, padding: '14px', background: (enviando || smsUsados >= limiteSMS) ? '#333' : '#FF6B00', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 800, cursor: (enviando || smsUsados >= limiteSMS) ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: enviando ? 'none' : '0 4px 16px rgba(255,107,0,0.25)' }}>
                {enviando ? 'Enviando...' : smsUsados >= limiteSMS ? '❌ Limite Atingido' : '📨 Enviar SMS'}
              </button>
              <button className="btn-ghost-hover" onClick={dispararParaTodos} disabled={enviando || smsUsados >= limiteSMS} style={{ flex: 1, padding: '14px', background: 'transparent', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.4)', borderRadius: '10px', fontSize: '14px', fontWeight: 800, cursor: (enviando || smsUsados >= limiteSMS) ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all .2s' }}>
                {enviando ? 'Enviando...' : '🚀 Disparar para Todos'}
              </button>
            </div>
          </div>
        )}

        {/* Contatos */}
        {abaAtiva === 'contatos' && (
          <div style={{ background: 'rgba(255,107,0,0.03)', border: '1px solid rgba(255,107,0,0.1)', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '24px' }}>Contatos</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', marginBottom: '20px' }}>
              <input placeholder="Nome" value={novoNome} onChange={e => setNovoNome(e.target.value)} style={inp} />
              <input placeholder="Telefone (+5511...)" value={novoTel} onChange={e => setNovoTel(e.target.value)} style={inp} />
              <button className="btn-main" onClick={adicionarContato} disabled={adicionando} style={{ padding: '12px 20px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: '0 4px 16px rgba(255,107,0,0.25)' }}>
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

        {/* Ramal */}
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

        {/* WhatsApp */}
        {abaAtiva === 'whatsapp' && (
          <div style={{ background: 'rgba(255,107,0,0.03)', border: '1px solid rgba(255,107,0,0.1)', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>💬 WhatsApp</h2>
            <a href="/whatsapp" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#25d366', color: 'white', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontSize: '13px', fontWeight: 800, marginBottom: '24px' }}>
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
            <input type="text" placeholder="Telefone (+5511999999999)" style={{ ...inp, marginBottom: '12px' }} />
            <textarea placeholder="Digite a mensagem WhatsApp..." rows={4} style={{ ...inp, marginBottom: '16px', resize: 'none' as const }} />
            {configEmpresa?.limiteWhatsApp !== 999999 && (
              <div style={{ marginBottom: '16px', background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.15)', borderRadius: '10px', padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Conversas WhatsApp usadas</span>
                  <span style={{ fontSize: '11px', color: '#25d366', fontWeight: 700 }}>{whatsAppUsados} / {configEmpresa?.limiteWhatsApp}</span>
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min((whatsAppUsados / (configEmpresa?.limiteWhatsApp || 1)) * 100, 100)}%`, background: whatsAppUsados >= (configEmpresa?.limiteWhatsApp || 0) * 0.9 ? '#f38ba8' : '#25d366', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '28px' }}>
              <button onClick={() => { if (whatsAppUsados >= (configEmpresa?.limiteWhatsApp || 0)) { alert('Limite atingido!'); return } setWhatsAppUsados(prev => prev + 1) }} disabled={whatsAppUsados >= (configEmpresa?.limiteWhatsApp || 0)} style={{ flex: 1, padding: '14px', background: whatsAppUsados >= (configEmpresa?.limiteWhatsApp || 0) ? '#333' : '#25d366', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 800, cursor: whatsAppUsados >= (configEmpresa?.limiteWhatsApp || 0) ? 'not-allowed' : 'pointer' }}>
                {whatsAppUsados >= (configEmpresa?.limiteWhatsApp || 0) ? '❌ Limite Atingido' : '💬 Enviar WhatsApp'}
              </button>
              <button disabled={whatsAppUsados >= (configEmpresa?.limiteWhatsApp || 0)} style={{ flex: 1, padding: '14px', background: 'transparent', color: '#25d366', border: '1px solid #25d36660', borderRadius: '10px', fontSize: '14px', fontWeight: 800, cursor: whatsAppUsados >= (configEmpresa?.limiteWhatsApp || 0) ? 'not-allowed' : 'pointer' }}>
                {whatsAppUsados >= (configEmpresa?.limiteWhatsApp || 0) ? '❌ Limite Atingido' : '🚀 Disparar para Todos'}
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,107,0,0.08)' }}>
                  {['Nome', 'Telefone', 'Status'].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left' as const, fontSize: '10px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' as const, fontWeight: 700 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {contatos.length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: '40px', textAlign: 'center' as const, color: 'rgba(255,255,255,0.2)' }}>Nenhum contato</td></tr>
                ) : contatos.map(c => {
                  const sc = statusColors[c.status] || statusColors['Aguardando retorno']
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,107,0,0.05)' }}>
                      <td style={{ padding: '12px', color: 'white', fontSize: '14px', fontWeight: 600 }}>{c.nome}</td>
                      <td style={{ padding: '12px', color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>{c.telefone}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ background: sc.bg, color: sc.color, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>{c.status || 'Aguardando retorno'}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
