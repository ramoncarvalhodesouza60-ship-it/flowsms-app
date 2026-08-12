// Rate limit simples em memória, por IP.
// Funciona bem para bloquear ataques básicos de força bruta.
// Obs: em ambiente serverless (Vercel), cada instância tem sua própria memória,
// então a proteção não é 100% perfeita entre instâncias diferentes — mas já
// bloqueia a grande maioria dos ataques automatizados. Se precisar de algo
// mais robusto no futuro, dá para trocar por Upstash Redis sem mudar a forma
// de uso nas rotas.

type Registro = { tentativas: number; primeiraTentativa: number }

const registros = new Map<string, Registro>()

// Limpa registros antigos de tempos em tempos para não vazar memória
setInterval(() => {
    const agora = Date.now()
    for (const [chave, registro] of registros.entries()) {
        if (agora - registro.primeiraTentativa > 10 * 60 * 1000) {
            registros.delete(chave)
        }
    }
}, 5 * 60 * 1000)

/**
 * Verifica se o IP pode fazer mais uma tentativa.
 * @param ip Endereço IP de quem está fazendo a requisição
 * @param chaveExtra Identificador extra (ex: nome da rota), para separar limites diferentes
 * @param limiteMaximo Quantas tentativas são permitidas na janela de tempo
 * @param janelaMs Duração da janela de tempo em milissegundos
 * @returns { permitido: boolean, restantes: number }
 */
export function verificarRateLimit(
    ip: string,
    chaveExtra: string,
    limiteMaximo: number,
    janelaMs: number
): { permitido: boolean; restantes: number } {
    const chave = chaveExtra + ':' + ip
    const agora = Date.now()
    const registro = registros.get(chave)

    if (!registro || agora - registro.primeiraTentativa > janelaMs) {
        registros.set(chave, { tentativas: 1, primeiraTentativa: agora })
        return { permitido: true, restantes: limiteMaximo - 1 }
    }

    if (registro.tentativas >= limiteMaximo) {
        return { permitido: false, restantes: 0 }
    }

    registro.tentativas++
    return { permitido: true, restantes: limiteMaximo - registro.tentativas }
}

// Extrai o IP da requisição, considerando os cabeçalhos que a Vercel usa
export function obterIP(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for')
    if (forwarded) return forwarded.split(',')[0].trim()
    return 'desconhecido'
}
