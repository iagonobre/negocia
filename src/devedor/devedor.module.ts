import { Module } from '@nestjs/common';
import { DevedorController } from './devedor.controller';
import { DevedorService } from './devedor.service';
import { DevedorRepository } from './devedor.repository';

@Module({
  controllers: [DevedorController],
  providers: [DevedorService, DevedorRepository],
  exports: [DevedorService],
})
export class DevedorModule {}
