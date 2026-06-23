# NegocIA — Guia de Integração Frontend

Base URL: `http://localhost:3000` (dev)

Todas as rotas protegidas exigem o header:
```
Authorization: Bearer <access_token>
```

---

## Autenticação

### Cadastro de empresa
```http
POST /empresa/cadastrar
Content-Type: application/json
```
```json
{
  "nome": "Minha Empresa",
  "email": "empresa@email.com",
  "senha": "123456",
  "cnpj": "12345678000190",
  "telefone": "84999990000",
  "endereco": {
    "cep": "59000-000",
    "logradouro": "Rua das Flores",
    "numero": "100",
    "complemento": "Sala 1",
    "bairro": "Centro",
    "cidade": "Natal",
    "estado": "RN"
  }
}
```
**Resposta 201:**
```json
{
  "id": "uuid",
  "nome": "Minha Empresa",
  "email": "empresa@email.com",
  "cnpj": "12345678000190",
  "telefone": "84999990000",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "endereco": { "cep": "59000-000", "logradouro": "...", ... }
}
```

---

### Login
```http
POST /auth/login
Content-Type: application/json
```
```json
{
  "email": "empresa@email.com",
  "senha": "123456"
}
```
**Resposta 200:**
```json
{
  "access_token": "eyJhbGci...",
  "empresa": {
    "id": "uuid",
    "nome": "Minha Empresa",
    "email": "empresa@email.com"
  }
}
```
> Armazene o `access_token` e o `empresa.id` no estado global (context/store).

---

## Empresa

### Buscar perfil
```http
GET /empresa/perfil
Authorization: Bearer <token>
```
**Resposta 200:**
```json
{
  "id": "uuid",
  "nome": "Minha Empresa",
  "email": "empresa@email.com",
  "cnpj": "12345678000190",
  "telefone": "84999990000",
  "createdAt": "...",
  "updatedAt": "...",
  "endereco": {
    "id": "uuid",
    "cep": "59000-000",
    "logradouro": "Rua das Flores",
    "numero": "100",
    "complemento": null,
    "bairro": "Centro",
    "cidade": "Natal",
    "estado": "RN",
    "empresaId": "uuid"
  }
}
```

---

### Atualizar perfil
```http
PATCH /empresa/perfil
Authorization: Bearer <token>
Content-Type: application/json
```
```json
{
  "nome": "Novo Nome",
  "telefone": "84999990001",
  "senha": "novaSenha123",
  "endereco": {
    "cep": "59001-000",
    "numero": "200"
  }
}
```
> Todos os campos são opcionais. Envie apenas o que mudou.

---

### Painel de indicadores (UC09)
```http
GET /empresa/painel
Authorization: Bearer <token>
```
**Resposta 200:**
```json
{
  "devedores": {
    "total": 10,
    "porStatus": {
      "PENDENTE": 5,
      "EM_NEGOCIACAO": 2,
      "ACORDADO": 2,
      "PAGO": 1
    }
  },
  "propostas": {
    "total": 8,
    "porStatus": {
      "PENDENTE": 4,
      "ACEITA": 3,
      "RECUSADA": 1
    }
  },
  "financeiro": {
    "valorTotalEmAberto": 15000.00,
    "valorTotalRecuperado": 4500.00,
    "taxaRecuperacaoPercent": 23.08
  }
}
```

---

### Excluir conta
```http
DELETE /empresa/perfil
Authorization: Bearer <token>
```
**Resposta 200:**
```json
{ "message": "Empresa deletada com sucesso" }
```

---

## Devedores

### Listar todos
```http
GET /devedor
Authorization: Bearer <token>
```
**Resposta 200:** array de devedores da empresa logada.

---

### Buscar por ID
```http
GET /devedor/:id
Authorization: Bearer <token>
```

---

### Histórico de negociações (UC08)
```http
GET /devedor/:id/historico
Authorization: Bearer <token>
```
**Resposta 200:**
```json
{
  "id": "uuid",
  "nome": "João da Silva",
  "email": "joao@email.com",
  "telefone": "558499999001",
  "valorDivida": 300.00,
  "status": "ACORDADO",
  "propostas": [
    {
      "id": "uuid",
      "status": "ACEITA",
      "valorAcordado": 270.00,
      "parcelasAcordadas": 3,
      "limites": { "valorOriginal": 300, "descontoMaximo": 10, "parcelasMaximas": 3, "prazoMaximoDias": 30 },
      "historico": [
        { "role": "system", "content": "..." },
        { "role": "assistant", "content": "Olá! ..." },
        { "role": "user", "content": "Quero pagar..." }
      ],
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

### Cadastrar devedor
```http
POST /devedor/cadastrar
Authorization: Bearer <token>
Content-Type: application/json
```
```json
{
  "nome": "João da Silva",
  "email": "joao@email.com",
  "telefone": "558499999001",
  "tipoPessoa": "FISICA",
  "cpf": "12345678901",
  "cnpj": null,
  "valorDivida": 300.00,
  "descricaoDivida": "Fatura em atraso",
  "vencimento": "2025-12-31",
  "status": "PENDENTE",
  "origem": "API",
  "tentativas": 0,
  "empresaId": "uuid-da-empresa"
}
```
> `tipoPessoa`: `"FISICA"` | `"JURIDICA"`
> `status`: `"PENDENTE"` | `"EM_NEGOCIACAO"` | `"ACORDADO"` | `"PAGO"` | `"SEM_RESPOSTA"` | `"RECUSADO"`
> `origem`: `"API"` | `"PLANILHA"`
> `telefone`: formato internacional sem `+` (ex: `5584999990001`)

---

### Atualizar devedor
```http
PATCH /devedor/atualizar/:id
Authorization: Bearer <token>
Content-Type: application/json
```
```json
{
  "valorDivida": 350.00,
  "status": "EM_NEGOCIACAO"
}
```
> Todos os campos são opcionais.

---

### Importar CSV
```http
POST /devedor/importar
Authorization: Bearer <token>
Content-Type: multipart/form-data
```
Campo: `file` (arquivo `.csv`, máx 100MB)

**Cabeçalho do CSV:**
```
nome,email,telefone,tipoPessoa,cpf,cnpj,valorDivida,descricaoDivida,vencimento,numeroParcelas,status,origem,tentativas,ultimoContato
```

**Resposta 201:**
```json
{ "mensagem": "Importação concluída com sucesso", "importados": 4 }
```

---

### Deletar devedor
```http
DELETE /devedor/:id
Authorization: Bearer <token>
```

---

## Faixas de Critério

### Listar
```http
GET /faixas-criterio
Authorization: Bearer <token>
```
**Resposta 200:** array ordenado por `valorMinimo`.

---

### Buscar por ID
```http
GET /faixas-criterio/:id
Authorization: Bearer <token>
```

---

### Criar
```http
POST /faixas-criterio
Authorization: Bearer <token>
Content-Type: application/json
```
```json
{
  "descricao": "Dívidas pequenas",
  "valorMinimo": 0,
  "valorMaximo": 1000,
  "prazoMaximoDias": 30,
  "parcelasMaximas": 3,
  "descontoMaximo": 20,
  "tomComunicacao": "informal",
  "mensagemInicial": "Olá! Vimos que você tem uma pendência conosco."
}
```
> `mensagemInicial` é opcional.
> Faixas devem ser **contíguas** (sem lacunas entre `valorMaximo` de uma e `valorMinimo` da próxima) e **sem sobreposição**.

---

### Atualizar
```http
PATCH /faixas-criterio/:id
Authorization: Bearer <token>
Content-Type: application/json
```
```json
{
  "descontoMaximo": 25,
  "tomComunicacao": "formal"
}
```
> Todos os campos são opcionais.

---

### Excluir
```http
DELETE /faixas-criterio/:id
Authorization: Bearer <token>
```

---

## Propostas

### Listar
```http
GET /proposta
Authorization: Bearer <token>
```

---

### Buscar por ID
```http
GET /proposta/:id
Authorization: Bearer <token>
```
**Resposta 200:**
```json
{
  "id": "uuid",
  "status": "PENDENTE",
  "valorAcordado": null,
  "parcelasAcordadas": null,
  "limites": {
    "valorOriginal": 300,
    "descontoMaximo": 20,
    "parcelasMaximas": 3,
    "prazoMaximoDias": 30
  },
  "historico": [...],
  "devedorId": "uuid",
  "empresaId": "uuid",
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

### Iniciar negociação via WhatsApp (UC04)
```http
POST /whatsapp/iniciar/:devedorId
Authorization: Bearer <token>
```
> Cria a proposta e envia a primeira mensagem da IA para o WhatsApp do devedor.

**Resposta 201:**
```json
{
  "propostaId": "uuid",
  "status": "PENDENTE"
}
```

---

### Continuar conversa (UC05)
> Usado para testar sem WhatsApp — em produção o fluxo é automático via webhook.
```http
POST /proposta/:id/chat
Authorization: Bearer <token>
Content-Type: application/json
```
```json
{ "mensagem": "Posso pagar R$ 250 à vista." }
```
**Resposta 200:**
```json
{
  "id": "uuid",
  "mensagemAgente": "Entendo, mas o valor mínimo que podemos aceitar é R$ 270,00..."
}
```

---

### Fechar acordo
```http
PATCH /proposta/:id/status
Authorization: Bearer <token>
Content-Type: application/json
```
```json
{
  "status": "ACEITA",
  "valorAcordado": 270.00,
  "parcelasAcordadas": 1
}
```
> `status`: `"ACEITA"` | `"RECUSADA"` | `"PENDENTE"`
> Ao marcar `ACEITA`, o `StatusDevedor` é atualizado automaticamente para `ACORDADO`.
> `valorAcordado` e `parcelasAcordadas` são obrigatórios quando `status = "ACEITA"`.

---

## Cobrança

### Disparar lembretes manuais (UC07)
```http
POST /cobranca/lembretes
Authorization: Bearer <token>
```
> Envia mensagem WhatsApp para todos os devedores com propostas `ACEITA` e `parcelasAcordadas > 1`.

**Resposta 201:**
```json
{ "enviados": 3 }
```

---

## Erros padrão

| Status | Quando ocorre |
|---|---|
| `400 Bad Request` | Validação de campos falhou ou regra de negócio violada |
| `401 Unauthorized` | Token ausente, inválido ou expirado |
| `403 Forbidden` | Recurso pertence a outra empresa |
| `404 Not Found` | Recurso não encontrado |
| `409 Conflict` | Email ou CNPJ já cadastrado |

**Formato do erro:**
```json
{
  "statusCode": 404,
  "message": "Devedor não encontrado",
  "error": "Not Found"
}
```

---

## Fluxo principal de uso

```
1. POST /empresa/cadastrar
2. POST /auth/login → salva access_token
3. POST /faixas-criterio → cadastra faixas de negociação
4. POST /devedor/cadastrar (ou POST /devedor/importar para CSV)
5. POST /whatsapp/iniciar/:devedorId → IA inicia negociação no WhatsApp
6. [automático] Devedor responde → webhook → IA negocia
7. PATCH /proposta/:id/status → fecha acordo com valorAcordado e parcelasAcordadas
8. GET /empresa/painel → acompanha indicadores
9. POST /cobranca/lembretes → envia lembretes de parcelas
```
