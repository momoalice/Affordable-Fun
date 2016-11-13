'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * This class manages a state variable for whether we are online/offline, triggers events
 * when the state changes, and determines when to perform tests to validate our online status.
 *
 * It performs the following tasks:
 *
 * 1. Any time we go more than this.pingFrequency (100 seconds) without any data from the server, flag us as being offline.
 *    Rationale: The websocket manager is calling `getCounter` every 30 seconds; so it would have had to fail to get any response
 *    3 times before we give up.
 * 2. While we are offline, ping the server until we determine we are in fact able to connect to the server
 * 3. Trigger events `connected` and `disconnected` to let the rest of the system know when we are/are not connected.
 *    NOTE: The Websocket manager will use that to reconnect its websocket, and resume its `getCounter` call every 30 seconds.
 *
 * NOTE: Apps that want to be notified of changes to online/offline state should see layer.Client's `online` event.
 *
 * NOTE: One iteration of this class treated navigator.onLine = false as fact.  If onLine is false, then we don't need to test
 * anything.  If its true, then this class verifies it can reach layer's servers.  However, https://code.google.com/p/chromium/issues/detail?id=277372 has replicated multiple times in chrome; this bug causes one tab of chrome to have navigator.onLine=false while all other tabs
 * correctly report navigator.onLine=true.  As a result, we can't rely on this value and this class must continue to poll the server while
 * offline and to ignore values from navigator.onLine.  Future Work: Allow non-chrome browsers to use navigator.onLine.
 *
 * @class  layer.OnlineStateManager
 * @private
 * @extends layer.Root
 *
 */
var Root = require('./root');
var xhr = require('./xhr');
var logger = require('./logger');
var Utils = require('./client-utils');

var OnlineStateManager = function (_Root) {
  _inherits(OnlineStateManager, _Root);

  /**
   * Creates a new OnlineStateManager.
   *
   * An Application is expected to only have one of these.
   *
   *      var onlineStateManager = new layer.OnlineStateManager({
   *          socketManager: socketManager,
   *          testUrl: 'https://api.layer.com/nonces'
   *      });
   *
   * @method constructor
   * @param  {Object} options
   * @param  {layer.Websockets.SocketManager} options.socketManager - A websocket manager to monitor for messages
   * @param  {string} options.testUrl - A url to send requests to when testing if we are online
   */

  function OnlineStateManager(options) {
    _classCallCheck(this, OnlineStateManager);

    // Listen to all xhr events and websocket messages for online-status info

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(OnlineStateManager).call(this, options));

    xhr.addConnectionListener(function (evt) {
      return _this._connectionListener(evt);
    });
    _this.socketManager.on('message', function () {
      return _this._connectionListener({ status: 'connection:success' });
    }, _this);

    // Any change in online status reported by the browser should result in
    // an immediate update to our online/offline state
    /* istanbul ignore else */
    if (typeof window !== 'undefined') {
      window.addEventListener('online', _this._handleOnlineEvent.bind(_this));
      window.addEventListener('offline', _this._handleOnlineEvent.bind(_this));
    }
    return _this;
  }

  /**
   * We don't actually start managing our online state until after the client has authenticated.
   * Call start() when we are ready for the client to start managing our state.
   *
   * The client won't call start() without first validating that we have a valid session, so by definition,
   * calling start means we are online.
   *
   * @method start
   */


  _createClass(OnlineStateManager, [{
    key: 'start',
    value: function start() {
      logger.info('OnlineStateManager: start');
      this.isClientReady = true;
      this.isOnline = true;
      if (!this._firstStart) {
        this.trigger('connected', { offlineDuration: 0 });
      }
      this._firstStart = false;
      this._scheduleNextOnlineCheck();
    }

    /**
     * If the client becomes unauthenticated, stop checking if we are online, and announce that we are offline.
     *
     * @method stop
     */

  }, {
    key: 'stop',
    value: function stop() {
      logger.info('OnlineStateManager: stop');
      this.isClientReady = false;
      this._clearCheck();
      this._changeToOffline();
    }

    /**
     * Schedules our next call to _onlineExpired if online or checkOnlineStatus if offline.
     *
     * @method _scheduleNextOnlineCheck
     * @private
     */

  }, {
    key: '_scheduleNextOnlineCheck',
    value: function _scheduleNextOnlineCheck() {
      logger.debug('OnlineStateManager: skip schedule');
      if (this.isDestroyed || !this.isClientReady) return;

      // Replace any scheduled calls with the newly scheduled call:
      this._clearCheck();

      // If this is called while we are online, then we are using this to detect when we've gone without data for more than pingFrequency.
      // Call this._onlineExpired after pingFrequency of no server responses.
      if (this.isOnline) {
        logger.debug('OnlineStateManager: Scheduled onlineExpired');
        this.onlineCheckId = setTimeout(this._onlineExpired.bind(this), this.pingFrequency);
      }

      // If this is called while we are offline, we're doing exponential backoff pinging the server to see if we've come back online.
      else {
          logger.info('OnlineStateManager: Scheduled checkOnlineStatus');
          var duration = Utils.getExponentialBackoffSeconds(this.maxOfflineWait, Math.min(10, this.offlineCounter++));
          this.onlineCheckId = setTimeout(this.checkOnlineStatus.bind(this), Math.floor(duration * 1000));
        }
    }

    /**
     * Cancels any upcoming calls to checkOnlineStatus
     *
     * @method _clearCheck
     * @private
     */

  }, {
    key: '_clearCheck',
    value: function _clearCheck() {
      if (this.onlineCheckId) {
        clearTimeout(this.onlineCheckId);
        this.onlineCheckId = 0;
      }
    }

    /**
     * Respond to the browser's online/offline events.
     *
     * Our response is not to trust them, but to use them as
     * a trigger to indicate we should immediately do our own
     * validation.
     *
     * @method _handleOnlineEvent
     * @private
     * @param  {Event} evt - Browser online/offline event object
     */

  }, {
    key: '_handleOnlineEvent',
    value: function _handleOnlineEvent(evt) {
      // Reset the counter because our first request may fail as they may not be
      // fully connected yet
      this.offlineCounter = 0;
      this.checkOnlineStatus();
    }

    /**
     * Our online state has expired; we are now offline.
     *
     * If this method gets called, it means that our connection has gone too long without any data
     * and is now considered to be disconnected.  Start scheduling tests to see when we are back online.
     *
     * @method _onlineExpired
     * @private
     */

  }, {
    key: '_onlineExpired',
    value: function _onlineExpired() {
      this._clearCheck();
      this._changeToOffline();
      this._scheduleNextOnlineCheck();
    }

    /**
     * Get a nonce to see if we can reach the server.
     *
     * We don't care about the result,
     * we just care about triggering a 'connection:success' or 'connection:error' event
     * which connectionListener will respond to.
     *
     *      client.onlineManager.checkOnlineStatus(function(result) {
     *          alert(result ? 'We're online!' : 'Doh!');
     *      });
     *
     * @method checkOnlineStatus
     * @param {Function} callback
     * @param {boolean} callback.isOnline - Callback is called with true if online, false if not
     */

  }, {
    key: 'checkOnlineStatus',
    value: function checkOnlineStatus(callback) {
      var _this2 = this;

      this._clearCheck();

      logger.info('OnlineStateManager: Firing XHR for online check');
      this._lastCheckOnlineStatus = new Date();
      // Ping the server and see if we're connected.
      xhr({
        url: this.testUrl,
        method: 'POST',
        headers: {
          accept: 'application/vnd.layer+json; version=1.0'
        }
      }, function () {
        // this.isOnline will be updated via _connectionListener prior to this line executing
        if (callback) callback(_this2.isOnline);
      });
    }

    /**
     * On determining that we are offline, handles the state transition and logging.
     *
     * @method _changeToOffline
     * @private
     */

  }, {
    key: '_changeToOffline',
    value: function _changeToOffline() {
      if (this.isOnline) {
        this.isOnline = false;
        this.trigger('disconnected');
        logger.info('OnlineStateManager: Connection lost');
      }
    }

    /**
     * Called whenever a websocket event arrives, or an xhr call completes; updates our isOnline state.
     *
     * Any call to this method will reschedule our next is-online test
     *
     * @method _connectionListener
     * @private
     * @param  {string} evt - Name of the event; either 'connection:success' or 'connection:error'
     */

  }, {
    key: '_connectionListener',
    value: function _connectionListener(evt) {
      // If event is a success, change us to online
      if (evt.status === 'connection:success') {
        var lastTime = this.lastMessageTime;
        this.lastMessageTime = new Date();
        if (!this.isOnline) {
          this.isOnline = true;
          this.offlineCounter = 0;
          this.trigger('connected', { offlineDuration: lastTime ? Date.now() - lastTime : 0 });
          if (this.connectedCounter === undefined) this.connectedCounter = 0;
          this.connectedCounter++;
          logger.info('OnlineStateManager: Connected restored');
        }
      }

      // If event is NOT success, change us to offline.
      else {
          this._changeToOffline();
        }

      this._scheduleNextOnlineCheck();
    }

    /**
     * Cleanup/shutdown
     *
     * @method destroy
     */

  }, {
    key: 'destroy',
    value: function destroy() {
      this._clearCheck();
      this.socketManager = null;
      _get(Object.getPrototypeOf(OnlineStateManager.prototype), 'destroy', this).call(this);
    }
  }]);

  return OnlineStateManager;
}(Root);

OnlineStateManager.prototype.isClientReady = false;

/**
 * URL To fire when testing to see if we are online.
 * @type {String}
 */
OnlineStateManager.prototype.testUrl = '';

/**
 * A Websocket manager whose 'message' event we will listen to
 * in order to know that we are still online.
 * @type {layer.Websockets.SocketManager}
 */
OnlineStateManager.prototype.socketManager = null;

/**
 * Number of testUrl requests we've been offline for.
 *
 * Will stop growing once the number is suitably large (10-20).
 * @type {Number}
 */
OnlineStateManager.prototype.offlineCounter = 0;

/**
 * Maximum wait during exponential backoff while offline.
 *
 * While offline, exponential backoff is used to calculate how long to wait between checking with the server
 * to see if we are online again. This value determines the maximum wait; any higher value returned by exponential backoff
 * are ignored and this value used instead.
 * Value is measured in seconds.
 * @type {Number}
 */
OnlineStateManager.prototype.maxOfflineWait = 5 * 60;

/**
 * Minimum wait between tries in ms.
 * @type {Number}
 */
OnlineStateManager.prototype.minBackoffWait = 100;

/**
 * Time that the last successful message was observed.
 * @type {Date}
 */
OnlineStateManager.prototype.lastMessageTime = null;

/**
 * For debugging, tracks the last time we checked if we are online.
 * @type {Date}
 */
OnlineStateManager.prototype._lastCheckOnlineStatus = null;

/**
 * Are we currently online?
 * @type {Boolean}
 */
OnlineStateManager.prototype.isOnline = false;

/**
 * setTimeoutId for the next checkOnlineStatus() call.
 * @type {Number}
 */
OnlineStateManager.prototype.onlineCheckId = 0;

/**
 * True until the first time start() is called.
 * @type {boolean}
 */
OnlineStateManager.prototype._firstStart = true;

/**
 * If we are online, how often do we need to ping to verify we are still online.
 *
 * Value is reset any time we observe any messages from the server.
 * Measured in miliseconds. NOTE: Websocket has a separate ping which mostly makes
 * this one unnecessary.  May end up removing this one... though we'd keep the
 * ping for when our state is offline.
 * @type {Number}
 */
OnlineStateManager.prototype.pingFrequency = 100 * 1000;

OnlineStateManager._supportedEvents = [
/**
 * We appear to be online and able to send and receive
 * @event connected
 * @param {number} onlineDuration - Number of miliseconds since we were last known to be online
 */
'connected',

/**
 * We appear to be offline and unable to send or receive
 * @event disconnected
 */
'disconnected'].concat(Root._supportedEvents);
Root.initClass.apply(OnlineStateManager, [OnlineStateManager, 'OnlineStateManager']);
module.exports = OnlineStateManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9vbmxpbmUtc3RhdGUtbWFuYWdlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBeUJBLElBQU0sT0FBTyxRQUFRLFFBQVIsQ0FBUDtBQUNOLElBQU0sTUFBTSxRQUFRLE9BQVIsQ0FBTjtBQUNOLElBQU0sU0FBUyxRQUFRLFVBQVIsQ0FBVDtBQUNOLElBQU0sUUFBUSxRQUFRLGdCQUFSLENBQVI7O0lBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFnQkosV0FoQkksa0JBZ0JKLENBQVksT0FBWixFQUFxQjswQkFoQmpCLG9CQWdCaUI7Ozs7dUVBaEJqQiwrQkFpQkksVUFEYTs7QUFJbkIsUUFBSSxxQkFBSixDQUEwQjthQUFPLE1BQUssbUJBQUwsQ0FBeUIsR0FBekI7S0FBUCxDQUExQixDQUptQjtBQUtuQixVQUFLLGFBQUwsQ0FBbUIsRUFBbkIsQ0FBc0IsU0FBdEIsRUFBaUM7YUFBTSxNQUFLLG1CQUFMLENBQXlCLEVBQUUsUUFBUSxvQkFBUixFQUEzQjtLQUFOLE9BQWpDOzs7OztBQUxtQixRQVVmLE9BQU8sTUFBUCxLQUFrQixXQUFsQixFQUErQjtBQUNqQyxhQUFPLGdCQUFQLENBQXdCLFFBQXhCLEVBQWtDLE1BQUssa0JBQUwsQ0FBd0IsSUFBeEIsT0FBbEMsRUFEaUM7QUFFakMsYUFBTyxnQkFBUCxDQUF3QixTQUF4QixFQUFtQyxNQUFLLGtCQUFMLENBQXdCLElBQXhCLE9BQW5DLEVBRmlDO0tBQW5DO2lCQVZtQjtHQUFyQjs7Ozs7Ozs7Ozs7OztlQWhCSTs7NEJBeUNJO0FBQ04sYUFBTyxJQUFQLENBQVksMkJBQVosRUFETTtBQUVOLFdBQUssYUFBTCxHQUFxQixJQUFyQixDQUZNO0FBR04sV0FBSyxRQUFMLEdBQWdCLElBQWhCLENBSE07QUFJTixVQUFJLENBQUMsS0FBSyxXQUFMLEVBQWtCO0FBQ3JCLGFBQUssT0FBTCxDQUFhLFdBQWIsRUFBMEIsRUFBRSxp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LE1BQU0sSUFBTjs7QUFFN0MsbUJBQW1CLGdCQUFuQixHQUFzQzs7Ozs7O0FBTXBDLFdBTm9DOzs7Ozs7QUFZcEMsY0Fab0MsRUFhcEMsTUFib0MsQ0FhN0IsS0FBSyxnQkFBTCxDQWJUO0FBY0EsS0FBSyxTQUFMLENBQWUsS0FBZixDQUFxQixrQkFBckIsRUFBeUMsQ0FBQyxrQkFBRCxFQUFxQixvQkFBckIsQ0FBekM7QUFDQSxPQUFPLE9BQVAsR0FBaUIsa0JBQWpCIiwiZmlsZSI6Im9ubGluZS1zdGF0ZS1tYW5hZ2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBUaGlzIGNsYXNzIG1hbmFnZXMgYSBzdGF0ZSB2YXJpYWJsZSBmb3Igd2hldGhlciB3ZSBhcmUgb25saW5lL29mZmxpbmUsIHRyaWdnZXJzIGV2ZW50c1xuICogd2hlbiB0aGUgc3RhdGUgY2hhbmdlcywgYW5kIGRldGVybWluZXMgd2hlbiB0byBwZXJmb3JtIHRlc3RzIHRvIHZhbGlkYXRlIG91ciBvbmxpbmUgc3RhdHVzLlxuICpcbiAqIEl0IHBlcmZvcm1zIHRoZSBmb2xsb3dpbmcgdGFza3M6XG4gKlxuICogMS4gQW55IHRpbWUgd2UgZ28gbW9yZSB0aGFuIHRoaXMucGluZ0ZyZXF1ZW5jeSAoMTAwIHNlY29uZHMpIHdpdGhvdXQgYW55IGRhdGEgZnJvbSB0aGUgc2VydmVyLCBmbGFnIHVzIGFzIGJlaW5nIG9mZmxpbmUuXG4gKiAgICBSYXRpb25hbGU6IFRoZSB3ZWJzb2NrZXQgbWFuYWdlciBpcyBjYWxsaW5nIGBnZXRDb3VudGVyYCBldmVyeSAzMCBzZWNvbmRzOyBzbyBpdCB3b3VsZCBoYXZlIGhhZCB0byBmYWlsIHRvIGdldCBhbnkgcmVzcG9uc2VcbiAqICAgIDMgdGltZXMgYmVmb3JlIHdlIGdpdmUgdXAuXG4gKiAyLiBXaGlsZSB3ZSBhcmUgb2ZmbGluZSwgcGluZyB0aGUgc2VydmVyIHVudGlsIHdlIGRldGVybWluZSB3ZSBhcmUgaW4gZmFjdCBhYmxlIHRvIGNvbm5lY3QgdG8gdGhlIHNlcnZlclxuICogMy4gVHJpZ2dlciBldmVudHMgYGNvbm5lY3RlZGAgYW5kIGBkaXNjb25uZWN0ZWRgIHRvIGxldCB0aGUgcmVzdCBvZiB0aGUgc3lzdGVtIGtub3cgd2hlbiB3ZSBhcmUvYXJlIG5vdCBjb25uZWN0ZWQuXG4gKiAgICBOT1RFOiBUaGUgV2Vic29ja2V0IG1hbmFnZXIgd2lsbCB1c2UgdGhhdCB0byByZWNvbm5lY3QgaXRzIHdlYnNvY2tldCwgYW5kIHJlc3VtZSBpdHMgYGdldENvdW50ZXJgIGNhbGwgZXZlcnkgMzAgc2Vjb25kcy5cbiAqXG4gKiBOT1RFOiBBcHBzIHRoYXQgd2FudCB0byBiZSBub3RpZmllZCBvZiBjaGFuZ2VzIHRvIG9ubGluZS9vZmZsaW5lIHN0YXRlIHNob3VsZCBzZWUgbGF5ZXIuQ2xpZW50J3MgYG9ubGluZWAgZXZlbnQuXG4gKlxuICogTk9URTogT25lIGl0ZXJhdGlvbiBvZiB0aGlzIGNsYXNzIHRyZWF0ZWQgbmF2aWdhdG9yLm9uTGluZSA9IGZhbHNlIGFzIGZhY3QuICBJZiBvbkxpbmUgaXMgZmFsc2UsIHRoZW4gd2UgZG9uJ3QgbmVlZCB0byB0ZXN0XG4gKiBhbnl0aGluZy4gIElmIGl0cyB0cnVlLCB0aGVuIHRoaXMgY2xhc3MgdmVyaWZpZXMgaXQgY2FuIHJlYWNoIGxheWVyJ3Mgc2VydmVycy4gIEhvd2V2ZXIsIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD0yNzczNzIgaGFzIHJlcGxpY2F0ZWQgbXVsdGlwbGUgdGltZXMgaW4gY2hyb21lOyB0aGlzIGJ1ZyBjYXVzZXMgb25lIHRhYiBvZiBjaHJvbWUgdG8gaGF2ZSBuYXZpZ2F0b3Iub25MaW5lPWZhbHNlIHdoaWxlIGFsbCBvdGhlciB0YWJzXG4gKiBjb3JyZWN0bHkgcmVwb3J0IG5hdmlnYXRvci5vbkxpbmU9dHJ1ZS4gIEFzIGEgcmVzdWx0LCB3ZSBjYW4ndCByZWx5IG9uIHRoaXMgdmFsdWUgYW5kIHRoaXMgY2xhc3MgbXVzdCBjb250aW51ZSB0byBwb2xsIHRoZSBzZXJ2ZXIgd2hpbGVcbiAqIG9mZmxpbmUgYW5kIHRvIGlnbm9yZSB2YWx1ZXMgZnJvbSBuYXZpZ2F0b3Iub25MaW5lLiAgRnV0dXJlIFdvcms6IEFsbG93IG5vbi1jaHJvbWUgYnJvd3NlcnMgdG8gdXNlIG5hdmlnYXRvci5vbkxpbmUuXG4gKlxuICogQGNsYXNzICBsYXllci5PbmxpbmVTdGF0ZU1hbmFnZXJcbiAqIEBwcml2YXRlXG4gKiBAZXh0ZW5kcyBsYXllci5Sb290XG4gKlxuICovXG5jb25zdCBSb290ID0gcmVxdWlyZSgnLi9yb290Jyk7XG5jb25zdCB4aHIgPSByZXF1aXJlKCcuL3hocicpO1xuY29uc3QgbG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXInKTtcbmNvbnN0IFV0aWxzID0gcmVxdWlyZSgnLi9jbGllbnQtdXRpbHMnKTtcblxuY2xhc3MgT25saW5lU3RhdGVNYW5hZ2VyIGV4dGVuZHMgUm9vdCB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IE9ubGluZVN0YXRlTWFuYWdlci5cbiAgICpcbiAgICogQW4gQXBwbGljYXRpb24gaXMgZXhwZWN0ZWQgdG8gb25seSBoYXZlIG9uZSBvZiB0aGVzZS5cbiAgICpcbiAgICogICAgICB2YXIgb25saW5lU3RhdGVNYW5hZ2VyID0gbmV3IGxheWVyLk9ubGluZVN0YXRlTWFuYWdlcih7XG4gICAqICAgICAgICAgIHNvY2tldE1hbmFnZXI6IHNvY2tldE1hbmFnZXIsXG4gICAqICAgICAgICAgIHRlc3RVcmw6ICdodHRwczovL2FwaS5sYXllci5jb20vbm9uY2VzJ1xuICAgKiAgICAgIH0pO1xuICAgKlxuICAgKiBAbWV0aG9kIGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9uc1xuICAgKiBAcGFyYW0gIHtsYXllci5XZWJzb2NrZXRzLlNvY2tldE1hbmFnZXJ9IG9wdGlvbnMuc29ja2V0TWFuYWdlciAtIEEgd2Vic29ja2V0IG1hbmFnZXIgdG8gbW9uaXRvciBmb3IgbWVzc2FnZXNcbiAgICogQHBhcmFtICB7c3RyaW5nfSBvcHRpb25zLnRlc3RVcmwgLSBBIHVybCB0byBzZW5kIHJlcXVlc3RzIHRvIHdoZW4gdGVzdGluZyBpZiB3ZSBhcmUgb25saW5lXG4gICAqL1xuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucyk7XG5cbiAgICAvLyBMaXN0ZW4gdG8gYWxsIHhociBldmVudHMgYW5kIHdlYnNvY2tldCBtZXNzYWdlcyBmb3Igb25saW5lLXN0YXR1cyBpbmZvXG4gICAgeGhyLmFkZENvbm5lY3Rpb25MaXN0ZW5lcihldnQgPT4gdGhpcy5fY29ubmVjdGlvbkxpc3RlbmVyKGV2dCkpO1xuICAgIHRoaXMuc29ja2V0TWFuYWdlci5vbignbWVzc2FnZScsICgpID0+IHRoaXMuX2Nvbm5lY3Rpb25MaXN0ZW5lcih7IHN0YXR1czogJ2Nvbm5lY3Rpb246c3VjY2VzcycgfSksIHRoaXMpO1xuXG4gICAgLy8gQW55IGNoYW5nZSBpbiBvbmxpbmUgc3RhdHVzIHJlcG9ydGVkIGJ5IHRoZSBicm93c2VyIHNob3VsZCByZXN1bHQgaW5cbiAgICAvLyBhbiBpbW1lZGlhdGUgdXBkYXRlIHRvIG91ciBvbmxpbmUvb2ZmbGluZSBzdGF0ZVxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignb25saW5lJywgdGhpcy5faGFuZGxlT25saW5lRXZlbnQuYmluZCh0aGlzKSk7XG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignb2ZmbGluZScsIHRoaXMuX2hhbmRsZU9ubGluZUV2ZW50LmJpbmQodGhpcykpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBXZSBkb24ndCBhY3R1YWxseSBzdGFydCBtYW5hZ2luZyBvdXIgb25saW5lIHN0YXRlIHVudGlsIGFmdGVyIHRoZSBjbGllbnQgaGFzIGF1dGhlbnRpY2F0ZWQuXG4gICAqIENhbGwgc3RhcnQoKSB3aGVuIHdlIGFyZSByZWFkeSBmb3IgdGhlIGNsaWVudCB0byBzdGFydCBtYW5hZ2luZyBvdXIgc3RhdGUuXG4gICAqXG4gICAqIFRoZSBjbGllbnQgd29uJ3QgY2FsbCBzdGFydCgpIHdpdGhvdXQgZmlyc3QgdmFsaWRhdGluZyB0aGF0IHdlIGhhdmUgYSB2YWxpZCBzZXNzaW9uLCBzbyBieSBkZWZpbml0aW9uLFxuICAgKiBjYWxsaW5nIHN0YXJ0IG1lYW5zIHdlIGFyZSBvbmxpbmUuXG4gICAqXG4gICAqIEBtZXRob2Qgc3RhcnRcbiAgICovXG4gIHN0YXJ0KCkge1xuICAgIGxvZ2dlci5pbmZvKCdPbmxpbmVTdGF0ZU1hbmFnZXI6IHN0YXJ0Jyk7XG4gICAgdGhpcy5pc0NsaWVudFJlYWR5ID0gdHJ1ZTtcbiAgICB0aGlzLmlzT25saW5lID0gdHJ1ZTtcbiAgICBpZiAoIXRoaXMuX2ZpcnN0U3RhcnQpIHtcbiAgICAgIHRoaXMudHJpZ2dlcignY29ubmVjdGVkJywgeyBvZmZsaW5lRHVyYXRpb246IDAgfSk7XG4gICAgfVxuICAgIHRoaXMuX2ZpcnN0U3RhcnQgPSBmYWxzZTtcbiAgICB0aGlzLl9zY2hlZHVsZU5leHRPbmxpbmVDaGVjaygpO1xuICB9XG5cbiAgLyoqXG4gICAqIElmIHRoZSBjbGllbnQgYmVjb21lcyB1bmF1dGhlbnRpY2F0ZWQsIHN0b3AgY2hlY2tpbmcgaWYgd2UgYXJlIG9ubGluZSwgYW5kIGFubm91bmNlIHRoYXQgd2UgYXJlIG9mZmxpbmUuXG4gICAqXG4gICAqIEBtZXRob2Qgc3RvcFxuICAgKi9cbiAgc3RvcCgpIHtcbiAgICBsb2dnZXIuaW5mbygnT25saW5lU3RhdGVNYW5hZ2VyOiBzdG9wJyk7XG4gICAgdGhpcy5pc0NsaWVudFJlYWR5ID0gZmFsc2U7XG4gICAgdGhpcy5fY2xlYXJDaGVjaygpO1xuICAgIHRoaXMuX2NoYW5nZVRvT2ZmbGluZSgpO1xuICB9XG5cblxuICAvKipcbiAgICogU2NoZWR1bGVzIG91ciBuZXh0IGNhbGwgdG8gX29ubGluZUV4cGlyZWQgaWYgb25saW5lIG9yIGNoZWNrT25saW5lU3RhdHVzIGlmIG9mZmxpbmUuXG4gICAqXG4gICAqIEBtZXRob2QgX3NjaGVkdWxlTmV4dE9ubGluZUNoZWNrXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc2NoZWR1bGVOZXh0T25saW5lQ2hlY2soKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdPbmxpbmVTdGF0ZU1hbmFnZXI6IHNraXAgc2NoZWR1bGUnKTtcbiAgICBpZiAodGhpcy5pc0Rlc3Ryb3llZCB8fCAhdGhpcy5pc0NsaWVudFJlYWR5KSByZXR1cm47XG5cbiAgICAvLyBSZXBsYWNlIGFueSBzY2hlZHVsZWQgY2FsbHMgd2l0aCB0aGUgbmV3bHkgc2NoZWR1bGVkIGNhbGw6XG4gICAgdGhpcy5fY2xlYXJDaGVjaygpO1xuXG4gICAgLy8gSWYgdGhpcyBpcyBjYWxsZWQgd2hpbGUgd2UgYXJlIG9ubGluZSwgdGhlbiB3ZSBhcmUgdXNpbmcgdGhpcyB0byBkZXRlY3Qgd2hlbiB3ZSd2ZSBnb25lIHdpdGhvdXQgZGF0YSBmb3IgbW9yZSB0aGFuIHBpbmdGcmVxdWVuY3kuXG4gICAgLy8gQ2FsbCB0aGlzLl9vbmxpbmVFeHBpcmVkIGFmdGVyIHBpbmdGcmVxdWVuY3kgb2Ygbm8gc2VydmVyIHJlc3BvbnNlcy5cbiAgICBpZiAodGhpcy5pc09ubGluZSkge1xuICAgICAgbG9nZ2VyLmRlYnVnKCdPbmxpbmVTdGF0ZU1hbmFnZXI6IFNjaGVkdWxlZCBvbmxpbmVFeHBpcmVkJyk7XG4gICAgICB0aGlzLm9ubGluZUNoZWNrSWQgPSBzZXRUaW1lb3V0KHRoaXMuX29ubGluZUV4cGlyZWQuYmluZCh0aGlzKSwgdGhpcy5waW5nRnJlcXVlbmN5KTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGlzIGlzIGNhbGxlZCB3aGlsZSB3ZSBhcmUgb2ZmbGluZSwgd2UncmUgZG9pbmcgZXhwb25lbnRpYWwgYmFja29mZiBwaW5naW5nIHRoZSBzZXJ2ZXIgdG8gc2VlIGlmIHdlJ3ZlIGNvbWUgYmFjayBvbmxpbmUuXG4gICAgZWxzZSB7XG4gICAgICBsb2dnZXIuaW5mbygnT25saW5lU3RhdGVNYW5hZ2VyOiBTY2hlZHVsZWQgY2hlY2tPbmxpbmVTdGF0dXMnKTtcbiAgICAgIGNvbnN0IGR1cmF0aW9uID0gVXRpbHMuZ2V0RXhwb25lbnRpYWxCYWNrb2ZmU2Vjb25kcyh0aGlzLm1heE9mZmxpbmVXYWl0LCBNYXRoLm1pbigxMCwgdGhpcy5vZmZsaW5lQ291bnRlcisrKSk7XG4gICAgICB0aGlzLm9ubGluZUNoZWNrSWQgPSBzZXRUaW1lb3V0KHRoaXMuY2hlY2tPbmxpbmVTdGF0dXMuYmluZCh0aGlzKSwgTWF0aC5mbG9vcihkdXJhdGlvbiAqIDEwMDApKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2FuY2VscyBhbnkgdXBjb21pbmcgY2FsbHMgdG8gY2hlY2tPbmxpbmVTdGF0dXNcbiAgICpcbiAgICogQG1ldGhvZCBfY2xlYXJDaGVja1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2NsZWFyQ2hlY2soKSB7XG4gICAgaWYgKHRoaXMub25saW5lQ2hlY2tJZCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMub25saW5lQ2hlY2tJZCk7XG4gICAgICB0aGlzLm9ubGluZUNoZWNrSWQgPSAwO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNwb25kIHRvIHRoZSBicm93c2VyJ3Mgb25saW5lL29mZmxpbmUgZXZlbnRzLlxuICAgKlxuICAgKiBPdXIgcmVzcG9uc2UgaXMgbm90IHRvIHRydXN0IHRoZW0sIGJ1dCB0byB1c2UgdGhlbSBhc1xuICAgKiBhIHRyaWdnZXIgdG8gaW5kaWNhdGUgd2Ugc2hvdWxkIGltbWVkaWF0ZWx5IGRvIG91ciBvd25cbiAgICogdmFsaWRhdGlvbi5cbiAgICpcbiAgICogQG1ldGhvZCBfaGFuZGxlT25saW5lRXZlbnRcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtICB7RXZlbnR9IGV2dCAtIEJyb3dzZXIgb25saW5lL29mZmxpbmUgZXZlbnQgb2JqZWN0XG4gICAqL1xuICBfaGFuZGxlT25saW5lRXZlbnQoZXZ0KSB7XG4gICAgLy8gUmVzZXQgdGhlIGNvdW50ZXIgYmVjYXVzZSBvdXIgZmlyc3QgcmVxdWVzdCBtYXkgZmFpbCBhcyB0aGV5IG1heSBub3QgYmVcbiAgICAvLyBmdWxseSBjb25uZWN0ZWQgeWV0XG4gICAgdGhpcy5vZmZsaW5lQ291bnRlciA9IDA7XG4gICAgdGhpcy5jaGVja09ubGluZVN0YXR1cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIE91ciBvbmxpbmUgc3RhdGUgaGFzIGV4cGlyZWQ7IHdlIGFyZSBub3cgb2ZmbGluZS5cbiAgICpcbiAgICogSWYgdGhpcyBtZXRob2QgZ2V0cyBjYWxsZWQsIGl0IG1lYW5zIHRoYXQgb3VyIGNvbm5lY3Rpb24gaGFzIGdvbmUgdG9vIGxvbmcgd2l0aG91dCBhbnkgZGF0YVxuICAgKiBhbmQgaXMgbm93IGNvbnNpZGVyZWQgdG8gYmUgZGlzY29ubmVjdGVkLiAgU3RhcnQgc2NoZWR1bGluZyB0ZXN0cyB0byBzZWUgd2hlbiB3ZSBhcmUgYmFjayBvbmxpbmUuXG4gICAqXG4gICAqIEBtZXRob2QgX29ubGluZUV4cGlyZWRcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9vbmxpbmVFeHBpcmVkKCkge1xuICAgIHRoaXMuX2NsZWFyQ2hlY2soKTtcbiAgICB0aGlzLl9jaGFuZ2VUb09mZmxpbmUoKTtcbiAgICB0aGlzLl9zY2hlZHVsZU5leHRPbmxpbmVDaGVjaygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhIG5vbmNlIHRvIHNlZSBpZiB3ZSBjYW4gcmVhY2ggdGhlIHNlcnZlci5cbiAgICpcbiAgICogV2UgZG9uJ3QgY2FyZSBhYm91dCB0aGUgcmVzdWx0LFxuICAgKiB3ZSBqdXN0IGNhcmUgYWJvdXQgdHJpZ2dlcmluZyBhICdjb25uZWN0aW9uOnN1Y2Nlc3MnIG9yICdjb25uZWN0aW9uOmVycm9yJyBldmVudFxuICAgKiB3aGljaCBjb25uZWN0aW9uTGlzdGVuZXIgd2lsbCByZXNwb25kIHRvLlxuICAgKlxuICAgKiAgICAgIGNsaWVudC5vbmxpbmVNYW5hZ2VyLmNoZWNrT25saW5lU3RhdHVzKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgKiAgICAgICAgICBhbGVydChyZXN1bHQgPyAnV2UncmUgb25saW5lIScgOiAnRG9oIScpO1xuICAgKiAgICAgIH0pO1xuICAgKlxuICAgKiBAbWV0aG9kIGNoZWNrT25saW5lU3RhdHVzXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gY2FsbGJhY2suaXNPbmxpbmUgLSBDYWxsYmFjayBpcyBjYWxsZWQgd2l0aCB0cnVlIGlmIG9ubGluZSwgZmFsc2UgaWYgbm90XG4gICAqL1xuICBjaGVja09ubGluZVN0YXR1cyhjYWxsYmFjaykge1xuICAgIHRoaXMuX2NsZWFyQ2hlY2soKTtcblxuICAgIGxvZ2dlci5pbmZvKCdPbmxpbmVTdGF0ZU1hbmFnZXI6IEZpcmluZyBYSFIgZm9yIG9ubGluZSBjaGVjaycpO1xuICAgIHRoaXMuX2xhc3RDaGVja09ubGluZVN0YXR1cyA9IG5ldyBEYXRlKCk7XG4gICAgLy8gUGluZyB0aGUgc2VydmVyIGFuZCBzZWUgaWYgd2UncmUgY29ubmVjdGVkLlxuICAgIHhocih7XG4gICAgICB1cmw6IHRoaXMudGVzdFVybCxcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICBhY2NlcHQ6ICdhcHBsaWNhdGlvbi92bmQubGF5ZXIranNvbjsgdmVyc2lvbj0xLjAnLFxuICAgICAgfSxcbiAgICB9LCAoKSA9PiB7XG4gICAgICAvLyB0aGlzLmlzT25saW5lIHdpbGwgYmUgdXBkYXRlZCB2aWEgX2Nvbm5lY3Rpb25MaXN0ZW5lciBwcmlvciB0byB0aGlzIGxpbmUgZXhlY3V0aW5nXG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKHRoaXMuaXNPbmxpbmUpO1xuICAgIH0pO1xuICB9XG5cblxuICAvKipcbiAgICogT24gZGV0ZXJtaW5pbmcgdGhhdCB3ZSBhcmUgb2ZmbGluZSwgaGFuZGxlcyB0aGUgc3RhdGUgdHJhbnNpdGlvbiBhbmQgbG9nZ2luZy5cbiAgICpcbiAgICogQG1ldGhvZCBfY2hhbmdlVG9PZmZsaW5lXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfY2hhbmdlVG9PZmZsaW5lKCkge1xuICAgIGlmICh0aGlzLmlzT25saW5lKSB7XG4gICAgICB0aGlzLmlzT25saW5lID0gZmFsc2U7XG4gICAgICB0aGlzLnRyaWdnZXIoJ2Rpc2Nvbm5lY3RlZCcpO1xuICAgICAgbG9nZ2VyLmluZm8oJ09ubGluZVN0YXRlTWFuYWdlcjogQ29ubmVjdGlvbiBsb3N0Jyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuZXZlciBhIHdlYnNvY2tldCBldmVudCBhcnJpdmVzLCBvciBhbiB4aHIgY2FsbCBjb21wbGV0ZXM7IHVwZGF0ZXMgb3VyIGlzT25saW5lIHN0YXRlLlxuICAgKlxuICAgKiBBbnkgY2FsbCB0byB0aGlzIG1ldGhvZCB3aWxsIHJlc2NoZWR1bGUgb3VyIG5leHQgaXMtb25saW5lIHRlc3RcbiAgICpcbiAgICogQG1ldGhvZCBfY29ubmVjdGlvbkxpc3RlbmVyXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge3N0cmluZ30gZXZ0IC0gTmFtZSBvZiB0aGUgZXZlbnQ7IGVpdGhlciAnY29ubmVjdGlvbjpzdWNjZXNzJyBvciAnY29ubmVjdGlvbjplcnJvcidcbiAgICovXG4gIF9jb25uZWN0aW9uTGlzdGVuZXIoZXZ0KSB7XG4gICAgLy8gSWYgZXZlbnQgaXMgYSBzdWNjZXNzLCBjaGFuZ2UgdXMgdG8gb25saW5lXG4gICAgaWYgKGV2dC5zdGF0dXMgPT09ICdjb25uZWN0aW9uOnN1Y2Nlc3MnKSB7XG4gICAgICBjb25zdCBsYXN0VGltZSA9IHRoaXMubGFzdE1lc3NhZ2VUaW1lO1xuICAgICAgdGhpcy5sYXN0TWVzc2FnZVRpbWUgPSBuZXcgRGF0ZSgpO1xuICAgICAgaWYgKCF0aGlzLmlzT25saW5lKSB7XG4gICAgICAgIHRoaXMuaXNPbmxpbmUgPSB0cnVlO1xuICAgICAgICB0aGlzLm9mZmxpbmVDb3VudGVyID0gMDtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjb25uZWN0ZWQnLCB7IG9mZmxpbmVEdXJhdGlvbjogbGFzdFRpbWUgPyBEYXRlLm5vdygpIC0gbGFzdFRpbWUgOiAwIH0pO1xuICAgICAgICBpZiAodGhpcy5jb25uZWN0ZWRDb3VudGVyID09PSB1bmRlZmluZWQpIHRoaXMuY29ubmVjdGVkQ291bnRlciA9IDA7XG4gICAgICAgIHRoaXMuY29ubmVjdGVkQ291bnRlcisrO1xuICAgICAgICBsb2dnZXIuaW5mbygnT25saW5lU3RhdGVNYW5hZ2VyOiBDb25uZWN0ZWQgcmVzdG9yZWQnKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZiBldmVudCBpcyBOT1Qgc3VjY2VzcywgY2hhbmdlIHVzIHRvIG9mZmxpbmUuXG4gICAgZWxzZSB7XG4gICAgICB0aGlzLl9jaGFuZ2VUb09mZmxpbmUoKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zY2hlZHVsZU5leHRPbmxpbmVDaGVjaygpO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFudXAvc2h1dGRvd25cbiAgICpcbiAgICogQG1ldGhvZCBkZXN0cm95XG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuX2NsZWFyQ2hlY2soKTtcbiAgICB0aGlzLnNvY2tldE1hbmFnZXIgPSBudWxsO1xuICAgIHN1cGVyLmRlc3Ryb3koKTtcbiAgfVxufVxuXG5PbmxpbmVTdGF0ZU1hbmFnZXIucHJvdG90eXBlLmlzQ2xpZW50UmVhZHkgPSBmYWxzZTtcblxuLyoqXG4gKiBVUkwgVG8gZmlyZSB3aGVuIHRlc3RpbmcgdG8gc2VlIGlmIHdlIGFyZSBvbmxpbmUuXG4gKiBAdHlwZSB7U3RyaW5nfVxuICovXG5PbmxpbmVTdGF0ZU1hbmFnZXIucHJvdG90eXBlLnRlc3RVcmwgPSAnJztcblxuLyoqXG4gKiBBIFdlYnNvY2tldCBtYW5hZ2VyIHdob3NlICdtZXNzYWdlJyBldmVudCB3ZSB3aWxsIGxpc3RlbiB0b1xuICogaW4gb3JkZXIgdG8ga25vdyB0aGF0IHdlIGFyZSBzdGlsbCBvbmxpbmUuXG4gKiBAdHlwZSB7bGF5ZXIuV2Vic29ja2V0cy5Tb2NrZXRNYW5hZ2VyfVxuICovXG5PbmxpbmVTdGF0ZU1hbmFnZXIucHJvdG90eXBlLnNvY2tldE1hbmFnZXIgPSBudWxsO1xuXG4vKipcbiAqIE51bWJlciBvZiB0ZXN0VXJsIHJlcXVlc3RzIHdlJ3ZlIGJlZW4gb2ZmbGluZSBmb3IuXG4gKlxuICogV2lsbCBzdG9wIGdyb3dpbmcgb25jZSB0aGUgbnVtYmVyIGlzIHN1aXRhYmx5IGxhcmdlICgxMC0yMCkuXG4gKiBAdHlwZSB7TnVtYmVyfVxuICovXG5PbmxpbmVTdGF0ZU1hbmFnZXIucHJvdG90eXBlLm9mZmxpbmVDb3VudGVyID0gMDtcblxuLyoqXG4gKiBNYXhpbXVtIHdhaXQgZHVyaW5nIGV4cG9uZW50aWFsIGJhY2tvZmYgd2hpbGUgb2ZmbGluZS5cbiAqXG4gKiBXaGlsZSBvZmZsaW5lLCBleHBvbmVudGlhbCBiYWNrb2ZmIGlzIHVzZWQgdG8gY2FsY3VsYXRlIGhvdyBsb25nIHRvIHdhaXQgYmV0d2VlbiBjaGVja2luZyB3aXRoIHRoZSBzZXJ2ZXJcbiAqIHRvIHNlZSBpZiB3ZSBhcmUgb25saW5lIGFnYWluLiBUaGlzIHZhbHVlIGRldGVybWluZXMgdGhlIG1heGltdW0gd2FpdDsgYW55IGhpZ2hlciB2YWx1ZSByZXR1cm5lZCBieSBleHBvbmVudGlhbCBiYWNrb2ZmXG4gKiBhcmUgaWdub3JlZCBhbmQgdGhpcyB2YWx1ZSB1c2VkIGluc3RlYWQuXG4gKiBWYWx1ZSBpcyBtZWFzdXJlZCBpbiBzZWNvbmRzLlxuICogQHR5cGUge051bWJlcn1cbiAqL1xuT25saW5lU3RhdGVNYW5hZ2VyLnByb3RvdHlwZS5tYXhPZmZsaW5lV2FpdCA9IDUgKiA2MDtcblxuLyoqXG4gKiBNaW5pbXVtIHdhaXQgYmV0d2VlbiB0cmllcyBpbiBtcy5cbiAqIEB0eXBlIHtOdW1iZXJ9XG4gKi9cbk9ubGluZVN0YXRlTWFuYWdlci5wcm90b3R5cGUubWluQmFja29mZldhaXQgPSAxMDA7XG5cbi8qKlxuICogVGltZSB0aGF0IHRoZSBsYXN0IHN1Y2Nlc3NmdWwgbWVzc2FnZSB3YXMgb2JzZXJ2ZWQuXG4gKiBAdHlwZSB7RGF0ZX1cbiAqL1xuT25saW5lU3RhdGVNYW5hZ2VyLnByb3RvdHlwZS5sYXN0TWVzc2FnZVRpbWUgPSBudWxsO1xuXG4vKipcbiAqIEZvciBkZWJ1Z2dpbmcsIHRyYWNrcyB0aGUgbGFzdCB0aW1lIHdlIGNoZWNrZWQgaWYgd2UgYXJlIG9ubGluZS5cbiAqIEB0eXBlIHtEYXRlfVxuICovXG5PbmxpbmVTdGF0ZU1hbmFnZXIucHJvdG90eXBlLl9sYXN0Q2hlY2tPbmxpbmVTdGF0dXMgPSBudWxsO1xuXG4vKipcbiAqIEFyZSB3ZSBjdXJyZW50bHkgb25saW5lP1xuICogQHR5cGUge0Jvb2xlYW59XG4gKi9cbk9ubGluZVN0YXRlTWFuYWdlci5wcm90b3R5cGUuaXNPbmxpbmUgPSBmYWxzZTtcblxuLyoqXG4gKiBzZXRUaW1lb3V0SWQgZm9yIHRoZSBuZXh0IGNoZWNrT25saW5lU3RhdHVzKCkgY2FsbC5cbiAqIEB0eXBlIHtOdW1iZXJ9XG4gKi9cbk9ubGluZVN0YXRlTWFuYWdlci5wcm90b3R5cGUub25saW5lQ2hlY2tJZCA9IDA7XG5cbi8qKlxuICogVHJ1ZSB1bnRpbCB0aGUgZmlyc3QgdGltZSBzdGFydCgpIGlzIGNhbGxlZC5cbiAqIEB0eXBlIHtib29sZWFufVxuICovXG5PbmxpbmVTdGF0ZU1hbmFnZXIucHJvdG90eXBlLl9maXJzdFN0YXJ0ID0gdHJ1ZTtcblxuLyoqXG4gKiBJZiB3ZSBhcmUgb25saW5lLCBob3cgb2Z0ZW4gZG8gd2UgbmVlZCB0byBwaW5nIHRvIHZlcmlmeSB3ZSBhcmUgc3RpbGwgb25saW5lLlxuICpcbiAqIFZhbHVlIGlzIHJlc2V0IGFueSB0aW1lIHdlIG9ic2VydmUgYW55IG1lc3NhZ2VzIGZyb20gdGhlIHNlcnZlci5cbiAqIE1lYXN1cmVkIGluIG1pbGlzZWNvbmRzLiBOT1RFOiBXZWJzb2NrZXQgaGFzIGEgc2VwYXJhdGUgcGluZyB3aGljaCBtb3N0bHkgbWFrZXNcbiAqIHRoaXMgb25lIHVubmVjZXNzYXJ5LiAgTWF5IGVuZCB1cCByZW1vdmluZyB0aGlzIG9uZS4uLiB0aG91Z2ggd2UnZCBrZWVwIHRoZVxuICogcGluZyBmb3Igd2hlbiBvdXIgc3RhdGUgaXMgb2ZmbGluZS5cbiAqIEB0eXBlIHtOdW1iZXJ9XG4gKi9cbk9ubGluZVN0YXRlTWFuYWdlci5wcm90b3R5cGUucGluZ0ZyZXF1ZW5jeSA9IDEwMCAqIDEwMDA7XG5cbk9ubGluZVN0YXRlTWFuYWdlci5fc3VwcG9ydGVkRXZlbnRzID0gW1xuICAvKipcbiAgICogV2UgYXBwZWFyIHRvIGJlIG9ubGluZSBhbmQgYWJsZSB0byBzZW5kIGFuZCByZWNlaXZlXG4gICAqIEBldmVudCBjb25uZWN0ZWRcbiAgICogQHBhcmFtIHtudW1iZXJ9IG9ubGluZUR1cmF0aW9uIC0gTnVtYmVyIG9mIG1pbGlzZWNvbmRzIHNpbmNlIHdlIHdlcmUgbGFzdCBrbm93biB0byBiZSBvbmxpbmVcbiAgICovXG4gICdjb25uZWN0ZWQnLFxuXG4gIC8qKlxuICAgKiBXZSBhcHBlYXIgdG8gYmUgb2ZmbGluZSBhbmQgdW5hYmxlIHRvIHNlbmQgb3IgcmVjZWl2ZVxuICAgKiBAZXZlbnQgZGlzY29ubmVjdGVkXG4gICAqL1xuICAnZGlzY29ubmVjdGVkJyxcbl0uY29uY2F0KFJvb3QuX3N1cHBvcnRlZEV2ZW50cyk7XG5Sb290LmluaXRDbGFzcy5hcHBseShPbmxpbmVTdGF0ZU1hbmFnZXIsIFtPbmxpbmVTdGF0ZU1hbmFnZXIsICdPbmxpbmVTdGF0ZU1hbmFnZXInXSk7XG5tb2R1bGUuZXhwb3J0cyA9IE9ubGluZVN0YXRlTWFuYWdlcjtcbiJdfQ==
