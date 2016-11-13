'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * A Conversation object represents a dialog amongst a set
 * of participants.
 *
 * Create a Conversation using the client:
 *
 *      var conversation = client.createConversation({
 *          participants: ['a','b'],
 *          distinct: true
 *      });
 *
 * In addition, there is a shortcut method for creating
 * a conversation, which will default to creating a Distinct
 * Conversation.
 *
 *      var conversation = client.createConversation(['a','b']);
 *
 * NOTE:   Do not create a conversation with new layer.Conversation(...),
 *         This will fail to handle the distinct property short of going to the server for evaluation.
 *
 * NOTE:   Creating a Conversation is a local action.  A Conversation will not be
 *         sent to the server until either:
 *
 * 1. A message is sent on that Conversation
 * 2. `Conversation.send()` is called (not recommended as mobile clients
 *    expect at least one layer.Message in a Conversation)
 *
 * Key methods, events and properties for getting started:
 *
 * Properties:
 *
 * * layer.Conversation.id: this property is worth being familiar with; it identifies the
 *   Conversation and can be used in `client.getConversation(id)` to retrieve it.
 * * layer.Conversation.internalId: This property makes for a handy unique ID for use in dom nodes;
 *   gaurenteed not to change during this session.
 * * layer.Conversation.lastMessage: This property makes it easy to show info about the most recent Message
 *    when rendering a list of Conversations.
 * * layer.Conversation.metadata: Custom data for your Conversation; commonly used to store a 'title' property
 *    to name your Conversation.
 *
 * Methods:
 *
 * * layer.Conversation.addParticipants and layer.Conversation.removeParticipants: Change the participants of the Conversation
 * * layer.Conversation.setMetadataProperties: Set metadata.title to 'My Conversation with Layer Support' (uh oh)
 * * layer.Conversation.on() and layer.Conversation.off(): event listeners built on top of the `backbone-events-standalone` npm project
 *
 * Events:
 *
 * * `conversations:change`: Useful for observing changes to participants and metadata
 *   and updating rendering of your open Conversation
 *
 * Finally, to access a list of Messages in a Conversation, see layer.Query.
 *
 * @class  layer.Conversation
 * @extends layer.Syncable
 * @author  Michael Kantor
 */

var Syncable = require('./syncable');
var Message = require('./message');
var LayerError = require('./layer-error');
var Util = require('./client-utils');
var Constants = require('./const');
var Root = require('./root');
var LayerEvent = require('./layer-event');
var ClientRegistry = require('./client-registry');
var logger = require('./logger');

var Conversation = function (_Syncable) {
  _inherits(Conversation, _Syncable);

  /**
   * Create a new conversation.
   *
   * The static `layer.Conversation.create()` method
   * will correctly lookup distinct Conversations and
   * return them; `new layer.Conversation()` will not.
   *
   * Developers should use `layer.Conversation.create()`.
   *
   * @method constructor
   * @protected
   * @param  {Object} options
   * @param {string[]} options.participants - Array of participant ids
   * @param {boolean} [options.distinct=true] - Is the conversation distinct
   * @param {Object} [options.metadata] - An object containing Conversation Metadata.
   * @return {layer.Conversation}
   */

  function Conversation() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Conversation);

    // Setup default values
    if (!options.participants) options.participants = [];
    if (!options.metadata) options.metadata = {};

    // Make sure the ID from handle fromServer parameter is used by the Root.constructor
    if (options.fromServer) options.id = options.fromServer.id;

    // Make sure we have an clientId property
    if (options.client) options.clientId = options.client.appId;

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Conversation).call(this, options));

    _this.isInitializing = true;
    var client = _this.getClient();

    // If the options contains a full server definition of the object,
    // copy it in with _populateFromServer; this will add the Conversation
    // to the Client as well.
    if (options && options.fromServer) {
      _this._populateFromServer(options.fromServer);
    }

    // Setup participants
    else if (client && _this.participants.indexOf(client.userId) === -1) {
        _this.participants.push(client.userId);
      }

    _this.localCreatedAt = new Date();

    if (client) client._addConversation(_this);
    _this.isInitializing = false;
    return _this;
  }

  /**
   * Destroy the local copy of this Conversation, cleaning up all resources
   * it consumes.
   *
   * @method destroy
   */


  _createClass(Conversation, [{
    key: 'destroy',
    value: function destroy() {
      this.lastMessage = null;

      // Client fires 'conversations:remove' and then removes the Conversation.
      if (this.clientId) this.getClient()._removeConversation(this);

      _get(Object.getPrototypeOf(Conversation.prototype), 'destroy', this).call(this);

      this.participants = null;
      this.metadata = null;
    }

    /**
     * Get the client associated with this Conversation.
     *
     * @method getClient
     * @return {layer.Client}
     */

  }, {
    key: 'getClient',
    value: function getClient() {
      return ClientRegistry.get(this.clientId);
    }

    /**
     * Create this Conversation on the server.
     *
     * On completion, this instance will receive
     * an id, url and createdAt.  It may also receive metadata
     * if there was a FOUND_WITHOUT_REQUESTED_METADATA result.
     *
     * Note that the optional Message parameter should NOT be used except
     * by the layer.Message class itself.
     *
     * Note that recommended practice is to send the Conversation by sending a Message in the Conversation,
     * and NOT by calling Conversation.send.
     *
     *      client.createConversation({
     *          participants: ['a', 'b'],
     *          distinct: false
     *      })
     *      .send()
     *      .on('conversations:sent', function(evt) {
     *          alert('Done');
     *      });
     *
     * @method send
     * @param {layer.Message} [message] Tells the Conversation what its last_message will be
     * @return {layer.Conversation} this
     */

  }, {
    key: 'send',
    value: function send(message) {
      var _this2 = this;

      var client = this.getClient();
      if (!client) throw new Error(LayerError.dictionary.clientMissing);

      // If this is part of a create({distinct:true}).send() call where
      // the distinct conversation was found, just trigger the cached event and exit
      if (this._sendDistinctEvent) return this._handleLocalDistinctConversation();

      // If a message is passed in, then that message is being sent, and is our
      // new lastMessage (until the websocket tells us otherwise)
      if (message) {
        // Setting a position is required if its going to get sorted correctly by query.
        // The correct position will be written by _populateFromServer when the object
        // is returned from the server.
        // WARNING: The query will NOT be resorted using the server's position value.
        message.position = this.lastMessage ? this.lastMessage.position + 1 : 0;
        this.lastMessage = message;
      }

      // If the Conversation is already on the server, don't send.
      if (this.syncState !== Constants.SYNC_STATE.NEW) return this;

      // Make sure this user is a participant (server does this for us, but
      // this insures the local copy is correct until we get a response from
      // the server
      if (this.participants.indexOf(client.userId) === -1) {
        this.participants.push(client.userId);
      }

      // If there is only one participant, its client.userId.  Not enough
      // for us to have a good Conversation on the server.  Abort.
      if (this.participants.length === 1) {
        throw new Error(LayerError.dictionary.moreParticipantsRequired);
      }

      // Update the syncState
      this._setSyncing();

      client.sendSocketRequest({
        method: 'POST',
        body: function getRequestData() {
          return {
            method: 'Conversation.create',
            data: this._getPostData()
          };
        }.bind(this),
        sync: {
          depends: this.id,
          target: this.id
        }
      }, function (result) {
        return _this2._createResult(result);
      });
      return this;
    }

    /**
     * Handles the case where a Distinct Create Conversation found a local match.
     *
     * When an app calls client.createConversation([...])
     * and requests a Distinct Conversation (default setting),
     * and the Conversation already exists, what do we do to help
     * them access it?
     *
     *      client.createConversation(["fred"]).on("conversations:sent", function(evt) {
     *        render();
     *      });
     *
     * Under normal conditions, calling `c.send()` on a matching distinct Conversation
     * would either throw an error or just be a no-op.  We use this method to trigger
     * the expected "conversations:sent" event even though its already been sent and
     * we did nothing.  Use the evt.result property if you want to know whether the
     * result was a new conversation or matching one.
     *
     * @method _handleLocalDistinctConversation
     * @private
     */

  }, {
    key: '_handleLocalDistinctConversation',
    value: function _handleLocalDistinctConversation() {
      var evt = this._sendDistinctEvent;
      this._sendDistinctEvent = null;

      // delay so there is time to setup an event listener on this conversation
      this._triggerAsync('conversations:sent', evt);
      return this;
    }

    /**
     * Gets the data for a Create request.
     *
     * The layer.SyncManager needs a callback to create the Conversation as it
     * looks NOW, not back when `send()` was called.  This method is called
     * by the layer.SyncManager to populate the POST data of the call.
     *
     * @method _getPostData
     * @private
     * @return {Object} POST data for creating a Conversation
     */

  }, {
    key: '_getPostData',
    value: function _getPostData() {
      var isMetadataEmpty = Util.isEmpty(this.metadata);
      return {
        participants: this.participants,
        distinct: this.distinct,
        metadata: isMetadataEmpty ? null : this.metadata
      };
    }

    /**
     * Process result of send method.
     *
     * Note that we use _triggerAsync so that
     * events reporting changes to the layer.Conversation.id can
     * be applied before reporting on it being sent.
     *
     * Example: Query will now have IDs rather than TEMP_IDs
     * when this event is triggered.
     *
     * @method _createResult
     * @private
     * @param  {Object} result
     */

  }, {
    key: '_createResult',
    value: function _createResult(_ref) {
      var success = _ref.success;
      var data = _ref.data;

      if (this.isDestroyed) return;
      if (success) {
        this._createSuccess(data);
      } else if (data.id === 'conflict') {
        this._populateFromServer(data.data);
        this._triggerAsync('conversations:sent', {
          result: Conversation.FOUND_WITHOUT_REQUESTED_METADATA
        });
      } else {
        this.trigger('conversations:sent-error', { error: data });
        this.destroy();
      }
    }

    /**
     * Process the successful result of a create call
     *
     * @method _createSuccess
     * @private
     * @param  {Object} data Server description of Conversation
     */

  }, {
    key: '_createSuccess',
    value: function _createSuccess(data) {
      this._populateFromServer(data);
      if (!this.distinct) {
        this._triggerAsync('conversations:sent', {
          result: Conversation.CREATED
        });
      } else {
        // Currently the websocket does not tell us if its
        // returning an existing Conversation.  So guess...
        // if there is no lastMessage, then most likely, there was
        // no existing Conversation.  Sadly, API-834; last_message is currently
        // always null.
        this._triggerAsync('conversations:sent', {
          result: !this.lastMessage ? Conversation.CREATED : Conversation.FOUND
        });
      }
    }

    /**
     * Populates this instance using server-data.
     *
     * Side effects add this to the Client.
     *
     * @method _populateFromServer
     * @private
     * @param  {Object} conversation - Server representation of the conversation
     */

  }, {
    key: '_populateFromServer',
    value: function _populateFromServer(conversation) {
      var client = this.getClient();

      // Disable events if creating a new Conversation
      // We still want property change events for anything that DOES change
      this._disableEvents = this.syncState === Constants.SYNC_STATE.NEW;

      this._setSynced();

      var id = this.id;
      this.id = conversation.id;
      if (id !== this.id) {
        this._tempId = id;
        client._updateConversationId(this, id);
        this._triggerAsync('conversations:change', {
          oldValue: id,
          newValue: this.id,
          property: 'id'
        });
      }

      this.url = conversation.url;
      this.participants = conversation.participants;
      this.distinct = conversation.distinct;
      this.createdAt = new Date(conversation.created_at);
      this.metadata = conversation.metadata;
      this.unreadCount = conversation.unread_message_count;
      this.isCurrentParticipant = this.participants.indexOf(client.userId) !== -1;

      client._addConversation(this);

      if (conversation.last_message) {
        this.lastMessage = Message._createFromServer(conversation.last_message, this).message;
      } else {
        this.lastMessage = null;
      }

      this._disableEvents = false;
    }

    /**
     * Add an array of participant ids to the conversation.
     *
     *      conversation.addParticipants(['a', 'b']);
     *
     * New participants will immediately show up in the Conversation,
     * but may not have synced with the server yet.
     *
     * TODO WEB-967: Roll participants back on getting a server error
     *
     * @method addParticipants
     * @param  {string[]} participants - Array of participant ids
     * @returns {layer.Conversation} this
     */

  }, {
    key: 'addParticipants',
    value: function addParticipants(participants) {
      var _this3 = this;

      // Only add those that aren't already in the list.
      var adding = participants.filter(function (participant) {
        return _this3.participants.indexOf(participant) === -1;
      });
      this._patchParticipants({ add: adding, remove: [] });
      return this;
    }

    /**
     * Removes an array of participant ids from the conversation.
     *
     *      conversation.removeParticipants(['a', 'b']);
     *
     * Removed participants will immediately be removed from this Conversation,
     * but may not have synced with the server yet.
     *
     * Throws error if you attempt to remove ALL participants.
     *
     * TODO  WEB-967: Roll participants back on getting a server error
     *
     * @method removeParticipants
     * @param  {string[]} participants - Array of participant ids
     * @returns {layer.Conversation} this
     */

  }, {
    key: 'removeParticipants',
    value: function removeParticipants(participants) {
      var _this4 = this;

      var currentParticipants = this.participants.concat([]).sort();
      var removing = participants.filter(function (participant) {
        return _this4.participants.indexOf(participant) !== -1;
      }).sort();
      if (JSON.stringify(currentParticipants) === JSON.stringify(removing)) {
        throw new Error(LayerError.dictionary.moreParticipantsRequired);
      }
      this._patchParticipants({ add: [], remove: removing });
      return this;
    }

    /**
     * Replaces all participants with a new array of of participant ids.
     *
     *      conversation.replaceParticipants(['a', 'b']);
     *
     * Changed participants will immediately show up in the Conversation,
     * but may not have synced with the server yet.
     *
     * TODO WEB-967: Roll participants back on getting a server error
     *
     * @method replaceParticipants
     * @param  {string[]} participants - Array of participant ids
     * @returns {layer.Conversation} this
     */

  }, {
    key: 'replaceParticipants',
    value: function replaceParticipants(participants) {
      if (!participants || !participants.length) {
        throw new Error(LayerError.dictionary.moreParticipantsRequired);
      }

      var change = this._getParticipantChange(participants, this.participants);
      this._patchParticipants(change);
      return this;
    }

    /**
     * Update the server with the new participant list.
     *
     * Executes as follows:
     *
     * 1. Updates the participants property of the local object
     * 2. Triggers a conversations:change event
     * 3. Submits a request to be sent to the server to update the server's object
     * 4. If there is an error, no errors are fired except by layer.SyncManager, but another
     *    conversations:change event is fired as the change is rolled back.
     *
     * @method _patchParticipants
     * @private
     * @param  {Object[]} operations - Array of JSON patch operation
     * @param  {Object} eventData - Data describing the change for use in an event
     */

  }, {
    key: '_patchParticipants',
    value: function _patchParticipants(change) {
      var _this5 = this;

      this._applyParticipantChange(change);
      this.isCurrentParticipant = this.participants.indexOf(this.getClient().userId) !== -1;

      var ops = [];
      change.remove.forEach(function (id) {
        ops.push({
          operation: 'remove',
          property: 'participants',
          value: id
        });
      });

      change.add.forEach(function (id) {
        ops.push({
          operation: 'add',
          property: 'participants',
          value: id
        });
      });

      this._xhr({
        url: '',
        method: 'PATCH',
        data: JSON.stringify(ops),
        headers: {
          'content-type': 'application/vnd.layer-patch+json'
        }
      }, function (result) {
        if (!result.success) _this5._load();
      });
    }

    /**
     * Internally we use `{add: [], remove: []}` instead of LayerOperations.
     *
     * So control is handed off to this method to actually apply the changes
     * to the participants array.
     *
     * @method _applyParticipantChange
     * @private
     * @param  {Object} change
     * @param  {string[]} change.add - Array of userids to add
     * @param  {string[]} change.remove - Array of userids to remove
     */

  }, {
    key: '_applyParticipantChange',
    value: function _applyParticipantChange(change) {
      var participants = [].concat(this.participants);
      change.add.forEach(function (id) {
        if (participants.indexOf(id) === -1) participants.push(id);
      });
      change.remove.forEach(function (id) {
        var index = participants.indexOf(id);
        if (index !== -1) participants.splice(index, 1);
      });
      this.participants = participants;
    }

    /**
     * Delete the Conversation from the server.
     *
     * This call will support various deletion modes.  Calling without a deletion mode is deprecated.
     *
     * Deletion Modes:
     *
     * * layer.Constants.DELETION_MODE.ALL: This deletes the local copy immediately, and attempts to also
     *   delete the server's copy.
     *
     * Executes as follows:
     *
     * 1. Submits a request to be sent to the server to delete the server's object
     * 2. Delete's the local object
     * 3. If there is an error, no errors are fired except by layer.SyncManager, but the Conversation will be reloaded from the server,
     *    triggering a conversations:add event.
     *
     * @method delete
     * @param {number} deletionMode - layer.Constants.DELETION_MODE.ALL is only supported mode at this time
     * @return null
     */

  }, {
    key: 'delete',
    value: function _delete(mode) {
      var id = this.id;
      var modeValue = 'true';
      if (mode === true) {
        logger.warn('Calling Message.delete without a mode is deprecated');
        mode = Constants.DELETION_MODE.ALL;
      }
      if (!mode || mode !== Constants.DELETION_MODE.ALL) {
        throw new Error(LayerError.dictionary.deletionModeUnsupported);
      }

      var client = this.getClient();
      this._xhr({
        method: 'DELETE',
        url: '?destroy=' + modeValue
      }, function (result) {
        if (!result.success) Conversation.load(id, client);
      });

      this._deleted();
      this.destroy();
    }

    /**
     * The Conversation has been deleted.
     *
     * Called from WebsocketManager and from layer.Conversation.delete();
     *
     * Destroy must be called separately, and handles most cleanup.
     *
     * @method _deleted
     * @protected
     */

  }, {
    key: '_deleted',
    value: function _deleted() {
      this.trigger('conversations:delete');
    }

    /**
     * Create a new layer.Message instance within this conversation
     *
     *      var message = conversation.createMessage('hello');
     *
     *      var message = conversation.createMessage({
     *          parts: [new layer.MessagePart({
     *                      body: 'hello',
     *                      mimeType: 'text/plain'
     *                  })]
     *      });
     *
     * See layer.Message for more options for creating the message.
     *
     * @method createMessage
     * @param  {string|Object} options - If its a string, a MessagePart is created around that string.
     * @param {layer.MessagePart[]} options.parts - An array of MessageParts.  There is some tolerance for
     *                                               it not being an array, or for it being a string to be turned
     *                                               into a MessagePart.
     * @return {layer.Message}
     */

  }, {
    key: 'createMessage',
    value: function createMessage() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var messageConfig = typeof options === 'string' ? {
        parts: [{ body: options, mimeType: 'text/plain' }]
      } : options;
      messageConfig.clientId = this.clientId;
      messageConfig.conversationId = this.id;

      return new Message(messageConfig);
    }

    /**
     * Accepts json-patch operations for modifying participants or metadata
     *
     * @method _handlePatchEvent
     * @private
     * @param  {Object[]} data - Array of operations
     */

  }, {
    key: '_handlePatchEvent',
    value: function _handlePatchEvent(newValue, oldValue, paths) {
      // Certain types of __update handlers are disabled while values are being set by
      // layer patch parser because the difference between setting a value (triggers an event)
      // and change a property of a value (triggers only this callback) result in inconsistent
      // behaviors.  Enable them long enough to allow __update calls to be made
      this._inLayerParser = false;
      try {
        var events = this._disableEvents;
        this._disableEvents = false;
        if (paths[0].indexOf('metadata') === 0) {
          this.__updateMetadata(newValue, oldValue, paths);
        } else if (paths[0] === 'participants') {
          this.__updateParticipants(newValue, oldValue);
        }
        this._disableEvents = events;
      } catch (err) {
        // do nothing
      }
      this._inLayerParser = true;
    }

    /**
     * Given the oldValue and newValue for participants,
     * generate a list of whom was added and whom was removed.
     *
     * @method _getParticipantChange
     * @private
     * @param  {string[]} newValue
     * @param  {string[]} oldValue
     * @return {Object} Returns changes in the form of `{add: [...], remove: [...]}`
     */

  }, {
    key: '_getParticipantChange',
    value: function _getParticipantChange(newValue, oldValue) {
      var change = {};
      change.add = newValue.filter(function (participant) {
        return oldValue.indexOf(participant) === -1;
      });
      change.remove = oldValue.filter(function (participant) {
        return newValue.indexOf(participant) === -1;
      });
      return change;
    }

    /**
     * Updates specified metadata keys.
     *
     * Updates the local object's metadata and syncs the change to the server.
     *
     *      conversation.setMetadataProperties({
     *          'title': 'I am a title',
     *          'colors.background': 'red',
     *          'colors.text': {
     *              'fill': 'blue',
     *              'shadow': 'black'
     *           },
     *           'colors.title.fill': 'red'
     *      });
     *
     * Use setMetadataProperties to specify the path to a property, and a new value for that property.
     * Multiple properties can be changed this way.  Whatever value was there before is
     * replaced with the new value; so in the above example, whatever other keys may have
     * existed under `colors.text` have been replaced by the new object `{fill: 'blue', shadow: 'black'}`.
     *
     * Note also that only string and subobjects are accepted as values.
     *
     * Keys with '.' will update a field of an object (and create an object if it wasn't there):
     *
     * Initial metadata: {}
     *
     *      conversation.setMetadataProperties({
     *          'colors.background': 'red',
     *      });
     *
     * Metadata is now: `{colors: {background: 'red'}}`
     *
     *      conversation.setMetadataProperties({
     *          'colors.foreground': 'black',
     *      });
     *
     * Metadata is now: `{colors: {background: 'red', foreground: 'black'}}`
     *
     * Executes as follows:
     *
     * 1. Updates the metadata property of the local object
     * 2. Triggers a conversations:change event
     * 3. Submits a request to be sent to the server to update the server's object
     * 4. If there is an error, no errors are fired except by layer.SyncManager, but another
     *    conversations:change event is fired as the change is rolled back.
     *
     * @method setMetadataProperties
     * @param  {Object} properties
     * @return {layer.Conversation} this
     *
     */

  }, {
    key: 'setMetadataProperties',
    value: function setMetadataProperties(props) {
      var _this6 = this;

      var layerPatchOperations = [];
      Object.keys(props).forEach(function (name) {
        var fullName = name;
        if (name) {
          if (name !== 'metadata' && name.indexOf('metadata.') !== 0) {
            fullName = 'metadata.' + name;
          }
          layerPatchOperations.push({
            operation: 'set',
            property: fullName,
            value: props[name]
          });
        }
      });

      this._inLayerParser = true;

      // Do this before setSyncing as if there are any errors, we should never even
      // start setting up a request.
      Util.layerParse({
        object: this,
        type: 'Conversation',
        operations: layerPatchOperations,
        client: this.getClient()
      });
      this._inLayerParser = false;

      this._xhr({
        url: '',
        method: 'PATCH',
        data: JSON.stringify(layerPatchOperations),
        headers: {
          'content-type': 'application/vnd.layer-patch+json'
        }
      }, function (result) {
        if (!result.success) _this6._load();
      });

      return this;
    }

    /**
     * Deletes specified metadata keys.
     *
     * Updates the local object's metadata and syncs the change to the server.
     *
     *      conversation.deleteMetadataProperties(
     *          ['title', 'colors.background', 'colors.title.fill']
     *      );
     *
     * Use deleteMetadataProperties to specify paths to properties to be deleted.
     * Multiple properties can be deleted.
     *
     * Executes as follows:
     *
     * 1. Updates the metadata property of the local object
     * 2. Triggers a conversations:change event
     * 3. Submits a request to be sent to the server to update the server's object
     * 4. If there is an error, no errors are fired except by layer.SyncManager, but another
     *    conversations:change event is fired as the change is rolled back.
     *
     * @method deleteMetadataProperties
     * @param  {string[]} properties
     * @return {layer.Conversation}
     *
     */

  }, {
    key: 'deleteMetadataProperties',
    value: function deleteMetadataProperties(props) {
      var _this7 = this;

      var layerPatchOperations = [];
      props.forEach(function (property) {
        if (property !== 'metadata' && property.indexOf('metadata.') !== 0) {
          property = 'metadata.' + property;
        }
        layerPatchOperations.push({
          operation: 'delete',
          property: property
        });
      }, this);

      this._inLayerParser = true;

      // Do this before setSyncing as if there are any errors, we should never even
      // start setting up a request.
      Util.layerParse({
        object: this,
        type: 'Conversation',
        operations: layerPatchOperations,
        client: this.getClient()
      });
      this._inLayerParser = false;

      this._xhr({
        url: '',
        method: 'PATCH',
        data: JSON.stringify(layerPatchOperations),
        headers: {
          'content-type': 'application/vnd.layer-patch+json'
        }
      }, function (result) {
        if (!result.success) _this7._load();
      });

      return this;
    }

    /**
     * Any xhr method called on this conversation uses the conversation's url.
     *
     * For details on parameters see {@link layer.ClientAuthenticator#xhr}
     *
     * @method _xhr
     * @protected
     * @return {layer.Conversation} this
     */

  }, {
    key: '_xhr',
    value: function _xhr(args, callback) {
      var _this8 = this;

      var inUrl = args.url;
      var client = this.getClient();

      // Validation
      if (this.isDestroyed) throw new Error(LayerError.dictionary.isDestroyed);
      if (!client) throw new Error(LayerError.dictionary.clientMissing);
      if (!('url' in args)) throw new Error(LayerError.dictionary.urlRequired);
      if (args.method !== 'POST' && this.syncState === Constants.SYNC_STATE.NEW) return this;

      if (args.url && !args.url.match(/^(\/|\?)/)) args.url = '/' + args.url;

      if (args.sync !== false) {
        if (!args.sync) args.sync = {};
        if (!args.sync.target) {
          args.sync.target = this.id;
        }
      }

      inUrl = args.url;
      var getUrl = function getUrl() {
        return _this8.url + (inUrl || '');
      };

      if (!this.url) {
        args.url = getUrl;
      } else {
        args.url = getUrl();
      }

      if (args.method && args.method !== 'GET') {
        this._setSyncing();
      }

      client.xhr(args, function (result) {
        if (args.method && args.method !== 'GET' && !_this8.isDestroyed) {
          _this8._setSynced();
        }
        if (callback) callback(result);
      });

      return this;
    }

    /**
     * Load this conversation from the server.
     *
     * Called from the static layer.Conversation.load() method
     *
     * @method _load
     * @private
     */

  }, {
    key: '_load',
    value: function _load() {
      var _this9 = this;

      this.syncState = Constants.SYNC_STATE.LOADING;
      this._xhr({
        url: '',
        method: 'GET',
        sync: false
      }, function (result) {
        return _this9._loadResult(result);
      });
    }

    /**
     * Processing the result of a _load() call.
     *
     * @method _loadResult
     * @private
     * @param  {Object} result - Response from server
     */

  }, {
    key: '_loadResult',
    value: function _loadResult(result) {
      if (!result.success) {
        this.syncState = Constants.SYNC_STATE.NEW;
        this.trigger('conversations:loaded-error', { error: result.data });
        this.destroy();
      } else {
        // If successful, copy the properties into this object
        this._populateFromServer(result.data);
        this.getClient()._addConversation(this);
        this.trigger('conversations:loaded');
      }
    }

    /**
     * Standard `on()` provided by layer.Root.
     *
     * Adds some special handling of 'conversations:loaded' so that calls such as
     *
     *      var c = client.getConversation('layer:///conversations/123', true)
     *      .on('conversations:loaded', function() {
     *          myrerender(c);
     *      });
     *      myrender(c); // render a placeholder for c until the details of c have loaded
     *
     * can fire their callback regardless of whether the client loads or has
     * already loaded the Conversation.
     *
     * @method on
     * @param  {string} eventName
     * @param  {Function} callback
     * @param  {Object} context
     * @return {layer.Conversation} this
     */

  }, {
    key: 'on',
    value: function on(name, callback, context) {
      var hasLoadedEvt = name === 'conversations:loaded' || name && (typeof name === 'undefined' ? 'undefined' : _typeof(name)) === 'object' && name['conversations:loaded'];

      if (hasLoadedEvt && !this.isLoading) {
        (function () {
          var callNow = name === 'conversations:loaded' ? callback : name['conversations:loaded'];
          Util.defer(function () {
            return callNow.apply(context);
          });
        })();
      }
      _get(Object.getPrototypeOf(Conversation.prototype), 'on', this).call(this, name, callback, context);

      return this;
    }

    /*
     * Insure that conversation.unreadCount-- can never reduce the value to negative values.
     */

  }, {
    key: '__adjustUnreadCount',
    value: function __adjustUnreadCount(newValue) {
      if (newValue < 0) return 0;
    }

    /**
     * __ Methods are automatically called by property setters.
     *
     * Any change in the unreadCount property will call this method and fire a
     * change event.
     *
     * Any triggering of this from a websocket patch unread_message_count should wait a second before firing any events
     * so that if there are a series of these updates, we don't see a lot of jitter.
     *
     * NOTE: _oldUnreadCount is used to pass data to _updateUnreadCountEvent because this method can be called many times
     * a second, and we only want to trigger this with a summary of changes rather than each individual change.
     *
     * @method __updateUnreadCount
     * @private
     * @param  {number} newValue
     * @param  {number} oldValue
     */

  }, {
    key: '__updateUnreadCount',
    value: function __updateUnreadCount(newValue, oldValue) {
      var _this10 = this;

      if (this._inLayerParser) {
        if (this._oldUnreadCount === undefined) this._oldUnreadCount = oldValue;
        if (this._updateUnreadCountTimeout) clearTimeout(this._updateUnreadCountTimeout);
        this._updateUnreadCountTimeout = setTimeout(function () {
          return _this10._updateUnreadCountEvent();
        }, 1000);
      } else {
        this._updateUnreadCountEvent();
      }
    }

    /**
     * Fire events related to changes to unreadCount
     *
     * @method _updateUnreadCountEvent
     * @private
     */

  }, {
    key: '_updateUnreadCountEvent',
    value: function _updateUnreadCountEvent() {
      if (this.isDestroyed) return;
      var oldValue = this._oldUnreadCount;
      var newValue = this.__unreadCount;
      this._oldUnreadCount = undefined;

      if (newValue === oldValue) return;
      this._triggerAsync('conversations:change', {
        newValue: newValue,
        oldValue: oldValue,
        property: 'unreadCount'
      });
    }

    /**
     * __ Methods are automatically called by property setters.
     *
     * Any change in the lastMessage pointer will call this method and fire a
     * change event.  Changes to properties within the lastMessage object will
     * not trigger this call.
     *
     * @method __updateLastMessage
     * @private
     * @param  {layer.Message} newValue
     * @param  {layer.Message} oldValue
     */

  }, {
    key: '__updateLastMessage',
    value: function __updateLastMessage(newValue, oldValue) {
      if (newValue && oldValue && newValue.id === oldValue.id) return;
      this._triggerAsync('conversations:change', {
        property: 'lastMessage',
        newValue: newValue,
        oldValue: oldValue
      });
    }

    /**
     * __ Methods are automatically called by property setters.
     *
     * Any change in the participants property will call this method and fire a
     * change event.  Changes to the participants array that don't replace the array
     * with a new array will require directly calling this method.
     *
     * @method __updateParticipants
     * @private
     * @param  {string[]} newValue
     * @param  {string[]} oldValue
     */

  }, {
    key: '__updateParticipants',
    value: function __updateParticipants(newValue, oldValue) {
      if (this._inLayerParser) return;
      var change = this._getParticipantChange(newValue, oldValue);
      if (change.add.length || change.remove.length) {
        change.property = 'participants';
        change.oldValue = oldValue;
        change.newValue = newValue;
        this._triggerAsync('conversations:change', change);
      }
    }

    /**
     * __ Methods are automatically called by property setters.
     *
     * Any change in the metadata property will call this method and fire a
     * change event.  Changes to the metadata object that don't replace the object
     * with a new object will require directly calling this method.
     *
     * @method __updateMetadata
     * @private
     * @param  {Object} newValue
     * @param  {Object} oldValue
     */

  }, {
    key: '__updateMetadata',
    value: function __updateMetadata(newValue, oldValue, paths) {
      if (this._inLayerParser) return;
      if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
        this._triggerAsync('conversations:change', {
          property: 'metadata',
          newValue: newValue,
          oldValue: oldValue,
          paths: paths
        });
      }
    }

    /**
     * Returns a plain object.
     *
     * Object will have all the same public properties as this
     * Conversation instance.  New object is returned any time
     * any of this object's properties change.
     *
     * @method toObject
     * @return {Object} POJO version of this.
     */

  }, {
    key: 'toObject',
    value: function toObject() {
      if (!this._toObject) {
        this._toObject = _get(Object.getPrototypeOf(Conversation.prototype), 'toObject', this).call(this);
        this._toObject.metadata = Util.clone(this.metadata);
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
      _get(Object.getPrototypeOf(Conversation.prototype), '_triggerAsync', this).call(this, evtName, args);
    }
  }, {
    key: 'trigger',
    value: function trigger(evtName, args) {
      this._clearObject();
      _get(Object.getPrototypeOf(Conversation.prototype), 'trigger', this).call(this, evtName, args);
    }

    /**
     * Create a conversation instance from a server representation of the conversation.
     *
     * If the Conversation already exists, will update the existing copy with
     * presumably newer values.
     *
     * @method _createFromServer
     * @protected
     * @static
     * @param  {Object} conversation - Server representation of a Conversation
     * @param  {layer.Client} client [description]
     * @return {layer.Conversation}        [description]
     */

  }], [{
    key: '_createFromServer',
    value: function _createFromServer(conversation, client) {
      var newConversation = undefined;

      // Make sure we have a client... or abort
      if (!(client instanceof Root)) throw new Error(LayerError.dictionary.clientMissing);

      // If the Conversation already exists in cache, update the cache
      var found = client.getConversation(conversation.id);
      if (found) {
        newConversation = found;
        newConversation._populateFromServer(conversation);
      } else {
        // If the Conversation does not exist, create it; side effects will cache it
        newConversation = new Conversation({
          client: client,
          fromServer: conversation
        });
      }

      // Return Conversation and whether it was new/cached
      return {
        conversation: newConversation,
        new: !found
      };
    }

    /**
     * Load a conversation from the server by Id.
     *
     * Typically one should call
     *
     *     client.getConversation(conversationId, true)
     *
     * This will get the Conversation from cache or layer.Conversation.load it from the server if not cached.
     * Typically you do not need to call this method directly.
     *
     * @method load
     * @static
     * @param  {string} id - Conversation Identifier
     * @param  {layer.Client} client - The Layer client
     * @return {layer.Conversation}
     */

  }, {
    key: 'load',
    value: function load(id, client) {
      if (!client) throw new Error(LayerError.dictionary.clientMissing);
      var conversation = new Conversation({
        url: client.url + id.substring(8),
        id: id,
        client: client
      });
      conversation._load();
      return conversation;
    }

    /**
     * Find or create a new converation.
     *
     *      var conversation = layer.Conversation.create({
     *          participants: ['a', 'b'],
     *          distinct: true,
     *          metadata: {
     *              title: 'I am not a title!'
     *          },
     *          client: client,
     *          'conversations:loaded': function(evt) {
     *
     *          }
     *      });
     *
     * Only tries to find a Conversation if its a Distinct Conversation.
     * Distinct defaults to true.
     *
     * Recommend using `client.createConversation({...})`
     * instead of `Conversation.create({...})`.
     *
     * @method create
     * @static
     * @protected
     * @param  {Object} options
     * @param  {layer.Client} options.client
     * @param  {string[]} options.participants - Array of participant ids
     * @param {boolean} [options.distinct=false] - Create a distinct conversation
     * @param {Object} [options.metadata={}] - Initial metadata for Conversation
     * @return {layer.Conversation}
     */

  }, {
    key: 'create',
    value: function create(options) {
      if (!options.client) throw new Error(LayerError.dictionary.clientMissing);
      if (options.distinct) {
        var conv = this._createDistinct(options);
        if (conv) return conv;
      }

      return new Conversation(options);
    }

    /**
     * Create or Find a Distinct Conversation.
     *
     * If the static Conversation.create method gets a request for a Distinct Conversation,
     * see if we have one cached.
     *
     * Will fire the 'conversations:loaded' event if one is provided in this call,
     * and a Conversation is found.
     *
     * @method _createDistinct
     * @static
     * @private
     * @param  {Object} options - See layer.Conversation.create options
     * @return {layer.Conversation}
     */

  }, {
    key: '_createDistinct',
    value: function _createDistinct(options) {
      if (options.participants.indexOf(options.client.userId) === -1) {
        options.participants.push(options.client.userId);
      }

      var participants = options.participants.sort();
      var pString = participants.join(',');

      var conv = options.client.findCachedConversation(function (aConv) {
        if (aConv.distinct && aConv.participants.length === participants.length) {
          var participants2 = aConv.participants.sort();
          return participants2.join(',') === pString;
        }
      });

      if (conv) {
        conv._sendDistinctEvent = new LayerEvent({
          target: conv,
          result: !options.metadata || Util.doesObjectMatch(options.metadata, conv.metadata) ? Conversation.FOUND : Conversation.FOUND_WITHOUT_REQUESTED_METADATA
        }, 'conversations:sent');
        return conv;
      }
    }

    /**
     * Identifies whether a Conversation receiving the specified patch data should be loaded from the server.
     *
     * Any change to a Conversation indicates that the Conversation is active and of potential interest; go ahead and load that
     * Conversation in case the app has need of it.  In the future we may ignore changes to unread count.  Only relevant
     * when we get Websocket events for a Conversation that has not been loaded/cached on Client.
     *
     * @method _loadResourceForPatch
     * @static
     * @private
     */

  }, {
    key: '_loadResourceForPatch',
    value: function _loadResourceForPatch(patchData) {
      return true;
    }
  }]);

  return Conversation;
}(Syncable);

/**
 * Array of participant ids.
 *
 * Do not directly manipulate;
 * use addParticipants, removeParticipants and replaceParticipants
 * to manipulate the array.
 *
 * @type {string[]}
 */


Conversation.prototype.participants = null;

/**
 * layer.Client that the conversation belongs to.
 *
 * Actual value of this string matches the appId.
 * @type {string}
 */
Conversation.prototype.clientId = '';

/**
 * Time that the conversation was created on the server.
 *
 * @type {Date}
 */
Conversation.prototype.createdAt = null;

/**
 * Conversation unique identifier.
 *
 * @type {string}
 */
Conversation.prototype.id = '';

/**
 * URL to access the conversation on the server.
 *
 * @type {string}
 */
Conversation.prototype.url = '';

/**
 * Number of unread messages in the conversation.
 *
 * @type {number}
 */
Conversation.prototype.unreadCount = 0;

/**
 * This is a Distinct Conversation.
 *
 * You can have 1 distinct conversation among a set of participants.
 * There are no limits to how many non-distinct Conversations you have have
 * among a set of participants.
 *
 * @type {boolean}
 */
Conversation.prototype.distinct = true;

/**
 * Metadata for the conversation.
 *
 * Metadata values can be plain objects and strings, but
 * no arrays, numbers, booleans or dates.
 * @type {Object}
 */
Conversation.prototype.metadata = null;

/**
 * Time that the conversation object was instantiated
 * in the current client.
 * @type {Date}
 */
Conversation.prototype.localCreatedAt = null;

/**
 * The authenticated user is a current participant in this Conversation.
 *
 * Set to false if the authenticated user has been removed from this conversation.
 *
 * A removed user can see messages up to the time they were removed,
 * but can no longer interact with the conversation.
 *
 * A removed user can no longer see the participant list.
 *
 * Read and Delivery receipts will fail on any Message in such a Conversation.
 *
 * @type {Boolean}
 */
Conversation.prototype.isCurrentParticipant = true;

/**
 * The last layer.Message to be sent/received for this Conversation.
 *
 * Value may be a Message that has been locally created but not yet received by server.
 * @type {layer.Message}
 */
Conversation.prototype.lastMessage = null;

/**
 * Caches last result of toObject()
 * @type {Object}
 * @private
 */
Conversation.prototype._toObject = null;

/**
 * Cache's a Distinct Event.
 *
 * On creating a Distinct Conversation that already exists,
 * when the send() method is called, we should trigger
 * specific events detailing the results.  Results
 * may be determined locally or on the server, but same Event may be needed.
 *
 * @type {layer.LayerEvent}
 * @private
 */
Conversation.prototype._sendDistinctEvent = null;

/**
 * A locally created Conversation will get a temporary ID.
 *
 * Some may try to lookup the Conversation using the temporary ID even
 * though it may have later received an ID from the server.
 * Keep the temporary ID so we can correctly index and cleanup.
 *
 * @type {String}
 * @private
 */
Conversation.prototype._tempId = '';

/**
 * Prefix to use when generating an ID for instances of this class
 * @type {String}
 * @static
 * @private
 */
Conversation.prefixUUID = 'layer:///conversations/';

/**
 * Property to look for when bubbling up events.
 * @type {String}
 * @static
 * @private
 */
Conversation.bubbleEventParent = 'getClient';

/**
 * The Conversation that was requested has been created.
 *
 * Used in 'conversations:sent' events.
 * @type {String}
 * @static
 */
Conversation.CREATED = 'Created';

/**
 * The Conversation that was requested has been found.
 *
 * This means that it did not need to be created.
 *
 * Used in 'conversations:sent' events.
 * @type {String}
 * @static
 */
Conversation.FOUND = 'Found';

/**
 * The Conversation that was requested has been found, but there was a mismatch in metadata.
 *
 * If the createConversation request contained metadata and it did not match the Distinct Conversation
 * that matched the requested participants, then this value is passed to notify your app that the Conversation
 * was returned but does not exactly match your request.
 *
 * Used in 'conversations:sent' events.
 * @type {String}
 * @static
 */
Conversation.FOUND_WITHOUT_REQUESTED_METADATA = 'FoundMismatch';

Conversation._supportedEvents = [

/**
 * The conversation is now on the server.
 *
 * Called after successfully creating the conversation
 * on the server.  The Result property is one of:
 *
 * * Conversation.CREATED: A new Conversation has been created
 * * Conversation.FOUND: A matching Distinct Conversation has been found
 * * Conversation.FOUND_WITHOUT_REQUESTED_METADATA: A matching Distinct Conversation has been found
 *                       but note that the metadata is NOT what you requested.
 *
 * All of these results will also mean that the updated property values have been
 * copied into your Conversation object.  That means your metadata property may no
 * longer be its initial value; it may be the value found on the server.
 *
 * @event
 * @param {layer.LayerEvent} event
 * @param {string} event.result
 */
'conversations:sent',

/**
 * An attempt to send this conversation to the server has failed.
 * @event
 * @param {layer.LayerEvent} event
 * @param {layer.LayerError} event.error
 */
'conversations:sent-error',

/**
 * The conversation is now loaded from the server.
 *
 * Note that this is only used in response to the layer.Conversation.load() method.
 * from the server.
 * @event
 * @param {layer.LayerEvent} event
 */
'conversations:loaded',

/**
 * An attempt to load this conversation from the server has failed.
 *
 * Note that this is only used in response to the layer.Conversation.load() method.
 * @event
 * @param {layer.LayerEvent} event
 * @param {layer.LayerError} event.error
 */
'conversations:loaded-error',

/**
 * The conversation has been deleted from the server.
 *
 * Caused by either a successful call to delete() on this instance
 * or by a remote user.
 * @event
 * @param {layer.LayerEvent} event
 */
'conversations:delete',

/**
 * This conversation has changed.
 *
 * @event
 * @param {layer.LayerEvent} event
 * @param {Object[]} event.changes - Array of changes reported by this event
 * @param {Mixed} event.changes.newValue
 * @param {Mixed} event.changes.oldValue
 * @param {string} event.changes.property - Name of the property that changed
 * @param {layer.Conversation} event.target
 */
'conversations:change'].concat(Syncable._supportedEvents);

Root.initClass.apply(Conversation, [Conversation, 'Conversation']);

module.exports = Conversation;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jb252ZXJzYXRpb24uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBMERBLElBQU0sV0FBVyxRQUFRLFlBQVIsQ0FBWDtBQUNOLElBQU0sVUFBVSxRQUFRLFdBQVIsQ0FBVjtBQUNOLElBQU0sYUFBYSxRQUFRLGVBQVIsQ0FBYjtBQUNOLElBQU0sT0FBTyxRQUFRLGdCQUFSLENBQVA7QUFDTixJQUFNLFlBQVksUUFBUSxTQUFSLENBQVo7QUFDTixJQUFNLE9BQU8sUUFBUSxRQUFSLENBQVA7QUFDTixJQUFNLGFBQWEsUUFBUSxlQUFSLENBQWI7QUFDTixJQUFNLGlCQUFpQixRQUFRLG1CQUFSLENBQWpCO0FBQ04sSUFBTSxTQUFTLFFBQVEsVUFBUixDQUFUOztJQUVBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFtQkosV0FuQkksWUFtQkosR0FBMEI7UUFBZCxnRUFBVSxrQkFBSTs7MEJBbkJ0QixjQW1Cc0I7OztBQUV4QixRQUFJLENBQUMsUUFBUSxZQUFSLEVBQXNCLFFBQVEsWUFBUixHQUF1QixFQUF2QixDQUEzQjtBQUNBLFFBQUksQ0FBQyxRQUFRLFFBQVIsRUFBa0IsUUFBUSxRQUFSLEdBQW1CLEVBQW5CLENBQXZCOzs7QUFId0IsUUFNcEIsUUFBUSxVQUFSLEVBQW9CLFFBQVEsRUFBUixHQUFhLFFBQVEsVUFBUixDQUFtQixFQUFuQixDQUFyQzs7O0FBTndCLFFBU3BCLFFBQVEsTUFBUixFQUFnQixRQUFRLFFBQVIsR0FBbUIsUUFBUSxNQUFSLENBQWUsS0FBZixDQUF2Qzs7dUVBNUJFLHlCQThCSSxVQVhrQjs7QUFjeEIsVUFBSyxjQUFMLEdBQXNCLElBQXRCLENBZHdCO0FBZXhCLFFBQU0sU0FBUyxNQUFLLFNBQUwsRUFBVDs7Ozs7QUFma0IsUUFvQnBCLFdBQVcsUUFBUSxVQUFSLEVBQW9CO0FBQ2pD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dUIsY0FBdkIsR0FBd0MsSUFBeEM7Ozs7Ozs7Ozs7Ozs7Ozs7QUFnQkEsYUFBYSxTQUFiLENBQXVCLG9CQUF2QixHQUE4QyxJQUE5Qzs7Ozs7Ozs7QUFRQSxhQUFhLFNBQWIsQ0FBdUIsV0FBdkIsR0FBcUMsSUFBckM7Ozs7Ozs7QUFPQSxhQUFhLFNBQWIsQ0FBdUIsU0FBdkIsR0FBbUMsSUFBbkM7Ozs7Ozs7Ozs7Ozs7QUFhQSxhQUFhLFNBQWIsQ0FBdUIsa0JBQXZCLEdBQTRDLElBQTVDOzs7Ozs7Ozs7Ozs7QUFZQSxhQUFhLFNBQWIsQ0FBdUIsT0FBdkIsR0FBaUMsRUFBakM7Ozs7Ozs7O0FBUUEsYUFBYSxVQUFiLEdBQTBCLHlCQUExQjs7Ozs7Ozs7QUFRQSxhQUFhLGlCQUFiLEdBQWlDLFdBQWpDOzs7Ozs7Ozs7QUFTQSxhQUFhLE9BQWIsR0FBdUIsU0FBdkI7Ozs7Ozs7Ozs7O0FBV0EsYUFBYSxLQUFiLEdBQXFCLE9BQXJCOzs7Ozs7Ozs7Ozs7O0FBYUEsYUFBYSxnQ0FBYixHQUFnRCxlQUFoRDs7QUFFQSxhQUFhLGdCQUFiLEdBQWdDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUF1QjlCLG9CQXZCOEI7Ozs7Ozs7O0FBK0I5QiwwQkEvQjhCOzs7Ozs7Ozs7O0FBeUM5QixzQkF6QzhCOzs7Ozs7Ozs7O0FBbUQ5Qiw0QkFuRDhCOzs7Ozs7Ozs7O0FBNkQ5QixzQkE3RDhCOzs7Ozs7Ozs7Ozs7O0FBMEU5QixzQkExRThCLEVBMEVOLE1BMUVNLENBMEVDLFNBQVMsZ0JBQVQsQ0ExRWpDOztBQTRFQSxLQUFLLFNBQUwsQ0FBZSxLQUFmLENBQXFCLFlBQXJCLEVBQW1DLENBQUMsWUFBRCxFQUFlLGNBQWYsQ0FBbkM7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLFlBQWpCIiwiZmlsZSI6ImNvbnZlcnNhdGlvbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQSBDb252ZXJzYXRpb24gb2JqZWN0IHJlcHJlc2VudHMgYSBkaWFsb2cgYW1vbmdzdCBhIHNldFxuICogb2YgcGFydGljaXBhbnRzLlxuICpcbiAqIENyZWF0ZSBhIENvbnZlcnNhdGlvbiB1c2luZyB0aGUgY2xpZW50OlxuICpcbiAqICAgICAgdmFyIGNvbnZlcnNhdGlvbiA9IGNsaWVudC5jcmVhdGVDb252ZXJzYXRpb24oe1xuICogICAgICAgICAgcGFydGljaXBhbnRzOiBbJ2EnLCdiJ10sXG4gKiAgICAgICAgICBkaXN0aW5jdDogdHJ1ZVxuICogICAgICB9KTtcbiAqXG4gKiBJbiBhZGRpdGlvbiwgdGhlcmUgaXMgYSBzaG9ydGN1dCBtZXRob2QgZm9yIGNyZWF0aW5nXG4gKiBhIGNvbnZlcnNhdGlvbiwgd2hpY2ggd2lsbCBkZWZhdWx0IHRvIGNyZWF0aW5nIGEgRGlzdGluY3RcbiAqIENvbnZlcnNhdGlvbi5cbiAqXG4gKiAgICAgIHZhciBjb252ZXJzYXRpb24gPSBjbGllbnQuY3JlYXRlQ29udmVyc2F0aW9uKFsnYScsJ2InXSk7XG4gKlxuICogTk9URTogICBEbyBub3QgY3JlYXRlIGEgY29udmVyc2F0aW9uIHdpdGggbmV3IGxheWVyLkNvbnZlcnNhdGlvbiguLi4pLFxuICogICAgICAgICBUaGlzIHdpbGwgZmFpbCB0byBoYW5kbGUgdGhlIGRpc3RpbmN0IHByb3BlcnR5IHNob3J0IG9mIGdvaW5nIHRvIHRoZSBzZXJ2ZXIgZm9yIGV2YWx1YXRpb24uXG4gKlxuICogTk9URTogICBDcmVhdGluZyBhIENvbnZlcnNhdGlvbiBpcyBhIGxvY2FsIGFjdGlvbi4gIEEgQ29udmVyc2F0aW9uIHdpbGwgbm90IGJlXG4gKiAgICAgICAgIHNlbnQgdG8gdGhlIHNlcnZlciB1bnRpbCBlaXRoZXI6XG4gKlxuICogMS4gQSBtZXNzYWdlIGlzIHNlbnQgb24gdGhhdCBDb252ZXJzYXRpb25cbiAqIDIuIGBDb252ZXJzYXRpb24uc2VuZCgpYCBpcyBjYWxsZWQgKG5vdCByZWNvbW1lbmRlZCBhcyBtb2JpbGUgY2xpZW50c1xuICogICAgZXhwZWN0IGF0IGxlYXN0IG9uZSBsYXllci5NZXNzYWdlIGluIGEgQ29udmVyc2F0aW9uKVxuICpcbiAqIEtleSBtZXRob2RzLCBldmVudHMgYW5kIHByb3BlcnRpZXMgZm9yIGdldHRpbmcgc3RhcnRlZDpcbiAqXG4gKiBQcm9wZXJ0aWVzOlxuICpcbiAqICogbGF5ZXIuQ29udmVyc2F0aW9uLmlkOiB0aGlzIHByb3BlcnR5IGlzIHdvcnRoIGJlaW5nIGZhbWlsaWFyIHdpdGg7IGl0IGlkZW50aWZpZXMgdGhlXG4gKiAgIENvbnZlcnNhdGlvbiBhbmQgY2FuIGJlIHVzZWQgaW4gYGNsaWVudC5nZXRDb252ZXJzYXRpb24oaWQpYCB0byByZXRyaWV2ZSBpdC5cbiAqICogbGF5ZXIuQ29udmVyc2F0aW9uLmludGVybmFsSWQ6IFRoaXMgcHJvcGVydHkgbWFrZXMgZm9yIGEgaGFuZHkgdW5pcXVlIElEIGZvciB1c2UgaW4gZG9tIG5vZGVzO1xuICogICBnYXVyZW50ZWVkIG5vdCB0byBjaGFuZ2UgZHVyaW5nIHRoaXMgc2Vzc2lvbi5cbiAqICogbGF5ZXIuQ29udmVyc2F0aW9uLmxhc3RNZXNzYWdlOiBUaGlzIHByb3BlcnR5IG1ha2VzIGl0IGVhc3kgdG8gc2hvdyBpbmZvIGFib3V0IHRoZSBtb3N0IHJlY2VudCBNZXNzYWdlXG4gKiAgICB3aGVuIHJlbmRlcmluZyBhIGxpc3Qgb2YgQ29udmVyc2F0aW9ucy5cbiAqICogbGF5ZXIuQ29udmVyc2F0aW9uLm1ldGFkYXRhOiBDdXN0b20gZGF0YSBmb3IgeW91ciBDb252ZXJzYXRpb247IGNvbW1vbmx5IHVzZWQgdG8gc3RvcmUgYSAndGl0bGUnIHByb3BlcnR5XG4gKiAgICB0byBuYW1lIHlvdXIgQ29udmVyc2F0aW9uLlxuICpcbiAqIE1ldGhvZHM6XG4gKlxuICogKiBsYXllci5Db252ZXJzYXRpb24uYWRkUGFydGljaXBhbnRzIGFuZCBsYXllci5Db252ZXJzYXRpb24ucmVtb3ZlUGFydGljaXBhbnRzOiBDaGFuZ2UgdGhlIHBhcnRpY2lwYW50cyBvZiB0aGUgQ29udmVyc2F0aW9uXG4gKiAqIGxheWVyLkNvbnZlcnNhdGlvbi5zZXRNZXRhZGF0YVByb3BlcnRpZXM6IFNldCBtZXRhZGF0YS50aXRsZSB0byAnTXkgQ29udmVyc2F0aW9uIHdpdGggTGF5ZXIgU3VwcG9ydCcgKHVoIG9oKVxuICogKiBsYXllci5Db252ZXJzYXRpb24ub24oKSBhbmQgbGF5ZXIuQ29udmVyc2F0aW9uLm9mZigpOiBldmVudCBsaXN0ZW5lcnMgYnVpbHQgb24gdG9wIG9mIHRoZSBgYmFja2JvbmUtZXZlbnRzLXN0YW5kYWxvbmVgIG5wbSBwcm9qZWN0XG4gKlxuICogRXZlbnRzOlxuICpcbiAqICogYGNvbnZlcnNhdGlvbnM6Y2hhbmdlYDogVXNlZnVsIGZvciBvYnNlcnZpbmcgY2hhbmdlcyB0byBwYXJ0aWNpcGFudHMgYW5kIG1ldGFkYXRhXG4gKiAgIGFuZCB1cGRhdGluZyByZW5kZXJpbmcgb2YgeW91ciBvcGVuIENvbnZlcnNhdGlvblxuICpcbiAqIEZpbmFsbHksIHRvIGFjY2VzcyBhIGxpc3Qgb2YgTWVzc2FnZXMgaW4gYSBDb252ZXJzYXRpb24sIHNlZSBsYXllci5RdWVyeS5cbiAqXG4gKiBAY2xhc3MgIGxheWVyLkNvbnZlcnNhdGlvblxuICogQGV4dGVuZHMgbGF5ZXIuU3luY2FibGVcbiAqIEBhdXRob3IgIE1pY2hhZWwgS2FudG9yXG4gKi9cblxuY29uc3QgU3luY2FibGUgPSByZXF1aXJlKCcuL3N5bmNhYmxlJyk7XG5jb25zdCBNZXNzYWdlID0gcmVxdWlyZSgnLi9tZXNzYWdlJyk7XG5jb25zdCBMYXllckVycm9yID0gcmVxdWlyZSgnLi9sYXllci1lcnJvcicpO1xuY29uc3QgVXRpbCA9IHJlcXVpcmUoJy4vY2xpZW50LXV0aWxzJyk7XG5jb25zdCBDb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0Jyk7XG5jb25zdCBSb290ID0gcmVxdWlyZSgnLi9yb290Jyk7XG5jb25zdCBMYXllckV2ZW50ID0gcmVxdWlyZSgnLi9sYXllci1ldmVudCcpO1xuY29uc3QgQ2xpZW50UmVnaXN0cnkgPSByZXF1aXJlKCcuL2NsaWVudC1yZWdpc3RyeScpO1xuY29uc3QgbG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXInKTtcblxuY2xhc3MgQ29udmVyc2F0aW9uIGV4dGVuZHMgU3luY2FibGUge1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgY29udmVyc2F0aW9uLlxuICAgKlxuICAgKiBUaGUgc3RhdGljIGBsYXllci5Db252ZXJzYXRpb24uY3JlYXRlKClgIG1ldGhvZFxuICAgKiB3aWxsIGNvcnJlY3RseSBsb29rdXAgZGlzdGluY3QgQ29udmVyc2F0aW9ucyBhbmRcbiAgICogcmV0dXJuIHRoZW07IGBuZXcgbGF5ZXIuQ29udmVyc2F0aW9uKClgIHdpbGwgbm90LlxuICAgKlxuICAgKiBEZXZlbG9wZXJzIHNob3VsZCB1c2UgYGxheWVyLkNvbnZlcnNhdGlvbi5jcmVhdGUoKWAuXG4gICAqXG4gICAqIEBtZXRob2QgY29uc3RydWN0b3JcbiAgICogQHByb3RlY3RlZFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnNcbiAgICogQHBhcmFtIHtzdHJpbmdbXX0gb3B0aW9ucy5wYXJ0aWNpcGFudHMgLSBBcnJheSBvZiBwYXJ0aWNpcGFudCBpZHNcbiAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5kaXN0aW5jdD10cnVlXSAtIElzIHRoZSBjb252ZXJzYXRpb24gZGlzdGluY3RcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLm1ldGFkYXRhXSAtIEFuIG9iamVjdCBjb250YWluaW5nIENvbnZlcnNhdGlvbiBNZXRhZGF0YS5cbiAgICogQHJldHVybiB7bGF5ZXIuQ29udmVyc2F0aW9ufVxuICAgKi9cbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG4gICAgLy8gU2V0dXAgZGVmYXVsdCB2YWx1ZXNcbiAgICBpZiAoIW9wdGlvbnMucGFydGljaXBhbnRzKSBvcHRpb25zLnBhcnRpY2lwYW50cyA9IFtdO1xuICAgIGlmICghb3B0aW9ucy5tZXRhZGF0YSkgb3B0aW9ucy5tZXRhZGF0YSA9IHt9O1xuXG4gICAgLy8gTWFrZSBzdXJlIHRoZSBJRCBmcm9tIGhhbmRsZSBmcm9tU2VydmVyIHBhcmFtZXRlciBpcyB1c2VkIGJ5IHRoZSBSb290LmNvbnN0cnVjdG9yXG4gICAgaWYgKG9wdGlvbnMuZnJvbVNlcnZlcikgb3B0aW9ucy5pZCA9IG9wdGlvbnMuZnJvbVNlcnZlci5pZDtcblxuICAgIC8vIE1ha2Ugc3VyZSB3ZSBoYXZlIGFuIGNsaWVudElkIHByb3BlcnR5XG4gICAgaWYgKG9wdGlvbnMuY2xpZW50KSBvcHRpb25zLmNsaWVudElkID0gb3B0aW9ucy5jbGllbnQuYXBwSWQ7XG5cbiAgICBzdXBlcihvcHRpb25zKTtcblxuXG4gICAgdGhpcy5pc0luaXRpYWxpemluZyA9IHRydWU7XG4gICAgY29uc3QgY2xpZW50ID0gdGhpcy5nZXRDbGllbnQoKTtcblxuICAgIC8vIElmIHRoZSBvcHRpb25zIGNvbnRhaW5zIGEgZnVsbCBzZXJ2ZXIgZGVmaW5pdGlvbiBvZiB0aGUgb2JqZWN0LFxuICAgIC8vIGNvcHkgaXQgaW4gd2l0aCBfcG9wdWxhdGVGcm9tU2VydmVyOyB0aGlzIHdpbGwgYWRkIHRoZSBDb252ZXJzYXRpb25cbiAgICAvLyB0byB0aGUgQ2xpZW50IGFzIHdlbGwuXG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5mcm9tU2VydmVyKSB7XG4gICAgICB0aGlzLl9wb3B1bGF0ZUZyb21TZXJ2ZXIob3B0aW9ucy5mcm9tU2VydmVyKTtcbiAgICB9XG5cbiAgICAvLyBTZXR1cCBwYXJ0aWNpcGFudHNcbiAgICBlbHNlIGlmIChjbGllbnQgJiYgdGhpcy5wYXJ0aWNpcGFudHMuaW5kZXhPZihjbGllbnQudXNlcklkKSA9PT0gLTEpIHtcbiAgICAgIHRoaXMucGFydGljaXBhbnRzLnB1c2goY2xpZW50LnVzZXJJZCk7XG4gICAgfVxuXG4gICAgdGhpcy5sb2NhbENyZWF0ZWRBdCA9IG5ldyBEYXRlKCk7XG5cbiAgICBpZiAoY2xpZW50KSBjbGllbnQuX2FkZENvbnZlcnNhdGlvbih0aGlzKTtcbiAgICB0aGlzLmlzSW5pdGlhbGl6aW5nID0gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveSB0aGUgbG9jYWwgY29weSBvZiB0aGlzIENvbnZlcnNhdGlvbiwgY2xlYW5pbmcgdXAgYWxsIHJlc291cmNlc1xuICAgKiBpdCBjb25zdW1lcy5cbiAgICpcbiAgICogQG1ldGhvZCBkZXN0cm95XG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMubGFzdE1lc3NhZ2UgPSBudWxsO1xuXG4gICAgLy8gQ2xpZW50IGZpcmVzICdjb252ZXJzYXRpb25zOnJlbW92ZScgYW5kIHRoZW4gcmVtb3ZlcyB0aGUgQ29udmVyc2F0aW9uLlxuICAgIGlmICh0aGlzLmNsaWVudElkKSB0aGlzLmdldENsaWVudCgpLl9yZW1vdmVDb252ZXJzYXRpb24odGhpcyk7XG5cbiAgICBzdXBlci5kZXN0cm95KCk7XG5cbiAgICB0aGlzLnBhcnRpY2lwYW50cyA9IG51bGw7XG4gICAgdGhpcy5tZXRhZGF0YSA9IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBjbGllbnQgYXNzb2NpYXRlZCB3aXRoIHRoaXMgQ29udmVyc2F0aW9uLlxuICAgKlxuICAgKiBAbWV0aG9kIGdldENsaWVudFxuICAgKiBAcmV0dXJuIHtsYXllci5DbGllbnR9XG4gICAqL1xuICBnZXRDbGllbnQoKSB7XG4gICAgcmV0dXJuIENsaWVudFJlZ2lzdHJ5LmdldCh0aGlzLmNsaWVudElkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgdGhpcyBDb252ZXJzYXRpb24gb24gdGhlIHNlcnZlci5cbiAgICpcbiAgICogT24gY29tcGxldGlvbiwgdGhpcyBpbnN0YW5jZSB3aWxsIHJlY2VpdmVcbiAgICogYW4gaWQsIHVybCBhbmQgY3JlYXRlZEF0LiAgSXQgbWF5IGFsc28gcmVjZWl2ZSBtZXRhZGF0YVxuICAgKiBpZiB0aGVyZSB3YXMgYSBGT1VORF9XSVRIT1VUX1JFUVVFU1RFRF9NRVRBREFUQSByZXN1bHQuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB0aGUgb3B0aW9uYWwgTWVzc2FnZSBwYXJhbWV0ZXIgc2hvdWxkIE5PVCBiZSB1c2VkIGV4Y2VwdFxuICAgKiBieSB0aGUgbGF5ZXIuTWVzc2FnZSBjbGFzcyBpdHNlbGYuXG4gICAqXG4gICAqIE5vdGUgdGhhdCByZWNvbW1lbmRlZCBwcmFjdGljZSBpcyB0byBzZW5kIHRoZSBDb252ZXJzYXRpb24gYnkgc2VuZGluZyBhIE1lc3NhZ2UgaW4gdGhlIENvbnZlcnNhdGlvbixcbiAgICogYW5kIE5PVCBieSBjYWxsaW5nIENvbnZlcnNhdGlvbi5zZW5kLlxuICAgKlxuICAgKiAgICAgIGNsaWVudC5jcmVhdGVDb252ZXJzYXRpb24oe1xuICAgKiAgICAgICAgICBwYXJ0aWNpcGFudHM6IFsnYScsICdiJ10sXG4gICAqICAgICAgICAgIGRpc3RpbmN0OiBmYWxzZVxuICAgKiAgICAgIH0pXG4gICAqICAgICAgLnNlbmQoKVxuICAgKiAgICAgIC5vbignY29udmVyc2F0aW9uczpzZW50JywgZnVuY3Rpb24oZXZ0KSB7XG4gICAqICAgICAgICAgIGFsZXJ0KCdEb25lJyk7XG4gICAqICAgICAgfSk7XG4gICAqXG4gICAqIEBtZXRob2Qgc2VuZFxuICAgKiBAcGFyYW0ge2xheWVyLk1lc3NhZ2V9IFttZXNzYWdlXSBUZWxscyB0aGUgQ29udmVyc2F0aW9uIHdoYXQgaXRzIGxhc3RfbWVzc2FnZSB3aWxsIGJlXG4gICAqIEByZXR1cm4ge2xheWVyLkNvbnZlcnNhdGlvbn0gdGhpc1xuICAgKi9cbiAgc2VuZChtZXNzYWdlKSB7XG4gICAgY29uc3QgY2xpZW50ID0gdGhpcy5nZXRDbGllbnQoKTtcbiAgICBpZiAoIWNsaWVudCkgdGhyb3cgbmV3IEVycm9yKExheWVyRXJyb3IuZGljdGlvbmFyeS5jbGllbnRNaXNzaW5nKTtcblxuICAgIC8vIElmIHRoaXMgaXMgcGFydCBvZiBhIGNyZWF0ZSh7ZGlzdGluY3Q6dHJ1ZX0pLnNlbmQoKSBjYWxsIHdoZXJlXG4gICAgLy8gdGhlIGRpc3RpbmN0IGNvbnZlcnNhdGlvbiB3YXMgZm91bmQsIGp1c3QgdHJpZ2dlciB0aGUgY2FjaGVkIGV2ZW50IGFuZCBleGl0XG4gICAgaWYgKHRoaXMuX3NlbmREaXN0aW5jdEV2ZW50KSByZXR1cm4gdGhpcy5faGFuZGxlTG9jYWxEaXN0aW5jdENvbnZlcnNhdGlvbigpO1xuXG4gICAgLy8gSWYgYSBtZXNzYWdlIGlzIHBhc3NlZCBpbiwgdGhlbiB0aGF0IG1lc3NhZ2UgaXMgYmVpbmcgc2VudCwgYW5kIGlzIG91clxuICAgIC8vIG5ldyBsYXN0TWVzc2FnZSAodW50aWwgdGhlIHdlYnNvY2tldCB0ZWxscyB1cyBvdGhlcndpc2UpXG4gICAgaWYgKG1lc3NhZ2UpIHtcbiAgICAgIC8vIFNldHRpbmcgYSBwb3NpdGlvbiBpcyByZXF1aXJlZCBpZiBpdHMgZ29pbmcgdG8gZ2V0IHNvcnRlZCBjb3JyZWN0bHkgYnkgcXVlcnkuXG4gICAgICAvLyBUaGUgY29ycmVjdCBwb3NpdGlvbiB3aWxsIGJlIHdyaXR0ZW4gYnkgX3BvcHVsYXRlRnJvbVNlcnZlciB3aGVuIHRoZSBvYmplY3RcbiAgICAgIC8vIGlzIHJldHVybmVkIGZyb20gdGhlIHNlcnZlci5cbiAgICAgIC8vIFdBUk5JTkc6IFRoZSBxdWVyeSB3aWxsIE5PVCBiZSByZXNvcnRlZCB1c2luZyB0aGUgc2VydmVyJ3MgcG9zaXRpb24gdmFsdWUuXG4gICAgICBtZXNzYWdlLnBvc2l0aW9uID0gdGhpcy5sYXN0TWVzc2FnZSA/IHRoaXMubGFzdE1lc3NhZ2UucG9zaXRpb24gKyAxIDogMDtcbiAgICAgIHRoaXMubGFzdE1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgIH1cblxuICAgIC8vIElmIHRoZSBDb252ZXJzYXRpb24gaXMgYWxyZWFkeSBvbiB0aGUgc2VydmVyLCBkb24ndCBzZW5kLlxuICAgIGlmICh0aGlzLnN5bmNTdGF0ZSAhPT0gQ29uc3RhbnRzLlNZTkNfU1RBVEUuTkVXKSByZXR1cm4gdGhpcztcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGlzIHVzZXIgaXMgYSBwYXJ0aWNpcGFudCAoc2VydmVyIGRvZXMgdGhpcyBmb3IgdXMsIGJ1dFxuICAgIC8vIHRoaXMgaW5zdXJlcyB0aGUgbG9jYWwgY29weSBpcyBjb3JyZWN0IHVudGlsIHdlIGdldCBhIHJlc3BvbnNlIGZyb21cbiAgICAvLyB0aGUgc2VydmVyXG4gICAgaWYgKHRoaXMucGFydGljaXBhbnRzLmluZGV4T2YoY2xpZW50LnVzZXJJZCkgPT09IC0xKSB7XG4gICAgICB0aGlzLnBhcnRpY2lwYW50cy5wdXNoKGNsaWVudC51c2VySWQpO1xuICAgIH1cblxuICAgIC8vIElmIHRoZXJlIGlzIG9ubHkgb25lIHBhcnRpY2lwYW50LCBpdHMgY2xpZW50LnVzZXJJZC4gIE5vdCBlbm91Z2hcbiAgICAvLyBmb3IgdXMgdG8gaGF2ZSBhIGdvb2QgQ29udmVyc2F0aW9uIG9uIHRoZSBzZXJ2ZXIuICBBYm9ydC5cbiAgICBpZiAodGhpcy5wYXJ0aWNpcGFudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoTGF5ZXJFcnJvci5kaWN0aW9uYXJ5Lm1vcmVQYXJ0aWNpcGFudHNSZXF1aXJlZCk7XG4gICAgfVxuXG4gICAgLy8gVXBkYXRlIHRoZSBzeW5jU3RhdGVcbiAgICB0aGlzLl9zZXRTeW5jaW5nKCk7XG5cbiAgICBjbGllbnQuc2VuZFNvY2tldFJlcXVlc3Qoe1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICBib2R5OiBmdW5jdGlvbiBnZXRSZXF1ZXN0RGF0YSgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBtZXRob2Q6ICdDb252ZXJzYXRpb24uY3JlYXRlJyxcbiAgICAgICAgICBkYXRhOiB0aGlzLl9nZXRQb3N0RGF0YSgpLFxuICAgICAgICB9O1xuICAgICAgfS5iaW5kKHRoaXMpLFxuICAgICAgc3luYzoge1xuICAgICAgICBkZXBlbmRzOiB0aGlzLmlkLFxuICAgICAgICB0YXJnZXQ6IHRoaXMuaWQsXG4gICAgICB9LFxuICAgIH0sIChyZXN1bHQpID0+IHRoaXMuX2NyZWF0ZVJlc3VsdChyZXN1bHQpKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGVzIHRoZSBjYXNlIHdoZXJlIGEgRGlzdGluY3QgQ3JlYXRlIENvbnZlcnNhdGlvbiBmb3VuZCBhIGxvY2FsIG1hdGNoLlxuICAgKlxuICAgKiBXaGVuIGFuIGFwcCBjYWxscyBjbGllbnQuY3JlYXRlQ29udmVyc2F0aW9uKFsuLi5dKVxuICAgKiBhbmQgcmVxdWVzdHMgYSBEaXN0aW5jdCBDb252ZXJzYXRpb24gKGRlZmF1bHQgc2V0dGluZyksXG4gICAqIGFuZCB0aGUgQ29udmVyc2F0aW9uIGFscmVhZHkgZXhpc3RzLCB3aGF0IGRvIHdlIGRvIHRvIGhlbHBcbiAgICogdGhlbSBhY2Nlc3MgaXQ/XG4gICAqXG4gICAqICAgICAgY2xpZW50LmNyZWF0ZUNvbnZlcnNhdGlvbihbXCJmcmVkXCJdKS5vbihcImNvbnZlcnNhdGlvbnM6c2VudFwiLCBmdW5jdGlvbihldnQpIHtcbiAgICogICAgICAgIHJlbmRlcigpO1xuICAgKiAgICAgIH0pO1xuICAgKlxuICAgKiBVbmRlciBub3JtYWwgY29uZGl0aW9ucywgY2FsbGluZyBgYy5zZW5kKClgIG9uIGEgbWF0Y2hpbmcgZGlzdGluY3QgQ29udmVyc2F0aW9uXG4gICAqIHdvdWxkIGVpdGhlciB0aHJvdyBhbiBlcnJvciBvciBqdXN0IGJlIGEgbm8tb3AuICBXZSB1c2UgdGhpcyBtZXRob2QgdG8gdHJpZ2dlclxuICAgKiB0aGUgZXhwZWN0ZWQgXCJjb252ZXJzYXRpb25zOnNlbnRcIiBldmVudCBldmVuIHRob3VnaCBpdHMgYWxyZWFkeSBiZWVuIHNlbnQgYW5kXG4gICAqIHdlIGRpZCBub3RoaW5nLiAgVXNlIHRoZSBldnQucmVzdWx0IHByb3BlcnR5IGlmIHlvdSB3YW50IHRvIGtub3cgd2hldGhlciB0aGVcbiAgICogcmVzdWx0IHdhcyBhIG5ldyBjb252ZXJzYXRpb24gb3IgbWF0Y2hpbmcgb25lLlxuICAgKlxuICAgKiBAbWV0aG9kIF9oYW5kbGVMb2NhbERpc3RpbmN0Q29udmVyc2F0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaGFuZGxlTG9jYWxEaXN0aW5jdENvbnZlcnNhdGlvbigpIHtcbiAgICBjb25zdCBldnQgPSB0aGlzLl9zZW5kRGlzdGluY3RFdmVudDtcbiAgICB0aGlzLl9zZW5kRGlzdGluY3RFdmVudCA9IG51bGw7XG5cbiAgICAvLyBkZWxheSBzbyB0aGVyZSBpcyB0aW1lIHRvIHNldHVwIGFuIGV2ZW50IGxpc3RlbmVyIG9uIHRoaXMgY29udmVyc2F0aW9uXG4gICAgdGhpcy5fdHJpZ2dlckFzeW5jKCdjb252ZXJzYXRpb25zOnNlbnQnLCBldnQpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cblxuICAvKipcbiAgICogR2V0cyB0aGUgZGF0YSBmb3IgYSBDcmVhdGUgcmVxdWVzdC5cbiAgICpcbiAgICogVGhlIGxheWVyLlN5bmNNYW5hZ2VyIG5lZWRzIGEgY2FsbGJhY2sgdG8gY3JlYXRlIHRoZSBDb252ZXJzYXRpb24gYXMgaXRcbiAgICogbG9va3MgTk9XLCBub3QgYmFjayB3aGVuIGBzZW5kKClgIHdhcyBjYWxsZWQuICBUaGlzIG1ldGhvZCBpcyBjYWxsZWRcbiAgICogYnkgdGhlIGxheWVyLlN5bmNNYW5hZ2VyIHRvIHBvcHVsYXRlIHRoZSBQT1NUIGRhdGEgb2YgdGhlIGNhbGwuXG4gICAqXG4gICAqIEBtZXRob2QgX2dldFBvc3REYXRhXG4gICAqIEBwcml2YXRlXG4gICAqIEByZXR1cm4ge09iamVjdH0gUE9TVCBkYXRhIGZvciBjcmVhdGluZyBhIENvbnZlcnNhdGlvblxuICAgKi9cbiAgX2dldFBvc3REYXRhKCkge1xuICAgIGNvbnN0IGlzTWV0YWRhdGFFbXB0eSA9IFV0aWwuaXNFbXB0eSh0aGlzLm1ldGFkYXRhKTtcbiAgICByZXR1cm4ge1xuICAgICAgcGFydGljaXBhbnRzOiB0aGlzLnBhcnRpY2lwYW50cyxcbiAgICAgIGRpc3RpbmN0OiB0aGlzLmRpc3RpbmN0LFxuICAgICAgbWV0YWRhdGE6IGlzTWV0YWRhdGFFbXB0eSA/IG51bGwgOiB0aGlzLm1ldGFkYXRhLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogUHJvY2VzcyByZXN1bHQgb2Ygc2VuZCBtZXRob2QuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB3ZSB1c2UgX3RyaWdnZXJBc3luYyBzbyB0aGF0XG4gICAqIGV2ZW50cyByZXBvcnRpbmcgY2hhbmdlcyB0byB0aGUgbGF5ZXIuQ29udmVyc2F0aW9uLmlkIGNhblxuICAgKiBiZSBhcHBsaWVkIGJlZm9yZSByZXBvcnRpbmcgb24gaXQgYmVpbmcgc2VudC5cbiAgICpcbiAgICogRXhhbXBsZTogUXVlcnkgd2lsbCBub3cgaGF2ZSBJRHMgcmF0aGVyIHRoYW4gVEVNUF9JRHNcbiAgICogd2hlbiB0aGlzIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICpcbiAgICogQG1ldGhvZCBfY3JlYXRlUmVzdWx0XG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdH0gcmVzdWx0XG4gICAqL1xuICBfY3JlYXRlUmVzdWx0KHsgc3VjY2VzcywgZGF0YSB9KSB7XG4gICAgaWYgKHRoaXMuaXNEZXN0cm95ZWQpIHJldHVybjtcbiAgICBpZiAoc3VjY2Vzcykge1xuICAgICAgdGhpcy5fY3JlYXRlU3VjY2VzcyhkYXRhKTtcbiAgICB9IGVsc2UgaWYgKGRhdGEuaWQgPT09ICdjb25mbGljdCcpIHtcbiAgICAgIHRoaXMuX3BvcHVsYXRlRnJvbVNlcnZlcihkYXRhLmRhdGEpO1xuICAgICAgdGhpcy5fdHJpZ2dlckFzeW5jKCdjb252ZXJzYXRpb25zOnNlbnQnLCB7XG4gICAgICAgIHJlc3VsdDogQ29udmVyc2F0aW9uLkZPVU5EX1dJVEhPVVRfUkVRVUVTVEVEX01FVEFEQVRBLFxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudHJpZ2dlcignY29udmVyc2F0aW9uczpzZW50LWVycm9yJywgeyBlcnJvcjogZGF0YSB9KTtcbiAgICAgIHRoaXMuZGVzdHJveSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzIHRoZSBzdWNjZXNzZnVsIHJlc3VsdCBvZiBhIGNyZWF0ZSBjYWxsXG4gICAqXG4gICAqIEBtZXRob2QgX2NyZWF0ZVN1Y2Nlc3NcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtICB7T2JqZWN0fSBkYXRhIFNlcnZlciBkZXNjcmlwdGlvbiBvZiBDb252ZXJzYXRpb25cbiAgICovXG4gIF9jcmVhdGVTdWNjZXNzKGRhdGEpIHtcbiAgICB0aGlzLl9wb3B1bGF0ZUZyb21TZXJ2ZXIoZGF0YSk7XG4gICAgaWYgKCF0aGlzLmRpc3RpbmN0KSB7XG4gICAgICB0aGlzLl90cmlnZ2VyQXN5bmMoJ2NvbnZlcnNhdGlvbnM6c2VudCcsIHtcbiAgICAgICAgcmVzdWx0OiBDb252ZXJzYXRpb24uQ1JFQVRFRCxcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBDdXJyZW50bHkgdGhlIHdlYnNvY2tldCBkb2VzIG5vdCB0ZWxsIHVzIGlmIGl0c1xuICAgICAgLy8gcmV0dXJuaW5nIGFuIGV4aXN0aW5nIENvbnZlcnNhdGlvbi4gIFNvIGd1ZXNzLi4uXG4gICAgICAvLyBpZiB0aGVyZSBpcyBubyBsYXN0TWVzc2FnZSwgdGhlbiBtb3N0IGxpa2VseSwgdGhlcmUgd2FzXG4gICAgICAvLyBubyBleGlzdGluZyBDb252ZXJzYXRpb24uICBTYWRseSwgQVBJLTgzNDsgbGFzdF9tZXNzYWdlIGlzIGN1cnJlbnRseVxuICAgICAgLy8gYWx3YXlzIG51bGwuXG4gICAgICB0aGlzLl90cmlnZ2VyQXN5bmMoJ2NvbnZlcnNhdGlvbnM6c2VudCcsIHtcbiAgICAgICAgcmVzdWx0OiAhdGhpcy5sYXN0TWVzc2FnZSA/IENvbnZlcnNhdGlvbi5DUkVBVEVEIDogQ29udmVyc2F0aW9uLkZPVU5ELFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFBvcHVsYXRlcyB0aGlzIGluc3RhbmNlIHVzaW5nIHNlcnZlci1kYXRhLlxuICAgKlxuICAgKiBTaWRlIGVmZmVjdHMgYWRkIHRoaXMgdG8gdGhlIENsaWVudC5cbiAgICpcbiAgICogQG1ldGhvZCBfcG9wdWxhdGVGcm9tU2VydmVyXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdH0gY29udmVyc2F0aW9uIC0gU2VydmVyIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjb252ZXJzYXRpb25cbiAgICovXG4gIF9wb3B1bGF0ZUZyb21TZXJ2ZXIoY29udmVyc2F0aW9uKSB7XG4gICAgY29uc3QgY2xpZW50ID0gdGhpcy5nZXRDbGllbnQoKTtcblxuICAgIC8vIERpc2FibGUgZXZlbnRzIGlmIGNyZWF0aW5nIGEgbmV3IENvbnZlcnNhdGlvblxuICAgIC8vIFdlIHN0aWxsIHdhbnQgcHJvcGVydHkgY2hhbmdlIGV2ZW50cyBmb3IgYW55dGhpbmcgdGhhdCBET0VTIGNoYW5nZVxuICAgIHRoaXMuX2Rpc2FibGVFdmVudHMgPSAodGhpcy5zeW5jU3RhdGUgPT09IENvbnN0YW50cy5TWU5DX1NUQVRFLk5FVyk7XG5cbiAgICB0aGlzLl9zZXRTeW5jZWQoKTtcblxuICAgIGNvbnN0IGlkID0gdGhpcy5pZDtcbiAgICB0aGlzLmlkID0gY29udmVyc2F0aW9uLmlkO1xuICAgIGlmIChpZCAhPT0gdGhpcy5pZCkge1xuICAgICAgdGhpcy5fdGVtcElkID0gaWQ7XG4gICAgICBjbGllbnQuX3VwZGF0ZUNvbnZlcnNhdGlvbklkKHRoaXMsIGlkKTtcbiAgICAgIHRoaXMuX3RyaWdnZXJBc3luYygnY29udmVyc2F0aW9uczpjaGFuZ2UnLCB7XG4gICAgICAgIG9sZFZhbHVlOiBpZCxcbiAgICAgICAgbmV3VmFsdWU6IHRoaXMuaWQsXG4gICAgICAgIHByb3BlcnR5OiAnaWQnLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy51cmwgPSBjb252ZXJzYXRpb24udXJsO1xuICAgIHRoaXMucGFydGljaXBhbnRzID0gY29udmVyc2F0aW9uLnBhcnRpY2lwYW50cztcbiAgICB0aGlzLmRpc3RpbmN0ID0gY29udmVyc2F0aW9uLmRpc3RpbmN0O1xuICAgIHRoaXMuY3JlYXRlZEF0ID0gbmV3IERhdGUoY29udmVyc2F0aW9uLmNyZWF0ZWRfYXQpO1xuICAgIHRoaXMubWV0YWRhdGEgPSBjb252ZXJzYXRpb24ubWV0YWRhdGE7XG4gICAgdGhpcy51bnJlYWRDb3VudCA9IGNvbnZlcnNhdGlvbi51bnJlYWRfbWVzc2FnZV9jb3VudDtcbiAgICB0aGlzLmlzQ3VycmVudFBhcnRpY2lwYW50ID0gdGhpcy5wYXJ0aWNpcGFudHMuaW5kZXhPZihjbGllbnQudXNlcklkKSAhPT0gLTE7XG5cbiAgICBjbGllbnQuX2FkZENvbnZlcnNhdGlvbih0aGlzKTtcblxuXG4gICAgaWYgKGNvbnZlcnNhdGlvbi5sYXN0X21lc3NhZ2UpIHtcbiAgICAgIHRoaXMubGFzdE1lc3NhZ2UgPSBNZXNzYWdlLl9jcmVhdGVGcm9tU2VydmVyKGNvbnZlcnNhdGlvbi5sYXN0X21lc3NhZ2UsIHRoaXMpLm1lc3NhZ2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubGFzdE1lc3NhZ2UgPSBudWxsO1xuICAgIH1cblxuICAgIHRoaXMuX2Rpc2FibGVFdmVudHMgPSBmYWxzZTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIEFkZCBhbiBhcnJheSBvZiBwYXJ0aWNpcGFudCBpZHMgdG8gdGhlIGNvbnZlcnNhdGlvbi5cbiAgICpcbiAgICogICAgICBjb252ZXJzYXRpb24uYWRkUGFydGljaXBhbnRzKFsnYScsICdiJ10pO1xuICAgKlxuICAgKiBOZXcgcGFydGljaXBhbnRzIHdpbGwgaW1tZWRpYXRlbHkgc2hvdyB1cCBpbiB0aGUgQ29udmVyc2F0aW9uLFxuICAgKiBidXQgbWF5IG5vdCBoYXZlIHN5bmNlZCB3aXRoIHRoZSBzZXJ2ZXIgeWV0LlxuICAgKlxuICAgKiBUT0RPIFdFQi05Njc6IFJvbGwgcGFydGljaXBhbnRzIGJhY2sgb24gZ2V0dGluZyBhIHNlcnZlciBlcnJvclxuICAgKlxuICAgKiBAbWV0aG9kIGFkZFBhcnRpY2lwYW50c1xuICAgKiBAcGFyYW0gIHtzdHJpbmdbXX0gcGFydGljaXBhbnRzIC0gQXJyYXkgb2YgcGFydGljaXBhbnQgaWRzXG4gICAqIEByZXR1cm5zIHtsYXllci5Db252ZXJzYXRpb259IHRoaXNcbiAgICovXG4gIGFkZFBhcnRpY2lwYW50cyhwYXJ0aWNpcGFudHMpIHtcbiAgICAvLyBPbmx5IGFkZCB0aG9zZSB0aGF0IGFyZW4ndCBhbHJlYWR5IGluIHRoZSBsaXN0LlxuICAgIGNvbnN0IGFkZGluZyA9IHBhcnRpY2lwYW50cy5maWx0ZXIocGFydGljaXBhbnQgPT4gdGhpcy5wYXJ0aWNpcGFudHMuaW5kZXhPZihwYXJ0aWNpcGFudCkgPT09IC0xKTtcbiAgICB0aGlzLl9wYXRjaFBhcnRpY2lwYW50cyh7IGFkZDogYWRkaW5nLCByZW1vdmU6IFtdIH0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYW4gYXJyYXkgb2YgcGFydGljaXBhbnQgaWRzIGZyb20gdGhlIGNvbnZlcnNhdGlvbi5cbiAgICpcbiAgICogICAgICBjb252ZXJzYXRpb24ucmVtb3ZlUGFydGljaXBhbnRzKFsnYScsICdiJ10pO1xuICAgKlxuICAgKiBSZW1vdmVkIHBhcnRpY2lwYW50cyB3aWxsIGltbWVkaWF0ZWx5IGJlIHJlbW92ZWQgZnJvbSB0aGlzIENvbnZlcnNhdGlvbixcbiAgICogYnV0IG1heSBub3QgaGF2ZSBzeW5jZWQgd2l0aCB0aGUgc2VydmVyIHlldC5cbiAgICpcbiAgICogVGhyb3dzIGVycm9yIGlmIHlvdSBhdHRlbXB0IHRvIHJlbW92ZSBBTEwgcGFydGljaXBhbnRzLlxuICAgKlxuICAgKiBUT0RPICBXRUItOTY3OiBSb2xsIHBhcnRpY2lwYW50cyBiYWNrIG9uIGdldHRpbmcgYSBzZXJ2ZXIgZXJyb3JcbiAgICpcbiAgICogQG1ldGhvZCByZW1vdmVQYXJ0aWNpcGFudHNcbiAgICogQHBhcmFtICB7c3RyaW5nW119IHBhcnRpY2lwYW50cyAtIEFycmF5IG9mIHBhcnRpY2lwYW50IGlkc1xuICAgKiBAcmV0dXJucyB7bGF5ZXIuQ29udmVyc2F0aW9ufSB0aGlzXG4gICAqL1xuICByZW1vdmVQYXJ0aWNpcGFudHMocGFydGljaXBhbnRzKSB7XG4gICAgY29uc3QgY3VycmVudFBhcnRpY2lwYW50cyA9IHRoaXMucGFydGljaXBhbnRzLmNvbmNhdChbXSkuc29ydCgpO1xuICAgIGNvbnN0IHJlbW92aW5nID0gcGFydGljaXBhbnRzLmZpbHRlcihwYXJ0aWNpcGFudCA9PiB0aGlzLnBhcnRpY2lwYW50cy5pbmRleE9mKHBhcnRpY2lwYW50KSAhPT0gLTEpLnNvcnQoKTtcbiAgICBpZiAoSlNPTi5zdHJpbmdpZnkoY3VycmVudFBhcnRpY2lwYW50cykgPT09IEpTT04uc3RyaW5naWZ5KHJlbW92aW5nKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKExheWVyRXJyb3IuZGljdGlvbmFyeS5tb3JlUGFydGljaXBhbnRzUmVxdWlyZWQpO1xuICAgIH1cbiAgICB0aGlzLl9wYXRjaFBhcnRpY2lwYW50cyh7IGFkZDogW10sIHJlbW92ZTogcmVtb3ZpbmcgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogUmVwbGFjZXMgYWxsIHBhcnRpY2lwYW50cyB3aXRoIGEgbmV3IGFycmF5IG9mIG9mIHBhcnRpY2lwYW50IGlkcy5cbiAgICpcbiAgICogICAgICBjb252ZXJzYXRpb24ucmVwbGFjZVBhcnRpY2lwYW50cyhbJ2EnLCAnYiddKTtcbiAgICpcbiAgICogQ2hhbmdlZCBwYXJ0aWNpcGFudHMgd2lsbCBpbW1lZGlhdGVseSBzaG93IHVwIGluIHRoZSBDb252ZXJzYXRpb24sXG4gICAqIGJ1dCBtYXkgbm90IGhhdmUgc3luY2VkIHdpdGggdGhlIHNlcnZlciB5ZXQuXG4gICAqXG4gICAqIFRPRE8gV0VCLTk2NzogUm9sbCBwYXJ0aWNpcGFudHMgYmFjayBvbiBnZXR0aW5nIGEgc2VydmVyIGVycm9yXG4gICAqXG4gICAqIEBtZXRob2QgcmVwbGFjZVBhcnRpY2lwYW50c1xuICAgKiBAcGFyYW0gIHtzdHJpbmdbXX0gcGFydGljaXBhbnRzIC0gQXJyYXkgb2YgcGFydGljaXBhbnQgaWRzXG4gICAqIEByZXR1cm5zIHtsYXllci5Db252ZXJzYXRpb259IHRoaXNcbiAgICovXG4gIHJlcGxhY2VQYXJ0aWNpcGFudHMocGFydGljaXBhbnRzKSB7XG4gICAgaWYgKCFwYXJ0aWNpcGFudHMgfHwgIXBhcnRpY2lwYW50cy5sZW5ndGgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihMYXllckVycm9yLmRpY3Rpb25hcnkubW9yZVBhcnRpY2lwYW50c1JlcXVpcmVkKTtcbiAgICB9XG5cbiAgICBjb25zdCBjaGFuZ2UgPSB0aGlzLl9nZXRQYXJ0aWNpcGFudENoYW5nZShwYXJ0aWNpcGFudHMsIHRoaXMucGFydGljaXBhbnRzKTtcbiAgICB0aGlzLl9wYXRjaFBhcnRpY2lwYW50cyhjaGFuZ2UpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZSB0aGUgc2VydmVyIHdpdGggdGhlIG5ldyBwYXJ0aWNpcGFudCBsaXN0LlxuICAgKlxuICAgKiBFeGVjdXRlcyBhcyBmb2xsb3dzOlxuICAgKlxuICAgKiAxLiBVcGRhdGVzIHRoZSBwYXJ0aWNpcGFudHMgcHJvcGVydHkgb2YgdGhlIGxvY2FsIG9iamVjdFxuICAgKiAyLiBUcmlnZ2VycyBhIGNvbnZlcnNhdGlvbnM6Y2hhbmdlIGV2ZW50XG4gICAqIDMuIFN1Ym1pdHMgYSByZXF1ZXN0IHRvIGJlIHNlbnQgdG8gdGhlIHNlcnZlciB0byB1cGRhdGUgdGhlIHNlcnZlcidzIG9iamVjdFxuICAgKiA0LiBJZiB0aGVyZSBpcyBhbiBlcnJvciwgbm8gZXJyb3JzIGFyZSBmaXJlZCBleGNlcHQgYnkgbGF5ZXIuU3luY01hbmFnZXIsIGJ1dCBhbm90aGVyXG4gICAqICAgIGNvbnZlcnNhdGlvbnM6Y2hhbmdlIGV2ZW50IGlzIGZpcmVkIGFzIHRoZSBjaGFuZ2UgaXMgcm9sbGVkIGJhY2suXG4gICAqXG4gICAqIEBtZXRob2QgX3BhdGNoUGFydGljaXBhbnRzXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdFtdfSBvcGVyYXRpb25zIC0gQXJyYXkgb2YgSlNPTiBwYXRjaCBvcGVyYXRpb25cbiAgICogQHBhcmFtICB7T2JqZWN0fSBldmVudERhdGEgLSBEYXRhIGRlc2NyaWJpbmcgdGhlIGNoYW5nZSBmb3IgdXNlIGluIGFuIGV2ZW50XG4gICAqL1xuICBfcGF0Y2hQYXJ0aWNpcGFudHMoY2hhbmdlKSB7XG4gICAgdGhpcy5fYXBwbHlQYXJ0aWNpcGFudENoYW5nZShjaGFuZ2UpO1xuICAgIHRoaXMuaXNDdXJyZW50UGFydGljaXBhbnQgPSB0aGlzLnBhcnRpY2lwYW50cy5pbmRleE9mKHRoaXMuZ2V0Q2xpZW50KCkudXNlcklkKSAhPT0gLTE7XG5cbiAgICBjb25zdCBvcHMgPSBbXTtcbiAgICBjaGFuZ2UucmVtb3ZlLmZvckVhY2goaWQgPT4ge1xuICAgICAgb3BzLnB1c2goe1xuICAgICAgICBvcGVyYXRpb246ICdyZW1vdmUnLFxuICAgICAgICBwcm9wZXJ0eTogJ3BhcnRpY2lwYW50cycsXG4gICAgICAgIHZhbHVlOiBpZCxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgY2hhbmdlLmFkZC5mb3JFYWNoKGlkID0+IHtcbiAgICAgIG9wcy5wdXNoKHtcbiAgICAgICAgb3BlcmF0aW9uOiAnYWRkJyxcbiAgICAgICAgcHJvcGVydHk6ICdwYXJ0aWNpcGFudHMnLFxuICAgICAgICB2YWx1ZTogaWQsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRoaXMuX3hocih7XG4gICAgICB1cmw6ICcnLFxuICAgICAgbWV0aG9kOiAnUEFUQ0gnLFxuICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkob3BzKSxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ2NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi92bmQubGF5ZXItcGF0Y2granNvbicsXG4gICAgICB9LFxuICAgIH0sIHJlc3VsdCA9PiB7XG4gICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB0aGlzLl9sb2FkKCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW50ZXJuYWxseSB3ZSB1c2UgYHthZGQ6IFtdLCByZW1vdmU6IFtdfWAgaW5zdGVhZCBvZiBMYXllck9wZXJhdGlvbnMuXG4gICAqXG4gICAqIFNvIGNvbnRyb2wgaXMgaGFuZGVkIG9mZiB0byB0aGlzIG1ldGhvZCB0byBhY3R1YWxseSBhcHBseSB0aGUgY2hhbmdlc1xuICAgKiB0byB0aGUgcGFydGljaXBhbnRzIGFycmF5LlxuICAgKlxuICAgKiBAbWV0aG9kIF9hcHBseVBhcnRpY2lwYW50Q2hhbmdlXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdH0gY2hhbmdlXG4gICAqIEBwYXJhbSAge3N0cmluZ1tdfSBjaGFuZ2UuYWRkIC0gQXJyYXkgb2YgdXNlcmlkcyB0byBhZGRcbiAgICogQHBhcmFtICB7c3RyaW5nW119IGNoYW5nZS5yZW1vdmUgLSBBcnJheSBvZiB1c2VyaWRzIHRvIHJlbW92ZVxuICAgKi9cbiAgX2FwcGx5UGFydGljaXBhbnRDaGFuZ2UoY2hhbmdlKSB7XG4gICAgY29uc3QgcGFydGljaXBhbnRzID0gW10uY29uY2F0KHRoaXMucGFydGljaXBhbnRzKTtcbiAgICBjaGFuZ2UuYWRkLmZvckVhY2goaWQgPT4ge1xuICAgICAgaWYgKHBhcnRpY2lwYW50cy5pbmRleE9mKGlkKSA9PT0gLTEpIHBhcnRpY2lwYW50cy5wdXNoKGlkKTtcbiAgICB9KTtcbiAgICBjaGFuZ2UucmVtb3ZlLmZvckVhY2goaWQgPT4ge1xuICAgICAgY29uc3QgaW5kZXggPSBwYXJ0aWNpcGFudHMuaW5kZXhPZihpZCk7XG4gICAgICBpZiAoaW5kZXggIT09IC0xKSBwYXJ0aWNpcGFudHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9KTtcbiAgICB0aGlzLnBhcnRpY2lwYW50cyA9IHBhcnRpY2lwYW50cztcbiAgfVxuXG5cbiAgLyoqXG4gICAqIERlbGV0ZSB0aGUgQ29udmVyc2F0aW9uIGZyb20gdGhlIHNlcnZlci5cbiAgICpcbiAgICogVGhpcyBjYWxsIHdpbGwgc3VwcG9ydCB2YXJpb3VzIGRlbGV0aW9uIG1vZGVzLiAgQ2FsbGluZyB3aXRob3V0IGEgZGVsZXRpb24gbW9kZSBpcyBkZXByZWNhdGVkLlxuICAgKlxuICAgKiBEZWxldGlvbiBNb2RlczpcbiAgICpcbiAgICogKiBsYXllci5Db25zdGFudHMuREVMRVRJT05fTU9ERS5BTEw6IFRoaXMgZGVsZXRlcyB0aGUgbG9jYWwgY29weSBpbW1lZGlhdGVseSwgYW5kIGF0dGVtcHRzIHRvIGFsc29cbiAgICogICBkZWxldGUgdGhlIHNlcnZlcidzIGNvcHkuXG4gICAqXG4gICAqIEV4ZWN1dGVzIGFzIGZvbGxvd3M6XG4gICAqXG4gICAqIDEuIFN1Ym1pdHMgYSByZXF1ZXN0IHRvIGJlIHNlbnQgdG8gdGhlIHNlcnZlciB0byBkZWxldGUgdGhlIHNlcnZlcidzIG9iamVjdFxuICAgKiAyLiBEZWxldGUncyB0aGUgbG9jYWwgb2JqZWN0XG4gICAqIDMuIElmIHRoZXJlIGlzIGFuIGVycm9yLCBubyBlcnJvcnMgYXJlIGZpcmVkIGV4Y2VwdCBieSBsYXllci5TeW5jTWFuYWdlciwgYnV0IHRoZSBDb252ZXJzYXRpb24gd2lsbCBiZSByZWxvYWRlZCBmcm9tIHRoZSBzZXJ2ZXIsXG4gICAqICAgIHRyaWdnZXJpbmcgYSBjb252ZXJzYXRpb25zOmFkZCBldmVudC5cbiAgICpcbiAgICogQG1ldGhvZCBkZWxldGVcbiAgICogQHBhcmFtIHtudW1iZXJ9IGRlbGV0aW9uTW9kZSAtIGxheWVyLkNvbnN0YW50cy5ERUxFVElPTl9NT0RFLkFMTCBpcyBvbmx5IHN1cHBvcnRlZCBtb2RlIGF0IHRoaXMgdGltZVxuICAgKiBAcmV0dXJuIG51bGxcbiAgICovXG4gIGRlbGV0ZShtb2RlKSB7XG4gICAgY29uc3QgaWQgPSB0aGlzLmlkO1xuICAgIGNvbnN0IG1vZGVWYWx1ZSA9ICd0cnVlJztcbiAgICBpZiAobW9kZSA9PT0gdHJ1ZSkge1xuICAgICAgbG9nZ2VyLndhcm4oJ0NhbGxpbmcgTWVzc2FnZS5kZWxldGUgd2l0aG91dCBhIG1vZGUgaXMgZGVwcmVjYXRlZCcpO1xuICAgICAgbW9kZSA9IENvbnN0YW50cy5ERUxFVElPTl9NT0RFLkFMTDtcbiAgICB9XG4gICAgaWYgKCFtb2RlIHx8IG1vZGUgIT09IENvbnN0YW50cy5ERUxFVElPTl9NT0RFLkFMTCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKExheWVyRXJyb3IuZGljdGlvbmFyeS5kZWxldGlvbk1vZGVVbnN1cHBvcnRlZCk7XG4gICAgfVxuXG4gICAgY29uc3QgY2xpZW50ID0gdGhpcy5nZXRDbGllbnQoKTtcbiAgICB0aGlzLl94aHIoe1xuICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgIHVybDogJz9kZXN0cm95PScgKyBtb2RlVmFsdWUsXG4gICAgfSwgcmVzdWx0ID0+IHtcbiAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIENvbnZlcnNhdGlvbi5sb2FkKGlkLCBjbGllbnQpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5fZGVsZXRlZCgpO1xuICAgIHRoaXMuZGVzdHJveSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBDb252ZXJzYXRpb24gaGFzIGJlZW4gZGVsZXRlZC5cbiAgICpcbiAgICogQ2FsbGVkIGZyb20gV2Vic29ja2V0TWFuYWdlciBhbmQgZnJvbSBsYXllci5Db252ZXJzYXRpb24uZGVsZXRlKCk7XG4gICAqXG4gICAqIERlc3Ryb3kgbXVzdCBiZSBjYWxsZWQgc2VwYXJhdGVseSwgYW5kIGhhbmRsZXMgbW9zdCBjbGVhbnVwLlxuICAgKlxuICAgKiBAbWV0aG9kIF9kZWxldGVkXG4gICAqIEBwcm90ZWN0ZWRcbiAgICovXG4gIF9kZWxldGVkKCkge1xuICAgIHRoaXMudHJpZ2dlcignY29udmVyc2F0aW9uczpkZWxldGUnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgbGF5ZXIuTWVzc2FnZSBpbnN0YW5jZSB3aXRoaW4gdGhpcyBjb252ZXJzYXRpb25cbiAgICpcbiAgICogICAgICB2YXIgbWVzc2FnZSA9IGNvbnZlcnNhdGlvbi5jcmVhdGVNZXNzYWdlKCdoZWxsbycpO1xuICAgKlxuICAgKiAgICAgIHZhciBtZXNzYWdlID0gY29udmVyc2F0aW9uLmNyZWF0ZU1lc3NhZ2Uoe1xuICAgKiAgICAgICAgICBwYXJ0czogW25ldyBsYXllci5NZXNzYWdlUGFydCh7XG4gICAqICAgICAgICAgICAgICAgICAgICAgIGJvZHk6ICdoZWxsbycsXG4gICAqICAgICAgICAgICAgICAgICAgICAgIG1pbWVUeXBlOiAndGV4dC9wbGFpbidcbiAgICogICAgICAgICAgICAgICAgICB9KV1cbiAgICogICAgICB9KTtcbiAgICpcbiAgICogU2VlIGxheWVyLk1lc3NhZ2UgZm9yIG1vcmUgb3B0aW9ucyBmb3IgY3JlYXRpbmcgdGhlIG1lc3NhZ2UuXG4gICAqXG4gICAqIEBtZXRob2QgY3JlYXRlTWVzc2FnZVxuICAgKiBAcGFyYW0gIHtzdHJpbmd8T2JqZWN0fSBvcHRpb25zIC0gSWYgaXRzIGEgc3RyaW5nLCBhIE1lc3NhZ2VQYXJ0IGlzIGNyZWF0ZWQgYXJvdW5kIHRoYXQgc3RyaW5nLlxuICAgKiBAcGFyYW0ge2xheWVyLk1lc3NhZ2VQYXJ0W119IG9wdGlvbnMucGFydHMgLSBBbiBhcnJheSBvZiBNZXNzYWdlUGFydHMuICBUaGVyZSBpcyBzb21lIHRvbGVyYW5jZSBmb3JcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0IG5vdCBiZWluZyBhbiBhcnJheSwgb3IgZm9yIGl0IGJlaW5nIGEgc3RyaW5nIHRvIGJlIHR1cm5lZFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW50byBhIE1lc3NhZ2VQYXJ0LlxuICAgKiBAcmV0dXJuIHtsYXllci5NZXNzYWdlfVxuICAgKi9cbiAgY3JlYXRlTWVzc2FnZShvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBtZXNzYWdlQ29uZmlnID0gKHR5cGVvZiBvcHRpb25zID09PSAnc3RyaW5nJykgPyB7XG4gICAgICBwYXJ0czogW3sgYm9keTogb3B0aW9ucywgbWltZVR5cGU6ICd0ZXh0L3BsYWluJyB9XSxcbiAgICB9IDogb3B0aW9ucztcbiAgICBtZXNzYWdlQ29uZmlnLmNsaWVudElkID0gdGhpcy5jbGllbnRJZDtcbiAgICBtZXNzYWdlQ29uZmlnLmNvbnZlcnNhdGlvbklkID0gdGhpcy5pZDtcblxuICAgIHJldHVybiBuZXcgTWVzc2FnZShtZXNzYWdlQ29uZmlnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBY2NlcHRzIGpzb24tcGF0Y2ggb3BlcmF0aW9ucyBmb3IgbW9kaWZ5aW5nIHBhcnRpY2lwYW50cyBvciBtZXRhZGF0YVxuICAgKlxuICAgKiBAbWV0aG9kIF9oYW5kbGVQYXRjaEV2ZW50XG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdFtdfSBkYXRhIC0gQXJyYXkgb2Ygb3BlcmF0aW9uc1xuICAgKi9cbiAgX2hhbmRsZVBhdGNoRXZlbnQobmV3VmFsdWUsIG9sZFZhbHVlLCBwYXRocykge1xuICAgIC8vIENlcnRhaW4gdHlwZXMgb2YgX191cGRhdGUgaGFuZGxlcnMgYXJlIGRpc2FibGVkIHdoaWxlIHZhbHVlcyBhcmUgYmVpbmcgc2V0IGJ5XG4gICAgLy8gbGF5ZXIgcGF0Y2ggcGFyc2VyIGJlY2F1c2UgdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiBzZXR0aW5nIGEgdmFsdWUgKHRyaWdnZXJzIGFuIGV2ZW50KVxuICAgIC8vIGFuZCBjaGFuZ2UgYSBwcm9wZXJ0eSBvZiBhIHZhbHVlICh0cmlnZ2VycyBvbmx5IHRoaXMgY2FsbGJhY2spIHJlc3VsdCBpbiBpbmNvbnNpc3RlbnRcbiAgICAvLyBiZWhhdmlvcnMuICBFbmFibGUgdGhlbSBsb25nIGVub3VnaCB0byBhbGxvdyBfX3VwZGF0ZSBjYWxscyB0byBiZSBtYWRlXG4gICAgdGhpcy5faW5MYXllclBhcnNlciA9IGZhbHNlO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBldmVudHMgPSB0aGlzLl9kaXNhYmxlRXZlbnRzO1xuICAgICAgdGhpcy5fZGlzYWJsZUV2ZW50cyA9IGZhbHNlO1xuICAgICAgaWYgKHBhdGhzWzBdLmluZGV4T2YoJ21ldGFkYXRhJykgPT09IDApIHtcbiAgICAgICAgdGhpcy5fX3VwZGF0ZU1ldGFkYXRhKG5ld1ZhbHVlLCBvbGRWYWx1ZSwgcGF0aHMpO1xuICAgICAgfSBlbHNlIGlmIChwYXRoc1swXSA9PT0gJ3BhcnRpY2lwYW50cycpIHtcbiAgICAgICAgdGhpcy5fX3VwZGF0ZVBhcnRpY2lwYW50cyhuZXdWYWx1ZSwgb2xkVmFsdWUpO1xuICAgICAgfVxuICAgICAgdGhpcy5fZGlzYWJsZUV2ZW50cyA9IGV2ZW50cztcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIC8vIGRvIG5vdGhpbmdcbiAgICB9XG4gICAgdGhpcy5faW5MYXllclBhcnNlciA9IHRydWU7XG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gdGhlIG9sZFZhbHVlIGFuZCBuZXdWYWx1ZSBmb3IgcGFydGljaXBhbnRzLFxuICAgKiBnZW5lcmF0ZSBhIGxpc3Qgb2Ygd2hvbSB3YXMgYWRkZWQgYW5kIHdob20gd2FzIHJlbW92ZWQuXG4gICAqXG4gICAqIEBtZXRob2QgX2dldFBhcnRpY2lwYW50Q2hhbmdlXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge3N0cmluZ1tdfSBuZXdWYWx1ZVxuICAgKiBAcGFyYW0gIHtzdHJpbmdbXX0gb2xkVmFsdWVcbiAgICogQHJldHVybiB7T2JqZWN0fSBSZXR1cm5zIGNoYW5nZXMgaW4gdGhlIGZvcm0gb2YgYHthZGQ6IFsuLi5dLCByZW1vdmU6IFsuLi5dfWBcbiAgICovXG4gIF9nZXRQYXJ0aWNpcGFudENoYW5nZShuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICBjb25zdCBjaGFuZ2UgPSB7fTtcbiAgICBjaGFuZ2UuYWRkID0gbmV3VmFsdWUuZmlsdGVyKHBhcnRpY2lwYW50ID0+IG9sZFZhbHVlLmluZGV4T2YocGFydGljaXBhbnQpID09PSAtMSk7XG4gICAgY2hhbmdlLnJlbW92ZSA9IG9sZFZhbHVlLmZpbHRlcihwYXJ0aWNpcGFudCA9PiBuZXdWYWx1ZS5pbmRleE9mKHBhcnRpY2lwYW50KSA9PT0gLTEpO1xuICAgIHJldHVybiBjaGFuZ2U7XG4gIH1cblxuXG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgc3BlY2lmaWVkIG1ldGFkYXRhIGtleXMuXG4gICAqXG4gICAqIFVwZGF0ZXMgdGhlIGxvY2FsIG9iamVjdCdzIG1ldGFkYXRhIGFuZCBzeW5jcyB0aGUgY2hhbmdlIHRvIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqICAgICAgY29udmVyc2F0aW9uLnNldE1ldGFkYXRhUHJvcGVydGllcyh7XG4gICAqICAgICAgICAgICd0aXRsZSc6ICdJIGFtIGEgdGl0bGUnLFxuICAgKiAgICAgICAgICAnY29sb3JzLmJhY2tncm91bmQnOiAncmVkJyxcbiAgICogICAgICAgICAgJ2NvbG9ycy50ZXh0Jzoge1xuICAgKiAgICAgICAgICAgICAgJ2ZpbGwnOiAnYmx1ZScsXG4gICAqICAgICAgICAgICAgICAnc2hhZG93JzogJ2JsYWNrJ1xuICAgKiAgICAgICAgICAgfSxcbiAgICogICAgICAgICAgICdjb2xvcnMudGl0bGUuZmlsbCc6ICdyZWQnXG4gICAqICAgICAgfSk7XG4gICAqXG4gICAqIFVzZSBzZXRNZXRhZGF0YVByb3BlcnRpZXMgdG8gc3BlY2lmeSB0aGUgcGF0aCB0byBhIHByb3BlcnR5LCBhbmQgYSBuZXcgdmFsdWUgZm9yIHRoYXQgcHJvcGVydHkuXG4gICAqIE11bHRpcGxlIHByb3BlcnRpZXMgY2FuIGJlIGNoYW5nZWQgdGhpcyB3YXkuICBXaGF0ZXZlciB2YWx1ZSB3YXMgdGhlcmUgYmVmb3JlIGlzXG4gICAqIHJlcGxhY2VkIHdpdGggdGhlIG5ldyB2YWx1ZTsgc28gaW4gdGhlIGFib3ZlIGV4YW1wbGUsIHdoYXRldmVyIG90aGVyIGtleXMgbWF5IGhhdmVcbiAgICogZXhpc3RlZCB1bmRlciBgY29sb3JzLnRleHRgIGhhdmUgYmVlbiByZXBsYWNlZCBieSB0aGUgbmV3IG9iamVjdCBge2ZpbGw6ICdibHVlJywgc2hhZG93OiAnYmxhY2snfWAuXG4gICAqXG4gICAqIE5vdGUgYWxzbyB0aGF0IG9ubHkgc3RyaW5nIGFuZCBzdWJvYmplY3RzIGFyZSBhY2NlcHRlZCBhcyB2YWx1ZXMuXG4gICAqXG4gICAqIEtleXMgd2l0aCAnLicgd2lsbCB1cGRhdGUgYSBmaWVsZCBvZiBhbiBvYmplY3QgKGFuZCBjcmVhdGUgYW4gb2JqZWN0IGlmIGl0IHdhc24ndCB0aGVyZSk6XG4gICAqXG4gICAqIEluaXRpYWwgbWV0YWRhdGE6IHt9XG4gICAqXG4gICAqICAgICAgY29udmVyc2F0aW9uLnNldE1ldGFkYXRhUHJvcGVydGllcyh7XG4gICAqICAgICAgICAgICdjb2xvcnMuYmFja2dyb3VuZCc6ICdyZWQnLFxuICAgKiAgICAgIH0pO1xuICAgKlxuICAgKiBNZXRhZGF0YSBpcyBub3c6IGB7Y29sb3JzOiB7YmFja2dyb3VuZDogJ3JlZCd9fWBcbiAgICpcbiAgICogICAgICBjb252ZXJzYXRpb24uc2V0TWV0YWRhdGFQcm9wZXJ0aWVzKHtcbiAgICogICAgICAgICAgJ2NvbG9ycy5mb3JlZ3JvdW5kJzogJ2JsYWNrJyxcbiAgICogICAgICB9KTtcbiAgICpcbiAgICogTWV0YWRhdGEgaXMgbm93OiBge2NvbG9yczoge2JhY2tncm91bmQ6ICdyZWQnLCBmb3JlZ3JvdW5kOiAnYmxhY2snfX1gXG4gICAqXG4gICAqIEV4ZWN1dGVzIGFzIGZvbGxvd3M6XG4gICAqXG4gICAqIDEuIFVwZGF0ZXMgdGhlIG1ldGFkYXRhIHByb3BlcnR5IG9mIHRoZSBsb2NhbCBvYmplY3RcbiAgICogMi4gVHJpZ2dlcnMgYSBjb252ZXJzYXRpb25zOmNoYW5nZSBldmVudFxuICAgKiAzLiBTdWJtaXRzIGEgcmVxdWVzdCB0byBiZSBzZW50IHRvIHRoZSBzZXJ2ZXIgdG8gdXBkYXRlIHRoZSBzZXJ2ZXIncyBvYmplY3RcbiAgICogNC4gSWYgdGhlcmUgaXMgYW4gZXJyb3IsIG5vIGVycm9ycyBhcmUgZmlyZWQgZXhjZXB0IGJ5IGxheWVyLlN5bmNNYW5hZ2VyLCBidXQgYW5vdGhlclxuICAgKiAgICBjb252ZXJzYXRpb25zOmNoYW5nZSBldmVudCBpcyBmaXJlZCBhcyB0aGUgY2hhbmdlIGlzIHJvbGxlZCBiYWNrLlxuICAgKlxuICAgKiBAbWV0aG9kIHNldE1ldGFkYXRhUHJvcGVydGllc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IHByb3BlcnRpZXNcbiAgICogQHJldHVybiB7bGF5ZXIuQ29udmVyc2F0aW9ufSB0aGlzXG4gICAqXG4gICAqL1xuICBzZXRNZXRhZGF0YVByb3BlcnRpZXMocHJvcHMpIHtcbiAgICBjb25zdCBsYXllclBhdGNoT3BlcmF0aW9ucyA9IFtdO1xuICAgIE9iamVjdC5rZXlzKHByb3BzKS5mb3JFYWNoKG5hbWUgPT4ge1xuICAgICAgbGV0IGZ1bGxOYW1lID0gbmFtZTtcbiAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgIGlmIChuYW1lICE9PSAnbWV0YWRhdGEnICYmIG5hbWUuaW5kZXhPZignbWV0YWRhdGEuJykgIT09IDApIHtcbiAgICAgICAgICBmdWxsTmFtZSA9ICdtZXRhZGF0YS4nICsgbmFtZTtcbiAgICAgICAgfVxuICAgICAgICBsYXllclBhdGNoT3BlcmF0aW9ucy5wdXNoKHtcbiAgICAgICAgICBvcGVyYXRpb246ICdzZXQnLFxuICAgICAgICAgIHByb3BlcnR5OiBmdWxsTmFtZSxcbiAgICAgICAgICB2YWx1ZTogcHJvcHNbbmFtZV0sXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5faW5MYXllclBhcnNlciA9IHRydWU7XG5cbiAgICAvLyBEbyB0aGlzIGJlZm9yZSBzZXRTeW5jaW5nIGFzIGlmIHRoZXJlIGFyZSBhbnkgZXJyb3JzLCB3ZSBzaG91bGQgbmV2ZXIgZXZlblxuICAgIC8vIHN0YXJ0IHNldHRpbmcgdXAgYSByZXF1ZXN0LlxuICAgIFV0aWwubGF5ZXJQYXJzZSh7XG4gICAgICBvYmplY3Q6IHRoaXMsXG4gICAgICB0eXBlOiAnQ29udmVyc2F0aW9uJyxcbiAgICAgIG9wZXJhdGlvbnM6IGxheWVyUGF0Y2hPcGVyYXRpb25zLFxuICAgICAgY2xpZW50OiB0aGlzLmdldENsaWVudCgpLFxuICAgIH0pO1xuICAgIHRoaXMuX2luTGF5ZXJQYXJzZXIgPSBmYWxzZTtcblxuICAgIHRoaXMuX3hocih7XG4gICAgICB1cmw6ICcnLFxuICAgICAgbWV0aG9kOiAnUEFUQ0gnLFxuICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkobGF5ZXJQYXRjaE9wZXJhdGlvbnMpLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnY29udGVudC10eXBlJzogJ2FwcGxpY2F0aW9uL3ZuZC5sYXllci1wYXRjaCtqc29uJyxcbiAgICAgIH0sXG4gICAgfSwgcmVzdWx0ID0+IHtcbiAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHRoaXMuX2xvYWQoKTtcbiAgICB9KTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cblxuICAvKipcbiAgICogRGVsZXRlcyBzcGVjaWZpZWQgbWV0YWRhdGEga2V5cy5cbiAgICpcbiAgICogVXBkYXRlcyB0aGUgbG9jYWwgb2JqZWN0J3MgbWV0YWRhdGEgYW5kIHN5bmNzIHRoZSBjaGFuZ2UgdG8gdGhlIHNlcnZlci5cbiAgICpcbiAgICogICAgICBjb252ZXJzYXRpb24uZGVsZXRlTWV0YWRhdGFQcm9wZXJ0aWVzKFxuICAgKiAgICAgICAgICBbJ3RpdGxlJywgJ2NvbG9ycy5iYWNrZ3JvdW5kJywgJ2NvbG9ycy50aXRsZS5maWxsJ11cbiAgICogICAgICApO1xuICAgKlxuICAgKiBVc2UgZGVsZXRlTWV0YWRhdGFQcm9wZXJ0aWVzIHRvIHNwZWNpZnkgcGF0aHMgdG8gcHJvcGVydGllcyB0byBiZSBkZWxldGVkLlxuICAgKiBNdWx0aXBsZSBwcm9wZXJ0aWVzIGNhbiBiZSBkZWxldGVkLlxuICAgKlxuICAgKiBFeGVjdXRlcyBhcyBmb2xsb3dzOlxuICAgKlxuICAgKiAxLiBVcGRhdGVzIHRoZSBtZXRhZGF0YSBwcm9wZXJ0eSBvZiB0aGUgbG9jYWwgb2JqZWN0XG4gICAqIDIuIFRyaWdnZXJzIGEgY29udmVyc2F0aW9uczpjaGFuZ2UgZXZlbnRcbiAgICogMy4gU3VibWl0cyBhIHJlcXVlc3QgdG8gYmUgc2VudCB0byB0aGUgc2VydmVyIHRvIHVwZGF0ZSB0aGUgc2VydmVyJ3Mgb2JqZWN0XG4gICAqIDQuIElmIHRoZXJlIGlzIGFuIGVycm9yLCBubyBlcnJvcnMgYXJlIGZpcmVkIGV4Y2VwdCBieSBsYXllci5TeW5jTWFuYWdlciwgYnV0IGFub3RoZXJcbiAgICogICAgY29udmVyc2F0aW9uczpjaGFuZ2UgZXZlbnQgaXMgZmlyZWQgYXMgdGhlIGNoYW5nZSBpcyByb2xsZWQgYmFjay5cbiAgICpcbiAgICogQG1ldGhvZCBkZWxldGVNZXRhZGF0YVByb3BlcnRpZXNcbiAgICogQHBhcmFtICB7c3RyaW5nW119IHByb3BlcnRpZXNcbiAgICogQHJldHVybiB7bGF5ZXIuQ29udmVyc2F0aW9ufVxuICAgKlxuICAgKi9cbiAgZGVsZXRlTWV0YWRhdGFQcm9wZXJ0aWVzKHByb3BzKSB7XG4gICAgY29uc3QgbGF5ZXJQYXRjaE9wZXJhdGlvbnMgPSBbXTtcbiAgICBwcm9wcy5mb3JFYWNoKHByb3BlcnR5ID0+IHtcbiAgICAgIGlmIChwcm9wZXJ0eSAhPT0gJ21ldGFkYXRhJyAmJiBwcm9wZXJ0eS5pbmRleE9mKCdtZXRhZGF0YS4nKSAhPT0gMCkge1xuICAgICAgICBwcm9wZXJ0eSA9ICdtZXRhZGF0YS4nICsgcHJvcGVydHk7XG4gICAgICB9XG4gICAgICBsYXllclBhdGNoT3BlcmF0aW9ucy5wdXNoKHtcbiAgICAgICAgb3BlcmF0aW9uOiAnZGVsZXRlJyxcbiAgICAgICAgcHJvcGVydHksXG4gICAgICB9KTtcbiAgICB9LCB0aGlzKTtcblxuICAgIHRoaXMuX2luTGF5ZXJQYXJzZXIgPSB0cnVlO1xuXG4gICAgLy8gRG8gdGhpcyBiZWZvcmUgc2V0U3luY2luZyBhcyBpZiB0aGVyZSBhcmUgYW55IGVycm9ycywgd2Ugc2hvdWxkIG5ldmVyIGV2ZW5cbiAgICAvLyBzdGFydCBzZXR0aW5nIHVwIGEgcmVxdWVzdC5cbiAgICBVdGlsLmxheWVyUGFyc2Uoe1xuICAgICAgb2JqZWN0OiB0aGlzLFxuICAgICAgdHlwZTogJ0NvbnZlcnNhdGlvbicsXG4gICAgICBvcGVyYXRpb25zOiBsYXllclBhdGNoT3BlcmF0aW9ucyxcbiAgICAgIGNsaWVudDogdGhpcy5nZXRDbGllbnQoKSxcbiAgICB9KTtcbiAgICB0aGlzLl9pbkxheWVyUGFyc2VyID0gZmFsc2U7XG5cbiAgICB0aGlzLl94aHIoe1xuICAgICAgdXJsOiAnJyxcbiAgICAgIG1ldGhvZDogJ1BBVENIJyxcbiAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KGxheWVyUGF0Y2hPcGVyYXRpb25zKSxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ2NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi92bmQubGF5ZXItcGF0Y2granNvbicsXG4gICAgICB9LFxuICAgIH0sIHJlc3VsdCA9PiB7XG4gICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB0aGlzLl9sb2FkKCk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG5cbiAgLyoqXG4gICAqIEFueSB4aHIgbWV0aG9kIGNhbGxlZCBvbiB0aGlzIGNvbnZlcnNhdGlvbiB1c2VzIHRoZSBjb252ZXJzYXRpb24ncyB1cmwuXG4gICAqXG4gICAqIEZvciBkZXRhaWxzIG9uIHBhcmFtZXRlcnMgc2VlIHtAbGluayBsYXllci5DbGllbnRBdXRoZW50aWNhdG9yI3hocn1cbiAgICpcbiAgICogQG1ldGhvZCBfeGhyXG4gICAqIEBwcm90ZWN0ZWRcbiAgICogQHJldHVybiB7bGF5ZXIuQ29udmVyc2F0aW9ufSB0aGlzXG4gICAqL1xuICBfeGhyKGFyZ3MsIGNhbGxiYWNrKSB7XG4gICAgbGV0IGluVXJsID0gYXJncy51cmw7XG4gICAgY29uc3QgY2xpZW50ID0gdGhpcy5nZXRDbGllbnQoKTtcblxuICAgIC8vIFZhbGlkYXRpb25cbiAgICBpZiAodGhpcy5pc0Rlc3Ryb3llZCkgdGhyb3cgbmV3IEVycm9yKExheWVyRXJyb3IuZGljdGlvbmFyeS5pc0Rlc3Ryb3llZCk7XG4gICAgaWYgKCFjbGllbnQpIHRocm93IG5ldyBFcnJvcihMYXllckVycm9yLmRpY3Rpb25hcnkuY2xpZW50TWlzc2luZyk7XG4gICAgaWYgKCEoJ3VybCcgaW4gYXJncykpIHRocm93IG5ldyBFcnJvcihMYXllckVycm9yLmRpY3Rpb25hcnkudXJsUmVxdWlyZWQpO1xuICAgIGlmIChhcmdzLm1ldGhvZCAhPT0gJ1BPU1QnICYmIHRoaXMuc3luY1N0YXRlID09PSBDb25zdGFudHMuU1lOQ19TVEFURS5ORVcpIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGFyZ3MudXJsICYmICFhcmdzLnVybC5tYXRjaCgvXihcXC98XFw/KS8pKSBhcmdzLnVybCA9ICcvJyArIGFyZ3MudXJsO1xuXG4gICAgaWYgKGFyZ3Muc3luYyAhPT0gZmFsc2UpIHtcbiAgICAgIGlmICghYXJncy5zeW5jKSBhcmdzLnN5bmMgPSB7fTtcbiAgICAgIGlmICghYXJncy5zeW5jLnRhcmdldCkge1xuICAgICAgICBhcmdzLnN5bmMudGFyZ2V0ID0gdGhpcy5pZDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpblVybCA9IGFyZ3MudXJsO1xuICAgIGNvbnN0IGdldFVybCA9ICgpID0+IHRoaXMudXJsICsgKGluVXJsIHx8ICcnKTtcblxuICAgIGlmICghdGhpcy51cmwpIHtcbiAgICAgIGFyZ3MudXJsID0gZ2V0VXJsO1xuICAgIH0gZWxzZSB7XG4gICAgICBhcmdzLnVybCA9IGdldFVybCgpO1xuICAgIH1cblxuICAgIGlmIChhcmdzLm1ldGhvZCAmJiBhcmdzLm1ldGhvZCAhPT0gJ0dFVCcpIHtcbiAgICAgIHRoaXMuX3NldFN5bmNpbmcoKTtcbiAgICB9XG5cbiAgICBjbGllbnQueGhyKGFyZ3MsIChyZXN1bHQpID0+IHtcbiAgICAgIGlmIChhcmdzLm1ldGhvZCAmJiBhcmdzLm1ldGhvZCAhPT0gJ0dFVCcgJiYgIXRoaXMuaXNEZXN0cm95ZWQpIHtcbiAgICAgICAgdGhpcy5fc2V0U3luY2VkKCk7XG4gICAgICB9XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKHJlc3VsdCk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2FkIHRoaXMgY29udmVyc2F0aW9uIGZyb20gdGhlIHNlcnZlci5cbiAgICpcbiAgICogQ2FsbGVkIGZyb20gdGhlIHN0YXRpYyBsYXllci5Db252ZXJzYXRpb24ubG9hZCgpIG1ldGhvZFxuICAgKlxuICAgKiBAbWV0aG9kIF9sb2FkXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfbG9hZCgpIHtcbiAgICB0aGlzLnN5bmNTdGF0ZSA9IENvbnN0YW50cy5TWU5DX1NUQVRFLkxPQURJTkc7XG4gICAgdGhpcy5feGhyKHtcbiAgICAgIHVybDogJycsXG4gICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgc3luYzogZmFsc2UsXG4gICAgfSwgcmVzdWx0ID0+IHRoaXMuX2xvYWRSZXN1bHQocmVzdWx0KSk7XG4gIH1cblxuICAvKipcbiAgICogUHJvY2Vzc2luZyB0aGUgcmVzdWx0IG9mIGEgX2xvYWQoKSBjYWxsLlxuICAgKlxuICAgKiBAbWV0aG9kIF9sb2FkUmVzdWx0XG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdH0gcmVzdWx0IC0gUmVzcG9uc2UgZnJvbSBzZXJ2ZXJcbiAgICovXG4gIF9sb2FkUmVzdWx0KHJlc3VsdCkge1xuICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgIHRoaXMuc3luY1N0YXRlID0gQ29uc3RhbnRzLlNZTkNfU1RBVEUuTkVXO1xuICAgICAgdGhpcy50cmlnZ2VyKCdjb252ZXJzYXRpb25zOmxvYWRlZC1lcnJvcicsIHsgZXJyb3I6IHJlc3VsdC5kYXRhIH0pO1xuICAgICAgdGhpcy5kZXN0cm95KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIHN1Y2Nlc3NmdWwsIGNvcHkgdGhlIHByb3BlcnRpZXMgaW50byB0aGlzIG9iamVjdFxuICAgICAgdGhpcy5fcG9wdWxhdGVGcm9tU2VydmVyKHJlc3VsdC5kYXRhKTtcbiAgICAgIHRoaXMuZ2V0Q2xpZW50KCkuX2FkZENvbnZlcnNhdGlvbih0aGlzKTtcbiAgICAgIHRoaXMudHJpZ2dlcignY29udmVyc2F0aW9uczpsb2FkZWQnKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU3RhbmRhcmQgYG9uKClgIHByb3ZpZGVkIGJ5IGxheWVyLlJvb3QuXG4gICAqXG4gICAqIEFkZHMgc29tZSBzcGVjaWFsIGhhbmRsaW5nIG9mICdjb252ZXJzYXRpb25zOmxvYWRlZCcgc28gdGhhdCBjYWxscyBzdWNoIGFzXG4gICAqXG4gICAqICAgICAgdmFyIGMgPSBjbGllbnQuZ2V0Q29udmVyc2F0aW9uKCdsYXllcjovLy9jb252ZXJzYXRpb25zLzEyMycsIHRydWUpXG4gICAqICAgICAgLm9uKCdjb252ZXJzYXRpb25zOmxvYWRlZCcsIGZ1bmN0aW9uKCkge1xuICAgKiAgICAgICAgICBteXJlcmVuZGVyKGMpO1xuICAgKiAgICAgIH0pO1xuICAgKiAgICAgIG15cmVuZGVyKGMpOyAvLyByZW5kZXIgYSBwbGFjZWhvbGRlciBmb3IgYyB1bnRpbCB0aGUgZGV0YWlscyBvZiBjIGhhdmUgbG9hZGVkXG4gICAqXG4gICAqIGNhbiBmaXJlIHRoZWlyIGNhbGxiYWNrIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciB0aGUgY2xpZW50IGxvYWRzIG9yIGhhc1xuICAgKiBhbHJlYWR5IGxvYWRlZCB0aGUgQ29udmVyc2F0aW9uLlxuICAgKlxuICAgKiBAbWV0aG9kIG9uXG4gICAqIEBwYXJhbSAge3N0cmluZ30gZXZlbnROYW1lXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGNvbnRleHRcbiAgICogQHJldHVybiB7bGF5ZXIuQ29udmVyc2F0aW9ufSB0aGlzXG4gICAqL1xuICBvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgIGNvbnN0IGhhc0xvYWRlZEV2dCA9IG5hbWUgPT09ICdjb252ZXJzYXRpb25zOmxvYWRlZCcgfHxcbiAgICAgIG5hbWUgJiYgdHlwZW9mIG5hbWUgPT09ICdvYmplY3QnICYmIG5hbWVbJ2NvbnZlcnNhdGlvbnM6bG9hZGVkJ107XG5cbiAgICBpZiAoaGFzTG9hZGVkRXZ0ICYmICF0aGlzLmlzTG9hZGluZykge1xuICAgICAgY29uc3QgY2FsbE5vdyA9IG5hbWUgPT09ICdjb252ZXJzYXRpb25zOmxvYWRlZCcgPyBjYWxsYmFjayA6IG5hbWVbJ2NvbnZlcnNhdGlvbnM6bG9hZGVkJ107XG4gICAgICBVdGlsLmRlZmVyKCgpID0+IGNhbGxOb3cuYXBwbHkoY29udGV4dCkpO1xuICAgIH1cbiAgICBzdXBlci5vbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qXG4gICAqIEluc3VyZSB0aGF0IGNvbnZlcnNhdGlvbi51bnJlYWRDb3VudC0tIGNhbiBuZXZlciByZWR1Y2UgdGhlIHZhbHVlIHRvIG5lZ2F0aXZlIHZhbHVlcy5cbiAgICovXG4gIF9fYWRqdXN0VW5yZWFkQ291bnQobmV3VmFsdWUpIHtcbiAgICBpZiAobmV3VmFsdWUgPCAwKSByZXR1cm4gMDtcbiAgfVxuXG4gIC8qKlxuICAgKiBfXyBNZXRob2RzIGFyZSBhdXRvbWF0aWNhbGx5IGNhbGxlZCBieSBwcm9wZXJ0eSBzZXR0ZXJzLlxuICAgKlxuICAgKiBBbnkgY2hhbmdlIGluIHRoZSB1bnJlYWRDb3VudCBwcm9wZXJ0eSB3aWxsIGNhbGwgdGhpcyBtZXRob2QgYW5kIGZpcmUgYVxuICAgKiBjaGFuZ2UgZXZlbnQuXG4gICAqXG4gICAqIEFueSB0cmlnZ2VyaW5nIG9mIHRoaXMgZnJvbSBhIHdlYnNvY2tldCBwYXRjaCB1bnJlYWRfbWVzc2FnZV9jb3VudCBzaG91bGQgd2FpdCBhIHNlY29uZCBiZWZvcmUgZmlyaW5nIGFueSBldmVudHNcbiAgICogc28gdGhhdCBpZiB0aGVyZSBhcmUgYSBzZXJpZXMgb2YgdGhlc2UgdXBkYXRlcywgd2UgZG9uJ3Qgc2VlIGEgbG90IG9mIGppdHRlci5cbiAgICpcbiAgICogTk9URTogX29sZFVucmVhZENvdW50IGlzIHVzZWQgdG8gcGFzcyBkYXRhIHRvIF91cGRhdGVVbnJlYWRDb3VudEV2ZW50IGJlY2F1c2UgdGhpcyBtZXRob2QgY2FuIGJlIGNhbGxlZCBtYW55IHRpbWVzXG4gICAqIGEgc2Vjb25kLCBhbmQgd2Ugb25seSB3YW50IHRvIHRyaWdnZXIgdGhpcyB3aXRoIGEgc3VtbWFyeSBvZiBjaGFuZ2VzIHJhdGhlciB0aGFuIGVhY2ggaW5kaXZpZHVhbCBjaGFuZ2UuXG4gICAqXG4gICAqIEBtZXRob2QgX191cGRhdGVVbnJlYWRDb3VudFxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0gIHtudW1iZXJ9IG5ld1ZhbHVlXG4gICAqIEBwYXJhbSAge251bWJlcn0gb2xkVmFsdWVcbiAgICovXG4gIF9fdXBkYXRlVW5yZWFkQ291bnQobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgaWYgKHRoaXMuX2luTGF5ZXJQYXJzZXIpIHtcbiAgICAgIGlmICh0aGlzLl9vbGRVbnJlYWRDb3VudCA9PT0gdW5kZWZpbmVkKSB0aGlzLl9vbGRVbnJlYWRDb3VudCA9IG9sZFZhbHVlO1xuICAgICAgaWYgKHRoaXMuX3VwZGF0ZVVucmVhZENvdW50VGltZW91dCkgY2xlYXJUaW1lb3V0KHRoaXMuX3VwZGF0ZVVucmVhZENvdW50VGltZW91dCk7XG4gICAgICB0aGlzLl91cGRhdGVVbnJlYWRDb3VudFRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHRoaXMuX3VwZGF0ZVVucmVhZENvdW50RXZlbnQoKSwgMTAwMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3VwZGF0ZVVucmVhZENvdW50RXZlbnQoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRmlyZSBldmVudHMgcmVsYXRlZCB0byBjaGFuZ2VzIHRvIHVucmVhZENvdW50XG4gICAqXG4gICAqIEBtZXRob2QgX3VwZGF0ZVVucmVhZENvdW50RXZlbnRcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF91cGRhdGVVbnJlYWRDb3VudEV2ZW50KCkge1xuICAgIGlmICh0aGlzLmlzRGVzdHJveWVkKSByZXR1cm47XG4gICAgY29uc3Qgb2xkVmFsdWUgPSB0aGlzLl9vbGRVbnJlYWRDb3VudDtcbiAgICBjb25zdCBuZXdWYWx1ZSA9IHRoaXMuX191bnJlYWRDb3VudDtcbiAgICB0aGlzLl9vbGRVbnJlYWRDb3VudCA9IHVuZGVmaW5lZDtcblxuICAgIGlmIChuZXdWYWx1ZSA9PT0gb2xkVmFsdWUpIHJldHVybjtcbiAgICB0aGlzLl90cmlnZ2VyQXN5bmMoJ2NvbnZlcnNhdGlvbnM6Y2hhbmdlJywge1xuICAgICAgbmV3VmFsdWUsXG4gICAgICBvbGRWYWx1ZSxcbiAgICAgIHByb3BlcnR5OiAndW5yZWFkQ291bnQnLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIF9fIE1ldGhvZHMgYXJlIGF1dG9tYXRpY2FsbHkgY2FsbGVkIGJ5IHByb3BlcnR5IHNldHRlcnMuXG4gICAqXG4gICAqIEFueSBjaGFuZ2UgaW4gdGhlIGxhc3RNZXNzYWdlIHBvaW50ZXIgd2lsbCBjYWxsIHRoaXMgbWV0aG9kIGFuZCBmaXJlIGFcbiAgICogY2hhbmdlIGV2ZW50LiAgQ2hhbmdlcyB0byBwcm9wZXJ0aWVzIHdpdGhpbiB0aGUgbGFzdE1lc3NhZ2Ugb2JqZWN0IHdpbGxcbiAgICogbm90IHRyaWdnZXIgdGhpcyBjYWxsLlxuICAgKlxuICAgKiBAbWV0aG9kIF9fdXBkYXRlTGFzdE1lc3NhZ2VcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtICB7bGF5ZXIuTWVzc2FnZX0gbmV3VmFsdWVcbiAgICogQHBhcmFtICB7bGF5ZXIuTWVzc2FnZX0gb2xkVmFsdWVcbiAgICovXG4gIF9fdXBkYXRlTGFzdE1lc3NhZ2UobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgaWYgKG5ld1ZhbHVlICYmIG9sZFZhbHVlICYmIG5ld1ZhbHVlLmlkID09PSBvbGRWYWx1ZS5pZCkgcmV0dXJuO1xuICAgIHRoaXMuX3RyaWdnZXJBc3luYygnY29udmVyc2F0aW9uczpjaGFuZ2UnLCB7XG4gICAgICBwcm9wZXJ0eTogJ2xhc3RNZXNzYWdlJyxcbiAgICAgIG5ld1ZhbHVlLFxuICAgICAgb2xkVmFsdWUsXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogX18gTWV0aG9kcyBhcmUgYXV0b21hdGljYWxseSBjYWxsZWQgYnkgcHJvcGVydHkgc2V0dGVycy5cbiAgICpcbiAgICogQW55IGNoYW5nZSBpbiB0aGUgcGFydGljaXBhbnRzIHByb3BlcnR5IHdpbGwgY2FsbCB0aGlzIG1ldGhvZCBhbmQgZmlyZSBhXG4gICAqIGNoYW5nZSBldmVudC4gIENoYW5nZXMgdG8gdGhlIHBhcnRpY2lwYW50cyBhcnJheSB0aGF0IGRvbid0IHJlcGxhY2UgdGhlIGFycmF5XG4gICAqIHdpdGggYSBuZXcgYXJyYXkgd2lsbCByZXF1aXJlIGRpcmVjdGx5IGNhbGxpbmcgdGhpcyBtZXRob2QuXG4gICAqXG4gICAqIEBtZXRob2QgX191cGRhdGVQYXJ0aWNpcGFudHNcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtICB7c3RyaW5nW119IG5ld1ZhbHVlXG4gICAqIEBwYXJhbSAge3N0cmluZ1tdfSBvbGRWYWx1ZVxuICAgKi9cbiAgX191cGRhdGVQYXJ0aWNpcGFudHMobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgaWYgKHRoaXMuX2luTGF5ZXJQYXJzZXIpIHJldHVybjtcbiAgICBjb25zdCBjaGFuZ2UgPSB0aGlzLl9nZXRQYXJ0aWNpcGFudENoYW5nZShuZXdWYWx1ZSwgb2xkVmFsdWUpO1xuICAgIGlmIChjaGFuZ2UuYWRkLmxlbmd0aCB8fCBjaGFuZ2UucmVtb3ZlLmxlbmd0aCkge1xuICAgICAgY2hhbmdlLnByb3BlcnR5ID0gJ3BhcnRpY2lwYW50cyc7XG4gICAgICBjaGFuZ2Uub2xkVmFsdWUgPSBvbGRWYWx1ZTtcbiAgICAgIGNoYW5nZS5uZXdWYWx1ZSA9IG5ld1ZhbHVlO1xuICAgICAgdGhpcy5fdHJpZ2dlckFzeW5jKCdjb252ZXJzYXRpb25zOmNoYW5nZScsIGNoYW5nZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIF9fIE1ldGhvZHMgYXJlIGF1dG9tYXRpY2FsbHkgY2FsbGVkIGJ5IHByb3BlcnR5IHNldHRlcnMuXG4gICAqXG4gICAqIEFueSBjaGFuZ2UgaW4gdGhlIG1ldGFkYXRhIHByb3BlcnR5IHdpbGwgY2FsbCB0aGlzIG1ldGhvZCBhbmQgZmlyZSBhXG4gICAqIGNoYW5nZSBldmVudC4gIENoYW5nZXMgdG8gdGhlIG1ldGFkYXRhIG9iamVjdCB0aGF0IGRvbid0IHJlcGxhY2UgdGhlIG9iamVjdFxuICAgKiB3aXRoIGEgbmV3IG9iamVjdCB3aWxsIHJlcXVpcmUgZGlyZWN0bHkgY2FsbGluZyB0aGlzIG1ldGhvZC5cbiAgICpcbiAgICogQG1ldGhvZCBfX3VwZGF0ZU1ldGFkYXRhXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdH0gbmV3VmFsdWVcbiAgICogQHBhcmFtICB7T2JqZWN0fSBvbGRWYWx1ZVxuICAgKi9cbiAgX191cGRhdGVNZXRhZGF0YShuZXdWYWx1ZSwgb2xkVmFsdWUsIHBhdGhzKSB7XG4gICAgaWYgKHRoaXMuX2luTGF5ZXJQYXJzZXIpIHJldHVybjtcbiAgICBpZiAoSlNPTi5zdHJpbmdpZnkobmV3VmFsdWUpICE9PSBKU09OLnN0cmluZ2lmeShvbGRWYWx1ZSkpIHtcbiAgICAgIHRoaXMuX3RyaWdnZXJBc3luYygnY29udmVyc2F0aW9uczpjaGFuZ2UnLCB7XG4gICAgICAgIHByb3BlcnR5OiAnbWV0YWRhdGEnLFxuICAgICAgICBuZXdWYWx1ZSxcbiAgICAgICAgb2xkVmFsdWUsXG4gICAgICAgIHBhdGhzLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBwbGFpbiBvYmplY3QuXG4gICAqXG4gICAqIE9iamVjdCB3aWxsIGhhdmUgYWxsIHRoZSBzYW1lIHB1YmxpYyBwcm9wZXJ0aWVzIGFzIHRoaXNcbiAgICogQ29udmVyc2F0aW9uIGluc3RhbmNlLiAgTmV3IG9iamVjdCBpcyByZXR1cm5lZCBhbnkgdGltZVxuICAgKiBhbnkgb2YgdGhpcyBvYmplY3QncyBwcm9wZXJ0aWVzIGNoYW5nZS5cbiAgICpcbiAgICogQG1ldGhvZCB0b09iamVjdFxuICAgKiBAcmV0dXJuIHtPYmplY3R9IFBPSk8gdmVyc2lvbiBvZiB0aGlzLlxuICAgKi9cbiAgdG9PYmplY3QoKSB7XG4gICAgaWYgKCF0aGlzLl90b09iamVjdCkge1xuICAgICAgdGhpcy5fdG9PYmplY3QgPSBzdXBlci50b09iamVjdCgpO1xuICAgICAgdGhpcy5fdG9PYmplY3QubWV0YWRhdGEgPSBVdGlsLmNsb25lKHRoaXMubWV0YWRhdGEpO1xuICAgICAgdGhpcy5fdG9PYmplY3QuaXNOZXcgPSB0aGlzLmlzTmV3KCk7XG4gICAgICB0aGlzLl90b09iamVjdC5pc1NhdmluZyA9IHRoaXMuaXNTYXZpbmcoKTtcbiAgICAgIHRoaXMuX3RvT2JqZWN0LmlzU2F2ZWQgPSB0aGlzLmlzU2F2ZWQoKTtcbiAgICAgIHRoaXMuX3RvT2JqZWN0LmlzU3luY2VkID0gdGhpcy5pc1N5bmNlZCgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fdG9PYmplY3Q7XG4gIH1cblxuICBfdHJpZ2dlckFzeW5jKGV2dE5hbWUsIGFyZ3MpIHtcbiAgICB0aGlzLl9jbGVhck9iamVjdCgpO1xuICAgIHN1cGVyLl90cmlnZ2VyQXN5bmMoZXZ0TmFtZSwgYXJncyk7XG4gIH1cblxuICB0cmlnZ2VyKGV2dE5hbWUsIGFyZ3MpIHtcbiAgICB0aGlzLl9jbGVhck9iamVjdCgpO1xuICAgIHN1cGVyLnRyaWdnZXIoZXZ0TmFtZSwgYXJncyk7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBjb252ZXJzYXRpb24gaW5zdGFuY2UgZnJvbSBhIHNlcnZlciByZXByZXNlbnRhdGlvbiBvZiB0aGUgY29udmVyc2F0aW9uLlxuICAgKlxuICAgKiBJZiB0aGUgQ29udmVyc2F0aW9uIGFscmVhZHkgZXhpc3RzLCB3aWxsIHVwZGF0ZSB0aGUgZXhpc3RpbmcgY29weSB3aXRoXG4gICAqIHByZXN1bWFibHkgbmV3ZXIgdmFsdWVzLlxuICAgKlxuICAgKiBAbWV0aG9kIF9jcmVhdGVGcm9tU2VydmVyXG4gICAqIEBwcm90ZWN0ZWRcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGNvbnZlcnNhdGlvbiAtIFNlcnZlciByZXByZXNlbnRhdGlvbiBvZiBhIENvbnZlcnNhdGlvblxuICAgKiBAcGFyYW0gIHtsYXllci5DbGllbnR9IGNsaWVudCBbZGVzY3JpcHRpb25dXG4gICAqIEByZXR1cm4ge2xheWVyLkNvbnZlcnNhdGlvbn0gICAgICAgIFtkZXNjcmlwdGlvbl1cbiAgICovXG4gIHN0YXRpYyBfY3JlYXRlRnJvbVNlcnZlcihjb252ZXJzYXRpb24sIGNsaWVudCkge1xuICAgIGxldCBuZXdDb252ZXJzYXRpb247XG5cbiAgICAvLyBNYWtlIHN1cmUgd2UgaGF2ZSBhIGNsaWVudC4uLiBvciBhYm9ydFxuICAgIGlmICghKGNsaWVudCBpbnN0YW5jZW9mIFJvb3QpKSB0aHJvdyBuZXcgRXJyb3IoTGF5ZXJFcnJvci5kaWN0aW9uYXJ5LmNsaWVudE1pc3NpbmcpO1xuXG4gICAgLy8gSWYgdGhlIENvbnZlcnNhdGlvbiBhbHJlYWR5IGV4aXN0cyBpbiBjYWNoZSwgdXBkYXRlIHRoZSBjYWNoZVxuICAgIGNvbnN0IGZvdW5kID0gY2xpZW50LmdldENvbnZlcnNhdGlvbihjb252ZXJzYXRpb24uaWQpO1xuICAgIGlmIChmb3VuZCkge1xuICAgICAgbmV3Q29udmVyc2F0aW9uID0gZm91bmQ7XG4gICAgICBuZXdDb252ZXJzYXRpb24uX3BvcHVsYXRlRnJvbVNlcnZlcihjb252ZXJzYXRpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiB0aGUgQ29udmVyc2F0aW9uIGRvZXMgbm90IGV4aXN0LCBjcmVhdGUgaXQ7IHNpZGUgZWZmZWN0cyB3aWxsIGNhY2hlIGl0XG4gICAgICBuZXdDb252ZXJzYXRpb24gPSBuZXcgQ29udmVyc2F0aW9uKHtcbiAgICAgICAgY2xpZW50LFxuICAgICAgICBmcm9tU2VydmVyOiBjb252ZXJzYXRpb24sXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gQ29udmVyc2F0aW9uIGFuZCB3aGV0aGVyIGl0IHdhcyBuZXcvY2FjaGVkXG4gICAgcmV0dXJuIHtcbiAgICAgIGNvbnZlcnNhdGlvbjogbmV3Q29udmVyc2F0aW9uLFxuICAgICAgbmV3OiAhZm91bmQsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2FkIGEgY29udmVyc2F0aW9uIGZyb20gdGhlIHNlcnZlciBieSBJZC5cbiAgICpcbiAgICogVHlwaWNhbGx5IG9uZSBzaG91bGQgY2FsbFxuICAgKlxuICAgKiAgICAgY2xpZW50LmdldENvbnZlcnNhdGlvbihjb252ZXJzYXRpb25JZCwgdHJ1ZSlcbiAgICpcbiAgICogVGhpcyB3aWxsIGdldCB0aGUgQ29udmVyc2F0aW9uIGZyb20gY2FjaGUgb3IgbGF5ZXIuQ29udmVyc2F0aW9uLmxvYWQgaXQgZnJvbSB0aGUgc2VydmVyIGlmIG5vdCBjYWNoZWQuXG4gICAqIFR5cGljYWxseSB5b3UgZG8gbm90IG5lZWQgdG8gY2FsbCB0aGlzIG1ldGhvZCBkaXJlY3RseS5cbiAgICpcbiAgICogQG1ldGhvZCBsb2FkXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtICB7c3RyaW5nfSBpZCAtIENvbnZlcnNhdGlvbiBJZGVudGlmaWVyXG4gICAqIEBwYXJhbSAge2xheWVyLkNsaWVudH0gY2xpZW50IC0gVGhlIExheWVyIGNsaWVudFxuICAgKiBAcmV0dXJuIHtsYXllci5Db252ZXJzYXRpb259XG4gICAqL1xuICBzdGF0aWMgbG9hZChpZCwgY2xpZW50KSB7XG4gICAgaWYgKCFjbGllbnQpIHRocm93IG5ldyBFcnJvcihMYXllckVycm9yLmRpY3Rpb25hcnkuY2xpZW50TWlzc2luZyk7XG4gICAgY29uc3QgY29udmVyc2F0aW9uID0gbmV3IENvbnZlcnNhdGlvbih7XG4gICAgICB1cmw6IGNsaWVudC51cmwgKyBpZC5zdWJzdHJpbmcoOCksXG4gICAgICBpZCxcbiAgICAgIGNsaWVudCxcbiAgICB9KTtcbiAgICBjb252ZXJzYXRpb24uX2xvYWQoKTtcbiAgICByZXR1cm4gY29udmVyc2F0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgb3IgY3JlYXRlIGEgbmV3IGNvbnZlcmF0aW9uLlxuICAgKlxuICAgKiAgICAgIHZhciBjb252ZXJzYXRpb24gPSBsYXllci5Db252ZXJzYXRpb24uY3JlYXRlKHtcbiAgICogICAgICAgICAgcGFydGljaXBhbnRzOiBbJ2EnLCAnYiddLFxuICAgKiAgICAgICAgICBkaXN0aW5jdDogdHJ1ZSxcbiAgICogICAgICAgICAgbWV0YWRhdGE6IHtcbiAgICogICAgICAgICAgICAgIHRpdGxlOiAnSSBhbSBub3QgYSB0aXRsZSEnXG4gICAqICAgICAgICAgIH0sXG4gICAqICAgICAgICAgIGNsaWVudDogY2xpZW50LFxuICAgKiAgICAgICAgICAnY29udmVyc2F0aW9uczpsb2FkZWQnOiBmdW5jdGlvbihldnQpIHtcbiAgICpcbiAgICogICAgICAgICAgfVxuICAgKiAgICAgIH0pO1xuICAgKlxuICAgKiBPbmx5IHRyaWVzIHRvIGZpbmQgYSBDb252ZXJzYXRpb24gaWYgaXRzIGEgRGlzdGluY3QgQ29udmVyc2F0aW9uLlxuICAgKiBEaXN0aW5jdCBkZWZhdWx0cyB0byB0cnVlLlxuICAgKlxuICAgKiBSZWNvbW1lbmQgdXNpbmcgYGNsaWVudC5jcmVhdGVDb252ZXJzYXRpb24oey4uLn0pYFxuICAgKiBpbnN0ZWFkIG9mIGBDb252ZXJzYXRpb24uY3JlYXRlKHsuLi59KWAuXG4gICAqXG4gICAqIEBtZXRob2QgY3JlYXRlXG4gICAqIEBzdGF0aWNcbiAgICogQHByb3RlY3RlZFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnNcbiAgICogQHBhcmFtICB7bGF5ZXIuQ2xpZW50fSBvcHRpb25zLmNsaWVudFxuICAgKiBAcGFyYW0gIHtzdHJpbmdbXX0gb3B0aW9ucy5wYXJ0aWNpcGFudHMgLSBBcnJheSBvZiBwYXJ0aWNpcGFudCBpZHNcbiAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5kaXN0aW5jdD1mYWxzZV0gLSBDcmVhdGUgYSBkaXN0aW5jdCBjb252ZXJzYXRpb25cbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLm1ldGFkYXRhPXt9XSAtIEluaXRpYWwgbWV0YWRhdGEgZm9yIENvbnZlcnNhdGlvblxuICAgKiBAcmV0dXJuIHtsYXllci5Db252ZXJzYXRpb259XG4gICAqL1xuICBzdGF0aWMgY3JlYXRlKG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMuY2xpZW50KSB0aHJvdyBuZXcgRXJyb3IoTGF5ZXJFcnJvci5kaWN0aW9uYXJ5LmNsaWVudE1pc3NpbmcpO1xuICAgIGlmIChvcHRpb25zLmRpc3RpbmN0KSB7XG4gICAgICBjb25zdCBjb252ID0gdGhpcy5fY3JlYXRlRGlzdGluY3Qob3B0aW9ucyk7XG4gICAgICBpZiAoY29udikgcmV0dXJuIGNvbnY7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBDb252ZXJzYXRpb24ob3B0aW9ucyk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIG9yIEZpbmQgYSBEaXN0aW5jdCBDb252ZXJzYXRpb24uXG4gICAqXG4gICAqIElmIHRoZSBzdGF0aWMgQ29udmVyc2F0aW9uLmNyZWF0ZSBtZXRob2QgZ2V0cyBhIHJlcXVlc3QgZm9yIGEgRGlzdGluY3QgQ29udmVyc2F0aW9uLFxuICAgKiBzZWUgaWYgd2UgaGF2ZSBvbmUgY2FjaGVkLlxuICAgKlxuICAgKiBXaWxsIGZpcmUgdGhlICdjb252ZXJzYXRpb25zOmxvYWRlZCcgZXZlbnQgaWYgb25lIGlzIHByb3ZpZGVkIGluIHRoaXMgY2FsbCxcbiAgICogYW5kIGEgQ29udmVyc2F0aW9uIGlzIGZvdW5kLlxuICAgKlxuICAgKiBAbWV0aG9kIF9jcmVhdGVEaXN0aW5jdFxuICAgKiBAc3RhdGljXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9ucyAtIFNlZSBsYXllci5Db252ZXJzYXRpb24uY3JlYXRlIG9wdGlvbnNcbiAgICogQHJldHVybiB7bGF5ZXIuQ29udmVyc2F0aW9ufVxuICAgKi9cbiAgc3RhdGljIF9jcmVhdGVEaXN0aW5jdChvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMucGFydGljaXBhbnRzLmluZGV4T2Yob3B0aW9ucy5jbGllbnQudXNlcklkKSA9PT0gLTEpIHtcbiAgICAgIG9wdGlvbnMucGFydGljaXBhbnRzLnB1c2gob3B0aW9ucy5jbGllbnQudXNlcklkKTtcbiAgICB9XG5cbiAgICBjb25zdCBwYXJ0aWNpcGFudHMgPSBvcHRpb25zLnBhcnRpY2lwYW50cy5zb3J0KCk7XG4gICAgY29uc3QgcFN0cmluZyA9IHBhcnRpY2lwYW50cy5qb2luKCcsJyk7XG5cbiAgICBjb25zdCBjb252ID0gb3B0aW9ucy5jbGllbnQuZmluZENhY2hlZENvbnZlcnNhdGlvbihhQ29udiA9PiB7XG4gICAgICBpZiAoYUNvbnYuZGlzdGluY3QgJiYgYUNvbnYucGFydGljaXBhbnRzLmxlbmd0aCA9PT0gcGFydGljaXBhbnRzLmxlbmd0aCkge1xuICAgICAgICBjb25zdCBwYXJ0aWNpcGFudHMyID0gYUNvbnYucGFydGljaXBhbnRzLnNvcnQoKTtcbiAgICAgICAgcmV0dXJuIHBhcnRpY2lwYW50czIuam9pbignLCcpID09PSBwU3RyaW5nO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKGNvbnYpIHtcbiAgICAgIGNvbnYuX3NlbmREaXN0aW5jdEV2ZW50ID0gbmV3IExheWVyRXZlbnQoe1xuICAgICAgICB0YXJnZXQ6IGNvbnYsXG4gICAgICAgIHJlc3VsdDogIW9wdGlvbnMubWV0YWRhdGEgfHwgVXRpbC5kb2VzT2JqZWN0TWF0Y2gob3B0aW9ucy5tZXRhZGF0YSwgY29udi5tZXRhZGF0YSkgP1xuICAgICAgICAgIENvbnZlcnNhdGlvbi5GT1VORCA6IENvbnZlcnNhdGlvbi5GT1VORF9XSVRIT1VUX1JFUVVFU1RFRF9NRVRBREFUQSxcbiAgICAgIH0sICdjb252ZXJzYXRpb25zOnNlbnQnKTtcbiAgICAgIHJldHVybiBjb252O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJZGVudGlmaWVzIHdoZXRoZXIgYSBDb252ZXJzYXRpb24gcmVjZWl2aW5nIHRoZSBzcGVjaWZpZWQgcGF0Y2ggZGF0YSBzaG91bGQgYmUgbG9hZGVkIGZyb20gdGhlIHNlcnZlci5cbiAgICpcbiAgICogQW55IGNoYW5nZSB0byBhIENvbnZlcnNhdGlvbiBpbmRpY2F0ZXMgdGhhdCB0aGUgQ29udmVyc2F0aW9uIGlzIGFjdGl2ZSBhbmQgb2YgcG90ZW50aWFsIGludGVyZXN0OyBnbyBhaGVhZCBhbmQgbG9hZCB0aGF0XG4gICAqIENvbnZlcnNhdGlvbiBpbiBjYXNlIHRoZSBhcHAgaGFzIG5lZWQgb2YgaXQuICBJbiB0aGUgZnV0dXJlIHdlIG1heSBpZ25vcmUgY2hhbmdlcyB0byB1bnJlYWQgY291bnQuICBPbmx5IHJlbGV2YW50XG4gICAqIHdoZW4gd2UgZ2V0IFdlYnNvY2tldCBldmVudHMgZm9yIGEgQ29udmVyc2F0aW9uIHRoYXQgaGFzIG5vdCBiZWVuIGxvYWRlZC9jYWNoZWQgb24gQ2xpZW50LlxuICAgKlxuICAgKiBAbWV0aG9kIF9sb2FkUmVzb3VyY2VGb3JQYXRjaFxuICAgKiBAc3RhdGljXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBzdGF0aWMgX2xvYWRSZXNvdXJjZUZvclBhdGNoKHBhdGNoRGF0YSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59XG5cbi8qKlxuICogQXJyYXkgb2YgcGFydGljaXBhbnQgaWRzLlxuICpcbiAqIERvIG5vdCBkaXJlY3RseSBtYW5pcHVsYXRlO1xuICogdXNlIGFkZFBhcnRpY2lwYW50cywgcmVtb3ZlUGFydGljaXBhbnRzIGFuZCByZXBsYWNlUGFydGljaXBhbnRzXG4gKiB0byBtYW5pcHVsYXRlIHRoZSBhcnJheS5cbiAqXG4gKiBAdHlwZSB7c3RyaW5nW119XG4gKi9cbkNvbnZlcnNhdGlvbi5wcm90b3R5cGUucGFydGljaXBhbnRzID0gbnVsbDtcblxuLyoqXG4gKiBsYXllci5DbGllbnQgdGhhdCB0aGUgY29udmVyc2F0aW9uIGJlbG9uZ3MgdG8uXG4gKlxuICogQWN0dWFsIHZhbHVlIG9mIHRoaXMgc3RyaW5nIG1hdGNoZXMgdGhlIGFwcElkLlxuICogQHR5cGUge3N0cmluZ31cbiAqL1xuQ29udmVyc2F0aW9uLnByb3RvdHlwZS5jbGllbnRJZCA9ICcnO1xuXG4vKipcbiAqIFRpbWUgdGhhdCB0aGUgY29udmVyc2F0aW9uIHdhcyBjcmVhdGVkIG9uIHRoZSBzZXJ2ZXIuXG4gKlxuICogQHR5cGUge0RhdGV9XG4gKi9cbkNvbnZlcnNhdGlvbi5wcm90b3R5cGUuY3JlYXRlZEF0ID0gbnVsbDtcblxuLyoqXG4gKiBDb252ZXJzYXRpb24gdW5pcXVlIGlkZW50aWZpZXIuXG4gKlxuICogQHR5cGUge3N0cmluZ31cbiAqL1xuQ29udmVyc2F0aW9uLnByb3RvdHlwZS5pZCA9ICcnO1xuXG4vKipcbiAqIFVSTCB0byBhY2Nlc3MgdGhlIGNvbnZlcnNhdGlvbiBvbiB0aGUgc2VydmVyLlxuICpcbiAqIEB0eXBlIHtzdHJpbmd9XG4gKi9cbkNvbnZlcnNhdGlvbi5wcm90b3R5cGUudXJsID0gJyc7XG5cbi8qKlxuICogTnVtYmVyIG9mIHVucmVhZCBtZXNzYWdlcyBpbiB0aGUgY29udmVyc2F0aW9uLlxuICpcbiAqIEB0eXBlIHtudW1iZXJ9XG4gKi9cbkNvbnZlcnNhdGlvbi5wcm90b3R5cGUudW5yZWFkQ291bnQgPSAwO1xuXG4vKipcbiAqIFRoaXMgaXMgYSBEaXN0aW5jdCBDb252ZXJzYXRpb24uXG4gKlxuICogWW91IGNhbiBoYXZlIDEgZGlzdGluY3QgY29udmVyc2F0aW9uIGFtb25nIGEgc2V0IG9mIHBhcnRpY2lwYW50cy5cbiAqIFRoZXJlIGFyZSBubyBsaW1pdHMgdG8gaG93IG1hbnkgbm9uLWRpc3RpbmN0IENvbnZlcnNhdGlvbnMgeW91IGhhdmUgaGF2ZVxuICogYW1vbmcgYSBzZXQgb2YgcGFydGljaXBhbnRzLlxuICpcbiAqIEB0eXBlIHtib29sZWFufVxuICovXG5Db252ZXJzYXRpb24ucHJvdG90eXBlLmRpc3RpbmN0ID0gdHJ1ZTtcblxuLyoqXG4gKiBNZXRhZGF0YSBmb3IgdGhlIGNvbnZlcnNhdGlvbi5cbiAqXG4gKiBNZXRhZGF0YSB2YWx1ZXMgY2FuIGJlIHBsYWluIG9iamVjdHMgYW5kIHN0cmluZ3MsIGJ1dFxuICogbm8gYXJyYXlzLCBudW1iZXJzLCBib29sZWFucyBvciBkYXRlcy5cbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbkNvbnZlcnNhdGlvbi5wcm90b3R5cGUubWV0YWRhdGEgPSBudWxsO1xuXG4vKipcbiAqIFRpbWUgdGhhdCB0aGUgY29udmVyc2F0aW9uIG9iamVjdCB3YXMgaW5zdGFudGlhdGVkXG4gKiBpbiB0aGUgY3VycmVudCBjbGllbnQuXG4gKiBAdHlwZSB7RGF0ZX1cbiAqL1xuQ29udmVyc2F0aW9uLnByb3RvdHlwZS5sb2NhbENyZWF0ZWRBdCA9IG51bGw7XG5cbi8qKlxuICogVGhlIGF1dGhlbnRpY2F0ZWQgdXNlciBpcyBhIGN1cnJlbnQgcGFydGljaXBhbnQgaW4gdGhpcyBDb252ZXJzYXRpb24uXG4gKlxuICogU2V0IHRvIGZhbHNlIGlmIHRoZSBhdXRoZW50aWNhdGVkIHVzZXIgaGFzIGJlZW4gcmVtb3ZlZCBmcm9tIHRoaXMgY29udmVyc2F0aW9uLlxuICpcbiAqIEEgcmVtb3ZlZCB1c2VyIGNhbiBzZWUgbWVzc2FnZXMgdXAgdG8gdGhlIHRpbWUgdGhleSB3ZXJlIHJlbW92ZWQsXG4gKiBidXQgY2FuIG5vIGxvbmdlciBpbnRlcmFjdCB3aXRoIHRoZSBjb252ZXJzYXRpb24uXG4gKlxuICogQSByZW1vdmVkIHVzZXIgY2FuIG5vIGxvbmdlciBzZWUgdGhlIHBhcnRpY2lwYW50IGxpc3QuXG4gKlxuICogUmVhZCBhbmQgRGVsaXZlcnkgcmVjZWlwdHMgd2lsbCBmYWlsIG9uIGFueSBNZXNzYWdlIGluIHN1Y2ggYSBDb252ZXJzYXRpb24uXG4gKlxuICogQHR5cGUge0Jvb2xlYW59XG4gKi9cbkNvbnZlcnNhdGlvbi5wcm90b3R5cGUuaXNDdXJyZW50UGFydGljaXBhbnQgPSB0cnVlO1xuXG4vKipcbiAqIFRoZSBsYXN0IGxheWVyLk1lc3NhZ2UgdG8gYmUgc2VudC9yZWNlaXZlZCBmb3IgdGhpcyBDb252ZXJzYXRpb24uXG4gKlxuICogVmFsdWUgbWF5IGJlIGEgTWVzc2FnZSB0aGF0IGhhcyBiZWVuIGxvY2FsbHkgY3JlYXRlZCBidXQgbm90IHlldCByZWNlaXZlZCBieSBzZXJ2ZXIuXG4gKiBAdHlwZSB7bGF5ZXIuTWVzc2FnZX1cbiAqL1xuQ29udmVyc2F0aW9uLnByb3RvdHlwZS5sYXN0TWVzc2FnZSA9IG51bGw7XG5cbi8qKlxuICogQ2FjaGVzIGxhc3QgcmVzdWx0IG9mIHRvT2JqZWN0KClcbiAqIEB0eXBlIHtPYmplY3R9XG4gKiBAcHJpdmF0ZVxuICovXG5Db252ZXJzYXRpb24ucHJvdG90eXBlLl90b09iamVjdCA9IG51bGw7XG5cbi8qKlxuICogQ2FjaGUncyBhIERpc3RpbmN0IEV2ZW50LlxuICpcbiAqIE9uIGNyZWF0aW5nIGEgRGlzdGluY3QgQ29udmVyc2F0aW9uIHRoYXQgYWxyZWFkeSBleGlzdHMsXG4gKiB3aGVuIHRoZSBzZW5kKCkgbWV0aG9kIGlzIGNhbGxlZCwgd2Ugc2hvdWxkIHRyaWdnZXJcbiAqIHNwZWNpZmljIGV2ZW50cyBkZXRhaWxpbmcgdGhlIHJlc3VsdHMuICBSZXN1bHRzXG4gKiBtYXkgYmUgZGV0ZXJtaW5lZCBsb2NhbGx5IG9yIG9uIHRoZSBzZXJ2ZXIsIGJ1dCBzYW1lIEV2ZW50IG1heSBiZSBuZWVkZWQuXG4gKlxuICogQHR5cGUge2xheWVyLkxheWVyRXZlbnR9XG4gKiBAcHJpdmF0ZVxuICovXG5Db252ZXJzYXRpb24ucHJvdG90eXBlLl9zZW5kRGlzdGluY3RFdmVudCA9IG51bGw7XG5cbi8qKlxuICogQSBsb2NhbGx5IGNyZWF0ZWQgQ29udmVyc2F0aW9uIHdpbGwgZ2V0IGEgdGVtcG9yYXJ5IElELlxuICpcbiAqIFNvbWUgbWF5IHRyeSB0byBsb29rdXAgdGhlIENvbnZlcnNhdGlvbiB1c2luZyB0aGUgdGVtcG9yYXJ5IElEIGV2ZW5cbiAqIHRob3VnaCBpdCBtYXkgaGF2ZSBsYXRlciByZWNlaXZlZCBhbiBJRCBmcm9tIHRoZSBzZXJ2ZXIuXG4gKiBLZWVwIHRoZSB0ZW1wb3JhcnkgSUQgc28gd2UgY2FuIGNvcnJlY3RseSBpbmRleCBhbmQgY2xlYW51cC5cbiAqXG4gKiBAdHlwZSB7U3RyaW5nfVxuICogQHByaXZhdGVcbiAqL1xuQ29udmVyc2F0aW9uLnByb3RvdHlwZS5fdGVtcElkID0gJyc7XG5cbi8qKlxuICogUHJlZml4IHRvIHVzZSB3aGVuIGdlbmVyYXRpbmcgYW4gSUQgZm9yIGluc3RhbmNlcyBvZiB0aGlzIGNsYXNzXG4gKiBAdHlwZSB7U3RyaW5nfVxuICogQHN0YXRpY1xuICogQHByaXZhdGVcbiAqL1xuQ29udmVyc2F0aW9uLnByZWZpeFVVSUQgPSAnbGF5ZXI6Ly8vY29udmVyc2F0aW9ucy8nO1xuXG4vKipcbiAqIFByb3BlcnR5IHRvIGxvb2sgZm9yIHdoZW4gYnViYmxpbmcgdXAgZXZlbnRzLlxuICogQHR5cGUge1N0cmluZ31cbiAqIEBzdGF0aWNcbiAqIEBwcml2YXRlXG4gKi9cbkNvbnZlcnNhdGlvbi5idWJibGVFdmVudFBhcmVudCA9ICdnZXRDbGllbnQnO1xuXG4vKipcbiAqIFRoZSBDb252ZXJzYXRpb24gdGhhdCB3YXMgcmVxdWVzdGVkIGhhcyBiZWVuIGNyZWF0ZWQuXG4gKlxuICogVXNlZCBpbiAnY29udmVyc2F0aW9uczpzZW50JyBldmVudHMuXG4gKiBAdHlwZSB7U3RyaW5nfVxuICogQHN0YXRpY1xuICovXG5Db252ZXJzYXRpb24uQ1JFQVRFRCA9ICdDcmVhdGVkJztcblxuLyoqXG4gKiBUaGUgQ29udmVyc2F0aW9uIHRoYXQgd2FzIHJlcXVlc3RlZCBoYXMgYmVlbiBmb3VuZC5cbiAqXG4gKiBUaGlzIG1lYW5zIHRoYXQgaXQgZGlkIG5vdCBuZWVkIHRvIGJlIGNyZWF0ZWQuXG4gKlxuICogVXNlZCBpbiAnY29udmVyc2F0aW9uczpzZW50JyBldmVudHMuXG4gKiBAdHlwZSB7U3RyaW5nfVxuICogQHN0YXRpY1xuICovXG5Db252ZXJzYXRpb24uRk9VTkQgPSAnRm91bmQnO1xuXG4vKipcbiAqIFRoZSBDb252ZXJzYXRpb24gdGhhdCB3YXMgcmVxdWVzdGVkIGhhcyBiZWVuIGZvdW5kLCBidXQgdGhlcmUgd2FzIGEgbWlzbWF0Y2ggaW4gbWV0YWRhdGEuXG4gKlxuICogSWYgdGhlIGNyZWF0ZUNvbnZlcnNhdGlvbiByZXF1ZXN0IGNvbnRhaW5lZCBtZXRhZGF0YSBhbmQgaXQgZGlkIG5vdCBtYXRjaCB0aGUgRGlzdGluY3QgQ29udmVyc2F0aW9uXG4gKiB0aGF0IG1hdGNoZWQgdGhlIHJlcXVlc3RlZCBwYXJ0aWNpcGFudHMsIHRoZW4gdGhpcyB2YWx1ZSBpcyBwYXNzZWQgdG8gbm90aWZ5IHlvdXIgYXBwIHRoYXQgdGhlIENvbnZlcnNhdGlvblxuICogd2FzIHJldHVybmVkIGJ1dCBkb2VzIG5vdCBleGFjdGx5IG1hdGNoIHlvdXIgcmVxdWVzdC5cbiAqXG4gKiBVc2VkIGluICdjb252ZXJzYXRpb25zOnNlbnQnIGV2ZW50cy5cbiAqIEB0eXBlIHtTdHJpbmd9XG4gKiBAc3RhdGljXG4gKi9cbkNvbnZlcnNhdGlvbi5GT1VORF9XSVRIT1VUX1JFUVVFU1RFRF9NRVRBREFUQSA9ICdGb3VuZE1pc21hdGNoJztcblxuQ29udmVyc2F0aW9uLl9zdXBwb3J0ZWRFdmVudHMgPSBbXG5cblxuXG4gIC8qKlxuICAgKiBUaGUgY29udmVyc2F0aW9uIGlzIG5vdyBvbiB0aGUgc2VydmVyLlxuICAgKlxuICAgKiBDYWxsZWQgYWZ0ZXIgc3VjY2Vzc2Z1bGx5IGNyZWF0aW5nIHRoZSBjb252ZXJzYXRpb25cbiAgICogb24gdGhlIHNlcnZlci4gIFRoZSBSZXN1bHQgcHJvcGVydHkgaXMgb25lIG9mOlxuICAgKlxuICAgKiAqIENvbnZlcnNhdGlvbi5DUkVBVEVEOiBBIG5ldyBDb252ZXJzYXRpb24gaGFzIGJlZW4gY3JlYXRlZFxuICAgKiAqIENvbnZlcnNhdGlvbi5GT1VORDogQSBtYXRjaGluZyBEaXN0aW5jdCBDb252ZXJzYXRpb24gaGFzIGJlZW4gZm91bmRcbiAgICogKiBDb252ZXJzYXRpb24uRk9VTkRfV0lUSE9VVF9SRVFVRVNURURfTUVUQURBVEE6IEEgbWF0Y2hpbmcgRGlzdGluY3QgQ29udmVyc2F0aW9uIGhhcyBiZWVuIGZvdW5kXG4gICAqICAgICAgICAgICAgICAgICAgICAgICBidXQgbm90ZSB0aGF0IHRoZSBtZXRhZGF0YSBpcyBOT1Qgd2hhdCB5b3UgcmVxdWVzdGVkLlxuICAgKlxuICAgKiBBbGwgb2YgdGhlc2UgcmVzdWx0cyB3aWxsIGFsc28gbWVhbiB0aGF0IHRoZSB1cGRhdGVkIHByb3BlcnR5IHZhbHVlcyBoYXZlIGJlZW5cbiAgICogY29waWVkIGludG8geW91ciBDb252ZXJzYXRpb24gb2JqZWN0LiAgVGhhdCBtZWFucyB5b3VyIG1ldGFkYXRhIHByb3BlcnR5IG1heSBub1xuICAgKiBsb25nZXIgYmUgaXRzIGluaXRpYWwgdmFsdWU7IGl0IG1heSBiZSB0aGUgdmFsdWUgZm91bmQgb24gdGhlIHNlcnZlci5cbiAgICpcbiAgICogQGV2ZW50XG4gICAqIEBwYXJhbSB7bGF5ZXIuTGF5ZXJFdmVudH0gZXZlbnRcbiAgICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50LnJlc3VsdFxuICAgKi9cbiAgJ2NvbnZlcnNhdGlvbnM6c2VudCcsXG5cbiAgLyoqXG4gICAqIEFuIGF0dGVtcHQgdG8gc2VuZCB0aGlzIGNvbnZlcnNhdGlvbiB0byB0aGUgc2VydmVyIGhhcyBmYWlsZWQuXG4gICAqIEBldmVudFxuICAgKiBAcGFyYW0ge2xheWVyLkxheWVyRXZlbnR9IGV2ZW50XG4gICAqIEBwYXJhbSB7bGF5ZXIuTGF5ZXJFcnJvcn0gZXZlbnQuZXJyb3JcbiAgICovXG4gICdjb252ZXJzYXRpb25zOnNlbnQtZXJyb3InLFxuXG4gIC8qKlxuICAgKiBUaGUgY29udmVyc2F0aW9uIGlzIG5vdyBsb2FkZWQgZnJvbSB0aGUgc2VydmVyLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgdGhpcyBpcyBvbmx5IHVzZWQgaW4gcmVzcG9uc2UgdG8gdGhlIGxheWVyLkNvbnZlcnNhdGlvbi5sb2FkKCkgbWV0aG9kLlxuICAgKiBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAqIEBldmVudFxuICAgKiBAcGFyYW0ge2xheWVyLkxheWVyRXZlbnR9IGV2ZW50XG4gICAqL1xuICAnY29udmVyc2F0aW9uczpsb2FkZWQnLFxuXG4gIC8qKlxuICAgKiBBbiBhdHRlbXB0IHRvIGxvYWQgdGhpcyBjb252ZXJzYXRpb24gZnJvbSB0aGUgc2VydmVyIGhhcyBmYWlsZWQuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB0aGlzIGlzIG9ubHkgdXNlZCBpbiByZXNwb25zZSB0byB0aGUgbGF5ZXIuQ29udmVyc2F0aW9uLmxvYWQoKSBtZXRob2QuXG4gICAqIEBldmVudFxuICAgKiBAcGFyYW0ge2xheWVyLkxheWVyRXZlbnR9IGV2ZW50XG4gICAqIEBwYXJhbSB7bGF5ZXIuTGF5ZXJFcnJvcn0gZXZlbnQuZXJyb3JcbiAgICovXG4gICdjb252ZXJzYXRpb25zOmxvYWRlZC1lcnJvcicsXG5cbiAgLyoqXG4gICAqIFRoZSBjb252ZXJzYXRpb24gaGFzIGJlZW4gZGVsZXRlZCBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqIENhdXNlZCBieSBlaXRoZXIgYSBzdWNjZXNzZnVsIGNhbGwgdG8gZGVsZXRlKCkgb24gdGhpcyBpbnN0YW5jZVxuICAgKiBvciBieSBhIHJlbW90ZSB1c2VyLlxuICAgKiBAZXZlbnRcbiAgICogQHBhcmFtIHtsYXllci5MYXllckV2ZW50fSBldmVudFxuICAgKi9cbiAgJ2NvbnZlcnNhdGlvbnM6ZGVsZXRlJyxcblxuICAvKipcbiAgICogVGhpcyBjb252ZXJzYXRpb24gaGFzIGNoYW5nZWQuXG4gICAqXG4gICAqIEBldmVudFxuICAgKiBAcGFyYW0ge2xheWVyLkxheWVyRXZlbnR9IGV2ZW50XG4gICAqIEBwYXJhbSB7T2JqZWN0W119IGV2ZW50LmNoYW5nZXMgLSBBcnJheSBvZiBjaGFuZ2VzIHJlcG9ydGVkIGJ5IHRoaXMgZXZlbnRcbiAgICogQHBhcmFtIHtNaXhlZH0gZXZlbnQuY2hhbmdlcy5uZXdWYWx1ZVxuICAgKiBAcGFyYW0ge01peGVkfSBldmVudC5jaGFuZ2VzLm9sZFZhbHVlXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBldmVudC5jaGFuZ2VzLnByb3BlcnR5IC0gTmFtZSBvZiB0aGUgcHJvcGVydHkgdGhhdCBjaGFuZ2VkXG4gICAqIEBwYXJhbSB7bGF5ZXIuQ29udmVyc2F0aW9ufSBldmVudC50YXJnZXRcbiAgICovXG4gICdjb252ZXJzYXRpb25zOmNoYW5nZSddLmNvbmNhdChTeW5jYWJsZS5fc3VwcG9ydGVkRXZlbnRzKTtcblxuUm9vdC5pbml0Q2xhc3MuYXBwbHkoQ29udmVyc2F0aW9uLCBbQ29udmVyc2F0aW9uLCAnQ29udmVyc2F0aW9uJ10pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnZlcnNhdGlvbjtcbiJdfQ==
