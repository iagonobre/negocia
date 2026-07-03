export interface NotificationSchedulerProvider {
  getEmpresasAtivas(): Promise<string[]>;
  getClientesPendentes(empresaId: string): Promise<{ telefone: string; [key: string]: any }[]>;
  buildMessage(cliente: any): string;
}
