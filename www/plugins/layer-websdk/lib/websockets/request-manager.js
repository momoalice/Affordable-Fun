'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @class  layer.Websockets.RequestManager
 * @private
 *
 * This class allows one to send requests to the websocket server, and provide a callback,
 * And have that callback either called by the correct websocket server response, or
 * be called with a timeout.
 */
var Utils = require('../client-utils');
var logger = require('../logger');
var LayerError = require('../layer-error');

// Wait 15 seconds for a response and then give up
var DELAY_UNTIL_TIMEOUT = 15 * 1000;

var WebsocketRequestManager = function () {
  /**
   * Create a new websocket change manager
   *
   *      var websocketRequestManager = new layer.Websockets.RequestManager({
   *          client: client,
   *          socketManager: client.Websockets.SocketManager
   *      });
   *
   * @method
   * @param  {Object} options
   * @param {layer.Client} client
   * @param {layer.Websockets.SocketManager} socketManager
   * @returns {layer.Websockets.RequestManager}
   */

  function WebsocketRequestManager(options) {
    _classCallCheck(this, WebsocketRequestManager);

    this.client = options.client;
    this.socketManager = options.socketManager;
    this.socketManager.on({
      message: this._handleResponse,
      disconnected: this._reset
    }, this);

    this._requestCallbacks = {};
  }

  _createClass(WebsocketRequestManager, [{
    key: '_reset',
    value: function _reset() {
      this._requestCallbacks = {};
    }

    /**
     * Handle a response to a request.
     *
     * @method _handleResponse
     * @private
     * @param  {layer.LayerEvent} evt
     */

  }, {
    key: '_handleResponse',
    value: function _handleResponse(evt) {
      if (evt.data.type === 'response') {
        var msg = evt.data.body;
        var requestId = msg.request_id;
        var data = msg.success ? msg.data : new LayerError(msg.data);
        logger.debug('Websocket response ' + requestId + ' ' + (msg.success ? 'Successful' : 'Failed'));
        if (requestId && this._requestCallbacks[requestId]) {
          this._requestCallbacks[requestId].callback({
            success: msg.success,
            fullData: evt.data,
            data: data
          });
          delete this._requestCallbacks[requestId];
        }
      }
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
        return !callback ? undefined : callback(new LayerError({
          success: false,
          data: { id: 'not_connected', code: 0, message: 'WebSocket not connected' }
        }));
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

      this.socketManager.send({
        type: 'request',
        body: body
      });
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
      var _this = this;

      this._callbackCleanupId = 0;
      // If the websocket is closed, ignore all callbacks.  The Sync Manager will reissue these requests as soon as it gets
      // a 'connected' event... they have not failed.  May need to rethink this for cases where third parties are directly
      // calling the websocket manager bypassing the sync manager.
      if (this.isDestroyed || !this._isOpen()) return;
      var count = 0;
      var now = Date.now();
      Object.keys(this._requestCallbacks).forEach(function (requestId) {
        var callbackConfig = _this._requestCallbacks[requestId];
        // If the request hasn't expired, we'll need to reschedule callback cleanup; else if its expired...
        if (callbackConfig && now < callbackConfig.date + DELAY_UNTIL_TIMEOUT) {
          count++;
        } else {
          // If there has been no data from the server, there's probably a problem with the websocket; reconnect.
          if (now > _this.socketManager._lastDataFromServerTimestamp + DELAY_UNTIL_TIMEOUT) {
            _this.socketManager._reconnect(false);
            _this._scheduleCallbackCleanup();
            return;
          } else {
            // The request isn't responding and the socket is good; fail the request.
            _this._timeoutRequest(requestId);
          }
        }
      });
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
            message: 'The server is not responding. We know how much that sucks.',
            url: 'https:/developer.layer.com/docs/websdk',
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
  }, {
    key: '_isOpen',
    value: function _isOpen() {
      return this.socketManager._isOpen();
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this.isDestroyed = true;
      if (this._callbackCleanupId) clearTimeout(this._callbackCleanupId);
      this._requestCallbacks = null;
    }
  }]);

  return WebsocketRequestManager;
}();

WebsocketRequestManager.prototype._nextRequestId = 1;

/**
 * The Client that owns this.
 * @type {layer.Client}
 */
WebsocketRequestManager.prototype.client = null;

WebsocketRequestManager.prototype._requestCallbacks = null;

WebsocketRequestManager.prototype._callbackCleanupId = 0;

WebsocketRequestManager.prototype.socketManager = null;

module.exports = WebsocketRequestManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy93ZWJzb2NrZXRzL3JlcXVlc3QtbWFuYWdlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQVFBLElBQU0sUUFBUSxRQUFRLGlCQUFSLENBQVI7QUFDTixJQUFNLFNBQVMsUUFBUSxXQUFSLENBQVQ7QUFDTixJQUFNLGFBQWEsUUFBUSxnQkFBUixDQUFiOzs7QUFHTixJQUFNLHNCQUFzQixLQUFLLElBQUw7O0lBRXRCOzs7Ozs7Ozs7Ozs7Ozs7O0FBZUosV0FmSSx1QkFlSixDQUFZLE9BQVosRUFBcUI7MEJBZmpCLHlCQWVpQjs7QUFDbkIsU0FBSyxNQUFMLEdBQWMsUUFBUSxNQUFSLENBREs7QUFFbkIsU0FBSyxhQUFMLEdBQXFCLFFBQVEsYUFBUixDQUZGO0FBR25CLFNBQUssYUFBTCxDQUFtQixFQUFuQixDQUFzQjtBQUNwQixlQUFTLEtBQUssZUFBTDtBQUNULG9CQUFjLEtBQUssTUFBTDtLQUZoQixFQUdHLElBSEgsRUFIbUI7O0FBUW5CLFNBQUssaUJBQUwsR0FBeUIsRUFBekIsQ0FSbUI7R0FBckI7O2VBZkk7OzZCQTBCSztBQUNQLFdBQUssaUJBQUwsR0FBeUIsRUFBekIsQ0FETzs7Ozs7Ozs7Ozs7OztvQ0FXTyxLQUFLO0FBQ25CLFVBQUksSUFBSSxJQUFKLENBQVMsSUFBVCxLQUFrQixVQUFsQixFQUE4QjtBQUNoQyxZQUFNLE1BQU0sSUFBSSxJQUFKLENBQVMsSUFBVCxDQURvQjtBQUVoQyxZQUFNLFlBQVksSUFBSSxVQUFKLENBRmM7QUFHaEMsWUFBTSxPQUFPLElBQUksT0FBSixHQUFjLElBQUksSUFBSixHQUFXLElBQUksVUFBSixDQUFlLElBQUksSUFBSixDQUF4QyxDQUhtQjtBQUloQyxlQUFPLEtBQVAseUJBQW1DLG1CQUFhLElBQUksT0FBSixHQUFjLFlBQWQsR0FBNkIsUUFBN0IsQ0FBaEQsRUFKZ0M7QUFLaEMsWUFBSSxhQUFhLEtBQUssaUJBQUwsQ0FBdUIsU0FBdkIsQ0FBYixFQUFnRDtBQUNsRCxlQUFLLGlCQUFMLENBQXVCLFNBQXZCLEVBQWtDLFFBQWxDLENBQTJDO0FBQ3pDLHFCQUFTLElBQUksT0FBSjtBQUNULHNCQUFVLElBQUksSUFBSjtBQUNWLHNCQUh5QztXQUEzQyxFQURrRDtBQU1sRCxpQkFBTyxLQUFLLGlCQUFMLENBQXVCLFNBQXZCLENBQVAsQ0FOa0Q7U0FBcEQ7T0FMRjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O2dDQStCVSxNQUFNLFVBQVU7QUFDMUIsVUFBSSxDQUFDLEtBQUssT0FBTCxFQUFELEVBQWlCO0FBQ25CLGVBQU8sQ0FBQyxRQUFELEdBQVksU0FBWixHQUF3QixTQUFTLElBQUksVUFBSixDQUFlO0FBQ3JELG1CQUFTLEtBQVQ7QUFDQSxnQkFBTSxFQUFFLElBQUksZUFBSixFQUFxQixNQUFNLENBQU4sRUFBUyxTQUFTLHlCQUFULEVBQXRDO1NBRnNDLENBQVQsQ0FBeEIsQ0FEWTtPQUFyQjtBQU1BLFVBQU0sT0FBTyxNQUFNLEtBQU4sQ0FBWSxJQUFaLENBQVAsQ0FQb0I7QUFRMUIsV0FBSyxVQUFMLEdBQWtCLE1BQU0sS0FBSyxjQUFMLEVBQU4sQ0FSUTtBQVMxQixhQUFPLEtBQVAsY0FBd0IsS0FBSyxVQUFMLGdCQUF4QixFQVQwQjtBQVUxQixVQUFJLFFBQUosRUFBYztBQUNaLGFBQUssaUJBQUwsQ0FBdUIsS0FBSyxVQUFMLENBQXZCLEdBQTBDO0FBQ3hDLGdCQUFNLEtBQUssR0FBTCxFQUFOO0FBQ0EsNEJBRndDO1NBQTFDLENBRFk7T0FBZDs7QUFPQSxXQUFLLGFBQUwsQ0FBbUIsSUFBbkIsQ0FBd0I7QUFDdEIsY0FBTSxTQUFOO0FBQ0Esa0JBRnNCO09BQXhCLEVBakIwQjtBQXFCMUIsV0FBSyx3QkFBTCxHQXJCMEI7Ozs7Ozs7Ozs7OzsrQ0E4QkQ7QUFDekIsVUFBSSxDQUFDLEtBQUssa0JBQUwsRUFBeUI7QUFDNUIsYUFBSyxrQkFBTCxHQUEwQixXQUFXLEtBQUssbUJBQUwsQ0FBeUIsSUFBekIsQ0FBOEIsSUFBOUIsQ0FBWCxFQUFnRCxzQkFBc0IsRUFBdEIsQ0FBMUUsQ0FENEI7T0FBOUI7Ozs7Ozs7Ozs7Ozs7OzswQ0Fjb0I7OztBQUNwQixXQUFLLGtCQUFMLEdBQTBCLENBQTFCOzs7O0FBRG9CLFVBS2hCLEtBQUssV0FBTCxJQUFvQixDQUFDLEtBQUssT0FBTCxFQUFELEVBQWlCLE9BQXpDO0FBQ0EsVUFBSSxRQUFRLENBQVIsQ0FOZ0I7QUFPcEIsVUFBTSxNQUFNLEtBQUssR0FBTCxFQUFOLENBUGM7QUFRcEIsYUFBTyxJQUFQLENBQVksS0FBSyxpQkFBTCxDQUFaLENBQW9DLE9BQXBDLENBQTRDLHFCQUFhO0FBQ3ZELFlBQU0saUJBQWlCLE1BQUssaUJBQUwsQ0FBdUIsU0FBdkIsQ0FBakI7O0FBRGlELFlBR25ELGtCQUFrQixNQUFNLGVBQWUsSUFBZixHQUFzQixtQkFBdEIsRUFBMkM7QUFDckUsa0JBRHFFO1NBQXZFLE1BRU87O0FBRUwsY0FBSSxNQUFNLE1BQUssYUFBTCxDQUFtQiw0QkFBbkIsR0FBa0QsbUJBQWxELEVBQXVFO0FBQy9FLGtCQUFLLGFBQUwsQ0FBbUIsVUFBbkIsQ0FBOEIsS0FBOUIsRUFEK0U7QUFFL0Usa0JBQUssd0JBQUwsR0FGK0U7QUFHL0UsbUJBSCtFO1dBQWpGLE1BSU87O0FBRUwsa0JBQUssZUFBTCxDQUFxQixTQUFyQixFQUZLO1dBSlA7U0FKRjtPQUgwQyxDQUE1QyxDQVJvQjtBQXlCcEIsVUFBSSxLQUFKLEVBQVcsS0FBSyx3QkFBTCxHQUFYOzs7O29DQUdjLFdBQVc7QUFDekIsVUFBSTtBQUNGLGVBQU8sSUFBUCxDQUFZLDJCQUFaLEVBREU7QUFFRixhQUFLLGlCQUFMLENBQXVCLFNBQXZCLEVBQWtDLFFBQWxDLENBQTJDO0FBQ3pDLG1CQUFTLEtBQVQ7QUFDQSxnQkFBTSxJQUFJLFVBQUosQ0FBZTtBQUNuQixnQkFBSSxpQkFBSjtBQUNBLHFCQUFTLDREQUFUO0FBQ0EsaUJBQUssd0NBQUw7QUFDQSxrQkFBTSxDQUFOO0FBQ0Esb0JBQVEsR0FBUjtBQUNBLHdCQUFZLEdBQVo7V0FOSSxDQUFOO1NBRkYsRUFGRTtPQUFKLENBYUUsT0FBTyxHQUFQLEVBQVk7O09BQVo7QUFHRixhQUFPLEtBQUssaUJBQUwsQ0FBdUIsU0FBdkIsQ0FBUCxDQWpCeUI7Ozs7OEJBb0JqQjtBQUNSLGFBQU8sS0FBSyxhQUFMLENBQW1CLE9BQW5CLEVBQVAsQ0FEUTs7Ozs4QkFJQTtBQUNSLFdBQUssV0FBTCxHQUFtQixJQUFuQixDQURRO0FBRVIsVUFBSSxLQUFLLGtCQUFMLEVBQXlCLGFBQWEsS0FBSyxrQkFBTCxDQUFiLENBQTdCO0FBQ0EsV0FBSyxpQkFBTCxHQUF5QixJQUF6QixDQUhROzs7O1NBdEtOOzs7QUE2S04sd0JBQXdCLFNBQXhCLENBQWtDLGNBQWxDLEdBQW1ELENBQW5EOzs7Ozs7QUFNQSx3QkFBd0IsU0FBeEIsQ0FBa0MsTUFBbEMsR0FBMkMsSUFBM0M7O0FBRUEsd0JBQXdCLFNBQXhCLENBQWtDLGlCQUFsQyxHQUFzRCxJQUF0RDs7QUFFQSx3QkFBd0IsU0FBeEIsQ0FBa0Msa0JBQWxDLEdBQXVELENBQXZEOztBQUVBLHdCQUF3QixTQUF4QixDQUFrQyxhQUFsQyxHQUFrRCxJQUFsRDs7QUFFQSxPQUFPLE9BQVAsR0FBaUIsdUJBQWpCIiwiZmlsZSI6InJlcXVlc3QtbWFuYWdlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGNsYXNzICBsYXllci5XZWJzb2NrZXRzLlJlcXVlc3RNYW5hZ2VyXG4gKiBAcHJpdmF0ZVxuICpcbiAqIFRoaXMgY2xhc3MgYWxsb3dzIG9uZSB0byBzZW5kIHJlcXVlc3RzIHRvIHRoZSB3ZWJzb2NrZXQgc2VydmVyLCBhbmQgcHJvdmlkZSBhIGNhbGxiYWNrLFxuICogQW5kIGhhdmUgdGhhdCBjYWxsYmFjayBlaXRoZXIgY2FsbGVkIGJ5IHRoZSBjb3JyZWN0IHdlYnNvY2tldCBzZXJ2ZXIgcmVzcG9uc2UsIG9yXG4gKiBiZSBjYWxsZWQgd2l0aCBhIHRpbWVvdXQuXG4gKi9cbmNvbnN0IFV0aWxzID0gcmVxdWlyZSgnLi4vY2xpZW50LXV0aWxzJyk7XG5jb25zdCBsb2dnZXIgPSByZXF1aXJlKCcuLi9sb2dnZXInKTtcbmNvbnN0IExheWVyRXJyb3IgPSByZXF1aXJlKCcuLi9sYXllci1lcnJvcicpO1xuXG4vLyBXYWl0IDE1IHNlY29uZHMgZm9yIGEgcmVzcG9uc2UgYW5kIHRoZW4gZ2l2ZSB1cFxuY29uc3QgREVMQVlfVU5USUxfVElNRU9VVCA9IDE1ICogMTAwMDtcblxuY2xhc3MgV2Vic29ja2V0UmVxdWVzdE1hbmFnZXIge1xuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IHdlYnNvY2tldCBjaGFuZ2UgbWFuYWdlclxuICAgKlxuICAgKiAgICAgIHZhciB3ZWJzb2NrZXRSZXF1ZXN0TWFuYWdlciA9IG5ldyBsYXllci5XZWJzb2NrZXRzLlJlcXVlc3RNYW5hZ2VyKHtcbiAgICogICAgICAgICAgY2xpZW50OiBjbGllbnQsXG4gICAqICAgICAgICAgIHNvY2tldE1hbmFnZXI6IGNsaWVudC5XZWJzb2NrZXRzLlNvY2tldE1hbmFnZXJcbiAgICogICAgICB9KTtcbiAgICpcbiAgICogQG1ldGhvZFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnNcbiAgICogQHBhcmFtIHtsYXllci5DbGllbnR9IGNsaWVudFxuICAgKiBAcGFyYW0ge2xheWVyLldlYnNvY2tldHMuU29ja2V0TWFuYWdlcn0gc29ja2V0TWFuYWdlclxuICAgKiBAcmV0dXJucyB7bGF5ZXIuV2Vic29ja2V0cy5SZXF1ZXN0TWFuYWdlcn1cbiAgICovXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICB0aGlzLmNsaWVudCA9IG9wdGlvbnMuY2xpZW50O1xuICAgIHRoaXMuc29ja2V0TWFuYWdlciA9IG9wdGlvbnMuc29ja2V0TWFuYWdlcjtcbiAgICB0aGlzLnNvY2tldE1hbmFnZXIub24oe1xuICAgICAgbWVzc2FnZTogdGhpcy5faGFuZGxlUmVzcG9uc2UsXG4gICAgICBkaXNjb25uZWN0ZWQ6IHRoaXMuX3Jlc2V0LFxuICAgIH0sIHRoaXMpO1xuXG4gICAgdGhpcy5fcmVxdWVzdENhbGxiYWNrcyA9IHt9O1xuICB9XG5cbiAgX3Jlc2V0KCkge1xuICAgIHRoaXMuX3JlcXVlc3RDYWxsYmFja3MgPSB7fTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGUgYSByZXNwb25zZSB0byBhIHJlcXVlc3QuXG4gICAqXG4gICAqIEBtZXRob2QgX2hhbmRsZVJlc3BvbnNlXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge2xheWVyLkxheWVyRXZlbnR9IGV2dFxuICAgKi9cbiAgX2hhbmRsZVJlc3BvbnNlKGV2dCkge1xuICAgIGlmIChldnQuZGF0YS50eXBlID09PSAncmVzcG9uc2UnKSB7XG4gICAgICBjb25zdCBtc2cgPSBldnQuZGF0YS5ib2R5O1xuICAgICAgY29uc3QgcmVxdWVzdElkID0gbXNnLnJlcXVlc3RfaWQ7XG4gICAgICBjb25zdCBkYXRhID0gbXNnLnN1Y2Nlc3MgPyBtc2cuZGF0YSA6IG5ldyBMYXllckVycm9yKG1zZy5kYXRhKTtcbiAgICAgIGxvZ2dlci5kZWJ1ZyhgV2Vic29ja2V0IHJlc3BvbnNlICR7cmVxdWVzdElkfSAke21zZy5zdWNjZXNzID8gJ1N1Y2Nlc3NmdWwnIDogJ0ZhaWxlZCd9YCk7XG4gICAgICBpZiAocmVxdWVzdElkICYmIHRoaXMuX3JlcXVlc3RDYWxsYmFja3NbcmVxdWVzdElkXSkge1xuICAgICAgICB0aGlzLl9yZXF1ZXN0Q2FsbGJhY2tzW3JlcXVlc3RJZF0uY2FsbGJhY2soe1xuICAgICAgICAgIHN1Y2Nlc3M6IG1zZy5zdWNjZXNzLFxuICAgICAgICAgIGZ1bGxEYXRhOiBldnQuZGF0YSxcbiAgICAgICAgICBkYXRhLFxuICAgICAgICB9KTtcbiAgICAgICAgZGVsZXRlIHRoaXMuX3JlcXVlc3RDYWxsYmFja3NbcmVxdWVzdElkXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2hvcnRjdXQgZm9yIHNlbmRpbmcgYSByZXF1ZXN0OyBidWlsZHMgaW4gaGFuZGxpbmcgZm9yIGNhbGxiYWNrc1xuICAgKlxuICAgKiAgICBtYW5hZ2VyLnNlbmRSZXF1ZXN0KHtcbiAgICogICAgICBvcGVyYXRpb246IFwiZGVsZXRlXCIsXG4gICAqICAgICAgb2JqZWN0OiB7aWQ6IFwibGF5ZXI6Ly8vY29udmVyc2F0aW9ucy91dWlkXCJ9LFxuICAgKiAgICAgIGRhdGE6IHtkZWxldGlvbl9tb2RlOiBcImFsbF9wYXJ0aWNpcGFudHNcIn1cbiAgICogICAgfSwgZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAqICAgICAgICBhbGVydChyZXN1bHQuc3VjY2VzcyA/IFwiWWF5XCIgOiBcIkJvb1wiKTtcbiAgICogICAgfSk7XG4gICAqXG4gICAqIEBtZXRob2Qgc2VuZFJlcXVlc3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBkYXRhIC0gRGF0YSB0byBzZW5kIHRvIHRoZSBzZXJ2ZXJcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrIC0gSGFuZGxlciBmb3Igc3VjY2Vzcy9mYWlsdXJlIGNhbGxiYWNrXG4gICAqL1xuICBzZW5kUmVxdWVzdChkYXRhLCBjYWxsYmFjaykge1xuICAgIGlmICghdGhpcy5faXNPcGVuKCkpIHtcbiAgICAgIHJldHVybiAhY2FsbGJhY2sgPyB1bmRlZmluZWQgOiBjYWxsYmFjayhuZXcgTGF5ZXJFcnJvcih7XG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICBkYXRhOiB7IGlkOiAnbm90X2Nvbm5lY3RlZCcsIGNvZGU6IDAsIG1lc3NhZ2U6ICdXZWJTb2NrZXQgbm90IGNvbm5lY3RlZCcgfSxcbiAgICAgIH0pKTtcbiAgICB9XG4gICAgY29uc3QgYm9keSA9IFV0aWxzLmNsb25lKGRhdGEpO1xuICAgIGJvZHkucmVxdWVzdF9pZCA9ICdyJyArIHRoaXMuX25leHRSZXF1ZXN0SWQrKztcbiAgICBsb2dnZXIuZGVidWcoYFJlcXVlc3QgJHtib2R5LnJlcXVlc3RfaWR9IGlzIHNlbmRpbmdgKTtcbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIHRoaXMuX3JlcXVlc3RDYWxsYmFja3NbYm9keS5yZXF1ZXN0X2lkXSA9IHtcbiAgICAgICAgZGF0ZTogRGF0ZS5ub3coKSxcbiAgICAgICAgY2FsbGJhY2ssXG4gICAgICB9O1xuICAgIH1cblxuICAgIHRoaXMuc29ja2V0TWFuYWdlci5zZW5kKHtcbiAgICAgIHR5cGU6ICdyZXF1ZXN0JyxcbiAgICAgIGJvZHksXG4gICAgfSk7XG4gICAgdGhpcy5fc2NoZWR1bGVDYWxsYmFja0NsZWFudXAoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGbGFncyBhIHJlcXVlc3QgYXMgaGF2aW5nIGZhaWxlZCBpZiBubyByZXNwb25zZSB3aXRoaW4gMiBtaW51dGVzXG4gICAqXG4gICAqIEBtZXRob2QgX3NjaGVkdWxlQ2FsbGJhY2tDbGVhbnVwXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc2NoZWR1bGVDYWxsYmFja0NsZWFudXAoKSB7XG4gICAgaWYgKCF0aGlzLl9jYWxsYmFja0NsZWFudXBJZCkge1xuICAgICAgdGhpcy5fY2FsbGJhY2tDbGVhbnVwSWQgPSBzZXRUaW1lb3V0KHRoaXMuX3J1bkNhbGxiYWNrQ2xlYW51cC5iaW5kKHRoaXMpLCBERUxBWV9VTlRJTF9USU1FT1VUICsgNTApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxscyBjYWxsYmFjayB3aXRoIGFuIGVycm9yLlxuICAgKlxuICAgKiBOT1RFOiBCZWNhdXNlIHdlIGNhbGwgcmVxdWVzdHMgdGhhdCBleHBlY3QgcmVzcG9uc2VzIHNlcmlhbGx5IGluc3RlYWQgb2YgaW4gcGFyYWxsZWwsXG4gICAqIGN1cnJlbnRseSB0aGVyZSBzaG91bGQgb25seSBldmVyIGJlIGEgc2luZ2xlIGVudHJ5IGluIF9yZXF1ZXN0Q2FsbGJhY2tzLiAgVGhpcyBtYXkgY2hhbmdlIGluIHRoZSBmdXR1cmUuXG4gICAqXG4gICAqIEBtZXRob2QgX3J1bkNhbGxiYWNrQ2xlYW51cFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3J1bkNhbGxiYWNrQ2xlYW51cCgpIHtcbiAgICB0aGlzLl9jYWxsYmFja0NsZWFudXBJZCA9IDA7XG4gICAgLy8gSWYgdGhlIHdlYnNvY2tldCBpcyBjbG9zZWQsIGlnbm9yZSBhbGwgY2FsbGJhY2tzLiAgVGhlIFN5bmMgTWFuYWdlciB3aWxsIHJlaXNzdWUgdGhlc2UgcmVxdWVzdHMgYXMgc29vbiBhcyBpdCBnZXRzXG4gICAgLy8gYSAnY29ubmVjdGVkJyBldmVudC4uLiB0aGV5IGhhdmUgbm90IGZhaWxlZC4gIE1heSBuZWVkIHRvIHJldGhpbmsgdGhpcyBmb3IgY2FzZXMgd2hlcmUgdGhpcmQgcGFydGllcyBhcmUgZGlyZWN0bHlcbiAgICAvLyBjYWxsaW5nIHRoZSB3ZWJzb2NrZXQgbWFuYWdlciBieXBhc3NpbmcgdGhlIHN5bmMgbWFuYWdlci5cbiAgICBpZiAodGhpcy5pc0Rlc3Ryb3llZCB8fCAhdGhpcy5faXNPcGVuKCkpIHJldHVybjtcbiAgICBsZXQgY291bnQgPSAwO1xuICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgT2JqZWN0LmtleXModGhpcy5fcmVxdWVzdENhbGxiYWNrcykuZm9yRWFjaChyZXF1ZXN0SWQgPT4ge1xuICAgICAgY29uc3QgY2FsbGJhY2tDb25maWcgPSB0aGlzLl9yZXF1ZXN0Q2FsbGJhY2tzW3JlcXVlc3RJZF07XG4gICAgICAvLyBJZiB0aGUgcmVxdWVzdCBoYXNuJ3QgZXhwaXJlZCwgd2UnbGwgbmVlZCB0byByZXNjaGVkdWxlIGNhbGxiYWNrIGNsZWFudXA7IGVsc2UgaWYgaXRzIGV4cGlyZWQuLi5cbiAgICAgIGlmIChjYWxsYmFja0NvbmZpZyAmJiBub3cgPCBjYWxsYmFja0NvbmZpZy5kYXRlICsgREVMQVlfVU5USUxfVElNRU9VVCkge1xuICAgICAgICBjb3VudCsrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSWYgdGhlcmUgaGFzIGJlZW4gbm8gZGF0YSBmcm9tIHRoZSBzZXJ2ZXIsIHRoZXJlJ3MgcHJvYmFibHkgYSBwcm9ibGVtIHdpdGggdGhlIHdlYnNvY2tldDsgcmVjb25uZWN0LlxuICAgICAgICBpZiAobm93ID4gdGhpcy5zb2NrZXRNYW5hZ2VyLl9sYXN0RGF0YUZyb21TZXJ2ZXJUaW1lc3RhbXAgKyBERUxBWV9VTlRJTF9USU1FT1VUKSB7XG4gICAgICAgICAgdGhpcy5zb2NrZXRNYW5hZ2VyLl9yZWNvbm5lY3QoZmFsc2UpO1xuICAgICAgICAgIHRoaXMuX3NjaGVkdWxlQ2FsbGJhY2tDbGVhbnVwKCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFRoZSByZXF1ZXN0IGlzbid0IHJlc3BvbmRpbmcgYW5kIHRoZSBzb2NrZXQgaXMgZ29vZDsgZmFpbCB0aGUgcmVxdWVzdC5cbiAgICAgICAgICB0aGlzLl90aW1lb3V0UmVxdWVzdChyZXF1ZXN0SWQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKGNvdW50KSB0aGlzLl9zY2hlZHVsZUNhbGxiYWNrQ2xlYW51cCgpO1xuICB9XG5cbiAgX3RpbWVvdXRSZXF1ZXN0KHJlcXVlc3RJZCkge1xuICAgIHRyeSB7XG4gICAgICBsb2dnZXIud2FybignV2Vic29ja2V0IHJlcXVlc3QgdGltZW91dCcpO1xuICAgICAgdGhpcy5fcmVxdWVzdENhbGxiYWNrc1tyZXF1ZXN0SWRdLmNhbGxiYWNrKHtcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGRhdGE6IG5ldyBMYXllckVycm9yKHtcbiAgICAgICAgICBpZDogJ3JlcXVlc3RfdGltZW91dCcsXG4gICAgICAgICAgbWVzc2FnZTogJ1RoZSBzZXJ2ZXIgaXMgbm90IHJlc3BvbmRpbmcuIFdlIGtub3cgaG93IG11Y2ggdGhhdCBzdWNrcy4nLFxuICAgICAgICAgIHVybDogJ2h0dHBzOi9kZXZlbG9wZXIubGF5ZXIuY29tL2RvY3Mvd2Vic2RrJyxcbiAgICAgICAgICBjb2RlOiAwLFxuICAgICAgICAgIHN0YXR1czogNDA4LFxuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwOCxcbiAgICAgICAgfSksXG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIC8vIERvIG5vdGhpbmdcbiAgICB9XG4gICAgZGVsZXRlIHRoaXMuX3JlcXVlc3RDYWxsYmFja3NbcmVxdWVzdElkXTtcbiAgfVxuXG4gIF9pc09wZW4oKSB7XG4gICAgcmV0dXJuIHRoaXMuc29ja2V0TWFuYWdlci5faXNPcGVuKCk7XG4gIH1cblxuICBkZXN0cm95KCkge1xuICAgIHRoaXMuaXNEZXN0cm95ZWQgPSB0cnVlO1xuICAgIGlmICh0aGlzLl9jYWxsYmFja0NsZWFudXBJZCkgY2xlYXJUaW1lb3V0KHRoaXMuX2NhbGxiYWNrQ2xlYW51cElkKTtcbiAgICB0aGlzLl9yZXF1ZXN0Q2FsbGJhY2tzID0gbnVsbDtcbiAgfVxufVxuXG5XZWJzb2NrZXRSZXF1ZXN0TWFuYWdlci5wcm90b3R5cGUuX25leHRSZXF1ZXN0SWQgPSAxO1xuXG4vKipcbiAqIFRoZSBDbGllbnQgdGhhdCBvd25zIHRoaXMuXG4gKiBAdHlwZSB7bGF5ZXIuQ2xpZW50fVxuICovXG5XZWJzb2NrZXRSZXF1ZXN0TWFuYWdlci5wcm90b3R5cGUuY2xpZW50ID0gbnVsbDtcblxuV2Vic29ja2V0UmVxdWVzdE1hbmFnZXIucHJvdG90eXBlLl9yZXF1ZXN0Q2FsbGJhY2tzID0gbnVsbDtcblxuV2Vic29ja2V0UmVxdWVzdE1hbmFnZXIucHJvdG90eXBlLl9jYWxsYmFja0NsZWFudXBJZCA9IDA7XG5cbldlYnNvY2tldFJlcXVlc3RNYW5hZ2VyLnByb3RvdHlwZS5zb2NrZXRNYW5hZ2VyID0gbnVsbDtcblxubW9kdWxlLmV4cG9ydHMgPSBXZWJzb2NrZXRSZXF1ZXN0TWFuYWdlcjtcblxuIl19
