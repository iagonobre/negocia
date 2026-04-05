import { Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DevedorService } from './devedor.service';

@ApiTags('Devedor')
@Controller('devedor')
export class DevedorController {
    constructor (private readonly devedorServiec: DevedorService) {}

    // @Post('cadastrar')
    // @ApiOperation({ summary: 'Cadastro de novo cliente' })
    //   @ApiBody({ type: CreateEmpresaDto })
    //   async cadastrar(@Body() dto: CreateEmpresaDto) {
    //     return this.empresaService.cadastrar(dto);
    // }
}
