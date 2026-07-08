export const CONFIRMAR_HORARIO_TOOL = {
  type: 'function',
  function: {
    name: 'confirmar_horario',
    description: 'Confirma o horário de retorno agendado com o paciente',
    parameters: {
      type: 'object',
      properties: {
        dataHora: {
          type: 'string',
          description: 'Data e hora do retorno agendado, no formato ISO 8601 (ex: "2026-07-10T14:00:00")',
        },
        observacoes: {
          type: 'string',
          description: 'Observações adicionais sobre o agendamento',
        },
      },
      required: ['dataHora'],
    },
  },
};
