import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './core/config/configuration';
import { PrismaModule } from './core/prisma/prisma.module';
import { EmpresaModule } from './core/empresa/empresa.module';
import { AuthModule } from './core/auth/auth.module';
import { LlmModule } from './core/llm/llm.module';
import { DevedorModule } from './instances/negocia/devedor/devedor.module';
import { FaixaCriterioModule } from './instances/negocia/faixa-criterio/faixa-criterio.module';
import { PropostaModule } from './instances/negocia/proposta/proposta.module';
import { WhatsAppNegociaModule } from './instances/negocia/whatsapp/whatsapp.module';
import { CobrancaModule } from './instances/negocia/cobranca/cobranca.module';

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
    WhatsAppNegociaModule,
    CobrancaModule,
  ],
})
export class AppModule {}
