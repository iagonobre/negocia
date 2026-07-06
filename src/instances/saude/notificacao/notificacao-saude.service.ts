import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificacaoSaudeRepository } from './notificacao-saude.repository';
import { NotificationCronService } from '../../../core/notification/notification-cron.service';

@Injectable()
export class NotificacaoSaudeService extends NotificationCronService {
  constructor(private readonly repository: NotificacaoSaudeRepository) {
    super();
  }

  @Cron('0 8 * * 1,3,5')
  async enviarLembretes() {
    await this.executarCron();
  }

  // ── NotificationSchedulerProvider ───────────────────────────────────────

  async getEmpresasAtivas(): Promise<string[]> {
    return this.repository.findEmpresasAtivas();
  }

  async getClientesPendentes(empresaId: string): Promise<{ telefone: string; [key: string]: any }[]> {
    const pacientes = await this.repository.findPacientesPendentes(empresaId);
    return pacientes.filter((p) => p.telefone);
  }

  buildMessage(paciente: any): string {
    return `Olá ${paciente.nome}, tudo bem? 👋 Sua consulta de retorno está pendente. Responda para agendarmos!`;
  }
}
