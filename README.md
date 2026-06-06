# Rifa Camisa da Seleção

Página estática para divulgar a rifa e permitir consulta online dos números disponíveis.

## Páginas

- `index.html`: página pública para os compradores.
- `admin.html`: página de orientação e controle interno.
- `google-sheets-modelo.csv`: modelo para criar a planilha com os números de `00` a `119`.

## Controle recomendado: Google Sheets

Este é o modo mais prático para atualizar pelo celular.

1. Crie uma planilha no Google Sheets.
2. Importe ou cole o conteúdo de `google-sheets-modelo.csv`.
3. Mantenha estas colunas: `numero`, `status`, `nome`.
4. Publique a planilha como CSV.
5. Copie o link CSV publicado.
6. Cole o link no campo `sheetCsvUrl` do arquivo `app.js`.
7. Opcional: cole o link de edição da planilha no campo `sheetEditUrl` do arquivo `app.js`.

Exemplo no `app.js`:

```js
sheetCsvUrl: "https://docs.google.com/spreadsheets/d/e/.../pub?output=csv",
sheetEditUrl: "https://docs.google.com/spreadsheets/d/...",
```

Depois disso, você edita pelo app do Google Sheets no celular e o site público lê os dados da planilha.

## Status aceitos

- `available` ou `disponivel`: número disponível.
- `reserved` ou `reservado`: número reservado.
- `sold` ou `vendido`: número vendido.

## Como o comprador usa

1. Acessa `index.html`.
2. Consulta os números.
3. Seleciona um ou mais números disponíveis.
4. Clica para reservar pelo WhatsApp.

## Arte da campanha

A página usa a imagem `arte-rifa-camisa.jpg` na primeira seção. Mantenha o arquivo da arte da campanha com esse nome na mesma pasta do `index.html`.

## Publicar online

Opções simples:

- Netlify: arraste a pasta do projeto para o painel do Netlify.
- GitHub Pages: envie estes arquivos para um repositório e ative Pages.

Com Google Sheets configurado, você não precisa republicar o site a cada número vendido. Basta editar a planilha.
