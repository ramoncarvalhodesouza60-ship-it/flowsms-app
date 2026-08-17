import { NextRequest, NextResponse } from 'next/server'

const Airtable = require('airtable')
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

const APP_ID = '1500082781893269'

async function buscarCredenciaisCliente(empresa: string): Promise<{ token: string; phoneNumberId: string } | null> {
    let resultado: { token: string; phoneNumberId: string } | null = null
    await new Promise<void>((resolve, reject) => {
        const formula = '{empresa} = "' + empresa + '"'
        base('Clientes').select({ filterByFormula: formula, maxRecords: 1 }).eachPage(
            (pageRecords: any[], fetchNextPage: () => void) => {
                pageRecords.forEach((record: any) => {
                    const token = record.get('whatsapp_token')
                    const phoneNumberId = record.get('phone_number_id')
                    if (token && phoneNumberId) resultado = { token, phoneNumberId }
                })
                fetchNextPage()
            },
            (err: any) => { if (err) reject(err); else resolve() }
        )
    })
    return resultado
}

// Busca o perfil atual (foto, descrição) e o status do nome de exibição
export async function GET(request: NextRequest) {
    try {
        const empresa = request.nextUrl.searchParams.get('empresa') || ''
        const credenciais = await buscarCredenciaisCliente(empresa)

        if (!credenciais) {
            return NextResponse.json({ success: false, error: 'Cliente sem WhatsApp conectado' }, { status: 400 })
        }

        const { token, phoneNumberId } = credenciais

        // Busca about, descrição e foto atual
        const perfilRes = await fetch(
            'https://graph.facebook.com/v25.0/' + phoneNumberId + '/whatsapp_business_profile?fields=about,description,profile_picture_url',
            { headers: { Authorization: 'Bearer ' + token } }
        )
        const perfilData = await perfilRes.json()

        // Busca o status do nome de exibição (aprovado, pendente, recusado)
        const nomeRes = await fetch(
            'https://graph.facebook.com/v25.0/' + phoneNumberId + '?fields=name_status,verified_name',
            { headers: { Authorization: 'Bearer ' + token } }
        )
        const nomeData = await nomeRes.json()

        const perfil = perfilData.data?.[0] || {}

        return NextResponse.json({
            success: true,
            about: perfil.about || '',
            description: perfil.description || '',
            fotoUrl: perfil.profile_picture_url || null,
            nomeAtual: nomeData.verified_name || '',
            nomeStatus: nomeData.name_status || null,
        })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// Atualiza foto e/ou descrição do perfil do WhatsApp
export async function POST(request: NextRequest) {
    try {
        const { empresa, about, description, fotoBase64 } = await request.json()
        const credenciais = await buscarCredenciaisCliente(empresa)

        if (!credenciais) {
            return NextResponse.json({ success: false, error: 'Cliente sem WhatsApp conectado' }, { status: 400 })
        }

        const { token, phoneNumberId } = credenciais

        let profilePictureHandle: string | null = null

        // Se veio uma foto nova, faz o upload em 2 etapas (Resumable Upload API)
        if (fotoBase64) {
            // fotoBase64 vem como "data:image/jpeg;base64,XXXXX" — extrai só os bytes
            const base64Limpo = fotoBase64.split(',')[1] || fotoBase64
            const bufferImagem = Buffer.from(base64Limpo, 'base64')

            // Etapa 1: inicia a sessão de upload
            const uploadInicioRes = await fetch(
                'https://graph.facebook.com/v25.0/' + APP_ID + '/uploads' +
                '?file_name=perfil.jpg&file_length=' + bufferImagem.length + '&file_type=image/jpeg' +
                '&access_token=' + token,
                { method: 'POST' }
            )
            const uploadInicioData = await uploadInicioRes.json()

            if (!uploadInicioData.id) {
                console.error('WHATSAPP/PERFIL - erro ao iniciar upload:', uploadInicioData)
                return NextResponse.json({ success: false, error: 'Erro ao iniciar upload da foto: ' + JSON.stringify(uploadInicioData) }, { status: 500 })
            }

            // Etapa 2: envia os bytes da imagem
            const uploadArquivoRes = await fetch(
                'https://graph.facebook.com/v25.0/' + uploadInicioData.id,
                {
                    method: 'POST',
                    headers: {
                        Authorization: 'OAuth ' + token,
                        file_offset: '0',
                    },
                    body: bufferImagem,
                }
            )
            const uploadArquivoData = await uploadArquivoRes.json()

            if (!uploadArquivoData.h) {
                console.error('WHATSAPP/PERFIL - erro ao enviar bytes da foto:', uploadArquivoData)
                return NextResponse.json({ success: false, error: 'Erro ao enviar a foto: ' + JSON.stringify(uploadArquivoData) }, { status: 500 })
            }

            profilePictureHandle = uploadArquivoData.h
        }

        // Etapa 3: atualiza o perfil (about, description e/ou foto)
        const corpoAtualizacao: any = { messaging_product: 'whatsapp' }
        if (about !== undefined) corpoAtualizacao.about = about
        if (description !== undefined) corpoAtualizacao.description = description
        if (profilePictureHandle) corpoAtualizacao.profile_picture_handle = profilePictureHandle

        const atualizarRes = await fetch(
            'https://graph.facebook.com/v25.0/' + phoneNumberId + '/whatsapp_business_profile',
            {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer ' + token,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(corpoAtualizacao),
            }
        )
        const atualizarData = await atualizarRes.json()

        if (!atualizarData.success) {
            console.error('WHATSAPP/PERFIL - erro ao atualizar perfil:', atualizarData)
            return NextResponse.json({ success: false, error: 'Erro ao salvar perfil: ' + JSON.stringify(atualizarData) }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('WHATSAPP/PERFIL - erro geral:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
