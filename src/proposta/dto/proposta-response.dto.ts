import { ApiProperty } from '@nestjs/swagger';

export class OpcaoPagamentoDto {
  @ApiProperty({ example: 1, description: 'Número de parcelas (1 = à vista)' })
  parcelas: number;

  @ApiProperty({ example: 850.0, description: 'Valor total a pagar após desconto' })
  valorTotal: number;

  @ApiProperty({ example: 850.0, description: 'Valor de cada parcela' })
  valorParcela: number;

  @ApiProperty({ example: 15, description: 'Percentual de desconto aplicado' })
  descontoAplicado: number;

  @ApiProperty({ example: 30, description: 'Prazo em dias para quitação' })
  prazoDias: number;
}

export class PropostaResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'uuid-do-devedor' })
  devedorId: string;

  @ApiProperty({ type: [OpcaoPagamentoDto] })
  opcoes: OpcaoPagamentoDto[];

  @ApiProperty({ example: 'Olá João, identificamos uma dívida de R$ 1.000,00...' })
  mensagemGerada: string;

  @ApiProperty({ example: 'PENDENTE' })
  status: string;

  @ApiProperty()
  createdAt: Date;
}