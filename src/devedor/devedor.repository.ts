import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/browser';
import { Devedor } from 'src/generated/prisma/client';

@Injectable()
export class DevedorRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.DevedorCreateInput) {
    return this.prisma.devedor.create({ data });
  }

  async update(params: {
    where: Prisma.DevedorWhereUniqueInput & { empresaId?: string };
    data: Prisma.DevedorUpdateInput;
  }): Promise<Devedor> {
    const { where, data } = params;
    return this.prisma.devedor.update({
      where,
      data,
    });
  }

  async findAll(empresaId: string): Promise<Devedor[]> {
    return this.prisma.devedor.findMany({
      where: { empresaId },
    });
  }

  async findOne(id: string, empresaId: string): Promise<Devedor | null> {
    return this.prisma.devedor.findFirst({
      where: { 
        id, 
        empresaId 
      },
    });
  }

  async delete(id: string, empresaId: string): Promise<Devedor> {
    return this.prisma.devedor.delete({
      where: { 
        id,
        empresaId 
      },
    });
  }
}
