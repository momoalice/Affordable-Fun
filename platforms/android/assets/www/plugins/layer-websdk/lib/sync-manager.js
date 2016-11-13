'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * @class  layer.SyncManager
 * @extends layer.Root
 * @protected
 *
 * This class manages
 *
 * 1. a queue of requests that need to be made
 * 2. when a request should be fired, based on authentication state, online state, websocket connection state, and position in the queue
 * 3. when a request should be aborted
 * 4. triggering any request callbacks
 *
 * TODO WEB-850: Currently the sync queue is managed solely in runtime memory.  But the queue should be stored
 * in persistent memory so that a tab-reload can restore the queue without losing commands that the user has
 * been told have been accepted.
 *
 * TODO: In the event of a DNS error, we may have a valid websocket receiving events and telling us we are online,
 * and be unable to create a REST call.  This will be handled wrong because evidence will suggest that we are online.
 * This issue goes away when we use bidirectional websockets for all requests.
 *
 * Applications do not typically interact with this class, but may subscribe to its events
 * to get richer detailed information than is available from the layer.Client instance.
 */
var Root = require('./root');

var _require = require('./sync-event');

var WebsocketSyncEvent = _require.WebsocketSyncEvent;

var xhr = require('./xhr');
var logger = require('./logger');
var Utils = require('./client-utils');

var SyncManager = function (_Root) {
  _inherits(SyncManager, _Root);

  /**
   * Creates a new SyncManager.
   *
   * An Application is expected to only have one SyncManager.
   *
   *      var socketManager = new layer.Websockets.SocketManager({client: client});
   *      var requestManager = new layer.Websockets.RequestManager({client: client, socketManager: socketManager});
   *
   *      var onlineManager = new layer.OnlineManager({
   *          socketManager: socketManager
   *      });
   *
   *      // Now we can instantiate this thing...
   *      var SyncManager = new layer.SyncManager({
   *          client: client,
   *          onlineManager: onlineManager,
   *          socketManager: socketManager,
   *          requestManager: requestManager
   *      });
   *
   * @method constructor
   * @param  {Object} options
   * @param {layer.OnlineStateManager} options.onlineManager
   * @param {layer.Websockets.RequestManager} options.requestManager
   * @param {layer.Client} options.client
   */

  function SyncManager(options) {
    _classCallCheck(this, SyncManager);

    // Note we do not store a pointer to client... it is not needed.

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(SyncManager).call(this, options));

    if (options.client) {
      options.client.on('authenticated', _this._processNextRequest, _this);
    }
    _this.queue = [];

    _this.onlineManager.on('disconnected', _this._onlineStateChange, _this);
    _this.socketManager.on('connected disconnected', _this._onlineStateChange, _this);
    return _this;
  }

  _createClass(SyncManager, [{
    key: 'isOnline',
    value: function isOnline() {
      return this.onlineManager.isOnline;
    }

    /**
     * Process sync request when connection is restored.
     *
     * Any time we go back online (as signaled by the onlineStateManager),
     * Process the next Sync Event (will do nothing if one is already firing)
     *
     * @method _onlineStateChange
     * @private
     * @param  {string} evtName - 'connected' or 'disconnected'
     * @param  {layer.LayerEvent} evt
     */

  }, {
    key: '_onlineStateChange',
    value: function _onlineStateChange(evt) {
      var _this2 = this;

      if (evt.eventName === 'connected') {
        if (this.queue.length) this.queue[0].returnToOnlineCount++;
        setTimeout(function () {
          return _this2._processNextRequest();
        }, 100);
      } else if (evt.eventName === 'disconnected') {
        if (this.queue.length) {
          this.queue[0].isFiring = false;
        }
      }
    }

    /**
     * Adds a new xhr request to the queue.
     *
     * If the queue is empty, this will be fired immediately.
     * If the queue is non-empty, this will wait until all other requests in the queue have been fired.
     *
     * @method request
     * @param  {layer.SyncEvent} requestEvt - A SyncEvent specifying the request to be made
     */

  }, {
    key: 'request',
    value: function request(requestEvt) {
      // If its a PATCH request on an object that isn't yet created,
      // do not add it to the queue.
      if (requestEvt.operation !== 'PATCH' || !this._findUnfiredCreate(requestEvt)) {
        logger.info('Sync Manager Request ' + requestEvt.operation + ' on target ' + requestEvt.target);
        logger.debug(requestEvt.toObject());
        this.queue.push(requestEvt);
        this.trigger('sync:add', {
          request: requestEvt,
          target: requestEvt.target
        });
      } else {
        logger.info('Sync Manager Request PATCH ' + requestEvt.target + ' request ignored; create request still enqueued');
        logger.debug(requestEvt.toObject());
      }

      // If its a DELETE request, purge all other requests on that target.
      if (requestEvt.operation === 'DELETE') {
        this._purgeOnDelete(requestEvt);
      }

      // Fire the request if there aren't any existing requests already being processed.
      // If this isn't the first item, assume that all necessary logic exists to fire the
      // existing requests and then it will move onto this request.
      if (this.queue.length === 1) {
        this._processNextRequest();
      }
    }

    /**
     * Find create request for this resource.
     *
     * Determine if the given target has a POST request waiting to create
     * the resource, and return any matching requests. Used
     * for folding PATCH requests into an unfired CREATE/POST request.
     *
     * @method _findUnfiredCreate
     * @private
     * @param  {layer.SyncEvent} requestEvt
     * @return {Boolean}
     */

  }, {
    key: '_findUnfiredCreate',
    value: function _findUnfiredCreate(requestEvt) {
      return Boolean(this.queue.filter(function (evt) {
        return evt.target === requestEvt.target && evt.operation === 'POST' && !evt.isFiring;
      }).length);
    }

    /**
     * Process the next request in the queue.
     *
     * Request is dequeued on completing the process.
     * If the first request in the queue is firing, do nothing.
     *
     * @method _processNextRequest
     * @private
     */

  }, {
    key: '_processNextRequest',
    value: function _processNextRequest() {
      var _this3 = this;

      if (this.isDestroyed) return;
      var requestEvt = this.queue[0];
      if (this.isOnline() && requestEvt && !requestEvt.isFiring) {
        if (requestEvt instanceof WebsocketSyncEvent) {
          if (this.socketManager && this.socketManager._isOpen()) {
            logger.debug('Sync Manager Websocket Request Firing ' + requestEvt.operation + ' on target ' + requestEvt.target, requestEvt.toObject());
            this.requestManager.sendRequest(requestEvt._getRequestData(), function (result) {
              return _this3._xhrResult(result, requestEvt);
            });
            requestEvt.isFiring = true;
          } else {
            logger.debug('Sync Manager Websocket Request skipped; socket closed');
          }
        } else {
          logger.debug('Sync Manager XHR Request Firing ' + requestEvt.operation + ' ' + requestEvt.target, requestEvt.toObject());
          xhr(requestEvt._getRequestData(), function (result) {
            return _this3._xhrResult(result, requestEvt);
          });
          requestEvt.isFiring = true;
        }
      } else if (requestEvt && requestEvt.isFiring) {
        logger.debug('Sync Manager processNext skipped; request still firing ' + requestEvt.operation + ' ' + ('on target ' + requestEvt.target), requestEvt.toObject());
      }
    }

    /**
     * Process the result of an xhr call, routing it to the appropriate handler.
     *
     * @method _xhrResult
     * @private
     * @param  {Object} result  - Response object returned by xhr call
     * @param  {layer.SyncEvent} requestEvt - Request object
     */

  }, {
    key: '_xhrResult',
    value: function _xhrResult(result, requestEvt) {
      result.request = requestEvt;
      requestEvt.isFiring = false;
      if (!result.success) {
        this._xhrError(result);
      } else {
        this._xhrSuccess(result);
      }
    }

    /**
     * Categorize the error for handling.
     *
     * @method _getErrorState
     * @private
     * @param  {Object} result  - Response object returned by xhr call
     * @param  {layer.SyncEvent} requestEvt - Request object
     * @param  {boolean} isOnline - Is our app state set to online
     */

  }, {
    key: '_getErrorState',
    value: function _getErrorState(result, requestEvt, isOnline) {
      if (!isOnline) {
        // CORS errors look identical to offline; but if our online state has transitioned from false to true repeatedly while processing this request,
        // thats a hint that that its a CORS error
        if (requestEvt.returnToOnlineCount >= SyncManager.MAX_RETRIES_BEFORE_CORS_ERROR) {
          return 'CORS';
        } else {
          return 'offline';
        }
      } else if (result.status === 404 && result.data && result.data.code === 102) {
        return 'notFound';
      } else if (result.status === 408) {
        if (requestEvt.retryCount >= SyncManager.MAX_RETRIES) {
          return 'tooManyFailuresWhileOnline';
        } else {
          return 'validateOnlineAndRetry';
        }
      } else if ([502, 503, 504].indexOf(result.status) !== -1) {
        if (requestEvt.retryCount >= SyncManager.MAX_RETRIES) {
          return 'tooManyFailuresWhileOnline';
        } else {
          return 'serverUnavailable';
        }
      } else if (result.status === 401 && result.data.data && result.data.data.nonce) {
        return 'reauthorize';
      } else {
        return 'serverRejectedRequest';
      }
    }

    /**
     * Handle failed requests.
     *
     * 1. If there was an error from the server, then the request has problems
     * 2. If we determine we are not in fact online, call the connectionError handler
     * 3. If we think we are online, verify we are online and then determine how to handle it.
     *
     * @method _xhrError
     * @private
     * @param  {Object} result  - Response object returned by xhr call
     * @param  {layer.SyncEvent} requestEvt - Request object
     */

  }, {
    key: '_xhrError',
    value: function _xhrError(result) {
      var requestEvt = result.request;

      logger.warn('Sync Manager ' + (requestEvt instanceof WebsocketSyncEvent ? 'Websocket' : 'XHR') + ' ' + (requestEvt.operation + ' Request on target ' + requestEvt.target + ' has Failed'), requestEvt.toObject());

      var errState = this._getErrorState(result, requestEvt, this.isOnline());
      logger.warn('Sync Manager Error State: ' + errState);
      switch (errState) {
        case 'tooManyFailuresWhileOnline':
          this._xhrHandleServerError(result, 'Sync Manager Server Unavailable Too Long; removing request');
          break;
        case 'notFound':
          this._xhrHandleServerError(result, 'Resource not found; presumably deleted');
          break;
        case 'validateOnlineAndRetry':
          // Server appears to be hung but will eventually recover.
          // Retry a few times and then error out.
          this._xhrValidateIsOnline();
          break;
        case 'serverUnavailable':
          // Server is in a bad state but will eventually recover;
          // keep retrying.
          this._xhrHandleServerUnavailableError(requestEvt);
          break;
        case 'reauthorize':
          // sessionToken appears to no longer be valid; forward response
          // on to client-authenticator to process.
          // Do not retry nor advance to next request.
          requestEvt.callback(result);
          break;
        case 'serverRejectedRequest':
          // Server presumably did not like the arguments to this call
          // or the url was invalid.  Do not retry; trigger the callback
          // and let the caller handle it.
          this._xhrHandleServerError(result, 'Sync Manager Server Rejects Request; removing request');
          break;
        case 'CORS':
          // A pattern of offline-like failures that suggests its actually a CORs error
          this._xhrHandleServerError(result, 'Sync Manager Server detects CORS-like errors; removing request');
          break;
        case 'offline':
          this._xhrHandleConnectionError();
          break;
      }
    }

    /**
     * Handle a server unavailable error.
     *
     * In the event of a 502 (Bad Gateway), 503 (service unavailable)
     * or 504 (gateway timeout) error from the server
     * assume we have an error that is self correcting on the server.
     * Use exponential backoff to retry the request.
     *
     * Note that each call will increment retryCount; there is a maximum
     * of MAX_RETRIES before it is treated as an error
     *
     * @method  _xhrHandleServerUnavailableError
     * @private
     * @param {layer.SyncEvent} request
     */

  }, {
    key: '_xhrHandleServerUnavailableError',
    value: function _xhrHandleServerUnavailableError(request) {
      var maxDelay = SyncManager.MAX_UNAVAILABLE_RETRY_WAIT;
      var delay = Utils.getExponentialBackoffSeconds(maxDelay, Math.min(15, request.retryCount++));
      logger.warn('Sync Manager Server Unavailable; retry count ' + request.retryCount + '; retrying in ' + delay + ' seconds');
      setTimeout(this._processNextRequest.bind(this), delay * 1000);
    }

    /**
     * Handle a server error in response to firing sync event.
     *
     * If there is a server error, its presumably non-recoverable/non-retryable error, so
     * we're going to abort this request.
     *
     * 1. If a callback was provided, call it to handle the error
     * 2. If a rollback call is provided, call it to undo any patch/delete/etc... changes
     * 3. If the request was to create a resource, remove from the queue all requests
     *    that depended upon that resource.
     * 4. Advance to next request
     *
     * @method _xhrHandleServerError
     * @private
     * @param  {Object} result  - Response object returned by xhr call
     *
     */

  }, {
    key: '_xhrHandleServerError',
    value: function _xhrHandleServerError(result, logMsg) {
      // Execute all callbacks provided by the request
      result.request.callback(result);
      logger.error(logMsg, result.request);
      this.trigger('sync:error', {
        target: result.request.target,
        request: result.request,
        error: result.data
      });

      result.request.success = false;

      // If a POST request fails, all requests that depend upon this object
      // must be purged
      if (result.request.operation === 'POST') {
        this._purgeDependentRequests(result.request);
      }

      // Remove this request as well (side-effect: rolls back the operation)
      this._removeRequest(result.request);

      // And finally, we are ready to try the next request
      this._processNextRequest();
    }

    /**
     * If there is a connection error, wait for retry.
     *
     * In the event of what appears to be a connection error,
     * Wait until a 'connected' event before processing the next request (actually reprocessing the current event)
     *
     * @method _xhrHandleConnectionError
     * @private
     */

  }, {
    key: '_xhrHandleConnectionError',
    value: function _xhrHandleConnectionError() {}
    // Nothing to be done; we already have the below event handler setup
    // this.onlineManager.once('connected', () => this._processNextRequest());


    /**
     * Verify that we are online and retry request.
     *
     * This method is called when we think we're online, but
     * have determined we need to validate that assumption.
     *
     * Test that we have a connection; if we do,
     * retry the request once, and if it fails again,
     * _xhrError() will determine it to have failed and remove it from the queue.
     *
     * If we are offline, then let _xhrHandleConnectionError handle it.
     *
     * @method _xhrValidateIsOnline
     * @private
     */

  }, {
    key: '_xhrValidateIsOnline',
    value: function _xhrValidateIsOnline() {
      var _this4 = this;

      logger.debug('Sync Manager verifying online state');
      this.onlineManager.checkOnlineStatus(function (isOnline) {
        return _this4._xhrValidateIsOnlineCallback(isOnline);
      });
    }

    /**
     * If we have verified we are online, retry request.
     *
     * We should have received a response to our /nonces call
     * which assuming the server is actually alive,
     * will tell us if the connection is working.
     *
     * If we are offline, flag us as offline and let the ConnectionError handler handle this
     * If we are online, give the request a single retry (there is never more than one retry)
     *
     * @method _xhrValidateIsOnlineCallback
     * @private
     * @param  {boolean} isOnline  - Response object returned by xhr call
     */

  }, {
    key: '_xhrValidateIsOnlineCallback',
    value: function _xhrValidateIsOnlineCallback(isOnline) {
      logger.debug('Sync Manager online check result is ' + isOnline);
      if (!isOnline) {
        // Treat this as a Connection Error
        this._xhrHandleConnectionError();
      } else {
        // Retry the request in case we were offline, but are now online.
        // Of course, if this fails, give it up entirely.
        this.queue[0].retryCount++;
        this._processNextRequest();
      }
    }

    /**
     * The XHR request was successful.
     *
     * Any xhr request that actually succedes:
     *
     * 1. Remove it from the queue
     * 2. Call any callbacks
     * 3. Advance to next request
     *
     * @method _xhrSuccess
     * @private
     * @param  {Object} result  - Response object returned by xhr call
     * @param  {layer.SyncEvent} requestEvt - Request object
     */

  }, {
    key: '_xhrSuccess',
    value: function _xhrSuccess(result) {
      var requestEvt = result.request;
      logger.debug('Sync Manager ' + (requestEvt instanceof WebsocketSyncEvent ? 'Websocket' : 'XHR') + ' ' + (requestEvt.operation + ' Request on target ' + requestEvt.target + ' has Succeeded'), requestEvt.toObject());
      if (result.data) logger.debug(result.data);
      requestEvt.success = true;
      this._removeRequest(requestEvt);
      if (requestEvt.callback) requestEvt.callback(result);
      this._processNextRequest();

      this.trigger('sync:success', {
        target: requestEvt.target,
        request: requestEvt,
        response: result.data
      });
    }

    /**
     * Remove the SyncEvent request from the queue.
     *
     * @method _removeRequest
     * @private
     * @param  {layer.SyncEvent} requestEvt - SyncEvent Request to remove
     */

  }, {
    key: '_removeRequest',
    value: function _removeRequest(requestEvt) {
      var index = this.queue.indexOf(requestEvt);
      if (index !== -1) this.queue.splice(index, 1);
    }

    /**
     * Remove requests from queue that depend on specified resource.
     *
     * If there is a POST request to create a new resource, and there are PATCH, DELETE, etc...
     * requests on that resource, if the POST request fails, then all PATCH, DELETE, etc
     * requests must be removed from the queue.
     *
     * Note that we do not call the rollback on these dependent requests because the expected
     * rollback is to destroy the thing that was created, which means any other rollback has no effect.
     *
     * @method _purgeDependentRequests
     * @private
     * @param  {layer.SyncEvent} request - Request whose target is no longer valid
     */

  }, {
    key: '_purgeDependentRequests',
    value: function _purgeDependentRequests(request) {
      this.queue = this.queue.filter(function (evt) {
        return evt.depends.indexOf(request.target) === -1 || evt === request;
      });
    }

    /**
     * Remove from queue all events that operate upon the deleted object.
     *
     * @method _purgeOnDelete
     * @private
     * @param  {layer.SyncEvent} evt - Delete event that requires removal of other events
     */

  }, {
    key: '_purgeOnDelete',
    value: function _purgeOnDelete(evt) {
      this.queue = this.queue.filter(function (request) {
        return request.depends.indexOf(evt.target) === -1 || evt === request;
      });
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this.queue.forEach(function (evt) {
        return evt.destroy();
      });
      this.queue = null;
      _get(Object.getPrototypeOf(SyncManager.prototype), 'destroy', this).call(this);
    }
  }]);

  return SyncManager;
}(Root);

/**
 * Websocket Manager for getting socket state.
 * @type {layer.Websockets.SocketManager}
 */


SyncManager.prototype.socketManager = null;

/**
 * Websocket Request Manager for sending requests.
 * @type {layer.Websockets.RequestManager}
 */
SyncManager.prototype.requestManager = null;

/**
 * Reference to the Online State Manager.
 *
 * Sync Manager uses online status to determine if it can fire sync-requests.
 * @private
 * @type {layer.OnlineStateManager}
 */
SyncManager.prototype.onlineManager = null;

/**
 * The array of layer.SyncEvent instances awaiting to be fired.
 * @type {layer.SyncEvent[]}
 */
SyncManager.prototype.queue = null;

/**
 * Maximum exponential backoff wait.
 *
 * If the server is returning 502, 503 or 504 errors, exponential backoff
 * should never wait longer than this number of seconds (15 minutes)
 * @type {Number}
 * @static
 */
SyncManager.MAX_UNAVAILABLE_RETRY_WAIT = 60 * 15;

/**
 * Retries before suspect CORS error.
 *
 * How many times can we transition from offline to online state
 * with this request at the front of the queue before we conclude
 * that the reason we keep thinking we're going offline is
 * a CORS error returning a status of 0.  If that pattern
 * shows 3 times in a row, there is likely a CORS error.
 * Note that CORS errors appear to javascript as a status=0 error,
 * which is the same as if the client were offline.
 * @type {number}
 * @static
 */
SyncManager.MAX_RETRIES_BEFORE_CORS_ERROR = 3;

/**
 * Abort request after this number of retries.
 *
 * @type {number}
 * @static
 */
SyncManager.MAX_RETRIES = 20;

SyncManager._supportedEvents = [
/**
 * A sync request has failed.
 *
 * @event
 * @param {layer.SyncEvent} evt - The request object
 * @param {Object} result
 * @param {string} result.target - ID of the message/conversation/etc. being operated upon
 * @param {layer.SyncEvent} result.request - The original request
 * @param {Object} result.error - The error object {id, code, message, url}
 */
'sync:error',

/**
 * A sync layer request has completed successfully.
 *
 * @event
 * @param {Object} result
 * @param {string} result.target - ID of the message/conversation/etc. being operated upon
 * @param {layer.SyncEvent} result.request - The original request
 * @param {Object} result.data - null or any data returned by the call
 */
'sync:success',

/**
 * A new sync request has been added.
 *
 * @event
 * @param {layer.SyncEvent} evt - The request object
 */
'sync:add'].concat(Root._supportedEvents);

Root.initClass(SyncManager);
module.exports = SyncManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9zeW5jLW1hbmFnZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUF1QkEsSUFBTSxPQUFPLFFBQVEsUUFBUixDQUFQOztlQUN5QixRQUFRLGNBQVI7O0lBQXZCOztBQUNSLElBQU0sTUFBTSxRQUFRLE9BQVIsQ0FBTjtBQUNOLElBQU0sU0FBUyxRQUFRLFVBQVIsQ0FBVDtBQUNOLElBQU0sUUFBUSxRQUFRLGdCQUFSLENBQVI7O0lBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQTJCSixXQTNCSSxXQTJCSixDQUFZLE9BQVosRUFBcUI7MEJBM0JqQixhQTJCaUI7Ozs7dUVBM0JqQix3QkE0QkksVUFEYTs7QUFJbkIsUUFBSSxRQUFRLE1BQVIsRUFBZ0I7QUFDbEIsY0FBUSxNQUFSLENBQWUsRUFBZixDQUFrQixlQUFsQixFQUFtQyxNQUFLLG1CQUFMLE9BQW5DLEVBRGtCO0tBQXBCO0FBR0EsVUFBSyxLQUFMLEdBQWEsRUFBYixDQVBtQjs7QUFTbkIsVUFBSyxhQUFMLENBQW1CLEVBQW5CLENBQXNCLGNBQXRCLEVBQXNDLE1BQUssa0JBQUwsT0FBdEMsRUFUbUI7QUFVbkIsVUFBSyxhQUFMLENBQW1CLEVBQW5CLENBQXNCLHdCQUF0QixFQUFnRCxNQUFLLGtCQUFMLE9BQWhELEVBVm1COztHQUFyQjs7ZUEzQkk7OytCQXdDTztBQUNULGFBQU8sS0FBSyxhQUFMLENBQW1CLFFBQW5CLENBREU7Ozs7Ozs7Ozs7Ozs7Ozs7O3VDQWVRLEtBQUs7OztBQUN0QixVQUFJLElBQUksU0FBSixLQUFrQixXQUFsQixFQUErQjtBQUNqQyxZQUFJLEtBQUssS0FBTCxDQUFXLE1BQVgsRUFBbUIsS0FBSyxLQUFMLENBQVcsQ0FBWCxFQUFjLG1CQUFkLEdBQXZCO0FBQ0EsbUJBQVc7aUJBQU0sT0FBSyxtQkFBTDtTQUFOLEVBQWtDLEdBQTdDLEVBRmlDO09BQW5DLE1BR08sSUFB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WSxnQkFBWixHQUErQjs7Ozs7Ozs7Ozs7QUFXN0IsWUFYNkI7Ozs7Ozs7Ozs7O0FBc0I3QixjQXRCNkI7Ozs7Ozs7O0FBOEI3QixVQTlCNkIsRUErQjdCLE1BL0I2QixDQStCdEIsS0FBSyxnQkFBTCxDQS9CVDs7QUFpQ0EsS0FBSyxTQUFMLENBQWUsV0FBZjtBQUNBLE9BQU8sT0FBUCxHQUFpQixXQUFqQiIsImZpbGUiOiJzeW5jLW1hbmFnZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBjbGFzcyAgbGF5ZXIuU3luY01hbmFnZXJcbiAqIEBleHRlbmRzIGxheWVyLlJvb3RcbiAqIEBwcm90ZWN0ZWRcbiAqXG4gKiBUaGlzIGNsYXNzIG1hbmFnZXNcbiAqXG4gKiAxLiBhIHF1ZXVlIG9mIHJlcXVlc3RzIHRoYXQgbmVlZCB0byBiZSBtYWRlXG4gKiAyLiB3aGVuIGEgcmVxdWVzdCBzaG91bGQgYmUgZmlyZWQsIGJhc2VkIG9uIGF1dGhlbnRpY2F0aW9uIHN0YXRlLCBvbmxpbmUgc3RhdGUsIHdlYnNvY2tldCBjb25uZWN0aW9uIHN0YXRlLCBhbmQgcG9zaXRpb24gaW4gdGhlIHF1ZXVlXG4gKiAzLiB3aGVuIGEgcmVxdWVzdCBzaG91bGQgYmUgYWJvcnRlZFxuICogNC4gdHJpZ2dlcmluZyBhbnkgcmVxdWVzdCBjYWxsYmFja3NcbiAqXG4gKiBUT0RPIFdFQi04NTA6IEN1cnJlbnRseSB0aGUgc3luYyBxdWV1ZSBpcyBtYW5hZ2VkIHNvbGVseSBpbiBydW50aW1lIG1lbW9yeS4gIEJ1dCB0aGUgcXVldWUgc2hvdWxkIGJlIHN0b3JlZFxuICogaW4gcGVyc2lzdGVudCBtZW1vcnkgc28gdGhhdCBhIHRhYi1yZWxvYWQgY2FuIHJlc3RvcmUgdGhlIHF1ZXVlIHdpdGhvdXQgbG9zaW5nIGNvbW1hbmRzIHRoYXQgdGhlIHVzZXIgaGFzXG4gKiBiZWVuIHRvbGQgaGF2ZSBiZWVuIGFjY2VwdGVkLlxuICpcbiAqIFRPRE86IEluIHRoZSBldmVudCBvZiBhIEROUyBlcnJvciwgd2UgbWF5IGhhdmUgYSB2YWxpZCB3ZWJzb2NrZXQgcmVjZWl2aW5nIGV2ZW50cyBhbmQgdGVsbGluZyB1cyB3ZSBhcmUgb25saW5lLFxuICogYW5kIGJlIHVuYWJsZSB0byBjcmVhdGUgYSBSRVNUIGNhbGwuICBUaGlzIHdpbGwgYmUgaGFuZGxlZCB3cm9uZyBiZWNhdXNlIGV2aWRlbmNlIHdpbGwgc3VnZ2VzdCB0aGF0IHdlIGFyZSBvbmxpbmUuXG4gKiBUaGlzIGlzc3VlIGdvZXMgYXdheSB3aGVuIHdlIHVzZSBiaWRpcmVjdGlvbmFsIHdlYnNvY2tldHMgZm9yIGFsbCByZXF1ZXN0cy5cbiAqXG4gKiBBcHBsaWNhdGlvbnMgZG8gbm90IHR5cGljYWxseSBpbnRlcmFjdCB3aXRoIHRoaXMgY2xhc3MsIGJ1dCBtYXkgc3Vic2NyaWJlIHRvIGl0cyBldmVudHNcbiAqIHRvIGdldCByaWNoZXIgZGV0YWlsZWQgaW5mb3JtYXRpb24gdGhhbiBpcyBhdmFpbGFibGUgZnJvbSB0aGUgbGF5ZXIuQ2xpZW50IGluc3RhbmNlLlxuICovXG5jb25zdCBSb290ID0gcmVxdWlyZSgnLi9yb290Jyk7XG5jb25zdCB7IFdlYnNvY2tldFN5bmNFdmVudCB9ID0gcmVxdWlyZSgnLi9zeW5jLWV2ZW50Jyk7XG5jb25zdCB4aHIgPSByZXF1aXJlKCcuL3hocicpO1xuY29uc3QgbG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXInKTtcbmNvbnN0IFV0aWxzID0gcmVxdWlyZSgnLi9jbGllbnQtdXRpbHMnKTtcblxuY2xhc3MgU3luY01hbmFnZXIgZXh0ZW5kcyBSb290IHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgU3luY01hbmFnZXIuXG4gICAqXG4gICAqIEFuIEFwcGxpY2F0aW9uIGlzIGV4cGVjdGVkIHRvIG9ubHkgaGF2ZSBvbmUgU3luY01hbmFnZXIuXG4gICAqXG4gICAqICAgICAgdmFyIHNvY2tldE1hbmFnZXIgPSBuZXcgbGF5ZXIuV2Vic29ja2V0cy5Tb2NrZXRNYW5hZ2VyKHtjbGllbnQ6IGNsaWVudH0pO1xuICAgKiAgICAgIHZhciByZXF1ZXN0TWFuYWdlciA9IG5ldyBsYXllci5XZWJzb2NrZXRzLlJlcXVlc3RNYW5hZ2VyKHtjbGllbnQ6IGNsaWVudCwgc29ja2V0TWFuYWdlcjogc29ja2V0TWFuYWdlcn0pO1xuICAgKlxuICAgKiAgICAgIHZhciBvbmxpbmVNYW5hZ2VyID0gbmV3IGxheWVyLk9ubGluZU1hbmFnZXIoe1xuICAgKiAgICAgICAgICBzb2NrZXRNYW5hZ2VyOiBzb2NrZXRNYW5hZ2VyXG4gICAqICAgICAgfSk7XG4gICAqXG4gICAqICAgICAgLy8gTm93IHdlIGNhbiBpbnN0YW50aWF0ZSB0aGlzIHRoaW5nLi4uXG4gICAqICAgICAgdmFyIFN5bmNNYW5hZ2VyID0gbmV3IGxheWVyLlN5bmNNYW5hZ2VyKHtcbiAgICogICAgICAgICAgY2xpZW50OiBjbGllbnQsXG4gICAqICAgICAgICAgIG9ubGluZU1hbmFnZXI6IG9ubGluZU1hbmFnZXIsXG4gICAqICAgICAgICAgIHNvY2tldE1hbmFnZXI6IHNvY2tldE1hbmFnZXIsXG4gICAqICAgICAgICAgIHJlcXVlc3RNYW5hZ2VyOiByZXF1ZXN0TWFuYWdlclxuICAgKiAgICAgIH0pO1xuICAgKlxuICAgKiBAbWV0aG9kIGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9uc1xuICAgKiBAcGFyYW0ge2xheWVyLk9ubGluZVN0YXRlTWFuYWdlcn0gb3B0aW9ucy5vbmxpbmVNYW5hZ2VyXG4gICAqIEBwYXJhbSB7bGF5ZXIuV2Vic29ja2V0cy5SZXF1ZXN0TWFuYWdlcn0gb3B0aW9ucy5yZXF1ZXN0TWFuYWdlclxuICAgKiBAcGFyYW0ge2xheWVyLkNsaWVudH0gb3B0aW9ucy5jbGllbnRcbiAgICovXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zKTtcblxuICAgIC8vIE5vdGUgd2UgZG8gbm90IHN0b3JlIGEgcG9pbnRlciB0byBjbGllbnQuLi4gaXQgaXMgbm90IG5lZWRlZC5cbiAgICBpZiAob3B0aW9ucy5jbGllbnQpIHtcbiAgICAgIG9wdGlvbnMuY2xpZW50Lm9uKCdhdXRoZW50aWNhdGVkJywgdGhpcy5fcHJvY2Vzc05leHRSZXF1ZXN0LCB0aGlzKTtcbiAgICB9XG4gICAgdGhpcy5xdWV1ZSA9IFtdO1xuXG4gICAgdGhpcy5vbmxpbmVNYW5hZ2VyLm9uKCdkaXNjb25uZWN0ZWQnLCB0aGlzLl9vbmxpbmVTdGF0ZUNoYW5nZSwgdGhpcyk7XG4gICAgdGhpcy5zb2NrZXRNYW5hZ2VyLm9uKCdjb25uZWN0ZWQgZGlzY29ubmVjdGVkJywgdGhpcy5fb25saW5lU3RhdGVDaGFuZ2UsIHRoaXMpO1xuICB9XG5cbiAgaXNPbmxpbmUoKSB7XG4gICAgcmV0dXJuIHRoaXMub25saW5lTWFuYWdlci5pc09ubGluZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzIHN5bmMgcmVxdWVzdCB3aGVuIGNvbm5lY3Rpb24gaXMgcmVzdG9yZWQuXG4gICAqXG4gICAqIEFueSB0aW1lIHdlIGdvIGJhY2sgb25saW5lIChhcyBzaWduYWxlZCBieSB0aGUgb25saW5lU3RhdGVNYW5hZ2VyKSxcbiAgICogUHJvY2VzcyB0aGUgbmV4dCBTeW5jIEV2ZW50ICh3aWxsIGRvIG5vdGhpbmcgaWYgb25lIGlzIGFscmVhZHkgZmlyaW5nKVxuICAgKlxuICAgKiBAbWV0aG9kIF9vbmxpbmVTdGF0ZUNoYW5nZVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IGV2dE5hbWUgLSAnY29ubmVjdGVkJyBvciAnZGlzY29ubmVjdGVkJ1xuICAgKiBAcGFyYW0gIHtsYXllci5MYXllckV2ZW50fSBldnRcbiAgICovXG4gIF9vbmxpbmVTdGF0ZUNoYW5nZShldnQpIHtcbiAgICBpZiAoZXZ0LmV2ZW50TmFtZSA9PT0gJ2Nvbm5lY3RlZCcpIHtcbiAgICAgIGlmICh0aGlzLnF1ZXVlLmxlbmd0aCkgdGhpcy5xdWV1ZVswXS5yZXR1cm5Ub09ubGluZUNvdW50Kys7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMuX3Byb2Nlc3NOZXh0UmVxdWVzdCgpLCAxMDApO1xuICAgIH0gZWxzZSBpZiAoZXZ0LmV2ZW50TmFtZSA9PT0gJ2Rpc2Nvbm5lY3RlZCcpIHtcbiAgICAgIGlmICh0aGlzLnF1ZXVlLmxlbmd0aCkge1xuICAgICAgICB0aGlzLnF1ZXVlWzBdLmlzRmlyaW5nID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBuZXcgeGhyIHJlcXVlc3QgdG8gdGhlIHF1ZXVlLlxuICAgKlxuICAgKiBJZiB0aGUgcXVldWUgaXMgZW1wdHksIHRoaXMgd2lsbCBiZSBmaXJlZCBpbW1lZGlhdGVseS5cbiAgICogSWYgdGhlIHF1ZXVlIGlzIG5vbi1lbXB0eSwgdGhpcyB3aWxsIHdhaXQgdW50aWwgYWxsIG90aGVyIHJlcXVlc3RzIGluIHRoZSBxdWV1ZSBoYXZlIGJlZW4gZmlyZWQuXG4gICAqXG4gICAqIEBtZXRob2QgcmVxdWVzdFxuICAgKiBAcGFyYW0gIHtsYXllci5TeW5jRXZlbnR9IHJlcXVlc3RFdnQgLSBBIFN5bmNFdmVudCBzcGVjaWZ5aW5nIHRoZSByZXF1ZXN0IHRvIGJlIG1hZGVcbiAgICovXG4gIHJlcXVlc3QocmVxdWVzdEV2dCkge1xuICAgIC8vIElmIGl0cyBhIFBBVENIIHJlcXVlc3Qgb24gYW4gb2JqZWN0IHRoYXQgaXNuJ3QgeWV0IGNyZWF0ZWQsXG4gICAgLy8gZG8gbm90IGFkZCBpdCB0byB0aGUgcXVldWUuXG4gICAgaWYgKHJlcXVlc3RFdnQub3BlcmF0aW9uICE9PSAnUEFUQ0gnIHx8ICF0aGlzLl9maW5kVW5maXJlZENyZWF0ZShyZXF1ZXN0RXZ0KSkge1xuICAgICAgbG9nZ2VyLmluZm8oYFN5bmMgTWFuYWdlciBSZXF1ZXN0ICR7cmVxdWVzdEV2dC5vcGVyYXRpb259IG9uIHRhcmdldCAke3JlcXVlc3RFdnQudGFyZ2V0fWApO1xuICAgICAgbG9nZ2VyLmRlYnVnKHJlcXVlc3RFdnQudG9PYmplY3QoKSk7XG4gICAgICB0aGlzLnF1ZXVlLnB1c2gocmVxdWVzdEV2dCk7XG4gICAgICB0aGlzLnRyaWdnZXIoJ3N5bmM6YWRkJywge1xuICAgICAgICByZXF1ZXN0OiByZXF1ZXN0RXZ0LFxuICAgICAgICB0YXJnZXQ6IHJlcXVlc3RFdnQudGFyZ2V0LFxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZ2dlci5pbmZvKGBTeW5jIE1hbmFnZXIgUmVxdWVzdCBQQVRDSCAke3JlcXVlc3RFdnQudGFyZ2V0fSByZXF1ZXN0IGlnbm9yZWQ7IGNyZWF0ZSByZXF1ZXN0IHN0aWxsIGVucXVldWVkYCk7XG4gICAgICBsb2dnZXIuZGVidWcocmVxdWVzdEV2dC50b09iamVjdCgpKTtcbiAgICB9XG5cbiAgICAvLyBJZiBpdHMgYSBERUxFVEUgcmVxdWVzdCwgcHVyZ2UgYWxsIG90aGVyIHJlcXVlc3RzIG9uIHRoYXQgdGFyZ2V0LlxuICAgIGlmIChyZXF1ZXN0RXZ0Lm9wZXJhdGlvbiA9PT0gJ0RFTEVURScpIHtcbiAgICAgIHRoaXMuX3B1cmdlT25EZWxldGUocmVxdWVzdEV2dCk7XG4gICAgfVxuXG4gICAgLy8gRmlyZSB0aGUgcmVxdWVzdCBpZiB0aGVyZSBhcmVuJ3QgYW55IGV4aXN0aW5nIHJlcXVlc3RzIGFscmVhZHkgYmVpbmcgcHJvY2Vzc2VkLlxuICAgIC8vIElmIHRoaXMgaXNuJ3QgdGhlIGZpcnN0IGl0ZW0sIGFzc3VtZSB0aGF0IGFsbCBuZWNlc3NhcnkgbG9naWMgZXhpc3RzIHRvIGZpcmUgdGhlXG4gICAgLy8gZXhpc3RpbmcgcmVxdWVzdHMgYW5kIHRoZW4gaXQgd2lsbCBtb3ZlIG9udG8gdGhpcyByZXF1ZXN0LlxuICAgIGlmICh0aGlzLnF1ZXVlLmxlbmd0aCA9PT0gMSkge1xuICAgICAgdGhpcy5fcHJvY2Vzc05leHRSZXF1ZXN0KCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgY3JlYXRlIHJlcXVlc3QgZm9yIHRoaXMgcmVzb3VyY2UuXG4gICAqXG4gICAqIERldGVybWluZSBpZiB0aGUgZ2l2ZW4gdGFyZ2V0IGhhcyBhIFBPU1QgcmVxdWVzdCB3YWl0aW5nIHRvIGNyZWF0ZVxuICAgKiB0aGUgcmVzb3VyY2UsIGFuZCByZXR1cm4gYW55IG1hdGNoaW5nIHJlcXVlc3RzLiBVc2VkXG4gICAqIGZvciBmb2xkaW5nIFBBVENIIHJlcXVlc3RzIGludG8gYW4gdW5maXJlZCBDUkVBVEUvUE9TVCByZXF1ZXN0LlxuICAgKlxuICAgKiBAbWV0aG9kIF9maW5kVW5maXJlZENyZWF0ZVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0gIHtsYXllci5TeW5jRXZlbnR9IHJlcXVlc3RFdnRcbiAgICogQHJldHVybiB7Qm9vbGVhbn1cbiAgICovXG4gIF9maW5kVW5maXJlZENyZWF0ZShyZXF1ZXN0RXZ0KSB7XG4gICAgcmV0dXJuIEJvb2xlYW4odGhpcy5xdWV1ZS5maWx0ZXIoZXZ0ID0+XG4gICAgICBldnQudGFyZ2V0ID09PSByZXF1ZXN0RXZ0LnRhcmdldCAmJiBldnQub3BlcmF0aW9uID09PSAnUE9TVCcgJiYgIWV2dC5pc0ZpcmluZykubGVuZ3RoXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzIHRoZSBuZXh0IHJlcXVlc3QgaW4gdGhlIHF1ZXVlLlxuICAgKlxuICAgKiBSZXF1ZXN0IGlzIGRlcXVldWVkIG9uIGNvbXBsZXRpbmcgdGhlIHByb2Nlc3MuXG4gICAqIElmIHRoZSBmaXJzdCByZXF1ZXN0IGluIHRoZSBxdWV1ZSBpcyBmaXJpbmcsIGRvIG5vdGhpbmcuXG4gICAqXG4gICAqIEBtZXRob2QgX3Byb2Nlc3NOZXh0UmVxdWVzdFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3Byb2Nlc3NOZXh0UmVxdWVzdCgpIHtcbiAgICBpZiAodGhpcy5pc0Rlc3Ryb3llZCkgcmV0dXJuO1xuICAgIGNvbnN0IHJlcXVlc3RFdnQgPSB0aGlzLnF1ZXVlWzBdO1xuICAgIGlmICh0aGlzLmlzT25saW5lKCkgJiYgcmVxdWVzdEV2dCAmJiAhcmVxdWVzdEV2dC5pc0ZpcmluZykge1xuICAgICAgaWYgKHJlcXVlc3RFdnQgaW5zdGFuY2VvZiBXZWJzb2NrZXRTeW5jRXZlbnQpIHtcbiAgICAgICAgaWYgKHRoaXMuc29ja2V0TWFuYWdlciAmJiB0aGlzLnNvY2tldE1hbmFnZXIuX2lzT3BlbigpKSB7XG4gICAgICAgICAgbG9nZ2VyLmRlYnVnKGBTeW5jIE1hbmFnZXIgV2Vic29ja2V0IFJlcXVlc3QgRmlyaW5nICR7cmVxdWVzdEV2dC5vcGVyYXRpb259IG9uIHRhcmdldCAke3JlcXVlc3RFdnQudGFyZ2V0fWAsXG4gICAgICAgICAgICByZXF1ZXN0RXZ0LnRvT2JqZWN0KCkpO1xuICAgICAgICAgIHRoaXMucmVxdWVzdE1hbmFnZXIuc2VuZFJlcXVlc3QocmVxdWVzdEV2dC5fZ2V0UmVxdWVzdERhdGEoKSxcbiAgICAgICAgICAgICAgcmVzdWx0ID0+IHRoaXMuX3hoclJlc3VsdChyZXN1bHQsIHJlcXVlc3RFdnQpKTtcbiAgICAgICAgICByZXF1ZXN0RXZ0LmlzRmlyaW5nID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsb2dnZXIuZGVidWcoJ1N5bmMgTWFuYWdlciBXZWJzb2NrZXQgUmVxdWVzdCBza2lwcGVkOyBzb2NrZXQgY2xvc2VkJyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZyhgU3luYyBNYW5hZ2VyIFhIUiBSZXF1ZXN0IEZpcmluZyAke3JlcXVlc3RFdnQub3BlcmF0aW9ufSAke3JlcXVlc3RFdnQudGFyZ2V0fWAsXG4gICAgICAgICAgcmVxdWVzdEV2dC50b09iamVjdCgpKTtcbiAgICAgICAgeGhyKHJlcXVlc3RFdnQuX2dldFJlcXVlc3REYXRhKCksIHJlc3VsdCA9PiB0aGlzLl94aHJSZXN1bHQocmVzdWx0LCByZXF1ZXN0RXZ0KSk7XG4gICAgICAgIHJlcXVlc3RFdnQuaXNGaXJpbmcgPSB0cnVlO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocmVxdWVzdEV2dCAmJiByZXF1ZXN0RXZ0LmlzRmlyaW5nKSB7XG4gICAgICBsb2dnZXIuZGVidWcoYFN5bmMgTWFuYWdlciBwcm9jZXNzTmV4dCBza2lwcGVkOyByZXF1ZXN0IHN0aWxsIGZpcmluZyAke3JlcXVlc3RFdnQub3BlcmF0aW9ufSBgICtcbiAgICAgICAgYG9uIHRhcmdldCAke3JlcXVlc3RFdnQudGFyZ2V0fWAsIHJlcXVlc3RFdnQudG9PYmplY3QoKSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3MgdGhlIHJlc3VsdCBvZiBhbiB4aHIgY2FsbCwgcm91dGluZyBpdCB0byB0aGUgYXBwcm9wcmlhdGUgaGFuZGxlci5cbiAgICpcbiAgICogQG1ldGhvZCBfeGhyUmVzdWx0XG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdH0gcmVzdWx0ICAtIFJlc3BvbnNlIG9iamVjdCByZXR1cm5lZCBieSB4aHIgY2FsbFxuICAgKiBAcGFyYW0gIHtsYXllci5TeW5jRXZlbnR9IHJlcXVlc3RFdnQgLSBSZXF1ZXN0IG9iamVjdFxuICAgKi9cbiAgX3hoclJlc3VsdChyZXN1bHQsIHJlcXVlc3RFdnQpIHtcbiAgICByZXN1bHQucmVxdWVzdCA9IHJlcXVlc3RFdnQ7XG4gICAgcmVxdWVzdEV2dC5pc0ZpcmluZyA9IGZhbHNlO1xuICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgIHRoaXMuX3hockVycm9yKHJlc3VsdCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3hoclN1Y2Nlc3MocmVzdWx0KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2F0ZWdvcml6ZSB0aGUgZXJyb3IgZm9yIGhhbmRsaW5nLlxuICAgKlxuICAgKiBAbWV0aG9kIF9nZXRFcnJvclN0YXRlXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdH0gcmVzdWx0ICAtIFJlc3BvbnNlIG9iamVjdCByZXR1cm5lZCBieSB4aHIgY2FsbFxuICAgKiBAcGFyYW0gIHtsYXllci5TeW5jRXZlbnR9IHJlcXVlc3RFdnQgLSBSZXF1ZXN0IG9iamVjdFxuICAgKiBAcGFyYW0gIHtib29sZWFufSBpc09ubGluZSAtIElzIG91ciBhcHAgc3RhdGUgc2V0IHRvIG9ubGluZVxuICAgKi9cbiAgX2dldEVycm9yU3RhdGUocmVzdWx0LCByZXF1ZXN0RXZ0LCBpc09ubGluZSkge1xuICAgIGlmICghaXNPbmxpbmUpIHtcbiAgICAgIC8vIENPUlMgZXJyb3JzIGxvb2sgaWRlbnRpY2FsIHRvIG9mZmxpbmU7IGJ1dCBpZiBvdXIgb25saW5lIHN0YXRlIGhhcyB0cmFuc2l0aW9uZWQgZnJvbSBmYWxzZSB0byB0cnVlIHJlcGVhdGVkbHkgd2hpbGUgcHJvY2Vzc2luZyB0aGlzIHJlcXVlc3QsXG4gICAgICAvLyB0aGF0cyBhIGhpbnQgdGhhdCB0aGF0IGl0cyBhIENPUlMgZXJyb3JcbiAgICAgIGlmIChyZXF1ZXN0RXZ0LnJldHVyblRvT25saW5lQ291bnQgPj0gU3luY01hbmFnZXIuTUFYX1JFVFJJRVNfQkVGT1JFX0NPUlNfRVJST1IpIHtcbiAgICAgICAgcmV0dXJuICdDT1JTJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAnb2ZmbGluZSc7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChyZXN1bHQuc3RhdHVzID09PSA0MDQgJiYgcmVzdWx0LmRhdGEgJiYgcmVzdWx0LmRhdGEuY29kZSA9PT0gMTAyKSB7XG4gICAgICByZXR1cm4gJ25vdEZvdW5kJztcbiAgICB9IGVsc2UgaWYgKHJlc3VsdC5zdGF0dXMgPT09IDQwOCkge1xuICAgICAgaWYgKHJlcXVlc3RFdnQucmV0cnlDb3VudCA+PSBTeW5jTWFuYWdlci5NQVhfUkVUUklFUykge1xuICAgICAgICByZXR1cm4gJ3Rvb01hbnlGYWlsdXJlc1doaWxlT25saW5lJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAndmFsaWRhdGVPbmxpbmVBbmRSZXRyeSc7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChbNTAyLCA1MDMsIDUwNF0uaW5kZXhPZihyZXN1bHQuc3RhdHVzKSAhPT0gLTEpIHtcbiAgICAgIGlmIChyZXF1ZXN0RXZ0LnJldHJ5Q291bnQgPj0gU3luY01hbmFnZXIuTUFYX1JFVFJJRVMpIHtcbiAgICAgICAgcmV0dXJuICd0b29NYW55RmFpbHVyZXNXaGlsZU9ubGluZSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gJ3NlcnZlclVuYXZhaWxhYmxlJztcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHJlc3VsdC5zdGF0dXMgPT09IDQwMSAmJiByZXN1bHQuZGF0YS5kYXRhICYmIHJlc3VsdC5kYXRhLmRhdGEubm9uY2UpIHtcbiAgICAgIHJldHVybiAncmVhdXRob3JpemUnO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gJ3NlcnZlclJlamVjdGVkUmVxdWVzdCc7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZSBmYWlsZWQgcmVxdWVzdHMuXG4gICAqXG4gICAqIDEuIElmIHRoZXJlIHdhcyBhbiBlcnJvciBmcm9tIHRoZSBzZXJ2ZXIsIHRoZW4gdGhlIHJlcXVlc3QgaGFzIHByb2JsZW1zXG4gICAqIDIuIElmIHdlIGRldGVybWluZSB3ZSBhcmUgbm90IGluIGZhY3Qgb25saW5lLCBjYWxsIHRoZSBjb25uZWN0aW9uRXJyb3IgaGFuZGxlclxuICAgKiAzLiBJZiB3ZSB0aGluayB3ZSBhcmUgb25saW5lLCB2ZXJpZnkgd2UgYXJlIG9ubGluZSBhbmQgdGhlbiBkZXRlcm1pbmUgaG93IHRvIGhhbmRsZSBpdC5cbiAgICpcbiAgICogQG1ldGhvZCBfeGhyRXJyb3JcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtICB7T2JqZWN0fSByZXN1bHQgIC0gUmVzcG9uc2Ugb2JqZWN0IHJldHVybmVkIGJ5IHhociBjYWxsXG4gICAqIEBwYXJhbSAge2xheWVyLlN5bmNFdmVudH0gcmVxdWVzdEV2dCAtIFJlcXVlc3Qgb2JqZWN0XG4gICAqL1xuICBfeGhyRXJyb3IocmVzdWx0KSB7XG4gICAgY29uc3QgcmVxdWVzdEV2dCA9IHJlc3VsdC5yZXF1ZXN0O1xuXG4gICAgbG9nZ2VyLndhcm4oYFN5bmMgTWFuYWdlciAke3JlcXVlc3RFdnQgaW5zdGFuY2VvZiBXZWJzb2NrZXRTeW5jRXZlbnQgPyAnV2Vic29ja2V0JyA6ICdYSFInfSBgICtcbiAgICAgIGAke3JlcXVlc3RFdnQub3BlcmF0aW9ufSBSZXF1ZXN0IG9uIHRhcmdldCAke3JlcXVlc3RFdnQudGFyZ2V0fSBoYXMgRmFpbGVkYCwgcmVxdWVzdEV2dC50b09iamVjdCgpKTtcblxuICAgIGNvbnN0IGVyclN0YXRlID0gdGhpcy5fZ2V0RXJyb3JTdGF0ZShyZXN1bHQsIHJlcXVlc3RFdnQsIHRoaXMuaXNPbmxpbmUoKSk7XG4gICAgbG9nZ2VyLndhcm4oJ1N5bmMgTWFuYWdlciBFcnJvciBTdGF0ZTogJyArIGVyclN0YXRlKTtcbiAgICBzd2l0Y2ggKGVyclN0YXRlKSB7XG4gICAgICBjYXNlICd0b29NYW55RmFpbHVyZXNXaGlsZU9ubGluZSc6XG4gICAgICAgIHRoaXMuX3hockhhbmRsZVNlcnZlckVycm9yKHJlc3VsdCwgJ1N5bmMgTWFuYWdlciBTZXJ2ZXIgVW5hdmFpbGFibGUgVG9vIExvbmc7IHJlbW92aW5nIHJlcXVlc3QnKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdub3RGb3VuZCc6XG4gICAgICAgIHRoaXMuX3hockhhbmRsZVNlcnZlckVycm9yKHJlc3VsdCwgJ1Jlc291cmNlIG5vdCBmb3VuZDsgcHJlc3VtYWJseSBkZWxldGVkJyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAndmFsaWRhdGVPbmxpbmVBbmRSZXRyeSc6XG4gICAgICAgIC8vIFNlcnZlciBhcHBlYXJzIHRvIGJlIGh1bmcgYnV0IHdpbGwgZXZlbnR1YWxseSByZWNvdmVyLlxuICAgICAgICAvLyBSZXRyeSBhIGZldyB0aW1lcyBhbmQgdGhlbiBlcnJvciBvdXQuXG4gICAgICAgIHRoaXMuX3hoclZhbGlkYXRlSXNPbmxpbmUoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdzZXJ2ZXJVbmF2YWlsYWJsZSc6XG4gICAgICAgIC8vIFNlcnZlciBpcyBpbiBhIGJhZCBzdGF0ZSBidXQgd2lsbCBldmVudHVhbGx5IHJlY292ZXI7XG4gICAgICAgIC8vIGtlZXAgcmV0cnlpbmcuXG4gICAgICAgIHRoaXMuX3hockhhbmRsZVNlcnZlclVuYXZhaWxhYmxlRXJyb3IocmVxdWVzdEV2dCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAncmVhdXRob3JpemUnOlxuICAgICAgICAvLyBzZXNzaW9uVG9rZW4gYXBwZWFycyB0byBubyBsb25nZXIgYmUgdmFsaWQ7IGZvcndhcmQgcmVzcG9uc2VcbiAgICAgICAgLy8gb24gdG8gY2xpZW50LWF1dGhlbnRpY2F0b3IgdG8gcHJvY2Vzcy5cbiAgICAgICAgLy8gRG8gbm90IHJldHJ5IG5vciBhZHZhbmNlIHRvIG5leHQgcmVxdWVzdC5cbiAgICAgICAgcmVxdWVzdEV2dC5jYWxsYmFjayhyZXN1bHQpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3NlcnZlclJlamVjdGVkUmVxdWVzdCc6XG4gICAgICAgIC8vIFNlcnZlciBwcmVzdW1hYmx5IGRpZCBub3QgbGlrZSB0aGUgYXJndW1lbnRzIHRvIHRoaXMgY2FsbFxuICAgICAgICAvLyBvciB0aGUgdXJsIHdhcyBpbnZhbGlkLiAgRG8gbm90IHJldHJ5OyB0cmlnZ2VyIHRoZSBjYWxsYmFja1xuICAgICAgICAvLyBhbmQgbGV0IHRoZSBjYWxsZXIgaGFuZGxlIGl0LlxuICAgICAgICB0aGlzLl94aHJIYW5kbGVTZXJ2ZXJFcnJvcihyZXN1bHQsICdTeW5jIE1hbmFnZXIgU2VydmVyIFJlamVjdHMgUmVxdWVzdDsgcmVtb3ZpbmcgcmVxdWVzdCcpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ0NPUlMnOlxuICAgICAgICAvLyBBIHBhdHRlcm4gb2Ygb2ZmbGluZS1saWtlIGZhaWx1cmVzIHRoYXQgc3VnZ2VzdHMgaXRzIGFjdHVhbGx5IGEgQ09ScyBlcnJvclxuICAgICAgICB0aGlzLl94aHJIYW5kbGVTZXJ2ZXJFcnJvcihyZXN1bHQsICdTeW5jIE1hbmFnZXIgU2VydmVyIGRldGVjdHMgQ09SUy1saWtlIGVycm9yczsgcmVtb3ZpbmcgcmVxdWVzdCcpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ29mZmxpbmUnOlxuICAgICAgICB0aGlzLl94aHJIYW5kbGVDb25uZWN0aW9uRXJyb3IoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZSBhIHNlcnZlciB1bmF2YWlsYWJsZSBlcnJvci5cbiAgICpcbiAgICogSW4gdGhlIGV2ZW50IG9mIGEgNTAyIChCYWQgR2F0ZXdheSksIDUwMyAoc2VydmljZSB1bmF2YWlsYWJsZSlcbiAgICogb3IgNTA0IChnYXRld2F5IHRpbWVvdXQpIGVycm9yIGZyb20gdGhlIHNlcnZlclxuICAgKiBhc3N1bWUgd2UgaGF2ZSBhbiBlcnJvciB0aGF0IGlzIHNlbGYgY29ycmVjdGluZyBvbiB0aGUgc2VydmVyLlxuICAgKiBVc2UgZXhwb25lbnRpYWwgYmFja29mZiB0byByZXRyeSB0aGUgcmVxdWVzdC5cbiAgICpcbiAgICogTm90ZSB0aGF0IGVhY2ggY2FsbCB3aWxsIGluY3JlbWVudCByZXRyeUNvdW50OyB0aGVyZSBpcyBhIG1heGltdW1cbiAgICogb2YgTUFYX1JFVFJJRVMgYmVmb3JlIGl0IGlzIHRyZWF0ZWQgYXMgYW4gZXJyb3JcbiAgICpcbiAgICogQG1ldGhvZCAgX3hockhhbmRsZVNlcnZlclVuYXZhaWxhYmxlRXJyb3JcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtsYXllci5TeW5jRXZlbnR9IHJlcXVlc3RcbiAgICovXG4gIF94aHJIYW5kbGVTZXJ2ZXJVbmF2YWlsYWJsZUVycm9yKHJlcXVlc3QpIHtcbiAgICBjb25zdCBtYXhEZWxheSA9IFN5bmNNYW5hZ2VyLk1BWF9VTkFWQUlMQUJMRV9SRVRSWV9XQUlUO1xuICAgIGNvbnN0IGRlbGF5ID0gVXRpbHMuZ2V0RXhwb25lbnRpYWxCYWNrb2ZmU2Vjb25kcyhtYXhEZWxheSwgTWF0aC5taW4oMTUsIHJlcXVlc3QucmV0cnlDb3VudCsrKSk7XG4gICAgbG9nZ2VyLndhcm4oYFN5bmMgTWFuYWdlciBTZXJ2ZXIgVW5hdmFpbGFibGU7IHJldHJ5IGNvdW50ICR7cmVxdWVzdC5yZXRyeUNvdW50fTsgcmV0cnlpbmcgaW4gJHtkZWxheX0gc2Vjb25kc2ApO1xuICAgIHNldFRpbWVvdXQodGhpcy5fcHJvY2Vzc05leHRSZXF1ZXN0LmJpbmQodGhpcyksIGRlbGF5ICogMTAwMCk7XG4gIH1cblxuICAvKipcbiAgICogSGFuZGxlIGEgc2VydmVyIGVycm9yIGluIHJlc3BvbnNlIHRvIGZpcmluZyBzeW5jIGV2ZW50LlxuICAgKlxuICAgKiBJZiB0aGVyZSBpcyBhIHNlcnZlciBlcnJvciwgaXRzIHByZXN1bWFibHkgbm9uLXJlY292ZXJhYmxlL25vbi1yZXRyeWFibGUgZXJyb3IsIHNvXG4gICAqIHdlJ3JlIGdvaW5nIHRvIGFib3J0IHRoaXMgcmVxdWVzdC5cbiAgICpcbiAgICogMS4gSWYgYSBjYWxsYmFjayB3YXMgcHJvdmlkZWQsIGNhbGwgaXQgdG8gaGFuZGxlIHRoZSBlcnJvclxuICAgKiAyLiBJZiBhIHJvbGxiYWNrIGNhbGwgaXMgcHJvdmlkZWQsIGNhbGwgaXQgdG8gdW5kbyBhbnkgcGF0Y2gvZGVsZXRlL2V0Yy4uLiBjaGFuZ2VzXG4gICAqIDMuIElmIHRoZSByZXF1ZXN0IHdhcyB0byBjcmVhdGUgYSByZXNvdXJjZSwgcmVtb3ZlIGZyb20gdGhlIHF1ZXVlIGFsbCByZXF1ZXN0c1xuICAgKiAgICB0aGF0IGRlcGVuZGVkIHVwb24gdGhhdCByZXNvdXJjZS5cbiAgICogNC4gQWR2YW5jZSB0byBuZXh0IHJlcXVlc3RcbiAgICpcbiAgICogQG1ldGhvZCBfeGhySGFuZGxlU2VydmVyRXJyb3JcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtICB7T2JqZWN0fSByZXN1bHQgIC0gUmVzcG9uc2Ugb2JqZWN0IHJldHVybmVkIGJ5IHhociBjYWxsXG4gICAqXG4gICAqL1xuICBfeGhySGFuZGxlU2VydmVyRXJyb3IocmVzdWx0LCBsb2dNc2cpIHtcbiAgICAvLyBFeGVjdXRlIGFsbCBjYWxsYmFja3MgcHJvdmlkZWQgYnkgdGhlIHJlcXVlc3RcbiAgICByZXN1bHQucmVxdWVzdC5jYWxsYmFjayhyZXN1bHQpO1xuICAgIGxvZ2dlci5lcnJvcihsb2dNc2csIHJlc3VsdC5yZXF1ZXN0KTtcbiAgICB0aGlzLnRyaWdnZXIoJ3N5bmM6ZXJyb3InLCB7XG4gICAgICB0YXJnZXQ6IHJlc3VsdC5yZXF1ZXN0LnRhcmdldCxcbiAgICAgIHJlcXVlc3Q6IHJlc3VsdC5yZXF1ZXN0LFxuICAgICAgZXJyb3I6IHJlc3VsdC5kYXRhLFxuICAgIH0pO1xuXG4gICAgcmVzdWx0LnJlcXVlc3Quc3VjY2VzcyA9IGZhbHNlO1xuXG4gICAgLy8gSWYgYSBQT1NUIHJlcXVlc3QgZmFpbHMsIGFsbCByZXF1ZXN0cyB0aGF0IGRlcGVuZCB1cG9uIHRoaXMgb2JqZWN0XG4gICAgLy8gbXVzdCBiZSBwdXJnZWRcbiAgICBpZiAocmVzdWx0LnJlcXVlc3Qub3BlcmF0aW9uID09PSAnUE9TVCcpIHtcbiAgICAgIHRoaXMuX3B1cmdlRGVwZW5kZW50UmVxdWVzdHMocmVzdWx0LnJlcXVlc3QpO1xuICAgIH1cblxuICAgIC8vIFJlbW92ZSB0aGlzIHJlcXVlc3QgYXMgd2VsbCAoc2lkZS1lZmZlY3Q6IHJvbGxzIGJhY2sgdGhlIG9wZXJhdGlvbilcbiAgICB0aGlzLl9yZW1vdmVSZXF1ZXN0KHJlc3VsdC5yZXF1ZXN0KTtcblxuICAgIC8vIEFuZCBmaW5hbGx5LCB3ZSBhcmUgcmVhZHkgdG8gdHJ5IHRoZSBuZXh0IHJlcXVlc3RcbiAgICB0aGlzLl9wcm9jZXNzTmV4dFJlcXVlc3QoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJZiB0aGVyZSBpcyBhIGNvbm5lY3Rpb24gZXJyb3IsIHdhaXQgZm9yIHJldHJ5LlxuICAgKlxuICAgKiBJbiB0aGUgZXZlbnQgb2Ygd2hhdCBhcHBlYXJzIHRvIGJlIGEgY29ubmVjdGlvbiBlcnJvcixcbiAgICogV2FpdCB1bnRpbCBhICdjb25uZWN0ZWQnIGV2ZW50IGJlZm9yZSBwcm9jZXNzaW5nIHRoZSBuZXh0IHJlcXVlc3QgKGFjdHVhbGx5IHJlcHJvY2Vzc2luZyB0aGUgY3VycmVudCBldmVudClcbiAgICpcbiAgICogQG1ldGhvZCBfeGhySGFuZGxlQ29ubmVjdGlvbkVycm9yXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfeGhySGFuZGxlQ29ubmVjdGlvbkVycm9yKCkge1xuICAgIC8vIE5vdGhpbmcgdG8gYmUgZG9uZTsgd2UgYWxyZWFkeSBoYXZlIHRoZSBiZWxvdyBldmVudCBoYW5kbGVyIHNldHVwXG4gICAgLy8gdGhpcy5vbmxpbmVNYW5hZ2VyLm9uY2UoJ2Nvbm5lY3RlZCcsICgpID0+IHRoaXMuX3Byb2Nlc3NOZXh0UmVxdWVzdCgpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBWZXJpZnkgdGhhdCB3ZSBhcmUgb25saW5lIGFuZCByZXRyeSByZXF1ZXN0LlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBpcyBjYWxsZWQgd2hlbiB3ZSB0aGluayB3ZSdyZSBvbmxpbmUsIGJ1dFxuICAgKiBoYXZlIGRldGVybWluZWQgd2UgbmVlZCB0byB2YWxpZGF0ZSB0aGF0IGFzc3VtcHRpb24uXG4gICAqXG4gICAqIFRlc3QgdGhhdCB3ZSBoYXZlIGEgY29ubmVjdGlvbjsgaWYgd2UgZG8sXG4gICAqIHJldHJ5IHRoZSByZXF1ZXN0IG9uY2UsIGFuZCBpZiBpdCBmYWlscyBhZ2FpbixcbiAgICogX3hockVycm9yKCkgd2lsbCBkZXRlcm1pbmUgaXQgdG8gaGF2ZSBmYWlsZWQgYW5kIHJlbW92ZSBpdCBmcm9tIHRoZSBxdWV1ZS5cbiAgICpcbiAgICogSWYgd2UgYXJlIG9mZmxpbmUsIHRoZW4gbGV0IF94aHJIYW5kbGVDb25uZWN0aW9uRXJyb3IgaGFuZGxlIGl0LlxuICAgKlxuICAgKiBAbWV0aG9kIF94aHJWYWxpZGF0ZUlzT25saW5lXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfeGhyVmFsaWRhdGVJc09ubGluZSgpIHtcbiAgICBsb2dnZXIuZGVidWcoJ1N5bmMgTWFuYWdlciB2ZXJpZnlpbmcgb25saW5lIHN0YXRlJyk7XG4gICAgdGhpcy5vbmxpbmVNYW5hZ2VyLmNoZWNrT25saW5lU3RhdHVzKGlzT25saW5lID0+IHRoaXMuX3hoclZhbGlkYXRlSXNPbmxpbmVDYWxsYmFjayhpc09ubGluZSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIElmIHdlIGhhdmUgdmVyaWZpZWQgd2UgYXJlIG9ubGluZSwgcmV0cnkgcmVxdWVzdC5cbiAgICpcbiAgICogV2Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSByZXNwb25zZSB0byBvdXIgL25vbmNlcyBjYWxsXG4gICAqIHdoaWNoIGFzc3VtaW5nIHRoZSBzZXJ2ZXIgaXMgYWN0dWFsbHkgYWxpdmUsXG4gICAqIHdpbGwgdGVsbCB1cyBpZiB0aGUgY29ubmVjdGlvbiBpcyB3b3JraW5nLlxuICAgKlxuICAgKiBJZiB3ZSBhcmUgb2ZmbGluZSwgZmxhZyB1cyBhcyBvZmZsaW5lIGFuZCBsZXQgdGhlIENvbm5lY3Rpb25FcnJvciBoYW5kbGVyIGhhbmRsZSB0aGlzXG4gICAqIElmIHdlIGFyZSBvbmxpbmUsIGdpdmUgdGhlIHJlcXVlc3QgYSBzaW5nbGUgcmV0cnkgKHRoZXJlIGlzIG5ldmVyIG1vcmUgdGhhbiBvbmUgcmV0cnkpXG4gICAqXG4gICAqIEBtZXRob2QgX3hoclZhbGlkYXRlSXNPbmxpbmVDYWxsYmFja1xuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0gIHtib29sZWFufSBpc09ubGluZSAgLSBSZXNwb25zZSBvYmplY3QgcmV0dXJuZWQgYnkgeGhyIGNhbGxcbiAgICovXG4gIF94aHJWYWxpZGF0ZUlzT25saW5lQ2FsbGJhY2soaXNPbmxpbmUpIHtcbiAgICBsb2dnZXIuZGVidWcoJ1N5bmMgTWFuYWdlciBvbmxpbmUgY2hlY2sgcmVzdWx0IGlzICcgKyBpc09ubGluZSk7XG4gICAgaWYgKCFpc09ubGluZSkge1xuICAgICAgLy8gVHJlYXQgdGhpcyBhcyBhIENvbm5lY3Rpb24gRXJyb3JcbiAgICAgIHRoaXMuX3hockhhbmRsZUNvbm5lY3Rpb25FcnJvcigpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBSZXRyeSB0aGUgcmVxdWVzdCBpbiBjYXNlIHdlIHdlcmUgb2ZmbGluZSwgYnV0IGFyZSBub3cgb25saW5lLlxuICAgICAgLy8gT2YgY291cnNlLCBpZiB0aGlzIGZhaWxzLCBnaXZlIGl0IHVwIGVudGlyZWx5LlxuICAgICAgdGhpcy5xdWV1ZVswXS5yZXRyeUNvdW50Kys7XG4gICAgICB0aGlzLl9wcm9jZXNzTmV4dFJlcXVlc3QoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVGhlIFhIUiByZXF1ZXN0IHdhcyBzdWNjZXNzZnVsLlxuICAgKlxuICAgKiBBbnkgeGhyIHJlcXVlc3QgdGhhdCBhY3R1YWxseSBzdWNjZWRlczpcbiAgICpcbiAgICogMS4gUmVtb3ZlIGl0IGZyb20gdGhlIHF1ZXVlXG4gICAqIDIuIENhbGwgYW55IGNhbGxiYWNrc1xuICAgKiAzLiBBZHZhbmNlIHRvIG5leHQgcmVxdWVzdFxuICAgKlxuICAgKiBAbWV0aG9kIF94aHJTdWNjZXNzXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdH0gcmVzdWx0ICAtIFJlc3BvbnNlIG9iamVjdCByZXR1cm5lZCBieSB4aHIgY2FsbFxuICAgKiBAcGFyYW0gIHtsYXllci5TeW5jRXZlbnR9IHJlcXVlc3RFdnQgLSBSZXF1ZXN0IG9iamVjdFxuICAgKi9cbiAgX3hoclN1Y2Nlc3MocmVzdWx0KSB7XG4gICAgY29uc3QgcmVxdWVzdEV2dCA9IHJlc3VsdC5yZXF1ZXN0O1xuICAgIGxvZ2dlci5kZWJ1ZyhgU3luYyBNYW5hZ2VyICR7cmVxdWVzdEV2dCBpbnN0YW5jZW9mIFdlYnNvY2tldFN5bmNFdmVudCA/ICdXZWJzb2NrZXQnIDogJ1hIUid9IGAgK1xuICAgICAgYCR7cmVxdWVzdEV2dC5vcGVyYXRpb259IFJlcXVlc3Qgb24gdGFyZ2V0ICR7cmVxdWVzdEV2dC50YXJnZXR9IGhhcyBTdWNjZWVkZWRgLCByZXF1ZXN0RXZ0LnRvT2JqZWN0KCkpO1xuICAgIGlmIChyZXN1bHQuZGF0YSkgbG9nZ2VyLmRlYnVnKHJlc3VsdC5kYXRhKTtcbiAgICByZXF1ZXN0RXZ0LnN1Y2Nlc3MgPSB0cnVlO1xuICAgIHRoaXMuX3JlbW92ZVJlcXVlc3QocmVxdWVzdEV2dCk7XG4gICAgaWYgKHJlcXVlc3RFdnQuY2FsbGJhY2spIHJlcXVlc3RFdnQuY2FsbGJhY2socmVzdWx0KTtcbiAgICB0aGlzLl9wcm9jZXNzTmV4dFJlcXVlc3QoKTtcblxuICAgIHRoaXMudHJpZ2dlcignc3luYzpzdWNjZXNzJywge1xuICAgICAgdGFyZ2V0OiByZXF1ZXN0RXZ0LnRhcmdldCxcbiAgICAgIHJlcXVlc3Q6IHJlcXVlc3RFdnQsXG4gICAgICByZXNwb25zZTogcmVzdWx0LmRhdGEsXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIHRoZSBTeW5jRXZlbnQgcmVxdWVzdCBmcm9tIHRoZSBxdWV1ZS5cbiAgICpcbiAgICogQG1ldGhvZCBfcmVtb3ZlUmVxdWVzdFxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0gIHtsYXllci5TeW5jRXZlbnR9IHJlcXVlc3RFdnQgLSBTeW5jRXZlbnQgUmVxdWVzdCB0byByZW1vdmVcbiAgICovXG4gIF9yZW1vdmVSZXF1ZXN0KHJlcXVlc3RFdnQpIHtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMucXVldWUuaW5kZXhPZihyZXF1ZXN0RXZ0KTtcbiAgICBpZiAoaW5kZXggIT09IC0xKSB0aGlzLnF1ZXVlLnNwbGljZShpbmRleCwgMSk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIHJlcXVlc3RzIGZyb20gcXVldWUgdGhhdCBkZXBlbmQgb24gc3BlY2lmaWVkIHJlc291cmNlLlxuICAgKlxuICAgKiBJZiB0aGVyZSBpcyBhIFBPU1QgcmVxdWVzdCB0byBjcmVhdGUgYSBuZXcgcmVzb3VyY2UsIGFuZCB0aGVyZSBhcmUgUEFUQ0gsIERFTEVURSwgZXRjLi4uXG4gICAqIHJlcXVlc3RzIG9uIHRoYXQgcmVzb3VyY2UsIGlmIHRoZSBQT1NUIHJlcXVlc3QgZmFpbHMsIHRoZW4gYWxsIFBBVENILCBERUxFVEUsIGV0Y1xuICAgKiByZXF1ZXN0cyBtdXN0IGJlIHJlbW92ZWQgZnJvbSB0aGUgcXVldWUuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB3ZSBkbyBub3QgY2FsbCB0aGUgcm9sbGJhY2sgb24gdGhlc2UgZGVwZW5kZW50IHJlcXVlc3RzIGJlY2F1c2UgdGhlIGV4cGVjdGVkXG4gICAqIHJvbGxiYWNrIGlzIHRvIGRlc3Ryb3kgdGhlIHRoaW5nIHRoYXQgd2FzIGNyZWF0ZWQsIHdoaWNoIG1lYW5zIGFueSBvdGhlciByb2xsYmFjayBoYXMgbm8gZWZmZWN0LlxuICAgKlxuICAgKiBAbWV0aG9kIF9wdXJnZURlcGVuZGVudFJlcXVlc3RzXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge2xheWVyLlN5bmNFdmVudH0gcmVxdWVzdCAtIFJlcXVlc3Qgd2hvc2UgdGFyZ2V0IGlzIG5vIGxvbmdlciB2YWxpZFxuICAgKi9cbiAgX3B1cmdlRGVwZW5kZW50UmVxdWVzdHMocmVxdWVzdCkge1xuICAgIHRoaXMucXVldWUgPSB0aGlzLnF1ZXVlLmZpbHRlcihldnQgPT4gZXZ0LmRlcGVuZHMuaW5kZXhPZihyZXF1ZXN0LnRhcmdldCkgPT09IC0xIHx8IGV2dCA9PT0gcmVxdWVzdCk7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBSZW1vdmUgZnJvbSBxdWV1ZSBhbGwgZXZlbnRzIHRoYXQgb3BlcmF0ZSB1cG9uIHRoZSBkZWxldGVkIG9iamVjdC5cbiAgICpcbiAgICogQG1ldGhvZCBfcHVyZ2VPbkRlbGV0ZVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0gIHtsYXllci5TeW5jRXZlbnR9IGV2dCAtIERlbGV0ZSBldmVudCB0aGF0IHJlcXVpcmVzIHJlbW92YWwgb2Ygb3RoZXIgZXZlbnRzXG4gICAqL1xuICBfcHVyZ2VPbkRlbGV0ZShldnQpIHtcbiAgICB0aGlzLnF1ZXVlID0gdGhpcy5xdWV1ZS5maWx0ZXIocmVxdWVzdCA9PiByZXF1ZXN0LmRlcGVuZHMuaW5kZXhPZihldnQudGFyZ2V0KSA9PT0gLTEgfHwgZXZ0ID09PSByZXF1ZXN0KTtcbiAgfVxuXG5cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLnF1ZXVlLmZvckVhY2goZXZ0ID0+IGV2dC5kZXN0cm95KCkpO1xuICAgIHRoaXMucXVldWUgPSBudWxsO1xuICAgIHN1cGVyLmRlc3Ryb3koKTtcbiAgfVxufVxuXG4vKipcbiAqIFdlYnNvY2tldCBNYW5hZ2VyIGZvciBnZXR0aW5nIHNvY2tldCBzdGF0ZS5cbiAqIEB0eXBlIHtsYXllci5XZWJzb2NrZXRzLlNvY2tldE1hbmFnZXJ9XG4gKi9cblN5bmNNYW5hZ2VyLnByb3RvdHlwZS5zb2NrZXRNYW5hZ2VyID0gbnVsbDtcblxuLyoqXG4gKiBXZWJzb2NrZXQgUmVxdWVzdCBNYW5hZ2VyIGZvciBzZW5kaW5nIHJlcXVlc3RzLlxuICogQHR5cGUge2xheWVyLldlYnNvY2tldHMuUmVxdWVzdE1hbmFnZXJ9XG4gKi9cblN5bmNNYW5hZ2VyLnByb3RvdHlwZS5yZXF1ZXN0TWFuYWdlciA9IG51bGw7XG5cbi8qKlxuICogUmVmZXJlbmNlIHRvIHRoZSBPbmxpbmUgU3RhdGUgTWFuYWdlci5cbiAqXG4gKiBTeW5jIE1hbmFnZXIgdXNlcyBvbmxpbmUgc3RhdHVzIHRvIGRldGVybWluZSBpZiBpdCBjYW4gZmlyZSBzeW5jLXJlcXVlc3RzLlxuICogQHByaXZhdGVcbiAqIEB0eXBlIHtsYXllci5PbmxpbmVTdGF0ZU1hbmFnZXJ9XG4gKi9cblN5bmNNYW5hZ2VyLnByb3RvdHlwZS5vbmxpbmVNYW5hZ2VyID0gbnVsbDtcblxuLyoqXG4gKiBUaGUgYXJyYXkgb2YgbGF5ZXIuU3luY0V2ZW50IGluc3RhbmNlcyBhd2FpdGluZyB0byBiZSBmaXJlZC5cbiAqIEB0eXBlIHtsYXllci5TeW5jRXZlbnRbXX1cbiAqL1xuU3luY01hbmFnZXIucHJvdG90eXBlLnF1ZXVlID0gbnVsbDtcblxuLyoqXG4gKiBNYXhpbXVtIGV4cG9uZW50aWFsIGJhY2tvZmYgd2FpdC5cbiAqXG4gKiBJZiB0aGUgc2VydmVyIGlzIHJldHVybmluZyA1MDIsIDUwMyBvciA1MDQgZXJyb3JzLCBleHBvbmVudGlhbCBiYWNrb2ZmXG4gKiBzaG91bGQgbmV2ZXIgd2FpdCBsb25nZXIgdGhhbiB0aGlzIG51bWJlciBvZiBzZWNvbmRzICgxNSBtaW51dGVzKVxuICogQHR5cGUge051bWJlcn1cbiAqIEBzdGF0aWNcbiAqL1xuU3luY01hbmFnZXIuTUFYX1VOQVZBSUxBQkxFX1JFVFJZX1dBSVQgPSA2MCAqIDE1O1xuXG4vKipcbiAqIFJldHJpZXMgYmVmb3JlIHN1c3BlY3QgQ09SUyBlcnJvci5cbiAqXG4gKiBIb3cgbWFueSB0aW1lcyBjYW4gd2UgdHJhbnNpdGlvbiBmcm9tIG9mZmxpbmUgdG8gb25saW5lIHN0YXRlXG4gKiB3aXRoIHRoaXMgcmVxdWVzdCBhdCB0aGUgZnJvbnQgb2YgdGhlIHF1ZXVlIGJlZm9yZSB3ZSBjb25jbHVkZVxuICogdGhhdCB0aGUgcmVhc29uIHdlIGtlZXAgdGhpbmtpbmcgd2UncmUgZ29pbmcgb2ZmbGluZSBpc1xuICogYSBDT1JTIGVycm9yIHJldHVybmluZyBhIHN0YXR1cyBvZiAwLiAgSWYgdGhhdCBwYXR0ZXJuXG4gKiBzaG93cyAzIHRpbWVzIGluIGEgcm93LCB0aGVyZSBpcyBsaWtlbHkgYSBDT1JTIGVycm9yLlxuICogTm90ZSB0aGF0IENPUlMgZXJyb3JzIGFwcGVhciB0byBqYXZhc2NyaXB0IGFzIGEgc3RhdHVzPTAgZXJyb3IsXG4gKiB3aGljaCBpcyB0aGUgc2FtZSBhcyBpZiB0aGUgY2xpZW50IHdlcmUgb2ZmbGluZS5cbiAqIEB0eXBlIHtudW1iZXJ9XG4gKiBAc3RhdGljXG4gKi9cblN5bmNNYW5hZ2VyLk1BWF9SRVRSSUVTX0JFRk9SRV9DT1JTX0VSUk9SID0gMztcblxuLyoqXG4gKiBBYm9ydCByZXF1ZXN0IGFmdGVyIHRoaXMgbnVtYmVyIG9mIHJldHJpZXMuXG4gKlxuICogQHR5cGUge251bWJlcn1cbiAqIEBzdGF0aWNcbiAqL1xuU3luY01hbmFnZXIuTUFYX1JFVFJJRVMgPSAyMDtcblxuXG5TeW5jTWFuYWdlci5fc3VwcG9ydGVkRXZlbnRzID0gW1xuICAvKipcbiAgICogQSBzeW5jIHJlcXVlc3QgaGFzIGZhaWxlZC5cbiAgICpcbiAgICogQGV2ZW50XG4gICAqIEBwYXJhbSB7bGF5ZXIuU3luY0V2ZW50fSBldnQgLSBUaGUgcmVxdWVzdCBvYmplY3RcbiAgICogQHBhcmFtIHtPYmplY3R9IHJlc3VsdFxuICAgKiBAcGFyYW0ge3N0cmluZ30gcmVzdWx0LnRhcmdldCAtIElEIG9mIHRoZSBtZXNzYWdlL2NvbnZlcnNhdGlvbi9ldGMuIGJlaW5nIG9wZXJhdGVkIHVwb25cbiAgICogQHBhcmFtIHtsYXllci5TeW5jRXZlbnR9IHJlc3VsdC5yZXF1ZXN0IC0gVGhlIG9yaWdpbmFsIHJlcXVlc3RcbiAgICogQHBhcmFtIHtPYmplY3R9IHJlc3VsdC5lcnJvciAtIFRoZSBlcnJvciBvYmplY3Qge2lkLCBjb2RlLCBtZXNzYWdlLCB1cmx9XG4gICAqL1xuICAnc3luYzplcnJvcicsXG5cbiAgLyoqXG4gICAqIEEgc3luYyBsYXllciByZXF1ZXN0IGhhcyBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5LlxuICAgKlxuICAgKiBAZXZlbnRcbiAgICogQHBhcmFtIHtPYmplY3R9IHJlc3VsdFxuICAgKiBAcGFyYW0ge3N0cmluZ30gcmVzdWx0LnRhcmdldCAtIElEIG9mIHRoZSBtZXNzYWdlL2NvbnZlcnNhdGlvbi9ldGMuIGJlaW5nIG9wZXJhdGVkIHVwb25cbiAgICogQHBhcmFtIHtsYXllci5TeW5jRXZlbnR9IHJlc3VsdC5yZXF1ZXN0IC0gVGhlIG9yaWdpbmFsIHJlcXVlc3RcbiAgICogQHBhcmFtIHtPYmplY3R9IHJlc3VsdC5kYXRhIC0gbnVsbCBvciBhbnkgZGF0YSByZXR1cm5lZCBieSB0aGUgY2FsbFxuICAgKi9cbiAgJ3N5bmM6c3VjY2VzcycsXG5cbiAgLyoqXG4gICAqIEEgbmV3IHN5bmMgcmVxdWVzdCBoYXMgYmVlbiBhZGRlZC5cbiAgICpcbiAgICogQGV2ZW50XG4gICAqIEBwYXJhbSB7bGF5ZXIuU3luY0V2ZW50fSBldnQgLSBUaGUgcmVxdWVzdCBvYmplY3RcbiAgICovXG4gICdzeW5jOmFkZCcsXG5dLmNvbmNhdChSb290Ll9zdXBwb3J0ZWRFdmVudHMpO1xuXG5Sb290LmluaXRDbGFzcyhTeW5jTWFuYWdlcik7XG5tb2R1bGUuZXhwb3J0cyA9IFN5bmNNYW5hZ2VyO1xuIl19
