/*
  Warnings:

  - A unique constraint covering the columns `[email,empresaId]` on the table `Devedor` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Devedor_email_empresaId_key" ON "Devedor"("email", "empresaId");
