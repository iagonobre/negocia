import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDevedorDto } from './dto/create-devedor.dto';
import { UpdateDevedorDto } from './dto/update-devedor.dto';
import { Devedor } from '../../../generated/prisma/client';
import { StatusDevedor, OrigemDevedor, TipoPessoa } from '../../../generated/prisma/enums';
import { DevedorCsvRow } from './types/devedor-csv-row.type';
import { DevedorRepository } from './devedor.repository';
import { CrudService } from '../../../core/crud/crud.service';

@Injectable()
export class DevedorService extends CrudService<Devedor> {
  constructor(private readonly repository: DevedorRepository) {
    super();
  }

  // ── CrudService<Devedor> — obrigatórios ──────────────────────────────────

  async findAll(empresaId: string): Promise<Devedor[]> {
    return this.repository.findAll(empresaId);
  }

  async findById(id: string, empresaId: string): Promise<Devedor | null> {
    return this.repository.findOne(id, empresaId);
  }

  async create(dto: CreateDevedorDto, empresaId: string): Promise<Devedor> {
    const { empresaId: _ignored, ...rest } = dto;
    return this.repository.create({
      ...rest,
      vencimento: new Date(dto.vencimento),
      empresa: { connect: { id: empresaId } },
    });
  }

  async update(id: string, dto: UpdateDevedorDto, empresaId: string): Promise<Devedor> {
    const devedor = await this.repository.findOne(id, empresaId);
    if (!devedor) throw new NotFoundException('Devedor não encontrado.');
    const { empresaId: _ignored, ...rest } = dto;
    return this.repository.update({
      where: { id, empresaId },
      data: { ...rest, ...(dto.vencimento && { vencimento: new Date(dto.vencimento) }) },
    });
  }

  async remove(id: string, empresaId: string): Promise<void> {
    const devedor = await this.repository.findOne(id, empresaId);
    if (!devedor) throw new NotFoundException('Devedor não encontrado.');
    await this.repository.delete(id, empresaId);
  }

  // ── CrudService<Devedor> — hooks opcionais ────────────────────────────────

  protected parseCsvRow(data: any): DevedorCsvRow {
    return {
      ...data,
      email: data.email?.trim(),
      valorDivida: parseFloat(data.valorDivida),
      tentativas: data.tentativas ? parseInt(data.tentativas, 10) : 0,
      numeroParcelas: data.numeroParcelas ? parseInt(data.numeroParcelas, 10) : null,
      vencimento: new Date(data.vencimento),
      cpf: data.cpf?.trim() || null,
      cnpj: data.cnpj?.trim() || null,
      descricaoDivida: data.descricaoDivida?.trim() || null,
      ultimoContato: data.ultimoContato?.trim() ? new Date(data.ultimoContato) : null,
      status: data.status?.trim() as StatusDevedor,
      origem: data.origem?.trim() as OrigemDevedor,
      tipoPessoa: data.tipoPessoa?.trim() as TipoPessoa,
    };
  }

  protected async upsertMany(rows: DevedorCsvRow[], empresaId: string) {
    return this.repository.upsertMany(rows, empresaId);
  }

  protected async findComHistorico(id: string, empresaId: string) {
    return this.repository.findHistorico(id, empresaId);
  }
}
