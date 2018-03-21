'use strict';

import assert from 'assert';

import EventEmitter from 'eventemitter2';

import * as Messages from './messages';

// Inspired by
// https://github.com/tj/axon

const PING = Messages.ping();
const PONG = Messages.pong();

/**
 * I don't know what to call this thing if you couldn't tell.
 */
export default class Talkie extends EventEmitter {


  constructor({ pingFrequency=200 }={}) {
    super({ delimiter: ':', wildcard: true });

    /**
     * @private
     * @type {EventEmitter}
     */
    this.api = new EventEmitter({ delimiter: ':', wildcard: true });

    /**
     * @private
     */
    this.hasReceivedPong = false;

    this.setPingFrequency(pingFrequency);

    this.sendPings = () => {

      const loop = () => {
        if (!this.hasReceivedPong) {
          this.emit('this:failed-ping');
        } else {
          this.emit('this:pong');
        }

        this.send(PING);
        this.pingTimeoutId = setTimeout(loop, this.pingFrequency);
        this.hasReceivedPong = false;
      };

      this.send(PING);
      this.pingTimeoutId = setTimeout(loop, this.pingFrequency);
      this.hasReceivedPong = false;
    };

    const onOpen = () => this.send(Messages.handshake(null, this.origin));

    this.once('this:open', onOpen);
  }

  get origin() {
    throw new Error('{Object} origin{ id: string } not implemented');
  }

  setPingFrequency(value) {
    assert(Number.isFinite(value), `{number} pingFrequency, got ${value}`);

    this.pingFrequency = +value;
  }

  send() {
    throw new Error('"send(data) -> void", not implemented');
  }

  startPings() {
    this.sendPings();
  }

  stopPings() {
    clearTimeout(this.pingTimeoutId);
  }

  sendResponsePing() {
    this.send(PONG);
  }

  /**
   * Dispatches events for incoming and outgoing messages.
   * Resolves when all messages have been dispatched. This includes:
   * - When all done replies have been sent.
   * - When all incoming replies have been emitted (which happens synchronously anyway)
   *
   * @public
   * @param  {Array<Message>} messages
   * @return {Promise}
   */
  dispatch(messages) {
    const promises = messages.map(message => {
      assert(Messages.isValid(message), `message does not conform to api, got ${JSON.stringify(message)}`);

      this.emit('this:message', message);

      if (message.type === 'call') {
        return this.handleIncomingCall(message);
      } else if (message.type === 'handshake-accept') {
        return this.handleHandshakeAccept();
      } else if (message.type === 'pong') {
        this.hasReceivedPong = true;
      } else if (message.type === 'handshake') {
        // FIXME: uhhh... what to do here...
      } else if (message.type == 'ping') {
        this.sendResponsePing();
      } else if (message.type === 'reply') {
        return this.handleIncomingReply(message)
      }

      return Promise.resolve();
    });

    return Promise.all(promises);
  }

  handleHandshakeAccept() {
    this.api.emit('this:handshake-accept');
    this.startPings();

    return Promise.resolve();
  }

  /**
   * Handles dispatching incoming calls to their event handlers.
   * Returns a promise when all handlers have returned data.
   *
   * @private
   * @param  {Object} message
   * @return {Promise} returns a promise for testing purposes
   */
  handleIncomingCall(message) {
    this.api.emit('receive:call', message);
    const listeners = this.listeners(message.event);

    if (listeners.length === 0) {
      return;
    }

    let part = 0;

    const reply = (payload) => {
      const replyMessage = Messages.reply(payload, message, part, false, this.origin);
      this.send(replyMessage);
      this.api.emit('send:reply', replyMessage);
      part += 1;
    };

    const promises = listeners.map(listener => {
      const value = listener(message.payload, reply);
      const promise = Promise.resolve(value);

      return promise.then((value) => {
        const replyMessage = Messages.reply(value, message, part, true, this.origin);

        this.send(replyMessage);
        this.api.emit('send:reply', replyMessage);
      });
    });

    return Promise.all(promises);
  }

  /**
   * Dispatches replies to the talkie.api listeners, which fires the onReply and
   * onDone callbacks, as well as causes the talkie.call() promise to resolve.
   *
   * @private
   * @param  {Object} message
   * @return {Promise} returns a promise for testing purposes
   */
  handleIncomingReply(message) {
    this.api.emit('receive:reply', message);
    this.api.emit(`reply:${message.to.id}`, message);

    return Promise.resolve();
  }

  /**
   * Calls an action to whoever connects
   *
   * @public
   * @param  {String} name - The action name
   * @param  {any} payload - the payload to send along with the action
   * @param  {Function} options.onReply - Called when a reply is received
   * @param  {Function} options.onDone - Called when the last reply is sent.
   * @param  {Number} options.keepAlive - When true, the reply callback will continue to be called
   *                                      even after onDone has been called.
   * @param  {Number} options.doneTimeout -
   * @param  {Number} options.replyTimeout - How long to wait before throwing an error after
   *                                         a call has been sent and a reply has not be received
   * @return {Promise} - Resolves when the call is done
   */
  call(
      name,
      payload={}, {
      onReply: onReplyCallback,
      onDone: onDoneCallback,
      keepAlive=false,
      doneTimeout=Talkie.DEFAULT_DONE_TIMEOUT,
      replyTimeout=Talkie.DEFAULT_REPLY_TIMEOUT,
    }={}) {
    // TODO: Add limit option that stops listening to replies after n replies
    const call = Messages.call(name, payload, this.origin);
    const event = `reply:${call.id}`;

    let destroy = null;

    const promise = new Promise((resolve, reject) => {
      assert(
          this.origin && typeof this.origin === 'object',
          `Talkie property "origin" should be an object, got ${this.origin}`
        );

      destroy = (resolveIfNotResolved) => {
        // Resolve only if we haven't already resolved
        if (resolveIfNotResolved && !isResolved) {
          clearTimeout(replyTimeoutId);
          clearTimeout(doneTimeoutId);
          resolve({ data: null, parts, canceled: true, });
        }

        this.api.off(event, onReply);
      };

      let parts = [];
      let replyTimeoutId = null;
      let doneTimeoutId = null;
      let isResolved = false;

      const onReply = ({ payload: data, part, done }) => {
        clearTimeout(replyTimeoutId);
        parts.push(data);
        replyTimeoutId = null;

        if (done) {
          clearTimeout(doneTimeoutId);
          doneTimeoutId = null;
          onDoneCallback && onDoneCallback(data, parts);
          isResolved = true;
          resolve({ data, parts, canceled: false });

          if (!keepAlive) {
            destroy();
          }
        } else {
          onReplyCallback && onReplyCallback(data, part);
        }
      };

      if (replyTimeout >= 0 && Number.isFinite(replyTimeout)) {
        replyTimeoutId = setTimeout(() => {
          destroy(false);

          reject(new Error(`timeout until first reply has been exceeded, ${call.id}`));
        }, replyTimeout);
      }

      if (doneTimeout >= 0 && Number.isFinite(doneTimeout)) {
        doneTimeoutId = setTimeout(() => {
          destroy(false);

          reject(new Error(`timeout until done has been exceeded, ${call.id}`));
        }, doneTimeout);
      }

      this.api.on(event, onReply);
      this.send(call);
      this.api.emit('send:call', call);
    });

    return {
      call,
      promise,
      destroy: () => destroy(true),
    };
  }

}

Talkie.DEFAULT_DONE_TIMEOUT = 2000;
Talkie.DEFAULT_REPLY_TIMEOUT = 2000;
Talkie.Messages = Messages;
