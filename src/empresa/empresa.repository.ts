import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Empresa, Prisma } from '../generated/prisma/client';

type EmpresaSemSenha = Omit<Empresa, 'senha'> & { endereco: any };

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
    return this.prisma.empresa.findUnique({
      where: { email },
    });
  }

  async findByCnpj(cnpj: string): Promise<Empresa | null> {
    return this.prisma.empresa.findUnique({
      where: { cnpj },
    });
  }

  async findByEmailExcludingId(email: string, id: string): Promise<Empresa | null> {
    return this.prisma.empresa.findFirst({
      where: { email, NOT: { id } },
    });
  }

  async create(data: Prisma.EmpresaCreateInput): Promise<Empresa> {
    return this.prisma.empresa.create({ data });
  }

  async update(id: string, data: Prisma.EmpresaUpdateInput): Promise<Empresa> {
    return this.prisma.empresa.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.empresa.delete({ where: { id } });
  }
}
