-- DropForeignKey
ALTER TABLE "Devedor" DROP CONSTRAINT "Devedor_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "FaixaCriterio" DROP CONSTRAINT "FaixaCriterio_empresaId_fkey";

-- AddForeignKey
ALTER TABLE "Devedor" ADD CONSTRAINT "Devedor_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaixaCriterio" ADD CONSTRAINT "FaixaCriterio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
