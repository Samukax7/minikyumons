# MiniKyumons V1.1 — Guia de Auditoria e Reparação

**Documento técnico de manutenção**  
**Projeto:** MiniKyumons Pocket WebView / Web-PWA  
**Escopo:** cópia local `MiniKyumons-WebView2-V1.1-dev`  
**Data da auditoria:** 17 de agosto de 2026  
**Autor:** Manus AI

## 1. Objetivo

Este documento registra a estrutura encontrada na V1.1, os problemas confirmados durante a vistoria e um procedimento seguro para futuras alterações. A auditoria foi feita de forma não destrutiva: os arquivos do jogo não foram reformulados durante a inspeção. A V1 estável publicada no GitHub não deve ser alterada até que uma versão local seja validada.

> Regra principal: **tratar a V1 estável como somente leitura e realizar qualquer experiência em uma cópia versionada da V1.1**.

## 2. Arquivos encontrados

A pasta auditada contém os seguintes arquivos principais:

| Arquivo | Tamanho aproximado | Função | Situação |
|---|---:|---|---|
| `index.html` | 7,2 KB | Estrutura da interface e carregamento do JavaScript | Referencia `app-v11-patched.js` |
| `app.js` | 37,5 KB | Lógica original da V1.1 | Permanece bloqueado ou em uso por processo externo em alguns momentos |
| `app-v11-patched.js` | 38,1 KB | Cópia com o patch visual da V1.1 | É o arquivo carregado atualmente pelo HTML |
| `style.css` | 38,5 KB | Layout, escala, console, quintal e animações | Contém o patch de ambiente e sono |
| `MiniKyumons-WebView2.cmd` | 618 B | Inicialização do WebView2 | Deve ser usado somente para abrir a cópia local correta |
| `MiniKyumons.hta` | 79 KB | Variante HTA antiga | Não deve ser misturada com a versão Web/PWA |

A existência simultânea de `app.js` e `app-v11-patched.js` é um risco operacional. A partir de agora, cada versão deve ter um único arquivo JavaScript oficial, ou um arquivo-fonte claramente identificado e uma cópia gerada com nome previsível.

## 3. Achados confirmados

### 3.1. Problema de codificação de caracteres

A captura de tela mostrou textos como `BEBÃ...`, `Ã©`, `Ã¢` e símbolos quebrados. A auditoria também encontrou sequências corrompidas dentro do CSS, especialmente no conteúdo textual usado para estrelas da noite. Isso caracteriza uma inconsistência entre UTF-8 e a interpretação Windows-1252/ANSI.

O problema afeta principalmente:

| Área | Sintoma provável |
|---|---|
| Nome do pet e estágio | Acentos e separadores aparecem como `Ã` ou `Â` |
| Menu | Símbolos de navegação e alguns textos aparecem deformados |
| CSS noturno | Estrelas e símbolos decorativos aparecem corrompidos |
| HTA/WebView2 | A mesma string pode ser interpretada de forma diferente dependendo do mecanismo |

**Correção recomendada:** manter todos os arquivos Web em UTF-8 sem BOM e confirmar no `index.html` a presença de:

```html
<meta charset="UTF-8">
```

Também é recomendável substituir símbolos decorativos diretamente por entidades HTML, SVG ou caracteres ASCII simples. Por exemplo, em vez de inserir símbolos especiais dentro de `content`, usar uma camada de elementos HTML com `span`.

### 3.2. Referência de JavaScript duplicada

O `index.html` original da V1.1 carregava `app.js`. Durante a manutenção, foi criado `app-v11-patched.js` e o HTML passou a carregá-lo. O `app.js` original continua na pasta, criando risco de edição no arquivo errado.

O arquivo atualmente esperado pelo HTML é:

```html
<script src="app-v11-patched.js"></script>
```

Antes de qualquer reparo, verificar sempre qual arquivo aparece nessa linha. Nunca editar `app.js` presumindo que ele está ativo.

### 3.3. Referências de IDs ausentes

A auditoria encontrou chamadas JavaScript para os IDs:

```text
intro-modal
intro-name-input
```

Esses IDs não foram encontrados no HTML auditado. As funções relacionadas incluem `startIntro`, `chooseIntroSpecies` e `confirmNew`. Isso indica resíduo de uma lógica anterior de introdução ou uma implementação incompleta.

O problema pode permanecer silencioso enquanto essas funções não são chamadas, mas pode produzir erro quando a tela de introdução for ativada. Existem duas correções válidas:

1. restaurar no HTML os elementos da introdução e conectar seus botões; ou
2. remover as funções antigas e todas as chamadas associadas, caso a introdução atual use exclusivamente `title-modal` e `egg-modal`.

Não se deve criar elementos vazios apenas para esconder o erro; a decisão precisa seguir o fluxo de inicialização escolhido para a V1.1.

### 3.4. Patch de sono e ambiente

O patch visual está presente no CSS e no JavaScript. Foram identificados os seguintes recursos:

| Recurso | Implementação encontrada | Observação |
|---|---|---|
| Respiração durante o sono | `sleep-breathe` e `.pet-placeholder.sleeping` | Deve ser aplicado somente quando `state.expression === "sleep"` |
| Partículas sequenciais | `.sleep-zs` com três `span` e delays diferentes | Depende da existência de `id="sleep-zs"` no HTML |
| Grama | Pseudo-elementos `.yard-ground:before` e `.yard-ground:after` | Verificar se `.yard-ground` existe no DOM ativo |
| Nuvens | `.cloud` e `cloud-drift` | Verificar se as nuvens possuem essa classe no HTML |
| Sol e lua | `.parallax-sun`, `.parallax-moon` e `celestial-orbit` | A animação usa `transform` e pode conflitar com outro transform inline |
| Ambiente por horário | Classes `time-morning`, `time-afternoon` e `time-night` | O regex corrigido deve impedir acúmulo de classes |

O `sleep-zs` possui `opacity: 0` no estado padrão e recebe a classe `visible` durante o sono. É importante confirmar que existe uma regra `.sleep-zs.visible` definindo `opacity: 1`; sem essa regra, as partículas podem continuar invisíveis apesar da classe ser aplicada.

### 3.5. Possível conflito entre animação CSS e transformação inline

O JavaScript aplica `style.transform` diretamente ao asset do pet para a escala de crescimento. A animação de sono também aplica `transform` no contêiner `.pet-placeholder.sleeping`. Atualmente a animação está no contêiner e a escala no asset, o que é uma separação correta. Essa separação deve ser preservada.

O mesmo cuidado vale para o sol, lua, imagem do quintal e nuvens. Se uma função aplicar `style.transform` em um elemento que também possui uma animação CSS com `transform`, a animação pode ser sobrescrita ou parecer travada.

### 3.6. Regras CSS duplicadas ou sobrepostas

O CSS possui mais de uma regra para `.home-view.time-night .yard-parallax-tint`. Isso não é necessariamente um erro fatal, mas a última regra vence e torna a primeira parcialmente redundante. Durante uma futura limpeza, consolidar as regras em um único bloco para evitar alterações imprevisíveis.

Também existe uma regra que oculta camadas antigas quando `.parallax-active` está presente:

```css
.home-view.parallax-active > .yard-back,
.home-view.parallax-active > .yard-middle,
.home-view.parallax-active > .yard-path,
.home-view.parallax-active > .yard-fence {
  opacity: 0;
}
```

Essa regra pode ser intencional, mas deve ser confirmada visualmente. Se o quintal ficar vazio ou excessivamente plano, o primeiro ponto a revisar é essa ocultação.

## 4. Lógica JavaScript relevante

A auditoria encontrou as principais áreas funcionais:

| Grupo | Funções principais |
|---|---|
| Estado e persistência | `newPet`, `normalizeState`, `load`, `save`, `offline` |
| Crescimento | `xpForLevel`, `growthStageForLevel`, `growthScale`, `syncGrowth`, `addExperience` |
| Interações | `performFeed`, `performPlay`, `performSleep`, `action`, `react` |
| Animações | `setExpression`, `playSequence`, `returnToIdle`, `idleStep` |
| Menu | `renderMainMenu`, `renderSubmenu`, `move`, `select`, `yellowButtonAction`, `backAction` |
| Inicialização | `startTitle`, `chooseEgg`, `beginHatch`, `finishHatch` |
| Ambiente | `applyTimeOfDay`, `parallaxShift`, `updateDayNight` |

O fluxo do botão amarelo deve continuar obedecendo a esta regra:

| Estado atual | Resultado do botão amarelo |
|---|---|
| Menu principal visível | Esconde o carrossel/menu |
| Submenu aberto | Volta ao menu principal |
| Tela de status aberta | Fecha a tela de status, se o evento for encaminhado a ela |
| Modal de ovo ou eclosão | Cancela ou retorna conforme o modal específico |
| Tela de título | Não executar a ação do menu principal |

Qualquer futura alteração deve testar o botão em todos esses estados, e não apenas no menu principal.

## 5. Assets e referências a verificar

A auditoria identificou referências de ambiente como:

```text
assets/yard/yard-base.jfif
assets/yard/manha.png
assets/yard/tarde.png
assets/yard/noite.png
```

Antes de publicar, confirmar se os nomes e extensões existem exatamente assim. Windows costuma aceitar diferenças de maiúsculas e minúsculas, mas GitHub Pages é servido em ambiente sensível a maiúsculas/minúsculas em muitos casos.

Para os pets, manter a convenção:

```text
assets/<especie>/<expressao>.png
```

A futura implementação do copinho de água deve respeitar a pasta, o estágio e a expressão esperados por `assetFolder()` e `assetExpression()`. Não substituir um sprite de comida globalmente sem verificar se a ação de água usa o mesmo caminho.

### Checklist do copinho de água

| Item | Verificação |
|---|---|
| Três estágios do pet de água | Existe um sprite para cada estágio |
| Expressão neutra | O arquivo retorna ao idle após a ação |
| Alimentação/água | A ação chama o sprite correto e não o sprite de comida |
| Escala | O copo mantém proporção no canvas de 585 × 427 |
| Transparência | O fundo não apaga partes coloridas do pet |
| Fallback | Se o arquivo faltar, o pet continua visível no idle |

## 6. Procedimento seguro de reparação

### Passo 1 — Criar cópia versionada

Nunca começar editando a pasta publicada. Criar uma pasta com o número da versão, por exemplo:

```text
MiniKyumons-WebView2-V1.1-dev
MiniKyumons-WebView2-V1.1-dev-2026-08-17-backup
```

Backups devem ser criados somente quando uma versão estiver funcional. Evitar dezenas de cópias intermediárias com nomes ambíguos.

### Passo 2 — Confirmar o arquivo JavaScript ativo

Abrir `index.html` e conferir o único `<script src="...">`. Editar somente esse arquivo JavaScript. Se houver `app.js` e `app-v11-patched.js`, não assumir qual está ativo sem ler o HTML.

### Passo 3 — Fazer uma alteração por vez

Alterar primeiro a lógica, depois o CSS e por último os assets. Após cada alteração, testar carregamento, menu, botão amarelo, botão verde, botão rosa, status, eclosão, sono e retorno ao idle.

### Passo 4 — Validar codificação

Salvar HTML, CSS e JavaScript em UTF-8. Se a tela exibir `Ã`, `Â` ou `â`, interromper os testes visuais e corrigir a codificação antes de investigar a lógica do jogo.

### Passo 5 — Testar com localStorage limpo somente quando necessário

O save persistido pode mascarar mudanças no fluxo de introdução ou eclosão. Para um teste limpo, usar uma chave de backup antes de remover dados. Nunca apagar o save de produção sem confirmação.

### Passo 6 — Testar estados de navegação

A sequência mínima é:

```text
Título → Start → escolha de ovo → eclosão → quintal
Quintal → botão amarelo → submenu → botão amarelo → menu principal
Menu principal → botão amarelo → esconder/mostrar carrossel
Qualquer tela válida → botão rosa → status → botão rosa → retorno
```

### Passo 7 — Publicar apenas após congelamento

Quando a V1.1 estiver aprovada, criar um backup nomeado, revisar os assets, remover arquivos experimentais, e só então copiar os arquivos finais para a instância do GitHub Pages.

## 7. Prioridade das correções

| Prioridade | Correção | Risco |
|---|---|---|
| P0 | Corrigir UTF-8 e os textos corrompidos | Alto: afeta a interface inteira |
| P0 | Confirmar que o HTML carrega apenas o JS pretendido | Alto: reparos podem ser feitos no arquivo inativo |
| P1 | Resolver os IDs ausentes da introdução | Médio/alto: pode quebrar um fluxo futuro |
| P1 | Confirmar regra `.sleep-zs.visible` | Médio: partículas podem permanecer invisíveis |
| P1 | Confirmar existência das classes `.yard-ground` e `.cloud` no HTML | Médio: animações podem não ter efeito |
| P1 | Verificar nomes exatos dos assets do quintal | Médio/alto na publicação GitHub Pages |
| P2 | Consolidar regras CSS duplicadas | Médio: reduz comportamento inesperado |
| P2 | Integrar copinhos de água dos três estágios | Médio: nova funcionalidade de asset |
| P3 | Melhorar touch, hitboxes e viewport móvel | Médio: experiência em celulares |

## 8. Diagnóstico final

A V1.1 local está funcional o suficiente para continuar a prototipagem, mas não deve ser publicada imediatamente. Os principais riscos não são o sistema de evolução ou o loop não punitivo; são a **confusão entre arquivos JavaScript**, a **codificação de caracteres**, os **resíduos da introdução antiga** e as **dependências implícitas entre classes CSS, IDs HTML e assets**.

O ponto mais importante para futuras reparações é manter uma fonte única de verdade. O HTML deve apontar para um único JavaScript ativo, os assets devem seguir uma convenção documentada e cada alteração deve ser validada em uma cópia local antes de chegar ao GitHub Pages.

## 9. Registro de alterações recomendado

Para cada reparação, registrar:

```text
Versão:
Data:
Arquivo alterado:
Problema observado:
Correção aplicada:
Teste realizado:
Resultado:
Backup criado:
```

Esse registro evita repetir o ciclo de quebrar e restaurar o botão amarelo, reduz a multiplicação de backups e facilita a recuperação da última versão estável.

## 10. Limitação da auditoria

A análise automatizada foi executada na cópia local V1.1 e gerou um relatório bruto temporário. A listagem completa de assets não foi incorporada integralmente a este documento porque a conexão remota oscilou durante a leitura de diretórios extensos. Por isso, a existência individual de cada sprite do copinho de água, de cada estágio e de cada variação de expressão ainda deve ser confirmada em uma segunda passagem focalizada.

## 11. Correções aplicadas nesta rodada

As correções foram aplicadas somente à cópia local V1.1. A V1 estável e os arquivos anteriores foram preservados.

| Alteração | Arquivo ativo |
|---|---|
| Guia incorporado ao projeto | `MiniKyumons-V1.1-Guia-de-Auditoria-e-Reparacao.md` |
| JavaScript final separado do arquivo experimental | `app-v11-final.js` |
| HTML atualizado para carregar o JavaScript final | `index.html` |
| UTF-8 explícito | `index.html` |
| Meta viewport para telas móveis | `index.html` |
| Guardas contra ausência dos elementos antigos da introdução | `app-v11-final.js` |
| Partículas de sono com estado visível explícito | `style.css` |
| Nuvens com marcação e animação | `index.html` e `style.css` |
| Camada de grama tolerante à estrutura atual | `style.css` |
| Símbolos decorativos noturnos substituídos por caracteres simples | `style.css` |

A sintaxe não foi verificada com Node.js porque o comando Node não está instalado na máquina Windows remota. A validação realizada confirmou a existência dos arquivos, a referência correta no HTML e a presença das guardas e regras CSS esperadas. Antes do envio para o GitHub, recomenda-se abrir o `.cmd` e executar o roteiro manual de navegação descrito na seção 6.
