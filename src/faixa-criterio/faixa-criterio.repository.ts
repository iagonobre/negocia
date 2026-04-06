import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FaixaCriterio } from '../generated/prisma/client';
import { CreateFaixaCriterioDto, UpdateFaixaCriterioDto } from './dto/faixa-criterio.dto';

@Injectable()
export class FaixaCriterioRepository {

  constructor(private readonly prisma: PrismaService) {}

  async criar(dados: CreateFaixaCriterioDto): Promise<FaixaCriterio> {
    return this.prisma.faixaCriterio.create({
      data: {
        ...dados,
        mensagemInicial: dados.mensagemInicial ?? null,
      },
    });
  }

  async listarPorEmpresa(empresaId: string): Promise<FaixaCriterio[]> {
    return this.prisma.faixaCriterio.findMany({
      where: { empresaId },
      orderBy: { valorMinimo: 'asc' },
    });
  }

  async buscarPorId(id: string): Promise<FaixaCriterio | null> {
    return this.prisma.faixaCriterio.findUnique({ where: { id } });
  }

  async buscarSobrepostas(
    empresaId: string,
    valorMinimo: number,
    valorMaximo: number,
    ignorarId?: string,
  ): Promise<FaixaCriterio[]> {
    return this.prisma.faixaCriterio.findMany({
      where: {
        empresaId,
        id: ignorarId ? { not: ignorarId } : undefined,
        AND: [
          { valorMinimo: { lt: valorMaximo } },
          { valorMaximo: { gt: valorMinimo } },
        ],
      },
    });
  }

  async atualizar(id: string, dados: UpdateFaixaCriterioDto): Promise<FaixaCriterio> {
    return this.prisma.faixaCriterio.update({
      where: { id },
      data: {
        ...dados,
        mensagemInicial: dados.mensagemInicial ?? null,
      },
    });
  }

  async deletar(id: string): Promise<void> {
    await this.prisma.faixaCriterio.delete({ where: { id } });
  }
}