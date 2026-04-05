/*
  Warnings:

  - You are about to drop the `Cliente` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "StatusDevedor" AS ENUM ('PENDENTE', 'EM_NEGOCIACAO', 'ACORDADO', 'PAGO', 'SEM_RESPOSTA', 'RECUSADO');

-- CreateEnum
CREATE TYPE "OrigemDevedor" AS ENUM ('PLANILHA', 'API');

-- DropForeignKey
ALTER TABLE "Cliente" DROP CONSTRAINT "Cliente_empresaId_fkey";

-- DropTable
DROP TABLE "Cliente";

-- DropEnum
DROP TYPE "OrigemCliente";

-- DropEnum
DROP TYPE "StatusCliente";

-- CreateTable
CREATE TABLE "Devedor" (
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
    "status" "StatusDevedor" NOT NULL DEFAULT 'PENDENTE',
    "origem" "OrigemDevedor" NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "ultimoContato" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "Devedor_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Devedor" ADD CONSTRAINT "Devedor_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
