import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DevedorService } from './devedor.service';
import { CreateDevedorDto } from './dto/create-devedor.dto';

@ApiTags('Devedor')
@Controller('devedor')
export class DevedorController {
    constructor (private readonly devedorService: DevedorService) {}

    @Post('cadastrar')
    @ApiOperation({ summary: 'Cadastro de novo devedor' })
    @ApiBody({ type: CreateDevedorDto })
    async cadastrar(@Body() dto: CreateDevedorDto) {
      return this.devedorService.cadastrar(dto);
    }
}
