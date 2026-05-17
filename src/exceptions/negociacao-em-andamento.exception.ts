import { BadRequestException } from '@nestjs/common';

export class NegociacaoEmAndamentoException extends BadRequestException {
  constructor() {
    super('Este devedor já possui uma negociação em andamento.');
  }
}
