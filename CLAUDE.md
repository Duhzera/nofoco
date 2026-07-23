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
- **Adicionar:** modal com 3 modos → **Pesquisar** (funcional) · Escanear e Foto (ainda stubs).
- **Seletor de porção (E4.1)** (`src/app/porcao.tsx`): alterna **Unidade ⇆ Gramas**, converte o valor ao
  trocar de modo, recalcula macros/micros ao vivo, escolhe a refeição e **salva**.
- **Detalhe da refeição** (`src/app/refeicao.tsx`): resumo de macros, itens, remover, adicionar.
- **Perfil + metas** (`src/app/(tabs)/perfil.tsx` + `src/lib/goal.ts`): **Mifflin-St Jeor** → TDEE →
  ajuste por objetivo; macros calculados; **distribuição por refeição personalizável** (% ajustável).
- **Orientação adaptativa** (`src/lib/pacing.ts`): distribui a meta entre refeições e, conforme a pessoa
  come mais/menos, **redistribui o orçamento restante** e mostra mensagens ("pode ingerir até ~X kcal aqui",
  "segure em ~Y", "no ritmo 👍") — sem tom de culpa.

**Dados de alimentos:** hoje são **mock** em `src/data/foods.ts` (modelo já correto: valores por 100 g +
`unitGrams`). Integração com dados reais ainda não foi feita.

## Pendências / próximos passos

1. **Relatórios** — gráficos diário/semanal/mensal (tela ainda é placeholder).
2. **Onboarding de 1ª vez** — hoje o app abre com um perfil padrão editável no Perfil.
3. **Escanear (código de barras)** e **Foto com IA** — ainda stubs (foto por IA é a última fase).
4. **Backend** (Supabase) + **dados nutricionais reais** — ver §4.4.1 do plano:
   base própria semeada por **TACO + TBCA** (Brasil, estáticos) + **Open Food Facts** (barcode, API pública
   sem chave) + **USDA FDC** (micros). Nunca depender de API de terceiro em tempo real. Checar licenças
   (Open Food Facts é ODbL, exige atribuição).
5. **Multi-dia** — o diário hoje guarda um único dia; datas entram junto com o backend.

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
