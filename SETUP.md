# NegocIA — Setup

## Pré-requisitos
- [Node.js 20+](https://nodejs.org)
- [pnpm](https://pnpm.io/installation) → `npm install -g pnpm`
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [ngrok](https://ngrok.com/download) → crie uma conta gratuita

---

## 1. Rodar o projeto

```bash
docker-compose up -d
pnpm install
npx prisma migrate deploy
pnpm run start:dev
```

Em outro terminal:
```bash
ngrok http 3000
```

---

## 2. Configurar webhook no Twilio

1. Acesse [console.twilio.com](https://console.twilio.com)
2. **Messaging → Try it out → Send a WhatsApp message → Sandbox settings**
3. Campo **"When a message comes in"**:
   ```
   https://SUA-URL-NGROK.ngrok-free.app/whatsapp/webhook
   ```
4. Método **POST** → **Save**

---

## 3. Entrar no sandbox

No WhatsApp, envie `join opposite-serve` para **+1 415 523 8886**.

---

## 4. Cadastrar dados e testar

Acesse `http://localhost:3000/api`:

1. **POST `/empresa/cadastrar`** — crie sua conta (inclua `endereco` no body)
2. **POST `/auth/login`** → copie o `access_token` → clique em **Authorize**
3. **POST `/faixas-criterio`** — cadastre ao menos uma faixa de negociação. Exemplo:
   ```json
   {
     "descricao": "Dívidas pequenas",
     "valorMinimo": 0,
     "valorMaximo": 1000,
     "prazoMaximoDias": 30,
     "parcelasMaximas": 3,
     "descontoMaximo": 20,
     "tomComunicacao": "informal",
     "mensagemInicial": "Olá! Vimos que você tem uma pendência conosco e gostaríamos de resolver isso juntos."
   }
   ```
4. **POST `/devedor/cadastrar`** — cadastre um devedor com **seu número no campo `telefone`** (formato: `5584999990001`, sem o `+`). O `valorDivida` deve estar dentro da faixa criada. Guarde o `id` retornado.
5. **POST `/whatsapp/iniciar/{id}`** — coloque o `id` do devedor. A primeira mensagem chega no seu WhatsApp e a negociação começa.
