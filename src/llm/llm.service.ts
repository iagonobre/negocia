import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LlmService {
  private readonly apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  private readonly logger = new Logger(LlmService.name);

  constructor(private readonly configService: ConfigService) {}

  async chamarLLM(mensagens: any[], tools?: any[], tentativa = 1): Promise<any> {
    const payload: any = {
      model: this.configService.get<string>('groq.model'),
      messages: mensagens,
      temperature: 0.7,
    };

    if (tools) {
      payload.tools = tools;
      payload.tool_choice = 'auto';
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.configService.get<string>('groq.apiKey')}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 429 && tentativa <= 3) {
      const retryAfter = parseInt(response.headers.get('retry-after') ?? '5', 10);
      const espera = retryAfter * 1000;
      this.logger.warn(`Rate limit atingido. Aguardando ${retryAfter}s antes de tentar novamente (tentativa ${tentativa}/3)...`);
      await new Promise((resolve) => setTimeout(resolve, espera));
      return this.chamarLLM(mensagens, tools, tentativa + 1);
    }

    const data = await response.json();

    if (!response.ok || !data.choices?.[0]?.message) {
      this.logger.error(`Groq error: ${JSON.stringify(data)}`);
    }

    return data.choices?.[0]?.message;
  }
}
