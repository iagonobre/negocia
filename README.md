<p align="center">
  <img src="./assets/logo.png" width="160" alt="NegocIA Logo" />
</p>

<h1 align="center">NegocIA</h1>

<p align="center">
  Plataforma de cobrança automatizada e recuperação de vendas via WhatsApp com agente de IA.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/NestJS-11-E0234E?style=flat-square&logo=nestjs&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/pnpm-9-F69220?style=flat-square&logo=pnpm&logoColor=white" />
</p>

---

## Sobre

O **NegocIA** é uma aplicação web que automatiza o processo de cobrança de clientes inadimplentes e a recuperação de vendas não finalizadas. A empresa cadastra sua base de clientes e define os critérios de negociação, um agente de inteligência artificial conduz as negociações diretamente via WhatsApp, gera propostas de parcelamento personalizadas e emite cobranças por Pix ou boleto de forma autônoma.

---

## Tecnologias

- [NestJS](https://nestjs.com/) — framework Node.js para APIs escaláveis
- [TypeScript](https://www.typescriptlang.org/) — tipagem estática
- [Prisma](https://www.prisma.io/) — ORM e migrations
- [PostgreSQL](https://www.postgresql.org/) — banco de dados relacional
- [Docker](https://www.docker.com/) — containerização do banco
- [pnpm](https://pnpm.io/) — gerenciador de pacotes
- [Swagger](https://swagger.io/) — documentação da API

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [Docker](https://www.docker.com/) + Docker Compose

---

## Configuração do ambiente

1. Clone o repositório:

```bash
git clone https://github.com/seu-usuario/negocia.git
cd negocia
```

2. Instale as dependências:

```bash
pnpm install
```

3. Copie o arquivo de variáveis de ambiente:

```bash
cp .env.example .env
```

4. Preencha as variáveis no `.env`:

```env
DATABASE_URL=postgresql://negocia:negocia@localhost:5432/negocia
JWT_SECRET=sua_chave_secreta_aqui
```

---

## Rodando o projeto

### Subindo o banco com Docker

```bash
docker compose up -d
```

### Gerando o cliente Prisma

```bash
npx prisma generate
```

### Rodando as migrations

```bash
npx prisma migrate dev
```

### Modo desenvolvimento

```bash
pnpm run start:dev
```

A API estará disponível em `http://localhost:3000`.  
A documentação Swagger estará em `http://localhost:3000/api`.

---

## Banco de dados

```bash
# Subir o container
docker compose up -d

# Parar o container
docker compose down

# Reset completo do banco
docker compose down -v

# Visualizar dados (Prisma Studio)
npx prisma studio
```

---

## Scripts disponíveis

| Script                | Descrição                              |
| --------------------- | -------------------------------------- |
| `pnpm run start:dev`  | Inicia em modo watch (desenvolvimento) |
| `pnpm run build`      | Compila o projeto                      |
| `pnpm run start:prod` | Inicia o build de produção             |
| `pnpm run lint`       | Roda o linter                          |
| `pnpm run test`       | Testes unitários                       |
| `pnpm run test:cov`   | Cobertura de testes                    |

---

## Testes

```bash
# Rodar todos os testes
pnpm run test

# Rodar teste de um módulo específico
pnpm run test empresa.service
pnpm run test auth.service

# Cobertura de testes
pnpm run test:cov
```

---

<p align="center">
  Desenvolvido com ☕ por Iago Nobre, Liriel Felix e Natham Fernandes.
</p>
