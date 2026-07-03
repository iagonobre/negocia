import { Injectable, NotFoundException } from '@nestjs/common';
import { ClienteOficina } from '../../../generated/prisma/client';
import { CrudService } from '../../../core/crud/crud.service';
import { ClienteOficinaRepository } from './cliente-oficina.repository';
import { CreateClienteOficinaDto } from './dto/create-cliente-oficina.dto';
import { UpdateClienteOficinaDto } from './dto/update-cliente-oficina.dto';

@Injectable()
export class ClienteOficinaService extends CrudService<ClienteOficina> {
  constructor(private readonly repository: ClienteOficinaRepository) {
    super();
  }

  async findAll(empresaId: string): Promise<ClienteOficina[]> {
    return this.repository.findAll(empresaId);
  }

  async findById(id: string, empresaId: string): Promise<ClienteOficina | null> {
    return this.repository.findById(id, empresaId);
  }

  async create(dados: CreateClienteOficinaDto, empresaId: string): Promise<ClienteOficina> {
    return this.repository.create(dados, empresaId);
  }

  async update(id: string, dados: UpdateClienteOficinaDto, empresaId: string): Promise<ClienteOficina> {
    const existe = await this.repository.findById(id, empresaId);
    if (!existe) throw new NotFoundException('Cliente não encontrado.');
    return this.repository.update(id, dados);
  }

  async remove(id: string, empresaId: string): Promise<void> {
    const existe = await this.repository.findById(id, empresaId);
    if (!existe) throw new NotFoundException('Cliente não encontrado.');
    return this.repository.remove(id);
  }
}
