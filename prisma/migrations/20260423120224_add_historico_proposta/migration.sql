/*
  Warnings:

  - You are about to drop the column `mensagemGerada` on the `Proposta` table. All the data in the column will be lost.
  - You are about to drop the column `opcoes` on the `Proposta` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Proposta" DROP COLUMN "mensagemGerada",
DROP COLUMN "opcoes",
ADD COLUMN     "historico" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "limites" JSONB NOT NULL DEFAULT '[]';
