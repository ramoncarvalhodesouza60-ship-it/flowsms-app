// Script para subir a logo do FlowSMS para o Vercel Blob e gerar uma URL pública.
//
// COMO USAR:
// 1. Copie este arquivo (upload-logo.js) para a raiz do seu projeto flowsms-v2
// 2. Copie também o arquivo da logo (Design_sem_nome__1_.png) para a raiz do projeto
// 3. No terminal, dentro da pasta do projeto, rode:
//      node upload-logo.js
// 4. O script vai imprimir a URL pública da imagem — copie ela e cole na assinatura do Zoho Mail (opção "inserir imagem por URL")
//
// Requisito: o pacote @vercel/blob já deve estar instalado (se não estiver, rode: npm install @vercel/blob)
// Requisito: a variável BLOB_READ_WRITE_TOKEN precisa estar no seu .env.local (a mesma usada pelo upload de fotos do Catálogo)

const { put } = require('@vercel/blob');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const filePath = './Design_sem_nome__1_.png';

  if (!fs.existsSync(filePath)) {
    console.error('Erro: não encontrei o arquivo "Design_sem_nome__1_.png" na raiz do projeto.');
    console.error('Copie a imagem da logo para essa pasta antes de rodar o script.');
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(filePath);

  const blob = await put('flowsms-logo-assinatura.png', fileBuffer, {
    access: 'public',
    allowOverwrite: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  console.log('\n✅ Upload feito com sucesso!\n');
  console.log('URL pública da logo:');
  console.log(blob.url);
  console.log('\nCopie essa URL e cole na assinatura do Zoho Mail (inserir imagem por URL).\n');
}

main().catch((err) => {
  console.error('Erro ao subir a imagem:', err);
  process.exit(1);
});
