import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigRetorno } from '../../../generated/prisma/client';
import { CrudService } from '../../../core/crud/crud.service';
import { ConfigRetornoRepository } from './config-retorno.repository';
import { CreateConfigRetornoDto } from './dto/create-config-retorno.dto';
import { UpdateConfigRetornoDto } from './dto/update-config-retorno.dto';

@Injectable()
export class ConfigRetornoService extends CrudService<ConfigRetorno> {
  constructor(private readonly repository: ConfigRetornoRepository) {
    super();
  }

  async findAll(empresaId: string): Promise<ConfigRetorno[]> {
    return this.repository.findAll(empresaId);
  }

  async findById(id: string, empresaId: string): Promise<ConfigRetorno | null> {
    return this.repository.findById(id, empresaId);
  }

  async create(dados: CreateConfigRetornoDto, empresaId: string): Promise<ConfigRetorno> {
    return this.repository.create(dados, empresaId);
  }

  async update(id: string, dados: UpdateConfigRetornoDto, empresaId: string): Promise<ConfigRetorno> {
    const existe = await this.repository.findById(id, empresaId);
    if (!existe) throw new NotFoundException('Configuração de retorno não encontrada.');
    return this.repository.update(id, dados);
  }

  async remove(id: string, empresaId: string): Promise<void> {
    const existe = await this.repository.findById(id, empresaId);
    if (!existe) throw new NotFoundException('Configuração de retorno não encontrada.');
    return this.repository.remove(id);
  }
}
