import { Injectable, NotFoundException } from '@nestjs/common';
import { ServicoConfig } from '../../../generated/prisma/client';
import { CrudService } from '../../../core/crud/crud.service';
import { ServicoConfigRepository } from './servico-config.repository';
import { CreateServicoConfigDto } from './dto/create-servico-config.dto';
import { UpdateServicoConfigDto } from './dto/update-servico-config.dto';

@Injectable()
export class ServicoConfigService extends CrudService<ServicoConfig> {
  constructor(private readonly repository: ServicoConfigRepository) {
    super();
  }

  async findAll(empresaId: string): Promise<ServicoConfig[]> {
    return this.repository.findAll(empresaId);
  }

  async findById(id: string, empresaId: string): Promise<ServicoConfig | null> {
    return this.repository.findById(id, empresaId);
  }

  async create(dados: CreateServicoConfigDto, empresaId: string): Promise<ServicoConfig> {
    return this.repository.create(dados, empresaId);
  }

  async update(id: string, dados: UpdateServicoConfigDto, empresaId: string): Promise<ServicoConfig> {
    const existe = await this.repository.findById(id, empresaId);
    if (!existe) throw new NotFoundException('Configuração de serviço não encontrada.');
    return this.repository.update(id, dados);
  }

  async remove(id: string, empresaId: string): Promise<void> {
    const existe = await this.repository.findById(id, empresaId);
    if (!existe) throw new NotFoundException('Configuração de serviço não encontrada.');
    return this.repository.remove(id);
  }
}
