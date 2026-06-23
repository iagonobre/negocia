export interface NegotiationContext {
  systemPrompt: string;
  initialMessage: string;
}

export interface NegotiationContextProvider {
  buildContext(client: any, criteria: any): NegotiationContext;
  getTools(): any[];
  validateTool(
    toolName: string,
    args: Record<string, any>,
    limits: Record<string, any>,
  ): { aprovado: boolean; motivo: string };
}
