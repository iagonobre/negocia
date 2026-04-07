import {Body, Controller, Delete, Get, Post, Put, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FaixaCriterioService } from './faixa-criterio.service';
import { CreateFaixaCriterioDto } from './dto/create-faixa-criterio.dto';
import { UpdateFaixaCriterioDto } from './dto/update-faixa-criterio.dto';
import { AuthGuard } from '../auth/auth.guard';
import { Empresa } from '../auth/decorators/empresa.decorator';
import type { JwtPayload } from '../auth/dto/jwt-payload.dto';

@ApiTags('Faixa de Critério')
@Controller('faixas-criterio')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class FaixaCriterioController {

  constructor(private readonly faixaCriterioService: FaixaCriterioService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova faixa de critério' })
  @ApiBody({ type: CreateFaixaCriterioDto })
  async criar(
    @Empresa() empresa: JwtPayload,
    @Body() dto: CreateFaixaCriterioDto,
  ) {
    return this.faixaCriterioService.create(dto, empresa.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Listar faixas de critério da empresa logada' })
  async listar(@Empresa() empresa: JwtPayload) {
    return this.faixaCriterioService.listarPorEmpresa(empresa.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar faixa de critério' })
  @ApiBody({ type: UpdateFaixaCriterioDto })
  async atualizar(
    @Param('id') id: string,
    @Empresa() empresa: JwtPayload,
    @Body() dto: UpdateFaixaCriterioDto,
  ) {
    return this.faixaCriterioService.atualizar(id, empresa.sub, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar faixa de critério' })
  async deletar(
    @Param('id') id: string,
    @Empresa() empresa: JwtPayload,
  ) {
    return this.faixaCriterioService.deletar(id, empresa.sub);
  }
}