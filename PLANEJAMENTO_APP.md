# Planejamento de Desenvolvimento — NoFoco (Android & iOS)

> **NoFoco — "Seu diário alimentar inteligente".** Documento de arquitetura e planejamento de produto para um aplicativo mobile de contagem de calorias e macronutrientes, com leitura de código de barras, busca de alimentos, reconhecimento por foto (IA), diário por refeições, gráficos de consumo e metas personalizadas por objetivo.

**Versão:** 1.1
**Data:** 23/07/2026
**Plataformas-alvo:** Android e iOS (app único, base de código compartilhada)
**Direção visual:** dark-first, verde lima, macros coloridos — ver seção 6 (mockup aprovado).

---

## 1. Visão do Produto

### 1.1 Problema
Controlar a alimentação hoje exige disciplina e fricção alta: pesar, buscar, digitar. A maioria dos apps é lenta no cadastro de refeição e pouco intuitiva. O objetivo aqui é **reduzir ao máximo o atrito** de registrar o que se come, oferecendo três caminhos rápidos:

1. **Código de barras** → escanear e adicionar em 2 toques.
2. **Busca por nome** → "pão de queijo" → resultado com macros.
3. **Foto do prato** → IA estima os alimentos e macros aproximados.

### 1.2 Proposta de valor
- Registro em segundos (barcode + foto).
- Metas de macros calculadas automaticamente pelo perfil e objetivo do usuário.
- Visão clara de progresso: diário, semanal e mensal.
- Diário organizado por refeições reais do usuário (ele define quantas faz e os horários).

### 1.3 Público-alvo
Pessoas que querem emagrecer, manter peso ou ganhar massa, com ou sem conhecimento técnico de nutrição.

> ⚠️ **Aviso de escopo (importante):** o app oferece **estimativas informativas**, não prescrição nutricional. Metas e recomendações não substituem acompanhamento de nutricionista/médico. Isso deve constar em disclaimer no onboarding e no cálculo de metas.

---

## 2. Escopo Funcional (Épicos)

| # | Épico | Descrição resumida |
|---|-------|--------------------|
| E1 | Onboarding & Perfil | Cadastro de dados (idade, sexo, peso, altura, nível de atividade, objetivo). |
| E2 | Cálculo de Metas | Geração automática de meta de calorias e macros por objetivo. |
| E3 | Registro por Código de Barras | Scanner + busca em base de produtos. |
| E4 | Busca de Alimentos | Busca textual em base nutricional (ex.: "pão de queijo"). |
| E5 | Registro por Foto (IA) | Foto do prato → reconhecimento + estimativa de macros/micros. |
| E6 | Diário Alimentar | Refeições configuráveis (quantidade/horários), lançamento de itens e porções. |
| E7 | Dashboards & Gráficos | Visão diária, semanal e mensal de calorias e nutrientes. |
| E8 | Metas & Acompanhamento | Comparação consumo x meta, anéis de progresso, alertas. |
| E9 | Conta & Sincronização | Login, backup na nuvem, multi-dispositivo. |
| E10 | Configurações & Perfil | Unidades, notificações, ajuste manual de metas, privacidade/LGPD. |

### 2.1 Priorização (MoSCoW) para o MVP

**Must have (MVP):** E1, E2, E4 (busca), E6 (diário), E7 (gráfico diário/semanal), E8.
**Should have:** E3 (código de barras), E9 (login/sync), gráfico mensal.
**Could have:** E5 (foto por IA), micronutrientes detalhados, integração com Health/Google Fit.
**Won't (agora):** rede social, receitas geradas por IA, plano alimentar automático.

> **Recomendação de arquiteto:** E5 (foto por IA) é o recurso mais "vendável", porém o mais caro e impreciso. Trate-o como **diferencial de fase 2**, não bloqueador do MVP. Um MVP sólido de busca + barcode + diário + metas já entrega valor real e valida o produto.

---

## 3. Detalhamento das Funcionalidades

### E1 — Onboarding & Perfil
Coleta:
- Sexo biológico (impacta fórmula metabólica).
- Idade / data de nascimento.
- Altura (cm) e peso atual (kg).
- Peso alvo (opcional).
- Nível de atividade física (sedentário → muito ativo).
- Objetivo: **perder peso**, **manter peso**, **ganhar massa**, **ganhar massa com perda de gordura (recomposição)**.
- Unidades (kg/lb, cm/ft) e fuso/horário.

### E2 — Cálculo de Metas (motor nutricional)

**Passo 1 — Taxa Metabólica Basal (TMB)** via *Mifflin-St Jeor* (padrão-ouro clínico):

```
Homens:  TMB = 10*peso(kg) + 6.25*altura(cm) - 5*idade + 5
Mulheres: TMB = 10*peso(kg) + 6.25*altura(cm) - 5*idade - 161
```

**Passo 2 — Gasto Total (TDEE)** = TMB × fator de atividade:

| Nível | Fator |
|-------|-------|
| Sedentário | 1.2 |
| Levemente ativo | 1.375 |
| Moderadamente ativo | 1.55 |
| Muito ativo | 1.725 |
| Extremamente ativo | 1.9 |

**Passo 3 — Ajuste por objetivo:**

| Objetivo | Ajuste calórico | Estratégia de macro |
|----------|-----------------|---------------------|
| Perder peso | −15% a −20% do TDEE | Proteína alta, gordura moderada |
| Manter peso | TDEE | Distribuição equilibrada |
| Ganhar massa | +10% a +15% do TDEE | Carbo alto, proteína alta |
| Recomposição | ~TDEE (déficit leve −5%) | **Proteína bem alta** (~2 g/kg) |

**Passo 4 — Distribuição de macros (exemplo default, ajustável):**
- Proteína: 1.6–2.2 g/kg de peso (por objetivo).
- Gordura: 0.8–1.0 g/kg.
- Carboidrato: calorias restantes ÷ 4.
- Fibras: meta ~14 g / 1000 kcal.
- Açúcar: alerta se > 10% das calorias (referência OMS).

> A tela de metas deve permitir **override manual** (usuário avançado ajusta os gramas) e mostrar como cada valor foi calculado (transparência gera confiança).

### E3 — Código de Barras
- Câmera com leitor de barras (EAN-13, EAN-8, UPC).
- Consulta em base local (cache) → se não achar, consulta API externa (Open Food Facts).
- Se produto inexistente: fluxo de **"contribuir/cadastrar produto"** (nome, marca, tabela nutricional, foto do rótulo).
- Ajuste de porção (g/ml ou unidades) antes de confirmar.

### E4 — Busca de Alimentos
- Busca com *autocomplete* e tolerância a acento/erro de digitação.
- Base combinada: alimentos genéricos (ex.: TACO – Tabela Brasileira de Composição de Alimentos) + produtos de marca (Open Food Facts).
- Resultado mostra macros por porção padrão; usuário ajusta quantidade.
- Favoritos e "recentes" para acelerar re-registro.

### E4.1 — Seletor de Porção (Unidade ↔ Gramas) — *requisito-chave*

O usuário deve poder **registrar a porção por unidade OU por peso exato (g/ml)**, alternando livremente entre os dois modos. Motivação real: "peguei um pouco mais de 1 pão de queijo" → em vez de travar em "1 unidade (50 g)", digitar **80 g** e os macros recalculam na hora.

**Comportamento:**
- Todo alimento tem uma **medida caseira padrão** com peso equivalente (ex.: pão de queijo → *1 unidade média ≈ 50 g*).
- Um **alternador (toggle/segmented)** troca o modo de entrada: **`Unidade` ⇆ `Gramas`** (e `ml` para líquidos).
  - Modo **Unidade:** stepper `−  1 unid (50 g)  +` (mostra o peso equivalente como referência).
  - Modo **Gramas:** campo numérico editável → usuário digita `80` g (teclado numérico); pode usar também `+`/`−` com passo configurável (ex.: 5 g ou 10 g).
- Alternar o modo **converte o valor atual**, não zera (ex.: de "1,5 unid" ao trocar para gramas mostra "75 g").
- **Todos os macros e micros recalculam em tempo real** ao mudar unidade, quantidade ou modo.
- Suporte a **quantidades fracionadas** de unidade (ex.: 0,5 · 1 · 1,5 · 2) e a **decimais em gramas**.
- Para produtos de marca com **porção do rótulo** (ex.: "1 porção = 30 g"), oferecer as opções: *porção do rótulo*, *unidade* (se aplicável) e *gramas*.
- Medidas caseiras adicionais quando fizer sentido (ex.: "colher de sopa", "fatia", "copo") — cada uma com seu peso equivalente em gramas.

**Modelo de dados (impacto):** cada `Food` guarda um conjunto de **`ServingOptions`** (medidas): `{ rotulo, tipo: unidade|caseira|peso, gramas_equivalentes }`. O cálculo sempre normaliza para **gramas** internamente e deriva os macros a partir dos valores por 100 g. No `DiaryEntry` grava-se o `quantidade`, a `unidade escolhida` e o `peso_em_gramas` resultante (além do snapshot nutricional).

> **Regra de UX:** o modo escolhido pelo usuário para aquele alimento fica **memorizado** — se ele sempre lança pão de queijo em gramas, o app abre já em gramas na próxima vez.

### E5 — Registro por Foto (IA) — *Fase final (fase 2)*

> **Nota de escopo:** este recurso só será implementado ao final do roadmap. Mesmo assim, o fluxo já fica especificado aqui para orientar as decisões de modelo de dados e UI desde o início (o seletor de porção E4.1 é compartilhado).

**Contexto de captura:** a foto é tirada **de dentro de uma refeição** (ex.: usuário está no card "Almoço" e toca em tirar foto). Tudo o que a IA identificar entra **naquela refeição**, já com data/horário. Deve ser possível também trocar a refeição de destino antes de salvar.

**Fluxo detalhado:**
1. Dentro da refeição (ex.: Almoço), usuário fotografa o prato (ou escolhe da galeria).
2. Imagem enviada ao serviço de **reconhecimento de alimentos** (visão computacional).
3. A IA retorna uma **lista de itens detectados**, cada um com: nome, **quantidade estimada em gramas**, macros/micros aproximados e um indicador de **confiança**.
4. App exibe uma **tela de revisão com todos os itens em lista** (checkbox por item — vêm todos marcados por padrão):
   - Cada linha mostra o alimento + a **porção estimada editável** (usando o seletor **E4.1**: unidade ⇆ gramas).
   - Usuário ajusta o que souber: *"a IA chutou 100 g de arroz, mas eu sei que foram ~150 g"* → digita 150 g e os macros recalculam na hora.
   - Pode **remover** um item errado, **adicionar** um item que a IA não viu (cai na busca E4) e **corrigir a identidade** (ex.: trocou "frango" por "peixe").
5. **Preencher tudo de uma vez:** botão que aceita todas as estimativas como estão (para quem só quer registrar rápido) — os itens entram na refeição com as quantidades sugeridas.
6. Rodapé com **total agregado** (kcal + macros somados de todos os itens) atualizando ao vivo → botão **"Adicionar ao diário"** lança todos os itens de uma vez na refeição.

**Por que isso deixa o recurso preciso:** o gargalo do reconhecimento por foto não é *identificar* o alimento, é *estimar a quantidade*. Ao deixar o usuário **corrigir os gramas por item** (que ele frequentemente sabe de cabeça), a estimativa da IA vira só um ponto de partida — a precisão final vem da edição rápida. Isso também reduz a responsabilidade do app sobre números errados (confirmação humana obrigatória).

**Aprendizado:** registrar (de forma anônima/consentida) as correções de quantidade e identidade para medir acurácia e melhorar prompt/modelo ao longo do tempo.

**Opções técnicas:**
- Modelo multimodal (ex.: LLM com visão) via API — mais flexível, custo por chamada.
- API especializada de food-recognition (ex.: LogMeal, Passio, Foodvisor) — mais focada, licença.
- Modelo *on-device* (Core ML / TensorFlow Lite) — offline e privado, porém menos preciso.

> **Decisão recomendada:** começar com API de visão (rápido de integrar, sem treinar modelo), medir custo por foto e acurácia real com usuários. Migrar para on-device só se volume justificar. **Sempre** manter etapa de confirmação humana — reduz responsabilidade sobre número errado.

### E6 — Diário Alimentar
- Usuário configura **quais refeições faz** (ex.: Café, Lanche manhã, Almoço, Lanche tarde, Jantar, Ceia) e horário aproximado de cada.
- Cada refeição é um "bucket" onde entram os itens.
- Cada item = alimento + quantidade + macros calculados.
- Ações: adicionar, editar porção, duplicar item, mover entre refeições, copiar refeição de outro dia.
- Rodapé fixo com **total do dia x meta** sempre visível.

### E7 — Dashboards & Gráficos
- **Diário:** anéis de progresso (kcal, P/C/G), lista de refeições, saldo restante.
- **Semanal:** barras por dia + média; adesão à meta.
- **Mensal:** tendência (linha) de calorias e peso; heatmap de dias dentro/fora da meta.
- Detalhe por nutriente: calorias, carboidratos, proteínas, gorduras (total/saturada), açúcares, fibras, sódio; micronutrientes na fase 2.

### E8 — Metas & Acompanhamento
- Comparação consumo x meta em tempo real.
- Registro de peso periódico → gráfico de evolução.
- Ajuste dinâmico: ao mudar peso, sugerir recalcular metas.

---

## 4. Arquitetura Técnica

### 4.1 Decisão de stack (multiplataforma) — **DEFINIDA: Expo (React Native + TypeScript)**

**Escolha final: Expo / React Native + TypeScript.** Decidido em 23/07/2026.

| Critério | Expo/React Native ✅ escolhido | Flutter | Nativo (Kotlin + Swift) |
|----------|------------------------------|---------|--------------------------|
| Base única iOS+Android | ✅ Boa | ✅ Excelente | ❌ Dobra o trabalho |
| Começar já no ambiente atual (Windows) | ✅ Node já instalado | ❌ precisa instalar SDK | ❌ |
| Build iOS sem Mac | ✅ EAS Build (nuvem) | 🟡 via Codemagic | ❌ exige Mac |
| Animação/efeitos premium | ✅ Reanimated 3 + Moti + Skia | ✅ nativo do framework | ✅ |
| Atualização OTA (sem loja) | ✅ Expo Updates | ❌ | ❌ |
| Ecossistema / contratação | ✅ enorme (JS/TS) | 🟡 Dart nichado | 🟡 |

> **Por que Expo/RN:** ambiente já pronto (Node), build iOS na nuvem sem Mac, ecossistema e contratação fáceis, e OTA para iterar rápido. O app é visual, mas a beleza/animação será entregue com **Reanimated 3 + Moti + React Native Skia** (nível premium). Flutter foi forte candidato pela fidelidade visual, mas o atrito de setup e o mercado Dart menor pesaram contra.

### 4.2 Arquitetura de app (client) — React Native
- Estrutura em camadas: `app/` (telas/rotas) → `features/` (domínio por funcionalidade) → `data/` (repositories) → `services/` (API, DB local).
- **Navegação:** **Expo Router** (file-based, tabs + stacks).
- **Estado:** **Zustand** (simples) ou **Redux Toolkit** para estado global; **React Query (TanStack Query)** para dados do servidor/cache.
- **Persistência local:** **SQLite** (`expo-sqlite` / Drizzle ORM ou WatermelonDB) — diário funciona offline; cache de alimentos.
- **Animação:** **Reanimated 3** + **Moti** (transições/microinterações) + **React Native Skia** (gráficos/anéis customizados).
- **UI/estilo:** design system próprio com tokens (seção 6); componentes com **NativeWind** (Tailwind p/ RN) ou StyleSheet tipado.
- **Sincronização:** fila offline-first, resolvida contra o backend quando online.

### 4.3 Backend
- **BaaS para acelerar MVP:** Supabase (Postgres + Auth + Storage) ou Firebase (Auth, Firestore, Storage, Functions).
- **Recomendação:** *Supabase* — SQL estruturado combina com a base nutricional e buscas. **Decisão pendente** (pode-se começar só pelo app com dados locais e plugar depois).
- Camada de API própria (Cloud Functions / serverless) para:
  - Intermediar chamadas às APIs de nutrição (esconder chaves).
  - Processar reconhecimento por foto (E5).
  - Recalcular metas.

### 4.4 Fontes de dados nutricionais
| Fonte | Uso | Observação |
|-------|-----|-----------|
| **Open Food Facts** | Código de barras / produtos de marca | Gratuita, aberta, colaborativa; cobertura Brasil crescente. |
| **TACO (Unicamp)** | Alimentos genéricos brasileiros | Confiável para comida "in natura"/preparações típicas. |
| **USDA FoodData Central** | Complemento genérico | Rico em micronutrientes. |
| APIs comerciais (Nutritionix, Edamam) | Fallback de busca | Custo por requisição; avaliar licença. |

> **Estratégia:** montar uma **base própria consolidada** (importar TACO + Open Food Facts para o backend) para não depender de latência/limite de API externa nas buscas mais comuns. APIs externas ficam como *fallback*.

#### 4.4.1 — Nota de decisão: garantir dados fiéis (a resolver antes de integrar dados reais)

> **Pergunta respondida em 23/07/2026** — de onde virão os dados reais e o que "com certeza funciona".

**Princípio:** nunca depender de API de terceiro em tempo real para as buscas comuns. Montar **base própria no Supabase**, semeada por fontes autoritativas; APIs externas só como complemento/fallback. Ganhos: velocidade, offline e confiabilidade (não quebra se um serviço cair).

**Fontes com certeza de funcionamento:**
- **TACO (UNICAMP/NEPA)** — referência oficial de alimentos brasileiros (in natura e preparações). Dado **estático**; importar 1x (CSV/JSON) → 100% sob nosso controle, sem chamada de rede.
- **TBCA (USP/FoRC)** — complemento brasileiro, mais itens. Importar para a base.
- **Open Food Facts** — produtos de marca / **código de barras**. API REST **pública, grátis e sem chave** (`https://world.openfoodfacts.org/api/v2/product/{barcode}.json` e endpoint de busca). Também há **dump completo** (CSV/Parquet/MongoDB) para hospedar e não depender do uptime deles.
- **USDA FoodData Central** — API oficial grátis (com chave `api.nal.usda.gov/fdc/v1`), rica em micronutrientes. Fallback/complemento (alimentos majoritariamente dos EUA).
- Comerciais (FatSecret Platform, Nutritionix, Edamam) — só se necessário; pagos/limite grátis e licença.

**Plano de dados recomendado:**
1. Importar **TACO + TBCA** para a base (alimentos genéricos BR).
2. Sincronizar/hospedar **Open Food Facts** (barcode) — dump periódico + API ao vivo como fallback para código não encontrado.
3. **USDA** para enriquecer micronutrientes quando faltar.
4. Fluxo de **cadastro colaborativo** do usuário para produtos ausentes (com moderação).

**Pontos a verificar antes de integrar:** licença/atribuição de cada fonte (TACO/TBCA têm termos de uso acadêmico; OFF é Open Database License — exige atribuição), formato/frequência de atualização, e normalização de unidades para o modelo `Food`/`ServingOptions` (ver §5 e E4.1).

### 4.5 IA de reconhecimento por foto (E5)
- Endpoint próprio (Cloud Function) que recebe imagem → chama serviço de visão → normaliza resposta → devolve itens estimados.
- Guardar imagem apenas com consentimento; opção de não armazenar (privacidade).
- Log de acurácia (usuário corrigiu? o quê?) para melhorar prompt/modelo.

---

## 5. Modelo de Dados (visão lógica)

```
User
 ├─ id, email, createdAt
 └─ Profile (idade, sexo, altura, peso, atividade, objetivo, unidades)

Goal (derivado do Profile)
 ├─ kcal, proteina_g, carbo_g, gordura_g, fibra_g, acucar_max_g
 └─ origem: automatico | manual, updatedAt

MealSetting        // configuração das refeições do usuário
 └─ nome, horario_aprox, ordem

Food               // alimento na base (genérico ou produto)
 ├─ id, nome, marca, barcode?, fonte (TACO/OFF/USDA/user)
 ├─ nutrientes/100g: kcal, prot, carbo, gord, gord_sat, acucar, fibra, sodio, micros...
 └─ ServingOptions[]   // medidas disponíveis (ver E4.1)
      └─ { rotulo, tipo: unidade|caseira|peso|rotulo, gramas_equivalentes }
         ex.: {"1 unidade média", unidade, 50}, {"grama", peso, 1}, {"colher sopa", caseira, 15}

DiaryEntry         // um item lançado no diário
 ├─ id, userId, data, mealSettingId
 ├─ foodId (ref) | snapshot nutricional (para itens de IA/manuais)
 ├─ quantidade, unidade_escolhida, peso_em_gramas   // normaliza p/ gramas (E4.1)
 ├─ origem: barcode | busca | foto_ia | manual
 └─ macros_calculados

WeightLog
 └─ userId, data, peso
```

> **Regra importante:** ao lançar no diário, **congelar (snapshot)** os valores nutricionais no `DiaryEntry`. Se a base do alimento mudar depois, o histórico do usuário permanece correto.

---

## 6. UX / UI — Direção Visual Definitiva (NoFoco)

> **Referência oficial aprovada em 23/07/2026.** Todo o desenvolvimento de UI deve seguir o mockup aprovado (dark-first, verde lima como cor primária, cada macronutriente com cor própria). O design abaixo é o *source of truth* — telas, cores e componentes devem replicar essa linguagem. Ver arquivo de referência: `mockup-nofoco.png`.

### 6.1 Marca
- **Nome:** NoFoco
- **Assinatura:** "Seu diário alimentar inteligente"
- **Wordmark:** "No**Foco**" com "Foco" em verde lima (dá sentido de foco/hábito).
- **Logo:** ícone em traço na cor verde lima — explorar entre alvo/foco (bullseye) ou maçã/folha (nutrição); definir na fase de identidade visual.
- **Tom:** moderno, saudável, encorajador, sem culpa. O nome reforça **foco e constância** no acompanhamento.

### 6.2 Princípios de interação
- **Registro em ≤ 3 toques** nos fluxos comuns.
- **FAB "+" central** sempre acessível na barra inferior → abre Escanear / Pesquisar / Foto.
- Feedback visual imediato (anéis e barras animando ao adicionar item).
- Cores por macro consistentes em toda a interface (viram "linguagem": bate o olho e sabe o que é).
- **Dark-first**: o app nasce em modo escuro (identidade principal); tema claro é variante secundária.

### 6.3 Paleta de cores (tokens)

**Base (dark theme — principal):**
| Token | Hex aprox. | Uso |
|-------|-----------|-----|
| `bg/base` | `#0D0F0D` | Fundo geral (quase preto, leve viés verde) |
| `bg/surface` | `#1A1D1A` | Cards e barras |
| `bg/surface-2` | `#242824` | Campos, chips, elementos elevados |
| `text/primary` | `#F2F5F0` | Texto principal |
| `text/secondary` | `#9BA298` | Texto de apoio, legendas |
| `border/hairline` | `#2C312B` | Divisórias sutis |

**Accent (marca):**
| Token | Hex aprox. | Uso |
|-------|-----------|-----|
| `accent/primary` | `#A6E052` | Verde lima — botões, seleção, destaques, dia atual |
| `accent/pressed` | `#8FC93F` | Estado pressionado |
| `accent/on` | `#0D0F0D` | Texto/ícone sobre o verde (escuro, não branco) |

**Cores por nutriente (dado categórico — fixas em todo o app):**
| Nutriente | Hex aprox. | Token |
|-----------|-----------|-------|
| Carboidratos | `#F2A33C` (laranja) | `macro/carb` |
| Proteínas | `#4A9DE0` (azul) | `macro/protein` |
| Gorduras | `#E86FA6` (rosa) | `macro/fat` |
| Calorias | `#A6E052` (verde) | `macro/kcal` |
| Fibra / micros | `#5BC0A8` (verde-azulado) | `micro/generic` |

**Semânticas:**
- Dentro da meta = verde `accent/primary`; atenção/excesso = laranja; estouro crítico = vermelho `#E2574C`.

### 6.4 Tipografia
- **Família:** sans-serif geométrica moderna (ex.: **Inter**, **Manrope** ou **SF Pro / Roboto** nativas). Números com `tabular-nums`.
- **Escala:**
  - Display/valor grande (kcal do anel): ~34–40 px, peso 800.
  - Título de tela: 20–22 px, peso 700.
  - Corpo/label: 13–15 px, peso 500–600.
  - Legenda/caption: 11–12 px, peso 500, cor `text/secondary`.
- **Sentence case** em toda a UI (sem CAIXA ALTA de títulos).

### 6.5 Componentes-chave
- **Anel de progresso** (kcal): gauge semicircular ou circular com trilha `bg/surface-2` e preenchimento em `accent`/multicor por macro; valor grande no centro + "de 2.190 kcal" e "% da meta".
- **Barras de macro:** rótulo + valor `consumido / meta` + barra fina colorida por macro.
- **Card de refeição:** ícone, nome, horário, kcal à direita; expande para itens.
- **Item de alimento:** miniatura/ícone redondo, nome, porção (peso), kcal; check verde quando selecionado.
- **Stepper de porção com alternador de medida:** toggle `Unidade ⇆ Gramas` (e `ml`). Em unidade: `−  1 unid (50 g)  +`; em gramas: campo editável (ex.: `80 g`). Recalcula macros ao vivo. Botão "Adicionar {kcal}" em verde. Ver requisito **E4.1**.
- **Chips de objetivo / abas:** pílula com borda; selecionada em verde.
- **Bottom tab bar:** 5 itens (Diário · Relatórios · **+** · Alimentos · Perfil) com FAB verde central elevado.
- **Botões:** primário = preenchido verde com texto escuro; secundário = contorno claro sobre fundo escuro.
- **Cantos:** raio generoso (12–16 px em cards, pílulas nos chips).

### 6.6 Telas do fluxo (conforme mockup aprovado)
1. **Boas-vindas** — logo + 4 benefícios com ícones, foto de bowl saudável, "Bem-vindo ao NoFoco", botões *Criar conta* / *Entrar*.
2. **Onboarding — dados** — "Conte mais sobre você": nome, idade, sexo, altura, peso; objetivo em 4 cartões (Perder peso · Manter peso · Ganho de massa · Ganho de massa com perda de peso).
3. **Meta diária** — anel de calorias (ex.: 2.190 kcal, "Déficit moderado"), macros com gramas e %, "Micros principais" (Fibras, Cálcio, Ferro, Vitamina C), botão *Entendi*.
4. **Diário (Home)** — cabeçalho "Hoje", tira de dias da semana (dia atual em verde), anel 1.350/2.190 kcal + % da meta, barras de macro, lista de refeições com horário e kcal, "+ Adicionar refeição".
5. **Adicionar — Escanear** — abas Escanear/Pesquisar/Foto, moldura de câmera para código de barras, "Ou digite o código manualmente", botão de lanterna.
6. **Adicionar — Pesquisar** — busca "Pão de queijo", filtros (Todos/Alimentos/Refeições/Marcas), resultados com porção e kcal, barra inferior com stepper + *Adicionar*.
7. **Detalhe da refeição (ex.: Almoço)** — resumo de macros no topo, lista de itens com peso e kcal, *Adicionar alimento*.
8. **Relatórios** — abas Diário/Semanal/Mensal, gráfico de barras de calorias + média, donut de macros (média semanal com % e g), lista de micros com % da meta.
9. **Análise do alimento (Foto/IA)** — foto do prato, "Estimativa com IA", macros estimados, detalhamento (açúcares, fibras, sódio), aviso "*Valores aproximados. Edite as porções se necessário.*", *Adicionar ao diário*.

### 6.7 Rodapé de marca (institucional)
Quatro selos de confiança: sincronização entre dispositivos · base de alimentos sempre atualizada · privacidade e segurança dos dados · disponível para iOS e Android.

### 6.8 Acessibilidade & Responsividade
- Contraste AA mínimo — atenção especial ao verde sobre fundo escuro (usar `accent/on` escuro sobre botões verdes).
- Suporte a fontes grandes (Dynamic Type / escala do sistema).
- Layout adaptável a telas pequenas e tablets.
- Toque mínimo 44×44 pt.
- Tema claro como variante (mesmos tokens, superfícies claras) — não obrigatório no MVP, mas arquitetar os tokens para permitir.

### 6.9 Diretrizes de plataforma
- Respeitar **Material 3** (Android) e aproximar de **Human Interface Guidelines** (iOS) onde faz diferença (gestos, navegação, permissões).
- Ícones e permissões de câmera com textos claros de justificativa (exigência das lojas).

---

## 7. Notificações & Engajamento
- Lembretes por refeição (baseados nos horários configurados).
- Resumo diário à noite (consumo x meta).
- Lembrete de registro de peso (semanal).
- **Sem spam:** tudo configurável e opt-in.

---

## 8. Privacidade, Segurança e Conformidade
- **LGPD (Brasil)** e boas práticas GDPR: consentimento explícito, finalidade clara, direito de exclusão de conta e dados.
- Dados de saúde são **sensíveis** → criptografia em trânsito (TLS) e em repouso.
- Foto de alimento: processar e, se possível, **não reter**; se retiver, com consentimento e exclusão fácil.
- Login: e-mail/senha + social (Google/Apple). **Sign in with Apple é obrigatório** na App Store se houver outro login social.
- Política de Privacidade e Termos de Uso publicados (exigência das lojas + "Nutrition/Health" data labels).
- Nunca coletar dado de saúde sem necessidade real (minimização).

---

## 9. Testes & Qualidade
- **Unitários:** motor de cálculo de metas e conversões de porção (crítico — números errados quebram a confiança).
- **Integração:** repositórios, sync offline/online.
- **Widget/UI:** telas principais.
- **E2E:** fluxos de registro (barcode, busca, diário).
- **Testes de dispositivos reais:** câmera/scanner variam muito entre aparelhos Android.
- CI/CD: **GitHub Actions** ou **Codemagic** (bom p/ Flutter) → build, testes, distribuição beta (TestFlight / Google Play Internal Testing).

---

## 10. Roadmap de Entregas

### Fase 0 — Fundação (Sprint 0)
- Setup de repositório, CI/CD, arquitetura base, design system, backend inicial.

### Fase 1 — MVP (Must have)
- Onboarding + perfil.
- Motor de metas (Mifflin-St Jeor + objetivos).
- Busca de alimentos (base TACO + OFF importada).
- Diário por refeições configuráveis.
- Gráfico diário e semanal.
- Login e sync básicos.
- **Entregável:** beta fechado (TestFlight / Play Internal).

### Fase 2 — Diferenciais (Should/Could)
- Código de barras.
- Gráfico mensal + evolução de peso.
- Reconhecimento por foto (IA) com confirmação.
- Micronutrientes.

### Fase 3 — Retenção & Escala
- Integração Apple Health / Google Fit.
- Widgets de tela inicial, Apple Watch/Wear (rápido registro).
- Metas adaptativas, insights, gamificação leve.
- Monetização (ver seção 12).

> **Estimativa de ordem de grandeza** (time enxuto 2–3 devs + 1 design): MVP em ~2,5 a 4 meses; Fase 2 mais ~2 a 3 meses. Ajustar conforme escopo de IA.

---

## 11. Riscos & Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Precisão da IA de foto | Usuário perde confiança | Sempre exigir confirmação; comunicar "estimativa". |
| Cobertura de produtos BR no barcode | Registro falha | Fluxo de cadastro colaborativo + fallback busca. |
| Custo de API (IA/nutrição) | Margem/escala | Base própria + cache; limitar chamadas; medir custo/foto. |
| Responsabilidade sobre saúde | Legal/reputação | Disclaimers claros; não prescrever; base científica citada. |
| Aprovação nas lojas (health data) | Atraso de lançamento | Seguir guidelines, privacy labels, Sign in with Apple. |
| Qualidade dos dados nutricionais | Números errados | Priorizar fontes confiáveis (TACO/USDA); snapshot no diário. |

---

## 12. Monetização (futuro)
- **Freemium:** diário, busca, metas e gráficos básicos gratuitos.
- **Premium (assinatura):** reconhecimento por foto ilimitado, micronutrientes, relatórios avançados, sem anúncios, integrações Health.
- Evitar anúncios intrusivos em app de saúde (prejudica percepção).

---

## 13. Próximos Passos Imediatos
1. Validar/priorizar escopo do MVP (confirmar seção 2.1).
2. Fechar decisão de stack (Flutter x React Native) e backend (Supabase x Firebase).
3. Importar e consolidar base nutricional (TACO + Open Food Facts) no backend.
4. Prototipar telas principais (Home/Diário, Adicionar, Estatísticas, Metas).
5. Implementar e testar o **motor de metas** (é o coração da experiência).
6. Construir fluxo de diário + busca → primeiro beta interno.

---

### Apêndice A — Fórmulas de referência
- **Mifflin-St Jeor** (TMB) — ver seção E2.
- Conversões calóricas: Proteína 4 kcal/g · Carboidrato 4 kcal/g · Gordura 9 kcal/g · Álcool 7 kcal/g.
- Meta de fibra: ~14 g por 1000 kcal.
- Limite de açúcar livre: < 10% das calorias (referência OMS; ideal < 5%).

### Apêndice B — Glossário
- **TMB:** Taxa Metabólica Basal (energia em repouso).
- **TDEE:** Gasto Energético Total Diário.
- **Macros:** proteínas, carboidratos e gorduras.
- **Micros:** vitaminas e minerais.
- **Recomposição:** ganhar músculo e perder gordura simultaneamente.
