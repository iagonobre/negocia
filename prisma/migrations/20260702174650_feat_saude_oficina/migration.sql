-- CreateEnum
CREATE TYPE "StatusPaciente" AS ENUM ('ATIVO', 'RETORNO_PENDENTE', 'RETORNO_AGENDADO', 'ABANDONOU');

-- CreateEnum
CREATE TYPE "StatusConsulta" AS ENUM ('PENDENTE', 'CONFIRMADA', 'REALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusClienteOficina" AS ENUM ('ATIVO', 'REVISAO_PENDENTE', 'AGENDADO', 'INATIVO');

-- CreateEnum
CREATE TYPE "StatusAgendamento" AS ENUM ('PENDENTE', 'CONFIRMADO', 'REALIZADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "ConfigRetorno" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "diasParaRetorno" INTEGER NOT NULL,
    "tomComunicacao" TEXT NOT NULL,
    "mensagemInicial" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "ConfigRetorno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paciente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "cpf" TEXT,
    "convenio" TEXT,
    "status" "StatusPaciente" NOT NULL DEFAULT 'ATIVO',
    "ultimaConsulta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "configRetornoId" TEXT,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consulta" (
    "id" TEXT NOT NULL,
    "historico" JSONB NOT NULL DEFAULT '[]',
    "limites" JSONB NOT NULL DEFAULT '[]',
    "dataAgendada" TIMESTAMP(3),
    "status" "StatusConsulta" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "Consulta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicoConfig" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "prazoRevisaoDias" INTEGER NOT NULL,
    "tomComunicacao" TEXT NOT NULL,
    "mensagemInicial" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "ServicoConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClienteOficina" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "modeloVeiculo" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "status" "StatusClienteOficina" NOT NULL DEFAULT 'ATIVO',
    "ultimaRevisao" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "ClienteOficina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agendamento" (
    "id" TEXT NOT NULL,
    "historico" JSONB NOT NULL DEFAULT '[]',
    "limites" JSONB NOT NULL DEFAULT '[]',
    "dataAgendada" TIMESTAMP(3),
    "tipoServico" TEXT,
    "status" "StatusAgendamento" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clienteId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "Agendamento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ConfigRetorno" ADD CONSTRAINT "ConfigRetorno_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paciente" ADD CONSTRAINT "Paciente_configRetornoId_fkey" FOREIGN KEY ("configRetornoId") REFERENCES "ConfigRetorno"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paciente" ADD CONSTRAINT "Paciente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicoConfig" ADD CONSTRAINT "ServicoConfig_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClienteOficina" ADD CONSTRAINT "ClienteOficina_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "ClienteOficina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
