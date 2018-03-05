import test from 'ava';

import assert from 'assert';

import WebSocket from 'ws';

import * as Messages from '../lib/messages';
import Socket, { MessageParser } from '../lib/socket';

const PORT = 8820;
const URL = `ws://localhost:${PORT}`;

const INCOMING_ORIGIN = { id: 'incoming' };
const OUTGOING_ORIGIN = { id: 'outgoing' };



const createServer = ({ handshake=true, timeout=5000 }={}) => {
  const wss = new WebSocket.Server({ port: PORT });
  let connections = [];

  assert(Number.isFinite(timeout) && timeout > 0, 'timeout should a number and more than 0')

  wss.on('connection', (conn) => {
    const parser = new MessageParser;

    connections = connections.concat([conn]);
    conn.on('close', () => connections = connections.filter(c => c !== conn));

    if (handshake) {
      conn.send(parser.encode(Messages.handshakeAccept(null, INCOMING_ORIGIN, OUTGOING_ORIGIN)));
    }
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
      return connections.slice(0);
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

test.serial('Socket() - throws when origin is not passed', async t => {
  t.throws(() =>new Socket(URL, { autoConnect: false }), /origin/, 'origin is required')
});

test.serial('socket.open() - resolves error when handshake times out', async t => {
  const { close, getConnections } = createServer({ handshake: false });

  const socket = new Socket(URL, { origin: OUTGOING_ORIGIN, autoConnect: false });

  const { error } = await socket.open();

  t.throws(() => { throw error; }, /failed handshake/i);

  await close();
});

test.serial('socket.open() - resolves with error as null when handshake completes', async t => {
  const { close, getConnections } = createServer();

  const socket = new Socket(URL, { origin: OUTGOING_ORIGIN, autoConnect: false });

  const { error } = await socket.open();

  t.is(error, null, 'error is null');
  t.is(getConnections().length, 1, 'connected');

  await close();
});

test.serial('socket.open() - resolves when handshake is accepted', async t => {
  const { close, getConnections } = createServer();

  const socket = new Socket(URL, { origin: OUTGOING_ORIGIN, autoConnect: false });

  await socket.open();

  t.is(getConnections().length, 1, 'connected');
  await close();
});

test.serial('socket.open() - connects to a server', async t => {
  const { close, getConnections } = createServer();

  const socket = new Socket(URL, { origin: OUTGOING_ORIGIN, autoConnect: false });

  await socket.open();

  t.is(getConnections().length, 1, 'connected');
  await close();
});

test.serial('socket.parser.encode(data) - encodes data', t => {
  const socket = new Socket(URL, { origin: OUTGOING_ORIGIN });

  t.is(socket.parser.encode('coconut water'), '"coconut water"\n');
  t.is(socket.parser.encode('123'), '"123"\n');
  t.is(socket.parser.encode({ coconut: true }), '{"coconut":true}\n');
  t.is(socket.parser.encode(null), 'null\n');
  t.is(socket.parser.encode([]), '[]\n');
});

test('socket.parser.decode(data) - decodes data', t => {
  const socket = new Socket(URL, { origin: OUTGOING_ORIGIN });

  t.deepEqual(socket.parser.decode('"coconut water"\n'), ['coconut water']);
  t.deepEqual(socket.parser.decode('"123"\n'), ['123']);
  t.deepEqual(socket.parser.decode('{"coconut": true}\n'), [{ coconut: true }]);
  t.deepEqual(socket.parser.decode('null\n'), [null]);
  t.deepEqual(socket.parser.decode('[]\n'), [[]]);
});
