# Rifa Camisa da Seleção

Página estática para divulgar a rifa e permitir consulta online dos números disponíveis.

## Como usar

1. Divulgue `index.html` para os compradores.
2. Use `admin.html` somente para você controlar a rifa.
3. No `admin.html`, marque números como disponíveis, reservados ou vendidos.
4. Use `Exportar controle` para baixar o arquivo `rifa-dados.json` atualizado.
5. Publique novamente o arquivo atualizado para que os compradores vejam a conferência correta.

## O que cada pessoa usa

- Comprador: acessa `index.html`, consulta os números, seleciona um ou mais números disponíveis e clica para chamar no WhatsApp.
- Administrador: acessa `admin.html`, atualiza status, registra nome do comprador e exporta/importa o controle.

## Arte da campanha

A página usa a imagem `arte-rifa-camisa.jpg` na primeira seção. Mantenha o arquivo da arte da campanha com esse nome na mesma pasta do `index.html`.

Se preferir, a página também tenta carregar estes nomes automaticamente:

- `arte-rifa-camisa.jpeg`
- `arte-rifa-camisa.png`
- `arte-rifa-camisa.webp`
- `rifa-camisa.jpg`
- `rifa-camisa.png`
- `rifa-camisa.webp`
- `cartaz-rifa.jpg`
- `cartaz-rifa.png`
- `cartaz-rifa.webp`

## Personalizar

Edite `app.js`:

- `adminPassword`: senha do administrador.
- `firstNumber`: primeiro número da rifa. Nesta campanha está `0`.
- `defaultTotal`: quantidade de números. Nesta campanha está `120`, gerando de `00` a `119`.
- `whatsappNumber`: telefone com DDI e DDD, somente números.
- `whatsappMessage`: mensagem enviada ao comprador.

Edite `rifa-dados.json`:

- `prize`: prêmio da rifa.
- `price`: valor do número.
- `drawDate`: data do sorteio.
- `payment`: forma de pagamento.

## Publicar online

Opções simples:

- GitHub Pages: envie estes arquivos para um repositório e ative Pages.
- Netlify: arraste a pasta do projeto para o painel do Netlify.

## Controle compartilhado

Esta versão funciona sem servidor. Para que todos vejam a atualização, publique novamente o arquivo `rifa-dados.json` exportado pelo administrador.

Também existe suporte para planilha publicada como CSV. No `app.js`, preencha `sheetCsvUrl` com o link CSV de uma planilha que tenha as colunas:

```csv
numero,status,nome
1,available,
2,reserved,Maria
3,sold,Joao
```

Status aceitos: `available`, `reserved`, `sold`, `disponivel`, `disponível`, `reservado` e `vendido`.
