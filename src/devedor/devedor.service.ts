import { Injectable } from '@nestjs/common';
import { DevedorRepository } from './devedor.repository';
import { CreateDevedorDto } from './dto/create-devedor.dto';
import { UpdateDevedorDto } from './dto/update-devedor.dto';

@Injectable()
export class DevedorService {

  constructor(private repository: DevedorRepository) {}
  
  async cadastrar(dto: CreateDevedorDto, empresaId: string) {
    const devedor = await this.repository.create({
      nome: dto.nome,
      email: dto.email,
      telefone: dto.telefone,
      tipoPessoa: dto.tipoPessoa,
      cpf: dto.cpf,
      cnpj: dto.cnpj,
      valorDivida: dto.valorDivida,
      descricaoDivida: dto.descricaoDivida,
      vencimento: dto.vencimento,
      numeroParcelas: dto.numeroParcelas,
      status: dto.status,
      origem: dto.origem,
      tentativas: dto.tentativas,
      ultimoContato: dto.ultimoContato,
      empresa: {
        connect: { id: dto.empresaId }
      }
    });

    return devedor;
  }

  async atualizar(id: string, empresaId: string, dto: UpdateDevedorDto) {
    return await this.repository.update({
      where: { 
        id: id,
        empresaId: empresaId
      },
      data: dto,
    });
  }
}
