import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { FaixaCriterioService } from './faixa-criterio.service';
import { CreateFaixaCriterioDto, UpdateFaixaCriterioDto } from './dto/faixa-criterio.dto';

@Controller('faixas-criterio')
export class FaixaCriterioController {

  constructor(private readonly faixaCriterioService: FaixaCriterioService) {}

  @Post()
  criar(@Body() dados: CreateFaixaCriterioDto) {
    return this.faixaCriterioService.criar(dados);
  }

  @Get('empresa/:empresaId')
  listarPorEmpresa(@Param('empresaId') empresaId: string) {
    return this.faixaCriterioService.listarPorEmpresa(empresaId);
  }

  @Put(':id')
  atualizar(@Param('id') id: string, @Body() dados: UpdateFaixaCriterioDto) {
    return this.faixaCriterioService.atualizar(id, dados);
  }

  @Delete(':id')
  deletar(@Param('id') id: string) {
    return this.faixaCriterioService.deletar(id);
  }
}