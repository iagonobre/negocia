import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Devedor, Prisma } from '../generated/prisma/client';

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
    return this.prisma.devedor.findMany({
      where: { empresaId },
    });
  }

  async findOne(id: string, empresaId: string): Promise<Devedor | null> {
    return this.prisma.devedor.findFirst({
      where: { id, empresaId },
    });
  }

  async delete(id: string, empresaId: string): Promise<void> {
    await this.prisma.devedor.delete({
      where: { id, empresaId },
    });
  }

  async upsertMany(devedores: any[], empresaId: string): Promise<Devedor[]> {
    return this.prisma.$transaction(
      devedores.map((d) =>
        this.prisma.devedor.upsert({
          where: {
            email_empresaId: {
              email: d.email,
              empresaId: empresaId,
            },
          },
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
