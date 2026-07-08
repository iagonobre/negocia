import { Get, Post, Patch, Delete, Param, Body, NotFoundException, Type, ValidationPipe } from '@nestjs/common';
import { mixin } from '@nestjs/common';
import { Empresa } from '../auth/decorators/empresa.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import type { CrudService } from './crud.service';

// Num controller genérico, `@Body() dto: any` faz o TypeScript emitir `Object`
// como metatype no reflect-metadata — e o ValidationPipe global do Nest ignora
// esse caso silenciosamente, porque não há como inferir a classe do DTO a
// partir de um método compartilhado por várias instâncias. `expectedType` é a
// opção do próprio ValidationPipe para esse cenário: cada instância informa,
// na hora de estender o mixin, qual DTO real deve ser validado.
export function CrudController<T>(CreateDto: Type<any>, UpdateDto: Type<any>) {
  class MixinController {
    readonly service: CrudService<T>;

    @Get()
    findAll(@Empresa() empresa: JwtPayload) {
      return this.service.findAll(empresa.sub);
    }

    @Get(':id')
    async findById(@Param('id') id: string, @Empresa() empresa: JwtPayload) {
      const result = await this.service.findById(id, empresa.sub);
      if (!result) throw new NotFoundException('Registro não encontrado.');
      return result;
    }

    @Post()
    create(
      @Body(new ValidationPipe({ expectedType: CreateDto, whitelist: true, transform: true }))
      dto: any,
      @Empresa() empresa: JwtPayload,
    ) {
      return this.service.create(dto, empresa.sub);
    }

    @Patch(':id')
    update(
      @Param('id') id: string,
      @Body(new ValidationPipe({ expectedType: UpdateDto, whitelist: true, transform: true }))
      dto: any,
      @Empresa() empresa: JwtPayload,
    ) {
      return this.service.update(id, dto, empresa.sub);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Empresa() empresa: JwtPayload) {
      return this.service.remove(id, empresa.sub);
    }
  }

  return mixin(MixinController);
}
