export interface NegotiationContext {
  systemPrompt: string;
  initialMessage: string;
}

export interface NegotiationContextProvider {
  buildContext(client: any, criteria: any): NegotiationContext;
  getTools(): any[];
  // `finalizar`, quando presente, sinaliza que essa chamada de ferramenta
  // conclui a negociação/agendamento. O core não interpreta o conteúdo —
  // apenas repassa para `ConversationService.finalizarSessao`, que cada
  // instância implementa usando seu próprio domínio.
  validateTool(
    toolName: string,
    args: Record<string, any>,
    limits: Record<string, any>,
  ): { aprovado: boolean; motivo: string; finalizar?: Record<string, any> };
}
