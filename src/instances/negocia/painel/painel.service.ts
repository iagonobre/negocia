import { Injectable } from '@nestjs/common';
import { PainelRepository } from './painel.repository';

@Injectable()
export class PainelService {
  constructor(private readonly painelRepository: PainelRepository) {}

  async painel(empresaId: string) {
    return this.painelRepository.painel(empresaId);
  }
}
