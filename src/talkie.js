'use strict';

import assert from 'assert';

import EventEmitter from 'eventemitter2';

import * as Messages from './messages';

// Inspired by
// https://github.com/tj/axon

/**
 * Returns true if the message conforms to the api.
 * @param  {any} message
 * @return {Boolean}
 */
export const validate = (message) => {
  if (message == null) {
    return false;
  } else if (message.type === 'call') {
    return (typeof message.event === 'string');
  } else if (message.type === 'reply') {
    return (
        Number.isFinite(message.part) && message.part >= 0 &&
        typeof message.done === 'boolean' &&
        message.origin &&
        typeof message.origin.id === 'string' &&
        typeof message.origin.event === 'string'
      );
  }

  return false;
};

/**
 * I don't know what to call this thing if you couldn't tell.
 */
export default class Talkie {

  constructor() {
    /**
     * @private
     * @type {EventEmitter}
     */
    this.api = new EventEmitter({ delimiter: ':', wildcard: true });

    /**
     * @private
     * @type {EventEmitter}
     */
    this.hub = new EventEmitter({ delimiter: ':', wildcard: true });

    this.callbacks = new Map();
  }

  send() {
    throw new Error('"send(data) -> void", not implemented');
  }

  /**
   * Dispatches events for incoming and outgoing messages
   * @param  {Array<Message>} messages [description]
   * @return {[type]}          [description]
   */
  dispatch(messages) {
    for (const message of messages) {
      assert(validate(message), `message does not conform to api, got ${JSON.stringify(message)}`);

      this.hub.emit('this:message', message);

      let part = 0;
      let isDone = false;

      const reply = (payload) => {
        assert(!isDone, 'reply called after done');
        const origin = message;
        const replyMessage = Messages.reply(payload, origin, part, isDone);

        this.send(replyMessage);
        part += 1;
      };

      const done = (payload) => {
        assert(!isDone, 'done called too many times');

        const origin = message;
        const replyMessage = Messages.reply(payload, origin, part, true);

        this.send(replyMessage);
        isDone = true;
      };

      switch (message.type) {
        case 'call':
          this.api.emit('receive:call', message);
          this.hub.emit(message.event, message.payload, reply, done);
          break;
        case 'reply':
          this.api.emit('receive:reply', message);
          this.api.emit(`reply:${message.origin.id}`, message);
          break;
        default:
          break;
      }
    }
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
      let parts = [];
      let replyTimeoutId = null;
      let doneTimeoutId = null;
      const call = Messages.call(name, payload);
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

  createCallbackWrapper(callback) {
    return cb;
  }

  getCallbackWrapper(callback) {
    return this.callbacks.get(callback);
  }

  /**
   * Removes an event listener
   * @param  {String}   name
   * @param  {Function} callback
   * @public
   */
  off(name, callback) {
    // TODO
    // const cb = this.getCallbackWrapper(callback);

    this.hub.off(name, callback);

    return this;
  }

  /**
   * Removes an event listener
   * @param  {String}   name
   * @param  {Function} callback
   * @public
   */
  on(name, callback) {
    this.hub.on(name, callback);

    return this;
  }

}

Talkie.DEFAULT_DONE_TIMEOUT = 2000;
Talkie.DEFAULT_REPLY_TIMEOUT = 2000;
