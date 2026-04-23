import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PropostaRepository } from './proposta.repository';
import { OpcaoPagamentoDto } from './dto/proposta-response.dto';

@Injectable()
export class PropostaService {
  constructor(private readonly propostaRepository: PropostaRepository) {}

  async gerarProposta(devedorId: string, empresaId: string) {
    // 1. Busca devedor e faixa correspondente
    const resultado = await this.propostaRepository.findDevedorComFaixa(devedorId, empresaId);

    if (!resultado) {
      throw new NotFoundException('Devedor não encontrado.');
    }

    const { devedor, faixa } = resultado;

    if (!faixa) {
      throw new BadRequestException(
        `Nenhuma faixa de critério encontrada para o valor de dívida R$ ${devedor.valorDivida.toFixed(2)}.`,
      );
    }

    // 2. Calcula as opções de pagamento
    const opcoes = this.calcularOpcoes(devedor.valorDivida, faixa);

    // 3. Gera o texto personalizado via Groq
    const mensagemGerada = await this.gerarMensagemComIA(devedor, faixa, opcoes);

    // 4. Persiste a proposta no banco
    const proposta = await this.propostaRepository.create({
      opcoes: opcoes as any,
      mensagemGerada,
      devedor: { connect: { id: devedorId } },
      empresa: { connect: { id: empresaId } },
    });

    return { ...proposta, opcoes };
  }

  async listarPropostas(empresaId: string) {
    return this.propostaRepository.findAllByEmpresa(empresaId);
  }

  async buscarProposta(id: string, empresaId: string) {
    const proposta = await this.propostaRepository.findById(id, empresaId);
    if (!proposta) throw new NotFoundException('Proposta não encontrada.');
    return proposta;
  }

  async atualizarStatus(id: string, empresaId: string, status: 'PENDENTE' | 'ACEITA' | 'RECUSADA') {
    await this.buscarProposta(id, empresaId);
    return this.propostaRepository.updateStatus(id, status);
  }

  // --- Cálculo determinístico ---

  private calcularOpcoes(valorDivida: number, faixa: any): OpcaoPagamentoDto[] {
    const opcoes: OpcaoPagamentoDto[] = [];

    // À vista com desconto máximo
    const valorAVista = this.aplicarDesconto(valorDivida, faixa.descontoMaximo);
    opcoes.push({
      parcelas: 1,
      valorTotal: valorAVista,
      valorParcela: valorAVista,
      descontoAplicado: faixa.descontoMaximo,
      prazoDias: 1,
    });

    // Parcelado: de 2 até parcelasMaximas
    // Desconto diminui proporcionalmente conforme aumentam as parcelas
    for (let p = 2; p <= faixa.parcelasMaximas; p++) {
      const proporcao = 1 - (p - 1) / faixa.parcelasMaximas;
      const desconto = parseFloat((faixa.descontoMaximo * proporcao).toFixed(2));
      const valorTotal = this.aplicarDesconto(valorDivida, desconto);
      const valorParcela = parseFloat((valorTotal / p).toFixed(2));
      const prazoDias = Math.round((faixa.prazoMaximoDias / faixa.parcelasMaximas) * p);

      opcoes.push({
        parcelas: p,
        valorTotal,
        valorParcela,
        descontoAplicado: desconto,
        prazoDias,
      });
    }

    return opcoes;
  }

  private aplicarDesconto(valor: number, desconto: number): number {
    return parseFloat((valor * (1 - desconto / 100)).toFixed(2));
  }

  // --- Geração de texto via Groq ---

  private async gerarMensagemComIA(devedor: any, faixa: any, opcoes: OpcaoPagamentoDto[]): Promise<string> {
    const opcoesTexto = opcoes
      .map((o) =>
        o.parcelas === 1
          ? `• À vista: R$ ${o.valorTotal.toFixed(2)} (${o.descontoAplicado}% de desconto)`
          : `• ${o.parcelas}x de R$ ${o.valorParcela.toFixed(2)} (total R$ ${o.valorTotal.toFixed(2)}, ${o.descontoAplicado}% de desconto, prazo ${o.prazoDias} dias)`,
      )
      .join('\n');

    const prompt = `
Você é um assistente de cobrança de uma empresa. Sua tarefa é redigir uma mensagem de WhatsApp para um devedor com uma proposta de pagamento personalizada.

Informações do devedor:
- Nome: ${devedor.nome}
- Valor da dívida: R$ ${devedor.valorDivida.toFixed(2)}
- Vencimento original: ${new Date(devedor.vencimento).toLocaleDateString('pt-BR')}
${devedor.descricaoDivida ? `- Descrição: ${devedor.descricaoDivida}` : ''}

Tom de comunicação: ${faixa.tomComunicacao}
${faixa.mensagemInicial ? `Mensagem de abertura sugerida: ${faixa.mensagemInicial}` : ''}

Opções de pagamento disponíveis:
${opcoesTexto}

Regras:
- Use o tom de comunicação indicado (${faixa.tomComunicacao})
- Seja empático e profissional
- Apresente todas as opções de pagamento de forma clara
- Não use markdown, apenas texto simples (é uma mensagem de WhatsApp)
- Finalize incentivando o devedor a responder para confirmar uma das opções
- Máximo de 300 palavras
`.trim();

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? 'Não foi possível gerar a mensagem.';
  }
}