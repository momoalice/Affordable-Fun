'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * The Message Class represents Messages sent amongst participants
 * of of a Conversation.
 *
 * The simplest way to create and send a message is:
 *
 *      var m = conversation.createMessage('Hello there').send();
 *
 * For conversations that involve notifications (primarily for Android and IOS), the more common pattern is:
 *
 *      var m = conversation.createMessage('Hello there').send({text: "Message from Fred: Hello there"});
 *
 * Typically, rendering would be done as follows:
 *
 *      // Create a layer.Query that loads Messages for the
 *      // specified Conversation.
 *      var query = client.createQuery({
 *        model: Query.Message,
 *        predicate: 'conversation = "' + conversation.id + '"'
 *      });
 *
 *      // Any time the Query's data changes the 'change'
 *      // event will fire.
 *      query.on('change', function(layerEvt) {
 *        renderNewMessages(query.data);
 *      });
 *
 *      // This will call will cause the above event handler to receive
 *      // a change event, and will update query.data.
 *      conversation.createMessage('Hello there').send();
 *
 * The above code will trigger the following events:
 *
 *  * Message Instance fires
 *    * messages:sending: An event that lets you modify the message prior to sending
 *    * messages:sent: The message was received by the server
 *  * Query Instance fires
 *    * change: The query has received a new Message
 *    * change:add: Same as the change event but more specific
 *
 * When creating a Message there are a number of ways to structure it.
 * All of these are valid and create the same exact Message:
 *
 *      // Full API style:
 *      var m = conversation.createMessage({
 *          parts: [new layer.MessagePart({
 *              body: 'Hello there',
 *              mimeType: 'text/plain'
 *          })]
 *      });
 *
 *      // Option 1: Pass in an Object instead of an array of layer.MessageParts
 *      var m = conversation.createMessage({
 *          parts: {
 *              body: 'Hello there',
 *              mimeType: 'text/plain'
 *          }
 *      });
 *
 *      // Option 2: Pass in an array of Objects instead of an array of layer.MessageParts
 *      var m = conversation.createMessage({
 *          parts: [{
 *              body: 'Hello there',
 *              mimeType: 'text/plain'
 *          }]
 *      });
 *
 *      // Option 3: Pass in a string (automatically assumes mimeType is text/plain)
 *      // instead of an array of objects.
 *      var m = conversation.createMessage({
 *          parts: 'Hello'
 *      });
 *
 *      // Option 4: Pass in an array of strings (automatically assumes mimeType is text/plain)
 *      var m = conversation.createMessage({
 *          parts: ['Hello']
 *      });
 *
 *      // Option 5: Pass in just a string and nothing else
 *      var m = conversation.createMessage('Hello');
 *
 *      // Option 6: Use addPart.
 *      var m = converseation.createMessage();
 *      m.addPart({body: "hello", mimeType: "text/plain"});
 *
 * Key methods, events and properties for getting started:
 *
 * Properties:
 *
 * * layer.Message.id: this property is worth being familiar with; it identifies the
 *   Message and can be used in `client.getMessage(id)` to retrieve it
 *   at any time.
 * * layer.Message.internalId: This property makes for a handy unique ID for use in dom nodes.
 *   It is gaurenteed not to change during this session.
 * * layer.Message.isRead: Indicates if the Message has been read yet; set `m.isRead = true`
 *   to tell the client and server that the message has been read.
 * * layer.Message.parts: An array of layer.MessagePart classes representing the contents of the Message.
 * * layer.Message.sentAt: Date the message was sent
 * * layer.Message.sender's `userId` property: Conversation participant who sent the Message. You may
 *   need to do a lookup on this id in your own servers to find a
 *   displayable name for it.
 *
 * Methods:
 *
 * * layer.Message.send(): Sends the message to the server and the other participants.
 * * layer.Message.on() and layer.Message.off(); event listeners built on top of the `backbone-events-standalone` npm project
 *
 * Events:
 *
 * * `messages:sent`: The message has been received by the server. Can also subscribe to
 *   this event from the layer.Client which is usually simpler.
 *
 * @class  layer.Message
 * @extends layer.Syncable
 */

var Root = require('./root');
var Syncable = require('./syncable');
var MessagePart = require('./message-part');
var LayerError = require('./layer-error');
var Constants = require('./const');
var Util = require('./client-utils');
var ClientRegistry = require('./client-registry');
var logger = require('./logger');

var Message = function (_Syncable) {
  _inherits(Message, _Syncable);

  /**
   * See layer.Conversation.createMessage()
   *
   * @method constructor
   * @return {layer.Message}
   */

  function Message() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Message);

    // Unless this is a server representation, this is a developer's shorthand;
    // fill in the missing properties around isRead/isUnread before initializing.
    if (!options.fromServer) {
      if ('isUnread' in options) {
        options.isRead = !options.isUnread && !options.is_unread;
      } else {
        options.isRead = true;
      }
    } else {
      options.id = options.fromServer.id;
    }

    if (options.client) options.clientId = options.client.appId;
    if (!options.clientId) throw new Error('clientId property required to create a Message');
    if (options.conversation) options.conversationId = options.conversation.id;

    // Insure __adjustParts is set AFTER clientId is set.
    var parts = options.parts;
    options.parts = null;

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Message).call(this, options));

    _this.parts = parts;

    var client = _this.getClient();
    _this.isInitializing = true;
    if (options && options.fromServer) {
      _this._populateFromServer(options.fromServer);
    } else {
      _this.sender = { userId: '', name: '' };
      _this.sentAt = new Date();
    }

    if (!_this.parts) _this.parts = [];
    _this.localCreatedAt = new Date();

    _this._disableEvents = true;
    if (!options.fromServer) _this.recipientStatus = {};else _this.__updateRecipientStatus(_this.recipientStatus);
    _this._disableEvents = false;

    _this.isInitializing = false;
    if (options && options.fromServer) {
      client._addMessage(_this);
    }
    return _this;
  }

  /**
   * Get the layer.Client associated with this layer.Message.
   *
   * Uses the layer.Message.clientId property.
   *
   * @method getClient
   * @return {layer.Client}
   */


  _createClass(Message, [{
    key: 'getClient',
    value: function getClient() {
      return ClientRegistry.get(this.clientId);
    }

    /**
     * Get the layer.Conversation associated with this layer.Message.
     *
     * Uses the layer.Message.conversationId.
     *
     * @method getConversation
     * @return {layer.Conversation}
     */

  }, {
    key: 'getConversation',
    value: function getConversation() {
      if (this.conversationId) {
        return ClientRegistry.get(this.clientId).getConversation(this.conversationId);
      }
    }

    /**
     * Turn input into valid layer.MessageParts.
     *
     * This method is automatically called any time the parts
     * property is set (including during intialization).  This
     * is where we convert strings into MessageParts, and instances
     * into arrays.
     *
     * @method __adjustParts
     * @private
     * @param  {Mixed} parts -- Could be a string, array, object or MessagePart instance
     * @return {layer.MessagePart[]}
     */

  }, {
    key: '__adjustParts',
    value: function __adjustParts(parts) {
      var _this2 = this;

      if (typeof parts === 'string') {
        return [new MessagePart({
          body: parts,
          mimeType: 'text/plain',
          clientId: this.clientId
        })];
      } else if (Array.isArray(parts)) {
        return parts.map(function (part) {
          var result = undefined;
          if (part instanceof MessagePart) {
            result = part;
          } else {
            result = new MessagePart(part);
          }
          result.clientId = _this2.clientId;
          return result;
        });
      } else if (parts && (typeof parts === 'undefined' ? 'undefined' : _typeof(parts)) === 'object') {
        parts.clientId = this.clientId;
        return [new MessagePart(parts)];
      }
    }

    /**
     * Add a layer.MessagePart to this Message.
     *
     * Should only be called on an unsent Message.
     *
     * @method addPart
     * @param  {layer.MessagePart/Object} part - A layer.MessagePart instance or a `{mimeType: 'text/plain', body: 'Hello'}` formatted Object.
     */

  }, {
    key: 'addPart',
    value: function addPart(part) {
      if (part) {
        part.clientId = this.clientId;
        if ((typeof part === 'undefined' ? 'undefined' : _typeof(part)) === 'object') {
          this.parts.push(new MessagePart(part));
        } else if (part instanceof MessagePart) {
          this.parts.push(part);
        }
      }
      return this;
    }

    /**
     * Accessor called whenever the app accesses `message.recipientStatus`.
     *
     * Insures that participants who haven't yet been sent the Message are marked as layer.Constants.RECEIPT_STATE.PENDING
     *
     * @method __getRecipientStatus
     * @param {string} pKey - The actual property key where the value is stored
     * @private
     * @return {Object}
     */

  }, {
    key: '__getRecipientStatus',
    value: function __getRecipientStatus(pKey) {
      var _this3 = this;

      var value = this[pKey] || {};
      var client = this.getClient();
      if (client) {
        (function () {
          var userId = client.userId;
          var conversation = _this3.getConversation();
          if (conversation) {
            conversation.participants.forEach(function (participant) {
              if (!value[participant]) {
                value[participant] = participant === userId ? Constants.RECEIPT_STATE.READ : Constants.RECEIPT_STATE.PENDING;
              }
            });
          }
        })();
      }
      return value;
    }

    /**
     * Handle changes to the recipientStatus property.
     *
     * Any time the recipientStatus property is set,
     * Recalculate all of the receipt related properties:
     *
     * 1. isRead
     * 2. readStatus
     * 3. deliveryStatus
     *
     * @method __updateRecipientStatus
     * @private
     * @param  {Object} status - Object describing the delivered/read/sent value for each participant
     *
     */

  }, {
    key: '__updateRecipientStatus',
    value: function __updateRecipientStatus(status, oldStatus) {
      var conversation = this.getConversation();
      var client = this.getClient();

      if (!conversation || Util.doesObjectMatch(status, oldStatus)) return;

      var userId = client.userId;
      var isSender = this.sender.userId === userId;
      var userHasRead = status[userId] === Constants.RECEIPT_STATE.READ;

      try {
        // -1 so we don't count this user
        var userCount = conversation.participants.length - 1;

        // If sent by this user or read by this user, update isRead/unread
        if (!this.__isRead && (isSender || userHasRead)) {
          this.__isRead = true; // no __updateIsRead event fired
        }

        // Update the readStatus/deliveryStatus properties

        var _getReceiptStatus2 = this._getReceiptStatus(status, userId);

        var readCount = _getReceiptStatus2.readCount;
        var deliveredCount = _getReceiptStatus2.deliveredCount;

        this._setReceiptStatus(readCount, deliveredCount, userCount);
      } catch (error) {}
      // Do nothing


      // Only trigger an event
      // 1. we're not initializing a new Message
      // 2. the user's state has been updated to read; we don't care about updates from other users if we aren't the sender.
      //    We also don't care about state changes to delivered; these do not inform rendering as the fact we are processing it
      //    proves its delivered.
      // 3. The user is the sender; in that case we do care about rendering receipts from other users
      if (!this.isInitializing && oldStatus) {
        var usersStateUpdatedToRead = userHasRead && oldStatus[userId] !== Constants.RECEIPT_STATE.READ;
        if (usersStateUpdatedToRead || isSender) {
          this._triggerAsync('messages:change', {
            oldValue: oldStatus,
            newValue: status,
            property: 'recipientStatus'
          });
        }
      }
    }

    /**
     * Get the number of participants who have read and been delivered
     * this Message
     *
     * @method _getReceiptStatus
     * @private
     * @param  {Object} status - Object describing the delivered/read/sent value for each participant
     * @param  {string} userId - User ID for this user; not counted when reporting on how many people have read/received.
     * @return {Object} result
     * @return {number} result.readCount
     * @return {number} result.deliveredCount
     */

  }, {
    key: '_getReceiptStatus',
    value: function _getReceiptStatus(status, userId) {
      var readCount = 0,
          deliveredCount = 0;
      Object.keys(status).filter(function (participant) {
        return participant !== userId;
      }).forEach(function (participant) {
        if (status[participant] === Constants.RECEIPT_STATE.READ) {
          readCount++;
          deliveredCount++;
        } else if (status[participant] === Constants.RECEIPT_STATE.DELIVERED) {
          deliveredCount++;
        }
      });

      return {
        readCount: readCount,
        deliveredCount: deliveredCount
      };
    }

    /**
     * Sets the layer.Message.readStatus and layer.Message.deliveryStatus properties.
     *
     * @method _setReceiptStatus
     * @private
     * @param  {number} readCount
     * @param  {number} deliveredCount
     * @param  {number} userCount
     */

  }, {
    key: '_setReceiptStatus',
    value: function _setReceiptStatus(readCount, deliveredCount, userCount) {
      if (readCount === userCount) {
        this.readStatus = Constants.RECIPIENT_STATE.ALL;
      } else if (readCount > 0) {
        this.readStatus = Constants.RECIPIENT_STATE.SOME;
      } else {
        this.readStatus = Constants.RECIPIENT_STATE.NONE;
      }
      if (deliveredCount === userCount) {
        this.deliveryStatus = Constants.RECIPIENT_STATE.ALL;
      } else if (deliveredCount > 0) {
        this.deliveryStatus = Constants.RECIPIENT_STATE.SOME;
      } else {
        this.deliveryStatus = Constants.RECIPIENT_STATE.NONE;
      }
    }

    /**
     * Handle changes to the isRead property.
     *
     * If someone called m.isRead = true, AND
     * if it was previously false, AND
     * if the call didn't come from layer.Message.__updateRecipientStatus,
     * Then notify the server that the message has been read.
     *
     *
     * @method __updateIsRead
     * @private
     * @param  {boolean} value - True if isRead is true.
     */

  }, {
    key: '__updateIsRead',
    value: function __updateIsRead(value) {
      if (value) {
        this._sendReceipt(Constants.RECEIPT_STATE.READ);
        this._triggerAsync('messages:read');
        var conversation = this.getConversation();
        if (conversation) conversation.unreadCount--;
      }
    }

    /**
     * Send a Read or Delivery Receipt to the server.
     *
     * @method sendReceipt
     * @param {string} [type=layer.Constants.RECEIPT_STATE.READ] - One of layer.Constants.RECEIPT_STATE.READ or layer.Constants.RECEIPT_STATE.DELIVERY
     * @return {layer.Message} this
     */

  }, {
    key: 'sendReceipt',
    value: function sendReceipt() {
      var type = arguments.length <= 0 || arguments[0] === undefined ? Constants.RECEIPT_STATE.READ : arguments[0];

      if (type === Constants.RECEIPT_STATE.READ) {
        if (this.isRead) {
          return this;
        } else {
          // Without triggering the event, clearObject isn't called,
          // which means those using the toObject() data will have an isRead that doesn't match
          // this instance.  Which typically leads to lots of extra attempts
          // to mark the message as read.
          this.__isRead = true;
          this._triggerAsync('messages:read');
          var conversation = this.getConversation();
          if (conversation) conversation.unreadCount--;
        }
      }
      this._sendReceipt(type);
      return this;
    }

    /**
     * Send a Read or Delivery Receipt to the server.
     *
     * This bypasses any validation and goes direct to sending to the server.
     *
     * NOTE: Server errors are not handled; the local receipt state is suitable even
     * if out of sync with the server.
     *
     * @method _sendReceipt
     * @private
     * @param {string} [type=read] - One of layer.Constants.RECEIPT_STATE.READ or layer.Constants.RECEIPT_STATE.DELIVERY
     */

  }, {
    key: '_sendReceipt',
    value: function _sendReceipt(type) {
      var _this4 = this;

      if (this.getConversation().participants.length === 0) return;
      this._setSyncing();
      this._xhr({
        url: '/receipts',
        method: 'POST',
        data: {
          type: type
        },
        sync: {
          // This should not be treated as a POST/CREATE request on the Message
          operation: 'RECEIPT'
        }
      }, function () {
        return _this4._setSynced();
      });
    }

    /**
     * Send the message to all participants of the Conversation.
     *
     * Message must have parts and a valid conversation to send successfully.
     *
     * @method send
     * @param {Object} [notification] - Parameters for controling how the phones manage notifications of the new Message.
     *                          See IOS and Android docs for details.
     * @param {string} [notification.text] - Text of your notification
     * @param {string} [notification.sound] - Name of an audio file or other sound-related hint
     * @return {layer.Message} this
     */

  }, {
    key: 'send',
    value: function send(notification) {
      var client = this.getClient();
      var conversation = this.getConversation();

      if (this.syncState !== Constants.SYNC_STATE.NEW) {
        throw new Error(LayerError.dictionary.alreadySent);
      }
      if (!conversation) {
        throw new Error(LayerError.dictionary.conversationMissing);
      }

      if (!this.parts || !this.parts.length) {
        throw new Error(LayerError.dictionary.partsMissing);
      }

      this.sender.userId = client.userId;
      this._setSyncing();
      client._addMessage(this);

      // Make sure that the Conversation has been created on the server
      // and update the lastMessage property
      conversation.send(this);

      // allow for modification of message before sending
      this.trigger('messages:sending');

      var data = {
        parts: new Array(this.parts.length)
      };
      if (notification) data.notification = notification;

      this._preparePartsForSending(data);
      return this;
    }

    /**
     * Insures that each part is ready to send before actually sending the Message.
     *
     * @method _preparePartsForSending
     * @private
     * @param  {Object} structure to be sent to the server
     */

  }, {
    key: '_preparePartsForSending',
    value: function _preparePartsForSending(data) {
      var _this5 = this;

      var client = this.getClient();
      var count = 0;
      this.parts.forEach(function (part, index) {
        part.once('parts:send', function (evt) {
          data.parts[index] = {
            mime_type: evt.mime_type
          };
          if (evt.content) data.parts[index].content = evt.content;
          if (evt.body) data.parts[index].body = evt.body;
          if (evt.encoding) data.parts[index].encoding = evt.encoding;

          count++;
          if (count === _this5.parts.length) {
            _this5._send(data);
          }
        }, _this5);
        part._send(client);
      });
    }

    /**
     * Handle the actual sending.
     *
     * layer.Message.send has some potentially asynchronous
     * preprocessing to do before sending (Rich Content); actual sending
     * is done here.
     *
     * @method _send
     * @private
     */

  }, {
    key: '_send',
    value: function _send(data) {
      var _this6 = this;

      var client = this.getClient();
      var conversation = this.getConversation();

      this.sentAt = new Date();
      client.sendSocketRequest({
        method: 'POST',
        body: function body() {
          return {
            method: 'Message.create',
            object_id: conversation.id,
            data: data
          };
        },
        sync: {
          depends: [this.conversationId, this.id],
          target: this.id
        }
      }, function (success, socketData) {
        return _this6._sendResult(success, socketData);
      });
    }

    /**
      * layer.Message.send() Success Callback.
      *
      * If successfully sending the message; triggers a 'sent' event,
      * and updates the message.id/url
      *
      * @method _sendResult
      * @private
      * @param {Object} messageData - Server description of the message
      */

  }, {
    key: '_sendResult',
    value: function _sendResult(_ref) {
      var success = _ref.success;
      var data = _ref.data;

      if (this.isDestroyed) return;

      if (success) {
        this._populateFromServer(data);
        this._triggerAsync('messages:sent');
      } else {
        this.trigger('messages:sent-error', { error: data });
        this.destroy();
      }
      this._setSynced();
    }

    /**
       * Standard `on()` provided by layer.Root.
       *
       * Adds some special handling of 'messages:loaded' so that calls such as
       *
       *      var m = client.getMessage('layer:///messages/123', true)
       *      .on('messages:loaded', function() {
       *          myrerender(m);
       *      });
       *      myrender(m); // render a placeholder for m until the details of m have loaded
       *
       * can fire their callback regardless of whether the client loads or has
       * already loaded the Message.
       *
       * @method on
       * @param  {string} eventName
       * @param  {Function} eventHandler
       * @param  {Object} context
       * @return {layer.Message} this
       */

  }, {
    key: 'on',
    value: function on(name, callback, context) {
      var hasLoadedEvt = name === 'messages:loaded' || name && (typeof name === 'undefined' ? 'undefined' : _typeof(name)) === 'object' && name['messages:loaded'];

      if (hasLoadedEvt && !this.isLoading) {
        (function () {
          var callNow = name === 'messages:loaded' ? callback : name['messages:loaded'];
          Util.defer(function () {
            return callNow.apply(context);
          });
        })();
      }
      _get(Object.getPrototypeOf(Message.prototype), 'on', this).call(this, name, callback, context);
      return this;
    }

    /**
     * Delete the Message from the server.
     *
     * This call will support various deletion modes.  Calling without a deletion mode is deprecated.
     *
     * Deletion Modes:
     *
     * * layer.Constants.DELETION_MODE.ALL: This deletes the local copy immediately, and attempts to also
     *   delete the server's copy.
     *
     * @method delete
     * @param {number} deletionMode - layer.Constants.DELETION_MODE.ALL is only supported mode at this time
     */

  }, {
    key: 'delete',
    value: function _delete(mode) {
      var _this7 = this;

      if (this.isDestroyed) {
        throw new Error(LayerError.dictionary.isDestroyed);
      }

      var modeValue = 'true';
      if (mode === true) {
        logger.warn('Calling Message.delete without a mode is deprecated');
        mode = Constants.DELETION_MODE.ALL;
      }
      if (!mode || mode !== Constants.DELETION_MODE.ALL) {
        throw new Error(LayerError.dictionary.deletionModeUnsupported);
      }

      if (this.syncState !== Constants.SYNC_STATE.NEW) {
        (function () {
          var id = _this7.id;
          var client = _this7.getClient();
          _this7._xhr({
            url: '?destroy=' + modeValue,
            method: 'DELETE'
          }, function (result) {
            if (!result.success) Message.load(id, client);
          });
        })();
      }

      this._deleted();
      this.destroy();

      return this;
    }

    /**
     * The Message has been deleted.
     *
     * Called from layer.Websockets.ChangeManager and from layer.Message.delete();
     *
     * Destroy must be called separately, and handles most cleanup.
     *
     * @method _deleted
     * @protected
     */

  }, {
    key: '_deleted',
    value: function _deleted() {
      this.trigger('messages:delete');
    }

    /**
     * Remove this Message from the system.
     *
     * This will deregister the Message, remove all events
     * and allow garbage collection.
     *
     * @method destroy
     */

  }, {
    key: 'destroy',
    value: function destroy() {
      this.getClient()._removeMessage(this);
      this.parts.forEach(function (part) {
        return part.destroy();
      });
      this.__parts = null;

      _get(Object.getPrototypeOf(Message.prototype), 'destroy', this).call(this);
    }

    /**
     * Populates this instance with the description from the server.
     *
     * Can be used for creating or for updating the instance.
     *
     * @method _populateFromServer
     * @protected
     * @param  {Object} m - Server description of the message
     */

  }, {
    key: '_populateFromServer',
    value: function _populateFromServer(message) {
      var _this8 = this;

      var tempId = this.id;
      this.id = message.id;
      this.url = message.url;
      this.position = message.position;

      // Assign IDs to preexisting Parts so that we can call getPartById()
      if (this.parts) {
        this.parts.forEach(function (part, index) {
          if (!part.id) part.id = _this8.id + '/parts/' + index;
        });
      }

      this.parts = message.parts.map(function (part) {
        var existingPart = _this8.getPartById(part.id);
        if (existingPart) {
          existingPart._populateFromServer(part);
          return existingPart;
        } else {
          return MessagePart._createFromServer(part);
        }
      });

      this.recipientStatus = message.recipient_status || {};

      this.isRead = !message.is_unread;

      this.sentAt = new Date(message.sent_at);
      this.receivedAt = message.received_at ? new Date(message.received_at) : undefined;

      this.sender = {
        userId: message.sender.user_id || '',
        name: message.sender.name || ''
      };

      this._setSynced();

      if (tempId && tempId !== this.id) {
        this._tempId = tempId;
        this.getClient()._updateMessageId(this, tempId);
        this._triggerAsync('messages:change', {
          oldValue: tempId,
          newValue: this.id,
          property: 'id'
        });
      }
    }

    /**
     * Returns the Message's layer.MessagePart with the specified the part ID.
     *
     * @method getPartById
     * @param {string} partId
     * @return {layer.MessagePart}
     */

  }, {
    key: 'getPartById',
    value: function getPartById(partId) {
      return this.parts ? this.parts.filter(function (part) {
        return part.id === partId;
      })[0] : null;
    }

    /**
     * Accepts json-patch operations for modifying recipientStatus.
     *
     * @method _handlePatchEvent
     * @private
     * @param  {Object[]} data - Array of operations
     */

  }, {
    key: '_handlePatchEvent',
    value: function _handlePatchEvent(newValue, oldValue, paths) {
      this._inLayerParser = false;
      if (paths[0].indexOf('recipient_status') === 0) {
        this.__updateRecipientStatus(this.recipientStatus, oldValue);
      }
      this._inLayerParser = true;
    }

    /**
     * Any xhr method called on this message uses the message's url.
     *
     * For more info on xhr method parameters see {@link layer.ClientAuthenticator#xhr}
     *
     * @method _xhr
     * @protected
     * @return {layer.Message} this
     */

  }, {
    key: '_xhr',
    value: function _xhr(options, callback) {
      // initialize
      var inUrl = options.url;
      var client = this.getClient();
      var conversation = this.getConversation();

      // Validatation
      if (this.isDestroyed) throw new Error(LayerError.dictionary.isDestroyed);
      if (!('url' in options)) throw new Error(LayerError.dictionary.urlRequired);
      if (!conversation) throw new Error(LayerError.dictionary.conversationMissing);

      if (inUrl && !inUrl.match(/^(\/|\?)/)) options.url = inUrl = '/' + options.url;

      // Setup sync structure
      options.sync = this._setupSyncObject(options.sync);

      // Setup the url in case its not yet known
      var getUrl = function getUrl() {
        return this.url + (inUrl || '');
      }.bind(this);

      if (this.url) {
        options.url = getUrl();
      } else {
        options.url = getUrl;
      }

      client.xhr(options, callback);
      return this;
    }
  }, {
    key: '_setupSyncObject',
    value: function _setupSyncObject(sync) {
      if (sync !== false) {
        if (!sync) sync = {};
        if (!sync.target) sync.target = this.id;
        if (!sync.depends) {
          sync.depends = [this.conversationId];
        } else if (sync.depends.indexOf(this.id) === -1) {
          sync.depends.push(this.conversationId);
        }
      }
      return sync;
    }

    /**
     * Get all text parts of the Message.
     *
     * Utility method for extracting all of the text/plain parts
     * and concatenating all of their bodys together into a single string.
     *
     * @method getText
     * @param {string} [joinStr='.  '] If multiple message parts of type text/plain, how do you want them joined together?
     * @return {string}
     */

  }, {
    key: 'getText',
    value: function getText() {
      var joinStr = arguments.length <= 0 || arguments[0] === undefined ? '. ' : arguments[0];

      var textArray = this.parts.filter(function (part) {
        return part.mimeType === 'text/plain';
      }).map(function (part) {
        return part.body;
      });
      textArray = textArray.filter(function (data) {
        return data;
      });
      return textArray.join(joinStr);
    }

    /**
     * Returns a plain object.
     *
     * Object will have all the same public properties as this
     * Message instance.  New object is returned any time
     * any of this object's properties change.
     *
     * @method toObject
     * @return {Object} POJO version of this object.
     */

  }, {
    key: 'toObject',
    value: function toObject() {
      if (!this._toObject) {
        this._toObject = _get(Object.getPrototypeOf(Message.prototype), 'toObject', this).call(this);
        this._toObject.recipientStatus = Util.clone(this.recipientStatus);
        this._toObject.isNew = this.isNew();
        this._toObject.isSaving = this.isSaving();
        this._toObject.isSaved = this.isSaved();
        this._toObject.isSynced = this.isSynced();
      }
      return this._toObject;
    }
  }, {
    key: '_triggerAsync',
    value: function _triggerAsync(evtName, args) {
      this._clearObject();
      _get(Object.getPrototypeOf(Message.prototype), '_triggerAsync', this).call(this, evtName, args);
    }
  }, {
    key: 'trigger',
    value: function trigger(evtName, args) {
      this._clearObject();
      _get(Object.getPrototypeOf(Message.prototype), 'trigger', this).call(this, evtName, args);
    }

    /**
     * Creates a message from the server's representation of a message.
     *
     * Similar to _populateFromServer, however, this method takes a
     * message description and returns a new message instance using _populateFromServer
     * to setup the values.
     *
     * @method _createFromServer
     * @protected
     * @static
     * @param  {Object} message - Server's representation of the message
     * @param  {layer.Conversation} conversation - Conversation for the message
     * @return {layer.Message}
     */

  }], [{
    key: '_createFromServer',
    value: function _createFromServer(message, conversation) {
      if (!(conversation instanceof Root)) throw new Error(LayerError.dictionary.conversationMissing);

      var client = conversation.getClient();
      var found = client.getMessage(message.id);
      var newMessage = undefined;
      if (found) {
        newMessage = found;
        newMessage._populateFromServer(message);
      } else {
        var fromWebsocket = message.fromWebsocket;
        newMessage = new Message({
          fromServer: message,
          conversationId: conversation.id,
          clientId: client.appId,
          _notify: fromWebsocket && message.is_unread && message.sender.user_id !== client.userId
        });
      }

      var status = newMessage.recipientStatus[client.userId];
      if (status !== Constants.RECEIPT_STATE.READ && status !== Constants.RECEIPT_STATE.DELIVERED) {
        newMessage._sendReceipt('delivery');
      }

      return {
        message: newMessage,
        new: !found
      };
    }

    /**
     * Loads the specified message from the server.
     *
     * Typically one should call
     *
     *     client.getMessage(messageId, true)
     *
     * This will get the Message from cache or layer.Message.load it from the server if not cached.
     * Typically you do not need to call this method directly.
     *
     * @method load
     * @static
     * @param  {string} id - Message identifier
     * @param  {layer.Client} client - Client whose conversations should contain the new message
     * @return {layer.Message}
     */

  }, {
    key: 'load',
    value: function load(id, client) {
      var _this9 = this;

      if (!client || !(client instanceof Root)) throw new Error(LayerError.dictionary.clientMissing);
      if (id.indexOf('layer:///messages/') !== 0) throw new Error(LayerError.dictionary.invalidId);

      var message = new Message({
        id: id,
        url: client.url + id.substring(8),
        clientId: client.appId
      });
      message.syncState = Constants.SYNC_STATE.LOADING;
      client.xhr({
        url: message.url,
        method: 'GET',
        sync: false
      }, function (result) {
        return _this9._loadResult(message, client, result);
      });
      return message;
    }
  }, {
    key: '_loadResult',
    value: function _loadResult(message, client, result) {
      if (!result.success) {
        message.syncState = Constants.SYNC_STATE.NEW;
        message._triggerAsync('messages:loaded-error', { error: result.data });
        setTimeout(function () {
          return message.destroy();
        }, 100); // Insure destroyed AFTER loaded-error event has triggered
      } else {
          this._loadSuccess(message, client, result.data);
        }
    }
  }, {
    key: '_loadSuccess',
    value: function _loadSuccess(message, client, response) {
      message._populateFromServer(response);
      message.conversationId = response.conversation.id;
      message._triggerAsync('messages:loaded');
    }

    /**
     * Identifies whether a Message receiving the specified patch data should be loaded from the server.
     *
     * Applies only to Messages that aren't already loaded; used to indicate if a change event is
     * significant enough to load the Message and trigger change events on that Message.
     *
     * At this time there are no properties that are patched on Messages via websockets
     * that would justify loading the Message from the server so as to notify the app.
     *
     * Only recipient status changes and maybe is_unread changes are sent;
     * neither of which are relevant to an app that isn't rendering that message.
     *
     * @method _loadResourceForPatch
     * @static
     * @private
     */

  }, {
    key: '_loadResourceForPatch',
    value: function _loadResourceForPatch(patchData) {
      return false;
    }
  }]);

  return Message;
}(Syncable);

/**
 * Client that the Message belongs to.
 *
 * Actual value of this string matches the appId.
 * @type {string}
 */


Message.prototype.clientId = '';

/**
 * Conversation that this Message belongs to.
 *
 * Actual value is the ID of the Conversation's ID.
 *
 * @type {string}
 */
Message.prototype.conversationId = '';

/**
 * Array of layer.MessagePart objects
 *
 * @type {layer.MessagePart[]}
 */
Message.prototype.parts = null;

/**
 * Message Identifier.
 *
 * This value is shared by all participants and devices.
 *
 * @type {String}
 */
Message.prototype.id = '';

/**
 * URL to the server endpoint for operating on the message.
 * @type {String}
 */
Message.prototype.url = '';

/**
 * Time that the message was sent.
 * @type {Date}
 */
Message.prototype.sentAt = null;

/**
 * Time that the first delivery receipt was sent by your
 * user acknowledging receipt of the message.
 * @type {Date}
 */
Message.prototype.receivedAt = null;

/**
 * Object representing the sender of the Message.
 *
 * Contains `userId` property which is
 * populated when the message was sent by a participant (or former participant)
 * in the Conversation.  Contains a `name` property which is
 * used when the Message is sent via a Named Platform API sender
 * such as "Admin", "Moderator", "Robot Jerking you Around".
 *
 *      <span class='sent-by'>
 *        {message.sender.name || getDisplayNameForId(message.sender.userId)}
 *      </span>
 *
 * @type {Object}
 */
Message.prototype.sender = null;

/**
 * Position of this message within the conversation.
 *
 * NOTES:
 *
 * 1. Deleting a message does not affect position of other Messages.
 * 2. A position is not gaurenteed to be unique (multiple messages sent at the same time could
 * all claim the same position)
 * 3. Each successive message within a conversation should expect a higher position.
 *
 * @type {Number}
 */
Message.prototype.position = 0;

/**
 * Hint used by layer.Client on whether to trigger a messages:notify event.
 *
 * @type {boolean}
 * @private
 */
Message.prototype._notify = false;

/* Recipient Status */

/**
 * Read/delivery State of all participants.
 *
 * This is an object containing keys for each participant,
 * and a value of:
 * * layer.RECEIPT_STATE.SENT
 * * layer.RECEIPT_STATE.DELIVERED
 * * layer.RECEIPT_STATE.READ
 * * layer.RECEIPT_STATE.PENDING
 *
 * @type {Object}
 */
Message.prototype.recipientStatus = null;

/**
 * True if this Message has been read by this user.
 *
 * You can change isRead programatically
 *
 *      m.isRead = true;
 *
 * This will automatically notify the server that the message was read by your user.
 * @type {Boolean}
 */
Message.prototype.isRead = false;

/**
 * This property is here for convenience only; it will always be the opposite of isRead.
 * @type {Boolean}
 * @readonly
 */
Object.defineProperty(Message.prototype, 'isUnread', {
  enumerable: true,
  get: function get() {
    return !this.isRead;
  }
});

/**
 * Have the other participants read this Message yet.
 *
 * This value is one of:
 *
 *  * layer.Constants.RECIPIENT_STATE.ALL
 *  * layer.Constants.RECIPIENT_STATE.SOME
 *  * layer.Constants.RECIPIENT_STATE.NONE
 *
 *  This value is updated any time recipientStatus changes.
 *
 * @type {String}
 */
Message.prototype.readStatus = Constants.RECIPIENT_STATE.NONE;

/**
 * Have the other participants received this Message yet.
 *
  * This value is one of:
 *
 *  * layer.Constants.RECIPIENT_STATE.ALL
 *  * layer.Constants.RECIPIENT_STATE.SOME
 *  * layer.Constants.RECIPIENT_STATE.NONE
 *
 *  This value is updated any time recipientStatus changes.
 *
 *
 * @type {String}
 */
Message.prototype.deliveryStatus = Constants.RECIPIENT_STATE.NONE;

/**
 * A locally created Message will get a temporary ID.
 *
 * Some may try to lookup the Message using the temporary ID even
 * though it may have later received an ID from the server.
 * Keep the temporary ID so we can correctly index and cleanup.
 *
 * @type {String}
 * @private
 */
Message.prototype._tempId = '';

/**
 * The time that this client created this instance.
 * @type {Date}
 */
Message.prototype.localCreatedAt = null;

Message.prototype._toObject = null;

Message.prefixUUID = 'layer:///messages/';

Message.inObjectIgnore = Syncable.inObjectIgnore;

Message.bubbleEventParent = 'getClient';

Message.imageTypes = ['image/gif', 'image/png', 'image/jpeg', 'image/jpg'];

Message._supportedEvents = [

/**
 * Message has been loaded from the server.
 *
 * Note that this is only used in response to the layer.Message.load() method.
 * @event
 * @param {layer.LayerEvent} evt
 */
'messages:loaded',

/**
 * The load method failed to load the message from the server.
 *
 * Note that this is only used in response to the layer.Message.load() method.
 * @event
 * @param {layer.LayerEvent} evt
 */
'messages:loaded-error',

/**
 * Message deleted from the server.
 *
 * Caused by a call to layer.Message.delete() or a websocket event.
 * @param {layer.LayerEvent} evt
 * @event
 */
'messages:delete',

/**
 * Message is about to be sent.
 *
 * Last chance to modify or validate the message prior to sending.
 *
 *     message.on('messages:sending', function(evt) {
 *        message.addPart({mimeType: 'application/location', body: JSON.stringify(getGPSLocation())});
 *     });
 *
 * Typically, you would listen to this event more broadly using `client.on('messages:sending')`
 * which would trigger before sending ANY Messages.
 *
 * @event
 * @param {layer.LayerEvent} evt
 */
'messages:sending',

/**
 * Message has been received by the server.
 *
 * It does NOT indicate delivery to other users.
 *
 * It does NOT indicate messages sent by other users.
 *
 * @event
 * @param {layer.LayerEvent} evt
 */
'messages:sent',

/**
 * Server failed to receive the Message.
 *
 * Message will be deleted immediately after firing this event.
 *
 * @event
 * @param {layer.LayerEvent} evt
 * @param {layer.LayerError} evt.error
 */
'messages:sent-error',

/**
 * Fired when message.isRead is set to true.
 *
 * Sometimes this event is triggered by marking the Message as read locally; sometimes its triggered
 * by your user on a separate device/browser marking the Message as read remotely.
 *
 * Useful if you style unread messages in bold, and need an event to tell you when
 * to unbold the message.
 *
 * @event
 * @param {layer.LayerEvent} evt
 * @param {layer.Message[]} evt.messages - Array of messages that have just been marked as read
 */
'messages:read',

/**
 * The recipientStatus property has changed.
 *
 * This happens in response to an update
 * from the server... but is also caused by marking the current user has having read
 * or received the message.
 * @event
 * @param {layer.LayerEvent} evt
 */
'messages:change'].concat(Syncable._supportedEvents);

Root.initClass.apply(Message, [Message, 'Message']);
module.exports = Message;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tZXNzYWdlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFvSEEsSUFBTSxPQUFPLFFBQVEsUUFBUixDQUFQO0FBQ04sSUFBTSxXQUFXLFFBQVEsWUFBUixDQUFYO0FBQ04sSUFBTSxjQUFjLFFBQVEsZ0JBQVIsQ0FBZDtBQUNOLElBQU0sYUFBYSxRQUFRLGVBQVIsQ0FBYjtBQUNOLElBQU0sWUFBWSxRQUFRLFNBQVIsQ0FBWjtBQUNOLElBQU0sT0FBTyxRQUFRLGdCQUFSLENBQVA7QUFDTixJQUFNLGlCQUFpQixRQUFRLG1CQUFSLENBQWpCO0FBQ04sSUFBTSxTQUFTLFFBQVEsVUFBUixDQUFUOztJQUVBOzs7Ozs7Ozs7O0FBT0osV0FQSSxPQU9KLEdBQTBCO1FBQWQsZ0VBQVUsa0JBQUk7OzBCQVB0QixTQU9zQjs7OztBQUd4QixRQUFJLENBQUMsUUFBUSxVQUFSLEVBQW9CO0FBQ3ZCLFVBQUksY0FBYyxPQUFkLEVBQXVCO0FBQ3pCLGdCQUFRLE1BQVIsR0FBaUIsQ0FBQyxRQUFRLFFBQVIsSUFBb0IsQ0FBQyxRQUFRLFNBQVIsQ0FEZDtPQUEzQixNQUVPO0FBQ0wsZ0JBQVEsTUFBUixHQUFpQixJQUFqQixDQURLO09BRlA7S0FERixNQU1PO0FBQ0wsY0FBUSxFQUFSLEdBQWEsUUFBUSxVQUFSLENBQW1CLEVBQW5CLENBRFI7S0FOUDs7QUFVQSxRQUFJLFFBQVEsTUFBUixFQUFnQixRQUFRLFFBQVIsR0FBbUIsUUFBUSxNQUFSLENBQWUsS0FBZixDQUF2QztBQUNBLFFBQUksQ0FBQyxRQUFRLFFBQVIsRUFBa0IsTUFBTSxJQUFJLEtBQUosQ0FBVSxnREFBVixDQUFOLENBQXZCO0FBQ0EsUUFBSSxRQUFR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QixXQUptQixDQUFyQjs7QUFPQSxRQUFRLGdCQUFSLEdBQTJCOzs7Ozs7Ozs7QUFTekIsaUJBVHlCOzs7Ozs7Ozs7QUFrQnpCLHVCQWxCeUI7Ozs7Ozs7OztBQTJCekIsaUJBM0J5Qjs7Ozs7Ozs7Ozs7Ozs7Ozs7QUE0Q3pCLGtCQTVDeUI7Ozs7Ozs7Ozs7OztBQXdEekIsZUF4RHlCOzs7Ozs7Ozs7OztBQW1FekIscUJBbkV5Qjs7Ozs7Ozs7Ozs7Ozs7O0FBa0Z6QixlQWxGeUI7Ozs7Ozs7Ozs7O0FBNkZ6QixpQkE3RnlCLEVBZ0d6QixNQWhHeUIsQ0FnR2xCLFNBQVMsZ0JBQVQsQ0FoR1Q7O0FBa0dBLEtBQUssU0FBTCxDQUFlLEtBQWYsQ0FBcUIsT0FBckIsRUFBOEIsQ0FBQyxPQUFELEVBQVUsU0FBVixDQUE5QjtBQUNBLE9BQU8sT0FBUCxHQUFpQixPQUFqQiIsImZpbGUiOiJtZXNzYWdlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBUaGUgTWVzc2FnZSBDbGFzcyByZXByZXNlbnRzIE1lc3NhZ2VzIHNlbnQgYW1vbmdzdCBwYXJ0aWNpcGFudHNcbiAqIG9mIG9mIGEgQ29udmVyc2F0aW9uLlxuICpcbiAqIFRoZSBzaW1wbGVzdCB3YXkgdG8gY3JlYXRlIGFuZCBzZW5kIGEgbWVzc2FnZSBpczpcbiAqXG4gKiAgICAgIHZhciBtID0gY29udmVyc2F0aW9uLmNyZWF0ZU1lc3NhZ2UoJ0hlbGxvIHRoZXJlJykuc2VuZCgpO1xuICpcbiAqIEZvciBjb252ZXJzYXRpb25zIHRoYXQgaW52b2x2ZSBub3RpZmljYXRpb25zIChwcmltYXJpbHkgZm9yIEFuZHJvaWQgYW5kIElPUyksIHRoZSBtb3JlIGNvbW1vbiBwYXR0ZXJuIGlzOlxuICpcbiAqICAgICAgdmFyIG0gPSBjb252ZXJzYXRpb24uY3JlYXRlTWVzc2FnZSgnSGVsbG8gdGhlcmUnKS5zZW5kKHt0ZXh0OiBcIk1lc3NhZ2UgZnJvbSBGcmVkOiBIZWxsbyB0aGVyZVwifSk7XG4gKlxuICogVHlwaWNhbGx5LCByZW5kZXJpbmcgd291bGQgYmUgZG9uZSBhcyBmb2xsb3dzOlxuICpcbiAqICAgICAgLy8gQ3JlYXRlIGEgbGF5ZXIuUXVlcnkgdGhhdCBsb2FkcyBNZXNzYWdlcyBmb3IgdGhlXG4gKiAgICAgIC8vIHNwZWNpZmllZCBDb252ZXJzYXRpb24uXG4gKiAgICAgIHZhciBxdWVyeSA9IGNsaWVudC5jcmVhdGVRdWVyeSh7XG4gKiAgICAgICAgbW9kZWw6IFF1ZXJ5Lk1lc3NhZ2UsXG4gKiAgICAgICAgcHJlZGljYXRlOiAnY29udmVyc2F0aW9uID0gXCInICsgY29udmVyc2F0aW9uLmlkICsgJ1wiJ1xuICogICAgICB9KTtcbiAqXG4gKiAgICAgIC8vIEFueSB0aW1lIHRoZSBRdWVyeSdzIGRhdGEgY2hhbmdlcyB0aGUgJ2NoYW5nZSdcbiAqICAgICAgLy8gZXZlbnQgd2lsbCBmaXJlLlxuICogICAgICBxdWVyeS5vbignY2hhbmdlJywgZnVuY3Rpb24obGF5ZXJFdnQpIHtcbiAqICAgICAgICByZW5kZXJOZXdNZXNzYWdlcyhxdWVyeS5kYXRhKTtcbiAqICAgICAgfSk7XG4gKlxuICogICAgICAvLyBUaGlzIHdpbGwgY2FsbCB3aWxsIGNhdXNlIHRoZSBhYm92ZSBldmVudCBoYW5kbGVyIHRvIHJlY2VpdmVcbiAqICAgICAgLy8gYSBjaGFuZ2UgZXZlbnQsIGFuZCB3aWxsIHVwZGF0ZSBxdWVyeS5kYXRhLlxuICogICAgICBjb252ZXJzYXRpb24uY3JlYXRlTWVzc2FnZSgnSGVsbG8gdGhlcmUnKS5zZW5kKCk7XG4gKlxuICogVGhlIGFib3ZlIGNvZGUgd2lsbCB0cmlnZ2VyIHRoZSBmb2xsb3dpbmcgZXZlbnRzOlxuICpcbiAqICAqIE1lc3NhZ2UgSW5zdGFuY2UgZmlyZXNcbiAqICAgICogbWVzc2FnZXM6c2VuZGluZzogQW4gZXZlbnQgdGhhdCBsZXRzIHlvdSBtb2RpZnkgdGhlIG1lc3NhZ2UgcHJpb3IgdG8gc2VuZGluZ1xuICogICAgKiBtZXNzYWdlczpzZW50OiBUaGUgbWVzc2FnZSB3YXMgcmVjZWl2ZWQgYnkgdGhlIHNlcnZlclxuICogICogUXVlcnkgSW5zdGFuY2UgZmlyZXNcbiAqICAgICogY2hhbmdlOiBUaGUgcXVlcnkgaGFzIHJlY2VpdmVkIGEgbmV3IE1lc3NhZ2VcbiAqICAgICogY2hhbmdlOmFkZDogU2FtZSBhcyB0aGUgY2hhbmdlIGV2ZW50IGJ1dCBtb3JlIHNwZWNpZmljXG4gKlxuICogV2hlbiBjcmVhdGluZyBhIE1lc3NhZ2UgdGhlcmUgYXJlIGEgbnVtYmVyIG9mIHdheXMgdG8gc3RydWN0dXJlIGl0LlxuICogQWxsIG9mIHRoZXNlIGFyZSB2YWxpZCBhbmQgY3JlYXRlIHRoZSBzYW1lIGV4YWN0IE1lc3NhZ2U6XG4gKlxuICogICAgICAvLyBGdWxsIEFQSSBzdHlsZTpcbiAqICAgICAgdmFyIG0gPSBjb252ZXJzYXRpb24uY3JlYXRlTWVzc2FnZSh7XG4gKiAgICAgICAgICBwYXJ0czogW25ldyBsYXllci5NZXNzYWdlUGFydCh7XG4gKiAgICAgICAgICAgICAgYm9keTogJ0hlbGxvIHRoZXJlJyxcbiAqICAgICAgICAgICAgICBtaW1lVHlwZTogJ3RleHQvcGxhaW4nXG4gKiAgICAgICAgICB9KV1cbiAqICAgICAgfSk7XG4gKlxuICogICAgICAvLyBPcHRpb24gMTogUGFzcyBpbiBhbiBPYmplY3QgaW5zdGVhZCBvZiBhbiBhcnJheSBvZiBsYXllci5NZXNzYWdlUGFydHNcbiAqICAgICAgdmFyIG0gPSBjb252ZXJzYXRpb24uY3JlYXRlTWVzc2FnZSh7XG4gKiAgICAgICAgICBwYXJ0czoge1xuICogICAgICAgICAgICAgIGJvZHk6ICdIZWxsbyB0aGVyZScsXG4gKiAgICAgICAgICAgICAgbWltZVR5cGU6ICd0ZXh0L3BsYWluJ1xuICogICAgICAgICAgfVxuICogICAgICB9KTtcbiAqXG4gKiAgICAgIC8vIE9wdGlvbiAyOiBQYXNzIGluIGFuIGFycmF5IG9mIE9iamVjdHMgaW5zdGVhZCBvZiBhbiBhcnJheSBvZiBsYXllci5NZXNzYWdlUGFydHNcbiAqICAgICAgdmFyIG0gPSBjb252ZXJzYXRpb24uY3JlYXRlTWVzc2FnZSh7XG4gKiAgICAgICAgICBwYXJ0czogW3tcbiAqICAgICAgICAgICAgICBib2R5OiAnSGVsbG8gdGhlcmUnLFxuICogICAgICAgICAgICAgIG1pbWVUeXBlOiAndGV4dC9wbGFpbidcbiAqICAgICAgICAgIH1dXG4gKiAgICAgIH0pO1xuICpcbiAqICAgICAgLy8gT3B0aW9uIDM6IFBhc3MgaW4gYSBzdHJpbmcgKGF1dG9tYXRpY2FsbHkgYXNzdW1lcyBtaW1lVHlwZSBpcyB0ZXh0L3BsYWluKVxuICogICAgICAvLyBpbnN0ZWFkIG9mIGFuIGFycmF5IG9mIG9iamVjdHMuXG4gKiAgICAgIHZhciBtID0gY29udmVyc2F0aW9uLmNyZWF0ZU1lc3NhZ2Uoe1xuICogICAgICAgICAgcGFydHM6ICdIZWxsbydcbiAqICAgICAgfSk7XG4gKlxuICogICAgICAvLyBPcHRpb24gNDogUGFzcyBpbiBhbiBhcnJheSBvZiBzdHJpbmdzIChhdXRvbWF0aWNhbGx5IGFzc3VtZXMgbWltZVR5cGUgaXMgdGV4dC9wbGFpbilcbiAqICAgICAgdmFyIG0gPSBjb252ZXJzYXRpb24uY3JlYXRlTWVzc2FnZSh7XG4gKiAgICAgICAgICBwYXJ0czogWydIZWxsbyddXG4gKiAgICAgIH0pO1xuICpcbiAqICAgICAgLy8gT3B0aW9uIDU6IFBhc3MgaW4ganVzdCBhIHN0cmluZyBhbmQgbm90aGluZyBlbHNlXG4gKiAgICAgIHZhciBtID0gY29udmVyc2F0aW9uLmNyZWF0ZU1lc3NhZ2UoJ0hlbGxvJyk7XG4gKlxuICogICAgICAvLyBPcHRpb24gNjogVXNlIGFkZFBhcnQuXG4gKiAgICAgIHZhciBtID0gY29udmVyc2VhdGlvbi5jcmVhdGVNZXNzYWdlKCk7XG4gKiAgICAgIG0uYWRkUGFydCh7Ym9keTogXCJoZWxsb1wiLCBtaW1lVHlwZTogXCJ0ZXh0L3BsYWluXCJ9KTtcbiAqXG4gKiBLZXkgbWV0aG9kcywgZXZlbnRzIGFuZCBwcm9wZXJ0aWVzIGZvciBnZXR0aW5nIHN0YXJ0ZWQ6XG4gKlxuICogUHJvcGVydGllczpcbiAqXG4gKiAqIGxheWVyLk1lc3NhZ2UuaWQ6IHRoaXMgcHJvcGVydHkgaXMgd29ydGggYmVpbmcgZmFtaWxpYXIgd2l0aDsgaXQgaWRlbnRpZmllcyB0aGVcbiAqICAgTWVzc2FnZSBhbmQgY2FuIGJlIHVzZWQgaW4gYGNsaWVudC5nZXRNZXNzYWdlKGlkKWAgdG8gcmV0cmlldmUgaXRcbiAqICAgYXQgYW55IHRpbWUuXG4gKiAqIGxheWVyLk1lc3NhZ2UuaW50ZXJuYWxJZDogVGhpcyBwcm9wZXJ0eSBtYWtlcyBmb3IgYSBoYW5keSB1bmlxdWUgSUQgZm9yIHVzZSBpbiBkb20gbm9kZXMuXG4gKiAgIEl0IGlzIGdhdXJlbnRlZWQgbm90IHRvIGNoYW5nZSBkdXJpbmcgdGhpcyBzZXNzaW9uLlxuICogKiBsYXllci5NZXNzYWdlLmlzUmVhZDogSW5kaWNhdGVzIGlmIHRoZSBNZXNzYWdlIGhhcyBiZWVuIHJlYWQgeWV0OyBzZXQgYG0uaXNSZWFkID0gdHJ1ZWBcbiAqICAgdG8gdGVsbCB0aGUgY2xpZW50IGFuZCBzZXJ2ZXIgdGhhdCB0aGUgbWVzc2FnZSBoYXMgYmVlbiByZWFkLlxuICogKiBsYXllci5NZXNzYWdlLnBhcnRzOiBBbiBhcnJheSBvZiBsYXllci5NZXNzYWdlUGFydCBjbGFzc2VzIHJlcHJlc2VudGluZyB0aGUgY29udGVudHMgb2YgdGhlIE1lc3NhZ2UuXG4gKiAqIGxheWVyLk1lc3NhZ2Uuc2VudEF0OiBEYXRlIHRoZSBtZXNzYWdlIHdhcyBzZW50XG4gKiAqIGxheWVyLk1lc3NhZ2Uuc2VuZGVyJ3MgYHVzZXJJZGAgcHJvcGVydHk6IENvbnZlcnNhdGlvbiBwYXJ0aWNpcGFudCB3aG8gc2VudCB0aGUgTWVzc2FnZS4gWW91IG1heVxuICogICBuZWVkIHRvIGRvIGEgbG9va3VwIG9uIHRoaXMgaWQgaW4geW91ciBvd24gc2VydmVycyB0byBmaW5kIGFcbiAqICAgZGlzcGxheWFibGUgbmFtZSBmb3IgaXQuXG4gKlxuICogTWV0aG9kczpcbiAqXG4gKiAqIGxheWVyLk1lc3NhZ2Uuc2VuZCgpOiBTZW5kcyB0aGUgbWVzc2FnZSB0byB0aGUgc2VydmVyIGFuZCB0aGUgb3RoZXIgcGFydGljaXBhbnRzLlxuICogKiBsYXllci5NZXNzYWdlLm9uKCkgYW5kIGxheWVyLk1lc3NhZ2Uub2ZmKCk7IGV2ZW50IGxpc3RlbmVycyBidWlsdCBvbiB0b3Agb2YgdGhlIGBiYWNrYm9uZS1ldmVudHMtc3RhbmRhbG9uZWAgbnBtIHByb2plY3RcbiAqXG4gKiBFdmVudHM6XG4gKlxuICogKiBgbWVzc2FnZXM6c2VudGA6IFRoZSBtZXNzYWdlIGhhcyBiZWVuIHJlY2VpdmVkIGJ5IHRoZSBzZXJ2ZXIuIENhbiBhbHNvIHN1YnNjcmliZSB0b1xuICogICB0aGlzIGV2ZW50IGZyb20gdGhlIGxheWVyLkNsaWVudCB3aGljaCBpcyB1c3VhbGx5IHNpbXBsZXIuXG4gKlxuICogQGNsYXNzICBsYXllci5NZXNzYWdlXG4gKiBAZXh0ZW5kcyBsYXllci5TeW5jYWJsZVxuICovXG5cbmNvbnN0IFJvb3QgPSByZXF1aXJlKCcuL3Jvb3QnKTtcbmNvbnN0IFN5bmNhYmxlID0gcmVxdWlyZSgnLi9zeW5jYWJsZScpO1xuY29uc3QgTWVzc2FnZVBhcnQgPSByZXF1aXJlKCcuL21lc3NhZ2UtcGFydCcpO1xuY29uc3QgTGF5ZXJFcnJvciA9IHJlcXVpcmUoJy4vbGF5ZXItZXJyb3InKTtcbmNvbnN0IENvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3QnKTtcbmNvbnN0IFV0aWwgPSByZXF1aXJlKCcuL2NsaWVudC11dGlscycpO1xuY29uc3QgQ2xpZW50UmVnaXN0cnkgPSByZXF1aXJlKCcuL2NsaWVudC1yZWdpc3RyeScpO1xuY29uc3QgbG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXInKTtcblxuY2xhc3MgTWVzc2FnZSBleHRlbmRzIFN5bmNhYmxlIHtcbiAgLyoqXG4gICAqIFNlZSBsYXllci5Db252ZXJzYXRpb24uY3JlYXRlTWVzc2FnZSgpXG4gICAqXG4gICAqIEBtZXRob2QgY29uc3RydWN0b3JcbiAgICogQHJldHVybiB7bGF5ZXIuTWVzc2FnZX1cbiAgICovXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSkge1xuICAgIC8vIFVubGVzcyB0aGlzIGlzIGEgc2VydmVyIHJlcHJlc2VudGF0aW9uLCB0aGlzIGlzIGEgZGV2ZWxvcGVyJ3Mgc2hvcnRoYW5kO1xuICAgIC8vIGZpbGwgaW4gdGhlIG1pc3NpbmcgcHJvcGVydGllcyBhcm91bmQgaXNSZWFkL2lzVW5yZWFkIGJlZm9yZSBpbml0aWFsaXppbmcuXG4gICAgaWYgKCFvcHRpb25zLmZyb21TZXJ2ZXIpIHtcbiAgICAgIGlmICgnaXNVbnJlYWQnIGluIG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucy5pc1JlYWQgPSAhb3B0aW9ucy5pc1VucmVhZCAmJiAhb3B0aW9ucy5pc191bnJlYWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvcHRpb25zLmlzUmVhZCA9IHRydWU7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG9wdGlvbnMuaWQgPSBvcHRpb25zLmZyb21TZXJ2ZXIuaWQ7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuY2xpZW50KSBvcHRpb25zLmNsaWVudElkID0gb3B0aW9ucy5jbGllbnQuYXBwSWQ7XG4gICAgaWYgKCFvcHRpb25zLmNsaWVudElkKSB0aHJvdyBuZXcgRXJyb3IoJ2NsaWVudElkIHByb3BlcnR5IHJlcXVpcmVkIHRvIGNyZWF0ZSBhIE1lc3NhZ2UnKTtcbiAgICBpZiAob3B0aW9ucy5jb252ZXJzYXRpb24pIG9wdGlvbnMuY29udmVyc2F0aW9uSWQgPSBvcHRpb25zLmNvbnZlcnNhdGlvbi5pZDtcblxuICAgIC8vIEluc3VyZSBfX2FkanVzdFBhcnRzIGlzIHNldCBBRlRFUiBjbGllbnRJZCBpcyBzZXQuXG4gICAgY29uc3QgcGFydHMgPSBvcHRpb25zLnBhcnRzO1xuICAgIG9wdGlvbnMucGFydHMgPSBudWxsO1xuXG4gICAgc3VwZXIob3B0aW9ucyk7XG4gICAgdGhpcy5wYXJ0cyA9IHBhcnRzO1xuXG4gICAgY29uc3QgY2xpZW50ID0gdGhpcy5nZXRDbGllbnQoKTtcbiAgICB0aGlzLmlzSW5pdGlhbGl6aW5nID0gdHJ1ZTtcbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmZyb21TZXJ2ZXIpIHtcbiAgICAgIHRoaXMuX3BvcHVsYXRlRnJvbVNlcnZlcihvcHRpb25zLmZyb21TZXJ2ZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNlbmRlciA9IHsgdXNlcklkOiAnJywgbmFtZTogJycgfTtcbiAgICAgIHRoaXMuc2VudEF0ID0gbmV3IERhdGUoKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMucGFydHMpIHRoaXMucGFydHMgPSBbXTtcbiAgICB0aGlzLmxvY2FsQ3JlYXRlZEF0ID0gbmV3IERhdGUoKTtcblxuICAgIHRoaXMuX2Rpc2FibGVFdmVudHMgPSB0cnVlO1xuICAgIGlmICghb3B0aW9ucy5mcm9tU2VydmVyKSB0aGlzLnJlY2lwaWVudFN0YXR1cyA9IHt9O1xuICAgIGVsc2UgdGhpcy5fX3VwZGF0ZVJlY2lwaWVudFN0YXR1cyh0aGlzLnJlY2lwaWVudFN0YXR1cyk7XG4gICAgdGhpcy5fZGlzYWJsZUV2ZW50cyA9IGZhbHNlO1xuXG4gICAgdGhpcy5pc0luaXRpYWxpemluZyA9IGZhbHNlO1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZnJvbVNlcnZlcikge1xuICAgICAgY2xpZW50Ll9hZGRNZXNzYWdlKHRoaXMpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGxheWVyLkNsaWVudCBhc3NvY2lhdGVkIHdpdGggdGhpcyBsYXllci5NZXNzYWdlLlxuICAgKlxuICAgKiBVc2VzIHRoZSBsYXllci5NZXNzYWdlLmNsaWVudElkIHByb3BlcnR5LlxuICAgKlxuICAgKiBAbWV0aG9kIGdldENsaWVudFxuICAgKiBAcmV0dXJuIHtsYXllci5DbGllbnR9XG4gICAqL1xuICBnZXRDbGllbnQoKSB7XG4gICAgcmV0dXJuIENsaWVudFJlZ2lzdHJ5LmdldCh0aGlzLmNsaWVudElkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGxheWVyLkNvbnZlcnNhdGlvbiBhc3NvY2lhdGVkIHdpdGggdGhpcyBsYXllci5NZXNzYWdlLlxuICAgKlxuICAgKiBVc2VzIHRoZSBsYXllci5NZXNzYWdlLmNvbnZlcnNhdGlvbklkLlxuICAgKlxuICAgKiBAbWV0aG9kIGdldENvbnZlcnNhdGlvblxuICAgKiBAcmV0dXJuIHtsYXllci5Db252ZXJzYXRpb259XG4gICAqL1xuICBnZXRDb252ZXJzYXRpb24oKSB7XG4gICAgaWYgKHRoaXMuY29udmVyc2F0aW9uSWQpIHtcbiAgICAgIHJldHVybiBDbGllbnRSZWdpc3RyeS5nZXQodGhpcy5jbGllbnRJZCkuZ2V0Q29udmVyc2F0aW9uKHRoaXMuY29udmVyc2F0aW9uSWQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUdXJuIGlucHV0IGludG8gdmFsaWQgbGF5ZXIuTWVzc2FnZVBhcnRzLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBpcyBhdXRvbWF0aWNhbGx5IGNhbGxlZCBhbnkgdGltZSB0aGUgcGFydHNcbiAgICogcHJvcGVydHkgaXMgc2V0IChpbmNsdWRpbmcgZHVyaW5nIGludGlhbGl6YXRpb24pLiAgVGhpc1xuICAgKiBpcyB3aGVyZSB3ZSBjb252ZXJ0IHN0cmluZ3MgaW50byBNZXNzYWdlUGFydHMsIGFuZCBpbnN0YW5jZXNcbiAgICogaW50byBhcnJheXMuXG4gICAqXG4gICAqIEBtZXRob2QgX19hZGp1c3RQYXJ0c1xuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0gIHtNaXhlZH0gcGFydHMgLS0gQ291bGQgYmUgYSBzdHJpbmcsIGFycmF5LCBvYmplY3Qgb3IgTWVzc2FnZVBhcnQgaW5zdGFuY2VcbiAgICogQHJldHVybiB7bGF5ZXIuTWVzc2FnZVBhcnRbXX1cbiAgICovXG4gIF9fYWRqdXN0UGFydHMocGFydHMpIHtcbiAgICBpZiAodHlwZW9mIHBhcnRzID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIFtuZXcgTWVzc2FnZVBhcnQoe1xuICAgICAgICBib2R5OiBwYXJ0cyxcbiAgICAgICAgbWltZVR5cGU6ICd0ZXh0L3BsYWluJyxcbiAgICAgICAgY2xpZW50SWQ6IHRoaXMuY2xpZW50SWQsXG4gICAgICB9KV07XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHBhcnRzKSkge1xuICAgICAgcmV0dXJuIHBhcnRzLm1hcChwYXJ0ID0+IHtcbiAgICAgICAgbGV0IHJlc3VsdDtcbiAgICAgICAgaWYgKHBhcnQgaW5zdGFuY2VvZiBNZXNzYWdlUGFydCkge1xuICAgICAgICAgIHJlc3VsdCA9IHBhcnQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0ID0gbmV3IE1lc3NhZ2VQYXJ0KHBhcnQpO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdC5jbGllbnRJZCA9IHRoaXMuY2xpZW50SWQ7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKHBhcnRzICYmIHR5cGVvZiBwYXJ0cyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHBhcnRzLmNsaWVudElkID0gdGhpcy5jbGllbnRJZDtcbiAgICAgIHJldHVybiBbbmV3IE1lc3NhZ2VQYXJ0KHBhcnRzKV07XG4gICAgfVxuICB9XG5cblxuICAvKipcbiAgICogQWRkIGEgbGF5ZXIuTWVzc2FnZVBhcnQgdG8gdGhpcyBNZXNzYWdlLlxuICAgKlxuICAgKiBTaG91bGQgb25seSBiZSBjYWxsZWQgb24gYW4gdW5zZW50IE1lc3NhZ2UuXG4gICAqXG4gICAqIEBtZXRob2QgYWRkUGFydFxuICAgKiBAcGFyYW0gIHtsYXllci5NZXNzYWdlUGFydC9PYmplY3R9IHBhcnQgLSBBIGxheWVyLk1lc3NhZ2VQYXJ0IGluc3RhbmNlIG9yIGEgYHttaW1lVHlwZTogJ3RleHQvcGxhaW4nLCBib2R5OiAnSGVsbG8nfWAgZm9ybWF0dGVkIE9iamVjdC5cbiAgICovXG4gIGFkZFBhcnQocGFydCkge1xuICAgIGlmIChwYXJ0KSB7XG4gICAgICBwYXJ0LmNsaWVudElkID0gdGhpcy5jbGllbnRJZDtcbiAgICAgIGlmICh0eXBlb2YgcGFydCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgdGhpcy5wYXJ0cy5wdXNoKG5ldyBNZXNzYWdlUGFydChwYXJ0KSk7XG4gICAgICB9IGVsc2UgaWYgKHBhcnQgaW5zdGFuY2VvZiBNZXNzYWdlUGFydCkge1xuICAgICAgICB0aGlzLnBhcnRzLnB1c2gocGFydCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIEFjY2Vzc29yIGNhbGxlZCB3aGVuZXZlciB0aGUgYXBwIGFjY2Vzc2VzIGBtZXNzYWdlLnJlY2lwaWVudFN0YXR1c2AuXG4gICAqXG4gICAqIEluc3VyZXMgdGhhdCBwYXJ0aWNpcGFudHMgd2hvIGhhdmVuJ3QgeWV0IGJlZW4gc2VudCB0aGUgTWVzc2FnZSBhcmUgbWFya2VkIGFzIGxheWVyLkNvbnN0YW50cy5SRUNFSVBUX1NUQVRFLlBFTkRJTkdcbiAgICpcbiAgICogQG1ldGhvZCBfX2dldFJlY2lwaWVudFN0YXR1c1xuICAgKiBAcGFyYW0ge3N0cmluZ30gcEtleSAtIFRoZSBhY3R1YWwgcHJvcGVydHkga2V5IHdoZXJlIHRoZSB2YWx1ZSBpcyBzdG9yZWRcbiAgICogQHByaXZhdGVcbiAgICogQHJldHVybiB7T2JqZWN0fVxuICAgKi9cbiAgX19nZXRSZWNpcGllbnRTdGF0dXMocEtleSkge1xuICAgIGNvbnN0IHZhbHVlID0gdGhpc1twS2V5XSB8fCB7fTtcbiAgICBjb25zdCBjbGllbnQgPSB0aGlzLmdldENsaWVudCgpO1xuICAgIGlmIChjbGllbnQpIHtcbiAgICAgIGNvbnN0IHVzZXJJZCA9IGNsaWVudC51c2VySWQ7XG4gICAgICBjb25zdCBjb252ZXJzYXRpb24gPSB0aGlzLmdldENvbnZlcnNhdGlvbigpO1xuICAgICAgaWYgKGNvbnZlcnNhdGlvbikge1xuICAgICAgICBjb252ZXJzYXRpb24ucGFydGljaXBhbnRzLmZvckVhY2gocGFydGljaXBhbnQgPT4ge1xuICAgICAgICAgIGlmICghdmFsdWVbcGFydGljaXBhbnRdKSB7XG4gICAgICAgICAgICB2YWx1ZVtwYXJ0aWNpcGFudF0gPSBwYXJ0aWNpcGFudCA9PT0gdXNlcklkID9cbiAgICAgICAgICAgICAgQ29uc3RhbnRzLlJFQ0VJUFRfU1RBVEUuUkVBRCA6IENvbnN0YW50cy5SRUNFSVBUX1NUQVRFLlBFTkRJTkc7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZSBjaGFuZ2VzIHRvIHRoZSByZWNpcGllbnRTdGF0dXMgcHJvcGVydHkuXG4gICAqXG4gICAqIEFueSB0aW1lIHRoZSByZWNpcGllbnRTdGF0dXMgcHJvcGVydHkgaXMgc2V0LFxuICAgKiBSZWNhbGN1bGF0ZSBhbGwgb2YgdGhlIHJlY2VpcHQgcmVsYXRlZCBwcm9wZXJ0aWVzOlxuICAgKlxuICAgKiAxLiBpc1JlYWRcbiAgICogMi4gcmVhZFN0YXR1c1xuICAgKiAzLiBkZWxpdmVyeVN0YXR1c1xuICAgKlxuICAgKiBAbWV0aG9kIF9fdXBkYXRlUmVjaXBpZW50U3RhdHVzXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdH0gc3RhdHVzIC0gT2JqZWN0IGRlc2NyaWJpbmcgdGhlIGRlbGl2ZXJlZC9yZWFkL3NlbnQgdmFsdWUgZm9yIGVhY2ggcGFydGljaXBhbnRcbiAgICpcbiAgICovXG4gIF9fdXBkYXRlUmVjaXBpZW50U3RhdHVzKHN0YXR1cywgb2xkU3RhdHVzKSB7XG4gICAgY29uc3QgY29udmVyc2F0aW9uID0gdGhpcy5nZXRDb252ZXJzYXRpb24oKTtcbiAgICBjb25zdCBjbGllbnQgPSB0aGlzLmdldENsaWVudCgpO1xuXG4gICAgaWYgKCFjb252ZXJzYXRpb24gfHwgVXRpbC5kb2VzT2JqZWN0TWF0Y2goc3RhdHVzLCBvbGRTdGF0dXMpKSByZXR1cm47XG5cbiAgICBjb25zdCB1c2VySWQgPSBjbGllbnQudXNlcklkO1xuICAgIGNvbnN0IGlzU2VuZGVyID0gdGhpcy5zZW5kZXIudXNlcklkID09PSB1c2VySWQ7XG4gICAgY29uc3QgdXNlckhhc1JlYWQgPSBzdGF0dXNbdXNlcklkXSA9PT0gQ29uc3RhbnRzLlJFQ0VJUFRfU1RBVEUuUkVBRDtcblxuICAgIHRyeSB7XG4gICAgICAvLyAtMSBzbyB3ZSBkb24ndCBjb3VudCB0aGlzIHVzZXJcbiAgICAgIGNvbnN0IHVzZXJDb3VudCA9IGNvbnZlcnNhdGlvbi5wYXJ0aWNpcGFudHMubGVuZ3RoIC0gMTtcblxuICAgICAgLy8gSWYgc2VudCBieSB0aGlzIHVzZXIgb3IgcmVhZCBieSB0aGlzIHVzZXIsIHVwZGF0ZSBpc1JlYWQvdW5yZWFkXG4gICAgICBpZiAoIXRoaXMuX19pc1JlYWQgJiYgKGlzU2VuZGVyIHx8IHVzZXJIYXNSZWFkKSkge1xuICAgICAgICB0aGlzLl9faXNSZWFkID0gdHJ1ZTsgLy8gbm8gX191cGRhdGVJc1JlYWQgZXZlbnQgZmlyZWRcbiAgICAgIH1cblxuICAgICAgLy8gVXBkYXRlIHRoZSByZWFkU3RhdHVzL2RlbGl2ZXJ5U3RhdHVzIHByb3BlcnRpZXNcbiAgICAgIGNvbnN0IHsgcmVhZENvdW50LCBkZWxpdmVyZWRDb3VudCB9ID0gdGhpcy5fZ2V0UmVjZWlwdFN0YXR1cyhzdGF0dXMsIHVzZXJJZCk7XG4gICAgICB0aGlzLl9zZXRSZWNlaXB0U3RhdHVzKHJlYWRDb3VudCwgZGVsaXZlcmVkQ291bnQsIHVzZXJDb3VudCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIC8vIERvIG5vdGhpbmdcbiAgICB9XG5cbiAgICAvLyBPbmx5IHRyaWdnZXIgYW4gZXZlbnRcbiAgICAvLyAxLiB3ZSdyZSBub3QgaW5pdGlhbGl6aW5nIGEgbmV3IE1lc3NhZ2VcbiAgICAvLyAyLiB0aGUgdXNlcidzIHN0YXRlIGhhcyBiZWVuIHVwZGF0ZWQgdG8gcmVhZDsgd2UgZG9uJ3QgY2FyZSBhYm91dCB1cGRhdGVzIGZyb20gb3RoZXIgdXNlcnMgaWYgd2UgYXJlbid0IHRoZSBzZW5kZXIuXG4gICAgLy8gICAgV2UgYWxzbyBkb24ndCBjYXJlIGFib3V0IHN0YXRlIGNoYW5nZXMgdG8gZGVsaXZlcmVkOyB0aGVzZSBkbyBub3QgaW5mb3JtIHJlbmRlcmluZyBhcyB0aGUgZmFjdCB3ZSBhcmUgcHJvY2Vzc2luZyBpdFxuICAgIC8vICAgIHByb3ZlcyBpdHMgZGVsaXZlcmVkLlxuICAgIC8vIDMuIFRoZSB1c2VyIGlzIHRoZSBzZW5kZXI7IGluIHRoYXQgY2FzZSB3ZSBkbyBjYXJlIGFib3V0IHJlbmRlcmluZyByZWNlaXB0cyBmcm9tIG90aGVyIHVzZXJzXG4gICAgaWYgKCF0aGlzLmlzSW5pdGlhbGl6aW5nICYmIG9sZFN0YXR1cykge1xuICAgICAgY29uc3QgdXNlcnNTdGF0ZVVwZGF0ZWRUb1JlYWQgPSB1c2VySGFzUmVhZCAmJiBvbGRTdGF0dXNbdXNlcklkXSAhPT0gQ29uc3RhbnRzLlJFQ0VJUFRfU1RBVEUuUkVBRDtcbiAgICAgIGlmICh1c2Vyc1N0YXRlVXBkYXRlZFRvUmVhZCB8fCBpc1NlbmRlcikge1xuICAgICAgICB0aGlzLl90cmlnZ2VyQXN5bmMoJ21lc3NhZ2VzOmNoYW5nZScsIHtcbiAgICAgICAgICBvbGRWYWx1ZTogb2xkU3RhdHVzLFxuICAgICAgICAgIG5ld1ZhbHVlOiBzdGF0dXMsXG4gICAgICAgICAgcHJvcGVydHk6ICdyZWNpcGllbnRTdGF0dXMnLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBudW1iZXIgb2YgcGFydGljaXBhbnRzIHdobyBoYXZlIHJlYWQgYW5kIGJlZW4gZGVsaXZlcmVkXG4gICAqIHRoaXMgTWVzc2FnZVxuICAgKlxuICAgKiBAbWV0aG9kIF9nZXRSZWNlaXB0U3RhdHVzXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdH0gc3RhdHVzIC0gT2JqZWN0IGRlc2NyaWJpbmcgdGhlIGRlbGl2ZXJlZC9yZWFkL3NlbnQgdmFsdWUgZm9yIGVhY2ggcGFydGljaXBhbnRcbiAgICogQHBhcmFtICB7c3RyaW5nfSB1c2VySWQgLSBVc2VyIElEIGZvciB0aGlzIHVzZXI7IG5vdCBjb3VudGVkIHdoZW4gcmVwb3J0aW5nIG9uIGhvdyBtYW55IHBlb3BsZSBoYXZlIHJlYWQvcmVjZWl2ZWQuXG4gICAqIEByZXR1cm4ge09iamVjdH0gcmVzdWx0XG4gICAqIEByZXR1cm4ge251bWJlcn0gcmVzdWx0LnJlYWRDb3VudFxuICAgKiBAcmV0dXJuIHtudW1iZXJ9IHJlc3VsdC5kZWxpdmVyZWRDb3VudFxuICAgKi9cbiAgX2dldFJlY2VpcHRTdGF0dXMoc3RhdHVzLCB1c2VySWQpIHtcbiAgICBsZXQgcmVhZENvdW50ID0gMCxcbiAgICAgIGRlbGl2ZXJlZENvdW50ID0gMDtcbiAgICBPYmplY3Qua2V5cyhzdGF0dXMpLmZpbHRlcihwYXJ0aWNpcGFudCA9PiBwYXJ0aWNpcGFudCAhPT0gdXNlcklkKS5mb3JFYWNoKHBhcnRpY2lwYW50ID0+IHtcbiAgICAgIGlmIChzdGF0dXNbcGFydGljaXBhbnRdID09PSBDb25zdGFudHMuUkVDRUlQVF9TVEFURS5SRUFEKSB7XG4gICAgICAgIHJlYWRDb3VudCsrO1xuICAgICAgICBkZWxpdmVyZWRDb3VudCsrO1xuICAgICAgfSBlbHNlIGlmIChzdGF0dXNbcGFydGljaXBhbnRdID09PSBDb25zdGFudHMuUkVDRUlQVF9TVEFURS5ERUxJVkVSRUQpIHtcbiAgICAgICAgZGVsaXZlcmVkQ291bnQrKztcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiB7XG4gICAgICByZWFkQ291bnQsXG4gICAgICBkZWxpdmVyZWRDb3VudCxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGxheWVyLk1lc3NhZ2UucmVhZFN0YXR1cyBhbmQgbGF5ZXIuTWVzc2FnZS5kZWxpdmVyeVN0YXR1cyBwcm9wZXJ0aWVzLlxuICAgKlxuICAgKiBAbWV0aG9kIF9zZXRSZWNlaXB0U3RhdHVzXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge251bWJlcn0gcmVhZENvdW50XG4gICAqIEBwYXJhbSAge251bWJlcn0gZGVsaXZlcmVkQ291bnRcbiAgICogQHBhcmFtICB7bnVtYmVyfSB1c2VyQ291bnRcbiAgICovXG4gIF9zZXRSZWNlaXB0U3RhdHVzKHJlYWRDb3VudCwgZGVsaXZlcmVkQ291bnQsIHVzZXJDb3VudCkge1xuICAgIGlmIChyZWFkQ291bnQgPT09IHVzZXJDb3VudCkge1xuICAgICAgdGhpcy5yZWFkU3RhdHVzID0gQ29uc3RhbnRzLlJFQ0lQSUVOVF9TVEFURS5BTEw7XG4gICAgfSBlbHNlIGlmIChyZWFkQ291bnQgPiAwKSB7XG4gICAgICB0aGlzLnJlYWRTdGF0dXMgPSBDb25zdGFudHMuUkVDSVBJRU5UX1NUQVRFLlNPTUU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucmVhZFN0YXR1cyA9IENvbnN0YW50cy5SRUNJUElFTlRfU1RBVEUuTk9ORTtcbiAgICB9XG4gICAgaWYgKGRlbGl2ZXJlZENvdW50ID09PSB1c2VyQ291bnQpIHtcbiAgICAgIHRoaXMuZGVsaXZlcnlTdGF0dXMgPSBDb25zdGFudHMuUkVDSVBJRU5UX1NUQVRFLkFMTDtcbiAgICB9IGVsc2UgaWYgKGRlbGl2ZXJlZENvdW50ID4gMCkge1xuICAgICAgdGhpcy5kZWxpdmVyeVN0YXR1cyA9IENvbnN0YW50cy5SRUNJUElFTlRfU1RBVEUuU09NRTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5kZWxpdmVyeVN0YXR1cyA9IENvbnN0YW50cy5SRUNJUElFTlRfU1RBVEUuTk9ORTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSGFuZGxlIGNoYW5nZXMgdG8gdGhlIGlzUmVhZCBwcm9wZXJ0eS5cbiAgICpcbiAgICogSWYgc29tZW9uZSBjYWxsZWQgbS5pc1JlYWQgPSB0cnVlLCBBTkRcbiAgICogaWYgaXQgd2FzIHByZXZpb3VzbHkgZmFsc2UsIEFORFxuICAgKiBpZiB0aGUgY2FsbCBkaWRuJ3QgY29tZSBmcm9tIGxheWVyLk1lc3NhZ2UuX191cGRhdGVSZWNpcGllbnRTdGF0dXMsXG4gICAqIFRoZW4gbm90aWZ5IHRoZSBzZXJ2ZXIgdGhhdCB0aGUgbWVzc2FnZSBoYXMgYmVlbiByZWFkLlxuICAgKlxuICAgKlxuICAgKiBAbWV0aG9kIF9fdXBkYXRlSXNSZWFkXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge2Jvb2xlYW59IHZhbHVlIC0gVHJ1ZSBpZiBpc1JlYWQgaXMgdHJ1ZS5cbiAgICovXG4gIF9fdXBkYXRlSXNSZWFkKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlKSB7XG4gICAgICB0aGlzLl9zZW5kUmVjZWlwdChDb25zdGFudHMuUkVDRUlQVF9TVEFURS5SRUFEKTtcbiAgICAgIHRoaXMuX3RyaWdnZXJBc3luYygnbWVzc2FnZXM6cmVhZCcpO1xuICAgICAgY29uc3QgY29udmVyc2F0aW9uID0gdGhpcy5nZXRDb252ZXJzYXRpb24oKTtcbiAgICAgIGlmIChjb252ZXJzYXRpb24pIGNvbnZlcnNhdGlvbi51bnJlYWRDb3VudC0tO1xuICAgIH1cbiAgfVxuXG5cbiAgLyoqXG4gICAqIFNlbmQgYSBSZWFkIG9yIERlbGl2ZXJ5IFJlY2VpcHQgdG8gdGhlIHNlcnZlci5cbiAgICpcbiAgICogQG1ldGhvZCBzZW5kUmVjZWlwdFxuICAgKiBAcGFyYW0ge3N0cmluZ30gW3R5cGU9bGF5ZXIuQ29uc3RhbnRzLlJFQ0VJUFRfU1RBVEUuUkVBRF0gLSBPbmUgb2YgbGF5ZXIuQ29uc3RhbnRzLlJFQ0VJUFRfU1RBVEUuUkVBRCBvciBsYXllci5Db25zdGFudHMuUkVDRUlQVF9TVEFURS5ERUxJVkVSWVxuICAgKiBAcmV0dXJuIHtsYXllci5NZXNzYWdlfSB0aGlzXG4gICAqL1xuICBzZW5kUmVjZWlwdCh0eXBlID0gQ29uc3RhbnRzLlJFQ0VJUFRfU1RBVEUuUkVBRCkge1xuICAgIGlmICh0eXBlID09PSBDb25zdGFudHMuUkVDRUlQVF9TVEFURS5SRUFEKSB7XG4gICAgICBpZiAodGhpcy5pc1JlYWQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBXaXRob3V0IHRyaWdnZXJpbmcgdGhlIGV2ZW50LCBjbGVhck9iamVjdCBpc24ndCBjYWxsZWQsXG4gICAgICAgIC8vIHdoaWNoIG1lYW5zIHRob3NlIHVzaW5nIHRoZSB0b09iamVjdCgpIGRhdGEgd2lsbCBoYXZlIGFuIGlzUmVhZCB0aGF0IGRvZXNuJ3QgbWF0Y2hcbiAgICAgICAgLy8gdGhpcyBpbnN0YW5jZS4gIFdoaWNoIHR5cGljYWxseSBsZWFkcyB0byBsb3RzIG9mIGV4dHJhIGF0dGVtcHRzXG4gICAgICAgIC8vIHRvIG1hcmsgdGhlIG1lc3NhZ2UgYXMgcmVhZC5cbiAgICAgICAgdGhpcy5fX2lzUmVhZCA9IHRydWU7XG4gICAgICAgIHRoaXMuX3RyaWdnZXJBc3luYygnbWVzc2FnZXM6cmVhZCcpO1xuICAgICAgICBjb25zdCBjb252ZXJzYXRpb24gPSB0aGlzLmdldENvbnZlcnNhdGlvbigpO1xuICAgICAgICBpZiAoY29udmVyc2F0aW9uKSBjb252ZXJzYXRpb24udW5yZWFkQ291bnQtLTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fc2VuZFJlY2VpcHQodHlwZSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogU2VuZCBhIFJlYWQgb3IgRGVsaXZlcnkgUmVjZWlwdCB0byB0aGUgc2VydmVyLlxuICAgKlxuICAgKiBUaGlzIGJ5cGFzc2VzIGFueSB2YWxpZGF0aW9uIGFuZCBnb2VzIGRpcmVjdCB0byBzZW5kaW5nIHRvIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqIE5PVEU6IFNlcnZlciBlcnJvcnMgYXJlIG5vdCBoYW5kbGVkOyB0aGUgbG9jYWwgcmVjZWlwdCBzdGF0ZSBpcyBzdWl0YWJsZSBldmVuXG4gICAqIGlmIG91dCBvZiBzeW5jIHdpdGggdGhlIHNlcnZlci5cbiAgICpcbiAgICogQG1ldGhvZCBfc2VuZFJlY2VpcHRcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtzdHJpbmd9IFt0eXBlPXJlYWRdIC0gT25lIG9mIGxheWVyLkNvbnN0YW50cy5SRUNFSVBUX1NUQVRFLlJFQUQgb3IgbGF5ZXIuQ29uc3RhbnRzLlJFQ0VJUFRfU1RBVEUuREVMSVZFUllcbiAgICovXG4gIF9zZW5kUmVjZWlwdCh0eXBlKSB7XG4gICAgaWYgKHRoaXMuZ2V0Q29udmVyc2F0aW9uKCkucGFydGljaXBhbnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgIHRoaXMuX3NldFN5bmNpbmcoKTtcbiAgICB0aGlzLl94aHIoe1xuICAgICAgdXJsOiAnL3JlY2VpcHRzJyxcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgZGF0YToge1xuICAgICAgICB0eXBlLFxuICAgICAgfSxcbiAgICAgIHN5bmM6IHtcbiAgICAgICAgLy8gVGhpcyBzaG91bGQgbm90IGJlIHRyZWF0ZWQgYXMgYSBQT1NUL0NSRUFURSByZXF1ZXN0IG9uIHRoZSBNZXNzYWdlXG4gICAgICAgIG9wZXJhdGlvbjogJ1JFQ0VJUFQnLFxuICAgICAgfSxcbiAgICB9LCAoKSA9PiB0aGlzLl9zZXRTeW5jZWQoKSk7XG4gIH1cblxuICAvKipcbiAgICogU2VuZCB0aGUgbWVzc2FnZSB0byBhbGwgcGFydGljaXBhbnRzIG9mIHRoZSBDb252ZXJzYXRpb24uXG4gICAqXG4gICAqIE1lc3NhZ2UgbXVzdCBoYXZlIHBhcnRzIGFuZCBhIHZhbGlkIGNvbnZlcnNhdGlvbiB0byBzZW5kIHN1Y2Nlc3NmdWxseS5cbiAgICpcbiAgICogQG1ldGhvZCBzZW5kXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbbm90aWZpY2F0aW9uXSAtIFBhcmFtZXRlcnMgZm9yIGNvbnRyb2xpbmcgaG93IHRoZSBwaG9uZXMgbWFuYWdlIG5vdGlmaWNhdGlvbnMgb2YgdGhlIG5ldyBNZXNzYWdlLlxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgU2VlIElPUyBhbmQgQW5kcm9pZCBkb2NzIGZvciBkZXRhaWxzLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gW25vdGlmaWNhdGlvbi50ZXh0XSAtIFRleHQgb2YgeW91ciBub3RpZmljYXRpb25cbiAgICogQHBhcmFtIHtzdHJpbmd9IFtub3RpZmljYXRpb24uc291bmRdIC0gTmFtZSBvZiBhbiBhdWRpbyBmaWxlIG9yIG90aGVyIHNvdW5kLXJlbGF0ZWQgaGludFxuICAgKiBAcmV0dXJuIHtsYXllci5NZXNzYWdlfSB0aGlzXG4gICAqL1xuICBzZW5kKG5vdGlmaWNhdGlvbikge1xuICAgIGNvbnN0IGNsaWVudCA9IHRoaXMuZ2V0Q2xpZW50KCk7XG4gICAgY29uc3QgY29udmVyc2F0aW9uID0gdGhpcy5nZXRDb252ZXJzYXRpb24oKTtcblxuICAgIGlmICh0aGlzLnN5bmNTdGF0ZSAhPT0gQ29uc3RhbnRzLlNZTkNfU1RBVEUuTkVXKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoTGF5ZXJFcnJvci5kaWN0aW9uYXJ5LmFscmVhZHlTZW50KTtcbiAgICB9XG4gICAgaWYgKCFjb252ZXJzYXRpb24pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihMYXllckVycm9yLmRpY3Rpb25hcnkuY29udmVyc2F0aW9uTWlzc2luZyk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLnBhcnRzIHx8ICF0aGlzLnBhcnRzLmxlbmd0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKExheWVyRXJyb3IuZGljdGlvbmFyeS5wYXJ0c01pc3NpbmcpO1xuICAgIH1cblxuICAgIHRoaXMuc2VuZGVyLnVzZXJJZCA9IGNsaWVudC51c2VySWQ7XG4gICAgdGhpcy5fc2V0U3luY2luZygpO1xuICAgIGNsaWVudC5fYWRkTWVzc2FnZSh0aGlzKTtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGF0IHRoZSBDb252ZXJzYXRpb24gaGFzIGJlZW4gY3JlYXRlZCBvbiB0aGUgc2VydmVyXG4gICAgLy8gYW5kIHVwZGF0ZSB0aGUgbGFzdE1lc3NhZ2UgcHJvcGVydHlcbiAgICBjb252ZXJzYXRpb24uc2VuZCh0aGlzKTtcblxuICAgIC8vIGFsbG93IGZvciBtb2RpZmljYXRpb24gb2YgbWVzc2FnZSBiZWZvcmUgc2VuZGluZ1xuICAgIHRoaXMudHJpZ2dlcignbWVzc2FnZXM6c2VuZGluZycpO1xuXG4gICAgY29uc3QgZGF0YSA9IHtcbiAgICAgIHBhcnRzOiBuZXcgQXJyYXkodGhpcy5wYXJ0cy5sZW5ndGgpLFxuICAgIH07XG4gICAgaWYgKG5vdGlmaWNhdGlvbikgZGF0YS5ub3RpZmljYXRpb24gPSBub3RpZmljYXRpb247XG5cbiAgICB0aGlzLl9wcmVwYXJlUGFydHNGb3JTZW5kaW5nKGRhdGEpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIEluc3VyZXMgdGhhdCBlYWNoIHBhcnQgaXMgcmVhZHkgdG8gc2VuZCBiZWZvcmUgYWN0dWFsbHkgc2VuZGluZyB0aGUgTWVzc2FnZS5cbiAgICpcbiAgICogQG1ldGhvZCBfcHJlcGFyZVBhcnRzRm9yU2VuZGluZ1xuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IHN0cnVjdHVyZSB0byBiZSBzZW50IHRvIHRoZSBzZXJ2ZXJcbiAgICovXG4gIF9wcmVwYXJlUGFydHNGb3JTZW5kaW5nKGRhdGEpIHtcbiAgICBjb25zdCBjbGllbnQgPSB0aGlzLmdldENsaWVudCgpO1xuICAgIGxldCBjb3VudCA9IDA7XG4gICAgdGhpcy5wYXJ0cy5mb3JFYWNoKChwYXJ0LCBpbmRleCkgPT4ge1xuICAgICAgcGFydC5vbmNlKCdwYXJ0czpzZW5kJywgZXZ0ID0+IHtcbiAgICAgICAgZGF0YS5wYXJ0c1tpbmRleF0gPSB7XG4gICAgICAgICAgbWltZV90eXBlOiBldnQubWltZV90eXBlLFxuICAgICAgICB9O1xuICAgICAgICBpZiAoZXZ0LmNvbnRlbnQpIGRhdGEucGFydHNbaW5kZXhdLmNvbnRlbnQgPSBldnQuY29udGVudDtcbiAgICAgICAgaWYgKGV2dC5ib2R5KSBkYXRhLnBhcnRzW2luZGV4XS5ib2R5ID0gZXZ0LmJvZHk7XG4gICAgICAgIGlmIChldnQuZW5jb2RpbmcpIGRhdGEucGFydHNbaW5kZXhdLmVuY29kaW5nID0gZXZ0LmVuY29kaW5nO1xuXG4gICAgICAgIGNvdW50Kys7XG4gICAgICAgIGlmIChjb3VudCA9PT0gdGhpcy5wYXJ0cy5sZW5ndGgpIHtcbiAgICAgICAgICB0aGlzLl9zZW5kKGRhdGEpO1xuICAgICAgICB9XG4gICAgICB9LCB0aGlzKTtcbiAgICAgIHBhcnQuX3NlbmQoY2xpZW50KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGUgdGhlIGFjdHVhbCBzZW5kaW5nLlxuICAgKlxuICAgKiBsYXllci5NZXNzYWdlLnNlbmQgaGFzIHNvbWUgcG90ZW50aWFsbHkgYXN5bmNocm9ub3VzXG4gICAqIHByZXByb2Nlc3NpbmcgdG8gZG8gYmVmb3JlIHNlbmRpbmcgKFJpY2ggQ29udGVudCk7IGFjdHVhbCBzZW5kaW5nXG4gICAqIGlzIGRvbmUgaGVyZS5cbiAgICpcbiAgICogQG1ldGhvZCBfc2VuZFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3NlbmQoZGF0YSkge1xuICAgIGNvbnN0IGNsaWVudCA9IHRoaXMuZ2V0Q2xpZW50KCk7XG4gICAgY29uc3QgY29udmVyc2F0aW9uID0gdGhpcy5nZXRDb252ZXJzYXRpb24oKTtcblxuICAgIHRoaXMuc2VudEF0ID0gbmV3IERhdGUoKTtcbiAgICBjbGllbnQuc2VuZFNvY2tldFJlcXVlc3Qoe1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICBib2R5OiAoKSA9PiB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgbWV0aG9kOiAnTWVzc2FnZS5jcmVhdGUnLFxuICAgICAgICAgIG9iamVjdF9pZDogY29udmVyc2F0aW9uLmlkLFxuICAgICAgICAgIGRhdGEsXG4gICAgICAgIH07XG4gICAgICB9LFxuICAgICAgc3luYzoge1xuICAgICAgICBkZXBlbmRzOiBbdGhpcy5jb252ZXJzYXRpb25JZCwgdGhpcy5pZF0sXG4gICAgICAgIHRhcmdldDogdGhpcy5pZCxcbiAgICAgIH0sXG4gICAgfSwgKHN1Y2Nlc3MsIHNvY2tldERhdGEpID0+IHRoaXMuX3NlbmRSZXN1bHQoc3VjY2Vzcywgc29ja2V0RGF0YSkpO1xuICB9XG5cbiAgLyoqXG4gICAgKiBsYXllci5NZXNzYWdlLnNlbmQoKSBTdWNjZXNzIENhbGxiYWNrLlxuICAgICpcbiAgICAqIElmIHN1Y2Nlc3NmdWxseSBzZW5kaW5nIHRoZSBtZXNzYWdlOyB0cmlnZ2VycyBhICdzZW50JyBldmVudCxcbiAgICAqIGFuZCB1cGRhdGVzIHRoZSBtZXNzYWdlLmlkL3VybFxuICAgICpcbiAgICAqIEBtZXRob2QgX3NlbmRSZXN1bHRcbiAgICAqIEBwcml2YXRlXG4gICAgKiBAcGFyYW0ge09iamVjdH0gbWVzc2FnZURhdGEgLSBTZXJ2ZXIgZGVzY3JpcHRpb24gb2YgdGhlIG1lc3NhZ2VcbiAgICAqL1xuICBfc2VuZFJlc3VsdCh7IHN1Y2Nlc3MsIGRhdGEgfSkge1xuICAgIGlmICh0aGlzLmlzRGVzdHJveWVkKSByZXR1cm47XG5cbiAgICBpZiAoc3VjY2Vzcykge1xuICAgICAgdGhpcy5fcG9wdWxhdGVGcm9tU2VydmVyKGRhdGEpO1xuICAgICAgdGhpcy5fdHJpZ2dlckFzeW5jKCdtZXNzYWdlczpzZW50Jyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudHJpZ2dlcignbWVzc2FnZXM6c2VudC1lcnJvcicsIHsgZXJyb3I6IGRhdGEgfSk7XG4gICAgICB0aGlzLmRlc3Ryb3koKTtcbiAgICB9XG4gICAgdGhpcy5fc2V0U3luY2VkKCk7XG4gIH1cblxuICAvKipcbiAgICAgKiBTdGFuZGFyZCBgb24oKWAgcHJvdmlkZWQgYnkgbGF5ZXIuUm9vdC5cbiAgICAgKlxuICAgICAqIEFkZHMgc29tZSBzcGVjaWFsIGhhbmRsaW5nIG9mICdtZXNzYWdlczpsb2FkZWQnIHNvIHRoYXQgY2FsbHMgc3VjaCBhc1xuICAgICAqXG4gICAgICogICAgICB2YXIgbSA9IGNsaWVudC5nZXRNZXNzYWdlKCdsYXllcjovLy9tZXNzYWdlcy8xMjMnLCB0cnVlKVxuICAgICAqICAgICAgLm9uKCdtZXNzYWdlczpsb2FkZWQnLCBmdW5jdGlvbigpIHtcbiAgICAgKiAgICAgICAgICBteXJlcmVuZGVyKG0pO1xuICAgICAqICAgICAgfSk7XG4gICAgICogICAgICBteXJlbmRlcihtKTsgLy8gcmVuZGVyIGEgcGxhY2Vob2xkZXIgZm9yIG0gdW50aWwgdGhlIGRldGFpbHMgb2YgbSBoYXZlIGxvYWRlZFxuICAgICAqXG4gICAgICogY2FuIGZpcmUgdGhlaXIgY2FsbGJhY2sgcmVnYXJkbGVzcyBvZiB3aGV0aGVyIHRoZSBjbGllbnQgbG9hZHMgb3IgaGFzXG4gICAgICogYWxyZWFkeSBsb2FkZWQgdGhlIE1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBAbWV0aG9kIG9uXG4gICAgICogQHBhcmFtICB7c3RyaW5nfSBldmVudE5hbWVcbiAgICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZXZlbnRIYW5kbGVyXG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBjb250ZXh0XG4gICAgICogQHJldHVybiB7bGF5ZXIuTWVzc2FnZX0gdGhpc1xuICAgICAqL1xuICBvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgIGNvbnN0IGhhc0xvYWRlZEV2dCA9IG5hbWUgPT09ICdtZXNzYWdlczpsb2FkZWQnIHx8XG4gICAgICBuYW1lICYmIHR5cGVvZiBuYW1lID09PSAnb2JqZWN0JyAmJiBuYW1lWydtZXNzYWdlczpsb2FkZWQnXTtcblxuICAgIGlmIChoYXNMb2FkZWRFdnQgJiYgIXRoaXMuaXNMb2FkaW5nKSB7XG4gICAgICBjb25zdCBjYWxsTm93ID0gbmFtZSA9PT0gJ21lc3NhZ2VzOmxvYWRlZCcgPyBjYWxsYmFjayA6IG5hbWVbJ21lc3NhZ2VzOmxvYWRlZCddO1xuICAgICAgVXRpbC5kZWZlcigoKSA9PiBjYWxsTm93LmFwcGx5KGNvbnRleHQpKTtcbiAgICB9XG4gICAgc3VwZXIub24obmFtZSwgY2FsbGJhY2ssIGNvbnRleHQpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIERlbGV0ZSB0aGUgTWVzc2FnZSBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqIFRoaXMgY2FsbCB3aWxsIHN1cHBvcnQgdmFyaW91cyBkZWxldGlvbiBtb2Rlcy4gIENhbGxpbmcgd2l0aG91dCBhIGRlbGV0aW9uIG1vZGUgaXMgZGVwcmVjYXRlZC5cbiAgICpcbiAgICogRGVsZXRpb24gTW9kZXM6XG4gICAqXG4gICAqICogbGF5ZXIuQ29uc3RhbnRzLkRFTEVUSU9OX01PREUuQUxMOiBUaGlzIGRlbGV0ZXMgdGhlIGxvY2FsIGNvcHkgaW1tZWRpYXRlbHksIGFuZCBhdHRlbXB0cyB0byBhbHNvXG4gICAqICAgZGVsZXRlIHRoZSBzZXJ2ZXIncyBjb3B5LlxuICAgKlxuICAgKiBAbWV0aG9kIGRlbGV0ZVxuICAgKiBAcGFyYW0ge251bWJlcn0gZGVsZXRpb25Nb2RlIC0gbGF5ZXIuQ29uc3RhbnRzLkRFTEVUSU9OX01PREUuQUxMIGlzIG9ubHkgc3VwcG9ydGVkIG1vZGUgYXQgdGhpcyB0aW1lXG4gICAqL1xuICBkZWxldGUobW9kZSkge1xuICAgIGlmICh0aGlzLmlzRGVzdHJveWVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoTGF5ZXJFcnJvci5kaWN0aW9uYXJ5LmlzRGVzdHJveWVkKTtcbiAgICB9XG5cbiAgICBjb25zdCBtb2RlVmFsdWUgPSAndHJ1ZSc7XG4gICAgaWYgKG1vZGUgPT09IHRydWUpIHtcbiAgICAgIGxvZ2dlci53YXJuKCdDYWxsaW5nIE1lc3NhZ2UuZGVsZXRlIHdpdGhvdXQgYSBtb2RlIGlzIGRlcHJlY2F0ZWQnKTtcbiAgICAgIG1vZGUgPSBDb25zdGFudHMuREVMRVRJT05fTU9ERS5BTEw7XG4gICAgfVxuICAgIGlmICghbW9kZSB8fCBtb2RlICE9PSBDb25zdGFudHMuREVMRVRJT05fTU9ERS5BTEwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihMYXllckVycm9yLmRpY3Rpb25hcnkuZGVsZXRpb25Nb2RlVW5zdXBwb3J0ZWQpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnN5bmNTdGF0ZSAhPT0gQ29uc3RhbnRzLlNZTkNfU1RBVEUuTkVXKSB7XG4gICAgICBjb25zdCBpZCA9IHRoaXMuaWQ7XG4gICAgICBjb25zdCBjbGllbnQgPSB0aGlzLmdldENsaWVudCgpO1xuICAgICAgdGhpcy5feGhyKHtcbiAgICAgICAgdXJsOiAnP2Rlc3Ryb3k9JyArIG1vZGVWYWx1ZSxcbiAgICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgIH0sIHJlc3VsdCA9PiB7XG4gICAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIE1lc3NhZ2UubG9hZChpZCwgY2xpZW50KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMuX2RlbGV0ZWQoKTtcbiAgICB0aGlzLmRlc3Ryb3koKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBNZXNzYWdlIGhhcyBiZWVuIGRlbGV0ZWQuXG4gICAqXG4gICAqIENhbGxlZCBmcm9tIGxheWVyLldlYnNvY2tldHMuQ2hhbmdlTWFuYWdlciBhbmQgZnJvbSBsYXllci5NZXNzYWdlLmRlbGV0ZSgpO1xuICAgKlxuICAgKiBEZXN0cm95IG11c3QgYmUgY2FsbGVkIHNlcGFyYXRlbHksIGFuZCBoYW5kbGVzIG1vc3QgY2xlYW51cC5cbiAgICpcbiAgICogQG1ldGhvZCBfZGVsZXRlZFxuICAgKiBAcHJvdGVjdGVkXG4gICAqL1xuICBfZGVsZXRlZCgpIHtcbiAgICB0aGlzLnRyaWdnZXIoJ21lc3NhZ2VzOmRlbGV0ZScpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSB0aGlzIE1lc3NhZ2UgZnJvbSB0aGUgc3lzdGVtLlxuICAgKlxuICAgKiBUaGlzIHdpbGwgZGVyZWdpc3RlciB0aGUgTWVzc2FnZSwgcmVtb3ZlIGFsbCBldmVudHNcbiAgICogYW5kIGFsbG93IGdhcmJhZ2UgY29sbGVjdGlvbi5cbiAgICpcbiAgICogQG1ldGhvZCBkZXN0cm95XG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuZ2V0Q2xpZW50KCkuX3JlbW92ZU1lc3NhZ2UodGhpcyk7XG4gICAgdGhpcy5wYXJ0cy5mb3JFYWNoKHBhcnQgPT4gcGFydC5kZXN0cm95KCkpO1xuICAgIHRoaXMuX19wYXJ0cyA9IG51bGw7XG5cbiAgICBzdXBlci5kZXN0cm95KCk7XG4gIH1cblxuICAvKipcbiAgICogUG9wdWxhdGVzIHRoaXMgaW5zdGFuY2Ugd2l0aCB0aGUgZGVzY3JpcHRpb24gZnJvbSB0aGUgc2VydmVyLlxuICAgKlxuICAgKiBDYW4gYmUgdXNlZCBmb3IgY3JlYXRpbmcgb3IgZm9yIHVwZGF0aW5nIHRoZSBpbnN0YW5jZS5cbiAgICpcbiAgICogQG1ldGhvZCBfcG9wdWxhdGVGcm9tU2VydmVyXG4gICAqIEBwcm90ZWN0ZWRcbiAgICogQHBhcmFtICB7T2JqZWN0fSBtIC0gU2VydmVyIGRlc2NyaXB0aW9uIG9mIHRoZSBtZXNzYWdlXG4gICAqL1xuICBfcG9wdWxhdGVGcm9tU2VydmVyKG1lc3NhZ2UpIHtcbiAgICBjb25zdCB0ZW1wSWQgPSB0aGlzLmlkO1xuICAgIHRoaXMuaWQgPSBtZXNzYWdlLmlkO1xuICAgIHRoaXMudXJsID0gbWVzc2FnZS51cmw7XG4gICAgdGhpcy5wb3NpdGlvbiA9IG1lc3NhZ2UucG9zaXRpb247XG5cbiAgICAvLyBBc3NpZ24gSURzIHRvIHByZWV4aXN0aW5nIFBhcnRzIHNvIHRoYXQgd2UgY2FuIGNhbGwgZ2V0UGFydEJ5SWQoKVxuICAgIGlmICh0aGlzLnBhcnRzKSB7XG4gICAgICB0aGlzLnBhcnRzLmZvckVhY2goKHBhcnQsIGluZGV4KSA9PiB7XG4gICAgICAgIGlmICghcGFydC5pZCkgcGFydC5pZCA9IGAke3RoaXMuaWR9L3BhcnRzLyR7aW5kZXh9YDtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMucGFydHMgPSBtZXNzYWdlLnBhcnRzLm1hcChwYXJ0ID0+IHtcbiAgICAgIGNvbnN0IGV4aXN0aW5nUGFydCA9IHRoaXMuZ2V0UGFydEJ5SWQocGFydC5pZCk7XG4gICAgICBpZiAoZXhpc3RpbmdQYXJ0KSB7XG4gICAgICAgIGV4aXN0aW5nUGFydC5fcG9wdWxhdGVGcm9tU2VydmVyKHBhcnQpO1xuICAgICAgICByZXR1cm4gZXhpc3RpbmdQYXJ0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIE1lc3NhZ2VQYXJ0Ll9jcmVhdGVGcm9tU2VydmVyKHBhcnQpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5yZWNpcGllbnRTdGF0dXMgPSBtZXNzYWdlLnJlY2lwaWVudF9zdGF0dXMgfHwge307XG5cbiAgICB0aGlzLmlzUmVhZCA9ICFtZXNzYWdlLmlzX3VucmVhZDtcblxuICAgIHRoaXMuc2VudEF0ID0gbmV3IERhdGUobWVzc2FnZS5zZW50X2F0KTtcbiAgICB0aGlzLnJlY2VpdmVkQXQgPSBtZXNzYWdlLnJlY2VpdmVkX2F0ID8gbmV3IERhdGUobWVzc2FnZS5yZWNlaXZlZF9hdCkgOiB1bmRlZmluZWQ7XG5cbiAgICB0aGlzLnNlbmRlciA9IHtcbiAgICAgIHVzZXJJZDogbWVzc2FnZS5zZW5kZXIudXNlcl9pZCB8fCAnJyxcbiAgICAgIG5hbWU6IG1lc3NhZ2Uuc2VuZGVyLm5hbWUgfHwgJycsXG4gICAgfTtcblxuICAgIHRoaXMuX3NldFN5bmNlZCgpO1xuXG4gICAgaWYgKHRlbXBJZCAmJiB0ZW1wSWQgIT09IHRoaXMuaWQpIHtcbiAgICAgIHRoaXMuX3RlbXBJZCA9IHRlbXBJZDtcbiAgICAgIHRoaXMuZ2V0Q2xpZW50KCkuX3VwZGF0ZU1lc3NhZ2VJZCh0aGlzLCB0ZW1wSWQpO1xuICAgICAgdGhpcy5fdHJpZ2dlckFzeW5jKCdtZXNzYWdlczpjaGFuZ2UnLCB7XG4gICAgICAgIG9sZFZhbHVlOiB0ZW1wSWQsXG4gICAgICAgIG5ld1ZhbHVlOiB0aGlzLmlkLFxuICAgICAgICBwcm9wZXJ0eTogJ2lkJyxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBNZXNzYWdlJ3MgbGF5ZXIuTWVzc2FnZVBhcnQgd2l0aCB0aGUgc3BlY2lmaWVkIHRoZSBwYXJ0IElELlxuICAgKlxuICAgKiBAbWV0aG9kIGdldFBhcnRCeUlkXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJ0SWRcbiAgICogQHJldHVybiB7bGF5ZXIuTWVzc2FnZVBhcnR9XG4gICAqL1xuICBnZXRQYXJ0QnlJZChwYXJ0SWQpIHtcbiAgICByZXR1cm4gdGhpcy5wYXJ0cyA/IHRoaXMucGFydHMuZmlsdGVyKHBhcnQgPT4gcGFydC5pZCA9PT0gcGFydElkKVswXSA6IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogQWNjZXB0cyBqc29uLXBhdGNoIG9wZXJhdGlvbnMgZm9yIG1vZGlmeWluZyByZWNpcGllbnRTdGF0dXMuXG4gICAqXG4gICAqIEBtZXRob2QgX2hhbmRsZVBhdGNoRXZlbnRcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtICB7T2JqZWN0W119IGRhdGEgLSBBcnJheSBvZiBvcGVyYXRpb25zXG4gICAqL1xuICBfaGFuZGxlUGF0Y2hFdmVudChuZXdWYWx1ZSwgb2xkVmFsdWUsIHBhdGhzKSB7XG4gICAgdGhpcy5faW5MYXllclBhcnNlciA9IGZhbHNlO1xuICAgIGlmIChwYXRoc1swXS5pbmRleE9mKCdyZWNpcGllbnRfc3RhdHVzJykgPT09IDApIHtcbiAgICAgIHRoaXMuX191cGRhdGVSZWNpcGllbnRTdGF0dXModGhpcy5yZWNpcGllbnRTdGF0dXMsIG9sZFZhbHVlKTtcbiAgICB9XG4gICAgdGhpcy5faW5MYXllclBhcnNlciA9IHRydWU7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBBbnkgeGhyIG1ldGhvZCBjYWxsZWQgb24gdGhpcyBtZXNzYWdlIHVzZXMgdGhlIG1lc3NhZ2UncyB1cmwuXG4gICAqXG4gICAqIEZvciBtb3JlIGluZm8gb24geGhyIG1ldGhvZCBwYXJhbWV0ZXJzIHNlZSB7QGxpbmsgbGF5ZXIuQ2xpZW50QXV0aGVudGljYXRvciN4aHJ9XG4gICAqXG4gICAqIEBtZXRob2QgX3hoclxuICAgKiBAcHJvdGVjdGVkXG4gICAqIEByZXR1cm4ge2xheWVyLk1lc3NhZ2V9IHRoaXNcbiAgICovXG4gIF94aHIob3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAvLyBpbml0aWFsaXplXG4gICAgbGV0IGluVXJsID0gb3B0aW9ucy51cmw7XG4gICAgY29uc3QgY2xpZW50ID0gdGhpcy5nZXRDbGllbnQoKTtcbiAgICBjb25zdCBjb252ZXJzYXRpb24gPSB0aGlzLmdldENvbnZlcnNhdGlvbigpO1xuXG4gICAgLy8gVmFsaWRhdGF0aW9uXG4gICAgaWYgKHRoaXMuaXNEZXN0cm95ZWQpIHRocm93IG5ldyBFcnJvcihMYXllckVycm9yLmRpY3Rpb25hcnkuaXNEZXN0cm95ZWQpO1xuICAgIGlmICghKCd1cmwnIGluIG9wdGlvbnMpKSB0aHJvdyBuZXcgRXJyb3IoTGF5ZXJFcnJvci5kaWN0aW9uYXJ5LnVybFJlcXVpcmVkKTtcbiAgICBpZiAoIWNvbnZlcnNhdGlvbikgdGhyb3cgbmV3IEVycm9yKExheWVyRXJyb3IuZGljdGlvbmFyeS5jb252ZXJzYXRpb25NaXNzaW5nKTtcblxuICAgIGlmIChpblVybCAmJiAhaW5VcmwubWF0Y2goL14oXFwvfFxcPykvKSkgb3B0aW9ucy51cmwgPSBpblVybCA9ICcvJyArIG9wdGlvbnMudXJsO1xuXG4gICAgLy8gU2V0dXAgc3luYyBzdHJ1Y3R1cmVcbiAgICBvcHRpb25zLnN5bmMgPSB0aGlzLl9zZXR1cFN5bmNPYmplY3Qob3B0aW9ucy5zeW5jKTtcblxuICAgIC8vIFNldHVwIHRoZSB1cmwgaW4gY2FzZSBpdHMgbm90IHlldCBrbm93blxuICAgIGNvbnN0IGdldFVybCA9IGZ1bmN0aW9uIGdldFVybCgpIHtcbiAgICAgIHJldHVybiB0aGlzLnVybCArIChpblVybCB8fCAnJyk7XG4gICAgfS5iaW5kKHRoaXMpO1xuXG4gICAgaWYgKHRoaXMudXJsKSB7XG4gICAgICBvcHRpb25zLnVybCA9IGdldFVybCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb25zLnVybCA9IGdldFVybDtcbiAgICB9XG5cbiAgICBjbGllbnQueGhyKG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIF9zZXR1cFN5bmNPYmplY3Qoc3luYykge1xuICAgIGlmIChzeW5jICE9PSBmYWxzZSkge1xuICAgICAgaWYgKCFzeW5jKSBzeW5jID0ge307XG4gICAgICBpZiAoIXN5bmMudGFyZ2V0KSBzeW5jLnRhcmdldCA9IHRoaXMuaWQ7XG4gICAgICBpZiAoIXN5bmMuZGVwZW5kcykge1xuICAgICAgICBzeW5jLmRlcGVuZHMgPSBbdGhpcy5jb252ZXJzYXRpb25JZF07XG4gICAgICB9IGVsc2UgaWYgKHN5bmMuZGVwZW5kcy5pbmRleE9mKHRoaXMuaWQpID09PSAtMSkge1xuICAgICAgICBzeW5jLmRlcGVuZHMucHVzaCh0aGlzLmNvbnZlcnNhdGlvbklkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHN5bmM7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBHZXQgYWxsIHRleHQgcGFydHMgb2YgdGhlIE1lc3NhZ2UuXG4gICAqXG4gICAqIFV0aWxpdHkgbWV0aG9kIGZvciBleHRyYWN0aW5nIGFsbCBvZiB0aGUgdGV4dC9wbGFpbiBwYXJ0c1xuICAgKiBhbmQgY29uY2F0ZW5hdGluZyBhbGwgb2YgdGhlaXIgYm9keXMgdG9nZXRoZXIgaW50byBhIHNpbmdsZSBzdHJpbmcuXG4gICAqXG4gICAqIEBtZXRob2QgZ2V0VGV4dFxuICAgKiBAcGFyYW0ge3N0cmluZ30gW2pvaW5TdHI9Jy4gICddIElmIG11bHRpcGxlIG1lc3NhZ2UgcGFydHMgb2YgdHlwZSB0ZXh0L3BsYWluLCBob3cgZG8geW91IHdhbnQgdGhlbSBqb2luZWQgdG9nZXRoZXI/XG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICovXG4gIGdldFRleHQoam9pblN0ciA9ICcuICcpIHtcbiAgICBsZXQgdGV4dEFycmF5ID0gdGhpcy5wYXJ0c1xuICAgICAgLmZpbHRlcihwYXJ0ID0+IHBhcnQubWltZVR5cGUgPT09ICd0ZXh0L3BsYWluJylcbiAgICAgIC5tYXAocGFydCA9PiBwYXJ0LmJvZHkpO1xuICAgIHRleHRBcnJheSA9IHRleHRBcnJheS5maWx0ZXIoZGF0YSA9PiBkYXRhKTtcbiAgICByZXR1cm4gdGV4dEFycmF5LmpvaW4oam9pblN0cik7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIHBsYWluIG9iamVjdC5cbiAgICpcbiAgICogT2JqZWN0IHdpbGwgaGF2ZSBhbGwgdGhlIHNhbWUgcHVibGljIHByb3BlcnRpZXMgYXMgdGhpc1xuICAgKiBNZXNzYWdlIGluc3RhbmNlLiAgTmV3IG9iamVjdCBpcyByZXR1cm5lZCBhbnkgdGltZVxuICAgKiBhbnkgb2YgdGhpcyBvYmplY3QncyBwcm9wZXJ0aWVzIGNoYW5nZS5cbiAgICpcbiAgICogQG1ldGhvZCB0b09iamVjdFxuICAgKiBAcmV0dXJuIHtPYmplY3R9IFBPSk8gdmVyc2lvbiBvZiB0aGlzIG9iamVjdC5cbiAgICovXG4gIHRvT2JqZWN0KCkge1xuICAgIGlmICghdGhpcy5fdG9PYmplY3QpIHtcbiAgICAgIHRoaXMuX3RvT2JqZWN0ID0gc3VwZXIudG9PYmplY3QoKTtcbiAgICAgIHRoaXMuX3RvT2JqZWN0LnJlY2lwaWVudFN0YXR1cyA9IFV0aWwuY2xvbmUodGhpcy5yZWNpcGllbnRTdGF0dXMpO1xuICAgICAgdGhpcy5fdG9PYmplY3QuaXNOZXcgPSB0aGlzLmlzTmV3KCk7XG4gICAgICB0aGlzLl90b09iamVjdC5pc1NhdmluZyA9IHRoaXMuaXNTYXZpbmcoKTtcbiAgICAgIHRoaXMuX3RvT2JqZWN0LmlzU2F2ZWQgPSB0aGlzLmlzU2F2ZWQoKTtcbiAgICAgIHRoaXMuX3RvT2JqZWN0LmlzU3luY2VkID0gdGhpcy5pc1N5bmNlZCgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fdG9PYmplY3Q7XG4gIH1cblxuICBfdHJpZ2dlckFzeW5jKGV2dE5hbWUsIGFyZ3MpIHtcbiAgICB0aGlzLl9jbGVhck9iamVjdCgpO1xuICAgIHN1cGVyLl90cmlnZ2VyQXN5bmMoZXZ0TmFtZSwgYXJncyk7XG4gIH1cblxuICB0cmlnZ2VyKGV2dE5hbWUsIGFyZ3MpIHtcbiAgICB0aGlzLl9jbGVhck9iamVjdCgpO1xuICAgIHN1cGVyLnRyaWdnZXIoZXZ0TmFtZSwgYXJncyk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG1lc3NhZ2UgZnJvbSB0aGUgc2VydmVyJ3MgcmVwcmVzZW50YXRpb24gb2YgYSBtZXNzYWdlLlxuICAgKlxuICAgKiBTaW1pbGFyIHRvIF9wb3B1bGF0ZUZyb21TZXJ2ZXIsIGhvd2V2ZXIsIHRoaXMgbWV0aG9kIHRha2VzIGFcbiAgICogbWVzc2FnZSBkZXNjcmlwdGlvbiBhbmQgcmV0dXJucyBhIG5ldyBtZXNzYWdlIGluc3RhbmNlIHVzaW5nIF9wb3B1bGF0ZUZyb21TZXJ2ZXJcbiAgICogdG8gc2V0dXAgdGhlIHZhbHVlcy5cbiAgICpcbiAgICogQG1ldGhvZCBfY3JlYXRlRnJvbVNlcnZlclxuICAgKiBAcHJvdGVjdGVkXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtICB7T2JqZWN0fSBtZXNzYWdlIC0gU2VydmVyJ3MgcmVwcmVzZW50YXRpb24gb2YgdGhlIG1lc3NhZ2VcbiAgICogQHBhcmFtICB7bGF5ZXIuQ29udmVyc2F0aW9ufSBjb252ZXJzYXRpb24gLSBDb252ZXJzYXRpb24gZm9yIHRoZSBtZXNzYWdlXG4gICAqIEByZXR1cm4ge2xheWVyLk1lc3NhZ2V9XG4gICAqL1xuICBzdGF0aWMgX2NyZWF0ZUZyb21TZXJ2ZXIobWVzc2FnZSwgY29udmVyc2F0aW9uKSB7XG4gICAgaWYgKCEoY29udmVyc2F0aW9uIGluc3RhbmNlb2YgUm9vdCkpIHRocm93IG5ldyBFcnJvcihMYXllckVycm9yLmRpY3Rpb25hcnkuY29udmVyc2F0aW9uTWlzc2luZyk7XG5cbiAgICBjb25zdCBjbGllbnQgPSBjb252ZXJzYXRpb24uZ2V0Q2xpZW50KCk7XG4gICAgY29uc3QgZm91bmQgPSBjbGllbnQuZ2V0TWVzc2FnZShtZXNzYWdlLmlkKTtcbiAgICBsZXQgbmV3TWVzc2FnZTtcbiAgICBpZiAoZm91bmQpIHtcbiAgICAgIG5ld01lc3NhZ2UgPSBmb3VuZDtcbiAgICAgIG5ld01lc3NhZ2UuX3BvcHVsYXRlRnJvbVNlcnZlcihtZXNzYWdlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZnJvbVdlYnNvY2tldCA9IG1lc3NhZ2UuZnJvbVdlYnNvY2tldDtcbiAgICAgIG5ld01lc3NhZ2UgPSBuZXcgTWVzc2FnZSh7XG4gICAgICAgIGZyb21TZXJ2ZXI6IG1lc3NhZ2UsXG4gICAgICAgIGNvbnZlcnNhdGlvbklkOiBjb252ZXJzYXRpb24uaWQsXG4gICAgICAgIGNsaWVudElkOiBjbGllbnQuYXBwSWQsXG4gICAgICAgIF9ub3RpZnk6IGZyb21XZWJzb2NrZXQgJiYgbWVzc2FnZS5pc191bnJlYWQgJiYgbWVzc2FnZS5zZW5kZXIudXNlcl9pZCAhPT0gY2xpZW50LnVzZXJJZCxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IHN0YXR1cyA9IG5ld01lc3NhZ2UucmVjaXBpZW50U3RhdHVzW2NsaWVudC51c2VySWRdO1xuICAgIGlmIChzdGF0dXMgIT09IENvbnN0YW50cy5SRUNFSVBUX1NUQVRFLlJFQUQgJiYgc3RhdHVzICE9PSBDb25zdGFudHMuUkVDRUlQVF9TVEFURS5ERUxJVkVSRUQpIHtcbiAgICAgIG5ld01lc3NhZ2UuX3NlbmRSZWNlaXB0KCdkZWxpdmVyeScpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBtZXNzYWdlOiBuZXdNZXNzYWdlLFxuICAgICAgbmV3OiAhZm91bmQsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2FkcyB0aGUgc3BlY2lmaWVkIG1lc3NhZ2UgZnJvbSB0aGUgc2VydmVyLlxuICAgKlxuICAgKiBUeXBpY2FsbHkgb25lIHNob3VsZCBjYWxsXG4gICAqXG4gICAqICAgICBjbGllbnQuZ2V0TWVzc2FnZShtZXNzYWdlSWQsIHRydWUpXG4gICAqXG4gICAqIFRoaXMgd2lsbCBnZXQgdGhlIE1lc3NhZ2UgZnJvbSBjYWNoZSBvciBsYXllci5NZXNzYWdlLmxvYWQgaXQgZnJvbSB0aGUgc2VydmVyIGlmIG5vdCBjYWNoZWQuXG4gICAqIFR5cGljYWxseSB5b3UgZG8gbm90IG5lZWQgdG8gY2FsbCB0aGlzIG1ldGhvZCBkaXJlY3RseS5cbiAgICpcbiAgICogQG1ldGhvZCBsb2FkXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtICB7c3RyaW5nfSBpZCAtIE1lc3NhZ2UgaWRlbnRpZmllclxuICAgKiBAcGFyYW0gIHtsYXllci5DbGllbnR9IGNsaWVudCAtIENsaWVudCB3aG9zZSBjb252ZXJzYXRpb25zIHNob3VsZCBjb250YWluIHRoZSBuZXcgbWVzc2FnZVxuICAgKiBAcmV0dXJuIHtsYXllci5NZXNzYWdlfVxuICAgKi9cbiAgc3RhdGljIGxvYWQoaWQsIGNsaWVudCkge1xuICAgIGlmICghY2xpZW50IHx8ICEoY2xpZW50IGluc3RhbmNlb2YgUm9vdCkpIHRocm93IG5ldyBFcnJvcihMYXllckVycm9yLmRpY3Rpb25hcnkuY2xpZW50TWlzc2luZyk7XG4gICAgaWYgKGlkLmluZGV4T2YoJ2xheWVyOi8vL21lc3NhZ2VzLycpICE9PSAwKSB0aHJvdyBuZXcgRXJyb3IoTGF5ZXJFcnJvci5kaWN0aW9uYXJ5LmludmFsaWRJZCk7XG5cbiAgICBjb25zdCBtZXNzYWdlID0gbmV3IE1lc3NhZ2Uoe1xuICAgICAgaWQsXG4gICAgICB1cmw6IGNsaWVudC51cmwgKyBpZC5zdWJzdHJpbmcoOCksXG4gICAgICBjbGllbnRJZDogY2xpZW50LmFwcElkLFxuICAgIH0pO1xuICAgIG1lc3NhZ2Uuc3luY1N0YXRlID0gQ29uc3RhbnRzLlNZTkNfU1RBVEUuTE9BRElORztcbiAgICBjbGllbnQueGhyKHtcbiAgICAgIHVybDogbWVzc2FnZS51cmwsXG4gICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgc3luYzogZmFsc2UsXG4gICAgfSwgKHJlc3VsdCkgPT4gdGhpcy5fbG9hZFJlc3VsdChtZXNzYWdlLCBjbGllbnQsIHJlc3VsdCkpO1xuICAgIHJldHVybiBtZXNzYWdlO1xuICB9XG5cbiAgc3RhdGljIF9sb2FkUmVzdWx0KG1lc3NhZ2UsIGNsaWVudCwgcmVzdWx0KSB7XG4gICAgaWYgKCFyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgbWVzc2FnZS5zeW5jU3RhdGUgPSBDb25zdGFudHMuU1lOQ19TVEFURS5ORVc7XG4gICAgICBtZXNzYWdlLl90cmlnZ2VyQXN5bmMoJ21lc3NhZ2VzOmxvYWRlZC1lcnJvcicsIHsgZXJyb3I6IHJlc3VsdC5kYXRhIH0pO1xuICAgICAgc2V0VGltZW91dCgoKSA9PiBtZXNzYWdlLmRlc3Ryb3koKSwgMTAwKTsgLy8gSW5zdXJlIGRlc3Ryb3llZCBBRlRFUiBsb2FkZWQtZXJyb3IgZXZlbnQgaGFzIHRyaWdnZXJlZFxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9sb2FkU3VjY2VzcyhtZXNzYWdlLCBjbGllbnQsIHJlc3VsdC5kYXRhKTtcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgX2xvYWRTdWNjZXNzKG1lc3NhZ2UsIGNsaWVudCwgcmVzcG9uc2UpIHtcbiAgICBtZXNzYWdlLl9wb3B1bGF0ZUZyb21TZXJ2ZXIocmVzcG9uc2UpO1xuICAgIG1lc3NhZ2UuY29udmVyc2F0aW9uSWQgPSByZXNwb25zZS5jb252ZXJzYXRpb24uaWQ7XG4gICAgbWVzc2FnZS5fdHJpZ2dlckFzeW5jKCdtZXNzYWdlczpsb2FkZWQnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJZGVudGlmaWVzIHdoZXRoZXIgYSBNZXNzYWdlIHJlY2VpdmluZyB0aGUgc3BlY2lmaWVkIHBhdGNoIGRhdGEgc2hvdWxkIGJlIGxvYWRlZCBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqIEFwcGxpZXMgb25seSB0byBNZXNzYWdlcyB0aGF0IGFyZW4ndCBhbHJlYWR5IGxvYWRlZDsgdXNlZCB0byBpbmRpY2F0ZSBpZiBhIGNoYW5nZSBldmVudCBpc1xuICAgKiBzaWduaWZpY2FudCBlbm91Z2ggdG8gbG9hZCB0aGUgTWVzc2FnZSBhbmQgdHJpZ2dlciBjaGFuZ2UgZXZlbnRzIG9uIHRoYXQgTWVzc2FnZS5cbiAgICpcbiAgICogQXQgdGhpcyB0aW1lIHRoZXJlIGFyZSBubyBwcm9wZXJ0aWVzIHRoYXQgYXJlIHBhdGNoZWQgb24gTWVzc2FnZXMgdmlhIHdlYnNvY2tldHNcbiAgICogdGhhdCB3b3VsZCBqdXN0aWZ5IGxvYWRpbmcgdGhlIE1lc3NhZ2UgZnJvbSB0aGUgc2VydmVyIHNvIGFzIHRvIG5vdGlmeSB0aGUgYXBwLlxuICAgKlxuICAgKiBPbmx5IHJlY2lwaWVudCBzdGF0dXMgY2hhbmdlcyBhbmQgbWF5YmUgaXNfdW5yZWFkIGNoYW5nZXMgYXJlIHNlbnQ7XG4gICAqIG5laXRoZXIgb2Ygd2hpY2ggYXJlIHJlbGV2YW50IHRvIGFuIGFwcCB0aGF0IGlzbid0IHJlbmRlcmluZyB0aGF0IG1lc3NhZ2UuXG4gICAqXG4gICAqIEBtZXRob2QgX2xvYWRSZXNvdXJjZUZvclBhdGNoXG4gICAqIEBzdGF0aWNcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHN0YXRpYyBfbG9hZFJlc291cmNlRm9yUGF0Y2gocGF0Y2hEYXRhKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogQ2xpZW50IHRoYXQgdGhlIE1lc3NhZ2UgYmVsb25ncyB0by5cbiAqXG4gKiBBY3R1YWwgdmFsdWUgb2YgdGhpcyBzdHJpbmcgbWF0Y2hlcyB0aGUgYXBwSWQuXG4gKiBAdHlwZSB7c3RyaW5nfVxuICovXG5NZXNzYWdlLnByb3RvdHlwZS5jbGllbnRJZCA9ICcnO1xuXG4vKipcbiAqIENvbnZlcnNhdGlvbiB0aGF0IHRoaXMgTWVzc2FnZSBiZWxvbmdzIHRvLlxuICpcbiAqIEFjdHVhbCB2YWx1ZSBpcyB0aGUgSUQgb2YgdGhlIENvbnZlcnNhdGlvbidzIElELlxuICpcbiAqIEB0eXBlIHtzdHJpbmd9XG4gKi9cbk1lc3NhZ2UucHJvdG90eXBlLmNvbnZlcnNhdGlvbklkID0gJyc7XG5cbi8qKlxuICogQXJyYXkgb2YgbGF5ZXIuTWVzc2FnZVBhcnQgb2JqZWN0c1xuICpcbiAqIEB0eXBlIHtsYXllci5NZXNzYWdlUGFydFtdfVxuICovXG5NZXNzYWdlLnByb3RvdHlwZS5wYXJ0cyA9IG51bGw7XG5cbi8qKlxuICogTWVzc2FnZSBJZGVudGlmaWVyLlxuICpcbiAqIFRoaXMgdmFsdWUgaXMgc2hhcmVkIGJ5IGFsbCBwYXJ0aWNpcGFudHMgYW5kIGRldmljZXMuXG4gKlxuICogQHR5cGUge1N0cmluZ31cbiAqL1xuTWVzc2FnZS5wcm90b3R5cGUuaWQgPSAnJztcblxuLyoqXG4gKiBVUkwgdG8gdGhlIHNlcnZlciBlbmRwb2ludCBmb3Igb3BlcmF0aW5nIG9uIHRoZSBtZXNzYWdlLlxuICogQHR5cGUge1N0cmluZ31cbiAqL1xuTWVzc2FnZS5wcm90b3R5cGUudXJsID0gJyc7XG5cbi8qKlxuICogVGltZSB0aGF0IHRoZSBtZXNzYWdlIHdhcyBzZW50LlxuICogQHR5cGUge0RhdGV9XG4gKi9cbk1lc3NhZ2UucHJvdG90eXBlLnNlbnRBdCA9IG51bGw7XG5cbi8qKlxuICogVGltZSB0aGF0IHRoZSBmaXJzdCBkZWxpdmVyeSByZWNlaXB0IHdhcyBzZW50IGJ5IHlvdXJcbiAqIHVzZXIgYWNrbm93bGVkZ2luZyByZWNlaXB0IG9mIHRoZSBtZXNzYWdlLlxuICogQHR5cGUge0RhdGV9XG4gKi9cbk1lc3NhZ2UucHJvdG90eXBlLnJlY2VpdmVkQXQgPSBudWxsO1xuXG4vKipcbiAqIE9iamVjdCByZXByZXNlbnRpbmcgdGhlIHNlbmRlciBvZiB0aGUgTWVzc2FnZS5cbiAqXG4gKiBDb250YWlucyBgdXNlcklkYCBwcm9wZXJ0eSB3aGljaCBpc1xuICogcG9wdWxhdGVkIHdoZW4gdGhlIG1lc3NhZ2Ugd2FzIHNlbnQgYnkgYSBwYXJ0aWNpcGFudCAob3IgZm9ybWVyIHBhcnRpY2lwYW50KVxuICogaW4gdGhlIENvbnZlcnNhdGlvbi4gIENvbnRhaW5zIGEgYG5hbWVgIHByb3BlcnR5IHdoaWNoIGlzXG4gKiB1c2VkIHdoZW4gdGhlIE1lc3NhZ2UgaXMgc2VudCB2aWEgYSBOYW1lZCBQbGF0Zm9ybSBBUEkgc2VuZGVyXG4gKiBzdWNoIGFzIFwiQWRtaW5cIiwgXCJNb2RlcmF0b3JcIiwgXCJSb2JvdCBKZXJraW5nIHlvdSBBcm91bmRcIi5cbiAqXG4gKiAgICAgIDxzcGFuIGNsYXNzPSdzZW50LWJ5Jz5cbiAqICAgICAgICB7bWVzc2FnZS5zZW5kZXIubmFtZSB8fCBnZXREaXNwbGF5TmFtZUZvcklkKG1lc3NhZ2Uuc2VuZGVyLnVzZXJJZCl9XG4gKiAgICAgIDwvc3Bhbj5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG5NZXNzYWdlLnByb3RvdHlwZS5zZW5kZXIgPSBudWxsO1xuXG4vKipcbiAqIFBvc2l0aW9uIG9mIHRoaXMgbWVzc2FnZSB3aXRoaW4gdGhlIGNvbnZlcnNhdGlvbi5cbiAqXG4gKiBOT1RFUzpcbiAqXG4gKiAxLiBEZWxldGluZyBhIG1lc3NhZ2UgZG9lcyBub3QgYWZmZWN0IHBvc2l0aW9uIG9mIG90aGVyIE1lc3NhZ2VzLlxuICogMi4gQSBwb3NpdGlvbiBpcyBub3QgZ2F1cmVudGVlZCB0byBiZSB1bmlxdWUgKG11bHRpcGxlIG1lc3NhZ2VzIHNlbnQgYXQgdGhlIHNhbWUgdGltZSBjb3VsZFxuICogYWxsIGNsYWltIHRoZSBzYW1lIHBvc2l0aW9uKVxuICogMy4gRWFjaCBzdWNjZXNzaXZlIG1lc3NhZ2Ugd2l0aGluIGEgY29udmVyc2F0aW9uIHNob3VsZCBleHBlY3QgYSBoaWdoZXIgcG9zaXRpb24uXG4gKlxuICogQHR5cGUge051bWJlcn1cbiAqL1xuTWVzc2FnZS5wcm90b3R5cGUucG9zaXRpb24gPSAwO1xuXG4vKipcbiAqIEhpbnQgdXNlZCBieSBsYXllci5DbGllbnQgb24gd2hldGhlciB0byB0cmlnZ2VyIGEgbWVzc2FnZXM6bm90aWZ5IGV2ZW50LlxuICpcbiAqIEB0eXBlIHtib29sZWFufVxuICogQHByaXZhdGVcbiAqL1xuTWVzc2FnZS5wcm90b3R5cGUuX25vdGlmeSA9IGZhbHNlO1xuXG4vKiBSZWNpcGllbnQgU3RhdHVzICovXG5cbi8qKlxuICogUmVhZC9kZWxpdmVyeSBTdGF0ZSBvZiBhbGwgcGFydGljaXBhbnRzLlxuICpcbiAqIFRoaXMgaXMgYW4gb2JqZWN0IGNvbnRhaW5pbmcga2V5cyBmb3IgZWFjaCBwYXJ0aWNpcGFudCxcbiAqIGFuZCBhIHZhbHVlIG9mOlxuICogKiBsYXllci5SRUNFSVBUX1NUQVRFLlNFTlRcbiAqICogbGF5ZXIuUkVDRUlQVF9TVEFURS5ERUxJVkVSRURcbiAqICogbGF5ZXIuUkVDRUlQVF9TVEFURS5SRUFEXG4gKiAqIGxheWVyLlJFQ0VJUFRfU1RBVEUuUEVORElOR1xuICpcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbk1lc3NhZ2UucHJvdG90eXBlLnJlY2lwaWVudFN0YXR1cyA9IG51bGw7XG5cbi8qKlxuICogVHJ1ZSBpZiB0aGlzIE1lc3NhZ2UgaGFzIGJlZW4gcmVhZCBieSB0aGlzIHVzZXIuXG4gKlxuICogWW91IGNhbiBjaGFuZ2UgaXNSZWFkIHByb2dyYW1hdGljYWxseVxuICpcbiAqICAgICAgbS5pc1JlYWQgPSB0cnVlO1xuICpcbiAqIFRoaXMgd2lsbCBhdXRvbWF0aWNhbGx5IG5vdGlmeSB0aGUgc2VydmVyIHRoYXQgdGhlIG1lc3NhZ2Ugd2FzIHJlYWQgYnkgeW91ciB1c2VyLlxuICogQHR5cGUge0Jvb2xlYW59XG4gKi9cbk1lc3NhZ2UucHJvdG90eXBlLmlzUmVhZCA9IGZhbHNlO1xuXG4vKipcbiAqIFRoaXMgcHJvcGVydHkgaXMgaGVyZSBmb3IgY29udmVuaWVuY2Ugb25seTsgaXQgd2lsbCBhbHdheXMgYmUgdGhlIG9wcG9zaXRlIG9mIGlzUmVhZC5cbiAqIEB0eXBlIHtCb29sZWFufVxuICogQHJlYWRvbmx5XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNZXNzYWdlLnByb3RvdHlwZSwgJ2lzVW5yZWFkJywge1xuICBlbnVtZXJhYmxlOiB0cnVlLFxuICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNSZWFkO1xuICB9LFxufSk7XG5cbi8qKlxuICogSGF2ZSB0aGUgb3RoZXIgcGFydGljaXBhbnRzIHJlYWQgdGhpcyBNZXNzYWdlIHlldC5cbiAqXG4gKiBUaGlzIHZhbHVlIGlzIG9uZSBvZjpcbiAqXG4gKiAgKiBsYXllci5Db25zdGFudHMuUkVDSVBJRU5UX1NUQVRFLkFMTFxuICogICogbGF5ZXIuQ29uc3RhbnRzLlJFQ0lQSUVOVF9TVEFURS5TT01FXG4gKiAgKiBsYXllci5Db25zdGFudHMuUkVDSVBJRU5UX1NUQVRFLk5PTkVcbiAqXG4gKiAgVGhpcyB2YWx1ZSBpcyB1cGRhdGVkIGFueSB0aW1lIHJlY2lwaWVudFN0YXR1cyBjaGFuZ2VzLlxuICpcbiAqIEB0eXBlIHtTdHJpbmd9XG4gKi9cbk1lc3NhZ2UucHJvdG90eXBlLnJlYWRTdGF0dXMgPSBDb25zdGFudHMuUkVDSVBJRU5UX1NUQVRFLk5PTkU7XG5cbi8qKlxuICogSGF2ZSB0aGUgb3RoZXIgcGFydGljaXBhbnRzIHJlY2VpdmVkIHRoaXMgTWVzc2FnZSB5ZXQuXG4gKlxuICAqIFRoaXMgdmFsdWUgaXMgb25lIG9mOlxuICpcbiAqICAqIGxheWVyLkNvbnN0YW50cy5SRUNJUElFTlRfU1RBVEUuQUxMXG4gKiAgKiBsYXllci5Db25zdGFudHMuUkVDSVBJRU5UX1NUQVRFLlNPTUVcbiAqICAqIGxheWVyLkNvbnN0YW50cy5SRUNJUElFTlRfU1RBVEUuTk9ORVxuICpcbiAqICBUaGlzIHZhbHVlIGlzIHVwZGF0ZWQgYW55IHRpbWUgcmVjaXBpZW50U3RhdHVzIGNoYW5nZXMuXG4gKlxuICpcbiAqIEB0eXBlIHtTdHJpbmd9XG4gKi9cbk1lc3NhZ2UucHJvdG90eXBlLmRlbGl2ZXJ5U3RhdHVzID0gQ29uc3RhbnRzLlJFQ0lQSUVOVF9TVEFURS5OT05FO1xuXG5cbi8qKlxuICogQSBsb2NhbGx5IGNyZWF0ZWQgTWVzc2FnZSB3aWxsIGdldCBhIHRlbXBvcmFyeSBJRC5cbiAqXG4gKiBTb21lIG1heSB0cnkgdG8gbG9va3VwIHRoZSBNZXNzYWdlIHVzaW5nIHRoZSB0ZW1wb3JhcnkgSUQgZXZlblxuICogdGhvdWdoIGl0IG1heSBoYXZlIGxhdGVyIHJlY2VpdmVkIGFuIElEIGZyb20gdGhlIHNlcnZlci5cbiAqIEtlZXAgdGhlIHRlbXBvcmFyeSBJRCBzbyB3ZSBjYW4gY29ycmVjdGx5IGluZGV4IGFuZCBjbGVhbnVwLlxuICpcbiAqIEB0eXBlIHtTdHJpbmd9XG4gKiBAcHJpdmF0ZVxuICovXG5NZXNzYWdlLnByb3RvdHlwZS5fdGVtcElkID0gJyc7XG5cbi8qKlxuICogVGhlIHRpbWUgdGhhdCB0aGlzIGNsaWVudCBjcmVhdGVkIHRoaXMgaW5zdGFuY2UuXG4gKiBAdHlwZSB7RGF0ZX1cbiAqL1xuTWVzc2FnZS5wcm90b3R5cGUubG9jYWxDcmVhdGVkQXQgPSBudWxsO1xuXG5NZXNzYWdlLnByb3RvdHlwZS5fdG9PYmplY3QgPSBudWxsO1xuXG5NZXNzYWdlLnByZWZpeFVVSUQgPSAnbGF5ZXI6Ly8vbWVzc2FnZXMvJztcblxuTWVzc2FnZS5pbk9iamVjdElnbm9yZSA9IFN5bmNhYmxlLmluT2JqZWN0SWdub3JlO1xuXG5NZXNzYWdlLmJ1YmJsZUV2ZW50UGFyZW50ID0gJ2dldENsaWVudCc7XG5cbk1lc3NhZ2UuaW1hZ2VUeXBlcyA9IFtcbiAgJ2ltYWdlL2dpZicsXG4gICdpbWFnZS9wbmcnLFxuICAnaW1hZ2UvanBlZycsXG4gICdpbWFnZS9qcGcnLFxuXTtcblxuTWVzc2FnZS5fc3VwcG9ydGVkRXZlbnRzID0gW1xuXG4gIC8qKlxuICAgKiBNZXNzYWdlIGhhcyBiZWVuIGxvYWRlZCBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB0aGlzIGlzIG9ubHkgdXNlZCBpbiByZXNwb25zZSB0byB0aGUgbGF5ZXIuTWVzc2FnZS5sb2FkKCkgbWV0aG9kLlxuICAgKiBAZXZlbnRcbiAgICogQHBhcmFtIHtsYXllci5MYXllckV2ZW50fSBldnRcbiAgICovXG4gICdtZXNzYWdlczpsb2FkZWQnLFxuXG4gIC8qKlxuICAgKiBUaGUgbG9hZCBtZXRob2QgZmFpbGVkIHRvIGxvYWQgdGhlIG1lc3NhZ2UgZnJvbSB0aGUgc2VydmVyLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgdGhpcyBpcyBvbmx5IHVzZWQgaW4gcmVzcG9uc2UgdG8gdGhlIGxheWVyLk1lc3NhZ2UubG9hZCgpIG1ldGhvZC5cbiAgICogQGV2ZW50XG4gICAqIEBwYXJhbSB7bGF5ZXIuTGF5ZXJFdmVudH0gZXZ0XG4gICAqL1xuICAnbWVzc2FnZXM6bG9hZGVkLWVycm9yJyxcblxuICAvKipcbiAgICogTWVzc2FnZSBkZWxldGVkIGZyb20gdGhlIHNlcnZlci5cbiAgICpcbiAgICogQ2F1c2VkIGJ5IGEgY2FsbCB0byBsYXllci5NZXNzYWdlLmRlbGV0ZSgpIG9yIGEgd2Vic29ja2V0IGV2ZW50LlxuICAgKiBAcGFyYW0ge2xheWVyLkxheWVyRXZlbnR9IGV2dFxuICAgKiBAZXZlbnRcbiAgICovXG4gICdtZXNzYWdlczpkZWxldGUnLFxuXG4gIC8qKlxuICAgKiBNZXNzYWdlIGlzIGFib3V0IHRvIGJlIHNlbnQuXG4gICAqXG4gICAqIExhc3QgY2hhbmNlIHRvIG1vZGlmeSBvciB2YWxpZGF0ZSB0aGUgbWVzc2FnZSBwcmlvciB0byBzZW5kaW5nLlxuICAgKlxuICAgKiAgICAgbWVzc2FnZS5vbignbWVzc2FnZXM6c2VuZGluZycsIGZ1bmN0aW9uKGV2dCkge1xuICAgKiAgICAgICAgbWVzc2FnZS5hZGRQYXJ0KHttaW1lVHlwZTogJ2FwcGxpY2F0aW9uL2xvY2F0aW9uJywgYm9keTogSlNPTi5zdHJpbmdpZnkoZ2V0R1BTTG9jYXRpb24oKSl9KTtcbiAgICogICAgIH0pO1xuICAgKlxuICAgKiBUeXBpY2FsbHksIHlvdSB3b3VsZCBsaXN0ZW4gdG8gdGhpcyBldmVudCBtb3JlIGJyb2FkbHkgdXNpbmcgYGNsaWVudC5vbignbWVzc2FnZXM6c2VuZGluZycpYFxuICAgKiB3aGljaCB3b3VsZCB0cmlnZ2VyIGJlZm9yZSBzZW5kaW5nIEFOWSBNZXNzYWdlcy5cbiAgICpcbiAgICogQGV2ZW50XG4gICAqIEBwYXJhbSB7bGF5ZXIuTGF5ZXJFdmVudH0gZXZ0XG4gICAqL1xuICAnbWVzc2FnZXM6c2VuZGluZycsXG5cbiAgLyoqXG4gICAqIE1lc3NhZ2UgaGFzIGJlZW4gcmVjZWl2ZWQgYnkgdGhlIHNlcnZlci5cbiAgICpcbiAgICogSXQgZG9lcyBOT1QgaW5kaWNhdGUgZGVsaXZlcnkgdG8gb3RoZXIgdXNlcnMuXG4gICAqXG4gICAqIEl0IGRvZXMgTk9UIGluZGljYXRlIG1lc3NhZ2VzIHNlbnQgYnkgb3RoZXIgdXNlcnMuXG4gICAqXG4gICAqIEBldmVudFxuICAgKiBAcGFyYW0ge2xheWVyLkxheWVyRXZlbnR9IGV2dFxuICAgKi9cbiAgJ21lc3NhZ2VzOnNlbnQnLFxuXG4gIC8qKlxuICAgKiBTZXJ2ZXIgZmFpbGVkIHRvIHJlY2VpdmUgdGhlIE1lc3NhZ2UuXG4gICAqXG4gICAqIE1lc3NhZ2Ugd2lsbCBiZSBkZWxldGVkIGltbWVkaWF0ZWx5IGFmdGVyIGZpcmluZyB0aGlzIGV2ZW50LlxuICAgKlxuICAgKiBAZXZlbnRcbiAgICogQHBhcmFtIHtsYXllci5MYXllckV2ZW50fSBldnRcbiAgICogQHBhcmFtIHtsYXllci5MYXllckVycm9yfSBldnQuZXJyb3JcbiAgICovXG4gICdtZXNzYWdlczpzZW50LWVycm9yJyxcblxuICAvKipcbiAgICogRmlyZWQgd2hlbiBtZXNzYWdlLmlzUmVhZCBpcyBzZXQgdG8gdHJ1ZS5cbiAgICpcbiAgICogU29tZXRpbWVzIHRoaXMgZXZlbnQgaXMgdHJpZ2dlcmVkIGJ5IG1hcmtpbmcgdGhlIE1lc3NhZ2UgYXMgcmVhZCBsb2NhbGx5OyBzb21ldGltZXMgaXRzIHRyaWdnZXJlZFxuICAgKiBieSB5b3VyIHVzZXIgb24gYSBzZXBhcmF0ZSBkZXZpY2UvYnJvd3NlciBtYXJraW5nIHRoZSBNZXNzYWdlIGFzIHJlYWQgcmVtb3RlbHkuXG4gICAqXG4gICAqIFVzZWZ1bCBpZiB5b3Ugc3R5bGUgdW5yZWFkIG1lc3NhZ2VzIGluIGJvbGQsIGFuZCBuZWVkIGFuIGV2ZW50IHRvIHRlbGwgeW91IHdoZW5cbiAgICogdG8gdW5ib2xkIHRoZSBtZXNzYWdlLlxuICAgKlxuICAgKiBAZXZlbnRcbiAgICogQHBhcmFtIHtsYXllci5MYXllckV2ZW50fSBldnRcbiAgICogQHBhcmFtIHtsYXllci5NZXNzYWdlW119IGV2dC5tZXNzYWdlcyAtIEFycmF5IG9mIG1lc3NhZ2VzIHRoYXQgaGF2ZSBqdXN0IGJlZW4gbWFya2VkIGFzIHJlYWRcbiAgICovXG4gICdtZXNzYWdlczpyZWFkJyxcblxuICAvKipcbiAgICogVGhlIHJlY2lwaWVudFN0YXR1cyBwcm9wZXJ0eSBoYXMgY2hhbmdlZC5cbiAgICpcbiAgICogVGhpcyBoYXBwZW5zIGluIHJlc3BvbnNlIHRvIGFuIHVwZGF0ZVxuICAgKiBmcm9tIHRoZSBzZXJ2ZXIuLi4gYnV0IGlzIGFsc28gY2F1c2VkIGJ5IG1hcmtpbmcgdGhlIGN1cnJlbnQgdXNlciBoYXMgaGF2aW5nIHJlYWRcbiAgICogb3IgcmVjZWl2ZWQgdGhlIG1lc3NhZ2UuXG4gICAqIEBldmVudFxuICAgKiBAcGFyYW0ge2xheWVyLkxheWVyRXZlbnR9IGV2dFxuICAgKi9cbiAgJ21lc3NhZ2VzOmNoYW5nZScsXG5cblxuXS5jb25jYXQoU3luY2FibGUuX3N1cHBvcnRlZEV2ZW50cyk7XG5cblJvb3QuaW5pdENsYXNzLmFwcGx5KE1lc3NhZ2UsIFtNZXNzYWdlLCAnTWVzc2FnZSddKTtcbm1vZHVsZS5leHBvcnRzID0gTWVzc2FnZTtcbiJdfQ==
