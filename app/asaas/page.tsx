'use client'
import { useState } from 'react'

type DadosSubconta = {
    name: string
    email: string
    cpfCnpj: string
    birthDate: string
    mobilePhone: string
    incomeValue: string
    postalCode: string
    address: string
    addressNumber: string
    province: string
}

const inicial: DadosSubconta = {
    name: '',
    email: '',
    cpfCnpj: '',
    birthDate: '',
    mobilePhone: '',
    incomeValue: '',
    postalCode: '',
    address: '',
    addressNumber: '',
    province: '',
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    color: 'white',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Arial',
}

const labelStyle: React.CSSProperties = {
    color: '#666',
    fontSize: '11px',
    display: 'block',
    marginBottom: '6px',
}

export default function CriarSubconta() {
    const [dados, setDados] = useState<DadosSubconta>(inicial)
    const [enviando, setEnviando] = useState(false)
    const [erro, setErro] = useState<string | null>(null)
    const [sucesso, setSucesso] = useState(false)

    function atualizar(campo: keyof DadosSubconta, valor: string) {
        setDados(prev => ({ ...prev, [campo]: valor }))
    }

    async function criarSubconta() {
        setErro(null)

        if (!dados.name.trim() || !dados.email.trim() || !dados.cpfCnpj.trim()) {
            setErro('Preencha ao menos nome, e-mail e CPF/CNPJ.')
            return
        }

        setEnviando(true)
        try {
            const res = await fetch('/api/asaas/criar-subconta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados),
            })
            const data = await res.json()

            if (data.sucesso) {
                setSucesso(true)
            } else {
                setErro(data.erro || 'Erro ao criar subconta.')
            }
        } catch (e: any) {
            setErro('Falha ao criar subconta: ' + e.message)
        } finally {
            setEnviando(false)
        }
    }

    if (sucesso) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', height: '100vh', background: '#0a0a0a', fontFamily: 'Arial' }}>
                <div style={{ fontSize: '36px' }}>✅</div>
                <div style={{ color: 'white', fontSize: '16px', fontWeight: 700 }}>Subconta criada com sucesso!</div>
                <div style={{ color: '#666', fontSize: '13px' }}>Você já pode receber pagamentos pela plataforma.</div>
            </div>
        )
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'Arial, sans-serif' }}>

            {/* TOP BAR */}
            <div style={{ background: '#111', borderBottom: '1px solid #1e1e1e', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <a href="/" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textDecoration: 'none' }}>← Voltar ao Dashboard</a>
                <span style={{ color: '#FF6B00', fontSize: '16px', fontWeight: 800 }}>
                    Flow<span style={{ color: 'white' }}>SMS</span>
                    <span style={{ color: '#555', fontWeight: 400, fontSize: '14px' }}> — Criar Subconta</span>
                </span>
            </div>

            <div style={{ padding: '32px', display: 'flex', justifyContent: 'center' }}>
                <div style={{ maxWidth: '600px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    <div>
                        <h2 style={{ color: 'white', fontSize: '20px', fontWeight: 800, margin: 0 }}>💳 Ativar recebimento de pagamentos</h2>
                        <p style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>Preencha seus dados para criar sua subconta e começar a receber via Pix, boleto e cartão.</p>
                    </div>

                    {erro && (
                        <div style={{ background: 'rgba(243,139,168,0.1)', border: '1px solid rgba(243,139,168,0.3)', color: '#f38ba8', padding: '12px 16px', borderRadius: '10px', fontSize: '13px' }}>
                            ⚠️ {erro}
                        </div>
                    )}

                    {/* DADOS PESSOAIS */}
                    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '14px', padding: '20px' }}>
                        <div style={{ color: '#FF6B00', fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>1. Dados da subconta</div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={labelStyle}>Nome completo / Razão social</label>
                                <input value={dados.name} onChange={e => atualizar('name', e.target.value)} placeholder="Ex: João da Silva" style={inputStyle} />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>E-mail</label>
                                    <input value={dados.email} onChange={e => atualizar('email', e.target.value)} placeholder="email@exemplo.com" style={inputStyle} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>CPF ou CNPJ</label>
                                    <input value={dados.cpfCnpj} onChange={e => atualizar('cpfCnpj', e.target.value.replace(/\D/g, ''))} placeholder="Somente números" style={inputStyle} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Data de nascimento</label>
                                    <input type="date" value={dados.birthDate} onChange={e => atualizar('birthDate', e.target.value)} style={inputStyle} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Telefone celular</label>
                                    <input value={dados.mobilePhone} onChange={e => atualizar('mobilePhone', e.target.value)} placeholder="(00) 00000-0000" style={inputStyle} />
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>Faturamento mensal estimado (R$)</label>
                                <input value={dados.incomeValue} onChange={e => atualizar('incomeValue', e.target.value.replace(/\D/g, ''))} placeholder="0" style={inputStyle} />
                            </div>
                        </div>
                    </div>

                    {/* ENDEREÇO */}
                    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '14px', padding: '20px' }}>
                        <div style={{ color: '#FF6B00', fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>2. Endereço</div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ width: '160px' }}>
                                    <label style={labelStyle}>CEP</label>
                                    <input value={dados.postalCode} onChange={e => atualizar('postalCode', e.target.value.replace(/\D/g, ''))} placeholder="Somente números" style={inputStyle} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Rua / Avenida</label>
                                    <input value={dados.address} onChange={e => atualizar('address', e.target.value)} placeholder="Rua/Avenida" style={inputStyle} />
                                </div>
                                <div style={{ width: '100px' }}>
                                    <label style={labelStyle}>Número</label>
                                    <input value={dados.addressNumber} onChange={e => atualizar('addressNumber', e.target.value)} placeholder="0000" style={inputStyle} />
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>Bairro</label>
                                <input value={dados.province} onChange={e => atualizar('province', e.target.value)} placeholder="Bairro" style={inputStyle} />
                            </div>
                        </div>
                    </div>

                    {/* BOTÃO + SELO ASAAS */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                        <button onClick={criarSubconta} disabled={enviando}
                            style={{
                                background: enviando ? '#333' : '#FF6B00', border: 'none', color: 'white', padding: '16px',
                                borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: enviando ? 'not-allowed' : 'pointer',
                                fontFamily: 'Arial', width: '100%'
                            }}>
                            {enviando ? 'Criando subconta...' : '✅ Criar subconta e ativar pagamentos'}
                        </button>

                        {/* Selo obrigatório de transparência do Asaas — exigência regulatória */}
                        <img
                            src="https://baas.asaas.com/selos/Servicos_financeiros_Asaas-Reduzida-Positivo.svg?id=3029a127-ec86-48e4-852d-a8a2a870a516"
                            alt="Serviços financeiros Asaas"
                            width={140}
                            height={42}
                            style={{ display: 'inline-block', opacity: 0.9 }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}








