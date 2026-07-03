export interface ConversationOrchestrator {
  findClienteByTelefone(telefone: string): Promise<{ id: string; empresaId: string } | null>;
  // mensagemInicial presente quando nova sessão foi criada — webhook envia de volta sem processar
  findOuCriarSessao(clienteId: string, empresaId: string): Promise<{ id: string; mensagemInicial?: string }>;
  responder(sessaoId: string, mensagem: string, empresaId: string): Promise<string>;
}
