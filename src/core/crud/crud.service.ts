import { BadRequestException, NotFoundException } from '@nestjs/common';
import csv from 'csv-parser';
import { Readable } from 'stream';

export abstract class CrudService<T> {
  // ── Pontos flexíveis obrigatórios ─────────────────────────────────────────

  abstract findAll(empresaId: string): Promise<T[]>;
  abstract findById(id: string, empresaId: string): Promise<T | null>;
  abstract create(dto: any, empresaId: string): Promise<T>;
  abstract update(id: string, dto: any, empresaId: string): Promise<T>;
  abstract remove(id: string, empresaId: string): Promise<void>;

  // ── CSV Import — template method ──────────────────────────────────────────

  async importarCsv(
    file: Express.Multer.File,
    empresaId: string,
  ): Promise<{ mensagem: string; importados: number }> {
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Arquivo CSV vazio ou inválido.');
    }
    const rows: any[] = [];
    const stream = Readable.from(file.buffer);
    return new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data) => rows.push(this.parseCsvRow(data)))
        .on('end', async () => {
          try {
            await this.upsertMany(rows, empresaId);
            resolve({ mensagem: 'Importação concluída com sucesso', importados: rows.length });
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  protected parseCsvRow(_data: any): any {
    throw new Error(`${this.constructor.name} deve implementar parseCsvRow para usar importarCsv.`);
  }

  protected async upsertMany(_rows: any[], _empresaId: string): Promise<any> {
    throw new Error(`${this.constructor.name} deve implementar upsertMany para usar importarCsv.`);
  }

  // ── Histórico — template method ───────────────────────────────────────────

  async historico(id: string, empresaId: string): Promise<any> {
    const resultado = await this.findComHistorico(id, empresaId);
    if (!resultado) throw new NotFoundException('Registro não encontrado.');
    return resultado;
  }

  protected async findComHistorico(_id: string, _empresaId: string): Promise<any> {
    throw new Error(`${this.constructor.name} deve implementar findComHistorico para usar historico.`);
  }
}
