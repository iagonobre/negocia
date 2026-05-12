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
      this.logger.warn(`Rate limit atingido. Aguardando ${retryAfter}s (tentativa ${tentativa}/3)...`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return this.chamarLLM(mensagens, tools, tentativa + 1);
    }

    const data = await response.json();

    // Groq rejeita tool calls quando o modelo gera strings em vez de números.
    // Nesse caso, parseamos o failed_generation manualmente e coercimos os tipos.
    if (data.error?.code === 'tool_use_failed' && data.error?.failed_generation) {
      const sintetico = this.parsearFalhaToolCall(data.error.failed_generation);
      if (sintetico) {
        this.logger.warn('tool_use_failed recuperado via parse manual do failed_generation.');
        return sintetico;
      }
    }

    if (!response.ok || !data.choices?.[0]?.message) {
      this.logger.error(`Groq error: ${JSON.stringify(data)}`);
    }

    return data.choices?.[0]?.message;
  }

  private parsearFalhaToolCall(failedGeneration: string): any | null {
    try {
      const match = failedGeneration.match(/<function=(\w+)>(.*?)<\/function>/s);
      if (!match) return null;

      const nomeFuncao = match[1];
      const args = JSON.parse(match[2]);

      // Coerce todos os valores numéricos que vieram como string
      const argsCoercidos: Record<string, any> = {};
      for (const [k, v] of Object.entries(args)) {
        argsCoercidos[k] = isNaN(Number(v)) ? v : Number(v);
      }

      return {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: `tool_${Date.now()}`,
            type: 'function',
            function: {
              name: nomeFuncao,
              arguments: JSON.stringify(argsCoercidos),
            },
          },
        ],
      };
    } catch {
      return null;
    }
  }
}
