import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function DashboardCliente() {
    const cookieStore = await cookies()
    const clienteId = cookieStore.get('flowsms_cliente_session')?.value

    if (!clienteId) {
        redirect('/cliente/login')
    }

    return (
        <main style={{ background: '#050508', minHeight: '100vh', color: 'white', fontFamily: 'Inter, sans-serif', padding: '32px' }}>
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>
                    Bem-vindo à sua área <span style={{ color: '#FF6B00' }}>FlowSMS</span>
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                    Login funcionando! Este é um painel inicial — as telas de Financeiro, Configurações e Templates
                    entram aqui nos próximos passos.
                </p>
            </div>
        </main>
    )
}