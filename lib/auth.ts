import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'chave-temporaria-trocar-no-env')

export interface SessaoPayload {
    email: string
    empresa: string
    admin: boolean
}

export async function criarToken(payload: SessaoPayload): Promise<string> {
    return await new SignJWT(payload as any)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secret)
}

export async function verificarToken(token: string): Promise<SessaoPayload | null> {
    try {
        const { payload } = await jwtVerify(token, secret)
        return payload as unknown as SessaoPayload
    } catch {
        return null
    }
}