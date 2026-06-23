import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class PainelRepository {
  constructor(private prisma: PrismaService) {}

  async painel(empresaId: string) {
    const [
      totalDevedores,
      devedoresPorStatus,
      totalPropostas,
      propostasPorStatus,
      valorTotalEmAberto,
      valorTotalRecuperado,
    ] = await Promise.all([
      this.prisma.devedor.count({ where: { empresaId } }),

      this.prisma.devedor.groupBy({
        by: ['status'],
        where: { empresaId },
        _count: { id: true },
      }),

      this.prisma.proposta.count({ where: { empresaId } }),

      this.prisma.proposta.groupBy({
        by: ['status'],
        where: { empresaId },
        _count: { id: true },
      }),

      this.prisma.devedor.aggregate({
        where: { empresaId, status: { notIn: ['ACORDADO', 'PAGO'] as any } },
        _sum: { valorDivida: true },
      }),

      this.prisma.proposta.aggregate({
        where: { empresaId, status: 'ACEITA' },
        _sum: { valorAcordado: true },
      }),
    ]);

    const taxaRecuperacao = valorTotalEmAberto._sum.valorDivida
      ? ((valorTotalRecuperado._sum.valorAcordado ?? 0) /
          ((valorTotalEmAberto._sum.valorDivida ?? 0) + (valorTotalRecuperado._sum.valorAcordado ?? 0))) *
        100
      : 0;

    return {
      devedores: {
        total: totalDevedores,
        porStatus: Object.fromEntries(devedoresPorStatus.map((d) => [d.status, d._count.id])),
      },
      propostas: {
        total: totalPropostas,
        porStatus: Object.fromEntries(propostasPorStatus.map((p) => [p.status, p._count.id])),
      },
      financeiro: {
        valorTotalEmAberto: valorTotalEmAberto._sum.valorDivida ?? 0,
        valorTotalRecuperado: valorTotalRecuperado._sum.valorAcordado ?? 0,
        taxaRecuperacaoPercent: parseFloat(taxaRecuperacao.toFixed(2)),
      },
    };
  }
}
