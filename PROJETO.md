# NegocIA — Documentação do Projeto

**Aplicação web para automação de cobranças e recuperação de vendas via WhatsApp.**
Um agente de IA conduz negociações com clientes inadimplentes, gera propostas de parcelamento personalizadas e emite cobranças por Pix ou boleto de forma autônoma.

---

## Stack

- **Runtime:** Node.js 20+
- **Framework:** NestJS 11 (TypeScript 5)
- **ORM:** Prisma 7 com adaptador `@prisma/adapter-pg`
- **Banco de dados:** PostgreSQL 16
- **Autenticação:** JWT (7 dias de validade) + bcrypt
- **LLM:** Groq API (modelo `llama-3.3-70b-versatile`)
- **WhatsApp:** Evolution API (self-hosted via Docker)
- **Documentação da API:** Swagger em `/api`
- **Package manager:** pnpm 9
- **Infra local:** Docker Compose (PostgreSQL + Evolution API)

---

## Estrutura de pastas

```
src/
├── main.ts                  # Entry point, bootstrap com Swagger
├── app.module.ts            # Módulo raiz
├── config/                  # Variáveis de ambiente e configuração
├── prisma/                  # PrismaService (global)
├── generated/               # Client Prisma auto-gerado
├── auth/                    # Autenticação JWT
├── empresa/                 # Cadastro e perfil da empresa
├── devedor/                 # Gestão de devedores + importação CSV
├── faixa-criterio/          # Critérios de negociação por faixa de valor
├── llm/                     # Serviço global de chamada à LLM (Groq)
├── proposta/                # Motor de negociação com IA + histórico de chat
└── whatsapp/                # Webhook + disparo de mensagens (Evolution API)
```

---

## Banco de dados — Entidades e relacionamentos

```
Empresa (1) ──── (1) Endereco
    │
    ├──────────── (N) Devedor ──── (N) Proposta
    │
    └──────────── (N) FaixaCriterio
```

### Empresa
Entidade central. Representa a empresa-cliente que utiliza a plataforma.

| Campo | Tipo | Obs |
|---|---|---|
| id | UUID | PK |
| nome | string | |
| email | string | único |
| senha | string | hash bcrypt |
| cnpj | string | único |
| telefone | string | |
| createdAt / updatedAt | DateTime | |

### Endereco
Vinculado 1:1 à Empresa. **Obrigatório no cadastro** (validado via DTO na camada da aplicação; o schema Prisma mantém `Endereco?` pois a constraint não pode ser imposta pelo lado sem FK).

| Campo | Tipo | Obs |
|---|---|---|
| cep | string | |
| logradouro | string | |
| numero | string | |
| complemento | string | opcional |
| bairro | string | |
| cidade | string | |
| estado | string | |
| empresaId | FK → Empresa | único |

### Devedor
Representa um cliente inadimplente de uma empresa.

| Campo | Tipo | Obs |
|---|---|---|
| id | UUID | PK |
| nome | string | |
| email | string | opcional |
| telefone | string | |
| tipoPessoa | enum | FISICA \| JURIDICA |
| cpf / cnpj | string | opcionais |
| valorDivida | float | |
| descricaoDivida | string | opcional |
| vencimento | DateTime | |
| numeroParcelas | int | opcional |
| status | enum | PENDENTE (padrão) |
| origem | enum | PLANILHA \| API |
| tentativas | int | padrão 0 |
| ultimoContato | DateTime | opcional |
| empresaId | FK → Empresa | |

**Constraint único:** `(email, empresaId)` — mesmo email não pode ser cadastrado duas vezes na mesma empresa.

**Enum StatusDevedor:** `PENDENTE` | `EM_NEGOCIACAO` | `ACORDADO` | `PAGO` | `SEM_RESPOSTA` | `RECUSADO`

### FaixaCriterio
Define regras de negociação para diferentes faixas de valor de dívida. O agente de IA usa essas faixas para saber até onde pode negociar.

| Campo | Tipo | Obs |
|---|---|---|
| id | UUID | PK |
| descricao | string | ex: "Dívidas pequenas" |
| valorMinimo | float | |
| valorMaximo | float | |
| prazoMaximoDias | int | prazo máximo para quitação |
| parcelasMaximas | int | máximo de parcelas ofertadas |
| descontoMaximo | float | % máximo de desconto (0–100) |
| tomComunicacao | string | ex: "formal", "informal" |
| mensagemInicial | string | opcional, template de abertura |
| empresaId | FK → Empresa | |

**Regras de validação:**
- `valorMinimo < valorMaximo`
- Faixas de uma empresa não podem se sobrepor
- Faixas devem ser contíguas (sem lacunas de valor)

### Proposta
Representa uma sessão de negociação entre o agente de IA e um devedor.

| Campo | Tipo | Obs |
|---|---|---|
| id | UUID | PK |
| limites | JSON | valorOriginal, descontoMaximo, parcelasMaximas, prazoMaximoDias |
| historico | JSON | array de mensagens (system, user, assistant, tool) |
| status | enum | PENDENTE \| ACEITA \| RECUSADA |
| createdAt / updatedAt | DateTime | |
| devedorId | FK → Devedor | onDelete: Cascade |
| empresaId | FK → Empresa | onDelete: Cascade |

---

## Módulos

### `auth/` — Autenticação

**Responsabilidade:** Login da empresa e proteção de rotas via JWT.

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/auth/login` | — | Login da empresa |

**Fluxo:**
1. Empresa envia `email` + `senha`
2. Serviço busca empresa pelo email e verifica senha com bcrypt
3. Retorna JWT com payload `{ sub: empresaId, email }` (válido por 7 dias)

**Componentes:**
- `AuthGuard` — valida Bearer token e injeta payload no request
- `@Empresa()` — decorator que extrai o payload JWT no controller

---

### `empresa/` — Empresa

**Responsabilidade:** Cadastro, perfil e gerenciamento da conta da empresa.

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/empresa/cadastrar` | — | Registro de nova empresa |
| GET | `/empresa/perfil` | JWT | Perfil da empresa logada |
| PATCH | `/empresa/perfil` | JWT | Atualizar dados do perfil |
| DELETE | `/empresa/perfil` | JWT | Excluir conta |

**Regras:**
- Email e CNPJ são únicos no sistema
- Senha é hasheada com bcrypt (salt rounds: 10) antes de persistir
- Senha nunca é retornada nas respostas
- Endereço é obrigatório no cadastro e pode ser atualizado parcialmente via PATCH

---

### `devedor/` — Devedor

**Responsabilidade:** Gestão dos devedores vinculados à empresa, incluindo cadastro individual e importação em massa via CSV.

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/devedor` | JWT | Listar todos os devedores da empresa |
| GET | `/devedor/:id` | JWT | Buscar devedor por ID |
| POST | `/devedor/cadastrar` | JWT | Criar devedor único |
| PATCH | `/devedor/atualizar/:id` | JWT | Atualizar devedor |
| DELETE | `/devedor/:id` | JWT | Deletar devedor |
| POST | `/devedor/importar` | JWT | Importar CSV (multipart, max 100MB) |

**Regras:**
- `atualizar` e `deletar` verificam existência antes de agir, lançando `NotFoundException` se não encontrado
- `@UseGuards(AuthGuard)` e `@ApiBearerAuth()` aplicados no nível da classe

**Importação CSV (`/devedor/importar`):**
- Aceita arquivo `.csv` via multipart/form-data
- Executa **upsert** com base no par `(email, empresaId)`
  - Se o devedor já existe: atualiza nome, telefone, valorDivida, descricaoDivida, vencimento, status
  - Se não existe: cria novo registro
- Conversões automáticas: datas, floats, inteiros, enums, nulos para campos vazios (incluindo `ultimoContato`)
- Toda a operação roda em uma transação no banco

**Isolamento:** Todas as queries são escopadas pelo `empresaId` do token JWT — uma empresa nunca acessa devedores de outra.

---

### `faixa-criterio/` — Faixa de Critério

**Responsabilidade:** Configuração das faixas de negociação que o agente de IA utilizará para gerar propostas personalizadas.

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/faixas-criterio` | JWT | Criar faixa |
| GET | `/faixas-criterio` | JWT | Listar faixas da empresa logada (ordenado por valorMinimo) |
| GET | `/faixas-criterio/:id` | JWT | Buscar faixa por ID |
| PATCH | `/faixas-criterio/:id` | JWT | Atualizar faixa parcialmente |
| DELETE | `/faixas-criterio/:id` | JWT | Excluir faixa |

**Regras:**
- `@UseGuards(AuthGuard)` e `@ApiBearerAuth()` aplicados no nível da classe
- `buscar`, `atualizar` e `deletar` lançam `NotFoundException` se a faixa não existir e `ForbiddenException` se pertencer a outra empresa

**Lógica de validação ao criar/atualizar:**
1. `valorMinimo` deve ser menor que `valorMaximo`
2. Não pode haver sobreposição com faixas existentes da mesma empresa
3. A faixa deve ser contígua com as demais (sem lacunas de valor ou deve ser a primeira)
4. `descontoMaximo` entre 0 e 100
5. `prazoMaximoDias` e `parcelasMaximas` maiores que 0

---

### `llm/` — LLM Service

**Responsabilidade:** Centralizar as chamadas à API do Groq. Módulo global (`@Global`) — disponível em qualquer módulo sem importação explícita.

- Modelo e API key lidos via `ConfigService` (nunca `process.env` direto)
- Suporta `tools` (function calling) para o agente de IA usar ferramentas durante a negociação

---

### `proposta/` — Proposta

**Responsabilidade:** Motor de negociação com IA. Gerencia o ciclo de vida de uma proposta desde a geração até o fechamento.

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/proposta/gerar/:devedorId` | JWT | Gera proposta e primeira mensagem do agente |
| POST | `/proposta/:id/chat` | JWT | Envia mensagem do devedor e obtém resposta da IA |
| GET | `/proposta` | JWT | Lista todas as propostas da empresa |
| GET | `/proposta/:id` | JWT | Busca proposta por ID |
| PATCH | `/proposta/:id/status` | JWT | Atualiza status (ACEITA ou RECUSADA) |

**Fluxo de negociação:**
1. `gerarProposta` — busca o devedor e a faixa de critério correspondente ao valor da dívida, monta o `systemPrompt` com os limites e obtém a primeira mensagem do agente via LLM
2. `conversar` — a cada mensagem do devedor, a IA decide se usa a ferramenta `validar_contraproposta` para checar se a oferta está dentro dos limites; a validação matemática roda no servidor (não na IA)
3. Todo o histórico de mensagens é persistido em JSON no banco

**Ferramenta `validar_contraproposta`:**
- Chamada pela IA via function calling quando o devedor propõe um valor
- Valida parcelas máximas e desconto máximo com base nos limites da `FaixaCriterio`
- Retorna `{ aprovado: boolean, motivo: string }` — a IA usa o resultado para responder ao devedor

---

### `whatsapp/` — WhatsApp

**Responsabilidade:** Integração bidirecional com WhatsApp via Evolution API.

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/whatsapp/iniciar/:devedorId` | JWT | Disparo ativo: cria proposta e envia primeira mensagem ao devedor |
| POST | `/whatsapp/webhook` | — | Webhook da Evolution API: recebe mensagens e responde via IA |

**Fluxo ativo (empresa dispara):**
```
POST /whatsapp/iniciar/:devedorId
    └─► gerarProposta() → envia primeira mensagem ao devedor via WhatsApp
```

**Fluxo reativo (devedor responde):**
```
Devedor envia mensagem no WhatsApp
    └─► Evolution API → POST /whatsapp/webhook
            ├─► Identifica devedor pelo número de telefone
            ├─► Busca proposta PENDENTE ou cria nova
            ├─► conversar() → IA processa e responde
            └─► Envia resposta ao devedor via WhatsApp
```

**Regras:**
- Webhook ignora mensagens enviadas pelo próprio número (`fromMe: true`)
- Webhook ignora eventos que não sejam `messages.upsert`
- Se não houver devedor cadastrado com o número recebido, a mensagem é ignorada

---

### `prisma/` — Prisma Service

Serviço global que encapsula a conexão com o PostgreSQL via Prisma Client. Injetado em todos os repositórios.

---

### `config/` — Configuração

Centraliza as variáveis de ambiente via `ConfigService`. Nunca usar `process.env` diretamente fora deste arquivo.

```typescript
{
  port: process.env.PORT || 3000,
  JWT: { secret, expiresIn: '7d' },
  database: { url },
  groq: { apiKey, model },
  evolution: { apiUrl, apiKey, instance },
}
```

Variáveis necessárias (`.env`):
```
DATABASE_URL=postgresql://negocia:negocia@localhost:5432/negocia
JWT_SECRET=seu_secret_aqui
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile   # opcional, este é o padrão
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=negocia_evolution_key
EVOLUTION_INSTANCE=negocia
```

---

## Infra local — Docker Compose

```bash
docker-compose up -d   # sobe PostgreSQL + Evolution API
```

| Container | Porta | Descrição |
|---|---|---|
| `negocia_db` | 5432 | PostgreSQL 16 |
| `negocia_evolution` | 8080 | Evolution API (WhatsApp) |

**Setup inicial da Evolution API:**
```bash
# 1. Criar instância
curl -X POST http://localhost:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: negocia_evolution_key" \
  -d '{"instanceName": "negocia", "qrcode": true}'

# 2. Escanear QR Code (abrir no browser)
http://localhost:8080/instance/qrcode/negocia?image=true
```

O webhook já está configurado no `docker-compose.yml` para apontar para `http://host.docker.internal:3000/whatsapp/webhook`.

---

## Fluxo principal (visão geral)

```
Empresa se cadastra + define FaixasCriterio
    │
    ├─► Importa base de Devedores (CSV ou API)
    │
    └─► Dispara negociação: POST /whatsapp/iniciar/:devedorId
            │
            ├─► Agente identifica FaixaCriterio pelo valor da dívida
            ├─► Gera systemPrompt com limites e tom de comunicação
            ├─► Envia primeira mensagem ao devedor via WhatsApp
            │
            └─► Devedor responde → Evolution API → webhook
                    ├─► IA analisa resposta
                    ├─► Se devedor propõe valor → valida_contraproposta (server-side)
                    ├─► IA responde dentro dos limites aprovados
                    └─► Negociação finalizada → status ACEITA ou RECUSADA
```

---

## Funcionalidades planejadas (não implementadas)

- **Integração Pix** — geração e rastreamento de cobranças Pix após acordo fechado
- **Integração Boleto** — geração de boletos bancários
- **Atualização automática de status do Devedor** — ao fechar proposta, atualizar `StatusDevedor` para `ACORDADO`

---

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `pnpm run start:dev` | Modo desenvolvimento (watch) |
| `pnpm run build` | Compila TypeScript |
| `pnpm run start:prod` | Inicia versão compilada |
| `pnpm run test` | Testes unitários |
| `pnpm run test:e2e` | Testes end-to-end |
| `pnpm run test:cov` | Cobertura de testes |
| `pnpm run lint` | ESLint com auto-fix |

---

## Padrões do projeto

Esta seção define os padrões que **devem ser seguidos em todo novo código** para manter o projeto harmônico.

---

### Arquitetura — Controller → Service → Repository

Cada módulo segue a mesma divisão de camadas, sem exceções:

| Camada | Responsabilidade |
|---|---|
| **Controller** | Receber a request HTTP, aplicar guards/decorators, delegar ao Service |
| **Service** | Regras de negócio, validações, lançar exceções HTTP |
| **Repository** | Acesso ao banco exclusivamente via PrismaService |

O Controller nunca acessa o Prisma diretamente. O Repository nunca lança regras de negócio.

**Exceção:** O `WhatsAppController` acessa o `PrismaService` diretamente para lookups simples de roteamento (identificar devedor pelo telefone), evitando criar um service intermediário só para isso.

---

### Variáveis de ambiente — sempre via ConfigService

Nunca usar `process.env` fora de `src/config/configuration.ts`. Em services e modules, injetar `ConfigService`:

```typescript
constructor(private readonly configService: ConfigService) {}

const apiKey = this.configService.get<string>('groq.apiKey');
```

---

### Swagger — documentação obrigatória em todos os controllers

Todo controller e DTO devem estar documentados para o Swagger. Padrão a seguir:

**No controller:**
```typescript
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('NomeDoModulo')          // agrupa no Swagger UI
@Controller('rota')
export class MeuController {

  @Post('acao')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()                // indica que precisa de token JWT
  @ApiOperation({ summary: 'Descrição curta da rota' })
  @ApiBody({ type: MeuDto })      // mostra o schema do body no Swagger
  async metodo(@Body() dto: MeuDto) { ... }
}
```

**Para upload de arquivo (multipart):**
```typescript
@ApiConsumes('multipart/form-data')
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      file: { type: 'string', format: 'binary' },
    },
  },
})
```

**No `main.ts` — configuração global (já feita, não alterar):**
```typescript
const config = new DocumentBuilder()
  .setTitle('NegocIA API')
  .setDescription('API do sistema de cobrança automatizada com IA')
  .setVersion('1.0')
  .addBearerAuth()   // habilita o botão "Authorize" no Swagger UI
  .build();

SwaggerModule.setup('api', app, documentFactory, {
  customSiteTitle: 'NegocIA — Docs',
});
```

Swagger disponível em: `http://localhost:3000/api`

---

### DTOs — validação com class-validator + Swagger

Todo DTO deve combinar os decorators do `class-validator` (validação runtime) com os do `@nestjs/swagger` (documentação). O `ValidationPipe` global em `main.ts` aplica as validações automaticamente.

**Campo obrigatório:**
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

@ApiProperty()
@IsNotEmpty()
@IsString()
nome: string;
```

**Campo opcional:**
```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

@ApiPropertyOptional()
@IsOptional()
@IsString()
descricao?: string;
```

**Enum:**
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { StatusDevedor } from 'src/generated/prisma/enums';

@ApiProperty({ enum: StatusDevedor })
@IsEnum(StatusDevedor)
status: StatusDevedor;
```

**Com exemplo e descrição:**
```typescript
@ApiProperty({ description: 'Desconto máximo em %', example: 10 })
@IsNumber()
@Min(0)
@Max(100)
descontoMaximo: number;
```

**DTO aninhado (objeto dentro de objeto)** — usar `@ValidateNested()` + `@Type()` para validação recursiva:
```typescript
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@ApiProperty({ type: EnderecoDto })
@IsNotEmpty()
@ValidateNested()
@Type(() => EnderecoDto)
endereco: EnderecoDto;
```

**Para UpdateDto** — todos os campos opcionais, declarar manualmente (não usar `PartialType` por clareza):
```typescript
@ApiPropertyOptional()
@IsOptional()
@IsString()
nome?: string;
```

**Referência completa dos decorators usados no projeto:**

| Decorator (class-validator) | Quando usar |
|---|---|
| `@IsString()` | Qualquer campo de texto |
| `@IsNotEmpty()` | Campo obrigatório não pode ser vazio (`""`) |
| `@IsOptional()` | Campo opcional — para de validar se undefined |
| `@IsEmail()` | Valida formato de e-mail |
| `@MinLength(n)` | Mínimo de caracteres (usado em senha: `MinLength(6)`) |
| `@IsUUID()` | Valida que o valor é um UUID v4 (usar em `empresaId`, `id`) |
| `@IsNumber()` | Número (int ou float) |
| `@IsInt()` | Inteiro específico (parcelas, tentativas) |
| `@Min(n)` | Valor mínimo numérico |
| `@Max(n)` | Valor máximo numérico |
| `@IsEnum(Enum)` | Valida que o valor pertence ao enum |
| `@IsDateString()` | Valida ISO date string (`"2024-01-31"`) |

**Regra de ordem dos decorators:** sempre `@ApiProperty` primeiro, validações depois:
```typescript
@ApiProperty({ enum: StatusDevedor })
@IsNotEmpty()
@IsEnum(StatusDevedor)
status: StatusDevedor;
```

**UUID de relacionamento (FK):**
```typescript
@ApiProperty({ description: 'ID da Empresa dona deste recurso' })
@IsNotEmpty()
@IsUUID()
empresaId: string;
```

**Data no DTO** — receber como string ISO, o Prisma converte:
```typescript
@ApiProperty({ example: '2025-12-31' })
@IsNotEmpty()
@IsDateString()
vencimento: Date;   // class-validator valida como string, Prisma recebe Date
```

---

### Guards — proteção de rotas

**`AuthGuard`** (`src/auth/auth.guard.ts`) é o único guard do projeto. Ele extrai e valida o Bearer token JWT, e injeta o payload em `request['empresa']`.

Aplicar em qualquer rota que exija autenticação:
```typescript
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';

@UseGuards(AuthGuard)
@ApiBearerAuth()   // sempre junto com @UseGuards(AuthGuard) para o Swagger
async minhaRota() { ... }
```

Rotas públicas (ex: cadastro, login, webhook) **não** recebem `@UseGuards`.

---

### Decorators — extraindo dados da request

**`@Empresa()`** (`src/auth/decorators/empresa.decorator.ts`) extrai o payload JWT injetado pelo `AuthGuard`. Retorna um objeto `JwtPayload`:

```typescript
interface JwtPayload {
  sub: string;   // empresaId (UUID)
  email: string;
}
```

Uso no controller:
```typescript
import { Empresa } from 'src/auth/decorators/empresa.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

async minhaRota(@Empresa() empresa: JwtPayload) {
  const empresaId = empresa.sub;  // sempre usar .sub como empresaId
}
```

Regra: **nunca receber `empresaId` pelo body ou params** em rotas protegidas — sempre extrair do token via `@Empresa()`.

---

### Prisma — acesso ao banco

**PrismaService** é global (`@Global()` no `PrismaModule`) — basta injetá-lo no Repository sem importar o módulo:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/browser';  // tipos de input

@Injectable()
export class MeuRepository {
  constructor(private prisma: PrismaService) {}
}
```

**Imports de tipos e enums:**
```typescript
// Tipos de input/output do Prisma (ex: Prisma.EmpresaCreateInput)
import { Prisma } from '../generated/prisma/browser';

// Tipos de modelo (ex: Empresa, Devedor)
import { Empresa } from 'src/generated/prisma/client';

// Enums (ex: StatusDevedor, TipoPessoa)
import { StatusDevedor, OrigemDevedor, TipoPessoa } from 'src/generated/prisma/enums';
```

**Padrão de queries no Repository:**

```typescript
// Busca com select explícito (nunca retornar senha)
async findById(id: string) {
  return this.prisma.empresa.findUnique({
    where: { id },
    select: { id: true, nome: true, email: true, /* ... */ },
  });
}

// Criação com tipos Prisma
async create(data: Prisma.EmpresaCreateInput) {
  return this.prisma.empresa.create({ data });
}

// Update com tipos Prisma
async update(id: string, data: Prisma.EmpresaUpdateInput) {
  return this.prisma.empresa.update({ where: { id }, data });
}

// Upsert em lote dentro de transação
async upsertMany(itens: any[], empresaId: string) {
  return this.prisma.$transaction(
    itens.map((item) =>
      this.prisma.modelo.upsert({
        where: { campoUnico: { campo: item.campo, empresaId } },
        update: { /* campos a atualizar */ },
        create: { ...item, empresa: { connect: { id: empresaId } } },
      }),
    ),
  );
}
```

**Isolamento por empresa:** toda query que lista ou acessa registros de um tenant deve sempre filtrar por `empresaId`:
```typescript
where: { id, empresaId }   // nunca buscar só por id sem validar o dono
```

**Cascade delete:** todas as entidades filhas (`Endereco`, `Devedor`, `FaixaCriterio`, `Proposta`) têm `onDelete: Cascade` na relação com `Empresa` — deletar a empresa remove tudo automaticamente.

---

### Exceções HTTP — padrão do Service

Usar sempre as exceções do `@nestjs/common`. O NestJS possui uma camada global de exceções embutida que captura automaticamente qualquer `HttpException` e retorna a resposta HTTP padronizada — sem necessidade de `ExceptionFilter` customizado.

```typescript
import { NotFoundException, ConflictException, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';

throw new NotFoundException('Empresa não encontrada');
throw new ConflictException('Este email já foi cadastrado.');
throw new BadRequestException('O valor mínimo deve ser menor que o valor máximo.');
throw new ForbiddenException('Você não tem permissão para acessar este recurso.');
throw new UnauthorizedException('Token inválido ou expirado');
```

---

### Módulo — estrutura de arquivos

Ao criar um novo módulo, seguir exatamente esta estrutura:

```
src/nome-modulo/
├── nome-modulo.module.ts
├── nome-modulo.controller.ts
├── nome-modulo.service.ts
├── nome-modulo.repository.ts
└── dto/
    ├── create-nome-modulo.dto.ts
    └── update-nome-modulo.dto.ts
```

O `*.module.ts` deve declarar controller, service e repository como providers, e exportar o service se outros módulos precisarem:

```typescript
@Module({
  controllers: [NomeModuloController],
  providers: [NomeModuloService, NomeModuloRepository],
  exports: [NomeModuloService],   // somente se necessário
})
export class NomeModuloModule {}
```
