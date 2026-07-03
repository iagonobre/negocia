import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ServicoConfig } from '../../../generated/prisma/client';
import { CreateServicoConfigDto } from './dto/create-servico-config.dto';
import { UpdateServicoConfigDto } from './dto/update-servico-config.dto';

@Injectable()
export class ServicoConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(empresaId: string): Promise<ServicoConfig[]> {
    return this.prisma.servicoConfig.findMany({ where: { empresaId } });
  }

  async findById(id: string, empresaId: string): Promise<ServicoConfig | null> {
    return this.prisma.servicoConfig.findFirst({ where: { id, empresaId } });
  }

  async create(dados: CreateServicoConfigDto, empresaId: string): Promise<ServicoConfig> {
    return this.prisma.servicoConfig.create({ data: { ...dados, empresaId } });
  }

  async update(id: string, dados: UpdateServicoConfigDto): Promise<ServicoConfig> {
    return this.prisma.servicoConfig.update({ where: { id }, data: dados });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.servicoConfig.delete({ where: { id } });
  }
}
