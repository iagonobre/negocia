import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  async create(
    devedorId: string,
    empresaId: string,
    limites: any,
    historicoInicial: any[],
  ) {
    return this.prisma.proposta.create({
      data: {
        devedorId,
        empresaId,
        limites,
        historico: historicoInicial,
        status: 'PENDENTE',
      },
      include: { devedor: true }, // Já retornamos o devedor junto para facilitar
    });
  }

  async atualizarHistorico(id: string, novoHistorico: any[]) {
    return this.prisma.proposta.update({
      where: { id },
      data: { historico: novoHistorico },
    });
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

  async findPendentePorDevedor(devedorId: string) {
    return this.prisma.proposta.findFirst({
      where: { devedorId, status: 'PENDENTE' },
    });
  }

  async findAceitasParceladas(empresaId?: string) {
    return this.prisma.proposta.findMany({
      where: {
        status: 'ACEITA',
        ...(empresaId && { empresaId }),
        parcelasAcordadas: { gt: 1 },
      },
      include: { devedor: true },
    });
  }

  async updateStatus(
    id: string,
    status: 'PENDENTE' | 'ACEITA' | 'RECUSADA',
    valorAcordado?: number,
    parcelasAcordadas?: number,
  ) {
    return this.prisma.proposta.update({
      where: { id },
      data: { status, valorAcordado, parcelasAcordadas },
    });
  }

  async atualizarStatusDevedor(devedorId: string, status: string) {
    return this.prisma.devedor.update({
      where: { id: devedorId },
      data: { status: status as any },
    });
  }
}
