import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { EmpresaModule } from './empresa/empresa.module';
import { AuthModule } from './auth/auth.module';
import { DevedorModule } from './devedor/devedor.module';
import { CriterioNegociacaoModule } from './faixa-criterio/criterio-negociacao.module';
import { CriterioModule } from './criterio/criterio.module';
import { FaixaCriterioModule } from './faixa-criterio/faixa-criterio.module';
import { CriterioNegociacaoModule } from './faixa-criterio/criterio-negociacao.module';
import { CriterioNegociacaoModule } from './faixa-criterio/criterio-negociacao.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    EmpresaModule,
    AuthModule,
    DevedorModule,
    CriterioNegociacaoModule,
    FaixaCriterioModule,
    CriterioModule,
  ],
})
export class AppModule {}
