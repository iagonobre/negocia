import { Injectable } from '@nestjs/common';
import { DevedorRepository } from './devedor.repository';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { CreateDevedorDto } from './dto/create-devedor.dto';
import { UpdateDevedorDto } from './dto/update-devedor.dto';
import { StatusDevedor, OrigemDevedor, TipoPessoa } from 'src/generated/prisma/enums'; 

@Injectable()
export class DevedorService {
  constructor(private repository: DevedorRepository) {}

  async cadastrar(dto: CreateDevedorDto, empresaId: string) {
    return await this.repository.create({
      ...dto,
      empresa: { connect: { id: empresaId } },
    });
  }

  async atualizar(id: string, empresaId: string, dto: UpdateDevedorDto) {
    return await this.repository.update({
      where: {
        id: id,
        empresaId: empresaId,
      },
      data: dto,
    });
  }

  async importarCsv(file: Express.Multer.File, empresaId: string) {
    const devedores: any[] = [];
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

            status: status,
            origem: origem,
            tipoPessoa: tipoPessoa,
          });
        })
        .on('end', async () => {
          try {
            await this.repository.upsertMany(devedores, empresaId);
            resolve({ 
              mensagem: 'Importação concluída com sucesso',
              importados: devedores.length 
            });
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => reject(error));
    });
  }
}