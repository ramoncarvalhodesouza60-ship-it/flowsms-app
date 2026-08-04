import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import BotaoSair from './BotaoSair'
import MeusContatos from './MeusContatos'

const cardPlaceholder: React.CSSProperties = {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '20px',
    padding: '28px',
}

export default async function DashboardCliente() {
    const cookieStore = await cookies()
    const clienteId = cookieStore.get('flowsms_cliente_session')?.value

    if (!clienteId) {
        redirect('/cliente/login')
    }

    return (
        <main style={{ background: '#050508', minHeight: '100vh', color: 'white', fontFamily: 'Inter, sans-serif' }}>

            <nav style={{
                background: 'rgba(5,5,8,0.9)',
                borderBottom: '1px solid rgba(255,107,0,0.1)',
                padding: '0 24px', height: '64px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '1px' }}>
                    <span style={{ color: '#FF6B00', fontSize: '17px', fontWeight: 900, fontFamily: 'Space Mono, monospace' }}>Flow</span>
                    <span style={{ color: 'white', fontSize: '17px', fontWeight: 900, fontFamily: 'Space Mono, monospace' }}>SMS</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', fontWeight: 400, marginLeft: '8px' }}>— Minha Área</span>
                </div>
                <BotaoSair />
            </nav>

            <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '6px' }}>Bem-vindo de volta 👋</h1>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', marginBottom: '32px' }}>
                    Este é o painel da sua loja no FlowSMS.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>

                    <div style={cardPlaceholder}>
                        <div style={{ fontSize: '13px', color: '#FF6B00', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                            💳 Financeiro
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', lineHeight: 1.6 }}>
                            Em breve: saldo, faturamento do mês e saque disponível aqui.
                        </p>
                    </div>

                    <div style={cardPlaceholder}>
                        <div style={{ fontSize: '13px', color: '#FF6B00', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                            ⚙️ Configurações
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', lineHeight: 1.6 }}>
                            Em breve: editar número de WhatsApp, e-mail e mensagens de utilidade.
                        </p>
                    </div>

                </div>

                <MeusContatos />
            </div>
        </main>
    )
}