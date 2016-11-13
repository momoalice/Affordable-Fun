'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

/**
 * Utility methods
 *
 * @class layer.ClientUtils
 */

var LayerParser = require('layer-patch');
/* istanbul ignore next */
var cryptoLib = typeof window !== 'undefined' ? window.crypto || window.msCrypto : null;
/* istanbul ignore next */
var atob = typeof window === 'undefined' ? require('atob') : window.atob;

var getRandomValues = undefined;
/* istanbul ignore next */
if (typeof window === 'undefined') {
  getRandomValues = require('get-random-values');
} else if (cryptoLib) {
  getRandomValues = cryptoLib.getRandomValues.bind(cryptoLib);
}

/*
 * Generate a random UUID for modern browsers and nodejs
 */
function cryptoUUID() {
  var buf = new Uint16Array(8);
  getRandomValues(buf);
  var s4 = function s4(num) {
    var ret = num.toString(16);
    while (ret.length < 4) {
      ret = '0' + ret;
    }
    return ret;
  };
  return s4(buf[0]) + s4(buf[1]) + '-' + s4(buf[2]) + '-' + s4(buf[3]) + '-' + s4(buf[4]) + '-' + s4(buf[5]) + s4(buf[6]) + s4(buf[7]);
}

/*
 * Generate a random UUID in IE10
 */
function mathUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

/**
 * Generate a random UUID
 *
 * @method
 * @return {string}
 */
exports.generateUUID = getRandomValues ? cryptoUUID : mathUUID;

/**
 * Returns the 'type' portion of a Layer ID.
 *
 *         switch(Utils.typeFromID(id)) {
 *             case 'conversations':
 *                 ...
 *             case 'message':
 *                 ...
 *             case: 'queries':
 *                 ...
 *         }
 *
 * Does not currently handle Layer App IDs.
 *
 * @method
 * @param  {string} id
 * @return {string}
 */
exports.typeFromID = function (id) {
  var matches = id.match(/layer\:\/\/\/(.*?)\//);
  return matches ? matches[1] : '';
};

exports.isEmpty = function (obj) {
  return Object.prototype.toString.apply(obj) === '[object Object]' && Object.keys(obj).length === 0;
};

/**
 * Simplified sort method.
 *
 * Provides a function to return the value to compare rather than do the comparison.
 *
 *      sortBy([{v: 3}, {v: 1}, v: 33}], function(value) {
 *          return value.v;
 *      }, false);
 *
 * @method
 * @param  {Mixed[]}   inArray      Array to sort
 * @param  {Function} fn            Function that will return a value to compare
 * @param  {Function} fn.value      Current value from inArray we are comparing, and from which a value should be extracted
 * @param  {boolean}  [reverse=false] Sort ascending (false) or descending (true)
 */
exports.sortBy = function (inArray, fn, reverse) {
  reverse = reverse ? -1 : 1;
  inArray.sort(function (valueA, valueB) {
    var aa = fn(valueA);
    var bb = fn(valueB);
    if (aa === undefined && bb === undefined) return 0;
    if (aa === undefined && bb !== undefined) return 1;
    if (aa !== undefined && bb === undefined) return -1;
    if (aa > bb) return 1 * reverse;
    if (aa < bb) return -1 * reverse;
    return 0;
  });
};

/**
 * Quick and easy clone method.
 *
 * Does not work on circular references; should not be used
 * on objects with event listeners.
 *
 *      var newObj = Utils.clone(oldObj);
 *
 * @method
 * @param  {Object}     Object to clone
 * @return {Object}     New Object
 */
exports.clone = function (obj) {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Execute this function asynchronously.
 *
 * Defer will use SOME technique to delay execution of your function.
 * Defer() is intended for anything that should be processed after current execution has
 * completed, even if that means 0ms delay.
 *
 *      defer(function() {alert('That wasn't very long now was it!');});
 *
 * TODO: WEB-842: Add a postMessage handler.
 *
 * @method
 * @param  {Function} f
 */
exports.defer = function (func) {
  return setTimeout(func, 0);
};

/**
 * URL Decode a URL Encoded base64 string
 *
 * Copied from https://github.com/auth0-blog/angular-token-auth, but
 * appears in many places on the web.
 */
exports.decode = function (str) {
  var output = str.replace('-', '+').replace('_', '/');
  switch (output.length % 4) {
    case 0:
      break;
    case 2:
      output += '==';
      break;
    case 3:
      output += '=';
      break;
    default:
      throw new Error('Illegal base64url string!');
  }
  return atob(output);
};

/**
 * Returns a delay in seconds needed to follow an exponential
 * backoff pattern of delays for retrying a connection.
 *
 * Algorithm has two motivations:
 *
 * 1. Retry with increasingly long intervals up to some maximum interval
 * 2. Randomize the retry interval enough so that a thousand clients
 * all following the same algorithm at the same time will not hit the
 * server at the exact same times.
 *
 * The following are results before jitter for some values of counter:

      0: 0.1
      1: 0.2
      2: 0.4
      3: 0.8
      4: 1.6
      5: 3.2
      6: 6.4
      7: 12.8
      8: 25.6
      9: 51.2
      10: 102.4
      11. 204.8
      12. 409.6
      13. 819.2
      14. 1638.4 (27 minutes)

 * @method getExponentialBackoffSeconds
 * @param  {number} maxSeconds - This is not the maximum seconds delay, but rather
 * the maximum seconds delay BEFORE adding a randomized value.
 * @param  {number} counter - Current counter to use for calculating the delay; should be incremented up to some reasonable maximum value for each use.
 * @return {number}     Delay in seconds/fractions of a second
 */
exports.getExponentialBackoffSeconds = function getExponentialBackoffSeconds(maxSeconds, counter) {
  var secondsWaitTime = Math.pow(2, counter) / 10,
      secondsOffset = Math.random(); // value between 0-1 seconds.
  if (counter < 2) secondsOffset = secondsOffset / 4; // values less than 0.2 should be offset by 0-0.25 seconds
  else if (counter < 6) secondsOffset = secondsOffset / 2; // values between 0.2 and 1.0 should be offset by 0-0.5 seconds

  if (secondsWaitTime >= maxSeconds) secondsWaitTime = maxSeconds;

  return secondsWaitTime + secondsOffset;
};

var parser = undefined;

/**
 * Creates a LayerParser
 *
 * @method
 * @private
 * @param {Object} request - see layer.ClientUtils.layerParse
 */
function createParser(request) {
  request.client.once('destroy', function () {
    return parser = null;
  });

  parser = new LayerParser({
    camelCase: true,
    getObjectCallback: function getObjectCallback(id) {
      return request.client._getObject(id);
    },
    propertyNameMap: {
      Conversation: {
        unreadMessageCount: 'unreadCount'
      }
    },
    changeCallbacks: {
      Message: {
        all: function all(updateObject, newValue, oldValue, paths) {
          updateObject._handlePatchEvent(newValue, oldValue, paths);
        }
      },
      Conversation: {
        all: function all(updateObject, newValue, oldValue, paths) {
          updateObject._handlePatchEvent(newValue, oldValue, paths);
        }
      }
    }
  });
}

/**
 * Run the Layer Parser on the request.
 *
 * Parameters here
 * are the parameters specied in [Layer-Patch](https://github.com/layerhq/node-layer-patch), plus
 * a client object.
 *
 *      Util.layerParse({
 *          object: conversation,
 *          type: 'Conversation',
 *          operations: layerPatchOperations,
 *          client: client
 *      });
 *
 * @method
 * @param {Object} request - layer-patch parameters
 * @param {Object} request.object - Object being updated  by the operations
 * @param {string} request.type - Type of object being updated
 * @param {Object[]} request.operations - Array of change operations to perform upon the object
 * @param {layer.Client} request.client
 */
exports.layerParse = function (request) {
  if (!parser) createParser(request);
  parser.parse(request);
};

/**
 * Object comparison.
 *
 * Does a recursive traversal of two objects verifying that they are the same.
 * Is able to make metadata-restricted assumptions such as that
 * all values are either plain Objects or strings.
 *
 *      if (Utils.doesObjectMatch(conv1.metadata, conv2.metadata)) {
 *          alert('These two metadata objects are the same');
 *      }
 *
 * @method
 * @param  {Object} requestedData
 * @param  {Object} actualData
 * @return {boolean}
 */
exports.doesObjectMatch = function (requestedData, actualData) {
  if (!requestedData && actualData || requestedData && !actualData) return false;
  var requestedKeys = Object.keys(requestedData).sort();
  var actualKeys = Object.keys(actualData).sort();

  // If there are a different number of keys, fail.
  if (requestedKeys.length !== actualKeys.length) return false;

  // Compare key name and value at each index
  for (var index = 0; index < requestedKeys.length; index++) {
    var k1 = requestedKeys[index];
    var k2 = actualKeys[index];
    var v1 = requestedData[k1];
    var v2 = actualData[k2];
    if (k1 !== k2) return false;
    if (v1 && (typeof v1 === 'undefined' ? 'undefined' : _typeof(v1)) === 'object') {
      // Array comparison is not used by the Web SDK at this time.
      if (Array.isArray(v1)) {
        throw new Error('Array comparison not handled yet');
      } else if (!exports.doesObjectMatch(v1, v2)) {
        return false;
      }
    } else if (v1 !== v2) {
      return false;
    }
  }
  return true;
};

/**
 * Simple array inclusion test
 * @method includes
 * @param {Mixed[]} items
 * @param {Mixed} value
 * @returns {boolean}
 */
exports.includes = function (items, value) {
  return items.indexOf(value) !== -1;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jbGllbnQtdXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQU1BLElBQU0sY0FBYyxRQUFRLGFBQVIsQ0FBZDs7QUFFTixJQUFNLFlBQVksT0FBTyxNQUFQLEtBQWtCLFdBQWxCLEdBQWdDLE9BQU8sTUFBUCxJQUFpQixPQUFPLFFBQVAsR0FBa0IsSUFBbkU7O0FBRWxCLElBQU0sT0FBTyxPQUFPLE1BQVAsS0FBa0IsV0FBbEIsR0FBZ0MsUUFBUSxNQUFSLENBQWhDLEdBQWtELE9BQU8sSUFBUDs7QUFFL0QsSUFBSSwyQkFBSjs7QUFFQSxJQUFJLE9BQU8sTUFBUCxLQUFrQixXQUFsQixFQUErQjtBQUNqQyxvQkFBa0IsUUFBUSxtQkFBUixDQUFsQixDQURpQztDQUFuQyxNQUVPLElBQUksU0FBSixFQUFlO0FBQ3BCLG9CQUFrQixVQUFVLGVBQVYsQ0FBMEIsSUFBMUIsQ0FBK0IsU0FBL0IsQ0FBbEIsQ0FEb0I7Q0FBZjs7Ozs7QUFPUCxTQUFTLFVBQVQsR0FBc0I7QUFDcEIsTUFBTSxNQUFNLElBQUksV0FBSixDQUFnQixDQUFoQixDQUFOLENBRGM7QUFFcEIsa0JBQWdCLEdBQWhCLEVBRm9CO0FBR3BCLE1BQU0sS0FBSyxTQUFMLEVBQUssQ0FBQyxHQUFELEVBQVM7QUFDbEIsUUFBSSxNQUFNLElBQUksUUFBSixDQUFhLEVBQWIsQ0FBTixDQURjO0FBRWxCLFdBQU8sSUFBSSxNQUFKLEdBQWEsQ0FBYixFQUFnQjtBQUNyQixZQUFNLE1BQU0sR0FBTixDQURlO0tBQXZCO0FBR0EsV0FBTyxHQUFQLENBTGtCO0dBQVQsQ0FIUztBQVVwQixTQUNFLEdBQUcsSUFBSSxDQUFKLENBQUgsSUFBYSxHQUFHLElBQUksQ0FBSixDQUFILENBQWIsR0FBMEIsR0FBMUIsR0FBZ0MsR0FBRyxJQUFJLENBQUosQ0FBSCxDQUFoQyxHQUE2QyxHQUE3QyxHQUNBLEdBQUcsSUFBSSxDQUFKLENBQUgsQ0FEQSxHQUNhLEdBRGIsR0FD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QUhtRDtBQUl6RCxRQUFNLEtBQUssV0FBVyxFQUFYLENBQUwsQ0FKbUQ7QUFLekQsUUFBSSxPQUFPLEVBQVAsRUFBVyxPQUFPLEtBQVAsQ0FBZjtBQUNBLFFBQUksTUFBTSxRQUFPLCtDQUFQLEtBQWMsUUFBZCxFQUF3Qjs7QUFFaEMsVUFBSSxNQUFNLE9BQU4sQ0FBYyxFQUFkLENBQUosRUFBdUI7QUFDckIsY0FBTSxJQUFJLEtBQUosQ0FBVSxrQ0FBVixDQUFOLENBRHFCO09BQXZCLE1BRU8sSUFBSSxDQUFDLFFBQVEsZUFBUixDQUF3QixFQUF4QixFQUE0QixFQUE1QixDQUFELEVBQWtDO0FBQzNDLGVBQU8sS0FBUCxDQUQyQztPQUF0QztLQUpULE1BT08sSUFBSSxPQUFPLEVBQVAsRUFBVztBQUNwQixhQUFPLEtBQVAsQ0FEb0I7S0FBZjtHQWJUO0FBaUJBLFNBQU8sSUFBUCxDQTFCdUQ7Q0FBL0I7Ozs7Ozs7OztBQW9DMUIsUUFBUSxRQUFSLEdBQW1CLFVBQUMsS0FBRCxFQUFRLEtBQVI7U0FBa0IsTUFBTSxPQUFOLENBQWMsS0FBZCxNQUF5QixDQUFDLENBQUQ7Q0FBM0MiLCJmaWxlIjoiY2xpZW50LXV0aWxzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBVdGlsaXR5IG1ldGhvZHNcbiAqXG4gKiBAY2xhc3MgbGF5ZXIuQ2xpZW50VXRpbHNcbiAqL1xuXG5jb25zdCBMYXllclBhcnNlciA9IHJlcXVpcmUoJ2xheWVyLXBhdGNoJyk7XG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuY29uc3QgY3J5cHRvTGliID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cuY3J5cHRvIHx8IHdpbmRvdy5tc0NyeXB0byA6IG51bGw7XG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuY29uc3QgYXRvYiA9IHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnID8gcmVxdWlyZSgnYXRvYicpIDogd2luZG93LmF0b2I7XG5cbmxldCBnZXRSYW5kb21WYWx1ZXM7XG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7XG4gIGdldFJhbmRvbVZhbHVlcyA9IHJlcXVpcmUoJ2dldC1yYW5kb20tdmFsdWVzJyk7XG59IGVsc2UgaWYgKGNyeXB0b0xpYikge1xuICBnZXRSYW5kb21WYWx1ZXMgPSBjcnlwdG9MaWIuZ2V0UmFuZG9tVmFsdWVzLmJpbmQoY3J5cHRvTGliKTtcbn1cblxuLypcbiAqIEdlbmVyYXRlIGEgcmFuZG9tIFVVSUQgZm9yIG1vZGVybiBicm93c2VycyBhbmQgbm9kZWpzXG4gKi9cbmZ1bmN0aW9uIGNyeXB0b1VVSUQoKSB7XG4gIGNvbnN0IGJ1ZiA9IG5ldyBVaW50MTZBcnJheSg4KTtcbiAgZ2V0UmFuZG9tVmFsdWVzKGJ1Zik7XG4gIGNvbnN0IHM0ID0gKG51bSkgPT4ge1xuICAgIGxldCByZXQgPSBudW0udG9TdHJpbmcoMTYpO1xuICAgIHdoaWxlIChyZXQubGVuZ3RoIDwgNCkge1xuICAgICAgcmV0ID0gJzAnICsgcmV0O1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9O1xuICByZXR1cm4gKFxuICAgIHM0KGJ1ZlswXSkgKyBzNChidWZbMV0pICsgJy0nICsgczQoYnVmWzJdKSArICctJyArXG4gICAgczQoYnVmWzNdKSArICctJyArIHM0KGJ1Zls0XSkgKyAnLScgKyBzNChidWZbNV0pICtcbiAgICBzNChidWZbNl0pICsgczQoYnVmWzddKSk7XG59XG5cbi8qXG4gKiBHZW5lcmF0ZSBhIHJhbmRvbSBVVUlEIGluIElFMTBcbiAqL1xuZnVuY3Rpb24gbWF0aFVVSUQoKSB7XG4gIGZ1bmN0aW9uIHM0KCkge1xuICAgIHJldHVybiBNYXRoLmZsb29yKCgxICsgTWF0aC5yYW5kb20oKSkgKiAweDEwMDAwKVxuICAgICAgLnRvU3RyaW5nKDE2KVxuICAgICAgLnN1YnN0cmluZygxKTtcbiAgfVxuICByZXR1cm4gczQoKSArIHM0KCkgKyAnLScgKyBzNCgpICsgJy0nICsgczQoKSArICctJyArXG4gICAgczQoKSArICctJyArIHM0KCkgKyBzNCgpICsgczQoKTtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBhIHJhbmRvbSBVVUlEXG4gKlxuICogQG1ldGhvZFxuICogQHJldHVybiB7c3RyaW5nfVxuICovXG5leHBvcnRzLmdlbmVyYXRlVVVJRCA9IGdldFJhbmRvbVZhbHVlcyA/IGNyeXB0b1VVSUQgOiBtYXRoVVVJRDtcblxuXG4vKipcbiAqIFJldHVybnMgdGhlICd0eXBlJyBwb3J0aW9uIG9mIGEgTGF5ZXIgSUQuXG4gKlxuICogICAgICAgICBzd2l0Y2goVXRpbHMudHlwZUZyb21JRChpZCkpIHtcbiAqICAgICAgICAgICAgIGNhc2UgJ2NvbnZlcnNhdGlvbnMnOlxuICogICAgICAgICAgICAgICAgIC4uLlxuICogICAgICAgICAgICAgY2FzZSAnbWVzc2FnZSc6XG4gKiAgICAgICAgICAgICAgICAgLi4uXG4gKiAgICAgICAgICAgICBjYXNlOiAncXVlcmllcyc6XG4gKiAgICAgICAgICAgICAgICAgLi4uXG4gKiAgICAgICAgIH1cbiAqXG4gKiBEb2VzIG5vdCBjdXJyZW50bHkgaGFuZGxlIExheWVyIEFwcCBJRHMuXG4gKlxuICogQG1ldGhvZFxuICogQHBhcmFtICB7c3RyaW5nfSBpZFxuICogQHJldHVybiB7c3RyaW5nfVxuICovXG5leHBvcnRzLnR5cGVGcm9tSUQgPSAoaWQpID0+IHtcbiAgY29uc3QgbWF0Y2hlcyA9IGlkLm1hdGNoKC9sYXllclxcOlxcL1xcL1xcLyguKj8pXFwvLyk7XG4gIHJldHVybiBtYXRjaGVzID8gbWF0Y2hlc1sxXSA6ICcnO1xufTtcblxuZXhwb3J0cy5pc0VtcHR5ID0gKG9iaikgPT4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5hcHBseShvYmopID09PSAnW29iamVjdCBPYmplY3RdJyAmJiBPYmplY3Qua2V5cyhvYmopLmxlbmd0aCA9PT0gMDtcblxuLyoqXG4gKiBTaW1wbGlmaWVkIHNvcnQgbWV0aG9kLlxuICpcbiAqIFByb3ZpZGVzIGEgZnVuY3Rpb24gdG8gcmV0dXJuIHRoZSB2YWx1ZSB0byBjb21wYXJlIHJhdGhlciB0aGFuIGRvIHRoZSBjb21wYXJpc29uLlxuICpcbiAqICAgICAgc29ydEJ5KFt7djogM30sIHt2OiAxfSwgdjogMzN9XSwgZnVuY3Rpb24odmFsdWUpIHtcbiAqICAgICAgICAgIHJldHVybiB2YWx1ZS52O1xuICogICAgICB9LCBmYWxzZSk7XG4gKlxuICogQG1ldGhvZFxuICogQHBhcmFtICB7TWl4ZWRbXX0gICBpbkFycmF5ICAgICAgQXJyYXkgdG8gc29ydFxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuICAgICAgICAgICAgRnVuY3Rpb24gdGhhdCB3aWxsIHJldHVybiBhIHZhbHVlIHRvIGNvbXBhcmVcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbi52YWx1ZSAgICAgIEN1cnJlbnQgdmFsdWUgZnJvbSBpbkFycmF5IHdlIGFyZSBjb21wYXJpbmcsIGFuZCBmcm9tIHdoaWNoIGEgdmFsdWUgc2hvdWxkIGJlIGV4dHJhY3RlZFxuICogQHBhcmFtICB7Ym9vbGVhbn0gIFtyZXZlcnNlPWZhbHNlXSBTb3J0IGFzY2VuZGluZyAoZmFsc2UpIG9yIGRlc2NlbmRpbmcgKHRydWUpXG4gKi9cbmV4cG9ydHMuc29ydEJ5ID0gKGluQXJyYXksIGZuLCByZXZlcnNlKSA9PiB7XG4gIHJldmVyc2UgPSByZXZlcnNlID8gLTEgOiAxO1xuICBpbkFycmF5LnNvcnQoKHZhbHVlQSwgdmFsdWVCKSA9PiB7XG4gICAgY29uc3QgYWEgPSBmbih2YWx1ZUEpO1xuICAgIGNvbnN0IGJiID0gZm4odmFsdWVCKTtcbiAgICBpZiAoYWEgPT09IHVuZGVmaW5lZCAmJiBiYiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gMDtcbiAgICBpZiAoYWEgPT09IHVuZGVmaW5lZCAmJiBiYiAhPT0gdW5kZWZpbmVkKSByZXR1cm4gMTtcbiAgICBpZiAoYWEgIT09IHVuZGVmaW5lZCAmJiBiYiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gLTE7XG4gICAgaWYgKGFhID4gYmIpIHJldHVybiAxICogcmV2ZXJzZTtcbiAgICBpZiAoYWEgPCBiYikgcmV0dXJuIC0xICogcmV2ZXJzZTtcbiAgICByZXR1cm4gMDtcbiAgfSk7XG59O1xuXG4vKipcbiAqIFF1aWNrIGFuZCBlYXN5IGNsb25lIG1ldGhvZC5cbiAqXG4gKiBEb2VzIG5vdCB3b3JrIG9uIGNpcmN1bGFyIHJlZmVyZW5jZXM7IHNob3VsZCBub3QgYmUgdXNlZFxuICogb24gb2JqZWN0cyB3aXRoIGV2ZW50IGxpc3RlbmVycy5cbiAqXG4gKiAgICAgIHZhciBuZXdPYmogPSBVdGlscy5jbG9uZShvbGRPYmopO1xuICpcbiAqIEBtZXRob2RcbiAqIEBwYXJhbSAge09iamVjdH0gICAgIE9iamVjdCB0byBjbG9uZVxuICogQHJldHVybiB7T2JqZWN0fSAgICAgTmV3IE9iamVjdFxuICovXG5leHBvcnRzLmNsb25lID0gKG9iaikgPT4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShvYmopKTtcblxuLyoqXG4gKiBFeGVjdXRlIHRoaXMgZnVuY3Rpb24gYXN5bmNocm9ub3VzbHkuXG4gKlxuICogRGVmZXIgd2lsbCB1c2UgU09NRSB0ZWNobmlxdWUgdG8gZGVsYXkgZXhlY3V0aW9uIG9mIHlvdXIgZnVuY3Rpb24uXG4gKiBEZWZlcigpIGlzIGludGVuZGVkIGZvciBhbnl0aGluZyB0aGF0IHNob3VsZCBiZSBwcm9jZXNzZWQgYWZ0ZXIgY3VycmVudCBleGVjdXRpb24gaGFzXG4gKiBjb21wbGV0ZWQsIGV2ZW4gaWYgdGhhdCBtZWFucyAwbXMgZGVsYXkuXG4gKlxuICogICAgICBkZWZlcihmdW5jdGlvbigpIHthbGVydCgnVGhhdCB3YXNuJ3QgdmVyeSBsb25nIG5vdyB3YXMgaXQhJyk7fSk7XG4gKlxuICogVE9ETzogV0VCLTg0MjogQWRkIGEgcG9zdE1lc3NhZ2UgaGFuZGxlci5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZlxuICovXG5leHBvcnRzLmRlZmVyID0gKGZ1bmMpID0+IHNldFRpbWVvdXQoZnVuYywgMCk7XG5cbi8qKlxuICogVVJMIERlY29kZSBhIFVSTCBFbmNvZGVkIGJhc2U2NCBzdHJpbmdcbiAqXG4gKiBDb3BpZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vYXV0aDAtYmxvZy9hbmd1bGFyLXRva2VuLWF1dGgsIGJ1dFxuICogYXBwZWFycyBpbiBtYW55IHBsYWNlcyBvbiB0aGUgd2ViLlxuICovXG5leHBvcnRzLmRlY29kZSA9IChzdHIpID0+IHtcbiAgbGV0IG91dHB1dCA9IHN0ci5yZXBsYWNlKCctJywgJysnKS5yZXBsYWNlKCdfJywgJy8nKTtcbiAgc3dpdGNoIChvdXRwdXQubGVuZ3RoICUgNCkge1xuICAgIGNhc2UgMDpcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMjpcbiAgICAgIG91dHB1dCArPSAnPT0nO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAzOlxuICAgICAgb3V0cHV0ICs9ICc9JztcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0lsbGVnYWwgYmFzZTY0dXJsIHN0cmluZyEnKTtcbiAgfVxuICByZXR1cm4gYXRvYihvdXRwdXQpO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGEgZGVsYXkgaW4gc2Vjb25kcyBuZWVkZWQgdG8gZm9sbG93IGFuIGV4cG9uZW50aWFsXG4gKiBiYWNrb2ZmIHBhdHRlcm4gb2YgZGVsYXlzIGZvciByZXRyeWluZyBhIGNvbm5lY3Rpb24uXG4gKlxuICogQWxnb3JpdGhtIGhhcyB0d28gbW90aXZhdGlvbnM6XG4gKlxuICogMS4gUmV0cnkgd2l0aCBpbmNyZWFzaW5nbHkgbG9uZyBpbnRlcnZhbHMgdXAgdG8gc29tZSBtYXhpbXVtIGludGVydmFsXG4gKiAyLiBSYW5kb21pemUgdGhlIHJldHJ5IGludGVydmFsIGVub3VnaCBzbyB0aGF0IGEgdGhvdXNhbmQgY2xpZW50c1xuICogYWxsIGZvbGxvd2luZyB0aGUgc2FtZSBhbGdvcml0aG0gYXQgdGhlIHNhbWUgdGltZSB3aWxsIG5vdCBoaXQgdGhlXG4gKiBzZXJ2ZXIgYXQgdGhlIGV4YWN0IHNhbWUgdGltZXMuXG4gKlxuICogVGhlIGZvbGxvd2luZyBhcmUgcmVzdWx0cyBiZWZvcmUgaml0dGVyIGZvciBzb21lIHZhbHVlcyBvZiBjb3VudGVyOlxuXG4gICAgICAwOiAwLjFcbiAgICAgIDE6IDAuMlxuICAgICAgMjogMC40XG4gICAgICAzOiAwLjhcbiAgICAgIDQ6IDEuNlxuICAgICAgNTogMy4yXG4gICAgICA2OiA2LjRcbiAgICAgIDc6IDEyLjhcbiAgICAgIDg6IDI1LjZcbiAgICAgIDk6IDUxLjJcbiAgICAgIDEwOiAxMDIuNFxuICAgICAgMTEuIDIwNC44XG4gICAgICAxMi4gNDA5LjZcbiAgICAgIDEzLiA4MTkuMlxuICAgICAgMTQuIDE2MzguNCAoMjcgbWludXRlcylcblxuICogQG1ldGhvZCBnZXRFeHBvbmVudGlhbEJhY2tvZmZTZWNvbmRzXG4gKiBAcGFyYW0gIHtudW1iZXJ9IG1heFNlY29uZHMgLSBUaGlzIGlzIG5vdCB0aGUgbWF4aW11bSBzZWNvbmRzIGRlbGF5LCBidXQgcmF0aGVyXG4gKiB0aGUgbWF4aW11bSBzZWNvbmRzIGRlbGF5IEJFRk9SRSBhZGRpbmcgYSByYW5kb21pemVkIHZhbHVlLlxuICogQHBhcmFtICB7bnVtYmVyfSBjb3VudGVyIC0gQ3VycmVudCBjb3VudGVyIHRvIHVzZSBmb3IgY2FsY3VsYXRpbmcgdGhlIGRlbGF5OyBzaG91bGQgYmUgaW5jcmVtZW50ZWQgdXAgdG8gc29tZSByZWFzb25hYmxlIG1heGltdW0gdmFsdWUgZm9yIGVhY2ggdXNlLlxuICogQHJldHVybiB7bnVtYmVyfSAgICAgRGVsYXkgaW4gc2Vjb25kcy9mcmFjdGlvbnMgb2YgYSBzZWNvbmRcbiAqL1xuZXhwb3J0cy5nZXRFeHBvbmVudGlhbEJhY2tvZmZTZWNvbmRzID0gZnVuY3Rpb24gZ2V0RXhwb25lbnRpYWxCYWNrb2ZmU2Vjb25kcyhtYXhTZWNvbmRzLCBjb3VudGVyKSB7XG4gIGxldCBzZWNvbmRzV2FpdFRpbWUgPSBNYXRoLnBvdygyLCBjb3VudGVyKSAvIDEwLFxuICAgIHNlY29uZHNPZmZzZXQgPSBNYXRoLnJhbmRvbSgpOyAvLyB2YWx1ZSBiZXR3ZWVuIDAtMSBzZWNvbmRzLlxuICBpZiAoY291bnRlciA8IDIpIHNlY29uZHNPZmZzZXQgPSBzZWNvbmRzT2Zmc2V0IC8gNDsgLy8gdmFsdWVzIGxlc3MgdGhhbiAwLjIgc2hvdWxkIGJlIG9mZnNldCBieSAwLTAuMjUgc2Vjb25kc1xuICBlbHNlIGlmIChjb3VudGVyIDwgNikgc2Vjb25kc09mZnNldCA9IHNlY29uZHNPZmZzZXQgLyAyOyAvLyB2YWx1ZXMgYmV0d2VlbiAwLjIgYW5kIDEuMCBzaG91bGQgYmUgb2Zmc2V0IGJ5IDAtMC41IHNlY29uZHNcblxuICBpZiAoc2Vjb25kc1dhaXRUaW1lID49IG1heFNlY29uZHMpIHNlY29uZHNXYWl0VGltZSA9IG1heFNlY29uZHM7XG5cbiAgcmV0dXJuIHNlY29uZHNXYWl0VGltZSArIHNlY29uZHNPZmZzZXQ7XG59O1xuXG5sZXQgcGFyc2VyO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBMYXllclBhcnNlclxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gcmVxdWVzdCAtIHNlZSBsYXllci5DbGllbnRVdGlscy5sYXllclBhcnNlXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVBhcnNlcihyZXF1ZXN0KSB7XG4gIHJlcXVlc3QuY2xpZW50Lm9uY2UoJ2Rlc3Ryb3knLCAoKSA9PiBwYXJzZXIgPSBudWxsKTtcblxuICBwYXJzZXIgPSBuZXcgTGF5ZXJQYXJzZXIoe1xuICAgIGNhbWVsQ2FzZTogdHJ1ZSxcbiAgICBnZXRPYmplY3RDYWxsYmFjazogKGlkKSA9PiB7XG4gICAgICByZXR1cm4gcmVxdWVzdC5jbGllbnQuX2dldE9iamVjdChpZCk7XG4gICAgfSxcbiAgICBwcm9wZXJ0eU5hbWVNYXA6IHtcbiAgICAgIENvbnZlcnNhdGlvbjoge1xuICAgICAgICB1bnJlYWRNZXNzYWdlQ291bnQ6ICd1bnJlYWRDb3VudCcsXG4gICAgICB9LFxuICAgIH0sXG4gICAgY2hhbmdlQ2FsbGJhY2tzOiB7XG4gICAgICBNZXNzYWdlOiB7XG4gICAgICAgIGFsbDogKHVwZGF0ZU9iamVjdCwgbmV3VmFsdWUsIG9sZFZhbHVlLCBwYXRocykgPT4ge1xuICAgICAgICAgIHVwZGF0ZU9iamVjdC5faGFuZGxlUGF0Y2hFdmVudChuZXdWYWx1ZSwgb2xkVmFsdWUsIHBhdGhzKTtcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBDb252ZXJzYXRpb246IHtcbiAgICAgICAgYWxsOiAodXBkYXRlT2JqZWN0LCBuZXdWYWx1ZSwgb2xkVmFsdWUsIHBhdGhzKSA9PiB7XG4gICAgICAgICAgdXBkYXRlT2JqZWN0Ll9oYW5kbGVQYXRjaEV2ZW50KG5ld1ZhbHVlLCBvbGRWYWx1ZSwgcGF0aHMpO1xuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9KTtcbn1cblxuLyoqXG4gKiBSdW4gdGhlIExheWVyIFBhcnNlciBvbiB0aGUgcmVxdWVzdC5cbiAqXG4gKiBQYXJhbWV0ZXJzIGhlcmVcbiAqIGFyZSB0aGUgcGFyYW1ldGVycyBzcGVjaWVkIGluIFtMYXllci1QYXRjaF0oaHR0cHM6Ly9naXRodWIuY29tL2xheWVyaHEvbm9kZS1sYXllci1wYXRjaCksIHBsdXNcbiAqIGEgY2xpZW50IG9iamVjdC5cbiAqXG4gKiAgICAgIFV0aWwubGF5ZXJQYXJzZSh7XG4gKiAgICAgICAgICBvYmplY3Q6IGNvbnZlcnNhdGlvbixcbiAqICAgICAgICAgIHR5cGU6ICdDb252ZXJzYXRpb24nLFxuICogICAgICAgICAgb3BlcmF0aW9uczogbGF5ZXJQYXRjaE9wZXJhdGlvbnMsXG4gKiAgICAgICAgICBjbGllbnQ6IGNsaWVudFxuICogICAgICB9KTtcbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge09iamVjdH0gcmVxdWVzdCAtIGxheWVyLXBhdGNoIHBhcmFtZXRlcnNcbiAqIEBwYXJhbSB7T2JqZWN0fSByZXF1ZXN0Lm9iamVjdCAtIE9iamVjdCBiZWluZyB1cGRhdGVkICBieSB0aGUgb3BlcmF0aW9uc1xuICogQHBhcmFtIHtzdHJpbmd9IHJlcXVlc3QudHlwZSAtIFR5cGUgb2Ygb2JqZWN0IGJlaW5nIHVwZGF0ZWRcbiAqIEBwYXJhbSB7T2JqZWN0W119IHJlcXVlc3Qub3BlcmF0aW9ucyAtIEFycmF5IG9mIGNoYW5nZSBvcGVyYXRpb25zIHRvIHBlcmZvcm0gdXBvbiB0aGUgb2JqZWN0XG4gKiBAcGFyYW0ge2xheWVyLkNsaWVudH0gcmVxdWVzdC5jbGllbnRcbiAqL1xuZXhwb3J0cy5sYXllclBhcnNlID0gKHJlcXVlc3QpID0+IHtcbiAgaWYgKCFwYXJzZXIpIGNyZWF0ZVBhcnNlcihyZXF1ZXN0KTtcbiAgcGFyc2VyLnBhcnNlKHJlcXVlc3QpO1xufTtcblxuLyoqXG4gKiBPYmplY3QgY29tcGFyaXNvbi5cbiAqXG4gKiBEb2VzIGEgcmVjdXJzaXZlIHRyYXZlcnNhbCBvZiB0d28gb2JqZWN0cyB2ZXJpZnlpbmcgdGhhdCB0aGV5IGFyZSB0aGUgc2FtZS5cbiAqIElzIGFibGUgdG8gbWFrZSBtZXRhZGF0YS1yZXN0cmljdGVkIGFzc3VtcHRpb25zIHN1Y2ggYXMgdGhhdFxuICogYWxsIHZhbHVlcyBhcmUgZWl0aGVyIHBsYWluIE9iamVjdHMgb3Igc3RyaW5ncy5cbiAqXG4gKiAgICAgIGlmIChVdGlscy5kb2VzT2JqZWN0TWF0Y2goY29udjEubWV0YWRhdGEsIGNvbnYyLm1ldGFkYXRhKSkge1xuICogICAgICAgICAgYWxlcnQoJ1RoZXNlIHR3byBtZXRhZGF0YSBvYmplY3RzIGFyZSB0aGUgc2FtZScpO1xuICogICAgICB9XG4gKlxuICogQG1ldGhvZFxuICogQHBhcmFtICB7T2JqZWN0fSByZXF1ZXN0ZWREYXRhXG4gKiBAcGFyYW0gIHtPYmplY3R9IGFjdHVhbERhdGFcbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbmV4cG9ydHMuZG9lc09iamVjdE1hdGNoID0gKHJlcXVlc3RlZERhdGEsIGFjdHVhbERhdGEpID0+IHtcbiAgaWYgKCFyZXF1ZXN0ZWREYXRhICYmIGFjdHVhbERhdGEgfHwgcmVxdWVzdGVkRGF0YSAmJiAhYWN0dWFsRGF0YSkgcmV0dXJuIGZhbHNlO1xuICBjb25zdCByZXF1ZXN0ZWRLZXlzID0gT2JqZWN0LmtleXMocmVxdWVzdGVkRGF0YSkuc29ydCgpO1xuICBjb25zdCBhY3R1YWxLZXlzID0gT2JqZWN0LmtleXMoYWN0dWFsRGF0YSkuc29ydCgpO1xuXG4gIC8vIElmIHRoZXJlIGFyZSBhIGRpZmZlcmVudCBudW1iZXIgb2Yga2V5cywgZmFpbC5cbiAgaWYgKHJlcXVlc3RlZEtleXMubGVuZ3RoICE9PSBhY3R1YWxLZXlzLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuXG4gIC8vIENvbXBhcmUga2V5IG5hbWUgYW5kIHZhbHVlIGF0IGVhY2ggaW5kZXhcbiAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IHJlcXVlc3RlZEtleXMubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgY29uc3QgazEgPSByZXF1ZXN0ZWRLZXlzW2luZGV4XTtcbiAgICBjb25zdCBrMiA9IGFjdHVhbEtleXNbaW5kZXhdO1xuICAgIGNvbnN0IHYxID0gcmVxdWVzdGVkRGF0YVtrMV07XG4gICAgY29uc3QgdjIgPSBhY3R1YWxEYXRhW2syXTtcbiAgICBpZiAoazEgIT09IGsyKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKHYxICYmIHR5cGVvZiB2MSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIC8vIEFycmF5IGNvbXBhcmlzb24gaXMgbm90IHVzZWQgYnkgdGhlIFdlYiBTREsgYXQgdGhpcyB0aW1lLlxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodjEpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQXJyYXkgY29tcGFyaXNvbiBub3QgaGFuZGxlZCB5ZXQnKTtcbiAgICAgIH0gZWxzZSBpZiAoIWV4cG9ydHMuZG9lc09iamVjdE1hdGNoKHYxLCB2MikpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodjEgIT09IHYyKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBTaW1wbGUgYXJyYXkgaW5jbHVzaW9uIHRlc3RcbiAqIEBtZXRob2QgaW5jbHVkZXNcbiAqIEBwYXJhbSB7TWl4ZWRbXX0gaXRlbXNcbiAqIEBwYXJhbSB7TWl4ZWR9IHZhbHVlXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZXhwb3J0cy5pbmNsdWRlcyA9IChpdGVtcywgdmFsdWUpID0+IGl0ZW1zLmluZGV4T2YodmFsdWUpICE9PSAtMTtcblxuIl19
