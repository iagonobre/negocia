import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmpresaService } from './empresa.service';

import { AuthGuard } from '../auth/auth.guard';

import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

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
  async perfil(@Request() req: any) {
    return this.empresaService.buscarPorId(req.user.sub);
  }

  @Patch('perfil')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar perfil da empresa logada' })
  @ApiBody({ type: UpdateEmpresaDto })
  async atualizar(@Request() req: any, @Body() dto: UpdateEmpresaDto) {
    return this.empresaService.atualizar(req.user.sub, dto);
  }

  @Delete('perfil')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletar empresa logada' })
  async deletar(@Request() req: any) {
    return this.empresaService.deletar(req.user.sub);
  }
}
