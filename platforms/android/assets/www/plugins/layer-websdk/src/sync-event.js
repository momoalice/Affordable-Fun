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
class SyncEvent  {
  /**
   * Create a layer.SyncEvent.  See layer.ClientAuthenticator for examples of usage.
   *
   * @method  constructor
   * @private
   * @return {layer.SyncEvent}
   */
  constructor(options) {
    let key;
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
  destroy() {
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
  _updateData() {
    if (typeof this.data === 'function') {
      this.data = this.data();
    }
  }

  /**
   * Returns a POJO version of this object suitable for serializing for the network
   * @method toObject
   * @returns {Object}
   */
  toObject() {
    return { data: this.data };
  }
}


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
  },
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
class XHRSyncEvent extends SyncEvent {

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
  _getRequestData() {
    this._updateUrl();
    this._updateData();
    return {
      url: this.url,
      method: this.method,
      headers: this.headers,
      data: this.data,
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
  _updateUrl() {
    if (typeof this.url === 'function') {
      this.url = this.url();
    }
  }

  toObject() {
    return {
      data: this.data,
      url: this.url,
      method: this.method,
    };
  }
}

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
class WebsocketSyncEvent extends SyncEvent {

  /**
   * Get the websocket request object.
   *
   * @method _getRequestData
   * @private
   * @return {Object}
   */
  _getRequestData() {
    this._updateData();
    return this.data;
  }

  toObject() {
    return this.data;
  }
}

module.exports = { SyncEvent, XHRSyncEvent, WebsocketSyncEvent };
