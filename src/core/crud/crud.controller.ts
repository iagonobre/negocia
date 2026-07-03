import { Get, Post, Patch, Delete, Param, Body, NotFoundException } from '@nestjs/common';
import { mixin } from '@nestjs/common';
import { Empresa } from '../auth/decorators/empresa.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import type { CrudService } from './crud.service';

export function CrudController<T>() {
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
    create(@Body() dto: any, @Empresa() empresa: JwtPayload) {
      return this.service.create(dto, empresa.sub);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: any, @Empresa() empresa: JwtPayload) {
      return this.service.update(id, dto, empresa.sub);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Empresa() empresa: JwtPayload) {
      return this.service.remove(id, empresa.sub);
    }
  }

  return mixin(MixinController);
}
