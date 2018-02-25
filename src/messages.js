import * as utils from './utils';
import cuid from 'cuid';

export const createCallReplyIncrementalId = utils.createIdFactory();
export const createCallIncrementalId = utils.createIdFactory();

/**
 * Creates a reply message
 * @param  {any}  payload
 * @param  {Object}  origin
 * @param  {number}  part
 * @param  {boolean} isDone
 * @return {Object}
 */
export const reply = (payload, origin, part, isDone) => {
  // A reply with a value of the resulting call
  return {
    iid: createCallIncrementalId(),
    id: cuid(),
    type: 'reply',
    // FIXME: can't remember if or why this is necessary
    event: origin.event,
    part,
    done: isDone,
    origin: {
      iid: origin.iid,
      id: origin.id,
      event: origin.event,
    },
    payload: payload === undefined ? null : payload,
  };
};

/**
 * Creates a call message
 *
 * @param  {String} name - The name of the event to call
 * @param  {any} payload - The payload to send along with the call
 */
export const call = (name, payload) => {
  return {
    iid: createCallReplyIncrementalId(),
    id: cuid(),
    type: 'call',
    event: name,
    payload: payload === undefined ? null : payload,
  };
};
