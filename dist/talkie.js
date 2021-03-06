'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _assert = _interopRequireDefault(require("assert"));

var _eventemitter = _interopRequireDefault(require("eventemitter2"));

var Messages = _interopRequireWildcard(require("./messages"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// Inspired by
// https://github.com/tj/axon
var PING = Messages.ping();
var PONG = Messages.pong();
/**
 * I don't know what to call this thing if you couldn't tell.
 */

var Talkie =
/*#__PURE__*/
function (_EventEmitter) {
  _inherits(Talkie, _EventEmitter);

  function Talkie() {
    var _this;

    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        _ref$pingFrequency = _ref.pingFrequency,
        pingFrequency = _ref$pingFrequency === void 0 ? 200 : _ref$pingFrequency;

    _classCallCheck(this, Talkie);

    _this = _possibleConstructorReturn(this, (Talkie.__proto__ || Object.getPrototypeOf(Talkie)).call(this, {
      delimiter: ':',
      wildcard: true
    }));
    /**
     * @private
     * @type {EventEmitter}
     */

    _this.api = new _eventemitter.default({
      delimiter: ':',
      wildcard: true
    });
    /**
     * @private
     */

    _this.hasReceivedPong = false;

    _this.setPingFrequency(pingFrequency);

    _this.sendPings = function () {
      var loop = function loop() {
        if (!_this.hasReceivedPong) {
          _this.emit('this:failed-ping');
        } else {
          _this.emit('this:pong');
        }

        _this.send(PING);

        _this.pingTimeoutId = setTimeout(loop, _this.pingFrequency);
        _this.hasReceivedPong = false;
      };

      _this.send(PING);

      _this.pingTimeoutId = setTimeout(loop, _this.pingFrequency);
      _this.hasReceivedPong = false;
    };

    var onOpen = function onOpen() {
      return _this.send(Messages.handshake(null, _this.origin));
    };

    _this.once('this:open', onOpen);

    return _this;
  }

  _createClass(Talkie, [{
    key: "setPingFrequency",
    value: function setPingFrequency(value) {
      (0, _assert.default)(Number.isFinite(value), "{number} pingFrequency, got ".concat(value));
      this.pingFrequency = +value;
    }
  }, {
    key: "send",
    value: function send() {
      throw new Error('"send(data) -> void", not implemented');
    }
  }, {
    key: "startPings",
    value: function startPings() {
      this.sendPings();
    }
  }, {
    key: "stopPings",
    value: function stopPings() {
      clearTimeout(this.pingTimeoutId);
    }
  }, {
    key: "sendResponsePing",
    value: function sendResponsePing() {
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

  }, {
    key: "dispatch",
    value: function dispatch(messages) {
      var _this2 = this;

      var promises = messages.map(function (message) {
        (0, _assert.default)(Messages.isValid(message), "message does not conform to api, got ".concat(JSON.stringify(message)));

        _this2.emit('this:message', message);

        if (message.type === 'call') {
          return _this2.handleIncomingCall(message);
        } else if (message.type === 'handshake-accept') {
          return _this2.handleHandshakeAccept();
        } else if (message.type === 'pong') {
          _this2.hasReceivedPong = true;
        } else if (message.type === 'handshake') {// FIXME: uhhh... what to do here...
        } else if (message.type == 'ping') {
          _this2.sendResponsePing();
        } else if (message.type === 'reply') {
          return _this2.handleIncomingReply(message);
        }

        return Promise.resolve();
      });
      return Promise.all(promises);
    }
  }, {
    key: "handleHandshakeAccept",
    value: function handleHandshakeAccept() {
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

  }, {
    key: "handleIncomingCall",
    value: function handleIncomingCall(message) {
      var _this3 = this;

      this.api.emit('receive:call', message);
      var listeners = this.listeners(message.event);

      if (listeners.length === 0) {
        return;
      }

      var part = 0;

      var reply = function reply(payload) {
        var replyMessage = Messages.reply(payload, message, part, false, _this3.origin);

        _this3.send(replyMessage);

        _this3.api.emit('send:reply', replyMessage);

        part += 1;
      };

      var promises = listeners.map(function (listener) {
        var value = listener(message.payload, reply);
        var promise = Promise.resolve(value);
        return promise.then(function (value) {
          var replyMessage = Messages.reply(value, message, part, true, _this3.origin);

          _this3.send(replyMessage);

          _this3.api.emit('send:reply', replyMessage);
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

  }, {
    key: "handleIncomingReply",
    value: function handleIncomingReply(message) {
      this.api.emit('receive:reply', message);
      this.api.emit("reply:".concat(message.to.id), message);
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

  }, {
    key: "call",
    value: function call(name) {
      var _this4 = this;

      var payload = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var _ref2 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
          onReplyCallback = _ref2.onReply,
          onDoneCallback = _ref2.onDone,
          _ref2$keepAlive = _ref2.keepAlive,
          keepAlive = _ref2$keepAlive === void 0 ? false : _ref2$keepAlive,
          _ref2$doneTimeout = _ref2.doneTimeout,
          doneTimeout = _ref2$doneTimeout === void 0 ? Talkie.DEFAULT_DONE_TIMEOUT : _ref2$doneTimeout,
          _ref2$replyTimeout = _ref2.replyTimeout,
          replyTimeout = _ref2$replyTimeout === void 0 ? Talkie.DEFAULT_REPLY_TIMEOUT : _ref2$replyTimeout;

      // TODO: Add limit option that stops listening to replies after n replies
      var call = Messages.call(name, payload, this.origin);
      var event = "reply:".concat(call.id);
      var _destroy = null;
      var promise = new Promise(function (resolve, reject) {
        (0, _assert.default)(_this4.origin && _typeof(_this4.origin) === 'object', "Talkie property \"origin\" should be an object, got ".concat(_this4.origin));

        _destroy = function destroy(resolveIfNotResolved) {
          // Resolve only if we haven't already resolved
          if (resolveIfNotResolved && !isResolved) {
            clearTimeout(replyTimeoutId);
            clearTimeout(doneTimeoutId);
            resolve({
              data: null,
              parts: parts,
              canceled: true
            });
          }

          _this4.api.off(event, onReply);
        };

        var parts = [];
        var replyTimeoutId = null;
        var doneTimeoutId = null;
        var isResolved = false;

        var onReply = function onReply(_ref3) {
          var data = _ref3.payload,
              part = _ref3.part,
              done = _ref3.done;
          clearTimeout(replyTimeoutId);
          parts.push(data);
          replyTimeoutId = null;

          if (done) {
            clearTimeout(doneTimeoutId);
            doneTimeoutId = null;
            onDoneCallback && onDoneCallback(data, parts);
            isResolved = true;
            resolve({
              data: data,
              parts: parts,
              canceled: false
            });

            if (!keepAlive) {
              _destroy();
            }
          } else {
            onReplyCallback && onReplyCallback(data, part);
          }
        };

        if (replyTimeout >= 0 && Number.isFinite(replyTimeout)) {
          replyTimeoutId = setTimeout(function () {
            _destroy(false);

            reject(new Error("timeout until first reply has been exceeded, ".concat(call.id)));
          }, replyTimeout);
        }

        if (doneTimeout >= 0 && Number.isFinite(doneTimeout)) {
          doneTimeoutId = setTimeout(function () {
            _destroy(false);

            reject(new Error("timeout until done has been exceeded, ".concat(call.id)));
          }, doneTimeout);
        }

        _this4.api.on(event, onReply);

        _this4.send(call);

        _this4.api.emit('send:call', call);
      });
      return {
        call: call,
        promise: promise,
        destroy: function destroy() {
          return _destroy(true);
        }
      };
    }
  }, {
    key: "origin",
    get: function get() {
      throw new Error('{Object} origin{ id: string } not implemented');
    }
  }]);

  return Talkie;
}(_eventemitter.default);

exports.default = Talkie;
Talkie.DEFAULT_DONE_TIMEOUT = 2000;
Talkie.DEFAULT_REPLY_TIMEOUT = 2000;
Talkie.Messages = Messages;