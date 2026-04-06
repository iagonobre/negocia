import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DevedorService } from './devedor.service';
import { CreateDevedorDto } from './dto/create-devedor.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { UpdateDevedorDto } from './dto/update-devedor.dto';
import { Empresa } from 'src/auth/decorators/empresa.decorator';
import type { JwtPayload } from 'src/auth/dto/jwt-payload.dto';

@ApiTags('Devedor')
@Controller('devedor')
export class DevedorController {
    constructor (private readonly devedorService: DevedorService) {}

    @Post('cadastrar')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cadastro de novo devedor' })
    @ApiBody({ type: CreateDevedorDto })
    async cadastrar(
      @Empresa() empresa: JwtPayload, 
      @Body() dto: CreateDevedorDto
    ) {
      return this.devedorService.cadastrar(dto, empresa.sub);
    }

    @Patch('/atualizar/:id')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Edição de devedor existente' })
    @ApiBody({ type: UpdateDevedorDto })
    async atualizar(
      @Param('id') id: string,
      @Empresa() empresa: JwtPayload,
      @Body() dto: UpdateDevedorDto
    ) {
      return this.devedorService.atualizar(id, empresa.sub, dto);
    }
}
