'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * A Sync Event represents a request to the server.
 * A Sync Event may fire immediately, or may wait in the layer.SyncManager's
 * queue for a long duration before firing.
 *
 * DO NOT confuse this with layer.LayerEvent which represents a change notification
 * to your application.  layer.SyncEvent represents a request to the server that
 * is either in progress or in queue.
 *
 * GET requests are typically NOT done via a SyncEvent as these are typically
 * needed to render a UI and should either fail or succeed promptly.
 *
 * Applications typically do not interact with these objects.
 *
 * @class  layer.SyncEvent
 * @extends layer.Root
 */

var SyncEvent = function () {
  /**
   * Create a layer.SyncEvent.  See layer.ClientAuthenticator for examples of usage.
   *
   * @method  constructor
   * @private
   * @return {layer.SyncEvent}
   */

  function SyncEvent(options) {
    _classCallCheck(this, SyncEvent);

    var key = undefined;
    for (key in options) {
      if (key in this) {
        this[key] = options[key];
      }
    }
    if (!this.depends) this.depends = [];
  }

  /**
   * Not strictly required, but nice to clean things up.
   *
   * @method destroy
   */


  _createClass(SyncEvent, [{
    key: 'destroy',
    value: function destroy() {
      this.target = null;
      this.depends = null;
      this.callback = null;
      this.data = null;
    }

    /**
     * Get the Real parameters for the request.
     *
     * @method _updateData
     * @private
     */

  }, {
    key: '_updateData',
    value: function _updateData() {
      if (typeof this.data === 'function') {
        this.data = this.data();
      }
    }

    /**
     * Returns a POJO version of this object suitable for serializing for the network
     * @method toObject
     * @returns {Object}
     */

  }, {
    key: 'toObject',
    value: function toObject() {
      return { data: this.data };
    }
  }]);

  return SyncEvent;
}();

/**
 * The type of operation being performed.
 *
 * Either GET, PATCH, DELETE, POST or PUT
 *
 * @property {String}
 */


SyncEvent.prototype.operation = '';

/**
 * Indicates whether this request currently in-flight.
 *
 * * Set to true by _xhr() method,
 * * set to false on completion by layer.SyncManager.
 * * set to false automatically after 2 minutes
 *
 * @property {Boolean}
 */
Object.defineProperty(SyncEvent.prototype, 'isFiring', {
  enumerable: true,
  set: function set(value) {
    this.__isFiring = value;
    if (value) this.__firedAt = Date.now();
  },
  get: function get() {
    return Boolean(this.__isFiring && Date.now() - this.__firedAt < SyncEvent.FIRING_EXPIRIATION);
  }
});

/**
 * Indicates whether the request completed successfully.
 *
 * Set by layer.SyncManager.
 * @type {Boolean}
 */
SyncEvent.prototype.success = null;

/**
 * Callback to fire on completing this sync event.
 *
 * WARNING: The nature of this callback may change;
 * a persistence layer that persists the SyncManager's queue
 * must have serializable callbacks (object id + method name; not a function)
 * or must accept that callbacks are not always fired.
 * @type {Function}
 */
SyncEvent.prototype.callback = null;

/**
 * Number of retries on this request.
 *
 * Retries are only counted if its a 502 or 503
 * error.  Set and managed by layer.SyncManager.
 * @type {Number}
 */
SyncEvent.prototype.retryCount = 0;

/**
 * The target of the request.
 *
 * Any Component; typically a Conversation or Message.
 * @type {layer.Root}
 */
SyncEvent.prototype.target = null;

/**
 * Components that this request depends upon.
 *
 * A message cannot be sent if its
 * Conversation fails to get created.
 *
 * NOTE: May prove redundant with the target property and needs further review.
 * @type {layer.Root[]}
 */
SyncEvent.prototype.depends = null;

/**
 * Data field of the xhr call; can be an Object or string (including JSON string)
 * @type {Object}
 */
SyncEvent.prototype.data = null;

/**
 * After firing a request, if that firing state fails to clear after this number of miliseconds,
 * consider it to no longer be firing.  Under normal conditions, firing will be set to false explicitly.
 * This check insures that any failure of that process does not leave us stuck with a firing request
 * blocking the queue.
 * @type {number}
 * @static
 */
SyncEvent.FIRING_EXPIRIATION = 1000 * 60 * 2;

/**
 * A layer.SyncEvent intended to be fired as an XHR request.
 *
 * @class layer.SyncEvent.XHRSyncEvent
 * @extends layer.SyncEvent
 */

var XHRSyncEvent = function (_SyncEvent) {
  _inherits(XHRSyncEvent, _SyncEvent);

  function XHRSyncEvent() {
    _classCallCheck(this, XHRSyncEvent);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(XHRSyncEvent).apply(this, arguments));
  }

  _createClass(XHRSyncEvent, [{
    key: '_getRequestData',


    /**
     * Fire the request associated with this instance.
     *
     * Actually it just returns the parameters needed to make the xhr call:
     *
     *      var xhr = require('./xhr');
     *      xhr(event._getRequestData());
     *
     * @method _getRequestData
     * @protected
     * @returns {Object}
     */
    value: function _getRequestData() {
      this._updateUrl();
      this._updateData();
      return {
        url: this.url,
        method: this.method,
        headers: this.headers,
        data: this.data
      };
    }

    /**
     * Get the Real URL.
     *
     * If the url property is a function, call it to set the actual url.
     * Used when the URL is unknown until a prior SyncEvent has completed.
     *
     * @method _updateUrl
     * @private
     */

  }, {
    key: '_updateUrl',
    value: function _updateUrl() {
      if (typeof this.url === 'function') {
        this.url = this.url();
      }
    }
  }, {
    key: 'toObject',
    value: function toObject() {
      return {
        data: this.data,
        url: this.url,
        method: this.method
      };
    }
  }]);

  return XHRSyncEvent;
}(SyncEvent);

/**
 * How long before the request times out?
 * @type {Number} [timeout=15000]
 */


XHRSyncEvent.prototype.timeout = 15000;

/**
 * URL to send the request to
 */
XHRSyncEvent.prototype.url = '';

/**
 * Counts number of online state changes.
 *
 * If this number becomes high in a short time period, its probably
 * failing due to a CORS error.
 */
XHRSyncEvent.prototype.returnToOnlineCount = 0;

/**
 * Headers for the request
 */
XHRSyncEvent.prototype.headers = null;

/**
 * Request method.
 */
XHRSyncEvent.prototype.method = 'GET';

/**
 * A layer.SyncEvent intended to be fired as a websocket request.
 *
 * @class layer.SyncEvent.WebsocketSyncEvent
 * @extends layer.SyncEvent
 */

var WebsocketSyncEvent = function (_SyncEvent2) {
  _inherits(WebsocketSyncEvent, _SyncEvent2);

  function WebsocketSyncEvent() {
    _classCallCheck(this, WebsocketSyncEvent);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(WebsocketSyncEvent).apply(this, arguments));
  }

  _createClass(WebsocketSyncEvent, [{
    key: '_getRequestData',


    /**
     * Get the websocket request object.
     *
     * @method _getRequestData
     * @private
     * @return {Object}
     */
    value: function _getRequestData() {
      this._updateData();
      return this.data;
    }
  }, {
    key: 'toObject',
    value: function toObject() {
      return this.data;
    }
  }]);

  return WebsocketSyncEvent;
}(SyncEvent);

module.exports = { SyncEvent: SyncEvent, XHRSyncEvent: XHRSyncEvent, WebsocketSyncEvent: WebsocketSyncEvent };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9zeW5jLWV2ZW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFpQk07Ozs7Ozs7OztBQVFKLFdBUkksU0FRSixDQUFZLE9BQVosRUFBcUI7MEJBUmpCLFdBUWlCOztBQUNuQixRQUFJLGVBQUosQ0FEbUI7QUFFbkIsU0FBSyxHQUFMLElBQVksT0FBWixFQUFxQjtBQUNuQixVQUFJLE9BQU8sSUFBUCxFQUFhO0FBQ2YsYUFBSyxHQUFMLElBQVksUUFBUSxHQUFSLENBQVosQ0FEZTtPQUFqQjtLQURGO0FBS0EsUUFBSSxDQUFDLEtBQUssT0FBTCxFQUFjLEtBQUssT0FBTCxHQUFlLEVBQWYsQ0FBbkI7R0FQRjs7Ozs7Ozs7O2VBUkk7OzhCQXVCTTtBQUNSLFdBQUssTUFBTCxHQUFjLElBQWQsQ0FEUTtBQUVSLFdBQUssT0FBTCxHQUFlLElBQWYsQ0FGUTtBQUdSLFdBQUssUUFBTCxHQUFnQixJQUFoQixDQUhRO0FBSVIsV0FBSyxJQUFMLEdBQVksSUFBWixDQUpROzs7Ozs7Ozs7Ozs7a0NBYUk7QUFDWixVQUFJLE9BQU8sS0FBSyxJQUFMLEtBQWMsVUFBckIsRUFBaUM7QUFDbkMsYUFBSyxJQUFMLEdBQVksS0FBSyxJQUFMLEVBQVosQ0FEbUM7T0FBckM7Ozs7Ozs7Ozs7OytCQVVTO0FBQ1QsYUFBTyxFQUFFLE1BQU0sS0FBSyxJQUFMLEVBQWYsQ0FEUzs7OztTQS9DUDs7Ozs7Ozs7Ozs7O0FBNEROLFVBQVUsU0FBVixDQUFvQixTQUFwQixHQUFnQyxFQUFoQzs7Ozs7Ozs7Ozs7QUFZQSxPQUFPLGNBQVAsQ0FBc0IsVUFBVSxTQUFWLEVBQXFCLFVBQTNDLEVBQXVEO0FBQ3JELGNBQVksSUFBWjtBQUNBLE9BQUssU0FBUyxHQUFULENBQWEsS0FBYixFQUFvQjtBQUN2QixTQUFLLFVBQUwsR0FBa0IsS0FBbEIsQ0FEdUI7QUFFdkIsUUFBSSxLQUFKLEVBQVcsS0FBSyxTQUFMLEdBQWlCLEtBQUssR0FBTCxFQUFqQixDQUFYO0dBRkc7QUFJTCxPQUFLLFNBQVMsR0FBVCxHQUFlO0FBQ2xCLFdBQU8sUUFBUSxLQUFLLFVBQUwsSUFBbUIsS0FBSyxHQUFMLEtBQWEsS0FBSyxTQUFMLEdBQWlCLFVBQVUsa0JBQVYsQ0FBaEUsQ0FEa0I7R0FBZjtDQU5QOzs7Ozs7OztBQWlCQSxVQUFVLFNBQVYsQ0FBb0IsT0FBcEIsR0FBOEIsSUFBOUI7Ozs7Ozs7Ozs7O0FBWUEsVUFBVSxTQUFWLENBQW9CLFFBQXBCLEdBQStCLElBQS9COzs7Ozs7Ozs7QUFTQSxVQUFVLFNBQVYsQ0FBb0IsVUFBcEIsR0FBaUMsQ0FBakM7Ozs7Ozs7O0FBUUEsVUFBVSxTQUFWLENBQW9CLE1BQXBCLEdBQTZCLElBQTdCOzs7Ozs7Ozs7OztBQVdBLFVBQVUsU0FBVixDQUFvQixPQUFwQixHQUE4QixJQUE5Qjs7Ozs7O0FBTUEsVUFBVSxTQUFWLENBQW9CLElBQXBCLEdBQTJCLElBQTNCOzs7Ozs7Ozs7O0FBVUEsVUFBVSxrQkFBVixHQUErQixPQUFPLEVBQVAsR0FBWSxDQUFaOzs7Ozs7Ozs7SUFRekI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7c0NBY2M7QUFDaEIsV0FBSyxVQUFMLEdBRGdCO0FBRWhCLFdBQUssV0FBTCxHQUZnQjtBQUdoQixhQUFPO0FBQ0wsYUFBSyxLQUFLLEdBQUw7QUFDTCxnQkFBUSxLQUFLLE1BQUw7QUFDUixpQkFBUyxLQUFLLE9BQUw7QUFDVCxjQUFNLEtBQUssSUFBTDtPQUpSLENBSGdCOzs7Ozs7Ozs7Ozs7Ozs7aUNBb0JMO0FBQ1gsVUFBSSxPQUFPLEtBQUssR0FBTCxLQUFhLFVBQXBCLEVBQWdDO0FBQ2xDLGFBQUssR0FBTCxHQUFXLEtBQUssR0FBTCxFQUFYLENBRGtDO09BQXBDOzs7OytCQUtTO0FBQ1QsYUFBTztBQUNMLGNBQU0sS0FBSyxJQUFMO0FBQ04sYUFBSyxLQUFLLEdBQUw7QUFDTCxnQkFBUSxLQUFLLE1BQUw7T0FIVixDQURTOzs7O1NBeENQO0VBQXFCOzs7Ozs7OztBQXFEM0IsYUFBYSxTQUFiLENBQXVCLE9BQXZCLEdBQWlDLEtBQWpDOzs7OztBQUtBLGFBQWEsU0FBYixDQUF1QixHQUF2QixHQUE2QixFQUE3Qjs7Ozs7Ozs7QUFRQSxhQUFhLFNBQWIsQ0FBdUIsbUJBQXZCLEdBQTZDLENBQTdDOzs7OztBQUtBLGFBQWEsU0FBYixDQUF1QixPQUF2QixHQUFpQyxJQUFqQzs7Ozs7QUFLQSxhQUFhLFNBQWIsQ0FBdUIsTUFBdkIsR0FBZ0MsS0FBaEM7Ozs7Ozs7OztJQVNNOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztzQ0FTYztBQUNoQixXQUFLLFdBQUwsR0FEZ0I7QUFFaEIsYUFBTyxLQUFLLElBQUwsQ0FGUzs7OzsrQkFLUDtBQUNULGFBQU8sS0FBSyxJQUFMLENBREU7Ozs7U0FkUDtFQUEyQjs7QUFtQmpDLE9BQU8sT0FBUCxHQUFpQixFQUFFLG9CQUFGLEVBQWEsMEJBQWIsRUFBMkIsc0NBQTNCLEVBQWpCIiwiZmlsZSI6InN5bmMtZXZlbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEEgU3luYyBFdmVudCByZXByZXNlbnRzIGEgcmVxdWVzdCB0byB0aGUgc2VydmVyLlxuICogQSBTeW5jIEV2ZW50IG1heSBmaXJlIGltbWVkaWF0ZWx5LCBvciBtYXkgd2FpdCBpbiB0aGUgbGF5ZXIuU3luY01hbmFnZXInc1xuICogcXVldWUgZm9yIGEgbG9uZyBkdXJhdGlvbiBiZWZvcmUgZmlyaW5nLlxuICpcbiAqIERPIE5PVCBjb25mdXNlIHRoaXMgd2l0aCBsYXllci5MYXllckV2ZW50IHdoaWNoIHJlcHJlc2VudHMgYSBjaGFuZ2Ugbm90aWZpY2F0aW9uXG4gKiB0byB5b3VyIGFwcGxpY2F0aW9uLiAgbGF5ZXIuU3luY0V2ZW50IHJlcHJlc2VudHMgYSByZXF1ZXN0IHRvIHRoZSBzZXJ2ZXIgdGhhdFxuICogaXMgZWl0aGVyIGluIHByb2dyZXNzIG9yIGluIHF1ZXVlLlxuICpcbiAqIEdFVCByZXF1ZXN0cyBhcmUgdHlwaWNhbGx5IE5PVCBkb25lIHZpYSBhIFN5bmNFdmVudCBhcyB0aGVzZSBhcmUgdHlwaWNhbGx5XG4gKiBuZWVkZWQgdG8gcmVuZGVyIGEgVUkgYW5kIHNob3VsZCBlaXRoZXIgZmFpbCBvciBzdWNjZWVkIHByb21wdGx5LlxuICpcbiAqIEFwcGxpY2F0aW9ucyB0eXBpY2FsbHkgZG8gbm90IGludGVyYWN0IHdpdGggdGhlc2Ugb2JqZWN0cy5cbiAqXG4gKiBAY2xhc3MgIGxheWVyLlN5bmNFdmVudFxuICogQGV4dGVuZHMgbGF5ZXIuUm9vdFxuICovXG5jbGFzcyBTeW5jRXZlbnQgIHtcbiAgLyoqXG4gICAqIENyZWF0ZSBhIGxheWVyLlN5bmNFdmVudC4gIFNlZSBsYXllci5DbGllbnRBdXRoZW50aWNhdG9yIGZvciBleGFtcGxlcyBvZiB1c2FnZS5cbiAgICpcbiAgICogQG1ldGhvZCAgY29uc3RydWN0b3JcbiAgICogQHByaXZhdGVcbiAgICogQHJldHVybiB7bGF5ZXIuU3luY0V2ZW50fVxuICAgKi9cbiAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgIGxldCBrZXk7XG4gICAgZm9yIChrZXkgaW4gb3B0aW9ucykge1xuICAgICAgaWYgKGtleSBpbiB0aGlzKSB7XG4gICAgICAgIHRoaXNba2V5XSA9IG9wdGlvbnNba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCF0aGlzLmRlcGVuZHMpIHRoaXMuZGVwZW5kcyA9IFtdO1xuICB9XG5cbiAgLyoqXG4gICAqIE5vdCBzdHJpY3RseSByZXF1aXJlZCwgYnV0IG5pY2UgdG8gY2xlYW4gdGhpbmdzIHVwLlxuICAgKlxuICAgKiBAbWV0aG9kIGRlc3Ryb3lcbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy50YXJnZXQgPSBudWxsO1xuICAgIHRoaXMuZGVwZW5kcyA9IG51bGw7XG4gICAgdGhpcy5jYWxsYmFjayA9IG51bGw7XG4gICAgdGhpcy5kYXRhID0gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIFJlYWwgcGFyYW1ldGVycyBmb3IgdGhlIHJlcXVlc3QuXG4gICAqXG4gICAqIEBtZXRob2QgX3VwZGF0ZURhdGFcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF91cGRhdGVEYXRhKCkge1xuICAgIGlmICh0eXBlb2YgdGhpcy5kYXRhID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLmRhdGEgPSB0aGlzLmRhdGEoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIFBPSk8gdmVyc2lvbiBvZiB0aGlzIG9iamVjdCBzdWl0YWJsZSBmb3Igc2VyaWFsaXppbmcgZm9yIHRoZSBuZXR3b3JrXG4gICAqIEBtZXRob2QgdG9PYmplY3RcbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIHRvT2JqZWN0KCkge1xuICAgIHJldHVybiB7IGRhdGE6IHRoaXMuZGF0YSB9O1xuICB9XG59XG5cblxuLyoqXG4gKiBUaGUgdHlwZSBvZiBvcGVyYXRpb24gYmVpbmcgcGVyZm9ybWVkLlxuICpcbiAqIEVpdGhlciBHRVQsIFBBVENILCBERUxFVEUsIFBPU1Qgb3IgUFVUXG4gKlxuICogQHByb3BlcnR5IHtTdHJpbmd9XG4gKi9cblN5bmNFdmVudC5wcm90b3R5cGUub3BlcmF0aW9uID0gJyc7XG5cblxuLyoqXG4gKiBJbmRpY2F0ZXMgd2hldGhlciB0aGlzIHJlcXVlc3QgY3VycmVudGx5IGluLWZsaWdodC5cbiAqXG4gKiAqIFNldCB0byB0cnVlIGJ5IF94aHIoKSBtZXRob2QsXG4gKiAqIHNldCB0byBmYWxzZSBvbiBjb21wbGV0aW9uIGJ5IGxheWVyLlN5bmNNYW5hZ2VyLlxuICogKiBzZXQgdG8gZmFsc2UgYXV0b21hdGljYWxseSBhZnRlciAyIG1pbnV0ZXNcbiAqXG4gKiBAcHJvcGVydHkge0Jvb2xlYW59XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTeW5jRXZlbnQucHJvdG90eXBlLCAnaXNGaXJpbmcnLCB7XG4gIGVudW1lcmFibGU6IHRydWUsXG4gIHNldDogZnVuY3Rpb24gc2V0KHZhbHVlKSB7XG4gICAgdGhpcy5fX2lzRmlyaW5nID0gdmFsdWU7XG4gICAgaWYgKHZhbHVlKSB0aGlzLl9fZmlyZWRBdCA9IERhdGUubm93KCk7XG4gIH0sXG4gIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgIHJldHVybiBCb29sZWFuKHRoaXMuX19pc0ZpcmluZyAmJiBEYXRlLm5vdygpIC0gdGhpcy5fX2ZpcmVkQXQgPCBTeW5jRXZlbnQuRklSSU5HX0VYUElSSUFUSU9OKTtcbiAgfSxcbn0pO1xuXG4vKipcbiAqIEluZGljYXRlcyB3aGV0aGVyIHRoZSByZXF1ZXN0IGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkuXG4gKlxuICogU2V0IGJ5IGxheWVyLlN5bmNNYW5hZ2VyLlxuICogQHR5cGUge0Jvb2xlYW59XG4gKi9cblN5bmNFdmVudC5wcm90b3R5cGUuc3VjY2VzcyA9IG51bGw7XG5cblxuLyoqXG4gKiBDYWxsYmFjayB0byBmaXJlIG9uIGNvbXBsZXRpbmcgdGhpcyBzeW5jIGV2ZW50LlxuICpcbiAqIFdBUk5JTkc6IFRoZSBuYXR1cmUgb2YgdGhpcyBjYWxsYmFjayBtYXkgY2hhbmdlO1xuICogYSBwZXJzaXN0ZW5jZSBsYXllciB0aGF0IHBlcnNpc3RzIHRoZSBTeW5jTWFuYWdlcidzIHF1ZXVlXG4gKiBtdXN0IGhhdmUgc2VyaWFsaXphYmxlIGNhbGxiYWNrcyAob2JqZWN0IGlkICsgbWV0aG9kIG5hbWU7IG5vdCBhIGZ1bmN0aW9uKVxuICogb3IgbXVzdCBhY2NlcHQgdGhhdCBjYWxsYmFja3MgYXJlIG5vdCBhbHdheXMgZmlyZWQuXG4gKiBAdHlwZSB7RnVuY3Rpb259XG4gKi9cblN5bmNFdmVudC5wcm90b3R5cGUuY2FsbGJhY2sgPSBudWxsO1xuXG4vKipcbiAqIE51bWJlciBvZiByZXRyaWVzIG9uIHRoaXMgcmVxdWVzdC5cbiAqXG4gKiBSZXRyaWVzIGFyZSBvbmx5IGNvdW50ZWQgaWYgaXRzIGEgNTAyIG9yIDUwM1xuICogZXJyb3IuICBTZXQgYW5kIG1hbmFnZWQgYnkgbGF5ZXIuU3luY01hbmFnZXIuXG4gKiBAdHlwZSB7TnVtYmVyfVxuICovXG5TeW5jRXZlbnQucHJvdG90eXBlLnJldHJ5Q291bnQgPSAwO1xuXG4vKipcbiAqIFRoZSB0YXJnZXQgb2YgdGhlIHJlcXVlc3QuXG4gKlxuICogQW55IENvbXBvbmVudDsgdHlwaWNhbGx5IGEgQ29udmVyc2F0aW9uIG9yIE1lc3NhZ2UuXG4gKiBAdHlwZSB7bGF5ZXIuUm9vdH1cbiAqL1xuU3luY0V2ZW50LnByb3RvdHlwZS50YXJnZXQgPSBudWxsO1xuXG4vKipcbiAqIENvbXBvbmVudHMgdGhhdCB0aGlzIHJlcXVlc3QgZGVwZW5kcyB1cG9uLlxuICpcbiAqIEEgbWVzc2FnZSBjYW5ub3QgYmUgc2VudCBpZiBpdHNcbiAqIENvbnZlcnNhdGlvbiBmYWlscyB0byBnZXQgY3JlYXRlZC5cbiAqXG4gKiBOT1RFOiBNYXkgcHJvdmUgcmVkdW5kYW50IHdpdGggdGhlIHRhcmdldCBwcm9wZXJ0eSBhbmQgbmVlZHMgZnVydGhlciByZXZpZXcuXG4gKiBAdHlwZSB7bGF5ZXIuUm9vdFtdfVxuICovXG5TeW5jRXZlbnQucHJvdG90eXBlLmRlcGVuZHMgPSBudWxsO1xuXG4vKipcbiAqIERhdGEgZmllbGQgb2YgdGhlIHhociBjYWxsOyBjYW4gYmUgYW4gT2JqZWN0IG9yIHN0cmluZyAoaW5jbHVkaW5nIEpTT04gc3RyaW5nKVxuICogQHR5cGUge09iamVjdH1cbiAqL1xuU3luY0V2ZW50LnByb3RvdHlwZS5kYXRhID0gbnVsbDtcblxuLyoqXG4gKiBBZnRlciBmaXJpbmcgYSByZXF1ZXN0LCBpZiB0aGF0IGZpcmluZyBzdGF0ZSBmYWlscyB0byBjbGVhciBhZnRlciB0aGlzIG51bWJlciBvZiBtaWxpc2Vjb25kcyxcbiAqIGNvbnNpZGVyIGl0IHRvIG5vIGxvbmdlciBiZSBmaXJpbmcuICBVbmRlciBub3JtYWwgY29uZGl0aW9ucywgZmlyaW5nIHdpbGwgYmUgc2V0IHRvIGZhbHNlIGV4cGxpY2l0bHkuXG4gKiBUaGlzIGNoZWNrIGluc3VyZXMgdGhhdCBhbnkgZmFpbHVyZSBvZiB0aGF0IHByb2Nlc3MgZG9lcyBub3QgbGVhdmUgdXMgc3R1Y2sgd2l0aCBhIGZpcmluZyByZXF1ZXN0XG4gKiBibG9ja2luZyB0aGUgcXVldWUuXG4gKiBAdHlwZSB7bnVtYmVyfVxuICogQHN0YXRpY1xuICovXG5TeW5jRXZlbnQuRklSSU5HX0VYUElSSUFUSU9OID0gMTAwMCAqIDYwICogMjtcblxuLyoqXG4gKiBBIGxheWVyLlN5bmNFdmVudCBpbnRlbmRlZCB0byBiZSBmaXJlZCBhcyBhbiBYSFIgcmVxdWVzdC5cbiAqXG4gKiBAY2xhc3MgbGF5ZXIuU3luY0V2ZW50LlhIUlN5bmNFdmVudFxuICogQGV4dGVuZHMgbGF5ZXIuU3luY0V2ZW50XG4gKi9cbmNsYXNzIFhIUlN5bmNFdmVudCBleHRlbmRzIFN5bmNFdmVudCB7XG5cbiAgLyoqXG4gICAqIEZpcmUgdGhlIHJlcXVlc3QgYXNzb2NpYXRlZCB3aXRoIHRoaXMgaW5zdGFuY2UuXG4gICAqXG4gICAqIEFjdHVhbGx5IGl0IGp1c3QgcmV0dXJucyB0aGUgcGFyYW1ldGVycyBuZWVkZWQgdG8gbWFrZSB0aGUgeGhyIGNhbGw6XG4gICAqXG4gICAqICAgICAgdmFyIHhociA9IHJlcXVpcmUoJy4veGhyJyk7XG4gICAqICAgICAgeGhyKGV2ZW50Ll9nZXRSZXF1ZXN0RGF0YSgpKTtcbiAgICpcbiAgICogQG1ldGhvZCBfZ2V0UmVxdWVzdERhdGFcbiAgICogQHByb3RlY3RlZFxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgX2dldFJlcXVlc3REYXRhKCkge1xuICAgIHRoaXMuX3VwZGF0ZVVybCgpO1xuICAgIHRoaXMuX3VwZGF0ZURhdGEoKTtcbiAgICByZXR1cm4ge1xuICAgICAgdXJsOiB0aGlzLnVybCxcbiAgICAgIG1ldGhvZDogdGhpcy5tZXRob2QsXG4gICAgICBoZWFkZXJzOiB0aGlzLmhlYWRlcnMsXG4gICAgICBkYXRhOiB0aGlzLmRhdGEsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIFJlYWwgVVJMLlxuICAgKlxuICAgKiBJZiB0aGUgdXJsIHByb3BlcnR5IGlzIGEgZnVuY3Rpb24sIGNhbGwgaXQgdG8gc2V0IHRoZSBhY3R1YWwgdXJsLlxuICAgKiBVc2VkIHdoZW4gdGhlIFVSTCBpcyB1bmtub3duIHVudGlsIGEgcHJpb3IgU3luY0V2ZW50IGhhcyBjb21wbGV0ZWQuXG4gICAqXG4gICAqIEBtZXRob2QgX3VwZGF0ZVVybFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3VwZGF0ZVVybCgpIHtcbiAgICBpZiAodHlwZW9mIHRoaXMudXJsID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLnVybCA9IHRoaXMudXJsKCk7XG4gICAgfVxuICB9XG5cbiAgdG9PYmplY3QoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGRhdGE6IHRoaXMuZGF0YSxcbiAgICAgIHVybDogdGhpcy51cmwsXG4gICAgICBtZXRob2Q6IHRoaXMubWV0aG9kLFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBIb3cgbG9uZyBiZWZvcmUgdGhlIHJlcXVlc3QgdGltZXMgb3V0P1xuICogQHR5cGUge051bWJlcn0gW3RpbWVvdXQ9MTUwMDBdXG4gKi9cblhIUlN5bmNFdmVudC5wcm90b3R5cGUudGltZW91dCA9IDE1MDAwO1xuXG4vKipcbiAqIFVSTCB0byBzZW5kIHRoZSByZXF1ZXN0IHRvXG4gKi9cblhIUlN5bmNFdmVudC5wcm90b3R5cGUudXJsID0gJyc7XG5cbi8qKlxuICogQ291bnRzIG51bWJlciBvZiBvbmxpbmUgc3RhdGUgY2hhbmdlcy5cbiAqXG4gKiBJZiB0aGlzIG51bWJlciBiZWNvbWVzIGhpZ2ggaW4gYSBzaG9ydCB0aW1lIHBlcmlvZCwgaXRzIHByb2JhYmx5XG4gKiBmYWlsaW5nIGR1ZSB0byBhIENPUlMgZXJyb3IuXG4gKi9cblhIUlN5bmNFdmVudC5wcm90b3R5cGUucmV0dXJuVG9PbmxpbmVDb3VudCA9IDA7XG5cbi8qKlxuICogSGVhZGVycyBmb3IgdGhlIHJlcXVlc3RcbiAqL1xuWEhSU3luY0V2ZW50LnByb3RvdHlwZS5oZWFkZXJzID0gbnVsbDtcblxuLyoqXG4gKiBSZXF1ZXN0IG1ldGhvZC5cbiAqL1xuWEhSU3luY0V2ZW50LnByb3RvdHlwZS5tZXRob2QgPSAnR0VUJztcblxuXG4vKipcbiAqIEEgbGF5ZXIuU3luY0V2ZW50IGludGVuZGVkIHRvIGJlIGZpcmVkIGFzIGEgd2Vic29ja2V0IHJlcXVlc3QuXG4gKlxuICogQGNsYXNzIGxheWVyLlN5bmNFdmVudC5XZWJzb2NrZXRTeW5jRXZlbnRcbiAqIEBleHRlbmRzIGxheWVyLlN5bmNFdmVudFxuICovXG5jbGFzcyBXZWJzb2NrZXRTeW5jRXZlbnQgZXh0ZW5kcyBTeW5jRXZlbnQge1xuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHdlYnNvY2tldCByZXF1ZXN0IG9iamVjdC5cbiAgICpcbiAgICogQG1ldGhvZCBfZ2V0UmVxdWVzdERhdGFcbiAgICogQHByaXZhdGVcbiAgICogQHJldHVybiB7T2JqZWN0fVxuICAgKi9cbiAgX2dldFJlcXVlc3REYXRhKCkge1xuICAgIHRoaXMuX3VwZGF0ZURhdGEoKTtcbiAgICByZXR1cm4gdGhpcy5kYXRhO1xuICB9XG5cbiAgdG9PYmplY3QoKSB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHsgU3luY0V2ZW50LCBYSFJTeW5jRXZlbnQsIFdlYnNvY2tldFN5bmNFdmVudCB9O1xuIl19
