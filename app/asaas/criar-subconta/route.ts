import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const {
            name,
            email,
            cpfCnpj,
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