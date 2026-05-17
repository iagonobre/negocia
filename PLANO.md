# Plano de Ajustes — Qualidade de Código NegocIA

## Contexto

O professor e o auxiliar apontaram quatro categorias de problemas:
1. Violação do padrão Controller → Service → Repository (acesso direto ao Prisma fora de repositórios)
2. Código duplicado no módulo de cobrança
3. Funções grandes no módulo de proposta (prompt e tools inline)
4. Ausência de exceções em partes do código + necessidade de explicar o padrão ao professor (Spring Boot)

**Auditoria completa realizada em todos os módulos** — os problemas estão concentrados apenas nos arquivos mapeados abaixo. Os demais módulos (auth, empresa, devedor, faixa-criterio) estão corretos.

---

## BLOCO 1 — Acesso direto ao Prisma fora de repositórios

### Arquivos com violação

**`src/whatsapp/whatsapp.controller.ts`** — 4 acessos diretos ao Prisma:
- L18: `this.prisma.devedor.findFirst()` — busca devedor por id/empresaId (iniciarNegociacao)
- L55: `this.prisma.devedor.findFirst()` — busca devedor por telefone (webhook)
- L64: `this.prisma.proposta.findFirst()` — busca proposta pendente (webhook)

**`src/cobranca/cobranca.service.ts`** — 2 acessos diretos ao Prisma:
- L20: `this.prisma.proposta.findMany()` — busca propostas ACEITA parceladas (cron)
- L46: `this.prisma.proposta.findMany()` — mesma busca filtrada por empresaId (manual)

### Solução

**Adicionar em `src/proposta/proposta.repository.ts`:**
```typescript
async findAceitasParceladas(empresaId?: string) {
  return this.prisma.proposta.findMany({
    where: {
      status: 'ACEITA',
      ...(empresaId && { empresaId }),
      parcelasAcordadas: { gt: 1 },
    },
    include: { devedor: true },
  });
}

async findPendenteByDevedorId(devedorId: string) {
  return this.prisma.proposta.findFirst({
    where: { devedorId, status: 'PENDENTE' },
  });
}
```

**Adicionar em `src/devedor/devedor.repository.ts`:**
```typescript
async findByTelefone(telefone: string): Promise<Devedor | null> {
  return this.prisma.devedor.findFirst({ where: { telefone } });
}
```

**Arquivos a modificar:**
- `src/proposta/proposta.repository.ts` — adicionar os 2 métodos acima
- `src/proposta/proposta.module.ts` — exportar `PropostaRepository`
- `src/devedor/devedor.repository.ts` — adicionar `findByTelefone`
- `src/devedor/devedor.module.ts` — exportar `DevedorRepository`
- `src/whatsapp/whatsapp.controller.ts` — remover `PrismaService`, injetar repositórios
- `src/whatsapp/whatsapp.module.ts` — importar `DevedorModule` e `PropostaModule`
- `src/cobranca/cobranca.service.ts` — remover `PrismaService`, injetar `PropostaRepository`
- `src/cobranca/cobranca.module.ts` — importar `PropostaModule`

---

## BLOCO 2 — Código duplicado na Cobrança

### Problema
`enviarLembretesParcelados()` e `dispararLembretesManual()` têm ~95% do código idêntico. Única diferença: filtro de `empresaId`.

### Solução — método privado unificado

```typescript
private async processarEnvioLembretes(propostas: any[]): Promise<number> {
  let enviados = 0;
  for (const proposta of propostas) {
    const { devedor, valorAcordado, parcelasAcordadas } = proposta;
    if (!devedor.telefone || !valorAcordado || !parcelasAcordadas) continue;
    const valorParcela = (valorAcordado / parcelasAcordadas).toFixed(2);
    const mensagem = `Olá, ${devedor.nome}! 👋 Passando para lembrar sobre sua parcela do acordo no valor de R$ ${valorParcela}. Em caso de dúvidas, estamos à disposição!`;
    await this.whatsappService.enviarMensagem(devedor.telefone, mensagem);
    enviados++;
  }
  return enviados;
}

@Cron('0 9 1 * *')
async enviarLembretesParcelados() {
  const propostas = await this.propostaRepository.findAceitasParceladas();
  const enviados = await this.processarEnvioLembretes(propostas);
  this.logger.log(`Lembretes enviados: ${enviados}`);
}

async dispararLembretesManual(empresaId: string): Promise<{ enviados: number }> {
  const propostas = await this.propostaRepository.findAceitasParceladas(empresaId);
  const enviados = await this.processarEnvioLembretes(propostas);
  return { enviados };
}
```

**Arquivo a modificar:**
- `src/cobranca/cobranca.service.ts`

---

## BLOCO 3 — Funções grandes no módulo Proposta

### Problema
`gerarProposta()` e `conversar()` têm 77 linhas cada. O `systemPrompt` (22 linhas) e a definição das `tools` (17 linhas) estão inline.

### Solução

**Criar `src/proposta/proposta.prompts.ts`:**
```typescript
export function gerarSystemPrompt(devedor, faixa, valorMinimo): string {
  return `Você é um negociador humano...`; // texto completo extraído
}

export function gerarMensagemInicial(faixa, valorDivida): string {
  return faixa.mensagemInicial ? `...` : `...`;
}
```

**Criar `src/proposta/proposta.tools.ts`:**
```typescript
export const VALIDAR_CONTRAPROPOSTA_TOOL = {
  type: 'function',
  function: {
    name: 'validar_contraproposta',
    description: '...',
    parameters: { ... }
  }
};
```

**Adicionar método privado em `PropostaService`:**
```typescript
private async processarToolCall(
  toolCall: any,
  historico: any[],
  limites: any,
): Promise<any> {
  const args = JSON.parse(toolCall.function.arguments);
  const resultado = this.validarContraproposta(limites, Number(args.parcelas), Number(args.valorTotalOferecido));
  historico.push({ role: 'tool', tool_call_id: toolCall.id, name: toolCall.function.name, content: JSON.stringify(resultado) });
  return this.llmService.chamarLLM(historico);
}
```

**Arquivos a criar:**
- `src/proposta/proposta.prompts.ts`
- `src/proposta/proposta.tools.ts`

**Arquivo a modificar:**
- `src/proposta/proposta.service.ts`

---

## BLOCO 4 — Tratamento de Exceções

### Para o professor: Spring Boot vs NestJS

**No Spring Boot**, o tratamento global é explícito com `@ControllerAdvice` + `@ExceptionHandler`. Sem isso, exceções retornam 500.

**No NestJS**, existe uma **camada global de exceções embutida** que intercepta automaticamente qualquer `HttpException` — equivalente a ter um `@ControllerAdvice` global configurado por padrão, sem precisar declarar nada.

```
Spring Boot                          NestJS
──────────────────────────────────────────────────────
@ControllerAdvice                    Built-in ExceptionFilter (automático)
@ExceptionHandler(X.class)           throw new HttpException(msg, status)
ResponseEntity<ErrorResponse>        { statusCode, message, error }
```

| NestJS                  | Spring Boot equivalente          |
|-------------------------|----------------------------------|
| `NotFoundException`     | `ResponseStatusException(404)`   |
| `ConflictException`     | `ResponseStatusException(409)`   |
| `BadRequestException`   | `ResponseStatusException(400)`   |
| `ForbiddenException`    | `ResponseStatusException(403)`   |
| `UnauthorizedException` | `ResponseStatusException(401)`   |

**Fluxo de uma exceção no NestJS** (exemplo: devedor não encontrado):
```
DevedorService.buscar()
  └─► throw new NotFoundException('Devedor não encontrado')
        └─► Built-in ExceptionFilter intercepta
              └─► HTTP 404 { statusCode: 404, message: "Devedor não encontrado", error: "Not Found" }
```

### Exceções faltantes a adicionar

**`src/proposta/proposta.service.ts`:**
- `atualizarStatus` com `status = 'ACEITA'`: adicionar `BadRequestException` se `valorAcordado` não for fornecido

**`src/devedor/devedor.service.ts`:**
- `importarCsv`: adicionar `BadRequestException` se o buffer do arquivo estiver vazio

**`src/whatsapp/whatsapp.controller.ts`:**
- `iniciarNegociacao`: substituir `devedor!.telefone` por verificação explícita com `NotFoundException`

---

## Ordem de execução

1. **BLOCO 2** — Duplicação da cobrança (mais simples, independente)
2. **BLOCO 1** — Repositórios (depende do BLOCO 2 concluído)
3. **BLOCO 3** — Extração de prompts/tools
4. **BLOCO 4** — Exceções faltantes

---

## Verificação após implementação

```bash
npx tsc --noEmit          # zero erros TypeScript
pnpm run build            # build limpo
```

Testar via Swagger ou curl:
- `POST /whatsapp/iniciar/:devedorId` — sem PrismaService no controller
- `POST /cobranca/lembretes` — método privado unificado
- `POST /proposta/gerar/:devedorId` — prompt via arquivo externo