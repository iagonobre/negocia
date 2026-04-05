import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from 'generated/prisma/browser';

@Injectable()
export class EmpresaRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
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

  async findByEmail(email: string) {
    return this.prisma.empresa.findUnique({
      where: { email },
    });
  }

  async findByCnpj(cnpj: string) {
    return this.prisma.empresa.findUnique({
      where: { cnpj },
    });
  }

  async findByEmailExcludingId(email: string, id: string) {
    return this.prisma.empresa.findFirst({
      where: { email, NOT: { id } },
    });
  }

  async create(data: Prisma.EmpresaCreateInput) {
    return this.prisma.empresa.create({ data });
  }

  async update(id: string, data: Prisma.EmpresaUpdateInput) {
    return this.prisma.empresa.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.empresa.delete({ where: { id } });
  }
}
