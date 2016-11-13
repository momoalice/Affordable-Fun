/**
 * The Syncable abstract clas represents resources that are syncable with the server.
 * This is currently used for Messages and Conversations.
 * It represents the state of the object's sync, as one of:
 *
 *  * layer.Constants.SYNC_STATE.NEW: Newly created; local only.
 *  * layer.Constants.SYNC_STATE.SAVING: Newly created; being sent to the server
 *  * layer.Constants.SYNC_STATE.SYNCING: Exists on both client and server, but changes are being sent to server.
 *  * layer.Constants.SYNC_STATE.SYNCED: Exists on both client and server and is synced.
 *  * layer.Constants.SYNC_STATE.LOADING: Exists on server; loading it into client.
 *
 * NOTE: There is a special case for Messages where isSending is true and syncState !== layer.Constants.SYNC_STATE.SAVING,
 * which occurs after `send()` has been called, but while waiting for Rich Content to upload prior to actually
 * sending this to the server.
 *
 * @class layer.Syncable
 * @extends layer.Root
 * @abstract
 */

const Root = require('./root');
const Constants = require('./const');

class Syncable extends Root {

  /**
   * Object is queued for syncing with the server.
   *
   * That means it is currently out of sync with the server.
   *
   * @method _setSyncing
   * @private
   */
  _setSyncing() {
    this._clearObject();
    switch (this.syncState) {
      case Constants.SYNC_STATE.SYNCED:
        this.syncState = Constants.SYNC_STATE.SYNCING;
        break;
      case Constants.SYNC_STATE.NEW:
        this.syncState = Constants.SYNC_STATE.SAVING;
        break;
    }
    this._syncCounter++;
  }

  /**
   * Object is synced with the server and up to date.
   *
   * @method _setSynced
   * @private
   */
  _setSynced() {
    this._clearObject();
    if (this._syncCounter > 0) this._syncCounter--;

    this.syncState = this._syncCounter === 0 ? Constants.SYNC_STATE.SYNCED :
                          Constants.SYNC_STATE.SYNCING;
    this.isSending = false;
  }

  /**
   * Any time the instance changes, we should clear the cached toObject value
   *
   * @method _clearObject
   * @private
   */
  _clearObject() {
    this._toObject = null;
  }

  /**
   * Object is new, and is not yet queued for syncing
   *
   * @method isNew
   * @returns {boolean}
   */
  isNew() {
    return this.syncState === Constants.SYNC_STATE.NEW;
  }

  /**
   * Object is new, and is queued for syncing
   *
   * @method isSaving
   * @returns {boolean}
   */
  isSaving() {
    return this.syncState === Constants.SYNC_STATE.SAVING;
  }

  /**
   * Object does not yet exist on server.
   *
   * @method isSaved
   * @returns {boolean}
   */
  isSaved() {
    return !(this.isNew() || this.isSaving());
  }

  isSynced() {
    return this.syncState === Constants.SYNC_STATE.SYNCED;
  }
}


/**
 * The current sync state of this object.
 *
 * Possible values are:
 *
 *  * layer.Constants.SYNC_STATE.NEW: Newly created; local only.
 *  * layer.Constants.SYNC_STATE.SAVING: Newly created; being sent to the server
 *  * layer.Constants.SYNC_STATE.SYNCING: Exists on both client and server, but changes are being sent to server.
 *  * layer.Constants.SYNC_STATE.SYNCED: Exists on both client and server and is synced.
 *  * layer.Constants.SYNC_STATE.LOADING: Exists on server; loading it into client.
 *
 * NOTE: There is a special case for Messages where isSending is true and syncState !== layer.Constants.SYNC_STATE.SAVING,
 * which occurs after `send()` has been called, but while waiting for Rich Content to upload prior to actually
 * sending this to the server.
 *
 * @type {string}
 */
Syncable.prototype.syncState = Constants.SYNC_STATE.NEW;

/**
 * Number of sync requests that have been requested.
 *
 * Counts down to zero; once it reaches zero, all sync
 * requests have been completed.
 *
 * @type {Number}
 * @private
 */
Syncable.prototype._syncCounter = 0;

/**
 * Is the object loading from the server?
 *
 * @type {boolean}
 */
Object.defineProperty(Syncable.prototype, 'isLoading', {
  enumerable: true,
  get: function get() {
    return this.syncState === Constants.SYNC_STATE.LOADING;
  },
});

Syncable._supportedEvents = [].concat(Root._supportedEvents);
Syncable.inObjectIgnore = Root.inObjectIgnore;
module.exports = Syncable;
