import { BadRequestException } from '@nestjs/common';

export class PropostaJaFinalizadaException extends BadRequestException {
  constructor(status: string) {
    super(`Esta negociação já foi finalizada com status ${status}.`);
  }
}
