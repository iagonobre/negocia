import { Module } from '@nestjs/common';
import { DevedorController } from './devedor.controller';
import { DevedorService } from './devedor.service';
import { DevedorRepository } from './devedor.repository';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DevedorController],
  providers: [DevedorService, DevedorRepository],
  exports: [DevedorService]
})
export class DevedorModule {}
