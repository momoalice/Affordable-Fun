'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * The Layer Client; this is the top level component for any Layer based application.

    var client = new layer.Client({
      appId: 'layer:///apps/staging/ffffffff-ffff-ffff-ffff-ffffffffffff',
      userId: 'Fred',
      challenge: function(evt) {
        myAuthenticator({
          nonce: evt.nonce,
          onSuccess: evt.callback
        });
      },
      ready: function(client) {
        alert('I am Client; Server: Serve me!');
      }
    });
 *
 * You can also initialize this as

    var client = new layer.Client({
      appId: 'layer:///apps/staging/ffffffff-ffff-ffff-ffff-ffffffffffff',
      userId: 'Fred'
    });

    client.on('challenge', function(evt) {
      myAuthenticator({
        nonce: evt.nonce,
        onSuccess: evt.callback
      });
    });

    client.on('ready', function(client) {
      alert('I am Client; Server: Serve me!');
    });
 *
 * ## API Synopsis:
 *
 * The following Properties, Methods and Events are the most commonly used ones.  See the full API below
 * for the rest of the API.
 *
 * ### Properties:
 *
 * * layer.Client.userId: User ID of the authenticated user
 * * layer.Client.appId: The ID for your application
 *
 *
 * ### Methods:
 *
 * * layer.Client.createConversation(): Create a new layer.Conversation.
 * * layer.Client.createQuery(): Create a new layer.Query.
 * * layer.Client.getMessage(): Input a Message ID, and output a Message from cache.
 * * layer.Client.getConversation(): Input a Conversation ID, and output a Conversation from cache.
 * * layer.Client.on() and layer.Conversation.off(): event listeners
 * * layer.Client.destroy(): Cleanup all resources used by this client, including all Messages and Conversations.
 *
 * ### Events:
 *
 * * `challenge`: Provides a nonce and a callback; you call the callback once you have an Identity Token.
 * * `ready`: Your application can now start using the Layer services
 * * `messages:notify`: Used to notify your application of new messages for which a local notification may be suitable.
 *
 * ## Logging:
 *
 * There are two ways to change the log level for Layer's logger:
 *
 *     layer.Client.prototype.logLevel = layer.Constants.LOG.INFO;
 *
 * or
 *
 *     var client = new layer.Client({
 *        appId: 'layer:///apps/staging/ffffffff-ffff-ffff-ffff-ffffffffffff',
 *        userId: 'Fred',
 *        logLevel: layer.Constants.LOG.INFO
 *     });
 *
 * @class  layer.Client
 * @extends layer.ClientAuthenticator
 *
 */

var ClientAuth = require('./client-authenticator');
var Conversation = require('./conversation');
var Query = require('./query');
var LayerError = require('./layer-error');
var Message = require('./message');
var User = require('./user');
var TypingIndicatorListener = require('./typing-indicators/typing-indicator-listener');
var Util = require('./client-utils');
var Root = require('./root');
var ClientRegistry = require('./client-registry');
var logger = require('./logger');

var Client = function (_ClientAuth) {
  _inherits(Client, _ClientAuth);

  /*
   * Adds conversations, messages and websockets on top of the authentication client.
   * jsdocs on parent class constructor.
   */

  function Client(options) {
    _classCallCheck(this, Client);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Client).call(this, options));

    ClientRegistry.register(_this);

    // Initialize Properties
    _this._conversationsHash = {};
    _this._messagesHash = {};
    _this._tempConversationsHash = {};
    _this._tempMessagesHash = {};
    _this._queriesHash = {};

    if (!options.users) {
      _this.users = [];
    } else {
      _this.__updateUsers(_this.users);
    }

    _this._initComponents();

    _this.on('online', _this._connectionRestored.bind(_this));
    return _this;
  }

  /* See parent method docs */


  _createClass(Client, [{
    key: '_initComponents',
    value: function _initComponents() {
      var _this2 = this;

      _get(Object.getPrototypeOf(Client.prototype), '_initComponents', this).call(this);

      this._typingIndicators = new TypingIndicatorListener({
        clientId: this.appId
      });

      // Instantiate Plugins
      Object.keys(Client.plugins).forEach(function (propertyName) {
        _this2[propertyName] = new Client.plugins[propertyName](_this2);
      });
    }

    /**
     * Cleanup all resources (Conversations, Messages, etc...) prior to destroy or reauthentication.
     *
     * @method _cleanup
     * @private
     */

  }, {
    key: '_cleanup',
    value: function _cleanup() {
      var _this3 = this;

      if (this.isDestroyed) return;
      this._inCleanup = true;

      Object.keys(this._conversationsHash).forEach(function (id) {
        var c = _this3._conversationsHash[id];
        if (c && !c.isDestroyed) {
          c.destroy();
        }
      });
      this._conversationsHash = null;

      Object.keys(this._messagesHash).forEach(function (id) {
        var m = _this3._messagesHash[id];
        if (m && !m.isDestroyed) {
          m.destroy();
        }
      });
      this._messagesHash = null;

      Object.keys(this._queriesHash).forEach(function (id) {
        _this3._queriesHash[id].destroy();
      });
      this._queriesHash = null;
      if (this.users) [].concat(this.users).forEach(function (user) {
        return user.destroy ? user.destroy() : null;
      });

      // Ideally we'd set it to null, but _adjustUsers would make it []
      this.users = [];

      if (this.socketManager) this.socketManager.close();
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      var _this4 = this;

      // Cleanup all plugins
      Object.keys(Client.plugins).forEach(function (propertyName) {
        if (_this4[propertyName]) {
          _this4[propertyName].destroy();
          delete _this4[propertyName];
        }
      });

      // Cleanup all resources (Conversations, Messages, etc...)
      this._cleanup();

      this._destroyComponents();

      ClientRegistry.unregister(this);

      _get(Object.getPrototypeOf(Client.prototype), 'destroy', this).call(this);
      this._inCleanup = false;
    }

    /**
     * Retrieve a conversation by Identifier.
     *
     *      var c = client.getConversation('layer:///conversations/uuid');
     *
     * If there is not a conversation with that id, it will return null.
     *
     * If you want it to load it from cache and then from server if not in cache, use the `canLoad` parameter.
     * If loading from the server, the method will return
     * a layer.Conversation instance that has no data; the conversations:loaded/conversations:loaded-error events
     * will let you know when the conversation has finished/failed loading from the server.
     *
     *      var c = client.getConversation('layer:///conversations/123', true)
     *      .on('conversations:loaded', function() {
     *          // Render the Conversation with all of its details loaded
     *          myrerender(c);
     *      });
     *      // Render a placeholder for c until the details of c have loaded
     *      myrender(c);
     *
     * @method getConversation
     * @param  {string} id
     * @param  {boolean} [canLoad=false] - Pass true to allow loading a conversation from
     *                                    the server if not found
     * @return {layer.Conversation}
     */

  }, {
    key: 'getConversation',
    value: function getConversation(id, canLoad) {
      if (typeof id !== 'string') throw new Error(LayerError.dictionary.idParamRequired);
      if (this._conversationsHash[id]) {
        return this._conversationsHash[id];
      } else if (this._tempConversationsHash[id] && this._conversationsHash[this._tempConversationsHash[id]]) {
        return this._conversationsHash[this._tempConversationsHash[id]];
      } else if (canLoad) {
        return Conversation.load(id, this);
      }
    }

    /**
     * Adds a conversation to the client.
     *
     * Typically, you do not need to call this; the following code
     * automatically calls _addConversation for you:
     *
     *      var conv = new layer.Conversation({
     *          client: client,
     *          participants: ['a', 'b']
     *      });
     *
     *      // OR:
     *      var conv = client.createConversation(['a', 'b']);
     *
     * @method _addConversation
     * @protected
     * @param  {layer.Conversation} c
     * @returns {layer.Client} this
     */

  }, {
    key: '_addConversation',
    value: function _addConversation(conversation) {
      var id = conversation.id;
      if (!this._conversationsHash[id]) {
        // Register the Conversation
        this._conversationsHash[id] = conversation;

        // Make sure the client is set so that the next event bubbles up
        if (conversation.clientId !== this.appId) conversation.clientId = this.appId;
        this._triggerAsync('conversations:add', { conversations: [conversation] });
      }
      return this;
    }

    /**
     * Removes a conversation from the client.
     *
     * Typically, you do not need to call this; the following code
     * automatically calls _removeConversation for you:
     *
     *      converation.destroy();
     *
     * @method _removeConversation
     * @protected
     * @param  {layer.Conversation} c
     * @returns {layer.Client} this
     */

  }, {
    key: '_removeConversation',
    value: function _removeConversation(conversation) {
      var _this5 = this;

      // Insure we do not get any events, such as message:remove
      conversation.off(null, null, this);

      if (this._conversationsHash[conversation.id]) {
        delete this._conversationsHash[conversation.id];
        this._triggerAsync('conversations:remove', { conversations: [conversation] });
      }
      delete this._tempConversationsHash[conversation._tempId];

      // Remove any Message associated with this Conversation
      Object.keys(this._messagesHash).forEach(function (id) {
        if (_this5._messagesHash[id].conversationId === conversation.id) {
          _this5._messagesHash[id].destroy();
        }
      });

      return this;
    }

    /**
     * If the Conversation ID changes, we need to reregister the Conversation
     *
     * @method _updateConversationId
     * @protected
     * @param  {layer.Conversation} conversation - Conversation whose ID has changed
     * @param  {string} oldId - Previous ID
     */

  }, {
    key: '_updateConversationId',
    value: function _updateConversationId(conversation, oldId) {
      var _this6 = this;

      if (this._conversationsHash[oldId]) {
        this._conversationsHash[conversation.id] = conversation;
        delete this._conversationsHash[oldId];

        // Enable components that still have the old ID to still call getConversation with it
        this._tempConversationsHash[oldId] = conversation.id;

        // This is a nasty way to work... but need to find and update all
        // conversationId properties of all Messages or the Query's won't
        // see these as matching the query.
        Object.keys(this._messagesHash).filter(function (id) {
          return _this6._messagesHash[id].conversationId === oldId;
        }).forEach(function (id) {
          return _this6._messagesHash[id].conversationId = conversation.id;
        });
      }
    }

    /**
     * Retrieve the message by message id.
     *
     * Useful for finding a message when you have only the ID.
     *
     * If the message is not found, it will return null.
     *
     * If you want it to load it from cache and then from server if not in cache, use the `canLoad` parameter.
     * If loading from the server, the method will return
     * a layer.Message instance that has no data; the messages:loaded/messages:loaded-error events
     * will let you know when the message has finished/failed loading from the server.
     *
     *      var m = client.getMessage('layer:///messages/123', true)
     *      .on('messages:loaded', function() {
     *          // Render the Message with all of its details loaded
     *          myrerender(m);
     *      });
     *      // Render a placeholder for m until the details of m have loaded
     *      myrender(m);
     *
     *
     * @method getMessage
     * @param  {string} id              - layer:///messages/uuid
     * @param  {boolean} [canLoad=false] - Pass true to allow loading a message from the server if not found
     * @return {layer.Message}
     */

  }, {
    key: 'getMessage',
    value: function getMessage(id, canLoad) {
      if (typeof id !== 'string') throw new Error(LayerError.dictionary.idParamRequired);

      if (this._messagesHash[id]) {
        return this._messagesHash[id];
      } else if (this._tempMessagesHash[id] && this._messagesHash[this._tempMessagesHash[id]]) {
        return this._messagesHash[this._tempMessagesHash[id]];
      } else if (canLoad) {
        return Message.load(id, this);
      }
    }

    /**
     * Get a MessagePart by ID
     * @method getMessagePart
     * @param {String} id - ID of the Message Part; layer:///messages/uuid/parts/5
     */

  }, {
    key: 'getMessagePart',
    value: function getMessagePart(id) {
      if (typeof id !== 'string') throw new Error(LayerError.dictionary.idParamRequired);

      var messageId = id.replace(/\/parts.*$/, '');
      var message = this.getMessage(messageId);
      if (message) return message.getPartById(id);
    }

    /**
     * Registers a message in _messagesHash and triggers events.
     *
     * May also update Conversation.lastMessage.
     *
     * @method _addMessage
     * @protected
     * @param  {layer.Message} message
     */

  }, {
    key: '_addMessage',
    value: function _addMessage(message) {
      if (!this._messagesHash[message.id]) {
        this._messagesHash[message.id] = message;
        this._triggerAsync('messages:add', { messages: [message] });
        if (message._notify) {
          this._triggerAsync('messages:notify', { message: message });
          message._notify = false;
        }
        var conversation = message.getConversation();
        if (conversation && (!conversation.lastMessage || conversation.lastMessage.position < message.position)) {
          conversation.lastMessage = message;
        }
      }
    }

    /**
     * Removes message from _messagesHash.
     *
     * Accepts IDs or Message instances
     *
     * TODO: Remove support for remove by ID
     *
     * @method _removeMessage
     * @private
     * @param  {layer.Message|string} message or Message ID
     */

  }, {
    key: '_removeMessage',
    value: function _removeMessage(message) {
      var id = typeof message === 'string' ? message : message.id;
      message = this._messagesHash[id];
      if (message) {
        delete this._messagesHash[id];
        delete this._tempMessagesHash[message._tempId];
        if (!this._inCleanup) {
          this._triggerAsync('messages:remove', { messages: [message] });
          var conv = message.getConversation();
          if (conv && conv.lastMessage === message) conv.lastMessage = null;
        }
      }
    }

    /**
     * If the Message ID changes, we need to reregister the message
     *
     * @method _updateMessageId
     * @protected
     * @param  {layer.Message} message - message whose ID has changed
     * @param  {string} oldId - Previous ID
     */

  }, {
    key: '_updateMessageId',
    value: function _updateMessageId(message, oldId) {
      this._messagesHash[message.id] = message;
      delete this._messagesHash[oldId];

      // Enable components that still have the old ID to still call getMessage with it
      this._tempMessagesHash[oldId] = message.id;
    }

    /**
     * Takes as input an object id, and either calls getConversation() or getMessage() as needed.
     *
     * Will only get cached objects, will not get objects from the server.
     *
     * This is not a public method mostly so there's no ambiguity over using getXXX
     * or _getObject.  getXXX typically has an option to load the resource, which this
     * does not.
     *
     * @method _getObject
     * @protected
     * @param  {string} id - Message, Conversation or Query id
     * @return {layer.Message|layer.Conversation|layer.Query}
     */

  }, {
    key: '_getObject',
    value: function _getObject(id) {
      switch (Util.typeFromID(id)) {
        case 'messages':
          return this.getMessage(id);
        case 'conversations':
          return this.getConversation(id);
        case 'queries':
          return this.getQuery(id);
      }
    }

    /**
     * Takes an object description from the server and either updates it (if cached)
     * or creates and caches it .
     *
     * @method _createObject
     * @protected
     * @param  {Object} obj - Plain javascript object representing a Message or Conversation
     */

  }, {
    key: '_createObject',
    value: function _createObject(obj) {
      switch (Util.typeFromID(obj.id)) {
        case 'messages':
          {
            var conversation = this.getConversation(obj.conversation.id, true);
            return Message._createFromServer(obj, conversation);
          }

        case 'conversations':
          {
            return Conversation._createFromServer(obj, this);
          }
      }
    }

    /**
     * Merge events into smaller numbers of more complete events.
     *
     * Before any delayed triggers are fired, fold together all of the conversations:add
     * and conversations:remove events so that 100 conversations:add events can be fired as
     * a single event.
     *
     * @method _processDelayedTriggers
     * @private
     */

  }, {
    key: '_processDelayedTriggers',
    value: function _processDelayedTriggers() {
      if (this.isDestroyed) return;

      var addConversations = this._delayedTriggers.filter(function (evt) {
        return evt[0] === 'conversations:add';
      });
      var removeConversations = this._delayedTriggers.filter(function (evt) {
        return evt[0] === 'conversations:remove';
      });
      this._foldEvents(addConversations, 'conversations', this);
      this._foldEvents(removeConversations, 'conversations', this);

      var addMessages = this._delayedTriggers.filter(function (evt) {
        return evt[0] === 'messages:add';
      });
      var removeMessages = this._delayedTriggers.filter(function (evt) {
        return evt[0] === 'messages:remove';
      });

      this._foldEvents(addMessages, 'messages', this);
      this._foldEvents(removeMessages, 'messages', this);

      _get(Object.getPrototypeOf(Client.prototype), '_processDelayedTriggers', this).call(this);
    }
  }, {
    key: 'trigger',
    value: function trigger(eventName, evt) {
      this._triggerLogger(eventName, evt);
      _get(Object.getPrototypeOf(Client.prototype), 'trigger', this).call(this, eventName, evt);
    }

    /**
     * Does logging on all triggered events.
     *
     * All logging is done at `debug` or `info` levels.
     *
     * @method _triggerLogger
     * @private
     */

  }, {
    key: '_triggerLogger',
    value: function _triggerLogger(eventName, evt) {
      var infoEvents = ['conversations:add', 'conversations:remove', 'conversations:change', 'messages:add', 'messages:remove', 'messages:change', 'challenge', 'ready'];
      if (infoEvents.indexOf(eventName) !== -1) {
        if (evt && evt.isChange) {
          logger.info('Client Event: ' + eventName + ' ' + evt.changes.map(function (change) {
            return change.property;
          }).join(', '));
        } else {
          var text = '';
          if (evt) {
            if (evt.message) text = evt.message.id;
            if (evt.messages) text = evt.messages.length + ' messages';
            if (evt.conversation) text = evt.conversation.id;
            if (evt.conversations) text = evt.conversations.length + ' conversations';
          }
          logger.info('Client Event: ' + eventName + ' ' + text);
        }
        if (evt) logger.debug(evt);
      } else {
        logger.debug(eventName, evt);
      }
    }

    /**
     * Searches locally cached conversations for a matching conversation.
     *
     * Iterates over conversations calling a matching function until
     * the conversation is found or all conversations tested.
     *
     *      var c = client.findConversation(function(conversation) {
     *          if (conversation.participants.indexOf('a') != -1) return true;
     *      });
     *
     * @method findCachedConversation
     * @param  {Function} f - Function to call until we find a match
     * @param  {layer.Conversation} f.conversation - A conversation to test
     * @param  {boolean} f.return - Return true if the conversation is a match
     * @param  {Object} [context] - Optional context for the *this* object
     * @return {layer.Conversation}
     *
     * @deprecated
     * This should be replaced by iterating over your layer.Query data.
     */

  }, {
    key: 'findCachedConversation',
    value: function findCachedConversation(func, context) {
      var test = context ? func.bind(context) : func;
      var list = Object.keys(this._conversationsHash);
      var len = list.length;
      for (var index = 0; index < len; index++) {
        var key = list[index];
        var conversation = this._conversationsHash[key];
        if (test(conversation, index)) return conversation;
      }
    }

    /**
     * If the session has been reset, dump all data.
     *
     * @method _resetSession
     * @private
     */

  }, {
    key: '_resetSession',
    value: function _resetSession() {
      this._cleanup();
      this.users = [];
      this._conversationsHash = {};
      this._messagesHash = {};
      this._queriesHash = {};
      return _get(Object.getPrototypeOf(Client.prototype), '_resetSession', this).call(this);
    }

    /**
     * Add a user to the users array.
     *
     * By doing this instead of just directly `this.client.users.push(user)`
     * the user will get its conversations property setup correctly.
     *
     * @method addUser
     * @param  {layer.User} user [description]
     * @returns {layer.Client} this
     */

  }, {
    key: 'addUser',
    value: function addUser(user) {
      this.users.push(user);
      user.setClient(this);
      this.trigger('users:change');
      return this;
    }

    /**
     * Searches `client.users` array for the specified id.
     *
     * Use of the `client.users` array is optional.
     *
     *      function getSenderDisplayName(message) {
     *          var user = client.findUser(message.sender.userId);
     *          return user ? user.displayName : 'Unknown User';
     *      }
     *
     * @method findUser
     * @param  {string} id
     * @return {layer.User}
     */

  }, {
    key: 'findUser',
    value: function findUser(id) {
      var l = this.users.length;
      for (var i = 0; i < l; i++) {
        var u = this.users[i];
        if (u.id === id) return u;
      }
    }

    /**
     * __ Methods are automatically called by property setters.
     *
     * Insure that any attempt to set the `users` property sets it to an array.
     *
     * @method __adjustUsers
     * @private
     */

  }, {
    key: '__adjustUsers',
    value: function __adjustUsers(users) {
      if (!users) return [];
      if (!Array.isArray(users)) return [users];
    }

    /**
     * __ Methods are automatically called by property setters.
     *
     * Insure that each user in the users array gets its client property setup.
     *
     * @method __adjustUsers
     * @private
     */

  }, {
    key: '__updateUsers',
    value: function __updateUsers(users) {
      var _this7 = this;

      users.forEach(function (u) {
        if (u instanceof User) u.setClient(_this7);
      });
      this.trigger('users:change');
    }

    /**
     * This method is recommended way to create a Conversation.
     *
     * There are a few ways to invoke it; note that the default behavior is to create a Distinct Conversation
     * unless otherwise stated via the layer.Conversation.distinct property.
     *
     *         client.createConversation(['a', 'b']);
     *
     *         client.createConversation({participants: ['a', 'b']});
     *
     *         client.createConversation({
     *             participants: ['a', 'b'],
     *             distinct: false
     *         });
     *
     *         client.createConversation({
     *             participants: ['a', 'b'],
     *             metadata: {
     *                 title: 'I am a title'
     *             }
     *         });
     *
     * If you try to create a Distinct Conversation that already exists,
     * you will get back an existing Conversation, and any requested metadata
     * will NOT be set; you will get whatever metadata the matching Conversation
     * already had.
     *
     * The default value for distinct is `true`.
     *
     * Whether the Conversation already exists or not, a 'conversations:sent' event
     * will be triggered asynchronously and the Conversation object will be ready
     * at that time.  Further, the event will provide details on the result:
     *
     *       var conversation = client.createConversation(['a', 'b']);
     *       conversation.on('conversations:sent', function(evt) {
     *           switch(evt.result) {
     *               case Conversation.CREATED:
     *                   alert(conversation.id + ' was created');
     *                   break;
     *               case Conversation.FOUND:
     *                   alert(conversation.id + ' was found');
     *                   break;
     *               case Conversation.FOUND_WITHOUT_REQUESTED_METADATA:
     *                   alert(conversation.id + ' was found but it already has a title so your requested title was not set');
     *                   break;
     *            }
     *       });
     *
     * @method createConversation
     * @param  {Object/string[]} options Either an array of participants,
     *                                  or an object with parameters to pass to
     *                                  Conversation's constructor
     * @param {Boolean} [options.distinct=true] Is this a distinct Converation?
     * @param {Object} [options.metadata={}] Metadata for your Conversation
     * @return {layer.Conversation}
     */

  }, {
    key: 'createConversation',
    value: function createConversation(options) {
      var opts = undefined;
      if (Array.isArray(options)) {
        opts = {
          participants: options
        };
      } else {
        opts = options;
      }
      if (!('distinct' in opts)) opts.distinct = true;
      opts.client = this;
      return Conversation.create(opts);
    }

    /**
     * Retrieve the query by query id.
     *
     * Useful for finding a Query when you only have the ID
     *
     * @method getQuery
     * @param  {string} id              - layer:///messages/uuid
     * @return {layer.Query}
     */

  }, {
    key: 'getQuery',
    value: function getQuery(id) {
      if (typeof id !== 'string') throw new Error(LayerError.dictionary.idParamRequired);

      if (this._queriesHash[id]) {
        return this._queriesHash[id];
      }
    }

    /**
     * There are two options to create a new layer.Query instance.
     *
     * The direct way:
     *
     *     var query = client.createQuery({
     *         model: layer.Query.Message,
     *         predicate: 'conversation.id = '' + conv.id + ''',
     *         paginationWindow: 50
     *     });
     *
     * A Builder approach that allows for a simpler syntax:
     *
     *     var qBuilder = QueryBuilder
     *      .messages()
     *      .forConversation('layer:///conversations/ffffffff-ffff-ffff-ffff-ffffffffffff')
     *      .paginationWindow(100);
     *     var query = client.createQuery(qBuilder);
     *
     * @method createQuery
     * @param  {layer.QueryBuilder|Object} options - Either a layer.QueryBuilder instance, or parameters for the layer.Query constructor
     * @return {layer.Query}
     */

  }, {
    key: 'createQuery',
    value: function createQuery(options) {
      var query = undefined;
      if (typeof options.build === 'function') {
        query = new Query(this, options);
      } else {
        options.client = this;
        query = new Query(options);
      }
      this._addQuery(query);
      return query;
    }

    /**
     * Register the layer.Query.
     *
     * @method _addQuery
     * @private
     * @param  {layer.Query} query
     */

  }, {
    key: '_addQuery',
    value: function _addQuery(query) {
      this._queriesHash[query.id] = query;
    }

    /**
     * Deregister the layer.Query.
     *
     * @method _removeQuery
     * @private
     * @param  {layer.Query} query [description]
     */

  }, {
    key: '_removeQuery',
    value: function _removeQuery(query) {
      var _this8 = this;

      if (query) {
        if (!this._inCleanup) {
          var data = query.data.map(function (obj) {
            return _this8._getObject(obj.id);
          }).filter(function (obj) {
            return obj;
          });
          this._checkCache(data);
        }
        this.off(null, null, query);
        delete this._queriesHash[query.id];
      }
    }

    /**
     * Check to see if the specified objects can safely be removed from cache.
     *
     * Removes from cache if an object is not part of any Query's result set.
     *
     * @method _checkCache
     * @private
     * @param  {layer.Root[]} objects - Array of Messages or Conversations
     */

  }, {
    key: '_checkCache',
    value: function _checkCache(objects) {
      var _this9 = this;

      objects.forEach(function (obj) {
        if (!_this9._isCachedObject(obj)) {
          if (obj instanceof Root === false) obj = _this9._getObject(obj.id);
          obj.destroy();
        }
      });
    }

    /**
     * Returns true if the specified object should continue to be part of the cache.
     *
     * Result is based on whether the object is part of the data for a Query.
     *
     * @method _isCachedObject
     * @private
     * @param  {layer.Root} obj - A Message or Conversation Instance
     * @return {Boolean}
     */

  }, {
    key: '_isCachedObject',
    value: function _isCachedObject(obj) {
      var list = Object.keys(this._queriesHash);
      for (var i = 0; i < list.length; i++) {
        var query = this._queriesHash[list[i]];
        if (query._getItem(obj.id)) return true;
      }
    }

    /**
     * On restoring a connection, determine what steps need to be taken to update our data.
     *
     * A reset boolean property is passed; set based on  layer.ClientAuthenticator.ResetAfterOfflineDuration.
     *
     * Note it is possible for an application to have logic that causes queries to be created/destroyed
     * as a side-effect of layer.Query.reset destroying all data. So we must test to see if queries exist.
     *
     * @method _connectionRestored
     * @private
     * @param {boolean} reset - Should the session reset/reload all data or attempt to resume where it left off?
     */

  }, {
    key: '_connectionRestored',
    value: function _connectionRestored(evt) {
      var _this10 = this;

      if (evt.reset) {
        logger.debug('Client Connection Restored; Resetting all Queries');
        Object.keys(this._queriesHash).forEach(function (id) {
          var query = _this10._queriesHash[id];
          if (query) query.reset();
        });
      }
    }

    /**
     * Remove the specified object from cache
     *
     * @method _removeObject
     * @private
     * @param  {layer.Root}  obj - A Message or Conversation Instance
     */

  }, {
    key: '_removeObject',
    value: function _removeObject(obj) {
      if (obj) obj.destroy();
    }

    /**
     * Creates a layer.TypingIndicators.TypingListener instance
     * bound to the specified dom node.
     *
     *      var typingListener = client.createTypingListener(document.getElementById('myTextBox'));
     *      typingListener.setConversation(mySelectedConversation);
     *
     * Use this method to instantiate a listener, and call
     * layer.TypingIndicators.TypingListener.setConversation every time you want to change which Conversation
     * it reports your user is typing into.
     *
     * @method createTypingListener
     * @param  {HTMLElement} inputNode - Text input to watch for keystrokes
     * @return {layer.TypingIndicators.TypingListener}
     */

  }, {
    key: 'createTypingListener',
    value: function createTypingListener(inputNode) {
      var TypingListener = require('./typing-indicators/typing-listener');
      return new TypingListener({
        clientId: this.appId,
        input: inputNode
      });
    }

    /**
     * Creates a layer.TypingIndicators.TypingPublisher.
     *
     * The TypingPublisher lets you manage your Typing Indicators without using
     * the layer.TypingIndicators.TypingListener.
     *
     *      var typingPublisher = client.createTypingPublisher();
     *      typingPublisher.setConversation(mySelectedConversation);
     *      typingPublisher.setState(layer.TypingIndicators.STARTED);
     *
     * Use this method to instantiate a listener, and call
     * layer.TypingIndicators.TypingPublisher.setConversation every time you want to change which Conversation
     * it reports your user is typing into.
     *
     * Use layer.TypingIndicators.TypingPublisher.setState to inform other users of your current state.
     * Note that the `STARTED` state only lasts for 2.5 seconds, so you
     * must repeatedly call setState for as long as this state should continue.
     * This is typically done by simply calling it every time a user hits
     * a key.
     *
     * @method createTypingPublisher
     * @return {layer.TypingIndicators.TypingPublisher}
     */

  }, {
    key: 'createTypingPublisher',
    value: function createTypingPublisher() {
      var TypingPublisher = require('./typing-indicators/typing-publisher');
      return new TypingPublisher({
        clientId: this.appId
      });
    }

    /**
     * Accessor for getting a Client by appId.
     *
     * Most apps will only have one client,
     * and will not need this method.
     *
     * @method getClient
     * @static
     * @param  {string} appId
     * @return {layer.Client}
     */

  }], [{
    key: 'getClient',
    value: function getClient(appId) {
      return ClientRegistry.get(appId);
    }
  }, {
    key: 'destroyAllClients',
    value: function destroyAllClients() {
      ClientRegistry.getAll().forEach(function (client) {
        return client.destroy();
      });
    }

    /*
     * Registers a plugin which can add capabilities to the Client.
     *
     * Capabilities must be triggered by Events/Event Listeners.
     *
     * This concept is a bit premature and unused/untested...
     * As implemented, it provides for a plugin that will be
     * instantiated by the Client and passed the Client as its parameter.
     * This allows for a library of plugins that can be shared among
     * different companies/projects but that are outside of the core
     * app logic.
     *
     *      // Define the plugin
     *      function MyPlugin(client) {
     *          this.client = client;
     *          client.on('messages:add', this.onMessagesAdd, this);
     *      }
     *
     *      MyPlugin.prototype.onMessagesAdd = function(event) {
     *          var messages = event.messages;
     *          alert('You now have ' + messages.length  + ' messages');
     *      }
     *
     *      // Register the Plugin
     *      Client.registerPlugin('myPlugin34', MyPlugin);
     *
     *      var client = new Client({appId: 'layer:///apps/staging/uuid'});
     *
     *      // Trigger the plugin's behavior
     *      client.myPlugin34.addMessages({messages:[]});
     *
     * @method registerPlugin
     * @static
     * @param  {string} name     [description]
     * @param  {Function} classDef [description]
     */

  }, {
    key: 'registerPlugin',
    value: function registerPlugin(name, classDef) {
      Client.plugins[name] = classDef;
    }
  }]);

  return Client;
}(ClientAuth);

/**
 * Hash of layer.Conversation objects for quick lookup by id
 *
 * @private
 * @property {Object}
 */


Client.prototype._conversationsHash = null;

/**
 * Hash of layer.Message objects for quick lookup by id
 *
 * @private
 * @type {Object}
 */
Client.prototype._messagesHash = null;

/**
 * Hash mapping temporary Conversation IDs to server generated IDs.
 *
 * @private
 * @type {Object}
 */
Client.prototype._tempConversationsHash = null;

/**
 * Hash mapping temporary Message IDs to server generated IDs.
 *
 * @private
 * @type {Object}
 */
Client.prototype._tempMessagesHash = null;

/**
 * Hash of layer.Query objects for quick lookup by id
 *
 * @private
 * @type {Object}
 */
Client.prototype._queriesHash = null;

/**
 * Array of layer.User objects.
 *
 * Use of this property is optional; but by storing
 * an array of layer.User objects in this array, you can
 * then use the `client.findUser(userId)` method to lookup
 * users; and you can use the layer.User objects to find
 * suitable Conversations so you can associate a Direct
 * Message conversation with each user.
 *
 * @type {layer.User[]}
 */
Client.prototype.users = null;

Client._ignoredEvents = ['conversations:loaded', 'conversations:loaded-error'];

Client._supportedEvents = [

/**
 * One or more layer.Conversation objects have been added to the client.
 *
 * They may have been added via the websocket, or via the user creating
 * a new Conversation locally.
 *
 *      client.on('conversations:add', function(evt) {
 *          evt.conversations.forEach(function(conversation) {
 *              myView.addConversation(conversation);
 *          });
 *      });
 *
 * @event
 * @param {layer.LayerEvent} evt
 * @param {layer.Conversation[]} evt.conversations - Array of conversations added
 */
'conversations:add',

/**
 * One or more layer.Conversation objects have been removed.
 *
 * A removed Conversation is not necessarily deleted, its just
 * no longer being held in local memory.
 *
 * Note that typically you will want the conversations:delete event
 * rather than conversations:remove.
 *
 *      client.on('conversations:remove', function(evt) {
 *          evt.conversations.forEach(function(conversation) {
 *              myView.removeConversation(conversation);
 *          });
 *      });
 *
 * @event
 * @param {layer.LayerEvent} evt
 * @param {layer.Conversation[]} evt.conversations - Array of conversations removed
 */
'conversations:remove',

/**
 * The conversation is now on the server.
 *
 * Called after creating the conversation
 * on the server.  The Result property is one of:
 *
 * * layer.Conversation.CREATED: A new Conversation has been created
 * * layer.Conversation.FOUND: A matching Distinct Conversation has been found
 * * layer.Conversation.FOUND_WITHOUT_REQUESTED_METADATA: A matching Distinct Conversation has been found
 *                       but note that the metadata is NOT what you requested.
 *
 * All of these results will also mean that the updated property values have been
 * copied into your Conversation object.  That means your metadata property may no
 * longer be its initial value; it will be the value found on the server.
 *
 *      client.on('conversations:sent', function(evt) {
 *          switch(evt.result) {
 *              case Conversation.CREATED:
 *                  alert(evt.target.id + ' Created!');
 *                  break;
 *              case Conversation.FOUND:
 *                  alert(evt.target.id + ' Found!');
 *                  break;
 *              case Conversation.FOUND_WITHOUT_REQUESTED_METADATA:
 *                  alert(evt.target.id + ' Found, but does not have the requested metadata!');
 *                  break;
 *          }
 *      });
 *
 * @event
 * @param {layer.LayerEvent} event
 * @param {string} event.result
 * @param {layer.Conversation} target
 */
'conversations:sent',

/**
 * A conversation failed to load or create on the server.
 *
 *      client.on('conversations:sent-error', function(evt) {
 *          alert(evt.data.message);
 *      });
 *
 * @event
 * @param {layer.LayerEvent} evt
 * @param {layer.LayerError} evt.data
 * @param {layer.Conversation} target
 */
'conversations:sent-error',

/**
 * A conversation had a change in its properties.
 *
 * This change may have been delivered from a remote user
 * or as a result of a local operation.
 *
 *      client.on('conversations:change', function(evt) {
 *          var metadataChanges = evt.getChangesFor('metadata');
 *          var participantChanges = evt.getChangesFor('participants');
 *          if (metadataChanges.length) {
 *              myView.renderTitle(evt.target.metadata.title);
 *          }
 *          if (participantChanges.length) {
 *              myView.renderParticipants(evt.target.participants);
 *          }
 *      });
 *
 * @event
 * @param {layer.LayerEvent} evt
 * @param {layer.Conversation} evt.target
 * @param {Object[]} evt.changes
 * @param {Mixed} evt.changes.newValue
 * @param {Mixed} evt.changes.oldValue
 * @param {string} evt.changes.property - Name of the property that has changed
 */
'conversations:change',

/**
 * A new message has been received for which a notification may be suitable.
 * This event is triggered for messages that are:
 *
 * 1. Added via websocket rather than other IO
 * 2. Not yet been marked as read
 * 3. Not sent by this user
 *
        client.on('messages:notify', function(evt) {
            myNotify(evt.message);
        })
 *
 * @event
 * @param {layer.LayerEvent} evt
 * @param {layer.Message} evt.Message
 */
'messages:notify',

/**
 * Messages have been added to a conversation.
 *
 * This event is triggered on
 *
 * * creating/sending a new message
 * * Receiving a new Message via websocket
 * * Querying/downloading a set of Messages
 *
        client.on('messages:add', function(evt) {
            evt.messages.forEach(function(message) {
                myView.addMessage(message);
            });
        });
 *
 * @event
 * @param {layer.LayerEvent} evt
 * @param {layer.Message[]} evt.messages
 */
'messages:add',

/**
 * A message has been removed from a conversation.
 *
 * A removed Message is not necessarily deleted,
 * just no longer being held in memory.
 *
 * Note that typically you will want the messages:delete event
 * rather than messages:remove.
 *
 *      client.on('messages:remove', function(evt) {
 *          evt.messages.forEach(function(message) {
 *              myView.removeMessage(message);
 *          });
 *      });
 *
 * @event
 * @param {layer.LayerEvent} evt
 * @param {layer.Message} evt.message
 */
'messages:remove',

/**
 * A message has been sent.
 *
 *      client.on('messages:sent', function(evt) {
 *          alert(evt.target.getText() + ' has been sent');
 *      });
 *
 * @event
 * @param {layer.LayerEvent} evt
 * @param {layer.Message} evt.target
 */
'messages:sent',

/**
 * A message is about to be sent.
 *
 * Useful if you want to
 * add parts to the message before it goes out.
 *
 *      client.on('messages:sending', function(evt) {
 *          evt.target.addPart({
 *              mimeType: 'text/plain',
 *              body: 'this is just a test'
 *          });
 *      });
 *
 * @event
 * @param {layer.LayerEvent} evt
 * @param {layer.Message} evt.target
 */
'messages:sending',

/**
 * Server failed to receive a Message.
 *
 * @event
 * @param {layer.LayerEvent} evt
 * @param {layer.LayerError} evt.error
 */
'messages:sent-error',

/**
 * A message has had a change in its properties.
 *
 * This change may have been delivered from a remote user
 * or as a result of a local operation.
 *
 *      client.on('messages:change', function(evt) {
 *          var recpientStatusChanges = evt.getChangesFor('recipientStatus');
 *          if (recpientStatusChanges.length) {
 *              myView.renderStatus(evt.target);
 *          }
 *      });
 *
 * @event
 * @param {layer.LayerEvent} evt
 * @param {layer.Message} evt.target
 * @param {Object[]} evt.changes
 * @param {Mixed} evt.changes.newValue
 * @param {Mixed} evt.changes.oldValue
 * @param {string} evt.changes.property - Name of the property that has changed
 */
'messages:change',

/**
 * A message has been marked as read.
 *
 * This is can be triggered by a local event, or by this same user on a separate device or browser.
 *
 *      client.on('messages:read', function(evt) {
 *          myView.renderUnreadStatus(evt.target);
 *      });
 *
 * @event
 * @param {layer.LayerEvent} evt
 * @param {layer.Message} evt.target
 */
'messages:read',

/**
 * A Conversation has been deleted from the server.
 *
 * Caused by either a successful call to layer.Conversation.delete() on the Conversation
 * or by a remote user.
 *
 *      client.on('conversations:delete', function(evt) {
 *          myView.removeConversation(evt.target);
 *      });
 *
 * @event
 * @param {layer.LayerEvent} evt
 * @param {layer.Conversation} evt.target
 */
'conversations:delete',

/**
 * A Message has been deleted from the server.
 *
 * Caused by either a successful call to layer.Message.delete() on the Message
 * or by a remote user.
 *
 *      client.on('messages:delete', function(evt) {
 *          myView.removeMessage(evt.target);
 *      });
 *
 * @event
 * @param {layer.LayerEvent} evt
 * @param {layer.Message} evt.target
 */
'messages:delete',

/**
 * A User has been added or changed in the users array.
 *
 * This event is not yet well supported.
 * @event
 */
'users:change',

/**
 * A Typing Indicator state has changed.
 *
 * Either a change has been received
 * from the server, or a typing indicator state has expired.
 *
 *      client.on('typing-indicator-change', function(evt) {
 *          if (evt.conversationId === myConversationId) {
 *              alert(evt.typing.join(', ') + ' are typing');
 *              alert(evt.paused.join(', ') + ' are paused');
 *          }
 *      });
 *
 * @event
 * @param {layer.LayerEvent} evt
 * @param {string} conversationId - ID of the Conversation users are typing into
 * @param {string[]} typing - Array of user IDs who are currently typing
 * @param {string[]} paused - Array of user IDs who are currently paused;
 *                            A paused user still has text in their text box.
 */
'typing-indicator-change'].concat(ClientAuth._supportedEvents);

Client.plugins = {};

Root.initClass.apply(Client, [Client, 'Client']);
module.exports = Client;
//# sourceMappingURL=data:application/json;base64,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KlxuICogVGhlIExheWVyIENsaWVudDsgdGhpcyBpcyB0aGUgdG9wIGxldmVsIGNvbXBvbmVudCBmb3IgYW55IExheWVyIGJhc2VkIGFwcGxpY2F0aW9uLlxuXG4gICAgdmFyIGNsaWVudCA9IG5ldyBsYXllci5DbGllbnQoe1xuICAgICAgYXBwSWQ6ICdsYXllcjovLy9hcHBzL3N0YWdpbmcvZmZmZmZmZmYtZmZmZi1mZmZmLWZmZmYtZmZmZmZmZmZmZmZmJyxcbiAgICAgIHVzZXJJZDogJ0ZyZWQnLFxuICAgICAgY2hhbGxlbmdlOiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgbXlBdXRoZW50aWNhdG9yKHtcbiAgICAgICAgICBub25jZTogZXZ0Lm5vbmNlLFxuICAgICAgICAgIG9uU3VjY2VzczogZXZ0LmNhbGxiYWNrXG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICAgIHJlYWR5OiBmdW5jdGlvbihjbGllbnQpIHtcbiAgICAgICAgYWxlcnQoJ0kgYW0gQ2xpZW50OyBTZXJ2ZXI6IFNlcnZlIG1lIScpO1xuICAgICAgfVxuICAgIH0pO1xuICpcbiAqIFlvdSBjYW4gYWxzbyBpbml0aWFsaXplIHRoaXMgYXNcblxuICAgIHZhciBjbGllbnQgPSBuZXcgbGF5ZXIuQ2xpZW50KHtcbiAgICAgIGFwcElkOiAnbGF5ZXI6Ly8vYXBwcy9zdGFnaW5nL2ZmZmZmZmZmLWZmZmYtZmZmZi1mZmZmLWZmZmZmZmZmZmZmZicsXG4gICAgICB1c2VySWQ6ICdGcmVkJ1xuICAgIH0pO1xuXG4gICAgY2xpZW50Lm9uKCdjaGFsbGVuZ2UnLCBmdW5jdGlvbihldnQpIHtcbiAgICAgIG15QXV0aGVudGljYXRvcih7XG4gICAgICAgIG5vbmNlOiBldnQubm9uY2UsXG4gICAgICAgIG9uU3VjY2VzczogZXZ0LmNhbGxiYWNrXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGNsaWVudC5vbigncmVhZHknLCBmdW5jdGlvbihjbGllbnQpIHtcbiAgICAgIGFsZXJ0KCdJIGFtIENsaWVudDsgU2VydmVyOiBTZXJ2ZSBtZSEnKTtcbiAgICB9KTtcbiAqXG4gKiAjIyBBUEkgU3lub3BzaXM6XG4gKlxuICogVGhlIGZvbGxvd2luZyBQcm9wZXJ0aWVzLCBNZXRob2RzIGFuZCBFdmVudHMgYXJlIHRoZSBtb3N0IGNvbW1vbmx5IHVzZWQgb25lcy4gIFNlZSB0aGUgZnVsbCBBUEkgYmVsb3dcbiAqIGZvciB0aGUgcmVzdCBvZiB0aGUgQVBJLlxuICpcbiAqICMjIyBQcm9wZXJ0aWVzOlxuICpcbiAqICogbGF5ZXIuQ2xpZW50LnVzZXJJZDogVXNlciBJRCBvZiB0aGUgYXV0aGVudGljYXRlZCB1c2VyXG4gKiAqIGxheWVyLkNsaWVudC5hcHBJZDogVGhlIElEIGZvciB5b3VyIGFwcGxpY2F0aW9uXG4gKlxuICpcbiAqICMjIyBNZXRob2RzOlxuICpcbiAqICogbGF5ZXIuQ2xpZW50LmNyZWF0ZUNvbnZlcnNhdGlvbigpOiBDcmVhdGUgYSBuZXcgbGF5ZXIuQ29udmVyc2F0aW9uLlxuICogKiBsYXllci5DbGllbnQuY3JlYXRlUXVlcnkoKTogQ3JlYXRlIGEgbmV3IGxheWVyLlF1ZXJ5LlxuICogKiBsYXllci5DbGllbnQuZ2V0TWVzc2FnZSgpOiBJbnB1dCBhIE1lc3NhZ2UgSUQsIGFuZCBvdXRwdXQgYSBNZXNzYWdlIGZyb20gY2FjaGUuXG4gKiAqIGxheWVyLkNsaWVudC5nZXRDb252ZXJzYXRpb24oKTogSW5wdXQgYSBDb252ZXJzYXRpb24gSUQsIGFuZCBvdXRwdXQgYSBDb252ZXJzYXRpb24gZnJvbSBjYWNoZS5cbiAqICogbGF5ZXIuQ2xpZW50Lm9uKCkgYW5kIGxheWVyLkNvbnZlcnNhdGlvbi5vZmYoKTogZXZlbnQgbGlzdGVuZXJzXG4gKiAqIGxheWVyLkNsaWVudC5kZXN0cm95KCk6IENsZWFudXAgYWxsIHJlc291cmNlcyB1c2VkIGJ5IHRoaXMgY2xpZW50LCBpbmNsdWRpbmcgYWxsIE1lc3NhZ2VzIGFuZCBDb252ZXJzYXRpb25zLlxuICpcbiAqICMjIyBFdmVudHM6XG4gKlxuICogKiBgY2hhbGxlbmdlYDogUHJvdmlkZXMgYSBub25jZSBhbmQgYSBjYWxsYmFjazsgeW91IGNhbGwgdGhlIGNhbGxiYWNrIG9uY2UgeW91IGhhdmUgYW4gSWRlbnRpdHkgVG9rZW4uXG4gKiAqIGByZWFkeWA6IFlvdXIgYXBwbGljYXRpb24gY2FuIG5vdyBzdGFydCB1c2luZyB0aGUgTGF5ZXIgc2VydmljZXNcbiAqICogYG1lc3NhZ2VzOm5vdGlmeWA6IFVzZWQgdG8gbm90aWZ5IHlvdXIgYXBwbGljYXRpb24gb2YgbmV3IG1lc3NhZ2VzIGZvciB3aGljaCBhIGxvY2FsIG5vdGlmaWNhdGlvbiBtYXkgYmUgc3VpdGFibGUuXG4gKlxuICogIyMgTG9nZ2luZzpcbiAqXG4gKiBUaGVyZSBhcmUgdHdvIHdheXMgdG8gY2hhbmdlIHRoZSBsb2cgbGV2ZWwgZm9yIExheWVyJ3MgbG9nZ2VyOlxuICpcbiAqICAgICBsYXllci5DbGllbnQucHJvdG90eXBlLmxvZ0xldmVsID0gbGF5ZXIuQ29uc3RhbnRzLkxPRy5JTkZPO1xuICpcbiAqIG9yXG4gKlxuICogICAgIHZhciBjbGllbnQgPSBuZXcgbGF5ZXIuQ2xpZW50KHtcbiAqICAgICAgICBhcHBJZDogJ2xheWVyOi8vL2FwcHMvc3RhZ2luZy9mZmZmZmZmZi1mZmZmLWZmZmYtZmZmZi1mZmZmZmZmZmZmZmYnLFxuICogICAgICAgIHVzZXJJZDogJ0ZyZWQnLFxuICogICAgICAgIGxvZ0xldmVsOiBsYXllci5Db25zdGFudHMuTE9HLklORk9cbiAqICAgICB9KTtcbiAqXG4gKiBAY2xhc3MgIGxheWVyLkNsaWVudFxuICogQGV4dGVuZHMgbGF5ZXIuQ2xpZW50QXV0aGVudGljYXRvclxuICpcbiAqL1xuXG5jb25zdCBDbGllbnRBdXRoID0gcmVxdWlyZSgnLi9jbGllbnQtYXV0aGVudGljYXRvcicpO1xuY29uc3QgQ29udmVyc2F0aW9uID0gcmVxdWlyZSgnLi9jb252ZXJzYXRpb24nKTtcbmNvbnN0IFF1ZXJ5ID0gcmVxdWlyZSgnLi9xdWVyeScpO1xuY29uc3QgTGF5ZXJFcnJvciA9IHJlcXVpcmUoJy4vbGF5ZXItZXJyb3InKTtcbmNvbnN0IE1lc3NhZ2UgPSByZXF1aXJlKCcuL21lc3NhZ2UnKTtcbmNvbnN0IFVzZXIgPSByZXF1aXJlKCcuL3VzZXInKTtcbmNvbnN0IFR5cGluZ0luZGljYXRvckxpc3RlbmVyID0gcmVxdWlyZSgnLi90eXBpbmctaW5kaWNhdG9ycy90eXBpbmctaW5kaWNhdG9yLWxpc3RlbmVyJyk7XG5jb25zdCBVdGlsID0gcmVxdWlyZSgnLi9jbGllbnQtdXRpbHMnKTtcbmNvbnN0IFJvb3QgPSByZXF1aXJlKCcuL3Jvb3QnKTtcbmNvbnN0IENsaWVudFJlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jbGllbnQtcmVnaXN0cnknKTtcbmNvbnN0IGxvZ2dlciA9IHJlcXVpcmUoJy4vbG9nZ2VyJyk7XG5cbmNsYXNzIENsaWVudCBleHRlbmRzIENsaWVudEF1dGgge1xuXG4gIC8qXG4gICAqIEFkZHMgY29udmVyc2F0aW9ucywgbWVzc2FnZXMgYW5kIHdlYnNvY2tldHMgb24gdG9wIG9mIHRoZSBhdXRoZW50aWNhdGlvbiBjbGllbnQuXG4gICAqIGpzZG9jcyBvbiBwYXJlbnQgY2xhc3MgY29uc3RydWN0b3IuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucyk7XG4gICAgQ2xpZW50UmVnaXN0cnkucmVnaXN0ZXIodGhpcyk7XG5cbiAgICAvLyBJbml0aWFsaXplIFByb3BlcnRpZXNcbiAgICB0aGlzLl9jb252ZXJzYXRpb25zSGFzaCA9IHt9O1xuICAgIHRoaXMuX21lc3NhZ2VzSGFzaCA9IHt9O1xuICAgIHRoaXMuX3RlbXBDb252ZXJzYXRpb25zSGFzaCA9IHt9O1xuICAgIHRoaXMuX3RlbXBNZXNzYWdlc0hhc2ggPSB7fTtcbiAgICB0aGlzLl9xdWVyaWVzSGFzaCA9IHt9O1xuXG4gICAgaWYgKCFvcHRpb25zLnVzZXJzKSB7XG4gICAgICB0aGlzLnVzZXJzID0gW107XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX191cGRhdGVVc2Vycyh0aGlzLnVzZXJzKTtcbiAgICB9XG5cbiAgICB0aGlzLl9pbml0Q29tcG9uZW50cygpO1xuXG4gICAgdGhpcy5vbignb25saW5lJywgdGhpcy5fY29ubmVjdGlvblJlc3RvcmVkLmJpbmQodGhpcykpO1xuICB9XG5cbiAgLyogU2VlIHBhcmVudCBtZXRob2QgZG9jcyAqL1xuICBfaW5pdENvbXBvbmVudHMoKSB7XG4gICAgc3VwZXIuX2luaXRDb21wb25lbnRzKCk7XG5cbiAgICB0aGlzLl90eXBpbmdJbmRpY2F0b3JzID0gbmV3IFR5cGluZ0luZGljYXRvckxpc3RlbmVyKHtcbiAgICAgIGNsaWVudElkOiB0aGlzLmFwcElkLFxuICAgIH0pO1xuXG4gICAgLy8gSW5zdGFudGlhdGUgUGx1Z2luc1xuICAgIE9iamVjdC5rZXlzKENsaWVudC5wbHVnaW5zKS5mb3JFYWNoKHByb3BlcnR5TmFtZSA9PiB7XG4gICAgICB0aGlzW3Byb3BlcnR5TmFtZV0gPSBuZXcgQ2xpZW50LnBsdWdpbnNbcHJvcGVydHlOYW1lXSh0aGlzKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhbnVwIGFsbCByZXNvdXJjZXMgKENvbnZlcnNhdGlvbnMsIE1lc3NhZ2VzLCBldGMuLi4pIHByaW9yIHRvIGRlc3Ryb3kgb3IgcmVhdXRoZW50aWNhdGlvbi5cbiAgICpcbiAgICogQG1ldGhvZCBfY2xlYW51cFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2NsZWFudXAoKSB7XG4gICAgaWYgKHRoaXMuaXNEZXN0cm95ZWQpIHJldHVybjtcbiAgICB0aGlzLl9pbkNsZWFudXAgPSB0cnVlO1xuXG4gICAgT2JqZWN0LmtleXModGhpcy5fY29udmVyc2F0aW9uc0hhc2gpLmZvckVhY2goaWQgPT4ge1xuICAgICAgY29uc3QgYyA9IHRoaXMuX2NvbnZlcnNhdGlvbnNIYXNoW2lkXTtcbiAgICAgIGlmIChjICYmICFjLmlzRGVzdHJveWVkKSB7XG4gICAgICAgIGMuZGVzdHJveSgpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMuX2NvbnZlcnNhdGlvbnNIYXNoID0gbnVsbDtcblxuICAgIE9iamVjdC5rZXlzKHRoaXMuX21lc3NhZ2VzSGFzaCkuZm9yRWFjaChpZCA9PiB7XG4gICAgICBjb25zdCBtID0gdGhpcy5fbWVzc2FnZXNIYXNoW2lkXTtcbiAgICAgIGlmIChtICYmICFtLmlzRGVzdHJveWVkKSB7XG4gICAgICAgIG0uZGVzdHJveSgpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMuX21lc3NhZ2VzSGFzaCA9IG51bGw7XG5cbiAgICBPYmplY3Qua2V5cyh0aGlzLl9xdWVyaWVzSGFzaCkuZm9yRWFjaChpZCA9PiB7XG4gICAgICB0aGlzLl9xdWVyaWVzSGFzaFtpZF0uZGVzdHJveSgpO1xuICAgIH0pO1xuICAgIHRoaXMuX3F1ZXJpZXNIYXNoID0gbnVsbDtcbiAgICBpZiAodGhpcy51c2VycykgW10uY29uY2F0KHRoaXMudXNlcnMpLmZvckVhY2godXNlciA9PiB1c2VyLmRlc3Ryb3kgPyB1c2VyLmRlc3Ryb3koKSA6IG51bGwpO1xuXG4gICAgLy8gSWRlYWxseSB3ZSdkIHNldCBpdCB0byBudWxsLCBidXQgX2FkanVzdFVzZXJzIHdvdWxkIG1ha2UgaXQgW11cbiAgICB0aGlzLnVzZXJzID0gW107XG5cbiAgICBpZiAodGhpcy5zb2NrZXRNYW5hZ2VyKSB0aGlzLnNvY2tldE1hbmFnZXIuY2xvc2UoKTtcbiAgfVxuXG4gIGRlc3Ryb3koKSB7XG4gICAgLy8gQ2xlYW51cCBhbGwgcGx1Z2luc1xuICAgIE9iamVjdC5rZXlzKENsaWVudC5wbHVnaW5zKS5mb3JFYWNoKHByb3BlcnR5TmFtZSA9PiB7XG4gICAgICBpZiAodGhpc1twcm9wZXJ0eU5hbWVdKSB7XG4gICAgICAgIHRoaXNbcHJvcGVydHlOYW1lXS5kZXN0cm95KCk7XG4gICAgICAgIGRlbGV0ZSB0aGlzW3Byb3BlcnR5TmFtZV07XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBDbGVhbnVwIGFsbCByZXNvdXJjZXMgKENvbnZlcnNhdGlvbnMsIE1lc3NhZ2VzLCBldGMuLi4pXG4gICAgdGhpcy5fY2xlYW51cCgpO1xuXG4gICAgdGhpcy5fZGVzdHJveUNvbXBvbmVudHMoKTtcblxuICAgIENsaWVudFJlZ2lzdHJ5LnVucmVnaXN0ZXIodGhpcyk7XG5cbiAgICBzdXBlci5kZXN0cm95KCk7XG4gICAgdGhpcy5faW5DbGVhbnVwID0gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmUgYSBjb252ZXJzYXRpb24gYnkgSWRlbnRpZmllci5cbiAgICpcbiAgICogICAgICB2YXIgYyA9IGNsaWVudC5nZXRDb252ZXJzYXRpb24oJ2xheWVyOi8vL2NvbnZlcnNhdGlvbnMvdXVpZCcpO1xuICAgKlxuICAgKiBJZiB0aGVyZSBpcyBub3QgYSBjb252ZXJzYXRpb24gd2l0aCB0aGF0IGlkLCBpdCB3aWxsIHJldHVybiBudWxsLlxuICAgKlxuICAgKiBJZiB5b3Ugd2FudCBpdCB0byBsb2FkIGl0IGZyb20gY2FjaGUgYW5kIHRoZW4gZnJvbSBzZXJ2ZXIgaWYgbm90IGluIGNhY2hlLCB1c2UgdGhlIGBjYW5Mb2FkYCBwYXJhbWV0ZXIuXG4gICAqIElmIGxvYWRpbmcgZnJvbSB0aGUgc2VydmVyLCB0aGUgbWV0aG9kIHdpbGwgcmV0dXJuXG4gICAqIGEgbGF5ZXIuQ29udmVyc2F0aW9uIGluc3RhbmNlIHRoYXQgaGFzIG5vIGRhdGE7IHRoZSBjb252ZXJzYXRpb25zOmxvYWRlZC9jb252ZXJzYXRpb25zOmxvYWRlZC1lcnJvciBldmVudHNcbiAgICogd2lsbCBsZXQgeW91IGtub3cgd2hlbiB0aGUgY29udmVyc2F0aW9uIGhhcyBmaW5pc2hlZC9mYWlsZWQgbG9hZGluZyBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqICAgICAgdmFyIGMgPSBjbGllbnQuZ2V0Q29udmVyc2F0aW9uKCdsYXllcjovLy9jb252ZXJzYXRpb25zLzEyMycsIHRydWUpXG4gICAqICAgICAgLm9uKCdjb252ZXJzYXRpb25zOmxvYWRlZCcsIGZ1bmN0aW9uKCkge1xuICAgKiAgICAgICAgICAvLyBSZW5kZXIgdGhlIENvbnZlcnNhdGlvbiB3aXRoIGFsbCBvZiBpdHMgZGV0YWlscyBsb2FkZWRcbiAgICogICAgICAgICAgbXlyZXJlbmRlcihjKTtcbiAgICogICAgICB9KTtcbiAgICogICAgICAvLyBSZW5kZXIgYSBwbGFjZWhvbGRlciBmb3IgYyB1bnRpbCB0aGUgZGV0YWlscyBvZiBjIGhhdmUgbG9hZGVkXG4gICAqICAgICAgbXlyZW5kZXIoYyk7XG4gICAqXG4gICAqIEBtZXRob2QgZ2V0Q29udmVyc2F0aW9uXG4gICAqIEBwYXJhbSAge3N0cmluZ30gaWRcbiAgICogQHBhcmFtICB7Ym9vbGVhbn0gW2NhbkxvYWQ9ZmFsc2VdIC0gUGFzcyB0cnVlIHRvIGFsbG93IGxvYWRpbmcgYSBjb252ZXJzYXRpb24gZnJvbVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZSBzZXJ2ZXIgaWYgbm90IGZvdW5kXG4gICAqIEByZXR1cm4ge2xheWVyLkNvbnZlcnNhdGlvbn1cbiAgICovXG4gIGdldENvbnZlcnNhdGlvbihpZCwgY2FuTG9hZCkge1xuICAgIGlmICh0eXBlb2YgaWQgIT09ICdzdHJpbmcnKSB0aHJvdyBuZXcgRXJyb3IoTGF5ZXJFcnJvci5kaWN0aW9uYXJ5LmlkUGFyYW1SZXF1aXJlZCk7XG4gICAgaWYgKHRoaXMuX2NvbnZlcnNhdGlvbnNIYXNoW2lkXSkge1xuICAgICAgcmV0dXJuIHRoaXMuX2NvbnZlcnNhdGlvbnNIYXNoW2lkXTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuX3RlbXBDb252ZXJzYXRpb25zSGFzaFtpZF0gJiYgdGhpcy5fY29udmVyc2F0aW9uc0hhc2hbdGhpcy5fdGVtcENvbnZlcnNhdGlvbnNIYXNoW2lkXV0pIHtcbiAgICAgIHJldHVybiB0aGlzLl9jb252ZXJzYXRpb25zSGFzaFt0aGlzLl90ZW1wQ29udmVyc2F0aW9uc0hhc2hbaWRdXTtcbiAgICB9IGVsc2UgaWYgKGNhbkxvYWQpIHtcbiAgICAgIHJldHVybiBDb252ZXJzYXRpb24ubG9hZChpZCwgdGhpcyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBjb252ZXJzYXRpb24gdG8gdGhlIGNsaWVudC5cbiAgICpcbiAgICogVHlwaWNhbGx5LCB5b3UgZG8gbm90IG5lZWQgdG8gY2FsbCB0aGlzOyB0aGUgZm9sbG93aW5nIGNvZGVcbiAgICogYXV0b21hdGljYWxseSBjYWxscyBfYWRkQ29udmVyc2F0aW9uIGZvciB5b3U6XG4gICAqXG4gICAqICAgICAgdmFyIGNvbnYgPSBuZXcgbGF5ZXIuQ29udmVyc2F0aW9uKHtcbiAgICogICAgICAgICAgY2xpZW50OiBjbGllbnQsXG4gICAqICAgICAgICAgIHBhcnRpY2lwYW50czogWydhJywgJ2InXVxuICAgKiAgICAgIH0pO1xuICAgKlxuICAgKiAgICAgIC8vIE9SOlxuICAgKiAgICAgIHZhciBjb252ID0gY2xpZW50LmNyZWF0ZUNvbnZlcnNhdGlvbihbJ2EnLCAnYiddKTtcbiAgICpcbiAgICogQG1ldGhvZCBfYWRkQ29udmVyc2F0aW9uXG4gICAqIEBwcm90ZWN0ZWRcbiAgICogQHBhcmFtICB7bGF5ZXIuQ29udmVyc2F0aW9ufSBjXG4gICAqIEByZXR1cm5zIHtsYXllci5DbGllbnR9IHRoaXNcbiAgICovXG4gIF9hZGRDb252ZXJzYXRpb24oY29udmVyc2F0aW9uKSB7XG4gICAgY29uc3QgaWQgPSBjb252ZXJzYXRpb24uaWQ7XG4gICAgaWYgKCF0aGlzLl9jb252ZXJzYXRpb25zSGFzaFtpZF0pIHtcbiAgICAgIC8vIFJlZ2lzdGVyIHRoZSBDb252ZXJzYXRpb25cbiAgICAgIHRoaXMuX2NvbnZlcnNhdGlvbnNIYXNoW2lkXSA9IGNvbnZlcnNhdGlvbjtcblxuICAgICAgLy8gTWFrZSBzdXJlIHRoZSBjbGllbnQgaXMgc2V0IHNvIHRoYXQgdGhlIG5leHQgZXZlbnQgYnViYmxlcyB1cFxuICAgICAgaWYgKGNvbnZlcnNhdGlvbi5jbGllbnRJZCAhPT0gdGhpcy5hcHBJZCkgY29udmVyc2F0aW9uLmNsaWVudElkID0gdGhpcy5hcHBJZDtcbiAgICAgIHRoaXMuX3RyaWdnZXJBc3luYygnY29udmVyc2F0aW9uczphZGQnLCB7IGNvbnZlcnNhdGlvbnM6IFtjb252ZXJzYXRpb25dIH0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgY29udmVyc2F0aW9uIGZyb20gdGhlIGNsaWVudC5cbiAgICpcbiAgICogVHlwaWNhbGx5LCB5b3UgZG8gbm90IG5lZWQgdG8gY2FsbCB0aGlzOyB0aGUgZm9sbG93aW5nIGNvZGVcbiAgICogYXV0b21hdGljYWxseSBjYWxscyBfcmVtb3ZlQ29udmVyc2F0aW9uIGZvciB5b3U6XG4gICAqXG4gICAqICAgICAgY29udmVyYXRpb24uZGVzdHJveSgpO1xuICAgKlxuICAgKiBAbWV0aG9kIF9yZW1vdmVDb252ZXJzYXRpb25cbiAgICogQHByb3RlY3RlZFxuICAgKiBAcGFyYW0gIHtsYXllci5Db252ZXJzYXRpb259IGNcbiAgICogQHJldHVybnMge2xheWVyLkNsaWVudH0gdGhpc1xuICAgKi9cbiAgX3JlbW92ZUNvbnZlcnNhdGlvbihjb252ZXJzYXRpb24pIHtcbiAgICAvLyBJbnN1cmUgd2UgZG8gbm90IGdldCBhbnkgZXZlbnRzLCBzdWNoIGFzIG1lc3NhZ2U6cmVtb3ZlXG4gICAgY29udmVyc2F0aW9uLm9mZihudWxsLCBudWxsLCB0aGlzKTtcblxuICAgIGlmICh0aGlzLl9jb252ZXJzYXRpb25zSGFzaFtjb252ZXJzYXRpb24uaWRdKSB7XG4gICAgICBkZWxldGUgdGhpcy5fY29udmVyc2F0aW9uc0hhc2hbY29udmVyc2F0aW9uLmlkXTtcbiAgICAgIHRoaXMuX3RyaWdnZXJBc3luYygnY29udmVyc2F0aW9uczpyZW1vdmUnLCB7IGNvbnZlcnNhdGlvbnM6IFtjb252ZXJzYXRpb25dIH0pO1xuICAgIH1cbiAgICBkZWxldGUgdGhpcy5fdGVtcENvbnZlcnNhdGlvbnNIYXNoW2NvbnZlcnNhdGlvbi5fdGVtcElkXTtcblxuICAgIC8vIFJlbW92ZSBhbnkgTWVzc2FnZSBhc3NvY2lhdGVkIHdpdGggdGhpcyBDb252ZXJzYXRpb25cbiAgICBPYmplY3Qua2V5cyh0aGlzLl9tZXNzYWdlc0hhc2gpLmZvckVhY2goaWQgPT4ge1xuICAgICAgaWYgKHRoaXMuX21lc3NhZ2VzSGFzaFtpZF0uY29udmVyc2F0aW9uSWQgPT09IGNvbnZlcnNhdGlvbi5pZCkge1xuICAgICAgICB0aGlzLl9tZXNzYWdlc0hhc2hbaWRdLmRlc3Ryb3koKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIElmIHRoZSBDb252ZXJzYXRpb24gSUQgY2hhbmdlcywgd2UgbmVlZCB0byByZXJlZ2lzdGVyIHRoZSBDb252ZXJzYXRpb25cbiAgICpcbiAgICogQG1ldGhvZCBfdXBkYXRlQ29udmVyc2F0aW9uSWRcbiAgICogQHByb3RlY3RlZFxuICAgKiBAcGFyYW0gIHtsYXllci5Db252ZXJzYXRpb259IGNvbnZlcnNhdGlvbiAtIENvbnZlcnNhdGlvbiB3aG9zZSBJRCBoYXMgY2hhbmdlZFxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IG9sZElkIC0gUHJldmlvdXMgSURcbiAgICovXG4gIF91cGRhdGVDb252ZXJzYXRpb25JZChjb252ZXJzYXRpb24sIG9sZElkKSB7XG4gICAgaWYgKHRoaXMuX2NvbnZlcnNhdGlvbnNIYXNoW29sZElkXSkge1xuICAgICAgdGhpcy5fY29udmVyc2F0aW9uc0hhc2hbY29udmVyc2F0aW9uLmlkXSA9IGNvbnZlcnNhdGlvbjtcbiAgICAgIGRlbGV0ZSB0aGlzLl9jb252ZXJzYXRpb25zSGFzaFtvbGRJZF07XG5cbiAgICAgIC8vIEVuYWJsZSBjb21wb25lbnRzIHRoYXQgc3RpbGwgaGF2ZSB0aGUgb2xkIElEIHRvIHN0aWxsIGNhbGwgZ2V0Q29udmVyc2F0aW9uIHdpdGggaXRcbiAgICAgIHRoaXMuX3RlbXBDb252ZXJzYXRpb25zSGFzaFtvbGRJZF0gPSBjb252ZXJzYXRpb24uaWQ7XG5cbiAgICAgIC8vIFRoaXMgaXMgYSBuYXN0eSB3YXkgdG8gd29yay4uLiBidXQgbmVlZCB0byBmaW5kIGFuZCB1cGRhdGUgYWxsXG4gICAgICAvLyBjb252ZXJzYXRpb25JZCBwcm9wZXJ0aWVzIG9mIGFsbCBNZXNzYWdlcyBvciB0aGUgUXVlcnkncyB3b24ndFxuICAgICAgLy8gc2VlIHRoZXNlIGFzIG1hdGNoaW5nIHRoZSBxdWVyeS5cbiAgICAgIE9iamVjdC5rZXlzKHRoaXMuX21lc3NhZ2VzSGFzaClcbiAgICAgICAgICAgIC5maWx0ZXIoaWQgPT4gdGhpcy5fbWVzc2FnZXNIYXNoW2lkXS5jb252ZXJzYXRpb25JZCA9PT0gb2xkSWQpXG4gICAgICAgICAgICAuZm9yRWFjaChpZCA9PiB0aGlzLl9tZXNzYWdlc0hhc2hbaWRdLmNvbnZlcnNhdGlvbklkID0gY29udmVyc2F0aW9uLmlkKTtcbiAgICB9XG4gIH1cblxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSB0aGUgbWVzc2FnZSBieSBtZXNzYWdlIGlkLlxuICAgKlxuICAgKiBVc2VmdWwgZm9yIGZpbmRpbmcgYSBtZXNzYWdlIHdoZW4geW91IGhhdmUgb25seSB0aGUgSUQuXG4gICAqXG4gICAqIElmIHRoZSBtZXNzYWdlIGlzIG5vdCBmb3VuZCwgaXQgd2lsbCByZXR1cm4gbnVsbC5cbiAgICpcbiAgICogSWYgeW91IHdhbnQgaXQgdG8gbG9hZCBpdCBmcm9tIGNhY2hlIGFuZCB0aGVuIGZyb20gc2VydmVyIGlmIG5vdCBpbiBjYWNoZSwgdXNlIHRoZSBgY2FuTG9hZGAgcGFyYW1ldGVyLlxuICAgKiBJZiBsb2FkaW5nIGZyb20gdGhlIHNlcnZlciwgdGhlIG1ldGhvZCB3aWxsIHJldHVyblxuICAgKiBhIGxheWVyLk1lc3NhZ2UgaW5zdGFuY2UgdGhhdCBoYXMgbm8gZGF0YTsgdGhlIG1lc3NhZ2VzOmxvYWRlZC9tZXNzYWdlczpsb2FkZWQtZXJyb3IgZXZlbnRzXG4gICAqIHdpbGwgbGV0IHlvdSBrbm93IHdoZW4gdGhlIG1lc3NhZ2UgaGFzIGZpbmlzaGVkL2ZhaWxlZCBsb2FkaW5nIGZyb20gdGhlIHNlcnZlci5cbiAgICpcbiAgICogICAgICB2YXIgbSA9IGNsaWVudC5nZXRNZXNzYWdlKCdsYXllcjovLy9tZXNzYWdlcy8xMjMnLCB0cnVlKVxuICAgKiAgICAgIC5vbignbWVzc2FnZXM6bG9hZGVkJywgZnVuY3Rpb24oKSB7XG4gICAqICAgICAgICAgIC8vIFJlbmRlciB0aGUgTWVzc2FnZSB3aXRoIGFsbCBvZiBpdHMgZGV0YWlscyBsb2FkZWRcbiAgICogICAgICAgICAgbXlyZXJlbmRlcihtKTtcbiAgICogICAgICB9KTtcbiAgICogICAgICAvLyBSZW5kZXIgYSBwbGFjZWhvbGRlciBmb3IgbSB1bnRpbCB0aGUgZGV0YWlscyBvZiBtIGhhdmUgbG9hZGVkXG4gICAqICAgICAgbXlyZW5kZXIobSk7XG4gICAqXG4gICAqXG4gICAqIEBtZXRob2QgZ2V0TWVzc2FnZVxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IGlkICAgICAgICAgICAgICAtIGxheWVyOi8vL21lc3NhZ2VzL3V1aWRcbiAgICogQHBhcmFtICB7Ym9vbGVhbn0gW2NhbkxvYWQ9ZmFsc2VdIC0gUGFzcyB0cnVlIHRvIGFsbG93IGxvYWRpbmcgYSBtZXNzYWdlIGZyb20gdGhlIHNlcnZlciBpZiBub3QgZm91bmRcbiAgICogQHJldHVybiB7bGF5ZXIuTWVzc2FnZX1cbiAgICovXG4gIGdldE1lc3NhZ2UoaWQsIGNhbkxvYWQpIHtcbiAgICBpZiAodHlwZW9mIGlkICE9PSAnc3RyaW5nJykgdGhyb3cgbmV3IEVycm9yKExheWVyRXJyb3IuZGljdGlvbmFyeS5pZFBhcmFtUmVxdWlyZWQpO1xuXG4gICAgaWYgKHRoaXMuX21lc3NhZ2VzSGFzaFtpZF0pIHtcbiAgICAgIHJldHVybiB0aGlzLl9tZXNzYWdlc0hhc2hbaWRdO1xuICAgIH0gZWxzZSBpZiAodGhpcy5fdGVtcE1lc3NhZ2VzSGFzaFtpZF0gJiYgdGhpcy5fbWVzc2FnZXNIYXNoW3RoaXMuX3RlbXBNZXNzYWdlc0hhc2hbaWRdXSkge1xuICAgICAgcmV0dXJuIHRoaXMuX21lc3NhZ2VzSGFzaFt0aGlzLl90ZW1wTWVzc2FnZXNIYXNoW2lkXV07XG4gICAgfSBlbHNlIGlmIChjYW5Mb2FkKSB7XG4gICAgICByZXR1cm4gTWVzc2FnZS5sb2FkKGlkLCB0aGlzKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0IGEgTWVzc2FnZVBhcnQgYnkgSURcbiAgICogQG1ldGhvZCBnZXRNZXNzYWdlUGFydFxuICAgKiBAcGFyYW0ge1N0cmluZ30gaWQgLSBJRCBvZiB0aGUgTWVzc2FnZSBQYXJ0OyBsYXllcjovLy9tZXNzYWdlcy91dWlkL3BhcnRzLzVcbiAgICovXG4gIGdldE1lc3NhZ2VQYXJ0KGlkKSB7XG4gICAgaWYgKHR5cGVvZiBpZCAhPT0gJ3N0cmluZycpIHRocm93IG5ldyBFcnJvcihMYXllckVycm9yLmRpY3Rpb25hcnkuaWRQYXJhbVJlcXVpcmVkKTtcblxuICAgIGNvbnN0IG1lc3NhZ2VJZCA9IGlkLnJlcGxhY2UoL1xcL3BhcnRzLiokLywgJycpO1xuICAgIGNvbnN0IG1lc3NhZ2UgPSB0aGlzLmdldE1lc3NhZ2UobWVzc2FnZUlkKTtcbiAgICBpZiAobWVzc2FnZSkgcmV0dXJuIG1lc3NhZ2UuZ2V0UGFydEJ5SWQoaWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVycyBhIG1lc3NhZ2UgaW4gX21lc3NhZ2VzSGFzaCBhbmQgdHJpZ2dlcnMgZXZlbnRzLlxuICAgKlxuICAgKiBNYXkgYWxzbyB1cGRhdGUgQ29udmVyc2F0aW9uLmxhc3RNZXNzYWdlLlxuICAgKlxuICAgKiBAbWV0aG9kIF9hZGRNZXNzYWdlXG4gICAqIEBwcm90ZWN0ZWRcbiAgICogQHBhcmFtICB7bGF5ZXIuTWVzc2FnZX0gbWVzc2FnZVxuICAgKi9cbiAgX2FkZE1lc3NhZ2UobWVzc2FnZSkge1xuICAgIGlmICghdGhpcy5fbWVzc2FnZXNIYXNoW21lc3NhZ2UuaWRdKSB7XG4gICAgICB0aGlzLl9tZXNzYWdlc0hhc2hbbWVzc2FnZS5pZF0gPSBtZXNzYWdlO1xuICAgICAgdGhpcy5fdHJpZ2dlckFzeW5jKCdtZXNzYWdlczphZGQnLCB7IG1lc3NhZ2VzOiBbbWVzc2FnZV0gfSk7XG4gICAgICBpZiAobWVzc2FnZS5fbm90aWZ5KSB7XG4gICAgICAgIHRoaXMuX3RyaWdnZXJBc3luYygnbWVzc2FnZXM6bm90aWZ5JywgeyBtZXNzYWdlIH0pO1xuICAgICAgICBtZXNzYWdlLl9ub3RpZnkgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGNvbnZlcnNhdGlvbiA9IG1lc3NhZ2UuZ2V0Q29udmVyc2F0aW9uKCk7XG4gICAgICBpZiAoY29udmVyc2F0aW9uICYmICghY29udmVyc2F0aW9uLmxhc3RNZXNzYWdlIHx8IGNvbnZlcnNhdGlvbi5sYXN0TWVzc2FnZS5wb3NpdGlvbiA8IG1lc3NhZ2UucG9zaXRpb24pKSB7XG4gICAgICAgIGNvbnZlcnNhdGlvbi5sYXN0TWVzc2FnZSA9IG1lc3NhZ2U7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgbWVzc2FnZSBmcm9tIF9tZXNzYWdlc0hhc2guXG4gICAqXG4gICAqIEFjY2VwdHMgSURzIG9yIE1lc3NhZ2UgaW5zdGFuY2VzXG4gICAqXG4gICAqIFRPRE86IFJlbW92ZSBzdXBwb3J0IGZvciByZW1vdmUgYnkgSURcbiAgICpcbiAgICogQG1ldGhvZCBfcmVtb3ZlTWVzc2FnZVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0gIHtsYXllci5NZXNzYWdlfHN0cmluZ30gbWVzc2FnZSBvciBNZXNzYWdlIElEXG4gICAqL1xuICBfcmVtb3ZlTWVzc2FnZShtZXNzYWdlKSB7XG4gICAgY29uc3QgaWQgPSAodHlwZW9mIG1lc3NhZ2UgPT09ICdzdHJpbmcnKSA/IG1lc3NhZ2UgOiBtZXNzYWdlLmlkO1xuICAgIG1lc3NhZ2UgPSB0aGlzLl9tZXNzYWdlc0hhc2hbaWRdO1xuICAgIGlmIChtZXNzYWdlKSB7XG4gICAgICBkZWxldGUgdGhpcy5fbWVzc2FnZXNIYXNoW2lkXTtcbiAgICAgIGRlbGV0ZSB0aGlzLl90ZW1wTWVzc2FnZXNIYXNoW21lc3NhZ2UuX3RlbXBJZF07XG4gICAgICBpZiAoIXRoaXMuX2luQ2xlYW51cCkge1xuICAgICAgICB0aGlzLl90cmlnZ2VyQXN5bmMoJ21lc3NhZ2VzOnJlbW92ZScsIHsgbWVzc2FnZXM6IFttZXNzYWdlXSB9KTtcbiAgICAgICAgY29uc3QgY29udiA9IG1lc3NhZ2UuZ2V0Q29udmVyc2F0aW9uKCk7XG4gICAgICAgIGlmIChjb252ICYmIGNvbnYubGFzdE1lc3NhZ2UgPT09IG1lc3NhZ2UpIGNvbnYubGFzdE1lc3NhZ2UgPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG5cbiAgLyoqXG4gICAqIElmIHRoZSBNZXNzYWdlIElEIGNoYW5nZXMsIHdlIG5lZWQgdG8gcmVyZWdpc3RlciB0aGUgbWVzc2FnZVxuICAgKlxuICAgKiBAbWV0aG9kIF91cGRhdGVNZXNzYWdlSWRcbiAgICogQHByb3RlY3RlZFxuICAgKiBAcGFyYW0gIHtsYXllci5NZXNzYWdlfSBtZXNzYWdlIC0gbWVzc2FnZSB3aG9zZSBJRCBoYXMgY2hhbmdlZFxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IG9sZElkIC0gUHJldmlvdXMgSURcbiAgICovXG4gIF91cGRhdGVNZXNzYWdlSWQobWVzc2FnZSwgb2xkSWQpIHtcbiAgICB0aGlzLl9tZXNzYWdlc0hhc2hbbWVzc2FnZS5pZF0gPSBtZXNzYWdlO1xuICAgIGRlbGV0ZSB0aGlzLl9tZXNzYWdlc0hhc2hbb2xkSWRdO1xuXG4gICAgLy8gRW5hYmxlIGNvbXBvbmVudHMgdGhhdCBzdGlsbCBoYXZlIHRoZSBvbGQgSUQgdG8gc3RpbGwgY2FsbCBnZXRNZXNzYWdlIHdpdGggaXRcbiAgICB0aGlzLl90ZW1wTWVzc2FnZXNIYXNoW29sZElkXSA9IG1lc3NhZ2UuaWQ7XG4gIH1cblxuICAvKipcbiAgICogVGFrZXMgYXMgaW5wdXQgYW4gb2JqZWN0IGlkLCBhbmQgZWl0aGVyIGNhbGxzIGdldENvbnZlcnNhdGlvbigpIG9yIGdldE1lc3NhZ2UoKSBhcyBuZWVkZWQuXG4gICAqXG4gICAqIFdpbGwgb25seSBnZXQgY2FjaGVkIG9iamVjdHMsIHdpbGwgbm90IGdldCBvYmplY3RzIGZyb20gdGhlIHNlcnZlci5cbiAgICpcbiAgICogVGhpcyBpcyBub3QgYSBwdWJsaWMgbWV0aG9kIG1vc3RseSBzbyB0aGVyZSdzIG5vIGFtYmlndWl0eSBvdmVyIHVzaW5nIGdldFhYWFxuICAgKiBvciBfZ2V0T2JqZWN0LiAgZ2V0WFhYIHR5cGljYWxseSBoYXMgYW4gb3B0aW9uIHRvIGxvYWQgdGhlIHJlc291cmNlLCB3aGljaCB0aGlzXG4gICAqIGRvZXMgbm90LlxuICAgKlxuICAgKiBAbWV0aG9kIF9nZXRPYmplY3RcbiAgICogQHByb3RlY3RlZFxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IGlkIC0gTWVzc2FnZSwgQ29udmVyc2F0aW9uIG9yIFF1ZXJ5IGlkXG4gICAqIEByZXR1cm4ge2xheWVyLk1lc3NhZ2V8bGF5ZXIuQ29udmVyc2F0aW9ufGxheWVyLlF1ZXJ5fVxuICAgKi9cbiAgX2dldE9iamVjdChpZCkge1xuICAgIHN3aXRjaCAoVXRpbC50eXBlRnJvbUlEKGlkKSkge1xuICAgICAgY2FzZSAnbWVzc2FnZXMnOlxuICAgICAgICByZXR1cm4gdGhpcy5nZXRNZXNzYWdlKGlkKTtcbiAgICAgIGNhc2UgJ2NvbnZlcnNhdGlvbnMnOlxuICAgICAgICByZXR1cm4gdGhpcy5nZXRDb252ZXJzYXRpb24oaWQpO1xuICAgICAgY2FzZSAncXVlcmllcyc6XG4gICAgICAgIHJldHVybiB0aGlzLmdldFF1ZXJ5KGlkKTtcbiAgICB9XG4gIH1cblxuXG4gIC8qKlxuICAgKiBUYWtlcyBhbiBvYmplY3QgZGVzY3JpcHRpb24gZnJvbSB0aGUgc2VydmVyIGFuZCBlaXRoZXIgdXBkYXRlcyBpdCAoaWYgY2FjaGVkKVxuICAgKiBvciBjcmVhdGVzIGFuZCBjYWNoZXMgaXQgLlxuICAgKlxuICAgKiBAbWV0aG9kIF9jcmVhdGVPYmplY3RcbiAgICogQHByb3RlY3RlZFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IG9iaiAtIFBsYWluIGphdmFzY3JpcHQgb2JqZWN0IHJlcHJlc2VudGluZyBhIE1lc3NhZ2Ugb3IgQ29udmVyc2F0aW9uXG4gICAqL1xuICBfY3JlYXRlT2JqZWN0KG9iaikge1xuICAgIHN3aXRjaCAoVXRpbC50eXBlRnJvbUlEKG9iai5pZCkpIHtcbiAgICAgIGNhc2UgJ21lc3NhZ2VzJzoge1xuICAgICAgICBjb25zdCBjb252ZXJzYXRpb24gPSB0aGlzLmdldENvbnZlcnNhdGlvbihvYmouY29udmVyc2F0aW9uLmlkLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIE1lc3NhZ2UuX2NyZWF0ZUZyb21TZXJ2ZXIob2JqLCBjb252ZXJzYXRpb24pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdjb252ZXJzYXRpb25zJzoge1xuICAgICAgICByZXR1cm4gQ29udmVyc2F0aW9uLl9jcmVhdGVGcm9tU2VydmVyKG9iaiwgdGhpcyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE1lcmdlIGV2ZW50cyBpbnRvIHNtYWxsZXIgbnVtYmVycyBvZiBtb3JlIGNvbXBsZXRlIGV2ZW50cy5cbiAgICpcbiAgICogQmVmb3JlIGFueSBkZWxheWVkIHRyaWdnZXJzIGFyZSBmaXJlZCwgZm9sZCB0b2dldGhlciBhbGwgb2YgdGhlIGNvbnZlcnNhdGlvbnM6YWRkXG4gICAqIGFuZCBjb252ZXJzYXRpb25zOnJlbW92ZSBldmVudHMgc28gdGhhdCAxMDAgY29udmVyc2F0aW9uczphZGQgZXZlbnRzIGNhbiBiZSBmaXJlZCBhc1xuICAgKiBhIHNpbmdsZSBldmVudC5cbiAgICpcbiAgICogQG1ldGhvZCBfcHJvY2Vzc0RlbGF5ZWRUcmlnZ2Vyc1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3Byb2Nlc3NEZWxheWVkVHJpZ2dlcnMoKSB7XG4gICAgaWYgKHRoaXMuaXNEZXN0cm95ZWQpIHJldHVybjtcblxuICAgIGNvbnN0IGFkZENvbnZlcnNhdGlvbnMgPSB0aGlzLl9kZWxheWVkVHJpZ2dlcnMuZmlsdGVyKChldnQpID0+IGV2dFswXSA9PT0gJ2NvbnZlcnNhdGlvbnM6YWRkJyk7XG4gICAgY29uc3QgcmVtb3ZlQ29udmVyc2F0aW9ucyA9IHRoaXMuX2RlbGF5ZWRUcmlnZ2Vycy5maWx0ZXIoKGV2dCkgPT4gZXZ0WzBdID09PSAnY29udmVyc2F0aW9uczpyZW1vdmUnKTtcbiAgICB0aGlzLl9mb2xkRXZlbnRzKGFkZENvbnZlcnNhdGlvbnMsICdjb252ZXJzYXRpb25zJywgdGhpcyk7XG4gICAgdGhpcy5fZm9sZEV2ZW50cyhyZW1vdmVDb252ZXJzYXRpb25zLCAnY29udmVyc2F0aW9ucycsIHRoaXMpO1xuXG4gICAgY29uc3QgYWRkTWVzc2FnZXMgPSB0aGlzLl9kZWxheWVkVHJpZ2dlcnMuZmlsdGVyKChldnQpID0+IGV2dFswXSA9PT0gJ21lc3NhZ2VzOmFkZCcpO1xuICAgIGNvbnN0IHJlbW92ZU1lc3NhZ2VzID0gdGhpcy5fZGVsYXllZFRyaWdnZXJzLmZpbHRlcigoZXZ0KSA9PiBldnRbMF0gPT09ICdtZXNzYWdlczpyZW1vdmUnKTtcblxuICAgIHRoaXMuX2ZvbGRFdmVudHMoYWRkTWVzc2FnZXMsICdtZXNzYWdlcycsIHRoaXMpO1xuICAgIHRoaXMuX2ZvbGRFdmVudHMocmVtb3ZlTWVzc2FnZXMsICdtZXNzYWdlcycsIHRoaXMpO1xuXG4gICAgc3VwZXIuX3Byb2Nlc3NEZWxheWVkVHJpZ2dlcnMoKTtcbiAgfVxuXG4gIHRyaWdnZXIoZXZlbnROYW1lLCBldnQpIHtcbiAgICB0aGlzLl90cmlnZ2VyTG9nZ2VyKGV2ZW50TmFtZSwgZXZ0KTtcbiAgICBzdXBlci50cmlnZ2VyKGV2ZW50TmFtZSwgZXZ0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEb2VzIGxvZ2dpbmcgb24gYWxsIHRyaWdnZXJlZCBldmVudHMuXG4gICAqXG4gICAqIEFsbCBsb2dnaW5nIGlzIGRvbmUgYXQgYGRlYnVnYCBvciBgaW5mb2AgbGV2ZWxzLlxuICAgKlxuICAgKiBAbWV0aG9kIF90cmlnZ2VyTG9nZ2VyXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfdHJpZ2dlckxvZ2dlcihldmVudE5hbWUsIGV2dCkge1xuICAgIGNvbnN0IGluZm9FdmVudHMgPSBbXG4gICAgICAnY29udmVyc2F0aW9uczphZGQnLCAnY29udmVyc2F0aW9uczpyZW1vdmUnLFxuICAgICAgJ2NvbnZlcnNhdGlvbnM6Y2hhbmdlJywgJ21lc3NhZ2VzOmFkZCcsXG4gICAgICAnbWVzc2FnZXM6cmVtb3ZlJywgJ21lc3NhZ2VzOmNoYW5nZScsXG4gICAgICAnY2hhbGxlbmdlJywgJ3JlYWR5JyxcbiAgICBdO1xuICAgIGlmIChpbmZvRXZlbnRzLmluZGV4T2YoZXZlbnROYW1lKSAhPT0gLTEpIHtcbiAgICAgIGlmIChldnQgJiYgZXZ0LmlzQ2hhbmdlKSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKGBDbGllbnQgRXZlbnQ6ICR7ZXZlbnROYW1lfSAke2V2dC5jaGFuZ2VzLm1hcChjaGFuZ2UgPT4gY2hhbmdlLnByb3BlcnR5KS5qb2luKCcsICcpfWApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IHRleHQgPSAnJztcbiAgICAgICAgaWYgKGV2dCkge1xuICAgICAgICAgIGlmIChldnQubWVzc2FnZSkgdGV4dCA9IGV2dC5tZXNzYWdlLmlkO1xuICAgICAgICAgIGlmIChldnQubWVzc2FnZXMpIHRleHQgPSBldnQubWVzc2FnZXMubGVuZ3RoICsgJyBtZXNzYWdlcyc7XG4gICAgICAgICAgaWYgKGV2dC5jb252ZXJzYXRpb24pIHRleHQgPSBldnQuY29udmVyc2F0aW9uLmlkO1xuICAgICAgICAgIGlmIChldnQuY29udmVyc2F0aW9ucykgdGV4dCA9IGV2dC5jb252ZXJzYXRpb25zLmxlbmd0aCArICcgY29udmVyc2F0aW9ucyc7XG4gICAgICAgIH1cbiAgICAgICAgbG9nZ2VyLmluZm8oYENsaWVudCBFdmVudDogJHtldmVudE5hbWV9ICR7dGV4dH1gKTtcbiAgICAgIH1cbiAgICAgIGlmIChldnQpIGxvZ2dlci5kZWJ1ZyhldnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2dnZXIuZGVidWcoZXZlbnROYW1lLCBldnQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2hlcyBsb2NhbGx5IGNhY2hlZCBjb252ZXJzYXRpb25zIGZvciBhIG1hdGNoaW5nIGNvbnZlcnNhdGlvbi5cbiAgICpcbiAgICogSXRlcmF0ZXMgb3ZlciBjb252ZXJzYXRpb25zIGNhbGxpbmcgYSBtYXRjaGluZyBmdW5jdGlvbiB1bnRpbFxuICAgKiB0aGUgY29udmVyc2F0aW9uIGlzIGZvdW5kIG9yIGFsbCBjb252ZXJzYXRpb25zIHRlc3RlZC5cbiAgICpcbiAgICogICAgICB2YXIgYyA9IGNsaWVudC5maW5kQ29udmVyc2F0aW9uKGZ1bmN0aW9uKGNvbnZlcnNhdGlvbikge1xuICAgKiAgICAgICAgICBpZiAoY29udmVyc2F0aW9uLnBhcnRpY2lwYW50cy5pbmRleE9mKCdhJykgIT0gLTEpIHJldHVybiB0cnVlO1xuICAgKiAgICAgIH0pO1xuICAgKlxuICAgKiBAbWV0aG9kIGZpbmRDYWNoZWRDb252ZXJzYXRpb25cbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGYgLSBGdW5jdGlvbiB0byBjYWxsIHVudGlsIHdlIGZpbmQgYSBtYXRjaFxuICAgKiBAcGFyYW0gIHtsYXllci5Db252ZXJzYXRpb259IGYuY29udmVyc2F0aW9uIC0gQSBjb252ZXJzYXRpb24gdG8gdGVzdFxuICAgKiBAcGFyYW0gIHtib29sZWFufSBmLnJldHVybiAtIFJldHVybiB0cnVlIGlmIHRoZSBjb252ZXJzYXRpb24gaXMgYSBtYXRjaFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IFtjb250ZXh0XSAtIE9wdGlvbmFsIGNvbnRleHQgZm9yIHRoZSAqdGhpcyogb2JqZWN0XG4gICAqIEByZXR1cm4ge2xheWVyLkNvbnZlcnNhdGlvbn1cbiAgICpcbiAgICogQGRlcHJlY2F0ZWRcbiAgICogVGhpcyBzaG91bGQgYmUgcmVwbGFjZWQgYnkgaXRlcmF0aW5nIG92ZXIgeW91ciBsYXllci5RdWVyeSBkYXRhLlxuICAgKi9cbiAgZmluZENhY2hlZENvbnZlcnNhdGlvbihmdW5jLCBjb250ZXh0KSB7XG4gICAgY29uc3QgdGVzdCA9IGNvbnRleHQgPyBmdW5jLmJpbmQoY29udGV4dCkgOiBmdW5jO1xuICAgIGNvbnN0IGxpc3QgPSBPYmplY3Qua2V5cyh0aGlzLl9jb252ZXJzYXRpb25zSGFzaCk7XG4gICAgY29uc3QgbGVuID0gbGlzdC5sZW5ndGg7XG4gICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IGxlbjsgaW5kZXgrKykge1xuICAgICAgY29uc3Qga2V5ID0gbGlzdFtpbmRleF07XG4gICAgICBjb25zdCBjb252ZXJzYXRpb24gPSB0aGlzLl9jb252ZXJzYXRpb25zSGFzaFtrZXldO1xuICAgICAgaWYgKHRlc3QoY29udmVyc2F0aW9uLCBpbmRleCkpIHJldHVybiBjb252ZXJzYXRpb247XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIElmIHRoZSBzZXNzaW9uIGhhcyBiZWVuIHJlc2V0LCBkdW1wIGFsbCBkYXRhLlxuICAgKlxuICAgKiBAbWV0aG9kIF9yZXNldFNlc3Npb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9yZXNldFNlc3Npb24oKSB7XG4gICAgdGhpcy5fY2xlYW51cCgpO1xuICAgIHRoaXMudXNlcnMgPSBbXTtcbiAgICB0aGlzLl9jb252ZXJzYXRpb25zSGFzaCA9IHt9O1xuICAgIHRoaXMuX21lc3NhZ2VzSGFzaCA9IHt9O1xuICAgIHRoaXMuX3F1ZXJpZXNIYXNoID0ge307XG4gICAgcmV0dXJuIHN1cGVyLl9yZXNldFNlc3Npb24oKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYSB1c2VyIHRvIHRoZSB1c2VycyBhcnJheS5cbiAgICpcbiAgICogQnkgZG9pbmcgdGhpcyBpbnN0ZWFkIG9mIGp1c3QgZGlyZWN0bHkgYHRoaXMuY2xpZW50LnVzZXJzLnB1c2godXNlcilgXG4gICAqIHRoZSB1c2VyIHdpbGwgZ2V0IGl0cyBjb252ZXJzYXRpb25zIHByb3BlcnR5IHNldHVwIGNvcnJlY3RseS5cbiAgICpcbiAgICogQG1ldGhvZCBhZGRVc2VyXG4gICAqIEBwYXJhbSAge2xheWVyLlVzZXJ9IHVzZXIgW2Rlc2NyaXB0aW9uXVxuICAgKiBAcmV0dXJucyB7bGF5ZXIuQ2xpZW50fSB0aGlzXG4gICAqL1xuICBhZGRVc2VyKHVzZXIpIHtcbiAgICB0aGlzLnVzZXJzLnB1c2godXNlcik7XG4gICAgdXNlci5zZXRDbGllbnQodGhpcyk7XG4gICAgdGhpcy50cmlnZ2VyKCd1c2VyczpjaGFuZ2UnKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2hlcyBgY2xpZW50LnVzZXJzYCBhcnJheSBmb3IgdGhlIHNwZWNpZmllZCBpZC5cbiAgICpcbiAgICogVXNlIG9mIHRoZSBgY2xpZW50LnVzZXJzYCBhcnJheSBpcyBvcHRpb25hbC5cbiAgICpcbiAgICogICAgICBmdW5jdGlvbiBnZXRTZW5kZXJEaXNwbGF5TmFtZShtZXNzYWdlKSB7XG4gICAqICAgICAgICAgIHZhciB1c2VyID0gY2xpZW50LmZpbmRVc2VyKG1lc3NhZ2Uuc2VuZGVyLnVzZXJJZCk7XG4gICAqICAgICAgICAgIHJldHVybiB1c2VyID8gdXNlci5kaXNwbGF5TmFtZSA6ICdVbmtub3duIFVzZXInO1xuICAgKiAgICAgIH1cbiAgICpcbiAgICogQG1ldGhvZCBmaW5kVXNlclxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IGlkXG4gICAqIEByZXR1cm4ge2xheWVyLlVzZXJ9XG4gICAqL1xuICBmaW5kVXNlcihpZCkge1xuICAgIGNvbnN0IGwgPSB0aGlzLnVzZXJzLmxlbmd0aDtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgY29uc3QgdSA9IHRoaXMudXNlcnNbaV07XG4gICAgICBpZiAodS5pZCA9PT0gaWQpIHJldHVybiB1O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBfXyBNZXRob2RzIGFyZSBhdXRvbWF0aWNhbGx5IGNhbGxlZCBieSBwcm9wZXJ0eSBzZXR0ZXJzLlxuICAgKlxuICAgKiBJbnN1cmUgdGhhdCBhbnkgYXR0ZW1wdCB0byBzZXQgdGhlIGB1c2Vyc2AgcHJvcGVydHkgc2V0cyBpdCB0byBhbiBhcnJheS5cbiAgICpcbiAgICogQG1ldGhvZCBfX2FkanVzdFVzZXJzXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfX2FkanVzdFVzZXJzKHVzZXJzKSB7XG4gICAgaWYgKCF1c2VycykgcmV0dXJuIFtdO1xuICAgIGlmICghQXJyYXkuaXNBcnJheSh1c2VycykpIHJldHVybiBbdXNlcnNdO1xuICB9XG5cbiAgLyoqXG4gICAqIF9fIE1ldGhvZHMgYXJlIGF1dG9tYXRpY2FsbHkgY2FsbGVkIGJ5IHByb3BlcnR5IHNldHRlcnMuXG4gICAqXG4gICAqIEluc3VyZSB0aGF0IGVhY2ggdXNlciBpbiB0aGUgdXNlcnMgYXJyYXkgZ2V0cyBpdHMgY2xpZW50IHByb3BlcnR5IHNldHVwLlxuICAgKlxuICAgKiBAbWV0aG9kIF9fYWRqdXN0VXNlcnNcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9fdXBkYXRlVXNlcnModXNlcnMpIHtcbiAgICB1c2Vycy5mb3JFYWNoKHUgPT4ge1xuICAgICAgaWYgKHUgaW5zdGFuY2VvZiBVc2VyKSB1LnNldENsaWVudCh0aGlzKTtcbiAgICB9KTtcbiAgICB0aGlzLnRyaWdnZXIoJ3VzZXJzOmNoYW5nZScpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoaXMgbWV0aG9kIGlzIHJlY29tbWVuZGVkIHdheSB0byBjcmVhdGUgYSBDb252ZXJzYXRpb24uXG4gICAqXG4gICAqIFRoZXJlIGFyZSBhIGZldyB3YXlzIHRvIGludm9rZSBpdDsgbm90ZSB0aGF0IHRoZSBkZWZhdWx0IGJlaGF2aW9yIGlzIHRvIGNyZWF0ZSBhIERpc3RpbmN0IENvbnZlcnNhdGlvblxuICAgKiB1bmxlc3Mgb3RoZXJ3aXNlIHN0YXRlZCB2aWEgdGhlIGxheWVyLkNvbnZlcnNhdGlvbi5kaXN0aW5jdCBwcm9wZXJ0eS5cbiAgICpcbiAgICogICAgICAgICBjbGllbnQuY3JlYXRlQ29udmVyc2F0aW9uKFsnYScsICdiJ10pO1xuICAgKlxuICAgKiAgICAgICAgIGNsaWVudC5jcmVhdGVDb252ZXJzYXRpb24oe3BhcnRpY2lwYW50czogWydhJywgJ2InXX0pO1xuICAgKlxuICAgKiAgICAgICAgIGNsaWVudC5jcmVhdGVDb252ZXJzYXRpb24oe1xuICAgKiAgICAgICAgICAgICBwYXJ0aWNpcGFudHM6IFsnYScsICdiJ10sXG4gICAqICAgICAgICAgICAgIGRpc3RpbmN0OiBmYWxzZVxuICAgKiAgICAgICAgIH0pO1xuICAgKlxuICAgKiAgICAgICAgIGNsaWVudC5jcmVhdGVDb252ZXJzYXRpb24oe1xuICAgKiAgICAgICAgICAgICBwYXJ0aWNpcGFudHM6IFsnYScsICdiJ10sXG4gICAqICAgICAgICAgICAgIG1ldGFkYXRhOiB7XG4gICAqICAgICAgICAgICAgICAgICB0aXRsZTogJ0kgYW0gYSB0aXRsZSdcbiAgICogICAgICAgICAgICAgfVxuICAgKiAgICAgICAgIH0pO1xuICAgKlxuICAgKiBJZiB5b3UgdHJ5IHRvIGNyZWF0ZSBhIERpc3RpbmN0IENvbnZlcnNhdGlvbiB0aGF0IGFscmVhZHkgZXhpc3RzLFxuICAgKiB5b3Ugd2lsbCBnZXQgYmFjayBhbiBleGlzdGluZyBDb252ZXJzYXRpb24sIGFuZCBhbnkgcmVxdWVzdGVkIG1ldGFkYXRhXG4gICAqIHdpbGwgTk9UIGJlIHNldDsgeW91IHdpbGwgZ2V0IHdoYXRldmVyIG1ldGFkYXRhIHRoZSBtYXRjaGluZyBDb252ZXJzYXRpb25cbiAgICogYWxyZWFkeSBoYWQuXG4gICAqXG4gICAqIFRoZSBkZWZhdWx0IHZhbHVlIGZvciBkaXN0aW5jdCBpcyBgdHJ1ZWAuXG4gICAqXG4gICAqIFdoZXRoZXIgdGhlIENvbnZlcnNhdGlvbiBhbHJlYWR5IGV4aXN0cyBvciBub3QsIGEgJ2NvbnZlcnNhdGlvbnM6c2VudCcgZXZlbnRcbiAgICogd2lsbCBiZSB0cmlnZ2VyZWQgYXN5bmNocm9ub3VzbHkgYW5kIHRoZSBDb252ZXJzYXRpb24gb2JqZWN0IHdpbGwgYmUgcmVhZHlcbiAgICogYXQgdGhhdCB0aW1lLiAgRnVydGhlciwgdGhlIGV2ZW50IHdpbGwgcHJvdmlkZSBkZXRhaWxzIG9uIHRoZSByZXN1bHQ6XG4gICAqXG4gICAqICAgICAgIHZhciBjb252ZXJzYXRpb24gPSBjbGllbnQuY3JlYXRlQ29udmVyc2F0aW9uKFsnYScsICdiJ10pO1xuICAgKiAgICAgICBjb252ZXJzYXRpb24ub24oJ2NvbnZlcnNhdGlvbnM6c2VudCcsIGZ1bmN0aW9uKGV2dCkge1xuICAgKiAgICAgICAgICAgc3dpdGNoKGV2dC5yZXN1bHQpIHtcbiAgICogICAgICAgICAgICAgICBjYXNlIENvbnZlcnNhdGlvbi5DUkVBVEVEOlxuICAgKiAgICAgICAgICAgICAgICAgICBhbGVydChjb252ZXJzYXRpb24uaWQgKyAnIHdhcyBjcmVhdGVkJyk7XG4gICAqICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgKiAgICAgICAgICAgICAgIGNhc2UgQ29udmVyc2F0aW9uLkZPVU5EOlxuICAgKiAgICAgICAgICAgICAgICAgICBhbGVydChjb252ZXJzYXRpb24uaWQgKyAnIHdhcyBmb3VuZCcpO1xuICAgKiAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICogICAgICAgICAgICAgICBjYXNlIENvbnZlcnNhdGlvbi5GT1VORF9XSVRIT1VUX1JFUVVFU1RFRF9NRVRBREFUQTpcbiAgICogICAgICAgICAgICAgICAgICAgYWxlcnQoY29udmVyc2F0aW9uLmlkICsgJyB3YXMgZm91bmQgYnV0IGl0IGFscmVhZHkgaGFzIGEgdGl0bGUgc28geW91ciByZXF1ZXN0ZWQgdGl0bGUgd2FzIG5vdCBzZXQnKTtcbiAgICogICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAqICAgICAgICAgICAgfVxuICAgKiAgICAgICB9KTtcbiAgICpcbiAgICogQG1ldGhvZCBjcmVhdGVDb252ZXJzYXRpb25cbiAgICogQHBhcmFtICB7T2JqZWN0L3N0cmluZ1tdfSBvcHRpb25zIEVpdGhlciBhbiBhcnJheSBvZiBwYXJ0aWNpcGFudHMsXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9yIGFuIG9iamVjdCB3aXRoIHBhcmFtZXRlcnMgdG8gcGFzcyB0b1xuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBDb252ZXJzYXRpb24ncyBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmRpc3RpbmN0PXRydWVdIElzIHRoaXMgYSBkaXN0aW5jdCBDb252ZXJhdGlvbj9cbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLm1ldGFkYXRhPXt9XSBNZXRhZGF0YSBmb3IgeW91ciBDb252ZXJzYXRpb25cbiAgICogQHJldHVybiB7bGF5ZXIuQ29udmVyc2F0aW9ufVxuICAgKi9cbiAgY3JlYXRlQ29udmVyc2F0aW9uKG9wdGlvbnMpIHtcbiAgICBsZXQgb3B0cztcbiAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zKSkge1xuICAgICAgb3B0cyA9IHtcbiAgICAgICAgcGFydGljaXBhbnRzOiBvcHRpb25zLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0cyA9IG9wdGlvbnM7XG4gICAgfVxuICAgIGlmICghKCdkaXN0aW5jdCcgaW4gb3B0cykpIG9wdHMuZGlzdGluY3QgPSB0cnVlO1xuICAgIG9wdHMuY2xpZW50ID0gdGhpcztcbiAgICByZXR1cm4gQ29udmVyc2F0aW9uLmNyZWF0ZShvcHRzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSB0aGUgcXVlcnkgYnkgcXVlcnkgaWQuXG4gICAqXG4gICAqIFVzZWZ1bCBmb3IgZmluZGluZyBhIFF1ZXJ5IHdoZW4geW91IG9ubHkgaGF2ZSB0aGUgSURcbiAgICpcbiAgICogQG1ldGhvZCBnZXRRdWVyeVxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IGlkICAgICAgICAgICAgICAtIGxheWVyOi8vL21lc3NhZ2VzL3V1aWRcbiAgICogQHJldHVybiB7bGF5ZXIuUXVlcnl9XG4gICAqL1xuICBnZXRRdWVyeShpZCkge1xuICAgIGlmICh0eXBlb2YgaWQgIT09ICdzdHJpbmcnKSB0aHJvdyBuZXcgRXJyb3IoTGF5ZXJFcnJvci5kaWN0aW9uYXJ5LmlkUGFyYW1SZXF1aXJlZCk7XG5cbiAgICBpZiAodGhpcy5fcXVlcmllc0hhc2hbaWRdKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcmllc0hhc2hbaWRdO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUaGVyZSBhcmUgdHdvIG9wdGlvbnMgdG8gY3JlYXRlIGEgbmV3IGxheWVyLlF1ZXJ5IGluc3RhbmNlLlxuICAgKlxuICAgKiBUaGUgZGlyZWN0IHdheTpcbiAgICpcbiAgICogICAgIHZhciBxdWVyeSA9IGNsaWVudC5jcmVhdGVRdWVyeSh7XG4gICAqICAgICAgICAgbW9kZWw6IGxheWVyLlF1ZXJ5Lk1lc3NhZ2UsXG4gICAqICAgICAgICAgcHJlZGljYXRlOiAnY29udmVyc2F0aW9uLmlkID0gJycgKyBjb252LmlkICsgJycnLFxuICAgKiAgICAgICAgIHBhZ2luYXRpb25XaW5kb3c6IDUwXG4gICAqICAgICB9KTtcbiAgICpcbiAgICogQSBCdWlsZGVyIGFwcHJvYWNoIHRoYXQgYWxsb3dzIGZvciBhIHNpbXBsZXIgc3ludGF4OlxuICAgKlxuICAgKiAgICAgdmFyIHFCdWlsZGVyID0gUXVlcnlCdWlsZGVyXG4gICAqICAgICAgLm1lc3NhZ2VzKClcbiAgICogICAgICAuZm9yQ29udmVyc2F0aW9uKCdsYXllcjovLy9jb252ZXJzYXRpb25zL2ZmZmZmZmZmLWZmZmYtZmZmZi1mZmZmLWZmZmZmZmZmZmZmZicpXG4gICAqICAgICAgLnBhZ2luYXRpb25XaW5kb3coMTAwKTtcbiAgICogICAgIHZhciBxdWVyeSA9IGNsaWVudC5jcmVhdGVRdWVyeShxQnVpbGRlcik7XG4gICAqXG4gICAqIEBtZXRob2QgY3JlYXRlUXVlcnlcbiAgICogQHBhcmFtICB7bGF5ZXIuUXVlcnlCdWlsZGVyfE9iamVjdH0gb3B0aW9ucyAtIEVpdGhlciBhIGxheWVyLlF1ZXJ5QnVpbGRlciBpbnN0YW5jZSwgb3IgcGFyYW1ldGVycyBmb3IgdGhlIGxheWVyLlF1ZXJ5IGNvbnN0cnVjdG9yXG4gICAqIEByZXR1cm4ge2xheWVyLlF1ZXJ5fVxuICAgKi9cbiAgY3JlYXRlUXVlcnkob3B0aW9ucykge1xuICAgIGxldCBxdWVyeTtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMuYnVpbGQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHF1ZXJ5ID0gbmV3IFF1ZXJ5KHRoaXMsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb25zLmNsaWVudCA9IHRoaXM7XG4gICAgICBxdWVyeSA9IG5ldyBRdWVyeShvcHRpb25zKTtcbiAgICB9XG4gICAgdGhpcy5fYWRkUXVlcnkocXVlcnkpO1xuICAgIHJldHVybiBxdWVyeTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciB0aGUgbGF5ZXIuUXVlcnkuXG4gICAqXG4gICAqIEBtZXRob2QgX2FkZFF1ZXJ5XG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge2xheWVyLlF1ZXJ5fSBxdWVyeVxuICAgKi9cbiAgX2FkZFF1ZXJ5KHF1ZXJ5KSB7XG4gICAgdGhpcy5fcXVlcmllc0hhc2hbcXVlcnkuaWRdID0gcXVlcnk7XG4gIH1cblxuICAvKipcbiAgICogRGVyZWdpc3RlciB0aGUgbGF5ZXIuUXVlcnkuXG4gICAqXG4gICAqIEBtZXRob2QgX3JlbW92ZVF1ZXJ5XG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge2xheWVyLlF1ZXJ5fSBxdWVyeSBbZGVzY3JpcHRpb25dXG4gICAqL1xuICBfcmVtb3ZlUXVlcnkocXVlcnkpIHtcbiAgICBpZiAocXVlcnkpIHtcbiAgICAgIGlmICghdGhpcy5faW5DbGVhbnVwKSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSBxdWVyeS5kYXRhXG4gICAgICAgICAgLm1hcChvYmogPT4gdGhpcy5fZ2V0T2JqZWN0KG9iai5pZCkpXG4gICAgICAgICAgLmZpbHRlcihvYmogPT4gb2JqKTtcbiAgICAgICAgdGhpcy5fY2hlY2tDYWNoZShkYXRhKTtcbiAgICAgIH1cbiAgICAgIHRoaXMub2ZmKG51bGwsIG51bGwsIHF1ZXJ5KTtcbiAgICAgIGRlbGV0ZSB0aGlzLl9xdWVyaWVzSGFzaFtxdWVyeS5pZF07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHRvIHNlZSBpZiB0aGUgc3BlY2lmaWVkIG9iamVjdHMgY2FuIHNhZmVseSBiZSByZW1vdmVkIGZyb20gY2FjaGUuXG4gICAqXG4gICAqIFJlbW92ZXMgZnJvbSBjYWNoZSBpZiBhbiBvYmplY3QgaXMgbm90IHBhcnQgb2YgYW55IFF1ZXJ5J3MgcmVzdWx0IHNldC5cbiAgICpcbiAgICogQG1ldGhvZCBfY2hlY2tDYWNoZVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0gIHtsYXllci5Sb290W119IG9iamVjdHMgLSBBcnJheSBvZiBNZXNzYWdlcyBvciBDb252ZXJzYXRpb25zXG4gICAqL1xuICBfY2hlY2tDYWNoZShvYmplY3RzKSB7XG4gICAgb2JqZWN0cy5mb3JFYWNoKG9iaiA9PiB7XG4gICAgICBpZiAoIXRoaXMuX2lzQ2FjaGVkT2JqZWN0KG9iaikpIHtcbiAgICAgICAgaWYgKG9iaiBpbnN0YW5jZW9mIFJvb3QgPT09IGZhbHNlKSBvYmogPSB0aGlzLl9nZXRPYmplY3Qob2JqLmlkKTtcbiAgICAgICAgb2JqLmRlc3Ryb3koKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRydWUgaWYgdGhlIHNwZWNpZmllZCBvYmplY3Qgc2hvdWxkIGNvbnRpbnVlIHRvIGJlIHBhcnQgb2YgdGhlIGNhY2hlLlxuICAgKlxuICAgKiBSZXN1bHQgaXMgYmFzZWQgb24gd2hldGhlciB0aGUgb2JqZWN0IGlzIHBhcnQgb2YgdGhlIGRhdGEgZm9yIGEgUXVlcnkuXG4gICAqXG4gICAqIEBtZXRob2QgX2lzQ2FjaGVkT2JqZWN0XG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge2xheWVyLlJvb3R9IG9iaiAtIEEgTWVzc2FnZSBvciBDb252ZXJzYXRpb24gSW5zdGFuY2VcbiAgICogQHJldHVybiB7Qm9vbGVhbn1cbiAgICovXG4gIF9pc0NhY2hlZE9iamVjdChvYmopIHtcbiAgICBjb25zdCBsaXN0ID0gT2JqZWN0LmtleXModGhpcy5fcXVlcmllc0hhc2gpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLl9xdWVyaWVzSGFzaFtsaXN0W2ldXTtcbiAgICAgIGlmIChxdWVyeS5fZ2V0SXRlbShvYmouaWQpKSByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogT24gcmVzdG9yaW5nIGEgY29ubmVjdGlvbiwgZGV0ZXJtaW5lIHdoYXQgc3RlcHMgbmVlZCB0byBiZSB0YWtlbiB0byB1cGRhdGUgb3VyIGRhdGEuXG4gICAqXG4gICAqIEEgcmVzZXQgYm9vbGVhbiBwcm9wZXJ0eSBpcyBwYXNzZWQ7IHNldCBiYXNlZCBvbiAgbGF5ZXIuQ2xpZW50QXV0aGVudGljYXRvci5SZXNldEFmdGVyT2ZmbGluZUR1cmF0aW9uLlxuICAgKlxuICAgKiBOb3RlIGl0IGlzIHBvc3NpYmxlIGZvciBhbiBhcHBsaWNhdGlvbiB0byBoYXZlIGxvZ2ljIHRoYXQgY2F1c2VzIHF1ZXJpZXMgdG8gYmUgY3JlYXRlZC9kZXN0cm95ZWRcbiAgICogYXMgYSBzaWRlLWVmZmVjdCBvZiBsYXllci5RdWVyeS5yZXNldCBkZXN0cm95aW5nIGFsbCBkYXRhLiBTbyB3ZSBtdXN0IHRlc3QgdG8gc2VlIGlmIHF1ZXJpZXMgZXhpc3QuXG4gICAqXG4gICAqIEBtZXRob2QgX2Nvbm5lY3Rpb25SZXN0b3JlZFxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IHJlc2V0IC0gU2hvdWxkIHRoZSBzZXNzaW9uIHJlc2V0L3JlbG9hZCBhbGwgZGF0YSBvciBhdHRlbXB0IHRvIHJlc3VtZSB3aGVyZSBpdCBsZWZ0IG9mZj9cbiAgICovXG4gIF9jb25uZWN0aW9uUmVzdG9yZWQoZXZ0KSB7XG4gICAgaWYgKGV2dC5yZXNldCkge1xuICAgICAgbG9nZ2VyLmRlYnVnKCdDbGllbnQgQ29ubmVjdGlvbiBSZXN0b3JlZDsgUmVzZXR0aW5nIGFsbCBRdWVyaWVzJyk7XG4gICAgICBPYmplY3Qua2V5cyh0aGlzLl9xdWVyaWVzSGFzaCkuZm9yRWFjaChpZCA9PiB7XG4gICAgICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5fcXVlcmllc0hhc2hbaWRdO1xuICAgICAgICBpZiAocXVlcnkpIHF1ZXJ5LnJlc2V0KCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIHRoZSBzcGVjaWZpZWQgb2JqZWN0IGZyb20gY2FjaGVcbiAgICpcbiAgICogQG1ldGhvZCBfcmVtb3ZlT2JqZWN0XG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge2xheWVyLlJvb3R9ICBvYmogLSBBIE1lc3NhZ2Ugb3IgQ29udmVyc2F0aW9uIEluc3RhbmNlXG4gICAqL1xuICBfcmVtb3ZlT2JqZWN0KG9iaikge1xuICAgIGlmIChvYmopIG9iai5kZXN0cm95KCk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIGxheWVyLlR5cGluZ0luZGljYXRvcnMuVHlwaW5nTGlzdGVuZXIgaW5zdGFuY2VcbiAgICogYm91bmQgdG8gdGhlIHNwZWNpZmllZCBkb20gbm9kZS5cbiAgICpcbiAgICogICAgICB2YXIgdHlwaW5nTGlzdGVuZXIgPSBjbGllbnQuY3JlYXRlVHlwaW5nTGlzdGVuZXIoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ215VGV4dEJveCcpKTtcbiAgICogICAgICB0eXBpbmdMaXN0ZW5lci5zZXRDb252ZXJzYXRpb24obXlTZWxlY3RlZENvbnZlcnNhdGlvbik7XG4gICAqXG4gICAqIFVzZSB0aGlzIG1ldGhvZCB0byBpbnN0YW50aWF0ZSBhIGxpc3RlbmVyLCBhbmQgY2FsbFxuICAgKiBsYXllci5UeXBpbmdJbmRpY2F0b3JzLlR5cGluZ0xpc3RlbmVyLnNldENvbnZlcnNhdGlvbiBldmVyeSB0aW1lIHlvdSB3YW50IHRvIGNoYW5nZSB3aGljaCBDb252ZXJzYXRpb25cbiAgICogaXQgcmVwb3J0cyB5b3VyIHVzZXIgaXMgdHlwaW5nIGludG8uXG4gICAqXG4gICAqIEBtZXRob2QgY3JlYXRlVHlwaW5nTGlzdGVuZXJcbiAgICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGlucHV0Tm9kZSAtIFRleHQgaW5wdXQgdG8gd2F0Y2ggZm9yIGtleXN0cm9rZXNcbiAgICogQHJldHVybiB7bGF5ZXIuVHlwaW5nSW5kaWNhdG9ycy5UeXBpbmdMaXN0ZW5lcn1cbiAgICovXG4gIGNyZWF0ZVR5cGluZ0xpc3RlbmVyKGlucHV0Tm9kZSkge1xuICAgIGNvbnN0IFR5cGluZ0xpc3RlbmVyID0gcmVxdWlyZSgnLi90eXBpbmctaW5kaWNhdG9ycy90eXBpbmctbGlzdGVuZXInKTtcbiAgICByZXR1cm4gbmV3IFR5cGluZ0xpc3RlbmVyKHtcbiAgICAgIGNsaWVudElkOiB0aGlzLmFwcElkLFxuICAgICAgaW5wdXQ6IGlucHV0Tm9kZSxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbGF5ZXIuVHlwaW5nSW5kaWNhdG9ycy5UeXBpbmdQdWJsaXNoZXIuXG4gICAqXG4gICAqIFRoZSBUeXBpbmdQdWJsaXNoZXIgbGV0cyB5b3UgbWFuYWdlIHlvdXIgVHlwaW5nIEluZGljYXRvcnMgd2l0aG91dCB1c2luZ1xuICAgKiB0aGUgbGF5ZXIuVHlwaW5nSW5kaWNhdG9ycy5UeXBpbmdMaXN0ZW5lci5cbiAgICpcbiAgICogICAgICB2YXIgdHlwaW5nUHVibGlzaGVyID0gY2xpZW50LmNyZWF0ZVR5cGluZ1B1Ymxpc2hlcigpO1xuICAgKiAgICAgIHR5cGluZ1B1Ymxpc2hlci5zZXRDb252ZXJzYXRpb24obXlTZWxlY3RlZENvbnZlcnNhdGlvbik7XG4gICAqICAgICAgdHlwaW5nUHVibGlzaGVyLnNldFN0YXRlKGxheWVyLlR5cGluZ0luZGljYXRvcnMuU1RBUlRFRCk7XG4gICAqXG4gICAqIFVzZSB0aGlzIG1ldGhvZCB0byBpbnN0YW50aWF0ZSBhIGxpc3RlbmVyLCBhbmQgY2FsbFxuICAgKiBsYXllci5UeXBpbmdJbmRpY2F0b3JzLlR5cGluZ1B1Ymxpc2hlci5zZXRDb252ZXJzYXRpb24gZXZlcnkgdGltZSB5b3Ugd2FudCB0byBjaGFuZ2Ugd2hpY2ggQ29udmVyc2F0aW9uXG4gICAqIGl0IHJlcG9ydHMgeW91ciB1c2VyIGlzIHR5cGluZyBpbnRvLlxuICAgKlxuICAgKiBVc2UgbGF5ZXIuVHlwaW5nSW5kaWNhdG9ycy5UeXBpbmdQdWJsaXNoZXIuc2V0U3RhdGUgdG8gaW5mb3JtIG90aGVyIHVzZXJzIG9mIHlvdXIgY3VycmVudCBzdGF0ZS5cbiAgICogTm90ZSB0aGF0IHRoZSBgU1RBUlRFRGAgc3RhdGUgb25seSBsYXN0cyBmb3IgMi41IHNlY29uZHMsIHNvIHlvdVxuICAgKiBtdXN0IHJlcGVhdGVkbHkgY2FsbCBzZXRTdGF0ZSBmb3IgYXMgbG9uZyBhcyB0aGlzIHN0YXRlIHNob3VsZCBjb250aW51ZS5cbiAgICogVGhpcyBpcyB0eXBpY2FsbHkgZG9uZSBieSBzaW1wbHkgY2FsbGluZyBpdCBldmVyeSB0aW1lIGEgdXNlciBoaXRzXG4gICAqIGEga2V5LlxuICAgKlxuICAgKiBAbWV0aG9kIGNyZWF0ZVR5cGluZ1B1Ymxpc2hlclxuICAgKiBAcmV0dXJuIHtsYXllci5UeXBpbmdJbmRpY2F0b3JzLlR5cGluZ1B1Ymxpc2hlcn1cbiAgICovXG4gIGNyZWF0ZVR5cGluZ1B1Ymxpc2hlcigpIHtcbiAgICBjb25zdCBUeXBpbmdQdWJsaXNoZXIgPSByZXF1aXJlKCcuL3R5cGluZy1pbmRpY2F0b3JzL3R5cGluZy1wdWJsaXNoZXInKTtcbiAgICByZXR1cm4gbmV3IFR5cGluZ1B1Ymxpc2hlcih7XG4gICAgICBjbGllbnRJZDogdGhpcy5hcHBJZCxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBY2Nlc3NvciBmb3IgZ2V0dGluZyBhIENsaWVudCBieSBhcHBJZC5cbiAgICpcbiAgICogTW9zdCBhcHBzIHdpbGwgb25seSBoYXZlIG9uZSBjbGllbnQsXG4gICAqIGFuZCB3aWxsIG5vdCBuZWVkIHRoaXMgbWV0aG9kLlxuICAgKlxuICAgKiBAbWV0aG9kIGdldENsaWVudFxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSAge3N0cmluZ30gYXBwSWRcbiAgICogQHJldHVybiB7bGF5ZXIuQ2xpZW50fVxuICAgKi9cbiAgc3RhdGljIGdldENsaWVudChhcHBJZCkge1xuICAgIHJldHVybiBDbGllbnRSZWdpc3RyeS5nZXQoYXBwSWQpO1xuICB9XG5cbiAgc3RhdGljIGRlc3Ryb3lBbGxDbGllbnRzKCkge1xuICAgIENsaWVudFJlZ2lzdHJ5LmdldEFsbCgpLmZvckVhY2goY2xpZW50ID0+IGNsaWVudC5kZXN0cm95KCkpO1xuICB9XG5cbiAgLypcbiAgICogUmVnaXN0ZXJzIGEgcGx1Z2luIHdoaWNoIGNhbiBhZGQgY2FwYWJpbGl0aWVzIHRvIHRoZSBDbGllbnQuXG4gICAqXG4gICAqIENhcGFiaWxpdGllcyBtdXN0IGJlIHRyaWdnZXJlZCBieSBFdmVudHMvRXZlbnQgTGlzdGVuZXJzLlxuICAgKlxuICAgKiBUaGlzIGNvbmNlcHQgaXMgYSBiaXQgcHJlbWF0dXJlIGFuZCB1bnVzZWQvdW50ZXN0ZWQuLi5cbiAgICogQXMgaW1wbGVtZW50ZWQsIGl0IHByb3ZpZGVzIGZvciBhIHBsdWdpbiB0aGF0IHdpbGwgYmVcbiAgICogaW5zdGFudGlhdGVkIGJ5IHRoZSBDbGllbnQgYW5kIHBhc3NlZCB0aGUgQ2xpZW50IGFzIGl0cyBwYXJhbWV0ZXIuXG4gICAqIFRoaXMgYWxsb3dzIGZvciBhIGxpYnJhcnkgb2YgcGx1Z2lucyB0aGF0IGNhbiBiZSBzaGFyZWQgYW1vbmdcbiAgICogZGlmZmVyZW50IGNvbXBhbmllcy9wcm9qZWN0cyBidXQgdGhhdCBhcmUgb3V0c2lkZSBvZiB0aGUgY29yZVxuICAgKiBhcHAgbG9naWMuXG4gICAqXG4gICAqICAgICAgLy8gRGVmaW5lIHRoZSBwbHVnaW5cbiAgICogICAgICBmdW5jdGlvbiBNeVBsdWdpbihjbGllbnQpIHtcbiAgICogICAgICAgICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XG4gICAqICAgICAgICAgIGNsaWVudC5vbignbWVzc2FnZXM6YWRkJywgdGhpcy5vbk1lc3NhZ2VzQWRkLCB0aGlzKTtcbiAgICogICAgICB9XG4gICAqXG4gICAqICAgICAgTXlQbHVnaW4ucHJvdG90eXBlLm9uTWVzc2FnZXNBZGQgPSBmdW5jdGlvbihldmVudCkge1xuICAgKiAgICAgICAgICB2YXIgbWVzc2FnZXMgPSBldmVudC5tZXNzYWdlcztcbiAgICogICAgICAgICAgYWxlcnQoJ1lvdSBub3cgaGF2ZSAnICsgbWVzc2FnZXMubGVuZ3RoICArICcgbWVzc2FnZXMnKTtcbiAgICogICAgICB9XG4gICAqXG4gICAqICAgICAgLy8gUmVnaXN0ZXIgdGhlIFBsdWdpblxuICAgKiAgICAgIENsaWVudC5yZWdpc3RlclBsdWdpbignbXlQbHVnaW4zNCcsIE15UGx1Z2luKTtcbiAgICpcbiAgICogICAgICB2YXIgY2xpZW50ID0gbmV3IENsaWVudCh7YXBwSWQ6ICdsYXllcjovLy9hcHBzL3N0YWdpbmcvdXVpZCd9KTtcbiAgICpcbiAgICogICAgICAvLyBUcmlnZ2VyIHRoZSBwbHVnaW4ncyBiZWhhdmlvclxuICAgKiAgICAgIGNsaWVudC5teVBsdWdpbjM0LmFkZE1lc3NhZ2VzKHttZXNzYWdlczpbXX0pO1xuICAgKlxuICAgKiBAbWV0aG9kIHJlZ2lzdGVyUGx1Z2luXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtICB7c3RyaW5nfSBuYW1lICAgICBbZGVzY3JpcHRpb25dXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjbGFzc0RlZiBbZGVzY3JpcHRpb25dXG4gICAqL1xuICBzdGF0aWMgcmVnaXN0ZXJQbHVnaW4obmFtZSwgY2xhc3NEZWYpIHtcbiAgICBDbGllbnQucGx1Z2luc1tuYW1lXSA9IGNsYXNzRGVmO1xuICB9XG5cbn1cblxuLyoqXG4gKiBIYXNoIG9mIGxheWVyLkNvbnZlcnNhdGlvbiBvYmplY3RzIGZvciBxdWljayBsb29rdXAgYnkgaWRcbiAqXG4gKiBAcHJpdmF0ZVxuICogQHByb3BlcnR5IHtPYmplY3R9XG4gKi9cbkNsaWVudC5wcm90b3R5cGUuX2NvbnZlcnNhdGlvbnNIYXNoID0gbnVsbDtcblxuLyoqXG4gKiBIYXNoIG9mIGxheWVyLk1lc3NhZ2Ugb2JqZWN0cyBmb3IgcXVpY2sgbG9va3VwIGJ5IGlkXG4gKlxuICogQHByaXZhdGVcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbkNsaWVudC5wcm90b3R5cGUuX21lc3NhZ2VzSGFzaCA9IG51bGw7XG5cblxuLyoqXG4gKiBIYXNoIG1hcHBpbmcgdGVtcG9yYXJ5IENvbnZlcnNhdGlvbiBJRHMgdG8gc2VydmVyIGdlbmVyYXRlZCBJRHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbkNsaWVudC5wcm90b3R5cGUuX3RlbXBDb252ZXJzYXRpb25zSGFzaCA9IG51bGw7XG5cbi8qKlxuICogSGFzaCBtYXBwaW5nIHRlbXBvcmFyeSBNZXNzYWdlIElEcyB0byBzZXJ2ZXIgZ2VuZXJhdGVkIElEcy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHR5cGUge09iamVjdH1cbiAqL1xuQ2xpZW50LnByb3RvdHlwZS5fdGVtcE1lc3NhZ2VzSGFzaCA9IG51bGw7XG5cblxuLyoqXG4gKiBIYXNoIG9mIGxheWVyLlF1ZXJ5IG9iamVjdHMgZm9yIHF1aWNrIGxvb2t1cCBieSBpZFxuICpcbiAqIEBwcml2YXRlXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG5DbGllbnQucHJvdG90eXBlLl9xdWVyaWVzSGFzaCA9IG51bGw7XG5cbi8qKlxuICogQXJyYXkgb2YgbGF5ZXIuVXNlciBvYmplY3RzLlxuICpcbiAqIFVzZSBvZiB0aGlzIHByb3BlcnR5IGlzIG9wdGlvbmFsOyBidXQgYnkgc3RvcmluZ1xuICogYW4gYXJyYXkgb2YgbGF5ZXIuVXNlciBvYmplY3RzIGluIHRoaXMgYXJyYXksIHlvdSBjYW5cbiAqIHRoZW4gdXNlIHRoZSBgY2xpZW50LmZpbmRVc2VyKHVzZXJJZClgIG1ldGhvZCB0byBsb29rdXBcbiAqIHVzZXJzOyBhbmQgeW91IGNhbiB1c2UgdGhlIGxheWVyLlVzZXIgb2JqZWN0cyB0byBmaW5kXG4gKiBzdWl0YWJsZSBDb252ZXJzYXRpb25zIHNvIHlvdSBjYW4gYXNzb2NpYXRlIGEgRGlyZWN0XG4gKiBNZXNzYWdlIGNvbnZlcnNhdGlvbiB3aXRoIGVhY2ggdXNlci5cbiAqXG4gKiBAdHlwZSB7bGF5ZXIuVXNlcltdfVxuICovXG5DbGllbnQucHJvdG90eXBlLnVzZXJzID0gbnVsbDtcblxuQ2xpZW50Ll9pZ25vcmVkRXZlbnRzID0gW1xuICAnY29udmVyc2F0aW9uczpsb2FkZWQnLFxuICAnY29udmVyc2F0aW9uczpsb2FkZWQtZXJyb3InLFxuXTtcblxuQ2xpZW50Ll9zdXBwb3J0ZWRFdmVudHMgPSBbXG5cbiAgLyoqXG4gICAqIE9uZSBvciBtb3JlIGxheWVyLkNvbnZlcnNhdGlvbiBvYmplY3RzIGhhdmUgYmVlbiBhZGRlZCB0byB0aGUgY2xpZW50LlxuICAgKlxuICAgKiBUaGV5IG1heSBoYXZlIGJlZW4gYWRkZWQgdmlhIHRoZSB3ZWJzb2NrZXQsIG9yIHZpYSB0aGUgdXNlciBjcmVhdGluZ1xuICAgKiBhIG5ldyBDb252ZXJzYXRpb24gbG9jYWxseS5cbiAgICpcbiAgICogICAgICBjbGllbnQub24oJ2NvbnZlcnNhdGlvbnM6YWRkJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAqICAgICAgICAgIGV2dC5jb252ZXJzYXRpb25zLmZvckVhY2goZnVuY3Rpb24oY29udmVyc2F0aW9uKSB7XG4gICAqICAgICAgICAgICAgICBteVZpZXcuYWRkQ29udmVyc2F0aW9uKGNvbnZlcnNhdGlvbik7XG4gICAqICAgICAgICAgIH0pO1xuICAgKiAgICAgIH0pO1xuICAgKlxuICAgKiBAZXZlbnRcbiAgICogQHBhcmFtIHtsYXllci5MYXllckV2ZW50fSBldnRcbiAgICogQHBhcmFtIHtsYXllci5Db252ZXJzYXRpb25bXX0gZXZ0LmNvbnZlcnNhdGlvbnMgLSBBcnJheSBvZiBjb252ZXJzYXRpb25zIGFkZGVkXG4gICAqL1xuICAnY29udmVyc2F0aW9uczphZGQnLFxuXG4gIC8qKlxuICAgKiBPbmUgb3IgbW9yZSBsYXllci5Db252ZXJzYXRpb24gb2JqZWN0cyBoYXZlIGJlZW4gcmVtb3ZlZC5cbiAgICpcbiAgICogQSByZW1vdmVkIENvbnZlcnNhdGlvbiBpcyBub3QgbmVjZXNzYXJpbHkgZGVsZXRlZCwgaXRzIGp1c3RcbiAgICogbm8gbG9uZ2VyIGJlaW5nIGhlbGQgaW4gbG9jYWwgbWVtb3J5LlxuICAgKlxuICAgKiBOb3RlIHRoYXQgdHlwaWNhbGx5IHlvdSB3aWxsIHdhbnQgdGhlIGNvbnZlcnNhdGlvbnM6ZGVsZXRlIGV2ZW50XG4gICAqIHJhdGhlciB0aGFuIGNvbnZlcnNhdGlvbnM6cmVtb3ZlLlxuICAgKlxuICAgKiAgICAgIGNsaWVudC5vbignY29udmVyc2F0aW9uczpyZW1vdmUnLCBmdW5jdGlvbihldnQpIHtcbiAgICogICAgICAgICAgZXZ0LmNvbnZlcnNhdGlvbnMuZm9yRWFjaChmdW5jdGlvbihjb252ZXJzYXRpb24pIHtcbiAgICogICAgICAgICAgICAgIG15Vmlldy5yZW1vdmVDb252ZXJzYXRpb24oY29udmVyc2F0aW9uKTtcbiAgICogICAgICAgICAgfSk7XG4gICAqICAgICAgfSk7XG4gICAqXG4gICAqIEBldmVudFxuICAgKiBAcGFyYW0ge2xheWVyLkxheWVyRXZlbnR9IGV2dFxuICAgKiBAcGFyYW0ge2xheWVyLkNvbnZlcnNhdGlvbltdfSBldnQuY29udmVyc2F0aW9ucyAtIEFycmF5IG9mIGNvbnZlcnNhdGlvbnMgcmVtb3ZlZFxuICAgKi9cbiAgJ2NvbnZlcnNhdGlvbnM6cmVtb3ZlJyxcblxuICAvKipcbiAgICogVGhlIGNvbnZlcnNhdGlvbiBpcyBub3cgb24gdGhlIHNlcnZlci5cbiAgICpcbiAgICogQ2FsbGVkIGFmdGVyIGNyZWF0aW5nIHRoZSBjb252ZXJzYXRpb25cbiAgICogb24gdGhlIHNlcnZlci4gIFRoZSBSZXN1bHQgcHJvcGVydHkgaXMgb25lIG9mOlxuICAgKlxuICAgKiAqIGxheWVyLkNvbnZlcnNhdGlvbi5DUkVBVEVEOiBBIG5ldyBDb252ZXJzYXRpb24gaGFzIGJlZW4gY3JlYXRlZFxuICAgKiAqIGxheWVyLkNvbnZlcnNhdGlvbi5GT1VORDogQSBtYXRjaGluZyBEaXN0aW5jdCBDb252ZXJzYXRpb24gaGFzIGJlZW4gZm91bmRcbiAgICogKiBsYXllci5Db252ZXJzYXRpb24uRk9VTkRfV0lUSE9VVF9SRVFVRVNURURfTUVUQURBVEE6IEEgbWF0Y2hpbmcgRGlzdGluY3QgQ29udmVyc2F0aW9uIGhhcyBiZWVuIGZvdW5kXG4gICAqICAgICAgICAgICAgICAgICAgICAgICBidXQgbm90ZSB0aGF0IHRoZSBtZXRhZGF0YSBpcyBOT1Qgd2hhdCB5b3UgcmVxdWVzdGVkLlxuICAgKlxuICAgKiBBbGwgb2YgdGhlc2UgcmVzdWx0cyB3aWxsIGFsc28gbWVhbiB0aGF0IHRoZSB1cGRhdGVkIHByb3BlcnR5IHZhbHVlcyBoYXZlIGJlZW5cbiAgICogY29waWVkIGludG8geW91ciBDb252ZXJzYXRpb24gb2JqZWN0LiAgVGhhdCBtZWFucyB5b3VyIG1ldGFkYXRhIHByb3BlcnR5IG1heSBub1xuICAgKiBsb25nZXIgYmUgaXRzIGluaXRpYWwgdmFsdWU7IGl0IHdpbGwgYmUgdGhlIHZhbHVlIGZvdW5kIG9uIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqICAgICAgY2xpZW50Lm9uKCdjb252ZXJzYXRpb25zOnNlbnQnLCBmdW5jdGlvbihldnQpIHtcbiAgICogICAgICAgICAgc3dpdGNoKGV2dC5yZXN1bHQpIHtcbiAgICogICAgICAgICAgICAgIGNhc2UgQ29udmVyc2F0aW9uLkNSRUFURUQ6XG4gICAqICAgICAgICAgICAgICAgICAgYWxlcnQoZXZ0LnRhcmdldC5pZCArICcgQ3JlYXRlZCEnKTtcbiAgICogICAgICAgICAgICAgICAgICBicmVhaztcbiAgICogICAgICAgICAgICAgIGNhc2UgQ29udmVyc2F0aW9uLkZPVU5EOlxuICAgKiAgICAgICAgICAgICAgICAgIGFsZXJ0KGV2dC50YXJnZXQuaWQgKyAnIEZvdW5kIScpO1xuICAgKiAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgKiAgICAgICAgICAgICAgY2FzZSBDb252ZXJzYXRpb24uRk9VTkRfV0lUSE9VVF9SRVFVRVNURURfTUVUQURBVEE6XG4gICAqICAgICAgICAgICAgICAgICAgYWxlcnQoZXZ0LnRhcmdldC5pZCArICcgRm91bmQsIGJ1dCBkb2VzIG5vdCBoYXZlIHRoZSByZXF1ZXN0ZWQgbWV0YWRhdGEhJyk7XG4gICAqICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAqICAgICAgICAgIH1cbiAgICogICAgICB9KTtcbiAgICpcbiAgICogQGV2ZW50XG4gICAqIEBwYXJhbSB7bGF5ZXIuTGF5ZXJFdmVudH0gZXZlbnRcbiAgICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50LnJlc3VsdFxuICAgKiBAcGFyYW0ge2xheWVyLkNvbnZlcnNhdGlvbn0gdGFyZ2V0XG4gICAqL1xuICAnY29udmVyc2F0aW9uczpzZW50JyxcblxuICAvKipcbiAgICogQSBjb252ZXJzYXRpb24gZmFpbGVkIHRvIGxvYWQgb3IgY3JlYXRlIG9uIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqICAgICAgY2xpZW50Lm9uKCdjb252ZXJzYXRpb25zOnNlbnQtZXJyb3InLCBmdW5jdGlvbihldnQpIHtcbiAgICogICAgICAgICAgYWxlcnQoZXZ0LmRhdGEubWVzc2FnZSk7XG4gICAqICAgICAgfSk7XG4gICAqXG4gICAqIEBldmVudFxuICAgKiBAcGFyYW0ge2xheWVyLkxheWVyRXZlbnR9IGV2dFxuICAgKiBAcGFyYW0ge2xheWVyLkxheWVyRXJyb3J9IGV2dC5kYXRhXG4gICAqIEBwYXJhbSB7bGF5ZXIuQ29udmVyc2F0aW9ufSB0YXJnZXRcbiAgICovXG4gICdjb252ZXJzYXRpb25zOnNlbnQtZXJyb3InLFxuXG4gIC8qKlxuICAgKiBBIGNvbnZlcnNhdGlvbiBoYWQgYSBjaGFuZ2UgaW4gaXRzIHByb3BlcnRpZXMuXG4gICAqXG4gICAqIFRoaXMgY2hhbmdlIG1heSBoYXZlIGJlZW4gZGVsaXZlcmVkIGZyb20gYSByZW1vdGUgdXNlclxuICAgKiBvciBhcyBhIHJlc3VsdCBvZiBhIGxvY2FsIG9wZXJhdGlvbi5cbiAgICpcbiAgICogICAgICBjbGllbnQub24oJ2NvbnZlcnNhdGlvbnM6Y2hhbmdlJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAqICAgICAgICAgIHZhciBtZXRhZGF0YUNoYW5nZXMgPSBldnQuZ2V0Q2hhbmdlc0ZvcignbWV0YWRhdGEnKTtcbiAgICogICAgICAgICAgdmFyIHBhcnRpY2lwYW50Q2hhbmdlcyA9IGV2dC5nZXRDaGFuZ2VzRm9yKCdwYXJ0aWNpcGFudHMnKTtcbiAgICogICAgICAgICAgaWYgKG1ldGFkYXRhQ2hhbmdlcy5sZW5ndGgpIHtcbiAgICogICAgICAgICAgICAgIG15Vmlldy5yZW5kZXJUaXRsZShldnQudGFyZ2V0Lm1ldGFkYXRhLnRpdGxlKTtcbiAgICogICAgICAgICAgfVxuICAgKiAgICAgICAgICBpZiAocGFydGljaXBhbnRDaGFuZ2VzLmxlbmd0aCkge1xuICAgKiAgICAgICAgICAgICAgbXlWaWV3LnJlbmRlclBhcnRpY2lwYW50cyhldnQudGFyZ2V0LnBhcnRpY2lwYW50cyk7XG4gICAqICAgICAgICAgIH1cbiAgICogICAgICB9KTtcbiAgICpcbiAgICogQGV2ZW50XG4gICAqIEBwYXJhbSB7bGF5ZXIuTGF5ZXJFdmVudH0gZXZ0XG4gICAqIEBwYXJhbSB7bGF5ZXIuQ29udmVyc2F0aW9ufSBldnQudGFyZ2V0XG4gICAqIEBwYXJhbSB7T2JqZWN0W119IGV2dC5jaGFuZ2VzXG4gICAqIEBwYXJhbSB7TWl4ZWR9IGV2dC5jaGFuZ2VzLm5ld1ZhbHVlXG4gICAqIEBwYXJhbSB7TWl4ZWR9IGV2dC5jaGFuZ2VzLm9sZFZhbHVlXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBldnQuY2hhbmdlcy5wcm9wZXJ0eSAtIE5hbWUgb2YgdGhlIHByb3BlcnR5IHRoYXQgaGFzIGNoYW5nZWRcbiAgICovXG4gICdjb252ZXJzYXRpb25zOmNoYW5nZScsXG5cbiAgLyoqXG4gICAqIEEgbmV3IG1lc3NhZ2UgaGFzIGJlZW4gcmVjZWl2ZWQgZm9yIHdoaWNoIGEgbm90aWZpY2F0aW9uIG1heSBiZSBzdWl0YWJsZS5cbiAgICogVGhpcyBldmVudCBpcyB0cmlnZ2VyZWQgZm9yIG1lc3NhZ2VzIHRoYXQgYXJlOlxuICAgKlxuICAgKiAxLiBBZGRlZCB2aWEgd2Vic29ja2V0IHJhdGhlciB0aGFuIG90aGVyIElPXG4gICAqIDIuIE5vdCB5ZXQgYmVlbiBtYXJrZWQgYXMgcmVhZFxuICAgKiAzLiBOb3Qgc2VudCBieSB0aGlzIHVzZXJcbiAgICpcbiAgICAgICAgICBjbGllbnQub24oJ21lc3NhZ2VzOm5vdGlmeScsIGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgICBteU5vdGlmeShldnQubWVzc2FnZSk7XG4gICAgICAgICAgfSlcbiAgICpcbiAgICogQGV2ZW50XG4gICAqIEBwYXJhbSB7bGF5ZXIuTGF5ZXJFdmVudH0gZXZ0XG4gICAqIEBwYXJhbSB7bGF5ZXIuTWVzc2FnZX0gZXZ0Lk1lc3NhZ2VcbiAgICovXG4gICdtZXNzYWdlczpub3RpZnknLFxuXG4gIC8qKlxuICAgKiBNZXNzYWdlcyBoYXZlIGJlZW4gYWRkZWQgdG8gYSBjb252ZXJzYXRpb24uXG4gICAqXG4gICAqIFRoaXMgZXZlbnQgaXMgdHJpZ2dlcmVkIG9uXG4gICAqXG4gICAqICogY3JlYXRpbmcvc2VuZGluZyBhIG5ldyBtZXNzYWdlXG4gICAqICogUmVjZWl2aW5nIGEgbmV3IE1lc3NhZ2UgdmlhIHdlYnNvY2tldFxuICAgKiAqIFF1ZXJ5aW5nL2Rvd25sb2FkaW5nIGEgc2V0IG9mIE1lc3NhZ2VzXG4gICAqXG4gICAgICAgICAgY2xpZW50Lm9uKCdtZXNzYWdlczphZGQnLCBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgICAgZXZ0Lm1lc3NhZ2VzLmZvckVhY2goZnVuY3Rpb24obWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgbXlWaWV3LmFkZE1lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgKlxuICAgKiBAZXZlbnRcbiAgICogQHBhcmFtIHtsYXllci5MYXllckV2ZW50fSBldnRcbiAgICogQHBhcmFtIHtsYXllci5NZXNzYWdlW119IGV2dC5tZXNzYWdlc1xuICAgKi9cbiAgJ21lc3NhZ2VzOmFkZCcsXG5cbiAgLyoqXG4gICAqIEEgbWVzc2FnZSBoYXMgYmVlbiByZW1vdmVkIGZyb20gYSBjb252ZXJzYXRpb24uXG4gICAqXG4gICAqIEEgcmVtb3ZlZCBNZXNzYWdlIGlzIG5vdCBuZWNlc3NhcmlseSBkZWxldGVkLFxuICAgKiBqdXN0IG5vIGxvbmdlciBiZWluZyBoZWxkIGluIG1lbW9yeS5cbiAgICpcbiAgICogTm90ZSB0aGF0IHR5cGljYWxseSB5b3Ugd2lsbCB3YW50IHRoZSBtZXNzYWdlczpkZWxldGUgZXZlbnRcbiAgICogcmF0aGVyIHRoYW4gbWVzc2FnZXM6cmVtb3ZlLlxuICAgKlxuICAgKiAgICAgIGNsaWVudC5vbignbWVzc2FnZXM6cmVtb3ZlJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAqICAgICAgICAgIGV2dC5tZXNzYWdlcy5mb3JFYWNoKGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICogICAgICAgICAgICAgIG15Vmlldy5yZW1vdmVNZXNzYWdlKG1lc3NhZ2UpO1xuICAgKiAgICAgICAgICB9KTtcbiAgICogICAgICB9KTtcbiAgICpcbiAgICogQGV2ZW50XG4gICAqIEBwYXJhbSB7bGF5ZXIuTGF5ZXJFdmVudH0gZXZ0XG4gICAqIEBwYXJhbSB7bGF5ZXIuTWVzc2FnZX0gZXZ0Lm1lc3NhZ2VcbiAgICovXG4gICdtZXNzYWdlczpyZW1vdmUnLFxuXG4gIC8qKlxuICAgKiBBIG1lc3NhZ2UgaGFzIGJlZW4gc2VudC5cbiAgICpcbiAgICogICAgICBjbGllbnQub24oJ21lc3NhZ2VzOnNlbnQnLCBmdW5jdGlvbihldnQpIHtcbiAgICogICAgICAgICAgYWxlcnQoZXZ0LnRhcmdldC5nZXRUZXh0KCkgKyAnIGhhcyBiZWVuIHNlbnQnKTtcbiAgICogICAgICB9KTtcbiAgICpcbiAgICogQGV2ZW50XG4gICAqIEBwYXJhbSB7bGF5ZXIuTGF5ZXJFdmVudH0gZXZ0XG4gICAqIEBwYXJhbSB7bGF5ZXIuTWVzc2FnZX0gZXZ0LnRhcmdldFxuICAgKi9cbiAgJ21lc3NhZ2VzOnNlbnQnLFxuXG4gIC8qKlxuICAgKiBBIG1lc3NhZ2UgaXMgYWJvdXQgdG8gYmUgc2VudC5cbiAgICpcbiAgICogVXNlZnVsIGlmIHlvdSB3YW50IHRvXG4gICAqIGFkZCBwYXJ0cyB0byB0aGUgbWVzc2FnZSBiZWZvcmUgaXQgZ29lcyBvdXQuXG4gICAqXG4gICAqICAgICAgY2xpZW50Lm9uKCdtZXNzYWdlczpzZW5kaW5nJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAqICAgICAgICAgIGV2dC50YXJnZXQuYWRkUGFydCh7XG4gICAqICAgICAgICAgICAgICBtaW1lVHlwZTogJ3RleHQvcGxhaW4nLFxuICAgKiAgICAgICAgICAgICAgYm9keTogJ3RoaXMgaXMganVzdCBhIHRlc3QnXG4gICAqICAgICAgICAgIH0pO1xuICAgKiAgICAgIH0pO1xuICAgKlxuICAgKiBAZXZlbnRcbiAgICogQHBhcmFtIHtsYXllci5MYXllckV2ZW50fSBldnRcbiAgICogQHBhcmFtIHtsYXllci5NZXNzYWdlfSBldnQudGFyZ2V0XG4gICAqL1xuICAnbWVzc2FnZXM6c2VuZGluZycsXG5cbiAgLyoqXG4gICAqIFNlcnZlciBmYWlsZWQgdG8gcmVjZWl2ZSBhIE1lc3NhZ2UuXG4gICAqXG4gICAqIEBldmVudFxuICAgKiBAcGFyYW0ge2xheWVyLkxheWVyRXZlbnR9IGV2dFxuICAgKiBAcGFyYW0ge2xheWVyLkxheWVyRXJyb3J9IGV2dC5lcnJvclxuICAgKi9cbiAgJ21lc3NhZ2VzOnNlbnQtZXJyb3InLFxuXG4gIC8qKlxuICAgKiBBIG1lc3NhZ2UgaGFzIGhhZCBhIGNoYW5nZSBpbiBpdHMgcHJvcGVydGllcy5cbiAgICpcbiAgICogVGhpcyBjaGFuZ2UgbWF5IGhhdmUgYmVlbiBkZWxpdmVyZWQgZnJvbSBhIHJlbW90ZSB1c2VyXG4gICAqIG9yIGFzIGEgcmVzdWx0IG9mIGEgbG9jYWwgb3BlcmF0aW9uLlxuICAgKlxuICAgKiAgICAgIGNsaWVudC5vbignbWVzc2FnZXM6Y2hhbmdlJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAqICAgICAgICAgIHZhciByZWNwaWVudFN0YXR1c0NoYW5nZXMgPSBldnQuZ2V0Q2hhbmdlc0ZvcigncmVjaXBpZW50U3RhdHVzJyk7XG4gICAqICAgICAgICAgIGlmIChyZWNwaWVudFN0YXR1c0NoYW5nZXMubGVuZ3RoKSB7XG4gICAqICAgICAgICAgICAgICBteVZpZXcucmVuZGVyU3RhdHVzKGV2dC50YXJnZXQpO1xuICAgKiAgICAgICAgICB9XG4gICAqICAgICAgfSk7XG4gICAqXG4gICAqIEBldmVudFxuICAgKiBAcGFyYW0ge2xheWVyLkxheWVyRXZlbnR9IGV2dFxuICAgKiBAcGFyYW0ge2xheWVyLk1lc3NhZ2V9IGV2dC50YXJnZXRcbiAgICogQHBhcmFtIHtPYmplY3RbXX0gZXZ0LmNoYW5nZXNcbiAgICogQHBhcmFtIHtNaXhlZH0gZXZ0LmNoYW5nZXMubmV3VmFsdWVcbiAgICogQHBhcmFtIHtNaXhlZH0gZXZ0LmNoYW5nZXMub2xkVmFsdWVcbiAgICogQHBhcmFtIHtzdHJpbmd9IGV2dC5jaGFuZ2VzLnByb3BlcnR5IC0gTmFtZSBvZiB0aGUgcHJvcGVydHkgdGhhdCBoYXMgY2hhbmdlZFxuICAgKi9cbiAgJ21lc3NhZ2VzOmNoYW5nZScsXG5cbiAgLyoqXG4gICAqIEEgbWVzc2FnZSBoYXMgYmVlbiBtYXJrZWQgYXMgcmVhZC5cbiAgICpcbiAgICogVGhpcyBpcyBjYW4gYmUgdHJpZ2dlcmVkIGJ5IGEgbG9jYWwgZXZlbnQsIG9yIGJ5IHRoaXMgc2FtZSB1c2VyIG9uIGEgc2VwYXJhdGUgZGV2aWNlIG9yIGJyb3dzZXIuXG4gICAqXG4gICAqICAgICAgY2xpZW50Lm9uKCdtZXNzYWdlczpyZWFkJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAqICAgICAgICAgIG15Vmlldy5yZW5kZXJVbnJlYWRTdGF0dXMoZXZ0LnRhcmdldCk7XG4gICAqICAgICAgfSk7XG4gICAqXG4gICAqIEBldmVudFxuICAgKiBAcGFyYW0ge2xheWVyLkxheWVyRXZlbnR9IGV2dFxuICAgKiBAcGFyYW0ge2xheWVyLk1lc3NhZ2V9IGV2dC50YXJnZXRcbiAgICovXG4gICdtZXNzYWdlczpyZWFkJyxcblxuICAvKipcbiAgICogQSBDb252ZXJzYXRpb24gaGFzIGJlZW4gZGVsZXRlZCBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqIENhdXNlZCBieSBlaXRoZXIgYSBzdWNjZXNzZnVsIGNhbGwgdG8gbGF5ZXIuQ29udmVyc2F0aW9uLmRlbGV0ZSgpIG9uIHRoZSBDb252ZXJzYXRpb25cbiAgICogb3IgYnkgYSByZW1vdGUgdXNlci5cbiAgICpcbiAgICogICAgICBjbGllbnQub24oJ2NvbnZlcnNhdGlvbnM6ZGVsZXRlJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAqICAgICAgICAgIG15Vmlldy5yZW1vdmVDb252ZXJzYXRpb24oZXZ0LnRhcmdldCk7XG4gICAqICAgICAgfSk7XG4gICAqXG4gICAqIEBldmVudFxuICAgKiBAcGFyYW0ge2xheWVyLkxheWVyRXZlbnR9IGV2dFxuICAgKiBAcGFyYW0ge2xheWVyLkNvbnZlcnNhdGlvbn0gZXZ0LnRhcmdldFxuICAgKi9cbiAgJ2NvbnZlcnNhdGlvbnM6ZGVsZXRlJyxcblxuICAvKipcbiAgICogQSBNZXNzYWdlIGhhcyBiZWVuIGRlbGV0ZWQgZnJvbSB0aGUgc2VydmVyLlxuICAgKlxuICAgKiBDYXVzZWQgYnkgZWl0aGVyIGEgc3VjY2Vzc2Z1bCBjYWxsIHRvIGxheWVyLk1lc3NhZ2UuZGVsZXRlKCkgb24gdGhlIE1lc3NhZ2VcbiAgICogb3IgYnkgYSByZW1vdGUgdXNlci5cbiAgICpcbiAgICogICAgICBjbGllbnQub24oJ21lc3NhZ2VzOmRlbGV0ZScsIGZ1bmN0aW9uKGV2dCkge1xuICAgKiAgICAgICAgICBteVZpZXcucmVtb3ZlTWVzc2FnZShldnQudGFyZ2V0KTtcbiAgICogICAgICB9KTtcbiAgICpcbiAgICogQGV2ZW50XG4gICAqIEBwYXJhbSB7bGF5ZXIuTGF5ZXJFdmVudH0gZXZ0XG4gICAqIEBwYXJhbSB7bGF5ZXIuTWVzc2FnZX0gZXZ0LnRhcmdldFxuICAgKi9cbiAgJ21lc3NhZ2VzOmRlbGV0ZScsXG5cbiAgLyoqXG4gICAqIEEgVXNlciBoYXMgYmVlbiBhZGRlZCBvciBjaGFuZ2VkIGluIHRoZSB1c2VycyBhcnJheS5cbiAgICpcbiAgICogVGhpcyBldmVudCBpcyBub3QgeWV0IHdlbGwgc3VwcG9ydGVkLlxuICAgKiBAZXZlbnRcbiAgICovXG4gICd1c2VyczpjaGFuZ2UnLFxuXG4gIC8qKlxuICAgKiBBIFR5cGluZyBJbmRpY2F0b3Igc3RhdGUgaGFzIGNoYW5nZWQuXG4gICAqXG4gICAqIEVpdGhlciBhIGNoYW5nZSBoYXMgYmVlbiByZWNlaXZlZFxuICAgKiBmcm9tIHRoZSBzZXJ2ZXIsIG9yIGEgdHlwaW5nIGluZGljYXRvciBzdGF0ZSBoYXMgZXhwaXJlZC5cbiAgICpcbiAgICogICAgICBjbGllbnQub24oJ3R5cGluZy1pbmRpY2F0b3ItY2hhbmdlJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAqICAgICAgICAgIGlmIChldnQuY29udmVyc2F0aW9uSWQgPT09IG15Q29udmVyc2F0aW9uSWQpIHtcbiAgICogICAgICAgICAgICAgIGFsZXJ0KGV2dC50eXBpbmcuam9pbignLCAnKSArICcgYXJlIHR5cGluZycpO1xuICAgKiAgICAgICAgICAgICAgYWxlcnQoZXZ0LnBhdXNlZC5qb2luKCcsICcpICsgJyBhcmUgcGF1c2VkJyk7XG4gICAqICAgICAgICAgIH1cbiAgICogICAgICB9KTtcbiAgICpcbiAgICogQGV2ZW50XG4gICAqIEBwYXJhbSB7bGF5ZXIuTGF5ZXJFdmVudH0gZXZ0XG4gICAqIEBwYXJhbSB7c3RyaW5nfSBjb252ZXJzYXRpb25JZCAtIElEIG9mIHRoZSBDb252ZXJzYXRpb24gdXNlcnMgYXJlIHR5cGluZyBpbnRvXG4gICAqIEBwYXJhbSB7c3RyaW5nW119IHR5cGluZyAtIEFycmF5IG9mIHVzZXIgSURzIHdobyBhcmUgY3VycmVudGx5IHR5cGluZ1xuICAgKiBAcGFyYW0ge3N0cmluZ1tdfSBwYXVzZWQgLSBBcnJheSBvZiB1c2VyIElEcyB3aG8gYXJlIGN1cnJlbnRseSBwYXVzZWQ7XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgIEEgcGF1c2VkIHVzZXIgc3RpbGwgaGFzIHRleHQgaW4gdGhlaXIgdGV4dCBib3guXG4gICAqL1xuICAndHlwaW5nLWluZGljYXRvci1jaGFuZ2UnLFxuXG5cbl0uY29uY2F0KENsaWVudEF1dGguX3N1cHBvcnRlZEV2ZW50cyk7XG5cbkNsaWVudC5wbHVnaW5zID0ge307XG5cblxuUm9vdC5pbml0Q2xhc3MuYXBwbHkoQ2xpZW50LCBbQ2xpZW50LCAnQ2xpZW50J10pO1xubW9kdWxlLmV4cG9ydHMgPSBDbGllbnQ7XG4iXX0=
