import { StatusDevedor, OrigemDevedor, TipoPessoa } from 'src/generated/prisma/enums';

export type DevedorCsvRow = {
  nome: string;
  email: string;
  telefone: string;
  tipoPessoa: TipoPessoa;
  cpf: string | null;
  cnpj: string | null;
  valorDivida: number;
  descricaoDivida: string | null;
  vencimento: Date;
  numeroParcelas: number | null;
  status: StatusDevedor;
  origem: OrigemDevedor;
  tentativas: number;
  ultimoContato?: string | null;
};
