import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { Paciente } from '../../../generated/prisma/client';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';

@Injectable()
export class PacienteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(empresaId: string): Promise<Paciente[]> {
    return this.prisma.paciente.findMany({ where: { empresaId } });
  }

  async findById(id: string, empresaId: string): Promise<Paciente | null> {
    return this.prisma.paciente.findFirst({ where: { id, empresaId } });
  }

  async findByTelefone(telefone: string): Promise<Paciente | null> {
    // Se mais de um paciente compartilha o telefone, prioriza quem já tem
    // uma consulta em andamento — é quem está de fato esperando essa resposta.
    const comConsultaAtiva = await this.prisma.paciente.findFirst({
      where: { telefone, consultas: { some: { status: 'PENDENTE' } } },
    });
    if (comConsultaAtiva) return comConsultaAtiva;

    return this.prisma.paciente.findFirst({ where: { telefone } });
  }

  async create(dados: CreatePacienteDto, empresaId: string): Promise<Paciente> {
    return this.prisma.paciente.create({ data: { ...dados, empresaId } });
  }

  async update(id: string, dados: UpdatePacienteDto): Promise<Paciente> {
    return this.prisma.paciente.update({ where: { id }, data: dados });
  }

  async updateStatus(id: string, status: string): Promise<Paciente> {
    return this.prisma.paciente.update({ where: { id }, data: { status: status as any } });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.paciente.delete({ where: { id } });
  }
}
