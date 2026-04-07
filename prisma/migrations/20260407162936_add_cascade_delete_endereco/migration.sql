-- DropForeignKey
ALTER TABLE "Endereco" DROP CONSTRAINT "Endereco_empresaId_fkey";

-- AddForeignKey
ALTER TABLE "Endereco" ADD CONSTRAINT "Endereco_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
