import { Body, Controller, Delete, Get, MaxFileSizeValidator, Param, ParseFilePipe, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DevedorService } from './devedor.service';
import { CreateDevedorDto } from './dto/create-devedor.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { UpdateDevedorDto } from './dto/update-devedor.dto';
import { Empresa } from 'src/auth/decorators/empresa.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Devedor')
@Controller('devedor')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class DevedorController {
    constructor (private readonly devedorService: DevedorService) {}

    @Get()
    @ApiOperation({ summary: 'Listar todos os devedores da empresa' })
    async listar(@Empresa() empresa: JwtPayload) {
      return this.devedorService.listar(empresa.sub);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar devedor por ID' })
    async buscar(
      @Param('id') id: string,
      @Empresa() empresa: JwtPayload,
    ) {
      return this.devedorService.buscar(id, empresa.sub);
    }

    @Post('cadastrar')
    @ApiOperation({ summary: 'Cadastro de novo devedor' })
    @ApiBody({ type: CreateDevedorDto })
    async cadastrar(
      @Empresa() empresa: JwtPayload,
      @Body() dto: CreateDevedorDto
    ) {
      return this.devedorService.cadastrar(dto, empresa.sub);
    }

    @Patch('/atualizar/:id')
    @ApiOperation({ summary: 'Edição de devedor existente' })
    @ApiBody({ type: UpdateDevedorDto })
    async atualizar(
      @Param('id') id: string,
      @Empresa() empresa: JwtPayload,
      @Body() dto: UpdateDevedorDto
    ) {
      return this.devedorService.atualizar(id, empresa.sub, dto);
    }

  @Delete(':id')
    @ApiOperation({ summary: 'Deletar devedor' })
    async deletar(
      @Param('id') id: string,
      @Empresa() empresa: JwtPayload,
    ) {
      return this.devedorService.deletar(id, empresa.sub);
    }

  @Post('importar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Importar devedores via CSV (Upsert)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async importar(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 100 }),
        ],
      }),
    ) file: Express.Multer.File,
    @Empresa() empresa: JwtPayload,
  ) {
    return this.devedorService.importarCsv(file, empresa.sub);
  }
}
