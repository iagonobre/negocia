import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FaixaCriterio } from '../generated/prisma/client';
import { CreateFaixaCriterioDto } from './dto/create-faixa-criterio.dto';
import { UpdateFaixaCriterioDto } from './dto/update-faixa-criterio.dto';
import { FaixaCriterioRepository } from './faixa-criterio.repository';

@Injectable()
export class FaixaCriterioService {
  constructor(private readonly repository: FaixaCriterioRepository) {}

  async create(dados: CreateFaixaCriterioDto, empresaId: string): Promise<FaixaCriterio> {
    await this.validarFaixa(dados, empresaId);
    return this.repository.create(dados, empresaId);
  }

  async listarPorEmpresa(empresaId: string): Promise<FaixaCriterio[]> {
    return this.repository.listarPorEmpresa(empresaId);
  }

  async atualizar(id: string, empresaId: string, dados: UpdateFaixaCriterioDto): Promise<FaixaCriterio> {
    const faixaExistente = await this.repository.buscarPorId(id);

    if (!faixaExistente) {
      throw new NotFoundException('Faixa de critério não encontrada.');
    }

    if (faixaExistente.empresaId !== empresaId) {
      throw new ForbiddenException('Você não tem permissão para alterar essa faixa.');
    }

    const dadosParaValidar: CreateFaixaCriterioDto = {
      descricao: dados.descricao ?? faixaExistente.descricao,
      valorMinimo: dados.valorMinimo ?? faixaExistente.valorMinimo,
      valorMaximo: dados.valorMaximo ?? faixaExistente.valorMaximo,
      prazoMaximoDias: dados.prazoMaximoDias ?? faixaExistente.prazoMaximoDias,
      parcelasMaximas: dados.parcelasMaximas ?? faixaExistente.parcelasMaximas,
      descontoMaximo: dados.descontoMaximo ?? faixaExistente.descontoMaximo,
      tomComunicacao: dados.tomComunicacao ?? faixaExistente.tomComunicacao,
      mensagemInicial: dados.mensagemInicial ?? faixaExistente.mensagemInicial ?? undefined,
    };

    await this.validarFaixa(dadosParaValidar, empresaId, id);

    return this.repository.atualizar(id, dados);
  }

  async deletar(id: string, empresaId: string): Promise<void> {
    const existe = await this.repository.buscarPorId(id);

    if (!existe) {
      throw new NotFoundException('Faixa de critério não encontrada.');
    }

    if (existe.empresaId !== empresaId) {
      throw new ForbiddenException('Você não tem permissão para deletar esta faixa de crédito.');
    }

    await this.repository.deletar(id);
  }

  private async validarFaixa(
    dados: CreateFaixaCriterioDto | UpdateFaixaCriterioDto,
    empresaId: string,
    ignorarId?: string,
  ): Promise<void> {
    const { valorMinimo, valorMaximo, prazoMaximoDias, parcelasMaximas, descontoMaximo } = dados;

    if (valorMinimo !== undefined && valorMaximo !== undefined && valorMinimo >= valorMaximo) {
      throw new BadRequestException('O valor mínimo deve ser menor que o valor máximo.');
    }

    if (prazoMaximoDias !== undefined && prazoMaximoDias <= 0) {
      throw new BadRequestException('O prazo máximo em dias deve ser maior que zero.');
    }

    if (parcelasMaximas !== undefined && parcelasMaximas <= 0) {
      throw new BadRequestException('O número máximo de parcelas deve ser maior que zero.');
    }

    if (descontoMaximo !== undefined && (descontoMaximo < 0 || descontoMaximo > 100)) {
      throw new BadRequestException('O desconto máximo deve ser entre 0 e 100.');
    }

    if (valorMinimo !== undefined && valorMaximo !== undefined) {
      const sobrepostas = await this.repository.buscarSobrepostas(empresaId, valorMinimo, valorMaximo, ignorarId);

      if (sobrepostas.length > 0) {
        throw new BadRequestException('Já existe uma faixa cadastrada que se sobrepõe a esse intervalo de valores.');
      }

      const faixasExistentes = await this.repository.listarPorEmpresa(empresaId);
      const outras = faixasExistentes.filter((f) => f.id !== ignorarId);

      if (outras.length > 0) {
        const temVizinha =
          outras.some((f) => f.valorMaximo === valorMinimo) ||
          outras.some((f) => f.valorMinimo === valorMaximo);

        if (!temVizinha) {
          throw new BadRequestException('A faixa deve ser contígua às faixas já existentes, sem buracos entre elas.');
        }
      }
    }
  }
}
