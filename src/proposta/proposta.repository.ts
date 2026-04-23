import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/browser';

@Injectable()
export class PropostaRepository {
  constructor(private prisma: PrismaService) {}

  async findDevedorComFaixa(devedorId: string, empresaId: string) {
    const devedor = await this.prisma.devedor.findUnique({
      where: { id: devedorId },
    });

    if (!devedor || devedor.empresaId !== empresaId) return null;

    const faixa = await this.prisma.faixaCriterio.findFirst({
      where: {
        empresaId,
        valorMinimo: { lte: devedor.valorDivida },
        valorMaximo: { gte: devedor.valorDivida },
      },
    });

    return { devedor, faixa };
  }

  async create(data: Prisma.PropostaCreateInput) {
    return this.prisma.proposta.create({ data });
  }

  async findAllByEmpresa(empresaId: string) {
    return this.prisma.proposta.findMany({
      where: { empresaId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, empresaId: string) {
    return this.prisma.proposta.findFirst({
      where: { id, empresaId },
    });
  }

  async updateStatus(id: string, status: 'PENDENTE' | 'ACEITA' | 'RECUSADA') {
    return this.prisma.proposta.update({
      where: { id },
      data: { status },
    });
  }
}