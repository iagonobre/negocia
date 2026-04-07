import { Injectable, NotFoundException } from '@nestjs/common';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { CreateDevedorDto } from './dto/create-devedor.dto';
import { UpdateDevedorDto } from './dto/update-devedor.dto';
import { Devedor } from 'src/generated/prisma/client';
import { StatusDevedor, OrigemDevedor, TipoPessoa } from 'src/generated/prisma/enums';
import { DevedorCsvRow } from './types/devedor-csv-row.type';
import { DevedorRepository } from './devedor.repository';

type ImportacaoResultado = { mensagem: string; importados: number };

@Injectable()
export class DevedorService {
  constructor(private repository: DevedorRepository) {}

  async cadastrar(dto: CreateDevedorDto, empresaId: string): Promise<Devedor> {
    return await this.repository.create({
      ...dto,
      empresa: { connect: { id: empresaId } },
    });
  }

  async listar(empresaId: string): Promise<Devedor[]> {
    return await this.repository.findAll(empresaId);
  }

  async buscar(id: string, empresaId: string): Promise<Devedor> {
    const devedor = await this.repository.findOne(id, empresaId);
    if (!devedor) throw new NotFoundException('Devedor não encontrado');
    return devedor;
  }

  async atualizar(id: string, empresaId: string, dto: UpdateDevedorDto): Promise<Devedor> {
    const devedor = await this.repository.findOne(id, empresaId);

    if (!devedor) {
      throw new NotFoundException('Devedor não encontrado');
    }

    return await this.repository.update({
      where: { id, empresaId },
      data: dto,
    });
  }

  async deletar(id: string, empresaId: string): Promise<void> {
    const devedor = await this.repository.findOne(id, empresaId);

    if (!devedor) {
      throw new NotFoundException('Devedor não encontrado');
    }

    await this.repository.delete(id, empresaId);
  }

  async importarCsv(file: Express.Multer.File, empresaId: string): Promise<ImportacaoResultado> {
    const devedores: DevedorCsvRow[] = [];
    const stream = Readable.from(file.buffer);

    return new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data) => {
          const status = data.status?.trim() as StatusDevedor;
          const origem = data.origem?.trim() as OrigemDevedor;
          const tipoPessoa = data.tipoPessoa?.trim() as TipoPessoa;

          devedores.push({
            ...data,
            email: data.email?.trim(),
            valorDivida: parseFloat(data.valorDivida),
            tentativas: data.tentativas ? parseInt(data.tentativas, 10) : 0,
            numeroParcelas: data.numeroParcelas ? parseInt(data.numeroParcelas, 10) : null,
            vencimento: new Date(data.vencimento),
            cpf: data.cpf && data.cpf.trim() !== '' ? data.cpf.trim() : null,
            cnpj: data.cnpj && data.cnpj.trim() !== '' ? data.cnpj.trim() : null,
            descricaoDivida: data.descricaoDivida && data.descricaoDivida.trim() !== '' ? data.descricaoDivida.trim() : null,
            ultimoContato: data.ultimoContato && data.ultimoContato.trim() !== '' ? new Date(data.ultimoContato) : null,
            status,
            origem,
            tipoPessoa,
          });
        })
        .on('end', async () => {
          try {
            await this.repository.upsertMany(devedores, empresaId);
            resolve({ mensagem: 'Importação concluída com sucesso', importados: devedores.length });
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => reject(error));
    });
  }
}
