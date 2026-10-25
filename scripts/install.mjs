import fs from 'node:fs';
import path from 'node:path';
import {
  connectToTarget,
  connectToWebOs,
  findIpk,
  findLocalIp,
  formatBytes,
  listTargets,
  loadConfig,
  projectRoot,
  sha256File,
  sleep,
  startIpkServer,
  waitForTarget
} from './lib.mjs';

function launchExpression(id) {
  return '(function () {' +
    'try {' +
    'webOS.service.request("luna://com.webos.applicationManager", {' +
    'method: "launch",' +
    'parameters: { id: ' + JSON.stringify(id) + ' },' +
    'subscribe: false,' +
    'onSuccess: function () {},' +
    'onFailure: function () {}' +
    '});' +
    'return "started";' +
    '} catch (error) { return "error"; }' +
    '})()';
}

async function ensureInstaller(config) {
  const targets = await listTargets(config);
  const existing = targets.find(function (target) {
    return (target.url || '').indexOf(config.installerAppId) >= 0;
  });
  if (existing) {
    const client = await connectToTarget(existing, 12000);
    if (client) {
      console.log('CDP: Homebrew Channel');
      return client;
    }
  }

  const connection = await connectToWebOs(config);
  console.log('Abrindo Homebrew Channel...');
  await connection.client.evaluate(launchExpression(config.installerAppId));
  connection.client.close();

  const target = await waitForTarget(config, function (item) {
    return (item.url || '').indexOf(config.installerAppId) >= 0;
  }, 20000);
  if (!target) {
    throw new Error('Não foi possível abrir o Homebrew Channel. Abra-o manualmente na TV e rode de novo.');
  }
  const client = await connectToTarget(target, 15000);
  if (!client) {
    throw new Error('A página do Homebrew Channel não respondeu');
  }
  await sleep(800);
  console.log('CDP: Homebrew Channel');
  return client;
}

function printNewLogs(log, printed) {
  let count = printed;
  let lastLine = '';
  for (; count < log.length; count += 1) {
    const entry = log[count];
    const status = entry && (entry.statusText || entry.stage);
    const progress = entry && typeof entry.progress === 'number' ? ' ' + entry.progress + '%' : '';
    if (!status) {
      continue;
    }
    const line = '  ' + status + progress;
    if (line !== lastLine) {
      console.log(line);
      lastLine = line;
    }
  }
  return count;
}

async function main() {
  if (typeof WebSocket === 'undefined' || typeof fetch === 'undefined') {
    throw new Error('Node.js 22 ou superior é necessário para instalar remotamente');
  }
  const config = loadConfig();
  const ipkPath = findIpk();
  if (!ipkPath) {
    throw new Error('Nenhum IPK em build/. Rode "npm run build" primeiro.');
  }

  const localIp = config.localIp || findLocalIp(config.tvIp);
  if (!localIp) {
    throw new Error('Não foi possível detectar o IP local. Defina "localIp" em scripts/config.json ou use LOCAL_IP=...');
  }

  const stat = fs.statSync(ipkPath);
  const hash = sha256File(ipkPath);
  const tvPrefix = config.tvIp.split('.').slice(0, 3).join('.');
  const localPrefix = localIp.split('.').slice(0, 3).join('.');

  console.log('TV: ' + config.tvIp + ':' + config.cdpPort);
  console.log('IPK: ' + path.relative(projectRoot, ipkPath) + ' (' + formatBytes(stat.size) + ')');
  console.log('SHA-256: ' + hash);
  console.log('Servidor: http://' + localIp + ':' + config.httpPort + '/app.ipk');
  if (tvPrefix !== localPrefix) {
    console.log('Atenção: o IP local não está na mesma sub-rede da TV. Se falhar, defina "localIp" em scripts/config.json.');
  }

  const server = await startIpkServer({
    localIp: localIp,
    httpPort: config.httpPort,
    ipkPath: ipkPath
  });

  let client = null;
  let cleaning = false;
  async function cleanup() {
    if (cleaning) {
      return;
    }
    cleaning = true;
    if (client) {
      client.close();
    }
    await server.close();
  }

  process.once('SIGINT', function () {
    cleanup().then(function () {
      process.exit(130);
    });
  });

  try {
    client = await ensureInstaller(config);

    const installUrl = server.url;
    const expression = [
      '(function () {',
      '  var state = window.__webosDashInstall = { state: "pending", log: [], result: null };',
      '  try {',
      '    webOS.service.request("luna://org.webosbrew.hbchannel.service", {',
      '      method: "install",',
      '      parameters: {',
      '        ipkUrl: ' + JSON.stringify(installUrl) + ',',
      '        ipkHash: ' + JSON.stringify(hash) + ',',
      '        id: ' + JSON.stringify(config.appId),
      '      },',
      '      subscribe: true,',
      '      onSuccess: function (res) {',
      '        state.log.push(res);',
      '        if (res.finished || res.statusText === "Finished.") { state.state = "finished"; }',
      '        if (res.returnValue === false) { state.state = "failed"; }',
      '      },',
      '      onFailure: function (err) { state.state = "failed"; state.result = err; },',
      '      onComplete: function () { if (state.state === "pending") { state.state = "complete"; } }',
      '    });',
      '    return "started";',
      '  } catch (error) {',
      '    state.state = "failed";',
      '    state.result = String(error);',
      '    return "error";',
      '  }',
      '})()'
    ].join('\n');

    const started = await client.evaluate(expression);
    if (started !== 'started') {
      throw new Error('A TV não iniciou a instalação. Abra o Dashboard ou o Homebrew Channel e tente de novo.');
    }

    console.log('Instalando...');
    let printed = 0;
    let lastState = 'pending';
    let finishedSeen = false;
    let completeSince = 0;
    const deadline = Date.now() + 180000;

    while (Date.now() < deadline) {
      await sleep(400);
      let raw;
      try {
        raw = await client.evaluate('JSON.stringify(window.__webosDashInstall || null)');
      } catch (error) {
        if (finishedSeen || lastState === 'finished') {
          break;
        }
        throw new Error('A conexão CDP caiu durante a instalação. Se o app fechou, abra o Dashboard para verificar se instalou.');
      }
      if (!raw) {
        if (finishedSeen || lastState === 'finished') {
          break;
        }
        throw new Error('A página da TV perdeu o estado da instalação. Abra o Dashboard para verificar.');
      }
      const data = JSON.parse(raw);
      printed = printNewLogs(data.log || [], printed);
      lastState = data.state || 'pending';
      if ((data.log || []).some(function (entry) { return entry && entry.finished; })) {
        finishedSeen = true;
      }
      if (lastState === 'finished') {
        finishedSeen = true;
        break;
      }
      if (lastState === 'failed') {
        throw new Error('A TV recusou a instalação: ' + JSON.stringify(data.result || data.log.slice(-1)[0] || {}));
      }
      if (lastState === 'complete') {
        if (finishedSeen) {
          break;
        }
        if (!completeSince) {
          completeSince = Date.now();
        }
        if (Date.now() - completeSince > 3000) {
          throw new Error('A instalação terminou sem confirmação da TV.');
        }
        continue;
      }
      completeSince = 0;
    }

    if (!finishedSeen) {
      throw new Error('Tempo esgotado esperando a instalação. Verifique se a TV ainda está acessível.');
    }

    console.log('');
    console.log('Instalação concluída.');

    if (config.launchAfterInstall) {
      console.log('Abrindo Dashboard...');
      try {
        await client.evaluate(launchExpression(config.appId));
        const dashboard = await waitForTarget(config, function (target) {
          return (target.url || '').indexOf(config.appId) >= 0;
        }, 15000);
        if (dashboard) {
          console.log('Dashboard aberto.');
        } else {
          console.log('Dashboard instalado. Abra-o manualmente na TV.');
        }
      } catch (error) {
        console.log('Dashboard instalado, mas não foi possível abri-lo: ' + error.message);
      }
    }
  } finally {
    await cleanup();
  }
}

main().catch(function (error) {
  console.error('');
  console.error('Erro: ' + error.message);
  process.exitCode = 1;
});
