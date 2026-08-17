# MiniKyumons V1.1

MiniKyumons é um pet virtual offline e não punitivo, derivado do AuroraPet e inspirado em Tamagotchi e Digimon. A V1.1 foi reconstruída a partir do fluxo funcional do protótipo desktop `MiniKyumons.hta`, preservando a estética de console portátil de 585 × 427 px.

## Fluxo inicial

A aplicação começa em `START / OPTIONS / EXIT`. `START` abre a escolha entre os ovos de Água, Planta e Fogo. O ovo selecionado permanece no quintal durante a eclosão, recebe uma animação curta com partículas elementais e então revela o MiniKyumon.

## Controles

| Controle | Função |
|---|---|
| D-pad | Navega pelo título, ovos, menu principal e submenus |
| Verde / A | Confirma a opção ou executa a ação |
| Amarelo / B | Volta de submenu, retorna dos ovos ao título ou recolhe/abre o menu principal |
| Rosa / S | Abre e fecha a tela de status |
| L ou LOG | Abre e fecha o DEV LOG |

## Recursos da V1.1

A build possui menu retrátil com alimentação, brincadeiras e opções de sono; gameplay não punitivo; sujeira e cocô como consequências leves; evolução de nível 1 a 30 com três estágios; ciclo visual de manhã, tarde e noite; nuvens, grama e órbita solar/lunar; animação de respiração durante o sono com partículas `z`, partículas de interação, salvamento local versionado e backup automático.

O DEV LOG permanece salvo no navegador, registra ações importantes e pode ser exportado para TXT. O jogo não usa dependências externas e funciona offline a partir de `index.html` ou do launcher WebView2.

## Execução local

No Windows, execute `MiniKyumons-WebView2.cmd`. O launcher abre o Edge em modo aplicativo, usa o perfil `webview-profile` da própria build e aplica um parâmetro de cache bust para evitar a abertura de arquivos antigos.

Para executar uma regressão funcional no ambiente de desenvolvimento, use `minikyumons-v11-rebuild-functional-harness.js` com Node.js. A bateria cobre título, DEV LOG, seleção de ovos, eclosão, alimentação, brincadeira, limpeza, carinho, sono, status, botão amarelo e `Novo ovo`.

## Estrutura

```text
index.html
style.css
app.js
MiniKyumons-WebView2.cmd
minikyumons-v11-rebuild-functional-harness.js
assets/
```

A V1.1 publicada serve como referência estável para as próximas melhorias de arte. O pacote `assets/animations64/fire_rebuild` organiza os novos sprites do MiniKyumon de Fogo em sequências de idle, lanche, água, comida, brincar, ataque e sono com `Zzz`. Os arquivos originais permanecem em 64 × 64 px, com transparência preservada e sem reamostragem.
