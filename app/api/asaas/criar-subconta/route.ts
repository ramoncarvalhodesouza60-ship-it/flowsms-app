import { NextRequest, NextResponse } from "next/server";
import { verificarToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
    try {
        const cookie = request.cookies.get('sessao')
        if (!cookie) {
            return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
        }
        const sessao = await verificarToken(cookie.value)
        if (!sessao) {
            return NextResponse.json({ erro: 'Sessão inválida' }, { status: 401 })
        }
        if (!sessao.admin) {
            return NextResponse.json({ erro: 'Acesso negado — apenas admin pode criar subcontas' }, { status: 403 })
        }

        const body = await request.json();

        const {
            name,
            email,
            cpfCnpj,
            companyType,
            birthDate,
            mobilePhone,
            incomeValue,
            address,
            addressNumber,
            province,
            postalCode,
        } = body;

        if (!name || !email || !cpfCnpj || !mobilePhone) {
            return NextResponse.json(
                { erro: "Preencha ao menos: name, email, cpfCnpj, mobilePhone" },
                { status: 400 }
            );
        }

        const resposta = await fetch("https://api.asaas.com/v3/accounts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                access_token: process.env.ASAAS_API_KEY as string,
            },
            body: JSON.stringify({
                name,
                email,
                cpfCnpj,
                companyType,
                birthDate,
                mobilePhone,
                incomeValue: incomeValue || 3000,
                address,
                addressNumber,
                province,
                postalCode,
            }),
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            return NextResponse.json(
                { erro: "Asaas recusou a criação da subconta", detalhes: dados },
                { status: resposta.status }
            );
        }

        return NextResponse.json({
            sucesso: true,
            mensagem: "Subconta de teste criada com sucesso!",
            subconta: dados,
        });
    } catch (erro) {
        console.error("Erro ao criar subconta Asaas:", erro);
        return NextResponse.json(
            { erro: "Erro interno ao criar subconta" },
            { status: 500 }
        );
    }
}