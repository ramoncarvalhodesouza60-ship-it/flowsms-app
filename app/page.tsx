'use client'
import { useState, useEffect } from 'react'

const empresas = [
  { email: 'admin@flowsms.com', senha: '123456', empresa: 'FlowSMS Admin' },
  { email: 'nycollas@empresa.com', senha: 'nycollas123', empresa: 'Empresa Nycollas' },
]

export default function Home() {
  const [logado, setLogado] = useState(false)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [empresaAtual, setEmpresaAtual] = useState('')
  const [telefone, setTelefone] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [status, setStatus] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [contatos, setContatos] = useState<any[]>([])
  const [novoNome, setNovoNome] = useState('')
  const [novoTel, setNovoTel] = useState('')
  const [adicionando, setAdicionando] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState('sms')

  function entrar() {
    const encontrada = empresas.find(e => e.email === email && e.senha === senha)
    if (encontrada) {
      setEmpresaAtual(encontrada.empresa)
      setLogado(true)
    } else {
      setErro('Email ou senha incorretos')
    }
  }

  async function carregarContatos() {
    const res = await fetch('/api/contatos?empresa=' + encodeURIComponent(empresaAtual))
    const data = await res.json()
    if (data.success) setContatos(data.contatos)
  }

  useEffect(() => {
    if (logado) carregarContatos()
  }, [logado])

  async function adicionarContato() {
    if (!novoNome || !novoTel) return
    setAdicionando(true)
    const res = await fetch('/api/contatos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novoNome, telefone: novoTel, empresa: empresaAtual })
    })
    const data = await res.json()
    if (data.success) {
      setNovoNome('')
      setNovoTel('')
      carregarContatos()
    }
    setAdicionando(false)
  }

  async function dispararSMS() {
    if (!telefone || !mensagem) { setStatus('Preencha o telefone e a mensagem!'); return }
    setEnviando(true)
    setStatus('')
    try {
      const res = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone, mensagem, contatoId: null })
      })
      const data = await res.json()
      if (data.success) { setStatus('SMS enviado com sucesso!'); setTelefone(''); setMensagem('') }
      else setStatus('Erro: ' + data.error)
    } catch { setStatus('Erro ao enviar SMS') }
    setEnviando(false)
  }

  async function dispararParaTodos() {
    if (!mensagem) { setStatus('Digite a mensagem antes de disparar!'); return }
    setEnviando(true)
    setStatus('')
    let enviados = 0
    let erros = 0
    for (const contato of contatos) {
      if (!contato.telefone) continue
      try {
        const res = await fetch('/api/sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telefone: contato.telefone, mensagem, contatoId: contato.id })
        })
        const data = await res.json()
        if (data.success) enviados++
        else erros++
      } catch { erros++ }
    }
    setStatus('Disparado! ' + enviados + ' enviados, ' + erros + ' erros.')
    carregarContatos()
    setEnviando(false)
  }

  const s = { input: { width: '100%', padding: '12px 16px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const } }

  if (!logado) return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '380px' }}>
        <h1 style={{ color: '#FF6B00', fontSize: '28px', fontWeight: '800', textAlign: 'center', marginBottom: '8px' }}>Flow<span style={{ color: 'white' }}>SMS</span></h1>
        <p style={{ color: '#666', textAlign: 'center', marginBottom: '32px', fontSize: '14px' }}>Acesse sua conta</p>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ ...s.input, marginBottom: '12px' }} />
        <input type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} style={{ ...s.input, marginBottom: '16px' }} />
        {erro && <p style={{ color: '#f38ba8', fontSize: '13px', marginBottom: '12px' }}>{erro}</p>}
        <button onClick={entrar} style={{ width: '100%', padding: '14px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>Entrar no Sistema</button>
      </div>
    </main>
  )

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <nav style={{ background: '#111', borderBottom: '1px solid #222', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: '#FF6B00', fontSize: '22px', fontWeight: '800', margin: 0 }}>Flow<span style={{ color: 'white' }}>SMS</span></h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#666', fontSize: '13px' }}>{empresaAtual}</span>
          <button onClick={() => setLogado(false)} style={{ background: 'transparent', color: '#666', border: '1px solid #333', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Sair</button>
        </div>
      </nav>

      <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {[
            ['SMS Enviados', contatos.filter((c: any) => c.smsEnviado).length.toString(), 'enviados'],
            ['Contatos', contatos.length.toString(), 'no Airtable'],
            ['Aguardando', contatos.filter((c: any) => c.status === 'Aguardando retorno').length.toString(), 'retorno']
          ].map(([label, valor, sub]) => (
            <div key={label} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '12px', color: '#555', marginBottom: '8px', textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#FF6B00' }}>{valor}</div>
              <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[['sms', '📨 Disparar SMS'], ['contatos', '👥 Contatos'], ['ramal', '📞 Ramal']].map(([aba, label]) => (
            <button key={aba} onClick={() => setAbaAtiva(aba)} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600', background: abaAtiva === aba ? '#FF6B00' : '#111', color: abaAtiva === aba ? 'white' : '#666' }}>{label}</button>
          ))}
        </div>

        {abaAtiva === 'sms' && (
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ color: 'white', fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>Disparar SMS</h2>
            <input type="text" placeholder="Telefone (+5511999999999)" value={telefone} onChange={e => setTelefone(e.target.value)} style={{ ...s.input, marginBottom: '12px' }} />
            <textarea placeholder="Digite a mensagem..." value={mensagem} onChange={e => setMensagem(e.target.value)} rows={4} style={{ ...s.input, marginBottom: '16px', resize: 'none' }} />
            {status && <p style={{ color: status.includes('sucesso') ? '#a6e3a1' : '#f38ba8', fontSize: '13px', marginBottom: '12px' }}>{status}</p>}
            <button onClick={dispararSMS} disabled={enviando} style={{ width: '100%', padding: '14px', background: enviando ? '#555' : '#FF6B00', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '700', cursor: enviando ? 'not-allowed' : 'pointer' }}>
              {enviando ? 'Enviando...' : '📨 Disparar SMS'}
            </button>
            <button onClick={dispararParaTodos} disabled={enviando} style={{ width: '100%', padding: '14px', background: enviando ? '#555' : '#1a1a1a', color: '#FF6B00', border: '1px solid #FF6B00', borderRadius: '8px', fontSize: '16px', fontWeight: '700', cursor: enviando ? 'not-allowed' : 'pointer', marginTop: '10px' }}>
              {enviando ? 'Enviando...' : '🚀 Disparar para Todos os Contatos'}
            </button>
          </div>
        )}

        {abaAtiva === 'contatos' && (
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ color: 'white', fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>Contatos</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', marginBottom: '20px' }}>
              <input placeholder="Nome" value={novoNome} onChange={e => setNovoNome(e.target.value)} style={s.input} />
              <input placeholder="Telefone (+5511...)" value={novoTel} onChange={e => setNovoTel(e.target.value)} style={s.input} />
              <button onClick={adicionarContato} disabled={adicionando} style={{ padding: '12px 20px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', whiteSpace: 'nowrap' }}>
                {adicionando ? '...' : '+ Adicionar'}
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #222' }}>
                  {['Nome', 'Telefone', 'Status'].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', color: '#555', textTransform: 'uppercase' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {contatos.length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: '#555', fontSize: '14px' }}>Nenhum contato ainda</td></tr>
                ) : contatos.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #161616' }}>
                    <td style={{ padding: '12px', color: 'white', fontSize: '14px' }}>{c.nome}</td>
                    <td style={{ padding: '12px', color: '#aaa', fontSize: '14px' }}>{c.telefone}</td>
                    <td style={{ padding: '12px' }}><span style={{ background: '#FF6B0022', color: '#FF6B00', padding: '3px 10px', borderRadius: '20px', fontSize: '11px' }}>{c.status || 'Aguardando'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {abaAtiva === 'ramal' && (
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ color: 'white', fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Ramal Virtual</h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>Número para receber ligações dos clientes</p>
            <div style={{ background: '#1a1a1a', border: '1px solid #FF6B0044', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#FF6B00', fontSize: '20px', fontWeight: '700' }}>+1 252 690 3012</div>
                <div style={{ color: '#555', fontSize: '12px', marginTop: '4px' }}>Twilio — Aguardando upgrade</div>
              </div>
              <div style={{ background: '#f9e2af22', color: '#f9e2af', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>⏳ Pendente</div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}