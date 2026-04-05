import { Module } from '@nestjs/common';

import { EmpresaModule } from './empresa/empresa.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, EmpresaModule, AuthModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
