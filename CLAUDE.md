# NoFoco — contexto do projeto

> **Leia este arquivo antes de mexer no projeto.** Ele resume as decisões já tomadas com o dono do produto,
> para que o trabalho continue de onde parou (inclusive em outra máquina/sessão).

## O que é

**NoFoco** — "Seu diário alimentar inteligente". App mobile (Android + iOS) de contagem de calorias,
macros e micronutrientes. Registro por **busca**, **código de barras** e **foto com IA**; diário por
refeições; gráficos; e **metas personalizadas por objetivo** com **orientação adaptativa** ao longo do dia.

- **Domínio:** `nfoco.com.br` (o `nofoco.com.br` já estava em uso; a marca continua **NoFoco**).
- **Documento-mestre de produto/arquitetura:** [`PLANEJAMENTO_APP.md`](PLANEJAMENTO_APP.md)
- **Mockups de referência:** `mockups.html` (galeria) e `mockup-calorieup.png` (imagem aprovada — o nome
  do arquivo é do rascunho antigo "CalorieUp"; a marca final é NoFoco).

## Estrutura

```
AppLeitura/
├── CLAUDE.md               ← este arquivo
├── PLANEJAMENTO_APP.md     ← plano completo (escopo, arquitetura, E1..E10, fontes de dados)
├── mockups.html            ← galeria de mockups (abrir no navegador)
├── mockup-calorieup.png    ← identidade visual aprovada
└── nofoco/                 ← o app (Expo / React Native)
```

## Stack (definida)

**Expo SDK 57 + React Native 0.86 + TypeScript**, com:
- **expo-router** (rotas por arquivo, `typedRoutes`) — código em `nofoco/src/app/`
- **Zustand + AsyncStorage** (estado global persistido)
- **react-native-reanimated 4** + **react-native-svg** (animações e medidores)
- **@expo/vector-icons** (Ionicons)

Escolhido em vez de Flutter por: ambiente já pronto (Node), build iOS na nuvem via **EAS** sem precisar de
Mac (a máquina de dev é Windows), ecossistema/contratação e atualizações OTA.

**Backend:** ainda **não** definido (recomendação: Supabase). Hoje tudo é local/persistido no device.

## Identidade visual (obrigatória)

Dark-first. Tokens em `nofoco/src/constants/theme.ts` (export `NoFoco`):

| Papel | Cor |
|---|---|
| Fundo / superfície | `#0D0F0D` / `#181B16` / `#232720` |
| Texto | `#F2F5F0` (principal) · `#919989` (secundário) |
| **Accent (ação)** | `#A6E052` — verde lima. **Texto sobre o verde é escuro** (`#0D0F0D`), nunca branco |
| Carboidratos | `#F2A33C` (laranja) |
| Proteínas | `#4A9DE0` (azul) |
| Gorduras | `#E86FA6` (rosa) |
| Fibra / micros | `#5BC0A8` |

Cada macronutriente tem **cor fixa em todo o app** — isso é linguagem visual, não decoração.

## O que já está construído e funcionando

- **Navegação:** abas com **gesto de swipe** (pager) + tab bar customizada com **FAB "+" central**.
- **Diário** (`src/app/(tabs)/index.tsx`): medidor de calorias animado, barras de macro, tira semanal,
  lista de refeições com **consumido / alvo**, e o **banner do treinador**.
- **Multi-dia** (`src/lib/date.ts` + `src/store/day.ts` + `src/components/ui/week-strip.tsx`): o diário
  guarda por data (`YYYY-MM-DD` local). A tira semanal navega de verdade — dias com registro ganham um
  ponto, setas trocam de semana, e o botão **“Hoje”** volta. Dá para **preencher um dia esquecido**:
  basta selecionar a data e lançar normalmente. Em dia passado o treinador **relata** em vez de orientar
  ritmo ("Neste dia você registrou X de Y kcal"), porque falar de ritmo sobre ontem não ajuda ninguém.
- **Refeições editáveis** (`src/store/meals.ts` + `src/app/refeicao-editar.tsx`): a pessoa cria, renomeia,
  reagenda e exclui refeições (Ceia, pré-treino, o que for). No Diário, **“Editar”** entra no modo de
  edição e **“+ Nova”** cria. A lista se reordena sozinha por horário.
- **Adicionar:** modal com 3 modos → **Pesquisar** (funcional) · Escanear e Foto (ainda stubs).
- **Seletor de porção (E4.1)** (`src/app/porcao.tsx`): alterna **Unidade ⇆ Gramas**, converte o valor ao
  trocar de modo, recalcula macros/micros ao vivo, escolhe a refeição e **salva**.
- **Detalhe da refeição** (`src/app/refeicao.tsx`): meta de **calorias e macros da refeição** (a fatia %
  aplicada a cada meta do dia), itens, remover, adicionar, e a **tabela nutricional completa**.
- **Tabela nutricional** (`src/lib/nutrition.ts` + `src/components/ui/nutrition-table.tsx`): bloco
  recolhível com todos os nutrientes conhecidos, agrupados como rótulo brasileiro.
- **Perfil + metas** (`src/app/(tabs)/perfil.tsx` + `src/lib/goal.ts`): **Mifflin-St Jeor** → TDEE →
  ajuste por objetivo; macros calculados; **distribuição por refeição personalizável** (% ajustável).
- **Peso alvo + previsão** (`src/lib/forecast.ts`): informe o peso desejado e o app estima quanto tempo
  levaria, **simulando semana a semana** (a TMB cai junto com o peso, então a conta linear mente em prazo
  longo). Opcionalmente escolhe-se o **ritmo** (0,25 a 1 kg/semana), que passa a definir a meta calórica —
  com piso de segurança: nunca abaixo da TMB nem de 1.200 kcal (♀) / 1.500 (♂). Quando o piso trava, a
  previsão passa a mostrar o ritmo **real**, não o pedido. Avisa se o alvo cair abaixo de IMC 18,5.
- **Orientação adaptativa** (`src/lib/pacing.ts`): distribui a meta entre refeições e, conforme a pessoa
  come mais/menos, **redistribui o orçamento restante** e mostra mensagens ("pode ingerir até ~X kcal aqui",
  "segure em ~Y", "no ritmo 👍") — sem tom de culpa.

**Dados de alimentos:** hoje são **mock** em `src/data/foods.ts` (modelo já correto: valores por 100 g +
`unitGrams`). Integração com dados reais ainda não foi feita. O tipo `Nutrients` tem 7 campos
obrigatórios (kcal, carbo, proteína, gordura, açúcar, fibra, sódio) e o resto **opcional** — saturadas,
trans, mono, poli, colesterol, minerais e vitaminas. Os valores mock preenchidos vieram de TACO/rótulo e
**precisam ser conferidos** quando a base real entrar.

## Onde paramos — sessão de 23/07/2026

Sessão longa, feita na **máquina de mesa** (Windows). Tudo abaixo está implementado, com
`npx tsc --noEmit` limpo e verificado rodando no preview web:

1. **Refeições deixaram de ser um tipo fixo** — viraram dados editáveis (criar "Ceia", renomear,
   reagendar, excluir). Foi a refatoração mais profunda: mexeu em 2 stores, no pacing e em 4 telas.
2. **Metas de macro por refeição** — ao abrir o Café da manhã aparece consumido/alvo de carbo,
   proteína e gordura, além das calorias.
3. **Tabela nutricional completa** — bloco recolhível na refeição e na porção, com `undefined ≠ 0`
   e asterisco quando o total é parcial.
4. **Fluxo de adicionar corrigido** — quem entra pela refeição volta para ela (`router.dismissTo`),
   quem entra pelo FAB volta ao diário.
5. **Gestão de itens** — confirmação para excluir, seleção múltipla, "limpar tudo" e **edição de item
   já lançado** (reabre a porção, e dá para mover de refeição sem duplicar).
6. **Multi-dia** — o defeito conceitual mais grave foi resolvido: o diário guarda por data e a tira
   semanal navega de verdade, inclusive para **preencher um dia esquecido**.
7. **Peso alvo + previsão** — simulação semana a semana, ritmo opcional (0,25–1 kg/sem), pisos de
   segurança e aviso de IMC baixo.
8. **Limpezas pedidas pelo dono** — sumiram da tela os multiplicadores de atividade (×1.55) e o
   "TMB · TDEE"; ficou só o rótulo do objetivo. Os valores seguem no código.

### Decisão pendente (retomar por aqui)

O dono perguntou por que, com **ritmo fixo**, mudar o nível de atividade não muda a previsão.
**Não é bug:** com a velocidade fixa, a atividade muda a *meta de calorias* (2.901 → 3.353 kcal nos
dados dele), não o prazo; no **Automático** a atividade muda o prazo (99 → 89 semanas). Os textos da
tela foram reescritos para explicar isso.

**Ficou uma pergunta sem resposta:** hoje o único freio de ritmo agressivo é o piso da TMB. 1 kg/semana
para alguém de 150 kg é ~0,67% do peso (seguro), mas para alguém de 60 kg é 1,67% (agressivo) e passa
batido. Foi oferecido acrescentar um **aviso quando o ritmo passar de ~1% do peso corporal por semana**
— o dono ainda não respondeu.

## Pendências / próximos passos

> **Próximo passo recomendado: Relatórios (E7).** É o último "must have" do MVP que ainda é placeholder,
> e o multi-dia acabou de destravá-lo — agora existe histórico para plotar.

1. **Relatórios (E7)** — gráficos diário/semanal/mensal (tela ainda é placeholder). Agora **destravado**:
   o histórico existe e `kcalByDay()` (em `store/diary.ts`) já entrega a série pronta. Já há
   `react-native-svg` no projeto para desenhar. Atenção: sem dados de vários dias a tela parece vazia —
   vale um estado inicial que explique isso em vez de um gráfico em branco.
2. **Onboarding de 1ª vez (E1)** — hoje o app abre com um perfil padrão editável no Perfil.
3. **Aba Alimentos** — ainda é placeholder (favoritos / recentes / base).
4. **Escanear (código de barras)** e **Foto com IA** — ainda stubs (foto por IA é a última fase).
5. **Backend** (Supabase) + **dados nutricionais reais** — ver §4.4.1 do plano:
   base própria semeada por **TACO + TBCA** (Brasil, estáticos) + **Open Food Facts** (barcode, API pública
   sem chave) + **USDA FDC** (micros). Nunca depender de API de terceiro em tempo real. Checar licenças
   (Open Food Facts é ODbL, exige atribuição).
6. **Metas — refinos do plano §E2**: override manual dos macros, meta de fibra (~14 g/1000 kcal) e
   alerta de açúcar acima de 10% das calorias (referência OMS).
7. **Histórico de peso** — hoje o peso é um número único no perfil. Guardar a série permitiria mostrar
   progresso real contra o peso alvo (o plano prevê "evolução de peso" na fase 2).
8. **Aviso de ritmo agressivo** — ver "Decisão pendente" acima; falta o dono confirmar.
9. **Lint** — sobra 1 erro herdado do template em `src/hooks/use-color-scheme.web.ts`
   (`setState` dentro de `useEffect`). Nunca foi tocado; some com um `useSyncExternalStore` ou
   silenciando a regra naquele arquivo.

## Armadilhas conhecidas (importante)

- **Expo SDK 56+ não permite importar `@react-navigation/*` direto** — o bundle quebra com
  *"expo-router is no longer compatible with react-navigation"*. Use os shims vendorizados, ex.:
  `import { createMaterialTopTabNavigator } from 'expo-router/js-top-tabs'`.
- **`router.dismissAll()`** só funciona quando existe pilha (fluxo real via FAB → modal). Em acesso direto
  por URL use o padrão já aplicado: `router.canDismiss() ? dismissAll() : replace('/(tabs)')`.
- **Testar interação no preview web é instável** (o HMR corrompe o estado e o pager "engole" toques).
  Se algo parecer quebrado no navegador, **reinicie com `--clear`** e recarregue a página. O alvo real é o
  device — no celular funciona normalmente.
- **Rotas novas**: os tipos do `expo-router` (`typedRoutes`) só regeneram quando o servidor roda. Se o
  `tsc` reclamar que uma rota nova não existe, rode `npx expo start` uma vez e cheque de novo.
- Ao lançar item no diário, **congele (snapshot) os macros** no item — se a base do alimento mudar depois,
  o histórico continua correto.
- **As refeições não são um tipo fixo.** Foram (`MealKey = 'cafe' | 'almoco' | …`) e deixaram de ser: hoje
  são dados editáveis em `src/store/meals.ts`, indexados por `MealId` (string). Nada pode assumir quantas
  ou quais existem — `lib/pacing` recebe a lista por parâmetro justamente por isso. A **fatia % da meta
  mora na própria refeição**, não num `split` separado, para não sobrar percentual órfão ao excluir uma.
- Em nutriente opcional, **`undefined` ≠ `0`**: "não sabemos" não é "não tem". `macrosForGrams` preserva o
  `undefined` ao escalar, e `sumNutrient` (em `lib/nutrition.ts`) conta quantos itens tinham o dado — o
  total ganha `*` quando é um piso, não o valor real. Não troque isso por `?? 0`.
- **No preview web o estado não sobrevive ao reload** (o AsyncStorage não persiste ali). Testar
  persistência exige o device — no Expo Go funciona.
- **Não use `Modal` do React Native nem `Alert.alert` para confirmar ação.** O `Alert` é no-op na web; o
  `Modal` monta **fora do `#root`** no react-native-web e, como o React só escuta eventos dentro do root,
  os botões ficam inertes no navegador (parece travado, sem erro no console). Use
  `components/ui/confirm-dialog.tsx`, que é um overlay absoluto na própria árvore.
- `StyleSheet.absoluteFillObject` **não existe** nos tipos do RN 0.86 (só `absoluteFill`). Para espalhar
  num objeto de estilo, escreva `position/top/right/bottom/left` na mão.
- **Datas: nunca use `toISOString()`** para a chave do dia. Ela converte para UTC e, no Brasil (UTC-3),
  tudo que for registrado depois das 21h cai no dia seguinte. Use `dateKey()` de `lib/date.ts`, que monta
  a chave a partir dos componentes locais. Pelo mesmo motivo, os nomes de mês/dia são tabelas fixas e não
  `toLocaleDateString` — o Hermes sai sem ICU completo em alguns builds Android e volta em inglês.
- O **dia selecionado não é persistido** (`store/day.ts`), de propósito: abrir o app deve cair em hoje,
  não no dia que você estava olhando ontem à noite.

## Como rodar

```bash
cd nofoco
npm install     # só na primeira vez / após clonar
npm start       # abre o Metro + QR code
```

Instale o **Expo Go** no celular e escaneie o QR (Android: pelo app; iPhone: pela Câmera), com o celular na
**mesma rede Wi-Fi**. Se a rede bloquear, use `npx expo start --tunnel`.

Para conferir no navegador: `npx expo start --web` (lembrando da instabilidade de interação acima).

## Convenções

- Textos da interface em **português (Brasil)**, tom encorajador e **sem culpa**.
- Comentários e nomes de código podem ser em português, seguindo o que já existe.
- Números na UI sempre com `fontVariant: ['tabular-nums']` quando alinhados em coluna.
- O app é **estimativa informativa** — sempre manter o disclaimer de que não substitui nutricionista/médico.
