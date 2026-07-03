import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { NotificationSchedulerProvider } from './notification-scheduler.interface';

@Injectable()
export class NotificationEngine {
  private readonly logger = new Logger(NotificationEngine.name);

  constructor(private readonly whatsAppService: WhatsAppService) {}

  async enviarNotificacoes(provider: NotificationSchedulerProvider): Promise<number> {
    const empresas = await provider.getEmpresasAtivas();
    return this.enviarParaEmpresas(empresas, provider);
  }

  async enviarNotificacoesParaEmpresa(
    empresaId: string,
    provider: NotificationSchedulerProvider,
  ): Promise<number> {
    return this.enviarParaEmpresas([empresaId], provider);
  }

  private async enviarParaEmpresas(
    empresaIds: string[],
    provider: NotificationSchedulerProvider,
  ): Promise<number> {
    let enviados = 0;
    for (const empresaId of empresaIds) {
      const clientes = await provider.getClientesPendentes(empresaId);
      for (const cliente of clientes) {
        if (!cliente.telefone) continue;
        const mensagem = provider.buildMessage(cliente);
        await this.whatsAppService.enviarMensagem(cliente.telefone, mensagem);
        enviados++;
      }
    }
    this.logger.log(`Notificações enviadas: ${enviados}`);
    return enviados;
  }
}
