import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { Empresa, Prisma } from '../generated/prisma/client';
import { EmpresaRepository, EmpresaSemSenha } from './empresa.repository';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EmpresaService {
  constructor(private repository: EmpresaRepository) {}

  async buscarPorId(id: string): Promise<EmpresaSemSenha> {
    const empresa = await this.repository.findById(id);

    if (!empresa) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return empresa;
  }

  async buscarPorEmail(email: string): Promise<Empresa | null> {
    return this.repository.findByEmail(email);
  }

  async cadastrar(dto: CreateEmpresaDto): Promise<EmpresaSemSenha> {
    const emailExistente = await this.repository.findByEmail(dto.email);
    if (emailExistente) {
      throw new ConflictException('Este email já foi cadastrado.');
    }

    const cnpjExistente = await this.repository.findByCnpj(dto.cnpj);
    if (cnpjExistente) {
      throw new ConflictException('Este CNPJ já foi cadastrado.');
    }

    const senhaHash = await bcrypt.hash(dto.senha, 10);

    const empresa = await this.repository.create({
      nome: dto.nome,
      email: dto.email,
      senha: senhaHash,
      cnpj: dto.cnpj,
      telefone: dto.telefone,
    });

    const { senha, ...resultado } = empresa;
    return resultado;
  }

  async atualizar(id: string, dto: UpdateEmpresaDto): Promise<EmpresaSemSenha> {
    await this.buscarPorId(id);

    if (dto.email) {
      const emailExistente = await this.repository.findByEmailExcludingId(dto.email, id);
      if (emailExistente) {
        throw new ConflictException('Este email já foi cadastrado');
      }
    }

    const data: Prisma.EmpresaUpdateInput = {
      ...dto,
      ...(dto.senha && { senha: await bcrypt.hash(dto.senha, 10) }),
    };

    const empresa = await this.repository.update(id, data);
    const { senha, ...resultado } = empresa;
    return resultado;
  }

  async deletar(id: string): Promise<{ message: string }> {
    await this.buscarPorId(id);
    await this.repository.delete(id);
    return { message: 'Empresa deletada com sucesso' };
  }
}
