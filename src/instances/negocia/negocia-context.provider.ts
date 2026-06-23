import { Injectable } from '@nestjs/common';
import {
  NegotiationContext,
  NegotiationContextProvider,
} from '../../core/negotiation/negotiation-context.interface';
import { gerarSystemPrompt, gerarMensagemInicial } from './proposta/proposta.prompts';
import { VALIDAR_CONTRAPROPOSTA_TOOL } from './proposta/proposta.tools';

@Injectable()
export class NegociaContextProvider implements NegotiationContextProvider {
  buildContext(devedor: any, faixa: any): NegotiationContext {
    const valorMinimo = (devedor.valorDivida * (1 - faixa.descontoMaximo / 100)).toFixed(2);
    return {
      systemPrompt: gerarSystemPrompt(
        devedor.nome,
        devedor.valorDivida,
        faixa.tomComunicacao,
        valorMinimo,
        faixa.parcelasMaximas,
        faixa.prazoMaximoDias,
      ),
      initialMessage: gerarMensagemInicial(faixa.mensagemInicial, devedor.valorDivida),
    };
  }

  getTools(): any[] {
    return [VALIDAR_CONTRAPROPOSTA_TOOL];
  }

  validateTool(
    _toolName: string,
    args: Record<string, any>,
    limits: Record<string, any>,
  ): { aprovado: boolean; motivo: string } {
    const parcelas = Number(args.parcelas);
    const valorTotalOferecido = Number(args.valorTotalOferecido);

    if (parcelas > limits.parcelasMaximas) {
      return {
        aprovado: false,
        motivo: `O limite é de ${limits.parcelasMaximas} parcelas. Informe isso ao cliente.`,
      };
    }

    const valorMinimoAceitavel = limits.valorOriginal * (1 - limits.descontoMaximo / 100);

    if (valorTotalOferecido < valorMinimoAceitavel) {
      return {
        aprovado: false,
        motivo: `Valor muito baixo. O mínimo que aceitamos é R$ ${valorMinimoAceitavel.toFixed(2)}. Não aceite menos que isso.`,
      };
    }

    return {
      aprovado: true,
      motivo: `Aprovado! O acordo de ${parcelas}x de R$ ${(valorTotalOferecido / parcelas).toFixed(2)} pode ser fechado.`,
    };
  }
}
