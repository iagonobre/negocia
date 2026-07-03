import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ConfigRetorno } from '../../../generated/prisma/client';
import { CreateConfigRetornoDto } from './dto/create-config-retorno.dto';
import { UpdateConfigRetornoDto } from './dto/update-config-retorno.dto';

@Injectable()
export class ConfigRetornoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(empresaId: string): Promise<ConfigRetorno[]> {
    return this.prisma.configRetorno.findMany({ where: { empresaId } });
  }

  async findById(id: string, empresaId: string): Promise<ConfigRetorno | null> {
    return this.prisma.configRetorno.findFirst({ where: { id, empresaId } });
  }

  async create(dados: CreateConfigRetornoDto, empresaId: string): Promise<ConfigRetorno> {
    return this.prisma.configRetorno.create({ data: { ...dados, empresaId } });
  }

  async update(id: string, dados: UpdateConfigRetornoDto): Promise<ConfigRetorno> {
    return this.prisma.configRetorno.update({ where: { id }, data: dados });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.configRetorno.delete({ where: { id } });
  }
}
