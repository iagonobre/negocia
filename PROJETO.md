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
- **Documentação da API:** Swagger em `/api`
- **Package manager:** pnpm 9
- **Infra local:** Docker Compose (container `negocia_db`)

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
└── faixa-criterio/          # Critérios de negociação por faixa de valor
```

---

## Banco de dados — Entidades e relacionamentos

```
Empresa (1) ──── (1) Endereco
    │
    ├──────────── (N) Devedor
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
Vinculado 1:1 à Empresa (opcional).

| Campo | Tipo |
|---|---|
| cep, logradouro, numero, complemento, bairro, cidade, estado | string |
| empresaId | FK → Empresa (único) |

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

---

### `devedor/` — Devedor

**Responsabilidade:** Gestão dos devedores vinculados à empresa, incluindo cadastro individual e importação em massa via CSV.

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/devedor/cadastrar` | JWT | Criar devedor único |
| PATCH | `/devedor/atualizar/:id` | JWT | Atualizar devedor |
| POST | `/devedor/importar` | JWT | Importar CSV (multipart, max 100MB) |

**Importação CSV (`/devedor/importar`):**
- Aceita arquivo `.csv` via multipart/form-data
- Executa **upsert** com base no par `(email, empresaId)`
  - Se o devedor já existe: atualiza nome, telefone, valorDivida, descricaoDivida, vencimento, status
  - Se não existe: cria novo registro
- Conversões automáticas: datas, floats, inteiros, enums, nulos para campos vazios
- Toda a operação roda em uma transação no banco

**Isolamento:** Todas as queries são escopadas pelo `empresaId` do token JWT — uma empresa nunca acessa devedores de outra.

---

### `faixa-criterio/` — Faixa de Critério

**Responsabilidade:** Configuração das faixas de negociação que o agente de IA utilizará para gerar propostas personalizadas.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/faixas-criterio` | Criar faixa |
| GET | `/faixas-criterio/empresa/:empresaId` | Listar faixas (ordenado por valorMinimo) |
| PUT | `/faixas-criterio/:id` | Atualizar faixa |
| DELETE | `/faixas-criterio/:id` | Excluir faixa |

**Lógica de validação ao criar/atualizar:**
1. `valorMinimo` deve ser menor que `valorMaximo`
2. Não pode haver sobreposição com faixas existentes da mesma empresa
3. A faixa deve ser contígua com as demais (sem lacunas de valor ou deve ser a primeira)
4. `descontoMaximo` entre 0 e 100
5. `prazoMaximoDias` e `parcelasMaximas` maiores que 0

---

### `prisma/` — Prisma Service

Serviço global que encapsula a conexão com o PostgreSQL via Prisma Client. Injetado em todos os repositórios.

---

### `config/` — Configuração

Centraliza as variáveis de ambiente:

```typescript
{
  port: process.env.PORT || 3000,
  JWT: {
    secret: process.env.JWT_SECRET,
    expiresIn: '7d'
  },
  database: {
    url: process.env.DATABASE_URL
  }
}
```

Variáveis necessárias (`.env`):
```
DATABASE_URL=postgresql://negocia:negocia@localhost:5432/negocia
JWT_SECRET=seu_secret_aqui
```

---

## Fluxo principal (visão geral)

```
Empresa se cadastra
    │
    ├─► Define FaixasCriterio (ex: R$0–500 / R$500–5000 / R$5000+)
    │       com parcelamento máximo, desconto máximo, tom de comunicação
    │
    ├─► Importa base de Devedores (CSV ou API)
    │
    └─► [futuro] Agente de IA inicia contato via WhatsApp
            │
            ├─► Identifica faixa da dívida → aplica critério correto
            ├─► Negocia dentro dos limites configurados
            ├─► Gera proposta de parcelamento
            └─► Emite Pix ou boleto para pagamento
```

---

## Funcionalidades planejadas (não implementadas)

- **WhatsApp Integration** — canal de comunicação do agente de IA com devedores
- **Agente de IA** — condução autônoma da negociação, geração de respostas e propostas
- **Motor de propostas** — gera parcelamentos personalizados com base nas FaixasCriterio
- **Integração Pix** — geração e rastreamento de cobranças Pix
- **Integração Boleto** — geração de boletos bancários
- **Histórico de conversas** — log detalhado das interações (hoje apenas `ultimoContato` e `tentativas`)

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

**Campos com múltiplos validadores numéricos:**
```typescript
@ApiProperty({ description: 'Desconto em %', example: 15 })
@IsNumber()
@Min(0)
@Max(100)
descontoMaximo: number;
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

Rotas públicas (ex: cadastro, login) **não** recebem `@UseGuards`.

---

### Decorators — extraindo dados da request

**`@Empresa()`** (`src/auth/decorators/empresa.decorator.ts`) extrai o payload JWT injetado pelo `AuthGuard`. Retorna um objeto `JwtPayload`:

```typescript
// src/auth/dto/jwt-payload.dto.ts
interface JwtPayload {
  sub: string;   // empresaId (UUID)
  email: string;
}
```

Uso no controller:
```typescript
import { Empresa } from 'src/auth/decorators/empresa.decorator';
import type { JwtPayload } from 'src/auth/dto/jwt-payload.dto';

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

---

### Exceções HTTP — padrão do Service

Usar sempre as exceções do `@nestjs/common`. Nunca retornar erros como objetos na resposta:

```typescript
import { NotFoundException, ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';

// Recurso não encontrado
throw new NotFoundException('Empresa não encontrada');

// Conflito de unicidade
throw new ConflictException('Este email já foi cadastrado.');

// Validação de regra de negócio
throw new BadRequestException('O valor mínimo deve ser menor que o valor máximo.');

// Autenticação inválida
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
