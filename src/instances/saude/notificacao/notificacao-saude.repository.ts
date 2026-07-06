import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class NotificacaoSaudeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findEmpresasAtivas(): Promise<string[]> {
    const empresas = await this.prisma.empresa.findMany({ select: { id: true } });
    return empresas.map((e) => e.id);
  }

  async findPacientesPendentes(empresaId: string) {
    return this.prisma.paciente.findMany({
      where: { empresaId, status: 'RETORNO_PENDENTE' },
    });
  }
}
