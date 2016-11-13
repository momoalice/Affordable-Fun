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
 * @class  layer.WebsocketManager
 * @extends layer.Root
 * @private
 *
 * TODO: Need to make better use of info from the layer.OnlineStateManager.
 */
var Root = require('./root');
var Utils = require('./client-utils');
var LayerError = require('./layer-error');
var logger = require('./logger');
var Message = require('./message');
var Conversation = require('./conversation');

// Wait 15 seconds for a response and then give up
var DELAY_UNTIL_TIMEOUT = 15 * 1000;

var WebsocketManager = function (_Root) {
  _inherits(WebsocketManager, _Root);

  /**
   * Create a new websocket manager
   *
   *      var websocketManager = new layer.WebsocketManager({
   *          client: client,
   *      });
   *
   * @method
   * @param  {Object} options
   * @param {layer.Client} client
   * @return {layer.WebsocketManager}
   */

  function WebsocketManager(options) {
    _classCallCheck(this, WebsocketManager);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(WebsocketManager).call(this, options));

    if (!_this.client) throw new Error('WebsocketManager requires a client');

    // Insure that on/off methods don't need to call bind, therefore making it easy
    // to add/remove functions as event listeners.
    _this._onMessage = _this._onMessage.bind(_this);
    _this._onOpen = _this._onOpen.bind(_this);
    _this._onSocketClose = _this._onSocketClose.bind(_this);
    _this._onError = _this._onError.bind(_this);

    _this._requestCallbacks = {};

    // If the client is authenticated, start it up.
    if (_this.client.isAuthenticated && _this.client.onlineManager.isOnline) {
      _this.connect();
    }

    _this.client.on('online', _this._onlineStateChange, _this);

    // Any time the Client triggers a ready event we need to reconnect.
    _this.client.on('authenticated', _this.connect, _this);

    _this._lastTimestamp = new Date();
    return _this;
  }

  /**
   * Call this when we want to reset all websocket state; this would be done after a lengthy period
   * of being disconnected.  This prevents Event.replay from being called on reconnecting.
   *
   * @method _reset
   * @private
   */


  _createClass(WebsocketManager, [{
    key: '_reset',
    value: function _reset() {
      this._lastTimestamp = null;
      this._lastDataFromServerTimestamp = null;
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
      this._requestCallbacks = {};
      this.close();
      if (reset) this._reset();
      this.connect();
    }

    /**
     * Connect to the websocket server
     *
     * @method
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
     * @method
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
     * @method
     * @private
     * @param  {Error} err - Websocket error
     */

  }, {
    key: '_onError',
    value: function _onError(err) {
      if (this._closing) return;
      this._clearConnectionFailed();
      logger.debug('Websocket Error causing websocket to close');
      if (!this.isOpen) {
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
     * Shortcut for sending a request; builds in handling for callbacks
     *
     *    manager.sendRequest({
     *      operation: "delete",
     *      object: {id: "layer:///conversations/uuid"},
     *      data: {deletion_mode: "all_participants"}
     *    }, function(result) {
     *        alert(result.success ? "Yay" : "Boo");
     *    });
     *
     * @method sendRequest
     * @param  {Object} data - Data to send to the server
     * @param  {Function} callback - Handler for success/failure callback
     */

  }, {
    key: 'sendRequest',
    value: function sendRequest(data, callback) {
      if (!this._isOpen()) {
        return callback({ success: false, data: { message: 'WebSocket not connected' } });
      }
      var body = Utils.clone(data);
      body.request_id = 'r' + this._nextRequestId++;
      logger.debug('Request ' + body.request_id + ' is sending');
      if (callback) {
        this._requestCallbacks[body.request_id] = {
          date: Date.now(),
          callback: callback
        };
      }

      this._socket.send(JSON.stringify({
        type: 'request',
        body: body
      }));
      this._scheduleCallbackCleanup();
    }

    /**
     * Flags a request as having failed if no response within 2 minutes
     *
     * @method _scheduleCallbackCleanup
     * @private
     */

  }, {
    key: '_scheduleCallbackCleanup',
    value: function _scheduleCallbackCleanup() {
      if (!this._callbackCleanupId) {
        this._callbackCleanupId = setTimeout(this._runCallbackCleanup.bind(this), DELAY_UNTIL_TIMEOUT + 50);
      }
    }

    /**
     * Calls callback with an error.
     *
     * NOTE: Because we call requests that expect responses serially instead of in parallel,
     * currently there should only ever be a single entry in _requestCallbacks.  This may change in the future.
     *
     * @method _runCallbackCleanup
     * @private
     */

  }, {
    key: '_runCallbackCleanup',
    value: function _runCallbackCleanup() {
      this._callbackCleanupId = 0;
      // If the websocket is closed, ignore all callbacks.  The Sync Manager will reissue these requests as soon as it gets
      // a 'connected' event... they have not failed.  May need to rethink this for cases where third parties are directly
      // calling the websocket manager bypassing the sync manager.
      if (this.isDestroyed || !this._isOpen()) return;
      var requestId = undefined,
          count = 0;
      var now = Date.now();
      for (requestId in this._requestCallbacks) {
        if (this._requestCallbacks.hasOwnProperty(requestId)) {

          // If the request hasn't expired, we'll need to reschedule callback cleanup; else if its expired...
          if (now < this._requestCallbacks[requestId].date + DELAY_UNTIL_TIMEOUT) {
            count++;
          } else {
            // If there has been no data from the server, there's probably a problem with the websocket; reconnect.
            if (now > this._lastDataFromServerTimestamp.getTime() + DELAY_UNTIL_TIMEOUT) {
              this._reconnect(false);
              this._scheduleCallbackCleanup();
              return;
            } else {
              // The request isn't responding and the socket is good; fail the request.
              this._timeoutRequest(requestId);
            }
          }
        }
      }
      if (count) this._scheduleCallbackCleanup();
    }
  }, {
    key: '_timeoutRequest',
    value: function _timeoutRequest(requestId) {
      try {
        logger.warn('Websocket request timeout');
        this._requestCallbacks[requestId].callback({
          success: false,
          data: new LayerError({
            id: 'request_timeout',
            message: 'The server is not responding and maybe has been acquired by skynet.',
            url: 'https://www.google.com/#q=skynet',
            code: 0,
            status: 408,
            httpStatus: 408
          })
        });
      } catch (err) {
        // Do nothing
      }
      delete this._requestCallbacks[requestId];
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
      this.sendRequest({
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
     * @param  {string}   timestamp - Iso formatted date string
     * @param  {boolean} [force=false] - if true, cancel any in progress replayEvents and start a new one
     * @param  {Function} [callback] - Optional callback for completion
     */

  }, {
    key: 'replayEvents',
    value: function replayEvents(timestamp, force, callback) {
      var _this2 = this;

      if (!this._isOpen() || !timestamp) return;
      if (force) this._inReplay = false;

      // If we are already waiting for a replay to complete, record the timestamp from which we
      // need to replay on our next replay request
      if (this._inReplay) {
        if (!this._needsReplayFrom) {
          logger.debug('Websocket request: replayEvents updating _needsReplayFrom');
          this._needsReplayFrom = timestamp;
        }
      } else {
        this._inReplay = true;
        logger.info('Websocket request: replayEvents');
        this.sendRequest({
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
     * Get the object specified by the `object` property of the websocket packet.
     *
     * @method
     * @private
     * @param  {Object} msg
     * @return {layer.Root}
     */

  }, {
    key: '_getObject',
    value: function _getObject(msg) {
      return this.client._getObject(msg.object.id);
    }

    /**
     * Handles a new websocket packet from the server
     *
     * @method
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
        this._lastDataFromServerTimestamp = new Date();

        // If we've missed a counter, replay to get; note that we had to update _lastCounter
        // for replayEvents to work correctly.
        if (skippedCounter) {
          this.replayEvents(this._lastTimestamp);
        } else {
          this._lastTimestamp = new Date(msg.timestamp);
        }

        this._processMessage(msg);
        this._reschedulePing();
      } catch (err) {
        logger.error('Layer-Websocket: Failed to handle websocket message: ' + err + '\n', evt.data);
      }
    }

    /**
     * Process the message by message type.
     *
     * TODO: signals should be handled here; currently the typing indicator classes
     * directly listen to the websocket.
     *
     * Triggers 'message' event.
     *
     * @method _processMessage
     * @private
     * @param  {Object} msg
     */

  }, {
    key: '_processMessage',
    value: function _processMessage(msg) {
      try {
        switch (msg.type) {
          case 'change':
            this._handleChange(msg.body);
            break;
          case 'response':
            this._handleResponse(msg);
            break;
        }
      } catch (err) {
        // do nothing
      }
      try {
        this.trigger('message', {
          data: msg
        });
      } catch (err) {
        // do nothing
      }
    }

    /**
     * Handle a response to a request.
     *
     * @method _handleResponse
     * @private
     * @param  {Object} rawMsg
     */

  }, {
    key: '_handleResponse',
    value: function _handleResponse(rawMsg) {
      var msg = rawMsg.body;
      var requestId = msg.request_id;
      var data = msg.success ? msg.data : new LayerError(msg.data);
      logger.debug('Websocket response ' + requestId + ' ' + (msg.success ? 'Successful' : 'Failed'));
      if (requestId && this._requestCallbacks[requestId]) {
        this._requestCallbacks[requestId].callback({
          success: msg.success,
          data: data,
          fullData: rawMsg
        });
        delete this._requestCallbacks[requestId];
      }
    }

    /**
     * Handles a Change packet from the server.
     *
     * @method _handleChange
     * @private
     * @param  {Object} msg
     */

  }, {
    key: '_handleChange',
    value: function _handleChange(msg) {
      switch (msg.operation) {
        case 'create':
          logger.info('Websocket Change Event: Create ' + msg.object.type + ' ' + msg.object.id);
          logger.debug(msg.data);
          this._handleCreate(msg);
          break;
        case 'delete':
          logger.info('Websocket Change Event:  Delete ' + msg.object.type + ' ' + msg.object.id);
          logger.debug(msg.data);
          this._handleDelete(msg);
          break;
        case 'patch':
          logger.info('Websocket Change Event:  Patch ' + msg.object.type + ' ' + msg.object.id + ': ' + msg.data.map(function (op) {
            return op.property;
          }).join(', '));
          logger.debug(msg.data);
          this._handlePatch(msg);
          break;
      }
    }

    /**
     * Process a create object message from the server
     *
     * @method _handleCreate
     * @private
     * @param  {Object} msg
     */

  }, {
    key: '_handleCreate',
    value: function _handleCreate(msg) {
      msg.data.fromWebsocket = true;
      this.client._createObject(msg.data);
    }

    /**
     * Handles delete object messages from the server.
     * All objects that can be deleted from the server should
     * provide a _deleted() method to be called prior to destroy().
     *
     * @method _handleDelete
     * @private
     * @param  {Object} msg
     */

  }, {
    key: '_handleDelete',
    value: function _handleDelete(msg) {
      var entity = this._getObject(msg);
      if (entity) {
        entity._deleted();
        entity.destroy();
      }
    }

    /**
     * On receiving an update/patch message from the server
     * run the LayerParser on the data.
     *
     * @method _handlePatch
     * @private
     * @param  {Object} msg
     */

  }, {
    key: '_handlePatch',
    value: function _handlePatch(msg) {
      // Can only patch a cached object
      var entity = this._getObject(msg);
      if (entity) {
        try {
          entity._inLayerParser = true;
          Utils.layerParse({
            object: entity,
            type: msg.object.type,
            operations: msg.data,
            client: this.client
          });
          entity._inLayerParser = false;
        } catch (err) {
          logger.error('websocket-manager: Failed to handle event', msg.data);
        }
      } else if (Utils.typeFromID(msg.object.id) === 'conversations') {
        if (Conversation._loadResourceForPatch(msg.data)) this.client.getConversation(msg.object.id, true);
      } else if (Utils.typeFromID(msg.object.id) === 'messages') {
        if (Message._loadResourceForPatch(msg.data)) this.client.getMessage(msg.object.id, true);
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
     * @method
     */

  }, {
    key: 'close',
    value: function close() {
      logger.debug('Websocket close requested');
      this._closing = true;
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
  }, {
    key: 'destroy',
    value: function destroy() {
      this.close();
      if (this._callbackCleanupId) clearTimeout(this._callbackCleanupId);
      if (this._nextPingId) clearTimeout(this._nextPingId);
      this._requestCallbacks = null;
      _get(Object.getPrototypeOf(WebsocketManager.prototype), 'destroy', this).call(this);
    }

    /**
     * If the socket has closed (or if the close method forces it closed)
     * Remove all event handlers and if appropriate, schedule a retry.
     *
     * @method
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
      this._reconnectId = setTimeout(this.connect.bind(this), delay);
    }
  }]);

  return WebsocketManager;
}(Root);

/**
 * Is the websocket connection currently open?
 * TODO: Integrate info from the layer.OnlineStateManager.
 * @type {Boolean}
 */


WebsocketManager.prototype.isOpen = false;

/**
 * setTimeout ID for calling connect()
 * @private
 * @type {Number}
 */
WebsocketManager.prototype._reconnectId = 0;

WebsocketManager.prototype._nextRequestId = 1;

/**
 * setTimeout ID for calling _connectionFailed()
 * @private
 * @type {Number}
 */
WebsocketManager.prototype._connectionFailedId = 0;

WebsocketManager.prototype._lastTimestamp = null;
WebsocketManager.prototype._lastDataFromServerTimestamp = null;
WebsocketManager.prototype._lastCounter = null;
WebsocketManager.prototype._hasCounter = false;

WebsocketManager.prototype._inReplay = false;
WebsocketManager.prototype._needsReplayFrom = null;

/**
 * Frequency with which the websocket checks to see if any websocket notifications
 * have been missed.
 * @type {Number}
 */
WebsocketManager.prototype.pingFrequency = 30000;

/**
 * The Client that owns this.
 * @type {layer.Client}
 */
WebsocketManager.prototype.client = null;

/**
 * The Socket Connection instance
 * @type {Websocket}
 */
WebsocketManager.prototype._socket = null;

/**
 * Is the websocket connection being closed by a call to close()?
 * If so, we can ignore any errors that signal the socket as closing.
 * @type {Boolean}
 */
WebsocketManager.prototype._closing = false;

/**
 * Number of failed attempts to reconnect.
 * @type {Number}
 */
WebsocketManager.prototype._lostConnectionCount = 0;

WebsocketManager._supportedEvents = [
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
Root.initClass.apply(WebsocketManager, [WebsocketManager, 'WebsocketManager']);
module.exports = WebsocketManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy93ZWJzb2NrZXQtbWFuYWdlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFrQkEsSUFBTSxPQUFPLFFBQVEsUUFBUixDQUFQO0FBQ04sSUFBTSxRQUFRLFFBQVEsZ0JBQVIsQ0FBUjtBQUNOLElBQU0sYUFBYSxRQUFRLGVBQVIsQ0FBYjtBQUNOLElBQU0sU0FBUyxRQUFRLFVBQVIsQ0FBVDtBQUNOLElBQU0sVUFBVSxRQUFRLFdBQVIsQ0FBVjtBQUNOLElBQU0sZUFBZSxRQUFRLGdCQUFSLENBQWY7OztBQUdOLElBQU0sc0JBQXNCLEtBQUssSUFBTDs7SUFFdEI7Ozs7Ozs7Ozs7Ozs7Ozs7QUFhSixXQWJJLGdCQWFKLENBQVksT0FBWixFQUFxQjswQkFiakIsa0JBYWlCOzt1RUFiakIsNkJBY0ksVUFEYTs7QUFFbkIsUUFBSSxDQUFDLE1BQUssTUFBTCxFQUFhLE1BQU0sSUFBSSxLQUFKLENBQVUsb0NBQVYsQ0FBTixDQUFsQjs7OztBQUZtQixTQU1uQixDQUFLLFVBQUwsR0FBa0IsTUFBSyxVQUFMLENBQWdCLElBQWhCLE9BQWxCLENBTm1CO0FBT25CLFVBQUssT0FBTCxHQUFlLE1BQUssT0FBTCxDQUFhLElBQWIsT0FBZixDQVBtQjtBQVFuQixVQUFLLGNBQUwsR0FBc0IsTUFBSyxjQUFMLENBQW9CLElBQXBCLE9BQXRCLENBUm1CO0FBU25CLFVBQUssUUFBTCxHQUFnQixNQUFLLFFBQUwsQ0FBYyxJQUFkLE9BQWhCLENBVG1COztBQVduQixVQUFLLGlCQUFMLEdBQXlCLEVBQXpCOzs7QUFYbUIsUUFjZixNQUFLLE1BQUwsQ0FBWSxlQUFaLElBQStCLE1BQUssTUFBTCxDQUFZLGFBQVosQ0FBMEIsUUFBMUIsRUFBb0M7QUFDckUsWUFBSyxPQUFMLEdBRHFFO0tBQXZFOztBQUlBLFVBQUssTUFBTCxDQUFZLEVBQVosQ0FBZSxRQUFmLEVBQXlCLE1BQUssa0JBQUwsT0FBekI7OztBQWxCbUIsU0FxQm5CLENBQUssTUFBTCxDQUFZLEVBQVosQ0FBZSxlQUFmLEVBQWdDLE1BQUssT0FBTCxPQUFoQyxFQXJCbUI7O0FBdUJuQixVQUFLLGNBQUwsR0FBc0IsSUFBSSxJQUFKLEVBQXRCLENBdkJtQjs7R0FBckI7Ozs7Ozs7Ozs7O2VBYkk7OzZCQThDSztBQUNQLFdBQUssY0FBTCxHQUFzQixJQUF0QixDQURPO0FBRVAsV0FBSyw0QkFBTCxHQUFvQyxJQUFwQyxDQUZPO0FBR1AsV0FBSyxZQUFMLEdBQW9CLElBQXBCLENBSE87QUFJUCxXQUFLLFdBQUwsR0FBbUIsS0FBbkIsQ0FKTzs7QUFNUCxXQUFLLFNBQUwsR0FBaUIsS0FBakIsQ0FOTztBQU9QLFdBQUssZ0JBQUwsR0FBd0IsSUFBeEIsQ0FQTzs7Ozs7Ozs7Ozs7Ozs7dUNBa0JVLEtBQUs7QUFDdEIsVUFBSSxDQUFDLEtBQUssTUFBTCxDQUFZLGVBQVosRUFBNkIsT0FBbEM7QUFDQSxVQUFJLElBQUksUUFBSixFQUFjO0FBQ2hCLGFBQUssVUFBTCxDQUFnQixJQUFJLEtBQUosQ0FBaEIsQ0FEZ0I7T0FBbEIsTUFFTztBQUNMLGFBQUssS0FBTCxHQURLO09BRlA7Ozs7Ozs7Ozs7OzsrQkFhUyxPQUFPOzs7Ozs7QUFNaEIsV0FBSyxpQkFBTCxHQUF5QixFQUF6QixDQU5nQjtBQU9oQixXQUFLLEtBQUwsR0FQZ0I7QUFRaEIsVUFBSSxLQUFKLEVBQVcsS0FBSyxNQUFMLEdBQVg7QUFDQSxXQUFLLE9BQUwsR0FUZ0I7Ozs7Ozs7Ozs7Ozs0QkFrQlYsS0FBSztBQUNYLFVBQUksS0FBSyxNQUFMLENBQVksV0FBWixJQUEyQixDQUFDLEtBQUssTUFBTCxDQUFZLFFBQVosRUFBc0IsT0FBdEQ7O0FBRUEsV0FBSyxRQUFMLEdBQWdCLEtBQWhCLENBSFc7O0FBS1gsV0FBSyxZQUFMLEdBQW9CLENBQUMsQ0FBRDs7OztBQUxULFVBU0wsS0FBSyxPQUFPLFNBQVAsS0FBcUIsV0FBckIsR0FBbUMsUUFBUSxXQUFSLEVBQXFCLFlBQXJCLEdBQW9DLFNBQXZFOzs7QUFUQSxVQVlMLE1BQU0sS0FBSyxNQUFMLENBQVksR0FBWixDQUFnQixPQUFoQixDQUF3QixPQUF4QixFQUFpQyxJQUFqQyxJQUNWLDJCQURVLEdBRVYsS0FBSyxNQUFMLENBQVksWUFBWixDQWRTO0FBZVgsV0FBSyxPQUFMLEdBQWUsSUFBSSxFQUFKLENBQU8sR0FBUCxFQUFZLFdBQVosQ0FBZjs7OztBQWZXLFVBbUJQLE9BQU8sU0FBUCxLQUFxQixXQUFyQixFQUFrQztBQUNwQyxhQUFLLE9BQUwsQ0FBYSxTQUFiLEdBQXlCLEtBQUssVUFBTCxDQURXO0FBRXBDLGFBQUssT0FBTCxDQUFhLE9BQWIsR0FBdUIsS0FBSyxjQUFMLENBRmE7QUFHcEMsYUFBSyxPQUFMLENBQWEsTUFBYixHQUFzQixLQUFLLE9BQUwsQ0FIYztBQUlwQyxhQUFLLE9BQUwsQ0FBYSxPQUFiLEdBQXVCLEtBQUssUUFBTCxDQUphOzs7O0FBQXRDLFdBUUs7QUFDSCxlQUFLLE9BQUwsQ0FBYSxnQkFBYixDQUE4QixTQUE5QixFQUF5QyxLQUFLLFVBQUwsQ0FBekMsQ0FERztBQUVILGVBQUssT0FBTCxDQUFhLGdCQUFiLENBQThCLE9BQTlCLEVBQXVDLEtBQUssY0FBTCxDQUF2QyxDQUZHO0FBR0gsZUFBSyxPQUFMLENBQWEsZ0JBQWIsQ0FBOEIsTUFBOUIsRUFBc0MsS0FBSyxPQUFMLENBQXRDLENBSEc7QUFJSCxlQUFLLE9BQUwsQ0FBYSxnQkFBYixDQUE4QixPQUE5QixFQUF1QyxLQUFLLFFBQUwsQ0FBdkMsQ0FKRztTQVJMOzs7QUFuQlcsVUFtQ1gsQ0FBSyxtQkFBTCxHQUEyQixXQUFXLEtBQUssaUJBQUwsQ0FBdUIsSUFBdkIsQ0FBNEIsSUFBNUIsQ0FBWCxFQUE4QyxJQUE5QyxDQUEzQixDQW5DVzs7Ozs7Ozs7Ozs7Ozs2Q0E2Q1k7QUFDdkIsVUFBSSxLQUFLLG1CQUFMLEVBQTBCO0FBQzVCLHFCQUFhLEtBQUssbUJBQUwsQ0FBYixDQUQ0QjtBQUU1QixhQUFLLG1CQUFMLEdBQTJCLENBQTNCLENBRjRCO09BQTlCOzs7Ozs7Ozs7Ozs7O3dDQWFrQjtBQUNsQixXQUFLLG1CQUFMLEdBQTJCLENBQTNCLENBRGtCO0FBRWxCLFVBQU0sTUFBTSx1Q0FBTixDQUZZO0FBR2xCLGFBQU8sSUFBUCxDQUFZLEdBQVo7Ozs7O0FBSGtCLFVBUWQ7QUFDRixhQUFLLG1CQUFMLEdBREU7QUFFRixhQUFLLE9BQUwsQ0FBYSxLQUFiLEdBRkU7QUFHRixhQUFLLE9BQUwsR0FBZSxJQUFmLENBSEU7T0FBSixDQUlFLE9BQU0sQ0FBTixFQUFTOzs7OztBQUFULFVBS0YsQ0FBSyxRQUFMLENBQWMsSUFBSSxLQUFKLENBQVUsR0FBVixDQUFkLEVBakJrQjs7Ozs7Ozs7Ozs7OzhCQTBCVjtBQUNSLFdBQUssc0JBQUwsR0FEUTtBQUVSLFVBQUksS0FBSyxPQUFMLEVBQUosRUFBb0I7QUFDbEIsYUFBSyxvQkFBTCxHQUE0QixDQUE1QixDQURrQjtBQUVsQixhQUFLLE1BQUwsR0FBYyxJQUFkLENBRmtCO0FBR2xCLGFBQUssT0FBTCxDQUFhLFdBQWIsRUFIa0I7QUFJbEIsZUFBTyxLQUFQLENBQWEscUJBQWIsRUFKa0I7QUFLbEIsWUFBSSxLQUFLLFdBQUwsRUFBa0I7QUFDcEIsZUFBSyxZQUFMLENBQWtCLEtBQUssY0FBTCxFQUFxQixJQUF2QyxFQURvQjtTQUF0QixNQUVPO0FBQ0wsZUFBSyxlQUFMLEdBREs7U0FGUDtPQUxGOzs7OzhCQWFRO0FBQ1IsVUFBSSxDQUFDLEtBQUssT0FBTCxFQUFjLE9BQU8sS0FBUCxDQUFuQjs7QUFEUSxVQUdKLE9BQU8sU0FBUCxLQUFxQixXQUFyQixFQUFrQyxPQUFPLElBQVAsQ0FBdEM7QUFDQSxhQUFPLEtBQUssT0FBTCxJQUFnQixLQUFLLE9BQUwsQ0FBYSxVQUFiLEtBQTRCLFVBQVUsSUFBVixDQUozQzs7Ozs7Ozs7Ozs7Ozs7OzZCQWdCRCxLQUFLO0FBQ1osVUFBSSxLQUFLLFFBQUwsRUFBZSxPQUFuQjtBQUNBLFdBQUssc0JBQUwsR0FGWTtBQUdaLGFBQU8sS0FBUCxDQUFhLDRDQUFiLEVBSFk7QUFJWixVQUFJLENBQUMsS0FBSyxNQUFMLEVBQWE7QUFDaEIsYUFBSyxvQkFBTCxHQURnQjtBQUVoQixhQUFLLGtCQUFMLEdBRmdCO09BQWxCLE1BR087QUFDTCxhQUFLLGNBQUwsR0FESztBQUVMLGFBQUssT0FBTCxDQUFhLEtBQWIsR0FGSztBQUdMLGFBQUssT0FBTCxHQUFlLElBQWYsQ0FISztPQUhQOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OytCQTBCUyxNQUFNO0FBQ2YsV0FBSyxPQUFMLENBQWEsSUFBYixDQUFrQixLQUFLLFNBQUwsQ0FBZTtBQUMvQixjQUFNLFFBQU47QUFDQSxjQUFNLElBQU47T0FGZ0IsQ0FBbEIsRUFEZTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O2dDQXNCTCxNQUFNLFVBQVU7QUFDMUIsVUFBSSxDQUFDLEtBQUssT0FBTCxFQUFELEVBQWlCO0FBQ25CLGVBQU8sU0FBUyxFQUFFLFNBQVMsS0FBVCxFQUFnQixNQUFNLEVBQUUsU0FBUyx5QkFBVCxFQUFSLEVBQTNCLENBQVAsQ0FEbUI7T0FBckI7QUFHQSxVQUFNLE9BQU8sTUFBTSxLQUFOLENBQVksSUFBWixDQUFQLENBSm9CO0FBSzFCLFdBQUssVUFBTCxHQUFrQixNQUFNLEtBQUssY0FBTCxFQUFOLENBTFE7QUFNMUIsYUFBTyxLQUFQLGNBQXdCLEtBQUssVUFBTCxnQkFBeEIsRUFOMEI7QUFPMUIsVUFBSSxRQUFKLEVBQWM7QUFDWixhQUFLLGlCQUFMLENBQXVCLEtBQUssVUFBTCxDQUF2QixHQUEwQztBQUN4QyxnQkFBTSxLQUFLLEdBQUwsRUFBTjtBQUNBLG9CQUFVLFFBQVY7U0FGRixDQURZO09BQWQ7O0FBT0EsV0FBSyxPQUFMLENBQWEsSUFBYixDQUFrQixLQUFLLFNBQUwsQ0FBZTtBQUMvQixjQUFNLFNBQU47QUFDQSxjQUFNLElBQU47T0FGZ0IsQ0FBbEIsRUFkMEI7QUFrQjFCLFdBQUssd0JBQUwsR0FsQjBCOzs7Ozs7Ozs7Ozs7K0NBMkJEO0FBQ3pCLFVBQUksQ0FBQyxLQUFLLGtCQUFMLEVBQXlCO0FBQzVCLGFBQUssa0JBQUwsR0FBMEIsV0FBVyxLQUFLLG1CQUFMLENBQXlCLElBQXpCLENBQThCLElBQTlCLENBQVgsRUFBZ0Qsc0JBQXNCLEVBQXRCLENBQTFFLENBRDRCO09BQTlCOzs7Ozs7Ozs7Ozs7Ozs7MENBY29CO0FBQ3BCLFdBQUssa0JBQUwsR0FBMEIsQ0FBMUI7Ozs7QUFEb0IsVUFLaEIsS0FBSyxXQUFMLElBQW9CLENBQUMsS0FBSyxPQUFMLEVBQUQsRUFBaUIsT0FBekM7QUFDQSxVQUFJLHFCQUFKO1VBQWUsUUFBUSxDQUFSLENBTks7QUFPcEIsVUFBTSxNQUFNLEtBQUssR0FBTCxFQUFOLENBUGM7QUFRcEIsV0FBSyxTQUFMLElBQWtCLEtBQUssaUJBQUwsRUFBd0I7QUFDeEMsWUFBSSxLQUFLLGlCQUFMLENBQXVCLGNBQXZCLENBQXNDLFNBQXRDLENBQUosRUFBc0Q7OztBQUdwRCxjQUFJLE1BQU0sS0FBSyxpQkFBTCxDQUF1QixTQUF2QixFQUFrQyxJQUFsQyxHQUF5QyxtQkFBekMsRUFBOEQ7QUFDdEUsb0JBRHNFO1dBQXhFLE1BRU87O0FBRUwsZ0JBQUksTUFBTSxLQUFLLDRCQUFMLENBQWtDLE9BQWxDLEtBQThDLG1CQUE5QyxFQUFtRTtBQUMzRSxtQkFBSyxVQUFMLENBQWdCLEtBQWhCLEVBRDJFO0FBRTNFLG1CQUFLLHdCQUFMLEdBRjJFO0FBRzNFLHFCQUgyRTthQUE3RSxNQUlPOztBQUVMLG1CQUFLLGVBQUwsQ0FBcUIsU0FBckIsRUFGSzthQUpQO1dBSkY7U0FIRjtPQURGO0FBbUJBLFVBQUksS0FBSixFQUFXLEtBQUssd0JBQUwsR0FBWDs7OztvQ0FHYyxXQUFXO0FBQ3pCLFVBQUk7QUFDRixlQUFPLElBQVAsQ0FBWSwyQkFBWixFQURFO0FBRUYsYUFBSyxpQkFBTCxDQUF1QixTQUF2QixFQUFrQyxRQUFsQyxDQUEyQztBQUN6QyxtQkFBUyxLQUFUO0FBQ0EsZ0JBQU0sSUFBSSxVQUFKLENBQWU7QUFDbkIsZ0JBQUksaUJBQUo7QUFDQSxxQkFBUyxxRUFBVDtBQUNBLGlCQUFLLGtDQUFMO0FBQ0Esa0JBQU0sQ0FBTjtBQUNBLG9CQUFRLEdBQVI7QUFDQSx3QkFBWSxHQUFaO1dBTkksQ0FBTjtTQUZGLEVBRkU7T0FBSixDQWFFLE9BQU8sR0FBUCxFQUFZOztPQUFaO0FBR0YsYUFBTyxLQUFLLGlCQUFMLENBQXVCLFNBQXZCLENBQVAsQ0FqQnlCOzs7Ozs7Ozs7Ozs7Ozs7K0JBNkJoQixVQUFVO0FBQ25CLGFBQU8sS0FBUCxDQUFhLCtCQUFiLEVBRG1CO0FBRW5CLFdBQUssV0FBTCxDQUFpQjtBQUNmLGdCQUFRLGNBQVI7O09BREYsRUFHRyxVQUFDLE1BQUQsRUFBWTtBQUNiLGVBQU8sS0FBUCxDQUFhLG9DQUFvQyxPQUFPLElBQVAsQ0FBWSxPQUFaLENBQWpELENBRGE7QUFFYixZQUFJLFFBQUosRUFBYztBQUNaLGNBQUksT0FBTyxPQUFQLEVBQWdCO0FBQ2xCLHFCQUFTLElBQVQsRUFBZSxPQUFPLElBQVAsQ0FBWSxPQUFaLEVBQXFCLE9BQU8sUUFBUCxDQUFnQixPQUFoQixDQUFwQyxDQURrQjtXQUFwQixNQUVPO0FBQ0wscUJBQVMsS0FBVCxFQURLO1dBRlA7U0FERjtPQUZDLENBSEgsQ0FGbUI7Ozs7Ozs7Ozs7Ozs7O2lDQXlCUixXQUFXLE9BQU8sVUFBVTs7O0FBQ3ZDLFVBQUksQ0FBQyxLQUFLLE9BQUwsRUFBRCxJQUFtQixDQUFDLFNBQUQsRUFBWSxPQUFuQztBQUNBLFVBQUksS0FBSixFQUFXLEtBQUssU0FBTCxHQUFpQixLQUFqQixDQUFYOzs7O0FBRnVDLFVBTW5DLEtBQUssU0FBTCxFQUFnQjtBQUNsQixZQUFJLENBQUMsS0FBSyxnQkFBTCxFQUF1QjtBQUMxQixpQkFBTyxLQUFQLENBQWEsMkRBQWIsRUFEMEI7QUFFMUIsZUFBSyxnQkFBTCxHQUF3QixTQUF4QixDQUYwQjtTQUE1QjtPQURGLE1BS087QUFDTCxhQUFLLFNBQUwsR0FBaUIsSUFBakIsQ0FESztBQUVMLGVBQU8sSUFBUCxDQUFZLGlDQUFaLEVBRks7QUFHTCxhQUFLLFdBQUwsQ0FBaUI7QUFDZixrQkFBUSxjQUFSO0FBQ0EsZ0JBQU07QUFDSiw0QkFBZ0IsU0FBaEI7V0FERjtTQUZGLEVBS0c7aUJBQVUsT0FBSyxxQkFBTCxDQUEyQixTQUEzQixFQUFzQyxRQUF0QyxFQUFnRCxPQUFPLE9BQVA7U0FBMUQsQ0FMSCxDQUhLO09BTFA7Ozs7Ozs7Ozs7Ozs7OzswQ0EwQm9CLFdBQVcsVUFBVSxTQUFTO0FBQ2xELFdBQUssU0FBTCxHQUFpQixLQUFqQjs7OztBQURrRCxVQUs5QyxXQUFXLENBQUMsS0FBSyxnQkFBTCxFQUF1QjtBQUNyQyxlQUFPLElBQVAsQ0FBWSwyQkFBWixFQURxQztBQUVyQyxhQUFLLE9BQUwsQ0FBYSxRQUFiLEVBRnFDO0FBR3JDLFlBQUksUUFBSixFQUFjLFdBQWQ7Ozs7O0FBSEYsV0FRSyxJQUFJLFdBQVcsS0FBSyxnQkFBTCxFQUF1QjtBQUN6QyxpQkFBTyxJQUFQLENBQVkscUNBQVosRUFEeUM7QUFFekMsY0FBTSxJQUFJLEtBQUssZ0JBQUwsQ0FGK0I7QUFHekMsZUFBSyxnQkFBTCxHQUF3QixJQUF4QixDQUh5QztBQUl6QyxlQUFLLFlBQUwsQ0FBa0IsQ0FBbEIsRUFKeUM7Ozs7OztBQUF0QyxhQVVBO0FBQ0gsbUJBQU8sSUFBUCxDQUFZLHdCQUFaLEVBREc7QUFFSCxpQkFBSyxZQUFMLENBQWtCLFNBQWxCLEVBRkc7V0FWQTs7Ozs7Ozs7Ozs7Ozs7K0JBeUJJLEtBQUs7QUFDZCxhQUFPLEtBQUssTUFBTCxDQUFZLFVBQVosQ0FBdUIsSUFBSSxNQUFKLENBQVcsRUFBWCxDQUE5QixDQURjOzs7Ozs7Ozs7Ozs7OytCQVdMLEtBQUs7QUFDZCxXQUFLLG9CQUFMLEdBQTRCLENBQTVCLENBRGM7QUFFZCxVQUFJO0FBQ0YsWUFBTSxNQUFNLEtBQUssS0FBTCxDQUFXLElBQUksSUFBSixDQUFqQixDQURKO0FBRUYsWUFBTSxpQkFBaUIsS0FBSyxZQUFMLEdBQW9CLENBQXBCLEtBQTBCLElBQUksT0FBSixDQUYvQztBQUdGLGFBQUssV0FBTCxHQUFtQixJQUFuQixDQUhFO0FBSUYsYUFBSyxZQUFMLEdBQW9CLElBQUksT0FBSixDQUpsQjtBQUtGLGFBQUssNEJBQUwsR0FBb0MsSUFBSSxJQUFKLEVBQXBDOzs7O0FBTEUsWUFTRSxjQUFKLEVBQW9CO0FBQ2xCLGVBQUssWUFBTCxDQUFrQixLQUFLLGNBQUwsQ0FBbEIsQ0FEa0I7U0FBcEIsTUFFTztBQUNMLGVBQUssY0FBTCxHQUFzQixJQUFJLElBQUosQ0FBUyxJQUFJLFNBQUosQ0FBL0IsQ0FESztTQUZQOztBQU1BLGFBQUssZUFBTCxDQUFxQixHQUFyQixFQWZFO0FBZ0JGLGFBQUssZUFBTCxHQWhCRTtPQUFKLENBaUJFLE9BQU8sR0FBUCxFQUFZO0FBQ1osZUFBTyxLQUFQLENBQWEsMERBQTBELEdBQTFELEdBQWdFLElBQWhFLEVBQXNFLElBQUksSUFBSixDQUFuRixDQURZO09BQVo7Ozs7Ozs7Ozs7Ozs7Ozs7OztvQ0FpQlksS0FBSztBQUNuQixVQUFJO0FBQ0YsZ0JBQVEsSUFBSSxJQUFKO0FBQ04sZUFBSyxRQUFMO0FBQ0UsaUJBQUssYUFBTCxDQUFtQixJQUFJLElBQUosQ0FBbkIsQ0FERjtBQUVFLGtCQUZGO0FBREYsZUFJTyxVQUFMO0FBQ0UsaUJBQUssZUFBTCxDQUFxQixHQUFyQixFQURGO0FBRUUsa0JBRkY7QUFKRixTQURFO09BQUosQ0FTRSxPQUFPLEdBQVAsRUFBWTs7T0FBWjtBQUdGLFVBQUk7QUFDRixhQUFLLE9BQUwsQ0FBYSxTQUFiLEVBQXdCO0FBQ3RCLGdCQUFNLEdBQU47U0FERixFQURFO09BQUosQ0FJRSxPQUFPLEdBQVAsRUFBWTs7T0FBWjs7Ozs7Ozs7Ozs7OztvQ0FZWSxRQUFRO0FBQ3RCLFVBQU0sTUFBTSxPQUFPLElBQVAsQ0FEVTtBQUV0QixVQUFNLFlBQVksSUFBSSxVQUFKLENBRkk7QUFHdEIsVUFBTSxPQUFPLElBQUksT0FBSixHQUFjLElBQUksSUFBSixHQUFXLElBQUksVUFBSixDQUFlLElBQUksSUFBSixDQUF4QyxDQUhTO0FBSXRCLGFBQU8sS0FBUCx5QkFBbUMsbUJBQWEsSUFBSSxPQUFKLEdBQWMsWUFBZCxHQUE2QixRQUE3QixDQUFoRCxFQUpzQjtBQUt0QixVQUFJLGFBQWEsS0FBSyxpQkFBTCxDQUF1QixTQUF2QixDQUFiLEVBQWdEO0FBQ2xELGFBQUssaUJBQUwsQ0FBdUIsU0FBdkIsRUFBa0MsUUFBbEMsQ0FBMkM7QUFDekMsbUJBQVMsSUFBSSxPQUFKO0FBQ1QsZ0JBQU0sSUFBTjtBQUNBLG9CQUFVLE1BQVY7U0FIRixFQURrRDtBQU1sRCxlQUFPLEtBQUssaUJBQUwsQ0FBdUIsU0FBdkIsQ0FBUCxDQU5rRDtPQUFwRDs7Ozs7Ozs7Ozs7OztrQ0FpQlksS0FBSztBQUNqQixjQUFRLElBQUksU0FBSjtBQUNOLGFBQUssUUFBTDtBQUNFLGlCQUFPLElBQVAscUNBQThDLElBQUksTUFBSixDQUFXLElBQVgsU0FBbUIsSUFBSSxNQUFKLENBQVcsRUFBWCxDQUFqRSxDQURGO0FBRUUsaUJBQU8sS0FBUCxDQUFhLElBQUksSUFBSixDQUFiLENBRkY7QUFHRSxlQUFLLGFBQUwsQ0FBbUIsR0FBbkIsRUFIRjtBQUlFLGdCQUpGO0FBREYsYUFNTyxRQUFMO0FBQ0UsaUJBQU8sSUFBUCxzQ0FBK0MsSUFBSSxNQUFKLENBQVcsSUFBWCxTQUFtQixJQUFJLE1BQUosQ0FBVyxFQUFYLENBQWxFLENBREY7QUFFRSxpQkFBTyxLQUFQLENBQWEsSUFBSSxJQUFKLENBQWIsQ0FGRjtBQUdFLGVBQUssYUFBTCxDQUFtQixHQUFuQixFQUhGO0FBSUUsZ0JBSkY7QUFORixhQVdPLE9BQUw7QUFDRSxpQkFBTyxJQUFQLHFDQUE4QyxJQUFJLE1BQUosQ0FBVyxJQUFYLFNBQW1CLElBQUksTUFBSixDQUFXLEVBQVgsVUFBa0IsSUFBSSxJQUFKLENBQVMsR0FBVCxDQUFhO21CQUFNLEdBQUcsUUFBSDtXQUFOLENBQWIsQ0FBZ0MsSUFBaEMsQ0FBcUMsSUFBckMsQ0FBbkYsRUFERjtBQUVFLGlCQUFPLEtBQVAsQ0FBYSxJQUFJLElBQUosQ0FBYixDQUZGO0FBR0UsZUFBSyxZQUFMLENBQWtCLEdBQWxCLEVBSEY7QUFJRSxnQkFKRjtBQVhGLE9BRGlCOzs7Ozs7Ozs7Ozs7O2tDQTJCTCxLQUFLO0FBQ2pCLFVBQUksSUFBSixDQUFTLGFBQVQsR0FBeUIsSUFBekIsQ0FEaUI7QUFFakIsV0FBSyxNQUFMLENBQVksYUFBWixDQUEwQixJQUFJLElBQUosQ0FBMUIsQ0FGaUI7Ozs7Ozs7Ozs7Ozs7OztrQ0FjTCxLQUFLO0FBQ2pCLFVBQU0sU0FBUyxLQUFLLFVBQUwsQ0FBZ0IsR0FBaEIsQ0FBVCxDQURXO0FBRWpCLFVBQUksTUFBSixFQUFZO0FBQ1YsZUFBTyxRQUFQLEdBRFU7QUFFVixlQUFPLE9BQVAsR0FGVTtPQUFaOzs7Ozs7Ozs7Ozs7OztpQ0FjVyxLQUFLOztBQUVoQixVQUFNLFNBQVMsS0FBSyxVQUFMLENBQWdCLEdBQWhCLENBQVQsQ0FGVTtBQUdoQixVQUFJLE1BQUosRUFBWTtBQUNWLFlBQUk7QUFDRixpQkFBTyxjQUFQLEdBQXdCLElBQXhCLENBREU7QUFFRixnQkFBTSxVQUFOLENBQWlCO0FBQ2Ysb0JBQVEsTUFBUjtBQUNBLGtCQUFNLElBQUksTUFBSixDQUFXLElBQVg7QUFDTix3QkFBWSxJQUFJLElBQUo7QUFDWixvQkFBUSxLQUFLLE1BQUw7V0FKVixFQUZFO0FBUUYsaUJBQU8sY0FBUCxHQUF3QixLQUF4QixDQVJFO1NBQUosQ0FTRSxPQUFPLEdBQVAsRUFBWTtBQUNaLGlCQUFPLEtBQVAsQ0FBYSwyQ0FBYixFQUEwRCxJQUFJLElBQUosQ0FBMUQsQ0FEWTtTQUFaO09BVkosTUFhTyxJQUFJLE1BQU0sVUFBTixDQUFpQixJQUFJLE1BQUosQ0FBVyxFQUFYLENBQWpCLEtBQW9DLGVBQXBDLEVBQXFEO0FBQzlELFlBQUksYUFBYSxxQkFBYixDQUFtQyxJQUFJLElBQUosQ0FBdkMsRUFBa0QsS0FBSyxNQUFMLENBQVksZUFBWixDQUE0QixJQUFJLE1BQUosQ0FBVyxFQUFYLEVBQWUsSUFBM0MsRUFBbEQ7T0FESyxNQUVBLElBQUksTUFBTSxVQUFOLENBQWlCLElBQUksTUFBSixDQUFXLEVBQVgsQ0FBakIsS0FBb0MsVUFBcEMsRUFBZ0Q7QUFDekQsWUFBSSxRQUFRLHFCQUFSLENBQThCLElBQUksSUFBSixDQUFsQyxFQUE2QyxLQUFLLE1BQUwsQ0FBWSxVQUFaLENBQXVCLElBQUksTUFBSixDQUFXLEVBQVgsRUFBZSxJQUF0QyxFQUE3QztPQURLOzs7Ozs7Ozs7Ozs7O3NDQVlTO0FBQ2hCLFVBQUksS0FBSyxXQUFMLEVBQWtCO0FBQ3BCLHFCQUFhLEtBQUssV0FBTCxDQUFiLENBRG9CO09BQXRCO0FBR0EsV0FBSyxXQUFMLEdBQW1CLFdBQVcsS0FBSyxLQUFMLENBQVcsSUFBWCxDQUFnQixJQUFoQixDQUFYLEVBQWtDLEtBQUssYUFBTCxDQUFyRCxDQUpnQjs7Ozs7Ozs7Ozs7Ozs0QkFjVjtBQUNOLGFBQU8sS0FBUCxDQUFhLGdCQUFiLEVBRE07QUFFTixXQUFLLFdBQUwsR0FBbUIsQ0FBbkIsQ0FGTTtBQUdOLFVBQUksS0FBSyxPQUFMLEVBQUosRUFBb0I7O0FBRWxCLGFBQUssVUFBTCxDQUFnQixLQUFLLGVBQUwsQ0FBcUIsSUFBckIsQ0FBMEIsSUFBMUIsQ0FBaEIsRUFGa0I7T0FBcEI7Ozs7Ozs7Ozs7OzRCQVlNO0FBQ04sYUFBTyxLQUFQLENBQWEsMkJBQWIsRUFETTtBQUVOLFdBQUssUUFBTCxHQUFnQixJQUFoQixDQUZNO0FBR04sVUFBSSxLQUFLLE9BQUwsRUFBYzs7Ozs7QUFLaEIsYUFBSyxjQUFMLEdBTGdCO0FBTWhCLGFBQUssT0FBTCxDQUFhLEtBQWIsR0FOZ0I7QUFPaEIsYUFBSyxPQUFMLEdBQWUsSUFBZixDQVBnQjtPQUFsQjs7Ozs4QkFXUTtBQUNSLFdBQUssS0FBTCxHQURRO0FBRVIsVUFBSSxLQUFLLGtCQUFMLEVBQXlCLGFBQWEsS0FBSyxrQkFBTCxDQUFiLENBQTdCO0FBQ0EsVUFBSSxLQUFLLFdBQUwsRUFBa0IsYUFBYSxLQUFLLFdBQUwsQ0FBYixDQUF0QjtBQUNBLFdBQUssaUJBQUwsR0FBeUIsSUFBekIsQ0FKUTtBQUtSLGlDQXRyQkUsd0RBc3JCRixDQUxROzs7Ozs7Ozs7Ozs7O3FDQWVPO0FBQ2YsYUFBTyxLQUFQLENBQWEsa0JBQWIsRUFEZTtBQUVmLFdBQUssTUFBTCxHQUFjLEtBQWQsQ0FGZTtBQUdmLFVBQUksQ0FBQyxLQUFLLFFBQUwsRUFBZTtBQUNsQixhQUFLLGtCQUFMLEdBRGtCO09BQXBCOztBQUlBLFdBQUssbUJBQUwsR0FQZTtBQVFmLFdBQUssT0FBTCxDQUFhLGNBQWIsRUFSZTs7Ozs7Ozs7Ozs7OzBDQWlCSzs7QUFFcEIsVUFBSSxPQUFPLFNBQVAsS0FBcUIsV0FBckIsSUFBb0MsS0FBSyxPQUFMLEVBQWM7QUFDcEQsYUFBSyxPQUFMLENBQWEsbUJBQWIsQ0FBaUMsU0FBakMsRUFBNEMsS0FBSyxVQUFMLENBQTVDLENBRG9EO0FBRXBELGFBQUssT0FBTCxDQUFhLG1CQUFiLENBQWlDLE9BQWpDLEVBQTBDLEtBQUssY0FBTCxDQUExQyxDQUZvRDtBQUdwRCxhQUFLLE9BQUwsQ0FBYSxtQkFBYixDQUFpQyxNQUFqQyxFQUF5QyxLQUFLLE9BQUwsQ0FBekMsQ0FIb0Q7QUFJcEQsYUFBSyxPQUFMLENBQWEsbUJBQWIsQ0FBaUMsT0FBakMsRUFBMEMsS0FBSyxRQUFMLENBQTFDLENBSm9EO09BQXRELE1BS08sSUFBSSxLQUFLLE9BQUwsRUFBYztBQUN2QixhQUFLLE9BQUwsQ0FBYSxTQUFiLEdBQXlCLElBQXpCLENBRHVCO0FBRXZCLGFBQUssT0FBTCxDQUFhLE9BQWIsR0FBdUIsSUFBdkIsQ0FGdUI7QUFHdkIsYUFBSyxPQUFMLENBQWEsTUFBYixHQUFzQixJQUF0QixDQUh1QjtBQUl2QixhQUFLLE9BQUwsQ0FBYSxPQUFiLEdBQXVCLElBQXZCLENBSnVCO09BQWxCOzs7Ozs7Ozs7Ozs7Ozs7Ozt5Q0FtQlk7QUFDbkIsVUFBSSxLQUFLLFdBQUwsSUFBb0IsQ0FBQyxLQUFLLE1BQUwsQ0FBWSxRQUFaLEVBQXNCLE9BQS9DOztBQUVBLFVBQU0sV0FBVyxDQUFDLEtBQUssTUFBTCxDQUFZLGFBQVosQ0FBMEIsYUFBMUIsR0FBMEMsSUFBMUMsQ0FBRCxHQUFtRCxJQUFuRCxDQUhFO0FBSW5CLFVBQU0sUUFBUSxNQUFNLDRCQUFOLENBQW1DLFFBQW5DLEVBQTZDLEtBQUssR0FBTCxDQUFTLEVBQVQsRUFBYSxLQUFLLG9CQUFMLENBQTFELENBQVIsQ0FKYTtBQUtuQixhQUFPLEtBQVAsQ0FBYSw0QkFBNEIsS0FBNUIsR0FBb0MsVUFBcEMsQ0FBYixDQUxtQjtBQU1uQixXQUFLLFlBQUwsR0FBb0IsV0FBVyxLQUFLLE9BQUwsQ0FBYSxJQUFiLENBQWtCLElBQWxCLENBQVgsRUFBb0MsS0FBcEMsQ0FBcEIsQ0FObUI7Ozs7U0EzdUJqQjtFQUF5Qjs7Ozs7Ozs7O0FBMHZCL0IsaUJBQWlCLFNBQWpCLENBQTJCLE1BQTNCLEdBQW9DLEtBQXBDOzs7Ozs7O0FBT0EsaUJBQWlCLFNBQWpCLENBQTJCLFlBQTNCLEdBQTBDLENBQTFDOztBQUVBLGlCQUFpQixTQUFqQixDQUEyQixjQUEzQixHQUE0QyxDQUE1Qzs7Ozs7OztBQU9BLGlCQUFpQixTQUFqQixDQUEyQixtQkFBM0IsR0FBaUQsQ0FBakQ7O0FBRUEsaUJBQWlCLFNBQWpCLENBQTJCLGNBQTNCLEdBQTRDLElBQTVDO0FBQ0EsaUJBQWlCLFNBQWpCLENBQTJCLDRCQUEzQixHQUEwRCxJQUExRDtBQUNBLGlCQUFpQixTQUFqQixDQUEyQixZQUEzQixHQUEwQyxJQUExQztBQUNBLGlCQUFpQixTQUFqQixDQUEyQixXQUEzQixHQUF5QyxLQUF6Qzs7QUFFQSxpQkFBaUIsU0FBakIsQ0FBMkIsU0FBM0IsR0FBdUMsS0FBdkM7QUFDQSxpQkFBaUIsU0FBakIsQ0FBMkIsZ0JBQTNCLEdBQThDLElBQTlDOzs7Ozs7O0FBT0EsaUJBQWlCLFNBQWpCLENBQTJCLGFBQTNCLEdBQTJDLEtBQTNDOzs7Ozs7QUFNQSxpQkFBaUIsU0FBakIsQ0FBMkIsTUFBM0IsR0FBb0MsSUFBcEM7Ozs7OztBQU1BLGlCQUFpQixTQUFqQixDQUEyQixPQUEzQixHQUFxQyxJQUFyQzs7Ozs7OztBQU9BLGlCQUFpQixTQUFqQixDQUEyQixRQUEzQixHQUFzQyxLQUF0Qzs7Ozs7O0FBTUEsaUJBQWlCLFNBQWpCLENBQTJCLG9CQUEzQixHQUFrRCxDQUFsRDs7QUFHQSxpQkFBaUIsZ0JBQWpCLEdBQW9DOzs7Ozs7O0FBT2xDLFNBUGtDOzs7Ozs7O0FBY2xDLFdBZGtDOzs7Ozs7O0FBcUJsQyxjQXJCa0M7Ozs7OztBQTJCbEMsU0EzQmtDOzs7Ozs7QUFpQ2xDLFFBakNrQyxFQWtDbEMsTUFsQ2tDLENBa0MzQixLQUFLLGdCQUFMLENBbENUO0FBbUNBLEtBQUssU0FBTCxDQUFlLEtBQWYsQ0FBcUIsZ0JBQXJCLEVBQXVDLENBQUMsZ0JBQUQsRUFBbUIsa0JBQW5CLENBQXZDO0FBQ0EsT0FBTyxPQUFQLEdBQWlCLGdCQUFqQiIsImZpbGUiOiJ3ZWJzb2NrZXQtbWFuYWdlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVGhpcyBjb21wb25lbnQgbWFuYWdlc1xuICpcbiAqIDEuIHJlY2lldmluZyB3ZWJzb2NrZXQgZXZlbnRzXG4gKiAyLiBQcm9jZXNzaW5nIHRoZW1cbiAqIDMuIFRyaWdnZXJpbmcgZXZlbnRzIG9uIGNvbXBsZXRpbmcgdGhlbVxuICogNC4gU2VuZGluZyB0aGVtXG4gKlxuICogQXBwbGljYXRpb25zIHR5cGljYWxseSBkbyBub3QgaW50ZXJhY3Qgd2l0aCB0aGlzIGNvbXBvbmVudCwgYnV0IG1heSBzdWJzY3JpYmVcbiAqIHRvIHRoZSBgbWVzc2FnZWAgZXZlbnQgaWYgdGhleSB3YW50IHJpY2hlciBldmVudCBpbmZvcm1hdGlvbiB0aGFuIGlzIGF2YWlsYWJsZVxuICogdGhyb3VnaCB0aGUgbGF5ZXIuQ2xpZW50IGNsYXNzLlxuICpcbiAqIEBjbGFzcyAgbGF5ZXIuV2Vic29ja2V0TWFuYWdlclxuICogQGV4dGVuZHMgbGF5ZXIuUm9vdFxuICogQHByaXZhdGVcbiAqXG4gKiBUT0RPOiBOZWVkIHRvIG1ha2UgYmV0dGVyIHVzZSBvZiBpbmZvIGZyb20gdGhlIGxheWVyLk9ubGluZVN0YXRlTWFuYWdlci5cbiAqL1xuY29uc3QgUm9vdCA9IHJlcXVpcmUoJy4vcm9vdCcpO1xuY29uc3QgVXRpbHMgPSByZXF1aXJlKCcuL2NsaWVudC11dGlscycpO1xuY29uc3QgTGF5ZXJFcnJvciA9IHJlcXVpcmUoJy4vbGF5ZXItZXJyb3InKTtcbmNvbnN0IGxvZ2dlciA9IHJlcXVpcmUoJy4vbG9nZ2VyJyk7XG5jb25zdCBNZXNzYWdlID0gcmVxdWlyZSgnLi9tZXNzYWdlJyk7XG5jb25zdCBDb252ZXJzYXRpb24gPSByZXF1aXJlKCcuL2NvbnZlcnNhdGlvbicpO1xuXG4vLyBXYWl0IDE1IHNlY29uZHMgZm9yIGEgcmVzcG9uc2UgYW5kIHRoZW4gZ2l2ZSB1cFxuY29uc3QgREVMQVlfVU5USUxfVElNRU9VVCA9IDE1ICogMTAwMDtcblxuY2xhc3MgV2Vic29ja2V0TWFuYWdlciBleHRlbmRzIFJvb3Qge1xuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IHdlYnNvY2tldCBtYW5hZ2VyXG4gICAqXG4gICAqICAgICAgdmFyIHdlYnNvY2tldE1hbmFnZXIgPSBuZXcgbGF5ZXIuV2Vic29ja2V0TWFuYWdlcih7XG4gICAqICAgICAgICAgIGNsaWVudDogY2xpZW50LFxuICAgKiAgICAgIH0pO1xuICAgKlxuICAgKiBAbWV0aG9kXG4gICAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9uc1xuICAgKiBAcGFyYW0ge2xheWVyLkNsaWVudH0gY2xpZW50XG4gICAqIEByZXR1cm4ge2xheWVyLldlYnNvY2tldE1hbmFnZXJ9XG4gICAqL1xuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucyk7XG4gICAgaWYgKCF0aGlzLmNsaWVudCkgdGhyb3cgbmV3IEVycm9yKCdXZWJzb2NrZXRNYW5hZ2VyIHJlcXVpcmVzIGEgY2xpZW50Jyk7XG5cbiAgICAvLyBJbnN1cmUgdGhhdCBvbi9vZmYgbWV0aG9kcyBkb24ndCBuZWVkIHRvIGNhbGwgYmluZCwgdGhlcmVmb3JlIG1ha2luZyBpdCBlYXN5XG4gICAgLy8gdG8gYWRkL3JlbW92ZSBmdW5jdGlvbnMgYXMgZXZlbnQgbGlzdGVuZXJzLlxuICAgIHRoaXMuX29uTWVzc2FnZSA9IHRoaXMuX29uTWVzc2FnZS5iaW5kKHRoaXMpO1xuICAgIHRoaXMuX29uT3BlbiA9IHRoaXMuX29uT3Blbi5iaW5kKHRoaXMpO1xuICAgIHRoaXMuX29uU29ja2V0Q2xvc2UgPSB0aGlzLl9vblNvY2tldENsb3NlLmJpbmQodGhpcyk7XG4gICAgdGhpcy5fb25FcnJvciA9IHRoaXMuX29uRXJyb3IuYmluZCh0aGlzKTtcblxuICAgIHRoaXMuX3JlcXVlc3RDYWxsYmFja3MgPSB7fTtcblxuICAgIC8vIElmIHRoZSBjbGllbnQgaXMgYXV0aGVudGljYXRlZCwgc3RhcnQgaXQgdXAuXG4gICAgaWYgKHRoaXMuY2xpZW50LmlzQXV0aGVudGljYXRlZCAmJiB0aGlzLmNsaWVudC5vbmxpbmVNYW5hZ2VyLmlzT25saW5lKSB7XG4gICAgICB0aGlzLmNvbm5lY3QoKTtcbiAgICB9XG5cbiAgICB0aGlzLmNsaWVudC5vbignb25saW5lJywgdGhpcy5fb25saW5lU3RhdGVDaGFuZ2UsIHRoaXMpO1xuXG4gICAgLy8gQW55IHRpbWUgdGhlIENsaWVudCB0cmlnZ2VycyBhIHJlYWR5IGV2ZW50IHdlIG5lZWQgdG8gcmVjb25uZWN0LlxuICAgIHRoaXMuY2xpZW50Lm9uKCdhdXRoZW50aWNhdGVkJywgdGhpcy5jb25uZWN0LCB0aGlzKTtcblxuICAgIHRoaXMuX2xhc3RUaW1lc3RhbXAgPSBuZXcgRGF0ZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGwgdGhpcyB3aGVuIHdlIHdhbnQgdG8gcmVzZXQgYWxsIHdlYnNvY2tldCBzdGF0ZTsgdGhpcyB3b3VsZCBiZSBkb25lIGFmdGVyIGEgbGVuZ3RoeSBwZXJpb2RcbiAgICogb2YgYmVpbmcgZGlzY29ubmVjdGVkLiAgVGhpcyBwcmV2ZW50cyBFdmVudC5yZXBsYXkgZnJvbSBiZWluZyBjYWxsZWQgb24gcmVjb25uZWN0aW5nLlxuICAgKlxuICAgKiBAbWV0aG9kIF9yZXNldFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3Jlc2V0KCkge1xuICAgIHRoaXMuX2xhc3RUaW1lc3RhbXAgPSBudWxsO1xuICAgIHRoaXMuX2xhc3REYXRhRnJvbVNlcnZlclRpbWVzdGFtcCA9IG51bGw7XG4gICAgdGhpcy5fbGFzdENvdW50ZXIgPSBudWxsO1xuICAgIHRoaXMuX2hhc0NvdW50ZXIgPSBmYWxzZTtcblxuICAgIHRoaXMuX2luUmVwbGF5ID0gZmFsc2U7XG4gICAgdGhpcy5fbmVlZHNSZXBsYXlGcm9tID0gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBFdmVudCBoYW5kbGVyIGlzIHRyaWdnZXJlZCBhbnkgdGltZSB0aGUgY2xpZW50J3Mgb25saW5lIHN0YXRlIGNoYW5nZXMuXG4gICAqIElmIGdvaW5nIG9ubGluZSB3ZSBuZWVkIHRvIHJlY29ubmVjdCAoaS5lLiB3aWxsIGNsb3NlIGFueSBleGlzdGluZyB3ZWJzb2NrZXQgY29ubmVjdGlvbnMgYW5kIHRoZW4gb3BlbiBhIG5ldyBjb25uZWN0aW9uKVxuICAgKiBJZiBnb2luZyBvZmZsaW5lLCBjbG9zZSB0aGUgd2Vic29ja2V0IGFzIGl0cyBubyBsb25nZXIgdXNlZnVsL3JlbGV2YW50LlxuICAgKiBAbWV0aG9kIF9vbmxpbmVTdGF0ZUNoYW5nZVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge2xheWVyLkxheWVyRXZlbnR9IGV2dFxuICAgKi9cbiAgX29ubGluZVN0YXRlQ2hhbmdlKGV2dCkge1xuICAgIGlmICghdGhpcy5jbGllbnQuaXNBdXRoZW50aWNhdGVkKSByZXR1cm47XG4gICAgaWYgKGV2dC5pc09ubGluZSkge1xuICAgICAgdGhpcy5fcmVjb25uZWN0KGV2dC5yZXNldCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVjb25uZWN0IHRvIHRoZSBzZXJ2ZXIsIG9wdGlvbmFsbHkgcmVzZXR0aW5nIGFsbCBkYXRhIGlmIG5lZWRlZC5cbiAgICogQG1ldGhvZCBfcmVjb25uZWN0XG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gcmVzZXRcbiAgICovXG4gIF9yZWNvbm5lY3QocmVzZXQpIHtcbiAgICAvLyBUaGUgc3luYyBtYW5hZ2VyIHdpbGwgcmVpc3N1ZSBhbnkgcmVxdWVzdHMgb25jZSBpdCByZWNlaXZlcyBhICdjb25uZWN0JyBldmVudCBmcm9tIHRoZSB3ZWJzb2NrZXQgbWFuYWdlci5cbiAgICAvLyBUaGVyZSBpcyBubyBuZWVkIHRvIGhhdmUgYW4gZXJyb3IgY2FsbGJhY2sgYXQgdGhpcyB0aW1lLlxuICAgIC8vIE5vdGUgdGhhdCBjYWxscyB0aGF0IGNvbWUgZnJvbSBzb3VyY2VzIG90aGVyIHRoYW4gdGhlIHN5bmMgbWFuYWdlciBtYXkgc3VmZmVyIGZyb20gdGhpcy5cbiAgICAvLyBPbmNlIHRoZSB3ZWJzb2NrZXQgaW1wbGVtZW50cyByZXRyeSByYXRoZXIgdGhhbiB0aGUgc3luYyBtYW5hZ2VyLCB3ZSBtYXkgbmVlZCB0byBlbmFibGUgaXRcbiAgICAvLyB0byB0cmlnZ2VyIGEgY2FsbGJhY2sgYWZ0ZXIgc3VmZmljaWVudCB0aW1lLiAgSnVzdCBkZWxldGUgYWxsIGNhbGxiYWNrcy5cbiAgICB0aGlzLl9yZXF1ZXN0Q2FsbGJhY2tzID0ge307XG4gICAgdGhpcy5jbG9zZSgpO1xuICAgIGlmIChyZXNldCkgdGhpcy5fcmVzZXQoKTtcbiAgICB0aGlzLmNvbm5lY3QoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb25uZWN0IHRvIHRoZSB3ZWJzb2NrZXQgc2VydmVyXG4gICAqXG4gICAqIEBtZXRob2RcbiAgICogQHBhcmFtICB7bGF5ZXIuU3luY0V2ZW50fSBldnQgLSBJZ25vcmVkIHBhcmFtZXRlclxuICAgKi9cbiAgY29ubmVjdChldnQpIHtcbiAgICBpZiAodGhpcy5jbGllbnQuaXNEZXN0cm95ZWQgfHwgIXRoaXMuY2xpZW50LmlzT25saW5lKSByZXR1cm47XG5cbiAgICB0aGlzLl9jbG9zaW5nID0gZmFsc2U7XG5cbiAgICB0aGlzLl9sYXN0Q291bnRlciA9IC0xO1xuXG4gICAgLy8gTG9hZCB1cCBvdXIgd2Vic29ja2V0IGNvbXBvbmVudCBvciBzaGltXG4gICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgICBjb25zdCBXUyA9IHR5cGVvZiBXZWJTb2NrZXQgPT09ICd1bmRlZmluZWQnID8gcmVxdWlyZSgnd2Vic29ja2V0JykudzNjd2Vic29ja2V0IDogV2ViU29ja2V0O1xuXG4gICAgLy8gR2V0IHRoZSBVUkwgYW5kIGNvbm5lY3QgdG8gaXRcbiAgICBjb25zdCB1cmwgPSB0aGlzLmNsaWVudC51cmwucmVwbGFjZSgvXmh0dHAvLCAnd3MnKSArXG4gICAgICAnL3dlYnNvY2tldD9zZXNzaW9uX3Rva2VuPScgK1xuICAgICAgdGhpcy5jbGllbnQuc2Vzc2lvblRva2VuO1xuICAgIHRoaXMuX3NvY2tldCA9IG5ldyBXUyh1cmwsICdsYXllci0xLjAnKTtcblxuICAgIC8vIElmIGl0cyB0aGUgc2hpbSwgc2V0IHRoZSBldmVudCBoYW5sZXJzXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKHR5cGVvZiBXZWJTb2NrZXQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzLl9zb2NrZXQub25tZXNzYWdlID0gdGhpcy5fb25NZXNzYWdlO1xuICAgICAgdGhpcy5fc29ja2V0Lm9uY2xvc2UgPSB0aGlzLl9vblNvY2tldENsb3NlO1xuICAgICAgdGhpcy5fc29ja2V0Lm9ub3BlbiA9IHRoaXMuX29uT3BlbjtcbiAgICAgIHRoaXMuX3NvY2tldC5vbmVycm9yID0gdGhpcy5fb25FcnJvcjtcbiAgICB9XG5cbiAgICAvLyBJZiBpdHMgYSByZWFsIHdlYnNvY2tldCwgYWRkIHRoZSBldmVudCBoYW5kbGVyc1xuICAgIGVsc2Uge1xuICAgICAgdGhpcy5fc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCB0aGlzLl9vbk1lc3NhZ2UpO1xuICAgICAgdGhpcy5fc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgdGhpcy5fb25Tb2NrZXRDbG9zZSk7XG4gICAgICB0aGlzLl9zb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcignb3BlbicsIHRoaXMuX29uT3Blbik7XG4gICAgICB0aGlzLl9zb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCB0aGlzLl9vbkVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBUcmlnZ2VyIGEgZmFpbHVyZSBpZiBpdCB0YWtlcyA+PSA1IHNlY29uZHMgdG8gZXN0YWJsaXNoIGEgY29ubmVjdGlvblxuICAgIHRoaXMuX2Nvbm5lY3Rpb25GYWlsZWRJZCA9IHNldFRpbWVvdXQodGhpcy5fY29ubmVjdGlvbkZhaWxlZC5iaW5kKHRoaXMpLCA1MDAwKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhcnMgdGhlIHNjaGVkdWxlZCBjYWxsIHRvIF9jb25uZWN0aW9uRmFpbGVkIHRoYXQgaXMgdXNlZCB0byBpbnN1cmUgdGhlIHdlYnNvY2tldCBkb2VzIG5vdCBnZXQgc3R1Y2tcbiAgICogaW4gQ09OTkVDVElORyBzdGF0ZS4gVGhpcyBjYWxsIGlzIHVzZWQgYWZ0ZXIgdGhlIGNhbGwgaGFzIGNvbXBsZXRlZCBvciBmYWlsZWQuXG4gICAqXG4gICAqIEBtZXRob2QgX2NsZWFyQ29ubmVjdGlvbkZhaWxlZFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2NsZWFyQ29ubmVjdGlvbkZhaWxlZCgpIHtcbiAgICBpZiAodGhpcy5fY29ubmVjdGlvbkZhaWxlZElkKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5fY29ubmVjdGlvbkZhaWxlZElkKTtcbiAgICAgIHRoaXMuX2Nvbm5lY3Rpb25GYWlsZWRJZCA9IDA7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCBhZnRlciA1IHNlY29uZHMgb2YgZW50ZXJpbmcgQ09OTkVDVElORyBzdGF0ZSB3aXRob3V0IGdldHRpbmcgYW4gZXJyb3Igb3IgYSBjb25uZWN0aW9uLlxuICAgKiBDYWxscyBfb25FcnJvciB3aGljaCB3aWxsIGNhdXNlIHRoaXMgYXR0ZW1wdCB0byBiZSBzdG9wcGVkIGFuZCBhbm90aGVyIGNvbm5lY3Rpb24gYXR0ZW1wdCB0byBiZSBzY2hlZHVsZWQuXG4gICAqXG4gICAqIEBtZXRob2QgX2Nvbm5lY3Rpb25GYWlsZWRcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9jb25uZWN0aW9uRmFpbGVkKCkge1xuICAgIHRoaXMuX2Nvbm5lY3Rpb25GYWlsZWRJZCA9IDA7XG4gICAgY29uc3QgbXNnID0gJ1dlYnNvY2tldCBmYWlsZWQgdG8gY29ubmVjdCB0byBzZXJ2ZXInO1xuICAgIGxvZ2dlci53YXJuKG1zZyk7XG5cbiAgICAvLyBUT0RPOiBBdCB0aGlzIHRpbWUgdGhlcmUgaXMgbGl0dGxlIGluZm9ybWF0aW9uIG9uIHdoYXQgaGFwcGVucyB3aGVuIGNsb3NpbmcgYSB3ZWJzb2NrZXQgY29ubmVjdGlvbiB0aGF0IGlzIHN0dWNrIGluXG4gICAgLy8gcmVhZHlTdGF0ZT1DT05ORUNUSU5HLiAgRG9lcyBpdCB0aHJvdyBhbiBlcnJvcj8gIERvZXMgaXQgY2FsbCB0aGUgb25DbG9zZSBvciBvbkVycm9yIGV2ZW50IGhhbmRsZXJzP1xuICAgIC8vIFJlbW92ZSBhbGwgZXZlbnQgaGFuZGxlcnMgc28gdGhhdCBjYWxsaW5nIGNsb3NlIHdvbid0IHRyaWdnZXIgYW55IGNhbGxzLlxuICAgIHRyeSB7XG4gICAgICB0aGlzLl9yZW1vdmVTb2NrZXRFdmVudHMoKTtcbiAgICAgIHRoaXMuX3NvY2tldC5jbG9zZSgpO1xuICAgICAgdGhpcy5fc29ja2V0ID0gbnVsbDtcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIC8vIE5vLW9wXG4gICAgfVxuXG4gICAgLy8gTm93IHdlIGNhbiBjYWxsIG91ciBlcnJvciBoYW5kbGVyLlxuICAgIHRoaXMuX29uRXJyb3IobmV3IEVycm9yKG1zZykpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSB3ZWJzb2NrZXQgY29ubmVjdGlvbiBpcyByZXBvcnRpbmcgdGhhdCBpdHMgbm93IG9wZW4uXG4gICAqXG4gICAqIEBtZXRob2RcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9vbk9wZW4oKSB7XG4gICAgdGhpcy5fY2xlYXJDb25uZWN0aW9uRmFpbGVkKCk7XG4gICAgaWYgKHRoaXMuX2lzT3BlbigpKSB7XG4gICAgICB0aGlzLl9sb3N0Q29ubmVjdGlvbkNvdW50ID0gMDtcbiAgICAgIHRoaXMuaXNPcGVuID0gdHJ1ZTtcbiAgICAgIHRoaXMudHJpZ2dlcignY29ubmVjdGVkJyk7XG4gICAgICBsb2dnZXIuZGVidWcoJ1dlYnNvY2tldCBDb25uZWN0ZWQnKTtcbiAgICAgIGlmICh0aGlzLl9oYXNDb3VudGVyKSB7XG4gICAgICAgIHRoaXMucmVwbGF5RXZlbnRzKHRoaXMuX2xhc3RUaW1lc3RhbXAsIHRydWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcmVzY2hlZHVsZVBpbmcoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBfaXNPcGVuKCkge1xuICAgIGlmICghdGhpcy5fc29ja2V0KSByZXR1cm4gZmFsc2U7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKHR5cGVvZiBXZWJTb2NrZXQgPT09ICd1bmRlZmluZWQnKSByZXR1cm4gdHJ1ZTtcbiAgICByZXR1cm4gdGhpcy5fc29ja2V0ICYmIHRoaXMuX3NvY2tldC5yZWFkeVN0YXRlID09PSBXZWJTb2NrZXQuT1BFTjtcbiAgfVxuXG4gIC8qKlxuICAgKiBJZiBub3QgaXNPcGVuLCBwcmVzdW1hYmx5IGZhaWxlZCB0byBjb25uZWN0XG4gICAqIEFueSBvdGhlciBlcnJvciBjYW4gYmUgaWdub3JlZC4uLiBpZiB0aGUgY29ubmVjdGlvbiBoYXNcbiAgICogZmFpbGVkLCBvbkNsb3NlIHdpbGwgaGFuZGxlIGl0LlxuICAgKlxuICAgKiBAbWV0aG9kXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge0Vycm9yfSBlcnIgLSBXZWJzb2NrZXQgZXJyb3JcbiAgICovXG4gIF9vbkVycm9yKGVycikge1xuICAgIGlmICh0aGlzLl9jbG9zaW5nKSByZXR1cm47XG4gICAgdGhpcy5fY2xlYXJDb25uZWN0aW9uRmFpbGVkKCk7XG4gICAgbG9nZ2VyLmRlYnVnKCdXZWJzb2NrZXQgRXJyb3IgY2F1c2luZyB3ZWJzb2NrZXQgdG8gY2xvc2UnKTtcbiAgICBpZiAoIXRoaXMuaXNPcGVuKSB7XG4gICAgICB0aGlzLl9sb3N0Q29ubmVjdGlvbkNvdW50Kys7XG4gICAgICB0aGlzLl9zY2hlZHVsZVJlY29ubmVjdCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9vblNvY2tldENsb3NlKCk7XG4gICAgICB0aGlzLl9zb2NrZXQuY2xvc2UoKTtcbiAgICAgIHRoaXMuX3NvY2tldCA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNob3J0Y3V0IG1ldGhvZCBmb3Igc2VuZGluZyBhIHNpZ25hbFxuICAgKlxuICAgKiAgICBtYW5hZ2VyLnNlbmRTaWduYWwoe1xuICAgICAgICAgICd0eXBlJzogJ3R5cGluZ19pbmRpY2F0b3InLFxuICAgICAgICAgICdvYmplY3QnOiB7XG4gICAgICAgICAgICAnaWQnOiB0aGlzLmNvbnZlcnNhdGlvbi5pZFxuICAgICAgICAgIH0sXG4gICAgICAgICAgJ2RhdGEnOiB7XG4gICAgICAgICAgICAnYWN0aW9uJzogc3RhdGVcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgKlxuICAgKiBAbWV0aG9kIHNlbmRTaWduYWxcbiAgICogQHBhcmFtICB7T2JqZWN0fSBib2R5IC0gU2lnbmFsIGJvZHlcbiAgICovXG4gIHNlbmRTaWduYWwoYm9keSkge1xuICAgIHRoaXMuX3NvY2tldC5zZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgIHR5cGU6ICdzaWduYWwnLFxuICAgICAgYm9keTogYm9keSxcbiAgICB9KSk7XG4gIH1cblxuICAvKipcbiAgICogU2hvcnRjdXQgZm9yIHNlbmRpbmcgYSByZXF1ZXN0OyBidWlsZHMgaW4gaGFuZGxpbmcgZm9yIGNhbGxiYWNrc1xuICAgKlxuICAgKiAgICBtYW5hZ2VyLnNlbmRSZXF1ZXN0KHtcbiAgICogICAgICBvcGVyYXRpb246IFwiZGVsZXRlXCIsXG4gICAqICAgICAgb2JqZWN0OiB7aWQ6IFwibGF5ZXI6Ly8vY29udmVyc2F0aW9ucy91dWlkXCJ9LFxuICAgKiAgICAgIGRhdGE6IHtkZWxldGlvbl9tb2RlOiBcImFsbF9wYXJ0aWNpcGFudHNcIn1cbiAgICogICAgfSwgZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAqICAgICAgICBhbGVydChyZXN1bHQuc3VjY2VzcyA/IFwiWWF5XCIgOiBcIkJvb1wiKTtcbiAgICogICAgfSk7XG4gICAqXG4gICAqIEBtZXRob2Qgc2VuZFJlcXVlc3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBkYXRhIC0gRGF0YSB0byBzZW5kIHRvIHRoZSBzZXJ2ZXJcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrIC0gSGFuZGxlciBmb3Igc3VjY2Vzcy9mYWlsdXJlIGNhbGxiYWNrXG4gICAqL1xuICBzZW5kUmVxdWVzdChkYXRhLCBjYWxsYmFjaykge1xuICAgIGlmICghdGhpcy5faXNPcGVuKCkpIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayh7IHN1Y2Nlc3M6IGZhbHNlLCBkYXRhOiB7IG1lc3NhZ2U6ICdXZWJTb2NrZXQgbm90IGNvbm5lY3RlZCcgfSB9KTtcbiAgICB9XG4gICAgY29uc3QgYm9keSA9IFV0aWxzLmNsb25lKGRhdGEpO1xuICAgIGJvZHkucmVxdWVzdF9pZCA9ICdyJyArIHRoaXMuX25leHRSZXF1ZXN0SWQrKztcbiAgICBsb2dnZXIuZGVidWcoYFJlcXVlc3QgJHtib2R5LnJlcXVlc3RfaWR9IGlzIHNlbmRpbmdgKTtcbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIHRoaXMuX3JlcXVlc3RDYWxsYmFja3NbYm9keS5yZXF1ZXN0X2lkXSA9IHtcbiAgICAgICAgZGF0ZTogRGF0ZS5ub3coKSxcbiAgICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICB0aGlzLl9zb2NrZXQuc2VuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICB0eXBlOiAncmVxdWVzdCcsXG4gICAgICBib2R5OiBib2R5LFxuICAgIH0pKTtcbiAgICB0aGlzLl9zY2hlZHVsZUNhbGxiYWNrQ2xlYW51cCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIEZsYWdzIGEgcmVxdWVzdCBhcyBoYXZpbmcgZmFpbGVkIGlmIG5vIHJlc3BvbnNlIHdpdGhpbiAyIG1pbnV0ZXNcbiAgICpcbiAgICogQG1ldGhvZCBfc2NoZWR1bGVDYWxsYmFja0NsZWFudXBcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zY2hlZHVsZUNhbGxiYWNrQ2xlYW51cCgpIHtcbiAgICBpZiAoIXRoaXMuX2NhbGxiYWNrQ2xlYW51cElkKSB7XG4gICAgICB0aGlzLl9jYWxsYmFja0NsZWFudXBJZCA9IHNldFRpbWVvdXQodGhpcy5fcnVuQ2FsbGJhY2tDbGVhbnVwLmJpbmQodGhpcyksIERFTEFZX1VOVElMX1RJTUVPVVQgKyA1MCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENhbGxzIGNhbGxiYWNrIHdpdGggYW4gZXJyb3IuXG4gICAqXG4gICAqIE5PVEU6IEJlY2F1c2Ugd2UgY2FsbCByZXF1ZXN0cyB0aGF0IGV4cGVjdCByZXNwb25zZXMgc2VyaWFsbHkgaW5zdGVhZCBvZiBpbiBwYXJhbGxlbCxcbiAgICogY3VycmVudGx5IHRoZXJlIHNob3VsZCBvbmx5IGV2ZXIgYmUgYSBzaW5nbGUgZW50cnkgaW4gX3JlcXVlc3RDYWxsYmFja3MuICBUaGlzIG1heSBjaGFuZ2UgaW4gdGhlIGZ1dHVyZS5cbiAgICpcbiAgICogQG1ldGhvZCBfcnVuQ2FsbGJhY2tDbGVhbnVwXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcnVuQ2FsbGJhY2tDbGVhbnVwKCkge1xuICAgIHRoaXMuX2NhbGxiYWNrQ2xlYW51cElkID0gMDtcbiAgICAvLyBJZiB0aGUgd2Vic29ja2V0IGlzIGNsb3NlZCwgaWdub3JlIGFsbCBjYWxsYmFja3MuICBUaGUgU3luYyBNYW5hZ2VyIHdpbGwgcmVpc3N1ZSB0aGVzZSByZXF1ZXN0cyBhcyBzb29uIGFzIGl0IGdldHNcbiAgICAvLyBhICdjb25uZWN0ZWQnIGV2ZW50Li4uIHRoZXkgaGF2ZSBub3QgZmFpbGVkLiAgTWF5IG5lZWQgdG8gcmV0aGluayB0aGlzIGZvciBjYXNlcyB3aGVyZSB0aGlyZCBwYXJ0aWVzIGFyZSBkaXJlY3RseVxuICAgIC8vIGNhbGxpbmcgdGhlIHdlYnNvY2tldCBtYW5hZ2VyIGJ5cGFzc2luZyB0aGUgc3luYyBtYW5hZ2VyLlxuICAgIGlmICh0aGlzLmlzRGVzdHJveWVkIHx8ICF0aGlzLl9pc09wZW4oKSkgcmV0dXJuO1xuICAgIGxldCByZXF1ZXN0SWQsIGNvdW50ID0gMDtcbiAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICAgIGZvciAocmVxdWVzdElkIGluIHRoaXMuX3JlcXVlc3RDYWxsYmFja3MpIHtcbiAgICAgIGlmICh0aGlzLl9yZXF1ZXN0Q2FsbGJhY2tzLmhhc093blByb3BlcnR5KHJlcXVlc3RJZCkpIHtcblxuICAgICAgICAvLyBJZiB0aGUgcmVxdWVzdCBoYXNuJ3QgZXhwaXJlZCwgd2UnbGwgbmVlZCB0byByZXNjaGVkdWxlIGNhbGxiYWNrIGNsZWFudXA7IGVsc2UgaWYgaXRzIGV4cGlyZWQuLi5cbiAgICAgICAgaWYgKG5vdyA8IHRoaXMuX3JlcXVlc3RDYWxsYmFja3NbcmVxdWVzdElkXS5kYXRlICsgREVMQVlfVU5USUxfVElNRU9VVCkge1xuICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gSWYgdGhlcmUgaGFzIGJlZW4gbm8gZGF0YSBmcm9tIHRoZSBzZXJ2ZXIsIHRoZXJlJ3MgcHJvYmFibHkgYSBwcm9ibGVtIHdpdGggdGhlIHdlYnNvY2tldDsgcmVjb25uZWN0LlxuICAgICAgICAgIGlmIChub3cgPiB0aGlzLl9sYXN0RGF0YUZyb21TZXJ2ZXJUaW1lc3RhbXAuZ2V0VGltZSgpICsgREVMQVlfVU5USUxfVElNRU9VVCkge1xuICAgICAgICAgICAgdGhpcy5fcmVjb25uZWN0KGZhbHNlKTtcbiAgICAgICAgICAgIHRoaXMuX3NjaGVkdWxlQ2FsbGJhY2tDbGVhbnVwKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRoZSByZXF1ZXN0IGlzbid0IHJlc3BvbmRpbmcgYW5kIHRoZSBzb2NrZXQgaXMgZ29vZDsgZmFpbCB0aGUgcmVxdWVzdC5cbiAgICAgICAgICAgIHRoaXMuX3RpbWVvdXRSZXF1ZXN0KHJlcXVlc3RJZCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChjb3VudCkgdGhpcy5fc2NoZWR1bGVDYWxsYmFja0NsZWFudXAoKTtcbiAgfVxuXG4gIF90aW1lb3V0UmVxdWVzdChyZXF1ZXN0SWQpIHtcbiAgICB0cnkge1xuICAgICAgbG9nZ2VyLndhcm4oJ1dlYnNvY2tldCByZXF1ZXN0IHRpbWVvdXQnKTtcbiAgICAgIHRoaXMuX3JlcXVlc3RDYWxsYmFja3NbcmVxdWVzdElkXS5jYWxsYmFjayh7XG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICBkYXRhOiBuZXcgTGF5ZXJFcnJvcih7XG4gICAgICAgICAgaWQ6ICdyZXF1ZXN0X3RpbWVvdXQnLFxuICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgc2VydmVyIGlzIG5vdCByZXNwb25kaW5nIGFuZCBtYXliZSBoYXMgYmVlbiBhY3F1aXJlZCBieSBza3luZXQuJyxcbiAgICAgICAgICB1cmw6ICdodHRwczovL3d3dy5nb29nbGUuY29tLyNxPXNreW5ldCcsXG4gICAgICAgICAgY29kZTogMCxcbiAgICAgICAgICBzdGF0dXM6IDQwOCxcbiAgICAgICAgICBodHRwU3RhdHVzOiA0MDgsXG4gICAgICAgIH0pLFxuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAvLyBEbyBub3RoaW5nXG4gICAgfVxuICAgIGRlbGV0ZSB0aGlzLl9yZXF1ZXN0Q2FsbGJhY2tzW3JlcXVlc3RJZF07XG4gIH1cblxuICAvKipcbiAgICogU2hvcnRjdXQgdG8gc2VuZGluZyBhIENvdW50ZXIucmVhZCByZXF1ZXN0XG4gICAqXG4gICAqIEBtZXRob2QgZ2V0Q291bnRlclxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICogQHBhcmFtIHtib29sZWFufSBjYWxsYmFjay5zdWNjZXNzXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBjYWxsYmFjay5sYXN0Q291bnRlclxuICAgKiBAcGFyYW0ge251bWJlcn0gY2FsbGJhY2submV3Q291bnRlclxuICAgKi9cbiAgZ2V0Q291bnRlcihjYWxsYmFjaykge1xuICAgIGxvZ2dlci5kZWJ1ZygnV2Vic29ja2V0IHJlcXVlc3Q6IGdldENvdW50ZXInKTtcbiAgICB0aGlzLnNlbmRSZXF1ZXN0KHtcbiAgICAgIG1ldGhvZDogJ0NvdW50ZXIucmVhZCcsXG5cbiAgICB9LCAocmVzdWx0KSA9PiB7XG4gICAgICBsb2dnZXIuZGVidWcoJ1dlYnNvY2tldCByZXNwb25zZTogZ2V0Q291bnRlciAnICsgcmVzdWx0LmRhdGEuY291bnRlcik7XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKHJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgY2FsbGJhY2sodHJ1ZSwgcmVzdWx0LmRhdGEuY291bnRlciwgcmVzdWx0LmZ1bGxEYXRhLmNvdW50ZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlcGxheXMgYWxsIG1pc3NlZCBjaGFuZ2UgcGFja2V0cyBzaW5jZSB0aGUgc3BlY2lmaWVkIHRpbWVzdGFtcFxuICAgKlxuICAgKiBAbWV0aG9kIHJlcGxheUV2ZW50c1xuICAgKiBAcGFyYW0gIHtzdHJpbmd9ICAgdGltZXN0YW1wIC0gSXNvIGZvcm1hdHRlZCBkYXRlIHN0cmluZ1xuICAgKiBAcGFyYW0gIHtib29sZWFufSBbZm9yY2U9ZmFsc2VdIC0gaWYgdHJ1ZSwgY2FuY2VsIGFueSBpbiBwcm9ncmVzcyByZXBsYXlFdmVudHMgYW5kIHN0YXJ0IGEgbmV3IG9uZVxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSAtIE9wdGlvbmFsIGNhbGxiYWNrIGZvciBjb21wbGV0aW9uXG4gICAqL1xuICByZXBsYXlFdmVudHModGltZXN0YW1wLCBmb3JjZSwgY2FsbGJhY2spIHtcbiAgICBpZiAoIXRoaXMuX2lzT3BlbigpIHx8ICF0aW1lc3RhbXApIHJldHVybjtcbiAgICBpZiAoZm9yY2UpIHRoaXMuX2luUmVwbGF5ID0gZmFsc2U7XG5cbiAgICAvLyBJZiB3ZSBhcmUgYWxyZWFkeSB3YWl0aW5nIGZvciBhIHJlcGxheSB0byBjb21wbGV0ZSwgcmVjb3JkIHRoZSB0aW1lc3RhbXAgZnJvbSB3aGljaCB3ZVxuICAgIC8vIG5lZWQgdG8gcmVwbGF5IG9uIG91ciBuZXh0IHJlcGxheSByZXF1ZXN0XG4gICAgaWYgKHRoaXMuX2luUmVwbGF5KSB7XG4gICAgICBpZiAoIXRoaXMuX25lZWRzUmVwbGF5RnJvbSkge1xuICAgICAgICBsb2dnZXIuZGVidWcoJ1dlYnNvY2tldCByZXF1ZXN0OiByZXBsYXlFdmVudHMgdXBkYXRpbmcgX25lZWRzUmVwbGF5RnJvbScpO1xuICAgICAgICB0aGlzLl9uZWVkc1JlcGxheUZyb20gPSB0aW1lc3RhbXA7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2luUmVwbGF5ID0gdHJ1ZTtcbiAgICAgIGxvZ2dlci5pbmZvKCdXZWJzb2NrZXQgcmVxdWVzdDogcmVwbGF5RXZlbnRzJyk7XG4gICAgICB0aGlzLnNlbmRSZXF1ZXN0KHtcbiAgICAgICAgbWV0aG9kOiAnRXZlbnQucmVwbGF5JyxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIGZyb21fdGltZXN0YW1wOiB0aW1lc3RhbXAsXG4gICAgICAgIH0sXG4gICAgICB9LCByZXN1bHQgPT4gdGhpcy5fcmVwbGF5RXZlbnRzQ29tcGxldGUodGltZXN0YW1wLCBjYWxsYmFjaywgcmVzdWx0LnN1Y2Nlc3MpKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGJhY2sgZm9yIGhhbmRsaW5nIGNvbXBsZXRpb24gb2YgcmVwbGF5LlxuICAgKlxuICAgKiBAbWV0aG9kIF9yZXBsYXlFdmVudHNDb21wbGV0ZVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0gIHtEYXRlfSAgICAgdGltZXN0YW1wXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgKiBAcGFyYW0gIHtCb29sZWFufSAgIHN1Y2Nlc3NcbiAgICovXG4gIF9yZXBsYXlFdmVudHNDb21wbGV0ZSh0aW1lc3RhbXAsIGNhbGxiYWNrLCBzdWNjZXNzKSB7XG4gICAgdGhpcy5faW5SZXBsYXkgPSBmYWxzZTtcblxuICAgIC8vIElmIHJlcGxheSB3YXMgY29tcGxldGVkLCBhbmQgbm8gb3RoZXIgcmVxdWVzdHMgZm9yIHJlcGxheSwgdGhlbiB0cmlnZ2VyIHN5bmNlZDtcbiAgICAvLyB3ZSdyZSBkb25lLlxuICAgIGlmIChzdWNjZXNzICYmICF0aGlzLl9uZWVkc1JlcGxheUZyb20pIHtcbiAgICAgIGxvZ2dlci5pbmZvKCdXZWJzb2NrZXQgcmVwbGF5IGNvbXBsZXRlJyk7XG4gICAgICB0aGlzLnRyaWdnZXIoJ3N5bmNlZCcpO1xuICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjaygpO1xuICAgIH1cblxuICAgIC8vIElmIHJlcGxheUV2ZW50cyB3YXMgY2FsbGVkIGR1cmluZyBhIHJlcGxheSwgdGhlbiByZXBsYXlcbiAgICAvLyBmcm9tIHRoZSBnaXZlbiB0aW1lc3RhbXAuICBJZiByZXF1ZXN0IGZhaWxlZCwgdGhlbiB3ZSBuZWVkIHRvIHJldHJ5IGZyb20gX2xhc3RUaW1lc3RhbXBcbiAgICBlbHNlIGlmIChzdWNjZXNzICYmIHRoaXMuX25lZWRzUmVwbGF5RnJvbSkge1xuICAgICAgbG9nZ2VyLmluZm8oJ1dlYnNvY2tldCByZXBsYXkgcGFydGlhbGx5IGNvbXBsZXRlJyk7XG4gICAgICBjb25zdCB0ID0gdGhpcy5fbmVlZHNSZXBsYXlGcm9tO1xuICAgICAgdGhpcy5fbmVlZHNSZXBsYXlGcm9tID0gbnVsbDtcbiAgICAgIHRoaXMucmVwbGF5RXZlbnRzKHQpO1xuICAgIH1cblxuICAgIC8vIFdlIG5ldmVyIGdvdCBhIGRvbmUgZXZlbnQuICBXZSBhbHNvIGRpZG4ndCBtaXNzIGFueSBjb3VudGVycywgc28gdGhlIGxhc3RcbiAgICAvLyBtZXNzYWdlIHdlIHJlY2VpdmVkIHdhcyB2YWxpZDsgc28gbGV0cyBqdXN0IHVzZSB0aGF0IGFzIG91ciB0aW1lc3RhbXAgYW5kXG4gICAgLy8gdHJ5IGFnYWluIHVudGlsIHdlIERPIGdldCBhIEV2ZW50LlJlcGxheSBjb21wbGV0aW9uIHBhY2tldFxuICAgIGVsc2Uge1xuICAgICAgbG9nZ2VyLmluZm8oJ1dlYnNvY2tldCByZXBsYXkgcmV0cnknKTtcbiAgICAgIHRoaXMucmVwbGF5RXZlbnRzKHRpbWVzdGFtcCk7XG4gICAgfVxuICB9XG5cblxuICAvKipcbiAgICogR2V0IHRoZSBvYmplY3Qgc3BlY2lmaWVkIGJ5IHRoZSBgb2JqZWN0YCBwcm9wZXJ0eSBvZiB0aGUgd2Vic29ja2V0IHBhY2tldC5cbiAgICpcbiAgICogQG1ldGhvZFxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IG1zZ1xuICAgKiBAcmV0dXJuIHtsYXllci5Sb290fVxuICAgKi9cbiAgX2dldE9iamVjdChtc2cpIHtcbiAgICByZXR1cm4gdGhpcy5jbGllbnQuX2dldE9iamVjdChtc2cub2JqZWN0LmlkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGVzIGEgbmV3IHdlYnNvY2tldCBwYWNrZXQgZnJvbSB0aGUgc2VydmVyXG4gICAqXG4gICAqIEBtZXRob2RcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtICB7T2JqZWN0fSBldnQgLSBNZXNzYWdlIGZyb20gdGhlIHNlcnZlclxuICAgKi9cbiAgX29uTWVzc2FnZShldnQpIHtcbiAgICB0aGlzLl9sb3N0Q29ubmVjdGlvbkNvdW50ID0gMDtcbiAgICB0cnkge1xuICAgICAgY29uc3QgbXNnID0gSlNPTi5wYXJzZShldnQuZGF0YSk7XG4gICAgICBjb25zdCBza2lwcGVkQ291bnRlciA9IHRoaXMuX2xhc3RDb3VudGVyICsgMSAhPT0gbXNnLmNvdW50ZXI7XG4gICAgICB0aGlzLl9oYXNDb3VudGVyID0gdHJ1ZTtcbiAgICAgIHRoaXMuX2xhc3RDb3VudGVyID0gbXNnLmNvdW50ZXI7XG4gICAgICB0aGlzLl9sYXN0RGF0YUZyb21TZXJ2ZXJUaW1lc3RhbXAgPSBuZXcgRGF0ZSgpO1xuXG4gICAgICAvLyBJZiB3ZSd2ZSBtaXNzZWQgYSBjb3VudGVyLCByZXBsYXkgdG8gZ2V0OyBub3RlIHRoYXQgd2UgaGFkIHRvIHVwZGF0ZSBfbGFzdENvdW50ZXJcbiAgICAgIC8vIGZvciByZXBsYXlFdmVudHMgdG8gd29yayBjb3JyZWN0bHkuXG4gICAgICBpZiAoc2tpcHBlZENvdW50ZXIpIHtcbiAgICAgICAgdGhpcy5yZXBsYXlFdmVudHModGhpcy5fbGFzdFRpbWVzdGFtcCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9sYXN0VGltZXN0YW1wID0gbmV3IERhdGUobXNnLnRpbWVzdGFtcCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3Byb2Nlc3NNZXNzYWdlKG1zZyk7XG4gICAgICB0aGlzLl9yZXNjaGVkdWxlUGluZygpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgbG9nZ2VyLmVycm9yKCdMYXllci1XZWJzb2NrZXQ6IEZhaWxlZCB0byBoYW5kbGUgd2Vic29ja2V0IG1lc3NhZ2U6ICcgKyBlcnIgKyAnXFxuJywgZXZ0LmRhdGEpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzIHRoZSBtZXNzYWdlIGJ5IG1lc3NhZ2UgdHlwZS5cbiAgICpcbiAgICogVE9ETzogc2lnbmFscyBzaG91bGQgYmUgaGFuZGxlZCBoZXJlOyBjdXJyZW50bHkgdGhlIHR5cGluZyBpbmRpY2F0b3IgY2xhc3Nlc1xuICAgKiBkaXJlY3RseSBsaXN0ZW4gdG8gdGhlIHdlYnNvY2tldC5cbiAgICpcbiAgICogVHJpZ2dlcnMgJ21lc3NhZ2UnIGV2ZW50LlxuICAgKlxuICAgKiBAbWV0aG9kIF9wcm9jZXNzTWVzc2FnZVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IG1zZ1xuICAgKi9cbiAgX3Byb2Nlc3NNZXNzYWdlKG1zZykge1xuICAgIHRyeSB7XG4gICAgICBzd2l0Y2ggKG1zZy50eXBlKSB7XG4gICAgICAgIGNhc2UgJ2NoYW5nZSc6XG4gICAgICAgICAgdGhpcy5faGFuZGxlQ2hhbmdlKG1zZy5ib2R5KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAncmVzcG9uc2UnOlxuICAgICAgICAgIHRoaXMuX2hhbmRsZVJlc3BvbnNlKG1zZyk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAvLyBkbyBub3RoaW5nXG4gICAgfVxuICAgIHRyeSB7XG4gICAgICB0aGlzLnRyaWdnZXIoJ21lc3NhZ2UnLCB7XG4gICAgICAgIGRhdGE6IG1zZyxcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgLy8gZG8gbm90aGluZ1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGUgYSByZXNwb25zZSB0byBhIHJlcXVlc3QuXG4gICAqXG4gICAqIEBtZXRob2QgX2hhbmRsZVJlc3BvbnNlXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdH0gcmF3TXNnXG4gICAqL1xuICBfaGFuZGxlUmVzcG9uc2UocmF3TXNnKSB7XG4gICAgY29uc3QgbXNnID0gcmF3TXNnLmJvZHk7XG4gICAgY29uc3QgcmVxdWVzdElkID0gbXNnLnJlcXVlc3RfaWQ7XG4gICAgY29uc3QgZGF0YSA9IG1zZy5zdWNjZXNzID8gbXNnLmRhdGEgOiBuZXcgTGF5ZXJFcnJvcihtc2cuZGF0YSk7XG4gICAgbG9nZ2VyLmRlYnVnKGBXZWJzb2NrZXQgcmVzcG9uc2UgJHtyZXF1ZXN0SWR9ICR7bXNnLnN1Y2Nlc3MgPyAnU3VjY2Vzc2Z1bCcgOiAnRmFpbGVkJ31gKTtcbiAgICBpZiAocmVxdWVzdElkICYmIHRoaXMuX3JlcXVlc3RDYWxsYmFja3NbcmVxdWVzdElkXSkge1xuICAgICAgdGhpcy5fcmVxdWVzdENhbGxiYWNrc1tyZXF1ZXN0SWRdLmNhbGxiYWNrKHtcbiAgICAgICAgc3VjY2VzczogbXNnLnN1Y2Nlc3MsXG4gICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgIGZ1bGxEYXRhOiByYXdNc2csXG4gICAgICB9KTtcbiAgICAgIGRlbGV0ZSB0aGlzLl9yZXF1ZXN0Q2FsbGJhY2tzW3JlcXVlc3RJZF07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgYSBDaGFuZ2UgcGFja2V0IGZyb20gdGhlIHNlcnZlci5cbiAgICpcbiAgICogQG1ldGhvZCBfaGFuZGxlQ2hhbmdlXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdH0gbXNnXG4gICAqL1xuICBfaGFuZGxlQ2hhbmdlKG1zZykge1xuICAgIHN3aXRjaCAobXNnLm9wZXJhdGlvbikge1xuICAgICAgY2FzZSAnY3JlYXRlJzpcbiAgICAgICAgbG9nZ2VyLmluZm8oYFdlYnNvY2tldCBDaGFuZ2UgRXZlbnQ6IENyZWF0ZSAke21zZy5vYmplY3QudHlwZX0gJHttc2cub2JqZWN0LmlkfWApO1xuICAgICAgICBsb2dnZXIuZGVidWcobXNnLmRhdGEpO1xuICAgICAgICB0aGlzLl9oYW5kbGVDcmVhdGUobXNnKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdkZWxldGUnOlxuICAgICAgICBsb2dnZXIuaW5mbyhgV2Vic29ja2V0IENoYW5nZSBFdmVudDogIERlbGV0ZSAke21zZy5vYmplY3QudHlwZX0gJHttc2cub2JqZWN0LmlkfWApO1xuICAgICAgICBsb2dnZXIuZGVidWcobXNnLmRhdGEpO1xuICAgICAgICB0aGlzLl9oYW5kbGVEZWxldGUobXNnKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdwYXRjaCc6XG4gICAgICAgIGxvZ2dlci5pbmZvKGBXZWJzb2NrZXQgQ2hhbmdlIEV2ZW50OiAgUGF0Y2ggJHttc2cub2JqZWN0LnR5cGV9ICR7bXNnLm9iamVjdC5pZH06ICR7bXNnLmRhdGEubWFwKG9wID0+IG9wLnByb3BlcnR5KS5qb2luKCcsICcpfWApO1xuICAgICAgICBsb2dnZXIuZGVidWcobXNnLmRhdGEpO1xuICAgICAgICB0aGlzLl9oYW5kbGVQYXRjaChtc2cpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUHJvY2VzcyBhIGNyZWF0ZSBvYmplY3QgbWVzc2FnZSBmcm9tIHRoZSBzZXJ2ZXJcbiAgICpcbiAgICogQG1ldGhvZCBfaGFuZGxlQ3JlYXRlXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdH0gbXNnXG4gICAqL1xuICBfaGFuZGxlQ3JlYXRlKG1zZykge1xuICAgIG1zZy5kYXRhLmZyb21XZWJzb2NrZXQgPSB0cnVlO1xuICAgIHRoaXMuY2xpZW50Ll9jcmVhdGVPYmplY3QobXNnLmRhdGEpO1xuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgZGVsZXRlIG9iamVjdCBtZXNzYWdlcyBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAqIEFsbCBvYmplY3RzIHRoYXQgY2FuIGJlIGRlbGV0ZWQgZnJvbSB0aGUgc2VydmVyIHNob3VsZFxuICAgKiBwcm92aWRlIGEgX2RlbGV0ZWQoKSBtZXRob2QgdG8gYmUgY2FsbGVkIHByaW9yIHRvIGRlc3Ryb3koKS5cbiAgICpcbiAgICogQG1ldGhvZCBfaGFuZGxlRGVsZXRlXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdH0gbXNnXG4gICAqL1xuICBfaGFuZGxlRGVsZXRlKG1zZykge1xuICAgIGNvbnN0IGVudGl0eSA9IHRoaXMuX2dldE9iamVjdChtc2cpO1xuICAgIGlmIChlbnRpdHkpIHtcbiAgICAgIGVudGl0eS5fZGVsZXRlZCgpO1xuICAgICAgZW50aXR5LmRlc3Ryb3koKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogT24gcmVjZWl2aW5nIGFuIHVwZGF0ZS9wYXRjaCBtZXNzYWdlIGZyb20gdGhlIHNlcnZlclxuICAgKiBydW4gdGhlIExheWVyUGFyc2VyIG9uIHRoZSBkYXRhLlxuICAgKlxuICAgKiBAbWV0aG9kIF9oYW5kbGVQYXRjaFxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IG1zZ1xuICAgKi9cbiAgX2hhbmRsZVBhdGNoKG1zZykge1xuICAgIC8vIENhbiBvbmx5IHBhdGNoIGEgY2FjaGVkIG9iamVjdFxuICAgIGNvbnN0IGVudGl0eSA9IHRoaXMuX2dldE9iamVjdChtc2cpO1xuICAgIGlmIChlbnRpdHkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGVudGl0eS5faW5MYXllclBhcnNlciA9IHRydWU7XG4gICAgICAgIFV0aWxzLmxheWVyUGFyc2Uoe1xuICAgICAgICAgIG9iamVjdDogZW50aXR5LFxuICAgICAgICAgIHR5cGU6IG1zZy5vYmplY3QudHlwZSxcbiAgICAgICAgICBvcGVyYXRpb25zOiBtc2cuZGF0YSxcbiAgICAgICAgICBjbGllbnQ6IHRoaXMuY2xpZW50LFxuICAgICAgICB9KTtcbiAgICAgICAgZW50aXR5Ll9pbkxheWVyUGFyc2VyID0gZmFsc2U7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKCd3ZWJzb2NrZXQtbWFuYWdlcjogRmFpbGVkIHRvIGhhbmRsZSBldmVudCcsIG1zZy5kYXRhKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKFV0aWxzLnR5cGVGcm9tSUQobXNnLm9iamVjdC5pZCkgPT09ICdjb252ZXJzYXRpb25zJykge1xuICAgICAgaWYgKENvbnZlcnNhdGlvbi5fbG9hZFJlc291cmNlRm9yUGF0Y2gobXNnLmRhdGEpKSB0aGlzLmNsaWVudC5nZXRDb252ZXJzYXRpb24obXNnLm9iamVjdC5pZCwgdHJ1ZSk7XG4gICAgfSBlbHNlIGlmIChVdGlscy50eXBlRnJvbUlEKG1zZy5vYmplY3QuaWQpID09PSAnbWVzc2FnZXMnKSB7XG4gICAgICBpZiAoTWVzc2FnZS5fbG9hZFJlc291cmNlRm9yUGF0Y2gobXNnLmRhdGEpKSB0aGlzLmNsaWVudC5nZXRNZXNzYWdlKG1zZy5vYmplY3QuaWQsIHRydWUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNjaGVkdWxlIGEgcGluZyByZXF1ZXN0IHdoaWNoIGhlbHBzIHVzIHZlcmlmeSB0aGF0IHRoZSBjb25uZWN0aW9uIGlzIHN0aWxsIGFsaXZlLFxuICAgKiBhbmQgdGhhdCB3ZSBoYXZlbid0IG1pc3NlZCBhbnkgZXZlbnRzLlxuICAgKlxuICAgKiBAbWV0aG9kIF9yZXNjaGVkdWxlUGluZ1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3Jlc2NoZWR1bGVQaW5nKCkge1xuICAgIGlmICh0aGlzLl9uZXh0UGluZ0lkKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5fbmV4dFBpbmdJZCk7XG4gICAgfVxuICAgIHRoaXMuX25leHRQaW5nSWQgPSBzZXRUaW1lb3V0KHRoaXMuX3BpbmcuYmluZCh0aGlzKSwgdGhpcy5waW5nRnJlcXVlbmN5KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZW5kIGEgY291bnRlciByZXF1ZXN0IHRvIHRoZSBzZXJ2ZXIgdG8gdmVyaWZ5IHRoYXQgd2UgYXJlIHN0aWxsIGNvbm5lY3RlZCBhbmRcbiAgICogaGF2ZSBub3QgbWlzc2VkIGFueSBldmVudHMuXG4gICAqXG4gICAqIEBtZXRob2QgX3BpbmdcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9waW5nKCkge1xuICAgIGxvZ2dlci5kZWJ1ZygnV2Vic29ja2V0IHBpbmcnKTtcbiAgICB0aGlzLl9uZXh0UGluZ0lkID0gMDtcbiAgICBpZiAodGhpcy5faXNPcGVuKCkpIHtcbiAgICAgIC8vIE5PVEU6IG9uTWVzc2FnZSB3aWxsIGFscmVhZHkgaGF2ZSBjYWxsZWQgcmVzY2hlZHVsZVBpbmcsIGJ1dCBpZiB0aGVyZSB3YXMgbm8gcmVzcG9uc2UsIHRoZW4gdGhlIGVycm9yIGhhbmRsZXIgd291bGQgTk9UIGhhdmUgY2FsbGVkIGl0LlxuICAgICAgdGhpcy5nZXRDb3VudGVyKHRoaXMuX3Jlc2NoZWR1bGVQaW5nLmJpbmQodGhpcykpO1xuICAgIH1cbiAgfVxuXG5cbiAgLyoqXG4gICAqIENsb3NlIHRoZSB3ZWJzb2NrZXQuXG4gICAqXG4gICAqIEBtZXRob2RcbiAgICovXG4gIGNsb3NlKCkge1xuICAgIGxvZ2dlci5kZWJ1ZygnV2Vic29ja2V0IGNsb3NlIHJlcXVlc3RlZCcpO1xuICAgIHRoaXMuX2Nsb3NpbmcgPSB0cnVlO1xuICAgIGlmICh0aGlzLl9zb2NrZXQpIHtcbiAgICAgIC8vIENsb3NlIGFsbCBldmVudCBoYW5kbGVycyBhbmQgc2V0IHNvY2tldCB0byBudWxsXG4gICAgICAvLyB3aXRob3V0IHdhaXRpbmcgZm9yIGJyb3dzZXIgZXZlbnQgdG8gY2FsbFxuICAgICAgLy8gX29uU29ja2V0Q2xvc2UgYXMgdGhlIG5leHQgY29tbWFuZCBhZnRlciBjbG9zZVxuICAgICAgLy8gbWlnaHQgcmVxdWlyZSBjcmVhdGluZyBhIG5ldyBzb2NrZXRcbiAgICAgIHRoaXMuX29uU29ja2V0Q2xvc2UoKTtcbiAgICAgIHRoaXMuX3NvY2tldC5jbG9zZSgpO1xuICAgICAgdGhpcy5fc29ja2V0ID0gbnVsbDtcbiAgICB9XG4gIH1cblxuICBkZXN0cm95KCkge1xuICAgIHRoaXMuY2xvc2UoKTtcbiAgICBpZiAodGhpcy5fY2FsbGJhY2tDbGVhbnVwSWQpIGNsZWFyVGltZW91dCh0aGlzLl9jYWxsYmFja0NsZWFudXBJZCk7XG4gICAgaWYgKHRoaXMuX25leHRQaW5nSWQpIGNsZWFyVGltZW91dCh0aGlzLl9uZXh0UGluZ0lkKTtcbiAgICB0aGlzLl9yZXF1ZXN0Q2FsbGJhY2tzID0gbnVsbDtcbiAgICBzdXBlci5kZXN0cm95KCk7XG4gIH1cblxuICAvKipcbiAgICogSWYgdGhlIHNvY2tldCBoYXMgY2xvc2VkIChvciBpZiB0aGUgY2xvc2UgbWV0aG9kIGZvcmNlcyBpdCBjbG9zZWQpXG4gICAqIFJlbW92ZSBhbGwgZXZlbnQgaGFuZGxlcnMgYW5kIGlmIGFwcHJvcHJpYXRlLCBzY2hlZHVsZSBhIHJldHJ5LlxuICAgKlxuICAgKiBAbWV0aG9kXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfb25Tb2NrZXRDbG9zZSgpIHtcbiAgICBsb2dnZXIuZGVidWcoJ1dlYnNvY2tldCBjbG9zZWQnKTtcbiAgICB0aGlzLmlzT3BlbiA9IGZhbHNlO1xuICAgIGlmICghdGhpcy5fY2xvc2luZykge1xuICAgICAgdGhpcy5fc2NoZWR1bGVSZWNvbm5lY3QoKTtcbiAgICB9XG5cbiAgICB0aGlzLl9yZW1vdmVTb2NrZXRFdmVudHMoKTtcbiAgICB0aGlzLnRyaWdnZXIoJ2Rpc2Nvbm5lY3RlZCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYWxsIGV2ZW50IGhhbmRsZXJzIG9uIHRoZSBjdXJyZW50IHNvY2tldC5cbiAgICpcbiAgICogQG1ldGhvZCBfcmVtb3ZlU29ja2V0RXZlbnRzXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcmVtb3ZlU29ja2V0RXZlbnRzKCkge1xuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgIGlmICh0eXBlb2YgV2ViU29ja2V0ICE9PSAndW5kZWZpbmVkJyAmJiB0aGlzLl9zb2NrZXQpIHtcbiAgICAgIHRoaXMuX3NvY2tldC5yZW1vdmVFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgdGhpcy5fb25NZXNzYWdlKTtcbiAgICAgIHRoaXMuX3NvY2tldC5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIHRoaXMuX29uU29ja2V0Q2xvc2UpO1xuICAgICAgdGhpcy5fc29ja2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ29wZW4nLCB0aGlzLl9vbk9wZW4pO1xuICAgICAgdGhpcy5fc29ja2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgdGhpcy5fb25FcnJvcik7XG4gICAgfSBlbHNlIGlmICh0aGlzLl9zb2NrZXQpIHtcbiAgICAgIHRoaXMuX3NvY2tldC5vbm1lc3NhZ2UgPSBudWxsO1xuICAgICAgdGhpcy5fc29ja2V0Lm9uY2xvc2UgPSBudWxsO1xuICAgICAgdGhpcy5fc29ja2V0Lm9ub3BlbiA9IG51bGw7XG4gICAgICB0aGlzLl9zb2NrZXQub25lcnJvciA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNjaGVkdWxlIGFuIGF0dGVtcHQgdG8gcmVjb25uZWN0IHRvIHRoZSBzZXJ2ZXIuICBJZiB0aGUgb25saW5lTWFuYWdlclxuICAgKiBkZWNsYXJlcyB1cyB0byBiZSBvZmZsaW5lLCBkb24ndCBib3RoZXIgcmVjb25uZWN0aW5nLiAgQSByZWNvbm5lY3RcbiAgICogYXR0ZW1wdCB3aWxsIGJlIHRyaWdnZXJlZCBhcyBzb29uIGFzIHRoZSBvbmxpbmUgbWFuYWdlciByZXBvcnRzIHdlIGFyZSBvbmxpbmUgYWdhaW4uXG4gICAqXG4gICAqIE5vdGUgdGhhdCB0aGUgZHVyYXRpb24gb2Ygb3VyIGRlbGF5IGNhbiBub3QgZXhjZWRlIHRoZSBvbmxpbmVNYW5hZ2VyJ3MgcGluZyBmcmVxdWVuY3lcbiAgICogb3IgaXQgd2lsbCBkZWNsYXJlIHVzIHRvIGJlIG9mZmxpbmUgd2hpbGUgd2UgYXR0ZW1wdCBhIHJlY29ubmVjdC5cbiAgICpcbiAgICogQG1ldGhvZCBfc2NoZWR1bGVSZWNvbm5lY3RcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zY2hlZHVsZVJlY29ubmVjdCgpIHtcbiAgICBpZiAodGhpcy5pc0Rlc3Ryb3llZCB8fCAhdGhpcy5jbGllbnQuaXNPbmxpbmUpIHJldHVybjtcblxuICAgIGNvbnN0IG1heERlbGF5ID0gKHRoaXMuY2xpZW50Lm9ubGluZU1hbmFnZXIucGluZ0ZyZXF1ZW5jeSAtIDEwMDApIC8gMTAwMDtcbiAgICBjb25zdCBkZWxheSA9IFV0aWxzLmdldEV4cG9uZW50aWFsQmFja29mZlNlY29uZHMobWF4RGVsYXksIE1hdGgubWluKDE1LCB0aGlzLl9sb3N0Q29ubmVjdGlvbkNvdW50KSk7XG4gICAgbG9nZ2VyLmRlYnVnKCdXZWJzb2NrZXQgUmVjb25uZWN0IGluICcgKyBkZWxheSArICcgc2Vjb25kcycpO1xuICAgIHRoaXMuX3JlY29ubmVjdElkID0gc2V0VGltZW91dCh0aGlzLmNvbm5lY3QuYmluZCh0aGlzKSwgZGVsYXkpO1xuICB9XG59XG5cbi8qKlxuICogSXMgdGhlIHdlYnNvY2tldCBjb25uZWN0aW9uIGN1cnJlbnRseSBvcGVuP1xuICogVE9ETzogSW50ZWdyYXRlIGluZm8gZnJvbSB0aGUgbGF5ZXIuT25saW5lU3RhdGVNYW5hZ2VyLlxuICogQHR5cGUge0Jvb2xlYW59XG4gKi9cbldlYnNvY2tldE1hbmFnZXIucHJvdG90eXBlLmlzT3BlbiA9IGZhbHNlO1xuXG4vKipcbiAqIHNldFRpbWVvdXQgSUQgZm9yIGNhbGxpbmcgY29ubmVjdCgpXG4gKiBAcHJpdmF0ZVxuICogQHR5cGUge051bWJlcn1cbiAqL1xuV2Vic29ja2V0TWFuYWdlci5wcm90b3R5cGUuX3JlY29ubmVjdElkID0gMDtcblxuV2Vic29ja2V0TWFuYWdlci5wcm90b3R5cGUuX25leHRSZXF1ZXN0SWQgPSAxO1xuXG4vKipcbiAqIHNldFRpbWVvdXQgSUQgZm9yIGNhbGxpbmcgX2Nvbm5lY3Rpb25GYWlsZWQoKVxuICogQHByaXZhdGVcbiAqIEB0eXBlIHtOdW1iZXJ9XG4gKi9cbldlYnNvY2tldE1hbmFnZXIucHJvdG90eXBlLl9jb25uZWN0aW9uRmFpbGVkSWQgPSAwO1xuXG5XZWJzb2NrZXRNYW5hZ2VyLnByb3RvdHlwZS5fbGFzdFRpbWVzdGFtcCA9IG51bGw7XG5XZWJzb2NrZXRNYW5hZ2VyLnByb3RvdHlwZS5fbGFzdERhdGFGcm9tU2VydmVyVGltZXN0YW1wID0gbnVsbDtcbldlYnNvY2tldE1hbmFnZXIucHJvdG90eXBlLl9sYXN0Q291bnRlciA9IG51bGw7XG5XZWJzb2NrZXRNYW5hZ2VyLnByb3RvdHlwZS5faGFzQ291bnRlciA9IGZhbHNlO1xuXG5XZWJzb2NrZXRNYW5hZ2VyLnByb3RvdHlwZS5faW5SZXBsYXkgPSBmYWxzZTtcbldlYnNvY2tldE1hbmFnZXIucHJvdG90eXBlLl9uZWVkc1JlcGxheUZyb20gPSBudWxsO1xuXG4vKipcbiAqIEZyZXF1ZW5jeSB3aXRoIHdoaWNoIHRoZSB3ZWJzb2NrZXQgY2hlY2tzIHRvIHNlZSBpZiBhbnkgd2Vic29ja2V0IG5vdGlmaWNhdGlvbnNcbiAqIGhhdmUgYmVlbiBtaXNzZWQuXG4gKiBAdHlwZSB7TnVtYmVyfVxuICovXG5XZWJzb2NrZXRNYW5hZ2VyLnByb3RvdHlwZS5waW5nRnJlcXVlbmN5ID0gMzAwMDA7XG5cbi8qKlxuICogVGhlIENsaWVudCB0aGF0IG93bnMgdGhpcy5cbiAqIEB0eXBlIHtsYXllci5DbGllbnR9XG4gKi9cbldlYnNvY2tldE1hbmFnZXIucHJvdG90eXBlLmNsaWVudCA9IG51bGw7XG5cbi8qKlxuICogVGhlIFNvY2tldCBDb25uZWN0aW9uIGluc3RhbmNlXG4gKiBAdHlwZSB7V2Vic29ja2V0fVxuICovXG5XZWJzb2NrZXRNYW5hZ2VyLnByb3RvdHlwZS5fc29ja2V0ID0gbnVsbDtcblxuLyoqXG4gKiBJcyB0aGUgd2Vic29ja2V0IGNvbm5lY3Rpb24gYmVpbmcgY2xvc2VkIGJ5IGEgY2FsbCB0byBjbG9zZSgpP1xuICogSWYgc28sIHdlIGNhbiBpZ25vcmUgYW55IGVycm9ycyB0aGF0IHNpZ25hbCB0aGUgc29ja2V0IGFzIGNsb3NpbmcuXG4gKiBAdHlwZSB7Qm9vbGVhbn1cbiAqL1xuV2Vic29ja2V0TWFuYWdlci5wcm90b3R5cGUuX2Nsb3NpbmcgPSBmYWxzZTtcblxuLyoqXG4gKiBOdW1iZXIgb2YgZmFpbGVkIGF0dGVtcHRzIHRvIHJlY29ubmVjdC5cbiAqIEB0eXBlIHtOdW1iZXJ9XG4gKi9cbldlYnNvY2tldE1hbmFnZXIucHJvdG90eXBlLl9sb3N0Q29ubmVjdGlvbkNvdW50ID0gMDtcblxuXG5XZWJzb2NrZXRNYW5hZ2VyLl9zdXBwb3J0ZWRFdmVudHMgPSBbXG4gIC8qKlxuICAgKiBBIGRhdGEgcGFja2V0IGhhcyBiZWVuIHJlY2VpdmVkIGZyb20gdGhlIHNlcnZlci5cbiAgICogQGV2ZW50IG1lc3NhZ2VcbiAgICogQHBhcmFtIHtsYXllci5MYXllckV2ZW50fSBsYXllckV2ZW50XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBsYXllckV2ZW50LmRhdGEgLSBUaGUgZGF0YSB0aGF0IHdhcyByZWNlaXZlZCBmcm9tIHRoZSBzZXJ2ZXJcbiAgICovXG4gICdtZXNzYWdlJyxcblxuICAvKipcbiAgICogVGhlIHdlYnNvY2tldCBpcyBub3cgY29ubmVjdGVkLlxuICAgKiBAZXZlbnQgY29ubmVjdGVkXG4gICAqIEBwcm90ZWN0ZWRcbiAgICovXG4gICdjb25uZWN0ZWQnLFxuXG4gIC8qKlxuICAgKiBUaGUgd2Vic29ja2V0IGlzIG5vIGxvbmdlciBjb25uZWN0ZWRcbiAgICogQGV2ZW50IGRpc2Nvbm5lY3RlZFxuICAgKiBAcHJvdGVjdGVkXG4gICAqL1xuICAnZGlzY29ubmVjdGVkJyxcblxuICAvKipcbiAgICogV2Vic29ja2V0IGV2ZW50cyB3ZXJlIG1pc3NlZDsgd2UgYXJlIHJlc3luY2luZyB3aXRoIHRoZSBzZXJ2ZXJcbiAgICogQGV2ZW50IHJlcGxheS1iZWd1blxuICAgKi9cbiAgJ3N5bmNpbmcnLFxuXG4gIC8qKlxuICAgKiBXZWJzb2NrZXQgZXZlbnRzIHdlcmUgbWlzc2VkOyB3ZSByZXN5bmNlZCB3aXRoIHRoZSBzZXJ2ZXIgYW5kIGFyZSBub3cgZG9uZVxuICAgKiBAZXZlbnQgcmVwbGF5LWJlZ3VuXG4gICAqL1xuICAnc3luY2VkJyxcbl0uY29uY2F0KFJvb3QuX3N1cHBvcnRlZEV2ZW50cyk7XG5Sb290LmluaXRDbGFzcy5hcHBseShXZWJzb2NrZXRNYW5hZ2VyLCBbV2Vic29ja2V0TWFuYWdlciwgJ1dlYnNvY2tldE1hbmFnZXInXSk7XG5tb2R1bGUuZXhwb3J0cyA9IFdlYnNvY2tldE1hbmFnZXI7XG4iXX0=
