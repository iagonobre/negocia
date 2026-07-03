export const CONFIRMAR_AGENDAMENTO_TOOL = {
  name: 'confirmar_agendamento',
  description: 'Registra a confirmação do agendamento de revisão do veículo pelo cliente.',
  input_schema: {
    type: 'object',
    properties: {
      dataHora: {
        type: 'string',
        description: 'Data e hora do agendamento no formato ISO 8601 (ex: 2026-07-15T10:00:00)',
      },
      tipoServico: {
        type: 'string',
        description: 'Tipo de serviço a ser realizado (ex: Revisão 10.000 km, Troca de óleo)',
      },
    },
    required: ['dataHora', 'tipoServico'],
  },
};
