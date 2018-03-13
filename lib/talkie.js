'use strict';

import assert from 'assert';

import EventEmitter from 'eventemitter2';

import * as Messages from './messages';

// Inspired by
// https://github.com/tj/axon

/**
 * I don't know what to call this thing if you couldn't tell.
 */
export default class Talkie extends EventEmitter {


  constructor() {
    super({ delimiter: ':', wildcard: true });

    /**
     * @private
     * @type {EventEmitter}
     */
    this.api = new EventEmitter({ delimiter: ':', wildcard: true });

    const onOpen = () => this.send(Messages.handshake(null, this.origin));

    this.once('this:open', onOpen);
  }

  get origin() {
    throw new Error('{Object} origin{ id: string } not implemented');
  }

  send() {
    throw new Error('"send(data) -> void", not implemented');
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
      }

      return this.handleIncomingReply(message);
    });

    return Promise.all(promises);
  }

  handleHandshakeAccept() {
    this.api.emit('this:handshake-accept');

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
   * @param  {Function} options.callback - memes
   * @param  {Number} options.timeout - How long to wait before throwing an error
   * @return {Promise} - Resolves when the call is done
   */
  call(
      name,
      payload={}, {
      onReply: onReplyCallback,
      onDone: onDoneCallback,
      doneTimeout=Talkie.DEFAULT_DONE_TIMEOUT,
      replyTimeout=Talkie.DEFAULT_REPLY_TIMEOUT,
    }={}) {
    // TODO: Add limit option that stops listening to replies after n replies
    return new Promise((resolve, reject) => {
      assert(
          this.origin && typeof this.origin === 'object',
          `Talkie property "origin" should be an object, got ${this.origin}`
        );

      let parts = [];
      let replyTimeoutId = null;
      let doneTimeoutId = null;
      const call = Messages.call(name, payload, this.origin);
      const event = `reply:${call.id}`;
      const off = () => this.api.off(event, onReply);

      const onReply = ({ payload: data, part, done }) => {
        // console.log('CLEARED');
        // console.log('replyTimeoutId', replyTimeoutId)
        // console.log('clearing replyTimeoutId');
        clearTimeout(replyTimeoutId);
        parts.push(data);
        replyTimeoutId = null;

        if (done) {
          // console.log('clearing doneTimeoutId');
          // console.log('doneTimeoutId', doneTimeoutId)
          clearTimeout(doneTimeoutId);
          doneTimeoutId = null;
          onDoneCallback && onDoneCallback(data, parts);
          resolve({ data, parts });
          off();
        } else {
          onReplyCallback && onReplyCallback(data, part);
        }
      };

      if (replyTimeout >= 0 && Number.isFinite(replyTimeout)) {
        replyTimeoutId = setTimeout(() => {
          // console.log('replyTimeoutId FIRED', replyTimeoutId)
          off();

          reject(new Error(`timeout until first reply has been exceeded, ${call.id}`));
        }, replyTimeout);
      }

      if (doneTimeout >= 0 && Number.isFinite(doneTimeout)) {
        doneTimeoutId = setTimeout(() => {
          // console.log('doneTimeoutId', doneTimeoutId)
          off();

          reject(new Error(`timeout until done has been exceeded, ${call.id}`));
        }, doneTimeout);
      }

      this.api.on(event, onReply);
      this.send(call);
      this.api.emit('send:call', call);
    });
  }

  walkietalkie() {
    for (let i = 0; i < 10; i++) {
      global.talk(i);
    }
  }

}

Talkie.DEFAULT_DONE_TIMEOUT = 2000;
Talkie.DEFAULT_REPLY_TIMEOUT = 2000;
Talkie.Messages = Messages;
