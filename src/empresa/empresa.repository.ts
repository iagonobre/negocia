import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Empresa, Prisma } from '../generated/prisma/client';

export type EmpresaSemSenha = Omit<Empresa, 'senha'> & { endereco?: unknown };

@Injectable()
export class EmpresaRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<EmpresaSemSenha | null> {
    return this.prisma.empresa.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        cnpj: true,
        telefone: true,
        createdAt: true,
        updatedAt: true,
        endereco: true,
      },
    });
  }

  async findByEmail(email: string): Promise<Empresa | null> {
    return this.prisma.empresa.findUnique({ where: { email } });
  }

  async findByCnpj(cnpj: string): Promise<Empresa | null> {
    return this.prisma.empresa.findUnique({ where: { cnpj } });
  }

  async findByEmailExcludingId(
    email: string,
    id: string,
  ): Promise<Empresa | null> {
    return this.prisma.empresa.findFirst({ where: { email, NOT: { id } } });
  }

  async create(data: Prisma.EmpresaCreateInput): Promise<Empresa> {
    return this.prisma.empresa.create({
      data,
      include: {
        endereco: true,
      },
    });
  }

  async update(id: string, data: Prisma.EmpresaUpdateInput): Promise<Empresa> {
    return this.prisma.empresa.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.empresa.delete({ where: { id } });
  }

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
