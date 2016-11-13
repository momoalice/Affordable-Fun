'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @class layer.Logger
 * @private
 *
 */

var _require$LOG = require('./const').LOG;

var DEBUG = _require$LOG.DEBUG;
var INFO = _require$LOG.INFO;
var WARN = _require$LOG.WARN;
var ERROR = _require$LOG.ERROR;
var NONE = _require$LOG.NONE;

var _require = require('./client-utils');

var isEmpty = _require.isEmpty;

// Pretty arbitrary test that IE/edge fails and others don't.  Yes I could do a more direct
// test for IE/edge but its hoped that MS will fix this around the time they cleanup their internal console object.

var supportsConsoleFormatting = Boolean(console.assert && console.assert.toString().match(/assert/));
var LayerCss = 'color: #888; font-weight: bold;';
var Black = 'color: black';
/* istanbulify ignore next */

var Logger = function () {
  function Logger() {
    _classCallCheck(this, Logger);
  }

  _createClass(Logger, [{
    key: 'log',
    value: function log(msg, obj, type, color) {
      /* istanbul ignore else */
      if (typeof msg === 'string') {
        var timestamp = new Date().toLocaleTimeString();
        if (supportsConsoleFormatting) {
          console.log('%cLayer%c ' + type + '%c [' + timestamp + ']: ' + msg, LayerCss, 'color: ' + color, Black);
        } else {
          console.log('Layer ' + type + ' [' + timestamp + ']: ' + msg);
        }
      } else {
        this._logObj(msg, type, color);
      }
      if (obj) this._logObj(obj, type, color);
    }
  }, {
    key: '_logObj',
    value: function _logObj(obj, type, color) {
      /* istanbul ignore next */
      if (!obj || isEmpty(obj)) return;
      /* istanbul ignore next */
      if (obj.constructor.name === 'Object') {
        if (supportsConsoleFormatting) {
          console.log('%cLayer%c ' + type + '%c: ' + JSON.stringify(obj, null, 4), LayerCss, 'color: ' + color, Black);
        } else {
          console.log('Layer ' + type + ': ' + JSON.stringify(obj, null, 4));
        }
      } else {
        if (supportsConsoleFormatting) {
          console.log('%cLayer%c ' + type + '%c: %O', LayerCss, 'color: ' + color, Black, obj);
        } else {
          console.log('Layer ' + type + ':', obj);
        }
      }
    }
  }, {
    key: 'debug',
    value: function debug(msg, obj) {
      /* istanbul ignore next */
      if (this.level >= DEBUG) this.log(msg, obj, 'DEBUG', '#888');
    }
  }, {
    key: 'info',
    value: function info(msg, obj) {
      /* istanbul ignore next */
      if (this.level >= INFO) this.log(msg, obj, 'INFO', 'black');
    }
  }, {
    key: 'warn',
    value: function warn(msg, obj) {
      /* istanbul ignore next */
      if (this.level >= WARN) this.log(msg, obj, 'WARN', 'orange');
    }
  }, {
    key: 'error',
    value: function error(msg, obj) {
      /* istanbul ignore next */
      if (this.level >= ERROR) this.log(msg, obj, 'ERROR', 'red');
    }
  }]);

  return Logger;
}();

/* istanbul ignore next */


Logger.prototype.level = typeof jasmine === 'undefined' ? ERROR : NONE;

var logger = new Logger();

module.exports = logger;
//# sourceMappingURL=data:application/json;base64,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T0FBUCxLQUFtQixXQUFuQixHQUFpQyxLQUFqQyxHQUF5QyxJQUF6Qzs7QUFFekIsSUFBTSxTQUFTLElBQUksTUFBSixFQUFUOztBQUVOLE9BQU8sT0FBUCxHQUFpQixNQUFqQiIsImZpbGUiOiJsb2dnZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBjbGFzcyBsYXllci5Mb2dnZXJcbiAqIEBwcml2YXRlXG4gKlxuICovXG5jb25zdCB7IERFQlVHLCBJTkZPLCBXQVJOLCBFUlJPUiwgTk9ORSB9ID0gcmVxdWlyZSgnLi9jb25zdCcpLkxPRztcbmNvbnN0IHsgaXNFbXB0eSB9ID0gcmVxdWlyZSgnLi9jbGllbnQtdXRpbHMnKTtcblxuLy8gUHJldHR5IGFyYml0cmFyeSB0ZXN0IHRoYXQgSUUvZWRnZSBmYWlscyBhbmQgb3RoZXJzIGRvbid0LiAgWWVzIEkgY291bGQgZG8gYSBtb3JlIGRpcmVjdFxuLy8gdGVzdCBmb3IgSUUvZWRnZSBidXQgaXRzIGhvcGVkIHRoYXQgTVMgd2lsbCBmaXggdGhpcyBhcm91bmQgdGhlIHRpbWUgdGhleSBjbGVhbnVwIHRoZWlyIGludGVybmFsIGNvbnNvbGUgb2JqZWN0LlxuY29uc3Qgc3VwcG9ydHNDb25zb2xlRm9ybWF0dGluZyA9IEJvb2xlYW4oY29uc29sZS5hc3NlcnQgJiYgY29uc29sZS5hc3NlcnQudG9TdHJpbmcoKS5tYXRjaCgvYXNzZXJ0LykpO1xuY29uc3QgTGF5ZXJDc3MgPSAnY29sb3I6ICM4ODg7IGZvbnQtd2VpZ2h0OiBib2xkOyc7XG5jb25zdCBCbGFjayA9ICdjb2xvcjogYmxhY2snO1xuLyogaXN0YW5idWxpZnkgaWdub3JlIG5leHQgKi9cbmNsYXNzIExvZ2dlciB7XG4gIGxvZyhtc2csIG9iaiwgdHlwZSwgY29sb3IpIHtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgIGlmICh0eXBlb2YgbXNnID09PSAnc3RyaW5nJykge1xuICAgICAgY29uc3QgdGltZXN0YW1wID0gbmV3IERhdGUoKS50b0xvY2FsZVRpbWVTdHJpbmcoKTtcbiAgICAgIGlmIChzdXBwb3J0c0NvbnNvbGVGb3JtYXR0aW5nKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGAlY0xheWVyJWMgJHt0eXBlfSVjIFske3RpbWVzdGFtcH1dOiAke21zZ31gLCBMYXllckNzcywgYGNvbG9yOiAke2NvbG9yfWAsIEJsYWNrKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBMYXllciAke3R5cGV9IFske3RpbWVzdGFtcH1dOiAke21zZ31gKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fbG9nT2JqKG1zZywgdHlwZSwgY29sb3IpO1xuICAgIH1cbiAgICBpZiAob2JqKSB0aGlzLl9sb2dPYmoob2JqLCB0eXBlLCBjb2xvcik7XG4gIH1cbiAgX2xvZ09iaihvYmosIHR5cGUsIGNvbG9yKSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgICBpZiAoIW9iaiB8fCBpc0VtcHR5KG9iaikpIHJldHVybjtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICAgIGlmIChvYmouY29uc3RydWN0b3IubmFtZSA9PT0gJ09iamVjdCcpIHtcbiAgICAgIGlmIChzdXBwb3J0c0NvbnNvbGVGb3JtYXR0aW5nKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGAlY0xheWVyJWMgJHt0eXBlfSVjOiAke0pTT04uc3RyaW5naWZ5KG9iaiwgbnVsbCwgNCl9YCwgTGF5ZXJDc3MsIGBjb2xvcjogJHtjb2xvcn1gLCBCbGFjayk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhgTGF5ZXIgJHt0eXBlfTogJHtKU09OLnN0cmluZ2lmeShvYmosIG51bGwsIDQpfWApO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoc3VwcG9ydHNDb25zb2xlRm9ybWF0dGluZykge1xuICAgICAgICBjb25zb2xlLmxvZyhgJWNMYXllciVjICR7dHlwZX0lYzogJU9gLCBMYXllckNzcywgYGNvbG9yOiAke2NvbG9yfWAsIEJsYWNrLCBvYmopO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coYExheWVyICR7dHlwZX06YCwgb2JqKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBkZWJ1Zyhtc2csIG9iaikge1xuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgaWYgKHRoaXMubGV2ZWwgPj0gREVCVUcpIHRoaXMubG9nKG1zZywgb2JqLCAnREVCVUcnLCAnIzg4OCcpO1xuICB9XG5cbiAgaW5mbyhtc2csIG9iaikge1xuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgaWYgKHRoaXMubGV2ZWwgPj0gSU5GTykgdGhpcy5sb2cobXNnLCBvYmosICdJTkZPJywgJ2JsYWNrJyk7XG4gIH1cblxuICB3YXJuKG1zZywgb2JqKSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgICBpZiAodGhpcy5sZXZlbCA+PSBXQVJOKSB0aGlzLmxvZyhtc2csIG9iaiwgJ1dBUk4nLCAnb3JhbmdlJyk7XG4gIH1cblxuICBlcnJvcihtc2csIG9iaikge1xuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgaWYgKHRoaXMubGV2ZWwgPj0gRVJST1IpIHRoaXMubG9nKG1zZywgb2JqLCAnRVJST1InLCAncmVkJyk7XG4gIH1cbn1cblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbkxvZ2dlci5wcm90b3R5cGUubGV2ZWwgPSB0eXBlb2YgamFzbWluZSA9PT0gJ3VuZGVmaW5lZCcgPyBFUlJPUiA6IE5PTkU7XG5cbmNvbnN0IGxvZ2dlciA9IG5ldyBMb2dnZXIoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBsb2dnZXI7XG4iXX0=
