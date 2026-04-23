-- CreateEnum
CREATE TYPE "StatusProposta" AS ENUM ('PENDENTE', 'ACEITA', 'RECUSADA');

-- CreateTable
CREATE TABLE "Proposta" (
    "id" TEXT NOT NULL,
    "opcoes" JSONB NOT NULL,
    "mensagemGerada" TEXT NOT NULL,
    "status" "StatusProposta" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "devedorId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "Proposta_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Proposta" ADD CONSTRAINT "Proposta_devedorId_fkey" FOREIGN KEY ("devedorId") REFERENCES "Devedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposta" ADD CONSTRAINT "Proposta_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
