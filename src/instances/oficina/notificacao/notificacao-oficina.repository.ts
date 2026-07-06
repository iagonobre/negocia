import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class NotificacaoOficinaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findEmpresasAtivas(): Promise<string[]> {
    const empresas = await this.prisma.empresa.findMany({ select: { id: true } });
    return empresas.map((e) => e.id);
  }

  async findClientesPendentes(empresaId: string) {
    return this.prisma.clienteOficina.findMany({
      where: { empresaId, status: 'REVISAO_PENDENTE' },
    });
  }
}
