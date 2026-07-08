import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ClienteOficina } from '../../../generated/prisma/client';
import { CreateClienteOficinaDto } from './dto/create-cliente-oficina.dto';
import { UpdateClienteOficinaDto } from './dto/update-cliente-oficina.dto';

@Injectable()
export class ClienteOficinaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(empresaId: string): Promise<ClienteOficina[]> {
    return this.prisma.clienteOficina.findMany({ where: { empresaId } });
  }

  async findById(id: string, empresaId: string): Promise<ClienteOficina | null> {
    return this.prisma.clienteOficina.findFirst({ where: { id, empresaId } });
  }

  async findByTelefone(telefone: string): Promise<ClienteOficina | null> {
    // Se mais de um cliente compartilha o telefone, prioriza quem já tem um
    // agendamento em andamento — é quem está de fato esperando essa resposta.
    const comAgendamentoAtivo = await this.prisma.clienteOficina.findFirst({
      where: { telefone, agendamentos: { some: { status: 'PENDENTE' } } },
    });
    if (comAgendamentoAtivo) return comAgendamentoAtivo;

    return this.prisma.clienteOficina.findFirst({ where: { telefone } });
  }

  async create(dados: CreateClienteOficinaDto, empresaId: string): Promise<ClienteOficina> {
    return this.prisma.clienteOficina.create({ data: { ...dados, empresaId } });
  }

  async update(id: string, dados: UpdateClienteOficinaDto): Promise<ClienteOficina> {
    return this.prisma.clienteOficina.update({ where: { id }, data: dados });
  }

  async updateStatus(id: string, status: string): Promise<ClienteOficina> {
    return this.prisma.clienteOficina.update({ where: { id }, data: { status: status as any } });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.clienteOficina.delete({ where: { id } });
  }
}
