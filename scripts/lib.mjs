import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    if (arguments.length > 1) {
      return fallback;
    }
    throw new Error('Não foi possível ler ' + filePath + ': ' + error.message);
  }
}

export function loadConfig() {
  const fileConfig = readJson(path.join(projectRoot, 'scripts', 'config.json'), {});
  const appInfo = readJson(path.join(projectRoot, 'app', 'appinfo.json'));
  const config = {
    tvIp: process.env.TV_IP || fileConfig.tvIp || '192.168.15.9',
    cdpPort: Number(process.env.TV_CDP_PORT || fileConfig.cdpPort || 9998),
    httpPort: Number(process.env.HTTP_PORT || fileConfig.httpPort || 8124),
    localIp: process.env.LOCAL_IP || fileConfig.localIp || '',
    appId: appInfo.id,
    installerAppId: fileConfig.installerAppId || 'org.webosbrew.hbchannel',
    launchAfterInstall: fileConfig.launchAfterInstall !== false
  };
  if (!config.tvIp) {
    throw new Error('Defina o IP da TV em scripts/config.json ou na variável TV_IP');
  }
  if (!Number.isInteger(config.cdpPort) || config.cdpPort <= 0) {
    throw new Error('cdpPort inválido em scripts/config.json');
  }
  if (!Number.isInteger(config.httpPort) || config.httpPort <= 0) {
    throw new Error('httpPort inválido em scripts/config.json');
  }
  if (!config.appId) {
    throw new Error('app/appinfo.json não tem um id válido');
  }
  return config;
}

export function findIpk() {
  const buildDir = path.join(projectRoot, 'build');
  if (!fs.existsSync(buildDir)) {
    return null;
  }
  const files = fs.readdirSync(buildDir)
    .filter(function (name) { return name.endsWith('.ipk'); })
    .map(function (name) {
      const filePath = path.join(buildDir, name);
      return { filePath: filePath, mtime: fs.statSync(filePath).mtimeMs };
    })
    .sort(function (a, b) { return b.mtime - a.mtime; });
  return files.length ? files[0].filePath : null;
}

export function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

export function formatBytes(bytes) {
  if (bytes < 1024) {
    return bytes + ' B';
  }
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  }
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function findLocalIp(tvIp) {
  const candidates = [];
  const interfaces = os.networkInterfaces();
  Object.keys(interfaces).forEach(function (name) {
    (interfaces[name] || []).forEach(function (address) {
      if (address.family !== 'IPv4' || address.internal) {
        return;
      }
      candidates.push({ name: name, address: address.address });
    });
  });
  const prefix = tvIp.split('.').slice(0, 3).join('.') + '.';
  const sameNetwork = candidates.find(function (item) {
    return item.address.indexOf(prefix) === 0;
  });
  if (sameNetwork) {
    return sameNetwork.address;
  }
  const preferred = candidates.find(function (item) {
    return /^(wl|en|eth)/.test(item.name);
  });
  if (preferred) {
    return preferred.address;
  }
  const privateIp = candidates.find(function (item) {
    return /^192\.168\./.test(item.address) ||
      /^10\./.test(item.address) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(item.address);
  });
  return privateIp ? privateIp.address : (candidates[0] ? candidates[0].address : '');
}

export function startIpkServer(options) {
  return new Promise(function (resolve, reject) {
    const server = http.createServer(function (request, response) {
      const pathname = (request.url || '').split('?')[0];
      if (pathname !== '/app.ipk' || (request.method !== 'GET' && request.method !== 'HEAD')) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
      }
      const stat = fs.statSync(options.ipkPath);
      console.log('  [http] ' + request.method + ' ' + pathname + ' ' + formatBytes(stat.size));
      response.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': stat.size,
        'Cache-Control': 'no-store'
      });
      if (request.method === 'HEAD') {
        response.end();
        return;
      }
      const stream = fs.createReadStream(options.ipkPath);
      stream.on('error', function () {
        response.destroy();
      });
      stream.pipe(response);
    });
    server.once('error', reject);
    server.listen(options.httpPort, options.localIp, function () {
      server.removeListener('error', reject);
      resolve({
        url: 'http://' + options.localIp + ':' + options.httpPort + '/app.ipk',
        close: function () {
          return new Promise(function (done) {
            if (typeof server.closeAllConnections === 'function') {
              server.closeAllConnections();
            }
            server.close(function () { done(); });
          });
        }
      });
    });
  });
}

export function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

export class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.closed = false;
    const self = this;
    socket.onmessage = function (event) {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch (error) {
        return;
      }
      const entry = self.pending.get(message.id);
      if (!entry) {
        return;
      }
      clearTimeout(entry.timer);
      self.pending.delete(message.id);
      if (message.error) {
        entry.reject(new Error(message.error.message || 'Erro CDP'));
      } else {
        entry.resolve(message.result);
      }
    };
    socket.onclose = function () {
      self.closed = true;
      self.pending.forEach(function (entry) {
        clearTimeout(entry.timer);
        entry.reject(new Error('Conexão CDP encerrada'));
      });
      self.pending.clear();
    };
    socket.onerror = function () {};
  }

  static connect(url, timeoutMs) {
    return new Promise(function (resolve, reject) {
      const socket = new WebSocket(url);
      const limit = timeoutMs || 5000;
      let settled = false;
      const timer = setTimeout(function () {
        if (settled) {
          return;
        }
        settled = true;
        try { socket.close(); } catch (error) { void error; }
        reject(new Error('Tempo esgotado ao conectar no CDP'));
      }, limit);
      socket.onopen = function () {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve(new CdpClient(socket));
      };
      socket.onerror = function () {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        reject(new Error('Falha ao conectar no CDP'));
      };
      socket.onclose = function () {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        reject(new Error('Conexão CDP fechada antes de abrir'));
      };
    });
  }

  send(method, params, timeoutMs) {
    const self = this;
    if (this.closed) {
      return Promise.reject(new Error('Conexão CDP encerrada'));
    }
    return new Promise(function (resolve, reject) {
      const id = self.nextId;
      self.nextId += 1;
      const timer = setTimeout(function () {
        self.pending.delete(id);
        reject(new Error('Tempo esgotado em ' + method));
      }, timeoutMs || 10000);
      self.pending.set(id, { resolve: resolve, reject: reject, timer: timer });
      self.socket.send(JSON.stringify({ id: id, method: method, params: params || {} }));
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression: expression,
      returnByValue: true,
      awaitPromise: false
    });
    if (result && result.exceptionDetails) {
      const details = result.exceptionDetails;
      const description = details.exception && details.exception.description;
      throw new Error(description || details.text || 'Exceção ao avaliar JavaScript na TV');
    }
    return result && result.result ? result.result.value : undefined;
  }

  close() {
    this.closed = true;
    try {
      this.socket.close();
    } catch (error) {
      void error;
    }
  }
}

export async function listTargets(config) {
  const endpoint = 'http://' + config.tvIp + ':' + config.cdpPort + '/json';
  let response;
  try {
    response = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
  } catch (error) {
    throw new Error('Não foi possível acessar ' + endpoint + '. Verifique o IP da TV, a rede e a depuração remota. Detalhe: ' + error.message);
  }
  if (!response.ok) {
    throw new Error('CDP respondeu HTTP ' + response.status + ' em ' + endpoint);
  }
  const targets = await response.json();
  return targets.filter(function (target) {
    return target && target.webSocketDebuggerUrl;
  });
}

export async function connectToTarget(target, readyTimeoutMs) {
  let client = null;
  try {
    client = await CdpClient.connect(target.webSocketDebuggerUrl);
    const deadline = Date.now() + (readyTimeoutMs || 0);
    while (true) {
      let ready = false;
      try {
        ready = await client.evaluate("typeof webOS !== 'undefined' && !!webOS.service && typeof webOS.service.request === 'function'");
      } catch (error) {
        void error;
      }
      if (ready) {
        return client;
      }
      if (Date.now() >= deadline) {
        client.close();
        return null;
      }
      await sleep(400);
    }
  } catch (error) {
    if (client) {
      client.close();
    }
    throw error;
  }
}

export async function waitForTarget(config, predicate, timeoutMs) {
  const deadline = Date.now() + (timeoutMs || 15000);
  while (Date.now() < deadline) {
    let targets = [];
    try {
      targets = await listTargets(config);
    } catch (error) {
      void error;
    }
    const found = targets.find(predicate);
    if (found) {
      return found;
    }
    await sleep(500);
  }
  return null;
}

export async function connectToWebOs(config) {
  const targets = await listTargets(config);
  if (!targets.length) {
    throw new Error('Nenhuma página depurável na TV. Abra o Dashboard ou o Homebrew Channel e tente de novo.');
  }
  targets.sort(function (a, b) {
    function score(target) {
      const url = target.url || '';
      if (url.indexOf(config.installerAppId) >= 0) return 0;
      if (url.indexOf(config.appId) >= 0) return 1;
      if (url.indexOf('file://') === 0) return 2;
      return 3;
    }
    return score(a) - score(b);
  });
  let lastError = null;
  for (const target of targets) {
    try {
      const client = await connectToTarget(target);
      if (client) {
        return { client: client, target: target };
      }
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error('Nenhuma página com webOS service disponível. Abra o Dashboard ou o Homebrew Channel na TV.' + (lastError ? ' Detalhe: ' + lastError.message : ''));
}
