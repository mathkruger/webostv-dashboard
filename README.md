# Dashboard para LG webOS

Dashboard estilo Apple TV para TVs LG com webOS, feito para ser simples de personalizar e seguro de instalar em uma TV com root/Homebrew Channel.

O app funciona como uma tela inicial alternativa: uma grade de atalhos para apps e entradas (HDMI, AV, TV ao vivo), com foco pensado para controle remoto. Quando o autostart está ativo, ele também abre no boot e ao retomar do standby.

## Recursos

- Grade de atalhos com até 12 itens (6 por linha), ícones extraídos dos apps instalados.
- Apps, entradas de vídeo e TV ao vivo na mesma tela.
- Navegação completa por controle remoto, com foco, rolagem e atalhos.
- Ajustes no próprio app: adicionar, remover e reordenar atalhos.
- Aba **Aparência** com 6 wallpapers, 5 cores sólidas e modo aleatório por abertura.
- Previsão do tempo ao lado do relógio, com cidade configurável e atualização a cada 15 minutos via [Open-Meteo](https://open-meteo.com/).
- Card de notícias ao lado do clima, com os 10 títulos mais recentes alternando na tela inicial e atualização a cada 1 hora.
- Página de notícias com feed RSS configurável, resultados paginados, botão **Atualizar** e abertura da matéria no navegador da TV.
- Catálogo ao vivo via Luna/Homebrew Channel, com fallback local.
- Autostart no boot e watcher para abrir o Dashboard ao acordar do standby.
- Retorno automático ao Dashboard ao fechar um app aberto por ele (configurável).
- Layout responsivo para a tela 1920x1080 do webOS, compatível com Chromium 53.
- Configurações e ícones salvos em `localStorage`.

## Requisitos

- TV LG com webOS e root (testado em webOS 4.9.1).
- [Homebrew Channel](https://github.com/webosbrew/webos-homebrew-channel) instalado e funcionando.
- Depuração remota/CDP acessível na TV (porta `9998` por padrão).
- Node.js **22 ou superior** no computador para o deploy remoto.
- Computador e TV na mesma rede local.

> O Dashboard usa o Homebrew Channel para executar comandos como root, listar apps, extrair ícones e configurar o autostart. Sem esse acesso, o app pode abrir com catálogo local, mas os recursos de sistema ficam limitados.

## Instalação

```bash
npm install
```

Edite `scripts/config.json` com o IP da TV, se necessário:

```json
{
  "tvIp": "192.168.15.9",
  "cdpPort": 9998,
  "httpPort": 8124,
  "localIp": "",
  "installerAppId": "org.webosbrew.hbchannel",
  "launchAfterInstall": true
}
```

Depois:

```bash
npm run deploy
```

O comando:

1. Gera o IPK em `build/` com `ares-package`.
2. Abre o Homebrew Channel na TV via CDP, se ele ainda não estiver aberto.
3. Sobe um servidor HTTP temporário com o IPK.
4. Instala o app `com.mathkruger.dashboard` pelo Homebrew Channel.
5. Abre o Dashboard na TV.

Comandos separados:

```bash
npm run build       # só gera o IPK
npm run install:tv  # instala o IPK já gerado
```

### Variáveis de ambiente

Substituem os valores de `scripts/config.json`:

```bash
TV_IP=192.168.15.9 TV_CDP_PORT=9998 HTTP_PORT=8124 LOCAL_IP=192.168.15.14 npm run install:tv
```

Se o IP local não for detectado corretamente (VPN, Docker, várias interfaces), defina `localIp` no `config.json` ou use `LOCAL_IP`.

## Uso

- Use as setas do controle para navegar e `OK` para abrir.
- O botão **Todos os apps** no topo abre uma lista completa de aplicativos e entradas (HDMI, AV, TV ao vivo) para abrir qualquer um sem precisar adicioná-lo à tela inicial.
- `Voltar` abre os ajustes na tela inicial; dentro dos ajustes, fecha a tela.
- A opção **Voltar ao sair dos apps** faz o Dashboard reaparecer quando você fecha um app aberto por ele (ou aperta `Home` dentro do app), inclusive quando a TV volta para Live TV/HDMI.
- No painel de ajustes:
  - A aba **Atalhos** fica à esquerda (atalhos atuais) e à direita (apps, entradas e ações do sistema).
  - `OK` sobre um atalho atual inicia o modo de mover; use `↑`/`↓` e confirme com `OK`.
  - `Voltar` cancela a movimentação.
  - A aba **Aparência** permite escolher um dos 6 wallpapers, uma das 5 cores sólidas ou o modo **Aleatório**, que sorteia um wallpaper a cada abertura do app.
  - A aba **Clima** ativa ou desativa a previsão do tempo e permite definir a cidade. Use `OK` em **Cidade** para abrir o teclado da TV, digite o nome e confirme com `OK`; `Voltar` cancela a edição. A busca aceita formatos como `Itu`, `Itu, SP` e `Itu SP`. **Atualizar agora** força uma nova consulta. A previsão vem ativada por padrão com a cidade **São Paulo**; desative a opção se não quiser usá-la.
  - A aba **Notícias** define o feed RSS usado pelo card e pela página de notícias. Use `OK` em **Feed RSS** para digitar o endereço no teclado da TV e confirme com `OK`; `Voltar` cancela. **Atualizar agora** força uma nova leitura e **Restaurar feed padrão** volta para a Agência Brasil. O feed padrão é `https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml`.
  - Na tela inicial, use `↑` a partir da primeira linha de atalhos para focar o card de notícias e `OK` para abrir a página. Nela, `↑`/`↓` navegam pelas matérias, `←`/`→` trocam de página e `OK` abre a matéria no navegador da TV. `Voltar` fecha a página.
  - Use `↑`/`↓`/`←`/`→` para navegar entre as abas e os cartões; `OK` aplica a opção.
- A engrenagem no topo também abre os ajustes.

### Autostart e wake

A opção **Abrir ao ligar ou acordar** ativa duas coisas:

- Um bloco em `/var/lib/webosbrew/startup.sh` que abre o Dashboard após o boot.
- Um watcher em `/var/lib/webosbrew/dashboard-wake.sh` que escuta o estado de energia da TV e abre o Dashboard ao retomar do standby.

O watcher escuta:

```text
luna://com.webos.service.tvpower/power/getPowerState
```

e dispara o app quando o estado muda de `Suspend` para `Active`.

O app cria um backup `startup.sh.dashboard.bak` antes da primeira alteração. Ao desativar a opção, o bloco e o watcher são removidos.

Logs e diagnóstico:

```bash
cat /var/lib/webosbrew/dashboard-wake.log
cat /var/run/dashboard-wake.pid
```

Para testar: desligue a TV com o controle, aguarde alguns segundos em standby e ligue novamente. O Dashboard deve abrir sozinho.

### Voltar ao Dashboard ao sair de um app

A opção **Voltar ao sair dos apps** fica em Ajustes → Sistema e vem ativada por padrão. Com ela, o Dashboard observa qual app está em primeiro plano:

- Ao abrir um app pelo Dashboard, o watcher é armado.
- Quando o app é fechado, o Dashboard é aberto de novo. Funciona quando a TV volta para `com.webos.app.home`, para `com.webos.app.livetv`, para o launcher ou para uma entrada `com.webos.app.hdmi*`/`externalinput`.
- Apertar `Home` dentro do app também conta como sair e traz o Dashboard de volta.
- Se você voltar ao Dashboard manualmente, o watcher é desarmado.
- O script mantém o stdin do `luna-send` aberto com `tail -f /dev/null`, porque o `luna-send -i` encerra quando o stdin fecha.

O watcher é o script `/var/lib/webosbrew/dashboard-return.sh`, instalado e iniciado pelo Homebrew Channel. Ele usa:

```text
luna://com.webos.applicationManager/getForegroundAppInfo
```

Arquivos de diagnóstico:

```bash
cat /var/lib/webosbrew/dashboard-return.log
cat /var/run/dashboard-return.pid
ls /var/run/dashboard-return.armed
```

Ao desativar a opção, o processo é encerrado e o script é removido. Sem o Homebrew Channel, o app tenta um observador interno enquanto está em segundo plano, que pode não funcionar se o webOS suspender o app.

Para testar: abra um app pelo Dashboard, saia dele (até a tela inicial, Live TV ou uma entrada HDMI) e o Dashboard deve reaparecer.

## Estrutura

```text
app/                         App web instalado na TV
  appinfo.json               Manifesto webOS
  index.html                 Estrutura da tela e ordem dos scripts
  css/style.css              Layout e tema
  js/
    app.js                   Bootstrap: eventos globais e init
    config.js                Constantes e catálogo fallback
    core/
      constants.js           Teclas, paleta e configuração base
      store.js               Estado compartilhado da interface
      dom.js                 Cache de elementos e utilitários de DOM
      utils.js               Funções auxiliares
      pointer.js             Cursor e foco por mouse
      clock.js               Relógio e data
      ui.js                  Status, dica e toast
      glyphs.js              SVGs de entradas e ações do sistema
      keyboard.js            Roteamento de teclas por tela
    services/
      scripts.js             Scripts shell embutidos (wake/return)
      luna.js                Chamadas Luna e execução root
      shortcuts.js           Persistência e manipulação de atalhos
      wallpaper.js           Seleção e aplicação de wallpaper
      weather.js             Previsão do tempo (Open-Meteo) e cidade
      news.js                Card, página paginada e leitura de feeds RSS
      icons.js               Cache, extração e renderização de ícones
      catalog.js             Catálogo de apps/entradas e atualização
      launcher.js            Abertura de apps e entradas
      autostart.js           Integração com startup.sh e wake
      return-watch.js        Watcher de retorno ao sair de apps
    pages/
      home.js                Tela inicial e navegação
      allapps.js             Lista completa de apps e entradas
      settings.js            Ajustes, atalhos, movimento, aparência, clima e notícias
  certs/
    cacert.pem               Bundle de CAs usado pelo curl no fallback de notícias
  webOSTVjs-1.2.13/          Bridge webOS
  assets/                    Fontes e imagens
    wallpapers/              Wallpapers e miniaturas de prévia
scripts/
  build.mjs                  Empacota o app com ares-package
  install.mjs                Instala e abre o app via CDP + Homebrew Channel
  lib.mjs                    Config, CDP, HTTP e utilidades
  dashboard-wake.sh          Watcher de standby (fonte)
  dashboard-return.sh        Watcher de retorno ao sair de apps (fonte)
  config.json                Configuração local de deploy
build/                       IPKs gerados
```

## Configuração do app

As preferências ficam no `localStorage` da TV:

- `dashboard.config.v1`: atalhos e ordem.
- `dashboard.icon.v1:<caminho>`: cache de ícones.
- `dashboard.hint.v1`: controle de dica exibida uma vez.
- `dashboard.return.v1`: ativação do retorno ao sair de apps (`1` ou `0`).
- `dashboard.wallpaper.v1`: wallpaper escolhido (`random`, imagem ou cor sólida).
- `dashboard.weather.v1`: clima ativado, cidade e coordenadas resolvidas.
- `dashboard.weather.cache.v1`: última previsão obtida, usada para exibir os dados antes da próxima consulta.
- `dashboard.weather.transport.v1`: `http` quando a TV não aceita a cadeia de certificados atual do Open-Meteo; nesse caso o app usa HTTP automaticamente.
- `dashboard.news.v1`: endereço do feed RSS de notícias.
- `dashboard.news.cache.v1`: últimas notícias lidas, usadas para exibir o card imediatamente ao abrir o app.

Os ícones são cacheados por 14 dias. A opção **Atualizar apps e ícones** força uma nova leitura.

## Solução de problemas

### Não conecta na TV

- Confirme o IP em `scripts/config.json`.
- Confirme que a TV e o computador estão na mesma rede.
- Confirme que o CDP está acessível: `curl http://IP_DA_TV:9998/json`.
- Abra o Dashboard ou o Homebrew Channel na TV antes de instalar.

### Instalação falha

- Verifique se o Node.js é 22 ou superior: `node -v`.
- Confirme que o Homebrew Channel está instalado e abre.
- Se o IP local estiver errado, defina `localIp` no `config.json`.
- O aviso `requiredACG` do `ares-package` é esperado e não bloqueia o app.

### O Dashboard não abre após o standby

- Confirme que a opção de autostart está ativa no app.
- Verifique se o bloco existe em `/var/lib/webosbrew/startup.sh`.
- Veja o log `/var/lib/webosbrew/dashboard-wake.log`.
- Confirme que `/var/lib/webosbrew/dashboard-wake.sh` existe e é executável.
- Se necessário, desative e reative a opção no app para reinstalar o watcher.

### O Dashboard não volta ao sair de um app

- Confirme que **Voltar ao sair dos apps** está ativo nos ajustes.
- O log deve mostrar `foreground: <app>` ao abrir o app, `armed by <app>` e, ao sair, `app closed; launching ...` seguido de `launch try 1: ...`.
- Veja o log `/var/lib/webosbrew/dashboard-return.log`.
- Confirme que `/var/lib/webosbrew/dashboard-return.sh` existe e é executável.
- Confirme o watcher rodando em `/var/run/dashboard-return.pid`.
- O arquivo `/var/run/dashboard-return.armed` existe enquanto um app aberto pelo Dashboard está em primeiro plano.
- Sem o Homebrew Channel, o retorno depende do app ainda estar executando em segundo plano e pode falhar.
- Se necessário, desative e reative a opção para reinstalar o watcher.

### Ícones ou apps não carregam

- O catálogo ao vivo depende do acesso root pelo Homebrew Channel.
- Use **Atualizar apps e ícones** nos ajustes.
- Sem root, o app usa o catálogo fallback e não consegue extrair ícones.

### As notícias não carregam

- Confirme que a TV tem acesso à internet.
- Confira o endereço do feed em Ajustes → Notícias. O feed precisa ser RSS 2.0 ou Atom.
- O feed padrão (Agência Brasil) libera CORS, mas o certificado dele não é reconhecido pelo bundle de CAs antigo do webOS 4.x. Nesse caso o app baixa o feed pelo Homebrew Channel usando o bundle atualizado em `certs/cacert.pem`; é necessário root e o Homebrew Channel ativo.
- Feeds de outros sites também podem bloquear CORS ou usar raízes não reconhecidas pela TV. O app tenta, nesta ordem: `XMLHttpRequest`, `curl` com o bundle incluído, `curl` com as CAs do sistema, `curl -k` e `wget`.
- Sem root, só funcionam feeds cujo certificado a TV confia e que liberam CORS.
- Use **Atualizar agora** para tentar de novo. A última lista fica em cache e continua visível se a consulta falhar.

### O clima não carrega

- Confirme que a TV tem acesso à internet.
- Confira a cidade em Ajustes → Clima; nomes muito genéricos podem não ser encontrados.
- Use **Atualizar agora** para tentar de novo. O app consulta o Open-Meteo e não precisa de chave de API.
- Se a rede da TV ainda não estiver pronta ao abrir o app, o clima tenta novamente sozinho com espera crescente até conseguir.
- A última previsão fica em cache; se a consulta falhar, os dados anteriores continuam visíveis.

## Notas de manutenção

- O app é compatível com Chromium 53: evite sintaxe moderna como `async/await`, optional chaining, CSS grid, `gap` em flexbox e `backdrop-filter`.
- O clima usa as APIs públicas do Open-Meteo via `XMLHttpRequest`, sem chave. A cidade é resolvida pela API de geocodificação e as coordenadas ficam salvas para as próximas consultas.
- As notícias são lidas com `XMLHttpRequest` e `DOMParser`. Se a leitura direta falhar (CORS ou certificado), o app recorre ao Homebrew Channel e executa `curl` com `--cacert app/certs/cacert.pem`, com fallback para as CAs do sistema, `curl -k` e `wget`.
- `app/certs/cacert.pem` é o bundle da Mozilla distribuído em <https://curl.se/ca/cacert.pem>. Atualize-o de tempos em tempos para acompanhar novas raízes.
- As notícias configuradas ficam em `dashboard.news.v1` e o cache em `dashboard.news.cache.v1` no `localStorage`; reinstalar o app pelo Homebrew Channel preserva esses dados.
- TVs com webOS 4.x podem rejeitar a cadeia de certificados atual do Open-Meteo (`ERR_INSECURE_RESPONSE`). Nesse caso o app tenta novamente por HTTP e guarda essa escolha em `dashboard.weather.transport.v1`. Em TVs com certificados atualizados, o HTTPS é usado normalmente.
- Os módulos compartilham o namespace `window.Dashboard`; a ordem de carregamento é definida em `app/index.html`.
- `ares-package` minifica os arquivos de `app/js/`; os arquivos instalados podem ter tamanho diferente dos fontes.
- O conteúdo de `scripts/dashboard-wake.sh` é embutido em `app/js/services/scripts.js` como `WAKE_SCRIPT_B64`. Ao alterar o script, atualize essa constante e rode `npm run build`.
- O mesmo vale para `scripts/dashboard-return.sh`, embutido como `RETURN_SCRIPT_B64` no mesmo arquivo.
- O atraso antes de abrir o Dashboard após o wake é o `sleep 3` em `scripts/dashboard-wake.sh`. O autostart no boot usa `sleep 25` no bloco de `startup.sh`.
- Não edite `startup.sh` manualmente sem backup. O app já cria um backup antes da primeira alteração; se editar por fora, valide com `sh -n`.

## Licença

ISC.
