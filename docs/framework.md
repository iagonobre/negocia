# Negocia Framework — Guia de Arquitetura

## O que é o Negocia Framework

O Negocia Framework é uma base reutilizável para construir aplicações de **conversação automatizada via WhatsApp com agente de IA**. Ele define a estrutura e o fluxo da aplicação, permitindo que diferentes casos de uso sejam criados apenas configurando os pontos variáveis.

---

## Pontos fixos (framework core)

São os módulos que toda instância herda sem modificação:

| Módulo | Localização | Responsabilidade |
|--------|-------------|-----------------|
| Auth/JWT | `src/core/auth/` | Login de empresa, guard, decorator `@Empresa()` |
| Empresa | `src/core/empresa/` | CRUD de empresa, painel de métricas |
| Prisma | `src/core/prisma/` | Conexão com banco (global) |
| LLM | `src/core/llm/` | Chamadas à API Groq com retry e tool recovery (global) |
| WhatsApp | `src/core/whatsapp/` | Envio de mensagens via Twilio |
| NegotiationEngine | `src/core/negotiation/` | Motor de conversa: loop de histórico, chamada à LLM, processamento de tool calls |
| CoreModule | `src/core/core.module.ts` | Agrega e exporta todos os módulos acima |

---

## Pontos variáveis (por instância)

São os aspectos que cada instância define:

| Ponto variável | Como configurar |
|----------------|-----------------|
| **Entidade de cliente** | Criar módulo próprio com model Prisma (ex: `Devedor`, `Paciente`) |
| **Critérios de negociação** | Criar módulo de critérios/regras da instância (ex: `FaixaCriterio`) |
| **Persona e contexto do agente** | Implementar `NegotiationContextProvider.buildContext()` |
| **Tools disponíveis ao agente** | Implementar `NegotiationContextProvider.getTools()` |
| **Validação das decisões do agente** | Implementar `NegotiationContextProvider.validateTool()` |
| **Webhook + orquestração WhatsApp** | Criar controller que usa `PropostaService` e `WhatsAppService` |
| **Notificações periódicas** | Criar módulo com `@Cron` e mensagem customizada |

---

## A interface central

```typescript
// src/core/negotiation/negotiation-context.interface.ts

export interface NegotiationContext {
  systemPrompt: string;    // persona do agente e regras da conversa
  initialMessage: string;  // instrução de como iniciar o diálogo
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
```

---

## Estrutura de pastas

```
src/
├── core/                          # Framework — não alterar por instância
│   ├── auth/
│   ├── config/
│   ├── empresa/
│   ├── llm/
│   ├── negotiation/
│   │   ├── negotiation-context.interface.ts
│   │   ├── negotiation.engine.ts
│   │   └── negotiation.module.ts
│   ├── prisma/
│   ├── whatsapp/
│   └── core.module.ts
│
├── instances/
│   └── negocia/                   # Instância demo: cobrança de dívidas
│       ├── cobranca/
│       ├── devedor/
│       ├── exceptions/
│       ├── faixa-criterio/
│       ├── proposta/
│       ├── whatsapp/
│       ├── negocia-context.provider.ts
│       └── negocia.module.ts
│
├── app.module.ts                  # Importa CoreModule + instâncias ativas
└── main.ts
```

---

## Como criar uma nova instância

### 1. Criar a pasta da instância

```
src/instances/minha-instancia/
```

### 2. Definir o modelo de cliente no schema Prisma

```prisma
// prisma/schema.prisma
model Cliente {
  id        String   @id @default(uuid())
  nome      String
  telefone  String
  // ... campos específicos da instância
  empresaId String
  empresa   Empresa  @relation(fields: [empresaId], references: [id])
}
```

Após editar: `npx prisma migrate dev --name add_cliente`

### 3. Criar o módulo de cliente

Seguir o padrão `Controller → Service → Repository` para o modelo de cliente da instância.

### 4. Implementar o NegotiationContextProvider

```typescript
// src/instances/minha-instancia/minha-instancia-context.provider.ts
import { Injectable } from '@nestjs/common';
import {
  NegotiationContext,
  NegotiationContextProvider,
} from '../../core/negotiation/negotiation-context.interface';

@Injectable()
export class MinhaInstanciaContextProvider implements NegotiationContextProvider {
  buildContext(cliente: any, criterio: any): NegotiationContext {
    return {
      systemPrompt: `Você é um assistente de ${criterio.tema}. ...`,
      initialMessage: `Olá ${cliente.nome}, ...`,
    };
  }

  getTools(): any[] {
    return []; // ou tools específicas da instância
  }

  validateTool(toolName: string, args: any, limits: any) {
    // lógica de validação específica
    return { aprovado: true, motivo: 'OK' };
  }
}
```

### 5. Criar o módulo agregador

```typescript
// src/instances/minha-instancia/minha-instancia.module.ts
import { Module } from '@nestjs/common';
import { ClienteModule } from './cliente/cliente.module';
import { PropostaMinhaInstanciaModule } from './proposta/proposta.module';

@Module({
  imports: [ClienteModule, PropostaMinhaInstanciaModule],
})
export class MinhaInstanciaModule {}
```

### 6. Registrar no AppModule

```typescript
// src/app.module.ts
@Module({
  imports: [CoreModule, NegociaModule, MinhaInstanciaModule],
})
export class AppModule {}
```

---

## Aplicações exemplo

| Instância | Entidade de cliente | Contexto do agente | Tool de decisão |
|-----------|--------------------|--------------------|-----------------|
| **Negocia** (demo) | `Devedor` — débito em aberto | Negociador de dívidas "Sofia" | `validar_contraproposta` — verifica desconto e parcelas |
| **Saúde** | `Paciente` — retorno pendente | Assistente de clínica | `verificar_disponibilidade` — checa agenda |
| **Oficina** | `Cliente` — revisão agendada | Assistente de oficina mecânica | `confirmar_horario` — verifica slot disponível |

---

## Fluxo de uma negociação (end-to-end)

```
WhatsApp (Twilio) → webhook
  └─► WhatsAppController (instância)
        ├─► DevedorRepository.findByTelefone()
        ├─► PropostaRepository.findPendentePorDevedor()
        └─► PropostaService.conversar()
              ├─► PropostaRepository.findById()        ← carrega historico + limites
              ├─► NegociaContextProvider.getTools()    ← tools da instância
              ├─► NegotiationEngine.conversar()        ← loop LLM + tool call
              │     ├─► LlmService.chamarLLM()
              │     ├─► validator(toolName, args)      ← NegociaContextProvider.validateTool()
              │     └─► LlmService.chamarLLM()         ← com resultado da tool
              ├─► PropostaRepository.atualizarHistorico()
              └─► WhatsAppService.enviarMensagem()     ← resposta ao usuário
```
