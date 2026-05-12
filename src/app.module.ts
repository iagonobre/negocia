import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { EmpresaModule } from './empresa/empresa.module';
import { AuthModule } from './auth/auth.module';
import { DevedorModule } from './devedor/devedor.module';
import { FaixaCriterioModule } from './faixa-criterio/faixa-criterio.module';
import { PropostaModule } from './proposta/proposta.module';
import { LlmModule } from './llm/llm.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { CobrancaModule } from './cobranca/cobranca.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    LlmModule,
    EmpresaModule,
    AuthModule,
    DevedorModule,
    FaixaCriterioModule,
    PropostaModule,
    WhatsAppModule,
    CobrancaModule,
  ],
})
export class AppModule {}
