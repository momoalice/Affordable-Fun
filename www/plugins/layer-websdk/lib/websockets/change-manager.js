'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @class  layer.Websockets.ChangeManager
 * @private
 *
 * This class listens for `change` events from the websocket server,
 * and processes them.
 */
var Utils = require('../client-utils');
var logger = require('../logger');
var Message = require('../message');
var Conversation = require('../conversation');

var WebsocketChangeManager = function () {
  /**
   * Create a new websocket change manager
   *
   *      var websocketChangeManager = new layer.Websockets.ChangeManager({
   *          client: client,
   *          socketManager: client.Websockets.SocketManager
   *      });
   *
   * @method
   * @param  {Object} options
   * @param {layer.Client} client
   * @param {layer.Websockets.SocketManager} socketManager
   * @returns {layer.Websockets.ChangeManager}
   */

  function WebsocketChangeManager(options) {
    _classCallCheck(this, WebsocketChangeManager);

    this.client = options.client;
    options.socketManager.on('message', this._handleChange, this);
  }

  /**
   * Handles a Change packet from the server.
   *
   * @method _handleChange
   * @private
   * @param  {layer.LayerEvent} evt
   */


  _createClass(WebsocketChangeManager, [{
    key: '_handleChange',
    value: function _handleChange(evt) {
      if (evt.data.type === 'change') {
        var msg = evt.data.body;
        switch (msg.operation) {
          case 'create':
            logger.info('Websocket Change Event: Create ' + msg.object.type + ' ' + msg.object.id);
            logger.debug(msg.data);
            this._handleCreate(msg);
            break;
          case 'delete':
            logger.info('Websocket Change Event: Delete ' + msg.object.type + ' ' + msg.object.id);
            logger.debug(msg.data);
            this._handleDelete(msg);
            break;
          case 'patch':
            logger.info('Websocket Change Event: Patch ' + msg.object.type + ' ' + msg.object.id + ': ' + msg.data.map(function (op) {
              return op.property;
            }).join(', '));
            logger.debug(msg.data);
            this._handlePatch(msg);
            break;
        }
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
     * Get the object specified by the `object` property of the websocket packet.
     *
     * @method _getObject
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
     * Not required, but destroy is best practice
     * @method destroy
     */

  }, {
    key: 'destroy',
    value: function destroy() {
      this.client = null;
    }
  }]);

  return WebsocketChangeManager;
}();

/**
 * The Client that owns this.
 * @type {layer.Client}
 */


WebsocketChangeManager.prototype.client = null;

module.exports = WebsocketChangeManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy93ZWJzb2NrZXRzL2NoYW5nZS1tYW5hZ2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7QUFPQSxJQUFNLFFBQVEsUUFBUSxpQkFBUixDQUFSO0FBQ04sSUFBTSxTQUFTLFFBQVEsV0FBUixDQUFUO0FBQ04sSUFBTSxVQUFVLFFBQVEsWUFBUixDQUFWO0FBQ04sSUFBTSxlQUFlLFFBQVEsaUJBQVIsQ0FBZjs7SUFHQTs7Ozs7Ozs7Ozs7Ozs7OztBQWVKLFdBZkksc0JBZUosQ0FBWSxPQUFaLEVBQXFCOzBCQWZqQix3QkFlaUI7O0FBQ25CLFNBQUssTUFBTCxHQUFjLFFBQVEsTUFBUixDQURLO0FBRW5CLFlBQVEsYUFBUixDQUFzQixFQUF0QixDQUF5QixTQUF6QixFQUFvQyxLQUFLLGFBQUwsRUFBb0IsSUFBeEQsRUFGbUI7R0FBckI7Ozs7Ozs7Ozs7O2VBZkk7O2tDQTJCVSxLQUFLO0FBQ2pCLFVBQUksSUFBSSxJQUFKLENBQVMsSUFBVCxLQUFrQixRQUFsQixFQUE0QjtBQUM5QixZQUFNLE1BQU0sSUFBSSxJQUFKLENBQVMsSUFBVCxDQURrQjtBQUU5QixnQkFBUSxJQUFJLFNBQUo7QUFDTixlQUFLLFFBQUw7QUFDRSxtQkFBTyxJQUFQLHFDQUE4QyxJQUFJLE1BQUosQ0FBVyxJQUFYLFNBQW1CLElBQUksTUFBSixDQUFXLEVBQVgsQ0FBakUsQ0FERjtBQUVFLG1CQUFPLEtBQVAsQ0FBYSxJQUFJLElBQUosQ0FBYixDQUZGO0FBR0UsaUJBQUssYUFBTCxDQUFtQixHQUFuQixFQUhGO0FBSUUsa0JBSkY7QUFERixlQU1PLFFBQUw7QUFDRSxtQkFBTyxJQUFQLHFDQUE4QyxJQUFJLE1BQUosQ0FBVyxJQUFYLFNBQW1CLElBQUksTUFBSixDQUFXLEVBQVgsQ0FBakUsQ0FERjtBQUVFLG1CQUFPLEtBQVAsQ0FBYSxJQUFJLElBQUosQ0FBYixDQUZGO0FBR0UsaUJBQUssYUFBTCxDQUFtQixHQUFuQixFQUhGO0FBSUUsa0JBSkY7QUFORixlQVdPLE9BQUw7QUFDRSxtQkFBTyxJQUFQLG9DQUE2QyxJQUFJLE1BQUosQ0FBVyxJQUFYLFNBQW1CLElBQUksTUFBSixDQUFXLEVBQVgsVUFBa0IsSUFBSSxJQUFKLENBQVMsR0FBVCxDQUFhO3FCQUFNLEdBQUcsUUFBSDthQUFOLENBQWIsQ0FBZ0MsSUFBaEMsQ0FBcUMsSUFBckMsQ0FBbEYsRUFERjtBQUVFLG1CQUFPLEtBQVAsQ0FBYSxJQUFJLElBQUosQ0FBYixDQUZGO0FBR0UsaUJBQUssWUFBTCxDQUFrQixHQUFsQixFQUhGO0FBSUUsa0JBSkY7QUFYRixTQUY4QjtPQUFoQzs7Ozs7Ozs7Ozs7OztrQ0E2QlksS0FBSztBQUNqQixVQUFJLElBQUosQ0FBUyxhQUFULEdBQXlCLElBQXpCLENBRGlCO0FBRWpCLFdBQUssTUFBTCxDQUFZLGFBQVosQ0FBMEIsSUFBSSxJQUFKLENBQTFCLENBRmlCOzs7Ozs7Ozs7Ozs7Ozs7a0NBY0wsS0FBSztBQUNqQixVQUFNLFNBQVMsS0FBSyxVQUFMLENBQWdCLEdBQWhCLENBQVQsQ0FEVztBQUVqQixVQUFJLE1BQUosRUFBWTtBQUNWLGVBQU8sUUFBUCxHQURVO0FBRVYsZUFBTyxPQUFQLEdBRlU7T0FBWjs7Ozs7Ozs7Ozs7Ozs7aUNBY1csS0FBSzs7QUFFaEIsVUFBTSxTQUFTLEtBQUssVUFBTCxDQUFnQixHQUFoQixDQUFULENBRlU7QUFHaEIsVUFBSSxNQUFKLEVBQVk7QUFDVixZQUFJO0FBQ0YsaUJBQU8sY0FBUCxHQUF3QixJQUF4QixDQURFO0FBRUYsZ0JBQU0sVUFBTixDQUFpQjtBQUNmLG9CQUFRLE1BQVI7QUFDQSxrQkFBTSxJQUFJLE1BQUosQ0FBVyxJQUFYO0FBQ04sd0JBQVksSUFBSSxJQUFKO0FBQ1osb0JBQVEsS0FBSyxNQUFMO1dBSlYsRUFGRTtBQVFGLGlCQUFPLGNBQVAsR0FBd0IsS0FBeEIsQ0FSRTtTQUFKLENBU0UsT0FBTyxHQUFQLEVBQVk7QUFDWixpQkFBTyxLQUFQLENBQWEsMkNBQWIsRUFBMEQsSUFBSSxJQUFKLENBQTFELENBRFk7U0FBWjtPQVZKLE1BYU8sSUFBSSxNQUFNLFVBQU4sQ0FBaUIsSUFBSSxNQUFKLENBQVcsRUFBWCxDQUFqQixLQUFvQyxlQUFwQyxFQUFxRDtBQUM5RCxZQUFJLGFBQWEscUJBQWIsQ0FBbUMsSUFBSSxJQUFKLENBQXZDLEVBQWtELEtBQUssTUFBTCxDQUFZLGVBQVosQ0FBNEIsSUFBSSxNQUFKLENBQVcsRUFBWCxFQUFlLElBQTNDLEVBQWxEO09BREssTUFFQSxJQUFJLE1BQU0sVUFBTixDQUFpQixJQUFJLE1BQUosQ0FBVyxFQUFYLENBQWpCLEtBQW9DLFVBQXBDLEVBQWdEO0FBQ3pELFlBQUksUUFBUSxxQkFBUixDQUE4QixJQUFJLElBQUosQ0FBbEMsRUFBNkMsS0FBSyxNQUFMLENBQVksVUFBWixDQUF1QixJQUFJLE1BQUosQ0FBVyxFQUFYLEVBQWUsSUFBdEMsRUFBN0M7T0FESzs7Ozs7Ozs7Ozs7Ozs7K0JBYUUsS0FBSztBQUNkLGFBQU8sS0FBSyxNQUFMLENBQVksVUFBWixDQUF1QixJQUFJLE1BQUosQ0FBVyxFQUFYLENBQTlCLENBRGM7Ozs7Ozs7Ozs7OEJBUU47QUFDUixXQUFLLE1BQUwsR0FBYyxJQUFkLENBRFE7Ozs7U0E5SE47Ozs7Ozs7OztBQXVJTix1QkFBdUIsU0FBdkIsQ0FBaUMsTUFBakMsR0FBMEMsSUFBMUM7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLHNCQUFqQiIsImZpbGUiOiJjaGFuZ2UtbWFuYWdlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGNsYXNzICBsYXllci5XZWJzb2NrZXRzLkNoYW5nZU1hbmFnZXJcbiAqIEBwcml2YXRlXG4gKlxuICogVGhpcyBjbGFzcyBsaXN0ZW5zIGZvciBgY2hhbmdlYCBldmVudHMgZnJvbSB0aGUgd2Vic29ja2V0IHNlcnZlcixcbiAqIGFuZCBwcm9jZXNzZXMgdGhlbS5cbiAqL1xuY29uc3QgVXRpbHMgPSByZXF1aXJlKCcuLi9jbGllbnQtdXRpbHMnKTtcbmNvbnN0IGxvZ2dlciA9IHJlcXVpcmUoJy4uL2xvZ2dlcicpO1xuY29uc3QgTWVzc2FnZSA9IHJlcXVpcmUoJy4uL21lc3NhZ2UnKTtcbmNvbnN0IENvbnZlcnNhdGlvbiA9IHJlcXVpcmUoJy4uL2NvbnZlcnNhdGlvbicpO1xuXG5cbmNsYXNzIFdlYnNvY2tldENoYW5nZU1hbmFnZXIge1xuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IHdlYnNvY2tldCBjaGFuZ2UgbWFuYWdlclxuICAgKlxuICAgKiAgICAgIHZhciB3ZWJzb2NrZXRDaGFuZ2VNYW5hZ2VyID0gbmV3IGxheWVyLldlYnNvY2tldHMuQ2hhbmdlTWFuYWdlcih7XG4gICAqICAgICAgICAgIGNsaWVudDogY2xpZW50LFxuICAgKiAgICAgICAgICBzb2NrZXRNYW5hZ2VyOiBjbGllbnQuV2Vic29ja2V0cy5Tb2NrZXRNYW5hZ2VyXG4gICAqICAgICAgfSk7XG4gICAqXG4gICAqIEBtZXRob2RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zXG4gICAqIEBwYXJhbSB7bGF5ZXIuQ2xpZW50fSBjbGllbnRcbiAgICogQHBhcmFtIHtsYXllci5XZWJzb2NrZXRzLlNvY2tldE1hbmFnZXJ9IHNvY2tldE1hbmFnZXJcbiAgICogQHJldHVybnMge2xheWVyLldlYnNvY2tldHMuQ2hhbmdlTWFuYWdlcn1cbiAgICovXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICB0aGlzLmNsaWVudCA9IG9wdGlvbnMuY2xpZW50O1xuICAgIG9wdGlvbnMuc29ja2V0TWFuYWdlci5vbignbWVzc2FnZScsIHRoaXMuX2hhbmRsZUNoYW5nZSwgdGhpcyk7XG4gIH1cblxuICAvKipcbiAgICogSGFuZGxlcyBhIENoYW5nZSBwYWNrZXQgZnJvbSB0aGUgc2VydmVyLlxuICAgKlxuICAgKiBAbWV0aG9kIF9oYW5kbGVDaGFuZ2VcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtICB7bGF5ZXIuTGF5ZXJFdmVudH0gZXZ0XG4gICAqL1xuICBfaGFuZGxlQ2hhbmdlKGV2dCkge1xuICAgIGlmIChldnQuZGF0YS50eXBlID09PSAnY2hhbmdlJykge1xuICAgICAgY29uc3QgbXNnID0gZXZ0LmRhdGEuYm9keTtcbiAgICAgIHN3aXRjaCAobXNnLm9wZXJhdGlvbikge1xuICAgICAgICBjYXNlICdjcmVhdGUnOlxuICAgICAgICAgIGxvZ2dlci5pbmZvKGBXZWJzb2NrZXQgQ2hhbmdlIEV2ZW50OiBDcmVhdGUgJHttc2cub2JqZWN0LnR5cGV9ICR7bXNnLm9iamVjdC5pZH1gKTtcbiAgICAgICAgICBsb2dnZXIuZGVidWcobXNnLmRhdGEpO1xuICAgICAgICAgIHRoaXMuX2hhbmRsZUNyZWF0ZShtc2cpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdkZWxldGUnOlxuICAgICAgICAgIGxvZ2dlci5pbmZvKGBXZWJzb2NrZXQgQ2hhbmdlIEV2ZW50OiBEZWxldGUgJHttc2cub2JqZWN0LnR5cGV9ICR7bXNnLm9iamVjdC5pZH1gKTtcbiAgICAgICAgICBsb2dnZXIuZGVidWcobXNnLmRhdGEpO1xuICAgICAgICAgIHRoaXMuX2hhbmRsZURlbGV0ZShtc2cpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdwYXRjaCc6XG4gICAgICAgICAgbG9nZ2VyLmluZm8oYFdlYnNvY2tldCBDaGFuZ2UgRXZlbnQ6IFBhdGNoICR7bXNnLm9iamVjdC50eXBlfSAke21zZy5vYmplY3QuaWR9OiAke21zZy5kYXRhLm1hcChvcCA9PiBvcC5wcm9wZXJ0eSkuam9pbignLCAnKX1gKTtcbiAgICAgICAgICBsb2dnZXIuZGVidWcobXNnLmRhdGEpO1xuICAgICAgICAgIHRoaXMuX2hhbmRsZVBhdGNoKG1zZyk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3MgYSBjcmVhdGUgb2JqZWN0IG1lc3NhZ2UgZnJvbSB0aGUgc2VydmVyXG4gICAqXG4gICAqIEBtZXRob2QgX2hhbmRsZUNyZWF0ZVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IG1zZ1xuICAgKi9cbiAgX2hhbmRsZUNyZWF0ZShtc2cpIHtcbiAgICBtc2cuZGF0YS5mcm9tV2Vic29ja2V0ID0gdHJ1ZTtcbiAgICB0aGlzLmNsaWVudC5fY3JlYXRlT2JqZWN0KG1zZy5kYXRhKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGVzIGRlbGV0ZSBvYmplY3QgbWVzc2FnZXMgZnJvbSB0aGUgc2VydmVyLlxuICAgKiBBbGwgb2JqZWN0cyB0aGF0IGNhbiBiZSBkZWxldGVkIGZyb20gdGhlIHNlcnZlciBzaG91bGRcbiAgICogcHJvdmlkZSBhIF9kZWxldGVkKCkgbWV0aG9kIHRvIGJlIGNhbGxlZCBwcmlvciB0byBkZXN0cm95KCkuXG4gICAqXG4gICAqIEBtZXRob2QgX2hhbmRsZURlbGV0ZVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IG1zZ1xuICAgKi9cbiAgX2hhbmRsZURlbGV0ZShtc2cpIHtcbiAgICBjb25zdCBlbnRpdHkgPSB0aGlzLl9nZXRPYmplY3QobXNnKTtcbiAgICBpZiAoZW50aXR5KSB7XG4gICAgICBlbnRpdHkuX2RlbGV0ZWQoKTtcbiAgICAgIGVudGl0eS5kZXN0cm95KCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE9uIHJlY2VpdmluZyBhbiB1cGRhdGUvcGF0Y2ggbWVzc2FnZSBmcm9tIHRoZSBzZXJ2ZXJcbiAgICogcnVuIHRoZSBMYXllclBhcnNlciBvbiB0aGUgZGF0YS5cbiAgICpcbiAgICogQG1ldGhvZCBfaGFuZGxlUGF0Y2hcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtICB7T2JqZWN0fSBtc2dcbiAgICovXG4gIF9oYW5kbGVQYXRjaChtc2cpIHtcbiAgICAvLyBDYW4gb25seSBwYXRjaCBhIGNhY2hlZCBvYmplY3RcbiAgICBjb25zdCBlbnRpdHkgPSB0aGlzLl9nZXRPYmplY3QobXNnKTtcbiAgICBpZiAoZW50aXR5KSB7XG4gICAgICB0cnkge1xuICAgICAgICBlbnRpdHkuX2luTGF5ZXJQYXJzZXIgPSB0cnVlO1xuICAgICAgICBVdGlscy5sYXllclBhcnNlKHtcbiAgICAgICAgICBvYmplY3Q6IGVudGl0eSxcbiAgICAgICAgICB0eXBlOiBtc2cub2JqZWN0LnR5cGUsXG4gICAgICAgICAgb3BlcmF0aW9uczogbXNnLmRhdGEsXG4gICAgICAgICAgY2xpZW50OiB0aGlzLmNsaWVudCxcbiAgICAgICAgfSk7XG4gICAgICAgIGVudGl0eS5faW5MYXllclBhcnNlciA9IGZhbHNlO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcignd2Vic29ja2V0LW1hbmFnZXI6IEZhaWxlZCB0byBoYW5kbGUgZXZlbnQnLCBtc2cuZGF0YSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChVdGlscy50eXBlRnJvbUlEKG1zZy5vYmplY3QuaWQpID09PSAnY29udmVyc2F0aW9ucycpIHtcbiAgICAgIGlmIChDb252ZXJzYXRpb24uX2xvYWRSZXNvdXJjZUZvclBhdGNoKG1zZy5kYXRhKSkgdGhpcy5jbGllbnQuZ2V0Q29udmVyc2F0aW9uKG1zZy5vYmplY3QuaWQsIHRydWUpO1xuICAgIH0gZWxzZSBpZiAoVXRpbHMudHlwZUZyb21JRChtc2cub2JqZWN0LmlkKSA9PT0gJ21lc3NhZ2VzJykge1xuICAgICAgaWYgKE1lc3NhZ2UuX2xvYWRSZXNvdXJjZUZvclBhdGNoKG1zZy5kYXRhKSkgdGhpcy5jbGllbnQuZ2V0TWVzc2FnZShtc2cub2JqZWN0LmlkLCB0cnVlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBvYmplY3Qgc3BlY2lmaWVkIGJ5IHRoZSBgb2JqZWN0YCBwcm9wZXJ0eSBvZiB0aGUgd2Vic29ja2V0IHBhY2tldC5cbiAgICpcbiAgICogQG1ldGhvZCBfZ2V0T2JqZWN0XG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdH0gbXNnXG4gICAqIEByZXR1cm4ge2xheWVyLlJvb3R9XG4gICAqL1xuICBfZ2V0T2JqZWN0KG1zZykge1xuICAgIHJldHVybiB0aGlzLmNsaWVudC5fZ2V0T2JqZWN0KG1zZy5vYmplY3QuaWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIE5vdCByZXF1aXJlZCwgYnV0IGRlc3Ryb3kgaXMgYmVzdCBwcmFjdGljZVxuICAgKiBAbWV0aG9kIGRlc3Ryb3lcbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy5jbGllbnQgPSBudWxsO1xuICB9XG59XG5cbi8qKlxuICogVGhlIENsaWVudCB0aGF0IG93bnMgdGhpcy5cbiAqIEB0eXBlIHtsYXllci5DbGllbnR9XG4gKi9cbldlYnNvY2tldENoYW5nZU1hbmFnZXIucHJvdG90eXBlLmNsaWVudCA9IG51bGw7XG5cbm1vZHVsZS5leHBvcnRzID0gV2Vic29ja2V0Q2hhbmdlTWFuYWdlcjtcbiJdfQ==
