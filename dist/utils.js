"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createIdFactory = void 0;

// eslint-disable-next-line no-param-reassign
var createIdFactory = function createIdFactory() {
  var start = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
  return function () {
    return start++;
  };
};

exports.createIdFactory = createIdFactory;