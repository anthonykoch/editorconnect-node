"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "Socket", {
  enumerable: true,
  get: function get() {
    return _socket.default;
  }
});
Object.defineProperty(exports, "Talkie", {
  enumerable: true,
  get: function get() {
    return _talkie.default;
  }
});
exports.Messages = void 0;

var _Messages = _interopRequireWildcard(require("./messages"));

var _socket = _interopRequireDefault(require("./socket"));

var _talkie = _interopRequireDefault(require("./talkie"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

var Messages = _Messages;
exports.Messages = Messages;