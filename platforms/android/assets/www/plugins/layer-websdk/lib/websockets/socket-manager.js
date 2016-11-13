'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * This component manages
 *
 * 1. recieving websocket events
 * 2. Processing them
 * 3. Triggering events on completing them
 * 4. Sending them
 *
 * Applications typically do not interact with this component, but may subscribe
 * to the `message` event if they want richer event information than is available
 * through the layer.Client class.
 *
 * @class  layer.Websockets.SocketManager
 * @extends layer.Root
 * @private
 */
var Root = require('../root');
var Utils = require('../client-utils');
var logger = require('../logger');

var SocketManager = function (_Root) {
  _inherits(SocketManager, _Root);

  /**
   * Create a new websocket manager
   *
   *      var socketManager = new layer.Websockets.SocketManager({
   *          client: client,
   *      });
   *
   * @method
   * @param  {Object} options
   * @param {layer.Client} client
   * @return {layer.Websockets.SocketManager}
   */

  function SocketManager(options) {
    _classCallCheck(this, SocketManager);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(SocketManager).call(this, options));

    if (!_this.client) throw new Error('SocketManager requires a client');

    // Insure that on/off methods don't need to call bind, therefore making it easy
    // to add/remove functions as event listeners.
    _this._onMessage = _this._onMessage.bind(_this);
    _this._onOpen = _this._onOpen.bind(_this);
    _this._onSocketClose = _this._onSocketClose.bind(_this);
    _this._onError = _this._onError.bind(_this);

    // If the client is authenticated, start it up.
    if (_this.client.isAuthenticated && _this.client.onlineManager.isOnline) {
      _this.connect();
    }

    _this.client.on('online', _this._onlineStateChange, _this);

    // Any time the Client triggers a ready event we need to reconnect.
    _this.client.on('authenticated', _this.connect, _this);

    _this._lastTimestamp = Date.now();
    return _this;
  }

  /**
   * Call this when we want to reset all websocket state; this would be done after a lengthy period
   * of being disconnected.  This prevents Event.replay from being called on reconnecting.
   *
   * @method _reset
   * @private
   */


  _createClass(SocketManager, [{
    key: '_reset',
    value: function _reset() {
      this._lastTimestamp = 0;
      this._lastDataFromServerTimestamp = 0;
      this._lastCounter = null;
      this._hasCounter = false;

      this._inReplay = false;
      this._needsReplayFrom = null;
    }

    /**
     * Event handler is triggered any time the client's online state changes.
     * If going online we need to reconnect (i.e. will close any existing websocket connections and then open a new connection)
     * If going offline, close the websocket as its no longer useful/relevant.
     * @method _onlineStateChange
     * @private
     * @param {layer.LayerEvent} evt
     */

  }, {
    key: '_onlineStateChange',
    value: function _onlineStateChange(evt) {
      if (!this.client.isAuthenticated) return;
      if (evt.isOnline) {
        this._reconnect(evt.reset);
      } else {
        this.close();
      }
    }

    /**
     * Reconnect to the server, optionally resetting all data if needed.
     * @method _reconnect
     * @private
     * @param {boolean} reset
     */

  }, {
    key: '_reconnect',
    value: function _reconnect(reset) {
      // The sync manager will reissue any requests once it receives a 'connect' event from the websocket manager.
      // There is no need to have an error callback at this time.
      // Note that calls that come from sources other than the sync manager may suffer from this.
      // Once the websocket implements retry rather than the sync manager, we may need to enable it
      // to trigger a callback after sufficient time.  Just delete all callbacks.
      this.close();
      if (reset) this._reset();
      this.connect();
    }

    /**
     * Connect to the websocket server
     *
     * @method connect
     * @param  {layer.SyncEvent} evt - Ignored parameter
     */

  }, {
    key: 'connect',
    value: function connect(evt) {
      if (this.client.isDestroyed || !this.client.isOnline) return;

      this._closing = false;

      this._lastCounter = -1;

      // Load up our websocket component or shim
      /* istanbul ignore next */
      var WS = typeof WebSocket === 'undefined' ? require('websocket').w3cwebsocket : WebSocket;

      // Get the URL and connect to it
      var url = this.client.url.replace(/^http/, 'ws') + '/websocket?session_token=' + this.client.sessionToken;
      this._socket = new WS(url, 'layer-1.0');

      // If its the shim, set the event hanlers
      /* istanbul ignore if */
      if (typeof WebSocket === 'undefined') {
        this._socket.onmessage = this._onMessage;
        this._socket.onclose = this._onSocketClose;
        this._socket.onopen = this._onOpen;
        this._socket.onerror = this._onError;
      }

      // If its a real websocket, add the event handlers
      else {
          this._socket.addEventListener('message', this._onMessage);
          this._socket.addEventListener('close', this._onSocketClose);
          this._socket.addEventListener('open', this._onOpen);
          this._socket.addEventListener('error', this._onError);
        }

      // Trigger a failure if it takes >= 5 seconds to establish a connection
      this._connectionFailedId = setTimeout(this._connectionFailed.bind(this), 5000);
    }

    /**
     * Clears the scheduled call to _connectionFailed that is used to insure the websocket does not get stuck
     * in CONNECTING state. This call is used after the call has completed or failed.
     *
     * @method _clearConnectionFailed
     * @private
     */

  }, {
    key: '_clearConnectionFailed',
    value: function _clearConnectionFailed() {
      if (this._connectionFailedId) {
        clearTimeout(this._connectionFailedId);
        this._connectionFailedId = 0;
      }
    }

    /**
     * Called after 5 seconds of entering CONNECTING state without getting an error or a connection.
     * Calls _onError which will cause this attempt to be stopped and another connection attempt to be scheduled.
     *
     * @method _connectionFailed
     * @private
     */

  }, {
    key: '_connectionFailed',
    value: function _connectionFailed() {
      this._connectionFailedId = 0;
      var msg = 'Websocket failed to connect to server';
      logger.warn(msg);

      // TODO: At this time there is little information on what happens when closing a websocket connection that is stuck in
      // readyState=CONNECTING.  Does it throw an error?  Does it call the onClose or onError event handlers?
      // Remove all event handlers so that calling close won't trigger any calls.
      try {
        this.isOpen = false;
        this._removeSocketEvents();
        this._socket.close();
        this._socket = null;
      } catch (e) {}
      // No-op


      // Now we can call our error handler.
      this._onError(new Error(msg));
    }

    /**
     * The websocket connection is reporting that its now open.
     *
     * @method _onOpen
     * @private
     */

  }, {
    key: '_onOpen',
    value: function _onOpen() {
      this._clearConnectionFailed();
      if (this._isOpen()) {
        this._lostConnectionCount = 0;
        this.isOpen = true;
        this.trigger('connected');
        logger.debug('Websocket Connected');
        if (this._hasCounter) {
          this.replayEvents(this._lastTimestamp, true);
        } else {
          this._reschedulePing();
        }
      }
    }

    /**
     * Tests to see if the websocket connection is open.  Use the isOpen property
     * for external tests.
     * @method _isOpen
     * @private
     * @returns {Boolean}
     */

  }, {
    key: '_isOpen',
    value: function _isOpen() {
      if (!this._socket) return false;
      /* istanbul ignore if */
      if (typeof WebSocket === 'undefined') return true;
      return this._socket && this._socket.readyState === WebSocket.OPEN;
    }

    /**
     * If not isOpen, presumably failed to connect
     * Any other error can be ignored... if the connection has
     * failed, onClose will handle it.
     *
     * @method _onError
     * @private
     * @param  {Error} err - Websocket error
     */

  }, {
    key: '_onError',
    value: function _onError(err) {
      if (this._closing) return;
      this._clearConnectionFailed();
      logger.debug('Websocket Error causing websocket to close', err);
      if (!this.isOpen) {
        this._removeSocketEvents();
        this._lostConnectionCount++;
        this._scheduleReconnect();
      } else {
        this._onSocketClose();
        this._socket.close();
        this._socket = null;
      }
    }

    /**
     * Shortcut method for sending a signal
     *
     *    manager.sendSignal({
            'type': 'typing_indicator',
            'object': {
              'id': this.conversation.id
            },
            'data': {
              'action': state
            }
          });
     *
     * @method sendSignal
     * @param  {Object} body - Signal body
     */

  }, {
    key: 'sendSignal',
    value: function sendSignal(body) {
      this._socket.send(JSON.stringify({
        type: 'signal',
        body: body
      }));
    }

    /**
     * Shortcut to sending a Counter.read request
     *
     * @method getCounter
     * @param  {Function} callback
     * @param {boolean} callback.success
     * @param {number} callback.lastCounter
     * @param {number} callback.newCounter
     */

  }, {
    key: 'getCounter',
    value: function getCounter(callback) {
      logger.debug('Websocket request: getCounter');
      this.client.socketRequestManager.sendRequest({
        method: 'Counter.read'
      }, function (result) {
        logger.debug('Websocket response: getCounter ' + result.data.counter);
        if (callback) {
          if (result.success) {
            callback(true, result.data.counter, result.fullData.counter);
          } else {
            callback(false);
          }
        }
      });
    }

    /**
     * Replays all missed change packets since the specified timestamp
     *
     * @method replayEvents
     * @param  {string|number}   timestamp - Iso formatted date string; if number will be transformed into formatted date string.
     * @param  {boolean} [force=false] - if true, cancel any in progress replayEvents and start a new one
     * @param  {Function} [callback] - Optional callback for completion
     */

  }, {
    key: 'replayEvents',
    value: function replayEvents(timestamp, force, callback) {
      var _this2 = this;

      if (!timestamp) return;
      if (force) this._inReplay = false;
      if (typeof timestamp === 'number') timestamp = new Date(timestamp).toISOString();

      // If we are already waiting for a replay to complete, record the timestamp from which we
      // need to replay on our next replay request
      // If we are simply unable to replay because we're disconnected, capture the _needsReplayFrom
      if (this._inReplay || !this._isOpen()) {
        if (!this._needsReplayFrom) {
          logger.debug('Websocket request: replayEvents updating _needsReplayFrom');
          this._needsReplayFrom = timestamp;
        }
      } else {
        this._inReplay = true;
        logger.info('Websocket request: replayEvents');
        this.client.socketRequestManager.sendRequest({
          method: 'Event.replay',
          data: {
            from_timestamp: timestamp
          }
        }, function (result) {
          return _this2._replayEventsComplete(timestamp, callback, result.success);
        });
      }
    }

    /**
     * Callback for handling completion of replay.
     *
     * @method _replayEventsComplete
     * @private
     * @param  {Date}     timestamp
     * @param  {Function} callback
     * @param  {Boolean}   success
     */

  }, {
    key: '_replayEventsComplete',
    value: function _replayEventsComplete(timestamp, callback, success) {
      this._inReplay = false;

      // If replay was completed, and no other requests for replay, then trigger synced;
      // we're done.
      if (success && !this._needsReplayFrom) {
        logger.info('Websocket replay complete');
        this.trigger('synced');
        if (callback) callback();
      }

      // If replayEvents was called during a replay, then replay
      // from the given timestamp.  If request failed, then we need to retry from _lastTimestamp
      else if (success && this._needsReplayFrom) {
          logger.info('Websocket replay partially complete');
          var t = this._needsReplayFrom;
          this._needsReplayFrom = null;
          this.replayEvents(t);
        }

        // We never got a done event.  We also didn't miss any counters, so the last
        // message we received was valid; so lets just use that as our timestamp and
        // try again until we DO get a Event.Replay completion packet
        else {
            logger.info('Websocket replay retry');
            this.replayEvents(timestamp);
          }
    }

    /**
     * Handles a new websocket packet from the server
     *
     * @method _onMessage
     * @private
     * @param  {Object} evt - Message from the server
     */

  }, {
    key: '_onMessage',
    value: function _onMessage(evt) {
      this._lostConnectionCount = 0;
      try {
        var msg = JSON.parse(evt.data);
        var skippedCounter = this._lastCounter + 1 !== msg.counter;
        this._hasCounter = true;
        this._lastCounter = msg.counter;
        this._lastDataFromServerTimestamp = Date.now();

        // If we've missed a counter, replay to get; note that we had to update _lastCounter
        // for replayEvents to work correctly.
        if (skippedCounter) {
          this.replayEvents(this._lastTimestamp);
        } else {
          this._lastTimestamp = new Date(msg.timestamp).getTime();
        }

        this.trigger('message', {
          data: msg
        });

        this._reschedulePing();
      } catch (err) {
        logger.error('Layer-Websocket: Failed to handle websocket message: ' + err + '\n', evt.data);
      }
    }

    /**
     * Reschedule a ping request which helps us verify that the connection is still alive,
     * and that we haven't missed any events.
     *
     * @method _reschedulePing
     * @private
     */

  }, {
    key: '_reschedulePing',
    value: function _reschedulePing() {
      if (this._nextPingId) {
        clearTimeout(this._nextPingId);
      }
      this._nextPingId = setTimeout(this._ping.bind(this), this.pingFrequency);
    }

    /**
     * Send a counter request to the server to verify that we are still connected and
     * have not missed any events.
     *
     * @method _ping
     * @private
     */

  }, {
    key: '_ping',
    value: function _ping() {
      logger.debug('Websocket ping');
      this._nextPingId = 0;
      if (this._isOpen()) {
        // NOTE: onMessage will already have called reschedulePing, but if there was no response, then the error handler would NOT have called it.
        this.getCounter(this._reschedulePing.bind(this));
      }
    }

    /**
     * Close the websocket.
     *
     * @method close
     */

  }, {
    key: 'close',
    value: function close() {
      logger.debug('Websocket close requested');
      this._closing = true;
      this.isOpen = false;
      if (this._socket) {
        // Close all event handlers and set socket to null
        // without waiting for browser event to call
        // _onSocketClose as the next command after close
        // might require creating a new socket
        this._onSocketClose();
        this._socket.close();
        this._socket = null;
      }
    }

    /**
     * Send a packet across the websocket
     * @method send
     * @param {Object} obj
     */

  }, {
    key: 'send',
    value: function send(obj) {
      this._socket.send(JSON.stringify(obj));
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this.close();
      if (this._nextPingId) clearTimeout(this._nextPingId);
      _get(Object.getPrototypeOf(SocketManager.prototype), 'destroy', this).call(this);
    }

    /**
     * If the socket has closed (or if the close method forces it closed)
     * Remove all event handlers and if appropriate, schedule a retry.
     *
     * @method _onSocketClose
     * @private
     */

  }, {
    key: '_onSocketClose',
    value: function _onSocketClose() {
      logger.debug('Websocket closed');
      this.isOpen = false;
      if (!this._closing) {
        this._scheduleReconnect();
      }

      this._removeSocketEvents();
      this.trigger('disconnected');
    }

    /**
     * Removes all event handlers on the current socket.
     *
     * @method _removeSocketEvents
     * @private
     */

  }, {
    key: '_removeSocketEvents',
    value: function _removeSocketEvents() {
      /* istanbul ignore if */
      if (typeof WebSocket !== 'undefined' && this._socket) {
        this._socket.removeEventListener('message', this._onMessage);
        this._socket.removeEventListener('close', this._onSocketClose);
        this._socket.removeEventListener('open', this._onOpen);
        this._socket.removeEventListener('error', this._onError);
      } else if (this._socket) {
        this._socket.onmessage = null;
        this._socket.onclose = null;
        this._socket.onopen = null;
        this._socket.onerror = null;
      }
    }

    /**
     * Schedule an attempt to reconnect to the server.  If the onlineManager
     * declares us to be offline, don't bother reconnecting.  A reconnect
     * attempt will be triggered as soon as the online manager reports we are online again.
     *
     * Note that the duration of our delay can not excede the onlineManager's ping frequency
     * or it will declare us to be offline while we attempt a reconnect.
     *
     * @method _scheduleReconnect
     * @private
     */

  }, {
    key: '_scheduleReconnect',
    value: function _scheduleReconnect() {
      if (this.isDestroyed || !this.client.isOnline) return;

      var maxDelay = (this.client.onlineManager.pingFrequency - 1000) / 1000;
      var delay = Utils.getExponentialBackoffSeconds(maxDelay, Math.min(15, this._lostConnectionCount));
      logger.debug('Websocket Reconnect in ' + delay + ' seconds');
      this._reconnectId = setTimeout(this._validateSessionBeforeReconnect.bind(this), delay * 1000);
    }

    /**
     * Before the scheduled reconnect can call `connect()` validate that we didn't lose the websocket
     * due to loss of authentication.
     *
     * @method _validateSessionBeforeReconnect
     * @private
     */

  }, {
    key: '_validateSessionBeforeReconnect',
    value: function _validateSessionBeforeReconnect() {
      var _this3 = this;

      if (this.isDestroyed || !this.client.isOnline) return;

      this.client.xhr({
        url: '/',
        method: 'GET',
        sync: false
      }, function (result) {
        if (result.success) _this3.connect();
        // if not successful, the this.client.xhr will handle reauthentication
      });
    }
  }]);

  return SocketManager;
}(Root);

/**
 * Is the websocket connection currently open?
 * @type {Boolean}
 */


SocketManager.prototype.isOpen = false;

/**
 * setTimeout ID for calling connect()
 * @private
 * @type {Number}
 */
SocketManager.prototype._reconnectId = 0;

/**
 * setTimeout ID for calling _connectionFailed()
 * @private
 * @type {Number}
 */
SocketManager.prototype._connectionFailedId = 0;

SocketManager.prototype._lastTimestamp = 0;
SocketManager.prototype._lastDataFromServerTimestamp = 0;
SocketManager.prototype._lastCounter = null;
SocketManager.prototype._hasCounter = false;

SocketManager.prototype._inReplay = false;
SocketManager.prototype._needsReplayFrom = null;

/**
 * Frequency with which the websocket checks to see if any websocket notifications
 * have been missed.
 * @type {Number}
 */
SocketManager.prototype.pingFrequency = 30000;

/**
 * The Client that owns this.
 * @type {layer.Client}
 */
SocketManager.prototype.client = null;

/**
 * The Socket Connection instance
 * @type {Websocket}
 */
SocketManager.prototype._socket = null;

/**
 * Is the websocket connection being closed by a call to close()?
 * If so, we can ignore any errors that signal the socket as closing.
 * @type {Boolean}
 */
SocketManager.prototype._closing = false;

/**
 * Number of failed attempts to reconnect.
 * @type {Number}
 */
SocketManager.prototype._lostConnectionCount = 0;

SocketManager._supportedEvents = [
/**
 * A data packet has been received from the server.
 * @event message
 * @param {layer.LayerEvent} layerEvent
 * @param {Object} layerEvent.data - The data that was received from the server
 */
'message',

/**
 * The websocket is now connected.
 * @event connected
 * @protected
 */
'connected',

/**
 * The websocket is no longer connected
 * @event disconnected
 * @protected
 */
'disconnected',

/**
 * Websocket events were missed; we are resyncing with the server
 * @event replay-begun
 */
'syncing',

/**
 * Websocket events were missed; we resynced with the server and are now done
 * @event replay-begun
 */
'synced'].concat(Root._supportedEvents);
Root.initClass.apply(SocketManager, [SocketManager, 'SocketManager']);
module.exports = SocketManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy93ZWJzb2NrZXRzL3NvY2tldC1tYW5hZ2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFnQkEsSUFBTSxPQUFPLFFBQVEsU0FBUixDQUFQO0FBQ04sSUFBTSxRQUFRLFFBQVEsaUJBQVIsQ0FBUjtBQUNOLElBQU0sU0FBUyxRQUFRLFdBQVIsQ0FBVDs7SUFFQTs7Ozs7Ozs7Ozs7Ozs7OztBQWFKLFdBYkksYUFhSixDQUFZLE9BQVosRUFBcUI7MEJBYmpCLGVBYWlCOzt1RUFiakIsMEJBY0ksVUFEYTs7QUFFbkIsUUFBSSxDQUFDLE1BQUssTUFBTCxFQUFhLE1BQU0sSUFBSSxLQUFKLENBQVUsaUNBQVYsQ0FBTixDQUFsQjs7OztBQUZtQixTQU1uQixDQUFLLFVBQUwsR0FBa0IsTUFBSyxVQUFMLENBQWdCLElBQWhCLE9BQWxCLENBTm1CO0FBT25CLFVBQUssT0FBTCxHQUFlLE1BQUssT0FBTCxDQUFhLElBQWIsT0FBZixDQVBtQjtBQVFuQixVQUFLLGNBQUwsR0FBc0IsTUFBSyxjQUFMLENBQW9CLElBQXBCLE9BQXRCLENBUm1CO0FBU25CLFVBQUssUUFBTCxHQUFnQixNQUFLLFFBQUwsQ0FBYyxJQUFkLE9BQWhCOzs7QUFUbUIsUUFZZixNQUFLLE1BQUwsQ0FBWSxlQUFaLElBQStCLE1BQUssTUFBTCxDQUFZLGFBQVosQ0FBMEIsUUFBMUIsRUFBb0M7QUFDckUsWUFBSyxPQUFMLEdBRHFFO0tBQXZFOztBQUlBLFVBQUssTUFBTCxDQUFZLEVBQVosQ0FBZSxRQUFmLEVBQXlCLE1BQUssa0JBQUwsT0FBekI7OztBQWhCbUIsU0FtQm5CLENBQUssTUFBTCxDQUFZLEVBQVosQ0FBZSxlQUFmLEVBQWdDLE1BQUssT0FBTCxPQUFoQyxFQW5CbUI7O0FBcUJuQixVQUFLLGNBQUwsR0FBc0IsS0FBSyxHQUFMLEVBQXRCLENBckJtQjs7R0FBckI7Ozs7Ozs7Ozs7O2VBYkk7OzZCQTRDSztB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c0NvbnRlbnQiOlsiLyoqXG4gKiBUaGlzIGNvbXBvbmVudCBtYW5hZ2VzXG4gKlxuICogMS4gcmVjaWV2aW5nIHdlYnNvY2tldCBldmVudHNcbiAqIDIuIFByb2Nlc3NpbmcgdGhlbVxuICogMy4gVHJpZ2dlcmluZyBldmVudHMgb24gY29tcGxldGluZyB0aGVtXG4gKiA0LiBTZW5kaW5nIHRoZW1cbiAqXG4gKiBBcHBsaWNhdGlvbnMgdHlwaWNhbGx5IGRvIG5vdCBpbnRlcmFjdCB3aXRoIHRoaXMgY29tcG9uZW50LCBidXQgbWF5IHN1YnNjcmliZVxuICogdG8gdGhlIGBtZXNzYWdlYCBldmVudCBpZiB0aGV5IHdhbnQgcmljaGVyIGV2ZW50IGluZm9ybWF0aW9uIHRoYW4gaXMgYXZhaWxhYmxlXG4gKiB0aHJvdWdoIHRoZSBsYXllci5DbGllbnQgY2xhc3MuXG4gKlxuICogQGNsYXNzICBsYXllci5XZWJzb2NrZXRzLlNvY2tldE1hbmFnZXJcbiAqIEBleHRlbmRzIGxheWVyLlJvb3RcbiAqIEBwcml2YXRlXG4gKi9cbmNvbnN0IFJvb3QgPSByZXF1aXJlKCcuLi9yb290Jyk7XG5jb25zdCBVdGlscyA9IHJlcXVpcmUoJy4uL2NsaWVudC11dGlscycpO1xuY29uc3QgbG9nZ2VyID0gcmVxdWlyZSgnLi4vbG9nZ2VyJyk7XG5cbmNsYXNzIFNvY2tldE1hbmFnZXIgZXh0ZW5kcyBSb290IHtcbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyB3ZWJzb2NrZXQgbWFuYWdlclxuICAgKlxuICAgKiAgICAgIHZhciBzb2NrZXRNYW5hZ2VyID0gbmV3IGxheWVyLldlYnNvY2tldHMuU29ja2V0TWFuYWdlcih7XG4gICAqICAgICAgICAgIGNsaWVudDogY2xpZW50LFxuICAgKiAgICAgIH0pO1xuICAgKlxuICAgKiBAbWV0aG9kXG4gICAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9uc1xuICAgKiBAcGFyYW0ge2xheWVyLkNsaWVudH0gY2xpZW50XG4gICAqIEByZXR1cm4ge2xheWVyLldlYnNvY2tldHMuU29ja2V0TWFuYWdlcn1cbiAgICovXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKTtcbiAgICBpZiAoIXRoaXMuY2xpZW50KSB0aHJvdyBuZXcgRXJyb3IoJ1NvY2tldE1hbmFnZXIgcmVxdWlyZXMgYSBjbGllbnQnKTtcblxuICAgIC8vIEluc3VyZSB0aGF0IG9uL29mZiBtZXRob2RzIGRvbid0IG5lZWQgdG8gY2FsbCBiaW5kLCB0aGVyZWZvcmUgbWFraW5nIGl0IGVhc3lcbiAgICAvLyB0byBhZGQvcmVtb3ZlIGZ1bmN0aW9ucyBhcyBldmVudCBsaXN0ZW5lcnMuXG4gICAgdGhpcy5fb25NZXNzYWdlID0gdGhpcy5fb25NZXNzYWdlLmJpbmQodGhpcyk7XG4gICAgdGhpcy5fb25PcGVuID0gdGhpcy5fb25PcGVuLmJpbmQodGhpcyk7XG4gICAgdGhpcy5fb25Tb2NrZXRDbG9zZSA9IHRoaXMuX29uU29ja2V0Q2xvc2UuYmluZCh0aGlzKTtcbiAgICB0aGlzLl9vbkVycm9yID0gdGhpcy5fb25FcnJvci5iaW5kKHRoaXMpO1xuXG4gICAgLy8gSWYgdGhlIGNsaWVudCBpcyBhdXRoZW50aWNhdGVkLCBzdGFydCBpdCB1cC5cbiAgICBpZiAodGhpcy5jbGllbnQuaXNBdXRoZW50aWNhdGVkICYmIHRoaXMuY2xpZW50Lm9ubGluZU1hbmFnZXIuaXNPbmxpbmUpIHtcbiAgICAgIHRoaXMuY29ubmVjdCgpO1xuICAgIH1cblxuICAgIHRoaXMuY2xpZW50Lm9uKCdvbmxpbmUnLCB0aGlzLl9vbmxpbmVTdGF0ZUNoYW5nZSwgdGhpcyk7XG5cbiAgICAvLyBBbnkgdGltZSB0aGUgQ2xpZW50IHRyaWdnZXJzIGEgcmVhZHkgZXZlbnQgd2UgbmVlZCB0byByZWNvbm5lY3QuXG4gICAgdGhpcy5jbGllbnQub24oJ2F1dGhlbnRpY2F0ZWQnLCB0aGlzLmNvbm5lY3QsIHRoaXMpO1xuXG4gICAgdGhpcy5fbGFzdFRpbWVzdGFtcCA9IERhdGUubm93KCk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbCB0aGlzIHdoZW4gd2Ugd2FudCB0byByZXNldCBhbGwgd2Vic29ja2V0IHN0YXRlOyB0aGlzIHdvdWxkIGJlIGRvbmUgYWZ0ZXIgYSBsZW5ndGh5IHBlcmlvZFxuICAgKiBvZiBiZWluZyBkaXNjb25uZWN0ZWQuICBUaGlzIHByZXZlbnRzIEV2ZW50LnJlcGxheSBmcm9tIGJlaW5nIGNhbGxlZCBvbiByZWNvbm5lY3RpbmcuXG4gICAqXG4gICAqIEBtZXRob2QgX3Jlc2V0XG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcmVzZXQoKSB7XG4gICAgdGhpcy5fbGFzdFRpbWVzdGFtcCA9IDA7XG4gICAgdGhpcy5fbGFzdERhdGFGcm9tU2VydmVyVGltZXN0YW1wID0gMDtcbiAgICB0aGlzLl9sYXN0Q291bnRlciA9IG51bGw7XG4gICAgdGhpcy5faGFzQ291bnRlciA9IGZhbHNlO1xuXG4gICAgdGhpcy5faW5SZXBsYXkgPSBmYWxzZTtcbiAgICB0aGlzLl9uZWVkc1JlcGxheUZyb20gPSBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEV2ZW50IGhhbmRsZXIgaXMgdHJpZ2dlcmVkIGFueSB0aW1lIHRoZSBjbGllbnQncyBvbmxpbmUgc3RhdGUgY2hhbmdlcy5cbiAgICogSWYgZ29pbmcgb25saW5lIHdlIG5lZWQgdG8gcmVjb25uZWN0IChpLmUuIHdpbGwgY2xvc2UgYW55IGV4aXN0aW5nIHdlYnNvY2tldCBjb25uZWN0aW9ucyBhbmQgdGhlbiBvcGVuIGEgbmV3IGNvbm5lY3Rpb24pXG4gICAqIElmIGdvaW5nIG9mZmxpbmUsIGNsb3NlIHRoZSB3ZWJzb2NrZXQgYXMgaXRzIG5vIGxvbmdlciB1c2VmdWwvcmVsZXZhbnQuXG4gICAqIEBtZXRob2QgX29ubGluZVN0YXRlQ2hhbmdlXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7bGF5ZXIuTGF5ZXJFdmVudH0gZXZ0XG4gICAqL1xuICBfb25saW5lU3RhdGVDaGFuZ2UoZXZ0KSB7XG4gICAgaWYgKCF0aGlzLmNsaWVudC5pc0F1dGhlbnRpY2F0ZWQpIHJldHVybjtcbiAgICBpZiAoZXZ0LmlzT25saW5lKSB7XG4gICAgICB0aGlzLl9yZWNvbm5lY3QoZXZ0LnJlc2V0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZWNvbm5lY3QgdG8gdGhlIHNlcnZlciwgb3B0aW9uYWxseSByZXNldHRpbmcgYWxsIGRhdGEgaWYgbmVlZGVkLlxuICAgKiBAbWV0aG9kIF9yZWNvbm5lY3RcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtib29sZWFufSByZXNldFxuICAgKi9cbiAgX3JlY29ubmVjdChyZXNldCkge1xuICAgIC8vIFRoZSBzeW5jIG1hbmFnZXIgd2lsbCByZWlzc3VlIGFueSByZXF1ZXN0cyBvbmNlIGl0IHJlY2VpdmVzIGEgJ2Nvbm5lY3QnIGV2ZW50IGZyb20gdGhlIHdlYnNvY2tldCBtYW5hZ2VyLlxuICAgIC8vIFRoZXJlIGlzIG5vIG5lZWQgdG8gaGF2ZSBhbiBlcnJvciBjYWxsYmFjayBhdCB0aGlzIHRpbWUuXG4gICAgLy8gTm90ZSB0aGF0IGNhbGxzIHRoYXQgY29tZSBmcm9tIHNvdXJjZXMgb3RoZXIgdGhhbiB0aGUgc3luYyBtYW5hZ2VyIG1heSBzdWZmZXIgZnJvbSB0aGlzLlxuICAgIC8vIE9uY2UgdGhlIHdlYnNvY2tldCBpbXBsZW1lbnRzIHJldHJ5IHJhdGhlciB0aGFuIHRoZSBzeW5jIG1hbmFnZXIsIHdlIG1heSBuZWVkIHRvIGVuYWJsZSBpdFxuICAgIC8vIHRvIHRyaWdnZXIgYSBjYWxsYmFjayBhZnRlciBzdWZmaWNpZW50IHRpbWUuICBKdXN0IGRlbGV0ZSBhbGwgY2FsbGJhY2tzLlxuICAgIHRoaXMuY2xvc2UoKTtcbiAgICBpZiAocmVzZXQpIHRoaXMuX3Jlc2V0KCk7XG4gICAgdGhpcy5jb25uZWN0KCk7XG4gIH1cblxuICAvKipcbiAgICogQ29ubmVjdCB0byB0aGUgd2Vic29ja2V0IHNlcnZlclxuICAgKlxuICAgKiBAbWV0aG9kIGNvbm5lY3RcbiAgICogQHBhcmFtICB7bGF5ZXIuU3luY0V2ZW50fSBldnQgLSBJZ25vcmVkIHBhcmFtZXRlclxuICAgKi9cbiAgY29ubmVjdChldnQpIHtcbiAgICBpZiAodGhpcy5jbGllbnQuaXNEZXN0cm95ZWQgfHwgIXRoaXMuY2xpZW50LmlzT25saW5lKSByZXR1cm47XG5cbiAgICB0aGlzLl9jbG9zaW5nID0gZmFsc2U7XG5cbiAgICB0aGlzLl9sYXN0Q291bnRlciA9IC0xO1xuXG4gICAgLy8gTG9hZCB1cCBvdXIgd2Vic29ja2V0IGNvbXBvbmVudCBvciBzaGltXG4gICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgICBjb25zdCBXUyA9IHR5cGVvZiBXZWJTb2NrZXQgPT09ICd1bmRlZmluZWQnID8gcmVxdWlyZSgnd2Vic29ja2V0JykudzNjd2Vic29ja2V0IDogV2ViU29ja2V0O1xuXG4gICAgLy8gR2V0IHRoZSBVUkwgYW5kIGNvbm5lY3QgdG8gaXRcbiAgICBjb25zdCB1cmwgPSB0aGlzLmNsaWVudC51cmwucmVwbGFjZSgvXmh0dHAvLCAnd3MnKSArXG4gICAgICAnL3dlYnNvY2tldD9zZXNzaW9uX3Rva2VuPScgK1xuICAgICAgdGhpcy5jbGllbnQuc2Vzc2lvblRva2VuO1xuICAgIHRoaXMuX3NvY2tldCA9IG5ldyBXUyh1cmwsICdsYXllci0xLjAnKTtcblxuICAgIC8vIElmIGl0cyB0aGUgc2hpbSwgc2V0IHRoZSBldmVudCBoYW5sZXJzXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKHR5cGVvZiBXZWJTb2NrZXQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzLl9zb2NrZXQub25tZXNzYWdlID0gdGhpcy5fb25NZXNzYWdlO1xuICAgICAgdGhpcy5fc29ja2V0Lm9uY2xvc2UgPSB0aGlzLl9vblNvY2tldENsb3NlO1xuICAgICAgdGhpcy5fc29ja2V0Lm9ub3BlbiA9IHRoaXMuX29uT3BlbjtcbiAgICAgIHRoaXMuX3NvY2tldC5vbmVycm9yID0gdGhpcy5fb25FcnJvcjtcbiAgICB9XG5cbiAgICAvLyBJZiBpdHMgYSByZWFsIHdlYnNvY2tldCwgYWRkIHRoZSBldmVudCBoYW5kbGVyc1xuICAgIGVsc2Uge1xuICAgICAgdGhpcy5fc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCB0aGlzLl9vbk1lc3NhZ2UpO1xuICAgICAgdGhpcy5fc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgdGhpcy5fb25Tb2NrZXRDbG9zZSk7XG4gICAgICB0aGlzLl9zb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcignb3BlbicsIHRoaXMuX29uT3Blbik7XG4gICAgICB0aGlzLl9zb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCB0aGlzLl9vbkVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBUcmlnZ2VyIGEgZmFpbHVyZSBpZiBpdCB0YWtlcyA+PSA1IHNlY29uZHMgdG8gZXN0YWJsaXNoIGEgY29ubmVjdGlvblxuICAgIHRoaXMuX2Nvbm5lY3Rpb25GYWlsZWRJZCA9IHNldFRpbWVvdXQodGhpcy5fY29ubmVjdGlvbkZhaWxlZC5iaW5kKHRoaXMpLCA1MDAwKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhcnMgdGhlIHNjaGVkdWxlZCBjYWxsIHRvIF9jb25uZWN0aW9uRmFpbGVkIHRoYXQgaXMgdXNlZCB0byBpbnN1cmUgdGhlIHdlYnNvY2tldCBkb2VzIG5vdCBnZXQgc3R1Y2tcbiAgICogaW4gQ09OTkVDVElORyBzdGF0ZS4gVGhpcyBjYWxsIGlzIHVzZWQgYWZ0ZXIgdGhlIGNhbGwgaGFzIGNvbXBsZXRlZCBvciBmYWlsZWQuXG4gICAqXG4gICAqIEBtZXRob2QgX2NsZWFyQ29ubmVjdGlvbkZhaWxlZFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2NsZWFyQ29ubmVjdGlvbkZhaWxlZCgpIHtcbiAgICBpZiAodGhpcy5fY29ubmVjdGlvbkZhaWxlZElkKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5fY29ubmVjdGlvbkZhaWxlZElkKTtcbiAgICAgIHRoaXMuX2Nvbm5lY3Rpb25GYWlsZWRJZCA9IDA7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCBhZnRlciA1IHNlY29uZHMgb2YgZW50ZXJpbmcgQ09OTkVDVElORyBzdGF0ZSB3aXRob3V0IGdldHRpbmcgYW4gZXJyb3Igb3IgYSBjb25uZWN0aW9uLlxuICAgKiBDYWxscyBfb25FcnJvciB3aGljaCB3aWxsIGNhdXNlIHRoaXMgYXR0ZW1wdCB0byBiZSBzdG9wcGVkIGFuZCBhbm90aGVyIGNvbm5lY3Rpb24gYXR0ZW1wdCB0byBiZSBzY2hlZHVsZWQuXG4gICAqXG4gICAqIEBtZXRob2QgX2Nvbm5lY3Rpb25GYWlsZWRcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9jb25uZWN0aW9uRmFpbGVkKCkge1xuICAgIHRoaXMuX2Nvbm5lY3Rpb25GYWlsZWRJZCA9IDA7XG4gICAgY29uc3QgbXNnID0gJ1dlYnNvY2tldCBmYWlsZWQgdG8gY29ubmVjdCB0byBzZXJ2ZXInO1xuICAgIGxvZ2dlci53YXJuKG1zZyk7XG5cbiAgICAvLyBUT0RPOiBBdCB0aGlzIHRpbWUgdGhlcmUgaXMgbGl0dGxlIGluZm9ybWF0aW9uIG9uIHdoYXQgaGFwcGVucyB3aGVuIGNsb3NpbmcgYSB3ZWJzb2NrZXQgY29ubmVjdGlvbiB0aGF0IGlzIHN0dWNrIGluXG4gICAgLy8gcmVhZHlTdGF0ZT1DT05ORUNUSU5HLiAgRG9lcyBpdCB0aHJvdyBhbiBlcnJvcj8gIERvZXMgaXQgY2FsbCB0aGUgb25DbG9zZSBvciBvbkVycm9yIGV2ZW50IGhhbmRsZXJzP1xuICAgIC8vIFJlbW92ZSBhbGwgZXZlbnQgaGFuZGxlcnMgc28gdGhhdCBjYWxsaW5nIGNsb3NlIHdvbid0IHRyaWdnZXIgYW55IGNhbGxzLlxuICAgIHRyeSB7XG4gICAgICB0aGlzLmlzT3BlbiA9IGZhbHNlO1xuICAgICAgdGhpcy5fcmVtb3ZlU29ja2V0RXZlbnRzKCk7XG4gICAgICB0aGlzLl9zb2NrZXQuY2xvc2UoKTtcbiAgICAgIHRoaXMuX3NvY2tldCA9IG51bGw7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gTm8tb3BcbiAgICB9XG5cbiAgICAvLyBOb3cgd2UgY2FuIGNhbGwgb3VyIGVycm9yIGhhbmRsZXIuXG4gICAgdGhpcy5fb25FcnJvcihuZXcgRXJyb3IobXNnKSk7XG4gIH1cblxuICAvKipcbiAgICogVGhlIHdlYnNvY2tldCBjb25uZWN0aW9uIGlzIHJlcG9ydGluZyB0aGF0IGl0cyBub3cgb3Blbi5cbiAgICpcbiAgICogQG1ldGhvZCBfb25PcGVuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfb25PcGVuKCkge1xuICAgIHRoaXMuX2NsZWFyQ29ubmVjdGlvbkZhaWxlZCgpO1xuICAgIGlmICh0aGlzLl9pc09wZW4oKSkge1xuICAgICAgdGhpcy5fbG9zdENvbm5lY3Rpb25Db3VudCA9IDA7XG4gICAgICB0aGlzLmlzT3BlbiA9IHRydWU7XG4gICAgICB0aGlzLnRyaWdnZXIoJ2Nvbm5lY3RlZCcpO1xuICAgICAgbG9nZ2VyLmRlYnVnKCdXZWJzb2NrZXQgQ29ubmVjdGVkJyk7XG4gICAgICBpZiAodGhpcy5faGFzQ291bnRlcikge1xuICAgICAgICB0aGlzLnJlcGxheUV2ZW50cyh0aGlzLl9sYXN0VGltZXN0YW1wLCB0cnVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3Jlc2NoZWR1bGVQaW5nKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRlc3RzIHRvIHNlZSBpZiB0aGUgd2Vic29ja2V0IGNvbm5lY3Rpb24gaXMgb3Blbi4gIFVzZSB0aGUgaXNPcGVuIHByb3BlcnR5XG4gICAqIGZvciBleHRlcm5hbCB0ZXN0cy5cbiAgICogQG1ldGhvZCBfaXNPcGVuXG4gICAqIEBwcml2YXRlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgX2lzT3BlbigpIHtcbiAgICBpZiAoIXRoaXMuX3NvY2tldCkgcmV0dXJuIGZhbHNlO1xuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgIGlmICh0eXBlb2YgV2ViU29ja2V0ID09PSAndW5kZWZpbmVkJykgcmV0dXJuIHRydWU7XG4gICAgcmV0dXJuIHRoaXMuX3NvY2tldCAmJiB0aGlzLl9zb2NrZXQucmVhZHlTdGF0ZSA9PT0gV2ViU29ja2V0Lk9QRU47XG4gIH1cblxuICAvKipcbiAgICogSWYgbm90IGlzT3BlbiwgcHJlc3VtYWJseSBmYWlsZWQgdG8gY29ubmVjdFxuICAgKiBBbnkgb3RoZXIgZXJyb3IgY2FuIGJlIGlnbm9yZWQuLi4gaWYgdGhlIGNvbm5lY3Rpb24gaGFzXG4gICAqIGZhaWxlZCwgb25DbG9zZSB3aWxsIGhhbmRsZSBpdC5cbiAgICpcbiAgICogQG1ldGhvZCBfb25FcnJvclxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0gIHtFcnJvcn0gZXJyIC0gV2Vic29ja2V0IGVycm9yXG4gICAqL1xuICBfb25FcnJvcihlcnIpIHtcbiAgICBpZiAodGhpcy5fY2xvc2luZykgcmV0dXJuO1xuICAgIHRoaXMuX2NsZWFyQ29ubmVjdGlvbkZhaWxlZCgpO1xuICAgIGxvZ2dlci5kZWJ1ZygnV2Vic29ja2V0IEVycm9yIGNhdXNpbmcgd2Vic29ja2V0IHRvIGNsb3NlJywgZXJyKTtcbiAgICBpZiAoIXRoaXMuaXNPcGVuKSB7XG4gICAgICB0aGlzLl9yZW1vdmVTb2NrZXRFdmVudHMoKTtcbiAgICAgIHRoaXMuX2xvc3RDb25uZWN0aW9uQ291bnQrKztcbiAgICAgIHRoaXMuX3NjaGVkdWxlUmVjb25uZWN0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX29uU29ja2V0Q2xvc2UoKTtcbiAgICAgIHRoaXMuX3NvY2tldC5jbG9zZSgpO1xuICAgICAgdGhpcy5fc29ja2V0ID0gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2hvcnRjdXQgbWV0aG9kIGZvciBzZW5kaW5nIGEgc2lnbmFsXG4gICAqXG4gICAqICAgIG1hbmFnZXIuc2VuZFNpZ25hbCh7XG4gICAgICAgICAgJ3R5cGUnOiAndHlwaW5nX2luZGljYXRvcicsXG4gICAgICAgICAgJ29iamVjdCc6IHtcbiAgICAgICAgICAgICdpZCc6IHRoaXMuY29udmVyc2F0aW9uLmlkXG4gICAgICAgICAgfSxcbiAgICAgICAgICAnZGF0YSc6IHtcbiAgICAgICAgICAgICdhY3Rpb24nOiBzdGF0ZVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAqXG4gICAqIEBtZXRob2Qgc2VuZFNpZ25hbFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGJvZHkgLSBTaWduYWwgYm9keVxuICAgKi9cbiAgc2VuZFNpZ25hbChib2R5KSB7XG4gICAgdGhpcy5fc29ja2V0LnNlbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgdHlwZTogJ3NpZ25hbCcsXG4gICAgICBib2R5OiBib2R5LFxuICAgIH0pKTtcbiAgfVxuXG5cblxuICAvKipcbiAgICogU2hvcnRjdXQgdG8gc2VuZGluZyBhIENvdW50ZXIucmVhZCByZXF1ZXN0XG4gICAqXG4gICAqIEBtZXRob2QgZ2V0Q291bnRlclxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICogQHBhcmFtIHtib29sZWFufSBjYWxsYmFjay5zdWNjZXNzXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBjYWxsYmFjay5sYXN0Q291bnRlclxuICAgKiBAcGFyYW0ge251bWJlcn0gY2FsbGJhY2submV3Q291bnRlclxuICAgKi9cbiAgZ2V0Q291bnRlcihjYWxsYmFjaykge1xuICAgIGxvZ2dlci5kZWJ1ZygnV2Vic29ja2V0IHJlcXVlc3Q6IGdldENvdW50ZXInKTtcbiAgICB0aGlzLmNsaWVudC5zb2NrZXRSZXF1ZXN0TWFuYWdlci5zZW5kUmVxdWVzdCh7XG4gICAgICBtZXRob2Q6ICdDb3VudGVyLnJlYWQnLFxuICAgIH0sIChyZXN1bHQpID0+IHtcbiAgICAgIGxvZ2dlci5kZWJ1ZygnV2Vic29ja2V0IHJlc3BvbnNlOiBnZXRDb3VudGVyICcgKyByZXN1bHQuZGF0YS5jb3VudGVyKTtcbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICBpZiAocmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICBjYWxsYmFjayh0cnVlLCByZXN1bHQuZGF0YS5jb3VudGVyLCByZXN1bHQuZnVsbERhdGEuY291bnRlcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmVwbGF5cyBhbGwgbWlzc2VkIGNoYW5nZSBwYWNrZXRzIHNpbmNlIHRoZSBzcGVjaWZpZWQgdGltZXN0YW1wXG4gICAqXG4gICAqIEBtZXRob2QgcmVwbGF5RXZlbnRzXG4gICAqIEBwYXJhbSAge3N0cmluZ3xudW1iZXJ9ICAgdGltZXN0YW1wIC0gSXNvIGZvcm1hdHRlZCBkYXRlIHN0cmluZzsgaWYgbnVtYmVyIHdpbGwgYmUgdHJhbnNmb3JtZWQgaW50byBmb3JtYXR0ZWQgZGF0ZSBzdHJpbmcuXG4gICAqIEBwYXJhbSAge2Jvb2xlYW59IFtmb3JjZT1mYWxzZV0gLSBpZiB0cnVlLCBjYW5jZWwgYW55IGluIHByb2dyZXNzIHJlcGxheUV2ZW50cyBhbmQgc3RhcnQgYSBuZXcgb25lXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gT3B0aW9uYWwgY2FsbGJhY2sgZm9yIGNvbXBsZXRpb25cbiAgICovXG4gIHJlcGxheUV2ZW50cyh0aW1lc3RhbXAsIGZvcmNlLCBjYWxsYmFjaykge1xuICAgIGlmICghdGltZXN0YW1wKSByZXR1cm47XG4gICAgaWYgKGZvcmNlKSB0aGlzLl9pblJlcGxheSA9IGZhbHNlO1xuICAgIGlmICh0eXBlb2YgdGltZXN0YW1wID09PSAnbnVtYmVyJykgdGltZXN0YW1wID0gbmV3IERhdGUodGltZXN0YW1wKS50b0lTT1N0cmluZygpO1xuXG4gICAgLy8gSWYgd2UgYXJlIGFscmVhZHkgd2FpdGluZyBmb3IgYSByZXBsYXkgdG8gY29tcGxldGUsIHJlY29yZCB0aGUgdGltZXN0YW1wIGZyb20gd2hpY2ggd2VcbiAgICAvLyBuZWVkIHRvIHJlcGxheSBvbiBvdXIgbmV4dCByZXBsYXkgcmVxdWVzdFxuICAgIC8vIElmIHdlIGFyZSBzaW1wbHkgdW5hYmxlIHRvIHJlcGxheSBiZWNhdXNlIHdlJ3JlIGRpc2Nvbm5lY3RlZCwgY2FwdHVyZSB0aGUgX25lZWRzUmVwbGF5RnJvbVxuICAgIGlmICh0aGlzLl9pblJlcGxheSB8fCAhdGhpcy5faXNPcGVuKCkpIHtcbiAgICAgIGlmICghdGhpcy5fbmVlZHNSZXBsYXlGcm9tKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnV2Vic29ja2V0IHJlcXVlc3Q6IHJlcGxheUV2ZW50cyB1cGRhdGluZyBfbmVlZHNSZXBsYXlGcm9tJyk7XG4gICAgICAgIHRoaXMuX25lZWRzUmVwbGF5RnJvbSA9IHRpbWVzdGFtcDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5faW5SZXBsYXkgPSB0cnVlO1xuICAgICAgbG9nZ2VyLmluZm8oJ1dlYnNvY2tldCByZXF1ZXN0OiByZXBsYXlFdmVudHMnKTtcbiAgICAgIHRoaXMuY2xpZW50LnNvY2tldFJlcXVlc3RNYW5hZ2VyLnNlbmRSZXF1ZXN0KHtcbiAgICAgICAgbWV0aG9kOiAnRXZlbnQucmVwbGF5JyxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIGZyb21fdGltZXN0YW1wOiB0aW1lc3RhbXAsXG4gICAgICAgIH0sXG4gICAgICB9LCByZXN1bHQgPT4gdGhpcy5fcmVwbGF5RXZlbnRzQ29tcGxldGUodGltZXN0YW1wLCBjYWxsYmFjaywgcmVzdWx0LnN1Y2Nlc3MpKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGJhY2sgZm9yIGhhbmRsaW5nIGNvbXBsZXRpb24gb2YgcmVwbGF5LlxuICAgKlxuICAgKiBAbWV0aG9kIF9yZXBsYXlFdmVudHNDb21wbGV0ZVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0gIHtEYXRlfSAgICAgdGltZXN0YW1wXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgKiBAcGFyYW0gIHtCb29sZWFufSAgIHN1Y2Nlc3NcbiAgICovXG4gIF9yZXBsYXlFdmVudHNDb21wbGV0ZSh0aW1lc3RhbXAsIGNhbGxiYWNrLCBzdWNjZXNzKSB7XG4gICAgdGhpcy5faW5SZXBsYXkgPSBmYWxzZTtcblxuICAgIC8vIElmIHJlcGxheSB3YXMgY29tcGxldGVkLCBhbmQgbm8gb3RoZXIgcmVxdWVzdHMgZm9yIHJlcGxheSwgdGhlbiB0cmlnZ2VyIHN5bmNlZDtcbiAgICAvLyB3ZSdyZSBkb25lLlxuICAgIGlmIChzdWNjZXNzICYmICF0aGlzLl9uZWVkc1JlcGxheUZyb20pIHtcbiAgICAgIGxvZ2dlci5pbmZvKCdXZWJzb2NrZXQgcmVwbGF5IGNvbXBsZXRlJyk7XG4gICAgICB0aGlzLnRyaWdnZXIoJ3N5bmNlZCcpO1xuICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjaygpO1xuICAgIH1cblxuICAgIC8vIElmIHJlcGxheUV2ZW50cyB3YXMgY2FsbGVkIGR1cmluZyBhIHJlcGxheSwgdGhlbiByZXBsYXlcbiAgICAvLyBmcm9tIHRoZSBnaXZlbiB0aW1lc3RhbXAuICBJZiByZXF1ZXN0IGZhaWxlZCwgdGhlbiB3ZSBuZWVkIHRvIHJldHJ5IGZyb20gX2xhc3RUaW1lc3RhbXBcbiAgICBlbHNlIGlmIChzdWNjZXNzICYmIHRoaXMuX25lZWRzUmVwbGF5RnJvbSkge1xuICAgICAgbG9nZ2VyLmluZm8oJ1dlYnNvY2tldCByZXBsYXkgcGFydGlhbGx5IGNvbXBsZXRlJyk7XG4gICAgICBjb25zdCB0ID0gdGhpcy5fbmVlZHNSZXBsYXlGcm9tO1xuICAgICAgdGhpcy5fbmVlZHNSZXBsYXlGcm9tID0gbnVsbDtcbiAgICAgIHRoaXMucmVwbGF5RXZlbnRzKHQpO1xuICAgIH1cblxuICAgIC8vIFdlIG5ldmVyIGdvdCBhIGRvbmUgZXZlbnQuICBXZSBhbHNvIGRpZG4ndCBtaXNzIGFueSBjb3VudGVycywgc28gdGhlIGxhc3RcbiAgICAvLyBtZXNzYWdlIHdlIHJlY2VpdmVkIHdhcyB2YWxpZDsgc28gbGV0cyBqdXN0IHVzZSB0aGF0IGFzIG91ciB0aW1lc3RhbXAgYW5kXG4gICAgLy8gdHJ5IGFnYWluIHVudGlsIHdlIERPIGdldCBhIEV2ZW50LlJlcGxheSBjb21wbGV0aW9uIHBhY2tldFxuICAgIGVsc2Uge1xuICAgICAgbG9nZ2VyLmluZm8oJ1dlYnNvY2tldCByZXBsYXkgcmV0cnknKTtcbiAgICAgIHRoaXMucmVwbGF5RXZlbnRzKHRpbWVzdGFtcCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgYSBuZXcgd2Vic29ja2V0IHBhY2tldCBmcm9tIHRoZSBzZXJ2ZXJcbiAgICpcbiAgICogQG1ldGhvZCBfb25NZXNzYWdlXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdH0gZXZ0IC0gTWVzc2FnZSBmcm9tIHRoZSBzZXJ2ZXJcbiAgICovXG4gIF9vbk1lc3NhZ2UoZXZ0KSB7XG4gICAgdGhpcy5fbG9zdENvbm5lY3Rpb25Db3VudCA9IDA7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG1zZyA9IEpTT04ucGFyc2UoZXZ0LmRhdGEpO1xuICAgICAgY29uc3Qgc2tpcHBlZENvdW50ZXIgPSB0aGlzLl9sYXN0Q291bnRlciArIDEgIT09IG1zZy5jb3VudGVyO1xuICAgICAgdGhpcy5faGFzQ291bnRlciA9IHRydWU7XG4gICAgICB0aGlzLl9sYXN0Q291bnRlciA9IG1zZy5jb3VudGVyO1xuICAgICAgdGhpcy5fbGFzdERhdGFGcm9tU2VydmVyVGltZXN0YW1wID0gRGF0ZS5ub3coKTtcblxuICAgICAgLy8gSWYgd2UndmUgbWlzc2VkIGEgY291bnRlciwgcmVwbGF5IHRvIGdldDsgbm90ZSB0aGF0IHdlIGhhZCB0byB1cGRhdGUgX2xhc3RDb3VudGVyXG4gICAgICAvLyBmb3IgcmVwbGF5RXZlbnRzIHRvIHdvcmsgY29ycmVjdGx5LlxuICAgICAgaWYgKHNraXBwZWRDb3VudGVyKSB7XG4gICAgICAgIHRoaXMucmVwbGF5RXZlbnRzKHRoaXMuX2xhc3RUaW1lc3RhbXApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fbGFzdFRpbWVzdGFtcCA9IG5ldyBEYXRlKG1zZy50aW1lc3RhbXApLmdldFRpbWUoKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy50cmlnZ2VyKCdtZXNzYWdlJywge1xuICAgICAgICBkYXRhOiBtc2csXG4gICAgICB9KTtcblxuICAgICAgdGhpcy5fcmVzY2hlZHVsZVBpbmcoKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignTGF5ZXItV2Vic29ja2V0OiBGYWlsZWQgdG8gaGFuZGxlIHdlYnNvY2tldCBtZXNzYWdlOiAnICsgZXJyICsgJ1xcbicsIGV2dC5kYXRhKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVzY2hlZHVsZSBhIHBpbmcgcmVxdWVzdCB3aGljaCBoZWxwcyB1cyB2ZXJpZnkgdGhhdCB0aGUgY29ubmVjdGlvbiBpcyBzdGlsbCBhbGl2ZSxcbiAgICogYW5kIHRoYXQgd2UgaGF2ZW4ndCBtaXNzZWQgYW55IGV2ZW50cy5cbiAgICpcbiAgICogQG1ldGhvZCBfcmVzY2hlZHVsZVBpbmdcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9yZXNjaGVkdWxlUGluZygpIHtcbiAgICBpZiAodGhpcy5fbmV4dFBpbmdJZCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuX25leHRQaW5nSWQpO1xuICAgIH1cbiAgICB0aGlzLl9uZXh0UGluZ0lkID0gc2V0VGltZW91dCh0aGlzLl9waW5nLmJpbmQodGhpcyksIHRoaXMucGluZ0ZyZXF1ZW5jeSk7XG4gIH1cblxuICAvKipcbiAgICogU2VuZCBhIGNvdW50ZXIgcmVxdWVzdCB0byB0aGUgc2VydmVyIHRvIHZlcmlmeSB0aGF0IHdlIGFyZSBzdGlsbCBjb25uZWN0ZWQgYW5kXG4gICAqIGhhdmUgbm90IG1pc3NlZCBhbnkgZXZlbnRzLlxuICAgKlxuICAgKiBAbWV0aG9kIF9waW5nXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcGluZygpIHtcbiAgICBsb2dnZXIuZGVidWcoJ1dlYnNvY2tldCBwaW5nJyk7XG4gICAgdGhpcy5fbmV4dFBpbmdJZCA9IDA7XG4gICAgaWYgKHRoaXMuX2lzT3BlbigpKSB7XG4gICAgICAvLyBOT1RFOiBvbk1lc3NhZ2Ugd2lsbCBhbHJlYWR5IGhhdmUgY2FsbGVkIHJlc2NoZWR1bGVQaW5nLCBidXQgaWYgdGhlcmUgd2FzIG5vIHJlc3BvbnNlLCB0aGVuIHRoZSBlcnJvciBoYW5kbGVyIHdvdWxkIE5PVCBoYXZlIGNhbGxlZCBpdC5cbiAgICAgIHRoaXMuZ2V0Q291bnRlcih0aGlzLl9yZXNjaGVkdWxlUGluZy5iaW5kKHRoaXMpKTtcbiAgICB9XG4gIH1cblxuXG4gIC8qKlxuICAgKiBDbG9zZSB0aGUgd2Vic29ja2V0LlxuICAgKlxuICAgKiBAbWV0aG9kIGNsb3NlXG4gICAqL1xuICBjbG9zZSgpIHtcbiAgICBsb2dnZXIuZGVidWcoJ1dlYnNvY2tldCBjbG9zZSByZXF1ZXN0ZWQnKTtcbiAgICB0aGlzLl9jbG9zaW5nID0gdHJ1ZTtcbiAgICB0aGlzLmlzT3BlbiA9IGZhbHNlO1xuICAgIGlmICh0aGlzLl9zb2NrZXQpIHtcbiAgICAgIC8vIENsb3NlIGFsbCBldmVudCBoYW5kbGVycyBhbmQgc2V0IHNvY2tldCB0byBudWxsXG4gICAgICAvLyB3aXRob3V0IHdhaXRpbmcgZm9yIGJyb3dzZXIgZXZlbnQgdG8gY2FsbFxuICAgICAgLy8gX29uU29ja2V0Q2xvc2UgYXMgdGhlIG5leHQgY29tbWFuZCBhZnRlciBjbG9zZVxuICAgICAgLy8gbWlnaHQgcmVxdWlyZSBjcmVhdGluZyBhIG5ldyBzb2NrZXRcbiAgICAgIHRoaXMuX29uU29ja2V0Q2xvc2UoKTtcbiAgICAgIHRoaXMuX3NvY2tldC5jbG9zZSgpO1xuICAgICAgdGhpcy5fc29ja2V0ID0gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2VuZCBhIHBhY2tldCBhY3Jvc3MgdGhlIHdlYnNvY2tldFxuICAgKiBAbWV0aG9kIHNlbmRcbiAgICogQHBhcmFtIHtPYmplY3R9IG9ialxuICAgKi9cbiAgc2VuZChvYmopIHtcbiAgICB0aGlzLl9zb2NrZXQuc2VuZChKU09OLnN0cmluZ2lmeShvYmopKTtcbiAgfVxuXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy5jbG9zZSgpO1xuICAgIGlmICh0aGlzLl9uZXh0UGluZ0lkKSBjbGVhclRpbWVvdXQodGhpcy5fbmV4dFBpbmdJZCk7XG4gICAgc3VwZXIuZGVzdHJveSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIElmIHRoZSBzb2NrZXQgaGFzIGNsb3NlZCAob3IgaWYgdGhlIGNsb3NlIG1ldGhvZCBmb3JjZXMgaXQgY2xvc2VkKVxuICAgKiBSZW1vdmUgYWxsIGV2ZW50IGhhbmRsZXJzIGFuZCBpZiBhcHByb3ByaWF0ZSwgc2NoZWR1bGUgYSByZXRyeS5cbiAgICpcbiAgICogQG1ldGhvZCBfb25Tb2NrZXRDbG9zZVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX29uU29ja2V0Q2xvc2UoKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdXZWJzb2NrZXQgY2xvc2VkJyk7XG4gICAgdGhpcy5pc09wZW4gPSBmYWxzZTtcbiAgICBpZiAoIXRoaXMuX2Nsb3NpbmcpIHtcbiAgICAgIHRoaXMuX3NjaGVkdWxlUmVjb25uZWN0KCk7XG4gICAgfVxuXG4gICAgdGhpcy5fcmVtb3ZlU29ja2V0RXZlbnRzKCk7XG4gICAgdGhpcy50cmlnZ2VyKCdkaXNjb25uZWN0ZWQnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGFsbCBldmVudCBoYW5kbGVycyBvbiB0aGUgY3VycmVudCBzb2NrZXQuXG4gICAqXG4gICAqIEBtZXRob2QgX3JlbW92ZVNvY2tldEV2ZW50c1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlbW92ZVNvY2tldEV2ZW50cygpIHtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICBpZiAodHlwZW9mIFdlYlNvY2tldCAhPT0gJ3VuZGVmaW5lZCcgJiYgdGhpcy5fc29ja2V0KSB7XG4gICAgICB0aGlzLl9zb2NrZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIHRoaXMuX29uTWVzc2FnZSk7XG4gICAgICB0aGlzLl9zb2NrZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xvc2UnLCB0aGlzLl9vblNvY2tldENsb3NlKTtcbiAgICAgIHRoaXMuX3NvY2tldC5yZW1vdmVFdmVudExpc3RlbmVyKCdvcGVuJywgdGhpcy5fb25PcGVuKTtcbiAgICAgIHRoaXMuX3NvY2tldC5yZW1vdmVFdmVudExpc3RlbmVyKCdlcnJvcicsIHRoaXMuX29uRXJyb3IpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5fc29ja2V0KSB7XG4gICAgICB0aGlzLl9zb2NrZXQub25tZXNzYWdlID0gbnVsbDtcbiAgICAgIHRoaXMuX3NvY2tldC5vbmNsb3NlID0gbnVsbDtcbiAgICAgIHRoaXMuX3NvY2tldC5vbm9wZW4gPSBudWxsO1xuICAgICAgdGhpcy5fc29ja2V0Lm9uZXJyb3IgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTY2hlZHVsZSBhbiBhdHRlbXB0IHRvIHJlY29ubmVjdCB0byB0aGUgc2VydmVyLiAgSWYgdGhlIG9ubGluZU1hbmFnZXJcbiAgICogZGVjbGFyZXMgdXMgdG8gYmUgb2ZmbGluZSwgZG9uJ3QgYm90aGVyIHJlY29ubmVjdGluZy4gIEEgcmVjb25uZWN0XG4gICAqIGF0dGVtcHQgd2lsbCBiZSB0cmlnZ2VyZWQgYXMgc29vbiBhcyB0aGUgb25saW5lIG1hbmFnZXIgcmVwb3J0cyB3ZSBhcmUgb25saW5lIGFnYWluLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgdGhlIGR1cmF0aW9uIG9mIG91ciBkZWxheSBjYW4gbm90IGV4Y2VkZSB0aGUgb25saW5lTWFuYWdlcidzIHBpbmcgZnJlcXVlbmN5XG4gICAqIG9yIGl0IHdpbGwgZGVjbGFyZSB1cyB0byBiZSBvZmZsaW5lIHdoaWxlIHdlIGF0dGVtcHQgYSByZWNvbm5lY3QuXG4gICAqXG4gICAqIEBtZXRob2QgX3NjaGVkdWxlUmVjb25uZWN0XG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc2NoZWR1bGVSZWNvbm5lY3QoKSB7XG4gICAgaWYgKHRoaXMuaXNEZXN0cm95ZWQgfHwgIXRoaXMuY2xpZW50LmlzT25saW5lKSByZXR1cm47XG5cbiAgICBjb25zdCBtYXhEZWxheSA9ICh0aGlzLmNsaWVudC5vbmxpbmVNYW5hZ2VyLnBpbmdGcmVxdWVuY3kgLSAxMDAwKSAvIDEwMDA7XG4gICAgY29uc3QgZGVsYXkgPSBVdGlscy5nZXRFeHBvbmVudGlhbEJhY2tvZmZTZWNvbmRzKG1heERlbGF5LCBNYXRoLm1pbigxNSwgdGhpcy5fbG9zdENvbm5lY3Rpb25Db3VudCkpO1xuICAgIGxvZ2dlci5kZWJ1ZygnV2Vic29ja2V0IFJlY29ubmVjdCBpbiAnICsgZGVsYXkgKyAnIHNlY29uZHMnKTtcbiAgICB0aGlzLl9yZWNvbm5lY3RJZCA9IHNldFRpbWVvdXQodGhpcy5fdmFsaWRhdGVTZXNzaW9uQmVmb3JlUmVjb25uZWN0LmJpbmQodGhpcyksIGRlbGF5ICogMTAwMCk7XG4gIH1cblxuICAvKipcbiAgICogQmVmb3JlIHRoZSBzY2hlZHVsZWQgcmVjb25uZWN0IGNhbiBjYWxsIGBjb25uZWN0KClgIHZhbGlkYXRlIHRoYXQgd2UgZGlkbid0IGxvc2UgdGhlIHdlYnNvY2tldFxuICAgKiBkdWUgdG8gbG9zcyBvZiBhdXRoZW50aWNhdGlvbi5cbiAgICpcbiAgICogQG1ldGhvZCBfdmFsaWRhdGVTZXNzaW9uQmVmb3JlUmVjb25uZWN0XG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfdmFsaWRhdGVTZXNzaW9uQmVmb3JlUmVjb25uZWN0KCkge1xuICAgIGlmICh0aGlzLmlzRGVzdHJveWVkIHx8ICF0aGlzLmNsaWVudC5pc09ubGluZSkgcmV0dXJuO1xuXG4gICAgdGhpcy5jbGllbnQueGhyKHtcbiAgICAgIHVybDogJy8nLFxuICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgIHN5bmM6IGZhbHNlLFxuICAgIH0sIChyZXN1bHQpID0+IHtcbiAgICAgIGlmIChyZXN1bHQuc3VjY2VzcykgdGhpcy5jb25uZWN0KCk7XG4gICAgICAvLyBpZiBub3Qgc3VjY2Vzc2Z1bCwgdGhlIHRoaXMuY2xpZW50LnhociB3aWxsIGhhbmRsZSByZWF1dGhlbnRpY2F0aW9uXG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBJcyB0aGUgd2Vic29ja2V0IGNvbm5lY3Rpb24gY3VycmVudGx5IG9wZW4/XG4gKiBAdHlwZSB7Qm9vbGVhbn1cbiAqL1xuU29ja2V0TWFuYWdlci5wcm90b3R5cGUuaXNPcGVuID0gZmFsc2U7XG5cbi8qKlxuICogc2V0VGltZW91dCBJRCBmb3IgY2FsbGluZyBjb25uZWN0KClcbiAqIEBwcml2YXRlXG4gKiBAdHlwZSB7TnVtYmVyfVxuICovXG5Tb2NrZXRNYW5hZ2VyLnByb3RvdHlwZS5fcmVjb25uZWN0SWQgPSAwO1xuXG4vKipcbiAqIHNldFRpbWVvdXQgSUQgZm9yIGNhbGxpbmcgX2Nvbm5lY3Rpb25GYWlsZWQoKVxuICogQHByaXZhdGVcbiAqIEB0eXBlIHtOdW1iZXJ9XG4gKi9cblNvY2tldE1hbmFnZXIucHJvdG90eXBlLl9jb25uZWN0aW9uRmFpbGVkSWQgPSAwO1xuXG5Tb2NrZXRNYW5hZ2VyLnByb3RvdHlwZS5fbGFzdFRpbWVzdGFtcCA9IDA7XG5Tb2NrZXRNYW5hZ2VyLnByb3RvdHlwZS5fbGFzdERhdGFGcm9tU2VydmVyVGltZXN0YW1wID0gMDtcblNvY2tldE1hbmFnZXIucHJvdG90eXBlLl9sYXN0Q291bnRlciA9IG51bGw7XG5Tb2NrZXRNYW5hZ2VyLnByb3RvdHlwZS5faGFzQ291bnRlciA9IGZhbHNlO1xuXG5Tb2NrZXRNYW5hZ2VyLnByb3RvdHlwZS5faW5SZXBsYXkgPSBmYWxzZTtcblNvY2tldE1hbmFnZXIucHJvdG90eXBlLl9uZWVkc1JlcGxheUZyb20gPSBudWxsO1xuXG4vKipcbiAqIEZyZXF1ZW5jeSB3aXRoIHdoaWNoIHRoZSB3ZWJzb2NrZXQgY2hlY2tzIHRvIHNlZSBpZiBhbnkgd2Vic29ja2V0IG5vdGlmaWNhdGlvbnNcbiAqIGhhdmUgYmVlbiBtaXNzZWQuXG4gKiBAdHlwZSB7TnVtYmVyfVxuICovXG5Tb2NrZXRNYW5hZ2VyLnByb3RvdHlwZS5waW5nRnJlcXVlbmN5ID0gMzAwMDA7XG5cbi8qKlxuICogVGhlIENsaWVudCB0aGF0IG93bnMgdGhpcy5cbiAqIEB0eXBlIHtsYXllci5DbGllbnR9XG4gKi9cblNvY2tldE1hbmFnZXIucHJvdG90eXBlLmNsaWVudCA9IG51bGw7XG5cbi8qKlxuICogVGhlIFNvY2tldCBDb25uZWN0aW9uIGluc3RhbmNlXG4gKiBAdHlwZSB7V2Vic29ja2V0fVxuICovXG5Tb2NrZXRNYW5hZ2VyLnByb3RvdHlwZS5fc29ja2V0ID0gbnVsbDtcblxuLyoqXG4gKiBJcyB0aGUgd2Vic29ja2V0IGNvbm5lY3Rpb24gYmVpbmcgY2xvc2VkIGJ5IGEgY2FsbCB0byBjbG9zZSgpP1xuICogSWYgc28sIHdlIGNhbiBpZ25vcmUgYW55IGVycm9ycyB0aGF0IHNpZ25hbCB0aGUgc29ja2V0IGFzIGNsb3NpbmcuXG4gKiBAdHlwZSB7Qm9vbGVhbn1cbiAqL1xuU29ja2V0TWFuYWdlci5wcm90b3R5cGUuX2Nsb3NpbmcgPSBmYWxzZTtcblxuLyoqXG4gKiBOdW1iZXIgb2YgZmFpbGVkIGF0dGVtcHRzIHRvIHJlY29ubmVjdC5cbiAqIEB0eXBlIHtOdW1iZXJ9XG4gKi9cblNvY2tldE1hbmFnZXIucHJvdG90eXBlLl9sb3N0Q29ubmVjdGlvbkNvdW50ID0gMDtcblxuXG5Tb2NrZXRNYW5hZ2VyLl9zdXBwb3J0ZWRFdmVudHMgPSBbXG4gIC8qKlxuICAgKiBBIGRhdGEgcGFja2V0IGhhcyBiZWVuIHJlY2VpdmVkIGZyb20gdGhlIHNlcnZlci5cbiAgICogQGV2ZW50IG1lc3NhZ2VcbiAgICogQHBhcmFtIHtsYXllci5MYXllckV2ZW50fSBsYXllckV2ZW50XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBsYXllckV2ZW50LmRhdGEgLSBUaGUgZGF0YSB0aGF0IHdhcyByZWNlaXZlZCBmcm9tIHRoZSBzZXJ2ZXJcbiAgICovXG4gICdtZXNzYWdlJyxcblxuICAvKipcbiAgICogVGhlIHdlYnNvY2tldCBpcyBub3cgY29ubmVjdGVkLlxuICAgKiBAZXZlbnQgY29ubmVjdGVkXG4gICAqIEBwcm90ZWN0ZWRcbiAgICovXG4gICdjb25uZWN0ZWQnLFxuXG4gIC8qKlxuICAgKiBUaGUgd2Vic29ja2V0IGlzIG5vIGxvbmdlciBjb25uZWN0ZWRcbiAgICogQGV2ZW50IGRpc2Nvbm5lY3RlZFxuICAgKiBAcHJvdGVjdGVkXG4gICAqL1xuICAnZGlzY29ubmVjdGVkJyxcblxuICAvKipcbiAgICogV2Vic29ja2V0IGV2ZW50cyB3ZXJlIG1pc3NlZDsgd2UgYXJlIHJlc3luY2luZyB3aXRoIHRoZSBzZXJ2ZXJcbiAgICogQGV2ZW50IHJlcGxheS1iZWd1blxuICAgKi9cbiAgJ3N5bmNpbmcnLFxuXG4gIC8qKlxuICAgKiBXZWJzb2NrZXQgZXZlbnRzIHdlcmUgbWlzc2VkOyB3ZSByZXN5bmNlZCB3aXRoIHRoZSBzZXJ2ZXIgYW5kIGFyZSBub3cgZG9uZVxuICAgKiBAZXZlbnQgcmVwbGF5LWJlZ3VuXG4gICAqL1xuICAnc3luY2VkJyxcbl0uY29uY2F0KFJvb3QuX3N1cHBvcnRlZEV2ZW50cyk7XG5Sb290LmluaXRDbGFzcy5hcHBseShTb2NrZXRNYW5hZ2VyLCBbU29ja2V0TWFuYWdlciwgJ1NvY2tldE1hbmFnZXInXSk7XG5tb2R1bGUuZXhwb3J0cyA9IFNvY2tldE1hbmFnZXI7XG4iXX0=
