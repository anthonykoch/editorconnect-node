"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isValid = exports.isHandshakeAccept = exports.handshakeAccept = exports.isHandshake = exports.handshake = exports.isCall = exports.call = exports.isReply = exports.reply = exports.createCallIncrementalId = exports.createCallReplyIncrementalId = void 0;

var _cuid = _interopRequireDefault(require("cuid"));

var _isEmpty = _interopRequireDefault(require("lodash/isEmpty"));

var _isLength = _interopRequireDefault(require("lodash/isLength"));

var utils = _interopRequireWildcard(require("./utils"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var createCallReplyIncrementalId = utils.createIdFactory();
exports.createCallReplyIncrementalId = createCallReplyIncrementalId;
var createCallIncrementalId = utils.createIdFactory();
exports.createCallIncrementalId = createCallIncrementalId;

var isFilled = function isFilled(value) {
  return !(0, _isEmpty.default)(value);
};
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


var reply = function reply(payload, call, part, isDone, origin) {
  // A reply with a value of the resulting call
  return {
    iid: createCallIncrementalId(),
    id: (0, _cuid.default)(),
    type: 'reply',
    part: part,
    done: isDone,
    to: {
      iid: call.iid,
      id: call.id,
      event: call.event
    },
    origin: {
      id: origin.id
    },
    payload: payload === undefined ? null : payload
  }; // {'part': 1, 'payload': {'finish': True}, 'type': 'reply', 'to': {'iid': 1, 'id': 'cjecrqj0x0002kvyqeihp91v2', 'event': 'lively-javascript:expressions'}, 'iid': 1, 'origin': {'id': 'lively-javascript-runtime-85996'}, 'id': 'cjecrqj1s0002csyq7fyejm2m', 'done': True}
};

exports.reply = reply;

var isReply = function isReply(message) {
  var _message$origin, _message$to, _message$to2;

  return message && isFilled(message.id) && (0, _isLength.default)(message.iid) && // eslint-disable-next-line no-undef
  isFilled(message === null || message === void 0 ? void 0 : (_message$origin = message.origin) === null || _message$origin === void 0 ? void 0 : _message$origin.id) && (0, _isLength.default)(message.part) && typeof message.done === 'boolean' && // eslint-disable-next-line no-undef
  isFilled(message === null || message === void 0 ? void 0 : (_message$to = message.to) === null || _message$to === void 0 ? void 0 : _message$to.id) && // eslint-disable-next-line no-undef
  isFilled(message === null || message === void 0 ? void 0 : (_message$to2 = message.to) === null || _message$to2 === void 0 ? void 0 : _message$to2.event);
};
/**
 * Creates a call message.
 *
 * @param  {String} name - The name of the event to call
 * @param  {any} payload - The payload to send along with the call
 */


exports.isReply = isReply;

var call = function call(name, payload, origin) {
  return {
    iid: createCallReplyIncrementalId(),
    id: (0, _cuid.default)(),
    type: 'call',
    event: name,
    payload: payload === undefined ? null : payload,
    origin: {
      id: origin.id
    }
  };
};

exports.call = call;

var isCall = function isCall(message) {
  var _message$origin2;

  return message && message.type === 'call' && isFilled(message.id) && (0, _isLength.default)(message.iid) && isFilled(message.event) && message.hasOwnProperty('payload') && // eslint-disable-next-line no-undef
  isFilled((_message$origin2 = message.origin) === null || _message$origin2 === void 0 ? void 0 : _message$origin2.id);
};
/**
 * Creates a handshake message, which is used when a client connects to the server.
 *
 * @param  {any} payload - Any data to send along that those listening on the server
 * might be interested in having.
 * @param  {Object} origin
 */


exports.isCall = isCall;

var handshake = function handshake(payload, origin) {
  return {
    id: (0, _cuid.default)(),
    type: 'handshake',
    origin: {
      id: origin.id
    },
    payload: payload
  };
};

exports.handshake = handshake;

var isHandshake = function isHandshake(message) {
  var _message$origin3;

  return message && message.type === 'handshake' && isFilled(message.id) && // eslint-disable-next-line no-undef
  isFilled((_message$origin3 = message.origin) === null || _message$origin3 === void 0 ? void 0 : _message$origin3.id) && message.hasOwnProperty('payload');
};
/**
 * Creates a handshake accept.
 * @param  {any} payload
 * @param  {Object} origin
 */


exports.isHandshake = isHandshake;

var handshakeAccept = function handshakeAccept(payload, to, origin) {
  return {
    id: (0, _cuid.default)(),
    type: 'handshake-accept',
    origin: {
      id: origin.id
    },
    to: {
      id: to.id
    },
    payload: payload
  };
};

exports.handshakeAccept = handshakeAccept;

var isHandshakeAccept = function isHandshakeAccept(message) {
  var _message$origin4, _message$to3;

  return message && message.type === 'handshake-accept' && isFilled(message.id) && // eslint-disable-next-line no-undef
  isFilled((_message$origin4 = message.origin) === null || _message$origin4 === void 0 ? void 0 : _message$origin4.id) && // eslint-disable-next-line no-undef
  isFilled((_message$to3 = message.to) === null || _message$to3 === void 0 ? void 0 : _message$to3.id) && message.hasOwnProperty('payload');
};
/**
 * Returns true if the message conforms to the api.
 * @param  {any} message
 * @return {Boolean}
 */


exports.isHandshakeAccept = isHandshakeAccept;

var isValid = function isValid(message) {
  return isReply(message) || isCall(message) || isHandshake(message) || isHandshakeAccept(message);
};

exports.isValid = isValid;