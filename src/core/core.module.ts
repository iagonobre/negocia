import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { LlmModule } from './llm/llm.module';
import { AuthModule } from './auth/auth.module';
import { EmpresaModule } from './empresa/empresa.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { NegotiationModule } from './negotiation/negotiation.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    LlmModule,
    AuthModule,
    EmpresaModule,
    WhatsAppModule,
    NegotiationModule,
    NotificationModule,
  ],
  exports: [
    PrismaModule,
    LlmModule,
    AuthModule,
    EmpresaModule,
    WhatsAppModule,
    NegotiationModule,
    NotificationModule,
  ],
})
export class CoreModule {}
