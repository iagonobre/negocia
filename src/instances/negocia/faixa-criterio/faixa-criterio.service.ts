import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FaixaCriterio } from '../../../generated/prisma/client';
import { CreateFaixaCriterioDto } from './dto/create-faixa-criterio.dto';
import { UpdateFaixaCriterioDto } from './dto/update-faixa-criterio.dto';
import { FaixaCriterioRepository } from './faixa-criterio.repository';
import { CrudService } from '../../../core/crud/crud.service';

@Injectable()
export class FaixaCriterioService extends CrudService<FaixaCriterio> {
  constructor(private readonly repository: FaixaCriterioRepository) {
    super();
  }

  // ── CrudService<FaixaCriterio> ───────────────────────────────────────────

  async findAll(empresaId: string): Promise<FaixaCriterio[]> {
    return this.repository.listarPorEmpresa(empresaId);
  }

  async findById(id: string, empresaId: string): Promise<FaixaCriterio | null> {
    const faixa = await this.repository.buscarPorId(id);
    if (!faixa) throw new NotFoundException('Faixa de critério não encontrada.');
    if (faixa.empresaId !== empresaId) throw new ForbiddenException('Você não tem permissão para acessar essa faixa.');
    return faixa;
  }

  async create(dados: CreateFaixaCriterioDto, empresaId: string): Promise<FaixaCriterio> {
    await this.validarFaixa(dados, empresaId);
    return this.repository.create(dados, empresaId);
  }

  async update(id: string, dados: UpdateFaixaCriterioDto, empresaId: string): Promise<FaixaCriterio> {
    const existente = await this.repository.buscarPorId(id);
    if (!existente) throw new NotFoundException('Faixa de critério não encontrada.');
    if (existente.empresaId !== empresaId) throw new ForbiddenException('Você não tem permissão para alterar essa faixa.');

    const dadosParaValidar: CreateFaixaCriterioDto = {
      descricao: dados.descricao ?? existente.descricao,
      valorMinimo: dados.valorMinimo ?? existente.valorMinimo,
      valorMaximo: dados.valorMaximo ?? existente.valorMaximo,
      prazoMaximoDias: dados.prazoMaximoDias ?? existente.prazoMaximoDias,
      parcelasMaximas: dados.parcelasMaximas ?? existente.parcelasMaximas,
      descontoMaximo: dados.descontoMaximo ?? existente.descontoMaximo,
      tomComunicacao: dados.tomComunicacao ?? existente.tomComunicacao,
      mensagemInicial: dados.mensagemInicial ?? existente.mensagemInicial ?? undefined,
    };

    await this.validarFaixa(dadosParaValidar, empresaId, id);
    return this.repository.atualizar(id, dados);
  }

  async remove(id: string, empresaId: string): Promise<void> {
    const existente = await this.repository.buscarPorId(id);
    if (!existente) throw new NotFoundException('Faixa de critério não encontrada.');
    if (existente.empresaId !== empresaId) throw new ForbiddenException('Você não tem permissão para deletar esta faixa de crédito.');
    await this.repository.deletar(id);
  }

  // ── Domínio faixa-criterio ───────────────────────────────────────────────

  private async validarFaixa(
    dados: CreateFaixaCriterioDto | UpdateFaixaCriterioDto,
    empresaId: string,
    ignorarId?: string,
  ): Promise<void> {
    const { valorMinimo, valorMaximo, prazoMaximoDias, parcelasMaximas, descontoMaximo } = dados;

    if (valorMinimo !== undefined && valorMaximo !== undefined && valorMinimo >= valorMaximo)
      throw new BadRequestException('O valor mínimo deve ser menor que o valor máximo.');

    if (prazoMaximoDias !== undefined && prazoMaximoDias <= 0)
      throw new BadRequestException('O prazo máximo em dias deve ser maior que zero.');

    if (parcelasMaximas !== undefined && parcelasMaximas <= 0)
      throw new BadRequestException('O número máximo de parcelas deve ser maior que zero.');

    if (descontoMaximo !== undefined && (descontoMaximo < 0 || descontoMaximo > 100))
      throw new BadRequestException('O desconto máximo deve ser entre 0 e 100.');

    if (valorMinimo !== undefined && valorMaximo !== undefined) {
      const sobrepostas = await this.repository.buscarSobrepostas(empresaId, valorMinimo, valorMaximo, ignorarId);
      if (sobrepostas.length > 0)
        throw new BadRequestException('Já existe uma faixa cadastrada que se sobrepõe a esse intervalo de valores.');

      const outras = (await this.repository.listarPorEmpresa(empresaId)).filter((f) => f.id !== ignorarId);
      if (outras.length > 0) {
        const temVizinha =
          outras.some((f) => f.valorMaximo === valorMinimo) ||
          outras.some((f) => f.valorMinimo === valorMaximo);
        if (!temVizinha)
          throw new BadRequestException('A faixa deve ser contígua às faixas já existentes, sem buracos entre elas.');
      }
    }
  }
}
