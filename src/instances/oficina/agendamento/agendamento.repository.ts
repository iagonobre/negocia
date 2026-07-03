import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { Agendamento } from '../../../generated/prisma/client';

@Injectable()
export class AgendamentoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByEmpresa(empresaId: string): Promise<Agendamento[]> {
    return this.prisma.agendamento.findMany({
      where: { empresaId },
      include: { cliente: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, empresaId: string): Promise<Agendamento | null> {
    return this.prisma.agendamento.findFirst({ where: { id, empresaId } });
  }

  async findPendentePorCliente(clienteId: string): Promise<Agendamento | null> {
    return this.prisma.agendamento.findFirst({
      where: { clienteId, status: 'PENDENTE' },
    });
  }

  async findClienteComConfig(
    clienteId: string,
    empresaId: string,
  ): Promise<{ cliente: any; servicoConfig: any | null } | null> {
    const cliente = await this.prisma.clienteOficina.findFirst({
      where: { id: clienteId, empresaId },
    });
    if (!cliente) return null;

    const servicoConfig = await this.prisma.servicoConfig.findFirst({
      where: { empresaId },
      orderBy: { createdAt: 'desc' },
    });

    return { cliente, servicoConfig };
  }

  async create(clienteId: string, empresaId: string, historico: any[]): Promise<Agendamento> {
    return this.prisma.agendamento.create({
      data: { clienteId, empresaId, historico },
    });
  }

  async atualizarHistorico(id: string, historico: any[]): Promise<Agendamento> {
    return this.prisma.agendamento.update({ where: { id }, data: { historico } });
  }

  async atualizarDataAgendada(id: string, dataAgendada: Date, tipoServico?: string): Promise<Agendamento> {
    return this.prisma.agendamento.update({
      where: { id },
      data: { dataAgendada, tipoServico, status: 'CONFIRMADO' },
    });
  }
}
