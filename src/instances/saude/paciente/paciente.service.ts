import { Injectable, NotFoundException } from '@nestjs/common';
import { Paciente } from '../../../generated/prisma/client';
import { CrudService } from '../../../core/crud/crud.service';
import { PacienteRepository } from './paciente.repository';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';

@Injectable()
export class PacienteService extends CrudService<Paciente> {
  constructor(private readonly repository: PacienteRepository) {
    super();
  }

  async findAll(empresaId: string): Promise<Paciente[]> {
    return this.repository.findAll(empresaId);
  }

  async findById(id: string, empresaId: string): Promise<Paciente | null> {
    return this.repository.findById(id, empresaId);
  }

  async create(dados: CreatePacienteDto, empresaId: string): Promise<Paciente> {
    return this.repository.create(dados, empresaId);
  }

  async update(id: string, dados: UpdatePacienteDto, empresaId: string): Promise<Paciente> {
    const existe = await this.repository.findById(id, empresaId);
    if (!existe) throw new NotFoundException('Paciente não encontrado.');
    return this.repository.update(id, dados);
  }

  async remove(id: string, empresaId: string): Promise<void> {
    const existe = await this.repository.findById(id, empresaId);
    if (!existe) throw new NotFoundException('Paciente não encontrado.');
    return this.repository.remove(id);
  }

  protected async findComHistorico(id: string, empresaId: string) {
    return this.repository.findHistorico(id, empresaId);
  }
}
