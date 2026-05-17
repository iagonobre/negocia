export const VALIDAR_CONTRAPROPOSTA_TOOL = {
  type: 'function',
  function: {
    name: 'validar_contraproposta',
    description:
      'Calcula se a proposta do cliente é permitida pelas regras financeiras. Use sempre que o cliente sugerir um valor ou parcelamento.',
    parameters: {
      type: 'object',
      properties: {
        parcelas: { type: 'number', description: 'Número de parcelas desejadas (1 para à vista)' },
        valorTotalOferecido: { type: 'number', description: 'Valor total que o cliente quer pagar.' },
      },
      required: ['parcelas', 'valorTotalOferecido'],
    },
  },
};
