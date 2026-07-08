import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { Devedor, Prisma } from '../../../generated/prisma/client';
import { DevedorCsvRow } from './types/devedor-csv-row.type';

@Injectable()
export class DevedorRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.DevedorCreateInput): Promise<Devedor> {
    return this.prisma.devedor.create({ data });
  }

  async update(params: {
    where: Prisma.DevedorWhereUniqueInput & { empresaId?: string };
    data: Prisma.DevedorUpdateInput;
  }): Promise<Devedor> {
    const { where, data } = params;
    return this.prisma.devedor.update({ where, data });
  }

  async findAll(empresaId: string): Promise<Devedor[]> {
    return this.prisma.devedor.findMany({ where: { empresaId } });
  }

  async findOne(id: string, empresaId: string): Promise<Devedor | null> {
    return this.prisma.devedor.findFirst({ where: { id, empresaId } });
  }

  async findByTelefone(telefone: string): Promise<Devedor | null> {
    // Se mais de um devedor compartilha o telefone, prioriza quem já tem uma
    // negociação em andamento — é quem está de fato esperando essa resposta.
    const comNegociacaoAtiva = await this.prisma.devedor.findFirst({
      where: { telefone, propostas: { some: { status: 'PENDENTE' } } },
    });
    if (comNegociacaoAtiva) return comNegociacaoAtiva;

    return this.prisma.devedor.findFirst({ where: { telefone } });
  }

  async delete(id: string, empresaId: string): Promise<void> {
    await this.prisma.devedor.delete({ where: { id, empresaId } });
  }

  async findHistorico(id: string, empresaId: string) {
    return this.prisma.devedor.findFirst({
      where: { id, empresaId },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        tipoPessoa: true,
        cpf: true,
        cnpj: true,
        valorDivida: true,
        descricaoDivida: true,
        vencimento: true,
        numeroParcelas: true,
        status: true,
        origem: true,
        tentativas: true,
        ultimoContato: true,
        createdAt: true,
        updatedAt: true,
        propostas: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            valorAcordado: true,
            parcelasAcordadas: true,
            limites: true,
            historico: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  async upsertMany(devedores: DevedorCsvRow[], empresaId: string): Promise<Devedor[]> {
    return this.prisma.$transaction(
      devedores.map((d) =>
        this.prisma.devedor.upsert({
          where: { email_empresaId: { email: d.email, empresaId } },
          update: {
            nome: d.nome,
            telefone: d.telefone,
            valorDivida: d.valorDivida,
            descricaoDivida: d.descricaoDivida,
            vencimento: new Date(d.vencimento),
            status: d.status,
          },
          create: {
            ...d,
            vencimento: new Date(d.vencimento),
            empresa: { connect: { id: empresaId } },
          },
        }),
      ),
    );
  }
}
