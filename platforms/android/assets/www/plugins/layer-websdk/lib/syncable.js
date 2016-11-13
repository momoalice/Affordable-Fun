'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

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

var Root = require('./root');
var Constants = require('./const');

var Syncable = function (_Root) {
  _inherits(Syncable, _Root);

  function Syncable() {
    _classCallCheck(this, Syncable);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(Syncable).apply(this, arguments));
  }

  _createClass(Syncable, [{
    key: '_setSyncing',


    /**
     * Object is queued for syncing with the server.
     *
     * That means it is currently out of sync with the server.
     *
     * @method _setSyncing
     * @private
     */
    value: function _setSyncing() {
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

  }, {
    key: '_setSynced',
    value: function _setSynced() {
      this._clearObject();
      if (this._syncCounter > 0) this._syncCounter--;

      this.syncState = this._syncCounter === 0 ? Constants.SYNC_STATE.SYNCED : Constants.SYNC_STATE.SYNCING;
      this.isSending = false;
    }

    /**
     * Any time the instance changes, we should clear the cached toObject value
     *
     * @method _clearObject
     * @private
     */

  }, {
    key: '_clearObject',
    value: function _clearObject() {
      this._toObject = null;
    }

    /**
     * Object is new, and is not yet queued for syncing
     *
     * @method isNew
     * @returns {boolean}
     */

  }, {
    key: 'isNew',
    value: function isNew() {
      return this.syncState === Constants.SYNC_STATE.NEW;
    }

    /**
     * Object is new, and is queued for syncing
     *
     * @method isSaving
     * @returns {boolean}
     */

  }, {
    key: 'isSaving',
    value: function isSaving() {
      return this.syncState === Constants.SYNC_STATE.SAVING;
    }

    /**
     * Object does not yet exist on server.
     *
     * @method isSaved
     * @returns {boolean}
     */

  }, {
    key: 'isSaved',
    value: function isSaved() {
      return !(this.isNew() || this.isSaving());
    }
  }, {
    key: 'isSynced',
    value: function isSynced() {
      return this.syncState === Constants.SYNC_STATE.SYNCED;
    }
  }]);

  return Syncable;
}(Root);

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
  }
});

Syncable._supportedEvents = [].concat(Root._supportedEvents);
Syncable.inObjectIgnore = Root.inObjectIgnore;
module.exports = Syncable;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9zeW5jYWJsZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFvQkEsSUFBTSxPQUFPLFFBQVEsUUFBUixDQUFQO0FBQ04sSUFBTSxZQUFZLFFBQVEsU0FBUixDQUFaOztJQUVBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7a0NBVVU7QUFDWixXQUFLLFlBQUwsR0FEWTtBQUVaLGNBQVEsS0FBSyxTQUFMO0FBQ04sYUFBSyxVQUFVLFVBQVYsQ0FBcUIsTUFBckI7QUFDSCxlQUFLLFNBQUwsR0FBaUIsVUFBVSxVQUFWLENBQXFCLE9BQXJCLENBRG5CO0FBRUUsZ0JBRkY7QUFERixhQUlPLFVBQVUsVUFBVixDQUFxQixHQUFyQjtBQUNILGVBQUssU0FBTCxHQUFpQixVQUFVLFVBQVYsQ0FBcUIsTUFBckIsQ0FEbkI7QUFFRSxnQkFGRjtBQUpGLE9BRlk7QUFVWixXQUFLLFlBQUwsR0FWWTs7Ozs7Ozs7Ozs7O2lDQW1CRDtBQUNYLFdBQUssWUFBTCxHQURXO0FBRVgsVUFBSSxLQUFLLFlBQUwsR0FBb0IsQ0FBcEIsRUFBdUIsS0FBSyxZQUFMLEdBQTNCOztBQUVBLFdBQUssU0FBTCxHQUFpQixLQUFLLFlBQUwsS0FBc0IsQ0FBdEIsR0FBMEIsVUFBVSxVQUFWLENBQXFCLE1BQXJCLEdBQ3JCLFVBQVUsVUFBVixDQUFxQixPQUFyQixDQUxYO0FBTVgsV0FBSyxTQUFMLEdBQWlCLEtBQWpCLENBTlc7Ozs7Ozs7Ozs7OzttQ0FlRTtBQUNiLFdBQUssU0FBTCxHQUFpQixJQUFqQixDQURhOzs7Ozs7Ozs7Ozs7NEJBVVA7QUFDTixhQUFPLEtBQUssU0FBTCxLQUFtQixVQUFVLFVBQVYsQ0FBcUIsR0FBckIsQ0FEcEI7Ozs7Ozs7Ozs7OzsrQkFVRztBQUNULGFBQU8sS0FBSyxTQUFMLEtBQW1CLFVBQVUsVUFBVixDQUFxQixNQUFyQixDQURqQjs7Ozs7Ozs7Ozs7OzhCQVVEO0FBQ1IsYUFBTyxFQUFFLEtBQUssS0FBTCxNQUFnQixLQUFLLFFBQUwsRUFBaEIsQ0FBRixDQURDOzs7OytCQUlDO0FBQ1QsYUFBTyxLQUFLLFNBQUwsS0FBbUIsVUFBVSxVQUFWLENBQXFCLE1BQXJCLENBRGpCOzs7O1NBOUVQO0VBQWlCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFxR3ZCLFNBQVMsU0FBVCxDQUFtQixTQUFuQixHQUErQixVQUFVLFVBQVYsQ0FBcUIsR0FBckI7Ozs7Ozs7Ozs7O0FBVy9CLFNBQVMsU0FBVCxDQUFtQixZQUFuQixHQUFrQyxDQUFsQzs7Ozs7OztBQU9BLE9BQU8sY0FBUCxDQUFzQixTQUFTLFNBQVQsRUFBb0IsV0FBMUMsRUFBdUQ7QUFDckQsY0FBWSxJQUFaO0FBQ0EsT0FBSyxTQUFTLEdBQVQsR0FBZTtBQUNsQixXQUFPLEtBQUssU0FBTCxLQUFtQixVQUFVLFVBQVYsQ0FBcUIsT0FBckIsQ0FEUjtHQUFmO0NBRlA7O0FBT0EsU0FBUyxnQkFBVCxHQUE0QixHQUFHLE1BQUgsQ0FBVSxLQUFLLGdCQUFMLENBQXRDO0FBQ0EsU0FBUyxjQUFULEdBQTBCLEtBQUssY0FBTDtBQUMxQixPQUFPLE9BQVAsR0FBaUIsUUFBakIiLCJmaWxlIjoic3luY2FibGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFRoZSBTeW5jYWJsZSBhYnN0cmFjdCBjbGFzIHJlcHJlc2VudHMgcmVzb3VyY2VzIHRoYXQgYXJlIHN5bmNhYmxlIHdpdGggdGhlIHNlcnZlci5cbiAqIFRoaXMgaXMgY3VycmVudGx5IHVzZWQgZm9yIE1lc3NhZ2VzIGFuZCBDb252ZXJzYXRpb25zLlxuICogSXQgcmVwcmVzZW50cyB0aGUgc3RhdGUgb2YgdGhlIG9iamVjdCdzIHN5bmMsIGFzIG9uZSBvZjpcbiAqXG4gKiAgKiBsYXllci5Db25zdGFudHMuU1lOQ19TVEFURS5ORVc6IE5ld2x5IGNyZWF0ZWQ7IGxvY2FsIG9ubHkuXG4gKiAgKiBsYXllci5Db25zdGFudHMuU1lOQ19TVEFURS5TQVZJTkc6IE5ld2x5IGNyZWF0ZWQ7IGJlaW5nIHNlbnQgdG8gdGhlIHNlcnZlclxuICogICogbGF5ZXIuQ29uc3RhbnRzLlNZTkNfU1RBVEUuU1lOQ0lORzogRXhpc3RzIG9uIGJvdGggY2xpZW50IGFuZCBzZXJ2ZXIsIGJ1dCBjaGFuZ2VzIGFyZSBiZWluZyBzZW50IHRvIHNlcnZlci5cbiAqICAqIGxheWVyLkNvbnN0YW50cy5TWU5DX1NUQVRFLlNZTkNFRDogRXhpc3RzIG9uIGJvdGggY2xpZW50IGFuZCBzZXJ2ZXIgYW5kIGlzIHN5bmNlZC5cbiAqICAqIGxheWVyLkNvbnN0YW50cy5TWU5DX1NUQVRFLkxPQURJTkc6IEV4aXN0cyBvbiBzZXJ2ZXI7IGxvYWRpbmcgaXQgaW50byBjbGllbnQuXG4gKlxuICogTk9URTogVGhlcmUgaXMgYSBzcGVjaWFsIGNhc2UgZm9yIE1lc3NhZ2VzIHdoZXJlIGlzU2VuZGluZyBpcyB0cnVlIGFuZCBzeW5jU3RhdGUgIT09IGxheWVyLkNvbnN0YW50cy5TWU5DX1NUQVRFLlNBVklORyxcbiAqIHdoaWNoIG9jY3VycyBhZnRlciBgc2VuZCgpYCBoYXMgYmVlbiBjYWxsZWQsIGJ1dCB3aGlsZSB3YWl0aW5nIGZvciBSaWNoIENvbnRlbnQgdG8gdXBsb2FkIHByaW9yIHRvIGFjdHVhbGx5XG4gKiBzZW5kaW5nIHRoaXMgdG8gdGhlIHNlcnZlci5cbiAqXG4gKiBAY2xhc3MgbGF5ZXIuU3luY2FibGVcbiAqIEBleHRlbmRzIGxheWVyLlJvb3RcbiAqIEBhYnN0cmFjdFxuICovXG5cbmNvbnN0IFJvb3QgPSByZXF1aXJlKCcuL3Jvb3QnKTtcbmNvbnN0IENvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3QnKTtcblxuY2xhc3MgU3luY2FibGUgZXh0ZW5kcyBSb290IHtcblxuICAvKipcbiAgICogT2JqZWN0IGlzIHF1ZXVlZCBmb3Igc3luY2luZyB3aXRoIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqIFRoYXQgbWVhbnMgaXQgaXMgY3VycmVudGx5IG91dCBvZiBzeW5jIHdpdGggdGhlIHNlcnZlci5cbiAgICpcbiAgICogQG1ldGhvZCBfc2V0U3luY2luZ1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3NldFN5bmNpbmcoKSB7XG4gICAgdGhpcy5fY2xlYXJPYmplY3QoKTtcbiAgICBzd2l0Y2ggKHRoaXMuc3luY1N0YXRlKSB7XG4gICAgICBjYXNlIENvbnN0YW50cy5TWU5DX1NUQVRFLlNZTkNFRDpcbiAgICAgICAgdGhpcy5zeW5jU3RhdGUgPSBDb25zdGFudHMuU1lOQ19TVEFURS5TWU5DSU5HO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQ29uc3RhbnRzLlNZTkNfU1RBVEUuTkVXOlxuICAgICAgICB0aGlzLnN5bmNTdGF0ZSA9IENvbnN0YW50cy5TWU5DX1NUQVRFLlNBVklORztcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHRoaXMuX3N5bmNDb3VudGVyKys7XG4gIH1cblxuICAvKipcbiAgICogT2JqZWN0IGlzIHN5bmNlZCB3aXRoIHRoZSBzZXJ2ZXIgYW5kIHVwIHRvIGRhdGUuXG4gICAqXG4gICAqIEBtZXRob2QgX3NldFN5bmNlZFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3NldFN5bmNlZCgpIHtcbiAgICB0aGlzLl9jbGVhck9iamVjdCgpO1xuICAgIGlmICh0aGlzLl9zeW5jQ291bnRlciA+IDApIHRoaXMuX3N5bmNDb3VudGVyLS07XG5cbiAgICB0aGlzLnN5bmNTdGF0ZSA9IHRoaXMuX3N5bmNDb3VudGVyID09PSAwID8gQ29uc3RhbnRzLlNZTkNfU1RBVEUuU1lOQ0VEIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgQ29uc3RhbnRzLlNZTkNfU1RBVEUuU1lOQ0lORztcbiAgICB0aGlzLmlzU2VuZGluZyA9IGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIEFueSB0aW1lIHRoZSBpbnN0YW5jZSBjaGFuZ2VzLCB3ZSBzaG91bGQgY2xlYXIgdGhlIGNhY2hlZCB0b09iamVjdCB2YWx1ZVxuICAgKlxuICAgKiBAbWV0aG9kIF9jbGVhck9iamVjdFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2NsZWFyT2JqZWN0KCkge1xuICAgIHRoaXMuX3RvT2JqZWN0ID0gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBPYmplY3QgaXMgbmV3LCBhbmQgaXMgbm90IHlldCBxdWV1ZWQgZm9yIHN5bmNpbmdcbiAgICpcbiAgICogQG1ldGhvZCBpc05ld1xuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIGlzTmV3KCkge1xuICAgIHJldHVybiB0aGlzLnN5bmNTdGF0ZSA9PT0gQ29uc3RhbnRzLlNZTkNfU1RBVEUuTkVXO1xuICB9XG5cbiAgLyoqXG4gICAqIE9iamVjdCBpcyBuZXcsIGFuZCBpcyBxdWV1ZWQgZm9yIHN5bmNpbmdcbiAgICpcbiAgICogQG1ldGhvZCBpc1NhdmluZ1xuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIGlzU2F2aW5nKCkge1xuICAgIHJldHVybiB0aGlzLnN5bmNTdGF0ZSA9PT0gQ29uc3RhbnRzLlNZTkNfU1RBVEUuU0FWSU5HO1xuICB9XG5cbiAgLyoqXG4gICAqIE9iamVjdCBkb2VzIG5vdCB5ZXQgZXhpc3Qgb24gc2VydmVyLlxuICAgKlxuICAgKiBAbWV0aG9kIGlzU2F2ZWRcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBpc1NhdmVkKCkge1xuICAgIHJldHVybiAhKHRoaXMuaXNOZXcoKSB8fCB0aGlzLmlzU2F2aW5nKCkpO1xuICB9XG5cbiAgaXNTeW5jZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3luY1N0YXRlID09PSBDb25zdGFudHMuU1lOQ19TVEFURS5TWU5DRUQ7XG4gIH1cbn1cblxuXG4vKipcbiAqIFRoZSBjdXJyZW50IHN5bmMgc3RhdGUgb2YgdGhpcyBvYmplY3QuXG4gKlxuICogUG9zc2libGUgdmFsdWVzIGFyZTpcbiAqXG4gKiAgKiBsYXllci5Db25zdGFudHMuU1lOQ19TVEFURS5ORVc6IE5ld2x5IGNyZWF0ZWQ7IGxvY2FsIG9ubHkuXG4gKiAgKiBsYXllci5Db25zdGFudHMuU1lOQ19TVEFURS5TQVZJTkc6IE5ld2x5IGNyZWF0ZWQ7IGJlaW5nIHNlbnQgdG8gdGhlIHNlcnZlclxuICogICogbGF5ZXIuQ29uc3RhbnRzLlNZTkNfU1RBVEUuU1lOQ0lORzogRXhpc3RzIG9uIGJvdGggY2xpZW50IGFuZCBzZXJ2ZXIsIGJ1dCBjaGFuZ2VzIGFyZSBiZWluZyBzZW50IHRvIHNlcnZlci5cbiAqICAqIGxheWVyLkNvbnN0YW50cy5TWU5DX1NUQVRFLlNZTkNFRDogRXhpc3RzIG9uIGJvdGggY2xpZW50IGFuZCBzZXJ2ZXIgYW5kIGlzIHN5bmNlZC5cbiAqICAqIGxheWVyLkNvbnN0YW50cy5TWU5DX1NUQVRFLkxPQURJTkc6IEV4aXN0cyBvbiBzZXJ2ZXI7IGxvYWRpbmcgaXQgaW50byBjbGllbnQuXG4gKlxuICogTk9URTogVGhlcmUgaXMgYSBzcGVjaWFsIGNhc2UgZm9yIE1lc3NhZ2VzIHdoZXJlIGlzU2VuZGluZyBpcyB0cnVlIGFuZCBzeW5jU3RhdGUgIT09IGxheWVyLkNvbnN0YW50cy5TWU5DX1NUQVRFLlNBVklORyxcbiAqIHdoaWNoIG9jY3VycyBhZnRlciBgc2VuZCgpYCBoYXMgYmVlbiBjYWxsZWQsIGJ1dCB3aGlsZSB3YWl0aW5nIGZvciBSaWNoIENvbnRlbnQgdG8gdXBsb2FkIHByaW9yIHRvIGFjdHVhbGx5XG4gKiBzZW5kaW5nIHRoaXMgdG8gdGhlIHNlcnZlci5cbiAqXG4gKiBAdHlwZSB7c3RyaW5nfVxuICovXG5TeW5jYWJsZS5wcm90b3R5cGUuc3luY1N0YXRlID0gQ29uc3RhbnRzLlNZTkNfU1RBVEUuTkVXO1xuXG4vKipcbiAqIE51bWJlciBvZiBzeW5jIHJlcXVlc3RzIHRoYXQgaGF2ZSBiZWVuIHJlcXVlc3RlZC5cbiAqXG4gKiBDb3VudHMgZG93biB0byB6ZXJvOyBvbmNlIGl0IHJlYWNoZXMgemVybywgYWxsIHN5bmNcbiAqIHJlcXVlc3RzIGhhdmUgYmVlbiBjb21wbGV0ZWQuXG4gKlxuICogQHR5cGUge051bWJlcn1cbiAqIEBwcml2YXRlXG4gKi9cblN5bmNhYmxlLnByb3RvdHlwZS5fc3luY0NvdW50ZXIgPSAwO1xuXG4vKipcbiAqIElzIHRoZSBvYmplY3QgbG9hZGluZyBmcm9tIHRoZSBzZXJ2ZXI/XG4gKlxuICogQHR5cGUge2Jvb2xlYW59XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTeW5jYWJsZS5wcm90b3R5cGUsICdpc0xvYWRpbmcnLCB7XG4gIGVudW1lcmFibGU6IHRydWUsXG4gIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgIHJldHVybiB0aGlzLnN5bmNTdGF0ZSA9PT0gQ29uc3RhbnRzLlNZTkNfU1RBVEUuTE9BRElORztcbiAgfSxcbn0pO1xuXG5TeW5jYWJsZS5fc3VwcG9ydGVkRXZlbnRzID0gW10uY29uY2F0KFJvb3QuX3N1cHBvcnRlZEV2ZW50cyk7XG5TeW5jYWJsZS5pbk9iamVjdElnbm9yZSA9IFJvb3QuaW5PYmplY3RJZ25vcmU7XG5tb2R1bGUuZXhwb3J0cyA9IFN5bmNhYmxlO1xuIl19
