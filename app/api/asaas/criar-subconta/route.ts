import { NextResponse } from "next/server";

// Rota temporária/manual — usada só pra criar a PRIMEIRA subconta de teste
// na Asaas, exigida no "período de avaliação" antes de liberar o BaaS/White Label.
// Depois que a subconta de teste for criada com sucesso, essa rota já cumpriu
// seu papel — a criação de subcontas reais dos clientes vira parte do item 3
// (tela de Pagamentos), com outro endpoint parecido com esse.

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const {
            name,
            email,
            cpfCnpj,
            companyType, // MEI, LIMITED, INDIVIDUAL, ASSOCIATION
            birthDate, // obrigatório quando cpfCnpj é CPF (pessoa física)
            mobilePhone,
            incomeValue,
            address,
            addressNumber,
            province, // bairro
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