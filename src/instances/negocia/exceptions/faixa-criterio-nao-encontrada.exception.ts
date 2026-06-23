import { BadRequestException } from '@nestjs/common';

export class FaixaCriterioNaoEncontradaException extends BadRequestException {
  constructor(valorDivida: number) {
    super(
      `Nenhuma faixa de critério encontrada para o valor de dívida R$ ${valorDivida.toFixed(2)}.`,
    );
  }
}
