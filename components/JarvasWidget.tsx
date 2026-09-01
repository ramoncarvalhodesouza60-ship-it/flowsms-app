'use client';

import { useState, useEffect, useRef } from 'react';

type Etapa = 'saudacao' | 'categorias' | 'perguntas' | 'resposta' | 'ticket_form' | 'ticket_aberto';

interface Pergunta {
    pergunta: string;
    resposta: string;
}

interface Categoria {
    nome: string;
    perguntas: Pergunta[];
}

const FAQ: Categoria[] = [
    {
        nome: 'Planos e assinatura',
        perguntas: [
            { pergunta: 'Quando vence minha mensalidade?', resposta: 'Sua mensalidade vence todo dia 1 de cada mês. Você recebe um lembrete por e-mail alguns dias antes do vencimento.' },
            { pergunta: 'Como faço upgrade de plano?', resposta: 'Entre em contato com nosso suporte pelo chat, e-mail ou telefone que te ajudamos a migrar pro plano ideal pro seu volume de uso.' },
            { pergunta: 'O que acontece se eu não pagar?', resposta: 'Seu acesso ao painel do FlowSMS fica temporariamente suspenso até a regularização. O saldo já disponível na sua conta de recebimentos continua sendo seu normalmente.' },
        ],
    },
    {
        nome: 'WhatsApp conectado',
        perguntas: [
            { pergunta: 'Como conecto meu número de WhatsApp?', resposta: 'Vá em Configurações > WhatsApp no seu painel e siga o passo a passo de conexão oficial da Meta.' },
            { pergunta: 'Meu WhatsApp desconectou, o que faço?', resposta: 'Isso pode acontecer por instabilidade temporária. Tente reconectar pelo painel; se persistir, fale com nosso suporte.' },
        ],
    },
    {
        nome: 'IA (respostas automáticas)',
        perguntas: [
            { pergunta: 'Como a IA responde meus clientes?', resposta: 'Nossa IA usa inteligência artificial avançada para responder automaticamente as mensagens dos seus clientes no WhatsApp, com base no seu catálogo de produtos e nas informações da sua loja.' },
            { pergunta: 'Posso editar o que a IA fala?', resposta: 'Sim! Você pode personalizar o tom e as informações que a IA usa para responder, direto no seu painel.' },
            { pergunta: 'A IA erra às vezes?', resposta: 'Como toda inteligência artificial, ela pode eventualmente cometer erros. Recomendamos acompanhar as conversas regularmente pelo Kanban.' },
        ],
    },
    {
        nome: 'Financeiro',
        perguntas: [
            { pergunta: 'Como recebo o dinheiro das minhas vendas?', resposta: 'Os pagamentos dos seus clientes finais caem direto na sua conta digital, vinculada com segurança à Asaas, instituição de pagamentos parceira do FlowSMS.' },
            { pergunta: 'Quando cai o saque?', resposta: 'O prazo de disponibilização segue as regras da Asaas. Consulte a tela de Financeiro no seu painel para ver o status atualizado do seu saldo.' },
            { pergunta: 'É seguro?', resposta: 'Sim, todo o processamento financeiro é feito pela Asaas, instituição de pagamentos regulamentada pelo Banco Central.' },
        ],
    },
    {
        nome: 'Catálogo de produtos',
        perguntas: [
            { pergunta: 'Como cadastro meus produtos?', resposta: 'Vá na aba Catálogo do seu painel, clique em "Adicionar produto" e preencha nome, preço, variações (se houver) e foto (opcional).' },
            { pergunta: 'Posso colocar variações do mesmo produto?', resposta: 'Sim! Você pode cadastrar variações (tamanho, cor, sabor, etc.) cada uma com seu próprio preço e estoque.' },
        ],
    },
    {
        nome: 'Templates de mensagem',
        perguntas: [
            { pergunta: 'Como crio um template novo?', resposta: 'Vá na aba Templates do seu painel, clique em "Novo template", escreva o texto seguindo as diretrizes da Meta e envie para aprovação.' },
            { pergunta: 'Por que meu template não foi aprovado?', resposta: 'A aprovação é feita diretamente pela Meta e pode recusar templates com linguagem promocional excessiva, links suspeitos ou conteúdo fora das políticas do WhatsApp Business. Recomendamos revisar o texto e tentar novamente.' },
            { pergunta: 'Quanto tempo demora a aprovação?', resposta: 'O prazo é definido pela Meta e pode variar. Normalmente leva de algumas horas a poucos dias.' },
        ],
    },
    {
        nome: 'Kanban / gestão de leads',
        perguntas: [
            { pergunta: 'Como uso o Kanban?', resposta: 'O Kanban organiza suas conversas em colunas por etapa (ex: Novo contato, Em negociação, Fechado). Basta arrastar o card do cliente entre as colunas conforme o andamento.' },
            { pergunta: 'Posso mudar as colunas?', resposta: 'Sim! Você pode personalizar os nomes e a quantidade de colunas de acordo com o seu processo de vendas.' },
        ],
    },
    {
        nome: 'Conta e acesso',
        perguntas: [
            { pergunta: 'Esqueci minha senha, o que faço?', resposta: 'Clique em "Esqueci minha senha" na tela de login e siga as instruções enviadas por e-mail.' },
            { pergunta: 'Como adiciono um atendente novo?', resposta: 'Vá em Configurações > Atendentes no seu painel e cadastre o novo atendente com nome e contato.' },
            { pergunta: 'Como mudo o número que recebe notificação?', resposta: 'Acesse as configurações da sua conta e atualize o número de contato principal.' },
        ],
    },
    {
        nome: 'Problemas técnicos',
        perguntas: [
            { pergunta: 'O sistema está fora do ar, o que faço?', resposta: 'Entre em contato com o suporte imediatamente pelo chat, e-mail ou telefone — priorizamos esse tipo de chamado.' },
            { pergunta: 'Não estou recebendo mensagens dos meus clientes', resposta: 'Verifique se seu WhatsApp está conectado corretamente no painel. Se o problema persistir, fale com nosso suporte.' },
        ],
    },
];

export default function JarvasWidget({ empresa, emailCliente }: { empresa: string; emailCliente: string }) {
    const [aberto, setAberto] = useState(false);
    const [etapa, setEtapa] = useState<Etapa>('saudacao');
    const [categoriaAtual, setCategoriaAtual] = useState<Categoria | null>(null);
    const [ticketId, setTicketId] = useState<string | null>(null);
    const [mensagens, setMensagens] = useState<any[]>([]);
    const [textoTicket, setTextoTicket] = useState('');
    const [novaMensagem, setNovaMensagem] = useState('');
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    // Polling de mensagens quando o ticket está aberto
    useEffect(() => {
        if (etapa === 'ticket_aberto' && ticketId) {
            pollingRef.current = setInterval(async () => {
                const res = await fetch(`/api/tickets-suporte/${ticketId}`);
                const data = await res.json();
                if (data.ticket) setMensagens(data.ticket.mensagens);
            }, 8000);
        }
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [etapa, ticketId]);

    const abrirTicket = async () => {
        if (!textoTicket.trim()) return;
        const res = await fetch('/api/tickets-suporte', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                empresa,
                email_cliente: emailCliente,
                categoria: categoriaAtual?.nome || 'Outras dúvidas',
                mensagem_inicial: textoTicket,
            }),
        });
        const data = await res.json();
        if (data.success) {
            setTicketId(data.ticket_id);
            setMensagens([{ remetente: 'cliente', texto: textoTicket, data: new Date().toISOString() }]);
            setEtapa('ticket_aberto');
            setTextoTicket('');
        }
    };

    const enviarMensagem = async () => {
        if (!novaMensagem.trim() || !ticketId) return;
        const res = await fetch(`/api/tickets-suporte/${ticketId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nova_mensagem: novaMensagem, remetente: 'cliente' }),
        });
        if (res.ok) {
            setMensagens([...mensagens, { remetente: 'cliente', texto: novaMensagem, data: new Date().toISOString() }]);
            setNovaMensagem('');
        }
    };

    const resetar = () => {
        setEtapa('saudacao');
        setCategoriaAtual(null);
        setTicketId(null);
        setMensagens([]);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {!aberto && (
                <button
                    onClick={() => setAberto(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center text-2xl"
                >
                    💬
                </button>
            )}

            {aberto && (
                <div className="bg-white rounded-lg shadow-2xl w-80 h-[500px] flex flex-col border border-gray-200">
                    {/* Header */}
                    <div className="bg-orange-500 text-white p-4 rounded-t-lg flex justify-between items-center">
                        <span className="font-semibold">Jarvas — Suporte FlowSMS</span>
                        <button onClick={() => setAberto(false)} className="text-white">✕</button>
                    </div>

                    {/* Corpo */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {etapa === 'saudacao' && (
                            <div>
                                <p className="mb-4">Olá! Eu sou o Jarvas, assistente virtual da FlowSMS. Em que posso te ajudar?</p>
                                <p className="mb-3 text-sm text-gray-600">Selecione uma categoria abaixo para tirar suas dúvidas.</p>
                                <button
                                    onClick={() => setEtapa('categorias')}
                                    className="w-full bg-orange-500 text-white rounded py-2 mb-2"
                                >
                                    Ver categorias de ajuda
                                </button>
                            </div>
                        )}

                        {etapa === 'categorias' && (
                            <div className="space-y-2">
                                {FAQ.map((cat) => (
                                    <button
                                        key={cat.nome}
                                        onClick={() => {
                                            setCategoriaAtual(cat);
                                            setEtapa('perguntas');
                                        }}
                                        className="w-full text-left border border-gray-200 rounded p-2 hover:bg-gray-50"
                                    >
                                        {cat.nome}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setEtapa('ticket_form')}
                                    className="w-full text-left border border-orange-300 text-orange-600 rounded p-2 hover:bg-orange-50 mt-3"
                                >
                                    Falar com atendente humano
                                </button>
                            </div>
                        )}

                        {etapa === 'perguntas' && categoriaAtual && (
                            <div className="space-y-2">
                                <button onClick={() => setEtapa('categorias')} className="text-sm text-gray-500 mb-2">← Voltar</button>
                                {categoriaAtual.perguntas.map((p) => (
                                    <details key={p.pergunta} className="border border-gray-200 rounded p-2">
                                        <summary className="cursor-pointer">{p.pergunta}</summary>
                                        <p className="mt-2 text-sm text-gray-700">{p.resposta}</p>
                                    </details>
                                ))}
                                <button
                                    onClick={() => setEtapa('ticket_form')}
                                    className="w-full text-left border border-orange-300 text-orange-600 rounded p-2 hover:bg-orange-50 mt-3"
                                >
                                    Não resolveu? Falar com atendente humano
                                </button>
                            </div>
                        )}

                        {etapa === 'ticket_form' && (
                            <div>
                                <button onClick={() => setEtapa('categorias')} className="text-sm text-gray-500 mb-2">← Voltar</button>
                                <p className="mb-2 text-sm">Descreva sua dúvida que um atendente vai te responder:</p>
                                <textarea
                                    value={textoTicket}
                                    onChange={(e) => setTextoTicket(e.target.value)}
                                    className="w-full border border-gray-300 rounded p-2 text-sm"
                                    rows={4}
                                    placeholder="Escreva sua mensagem..."
                                />
                                <button
                                    onClick={abrirTicket}
                                    className="w-full bg-orange-500 text-white rounded py-2 mt-2"
                                >
                                    Enviar
                                </button>
                            </div>
                        )}

                        {etapa === 'ticket_aberto' && (
                            <div className="flex flex-col h-full">
                                <div className="flex-1 overflow-y-auto space-y-2 mb-2">
                                    {mensagens.map((m, i) => (
                                        <div
                                            key={i}
                                            className={`p-2 rounded text-sm max-w-[80%] ${m.remetente === 'cliente' ? 'bg-orange-100 ml-auto' : 'bg-gray-100'
                                                }`}
                                        >
                                            {m.texto}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        value={novaMensagem}
                                        onChange={(e) => setNovaMensagem(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && enviarMensagem()}
                                        className="flex-1 border border-gray-300 rounded p-2 text-sm"
                                        placeholder="Digite sua mensagem..."
                                    />
                                    <button onClick={enviarMensagem} className="bg-orange-500 text-white rounded px-3">
                                        ➤
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}