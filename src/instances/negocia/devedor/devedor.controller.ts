import {
  Controller,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Devedor } from '../../../generated/prisma/client';
import { DevedorService } from './devedor.service';
import { CrudController } from '../../../core/crud/crud.controller';
import { AuthGuard } from '../../../core/auth/auth.guard';
import { Empresa } from '../../../core/auth/decorators/empresa.decorator';
import type { JwtPayload } from '../../../core/auth/interfaces/jwt-payload.interface';

@ApiTags('Devedor')
@Controller('devedor')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class DevedorController extends CrudController<Devedor>() {
  constructor(readonly service: DevedorService) {
    super();
  }

  @Get(':id/historico')
  @ApiOperation({ summary: 'Histórico completo de negociações do devedor' })
  async historico(@Param('id') id: string, @Empresa() empresa: JwtPayload) {
    return this.service.historico(id, empresa.sub);
  }

  @Post('importar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Importar devedores via CSV (Upsert)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async importar(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 100 })],
      }),
    )
    file: Express.Multer.File,
    @Empresa() empresa: JwtPayload,
  ) {
    return this.service.importarCsv(file, empresa.sub);
  }
}
