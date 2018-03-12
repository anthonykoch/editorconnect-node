"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.createSocket = exports.SERVER_CLOSE = exports.CONNECTION_FAILURE = exports.MessageParser = exports.prepareMessage = void 0;

var _assert = _interopRequireDefault(require("assert"));

var _ws = _interopRequireDefault(require("ws"));

var _talkie = _interopRequireDefault(require("./talkie"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

// Keep in mind
// https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications
// https://github.com/Luka967/ws-close-codes
var prepareMessage = function prepareMessage(message) {
  return message;
};

exports.prepareMessage = prepareMessage;

var MessageParser =
/*#__PURE__*/
function () {
  function MessageParser() {
    var END_OF_MESSAGE = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : MessageParser.END_OF_MESSAGE;

    _classCallCheck(this, MessageParser);

    this.END_OF_MESSAGE = String(END_OF_MESSAGE);
  }

  _createClass(MessageParser, [{
    key: "encode",
    value: function encode(message) {
      var str = '';

      try {
        str = JSON.stringify(message);
      } catch (err) {
        throw new Error("Message can could not be encoded with JSON.stringify");
      }

      return str + this.END_OF_MESSAGE;
    }
    /**
     * @param {Buffer} buffer
     */

  }, {
    key: "decode",
    value: function decode(buffer) {
      return buffer.toString('utf8').split(this.END_OF_MESSAGE).filter(function (message) {
        return message;
      }).map(function (message) {
        try {
          return JSON.parse(message);
        } catch (err) {
          throw new Error("Could not decode message with JSON.parse");
        }
      });
    }
  }]);

  return MessageParser;
}();

exports.MessageParser = MessageParser;
MessageParser.END_OF_MESSAGE = '\n';
var CONNECTION_FAILURE = 1 << 1;
exports.CONNECTION_FAILURE = CONNECTION_FAILURE;
var SERVER_CLOSE = 1 << 2; // const MUTUAL = 4;

exports.SERVER_CLOSE = SERVER_CLOSE;

var createSocket = function createSocket() {
  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  return new (Function.prototype.bind.apply(Socket, [null].concat(args)))();
};

exports.createSocket = createSocket;

var Socket =
/*#__PURE__*/
function (_Talkie) {
  _inherits(Socket, _Talkie);

  function Socket(url) {
    var _this;

    var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        _ref$prepare = _ref.prepare,
        prepare = _ref$prepare === void 0 ? prepareMessage : _ref$prepare,
        _ref$parser = _ref.parser,
        parser = _ref$parser === void 0 ? new MessageParser(MessageParser.END_OF_MESSAGE) : _ref$parser,
        wsOptions = _ref.wsOptions,
        origin = _ref.origin,
        _ref$handshakeTimeout = _ref.handshakeTimeout,
        handshakeTimeout = _ref$handshakeTimeout === void 0 ? 2000 : _ref$handshakeTimeout;

    _classCallCheck(this, Socket);

    _this = _possibleConstructorReturn(this, (Socket.__proto__ || Object.getPrototypeOf(Socket)).call(this));

    _this.setParser(parser).setUrl(url).setPrepare(prepare).setHandshakeTimeout(handshakeTimeout);

    (0, _assert.default)(origin && typeof origin.id === 'string' && origin.id.length > 0, "{string} origin.id(min:1), got ".concat(origin)); // this.retry = Number(retry);
    // this.failedConnection = false;

    Object.defineProperty(_assertThisInitialized(_this), 'origin', {
      enumerable: true,
      configurable: true,
      writable: true,
      value: origin
    });
    _this.socket = null;
    _this.wsOptions = Object(wsOptions);
    return _this;
  }

  _createClass(Socket, [{
    key: "setUrl",
    value: function setUrl(url) {
      (0, _assert.default)(typeof url === 'string', "{string} url, got ".concat(url));
      this.url = url;
      return this;
    }
  }, {
    key: "setPrepare",
    value: function setPrepare(fn) {
      (0, _assert.default)(typeof fn === 'function', "{function} fn, got ".concat(fn));
      this.prepare = fn;
      return this;
    }
  }, {
    key: "setParser",
    value: function setParser(parser) {
      (0, _assert.default)(parser, "{object} parser, got ".concat(parser));
      (0, _assert.default)(typeof parser.encode === 'function', "{function} parser.encode, got ".concat(parser.encode));
      (0, _assert.default)(typeof parser.decode === 'function', "{function} parser.decode, got ".concat(parser.decode));
      this.parser = parser;
      return this;
    }
  }, {
    key: "setHandshakeTimeout",
    value: function setHandshakeTimeout(value) {
      (0, _assert.default)(Number.isFinite(value) && value >= 0, "{uinteger} timeout, got ".concat(value));
      this.handshakeTimeout = Number(value);
    }
  }, {
    key: "open",
    value: function open() {
      var _this2 = this;

      // We'll allow a new socket connection while closed or closing, but not
      // while connected or connecting
      (0, _assert.default)(!this.connected && !this.connecting, 'connection must be closed before starting a new one');
      var options = Object.assign({}, this.wsOptions, {});
      var ws = this.socket = new _ws.default(this.url, options);
      return new Promise(function (resolve) {
        var error = null;

        var onOpen = function onOpen() {
          var onHandshakeAccept = function onHandshakeAccept() {
            clearTimeout(timeoutId);
            resolve({
              error: null,
              code: null,
              reason: null
            });
          };

          _this2.api.once('this:handshake-accept', onHandshakeAccept);

          var timeoutId = setTimeout(function () {
            _this2.api.off('this:handshake-accept', onHandshakeAccept);

            resolve({
              error: new Error('Failed handshake'),
              code: null,
              reason: null
            });
          }, _this2.handshakeTimeout);

          _this2.emit('this:open');
        };

        var onClose = function onClose(code, reason) {
          removeListeners();
          resolve({
            error: error,
            code: code,
            reason: reason
          });

          _this2.emit('this:close', ws, {
            error: error,
            code: code,
            reason: reason
          }); // TODO: if (this.retry & CONNECTION_FAIL) {

        };

        var onError = function onError(error) {
          if (error.code === 'ECONNREFUSED') {
            // this.failedConnection = true;
            _this2.emit('this:connect-failure');
          }

          _this2.emit('this:error', error);
        };

        var onMessage = function onMessage(data) {
          var messages = null;

          try {
            messages = _this2.parser.decode(data);
          } catch (err) {
            throw new Error('parser.decode could not decode message from socket');
          }

          _this2.emit('this:data', data);

          _this2.dispatch(messages);
        };

        var removeListeners = function removeListeners() {
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
  }, {
    key: "send",
    value: function send(data) {
      if (!this.connected) return;
      var message = this.parser.encode(data);
      this.socket.send(this.prepare(message));
    }
  }, {
    key: "connecting",
    get: function get() {
      return this.socket != null && this.socket.readyState === _ws.default.CONNECTING;
    }
  }, {
    key: "connected",
    get: function get() {
      return this.socket != null && this.socket.readyState === _ws.default.OPEN;
    }
  }, {
    key: "closing",
    get: function get() {
      return this.socket != null && this.socket.readyState === _ws.default.CLOSING;
    }
  }, {
    key: "closed",
    get: function get() {
      return this.socket == null || this.socket.readyState === _ws.default.CLOSE;
    }
  }]);

  return Socket;
}(_talkie.default);

exports.default = Socket;