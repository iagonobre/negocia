import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FaixaCriterioRepository } from './faixa-criterio.repository';
import { FaixaCriterio } from '../generated/prisma/client';
import { CreateFaixaCriterioDto, UpdateFaixaCriterioDto } from './dto/faixa-criterio.dto';

@Injectable()
export class FaixaCriterioService {

  constructor(private readonly faixaCriterioRepository: FaixaCriterioRepository) {}

  async criar(dados: CreateFaixaCriterioDto): Promise<FaixaCriterio> {
    await this.validarFaixa(
      dados.empresaId,
      dados.valorMinimo,
      dados.valorMaximo,
      dados.prazoMaximoDias,
      dados.parcelasMaximas,
      dados.descontoMaximo,
    );

    return this.faixaCriterioRepository.criar(dados);
  }

  async listarPorEmpresa(empresaId: string): Promise<FaixaCriterio[]> {
    return this.faixaCriterioRepository.listarPorEmpresa(empresaId);
  }

  async atualizar(id: string, dados: UpdateFaixaCriterioDto): Promise<FaixaCriterio> {
    const faixaExistente = await this.faixaCriterioRepository.buscarPorId(id);

    if (!faixaExistente) {
      throw new NotFoundException('Faixa de critério não encontrada.');
    }

    const valorMinimo = dados.valorMinimo ?? faixaExistente.valorMinimo;
    const valorMaximo = dados.valorMaximo ?? faixaExistente.valorMaximo;
    const prazoMaximoDias = dados.prazoMaximoDias ?? faixaExistente.prazoMaximoDias;
    const parcelasMaximas = dados.parcelasMaximas ?? faixaExistente.parcelasMaximas;
    const descontoMaximo = dados.descontoMaximo ?? faixaExistente.descontoMaximo;

    await this.validarFaixa(
      faixaExistente.empresaId,
      valorMinimo,
      valorMaximo,
      prazoMaximoDias,
      parcelasMaximas,
      descontoMaximo,
      id,
    );

    return this.faixaCriterioRepository.atualizar(id, dados);
  }

  async deletar(id: string): Promise<void> {
    const existe = await this.faixaCriterioRepository.buscarPorId(id);

    if (!existe) {
      throw new NotFoundException('Faixa de critério não encontrada.');
    }

    await this.faixaCriterioRepository.deletar(id);
  }

  private async validarFaixa(
    empresaId: string,
    valorMinimo: number,
    valorMaximo: number,
    prazoMaximoDias: number,
    parcelasMaximas: number,
    descontoMaximo: number,
    ignorarId?: string,
  ): Promise<void> {

    if (valorMinimo >= valorMaximo) {
      throw new BadRequestException('O valor mínimo deve ser menor que o valor máximo.');
    }

    if (prazoMaximoDias <= 0) {
      throw new BadRequestException('O prazo máximo em dias deve ser maior que zero.');
    }

    if (parcelasMaximas <= 0) {
      throw new BadRequestException('O número máximo de parcelas deve ser maior que zero.');
    }

    if (descontoMaximo < 0 || descontoMaximo > 100) {
      throw new BadRequestException('O desconto máximo deve ser entre 0 e 100.');
    }

    const sobrepostas = await this.faixaCriterioRepository.buscarSobrepostas(
      empresaId,
      valorMinimo,
      valorMaximo,
      ignorarId,
    );

    if (sobrepostas.length > 0) {
      throw new BadRequestException(
        'Já existe uma faixa cadastrada que se sobrepõe a esse intervalo de valores.',
      );
    }

    const faixasExistentes = await this.faixaCriterioRepository.listarPorEmpresa(empresaId);
    const outras = faixasExistentes.filter(f => f.id !== ignorarId);

    if (outras.length > 0) {
      const temVizinhaAntes = outras.some(f => f.valorMaximo === valorMinimo);
      const temVizinhaDepois = outras.some(f => f.valorMinimo === valorMaximo);
      const ficaNaExtremidade = temVizinhaAntes || temVizinhaDepois;

      if (!ficaNaExtremidade) {
        throw new BadRequestException(
          'A faixa deve ser contígua às faixas já existentes, sem buracos entre elas.',
        );
      }
    }
  }
}