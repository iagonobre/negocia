import { Body, Controller, MaxFileSizeValidator, Param, ParseFilePipe, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
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

  @Post('importar')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
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
