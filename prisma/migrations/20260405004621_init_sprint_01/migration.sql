-- CreateEnum
CREATE TYPE "StatusCliente" AS ENUM ('PENDENTE', 'EM_NEGOCIACAO', 'ACORDADO', 'PAGO', 'SEM_RESPOSTA', 'RECUSADO');

-- CreateEnum
CREATE TYPE "OrigemCliente" AS ENUM ('PLANILHA', 'API');

-- CreateEnum
CREATE TYPE "TipoPessoa" AS ENUM ('FISICA', 'JURIDICA');

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Endereco" (
    "id" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "logradouro" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "Endereco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT NOT NULL,
    "tipoPessoa" "TipoPessoa" NOT NULL,
    "cpf" TEXT,
    "cnpj" TEXT,
    "valorDivida" DOUBLE PRECISION NOT NULL,
    "descricaoDivida" TEXT,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "numeroParcelas" INTEGER,
    "status" "StatusCliente" NOT NULL DEFAULT 'PENDENTE',
    "origem" "OrigemCliente" NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "ultimoContato" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaixaCriterio" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valorMinimo" DOUBLE PRECISION NOT NULL,
    "valorMaximo" DOUBLE PRECISION NOT NULL,
    "prazoMaximoDias" INTEGER NOT NULL,
    "parcelasMaximas" INTEGER NOT NULL,
    "descontoMaximo" DOUBLE PRECISION NOT NULL,
    "tomComunicacao" TEXT NOT NULL,
    "mensagemInicial" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "FaixaCriterio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_email_key" ON "Empresa"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_cnpj_key" ON "Empresa"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Endereco_empresaId_key" ON "Endereco"("empresaId");

-- AddForeignKey
ALTER TABLE "Endereco" ADD CONSTRAINT "Endereco_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaixaCriterio" ADD CONSTRAINT "FaixaCriterio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
