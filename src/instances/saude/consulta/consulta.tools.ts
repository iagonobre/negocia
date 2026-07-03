export const CONFIRMAR_HORARIO_TOOL = {
  name: 'confirmar_horario',
  description: 'Confirma o horário de retorno agendado com o paciente',
  input_schema: {
    type: 'object',
    properties: {
      dataHora: {
        type: 'string',
        description: 'Data e hora do retorno agendado (ex: "2026-07-10 às 14h")',
      },
      observacoes: {
        type: 'string',
        description: 'Observações adicionais sobre o agendamento',
      },
    },
    required: ['dataHora'],
  },
};
