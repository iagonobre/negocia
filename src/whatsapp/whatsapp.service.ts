import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly client: twilio.Twilio;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.client = twilio(
      this.configService.get<string>('twilio.accountSid'),
      this.configService.get<string>('twilio.authToken'),
    );
    this.from = this.configService.get<string>('twilio.from') ?? '';
  }

  async enviarMensagem(telefone: string, mensagem: string): Promise<void> {
    const to = telefone.startsWith('whatsapp:') ? telefone : `whatsapp:${telefone}`;

    try {
      await this.client.messages.create({ from: this.from, to, body: mensagem });
    } catch (error) {
      this.logger.error(`Falha ao enviar mensagem para ${telefone}: ${error.message}`);
    }
  }
}
