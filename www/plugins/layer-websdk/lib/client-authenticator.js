'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Layer Client.  Access the layer by calling create and receiving it
 * from the "ready" callback.

  var client = new layer.Client({
    appId: "layer:///apps/staging/ffffffff-ffff-ffff-ffff-ffffffffffff",
    userId: "Dref",
    challenge: function(evt) {
      myAuthenticator({
        nonce: evt.nonce,
        onSuccess: evt.callback
      });
    },
    ready: function(client) {
      alert("Yay, I finally got my client!");
    }
  });

 * The Layer Client/ClientAuthenticator classes have been divided into:
 *
 * 1. ClientAuthenticator: Manages all authentication and connectivity related issues
 * 2. Client: Manages access to Conversations, Queries, Messages, Events, etc...
 *
 * @class layer.ClientAuthenticator
 * @private
 * @extends layer.Root
 * @author Michael Kantor
 *
 */

var xhr = require('./xhr');
var Root = require('./root');
var SocketManager = require('./websockets/socket-manager');
var WebsocketChangeManager = require('./websockets/change-manager');
var WebsocketRequestManager = require('./websockets/request-manager');
var LayerError = require('./layer-error');
var OnlineManager = require('./online-state-manager');
var SyncManager = require('./sync-manager');

var _require = require('./sync-event');

var XHRSyncEvent = _require.XHRSyncEvent;
var WebsocketSyncEvent = _require.WebsocketSyncEvent;

var _require2 = require('./const');

var ACCEPT = _require2.ACCEPT;
var LOCALSTORAGE_KEYS = _require2.LOCALSTORAGE_KEYS;

var Util = require('./client-utils');
var logger = require('./logger');

var MAX_XHR_RETRIES = 3;

var ClientAuthenticator = function (_Root) {
  _inherits(ClientAuthenticator, _Root);

  /**
   * Create a new Client.
   *
   * While the appId is the only required parameter, the userId parameter
   * is strongly recommended.
   *
   *      var client = new Client({
   *          appId: "layer:///apps/staging/uuid",
   *          userId: "fred"
   *      });
   *
   * For trusted devices, you can enable storage of data to indexedDB and localStorage with the `isTrustedDevice` property:
   *
   *      var client = new Client({
   *          appId: "layer:///apps/staging/uuid",
   *          userId: "fred",
   *          isTrustedDevice: true
   *      });
   *
   * @method constructor
   * @param  {Object} options
   * @param  {string} options.appId           - "layer:///apps/production/uuid"; Identifies what
   *                                            application we are connecting to.
   * @param  {string} [options.url=https://api.layer.com] - URL to log into a different REST server
   * @param {boolean} [options.isTrustedDevice=false] - If this is a trusted device, the sessionToken will be written to localStorage
   *                                                    for faster reauthentication on reloading.
   * @param  {string} [options.userId='']     - If you provide a userId, AND if isTrustedDevice is true, we will attempt to restore this user's session.
   * @param {number} [options.logLevel=ERROR] - Provide a log level that is one of layer.Constants.LOG.NONE, layer.Constants.LOG.ERROR,
   *                                            layer.Constants.LOG.WARN, layer.Constants.LOG.INFO, layer.Constants.LOG.DEBUG
   */

  function ClientAuthenticator(options) {
    _classCallCheck(this, ClientAuthenticator);

    // Validate required parameters
    if (!options.appId) throw new Error(LayerError.dictionary.appIdMissing);

    // We won't copy in userId; thats set from the identity-token... or from cache.
    // the userId argument is a way to identify if there has been a change of users.
    var requestedUserId = options.userId;
    var cachedSessionData = '',
        cachedUserId = '';
    try {
      cachedSessionData = global.localStorage ? global.localStorage[LOCALSTORAGE_KEYS.SESSIONDATA + options.appId] : null;
      cachedUserId = cachedSessionData ? JSON.parse(cachedSessionData).userId : '';
    } catch (error) {
      // Do nothing
    }

    delete options.userId;

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(ClientAuthenticator).call(this, options));

    _this.url = _this.url.replace(/\/$/, '');

    // If we've been provided with a user id as a parameter, attempt to restore the session.
    if (!_this.sessionToken && requestedUserId && _this.isTrustedDevice) {
      _this._restoreLastSession(options, requestedUserId, cachedUserId);
    } else if (global.localStorage) {
      localStorage.removeItem(LOCALSTORAGE_KEYS.SESSIONDATA + _this.appId);
      if (_this.sessionToken && requestedUserId) {
        _this.userId = requestedUserId;
      }
    }
    return _this;
  }

  /**
   * Handles cases where constructor is given a userId OR a userID + sessionToken.
   *
   * @method _restoreLastSession
   * @private
   */


  _createClass(ClientAuthenticator, [{
    key: '_restoreLastSession',
    value: function _restoreLastSession(options, requestedUserId, cachedUserId) {
      var sessionToken = options.sessionToken || this._getSessionToken();
      if (options.sessionToken) {
        this.userId = requestedUserId;
      } else if (sessionToken && cachedUserId === requestedUserId) {
        this.sessionToken = sessionToken;
        this.userId = requestedUserId;
      } else {
        this.sessionToken = '';
        this.userId = '';
      }
    }

    /**
     * Initialize the subcomponents of the ClientAuthenticator
     *
     * @method _initComponents
     * @private
     */

  }, {
    key: '_initComponents',
    value: function _initComponents() {
      // Setup the websocket manager; won't connect until we trigger an authenticated event
      this.socketManager = new SocketManager({
        client: this
      });

      this.socketChangeManager = new WebsocketChangeManager({
        client: this,
        socketManager: this.socketManager
      });

      this.socketRequestManager = new WebsocketRequestManager({
        client: this,
        socketManager: this.socketManager
      });

      this.onlineManager = new OnlineManager({
        socketManager: this.socketManager,
        testUrl: this.url + '/nonces?connection-test',
        connected: this._handleOnlineChange.bind(this),
        disconnected: this._handleOnlineChange.bind(this)
      });

      this.syncManager = new SyncManager({
        onlineManager: this.onlineManager,
        socketManager: this.socketManager,
        requestManager: this.socketRequestManager,
        client: this
      });

      this._connect();
    }

    /**
     * Destroy the subcomponents of the ClientAuthenticator
     *
     * @method _destroyComponents
     * @private
     */

  }, {
    key: '_destroyComponents',
    value: function _destroyComponents() {
      this.syncManager.destroy();
      this.onlineManager.destroy();
      this.socketManager.destroy();
      this.socketChangeManager.destroy();
      this.socketRequestManager.destroy();
    }

    /**
     * Gets/restores the sessionToken
     *
     * @private
     * @method _getSessionToken
     * @return {string}
     */

  }, {
    key: '_getSessionToken',
    value: function _getSessionToken() {
      if (this.sessionToken) return this.sessionToken;
      var cachedSessionData = global.localStorage ? global.localStorage[LOCALSTORAGE_KEYS.SESSIONDATA + this.appId] : '{}';
      try {
        return JSON.parse(cachedSessionData).sessionToken;
      } catch (error) {
        return '';
      }
    }

    /* CONNECT METHODS BEGIN */

    /**
     * Initiates the connection.
     *
     * Called by constructor().
     *
     * Will either attempt to validate the cached sessionToken by getting converations,
     * or if no sessionToken, will call /nonces to start process of getting a new one.
     *
     * @private
     * @method _connect
     *
     * TODO: WEB-958: Use a dedicated session validation endpoint instead of this...
     */

  }, {
    key: '_connect',
    value: function _connect() {
      var _this2 = this;

      if (this.sessionToken) {
        // This will return an error with a nonce if the token is not valid.
        this.xhr({
          url: '/',
          method: 'GET',
          sync: false,
          headers: {
            'content-type': 'application/json'
          }
        }, function (result) {
          return _this2._connectionWithSessionResponse(result);
        });
      } else {
        this.xhr({
          url: '/nonces',
          method: 'POST',
          sync: false
        }, function (result) {
          return _this2._connectionResponse(result);
        });
      }
    }

    /**
     * Called when our test of our last sessionToken gets a response.
     *
     * If the response is an error, call _sessionTokenExpired with the new nonce
     * returned in the error.
     *
     * If the response is successful, then, well, we have Conversations, and can call _sessionTokenRestored
     * with those Conversations.
     *
     * @private
     * @method _connectionWithSessionResponse
     * @param  {Object} result
     */

  }, {
    key: '_connectionWithSessionResponse',
    value: function _connectionWithSessionResponse(result) {
      if (!result.success && result.data.getNonce()) {
        this._sessionTokenExpired(result.data.getNonce());
      } else {
        this._sessionTokenRestored(result.data);
      }
    }

    /**
     * Called when our request for a nonce gets a response.
     *
     * If there is an error, calls _connectionError.
     *
     * If there is nonce, calls _connectionComplete.
     *
     * @method _connectionResponse
     * @private
     * @param  {Object} result
     */

  }, {
    key: '_connectionResponse',
    value: function _connectionResponse(result) {
      if (!result.success) {
        this._connectionError(result.data);
      } else {
        this._connectionComplete(result.data);
      }
    }

    /**
     * We are now connected (we have a nonce).
     *
     * If we have successfully retrieved a nonce, then
     * we have entered a "connected" but not "authenticated" state.
     * Set the state, trigger any events, and then start authentication.
     *
     * @method _connectionComplete
     * @private
     * @param  {Object} result
     * @param  {string} result.nonce - The nonce provided by the server
     *
     * @fires connected
     */

  }, {
    key: '_connectionComplete',
    value: function _connectionComplete(result) {
      this.isConnected = true;
      this.trigger('connected');
      this._authenticate(result.nonce);
    }

    /**
     * Called when we fail to get a nonce.
     *
     * @method _connectionError
     * @private
     * @param  {layer.LayerError} err
     *
     * @fires connected-error
     */

  }, {
    key: '_connectionError',
    value: function _connectionError(error) {
      this.trigger('connected-error', { error: error });
    }

    /* CONNECT METHODS END */

    /* AUTHENTICATE METHODS BEGIN */

    /**
     * Start the authentication step.
     *
     * We start authentication by triggering a "challenge" event that
     * tells the app to use the nonce to obtain an identity_token.
     *
     * @method _authenticate
     * @private
     * @param  {string} nonce - The nonce to provide your identity provider service
     *
     * @fires challenge
     */

  }, {
    key: '_authenticate',
    value: function _authenticate(nonce) {
      if (nonce) {
        this.trigger('challenge', {
          nonce: nonce,
          callback: this.answerAuthenticationChallenge.bind(this)
        });
      }
    }

    /**
     * Accept an identityToken and use it to create a session.
     *
     * Typically, this method is called using the function pointer provided by
     * the challenge event, but it can also be called directly.
     *
     *      getIdentityToken(nonce, function(identityToken) {
     *          client.answerAuthenticationChallenge(identityToken);
     *      });
     *
     * @method answerAuthenticationChallenge
     * @param  {string} identityToken - Identity token provided by your identity provider service
     */

  }, {
    key: 'answerAuthenticationChallenge',
    value: function answerAuthenticationChallenge(identityToken) {
      var _this3 = this;

      // Report an error if no identityToken provided
      if (!identityToken) {
        throw new Error(LayerError.dictionary.identityTokenMissing);
      } else {
        // Store the UserId and get a sessionToken; bypass the __adjustUserId connected test
        var userData = Util.decode(identityToken.split('.')[1]);
        this.__userId = JSON.parse(userData).prn;
        this.xhr({
          url: '/sessions',
          method: 'POST',
          sync: false,
          data: {
            identity_token: identityToken,
            app_id: this.appId
          }
        }, function (result) {
          return _this3._authResponse(result, identityToken);
        });
      }
    }

    /**
     * Called when our request for a sessionToken receives a response.
     *
     * @private
     * @method _authResponse
     * @param  {Object} result
     * @param  {string} identityToken
     */

  }, {
    key: '_authResponse',
    value: function _authResponse(result, identityToken) {
      if (!result.success) {
        this._authError(result.data, identityToken);
      } else {
        this._authComplete(result.data);
      }
    }

    /**
     * Authentication is completed, update state and trigger events.
     *
     * @method _authComplete
     * @private
     * @param  {Object} result
     * @param  {string} result.session_token - Session token received from the server
     *
     * @fires authenticated
     */

  }, {
    key: '_authComplete',
    value: function _authComplete(result) {
      if (!result || !result.session_token) {
        throw new Error(LayerError.dictionary.sessionTokenMissing);
      }
      this.sessionToken = result.session_token;

      // NOTE: We store both items of data in a single key because someone listening for storage
      // events is listening for an asynchronous change, and we need to gaurentee that both
      // userId and session are available.
      if (global.localStorage && this.isTrustedDevice) {
        try {
          global.localStorage[LOCALSTORAGE_KEYS.SESSIONDATA + this.appId] = JSON.stringify({
            sessionToken: this.sessionToken || '',
            userId: this.userId || ''
          });
        } catch (e) {
          // Do nothing
        }
      }

      this.isAuthenticated = true;
      this.trigger('authenticated');
      this._clientReady();
    }

    /**
     * Authentication has failed.
     *
     * @method _authError
     * @private
     * @param  {layer.LayerError} result
     * @param  {string} identityToken Not currently used
     *
     * @fires authenticated-error
     */

  }, {
    key: '_authError',
    value: function _authError(error, identityToken) {
      this.trigger('authenticated-error', { error: error });
    }

    /**
     * Sets state and triggers events for both connected and authenticated.
     *
     * If reusing a sessionToken cached in localStorage,
     * use this method rather than _authComplete.
     *
     * @method _sessionTokenRestored
     * @private
     *
     * @fires connected, authenticated
     */

  }, {
    key: '_sessionTokenRestored',
    value: function _sessionTokenRestored(result) {
      this.isConnected = true;
      this.trigger('connected');
      this.isAuthenticated = true;
      this.trigger('authenticated');
      this._clientReady();
    }

    /**
     * Tried to reuse a cached sessionToken but was rejected.
     *
     * On failing to restore a sessionToken stored in localStorage,
     * Start the connect() process anew.
     *
     * @method _sessionTokenExpired
     * @private
     */

  }, {
    key: '_sessionTokenExpired',
    value: function _sessionTokenExpired(nonce) {
      this.sessionToken = '';
      if (global.localStorage) {
        localStorage.removeItem(LOCALSTORAGE_KEYS.SESSIONDATA + this.appId);
      }
      this._authenticate(nonce);
    }

    /**
     * Called to flag the client as ready for action.
     *
     * This method is called after authenication AND
     * after initial conversations have been loaded.
     *
     * @method _clientReady
     * @private
     * @fires ready
     */

  }, {
    key: '_clientReady',
    value: function _clientReady() {
      if (!this.isReady) {
        this.isReady = true;
        this.trigger('ready');
        this.onlineManager.start();
      }
    }

    /* CONNECT METHODS END */

    /* START SESSION MANAGEMENT METHODS */

    /**
     * Deletes your sessionToken from the server, and removes all user data from the Client.
     * Call `client.login()` to restart the authentication process.
     *
     * @method logout
     * @return {layer.ClientAuthenticator} this
     */

  }, {
    key: 'logout',
    value: function logout() {
      if (this.isAuthenticated) {
        this.xhr({
          method: 'DELETE',
          url: '/sessions/' + escape(this.sessionToken)
        });
      }

      // Clear data even if isAuthenticated is false
      // Session may have expired, but data still cached.
      this._resetSession();
      return this;
    }

    /**
     * This method is not needed under normal conditions.
     * However, if after calling `logout()` you want to
     * get a new nonce and trigger a new `challenge` event,
     * call `login()`.
     *
     * @method login
     * @return {layer.ClientAuthenticator} this
     */

  }, {
    key: 'login',
    value: function login() {
      this._connect();
      return this;
    }

    /**
     * Log out/clear session information.
     *
     * Use this to clear the sessionToken and all information from this session.
     *
     * @method _resetSession
     * @private
     * @returns {layer.ClientAuthenticator} this
     */

  }, {
    key: '_resetSession',
    value: function _resetSession() {
      this.isReady = false;
      if (this.sessionToken) {
        this.sessionToken = '';
        if (global.localStorage) {
          localStorage.removeItem(LOCALSTORAGE_KEYS.SESSIONDATA + this.appId);
        }
      }
      this.isConnected = false;
      this.isAuthenticated = false;

      this.trigger('deauthenticated');
      this.onlineManager.stop();
    }

    /**
     * Register your IOS device to receive notifications.
     * For use with native code only (Cordova, React Native, Titanium, etc...)
     *
     * @method registerIOSPushToken
     * @param {Object} options
     * @param {string} options.deviceId - Your IOS device's device ID
     * @param {string} options.iosVersion - Your IOS device's version number
     * @param {string} options.token - Your Apple APNS Token
     * @param {string} [options.bundleId] - Your Apple APNS Bundle ID ("com.layer.bundleid")
     * @param {Function} [callback=null] - Optional callback
     * @param {layer.LayerError} callback.error - LayerError if there was an error; null if successful
     */

  }, {
    key: 'registerIOSPushToken',
    value: function registerIOSPushToken(options, callback) {
      this.xhr({
        url: 'push_tokens',
        method: 'POST',
        sync: false,
        data: {
          token: options.token,
          type: 'apns',
          device_id: options.deviceId,
          ios_version: options.iosVersion,
          apns_bundle_id: options.bundleId
        }
      }, function (result) {
        return callback(result.data);
      });
    }

    /**
     * Register your Android device to receive notifications.
     * For use with native code only (Cordova, React Native, Titanium, etc...)
     *
     * @method registerAndroidPushToken
     * @param {Object} options
     * @param {string} options.deviceId - Your IOS device's device ID
     * @param {string} options.token - Your GCM push Token
     * @param {string} options.senderId - Your GCM Sender ID/Project Number
     * @param {Function} [callback=null] - Optional callback
     * @param {layer.LayerError} callback.error - LayerError if there was an error; null if successful
     */

  }, {
    key: 'registerAndroidPushToken',
    value: function registerAndroidPushToken(options, callback) {
      this.xhr({
        url: 'push_tokens',
        method: 'POST',
        sync: false,
        data: {
          token: options.token,
          type: 'gcm',
          device_id: options.deviceId,
          gcm_sender_id: options.senderId
        }
      }, function (result) {
        return callback(result.data);
      });
    }

    /**
     * Register your Android device to receive notifications.
     * For use with native code only (Cordova, React Native, Titanium, etc...)
     *
     * @method unregisterPushToken
     * @param {string} deviceId - Your IOS device's device ID
     * @param {Function} [callback=null] - Optional callback
     * @param {layer.LayerError} callback.error - LayerError if there was an error; null if successful
     */

  }, {
    key: 'unregisterPushToken',
    value: function unregisterPushToken(deviceId, callback) {
      this.xhr({
        url: 'push_tokens/' + deviceId,
        method: 'DELETE'
      }, function (result) {
        return callback(result.data);
      });
    }

    /* SESSION MANAGEMENT METHODS END */

    /* ACCESSOR METHODS BEGIN */

    /**
     * __ Methods are automatically called by property setters.
     *
     * Any attempt to execute `this.userAppId = 'xxx'` will cause an error to be thrown
     * if the client is already connected.
     *
     * @private
     * @method __adjustAppId
     * @param {string} value - New appId value
     */

  }, {
    key: '__adjustAppId',
    value: function __adjustAppId(value) {
      if (this.isConnected) throw new Error(LayerError.dictionary.cantChangeIfConnected);
    }

    /**
     * __ Methods are automatically called by property setters.
     *
     * Any attempt to execute `this.userId = 'xxx'` will cause an error to be thrown
     * if the client is already connected.
     *
     * @private
     * @method __adjustUserId
     * @param {string} value - New appId value
     */

  }, {
    key: '__adjustUserId',
    value: function __adjustUserId(value) {
      if (this.isConnected) throw new Error(LayerError.dictionary.cantChangeIfConnected);
    }

    /* ACCESSOR METHODS END */

    /* COMMUNICATIONS METHODS BEGIN */

  }, {
    key: 'sendSocketRequest',
    value: function sendSocketRequest(params, callback) {
      if (params.sync) {
        var target = params.sync.target;
        var depends = params.sync.depends;
        if (target && !depends) depends = [target];

        this.syncManager.request(new WebsocketSyncEvent({
          data: params.body,
          operation: params.method,
          target: target,
          depends: depends,
          callback: callback
        }));
      } else {
        if (typeof params.data === 'function') params.data = params.data();
        this.socketRequestManager.sendRequest(params, callback);
      }
    }

    /**
     * This event handler receives events from the Online State Manager and generates an event for those subscribed
     * to client.on('online')
     *
     * @method _handleOnlineChange
     * @private
     * @param {layer.LayerEvent} evt
     */

  }, {
    key: '_handleOnlineChange',
    value: function _handleOnlineChange(evt) {
      if (!this.isAuthenticated) return;
      var duration = evt.offlineDuration;
      var isOnline = evt.eventName === 'connected';
      var obj = { isOnline: isOnline };
      if (isOnline) {
        obj.reset = duration > ClientAuthenticator.ResetAfterOfflineDuration;
      }
      this.trigger('online', obj);
    }

    /**
     * Main entry point for sending xhr requests or for queing them in the syncManager.
     *
     * This call adjust arguments for our REST server.
     *
     * @method xhr
     * @protected
     * @param  {Object}   options
     * @param  {string}   options.url - URL relative client's url: "/conversations"
     * @param  {Function} callback
     * @param  {Object}   callback.result
     * @param  {Mixed}    callback.result.data - If an error occurred, this is a layer.LayerError;
     *                                          If the response was application/json, this will be an object
     *                                          If the response was text/empty, this will be text/empty
     * @param  {XMLHttpRequest} callback.result.xhr - Native xhr request object for detailed analysis
     * @param  {Object}         callback.result.Links - Hash of Link headers
     * @return {layer.ClientAuthenticator} this
     */

  }, {
    key: 'xhr',
    value: function xhr(options, callback) {
      if (typeof options.url === 'string') {
        options.url = this._xhrFixRelativeUrls(options.url);
      }

      options.withCredentials = true;
      if (!options.method) options.method = 'GET';
      if (!options.headers) options.headers = {};
      this._xhrFixHeaders(options.headers);
      this._xhrFixAuth(options.headers);

      // Note: this is not sync vs async; this is syncManager vs fire it now
      if (options.sync === false) {
        this._nonsyncXhr(options, callback, 0);
      } else {
        this._syncXhr(options, callback);
      }
      return this;
    }
  }, {
    key: '_syncXhr',
    value: function _syncXhr(options, callback) {
      var _this4 = this;

      if (!options.sync) options.sync = {};
      var innerCallback = function innerCallback(result) {
        _this4._xhrResult(result, callback);
      };
      var target = options.sync.target;
      var depends = options.sync.depends;
      if (target && !depends) depends = [target];

      this.syncManager.request(new XHRSyncEvent({
        url: options.url,
        data: options.data,
        method: options.method,
        operation: options.sync.operation || options.method,
        headers: options.headers,
        callback: innerCallback,
        target: target,
        depends: depends
      }));
    }

    /**
     * For xhr calls that don't go through the sync manager,
     * fire the request, and if it fails, refire it up to 3 tries
     * before reporting an error.  1 second delay between requests
     * so whatever issue is occuring is a tiny bit more likely to resolve,
     * and so we don't hammer the server every time there's a problem.
     *
     * @method _nonsyncXhr
     * @param  {Object}   options
     * @param  {Function} callback
     * @param  {number}   retryCount
     */

  }, {
    key: '_nonsyncXhr',
    value: function _nonsyncXhr(options, callback, retryCount) {
      var _this5 = this;

      xhr(options, function (result) {
        if ([502, 503, 504].indexOf(result.status) !== -1 && retryCount < MAX_XHR_RETRIES) {
          setTimeout(function () {
            return _this5._nonsyncXhr(options, callback, retryCount + 1);
          }, 1000);
        } else {
          _this5._xhrResult(result, callback);
        }
      });
    }

    /**
     * Fix authentication header for an xhr request
     *
     * @method _xhrFixAuth
     * @private
     * @param  {Object} headers
     */

  }, {
    key: '_xhrFixAuth',
    value: function _xhrFixAuth(headers) {
      if (this.sessionToken && !headers.Authorization) {
        headers.authorization = 'Layer session-token="' + this.sessionToken + '"'; // eslint-disable-line
      }
    }

    /**
     * Fix relative URLs to create absolute URLs needed for CORS requests.
     *
     * @method _xhrFixRelativeUrls
     * @private
     * @param  {string} relative or absolute url
     * @return {string} absolute url
     */

  }, {
    key: '_xhrFixRelativeUrls',
    value: function _xhrFixRelativeUrls(url) {
      var result = url;
      if (url.indexOf('https://') === -1) {
        if (url[0] === '/') {
          result = this.url + url;
        } else {
          result = this.url + '/' + url;
        }
      }
      return result;
    }

    /**
     * Fixup all headers in preparation for an xhr call.
     *
     * 1. All headers use lower case names for standard/easy lookup
     * 2. Set the accept header
     * 3. If needed, set the content-type header
     *
     * @method _xhrFixHeaders
     * @private
     * @param  {Object} headers
     */

  }, {
    key: '_xhrFixHeaders',
    value: function _xhrFixHeaders(headers) {
      // Replace all headers in arbitrary case with all lower case
      // for easy matching.
      var headerNameList = Object.keys(headers);
      headerNameList.forEach(function (headerName) {
        if (headerName !== headerName.toLowerCase()) {
          headers[headerName.toLowerCase()] = headers[headerName];
          delete headers[headerName];
        }
      });

      if (!headers.accept) headers.accept = ACCEPT;

      if (!headers['content-type']) headers['content-type'] = 'application/json';
    }

    /**
     * Handle the result of an xhr call
     *
     * @method _xhrResult
     * @private
     * @param  {Object}   result     Standard xhr response object from the xhr lib
     * @param  {Function} [callback] Callback on completion
     */

  }, {
    key: '_xhrResult',
    value: function _xhrResult(result, callback) {
      if (this.isDestroyed) return;

      if (!result.success) {
        // Replace the response with a LayerError instance
        if (result.data && _typeof(result.data) === 'object') {
          this._generateError(result);
        }

        // If its an authentication error, reauthenticate
        // don't call _resetSession as that wipes all data and screws with UIs, and the user
        // is still authenticated on the customer's app even if not on Layer.
        if (result.status === 401 && this.isAuthenticated) {
          logger.warn('SESSION EXPIRED!');
          this.isAuthenticated = false;
          this.trigger('deauthenticated');
          this._authenticate(result.data.getNonce());
        }
      }
      if (callback) callback(result);
    }

    /**
     * Transforms xhr error response into a layer.LayerError instance.
     *
     * Adds additional information to the result object including
     *
     * * url
     * * data
     *
     * @method _generateError
     * @private
     * @param  {Object} result - Result of the xhr call
     */

  }, {
    key: '_generateError',
    value: function _generateError(result) {
      result.data = new LayerError(result.data);
      if (!result.data.httpStatus) result.data.httpStatus = result.status;
      result.data.log();
    }

    /* END COMMUNICATIONS METHODS */

  }]);

  return ClientAuthenticator;
}(Root);

/**
 * State variable; indicates that client is currently authenticated by the server.
 * Should never be true if isConnected is false.
 * @type {Boolean}
 */


ClientAuthenticator.prototype.isAuthenticated = false;

/**
 * State variable; indicates that client is currently connected to server
 * (may not be authenticated yet)
 * @type {Boolean}
 */
ClientAuthenticator.prototype.isConnected = false;

/**
 * State variable; indicates that client is ready for the app to use.
 * Use the 'ready' event to be notified when this value changes to true.
 *
 * @type {boolean}
 */
ClientAuthenticator.prototype.isReady = false;

/**
 * Your Layer Application ID. This value can not be changed once connected.
 * To find your Layer Application ID, see your Layer Developer Dashboard.
 * @type {String}
 */
ClientAuthenticator.prototype.appId = '';

/**
 * You can use this to find the userId you are logged in as.
 * You can set this in the constructor to verify that the client
 * will only restore a session if that session belonged to that same userId.
 * @type {String}
 */
ClientAuthenticator.prototype.userId = '';

/**
 * Your current session token that authenticates your requests.
 * @type {String}
 */
ClientAuthenticator.prototype.sessionToken = '';

/**
 * URL to Layer's Web API server.
 * @type {String}
 */
ClientAuthenticator.prototype.url = 'https://api.layer.com';

/**
 * Web Socket Manager
 * @type {layer.Websockets.SocketManager}
 */
ClientAuthenticator.prototype.socketManager = null;

/**
 * Web Socket Request Manager
* @type {layer.Websockets.RequestManager}
 */
ClientAuthenticator.prototype.socketRequestManager = null;

/**
 * Web Socket Manager
 * @type {layer.Websockets.ChangeManager}
 */
ClientAuthenticator.prototype.socketChangeManager = null;

/**
 * Service for managing online as well as offline server requests
 * @type {layer.SyncManager}
 */
ClientAuthenticator.prototype.syncManager = null;

/**
 * Service for managing online/offline state and events
 * @type {layer.OnlineStateManager}
 */
ClientAuthenticator.prototype.onlineManager = null;

/**
 * Is true if the client is authenticated and connected to the server;
 *
 * Typically used to determine if there is a connection to the server.
 *
 * Typically used in conjunction with the `online` event.
 *
 * @type {boolean}
 */
Object.defineProperty(ClientAuthenticator.prototype, 'isOnline', {
  enumerable: true,
  get: function get() {
    return this.onlineManager && this.onlineManager.isOnline;
  }
});

/**
 * Log levels; one of:
 *
 *    * layer.Constants.LOG.NONE
 *    * layer.Constants.LOG.ERROR
 *    * layer.Constants.LOG.WARN
 *    * layer.Constants.LOG.INFO
 *    * layer.Constants.LOG.DEBUG
 *
 * @type {number}
 */
Object.defineProperty(ClientAuthenticator.prototype, 'logLevel', {
  enumerable: false,
  get: function get() {
    return logger.level;
  },
  set: function set(value) {
    logger.level = value;
  }
});

/**
 * If this is a trusted device, then we can write personal data to persistent memory.
 * @type {boolean}
 */
ClientAuthenticator.prototype.isTrustedDevice = false;

/**
 * Time to be offline after which we don't do a WebSocket Events.replay,
 * but instead just refresh all our Query data.  Defaults to 30 hours.
 *
 * @type {number}
 * @static
 */
ClientAuthenticator.ResetAfterOfflineDuration = 1000 * 60 * 60 * 30;

/**
 * List of events supported by this class
 * @static
 * @protected
 * @type {string[]}
 */
ClientAuthenticator._supportedEvents = [
/**
 * The client is ready for action
 *
 *      client.on('ready', function(evt) {
 *          renderMyUI();
 *      });
 *
 * @event
 */
'ready',

/**
 * Fired when connected to the server.
 * Currently just means we have a nonce.
 * Not recommended for typical applications.
 * @event connected
 */
'connected',

/**
 * Fired when unsuccessful in obtaining a nonce
 * Not recommended for typical applications.
 * @event connected-error
 * @param {Object} event
 * @param {layer.LayerError} event.error
 */
'connected-error',

/**
 * We now have a session and any requests we send aught to work.
 * Typically you should use the ready event instead of the authenticated event.
 * @event authenticated
 */
'authenticated',

/**
 * Failed to authenticate your client.
 *
 * Either your identity-token was invalid, or something went wrong
 * using your identity-token.
 *
 * @event authenticated-error
 * @param {Object} event
 * @param {layer.LayerError} event.error
 */
'authenticated-error',

/**
 * This event fires when a session has expired or when `layer.Client.logout` is called.
 * Typically, it is enough to subscribe to the challenge event
 * which will let you reauthenticate; typical applications do not need
 * to subscribe to this.
 *
 * @event deauthenticated
 */
'deauthenticated',

/**
 * @event challenge
 * Verify the user's identity.
 *
 * This event is where you verify that the user is who we all think the user is,
 * and provide an identity token to validate that.
 *
 * @param {Object} event
 * @param {string} event.nonce - A nonce for you to provide to your identity provider
 * @param {Function} event.callback - Call this once you have an identity-token
 * @param {string} event.callback.identityToken - Identity token provided by your identity provider service
 */
'challenge',

/**
 * @event session-terminated
 * If your session has been terminated in such a way as to prevent automatic reconnect,
 *
 * this event will fire.  Common scenario: user has two tabs open;
 * one tab the user logs out (or you call client.logout()).
 * The other tab will detect that the sessionToken has been removed,
 * and will terminate its session as well.  In this scenario we do not want
 * to automatically trigger a challenge and restart the login process.
 */
'session-terminated',

/**
 * @event online
 *
 * This event is used to detect when the client is online (connected to the server)
 * or offline (still able to accept API calls but no longer able to sync to the server).
 *
 *      client.on('online', function(evt) {
 *         if (evt.isOnline) {
 *             statusDiv.style.backgroundColor = 'green';
 *         } else {
 *             statusDiv.style.backgroundColor = 'red';
 *         }
 *      });
 *
 * @param {Object} event
 * @param {boolean} event.isOnline
 */
'online'].concat(Root._supportedEvents);

Root.initClass.apply(ClientAuthenticator, [ClientAuthenticator, 'ClientAuthenticator']);

module.exports = ClientAuthenticator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jbGllbnQtYXV0aGVudGljYXRvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUE4QkEsSUFBTSxNQUFNLFFBQVEsT0FBUixDQUFOO0FBQ04sSUFBTSxPQUFPLFFBQVEsUUFBUixDQUFQO0FBQ04sSUFBTSxnQkFBZ0IsUUFBUSw2QkFBUixDQUFoQjtBQUNOLElBQU0seUJBQXlCLFFBQVEsNkJBQVIsQ0FBekI7QUFDTixJQUFNLDBCQUEwQixRQUFRLDhCQUFSLENBQTFCO0FBQ04sSUFBTSxhQUFhLFFBQVEsZUFBUixDQUFiO0FBQ04sSUFBTSxnQkFBZ0IsUUFBUSx3QkFBUixDQUFoQjtBQUNOLElBQU0sY0FBYyxRQUFRLGdCQUFSLENBQWQ7O2VBQ3VDLFFBQVEsY0FBUjs7SUFBckM7SUFBYzs7Z0JBQ2dCLFFBQVEsU0FBUjs7SUFBOUI7SUFBUTs7QUFDaEIsSUFBTSxPQUFPLFFBQVEsZ0JBQVIsQ0FBUDtBQUNOLElBQU0sU0FBUyxRQUFRLFVBQVIsQ0FBVDs7QUFFTixJQUFNLGtCQUFrQixDQUFsQjs7SUFFQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWdDSixXQWhDSSxtQkFnQ0osQ0FBWSxPQUFaLEVBQXFCOzBCQWhDakIscUJBZ0NpQjs7O0FBRW5CLFFBQUksQ0FBQyxRQUFRLEtBQVIsRUFBZSxNQUFNLElBQUksS0FBSixDQUFVLFdBQVcsVUFBWCxDQUFzQixZQUF0QixDQUFoQixDQUFwQjs7OztBQUZtQixRQU1iLGtCQUFrQixRQUFRLE1BQVIsQ0FOTDtBQU9uQixRQUFJLG9CQUFvQixFQUFwQjtRQUNGLGVBQWUsRUFBZixDQVJpQjtBQVNuQixRQUFJO0FBQ0YsMEJBQW9CLE9BQU8sWUFBUCxHQUNsQixPQUFPLFlBQVAsQ0FBb0Isa0JBQWtCLFdBQWxCLEdBQWdDLFFBQVEsS0FBUixDQURsQyxHQUNtRCxJQURuRCxDQURsQjtBQUdGLHFC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bEIsV0FBTyxLQUFLLGFBQUwsSUFBc0IsS0FBSyxhQUFMLENBQW1CLFFBQW5CLENBRFg7R0FBZjtDQUZQOzs7Ozs7Ozs7Ozs7O0FBa0JBLE9BQU8sY0FBUCxDQUFzQixvQkFBb0IsU0FBcEIsRUFBK0IsVUFBckQsRUFBaUU7QUFDL0QsY0FBWSxLQUFaO0FBQ0EsT0FBSyxTQUFTLEdBQVQsR0FBZTtBQUFFLFdBQU8sT0FBTyxLQUFQLENBQVQ7R0FBZjtBQUNMLE9BQUssU0FBUyxHQUFULENBQWEsS0FBYixFQUFvQjtBQUFFLFdBQU8sS0FBUCxHQUFlLEtBQWYsQ0FBRjtHQUFwQjtDQUhQOzs7Ozs7QUFVQSxvQkFBb0IsU0FBcEIsQ0FBOEIsZUFBOUIsR0FBZ0QsS0FBaEQ7Ozs7Ozs7OztBQVNBLG9CQUFvQix5QkFBcEIsR0FBZ0QsT0FBTyxFQUFQLEdBQVksRUFBWixHQUFpQixFQUFqQjs7Ozs7Ozs7QUFRaEQsb0JBQW9CLGdCQUFwQixHQUF1Qzs7Ozs7Ozs7OztBQVVyQyxPQVZxQzs7Ozs7Ozs7QUFrQnJDLFdBbEJxQzs7Ozs7Ozs7O0FBMkJyQyxpQkEzQnFDOzs7Ozs7O0FBa0NyQyxlQWxDcUM7Ozs7Ozs7Ozs7OztBQThDckMscUJBOUNxQzs7Ozs7Ozs7OztBQXdEckMsaUJBeERxQzs7Ozs7Ozs7Ozs7Ozs7QUFzRXJDLFdBdEVxQzs7Ozs7Ozs7Ozs7O0FBa0ZyQyxvQkFsRnFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBcUdyQyxRQXJHcUMsRUFzR3JDLE1BdEdxQyxDQXNHOUIsS0FBSyxnQkFBTCxDQXRHVDs7QUF3R0EsS0FBSyxTQUFMLENBQWUsS0FBZixDQUFxQixtQkFBckIsRUFBMEMsQ0FBQyxtQkFBRCxFQUFzQixxQkFBdEIsQ0FBMUM7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLG1CQUFqQiIsImZpbGUiOiJjbGllbnQtYXV0aGVudGljYXRvci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogTGF5ZXIgQ2xpZW50LiAgQWNjZXNzIHRoZSBsYXllciBieSBjYWxsaW5nIGNyZWF0ZSBhbmQgcmVjZWl2aW5nIGl0XG4gKiBmcm9tIHRoZSBcInJlYWR5XCIgY2FsbGJhY2suXG5cbiAgdmFyIGNsaWVudCA9IG5ldyBsYXllci5DbGllbnQoe1xuICAgIGFwcElkOiBcImxheWVyOi8vL2FwcHMvc3RhZ2luZy9mZmZmZmZmZi1mZmZmLWZmZmYtZmZmZi1mZmZmZmZmZmZmZmZcIixcbiAgICB1c2VySWQ6IFwiRHJlZlwiLFxuICAgIGNoYWxsZW5nZTogZnVuY3Rpb24oZXZ0KSB7XG4gICAgICBteUF1dGhlbnRpY2F0b3Ioe1xuICAgICAgICBub25jZTogZXZ0Lm5vbmNlLFxuICAgICAgICBvblN1Y2Nlc3M6IGV2dC5jYWxsYmFja1xuICAgICAgfSk7XG4gICAgfSxcbiAgICByZWFkeTogZnVuY3Rpb24oY2xpZW50KSB7XG4gICAgICBhbGVydChcIllheSwgSSBmaW5hbGx5IGdvdCBteSBjbGllbnQhXCIpO1xuICAgIH1cbiAgfSk7XG5cbiAqIFRoZSBMYXllciBDbGllbnQvQ2xpZW50QXV0aGVudGljYXRvciBjbGFzc2VzIGhhdmUgYmVlbiBkaXZpZGVkIGludG86XG4gKlxuICogMS4gQ2xpZW50QXV0aGVudGljYXRvcjogTWFuYWdlcyBhbGwgYXV0aGVudGljYXRpb24gYW5kIGNvbm5lY3Rpdml0eSByZWxhdGVkIGlzc3Vlc1xuICogMi4gQ2xpZW50OiBNYW5hZ2VzIGFjY2VzcyB0byBDb252ZXJzYXRpb25zLCBRdWVyaWVzLCBNZXNzYWdlcywgRXZlbnRzLCBldGMuLi5cbiAqXG4gKiBAY2xhc3MgbGF5ZXIuQ2xpZW50QXV0aGVudGljYXRvclxuICogQHByaXZhdGVcbiAqIEBleHRlbmRzIGxheWVyLlJvb3RcbiAqIEBhdXRob3IgTWljaGFlbCBLYW50b3JcbiAqXG4gKi9cblxuY29uc3QgeGhyID0gcmVxdWlyZSgnLi94aHInKTtcbmNvbnN0IFJvb3QgPSByZXF1aXJlKCcuL3Jvb3QnKTtcbmNvbnN0IFNvY2tldE1hbmFnZXIgPSByZXF1aXJlKCcuL3dlYnNvY2tldHMvc29ja2V0LW1hbmFnZXInKTtcbmNvbnN0IFdlYnNvY2tldENoYW5nZU1hbmFnZXIgPSByZXF1aXJlKCcuL3dlYnNvY2tldHMvY2hhbmdlLW1hbmFnZXInKTtcbmNvbnN0IFdlYnNvY2tldFJlcXVlc3RNYW5hZ2VyID0gcmVxdWlyZSgnLi93ZWJzb2NrZXRzL3JlcXVlc3QtbWFuYWdlcicpO1xuY29uc3QgTGF5ZXJFcnJvciA9IHJlcXVpcmUoJy4vbGF5ZXItZXJyb3InKTtcbmNvbnN0IE9ubGluZU1hbmFnZXIgPSByZXF1aXJlKCcuL29ubGluZS1zdGF0ZS1tYW5hZ2VyJyk7XG5jb25zdCBTeW5jTWFuYWdlciA9IHJlcXVpcmUoJy4vc3luYy1tYW5hZ2VyJyk7XG5jb25zdCB7IFhIUlN5bmNFdmVudCwgV2Vic29ja2V0U3luY0V2ZW50IH0gPSByZXF1aXJlKCcuL3N5bmMtZXZlbnQnKTtcbmNvbnN0IHsgQUNDRVBULCBMT0NBTFNUT1JBR0VfS0VZUyB9ID0gcmVxdWlyZSgnLi9jb25zdCcpO1xuY29uc3QgVXRpbCA9IHJlcXVpcmUoJy4vY2xpZW50LXV0aWxzJyk7XG5jb25zdCBsb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlcicpO1xuXG5jb25zdCBNQVhfWEhSX1JFVFJJRVMgPSAzO1xuXG5jbGFzcyBDbGllbnRBdXRoZW50aWNhdG9yIGV4dGVuZHMgUm9vdCB7XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBDbGllbnQuXG4gICAqXG4gICAqIFdoaWxlIHRoZSBhcHBJZCBpcyB0aGUgb25seSByZXF1aXJlZCBwYXJhbWV0ZXIsIHRoZSB1c2VySWQgcGFyYW1ldGVyXG4gICAqIGlzIHN0cm9uZ2x5IHJlY29tbWVuZGVkLlxuICAgKlxuICAgKiAgICAgIHZhciBjbGllbnQgPSBuZXcgQ2xpZW50KHtcbiAgICogICAgICAgICAgYXBwSWQ6IFwibGF5ZXI6Ly8vYXBwcy9zdGFnaW5nL3V1aWRcIixcbiAgICogICAgICAgICAgdXNlcklkOiBcImZyZWRcIlxuICAgKiAgICAgIH0pO1xuICAgKlxuICAgKiBGb3IgdHJ1c3RlZCBkZXZpY2VzLCB5b3UgY2FuIGVuYWJsZSBzdG9yYWdlIG9mIGRhdGEgdG8gaW5kZXhlZERCIGFuZCBsb2NhbFN0b3JhZ2Ugd2l0aCB0aGUgYGlzVHJ1c3RlZERldmljZWAgcHJvcGVydHk6XG4gICAqXG4gICAqICAgICAgdmFyIGNsaWVudCA9IG5ldyBDbGllbnQoe1xuICAgKiAgICAgICAgICBhcHBJZDogXCJsYXllcjovLy9hcHBzL3N0YWdpbmcvdXVpZFwiLFxuICAgKiAgICAgICAgICB1c2VySWQ6IFwiZnJlZFwiLFxuICAgKiAgICAgICAgICBpc1RydXN0ZWREZXZpY2U6IHRydWVcbiAgICogICAgICB9KTtcbiAgICpcbiAgICogQG1ldGhvZCBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnNcbiAgICogQHBhcmFtICB7c3RyaW5nfSBvcHRpb25zLmFwcElkICAgICAgICAgICAtIFwibGF5ZXI6Ly8vYXBwcy9wcm9kdWN0aW9uL3V1aWRcIjsgSWRlbnRpZmllcyB3aGF0XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHBsaWNhdGlvbiB3ZSBhcmUgY29ubmVjdGluZyB0by5cbiAgICogQHBhcmFtICB7c3RyaW5nfSBbb3B0aW9ucy51cmw9aHR0cHM6Ly9hcGkubGF5ZXIuY29tXSAtIFVSTCB0byBsb2cgaW50byBhIGRpZmZlcmVudCBSRVNUIHNlcnZlclxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmlzVHJ1c3RlZERldmljZT1mYWxzZV0gLSBJZiB0aGlzIGlzIGEgdHJ1c3RlZCBkZXZpY2UsIHRoZSBzZXNzaW9uVG9rZW4gd2lsbCBiZSB3cml0dGVuIHRvIGxvY2FsU3RvcmFnZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgZmFzdGVyIHJlYXV0aGVudGljYXRpb24gb24gcmVsb2FkaW5nLlxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IFtvcHRpb25zLnVzZXJJZD0nJ10gICAgIC0gSWYgeW91IHByb3ZpZGUgYSB1c2VySWQsIEFORCBpZiBpc1RydXN0ZWREZXZpY2UgaXMgdHJ1ZSwgd2Ugd2lsbCBhdHRlbXB0IHRvIHJlc3RvcmUgdGhpcyB1c2VyJ3Mgc2Vzc2lvbi5cbiAgICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLmxvZ0xldmVsPUVSUk9SXSAtIFByb3ZpZGUgYSBsb2cgbGV2ZWwgdGhhdCBpcyBvbmUgb2YgbGF5ZXIuQ29uc3RhbnRzLkxPRy5OT05FLCBsYXllci5Db25zdGFudHMuTE9HLkVSUk9SLFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXIuQ29uc3RhbnRzLkxPRy5XQVJOLCBsYXllci5Db25zdGFudHMuTE9HLklORk8sIGxheWVyLkNvbnN0YW50cy5MT0cuREVCVUdcbiAgICovXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBwYXJhbWV0ZXJzXG4gICAgaWYgKCFvcHRpb25zLmFwcElkKSB0aHJvdyBuZXcgRXJyb3IoTGF5ZXJFcnJvci5kaWN0aW9uYXJ5LmFwcElkTWlzc2luZyk7XG5cbiAgICAvLyBXZSB3b24ndCBjb3B5IGluIHVzZXJJZDsgdGhhdHMgc2V0IGZyb20gdGhlIGlkZW50aXR5LXRva2VuLi4uIG9yIGZyb20gY2FjaGUuXG4gICAgLy8gdGhlIHVzZXJJZCBhcmd1bWVudCBpcyBhIHdheSB0byBpZGVudGlmeSBpZiB0aGVyZSBoYXMgYmVlbiBhIGNoYW5nZSBvZiB1c2Vycy5cbiAgICBjb25zdCByZXF1ZXN0ZWRVc2VySWQgPSBvcHRpb25zLnVzZXJJZDtcbiAgICBsZXQgY2FjaGVkU2Vzc2lvbkRhdGEgPSAnJyxcbiAgICAgIGNhY2hlZFVzZXJJZCA9ICcnO1xuICAgIHRyeSB7XG4gICAgICBjYWNoZWRTZXNzaW9uRGF0YSA9IGdsb2JhbC5sb2NhbFN0b3JhZ2UgP1xuICAgICAgICBnbG9iYWwubG9jYWxTdG9yYWdlW0xPQ0FMU1RPUkFHRV9LRVlTLlNFU1NJT05EQVRBICsgb3B0aW9ucy5hcHBJZF0gOiBudWxsO1xuICAgICAgY2FjaGVkVXNlcklkID0gY2FjaGVkU2Vzc2lvbkRhdGEgPyBKU09OLnBhcnNlKGNhY2hlZFNlc3Npb25EYXRhKS51c2VySWQgOiAnJztcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgLy8gRG8gbm90aGluZ1xuICAgIH1cblxuICAgIGRlbGV0ZSBvcHRpb25zLnVzZXJJZDtcblxuICAgIHN1cGVyKG9wdGlvbnMpO1xuXG4gICAgdGhpcy51cmwgPSB0aGlzLnVybC5yZXBsYWNlKC9cXC8kLywgJycpO1xuXG4gICAgLy8gSWYgd2UndmUgYmVlbiBwcm92aWRlZCB3aXRoIGEgdXNlciBpZCBhcyBhIHBhcmFtZXRlciwgYXR0ZW1wdCB0byByZXN0b3JlIHRoZSBzZXNzaW9uLlxuICAgIGlmICghdGhpcy5zZXNzaW9uVG9rZW4gJiYgcmVxdWVzdGVkVXNlcklkICYmIHRoaXMuaXNUcnVzdGVkRGV2aWNlKSB7XG4gICAgICB0aGlzLl9yZXN0b3JlTGFzdFNlc3Npb24ob3B0aW9ucywgcmVxdWVzdGVkVXNlcklkLCBjYWNoZWRVc2VySWQpO1xuICAgIH0gZWxzZSBpZiAoZ2xvYmFsLmxvY2FsU3RvcmFnZSkge1xuICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oTE9DQUxTVE9SQUdFX0tFWVMuU0VTU0lPTkRBVEEgKyB0aGlzLmFwcElkKTtcbiAgICAgIGlmICh0aGlzLnNlc3Npb25Ub2tlbiAmJiByZXF1ZXN0ZWRVc2VySWQpIHtcbiAgICAgICAgdGhpcy51c2VySWQgPSByZXF1ZXN0ZWRVc2VySWQ7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgY2FzZXMgd2hlcmUgY29uc3RydWN0b3IgaXMgZ2l2ZW4gYSB1c2VySWQgT1IgYSB1c2VySUQgKyBzZXNzaW9uVG9rZW4uXG4gICAqXG4gICAqIEBtZXRob2QgX3Jlc3RvcmVMYXN0U2Vzc2lvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3Jlc3RvcmVMYXN0U2Vzc2lvbihvcHRpb25zLCByZXF1ZXN0ZWRVc2VySWQsIGNhY2hlZFVzZXJJZCkge1xuICAgIGNvbnN0IHNlc3Npb25Ub2tlbiA9IG9wdGlvbnMuc2Vzc2lvblRva2VuIHx8IHRoaXMuX2dldFNlc3Npb25Ub2tlbigpO1xuICAgIGlmIChvcHRpb25zLnNlc3Npb25Ub2tlbikge1xuICAgICAgdGhpcy51c2VySWQgPSByZXF1ZXN0ZWRVc2VySWQ7XG4gICAgfSBlbHNlIGlmIChzZXNzaW9uVG9rZW4gJiYgY2FjaGVkVXNlcklkID09PSByZXF1ZXN0ZWRVc2VySWQpIHtcbiAgICAgIHRoaXMuc2Vzc2lvblRva2VuID0gc2Vzc2lvblRva2VuO1xuICAgICAgdGhpcy51c2VySWQgPSByZXF1ZXN0ZWRVc2VySWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2Vzc2lvblRva2VuID0gJyc7XG4gICAgICB0aGlzLnVzZXJJZCA9ICcnO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIHRoZSBzdWJjb21wb25lbnRzIG9mIHRoZSBDbGllbnRBdXRoZW50aWNhdG9yXG4gICAqXG4gICAqIEBtZXRob2QgX2luaXRDb21wb25lbnRzXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdENvbXBvbmVudHMoKSB7XG4gICAgLy8gU2V0dXAgdGhlIHdlYnNvY2tldCBtYW5hZ2VyOyB3b24ndCBjb25uZWN0IHVudGlsIHdlIHRyaWdnZXIgYW4gYXV0aGVudGljYXRlZCBldmVudFxuICAgIHRoaXMuc29ja2V0TWFuYWdlciA9IG5ldyBTb2NrZXRNYW5hZ2VyKHtcbiAgICAgIGNsaWVudDogdGhpcyxcbiAgICB9KTtcblxuICAgIHRoaXMuc29ja2V0Q2hhbmdlTWFuYWdlciA9IG5ldyBXZWJzb2NrZXRDaGFuZ2VNYW5hZ2VyKHtcbiAgICAgIGNsaWVudDogdGhpcyxcbiAgICAgIHNvY2tldE1hbmFnZXI6IHRoaXMuc29ja2V0TWFuYWdlcixcbiAgICB9KTtcblxuICAgIHRoaXMuc29ja2V0UmVxdWVzdE1hbmFnZXIgPSBuZXcgV2Vic29ja2V0UmVxdWVzdE1hbmFnZXIoe1xuICAgICAgY2xpZW50OiB0aGlzLFxuICAgICAgc29ja2V0TWFuYWdlcjogdGhpcy5zb2NrZXRNYW5hZ2VyLFxuICAgIH0pO1xuXG4gICAgdGhpcy5vbmxpbmVNYW5hZ2VyID0gbmV3IE9ubGluZU1hbmFnZXIoe1xuICAgICAgc29ja2V0TWFuYWdlcjogdGhpcy5zb2NrZXRNYW5hZ2VyLFxuICAgICAgdGVzdFVybDogdGhpcy51cmwgKyAnL25vbmNlcz9jb25uZWN0aW9uLXRlc3QnLFxuICAgICAgY29ubmVjdGVkOiB0aGlzLl9oYW5kbGVPbmxpbmVDaGFuZ2UuYmluZCh0aGlzKSxcbiAgICAgIGRpc2Nvbm5lY3RlZDogdGhpcy5faGFuZGxlT25saW5lQ2hhbmdlLmJpbmQodGhpcyksXG4gICAgfSk7XG5cbiAgICB0aGlzLnN5bmNNYW5hZ2VyID0gbmV3IFN5bmNNYW5hZ2VyKHtcbiAgICAgIG9ubGluZU1hbmFnZXI6IHRoaXMub25saW5lTWFuYWdlcixcbiAgICAgIHNvY2tldE1hbmFnZXI6IHRoaXMuc29ja2V0TWFuYWdlcixcbiAgICAgIHJlcXVlc3RNYW5hZ2VyOiB0aGlzLnNvY2tldFJlcXVlc3RNYW5hZ2VyLFxuICAgICAgY2xpZW50OiB0aGlzLFxuICAgIH0pO1xuXG4gICAgdGhpcy5fY29ubmVjdCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3kgdGhlIHN1YmNvbXBvbmVudHMgb2YgdGhlIENsaWVudEF1dGhlbnRpY2F0b3JcbiAgICpcbiAgICogQG1ldGhvZCBfZGVzdHJveUNvbXBvbmVudHNcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9kZXN0cm95Q29tcG9uZW50cygpIHtcbiAgICB0aGlzLnN5bmNNYW5hZ2VyLmRlc3Ryb3koKTtcbiAgICB0aGlzLm9ubGluZU1hbmFnZXIuZGVzdHJveSgpO1xuICAgIHRoaXMuc29ja2V0TWFuYWdlci5kZXN0cm95KCk7XG4gICAgdGhpcy5zb2NrZXRDaGFuZ2VNYW5hZ2VyLmRlc3Ryb3koKTtcbiAgICB0aGlzLnNvY2tldFJlcXVlc3RNYW5hZ2VyLmRlc3Ryb3koKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzL3Jlc3RvcmVzIHRoZSBzZXNzaW9uVG9rZW5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQG1ldGhvZCBfZ2V0U2Vzc2lvblRva2VuXG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICovXG4gIF9nZXRTZXNzaW9uVG9rZW4oKSB7XG4gICAgaWYgKHRoaXMuc2Vzc2lvblRva2VuKSByZXR1cm4gdGhpcy5zZXNzaW9uVG9rZW47XG4gICAgY29uc3QgY2FjaGVkU2Vzc2lvbkRhdGEgPSBnbG9iYWwubG9jYWxTdG9yYWdlID9cbiAgICAgIGdsb2JhbC5sb2NhbFN0b3JhZ2VbTE9DQUxTVE9SQUdFX0tFWVMuU0VTU0lPTkRBVEEgKyB0aGlzLmFwcElkXSA6ICd7fSc7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBKU09OLnBhcnNlKGNhY2hlZFNlc3Npb25EYXRhKS5zZXNzaW9uVG9rZW47XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9XG4gIH1cblxuXG4gIC8qIENPTk5FQ1QgTUVUSE9EUyBCRUdJTiAqL1xuXG4gIC8qKlxuICAgKiBJbml0aWF0ZXMgdGhlIGNvbm5lY3Rpb24uXG4gICAqXG4gICAqIENhbGxlZCBieSBjb25zdHJ1Y3RvcigpLlxuICAgKlxuICAgKiBXaWxsIGVpdGhlciBhdHRlbXB0IHRvIHZhbGlkYXRlIHRoZSBjYWNoZWQgc2Vzc2lvblRva2VuIGJ5IGdldHRpbmcgY29udmVyYXRpb25zLFxuICAgKiBvciBpZiBubyBzZXNzaW9uVG9rZW4sIHdpbGwgY2FsbCAvbm9uY2VzIHRvIHN0YXJ0IHByb2Nlc3Mgb2YgZ2V0dGluZyBhIG5ldyBvbmUuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBtZXRob2QgX2Nvbm5lY3RcbiAgICpcbiAgICogVE9ETzogV0VCLTk1ODogVXNlIGEgZGVkaWNhdGVkIHNlc3Npb24gdmFsaWRhdGlvbiBlbmRwb2ludCBpbnN0ZWFkIG9mIHRoaXMuLi5cbiAgICovXG4gIF9jb25uZWN0KCkge1xuICAgIGlmICh0aGlzLnNlc3Npb25Ub2tlbikge1xuICAgICAgLy8gVGhpcyB3aWxsIHJldHVybiBhbiBlcnJvciB3aXRoIGEgbm9uY2UgaWYgdGhlIHRva2VuIGlzIG5vdCB2YWxpZC5cbiAgICAgIHRoaXMueGhyKHtcbiAgICAgICAgdXJsOiAnLycsXG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIHN5bmM6IGZhbHNlLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ2NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgfSxcbiAgICAgIH0sIChyZXN1bHQpID0+IHRoaXMuX2Nvbm5lY3Rpb25XaXRoU2Vzc2lvblJlc3BvbnNlKHJlc3VsdCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnhocih7XG4gICAgICAgIHVybDogJy9ub25jZXMnLFxuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgc3luYzogZmFsc2UsXG4gICAgICB9LCAocmVzdWx0KSA9PiB0aGlzLl9jb25uZWN0aW9uUmVzcG9uc2UocmVzdWx0KSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIG91ciB0ZXN0IG9mIG91ciBsYXN0IHNlc3Npb25Ub2tlbiBnZXRzIGEgcmVzcG9uc2UuXG4gICAqXG4gICAqIElmIHRoZSByZXNwb25zZSBpcyBhbiBlcnJvciwgY2FsbCBfc2Vzc2lvblRva2VuRXhwaXJlZCB3aXRoIHRoZSBuZXcgbm9uY2VcbiAgICogcmV0dXJuZWQgaW4gdGhlIGVycm9yLlxuICAgKlxuICAgKiBJZiB0aGUgcmVzcG9uc2UgaXMgc3VjY2Vzc2Z1bCwgdGhlbiwgd2VsbCwgd2UgaGF2ZSBDb252ZXJzYXRpb25zLCBhbmQgY2FuIGNhbGwgX3Nlc3Npb25Ub2tlblJlc3RvcmVkXG4gICAqIHdpdGggdGhvc2UgQ29udmVyc2F0aW9ucy5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQG1ldGhvZCBfY29ubmVjdGlvbldpdGhTZXNzaW9uUmVzcG9uc2VcbiAgICogQHBhcmFtICB7T2JqZWN0fSByZXN1bHRcbiAgICovXG4gIF9jb25uZWN0aW9uV2l0aFNlc3Npb25SZXNwb25zZShyZXN1bHQpIHtcbiAgICBpZiAoIXJlc3VsdC5zdWNjZXNzICYmIHJlc3VsdC5kYXRhLmdldE5vbmNlKCkpIHtcbiAgICAgIHRoaXMuX3Nlc3Npb25Ub2tlbkV4cGlyZWQocmVzdWx0LmRhdGEuZ2V0Tm9uY2UoKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3Nlc3Npb25Ub2tlblJlc3RvcmVkKHJlc3VsdC5kYXRhKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIHdoZW4gb3VyIHJlcXVlc3QgZm9yIGEgbm9uY2UgZ2V0cyBhIHJlc3BvbnNlLlxuICAgKlxuICAgKiBJZiB0aGVyZSBpcyBhbiBlcnJvciwgY2FsbHMgX2Nvbm5lY3Rpb25FcnJvci5cbiAgICpcbiAgICogSWYgdGhlcmUgaXMgbm9uY2UsIGNhbGxzIF9jb25uZWN0aW9uQ29tcGxldGUuXG4gICAqXG4gICAqIEBtZXRob2QgX2Nvbm5lY3Rpb25SZXNwb25zZVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IHJlc3VsdFxuICAgKi9cbiAgX2Nvbm5lY3Rpb25SZXNwb25zZShyZXN1bHQpIHtcbiAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICB0aGlzLl9jb25uZWN0aW9uRXJyb3IocmVzdWx0LmRhdGEpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9jb25uZWN0aW9uQ29tcGxldGUocmVzdWx0LmRhdGEpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBXZSBhcmUgbm93IGNvbm5lY3RlZCAod2UgaGF2ZSBhIG5vbmNlKS5cbiAgICpcbiAgICogSWYgd2UgaGF2ZSBzdWNjZXNzZnVsbHkgcmV0cmlldmVkIGEgbm9uY2UsIHRoZW5cbiAgICogd2UgaGF2ZSBlbnRlcmVkIGEgXCJjb25uZWN0ZWRcIiBidXQgbm90IFwiYXV0aGVudGljYXRlZFwiIHN0YXRlLlxuICAgKiBTZXQgdGhlIHN0YXRlLCB0cmlnZ2VyIGFueSBldmVudHMsIGFuZCB0aGVuIHN0YXJ0IGF1dGhlbnRpY2F0aW9uLlxuICAgKlxuICAgKiBAbWV0aG9kIF9jb25uZWN0aW9uQ29tcGxldGVcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtICB7T2JqZWN0fSByZXN1bHRcbiAgICogQHBhcmFtICB7c3RyaW5nfSByZXN1bHQubm9uY2UgLSBUaGUgbm9uY2UgcHJvdmlkZWQgYnkgdGhlIHNlcnZlclxuICAgKlxuICAgKiBAZmlyZXMgY29ubmVjdGVkXG4gICAqL1xuICBfY29ubmVjdGlvbkNvbXBsZXRlKHJlc3VsdCkge1xuICAgIHRoaXMuaXNDb25uZWN0ZWQgPSB0cnVlO1xuICAgIHRoaXMudHJpZ2dlcignY29ubmVjdGVkJyk7XG4gICAgdGhpcy5fYXV0aGVudGljYXRlKHJlc3VsdC5ub25jZSk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIHdoZW4gd2UgZmFpbCB0byBnZXQgYSBub25jZS5cbiAgICpcbiAgICogQG1ldGhvZCBfY29ubmVjdGlvbkVycm9yXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge2xheWVyLkxheWVyRXJyb3J9IGVyclxuICAgKlxuICAgKiBAZmlyZXMgY29ubmVjdGVkLWVycm9yXG4gICAqL1xuICBfY29ubmVjdGlvbkVycm9yKGVycm9yKSB7XG4gICAgdGhpcy50cmlnZ2VyKCdjb25uZWN0ZWQtZXJyb3InLCB7IGVycm9yIH0pO1xuICB9XG5cblxuICAvKiBDT05ORUNUIE1FVEhPRFMgRU5EICovXG5cbiAgLyogQVVUSEVOVElDQVRFIE1FVEhPRFMgQkVHSU4gKi9cblxuICAvKipcbiAgICogU3RhcnQgdGhlIGF1dGhlbnRpY2F0aW9uIHN0ZXAuXG4gICAqXG4gICAqIFdlIHN0YXJ0IGF1dGhlbnRpY2F0aW9uIGJ5IHRyaWdnZXJpbmcgYSBcImNoYWxsZW5nZVwiIGV2ZW50IHRoYXRcbiAgICogdGVsbHMgdGhlIGFwcCB0byB1c2UgdGhlIG5vbmNlIHRvIG9idGFpbiBhbiBpZGVudGl0eV90b2tlbi5cbiAgICpcbiAgICogQG1ldGhvZCBfYXV0aGVudGljYXRlXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge3N0cmluZ30gbm9uY2UgLSBUaGUgbm9uY2UgdG8gcHJvdmlkZSB5b3VyIGlkZW50aXR5IHByb3ZpZGVyIHNlcnZpY2VcbiAgICpcbiAgICogQGZpcmVzIGNoYWxsZW5nZVxuICAgKi9cbiAgX2F1dGhlbnRpY2F0ZShub25jZSkge1xuICAgIGlmIChub25jZSkge1xuICAgICAgdGhpcy50cmlnZ2VyKCdjaGFsbGVuZ2UnLCB7XG4gICAgICAgIG5vbmNlLFxuICAgICAgICBjYWxsYmFjazogdGhpcy5hbnN3ZXJBdXRoZW50aWNhdGlvbkNoYWxsZW5nZS5iaW5kKHRoaXMpLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFjY2VwdCBhbiBpZGVudGl0eVRva2VuIGFuZCB1c2UgaXQgdG8gY3JlYXRlIGEgc2Vzc2lvbi5cbiAgICpcbiAgICogVHlwaWNhbGx5LCB0aGlzIG1ldGhvZCBpcyBjYWxsZWQgdXNpbmcgdGhlIGZ1bmN0aW9uIHBvaW50ZXIgcHJvdmlkZWQgYnlcbiAgICogdGhlIGNoYWxsZW5nZSBldmVudCwgYnV0IGl0IGNhbiBhbHNvIGJlIGNhbGxlZCBkaXJlY3RseS5cbiAgICpcbiAgICogICAgICBnZXRJZGVudGl0eVRva2VuKG5vbmNlLCBmdW5jdGlvbihpZGVudGl0eVRva2VuKSB7XG4gICAqICAgICAgICAgIGNsaWVudC5hbnN3ZXJBdXRoZW50aWNhdGlvbkNoYWxsZW5nZShpZGVudGl0eVRva2VuKTtcbiAgICogICAgICB9KTtcbiAgICpcbiAgICogQG1ldGhvZCBhbnN3ZXJBdXRoZW50aWNhdGlvbkNoYWxsZW5nZVxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IGlkZW50aXR5VG9rZW4gLSBJZGVudGl0eSB0b2tlbiBwcm92aWRlZCBieSB5b3VyIGlkZW50aXR5IHByb3ZpZGVyIHNlcnZpY2VcbiAgICovXG4gIGFuc3dlckF1dGhlbnRpY2F0aW9uQ2hhbGxlbmdlKGlkZW50aXR5VG9rZW4pIHtcbiAgICAvLyBSZXBvcnQgYW4gZXJyb3IgaWYgbm8gaWRlbnRpdHlUb2tlbiBwcm92aWRlZFxuICAgIGlmICghaWRlbnRpdHlUb2tlbikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKExheWVyRXJyb3IuZGljdGlvbmFyeS5pZGVudGl0eVRva2VuTWlzc2luZyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFN0b3JlIHRoZSBVc2VySWQgYW5kIGdldCBhIHNlc3Npb25Ub2tlbjsgYnlwYXNzIHRoZSBfX2FkanVzdFVzZXJJZCBjb25uZWN0ZWQgdGVzdFxuICAgICAgY29uc3QgdXNlckRhdGEgPSBVdGlsLmRlY29kZShpZGVudGl0eVRva2VuLnNwbGl0KCcuJylbMV0pO1xuICAgICAgdGhpcy5fX3VzZXJJZCA9IEpTT04ucGFyc2UodXNlckRhdGEpLnBybjtcbiAgICAgIHRoaXMueGhyKHtcbiAgICAgICAgdXJsOiAnL3Nlc3Npb25zJyxcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgIHN5bmM6IGZhbHNlLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgaWRlbnRpdHlfdG9rZW46IGlkZW50aXR5VG9rZW4sXG4gICAgICAgICAgYXBwX2lkOiB0aGlzLmFwcElkLFxuICAgICAgICB9LFxuICAgICAgfSwgKHJlc3VsdCkgPT4gdGhpcy5fYXV0aFJlc3BvbnNlKHJlc3VsdCwgaWRlbnRpdHlUb2tlbikpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsZWQgd2hlbiBvdXIgcmVxdWVzdCBmb3IgYSBzZXNzaW9uVG9rZW4gcmVjZWl2ZXMgYSByZXNwb25zZS5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQG1ldGhvZCBfYXV0aFJlc3BvbnNlXG4gICAqIEBwYXJhbSAge09iamVjdH0gcmVzdWx0XG4gICAqIEBwYXJhbSAge3N0cmluZ30gaWRlbnRpdHlUb2tlblxuICAgKi9cbiAgX2F1dGhSZXNwb25zZShyZXN1bHQsIGlkZW50aXR5VG9rZW4pIHtcbiAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICB0aGlzLl9hdXRoRXJyb3IocmVzdWx0LmRhdGEsIGlkZW50aXR5VG9rZW4pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9hdXRoQ29tcGxldGUocmVzdWx0LmRhdGEpO1xuICAgIH1cbiAgfVxuXG5cbiAgLyoqXG4gICAqIEF1dGhlbnRpY2F0aW9uIGlzIGNvbXBsZXRlZCwgdXBkYXRlIHN0YXRlIGFuZCB0cmlnZ2VyIGV2ZW50cy5cbiAgICpcbiAgICogQG1ldGhvZCBfYXV0aENvbXBsZXRlXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdH0gcmVzdWx0XG4gICAqIEBwYXJhbSAge3N0cmluZ30gcmVzdWx0LnNlc3Npb25fdG9rZW4gLSBTZXNzaW9uIHRva2VuIHJlY2VpdmVkIGZyb20gdGhlIHNlcnZlclxuICAgKlxuICAgKiBAZmlyZXMgYXV0aGVudGljYXRlZFxuICAgKi9cbiAgX2F1dGhDb21wbGV0ZShyZXN1bHQpIHtcbiAgICBpZiAoIXJlc3VsdCB8fCAhcmVzdWx0LnNlc3Npb25fdG9rZW4pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihMYXllckVycm9yLmRpY3Rpb25hcnkuc2Vzc2lvblRva2VuTWlzc2luZyk7XG4gICAgfVxuICAgIHRoaXMuc2Vzc2lvblRva2VuID0gcmVzdWx0LnNlc3Npb25fdG9rZW47XG5cbiAgICAvLyBOT1RFOiBXZSBzdG9yZSBib3RoIGl0ZW1zIG9mIGRhdGEgaW4gYSBzaW5nbGUga2V5IGJlY2F1c2Ugc29tZW9uZSBsaXN0ZW5pbmcgZm9yIHN0b3JhZ2VcbiAgICAvLyBldmVudHMgaXMgbGlzdGVuaW5nIGZvciBhbiBhc3luY2hyb25vdXMgY2hhbmdlLCBhbmQgd2UgbmVlZCB0byBnYXVyZW50ZWUgdGhhdCBib3RoXG4gICAgLy8gdXNlcklkIGFuZCBzZXNzaW9uIGFyZSBhdmFpbGFibGUuXG4gICAgaWYgKGdsb2JhbC5sb2NhbFN0b3JhZ2UgJiYgdGhpcy5pc1RydXN0ZWREZXZpY2UpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGdsb2JhbC5sb2NhbFN0b3JhZ2VbTE9DQUxTVE9SQUdFX0tFWVMuU0VTU0lPTkRBVEEgKyB0aGlzLmFwcElkXSA9IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBzZXNzaW9uVG9rZW46IHRoaXMuc2Vzc2lvblRva2VuIHx8ICcnLFxuICAgICAgICAgIHVzZXJJZDogdGhpcy51c2VySWQgfHwgJycsXG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBEbyBub3RoaW5nXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSB0cnVlO1xuICAgIHRoaXMudHJpZ2dlcignYXV0aGVudGljYXRlZCcpO1xuICAgIHRoaXMuX2NsaWVudFJlYWR5KCk7XG4gIH1cblxuICAvKipcbiAgICogQXV0aGVudGljYXRpb24gaGFzIGZhaWxlZC5cbiAgICpcbiAgICogQG1ldGhvZCBfYXV0aEVycm9yXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge2xheWVyLkxheWVyRXJyb3J9IHJlc3VsdFxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IGlkZW50aXR5VG9rZW4gTm90IGN1cnJlbnRseSB1c2VkXG4gICAqXG4gICAqIEBmaXJlcyBhdXRoZW50aWNhdGVkLWVycm9yXG4gICAqL1xuICBfYXV0aEVycm9yKGVycm9yLCBpZGVudGl0eVRva2VuKSB7XG4gICAgdGhpcy50cmlnZ2VyKCdhdXRoZW50aWNhdGVkLWVycm9yJywgeyBlcnJvciB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHN0YXRlIGFuZCB0cmlnZ2VycyBldmVudHMgZm9yIGJvdGggY29ubmVjdGVkIGFuZCBhdXRoZW50aWNhdGVkLlxuICAgKlxuICAgKiBJZiByZXVzaW5nIGEgc2Vzc2lvblRva2VuIGNhY2hlZCBpbiBsb2NhbFN0b3JhZ2UsXG4gICAqIHVzZSB0aGlzIG1ldGhvZCByYXRoZXIgdGhhbiBfYXV0aENvbXBsZXRlLlxuICAgKlxuICAgKiBAbWV0aG9kIF9zZXNzaW9uVG9rZW5SZXN0b3JlZFxuICAgKiBAcHJpdmF0ZVxuICAgKlxuICAgKiBAZmlyZXMgY29ubmVjdGVkLCBhdXRoZW50aWNhdGVkXG4gICAqL1xuICBfc2Vzc2lvblRva2VuUmVzdG9yZWQocmVzdWx0KSB7XG4gICAgdGhpcy5pc0Nvbm5lY3RlZCA9IHRydWU7XG4gICAgdGhpcy50cmlnZ2VyKCdjb25uZWN0ZWQnKTtcbiAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IHRydWU7XG4gICAgdGhpcy50cmlnZ2VyKCdhdXRoZW50aWNhdGVkJyk7XG4gICAgdGhpcy5fY2xpZW50UmVhZHkoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcmllZCB0byByZXVzZSBhIGNhY2hlZCBzZXNzaW9uVG9rZW4gYnV0IHdhcyByZWplY3RlZC5cbiAgICpcbiAgICogT24gZmFpbGluZyB0byByZXN0b3JlIGEgc2Vzc2lvblRva2VuIHN0b3JlZCBpbiBsb2NhbFN0b3JhZ2UsXG4gICAqIFN0YXJ0IHRoZSBjb25uZWN0KCkgcHJvY2VzcyBhbmV3LlxuICAgKlxuICAgKiBAbWV0aG9kIF9zZXNzaW9uVG9rZW5FeHBpcmVkXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc2Vzc2lvblRva2VuRXhwaXJlZChub25jZSkge1xuICAgIHRoaXMuc2Vzc2lvblRva2VuID0gJyc7XG4gICAgaWYgKGdsb2JhbC5sb2NhbFN0b3JhZ2UpIHtcbiAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKExPQ0FMU1RPUkFHRV9LRVlTLlNFU1NJT05EQVRBICsgdGhpcy5hcHBJZCk7XG4gICAgfVxuICAgIHRoaXMuX2F1dGhlbnRpY2F0ZShub25jZSk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIHRvIGZsYWcgdGhlIGNsaWVudCBhcyByZWFkeSBmb3IgYWN0aW9uLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBpcyBjYWxsZWQgYWZ0ZXIgYXV0aGVuaWNhdGlvbiBBTkRcbiAgICogYWZ0ZXIgaW5pdGlhbCBjb252ZXJzYXRpb25zIGhhdmUgYmVlbiBsb2FkZWQuXG4gICAqXG4gICAqIEBtZXRob2QgX2NsaWVudFJlYWR5XG4gICAqIEBwcml2YXRlXG4gICAqIEBmaXJlcyByZWFkeVxuICAgKi9cbiAgX2NsaWVudFJlYWR5KCkge1xuICAgIGlmICghdGhpcy5pc1JlYWR5KSB7XG4gICAgICB0aGlzLmlzUmVhZHkgPSB0cnVlO1xuICAgICAgdGhpcy50cmlnZ2VyKCdyZWFkeScpO1xuICAgICAgdGhpcy5vbmxpbmVNYW5hZ2VyLnN0YXJ0KCk7XG4gICAgfVxuICB9XG5cblxuICAvKiBDT05ORUNUIE1FVEhPRFMgRU5EICovXG5cblxuICAvKiBTVEFSVCBTRVNTSU9OIE1BTkFHRU1FTlQgTUVUSE9EUyAqL1xuXG4gIC8qKlxuICAgKiBEZWxldGVzIHlvdXIgc2Vzc2lvblRva2VuIGZyb20gdGhlIHNlcnZlciwgYW5kIHJlbW92ZXMgYWxsIHVzZXIgZGF0YSBmcm9tIHRoZSBDbGllbnQuXG4gICAqIENhbGwgYGNsaWVudC5sb2dpbigpYCB0byByZXN0YXJ0IHRoZSBhdXRoZW50aWNhdGlvbiBwcm9jZXNzLlxuICAgKlxuICAgKiBAbWV0aG9kIGxvZ291dFxuICAgKiBAcmV0dXJuIHtsYXllci5DbGllbnRBdXRoZW50aWNhdG9yfSB0aGlzXG4gICAqL1xuICBsb2dvdXQoKSB7XG4gICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKSB7XG4gICAgICB0aGlzLnhocih7XG4gICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgIHVybDogJy9zZXNzaW9ucy8nICsgZXNjYXBlKHRoaXMuc2Vzc2lvblRva2VuKSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIENsZWFyIGRhdGEgZXZlbiBpZiBpc0F1dGhlbnRpY2F0ZWQgaXMgZmFsc2VcbiAgICAvLyBTZXNzaW9uIG1heSBoYXZlIGV4cGlyZWQsIGJ1dCBkYXRhIHN0aWxsIGNhY2hlZC5cbiAgICB0aGlzLl9yZXNldFNlc3Npb24oKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGlzIG1ldGhvZCBpcyBub3QgbmVlZGVkIHVuZGVyIG5vcm1hbCBjb25kaXRpb25zLlxuICAgKiBIb3dldmVyLCBpZiBhZnRlciBjYWxsaW5nIGBsb2dvdXQoKWAgeW91IHdhbnQgdG9cbiAgICogZ2V0IGEgbmV3IG5vbmNlIGFuZCB0cmlnZ2VyIGEgbmV3IGBjaGFsbGVuZ2VgIGV2ZW50LFxuICAgKiBjYWxsIGBsb2dpbigpYC5cbiAgICpcbiAgICogQG1ldGhvZCBsb2dpblxuICAgKiBAcmV0dXJuIHtsYXllci5DbGllbnRBdXRoZW50aWNhdG9yfSB0aGlzXG4gICAqL1xuICBsb2dpbigpIHtcbiAgICB0aGlzLl9jb25uZWN0KCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogTG9nIG91dC9jbGVhciBzZXNzaW9uIGluZm9ybWF0aW9uLlxuICAgKlxuICAgKiBVc2UgdGhpcyB0byBjbGVhciB0aGUgc2Vzc2lvblRva2VuIGFuZCBhbGwgaW5mb3JtYXRpb24gZnJvbSB0aGlzIHNlc3Npb24uXG4gICAqXG4gICAqIEBtZXRob2QgX3Jlc2V0U2Vzc2lvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcmV0dXJucyB7bGF5ZXIuQ2xpZW50QXV0aGVudGljYXRvcn0gdGhpc1xuICAgKi9cbiAgX3Jlc2V0U2Vzc2lvbigpIHtcbiAgICB0aGlzLmlzUmVhZHkgPSBmYWxzZTtcbiAgICBpZiAodGhpcy5zZXNzaW9uVG9rZW4pIHtcbiAgICAgIHRoaXMuc2Vzc2lvblRva2VuID0gJyc7XG4gICAgICBpZiAoZ2xvYmFsLmxvY2FsU3RvcmFnZSkge1xuICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShMT0NBTFNUT1JBR0VfS0VZUy5TRVNTSU9OREFUQSArIHRoaXMuYXBwSWQpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmlzQ29ubmVjdGVkID0gZmFsc2U7XG4gICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmYWxzZTtcblxuICAgIHRoaXMudHJpZ2dlcignZGVhdXRoZW50aWNhdGVkJyk7XG4gICAgdGhpcy5vbmxpbmVNYW5hZ2VyLnN0b3AoKTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIHlvdXIgSU9TIGRldmljZSB0byByZWNlaXZlIG5vdGlmaWNhdGlvbnMuXG4gICAqIEZvciB1c2Ugd2l0aCBuYXRpdmUgY29kZSBvbmx5IChDb3Jkb3ZhLCBSZWFjdCBOYXRpdmUsIFRpdGFuaXVtLCBldGMuLi4pXG4gICAqXG4gICAqIEBtZXRob2QgcmVnaXN0ZXJJT1NQdXNoVG9rZW5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAgICogQHBhcmFtIHtzdHJpbmd9IG9wdGlvbnMuZGV2aWNlSWQgLSBZb3VyIElPUyBkZXZpY2UncyBkZXZpY2UgSURcbiAgICogQHBhcmFtIHtzdHJpbmd9IG9wdGlvbnMuaW9zVmVyc2lvbiAtIFlvdXIgSU9TIGRldmljZSdzIHZlcnNpb24gbnVtYmVyXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRpb25zLnRva2VuIC0gWW91ciBBcHBsZSBBUE5TIFRva2VuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbb3B0aW9ucy5idW5kbGVJZF0gLSBZb3VyIEFwcGxlIEFQTlMgQnVuZGxlIElEIChcImNvbS5sYXllci5idW5kbGVpZFwiKVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9bnVsbF0gLSBPcHRpb25hbCBjYWxsYmFja1xuICAgKiBAcGFyYW0ge2xheWVyLkxheWVyRXJyb3J9IGNhbGxiYWNrLmVycm9yIC0gTGF5ZXJFcnJvciBpZiB0aGVyZSB3YXMgYW4gZXJyb3I7IG51bGwgaWYgc3VjY2Vzc2Z1bFxuICAgKi9cbiAgcmVnaXN0ZXJJT1NQdXNoVG9rZW4ob3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICB0aGlzLnhocih7XG4gICAgICB1cmw6ICdwdXNoX3Rva2VucycsXG4gICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgIHN5bmM6IGZhbHNlLFxuICAgICAgZGF0YToge1xuICAgICAgICB0b2tlbjogb3B0aW9ucy50b2tlbixcbiAgICAgICAgdHlwZTogJ2FwbnMnLFxuICAgICAgICBkZXZpY2VfaWQ6IG9wdGlvbnMuZGV2aWNlSWQsXG4gICAgICAgIGlvc192ZXJzaW9uOiBvcHRpb25zLmlvc1ZlcnNpb24sXG4gICAgICAgIGFwbnNfYnVuZGxlX2lkOiBvcHRpb25zLmJ1bmRsZUlkLFxuICAgICAgfSxcbiAgICB9LCAocmVzdWx0KSA9PiBjYWxsYmFjayhyZXN1bHQuZGF0YSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIHlvdXIgQW5kcm9pZCBkZXZpY2UgdG8gcmVjZWl2ZSBub3RpZmljYXRpb25zLlxuICAgKiBGb3IgdXNlIHdpdGggbmF0aXZlIGNvZGUgb25seSAoQ29yZG92YSwgUmVhY3QgTmF0aXZlLCBUaXRhbml1bSwgZXRjLi4uKVxuICAgKlxuICAgKiBAbWV0aG9kIHJlZ2lzdGVyQW5kcm9pZFB1c2hUb2tlblxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0aW9ucy5kZXZpY2VJZCAtIFlvdXIgSU9TIGRldmljZSdzIGRldmljZSBJRFxuICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0aW9ucy50b2tlbiAtIFlvdXIgR0NNIHB1c2ggVG9rZW5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG9wdGlvbnMuc2VuZGVySWQgLSBZb3VyIEdDTSBTZW5kZXIgSUQvUHJvamVjdCBOdW1iZXJcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPW51bGxdIC0gT3B0aW9uYWwgY2FsbGJhY2tcbiAgICogQHBhcmFtIHtsYXllci5MYXllckVycm9yfSBjYWxsYmFjay5lcnJvciAtIExheWVyRXJyb3IgaWYgdGhlcmUgd2FzIGFuIGVycm9yOyBudWxsIGlmIHN1Y2Nlc3NmdWxcbiAgICovXG4gIHJlZ2lzdGVyQW5kcm9pZFB1c2hUb2tlbihvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIHRoaXMueGhyKHtcbiAgICAgIHVybDogJ3B1c2hfdG9rZW5zJyxcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgc3luYzogZmFsc2UsXG4gICAgICBkYXRhOiB7XG4gICAgICAgIHRva2VuOiBvcHRpb25zLnRva2VuLFxuICAgICAgICB0eXBlOiAnZ2NtJyxcbiAgICAgICAgZGV2aWNlX2lkOiBvcHRpb25zLmRldmljZUlkLFxuICAgICAgICBnY21fc2VuZGVyX2lkOiBvcHRpb25zLnNlbmRlcklkLFxuICAgICAgfSxcbiAgICB9LCAocmVzdWx0KSA9PiBjYWxsYmFjayhyZXN1bHQuZGF0YSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIHlvdXIgQW5kcm9pZCBkZXZpY2UgdG8gcmVjZWl2ZSBub3RpZmljYXRpb25zLlxuICAgKiBGb3IgdXNlIHdpdGggbmF0aXZlIGNvZGUgb25seSAoQ29yZG92YSwgUmVhY3QgTmF0aXZlLCBUaXRhbml1bSwgZXRjLi4uKVxuICAgKlxuICAgKiBAbWV0aG9kIHVucmVnaXN0ZXJQdXNoVG9rZW5cbiAgICogQHBhcmFtIHtzdHJpbmd9IGRldmljZUlkIC0gWW91ciBJT1MgZGV2aWNlJ3MgZGV2aWNlIElEXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1udWxsXSAtIE9wdGlvbmFsIGNhbGxiYWNrXG4gICAqIEBwYXJhbSB7bGF5ZXIuTGF5ZXJFcnJvcn0gY2FsbGJhY2suZXJyb3IgLSBMYXllckVycm9yIGlmIHRoZXJlIHdhcyBhbiBlcnJvcjsgbnVsbCBpZiBzdWNjZXNzZnVsXG4gICAqL1xuICB1bnJlZ2lzdGVyUHVzaFRva2VuKGRldmljZUlkLCBjYWxsYmFjaykge1xuICAgIHRoaXMueGhyKHtcbiAgICAgIHVybDogJ3B1c2hfdG9rZW5zLycgKyBkZXZpY2VJZCxcbiAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgfSwgKHJlc3VsdCkgPT4gY2FsbGJhY2socmVzdWx0LmRhdGEpKTtcbiAgfVxuXG4gIC8qIFNFU1NJT04gTUFOQUdFTUVOVCBNRVRIT0RTIEVORCAqL1xuXG5cbiAgLyogQUNDRVNTT1IgTUVUSE9EUyBCRUdJTiAqL1xuXG4gIC8qKlxuICAgKiBfXyBNZXRob2RzIGFyZSBhdXRvbWF0aWNhbGx5IGNhbGxlZCBieSBwcm9wZXJ0eSBzZXR0ZXJzLlxuICAgKlxuICAgKiBBbnkgYXR0ZW1wdCB0byBleGVjdXRlIGB0aGlzLnVzZXJBcHBJZCA9ICd4eHgnYCB3aWxsIGNhdXNlIGFuIGVycm9yIHRvIGJlIHRocm93blxuICAgKiBpZiB0aGUgY2xpZW50IGlzIGFscmVhZHkgY29ubmVjdGVkLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAbWV0aG9kIF9fYWRqdXN0QXBwSWRcbiAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gTmV3IGFwcElkIHZhbHVlXG4gICAqL1xuICBfX2FkanVzdEFwcElkKHZhbHVlKSB7XG4gICAgaWYgKHRoaXMuaXNDb25uZWN0ZWQpIHRocm93IG5ldyBFcnJvcihMYXllckVycm9yLmRpY3Rpb25hcnkuY2FudENoYW5nZUlmQ29ubmVjdGVkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBfXyBNZXRob2RzIGFyZSBhdXRvbWF0aWNhbGx5IGNhbGxlZCBieSBwcm9wZXJ0eSBzZXR0ZXJzLlxuICAgKlxuICAgKiBBbnkgYXR0ZW1wdCB0byBleGVjdXRlIGB0aGlzLnVzZXJJZCA9ICd4eHgnYCB3aWxsIGNhdXNlIGFuIGVycm9yIHRvIGJlIHRocm93blxuICAgKiBpZiB0aGUgY2xpZW50IGlzIGFscmVhZHkgY29ubmVjdGVkLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAbWV0aG9kIF9fYWRqdXN0VXNlcklkXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIE5ldyBhcHBJZCB2YWx1ZVxuICAgKi9cbiAgX19hZGp1c3RVc2VySWQodmFsdWUpIHtcbiAgICBpZiAodGhpcy5pc0Nvbm5lY3RlZCkgdGhyb3cgbmV3IEVycm9yKExheWVyRXJyb3IuZGljdGlvbmFyeS5jYW50Q2hhbmdlSWZDb25uZWN0ZWQpO1xuICB9XG5cbiAgLyogQUNDRVNTT1IgTUVUSE9EUyBFTkQgKi9cblxuXG4gIC8qIENPTU1VTklDQVRJT05TIE1FVEhPRFMgQkVHSU4gKi9cbiAgc2VuZFNvY2tldFJlcXVlc3QocGFyYW1zLCBjYWxsYmFjaykge1xuICAgIGlmIChwYXJhbXMuc3luYykge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gcGFyYW1zLnN5bmMudGFyZ2V0O1xuICAgICAgbGV0IGRlcGVuZHMgPSBwYXJhbXMuc3luYy5kZXBlbmRzO1xuICAgICAgaWYgKHRhcmdldCAmJiAhZGVwZW5kcykgZGVwZW5kcyA9IFt0YXJnZXRdO1xuXG4gICAgICB0aGlzLnN5bmNNYW5hZ2VyLnJlcXVlc3QobmV3IFdlYnNvY2tldFN5bmNFdmVudCh7XG4gICAgICAgIGRhdGE6IHBhcmFtcy5ib2R5LFxuICAgICAgICBvcGVyYXRpb246IHBhcmFtcy5tZXRob2QsXG4gICAgICAgIHRhcmdldCxcbiAgICAgICAgZGVwZW5kcyxcbiAgICAgICAgY2FsbGJhY2ssXG4gICAgICB9KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0eXBlb2YgcGFyYW1zLmRhdGEgPT09ICdmdW5jdGlvbicpIHBhcmFtcy5kYXRhID0gcGFyYW1zLmRhdGEoKTtcbiAgICAgIHRoaXMuc29ja2V0UmVxdWVzdE1hbmFnZXIuc2VuZFJlcXVlc3QocGFyYW1zLCBjYWxsYmFjayk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRoaXMgZXZlbnQgaGFuZGxlciByZWNlaXZlcyBldmVudHMgZnJvbSB0aGUgT25saW5lIFN0YXRlIE1hbmFnZXIgYW5kIGdlbmVyYXRlcyBhbiBldmVudCBmb3IgdGhvc2Ugc3Vic2NyaWJlZFxuICAgKiB0byBjbGllbnQub24oJ29ubGluZScpXG4gICAqXG4gICAqIEBtZXRob2QgX2hhbmRsZU9ubGluZUNoYW5nZVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge2xheWVyLkxheWVyRXZlbnR9IGV2dFxuICAgKi9cbiAgX2hhbmRsZU9ubGluZUNoYW5nZShldnQpIHtcbiAgICBpZiAoIXRoaXMuaXNBdXRoZW50aWNhdGVkKSByZXR1cm47XG4gICAgY29uc3QgZHVyYXRpb24gPSBldnQub2ZmbGluZUR1cmF0aW9uO1xuICAgIGNvbnN0IGlzT25saW5lID0gZXZ0LmV2ZW50TmFtZSA9PT0gJ2Nvbm5lY3RlZCc7XG4gICAgY29uc3Qgb2JqID0geyBpc09ubGluZSB9O1xuICAgIGlmIChpc09ubGluZSkge1xuICAgICAgb2JqLnJlc2V0ID0gZHVyYXRpb24gPiBDbGllbnRBdXRoZW50aWNhdG9yLlJlc2V0QWZ0ZXJPZmZsaW5lRHVyYXRpb247XG4gICAgfVxuICAgIHRoaXMudHJpZ2dlcignb25saW5lJywgb2JqKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNYWluIGVudHJ5IHBvaW50IGZvciBzZW5kaW5nIHhociByZXF1ZXN0cyBvciBmb3IgcXVlaW5nIHRoZW0gaW4gdGhlIHN5bmNNYW5hZ2VyLlxuICAgKlxuICAgKiBUaGlzIGNhbGwgYWRqdXN0IGFyZ3VtZW50cyBmb3Igb3VyIFJFU1Qgc2VydmVyLlxuICAgKlxuICAgKiBAbWV0aG9kIHhoclxuICAgKiBAcHJvdGVjdGVkXG4gICAqIEBwYXJhbSAge09iamVjdH0gICBvcHRpb25zXG4gICAqIEBwYXJhbSAge3N0cmluZ30gICBvcHRpb25zLnVybCAtIFVSTCByZWxhdGl2ZSBjbGllbnQncyB1cmw6IFwiL2NvbnZlcnNhdGlvbnNcIlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICogQHBhcmFtICB7T2JqZWN0fSAgIGNhbGxiYWNrLnJlc3VsdFxuICAgKiBAcGFyYW0gIHtNaXhlZH0gICAgY2FsbGJhY2sucmVzdWx0LmRhdGEgLSBJZiBhbiBlcnJvciBvY2N1cnJlZCwgdGhpcyBpcyBhIGxheWVyLkxheWVyRXJyb3I7XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSWYgdGhlIHJlc3BvbnNlIHdhcyBhcHBsaWNhdGlvbi9qc29uLCB0aGlzIHdpbGwgYmUgYW4gb2JqZWN0XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSWYgdGhlIHJlc3BvbnNlIHdhcyB0ZXh0L2VtcHR5LCB0aGlzIHdpbGwgYmUgdGV4dC9lbXB0eVxuICAgKiBAcGFyYW0gIHtYTUxIdHRwUmVxdWVzdH0gY2FsbGJhY2sucmVzdWx0LnhociAtIE5hdGl2ZSB4aHIgcmVxdWVzdCBvYmplY3QgZm9yIGRldGFpbGVkIGFuYWx5c2lzXG4gICAqIEBwYXJhbSAge09iamVjdH0gICAgICAgICBjYWxsYmFjay5yZXN1bHQuTGlua3MgLSBIYXNoIG9mIExpbmsgaGVhZGVyc1xuICAgKiBAcmV0dXJuIHtsYXllci5DbGllbnRBdXRoZW50aWNhdG9yfSB0aGlzXG4gICAqL1xuICB4aHIob3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMudXJsID09PSAnc3RyaW5nJykge1xuICAgICAgb3B0aW9ucy51cmwgPSB0aGlzLl94aHJGaXhSZWxhdGl2ZVVybHMob3B0aW9ucy51cmwpO1xuICAgIH1cblxuICAgIG9wdGlvbnMud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcbiAgICBpZiAoIW9wdGlvbnMubWV0aG9kKSBvcHRpb25zLm1ldGhvZCA9ICdHRVQnO1xuICAgIGlmICghb3B0aW9ucy5oZWFkZXJzKSBvcHRpb25zLmhlYWRlcnMgPSB7fTtcbiAgICB0aGlzLl94aHJGaXhIZWFkZXJzKG9wdGlvbnMuaGVhZGVycyk7XG4gICAgdGhpcy5feGhyRml4QXV0aChvcHRpb25zLmhlYWRlcnMpO1xuXG5cbiAgICAvLyBOb3RlOiB0aGlzIGlzIG5vdCBzeW5jIHZzIGFzeW5jOyB0aGlzIGlzIHN5bmNNYW5hZ2VyIHZzIGZpcmUgaXQgbm93XG4gICAgaWYgKG9wdGlvbnMuc3luYyA9PT0gZmFsc2UpIHtcbiAgICAgIHRoaXMuX25vbnN5bmNYaHIob3B0aW9ucywgY2FsbGJhY2ssIDApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9zeW5jWGhyKG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBfc3luY1hocihvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmICghb3B0aW9ucy5zeW5jKSBvcHRpb25zLnN5bmMgPSB7fTtcbiAgICBjb25zdCBpbm5lckNhbGxiYWNrID0gKHJlc3VsdCkgPT4ge1xuICAgICAgdGhpcy5feGhyUmVzdWx0KHJlc3VsdCwgY2FsbGJhY2spO1xuICAgIH07XG4gICAgY29uc3QgdGFyZ2V0ID0gb3B0aW9ucy5zeW5jLnRhcmdldDtcbiAgICBsZXQgZGVwZW5kcyA9IG9wdGlvbnMuc3luYy5kZXBlbmRzO1xuICAgIGlmICh0YXJnZXQgJiYgIWRlcGVuZHMpIGRlcGVuZHMgPSBbdGFyZ2V0XTtcblxuICAgIHRoaXMuc3luY01hbmFnZXIucmVxdWVzdChuZXcgWEhSU3luY0V2ZW50KHtcbiAgICAgIHVybDogb3B0aW9ucy51cmwsXG4gICAgICBkYXRhOiBvcHRpb25zLmRhdGEsXG4gICAgICBtZXRob2Q6IG9wdGlvbnMubWV0aG9kLFxuICAgICAgb3BlcmF0aW9uOiBvcHRpb25zLnN5bmMub3BlcmF0aW9uIHx8IG9wdGlvbnMubWV0aG9kLFxuICAgICAgaGVhZGVyczogb3B0aW9ucy5oZWFkZXJzLFxuICAgICAgY2FsbGJhY2s6IGlubmVyQ2FsbGJhY2ssXG4gICAgICB0YXJnZXQsXG4gICAgICBkZXBlbmRzLFxuICAgIH0pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGb3IgeGhyIGNhbGxzIHRoYXQgZG9uJ3QgZ28gdGhyb3VnaCB0aGUgc3luYyBtYW5hZ2VyLFxuICAgKiBmaXJlIHRoZSByZXF1ZXN0LCBhbmQgaWYgaXQgZmFpbHMsIHJlZmlyZSBpdCB1cCB0byAzIHRyaWVzXG4gICAqIGJlZm9yZSByZXBvcnRpbmcgYW4gZXJyb3IuICAxIHNlY29uZCBkZWxheSBiZXR3ZWVuIHJlcXVlc3RzXG4gICAqIHNvIHdoYXRldmVyIGlzc3VlIGlzIG9jY3VyaW5nIGlzIGEgdGlueSBiaXQgbW9yZSBsaWtlbHkgdG8gcmVzb2x2ZSxcbiAgICogYW5kIHNvIHdlIGRvbid0IGhhbW1lciB0aGUgc2VydmVyIGV2ZXJ5IHRpbWUgdGhlcmUncyBhIHByb2JsZW0uXG4gICAqXG4gICAqIEBtZXRob2QgX25vbnN5bmNYaHJcbiAgICogQHBhcmFtICB7T2JqZWN0fSAgIG9wdGlvbnNcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAqIEBwYXJhbSAge251bWJlcn0gICByZXRyeUNvdW50XG4gICAqL1xuICBfbm9uc3luY1hocihvcHRpb25zLCBjYWxsYmFjaywgcmV0cnlDb3VudCkge1xuICAgIHhocihvcHRpb25zLCByZXN1bHQgPT4ge1xuICAgICAgaWYgKFs1MDIsIDUwMywgNTA0XS5pbmRleE9mKHJlc3VsdC5zdGF0dXMpICE9PSAtMSAmJiByZXRyeUNvdW50IDwgTUFYX1hIUl9SRVRSSUVTKSB7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy5fbm9uc3luY1hocihvcHRpb25zLCBjYWxsYmFjaywgcmV0cnlDb3VudCArIDEpLCAxMDAwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3hoclJlc3VsdChyZXN1bHQsIGNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaXggYXV0aGVudGljYXRpb24gaGVhZGVyIGZvciBhbiB4aHIgcmVxdWVzdFxuICAgKlxuICAgKiBAbWV0aG9kIF94aHJGaXhBdXRoXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdH0gaGVhZGVyc1xuICAgKi9cbiAgX3hockZpeEF1dGgoaGVhZGVycykge1xuICAgIGlmICh0aGlzLnNlc3Npb25Ub2tlbiAmJiAhaGVhZGVycy5BdXRob3JpemF0aW9uKSB7XG4gICAgICBoZWFkZXJzLmF1dGhvcml6YXRpb24gPSAnTGF5ZXIgc2Vzc2lvbi10b2tlbj1cIicgKyAgdGhpcy5zZXNzaW9uVG9rZW4gKyAnXCInOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEZpeCByZWxhdGl2ZSBVUkxzIHRvIGNyZWF0ZSBhYnNvbHV0ZSBVUkxzIG5lZWRlZCBmb3IgQ09SUyByZXF1ZXN0cy5cbiAgICpcbiAgICogQG1ldGhvZCBfeGhyRml4UmVsYXRpdmVVcmxzXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge3N0cmluZ30gcmVsYXRpdmUgb3IgYWJzb2x1dGUgdXJsXG4gICAqIEByZXR1cm4ge3N0cmluZ30gYWJzb2x1dGUgdXJsXG4gICAqL1xuICBfeGhyRml4UmVsYXRpdmVVcmxzKHVybCkge1xuICAgIGxldCByZXN1bHQgPSB1cmw7XG4gICAgaWYgKHVybC5pbmRleE9mKCdodHRwczovLycpID09PSAtMSkge1xuICAgICAgaWYgKHVybFswXSA9PT0gJy8nKSB7XG4gICAgICAgIHJlc3VsdCA9IHRoaXMudXJsICsgdXJsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0ID0gdGhpcy51cmwgKyAnLycgKyB1cmw7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogRml4dXAgYWxsIGhlYWRlcnMgaW4gcHJlcGFyYXRpb24gZm9yIGFuIHhociBjYWxsLlxuICAgKlxuICAgKiAxLiBBbGwgaGVhZGVycyB1c2UgbG93ZXIgY2FzZSBuYW1lcyBmb3Igc3RhbmRhcmQvZWFzeSBsb29rdXBcbiAgICogMi4gU2V0IHRoZSBhY2NlcHQgaGVhZGVyXG4gICAqIDMuIElmIG5lZWRlZCwgc2V0IHRoZSBjb250ZW50LXR5cGUgaGVhZGVyXG4gICAqXG4gICAqIEBtZXRob2QgX3hockZpeEhlYWRlcnNcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtICB7T2JqZWN0fSBoZWFkZXJzXG4gICAqL1xuICBfeGhyRml4SGVhZGVycyhoZWFkZXJzKSB7XG4gICAgLy8gUmVwbGFjZSBhbGwgaGVhZGVycyBpbiBhcmJpdHJhcnkgY2FzZSB3aXRoIGFsbCBsb3dlciBjYXNlXG4gICAgLy8gZm9yIGVhc3kgbWF0Y2hpbmcuXG4gICAgY29uc3QgaGVhZGVyTmFtZUxpc3QgPSBPYmplY3Qua2V5cyhoZWFkZXJzKTtcbiAgICBoZWFkZXJOYW1lTGlzdC5mb3JFYWNoKGhlYWRlck5hbWUgPT4ge1xuICAgICAgaWYgKGhlYWRlck5hbWUgIT09IGhlYWRlck5hbWUudG9Mb3dlckNhc2UoKSkge1xuICAgICAgICBoZWFkZXJzW2hlYWRlck5hbWUudG9Mb3dlckNhc2UoKV0gPSBoZWFkZXJzW2hlYWRlck5hbWVdO1xuICAgICAgICBkZWxldGUgaGVhZGVyc1toZWFkZXJOYW1lXTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmICghaGVhZGVycy5hY2NlcHQpIGhlYWRlcnMuYWNjZXB0ID0gQUNDRVBUO1xuXG4gICAgaWYgKCFoZWFkZXJzWydjb250ZW50LXR5cGUnXSkgaGVhZGVyc1snY29udGVudC10eXBlJ10gPSAnYXBwbGljYXRpb24vanNvbic7XG4gIH1cblxuICAvKipcbiAgICogSGFuZGxlIHRoZSByZXN1bHQgb2YgYW4geGhyIGNhbGxcbiAgICpcbiAgICogQG1ldGhvZCBfeGhyUmVzdWx0XG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdH0gICByZXN1bHQgICAgIFN0YW5kYXJkIHhociByZXNwb25zZSBvYmplY3QgZnJvbSB0aGUgeGhyIGxpYlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSBDYWxsYmFjayBvbiBjb21wbGV0aW9uXG4gICAqL1xuICBfeGhyUmVzdWx0KHJlc3VsdCwgY2FsbGJhY2spIHtcbiAgICBpZiAodGhpcy5pc0Rlc3Ryb3llZCkgcmV0dXJuO1xuXG4gICAgaWYgKCFyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgLy8gUmVwbGFjZSB0aGUgcmVzcG9uc2Ugd2l0aCBhIExheWVyRXJyb3IgaW5zdGFuY2VcbiAgICAgIGlmIChyZXN1bHQuZGF0YSAmJiB0eXBlb2YgcmVzdWx0LmRhdGEgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIHRoaXMuX2dlbmVyYXRlRXJyb3IocmVzdWx0KTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgaXRzIGFuIGF1dGhlbnRpY2F0aW9uIGVycm9yLCByZWF1dGhlbnRpY2F0ZVxuICAgICAgLy8gZG9uJ3QgY2FsbCBfcmVzZXRTZXNzaW9uIGFzIHRoYXQgd2lwZXMgYWxsIGRhdGEgYW5kIHNjcmV3cyB3aXRoIFVJcywgYW5kIHRoZSB1c2VyXG4gICAgICAvLyBpcyBzdGlsbCBhdXRoZW50aWNhdGVkIG9uIHRoZSBjdXN0b21lcidzIGFwcCBldmVuIGlmIG5vdCBvbiBMYXllci5cbiAgICAgIGlmIChyZXN1bHQuc3RhdHVzID09PSA0MDEgJiYgdGhpcy5pc0F1dGhlbnRpY2F0ZWQpIHtcbiAgICAgICAgbG9nZ2VyLndhcm4oJ1NFU1NJT04gRVhQSVJFRCEnKTtcbiAgICAgICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdkZWF1dGhlbnRpY2F0ZWQnKTtcbiAgICAgICAgdGhpcy5fYXV0aGVudGljYXRlKHJlc3VsdC5kYXRhLmdldE5vbmNlKCkpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKHJlc3VsdCk7XG4gIH1cblxuICAvKipcbiAgICogVHJhbnNmb3JtcyB4aHIgZXJyb3IgcmVzcG9uc2UgaW50byBhIGxheWVyLkxheWVyRXJyb3IgaW5zdGFuY2UuXG4gICAqXG4gICAqIEFkZHMgYWRkaXRpb25hbCBpbmZvcm1hdGlvbiB0byB0aGUgcmVzdWx0IG9iamVjdCBpbmNsdWRpbmdcbiAgICpcbiAgICogKiB1cmxcbiAgICogKiBkYXRhXG4gICAqXG4gICAqIEBtZXRob2QgX2dlbmVyYXRlRXJyb3JcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtICB7T2JqZWN0fSByZXN1bHQgLSBSZXN1bHQgb2YgdGhlIHhociBjYWxsXG4gICAqL1xuICBfZ2VuZXJhdGVFcnJvcihyZXN1bHQpIHtcbiAgICByZXN1bHQuZGF0YSA9IG5ldyBMYXllckVycm9yKHJlc3VsdC5kYXRhKTtcbiAgICBpZiAoIXJlc3VsdC5kYXRhLmh0dHBTdGF0dXMpIHJlc3VsdC5kYXRhLmh0dHBTdGF0dXMgPSByZXN1bHQuc3RhdHVzO1xuICAgIHJlc3VsdC5kYXRhLmxvZygpO1xuICB9XG5cbiAgLyogRU5EIENPTU1VTklDQVRJT05TIE1FVEhPRFMgKi9cblxufVxuXG4vKipcbiAqIFN0YXRlIHZhcmlhYmxlOyBpbmRpY2F0ZXMgdGhhdCBjbGllbnQgaXMgY3VycmVudGx5IGF1dGhlbnRpY2F0ZWQgYnkgdGhlIHNlcnZlci5cbiAqIFNob3VsZCBuZXZlciBiZSB0cnVlIGlmIGlzQ29ubmVjdGVkIGlzIGZhbHNlLlxuICogQHR5cGUge0Jvb2xlYW59XG4gKi9cbkNsaWVudEF1dGhlbnRpY2F0b3IucHJvdG90eXBlLmlzQXV0aGVudGljYXRlZCA9IGZhbHNlO1xuXG4vKipcbiAqIFN0YXRlIHZhcmlhYmxlOyBpbmRpY2F0ZXMgdGhhdCBjbGllbnQgaXMgY3VycmVudGx5IGNvbm5lY3RlZCB0byBzZXJ2ZXJcbiAqIChtYXkgbm90IGJlIGF1dGhlbnRpY2F0ZWQgeWV0KVxuICogQHR5cGUge0Jvb2xlYW59XG4gKi9cbkNsaWVudEF1dGhlbnRpY2F0b3IucHJvdG90eXBlLmlzQ29ubmVjdGVkID0gZmFsc2U7XG5cbi8qKlxuICogU3RhdGUgdmFyaWFibGU7IGluZGljYXRlcyB0aGF0IGNsaWVudCBpcyByZWFkeSBmb3IgdGhlIGFwcCB0byB1c2UuXG4gKiBVc2UgdGhlICdyZWFkeScgZXZlbnQgdG8gYmUgbm90aWZpZWQgd2hlbiB0aGlzIHZhbHVlIGNoYW5nZXMgdG8gdHJ1ZS5cbiAqXG4gKiBAdHlwZSB7Ym9vbGVhbn1cbiAqL1xuQ2xpZW50QXV0aGVudGljYXRvci5wcm90b3R5cGUuaXNSZWFkeSA9IGZhbHNlO1xuXG4vKipcbiAqIFlvdXIgTGF5ZXIgQXBwbGljYXRpb24gSUQuIFRoaXMgdmFsdWUgY2FuIG5vdCBiZSBjaGFuZ2VkIG9uY2UgY29ubmVjdGVkLlxuICogVG8gZmluZCB5b3VyIExheWVyIEFwcGxpY2F0aW9uIElELCBzZWUgeW91ciBMYXllciBEZXZlbG9wZXIgRGFzaGJvYXJkLlxuICogQHR5cGUge1N0cmluZ31cbiAqL1xuQ2xpZW50QXV0aGVudGljYXRvci5wcm90b3R5cGUuYXBwSWQgPSAnJztcblxuLyoqXG4gKiBZb3UgY2FuIHVzZSB0aGlzIHRvIGZpbmQgdGhlIHVzZXJJZCB5b3UgYXJlIGxvZ2dlZCBpbiBhcy5cbiAqIFlvdSBjYW4gc2V0IHRoaXMgaW4gdGhlIGNvbnN0cnVjdG9yIHRvIHZlcmlmeSB0aGF0IHRoZSBjbGllbnRcbiAqIHdpbGwgb25seSByZXN0b3JlIGEgc2Vzc2lvbiBpZiB0aGF0IHNlc3Npb24gYmVsb25nZWQgdG8gdGhhdCBzYW1lIHVzZXJJZC5cbiAqIEB0eXBlIHtTdHJpbmd9XG4gKi9cbkNsaWVudEF1dGhlbnRpY2F0b3IucHJvdG90eXBlLnVzZXJJZCA9ICcnO1xuXG4vKipcbiAqIFlvdXIgY3VycmVudCBzZXNzaW9uIHRva2VuIHRoYXQgYXV0aGVudGljYXRlcyB5b3VyIHJlcXVlc3RzLlxuICogQHR5cGUge1N0cmluZ31cbiAqL1xuQ2xpZW50QXV0aGVudGljYXRvci5wcm90b3R5cGUuc2Vzc2lvblRva2VuID0gJyc7XG5cbi8qKlxuICogVVJMIHRvIExheWVyJ3MgV2ViIEFQSSBzZXJ2ZXIuXG4gKiBAdHlwZSB7U3RyaW5nfVxuICovXG5DbGllbnRBdXRoZW50aWNhdG9yLnByb3RvdHlwZS51cmwgPSAnaHR0cHM6Ly9hcGkubGF5ZXIuY29tJztcblxuLyoqXG4gKiBXZWIgU29ja2V0IE1hbmFnZXJcbiAqIEB0eXBlIHtsYXllci5XZWJzb2NrZXRzLlNvY2tldE1hbmFnZXJ9XG4gKi9cbkNsaWVudEF1dGhlbnRpY2F0b3IucHJvdG90eXBlLnNvY2tldE1hbmFnZXIgPSBudWxsO1xuXG4vKipcbiAqIFdlYiBTb2NrZXQgUmVxdWVzdCBNYW5hZ2VyXG4qIEB0eXBlIHtsYXllci5XZWJzb2NrZXRzLlJlcXVlc3RNYW5hZ2VyfVxuICovXG5DbGllbnRBdXRoZW50aWNhdG9yLnByb3RvdHlwZS5zb2NrZXRSZXF1ZXN0TWFuYWdlciA9IG51bGw7XG5cbi8qKlxuICogV2ViIFNvY2tldCBNYW5hZ2VyXG4gKiBAdHlwZSB7bGF5ZXIuV2Vic29ja2V0cy5DaGFuZ2VNYW5hZ2VyfVxuICovXG5DbGllbnRBdXRoZW50aWNhdG9yLnByb3RvdHlwZS5zb2NrZXRDaGFuZ2VNYW5hZ2VyID0gbnVsbDtcblxuLyoqXG4gKiBTZXJ2aWNlIGZvciBtYW5hZ2luZyBvbmxpbmUgYXMgd2VsbCBhcyBvZmZsaW5lIHNlcnZlciByZXF1ZXN0c1xuICogQHR5cGUge2xheWVyLlN5bmNNYW5hZ2VyfVxuICovXG5DbGllbnRBdXRoZW50aWNhdG9yLnByb3RvdHlwZS5zeW5jTWFuYWdlciA9IG51bGw7XG5cbi8qKlxuICogU2VydmljZSBmb3IgbWFuYWdpbmcgb25saW5lL29mZmxpbmUgc3RhdGUgYW5kIGV2ZW50c1xuICogQHR5cGUge2xheWVyLk9ubGluZVN0YXRlTWFuYWdlcn1cbiAqL1xuQ2xpZW50QXV0aGVudGljYXRvci5wcm90b3R5cGUub25saW5lTWFuYWdlciA9IG51bGw7XG5cbi8qKlxuICogSXMgdHJ1ZSBpZiB0aGUgY2xpZW50IGlzIGF1dGhlbnRpY2F0ZWQgYW5kIGNvbm5lY3RlZCB0byB0aGUgc2VydmVyO1xuICpcbiAqIFR5cGljYWxseSB1c2VkIHRvIGRldGVybWluZSBpZiB0aGVyZSBpcyBhIGNvbm5lY3Rpb24gdG8gdGhlIHNlcnZlci5cbiAqXG4gKiBUeXBpY2FsbHkgdXNlZCBpbiBjb25qdW5jdGlvbiB3aXRoIHRoZSBgb25saW5lYCBldmVudC5cbiAqXG4gKiBAdHlwZSB7Ym9vbGVhbn1cbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KENsaWVudEF1dGhlbnRpY2F0b3IucHJvdG90eXBlLCAnaXNPbmxpbmUnLCB7XG4gIGVudW1lcmFibGU6IHRydWUsXG4gIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgIHJldHVybiB0aGlzLm9ubGluZU1hbmFnZXIgJiYgdGhpcy5vbmxpbmVNYW5hZ2VyLmlzT25saW5lO1xuICB9LFxufSk7XG5cbi8qKlxuICogTG9nIGxldmVsczsgb25lIG9mOlxuICpcbiAqICAgICogbGF5ZXIuQ29uc3RhbnRzLkxPRy5OT05FXG4gKiAgICAqIGxheWVyLkNvbnN0YW50cy5MT0cuRVJST1JcbiAqICAgICogbGF5ZXIuQ29uc3RhbnRzLkxPRy5XQVJOXG4gKiAgICAqIGxheWVyLkNvbnN0YW50cy5MT0cuSU5GT1xuICogICAgKiBsYXllci5Db25zdGFudHMuTE9HLkRFQlVHXG4gKlxuICogQHR5cGUge251bWJlcn1cbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KENsaWVudEF1dGhlbnRpY2F0b3IucHJvdG90eXBlLCAnbG9nTGV2ZWwnLCB7XG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHsgcmV0dXJuIGxvZ2dlci5sZXZlbDsgfSxcbiAgc2V0OiBmdW5jdGlvbiBzZXQodmFsdWUpIHsgbG9nZ2VyLmxldmVsID0gdmFsdWU7IH0sXG59KTtcblxuLyoqXG4gKiBJZiB0aGlzIGlzIGEgdHJ1c3RlZCBkZXZpY2UsIHRoZW4gd2UgY2FuIHdyaXRlIHBlcnNvbmFsIGRhdGEgdG8gcGVyc2lzdGVudCBtZW1vcnkuXG4gKiBAdHlwZSB7Ym9vbGVhbn1cbiAqL1xuQ2xpZW50QXV0aGVudGljYXRvci5wcm90b3R5cGUuaXNUcnVzdGVkRGV2aWNlID0gZmFsc2U7XG5cbi8qKlxuICogVGltZSB0byBiZSBvZmZsaW5lIGFmdGVyIHdoaWNoIHdlIGRvbid0IGRvIGEgV2ViU29ja2V0IEV2ZW50cy5yZXBsYXksXG4gKiBidXQgaW5zdGVhZCBqdXN0IHJlZnJlc2ggYWxsIG91ciBRdWVyeSBkYXRhLiAgRGVmYXVsdHMgdG8gMzAgaG91cnMuXG4gKlxuICogQHR5cGUge251bWJlcn1cbiAqIEBzdGF0aWNcbiAqL1xuQ2xpZW50QXV0aGVudGljYXRvci5SZXNldEFmdGVyT2ZmbGluZUR1cmF0aW9uID0gMTAwMCAqIDYwICogNjAgKiAzMDtcblxuLyoqXG4gKiBMaXN0IG9mIGV2ZW50cyBzdXBwb3J0ZWQgYnkgdGhpcyBjbGFzc1xuICogQHN0YXRpY1xuICogQHByb3RlY3RlZFxuICogQHR5cGUge3N0cmluZ1tdfVxuICovXG5DbGllbnRBdXRoZW50aWNhdG9yLl9zdXBwb3J0ZWRFdmVudHMgPSBbXG4gIC8qKlxuICAgKiBUaGUgY2xpZW50IGlzIHJlYWR5IGZvciBhY3Rpb25cbiAgICpcbiAgICogICAgICBjbGllbnQub24oJ3JlYWR5JywgZnVuY3Rpb24oZXZ0KSB7XG4gICAqICAgICAgICAgIHJlbmRlck15VUkoKTtcbiAgICogICAgICB9KTtcbiAgICpcbiAgICogQGV2ZW50XG4gICAqL1xuICAncmVhZHknLFxuXG4gIC8qKlxuICAgKiBGaXJlZCB3aGVuIGNvbm5lY3RlZCB0byB0aGUgc2VydmVyLlxuICAgKiBDdXJyZW50bHkganVzdCBtZWFucyB3ZSBoYXZlIGEgbm9uY2UuXG4gICAqIE5vdCByZWNvbW1lbmRlZCBmb3IgdHlwaWNhbCBhcHBsaWNhdGlvbnMuXG4gICAqIEBldmVudCBjb25uZWN0ZWRcbiAgICovXG4gICdjb25uZWN0ZWQnLFxuXG4gIC8qKlxuICAgKiBGaXJlZCB3aGVuIHVuc3VjY2Vzc2Z1bCBpbiBvYnRhaW5pbmcgYSBub25jZVxuICAgKiBOb3QgcmVjb21tZW5kZWQgZm9yIHR5cGljYWwgYXBwbGljYXRpb25zLlxuICAgKiBAZXZlbnQgY29ubmVjdGVkLWVycm9yXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBldmVudFxuICAgKiBAcGFyYW0ge2xheWVyLkxheWVyRXJyb3J9IGV2ZW50LmVycm9yXG4gICAqL1xuICAnY29ubmVjdGVkLWVycm9yJyxcblxuICAvKipcbiAgICogV2Ugbm93IGhhdmUgYSBzZXNzaW9uIGFuZCBhbnkgcmVxdWVzdHMgd2Ugc2VuZCBhdWdodCB0byB3b3JrLlxuICAgKiBUeXBpY2FsbHkgeW91IHNob3VsZCB1c2UgdGhlIHJlYWR5IGV2ZW50IGluc3RlYWQgb2YgdGhlIGF1dGhlbnRpY2F0ZWQgZXZlbnQuXG4gICAqIEBldmVudCBhdXRoZW50aWNhdGVkXG4gICAqL1xuICAnYXV0aGVudGljYXRlZCcsXG5cbiAgLyoqXG4gICAqIEZhaWxlZCB0byBhdXRoZW50aWNhdGUgeW91ciBjbGllbnQuXG4gICAqXG4gICAqIEVpdGhlciB5b3VyIGlkZW50aXR5LXRva2VuIHdhcyBpbnZhbGlkLCBvciBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgKiB1c2luZyB5b3VyIGlkZW50aXR5LXRva2VuLlxuICAgKlxuICAgKiBAZXZlbnQgYXV0aGVudGljYXRlZC1lcnJvclxuICAgKiBAcGFyYW0ge09iamVjdH0gZXZlbnRcbiAgICogQHBhcmFtIHtsYXllci5MYXllckVycm9yfSBldmVudC5lcnJvclxuICAgKi9cbiAgJ2F1dGhlbnRpY2F0ZWQtZXJyb3InLFxuXG4gIC8qKlxuICAgKiBUaGlzIGV2ZW50IGZpcmVzIHdoZW4gYSBzZXNzaW9uIGhhcyBleHBpcmVkIG9yIHdoZW4gYGxheWVyLkNsaWVudC5sb2dvdXRgIGlzIGNhbGxlZC5cbiAgICogVHlwaWNhbGx5LCBpdCBpcyBlbm91Z2ggdG8gc3Vic2NyaWJlIHRvIHRoZSBjaGFsbGVuZ2UgZXZlbnRcbiAgICogd2hpY2ggd2lsbCBsZXQgeW91IHJlYXV0aGVudGljYXRlOyB0eXBpY2FsIGFwcGxpY2F0aW9ucyBkbyBub3QgbmVlZFxuICAgKiB0byBzdWJzY3JpYmUgdG8gdGhpcy5cbiAgICpcbiAgICogQGV2ZW50IGRlYXV0aGVudGljYXRlZFxuICAgKi9cbiAgJ2RlYXV0aGVudGljYXRlZCcsXG5cbiAgLyoqXG4gICAqIEBldmVudCBjaGFsbGVuZ2VcbiAgICogVmVyaWZ5IHRoZSB1c2VyJ3MgaWRlbnRpdHkuXG4gICAqXG4gICAqIFRoaXMgZXZlbnQgaXMgd2hlcmUgeW91IHZlcmlmeSB0aGF0IHRoZSB1c2VyIGlzIHdobyB3ZSBhbGwgdGhpbmsgdGhlIHVzZXIgaXMsXG4gICAqIGFuZCBwcm92aWRlIGFuIGlkZW50aXR5IHRva2VuIHRvIHZhbGlkYXRlIHRoYXQuXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBldmVudFxuICAgKiBAcGFyYW0ge3N0cmluZ30gZXZlbnQubm9uY2UgLSBBIG5vbmNlIGZvciB5b3UgdG8gcHJvdmlkZSB0byB5b3VyIGlkZW50aXR5IHByb3ZpZGVyXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGV2ZW50LmNhbGxiYWNrIC0gQ2FsbCB0aGlzIG9uY2UgeW91IGhhdmUgYW4gaWRlbnRpdHktdG9rZW5cbiAgICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50LmNhbGxiYWNrLmlkZW50aXR5VG9rZW4gLSBJZGVudGl0eSB0b2tlbiBwcm92aWRlZCBieSB5b3VyIGlkZW50aXR5IHByb3ZpZGVyIHNlcnZpY2VcbiAgICovXG4gICdjaGFsbGVuZ2UnLFxuXG4gIC8qKlxuICAgKiBAZXZlbnQgc2Vzc2lvbi10ZXJtaW5hdGVkXG4gICAqIElmIHlvdXIgc2Vzc2lvbiBoYXMgYmVlbiB0ZXJtaW5hdGVkIGluIHN1Y2ggYSB3YXkgYXMgdG8gcHJldmVudCBhdXRvbWF0aWMgcmVjb25uZWN0LFxuICAgKlxuICAgKiB0aGlzIGV2ZW50IHdpbGwgZmlyZS4gIENvbW1vbiBzY2VuYXJpbzogdXNlciBoYXMgdHdvIHRhYnMgb3BlbjtcbiAgICogb25lIHRhYiB0aGUgdXNlciBsb2dzIG91dCAob3IgeW91IGNhbGwgY2xpZW50LmxvZ291dCgpKS5cbiAgICogVGhlIG90aGVyIHRhYiB3aWxsIGRldGVjdCB0aGF0IHRoZSBzZXNzaW9uVG9rZW4gaGFzIGJlZW4gcmVtb3ZlZCxcbiAgICogYW5kIHdpbGwgdGVybWluYXRlIGl0cyBzZXNzaW9uIGFzIHdlbGwuICBJbiB0aGlzIHNjZW5hcmlvIHdlIGRvIG5vdCB3YW50XG4gICAqIHRvIGF1dG9tYXRpY2FsbHkgdHJpZ2dlciBhIGNoYWxsZW5nZSBhbmQgcmVzdGFydCB0aGUgbG9naW4gcHJvY2Vzcy5cbiAgICovXG4gICdzZXNzaW9uLXRlcm1pbmF0ZWQnLFxuXG4gIC8qKlxuICAgKiBAZXZlbnQgb25saW5lXG4gICAqXG4gICAqIFRoaXMgZXZlbnQgaXMgdXNlZCB0byBkZXRlY3Qgd2hlbiB0aGUgY2xpZW50IGlzIG9ubGluZSAoY29ubmVjdGVkIHRvIHRoZSBzZXJ2ZXIpXG4gICAqIG9yIG9mZmxpbmUgKHN0aWxsIGFibGUgdG8gYWNjZXB0IEFQSSBjYWxscyBidXQgbm8gbG9uZ2VyIGFibGUgdG8gc3luYyB0byB0aGUgc2VydmVyKS5cbiAgICpcbiAgICogICAgICBjbGllbnQub24oJ29ubGluZScsIGZ1bmN0aW9uKGV2dCkge1xuICAgKiAgICAgICAgIGlmIChldnQuaXNPbmxpbmUpIHtcbiAgICogICAgICAgICAgICAgc3RhdHVzRGl2LnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICdncmVlbic7XG4gICAqICAgICAgICAgfSBlbHNlIHtcbiAgICogICAgICAgICAgICAgc3RhdHVzRGl2LnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICdyZWQnO1xuICAgKiAgICAgICAgIH1cbiAgICogICAgICB9KTtcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IGV2ZW50XG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gZXZlbnQuaXNPbmxpbmVcbiAgICovXG4gICdvbmxpbmUnLFxuXS5jb25jYXQoUm9vdC5fc3VwcG9ydGVkRXZlbnRzKTtcblxuUm9vdC5pbml0Q2xhc3MuYXBwbHkoQ2xpZW50QXV0aGVudGljYXRvciwgW0NsaWVudEF1dGhlbnRpY2F0b3IsICdDbGllbnRBdXRoZW50aWNhdG9yJ10pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENsaWVudEF1dGhlbnRpY2F0b3I7XG4iXX0=
