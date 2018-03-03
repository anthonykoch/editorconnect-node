import assert from 'assert';

import WebSocket from 'ws';

import Talkie from './talkie';

// Keep in mind
// https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications
// https://github.com/Luka967/ws-close-codes

export const prepareMessage = message => message;


export class MessageParser {

  constructor(END_OF_MESSAGE=MessageParser.END_OF_MESSAGE) {
    this.END_OF_MESSAGE = String(END_OF_MESSAGE);
  }

  encode(message) {
    let str = '';

    try {
      str = JSON.stringify(message);
    } catch (err) {
      throw new Error(`Message can could not be encoded with JSON.stringify`);
    }

    return str + this.END_OF_MESSAGE;
  }

  /**
   * @param {Buffer} buffer
   */
  decode(buffer) {
    return buffer.toString('utf8')
      .split(this.END_OF_MESSAGE)
      .filter(message => message)
      .map(message => {
        try {
          return JSON.parse(message);
        } catch (err) {
          throw new Error(`Could not decode message with JSON.parse`);
        }
      });
  }

}

MessageParser.END_OF_MESSAGE = '\n';

export const CONNECTION_FAILURE = 1 << 1;
export const SERVER_CLOSE = 1 << 2;
// const MUTUAL = 4;

export const createSocket = (...args) => new Socket(...args);

export default class Socket extends Talkie {

  constructor(url, {
    prepare=prepareMessage,
    parser=new MessageParser(MessageParser.END_OF_MESSAGE),
    wsOptions,
    // retry, TODO
  }={}) {
    super();
    this.setParser(parser)
      .setUrl(url)
      .setPrepare(prepare);

    // this.retry = Number(retry);
    // this.failedConnection = false;
    this.socket = null;
    this.wsOptions = Object(wsOptions);
  }

  get connecting() {
    return this.socket != null && this.socket.readyState === WebSocket.CONNECTING;
  }

  get connected() {
    return this.socket != null && this.socket.readyState === WebSocket.OPEN;
  }

  get closing() {
    return this.socket != null && this.socket.readyState === WebSocket.CLOSING;
  }

  get closed() {
    return this.socket == null || this.socket.readyState === WebSocket.CLOSE;
  }

  setUrl(url) {
    assert(typeof url === 'string', `{string} url, got ${url}`);

    this.url = url;

    return this;
  }

  setPrepare(fn) {
    assert(typeof fn === 'function', `{function} fn, got ${fn}`);

    this.prepare = fn;

    return this;
  }

  setParser(parser) {
    assert(parser, `{object} parser, got ${parser}`);
    assert(typeof parser.encode === 'function', `{function} parser.encode, got ${parser.encode}`);
    assert(typeof parser.decode === 'function', `{function} parser.decode, got ${parser.decode}`);
    this.parser = parser;

    return this;
  }

  open() {
    // We'll allow a new socket connection while closed or closing, but not
    // while connected or connecting

    assert(
        !this.connected && !this.connecting,
        'connection must be closed before starting a new one'
      );

    const options = Object.assign({}, this.wsOptions, {});
    const ws = this.socket = new WebSocket(this.url, options);

    return new Promise((resolve, reject) => {
      let error = null;

      const onOpen = () => {
        // console.log('opened');
        resolve({});
        this.hub.emit('this:open');
      };

      const onClose = (code, reason) => {
        // console.log('closed');
        removeListeners();
        resolve({ error, code, reason });
        this.hub.emit('this:close', ws, { error, code, reason });

        // TODO
        // if (this.retry & CONNECTION_FAIL) {
        // }
      };

      const onError = (error) => {
        if (error.code === 'ECONNREFUSED') {
          // this.failedConnection = true;
          this.hub.emit('this:connect-failure');
        }

        this.hub.emit('this:error', error);
      };

      const onMessage = (data) => {
        let messages = null;

        try {
          messages = this.parser.decode(data);
        } catch (err) {
          throw new Error('parser.decode could not decode message from socket');
        }

        this.hub.emit('this:data', data);
        this.dispatch(messages)

      };

      const removeListeners = () => {
        ws.removeEventListener('error', onError);
        ws.removeEventListener('open', onOpen);
        ws.removeEventListener('close', onClose);
        ws.removeEventListener('message', onMessage);
      };

      ws.on('error', onError);
      ws.on('open', onOpen);
      ws.on('close', onClose);
      ws.on('message', onMessage);
    });
  }

  send(data) {
    if (!this.connected) return;

    const message = this.parser.encode(data);

    this.socket.send(this.prepare(message))
  }

}
