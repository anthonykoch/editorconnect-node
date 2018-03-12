import cuid from 'cuid';
import isEmpty from 'lodash/isEmpty';
import isLength from 'lodash/isLength';

import * as utils from './utils';

export const createCallReplyIncrementalId = utils.createIdFactory();
export const createCallIncrementalId = utils.createIdFactory();

const isFilled = value => !isEmpty(value);

/**
 * Creates a reply to a call.
 *
 * @param {any} payload
 * @param {Object} origin
 * @param {number} part
 * @param {boolean} isDone
 * @param {Object} origin
 * @return {Object}
 */
export const reply = (payload, call, part, isDone, origin) => {
  // A reply with a value of the resulting call
  return {
    iid: createCallIncrementalId(),
    id: cuid(),
    type: 'reply',
    part,
    done: isDone,
    to: {
      iid: call.iid,
      id: call.id,
      event: call.event,
    },
    origin: {
      id: origin.id
    },
    payload: payload === undefined ? null : payload,
    hello: 'yes',
  };
};

export const isReply = (message) => (
    message &&
    isFilled(message.id) &&
    isLength(message.iid) &&
    // eslint-disable-next-line no-undef
    isFilled(message?.origin?.id) &&
    isLength(message.part) &&
    typeof message.done === 'boolean' &&
    // eslint-disable-next-line no-undef
    isFilled(message?.to?.id) &&
    // eslint-disable-next-line no-undef
    isFilled(message?.to?.event)
  );

/**
 * Creates a call message.
 *
 * @param  {String} name - The name of the event to call
 * @param  {any} payload - The payload to send along with the call
 */
export const call = (name, payload, origin) => {
  return {
    iid: createCallReplyIncrementalId(),
    id: cuid(),
    type: 'call',
    event: name,
    payload: payload === undefined ? null : payload,
    origin: {
      id: origin.id,
    },
  };
};

export const isCall = (message) => (
    message &&
    message.type === 'call' &&
    isFilled(message.id) &&
    isLength(message.iid) &&
    isFilled(message.event) &&
    message.hasOwnProperty('payload') &&
    // eslint-disable-next-line no-undef
    isFilled(message.origin?.id)
  );

/**
 * Creates a handshake message, which is used when a client connects to the server.
 *
 * @param  {any} payload - Any data to send along that those listening on the server
 * might be interested in having.
 * @param  {Object} origin
 */
export const handshake = (payload, origin) => {
  return {
    id: cuid(),
    type: 'handshake',
    origin: {
      id: origin.id,
    },
    payload,
  };
};

export const isHandshake = (message) => (
    message &&
    message.type === 'handshake' &&
    isFilled(message.id) &&
    // eslint-disable-next-line no-undef
    isFilled(message.origin?.id) &&
    message.hasOwnProperty('payload')
  );

/**
 * Creates a handshake accept.
 * @param  {any} payload
 * @param  {Object} origin
 */
export const handshakeAccept = (payload, to, origin) => {
  return {
    id: cuid(),
    type: 'handshake-accept',
    origin: {
      id: origin.id,
    },
    to: {
      id: to.id
    },
    payload,
  };
};

export const isHandshakeAccept = (message) => (
    message &&
    message.type === 'handshake-accept' &&
    isFilled(message.id) &&
    // eslint-disable-next-line no-undef
    isFilled(message.origin?.id) &&
    // eslint-disable-next-line no-undef
    isFilled(message.to?.id) &&
    message.hasOwnProperty('payload')
  );


/**
 * Returns true if the message conforms to the api.
 * @param  {any} message
 * @return {Boolean}
 */
export const isValid = (message) => {
  return (
      isReply(message) ||
      isCall(message) ||
      isHandshake(message) ||
      isHandshakeAccept(message)
    );
};
