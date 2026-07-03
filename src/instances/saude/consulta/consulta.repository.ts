import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class ConsultaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPendentePorPaciente(pacienteId: string) {
    return this.prisma.consulta.findFirst({
      where: { pacienteId, status: 'PENDENTE' },
    });
  }

  async findPacienteComConfig(pacienteId: string, empresaId: string) {
    const paciente = await this.prisma.paciente.findFirst({
      where: { id: pacienteId, empresaId },
      include: { configRetorno: true },
    });
    if (!paciente) return null;
    return { paciente, configRetorno: paciente.configRetorno };
  }

  async findById(id: string, empresaId: string) {
    return this.prisma.consulta.findFirst({ where: { id, empresaId } });
  }

  async findAllByEmpresa(empresaId: string) {
    return this.prisma.consulta.findMany({
      where: { empresaId },
      include: { paciente: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(pacienteId: string, empresaId: string, historico: any[]) {
    return this.prisma.consulta.create({
      data: { pacienteId, empresaId, historico },
    });
  }

  async atualizarHistorico(id: string, historico: any[]) {
    return this.prisma.consulta.update({ where: { id }, data: { historico } });
  }

  async atualizarStatus(id: string, status: string, dataAgendada?: Date) {
    return this.prisma.consulta.update({
      where: { id },
      data: { status: status as any, ...(dataAgendada && { dataAgendada }) },
    });
  }
}
