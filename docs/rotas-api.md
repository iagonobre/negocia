# API — Referência de Rotas

Base URL: `http://localhost:3000`

Todas as rotas marcadas com 🔒 exigem o header:
```
Authorization: Bearer <token>
```

O token é obtido em `POST /auth/login`.

---

## Autenticação e Empresa (Core — compartilhado por todas as instâncias)

> Módulo base responsável por cadastro, login e gestão do perfil da empresa. Presente em todas as instâncias do framework.

---

### `POST /empresa/cadastrar`
Cadastra uma nova empresa na plataforma.

**Body:**
```json
{
  "nome": "string",
  "email": "string",
  "senha": "string",
  "cnpj": "string (opcional)",
  "telefone": "string (opcional)"
}
```

**Resposta:** dados da empresa criada + token JWT.

---

### `POST /auth/login`
Autentica uma empresa e retorna o token JWT.

**Body:**
```json
{
  "email": "string",
  "senha": "string"
}
```

**Resposta:**
```json
{
  "access_token": "string"
}
```

---

### `GET /empresa/perfil` 🔒
Retorna os dados do perfil da empresa autenticada.

---

### `PATCH /empresa/perfil` 🔒
Atualiza os dados do perfil da empresa autenticada.

**Body:** campos opcionais da empresa (`nome`, `telefone`, etc.).

---

### `DELETE /empresa/perfil` 🔒
Remove a empresa autenticada da plataforma.

---
---

## Instância: Negocia — Cobrança de Dívidas via WhatsApp + IA

> Plataforma de cobrança onde a empresa cadastra devedores, define faixas de critério por valor de dívida, e um agente de IA negocia automaticamente via WhatsApp. O agente oferece descontos e parcelamentos dentro dos limites configurados.

---

### Devedor

O devedor é a pessoa física ou jurídica que possui uma dívida com a empresa.

---

#### `GET /devedor` 🔒
Lista todos os devedores da empresa autenticada.

**Resposta:** array de devedores.

---

#### `GET /devedor/:id` 🔒
Busca um devedor específico pelo ID.

**Parâmetros:** `id` — UUID do devedor.

**Resposta:** dados do devedor.

---

#### `GET /devedor/:id/historico` 🔒
Retorna o histórico completo de negociações do devedor, incluindo todas as propostas e conversas com o agente de IA.

**Parâmetros:** `id` — UUID do devedor.

---

#### `POST /devedor` 🔒
Cadastra um novo devedor.

**Body:**
```json
{
  "nome": "string",
  "telefone": "string",
  "tipoPessoa": "FISICA | JURIDICA",
  "valorDivida": 1500.00,
  "vencimento": "2024-01-15",
  "status": "PENDENTE | EM_NEGOCIACAO | ACORDO_FECHADO | INADIMPLENTE",
  "origem": "MANUAL | CSV | SISTEMA",
  "tentativas": 0,
  "email": "string (opcional)",
  "cpf": "string (opcional)",
  "cnpj": "string (opcional)",
  "descricaoDivida": "string (opcional)",
  "numeroParcelas": 1,
  "ultimoContato": "2024-01-01 (opcional)",
  "empresaId": "uuid"
}
```

---

#### `PATCH /devedor/:id` 🔒
Atualiza os dados de um devedor existente.

**Body:** mesmos campos de criação, todos opcionais.

---

#### `DELETE /devedor/:id` 🔒
Remove um devedor.

---

#### `POST /devedor/importar` 🔒
Importa devedores em lote via arquivo CSV. Realiza upsert — atualiza se já existir, cria se não existir.

**Content-Type:** `multipart/form-data`

**Body:** campo `file` com o arquivo `.csv`.

**Resposta:**
```json
{
  "mensagem": "Importação concluída com sucesso",
  "importados": 42
}
```

---

### Faixa de Critério

Define as regras de negociação para cada faixa de valor de dívida. O agente de IA usa esses limites para decidir o que pode ou não aceitar em uma proposta.

---

#### `GET /faixas-criterio` 🔒
Lista todas as faixas de critério da empresa.

---

#### `GET /faixas-criterio/:id` 🔒
Busca uma faixa de critério pelo ID.

---

#### `POST /faixas-criterio` 🔒
Cria uma nova faixa de critério. As faixas devem ser contíguas e não podem se sobrepor.

**Body:**
```json
{
  "descricao": "Dívidas pequenas",
  "valorMinimo": 0,
  "valorMaximo": 500,
  "prazoMaximoDias": 30,
  "parcelasMaximas": 3,
  "descontoMaximo": 15,
  "tomComunicacao": "cordial e direto",
  "mensagemInicial": "Olá! Temos uma proposta para você. (opcional)"
}
```

---

#### `PATCH /faixas-criterio/:id` 🔒
Atualiza uma faixa de critério existente.

**Body:** mesmos campos de criação, todos opcionais.

---

#### `DELETE /faixas-criterio/:id` 🔒
Remove uma faixa de critério.

---

### Proposta

Representa uma sessão de negociação entre o agente de IA e um devedor. Cada devedor pode ter uma proposta ativa por vez.

---

#### `POST /proposta/gerar/:devedorId` 🔒
Gera uma proposta de pagamento personalizada para um devedor. O sistema carrega a faixa de critério correspondente ao valor da dívida e monta o contexto do agente de IA. Não envia mensagem automaticamente — use `/whatsapp/iniciar/:devedorId` para iniciar e enviar pelo WhatsApp ao mesmo tempo.

**Parâmetros:** `devedorId` — UUID do devedor.

**Resposta:**
```json
{
  "id": "uuid",
  "status": "PENDENTE"
}
```

---

#### `POST /proposta/:id/chat` 🔒
Envia a resposta do devedor para o agente de IA continuar a negociação. O agente processa a mensagem, decide se aceita ou contrapropõe, e retorna sua resposta.

**Parâmetros:** `id` — UUID da proposta.

**Body:**
```json
{
  "mensagem": "Posso pagar em 2x de R$ 200?"
}
```

**Resposta:**
```json
{
  "id": "uuid",
  "mensagemAgente": "Entendo! Posso oferecer 2x de R$ 220 com desconto de 10%..."
}
```

---

#### `GET /proposta` 🔒
Lista todas as propostas da empresa.

---

#### `GET /proposta/:id` 🔒
Busca uma proposta pelo ID, incluindo o histórico de mensagens.

---

#### `PATCH /proposta/:id/status` 🔒
Atualiza o status de uma proposta manualmente (pelo operador humano).

**Body:**
```json
{
  "status": "ACEITA | RECUSADA | PENDENTE",
  "valorAcordado": 270.00,
  "parcelasAcordadas": 2
}
```

---

### WhatsApp

Integração com o Twilio para envio e recebimento de mensagens via WhatsApp.

---

#### `POST /whatsapp/iniciar/:devedorId` 🔒
Gera a proposta e envia a primeira mensagem ao devedor via WhatsApp automaticamente. Combina a geração da proposta com o disparo da mensagem inicial.

**Parâmetros:** `devedorId` — UUID do devedor.

**Resposta:**
```json
{
  "propostaId": "uuid",
  "status": "PENDENTE"
}
```

---

#### `POST /whatsapp/reiniciar/:devedorId` 🔒
Cancela a negociação pendente do devedor (se houver) e inicia uma nova do zero, reenviando a mensagem inicial via WhatsApp. Use quando a mensagem original não chegou ao devedor — **apaga o histórico da conversa pendente atual**.

**Parâmetros:** `devedorId` — UUID do devedor.

**Resposta:**
```json
{
  "propostaId": "uuid",
  "status": "PENDENTE"
}
```

---

#### `POST /whatsapp/webhook`
Webhook do Twilio. Recebe as mensagens enviadas pelo devedor via WhatsApp e aciona o agente de IA automaticamente. **Não chame manualmente** — é configurado no painel do Twilio.

---

### Cobrança

Serviço de lembretes automáticos para devedores com acordo parcelado fechado.

---

#### `POST /cobranca/lembretes/manual` 🔒
Dispara manualmente os lembretes de parcela para todos os devedores com acordo ativo na empresa autenticada. O cron automático roda todo dia 1 às 9h.

**Resposta:**
```json
{
  "enviados": 12
}
```

---

### Painel

---

#### `GET /empresa/painel` 🔒
Retorna os indicadores financeiros da empresa: total de dívidas em aberto, valor recuperado, taxa de recuperação, número de acordos fechados e propostas pendentes.

---
---

## Instância: Saúde — Agendamento de Retorno Médico via WhatsApp + IA

> Plataforma para clínicas e consultórios que precisam lembrar pacientes de retornar para consulta. O agente de IA contata o paciente via WhatsApp, confirma disponibilidade e registra o agendamento de retorno.

---

### Paciente

---

#### `GET /paciente` 🔒
Lista todos os pacientes da empresa.

---

#### `GET /paciente/:id` 🔒
Busca um paciente pelo ID.

---

#### `POST /paciente` 🔒
Cadastra um novo paciente.

**Body:**
```json
{
  "nome": "string",
  "telefone": "string",
  "email": "string (opcional)",
  "cpf": "string (opcional)",
  "convenio": "string (opcional)",
  "configRetornoId": "uuid (opcional)"
}
```

---

#### `PATCH /paciente/:id` 🔒
Atualiza os dados de um paciente.

**Body:** mesmos campos de criação, todos opcionais.

---

#### `DELETE /paciente/:id` 🔒
Remove um paciente.

---

### Config Retorno

Define as regras de agendamento de retorno: tom de comunicação, prazo para retorno e mensagem inicial do agente.

---

#### `GET /config-retorno` 🔒
Lista todas as configurações de retorno da empresa.

---

#### `GET /config-retorno/:id` 🔒
Busca uma configuração de retorno pelo ID.

---

#### `POST /config-retorno` 🔒
Cria uma nova configuração de retorno.

**Body:**
```json
{
  "descricao": "Retorno pós-cirurgia",
  "diasParaRetorno": 30,
  "tomComunicacao": "acolhedor e cuidadoso",
  "mensagemInicial": "Olá! Está na hora do seu retorno. (opcional)"
}
```

---

#### `PATCH /config-retorno/:id` 🔒
Atualiza uma configuração de retorno.

---

#### `DELETE /config-retorno/:id` 🔒
Remove uma configuração de retorno.

---

### Consulta

Representa uma sessão de agendamento de retorno entre o agente e o paciente.

---

#### `POST /consulta/iniciar/:pacienteId` 🔒
Inicia uma consulta de retorno: o sistema cria a sessão, o agente monta a mensagem inicial e a envia ao paciente via WhatsApp.

**Parâmetros:** `pacienteId` — UUID do paciente.

**Resposta:**
```json
{
  "consultaId": "uuid",
  "status": "PENDENTE"
}
```

---

#### `GET /consulta` 🔒
Lista todas as consultas de retorno da empresa.

---

#### `GET /consulta/:id` 🔒
Busca uma consulta pelo ID.

---

### WhatsApp

---

#### `POST /whatsapp-saude/webhook`
Webhook do Twilio para a instância Saúde. Recebe respostas dos pacientes e aciona o agente de IA para continuar o agendamento. **Não chame manualmente.**

---

### Notificação

---

#### `POST /notificacao-saude/lembretes/manual` 🔒
Dispara manualmente lembretes de retorno para todos os pacientes com retorno pendente na empresa autenticada. O cron automático roda às 8h nas segundas, quartas e sextas.

**Resposta:**
```json
{
  "enviados": 8
}
```

---
---

## Instância: Oficina — Agendamento de Revisão Veicular via WhatsApp + IA

> Plataforma para oficinas mecânicas que agendam revisões com clientes via WhatsApp. O agente de IA contata o cliente quando o prazo de revisão se aproxima e confirma o agendamento.

---

### Cliente Oficina

---

#### `GET /cliente-oficina` 🔒
Lista todos os clientes da oficina.

---

#### `GET /cliente-oficina/:id` 🔒
Busca um cliente pelo ID.

---

#### `POST /cliente-oficina` 🔒
Cadastra um novo cliente.

**Body:**
```json
{
  "nome": "string",
  "telefone": "string",
  "modeloVeiculo": "string",
  "placa": "string",
  "email": "string (opcional)"
}
```

---

#### `PATCH /cliente-oficina/:id` 🔒
Atualiza os dados de um cliente.

---

#### `DELETE /cliente-oficina/:id` 🔒
Remove um cliente.

---

### Serviço Config

Define o tipo de serviço oferecido pela oficina: tom da comunicação, prazo de revisão e mensagem inicial do agente.

---

#### `GET /servico-config` 🔒
Lista todas as configurações de serviço da empresa.

---

#### `GET /servico-config/:id` 🔒
Busca uma configuração de serviço pelo ID.

---

#### `POST /servico-config` 🔒
Cria uma nova configuração de serviço.

**Body:**
```json
{
  "descricao": "Revisão de 10.000 km",
  "prazoRevisaoDias": 180,
  "tomComunicacao": "amigável e prestativo",
  "mensagemInicial": "Olá! Está na hora da revisão do seu veículo. (opcional)"
}
```

---

#### `PATCH /servico-config/:id` 🔒
Atualiza uma configuração de serviço.

---

#### `DELETE /servico-config/:id` 🔒
Remove uma configuração de serviço.

---

### Agendamento

Representa uma sessão de agendamento de revisão entre o agente e o cliente.

---

#### `POST /agendamento/iniciar/:clienteId` 🔒
Inicia um agendamento de revisão: o sistema cria a sessão, o agente monta a mensagem inicial e a envia ao cliente via WhatsApp.

**Parâmetros:** `clienteId` — UUID do cliente.

**Resposta:**
```json
{
  "agendamentoId": "uuid",
  "status": "PENDENTE"
}
```

---

#### `GET /agendamento` 🔒
Lista todos os agendamentos da empresa.

---

#### `GET /agendamento/:id` 🔒
Busca um agendamento pelo ID.

---

### WhatsApp

---

#### `POST /whatsapp-oficina/webhook`
Webhook do Twilio para a instância Oficina. Recebe respostas dos clientes e aciona o agente de IA para continuar o agendamento de revisão. **Não chame manualmente.**

---

### Notificação

---

#### `POST /notificacao-oficina/lembretes/manual` 🔒
Dispara manualmente lembretes de revisão para todos os clientes com revisão pendente na empresa autenticada. O cron automático roda às 10h nas terças e quintas.

**Resposta:**
```json
{
  "enviados": 5
}
```

---

## Resumo de todas as rotas

| Método | Rota | Auth | Instância | Descrição |
|--------|------|------|-----------|-----------|
| POST | `/empresa/cadastrar` | — | Core | Cadastra empresa |
| POST | `/auth/login` | — | Core | Login e retorna JWT |
| GET | `/empresa/perfil` | 🔒 | Core | Perfil da empresa |
| PATCH | `/empresa/perfil` | 🔒 | Core | Atualiza perfil |
| DELETE | `/empresa/perfil` | 🔒 | Core | Remove empresa |
| GET | `/empresa/painel` | 🔒 | Negocia | Indicadores financeiros |
| GET | `/devedor` | 🔒 | Negocia | Lista devedores |
| GET | `/devedor/:id` | 🔒 | Negocia | Busca devedor |
| GET | `/devedor/:id/historico` | 🔒 | Negocia | Histórico de negociações |
| POST | `/devedor` | 🔒 | Negocia | Cadastra devedor |
| PATCH | `/devedor/:id` | 🔒 | Negocia | Atualiza devedor |
| DELETE | `/devedor/:id` | 🔒 | Negocia | Remove devedor |
| POST | `/devedor/importar` | 🔒 | Negocia | Importa CSV de devedores |
| GET | `/faixas-criterio` | 🔒 | Negocia | Lista faixas de critério |
| GET | `/faixas-criterio/:id` | 🔒 | Negocia | Busca faixa de critério |
| POST | `/faixas-criterio` | 🔒 | Negocia | Cria faixa de critério |
| PATCH | `/faixas-criterio/:id` | 🔒 | Negocia | Atualiza faixa de critério |
| DELETE | `/faixas-criterio/:id` | 🔒 | Negocia | Remove faixa de critério |
| POST | `/proposta/gerar/:devedorId` | 🔒 | Negocia | Gera proposta para devedor |
| POST | `/proposta/:id/chat` | 🔒 | Negocia | Envia mensagem ao agente de IA |
| GET | `/proposta` | 🔒 | Negocia | Lista propostas |
| GET | `/proposta/:id` | 🔒 | Negocia | Busca proposta |
| PATCH | `/proposta/:id/status` | 🔒 | Negocia | Atualiza status da proposta |
| POST | `/whatsapp/iniciar/:devedorId` | 🔒 | Negocia | Inicia negociação via WhatsApp |
| POST | `/whatsapp/reiniciar/:devedorId` | 🔒 | Negocia | Cancela a pendente e reinicia negociação do zero |
| POST | `/whatsapp/webhook` | — | Negocia | Webhook Twilio (automático) |
| POST | `/cobranca/lembretes/manual` | 🔒 | Negocia | Dispara lembretes de parcela |
| GET | `/paciente` | 🔒 | Saúde | Lista pacientes |
| GET | `/paciente/:id` | 🔒 | Saúde | Busca paciente |
| POST | `/paciente` | 🔒 | Saúde | Cadastra paciente |
| PATCH | `/paciente/:id` | 🔒 | Saúde | Atualiza paciente |
| DELETE | `/paciente/:id` | 🔒 | Saúde | Remove paciente |
| GET | `/config-retorno` | 🔒 | Saúde | Lista configs de retorno |
| GET | `/config-retorno/:id` | 🔒 | Saúde | Busca config de retorno |
| POST | `/config-retorno` | 🔒 | Saúde | Cria config de retorno |
| PATCH | `/config-retorno/:id` | 🔒 | Saúde | Atualiza config de retorno |
| DELETE | `/config-retorno/:id` | 🔒 | Saúde | Remove config de retorno |
| POST | `/consulta/iniciar/:pacienteId` | 🔒 | Saúde | Inicia consulta de retorno |
| GET | `/consulta` | 🔒 | Saúde | Lista consultas |
| GET | `/consulta/:id` | 🔒 | Saúde | Busca consulta |
| POST | `/whatsapp-saude/webhook` | — | Saúde | Webhook Twilio (automático) |
| POST | `/notificacao-saude/lembretes/manual` | 🔒 | Saúde | Dispara lembretes de retorno |
| GET | `/cliente-oficina` | 🔒 | Oficina | Lista clientes |
| GET | `/cliente-oficina/:id` | 🔒 | Oficina | Busca cliente |
| POST | `/cliente-oficina` | 🔒 | Oficina | Cadastra cliente |
| PATCH | `/cliente-oficina/:id` | 🔒 | Oficina | Atualiza cliente |
| DELETE | `/cliente-oficina/:id` | 🔒 | Oficina | Remove cliente |
| GET | `/servico-config` | 🔒 | Oficina | Lista configs de serviço |
| GET | `/servico-config/:id` | 🔒 | Oficina | Busca config de serviço |
| POST | `/servico-config` | 🔒 | Oficina | Cria config de serviço |
| PATCH | `/servico-config/:id` | 🔒 | Oficina | Atualiza config de serviço |
| DELETE | `/servico-config/:id` | 🔒 | Oficina | Remove config de serviço |
| POST | `/agendamento/iniciar/:clienteId` | 🔒 | Oficina | Inicia agendamento de revisão |
| GET | `/agendamento` | 🔒 | Oficina | Lista agendamentos |
| GET | `/agendamento/:id` | 🔒 | Oficina | Busca agendamento |
| POST | `/whatsapp-oficina/webhook` | — | Oficina | Webhook Twilio (automático) |
| POST | `/notificacao-oficina/lembretes/manual` | 🔒 | Oficina | Dispara lembretes de revisão |
