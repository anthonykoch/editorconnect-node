import test from 'ava';

import assert from 'assert';

import WebSocket from 'ws';

import Socket from '../src/socket';

const PORT = 8820;
const URL = `ws://localhost:${PORT}`;

const createServer = (timeout=2000) => {
  const wss = new WebSocket.Server({ port: PORT });
  let connections = [];

  assert(Number.isFinite(timeout) && timeout > 0, 'timeout should a number and more than 0')

  wss.on('connection', (conn) => {
    connections = connections.concat([conn]);
    conn.on('close', () => connections = connections.filter(c => c !== conn));
  });

  const timeoutId = setTimeout(() => {
    wss.close(() => {
      throw new Error('took too long');
    });
  }, timeout);

  wss._server.unref();

  return {
    wss,
    getConnections() {
      return connections;
    },
    close() {
      // Close the server and clear the error timeout
      connections = [];
      clearTimeout(timeoutId);

      return new Promise((resolve) => {
        wss.close(resolve);
      });
    }
  };
};

test.serial('socket.open() - connects to a server', async t => {
  const { close, getConnections } = createServer();

  const socket = new Socket(URL, { autoConnect: false });

  await socket.open();

  t.is(getConnections().length, 1, 'connected');
  await close();
});

test.serial('socket.send(data) - sends data to a server', t => {
  const { wss, close, getConnections } = createServer();

  const socket = new Socket(URL);
  const DATA = Date.now() + Math.random();

  return new Promise(async (resolve) => {
    wss.on('connection', (conn) => {
      t.pass('it connected');

      conn.on('message', async (data) => {
        t.pass('message is sent');
        t.is(data, socket.parser.encode(DATA), 'data is from socket');

        await close();
        resolve();
      });
    });

    await socket.open();

    socket.send(DATA);

    t.is(getConnections().length, 1, 'connected');
  });
});

test.serial('socket.parser.encode(data) - encodes data', t => {
  const socket = new Socket(URL);

  t.is(socket.parser.encode('coconut water'), '"coconut water"\n');
  t.is(socket.parser.encode('123'), '"123"\n');
  t.is(socket.parser.encode({ coconut: true }), '{"coconut":true}\n');
  t.is(socket.parser.encode(null), 'null\n');
  t.is(socket.parser.encode([]), '[]\n');
});

test('socket.parser.decode(data) - decodes data', t => {
  const socket = new Socket(URL);

  t.deepEqual(socket.parser.decode('"coconut water"\n'), ['coconut water']);
  t.deepEqual(socket.parser.decode('"123"\n'), ['123']);
  t.deepEqual(socket.parser.decode('{"coconut": true}\n'), [{ coconut: true }]);
  t.deepEqual(socket.parser.decode('null\n'), [null]);
  t.deepEqual(socket.parser.decode('[]\n'), [[]]);
});
