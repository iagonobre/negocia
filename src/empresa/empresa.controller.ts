import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmpresaService } from './empresa.service';

import { AuthGuard } from '../auth/auth.guard';

import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

import type { JwtPayload } from 'src/auth/dto/jwt-payload.dto';
import { Empresa } from 'src/auth/decorators/empresa.decorator';

@ApiTags('Empresa')
@Controller('empresa')
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) {}

  @Post('cadastrar')
  @ApiOperation({ summary: 'Cadastro de nova empresa' })
  @ApiBody({ type: CreateEmpresaDto })
  async cadastrar(@Body() dto: CreateEmpresaDto) {
    return this.empresaService.cadastrar(dto);
  }

  @Get('perfil')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar perfil da empresa logada' })
  async perfil(@Empresa() empresa: JwtPayload) {
    return this.empresaService.buscarPorId(empresa.sub);
  }

  @Patch('perfil')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar perfil da empresa logada' })
  @ApiBody({ type: UpdateEmpresaDto })
  async atualizar(
    @Empresa() empresa: JwtPayload,
    @Body() dto: UpdateEmpresaDto,
  ) {
    return this.empresaService.atualizar(empresa.sub, dto);
  }

  @Delete('perfil')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletar empresa logada' })
  async deletar(@Empresa() empresa: JwtPayload) {
    return this.empresaService.deletar(empresa.sub);
  }
}
