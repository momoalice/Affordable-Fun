'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * There are two ways to instantiate this class:
 *
 *      // 1. Using a Query Builder
 *      var queryBuilder = QueryBuilder.conversations().sortBy('lastMessage');
 *      var query = client.createQuery(client, queryBuilder);
 *
 *      // 2. Passing properties directly
 *      var query = client.createQuery({
 *        client: client,
 *        model: layer.Query.Conversation,
 *        sortBy: [{'createdAt': 'desc'}]
 *      });
 *
 * You can change the data selected by your query any time you want using:
 *
 *      query.update({
 *        paginationWindow: 200
 *      });
 *
 *      query.update({
 *        predicate: 'conversation.id = "' + conv.id + "'"
 *      });
 *
 *     // Or use the Query Builder:
 *     queryBuilder.paginationWindow(200);
 *     query.update(queryBuilder);
 *
 * You can release Conversations and Messages held in memory by your queries when done with them:
 *
 *      query.destroy();
 *
 * #### sortBy
 *
 * Note that the sortBy property is only supported for Conversations at this time and only
 * supports "createdAt" and "lastMessage.sentAt" as sort fields.
 *
 * #### dataType
 *
 * The layer.Query.dataType property lets you specify what type of data shows up in your results:
 *
 * ```javascript
 * var query = client.createQuery({
 *     model: layer.Query.Message,
 *     predicate: "conversation.id = 'layer:///conversations/uuid'",
 *     dataType: layer.Query.InstanceDataType
 * })
 *
 * var query = client.createQuery({
 *     model: layer.Query.Message,
 *     predicate: "conversation.id = 'layer:///conversations/uuid'",
 *     dataType: layer.Query.ObjectDataType
 * })
 * ```
 *
 * The property defaults to layer.Query.InstanceDataType.  Instances support methods and let you subscribe to events for direct notification
 * of changes to any of the results of your query:
 *
 * ```javascript
 * query.data[0].on('messages:read', function() {
 *     alert('The first message has been read!');
 * });
 * ```
 *
 * A value of layer.Query.ObjectDataType will cause the data to be an array of immutable objects rather than instances.  One can still get an instance from the POJO:
 *
 * ```javascript
 * var m = client.getMessage(query.data[0].id);
 * m.on('messages:read', function() {
 *     alert('The first message has been read!');
 * });
 * ```
 *
 * ## Query Events
 *
 * Queries fire events whenever their data changes.  There are 5 types of events;
 * all events are received by subscribing to the `change` event.
 *
 * ### 1. Data Events
 *
 * The Data event is fired whenever a request is sent to the server for new query results.  This could happen when first creating the query, when paging for more data, or when changing the query's properties, resulting in a new request to the server.
 *
 * The Event object will have an `evt.data` array of all newly added results.  But frequently you may just want to use the `query.data` array and get ALL results.
 *
 * ```javascript
 * query.on('change', function(evt) {
 *   if (evt.type === 'data') {
 *      var newData = evt.data;
 *      var allData = query.data;
 *   }
 * });
 * ```
 *
 * Note that `query.on('change:data', function(evt) {}` is also supported.
 *
 * ### 2. Insert Events
 *
 * A new Conversation or Message was created. It may have been created locally by your user, or it may have been remotely created, received via websocket, and added to the Query's results.
 *
 * The layer.LayerEvent.target property contains the newly inserted object.
 *
 * ```javascript
 *  query.on('change', function(evt) {
 *    if (evt.type === 'insert') {
 *       var newItem = evt.target;
 *       var allData = query.data;
 *    }
 *  });
 * ```
 *
 * Note that `query.on('change:insert', function(evt) {}` is also supported.
 *
 * ### 3. Remove Events
 *
 * A Conversation or Message was deleted. This may have been deleted locally by your user, or it may have been remotely deleted, a notification received via websocket, and removed from the Query results.
 *
 * The layer.LayerEvent.target property contains the removed object.
 *
 * ```javascript
 * query.on('change', function(evt) {
 *   if (evt.type === 'remove') {
 *       var removedItem = evt.target;
 *       var allData = query.data;
 *   }
 * });
 * ```
 *
 * Note that `query.on('change:remove', function(evt) {}` is also supported.
 *
 * ### 4. Reset Events
 *
 * Any time your query's model or predicate properties have been changed
 * the query is reset, and a new request is sent to the server.  The reset event informs your UI that the current result set is empty, and that the reason its empty is that it was `reset`.  This helps differentiate it from a `data` event that returns an empty array.
 *
 * ```javascript
 * query.on('change', function(evt) {
 *   if (evt.type === 'reset') {
 *       var allData = query.data; // []
 *   }
 * });
 * ```
 *
 * Note that `query.on('change:reset', function(evt) {}` is also supported.
 *
 * ### 5. Property Events
 *
 * If any properties change in any of the objects listed in your layer.Query.data property, a `property` event will be fired.
 *
 * The layer.LayerEvent.target property contains object that was modified.
 *
 * See layer.LayerEvent.changes for details on how changes are reported.
 *
 * ```javascript
 * query.on('change', function(evt) {
 *   if (evt.type === 'property') {
 *       var changedItem = evt.target;
 *       var isReadChanges = evt.getChangesFor('isRead');
 *       var recipientStatusChanges = evt.getChangesFor('recipientStatus');
 *       if (isReadChanges.length) {
 *           ...
 *       }
 *
 *       if (recipientStatusChanges.length) {
 *           ...
 *       }
 *   }
 * });
 *```
 * Note that `query.on('change:property', function(evt) {}` is also supported.
 *
 * @class  layer.Query
 * @extends layer.Root
 *
 */
var Root = require('./root');
var LayerError = require('./layer-error');
var Util = require('./client-utils');
var Logger = require('./logger');

var CONVERSATION = 'Conversation';
var MESSAGE = 'Message';
var findConvIdRegex = new RegExp(/^conversation.id\s*=\s*['"]((temp_)?layer:\/\/\/conversations\/.{8}-.{4}-.{4}-.{4}-.{12})['"]$/);

var Query = function (_Root) {
  _inherits(Query, _Root);

  function Query() {
    _classCallCheck(this, Query);

    var options = undefined;
    if (arguments.length === 2) {
      options = (arguments.length <= 1 ? undefined : arguments[1]).build();
      options.client = arguments.length <= 0 ? undefined : arguments[0];
    } else {
      options = arguments.length <= 0 ? undefined : arguments[0];
    }
    if ('paginationWindow' in options) {
      var paginationWindow = options.paginationWindow;
      options.paginationWindow = Math.min(Query.MaxPageSize, options.paginationWindow);
      if (options.paginationWindow !== paginationWindow) {
        Logger.warn('paginationWindow value ' + paginationWindow + ' in Query constructor ' + ('excedes Query.MaxPageSize of ' + Query.MaxPageSize));
      }
    }

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Query).call(this, options));

    _this.data = [];
    _this._initialPaginationWindow = _this.paginationWindow;
    if (!_this.client) throw new Error(LayerError.dictionary.clientMissing);
    _this.client.on('all', _this._handleChangeEvents, _this);

    if (!_this.client.isReady) {
      _this.client.once('ready', function () {
        return _this._run();
      }, _this);
    } else {
      _this._run();
    }
    return _this;
  }

  /**
   * Cleanup and remove this Query, its subscriptions and data.
   *
   * @method destroy
   */


  _createClass(Query, [{
    key: 'destroy',
    value: function destroy() {
      this.client.off(null, null, this);
      this.client._removeQuery(this);
      this.data = null;
      _get(Object.getPrototypeOf(Query.prototype), 'destroy', this).call(this);
    }

    /**
     * Updates properties of the Query.
     *
     * Currently supports updating:
     *
     * * paginationWindow
     * * predicate
     * * model
     *
     * Any change to predicate or model results in clearing all data from the
     * query's results and triggering a change event with [] as the new data.
     *
     * @method update
     * @param  {Object} options
     * @param {string} [options.predicate] - A new predicate for the query
     * @param {string} [options.model] - A new model for the Query
     * @param {number} [paginationWindow] - Increase/decrease our result size to match this pagination window.
     * @return {layer.Query} this
     */

  }, {
    key: 'update',
    value: function update() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var needsRefresh = undefined,
          needsRecreate = undefined;

      var optionsBuilt = typeof options.build === 'function' ? options.build() : options;

      if ('paginationWindow' in optionsBuilt && this.paginationWindow !== optionsBuilt.paginationWindow) {
        this.paginationWindow = Math.min(Query.MaxPageSize + this.size, optionsBuilt.paginationWindow);
        if (this.paginationWindow < optionsBuilt.paginationWindow) {
          Logger.warn('paginationWindow value ' + optionsBuilt.paginationWindow + ' in Query.update() increases size greater than Query.MaxPageSize of ' + Query.MaxPageSize);
        }
        needsRefresh = true;
      }
      if ('predicate' in optionsBuilt && this.predicate !== optionsBuilt.predicate) {
        this.predicate = optionsBuilt.predicate || '';
        needsRecreate = true;
      }
      if ('model' in optionsBuilt && this.model !== optionsBuilt.model) {
        this.model = optionsBuilt.model;
        needsRecreate = true;
      }
      if ('sortBy' in optionsBuilt && JSON.stringify(this.sortBy) !== JSON.stringify(optionsBuilt.sortBy)) {
        this.sortBy = optionsBuilt.sortBy;
        needsRecreate = true;
      }
      if (needsRecreate) {
        this._reset();
      }
      if (needsRecreate || needsRefresh) this._run();
      return this;
    }

    /**
     * After redefining the query, reset it: remove all data/reset all state.
     *
     * @method _reset
     * @private
     */

  }, {
    key: '_reset',
    value: function _reset() {
      this.totalSize = 0;
      var data = this.data;
      this.data = [];
      this.client._checkCache(data);
      this.isFiring = false;
      this._predicate = null;
      this.paginationWindow = this._initialPaginationWindow;
      this._triggerChange({
        data: [],
        type: 'reset'
      });
    }

    /**
     * Reset your query to its initial state and then rerun it.
     *
     * @method reset
     */

  }, {
    key: 'reset',
    value: function reset() {
      this._reset();
      this._run();
    }

    /**
     * Execute the query.
     *
     * No, don't murder it, just fire it.  No, don't make it unemployed,
     * just connect to the server and get the results.
     *
     * @method _run
     * @private
     */

  }, {
    key: '_run',
    value: function _run() {
      // Find the number of items we need to request.
      var pageSize = Math.min(this.paginationWindow - this.size, Query.MaxPageSize);

      // If there is a reduction in pagination window, then this variable will be negative, and we can shrink
      // the data.
      if (pageSize < 0) {
        var removedData = this.data.slice(this.paginationWindow);
        this.data = this.data.slice(0, this.paginationWindow);
        this.client._checkCache(removedData);
        this._triggerAsync('change', { data: [] });
      } else if (pageSize === 0) {
        // No need to load 0 results.
      } else if (this.model === CONVERSATION) {
          this._runConversation(pageSize);
        } else if (this.model === MESSAGE && this.predicate) {
          this._runMessage(pageSize);
        }
    }

    /**
     * Get Conversations from the server.
     *
     * @method _runConversation
     * @private
     * @param  {number} pageSize - Number of new results to request
     */

  }, {
    key: '_runConversation',
    value: function _runConversation(pageSize) {
      var _this2 = this;

      // This is a pagination rather than an initial request if there is already data; get the fromId
      // which is the id of the last result.
      var lastConversation = this.data[this.data.length - 1];
      var lastConversationInstance = !lastConversation ? null : this._getInstance(lastConversation);
      var fromId = lastConversationInstance && lastConversationInstance.isSaved() ? '&from_id=' + lastConversationInstance.id : '';
      var sortBy = this._getSortField();

      this.isFiring = true;
      var firingRequest = this._firingRequest = 'conversations?sort_by=' + sortBy + '&page_size=' + pageSize + fromId;
      this.client.xhr({
        url: firingRequest,
        method: 'GET',
        sync: false
      }, function (results) {
        return _this2._processRunResults(results, firingRequest);
      });
    }

    /**
     * Returns the sort field for the query.
     *
     * Returns One of:
     *
     * * 'position' (Messages only)
     * * 'last_message' (Conversations only)
     * * 'created_at' (Conversations only)
     * @method _getSortField
     * @private
     */

  }, {
    key: '_getSortField',
    value: function _getSortField() {
      if (this.model === MESSAGE) return 'position';
      if (this.sortBy && this.sortBy[0] && this.sortBy[0]['lastMessage.sentAt']) return 'last_message';
      return 'created_at';
    }

    /**
     * Get the Conversation UUID from the predicate property.
     *
     * Extract the Conversation's UUID from the predicate... or returned the cached value.
     *
     * @method _getConversationUUID
     * @private
     */

  }, {
    key: '_getConversationPredicateIds',
    value: function _getConversationPredicateIds() {
      if (this.predicate.match(findConvIdRegex)) {
        var conversationId = this.predicate.replace(findConvIdRegex, '$1');

        // We will already have a this._predicate if we are paging; else we need to extract the UUID from
        // the conversationId.
        var uuid = (this._predicate || conversationId).replace(/^(temp_)?layer\:\/\/\/conversations\//, '');
        if (uuid) {
          return {
            uuid: uuid,
            id: conversationId
          };
        }
      }
    }

    /**
     * Get Messages from the server.
     *
     * @method _runMessage
     * @private
     * @param  {number} pageSize - Number of new results to request
     */

  }, {
    key: '_runMessage',
    value: function _runMessage(pageSize) {
      var _this3 = this;

      // This is a pagination rather than an initial request if there is already data; get the fromId
      // which is the id of the last result.
      var lastMessage = this.data[this.data.length - 1];
      var lastMessageInstance = !lastMessage ? null : this._getInstance(lastMessage);
      var fromId = lastMessageInstance && lastMessageInstance.isSaved() ? '&from_id=' + lastMessageInstance.id : '';
      var predicateIds = this._getConversationPredicateIds();

      // Do nothing if we don't have a conversation to query on
      if (predicateIds) {
        (function () {
          var conversationId = 'layer:///conversations/' + predicateIds.uuid;
          if (!_this3._predicate) _this3._predicate = predicateIds.id;
          var conversation = _this3.client.getConversation(conversationId);

          // If the only Message is the Conversation's lastMessage, then we probably got this
          // result from `GET /conversations`, and not from `GET /messages`.  Get ALL Messages,
          // not just messages after the `lastMessage` if we've never received any messages from
          // `GET /messages` (safety code, not required code).  This also means that the first
          // Query gets MAX_PAGE_SIZE results instead of MAX_PAGE_SIZE + 1 results.
          if (conversation && conversation.lastMessage && lastMessage && lastMessage.id === conversation.lastMessage.id) {
            fromId = '';
          }

          // If the last message we have loaded is already the Conversation's lastMessage, then just request data without paging,
          // common occurence when query is populated with only a single result: conversation.lastMessage.
          // if (conversation && conversation.lastMessage && lastMessage && lastMessage.id === conversation.lastMessage.id) fromId = '';
          var newRequest = 'conversations/' + predicateIds.uuid + '/messages?page_size=' + pageSize + fromId;

          // Don't query on temporary ids, nor repeat still firing queries
          if (!_this3._predicate.match(/temp_/) && newRequest !== _this3._firingRequest) {
            _this3.isFiring = true;
            _this3._firingRequest = newRequest;
            _this3.client.xhr({
              url: newRequest,
              method: 'GET',
              sync: false
            }, function (results) {
              return _this3._processRunResults(results, newRequest);
            });
          }

          // If there are no results, then its a new query; automatically populate it with the Conversation's lastMessage.
          if (_this3.data.length === 0) {
            if (conversation && conversation.lastMessage) {
              _this3.data = [_this3._getData(conversation.lastMessage)];
              // Trigger the change event
              _this3._triggerChange({
                type: 'data',
                data: _this3._getData(conversation.lastMessage),
                query: _this3,
                target: _this3.client
              });
            }
          }
        })();
      } else if (!this.predicate.match(/['"]/)) {
        Logger.error('This query may need to quote its value');
      }
    }

    /**
     * Process the results of the `_run` method; calls __appendResults.
     *
     * @method _processRunResults
     * @private
     * @param  {Object} results - Full xhr response object with server results
     */

  }, {
    key: '_processRunResults',
    value: function _processRunResults(results, requestUrl) {
      var _this4 = this;

      if (requestUrl !== this._firingRequest || this.isDestroyed) return;

      this.isFiring = false;
      this._firingRequest = '';
      if (results.success) {

        // If there are results, use them
        if (results.data.length) {
          this._retryCount = 0;
          this._appendResults(results);
          this.totalSize = Number(results.xhr.getResponseHeader('Layer-Count') || 0);
        }

        // If there are no results, and we have no results, there may be data still syncing to the server; so poll for a bit
        else if (this.size === 0) {
            if (this._retryCount < Query.MaxRetryCount) {
              setTimeout(function () {
                _this4._retryCount++;
                _this4._run();
              }, 1500);
            }

            // We've polled for a bit.  No data.  Presume there is in fact no data
            else {
                this._retryCount = 0;
                this._triggerChange({
                  type: 'data',
                  data: [],
                  query: this,
                  target: this.client
                });
              }
          }
      } else {
        this.trigger('error', { error: results.data });
      }
    }

    /**
     * Appends arrays of data to the Query results.
     *
     * @method  _appendResults
     * @private
     */

  }, {
    key: '_appendResults',
    value: function _appendResults(results) {
      var _this5 = this;

      // For all results, register them with the client
      // If already registered with the client, properties will be updated as needed
      results.data.forEach(function (item) {
        return _this5.client._createObject(item);
      });

      // Filter results to just the new results
      var newResults = results.data.filter(function (item) {
        return _this5._getIndex(item.id) === -1;
      });

      // Update this.data
      if (this.dataType === Query.ObjectDataType) {
        this.data = [].concat(this.data);
      }
      var data = this.data;
      newResults.forEach(function (itemIn) {
        var index = undefined;
        var item = _this5.client._getObject(itemIn.id);
        if (_this5.model === MESSAGE) {
          index = _this5._getInsertMessageIndex(item, data);
        } else {
          index = _this5._getInsertConversationIndex(item, data);
        }
        data.splice(index, 0, _this5._getData(item));
      });

      // Trigger the change event
      this._triggerChange({
        type: 'data',
        data: results.data.map(function (item) {
          return _this5._getData(_this5.client._getObject(item.id));
        }),
        query: this,
        target: this.client
      });
    }

    /**
     * Returns a correctly formatted object representing a result.
     *
     * Format is specified by the `dataType` property.
     *
     * @method _getData
     * @private
     * @param  {layer.Root} item - Conversation or Message instance
     * @return {Object} - Conversation or Message instance or Object
     */

  }, {
    key: '_getData',
    value: function _getData(item) {
      if (this.dataType === Query.ObjectDataType) {
        return item.toObject();
      }
      return item;
    }

    /**
     * Returns an instance regardless of whether the input is instance or object
     * @method
     * @private
     * @param {layer.Root|Object} item - Conversation or Message object/instance
     * @return {layer.Root}
     */

  }, {
    key: '_getInstance',
    value: function _getInstance(item) {
      if (item instanceof Root) return item;
      return this.client._getObject(item.id);
    }

    /**
     * Ask the query for the item matching the ID.
     *
     * Returns undefined if the ID is not found.
     *
     * @method _getItem
     * @private
     * @param  {string} id
     * @return {Object} Conversation or Message object or instance
     */

  }, {
    key: '_getItem',
    value: function _getItem(id) {
      switch (Util.typeFromID(id)) {
        case 'messages':
          if (this.model === MESSAGE) {
            var index = this._getIndex(id);
            return index === -1 ? null : this.data[index];
          } else if (this.model === CONVERSATION) {
            for (var index = 0; index < this.data.length; index++) {
              var conversation = this.data[index];
              if (conversation.lastMessage && conversation.lastMessage.id === id) return conversation.lastMessage;
            }
            return null;
          }
          break;
        case 'conversations':
          if (this.model === CONVERSATION) {
            var index = this._getIndex(id);
            return index === -1 ? null : this.data[index];
          }
          break;
      }
    }

    /**
     * Get the index of the item represented by the specified ID; or return -1.
     *
     * @method _getIndex
     * @private
     * @param  {string} id
     * @return {number}
     */

  }, {
    key: '_getIndex',
    value: function _getIndex(id) {
      for (var index = 0; index < this.data.length; index++) {
        if (this.data[index].id === id) return index;
      }
      return -1;
    }

    /**
     * Handle any change event received from the layer.Client.
     *
     * These can be caused by websocket events, as well as local
     * requests to create/delete/modify Conversations and Messages.
     *
     * The event does not necessarily apply to this Query, but the Query
     * must examine it to determine if it applies.
     *
     * @method _handleChangeEvents
     * @private
     * @param {string} eventName - "messages:add", "conversations:change"
     * @param {layer.LayerEvent} evt
     */

  }, {
    key: '_handleChangeEvents',
    value: function _handleChangeEvents(eventName, evt) {
      if (this.model === CONVERSATION) {
        this._handleConversationEvents(evt);
      } else {
        this._handleMessageEvents(evt);
      }
    }
  }, {
    key: '_handleConversationEvents',
    value: function _handleConversationEvents(evt) {
      switch (evt.eventName) {

        // If a Conversation's property has changed, and the Conversation is in this
        // Query's data, then update it.
        case 'conversations:change':
          this._handleConversationChangeEvent(evt);
          break;

        // If a Conversation is added, and it isn't already in the Query,
        // add it and trigger an event
        case 'conversations:add':
          this._handleConversationAddEvent(evt);
          break;

        // If a Conversation is deleted, and its still in our data,
        // remove it and trigger an event.
        case 'conversations:remove':
          this._handleConversationRemoveEvent(evt);
          break;
      }
    }

    // TODO WEB-968: Refactor this into functions for instance, object, sortBy createdAt, sortBy lastMessage

  }, {
    key: '_handleConversationChangeEvent',
    value: function _handleConversationChangeEvent(evt) {
      var index = this._getIndex(evt.target.id);

      // If its an ID change (from temp to non-temp id) make sure to update our data.
      // If dataType is an instance, its been updated for us.
      if (this.dataType === Query.ObjectDataType) {
        var idChanges = evt.getChangesFor('id');
        if (idChanges.length) {
          index = this._getIndex(idChanges[0].oldValue);
        }
      }

      // If dataType is "object" then update the object and our array;
      // else the object is already updated.
      // Ignore results that aren't already in our data; Results are added via
      // conversations:add events.  Websocket Manager automatically loads anything that receives an event
      // for which we have no object, so we'll get the add event at that time.
      if (index !== -1) {
        var sortField = this._getSortField();
        var reorder = evt.hasProperty('lastMessage') && sortField === 'last_message';

        if (this.dataType === Query.ObjectDataType) {
          if (!reorder) {
            // Replace the changed Conversation with a new immutable object
            this.data = [].concat(_toConsumableArray(this.data.slice(0, index)), [evt.target.toObject()], _toConsumableArray(this.data.slice(index + 1)));
          } else {
            // Move the changed Conversation to the top of the list
            this.data.splice(index, 1);
            this.data = [evt.target.toObject()].concat(_toConsumableArray(this.data));
          }
        }

        // Else dataType is instance not object
        else {
            if (reorder) {
              this.data.splice(index, 1);
              this.data.unshift(evt.target);
            }
          }

        // Trigger a 'property' event
        this._triggerChange({
          type: 'property',
          target: this._getData(evt.target),
          query: this,
          isChange: true,
          changes: evt.changes
        });
      }
    }
  }, {
    key: '_getInsertConversationIndex',
    value: function _getInsertConversationIndex(conversation, data) {
      var sortField = this._getSortField();
      var index = undefined;
      if (sortField === 'created_at') {
        for (index = 0; index < data.length; index++) {
          if (conversation.createdAt >= data[index].createdAt) break;
        }
        return index;
      } else {
        var d1 = conversation.lastMessage ? conversation.lastMessage.sentAt : conversation.createdAt;
        for (index = 0; index < data.length; index++) {
          var d2 = data[index].lastMessage ? data[index].lastMessage.sentAt : data[index].createdAt;
          if (d1 >= d2) break;
        }
        return index;
      }
    }
  }, {
    key: '_getInsertMessageIndex',
    value: function _getInsertMessageIndex(message, data) {
      var index = undefined;
      for (index = 0; index < data.length; index++) {
        if (message.position > data[index].position) {
          break;
        }
      }
      return index;
    }
  }, {
    key: '_handleConversationAddEvent',
    value: function _handleConversationAddEvent(evt) {
      var _this6 = this;

      // Filter out any Conversations already in our data
      var list = evt.conversations.filter(function (conversation) {
        return _this6._getIndex(conversation.id) === -1;
      });

      if (list.length) {
        (function () {
          var data = _this6.data;
          list.forEach(function (conversation) {
            var newIndex = _this6._getInsertConversationIndex(conversation, data);
            data.splice(newIndex, 0, _this6._getData(conversation));
          });

          // Whether sorting by last_message or created_at, new results go at the top of the list
          if (_this6.dataType === Query.ObjectDataType) {
            _this6.data = [].concat(data);
          }
          _this6.totalSize += list.length;

          // Trigger an 'insert' event for each item added;
          // typically bulk inserts happen via _appendResults().
          list.forEach(function (conversation) {
            var item = _this6._getData(conversation);
            _this6._triggerChange({
              type: 'insert',
              index: _this6.data.indexOf(item),
              target: item,
              query: _this6
            });
          });
        })();
      }
    }
  }, {
    key: '_handleConversationRemoveEvent',
    value: function _handleConversationRemoveEvent(evt) {
      var _this7 = this;

      var removed = [];
      evt.conversations.forEach(function (conversation) {
        var index = _this7._getIndex(conversation.id);
        if (index !== -1) {
          removed.push({
            data: conversation,
            index: index
          });
          if (_this7.dataType === Query.ObjectDataType) {
            _this7.data = [].concat(_toConsumableArray(_this7.data.slice(0, index)), _toConsumableArray(_this7.data.slice(index + 1)));
          } else {
            _this7.data.splice(index, 1);
          }
        }
      });

      this.totalSize -= removed.length;
      removed.forEach(function (removedObj) {
        _this7._triggerChange({
          type: 'remove',
          index: removedObj.index,
          target: _this7._getData(removedObj.data),
          query: _this7
        });
      });
    }
  }, {
    key: '_handleMessageEvents',
    value: function _handleMessageEvents(evt) {
      switch (evt.eventName) {

        // If a Conversation's ID has changed, check our predicate, and update it automatically if needed.
        case 'conversations:change':
          this._handleMessageConvIdChangeEvent(evt);
          break;

        // If a Message has changed and its in our result set, replace
        // it with a new immutable object
        case 'messages:change':
        case 'messages:read':
          this._handleMessageChangeEvent(evt);
          break;

        // If Messages are added, and they aren't already in our result set
        // add them.
        case 'messages:add':
          this._handleMessageAddEvent(evt);
          break;

        // If a Message is deleted and its in our result set, remove it
        // and trigger an event
        case 'messages:remove':
          this._handleMessageRemoveEvent(evt);
          break;
      }
    }
  }, {
    key: '_handleMessageConvIdChangeEvent',
    value: function _handleMessageConvIdChangeEvent(evt) {
      var cidChanges = evt.getChangesFor('id');
      if (cidChanges.length) {
        if (this._predicate === cidChanges[0].oldValue) {
          this._predicate = cidChanges[0].newValue;
          this.predicate = "conversation.id = '" + this._predicate + "'";
          this._run();
        }
      }
    }

    /**
     * If the ID of the message has changed, then the position property has likely changed as well.
     *
     * This method tests to see if changes to the position property have impacted the message's position in the
     * data array... and updates the array if it has.
     *
     * @method _handleMessagePositionChange
     * @private
     * @param {layer.LayerEvent} evt  A Message Change event
     * @param {number} index  Index of the message in the current data array
     * @return {boolean} True if a data was changed and a change event was emitted
     */

  }, {
    key: '_handleMessagePositionChange',
    value: function _handleMessagePositionChange(evt, index) {
      // If the message is not in the current data, then there is no change to our query results.
      if (index === -1) return false;

      // Create an array without our data item and then find out where the data item Should be inserted.
      // Note: we could just lookup the position in our current data array, but its too easy to introduce
      // errors where comparing this message to itself may yield index or index + 1.
      var newData = [].concat(_toConsumableArray(this.data.slice(0, index)), _toConsumableArray(this.data.slice(index + 1)));
      var newIndex = this._getInsertMessageIndex(evt.target, newData);

      // If the data item goes in the same index as before, then there is no change to be handled here;
      // else insert the item at the right index, update this.data and fire a change event
      if (newIndex !== index) {
        newData.splice(newIndex, 0, this._getData(evt.target));
        this.data = newData;
        this._triggerChange({
          type: 'property',
          target: this._getData(evt.target),
          query: this,
          isChange: true,
          changes: evt.changes
        });
        return true;
      }
    }
  }, {
    key: '_handleMessageChangeEvent',
    value: function _handleMessageChangeEvent(evt) {
      var index = this._getIndex(evt.target.id);
      var midChanges = evt.getChangesFor('id');

      if (midChanges.length) {
        if (this.dataType === Query.ObjectDataType) index = this._getIndex(midChanges[0].oldValue);
        if (this._handleMessagePositionChange(evt, index)) return;
      }

      if (evt.target.conversationId === this._predicate && index !== -1) {
        if (this.dataType === Query.ObjectDataType) {
          this.data = [].concat(_toConsumableArray(this.data.slice(0, index)), [evt.target.toObject()], _toConsumableArray(this.data.slice(index + 1)));
        }
        this._triggerChange({
          type: 'property',
          target: this._getData(evt.target),
          query: this,
          isChange: true,
          changes: evt.changes
        });
      }
    }
  }, {
    key: '_handleMessageAddEvent',
    value: function _handleMessageAddEvent(evt) {
      var _this8 = this;

      // Only use added messages that are part of this Conversation
      // and not already in our result set
      var list = evt.messages.filter(function (message) {
        return message.conversationId === _this8._predicate;
      }).filter(function (message) {
        return _this8._getIndex(message.id) === -1;
      }).map(function (message) {
        return _this8._getData(message);
      });

      // Add them to our result set and trigger an event for each one
      if (list.length) {
        (function () {
          var data = _this8.data = _this8.dataType === Query.ObjectDataType ? [].concat(_this8.data) : _this8.data;
          list.forEach(function (item) {
            var index = _this8._getInsertMessageIndex(item, data);
            data.splice(index, 0, item);
          });

          _this8.totalSize += list.length;

          // Index calculated above may shift after additional insertions.  This has
          // to be done after the above insertions have completed.
          list.forEach(function (item) {
            _this8._triggerChange({
              type: 'insert',
              index: _this8.data.indexOf(item),
              target: item,
              query: _this8
            });
          });
        })();
      }
    }
  }, {
    key: '_handleMessageRemoveEvent',
    value: function _handleMessageRemoveEvent(evt) {
      var _this9 = this;

      var removed = [];
      evt.messages.forEach(function (message) {
        var index = _this9._getIndex(message.id);
        if (index !== -1) {
          removed.push({
            data: message,
            index: index
          });
          if (_this9.dataType === Query.ObjectDataType) {
            _this9.data = [].concat(_toConsumableArray(_this9.data.slice(0, index)), _toConsumableArray(_this9.data.slice(index + 1)));
          } else {
            _this9.data.splice(index, 1);
          }
        }
      });

      this.totalSize -= removed.length;
      removed.forEach(function (removedObj) {
        _this9._triggerChange({
          type: 'remove',
          target: _this9._getData(removedObj.data),
          index: removedObj.index,
          query: _this9
        });
      });
    }
  }, {
    key: '_triggerChange',
    value: function _triggerChange(evt) {
      this.trigger('change', evt);
      this.trigger('change:' + evt.type, evt);
    }
  }]);

  return Query;
}(Root);

Query.prefixUUID = 'layer:///queries/';

/**
 * Query for Conversations.
 *
 * Use this value in the model property.
 * @type {string}
 * @static
 */
Query.Conversation = CONVERSATION;

/**
 * Query for Messages.
 *
 * Use this value in the model property.
 * @type {string}
 * @static
 */
Query.Message = MESSAGE;

/**
 * Get data as POJOs/immutable objects.
 *
 * Your Query data and events will provide Messages/Conversations as objects.
 * @type {string}
 * @static
 */
Query.ObjectDataType = 'object';

/**
 * Get data as instances of layer.Message and layer.Conversation.
 *
 * Your Query data and events will provide Messages/Conversations as instances.
 * @type {string}
 * @static
 */
Query.InstanceDataType = 'instance';

/**
 * Set the maximum page size for queries.
 *
 * @type {number}
 * @static
 */
Query.MaxPageSize = 100;

/**
 * Access the number of results currently loaded.
 *
 * @type {Number}
 */
Object.defineProperty(Query.prototype, 'size', {
  enumerable: true,
  get: function get() {
    return !this.data ? 0 : this.data.length;
  }
});

/** Access the total number of results on the server.
 *
 * Will be 0 until the first query has successfully loaded results.
 *
 * @type {Number}
 */
Query.prototype.totalSize = 0;

/**
 * Access to the client so it can listen to websocket and local events.
 *
 * @type {layer.Client}
 * @protected
 */
Query.prototype.client = null;

/**
 * Query results.
 *
 * Array of data resulting from the Query; either a layer.Root subclass.
 *
 * or plain Objects
 * @type {Object[]}
 */
Query.prototype.data = null;

/**
 * Specifies the type of data being queried for.
 *
 * Model is one of
 * * layer.Query.Conversation
 * * layer.Query.Message
 *
 * @type {String}
 */
Query.prototype.model = CONVERSATION;

/**
 * What type of results to request of the server.
 *
 * Not yet supported; returnType is one of
 *
 * * object
 * * id
 * * count
 *
 * This Query API is designed only for use with 'object'.
 * @type {String}
 */
Query.prototype.returnType = 'object';

/**
 * Specify what kind of data array your application requires.
 *
 * Used to specify query dataType.  One of
 * * Query.ObjectDataType
 * * Query.InstanceDataType
 *
 * @type {String}
 */
Query.prototype.dataType = Query.InstanceDataType;

/**
 * Number of results from the server to request/cache.
 *
 * The pagination window can be increased to download additional items, or decreased to purge results
 * from the data property.
 *
 *     query.update({
 *       paginationWindow: 150
 *     })
 *
 * This call will load 150 results.  If it previously had 100,
 * then it will load 50 more. If it previously had 200, it will drop 50.
 *
 * Note that the server will only permit 100 at a time, so
 * setting a large pagination window may result in many
 * requests to the server to reach the specified page value.
 * @type {Number}
 */
Query.prototype.paginationWindow = 100;

/**
 * Sorting criteria for Conversation Queries.
 *
 * Only supports an array of one field/element.
 * Only supports the following options:
 *
 *     [{'createdAt': 'desc'}]
 *     [{'lastMessage.sentAt': 'desc'}]
 *
 * Why such limitations? Why this structure?  The server will be exposing a Query API at which point the
 * above sort options will make a lot more sense, and full sorting will be provided.
 *
 * @type {String}
 */
Query.prototype.sortBy = null;

/**
 * This value tells us what to reset the paginationWindow to when the query is redefined.
 *
 * @type {Number}
 * @private
 */
Query.prototype._initialPaginationWindow = 100;

/**
 * Your Query's WHERE clause.
 *
 * Currently, the only query supported is "conversation.id = 'layer:///conversations/uuid'"
 * Note that both ' and " are supported.
 * @type {string}
 */
Query.prototype.predicate = null;

/**
 * True if the Query is connecting to the server.
 *
 * It is not gaurenteed that every update(); for example, updating a paginationWindow to be smaller,
 * Or changing a value to the existing value would cause the request not to fire.
 * R ecommended pattern is:
 *
 *      query.update({paginationWindow: 50});
 *      if (!query.isFiring) {
 *        alert("Done");
 *      } else {
 *          query.on("change", function(evt) {
 *            if (evt.type == "data") alert("Done");
 *          });
 *      }
 *
 * @type {Boolean}
 */
Query.prototype.isFiring = false;

/**
 * The last request fired.
 *
 * If multiple requests are inflight, the response
 * matching this request is the ONLY response we will process.
 * @type {String}
 * @private
 */
Query.prototype._firingRequest = '';

Query.prototype._retryCount = 0;

/**
 * In the event that a new Query gets no data, retry the query a few times.
 *
 * Why use this?  Lets say a user has been added to a long running Conversation.
 * The conversation arrives, but the server is still syncing Messages for this user,
 * and it may take a few tries before the server has finished populating the Messages of the new Conversation.
 * How many retries is up to each developer; but 10 is a good number to start with.
 * After 10 retries, if no data shows up, then the query will assume that there is no data,
 * and trigger its `change` event with `data: []`.
 *
 * Why not use this? Because it delays the completion event, and is not a common occurance
 * for most applications.
 *
 * @type {Number}
 * @static
 */
Query.MaxRetryCount = 0;

Query._supportedEvents = [
/**
 * The query data has changed; any change event will cause this event to trigger.
 * @event change
 */
'change',

/**
 * A new page of data has been loaded from the server
 * @event 'change:data'
 */
'change:data',

/**
 * All data for this query has been reset due to a change in the Query predicate.
 * @event 'change:reset'
 */
'change:reset',

/**
 * An item of data within this Query has had a property change its value.
 * @event 'change:property'
 */
'change:property',

/**
 * A new item of data has been inserted into the Query. Not triggered by loading
 * a new page of data from the server, but is triggered by locally creating a matching
 * item of data, or receiving a new item of data via websocket.
 * @event 'change:insert'
 */
'change:insert',

/**
 * An item of data has been removed from the Query. Not triggered for every removal, but
 * is triggered by locally deleting a result, or receiving a report of deletion via websocket.
 * @event 'change:remove'
 */
'change:remove',

/**
 * The query data failed to load from the server.
 * @event error
 */
'error'].concat(Root._supportedEvents);

Root.initClass.apply(Query, [Query, 'Query']);

module.exports = Query;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9xdWVyeS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQThLQSxJQUFNLE9BQU8sUUFBUSxRQUFSLENBQVA7QUFDTixJQUFNLGFBQWEsUUFBUSxlQUFSLENBQWI7QUFDTixJQUFNLE9BQU8sUUFBUSxnQkFBUixDQUFQO0FBQ04sSUFBTSxTQUFTLFFBQVEsVUFBUixDQUFUOztBQUVOLElBQU0sZUFBZSxjQUFmO0FBQ04sSUFBTSxVQUFVLFNBQVY7QUFDTixJQUFNLGtCQUFrQixJQUFJLE1BQUosQ0FDdEIsZ0dBRHNCLENBQWxCOztJQUdBOzs7QUFFSixXQUZJLEtBRUosR0FBcUI7MEJBRmpCLE9BRWlCOztBQUNuQixRQUFJLG1CQUFKLENBRG1CO0FBRW5CLFFBQUksVUFBSyxNQUFMLEtBQWdCLENBQWhCLEVBQW1CO0FBQ3JCLGdCQUFVLG1EQUFRLEtBQVIsRUFBVixDQURxQjtBQUVyQixjQUFRLE1BQVIsb0RBRnFCO0tBQXZCLE1BR087QUFDTCxpRUFESztLQUhQO0FBTUEsUUFBSSxzQkFBc0IsT0FBdEIsRUFBK0I7QUFDakMsVUFBTSxtQkFBbUIsUUFBUSxnQkFBUixDQURRO0FBRWpDLGNBQVEsZ0JBQVIsR0FBMkIsS0FBSyxHQUFMLENBQVMsTUFBTSxXQUFOLEVBQW1CLFFBQVEsZ0JBQVIsQ0FBdkQsQ0FGaUM7QUFHakMsVUFBSSxRQUFRLGdCQUFSLEtBQTZCLGdCQUE3QixFQUErQztBQUNqRCxlQUFPLElBQVAsQ0FBWSw0QkFBMEIsMkNBQTFCLHNDQUNzQixNQUFNLFdBQU4sQ0FEdEIsQ0FBWixDQURpRDtPQUFuRDtLQUhGOzt1RUFWRSxrQkFtQkksVUFqQmE7O0FBa0JuQixVQUFLLElBQUwsR0FBWSxFQUFaLENBbEJtQjtBQW1CbkIsVUFBSyx3QkFBTCxHQUFnQyxNQUFLLGdCQUFMLENBbkJiO0FBb0JuQixRQUFJLENBQUMsTUFBSyxNQUFMLEVBQWEsTUFBTSxJQUFJLEtBQUosQ0FBVSxXQUFXLFVBQVgsQ0FBc0IsYUFBdEIsQ0FBaEIsQ0FBbEI7QUFDQSxVQUFLLE1BQUwsQ0FBWSxFQUFaLENBQWUsS0FBZixFQUFzQixNQUFLLG1CQUFMLE9BQXRCLEVBckJtQjs7QUF1Qm5CLFFBQUksQ0FBQyxNQUFLLE1BQUwsQ0FBWSxPQUFaLEVBQXFCO0FBQ3hCLFlBQUssTUFBTCxDQUFZLElBQVosQ0FBaUIsT0FBakIsRUFBMEI7ZUFBTSxNQUFLLElBQUw7T0FBTixPQUExQixFQUR3QjtLQUExQixNQUVPO0FBQ0wsWUFBSyxJQUFMLEdBREs7S0FGUDtpQkF2Qm1CO0dBQXJCOzs7Ozs7Ozs7ZUFGSTs7OEJBcUNNO0FBQ1IsV0FBSyxNQUFMLENBQVksR0FBWixDQUFnQixJQUFoQixFQUFzQixJQUF0QixFQUE0QixJQUE1QixFQURRO0FBRVIsV0FBSyxNQUFMLENBQVksWUFBWixDQUF5QixJQUF6QixFQUZRO0FBR1IsV0FBSyxJQUFMLEdBQVksSUFBWixDQUhRO0FBSVIsaUNBekNFLDZDQXlDRixDQUpROzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzZCQTBCVztVQUFkLGdFQUFVLGtCQUFJOztBQUNuQixVQUFJLHdCQUFKO1VBQ0UseUJBREYsQ0FEbUI7O0FBSW5CLFVBQU0sZUFBZSxPQUFRLFFBQVEsS0FBUixLQUFrQixVQUF6QixHQUF1QyxRQUFRLEtBQVIsRUFBeEMsR0FBMEQsT0FBMUQsQ0FKRjs7QUFNbkIsVUFBSSxzQkFBc0IsWUFBdEIsSUFBc0MsS0FBSyxnQkFBTCxLQUEwQixhQUFhLGdCQUFiLEVBQStCO0FBQ2pHLGFBQUssZ0JBQUwsR0FBd0IsS0FBSyxHQUFMLENBQVMsTUFBTSxXQUFOLEdBQW9CLEtBQUssSUFBTCxFQUFXLGFBQWEsZ0JBQWIsQ0FBaEUsQ0FEaUc7QUFFakcsWUFBSSxLQUFLLGdCQUFMLEdBQXdCLGFBQWEsZ0JBQWIsRUFBK0I7QUFDekQsaUJBQU8sSUFBUCw2QkFBc0MsYUFBYSxnQkFBYiw0RUFBb0csTUFBTSxXQUFOLENBQTFJLENBRHlEO1NBQTNEO0FBR0EsdUJBQWUsSUFBZixDQUxpRztPQUFuRztBQU9BLFVBQUksZUFBZSxZQUFmLElBQStCLEtBQUssU0FBTCxLQUFtQixhQUFhLFNBQWIsRUFBd0I7QUFDNUUsYUFBSyxTQUFMLEdBQWlCLGFBQWEsU0FBYixJQUEwQixFQUExQixDQUQyRDtBQUU1RSx3QkFBZ0IsSUFBaEIsQ0FGNEU7T0FBOUU7QUFJQSxVQUFJLFdBQVcsWUFBWCxJQUEyQixLQUFLLEtBQUwsS0FBZSxhQUFhLEtBQWIsRUFBb0I7QUFDaEUsYUFBSyxLQUFMLEdBQWEsYUFBYSxLQUFiLENBRG1EO0FBRWhFLHdCQUFnQixJQUFoQixDQUZnRTtPQUFsRTtBQUlBLFVBQUksWUFBWSxZQUFaLElBQTRCLEtBQUssU0FBTCxDQUFlLEtBQUssTUFBTCxDQUFmLEtBQWdDLEtBQUssU0FBTCxDQUFlLGFBQWEsTUFBYixDQUEvQyxFQUFxRTtBQUNuRyxhQUFLLE1BQUwsR0FBYyxhQUFhLE1BQWIsQ0FEcUY7QUFFbkcsd0JBQWdCLElBQWhCLENBRm1HO09BQXJHO0FBSUEsVUFBSSxhQUFKLEVBQW1CO0FBQ2pCLGFBQUssTUFBTCxHQURpQjtPQUFuQjtBQUdBLFVBQUksaUJBQWlCLFlBQWpCLEVBQStCLEtBQUssSUFBTCxHQUFuQztBQUNBLGFBQU8sSUFBUCxDQTdCbUI7Ozs7Ozs7Ozs7Ozs2QkFzQ1o7QUFDUCxXQUFLLFNBQUwsR0FBaUIsQ0FBakIsQ0FETztBQUVQLFVBQU0sT0FBTyxLQUFLLElBQUwsQ0FGTjtBQUdQLFdBQUssSUFBTCxHQUFZLEVBQVosQ0FITztBQUlQLFdBQUssTUFBTCxDQUFZLFdBQVosQ0FBd0IsSUFBeEIsRUFKTztBQUtQLFdBQUssUUFBTCxHQUFnQixLQUFoQixDQUxPO0FBTVAsV0FBSyxVQUFMLEdBQWtCLElBQWxCLENBTk87QUFPUCxXQUFLLGdCQUFMLEdBQXdCLEtBQUssd0JBQUwsQ0FQakI7QUFRUCxXQUFLLGNBQUwsQ0FBb0I7QUFDbEIsY0FBTSxFQUFOO0FBQ0EsY0FBTSxPQUFOO09BRkYsRUFSTzs7Ozs7Ozs7Ozs7NEJBbUJEO0FBQ04sV0FBSyxNQUFMLEdBRE07QUFFTixXQUFLLElBQUwsR0FGTTs7Ozs7Ozs7Ozs7Ozs7OzJCQWNEOztBQUVMLFVBQU0sV0FBVyxLQUFLLEdBQUwsQ0FBUyxLQUFLLGdCQUFMLEdBQXdCLEtBQUssSUFBTCxFQUFXLE1BQU0sV0FBTixDQUF2RDs7OztBQUZELFVBTUQsV0FBVyxDQUFYLEVBQWM7QUFDaEIsWUFBTSxjQUFjLEtBQUssSUFBTCxDQUFVLEtBQVYsQ0FBZ0IsS0FBSyxnQkFBTCxDQUE5QixDQURVO0FBRWhCLGFBQUssSUFBTCxHQUFZLEtBQUssSUFBTCxDQUFVLEtBQVYsQ0FBZ0IsQ0FBaEIsRUFBbUIsS0FBSyxnQkFBTCxDQUEvQixDQUZnQjtBQUdoQixhQUFLLE1BQUwsQ0FBWSxXQUFaLENBQXdCLFdBQXhCLEVBSGdCO0FBSWhCLGFBQUssYUFBTCxDQUFtQixRQUFuQixFQUE2QixFQUFFLE1BQU0sRUFBTixFQUEvQixFQUpnQjtPQUFsQixNQUtPLElBQUksYUFBYSxDQUFiLEVBQWdCOztPQUFwQixNQUVBLElBQUksS0FBSyxLQUFMLEtBQWUsWUFBZixFQUE2QjtBQUN0QyxlQUFLLGdCQUFMLENBQXNCLFFBQXRCLEVBRHNDO1NBQWpDLE1BRUEsSUFBSSxLQUFLLEtBQUwsS0FBZSxPQUFmLElBQTBCLEtBQUssU0FBTCxFQUFnQjtBQUNuRCxlQUFLLFdBQUwsQ0FBaUIsUUFBakIsRUFEbUQ7U0FBOUM7Ozs7Ozs7Ozs7Ozs7cUNBWVEsVUFBVTs7Ozs7QUFHekIsVUFBTSxtQkFBbUIsS0FBSyxJQUFMLENBQVUsS0FBSyxJQUFMLENBQVUsTUFBVixHQUFtQixDQUFuQixDQUE3QixDQUhtQjtBQUl6QixVQUFNLDJCQUEyQixDQUFDLGdCQUFELEdBQW9CLElBQXBCLEdBQTJCLEtBQUssWUFBTCxDQUFrQixnQkFBbEIsQ0FBM0IsQ0FKUjtBQUt6QixVQUFNLFNBQVUsNEJBQTRCLHlCQUF5QixPQUF6QixFQUE1QixHQUNkLGNBQWMseUJBQXlCLEVBQXpCLEdBQThCLEVBRDlCLENBTFM7QUFPekIsVUFBTSxTQUFTLEtBQUssYUFBTCxFQUFULENBUG1COztBQVN6QixXQUFLLFFBQUwsR0FBZ0IsSUFBaEIsQ0FUeUI7QUFVekIsVUFBTSxnQkFBZ0IsS0FBSyxjQUFMLDhCQUErQyx5QkFBb0IsV0FBVyxNQUE5RSxDQVZHO0FBV3pCLFdBQUssTUFBTCxDQUFZLEdBQVosQ0FBZ0I7QUFDZCxhQUFLLGFBQUw7QUFDQSxnQkFBUSxLQUFSO0FBQ0EsY0FBTSxLQUFOO09BSEYsRUFJRztlQUFXLE9BQUssa0JBQUwsQ0FBd0IsT0FBeEIsRUFBaUMsYUFBakM7T0FBWCxDQUpILENBWHlCOzs7Ozs7Ozs7Ozs7Ozs7OztvQ0E2Qlg7QUFDZCxVQUFJLEtBQUssS0FBTCxLQUFlLE9BQWYsRUFBd0IsT0FBTyxVQUFQLENBQTVCO0FBQ0EsVUFBSSxLQUFLLE1BQUwsSUFBZSxLQUFLLE1BQUwsQ0FBWSxDQUFaLENBQWYsSUFBaUMsS0FBSyxNQUFMLENBQVksQ0FBWixFQUFlLG9CQUFmLENBQWpDLEVBQXVFLE9BQU8sY0FBUCxDQUEzRTtBQUNBLGFBQU8sWUFBUCxDQUhjOzs7Ozs7Ozs7Ozs7OzttREFjZTtBQUM3QixVQUFJLEtBQUssU0FBTCxDQUFlLEtBQWYsQ0FBcUIsZUFBckIsQ0FBSixFQUEyQztBQUN6QyxZQUFNLGlCQUFpQixLQUFLLFNBQUwsQ0FBZSxPQUFmLENBQXVCLGVBQXZCLEVBQXdDLElBQXhDLENBQWpCOzs7O0FBRG1DLFlBS25DLE9BQU8sQ0FBQyxLQUFLLFVBQUwsSUFBbUIsY0FBbkIsQ0FBRCxDQUFvQyxPQUFwQyxDQUE0Qyx1Q0FBNUMsRUFBcUYsRUFBckYsQ0FBUCxDQUxtQztBQU16QyxZQUFJLElBQUosRUFBVTtBQUNSLGlCQUFPO0FBQ0wsc0JBREs7QUFFTCxnQkFBSSxjQUFKO1dBRkYsQ0FEUTtTQUFWO09BTkY7Ozs7Ozs7Ozs7Ozs7Z0NBc0JVLFVBQVU7Ozs7O0FBR3BCLFVBQU0sY0FBYyxLQUFLLElBQUwsQ0FBVSxLQUFLLElBQUwsQ0FBVSxNQUFWLEdBQW1CLENBQW5CLENBQXhCLENBSGM7QUFJcEIsVUFBTSxzQkFBc0IsQ0FBQyxXQUFELEdBQWUsSUFBZixHQUFzQixLQUFLLFlBQUwsQ0FBa0IsV0FBbEIsQ0FBdEIsQ0FKUjtBQUtwQixVQUFJLFNBQVUsdUJBQXVCLG9CQUFvQixPQUFwQixFQUF2QixHQUF1RCxjQUFjLG9CQUFvQixFQUFwQixHQUF5QixFQUE5RixDQUxNO0FBTXBCLFVBQU0sZUFBZSxLQUFLLDRCQUFMLEVBQWY7OztBQU5jLFVBU2hCLFlBQUosRUFBa0I7O0FBQ2hCLGNBQU0saUJBQWlCLDRCQUE0QixhQUFhLElBQWI7QUFDbkQsY0FBSSxDQUFDLE9BQUssVUFBTCxFQUFpQixPQUFLLFVBQUwsR0FBa0IsYUFBYSxFQUFiLENBQXhDO0FBQ0EsY0FBTSxlQUFlLE9BQUssTUFBTCxDQUFZLGVBQVosQ0FBNEIsY0FBNUIsQ0FBZjs7Ozs7OztBQU9OLGNBQUksZ0JBQWdCLGFBQWEsV0FBYixJQUNoQixXQURBLElBQ2UsWUFBWSxFQUFaLEtBQW1CLGFBQWEsV0FBYixDQUF5QixFQUF6QixFQUE2QjtBQUNqRSxxQkFBUyxFQUFULENBRGlFO1dBRG5FOzs7OztBQVFBLGNBQU0sZ0NBQThCLGFBQWEsSUFBYiw0QkFBd0MsV0FBVyxNQUFqRjs7O0FBR04sY0FBSSxDQUFDLE9BQUssVUFBTCxDQUFnQixLQUFoQixDQUFzQixPQUF0QixDQUFELElBQW1DLGVBQWUsT0FBSyxjQUFMLEVBQXFCO0FBQ3pFLG1CQUFLLFFBQUwsR0FBZ0IsSUFBaEIsQ0FEeUU7QUFFekUsbUJBQUssY0FBTCxHQUFzQixVQUF0QixDQUZ5RTtBQUd6RSxtQkFBSyxNQUFMLENBQVksR0FBWixDQUFnQjtBQUNkLG1CQUFLLFVBQUw7QUFDQSxzQkFBUSxLQUFSO0FBQ0Esb0JBQU0sS0FBTjthQUhGLEVBSUc7cUJBQVcsT0FBSyxrQkFBTCxDQUF3QixPQUF4QixFQUFpQyxVQUFqQzthQUFYLENBSkgsQ0FIeUU7V0FBM0U7OztBQVdBLGNBQUksT0FBSyxJQUFMLENBQVUsTUFBVixLQUFxQixDQUFyQixFQUF3QjtBQUMxQixnQkFBSSxnQkFBZ0IsYUFBYSxXQUFiLEVBQTBCO0FBQzVDLHFCQUFLLElBQUwsR0FBWSxDQUFDLE9BQUssUUFBTCxDQUFjLGFBQWEsV0FBYixDQUFmLENBQVo7O0FBRDRDLG9CQUc1QyxDQUFLLGNBQUwsQ0FBb0I7QUFDbEIsc0JBQU0sTUFBTjtBQUNBLHNCQUFNLE9BQUssUUFBTCxDQUFjLGFBQWEsV0FBYixDQUFwQjtBQUNBLDZCQUhrQjtBQUlsQix3QkFBUSxPQUFLLE1BQUw7ZUFKVixFQUg0QzthQUE5QztXQURGO2FBaENnQjtPQUFsQixNQTRDTyxJQUFJLENBQUMsS0FBSyxTQUFMLENBQWUsS0FBZixDQUFxQixNQUFyQixDQUFELEVBQStCO0FBQ3hDLGVBQU8sS0FBUCxDQUFhLHdDQUFiLEVBRHdDO09BQW5DOzs7Ozs7Ozs7Ozs7O3VDQVlVLFNBQVMsWUFBWTs7O0FBQ3RDLFVBQUksZUFBZSxLQUFLLGNBQUwsSUFBdUIsS0FBSyxXQUFMLEVBQWtCLE9BQTVEOztBQUVBLFdBQUssUUFBTCxHQUFnQixLQUFoQixDQUhzQztBQUl0QyxXQUFLLGNBQUwsR0FBc0IsRUFBdEIsQ0FKc0M7QUFLdEMsVUFBSSxRQUFRLE9BQVIsRUFBaUI7OztBQUduQixZQUFJLFFBQVEsSUFBUixDQUFhLE1BQWIsRUFBcUI7QUFDdkIsZUFBSyxXQUFMLEdBQW1CLENBQW5CLENBRHVCO0FBRXZCLGVBQUssY0FBTCxDQUFvQixPQUFwQixFQUZ1QjtBQUd2QixlQUFLLFNBQUwsR0FBaUIsT0FBTyxRQUFRLEdBQVIsQ0FBWSxpQkFBWixDQUE4QixhQUE5QixLQUFnRCxDQUFoRCxDQUF4QixDQUh1Qjs7OztBQUF6QixhQU9LLElBQUksS0FBSyxJQUFMLEtBQWMsQ0FBZCxFQUFpQjtBQUN4QixnQkFBSSxLQUFLLFdBQUwsR0FBbUIsTUFBTSxhQUFOLEVBQXFCO0FBQzFDLHlCQUFXLFlBQU07QUFDZix1QkFBSyxXQUFMLEdBRGU7QUFFZix1QkFBSyxJQUFMLEdBRmU7ZUFBTixFQUdSLElBSEgsRUFEMEM7Ozs7QUFBNUMsaUJBUUs7QUFDSCxxQkFBSyxXQUFMLEdBQW1CLENBQW5CLENBREc7QUFFSCxxQkFBSyxjQUFMLENBQW9CO0FBQ2xCLHdCQUFNLE1BQU47QUFDQSx3QkFBTSxFQUFOO0FBQ0EseUJBQU8sSUFBUDtBQUNBLDBCQUFRLEtBQUssTUFBTDtpQkFKVixFQUZHO2VBUkw7V0FERztPQVZQLE1BNkJPO0FBQ0wsYUFBSyxPQUFMLENBQWEsT0FBYixFQUFzQixFQUFFLE9BQU8sUUFBUSxJQUFSLEVBQS9CLEVBREs7T0E3QlA7Ozs7Ozs7Ozs7OzttQ0F3Q2EsU0FBUzs7Ozs7QUFHdEIsY0FBUSxJQUFSLENBQWEsT0FBYixDQUFxQjtlQUFRLE9BQUssTUFBTCxDQUFZLGFBQVosQ0FBMEIsSUFBMUI7T0FBUixDQUFyQjs7O0FBSHNCLFVBTWhCLGFBQWEsUUFBUSxJQUFSLENBQWEsTUFBYixDQUFvQjtlQUFRLE9BQUssU0FBTCxDQUFlLEtBQUssRUFBTCxDQUFmLEtBQTRCLENBQUMsQ0FBRDtPQUFwQyxDQUFqQzs7O0FBTmdCLFVBU2xCLEtBQUssUUFBTCxLQUFrQixNQUFNLGNBQU4sRUFBc0I7QUFDMUMsYUFBSyxJQUFMLEdBQVksR0FBRyxNQUFILENBQVUsS0FBSyxJQUFMLENBQXRCLENBRDBDO09BQTVDO0FBR0EsVUFBTSxPQUFPLEtBQUssSUFBTCxDQVpTO0FBYXRCLGlCQUFXLE9BQVgsQ0FBbUIsa0JBQVU7QUFDM0IsWUFBSSxpQkFBSixDQUQyQjtBQUUzQixZQUFNLE9BQU8sT0FBSyxNQUFMLENBQVksVUFBWixDQUF1QixPQUFPLEVBQVAsQ0FBOUIsQ0FGcUI7QUFHM0IsWUFBSSxPQUFLLEtBQUwsS0FBZSxPQUFmLEVBQXdCO0FBQzFCLGtCQUFRLE9BQUssc0JBQUwsQ0FBNEIsSUFBNUIsRUFBa0MsSUFBbEMsQ0FBUixDQUQwQjtTQUE1QixNQUVPO0FBQ0wsa0JBQVEsT0FBSywyQkFBTCxDQUFpQyxJQUFqQyxFQUF1QyxJQUF2QyxDQUFSLENBREs7U0FGUDtBQUtBLGFBQUssTUFBTCxDQUFZLEtBQVosRUFBbUIsQ0FBbkIsRUFBc0IsT0FBSyxRQUFMLENBQWMsSUFBZCxDQUF0QixFQVIyQjtPQUFWLENBQW5COzs7QUFic0IsVUEwQnRCLENBQUssY0FBTCxDQUFvQjtBQUNsQixjQUFNLE1BQU47QUFDQSxjQUFNLFFBQVEsSUFBUixDQUFhLEdBQWIsQ0FBaUI7aUJBQVEsT0FBSyxRQUFMLENBQWMsT0FBSyxNQUFMLENBQVksVUFBWixDQUF1QixLQUFLLEVBQUwsQ0FBckM7U0FBUixDQUF2QjtBQUNBLGVBQU8sSUFBUDtBQUNBLGdCQUFRLEtBQUssTUFBTDtPQUpWLEVBMUJzQjs7Ozs7Ozs7Ozs7Ozs7Ozs2QkE0Q2YsTUFBTTtBQUNiLFVBQUksS0FBSyxRQUFMLEtBQWtCLE1BQU0sY0FBTixFQUFzQjtBQUMxQyxlQUFPLEtBQUssUUFBTCxFQUFQLENBRDBDO09BQTVDO0FBR0EsYUFBTyxJQUFQLENBSmE7Ozs7Ozs7Ozs7Ozs7aUNBY0YsTUFBTTtBQUNqQixVQUFJLGdCQUFnQixJQUFoQixFQUFzQixPQUFPLElBQVAsQ0FBMUI7QUFDQSxhQUFPLEtBQUssTUFBTCxDQUFZLFVBQVosQ0FBdUIsS0FBSyxFQUFMLENBQTlCLENBRmlCOzs7Ozs7Ozs7Ozs7Ozs7OzZCQWVWLElBQUk7QUFDWCxjQUFRLEtBQUssVUFBTCxDQUFnQixFQUFoQixDQUFSO0FBQ0UsYUFBSyxVQUFMO0FBQ0UsY0FBSSxLQUFLLEtBQUwsS0FBZSxPQUFmLEVBQXdCO0FBQzFCLGdCQUFNLFFBQVEsS0FBSyxTQUFMLENBQWUsRUFBZixDQUFSLENBRG9CO0FBRTFCLG1CQUFPLFVBQVUsQ0FBQyxDQUFELEdBQUssSUFBZixHQUFzQixLQUFLLElBQUwsQ0FBVSxLQUFWLENBQXRCLENBRm1CO1dBQTVCLE1BR08sSUFBSSxLQUFLLEtBQUwsS0FBZSxZQUFmLEVBQTZCO0FBQ3RDLGlCQUFLLElBQUksUUFBUSxDQUFSLEVBQVcsUUFBUSxLQUFLLElBQUwsQ0FBVSxNQUFWLEVBQWtCLE9BQTlDLEVBQXVEO0FBQ3JELGtCQUFNLGVBQWUsS0FBSyxJQUFMLENBQVUsS0FBVixDQUFmLENBRCtDO0FBRXJELGtCQUFJLGFBQWEsV0FBYixJQUE0QixhQUFhLFdBQWIsQ0FBeUIsRUFBekIsS0FBZ0MsRUFBaEMsRUFBb0MsT0FBTyxhQUFhLFdBQWIsQ0FBM0U7YUFGRjtBQUlBLG1CQUFPLElBQVAsQ0FMc0M7V0FBakM7QUFPUCxnQkFYRjtBQURGLGFBYU8sZUFBTDtBQUNFLGNBQUksS0FBSyxLQUFMLEtBQWUsWUFBZixFQUE2QjtBQUMvQixnQkFBTSxRQUFRLEtBQUssU0FBTCxDQUFlLEVBQWYsQ0FBUixDQUR5QjtBQUUvQixtQkFBTyxVQUFVLENBQUMsQ0FBRCxHQUFLLElBQWYsR0FBc0IsS0FBSyxJQUFMLENBQVUsS0FBVixDQUF0QixDQUZ3QjtXQUFqQztBQUlBLGdCQUxGO0FBYkYsT0FEVzs7Ozs7Ozs7Ozs7Ozs7OEJBK0JILElBQUk7QUFDWixXQUFLLElBQUksUUFBUSxDQUFSLEVBQVcsUUFBUSxLQUFLLElBQUwsQ0FBVSxNQUFWLEVBQWtCLE9BQTlDLEVBQXVEO0FBQ3JELFlBQUksS0FBSyxJQUFMLENBQVUsS0FBVixFQUFpQixFQUFqQixLQUF3QixFQUF4QixFQUE0QixPQUFPLEtBQVAsQ0FBaEM7T0FERjtBQUdBLGFBQU8sQ0FBQyxDQUFELENBSks7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O3dDQXFCTSxXQUFXLEtBQUs7QUFDbEMsVUFBSSxLQUFLLEtBQUwsS0FBZSxZQUFmLEVBQTZCO0FBQy9CLGFBQUsseUJBQUwsQ0FBK0IsR0FBL0IsRUFEK0I7T0FBakMsTUFFTztBQUNMLGFBQUssb0JBQUwsQ0FBMEIsR0FBMUIsRUFESztPQUZQOzs7OzhDQU93QixLQUFLO0FBQzdCLGNBQVEsSUFBSSxTQUFKOzs7O0FBSU4sYUFBSyxzQkFBTDtBQUNFLGVBQUssOEJBQUwsQ0FBb0MsR0FBcEMsRUFERjtBQUVFLGdCQUZGOzs7O0FBSkYsYUFVTyxtQkFBTDtBQUNFLGVBQUssMkJBQUwsQ0FBaUMsR0FBakMsRUFERjtBQUVFLGdCQUZGOzs7O0FBVkYsYUFnQk8sc0JBQUw7QUFDRSxlQUFLLDhCQUFMLENBQW9DLEdBQXBDLEVBREY7QUFFRSxnQkFGRjtBQWhCRixPQUQ2Qjs7Ozs7OzttREF3QkEsS0FBSztBQUNsQyxVQUFJLFFBQVEsS0FBSyxTQUFMLENBQWUsSUFBSSxNQUFKLENBQVcsRUFBWCxDQUF2Qjs7OztBQUQ4QixVQUs5QixLQUFLLFFBQUwsS0FBa0IsTUFBTSxjQUFOLEVBQXNCO0FBQzFDLFlBQU0sWUFBWSxJQUFJLGFBQUosQ0FBa0IsSUFBbEIsQ0FBWixDQURvQztBQUUxQyxZQUFJLFVBQVUsTUFBVixFQUFrQjtBQUNwQixrQkFBUSxLQUFLLFNBQUwsQ0FBZSxVQUFVLENBQVYsRUFBYSxRQUFiLENBQXZCLENBRG9CO1NBQXRCO09BRkY7Ozs7Ozs7QUFMa0MsVUFpQjlCLFVBQVUsQ0FBQyxDQUFELEVBQUk7QUFDaEIsWUFBTSxZQUFZLEtBQUssYUFBTCxFQUFaLENBRFU7QUFFaEIsWUFBTSxVQUFVLElBQUksV0FBSixDQUFnQixhQUFoQixLQUFrQyxjQUFjLGNBQWQsQ0FGbEM7O0FBSWhCLFlBQUksS0FBSyxRQUFMLEtBQWtCLE1BQU0sY0FBTixFQUFzQjtBQUMxQyxjQUFJLENBQUMsT0FBRCxFQUFVOztBQUVaLGlCQUFLLElBQUwsZ0NBQ0ssS0FBSyxJQUFMLENBQVUsS0FBVixDQUFnQixDQUFoQixFQUFtQixLQUFuQixLQUNILElBQUksTUFBSixDQUFXLFFBQVgsd0JBQ0csS0FBSyxJQUFMLENBQVUsS0FBVixDQUFnQixRQUFRLENBQVIsR0FIckIsQ0FGWTtXQUFkLE1BT087O0FBRUwsaUJBQUssSUFBTCxDQUFVLE1BQVYsQ0FBaUIsS0FBakIsRUFBd0IsQ0FBeEIsRUFGSztBQUdMLGlCQUFLLElBQUwsSUFDRSxJQUFJLE1BQUosQ0FBVyxRQUFYLDhCQUNHLEtBQUssSUFBTCxFQUZMLENBSEs7V0FQUDs7OztBQURGLGFBbUJLO0FBQ0gsZ0JBQUksT0FBSixFQUFhO0FBQ1gsbUJBQUssSUFBTCxDQUFVLE1BQVYsQ0FBaUIsS0FBakIsRUFBd0IsQ0FBeEIsRUFEVztBQUVYLG1CQUFLLElBQUwsQ0FBVSxPQUFWLENBQWtCLElBQUksTUFBSixDQUFsQixDQUZXO2FBQWI7V0FwQkY7OztBQUpnQixZQStCaEIsQ0FBSyxjQUFMLENBQW9CO0FBQ2xCLGdCQUFNLFVBQU47QUFDQSxrQkFBUSxLQUFLLFFBQUwsQ0FBYyxJQUFJLE1BQUosQ0FBdEI7QUFDQSxpQkFBTyxJQUFQO0FBQ0Esb0JBQVUsSUFBVjtBQUNBLG1CQUFTLElBQUksT0FBSjtTQUxYLEVBL0JnQjtPQUFsQjs7OztnREF5QzBCLGNBQWMsTUFBTTtBQUM5QyxVQUFNLFlBQVksS0FBSyxhQUFMLEVBQVosQ0FEd0M7QUFFOUMsVUFBSSxpQkFBSixDQUY4QztBQUc5QyxVQUFJLGNBQWMsWUFBZCxFQUE0QjtBQUM5QixhQUFLLFFBQVEsQ0FBUixFQUFXLFFBQVEsS0FBSyxNQUFMLEVBQWEsT0FBckMsRUFBOEM7QUFDNUMsY0FBSSxhQUFhLFNBQWIsSUFBMEIsS0FBSyxLQUFMLEVBQVksU0FBWixFQUF1QixNQUFyRDtTQURGO0FBR0EsZUFBTyxLQUFQLENBSjhCO09BQWhDLE1BS087QUFDTCxZQUFNLEtBQUssYUFBYSxXQUFiLEdBQTJCLGFBQWEsV0FBYixDQUF5QixNQUF6QixHQUFrQyxhQUFhLFNBQWIsQ0FEbkU7QUFFTCxhQUFLLFFBQVEsQ0FBUixFQUFXLFFBQVEsS0FBSyxNQUFMLEVBQWEsT0FBckMsRUFBOEM7QUFDNUMsY0FBTSxLQUFLLEtBQUssS0FBTCxFQUFZLFdBQVosR0FBMEIsS0FBSyxLQUFMLEVBQVksV0FBWixDQUF3QixNQUF4QixHQUFpQyxLQUFLLEtBQUwsRUFBWSxTQUFaLENBRDFCO0FBRTVDLGNBQUksTUFBTSxFQUFOLEVBQVUsTUFBZDtTQUZGO0FBSUEsZUFBTyxLQUFQLENBTks7T0FMUDs7OzsyQ0FlcUIsU0FBUyxNQUFNO0FBQ3BDLFVBQUksaUJBQUosQ0FEb0M7QUFFcEMsV0FBSyxRQUFRLENBQVIsRUFBVyxRQUFRLEtBQUssTUFBTCxFQUFhLE9BQXJDLEVBQThDO0FBQzVDLFlBQUksUUFBUSxRQUFSLEdBQW1CLEtBQUssS0FBTCxFQUFZLFFBQVosRUFBc0I7QUFDM0MsZ0JBRDJDO1NBQTdDO09BREY7QUFLQSxhQUFPLEtBQVAsQ0FQb0M7Ozs7Z0RBV1YsS0FBSzs7OztBQUUvQixVQUFNLE9BQU8sSUFBSSxhQUFKLENBQ0UsTUFERixDQUNTO2VBQWdCLE9BQUssU0FBTCxDQUFlLGFBQWEsRUFBYixDQUFmLEtBQW9DLENBQUMsQ0FBRDtPQUFwRCxDQURoQixDQUZ5Qjs7QUFLL0IsVUFBSSxLQUFLLE1BQUwsRUFBYTs7QUFDZixjQUFNLE9BQU8sT0FBSyxJQUFMO0FBQ2IsZUFBSyxPQUFMLENBQWEsd0JBQWdCO0FBQzNCLGdCQUFNLFdBQVcsT0FBSywyQkFBTCxDQUFpQyxZQUFqQyxFQUErQyxJQUEvQyxDQUFYLENBRHFCO0FBRTNCLGlCQUFLLE1BQUwsQ0FBWSxRQUFaLEVBQXNCLENBQXRCLEVBQXlCLE9BQUssUUFBTCxDQUFjLFlBQWQsQ0FBekIsRUFGMkI7V0FBaEIsQ0FBYjs7O0FBTUEsY0FBSSxPQUFLLFFBQUwsS0FBa0IsTUFBTSxjQUFOLEVBQXNCO0FBQzFDLG1CQUFLLElBQUwsR0FBWSxHQUFHLE1BQUgsQ0FBVSxJQUFWLENBQVosQ0FEMEM7V0FBNUM7QUFHQSxpQkFBSyxTQUFMLElBQWtCLEtBQUssTUFBTDs7OztBQUlsQixlQUFLLE9BQUwsQ0FBYSxVQUFDLFlBQUQsRUFBa0I7QUFDN0IsZ0JBQU0sT0FBTyxPQUFLLFFBQUwsQ0FBYyxZQUFkLENBQVAsQ0FEdUI7QUFFN0IsbUJBQUssY0FBTCxDQUFvQjtBQUNsQixvQkFBTSxRQUFOO0FBQ0EscUJBQU8sT0FBSyxJQUFMLENBQVUsT0FBVixDQUFrQixJQUFsQixDQUFQO0FBQ0Esc0JBQVEsSUFBUjtBQUNBLDJCQUprQjthQUFwQixFQUY2QjtXQUFsQixDQUFiO2FBZmU7T0FBakI7Ozs7bURBNEI2QixLQUFLOzs7QUFDbEMsVUFBTSxVQUFVLEVBQVYsQ0FENEI7QUFFbEMsVUFBSSxhQUFKLENBQWtCLE9BQWxCLENBQTBCLHdCQUFnQjtBQUN4QyxZQUFNLFFBQVEsT0FBSyxTQUFMLENBQWUsYUFBYSxFQUFiLENBQXZCLENBRGtDO0FBRXhDLFlBQUksVUFBVSxDQUFDLENBQUQsRUFBSTtBQUNoQixrQkFBUSxJQUFSLENBQWE7QUFDWCxrQkFBTSxZQUFOO0FBQ0Esd0JBRlc7V0FBYixFQURnQjtBQUtoQixjQUFJLE9BQUssUUFBTCxLQUFrQixNQUFNLGNBQU4sRUFBc0I7QUFDMUMsbUJBQUssSUFBTCxnQ0FBZ0IsT0FBSyxJQUFMLENBQVUsS0FBVixDQUFnQixDQUFoQixFQUFtQixLQUFuQix1QkFBOEIsT0FBSyxJQUFMLENBQVUsS0FBVixDQUFnQixRQUFRLENBQVIsR0FBOUQsQ0FEMEM7V0FBNUMsTUFFTztBQUNMLG1CQUFLLElBQUwsQ0FBVSxNQUFWLENBQWlCLEtBQWpCLEVBQXdCLENBQXhCLEVBREs7V0FGUDtTQUxGO09BRndCLENBQTFCLENBRmtDOztBQWlCbEMsV0FBSyxTQUFMLElBQWtCLFFBQVEsTUFBUixDQWpCZ0I7QUFrQmxDLGNBQVEsT0FBUixDQUFnQixzQkFBYztBQUM1QixlQUFLLGNBQUwsQ0FBb0I7QUFDbEIsZ0JBQU0sUUFBTjtBQUNBLGlCQUFPLFdBQVcsS0FBWDtBQUNQLGtCQUFRLE9BQUssUUFBTCxDQUFjLFdBQVcsSUFBWCxDQUF0QjtBQUNBLHVCQUprQjtTQUFwQixFQUQ0QjtPQUFkLENBQWhCLENBbEJrQzs7Ozt5Q0E0QmYsS0FBSztBQUN4QixjQUFRLElBQUksU0FBSjs7O0FBR04sYUFBSyxzQkFBTDtBQUNFLGVBQUssK0JBQUwsQ0FBcUMsR0FBckMsRUFERjtBQUVFLGdCQUZGOzs7O0FBSEYsYUFTTyxpQkFBTCxDQVRGO0FBVUUsYUFBSyxlQUFMO0FBQ0UsZUFBSyx5QkFBTCxDQUErQixHQUEvQixFQURGO0FBRUUsZ0JBRkY7Ozs7QUFWRixhQWdCTyxjQUFMO0FBQ0UsZUFBSyxzQkFBTCxDQUE0QixHQUE1QixFQURGO0FBRUUsZ0JBRkY7Ozs7QUFoQkYsYUFzQk8saUJBQUw7QUFDRSxlQUFLLHlCQUFMLENBQStCLEdBQS9CLEVBREY7QUFFRSxnQkFGRjtBQXRCRixPQUR3Qjs7OztvREE2Qk0sS0FBSztBQUNuQyxVQUFNLGFBQWEsSUFBSSxhQUFKLENBQWtCLElBQWxCLENBQWIsQ0FENkI7QUFFbkMsVUFBSSxXQUFXLE1BQVgsRUFBbUI7QUFDckIsWUFBSSxLQUFLLFVBQUwsS0FBb0IsV0FBVyxDQUFYLEVBQWMsUUFBZCxFQUF3QjtBQUM5QyxlQUFLLFVBQUwsR0FBa0IsV0FBVyxDQUFYLEVBQWMsUUFBZCxDQUQ0QjtBQUU5QyxlQUFLLFNBQUwsR0FBaUIsd0JBQXdCLEtBQUssVUFBTCxHQUFrQixHQUExQyxDQUY2QjtBQUc5QyxlQUFLLElBQUwsR0FIOEM7U0FBaEQ7T0FERjs7Ozs7Ozs7Ozs7Ozs7Ozs7O2lEQXFCMkIsS0FBSyxPQUFPOztBQUV2QyxVQUFJLFVBQVUsQ0FBQyxDQUFELEVBQUksT0FBTyxLQUFQLENBQWxCOzs7OztBQUZ1QyxVQU9qQyx1Q0FDRCxLQUFLLElBQUwsQ0FBVSxLQUFWLENBQWdCLENBQWhCLEVBQW1CLEtBQW5CLHVCQUNBLEtBQUssSUFBTCxDQUFVLEtBQVYsQ0FBZ0IsUUFBUSxDQUFSLEdBRmYsQ0FQaUM7QUFXdkMsVUFBTSxXQUFXLEtBQUssc0JBQUwsQ0FBNEIsSUFBSSxNQUFKLEVBQVksT0FBeEMsQ0FBWDs7OztBQVhpQyxVQWVuQyxhQUFhLEtBQWIsRUFBb0I7QUFDdEIsZ0JBQVEsTUFBUixDQUFlLFFBQWYsRUFBeUIsQ0FBekIsRUFBNEIsS0FBSyxRQUFMLENBQWMsSUFBSSxNQUFKLENBQTFDLEVBRHNCO0FBRXRCLGFBQUssSUFBTCxHQUFZLE9BQVosQ0FGc0I7QUFHdEIsYUFBSyxjQUFMLENBQW9CO0FBQ2xCLGdCQUFNLFVBQU47QUFDQSxrQkFBUSxLQUFLLFFBQUwsQ0FBYyxJQUFJLE1BQUosQ0FBdEI7QUFDQSxpQkFBTyxJQUFQO0FBQ0Esb0JBQVUsSUFBVjtBQUNBLG1CQUFTLElBQUksT0FBSjtTQUxYLEVBSHNCO0FBVXRCLGVBQU8sSUFBUCxDQVZzQjtPQUF4Qjs7Ozs4Q0Fjd0IsS0FBSztBQUM3QixVQUFJLFFBQVEsS0FBSyxTQUFMLENBQWUsSUFBSSxNQUFKLENBQVcsRUFBWCxDQUF2QixDQUR5QjtBQUU3QixVQUFNLGFBQWEsSUFBSSxhQUFKLENBQWtCLElBQWxCLENBQWIsQ0FGdUI7O0FBSTdCLFVBQUksV0FBVyxNQUFYLEVBQW1CO0FBQ3JCLFlBQUksS0FBSyxRQUFMLEtBQWtCLE1BQU0sY0FBTixFQUFzQixRQUFRLEtBQUssU0FBTCxDQUFlLFdBQVcsQ0FBWCxFQUFjLFFBQWQsQ0FBdkIsQ0FBNUM7QUFDQSxZQUFJLEtBQUssNEJBQUwsQ0FBa0MsR0FBbEMsRUFBdUMsS0FBdkMsQ0FBSixFQUFtRCxPQUFuRDtPQUZGOztBQUtBLFVBQUksSUFBSSxNQUFKLENBQVcsY0FBWCxLQUE4QixLQUFLLFVBQUwsSUFBbUIsVUFBVSxDQUFDLENBQUQsRUFBSTtBQUNqRSxZQUFJLEtBQUssUUFBTCxLQUFrQixNQUFNLGNBQU4sRUFBc0I7QUFDMUMsZUFBSyxJQUFMLGdDQUNLLEtBQUssSUFBTCxDQUFVLEtBQVYsQ0FBZ0IsQ0FBaEIsRUFBbUIsS0FBbkIsS0FDSCxJQUFJLE1BQUosQ0FBVyxRQUFYLHdCQUNHLEtBQUssSUFBTCxDQUFVLEtBQVYsQ0FBZ0IsUUFBUSxDQUFSLEdBSHJCLENBRDBDO1NBQTVDO0FBT0EsYUFBSyxjQUFMLENBQW9CO0FBQ2xCLGdCQUFNLFVBQU47QUFDQSxrQkFBUSxLQUFLLFFBQUwsQ0FBYyxJQUFJLE1BQUosQ0FBdEI7QUFDQSxpQkFBTyxJQUFQO0FBQ0Esb0JBQVUsSUFBVjtBQUNBLG1CQUFTLElBQUksT0FBSjtTQUxYLEVBUmlFO09BQW5FOzs7OzJDQWtCcUIsS0FBSzs7Ozs7QUFHMUIsVUFBTSxPQUFPLElBQUksUUFBSixDQUNFLE1BREYsQ0FDUztlQUFXLFFBQVEsY0FBUixLQUEyQixPQUFLLFVBQUw7T0FBdEMsQ0FEVCxDQUVFLE1BRkYsQ0FFUztlQUFXLE9BQUssU0FBTCxDQUFlLFFBQVEsRUFBUixDQUFmLEtBQStCLENBQUMsQ0FBRDtPQUExQyxDQUZULENBR0UsR0FIRixDQUdNO2VBQVcsT0FBSyxRQUFMLENBQWMsT0FBZDtPQUFYLENBSGI7OztBQUhvQixVQVN0QixLQUFLLE1BQUwsRUFBYTs7QUFDZixjQUFNLE9BQU8sT0FBSyxJQUFMLEdBQVksT0FBSyxRQUFMLEtBQWtCLE1BQU0sY0FBTixHQUF1QixHQUFHLE1BQUgsQ0FBVSxPQUFLLElBQUwsQ0FBbkQsR0FBZ0UsT0FBSyxJQUFMO0FBQ3pGLGVBQUssT0FBTCxDQUFhLGdCQUFRO0FBQ25CLGdCQUFNLFFBQVEsT0FBSyxzQkFBTCxDQUE0QixJQUE1QixFQUFrQyxJQUFsQyxDQUFSLENBRGE7QUFFbkIsaUJBQUssTUFBTCxDQUFZLEtBQVosRUFBbUIsQ0FBbkIsRUFBc0IsSUFBdEIsRUFGbUI7V0FBUixDQUFiOztBQUtBLGlCQUFLLFNBQUwsSUFBa0IsS0FBSyxNQUFMOzs7O0FBSWxCLGVBQUssT0FBTCxDQUFhLGdCQUFRO0FBQ25CLG1CQUFLLGNBQUwsQ0FBb0I7QUFDbEIsb0JBQU0sUUFBTjtBQUNBLHFCQUFPLE9BQUssSUFBTCxDQUFVLE9BQVYsQ0FBa0IsSUFBbEIsQ0FBUDtBQUNBLHNCQUFRLElBQVI7QUFDQSwyQkFKa0I7YUFBcEIsRUFEbUI7V0FBUixDQUFiO2FBWGU7T0FBakI7Ozs7OENBc0J3QixLQUFLOzs7QUFDN0IsVUFBTSxVQUFVLEVBQVYsQ0FEdUI7QUFFN0IsVUFBSSxRQUFKLENBQWEsT0FBYixDQUFxQixtQkFBVztBQUM5QixZQUFNLFFBQVEsT0FBSyxTQUFMLENBQWUsUUFBUSxFQUFSLENBQXZCLENBRHdCO0FBRTlCLFlBQUksVUFBVSxDQUFDLENBQUQsRUFBSTtBQUNoQixrQkFBUSxJQUFSLENBQWE7QUFDWCxrQkFBTSxPQUFOO0FBQ0Esd0JBRlc7V0FBYixFQURnQjtBQUtoQixjQUFJLE9BQUssUUFBTCxLQUFrQixNQUFNLGNBQU4sRUFBc0I7QUFDMUMsbUJBQUssSUFBTCxnQ0FDSyxPQUFLLElBQUwsQ0FBVSxLQUFWLENBQWdCLENBQWhCLEVBQW1CLEtBQW5CLHVCQUNBLE9BQUssSUFBTCxDQUFVLEtBQVYsQ0FBZ0IsUUFBUSxDQUFSLEdBRnJCLENBRDBDO1dBQTVDLE1BS087QUFDTCxtQkFBSyxJQUFMLENBQVUsTUFBVixDQUFpQixLQUFqQixFQUF3QixDQUF4QixFQURLO1dBTFA7U0FMRjtPQUZtQixDQUFyQixDQUY2Qjs7QUFvQjdCLFdBQUssU0FBTCxJQUFrQixRQUFRLE1BQVIsQ0FwQlc7QUFxQjdCLGNBQVEsT0FBUixDQUFnQixzQkFBYztBQUM1QixlQUFLLGNBQUwsQ0FBb0I7QUFDbEIsZ0JBQU0sUUFBTjtBQUNBLGtCQUFRLE9BQUssUUFBTCxDQUFjLFdBQVcsSUFBWCxDQUF0QjtBQUNBLGlCQUFPLFdBQVcsS0FBWDtBQUNQLHVCQUprQjtTQUFwQixFQUQ0QjtPQUFkLENBQWhCLENBckI2Qjs7OzttQ0ErQmhCLEtBQUs7QUFDbEIsV0FBSyxPQUFMLENBQWEsUUFBYixFQUF1QixHQUF2QixFQURrQjtBQUVsQixXQUFLLE9BQUwsQ0FBYSxZQUFZLElBQUksSUFBSixFQUFVLEdBQW5DLEVBRmtCOzs7O1NBNXlCaEI7RUFBYzs7QUFtekJwQixNQUFNLFVBQU4sR0FBbUIsbUJBQW5COzs7Ozs7Ozs7QUFTQSxNQUFNLFlBQU4sR0FBcUIsWUFBckI7Ozs7Ozs7OztBQVNBLE1BQU0sT0FBTixHQUFnQixPQUFoQjs7Ozs7Ozs7O0FBU0EsTUFBTSxjQUFOLEdBQXVCLFFBQXZCOzs7Ozs7Ozs7QUFTQSxNQUFNLGdCQUFOLEdBQXlCLFVBQXpCOzs7Ozs7OztBQVFBLE1BQU0sV0FBTixHQUFvQixHQUFwQjs7Ozs7OztBQU9BLE9BQU8sY0FBUCxDQUFzQixNQUFNLFNBQU4sRUFBaUIsTUFBdkMsRUFBK0M7QUFDN0MsY0FBWSxJQUFaO0FBQ0EsT0FBSyxTQUFTLEdBQVQsR0FBZTtBQUNsQixXQUFPLENBQUMsS0FBSyxJQUFMLEdBQVksQ0FBYixHQUFpQixLQUFLLElBQUwsQ0FBVSxNQUFWLENBRE47R0FBZjtDQUZQOzs7Ozs7OztBQWFBLE1BQU0sU0FBTixDQUFnQixTQUFoQixHQUE0QixDQUE1Qjs7Ozs7Ozs7QUFTQSxNQUFNLFNBQU4sQ0FBZ0IsTUFBaEIsR0FBeUIsSUFBekI7Ozs7Ozs7Ozs7QUFVQSxNQUFNLFNBQU4sQ0FBZ0IsSUFBaEIsR0FBdUIsSUFBdkI7Ozs7Ozs7Ozs7O0FBV0EsTUFBTSxTQUFOLENBQWdCLEtBQWhCLEdBQXdCLFlBQXhCOzs7Ozs7Ozs7Ozs7OztBQWNBLE1BQU0sU0FBTixDQUFnQixVQUFoQixHQUE2QixRQUE3Qjs7Ozs7Ozs7Ozs7QUFXQSxNQUFNLFNBQU4sQ0FBZ0IsUUFBaEIsR0FBMkIsTUFBTSxnQkFBTjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFvQjNCLE1BQU0sU0FBTixDQUFnQixnQkFBaEIsR0FBbUMsR0FBbkM7Ozs7Ozs7Ozs7Ozs7Ozs7QUFnQkEsTUFBTSxTQUFOLENBQWdCLE1BQWhCLEdBQXlCLElBQXpCOzs7Ozs7OztBQVFBLE1BQU0sU0FBTixDQUFnQix3QkFBaEIsR0FBMkMsR0FBM0M7Ozs7Ozs7OztBQVNBLE1BQU0sU0FBTixDQUFnQixTQUFoQixHQUE0QixJQUE1Qjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFvQkEsTUFBTSxTQUFOLENBQWdCLFFBQWhCLEdBQTJCLEtBQTNCOzs7Ozs7Ozs7O0FBVUEsTUFBTSxTQUFOLENBQWdCLGNBQWhCLEdBQWlDLEVBQWpDOztBQUVBLE1BQU0sU0FBTixDQUFnQixXQUFoQixHQUE4QixDQUE5Qjs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBa0JBLE1BQU0sYUFBTixHQUFzQixDQUF0Qjs7QUFFQSxNQUFNLGdCQUFOLEdBQXlCOzs7OztBQUt2QixRQUx1Qjs7Ozs7O0FBV3ZCLGFBWHVCOzs7Ozs7QUFpQnZCLGNBakJ1Qjs7Ozs7O0FBdUJ2QixpQkF2QnVCOzs7Ozs7OztBQStCdkIsZUEvQnVCOzs7Ozs7O0FBc0N2QixlQXRDdUI7Ozs7OztBQTRDdkIsT0E1Q3VCLEVBNkN2QixNQTdDdUIsQ0E2Q2hCLEtBQUssZ0JBQUwsQ0E3Q1Q7O0FBK0NBLEtBQUssU0FBTCxDQUFlLEtBQWYsQ0FBcUIsS0FBckIsRUFBNEIsQ0FBQyxLQUFELEVBQVEsT0FBUixDQUE1Qjs7QUFFQSxPQUFPLE9BQVAsR0FBaUIsS0FBakIiLCJmaWxlIjoicXVlcnkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFRoZXJlIGFyZSB0d28gd2F5cyB0byBpbnN0YW50aWF0ZSB0aGlzIGNsYXNzOlxuICpcbiAqICAgICAgLy8gMS4gVXNpbmcgYSBRdWVyeSBCdWlsZGVyXG4gKiAgICAgIHZhciBxdWVyeUJ1aWxkZXIgPSBRdWVyeUJ1aWxkZXIuY29udmVyc2F0aW9ucygpLnNvcnRCeSgnbGFzdE1lc3NhZ2UnKTtcbiAqICAgICAgdmFyIHF1ZXJ5ID0gY2xpZW50LmNyZWF0ZVF1ZXJ5KGNsaWVudCwgcXVlcnlCdWlsZGVyKTtcbiAqXG4gKiAgICAgIC8vIDIuIFBhc3NpbmcgcHJvcGVydGllcyBkaXJlY3RseVxuICogICAgICB2YXIgcXVlcnkgPSBjbGllbnQuY3JlYXRlUXVlcnkoe1xuICogICAgICAgIGNsaWVudDogY2xpZW50LFxuICogICAgICAgIG1vZGVsOiBsYXllci5RdWVyeS5Db252ZXJzYXRpb24sXG4gKiAgICAgICAgc29ydEJ5OiBbeydjcmVhdGVkQXQnOiAnZGVzYyd9XVxuICogICAgICB9KTtcbiAqXG4gKiBZb3UgY2FuIGNoYW5nZSB0aGUgZGF0YSBzZWxlY3RlZCBieSB5b3VyIHF1ZXJ5IGFueSB0aW1lIHlvdSB3YW50IHVzaW5nOlxuICpcbiAqICAgICAgcXVlcnkudXBkYXRlKHtcbiAqICAgICAgICBwYWdpbmF0aW9uV2luZG93OiAyMDBcbiAqICAgICAgfSk7XG4gKlxuICogICAgICBxdWVyeS51cGRhdGUoe1xuICogICAgICAgIHByZWRpY2F0ZTogJ2NvbnZlcnNhdGlvbi5pZCA9IFwiJyArIGNvbnYuaWQgKyBcIidcIlxuICogICAgICB9KTtcbiAqXG4gKiAgICAgLy8gT3IgdXNlIHRoZSBRdWVyeSBCdWlsZGVyOlxuICogICAgIHF1ZXJ5QnVpbGRlci5wYWdpbmF0aW9uV2luZG93KDIwMCk7XG4gKiAgICAgcXVlcnkudXBkYXRlKHF1ZXJ5QnVpbGRlcik7XG4gKlxuICogWW91IGNhbiByZWxlYXNlIENvbnZlcnNhdGlvbnMgYW5kIE1lc3NhZ2VzIGhlbGQgaW4gbWVtb3J5IGJ5IHlvdXIgcXVlcmllcyB3aGVuIGRvbmUgd2l0aCB0aGVtOlxuICpcbiAqICAgICAgcXVlcnkuZGVzdHJveSgpO1xuICpcbiAqICMjIyMgc29ydEJ5XG4gKlxuICogTm90ZSB0aGF0IHRoZSBzb3J0QnkgcHJvcGVydHkgaXMgb25seSBzdXBwb3J0ZWQgZm9yIENvbnZlcnNhdGlvbnMgYXQgdGhpcyB0aW1lIGFuZCBvbmx5XG4gKiBzdXBwb3J0cyBcImNyZWF0ZWRBdFwiIGFuZCBcImxhc3RNZXNzYWdlLnNlbnRBdFwiIGFzIHNvcnQgZmllbGRzLlxuICpcbiAqICMjIyMgZGF0YVR5cGVcbiAqXG4gKiBUaGUgbGF5ZXIuUXVlcnkuZGF0YVR5cGUgcHJvcGVydHkgbGV0cyB5b3Ugc3BlY2lmeSB3aGF0IHR5cGUgb2YgZGF0YSBzaG93cyB1cCBpbiB5b3VyIHJlc3VsdHM6XG4gKlxuICogYGBgamF2YXNjcmlwdFxuICogdmFyIHF1ZXJ5ID0gY2xpZW50LmNyZWF0ZVF1ZXJ5KHtcbiAqICAgICBtb2RlbDogbGF5ZXIuUXVlcnkuTWVzc2FnZSxcbiAqICAgICBwcmVkaWNhdGU6IFwiY29udmVyc2F0aW9uLmlkID0gJ2xheWVyOi8vL2NvbnZlcnNhdGlvbnMvdXVpZCdcIixcbiAqICAgICBkYXRhVHlwZTogbGF5ZXIuUXVlcnkuSW5zdGFuY2VEYXRhVHlwZVxuICogfSlcbiAqXG4gKiB2YXIgcXVlcnkgPSBjbGllbnQuY3JlYXRlUXVlcnkoe1xuICogICAgIG1vZGVsOiBsYXllci5RdWVyeS5NZXNzYWdlLFxuICogICAgIHByZWRpY2F0ZTogXCJjb252ZXJzYXRpb24uaWQgPSAnbGF5ZXI6Ly8vY29udmVyc2F0aW9ucy91dWlkJ1wiLFxuICogICAgIGRhdGFUeXBlOiBsYXllci5RdWVyeS5PYmplY3REYXRhVHlwZVxuICogfSlcbiAqIGBgYFxuICpcbiAqIFRoZSBwcm9wZXJ0eSBkZWZhdWx0cyB0byBsYXllci5RdWVyeS5JbnN0YW5jZURhdGFUeXBlLiAgSW5zdGFuY2VzIHN1cHBvcnQgbWV0aG9kcyBhbmQgbGV0IHlvdSBzdWJzY3JpYmUgdG8gZXZlbnRzIGZvciBkaXJlY3Qgbm90aWZpY2F0aW9uXG4gKiBvZiBjaGFuZ2VzIHRvIGFueSBvZiB0aGUgcmVzdWx0cyBvZiB5b3VyIHF1ZXJ5OlxuICpcbiAqIGBgYGphdmFzY3JpcHRcbiAqIHF1ZXJ5LmRhdGFbMF0ub24oJ21lc3NhZ2VzOnJlYWQnLCBmdW5jdGlvbigpIHtcbiAqICAgICBhbGVydCgnVGhlIGZpcnN0IG1lc3NhZ2UgaGFzIGJlZW4gcmVhZCEnKTtcbiAqIH0pO1xuICogYGBgXG4gKlxuICogQSB2YWx1ZSBvZiBsYXllci5RdWVyeS5PYmplY3REYXRhVHlwZSB3aWxsIGNhdXNlIHRoZSBkYXRhIHRvIGJlIGFuIGFycmF5IG9mIGltbXV0YWJsZSBvYmplY3RzIHJhdGhlciB0aGFuIGluc3RhbmNlcy4gIE9uZSBjYW4gc3RpbGwgZ2V0IGFuIGluc3RhbmNlIGZyb20gdGhlIFBPSk86XG4gKlxuICogYGBgamF2YXNjcmlwdFxuICogdmFyIG0gPSBjbGllbnQuZ2V0TWVzc2FnZShxdWVyeS5kYXRhWzBdLmlkKTtcbiAqIG0ub24oJ21lc3NhZ2VzOnJlYWQnLCBmdW5jdGlvbigpIHtcbiAqICAgICBhbGVydCgnVGhlIGZpcnN0IG1lc3NhZ2UgaGFzIGJlZW4gcmVhZCEnKTtcbiAqIH0pO1xuICogYGBgXG4gKlxuICogIyMgUXVlcnkgRXZlbnRzXG4gKlxuICogUXVlcmllcyBmaXJlIGV2ZW50cyB3aGVuZXZlciB0aGVpciBkYXRhIGNoYW5nZXMuICBUaGVyZSBhcmUgNSB0eXBlcyBvZiBldmVudHM7XG4gKiBhbGwgZXZlbnRzIGFyZSByZWNlaXZlZCBieSBzdWJzY3JpYmluZyB0byB0aGUgYGNoYW5nZWAgZXZlbnQuXG4gKlxuICogIyMjIDEuIERhdGEgRXZlbnRzXG4gKlxuICogVGhlIERhdGEgZXZlbnQgaXMgZmlyZWQgd2hlbmV2ZXIgYSByZXF1ZXN0IGlzIHNlbnQgdG8gdGhlIHNlcnZlciBmb3IgbmV3IHF1ZXJ5IHJlc3VsdHMuICBUaGlzIGNvdWxkIGhhcHBlbiB3aGVuIGZpcnN0IGNyZWF0aW5nIHRoZSBxdWVyeSwgd2hlbiBwYWdpbmcgZm9yIG1vcmUgZGF0YSwgb3Igd2hlbiBjaGFuZ2luZyB0aGUgcXVlcnkncyBwcm9wZXJ0aWVzLCByZXN1bHRpbmcgaW4gYSBuZXcgcmVxdWVzdCB0byB0aGUgc2VydmVyLlxuICpcbiAqIFRoZSBFdmVudCBvYmplY3Qgd2lsbCBoYXZlIGFuIGBldnQuZGF0YWAgYXJyYXkgb2YgYWxsIG5ld2x5IGFkZGVkIHJlc3VsdHMuICBCdXQgZnJlcXVlbnRseSB5b3UgbWF5IGp1c3Qgd2FudCB0byB1c2UgdGhlIGBxdWVyeS5kYXRhYCBhcnJheSBhbmQgZ2V0IEFMTCByZXN1bHRzLlxuICpcbiAqIGBgYGphdmFzY3JpcHRcbiAqIHF1ZXJ5Lm9uKCdjaGFuZ2UnLCBmdW5jdGlvbihldnQpIHtcbiAqICAgaWYgKGV2dC50eXBlID09PSAnZGF0YScpIHtcbiAqICAgICAgdmFyIG5ld0RhdGEgPSBldnQuZGF0YTtcbiAqICAgICAgdmFyIGFsbERhdGEgPSBxdWVyeS5kYXRhO1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqIE5vdGUgdGhhdCBgcXVlcnkub24oJ2NoYW5nZTpkYXRhJywgZnVuY3Rpb24oZXZ0KSB7fWAgaXMgYWxzbyBzdXBwb3J0ZWQuXG4gKlxuICogIyMjIDIuIEluc2VydCBFdmVudHNcbiAqXG4gKiBBIG5ldyBDb252ZXJzYXRpb24gb3IgTWVzc2FnZSB3YXMgY3JlYXRlZC4gSXQgbWF5IGhhdmUgYmVlbiBjcmVhdGVkIGxvY2FsbHkgYnkgeW91ciB1c2VyLCBvciBpdCBtYXkgaGF2ZSBiZWVuIHJlbW90ZWx5IGNyZWF0ZWQsIHJlY2VpdmVkIHZpYSB3ZWJzb2NrZXQsIGFuZCBhZGRlZCB0byB0aGUgUXVlcnkncyByZXN1bHRzLlxuICpcbiAqIFRoZSBsYXllci5MYXllckV2ZW50LnRhcmdldCBwcm9wZXJ0eSBjb250YWlucyB0aGUgbmV3bHkgaW5zZXJ0ZWQgb2JqZWN0LlxuICpcbiAqIGBgYGphdmFzY3JpcHRcbiAqICBxdWVyeS5vbignY2hhbmdlJywgZnVuY3Rpb24oZXZ0KSB7XG4gKiAgICBpZiAoZXZ0LnR5cGUgPT09ICdpbnNlcnQnKSB7XG4gKiAgICAgICB2YXIgbmV3SXRlbSA9IGV2dC50YXJnZXQ7XG4gKiAgICAgICB2YXIgYWxsRGF0YSA9IHF1ZXJ5LmRhdGE7XG4gKiAgICB9XG4gKiAgfSk7XG4gKiBgYGBcbiAqXG4gKiBOb3RlIHRoYXQgYHF1ZXJ5Lm9uKCdjaGFuZ2U6aW5zZXJ0JywgZnVuY3Rpb24oZXZ0KSB7fWAgaXMgYWxzbyBzdXBwb3J0ZWQuXG4gKlxuICogIyMjIDMuIFJlbW92ZSBFdmVudHNcbiAqXG4gKiBBIENvbnZlcnNhdGlvbiBvciBNZXNzYWdlIHdhcyBkZWxldGVkLiBUaGlzIG1heSBoYXZlIGJlZW4gZGVsZXRlZCBsb2NhbGx5IGJ5IHlvdXIgdXNlciwgb3IgaXQgbWF5IGhhdmUgYmVlbiByZW1vdGVseSBkZWxldGVkLCBhIG5vdGlmaWNhdGlvbiByZWNlaXZlZCB2aWEgd2Vic29ja2V0LCBhbmQgcmVtb3ZlZCBmcm9tIHRoZSBRdWVyeSByZXN1bHRzLlxuICpcbiAqIFRoZSBsYXllci5MYXllckV2ZW50LnRhcmdldCBwcm9wZXJ0eSBjb250YWlucyB0aGUgcmVtb3ZlZCBvYmplY3QuXG4gKlxuICogYGBgamF2YXNjcmlwdFxuICogcXVlcnkub24oJ2NoYW5nZScsIGZ1bmN0aW9uKGV2dCkge1xuICogICBpZiAoZXZ0LnR5cGUgPT09ICdyZW1vdmUnKSB7XG4gKiAgICAgICB2YXIgcmVtb3ZlZEl0ZW0gPSBldnQudGFyZ2V0O1xuICogICAgICAgdmFyIGFsbERhdGEgPSBxdWVyeS5kYXRhO1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqIE5vdGUgdGhhdCBgcXVlcnkub24oJ2NoYW5nZTpyZW1vdmUnLCBmdW5jdGlvbihldnQpIHt9YCBpcyBhbHNvIHN1cHBvcnRlZC5cbiAqXG4gKiAjIyMgNC4gUmVzZXQgRXZlbnRzXG4gKlxuICogQW55IHRpbWUgeW91ciBxdWVyeSdzIG1vZGVsIG9yIHByZWRpY2F0ZSBwcm9wZXJ0aWVzIGhhdmUgYmVlbiBjaGFuZ2VkXG4gKiB0aGUgcXVlcnkgaXMgcmVzZXQsIGFuZCBhIG5ldyByZXF1ZXN0IGlzIHNlbnQgdG8gdGhlIHNlcnZlci4gIFRoZSByZXNldCBldmVudCBpbmZvcm1zIHlvdXIgVUkgdGhhdCB0aGUgY3VycmVudCByZXN1bHQgc2V0IGlzIGVtcHR5LCBhbmQgdGhhdCB0aGUgcmVhc29uIGl0cyBlbXB0eSBpcyB0aGF0IGl0IHdhcyBgcmVzZXRgLiAgVGhpcyBoZWxwcyBkaWZmZXJlbnRpYXRlIGl0IGZyb20gYSBgZGF0YWAgZXZlbnQgdGhhdCByZXR1cm5zIGFuIGVtcHR5IGFycmF5LlxuICpcbiAqIGBgYGphdmFzY3JpcHRcbiAqIHF1ZXJ5Lm9uKCdjaGFuZ2UnLCBmdW5jdGlvbihldnQpIHtcbiAqICAgaWYgKGV2dC50eXBlID09PSAncmVzZXQnKSB7XG4gKiAgICAgICB2YXIgYWxsRGF0YSA9IHF1ZXJ5LmRhdGE7IC8vIFtdXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKlxuICogTm90ZSB0aGF0IGBxdWVyeS5vbignY2hhbmdlOnJlc2V0JywgZnVuY3Rpb24oZXZ0KSB7fWAgaXMgYWxzbyBzdXBwb3J0ZWQuXG4gKlxuICogIyMjIDUuIFByb3BlcnR5IEV2ZW50c1xuICpcbiAqIElmIGFueSBwcm9wZXJ0aWVzIGNoYW5nZSBpbiBhbnkgb2YgdGhlIG9iamVjdHMgbGlzdGVkIGluIHlvdXIgbGF5ZXIuUXVlcnkuZGF0YSBwcm9wZXJ0eSwgYSBgcHJvcGVydHlgIGV2ZW50IHdpbGwgYmUgZmlyZWQuXG4gKlxuICogVGhlIGxheWVyLkxheWVyRXZlbnQudGFyZ2V0IHByb3BlcnR5IGNvbnRhaW5zIG9iamVjdCB0aGF0IHdhcyBtb2RpZmllZC5cbiAqXG4gKiBTZWUgbGF5ZXIuTGF5ZXJFdmVudC5jaGFuZ2VzIGZvciBkZXRhaWxzIG9uIGhvdyBjaGFuZ2VzIGFyZSByZXBvcnRlZC5cbiAqXG4gKiBgYGBqYXZhc2NyaXB0XG4gKiBxdWVyeS5vbignY2hhbmdlJywgZnVuY3Rpb24oZXZ0KSB7XG4gKiAgIGlmIChldnQudHlwZSA9PT0gJ3Byb3BlcnR5Jykge1xuICogICAgICAgdmFyIGNoYW5nZWRJdGVtID0gZXZ0LnRhcmdldDtcbiAqICAgICAgIHZhciBpc1JlYWRDaGFuZ2VzID0gZXZ0LmdldENoYW5nZXNGb3IoJ2lzUmVhZCcpO1xuICogICAgICAgdmFyIHJlY2lwaWVudFN0YXR1c0NoYW5nZXMgPSBldnQuZ2V0Q2hhbmdlc0ZvcigncmVjaXBpZW50U3RhdHVzJyk7XG4gKiAgICAgICBpZiAoaXNSZWFkQ2hhbmdlcy5sZW5ndGgpIHtcbiAqICAgICAgICAgICAuLi5cbiAqICAgICAgIH1cbiAqXG4gKiAgICAgICBpZiAocmVjaXBpZW50U3RhdHVzQ2hhbmdlcy5sZW5ndGgpIHtcbiAqICAgICAgICAgICAuLi5cbiAqICAgICAgIH1cbiAqICAgfVxuICogfSk7XG4gKmBgYFxuICogTm90ZSB0aGF0IGBxdWVyeS5vbignY2hhbmdlOnByb3BlcnR5JywgZnVuY3Rpb24oZXZ0KSB7fWAgaXMgYWxzbyBzdXBwb3J0ZWQuXG4gKlxuICogQGNsYXNzICBsYXllci5RdWVyeVxuICogQGV4dGVuZHMgbGF5ZXIuUm9vdFxuICpcbiAqL1xuY29uc3QgUm9vdCA9IHJlcXVpcmUoJy4vcm9vdCcpO1xuY29uc3QgTGF5ZXJFcnJvciA9IHJlcXVpcmUoJy4vbGF5ZXItZXJyb3InKTtcbmNvbnN0IFV0aWwgPSByZXF1aXJlKCcuL2NsaWVudC11dGlscycpO1xuY29uc3QgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXInKTtcblxuY29uc3QgQ09OVkVSU0FUSU9OID0gJ0NvbnZlcnNhdGlvbic7XG5jb25zdCBNRVNTQUdFID0gJ01lc3NhZ2UnO1xuY29uc3QgZmluZENvbnZJZFJlZ2V4ID0gbmV3IFJlZ0V4cChcbiAgL15jb252ZXJzYXRpb24uaWRcXHMqPVxccypbJ1wiXSgodGVtcF8pP2xheWVyOlxcL1xcL1xcL2NvbnZlcnNhdGlvbnNcXC8uezh9LS57NH0tLns0fS0uezR9LS57MTJ9KVsnXCJdJC8pO1xuXG5jbGFzcyBRdWVyeSBleHRlbmRzIFJvb3Qge1xuXG4gIGNvbnN0cnVjdG9yKC4uLmFyZ3MpIHtcbiAgICBsZXQgb3B0aW9ucztcbiAgICBpZiAoYXJncy5sZW5ndGggPT09IDIpIHtcbiAgICAgIG9wdGlvbnMgPSBhcmdzWzFdLmJ1aWxkKCk7XG4gICAgICBvcHRpb25zLmNsaWVudCA9IGFyZ3NbMF07XG4gICAgfSBlbHNlIHtcbiAgICAgIG9wdGlvbnMgPSBhcmdzWzBdO1xuICAgIH1cbiAgICBpZiAoJ3BhZ2luYXRpb25XaW5kb3cnIGluIG9wdGlvbnMpIHtcbiAgICAgIGNvbnN0IHBhZ2luYXRpb25XaW5kb3cgPSBvcHRpb25zLnBhZ2luYXRpb25XaW5kb3c7XG4gICAgICBvcHRpb25zLnBhZ2luYXRpb25XaW5kb3cgPSBNYXRoLm1pbihRdWVyeS5NYXhQYWdlU2l6ZSwgb3B0aW9ucy5wYWdpbmF0aW9uV2luZG93KTtcbiAgICAgIGlmIChvcHRpb25zLnBhZ2luYXRpb25XaW5kb3cgIT09IHBhZ2luYXRpb25XaW5kb3cpIHtcbiAgICAgICAgTG9nZ2VyLndhcm4oYHBhZ2luYXRpb25XaW5kb3cgdmFsdWUgJHtwYWdpbmF0aW9uV2luZG93fSBpbiBRdWVyeSBjb25zdHJ1Y3RvciBgICtcbiAgICAgICAgICBgZXhjZWRlcyBRdWVyeS5NYXhQYWdlU2l6ZSBvZiAke1F1ZXJ5Lk1heFBhZ2VTaXplfWApO1xuICAgICAgfVxuICAgIH1cblxuICAgIHN1cGVyKG9wdGlvbnMpO1xuICAgIHRoaXMuZGF0YSA9IFtdO1xuICAgIHRoaXMuX2luaXRpYWxQYWdpbmF0aW9uV2luZG93ID0gdGhpcy5wYWdpbmF0aW9uV2luZG93O1xuICAgIGlmICghdGhpcy5jbGllbnQpIHRocm93IG5ldyBFcnJvcihMYXllckVycm9yLmRpY3Rpb25hcnkuY2xpZW50TWlzc2luZyk7XG4gICAgdGhpcy5jbGllbnQub24oJ2FsbCcsIHRoaXMuX2hhbmRsZUNoYW5nZUV2ZW50cywgdGhpcyk7XG5cbiAgICBpZiAoIXRoaXMuY2xpZW50LmlzUmVhZHkpIHtcbiAgICAgIHRoaXMuY2xpZW50Lm9uY2UoJ3JlYWR5JywgKCkgPT4gdGhpcy5fcnVuKCksIHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9ydW4oKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2xlYW51cCBhbmQgcmVtb3ZlIHRoaXMgUXVlcnksIGl0cyBzdWJzY3JpcHRpb25zIGFuZCBkYXRhLlxuICAgKlxuICAgKiBAbWV0aG9kIGRlc3Ryb3lcbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy5jbGllbnQub2ZmKG51bGwsIG51bGwsIHRoaXMpO1xuICAgIHRoaXMuY2xpZW50Ll9yZW1vdmVRdWVyeSh0aGlzKTtcbiAgICB0aGlzLmRhdGEgPSBudWxsO1xuICAgIHN1cGVyLmRlc3Ryb3koKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHByb3BlcnRpZXMgb2YgdGhlIFF1ZXJ5LlxuICAgKlxuICAgKiBDdXJyZW50bHkgc3VwcG9ydHMgdXBkYXRpbmc6XG4gICAqXG4gICAqICogcGFnaW5hdGlvbldpbmRvd1xuICAgKiAqIHByZWRpY2F0ZVxuICAgKiAqIG1vZGVsXG4gICAqXG4gICAqIEFueSBjaGFuZ2UgdG8gcHJlZGljYXRlIG9yIG1vZGVsIHJlc3VsdHMgaW4gY2xlYXJpbmcgYWxsIGRhdGEgZnJvbSB0aGVcbiAgICogcXVlcnkncyByZXN1bHRzIGFuZCB0cmlnZ2VyaW5nIGEgY2hhbmdlIGV2ZW50IHdpdGggW10gYXMgdGhlIG5ldyBkYXRhLlxuICAgKlxuICAgKiBAbWV0aG9kIHVwZGF0ZVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnNcbiAgICogQHBhcmFtIHtzdHJpbmd9IFtvcHRpb25zLnByZWRpY2F0ZV0gLSBBIG5ldyBwcmVkaWNhdGUgZm9yIHRoZSBxdWVyeVxuICAgKiBAcGFyYW0ge3N0cmluZ30gW29wdGlvbnMubW9kZWxdIC0gQSBuZXcgbW9kZWwgZm9yIHRoZSBRdWVyeVxuICAgKiBAcGFyYW0ge251bWJlcn0gW3BhZ2luYXRpb25XaW5kb3ddIC0gSW5jcmVhc2UvZGVjcmVhc2Ugb3VyIHJlc3VsdCBzaXplIHRvIG1hdGNoIHRoaXMgcGFnaW5hdGlvbiB3aW5kb3cuXG4gICAqIEByZXR1cm4ge2xheWVyLlF1ZXJ5fSB0aGlzXG4gICAqL1xuICB1cGRhdGUob3B0aW9ucyA9IHt9KSB7XG4gICAgbGV0IG5lZWRzUmVmcmVzaCxcbiAgICAgIG5lZWRzUmVjcmVhdGU7XG5cbiAgICBjb25zdCBvcHRpb25zQnVpbHQgPSAodHlwZW9mIG9wdGlvbnMuYnVpbGQgPT09ICdmdW5jdGlvbicpID8gb3B0aW9ucy5idWlsZCgpIDogb3B0aW9ucztcblxuICAgIGlmICgncGFnaW5hdGlvbldpbmRvdycgaW4gb3B0aW9uc0J1aWx0ICYmIHRoaXMucGFnaW5hdGlvbldpbmRvdyAhPT0gb3B0aW9uc0J1aWx0LnBhZ2luYXRpb25XaW5kb3cpIHtcbiAgICAgIHRoaXMucGFnaW5hdGlvbldpbmRvdyA9IE1hdGgubWluKFF1ZXJ5Lk1heFBhZ2VTaXplICsgdGhpcy5zaXplLCBvcHRpb25zQnVpbHQucGFnaW5hdGlvbldpbmRvdyk7XG4gICAgICBpZiAodGhpcy5wYWdpbmF0aW9uV2luZG93IDwgb3B0aW9uc0J1aWx0LnBhZ2luYXRpb25XaW5kb3cpIHtcbiAgICAgICAgTG9nZ2VyLndhcm4oYHBhZ2luYXRpb25XaW5kb3cgdmFsdWUgJHtvcHRpb25zQnVpbHQucGFnaW5hdGlvbldpbmRvd30gaW4gUXVlcnkudXBkYXRlKCkgaW5jcmVhc2VzIHNpemUgZ3JlYXRlciB0aGFuIFF1ZXJ5Lk1heFBhZ2VTaXplIG9mICR7UXVlcnkuTWF4UGFnZVNpemV9YCk7XG4gICAgICB9XG4gICAgICBuZWVkc1JlZnJlc2ggPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoJ3ByZWRpY2F0ZScgaW4gb3B0aW9uc0J1aWx0ICYmIHRoaXMucHJlZGljYXRlICE9PSBvcHRpb25zQnVpbHQucHJlZGljYXRlKSB7XG4gICAgICB0aGlzLnByZWRpY2F0ZSA9IG9wdGlvbnNCdWlsdC5wcmVkaWNhdGUgfHwgJyc7XG4gICAgICBuZWVkc1JlY3JlYXRlID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKCdtb2RlbCcgaW4gb3B0aW9uc0J1aWx0ICYmIHRoaXMubW9kZWwgIT09IG9wdGlvbnNCdWlsdC5tb2RlbCkge1xuICAgICAgdGhpcy5tb2RlbCA9IG9wdGlvbnNCdWlsdC5tb2RlbDtcbiAgICAgIG5lZWRzUmVjcmVhdGUgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoJ3NvcnRCeScgaW4gb3B0aW9uc0J1aWx0ICYmIEpTT04uc3RyaW5naWZ5KHRoaXMuc29ydEJ5KSAhPT0gSlNPTi5zdHJpbmdpZnkob3B0aW9uc0J1aWx0LnNvcnRCeSkpIHtcbiAgICAgIHRoaXMuc29ydEJ5ID0gb3B0aW9uc0J1aWx0LnNvcnRCeTtcbiAgICAgIG5lZWRzUmVjcmVhdGUgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAobmVlZHNSZWNyZWF0ZSkge1xuICAgICAgdGhpcy5fcmVzZXQoKTtcbiAgICB9XG4gICAgaWYgKG5lZWRzUmVjcmVhdGUgfHwgbmVlZHNSZWZyZXNoKSB0aGlzLl9ydW4oKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBBZnRlciByZWRlZmluaW5nIHRoZSBxdWVyeSwgcmVzZXQgaXQ6IHJlbW92ZSBhbGwgZGF0YS9yZXNldCBhbGwgc3RhdGUuXG4gICAqXG4gICAqIEBtZXRob2QgX3Jlc2V0XG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcmVzZXQoKSB7XG4gICAgdGhpcy50b3RhbFNpemUgPSAwO1xuICAgIGNvbnN0IGRhdGEgPSB0aGlzLmRhdGE7XG4gICAgdGhpcy5kYXRhID0gW107XG4gICAgdGhpcy5jbGllbnQuX2NoZWNrQ2FjaGUoZGF0YSk7XG4gICAgdGhpcy5pc0ZpcmluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3ByZWRpY2F0ZSA9IG51bGw7XG4gICAgdGhpcy5wYWdpbmF0aW9uV2luZG93ID0gdGhpcy5faW5pdGlhbFBhZ2luYXRpb25XaW5kb3c7XG4gICAgdGhpcy5fdHJpZ2dlckNoYW5nZSh7XG4gICAgICBkYXRhOiBbXSxcbiAgICAgIHR5cGU6ICdyZXNldCcsXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmVzZXQgeW91ciBxdWVyeSB0byBpdHMgaW5pdGlhbCBzdGF0ZSBhbmQgdGhlbiByZXJ1biBpdC5cbiAgICpcbiAgICogQG1ldGhvZCByZXNldFxuICAgKi9cbiAgcmVzZXQoKSB7XG4gICAgdGhpcy5fcmVzZXQoKTtcbiAgICB0aGlzLl9ydW4oKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGVjdXRlIHRoZSBxdWVyeS5cbiAgICpcbiAgICogTm8sIGRvbid0IG11cmRlciBpdCwganVzdCBmaXJlIGl0LiAgTm8sIGRvbid0IG1ha2UgaXQgdW5lbXBsb3llZCxcbiAgICoganVzdCBjb25uZWN0IHRvIHRoZSBzZXJ2ZXIgYW5kIGdldCB0aGUgcmVzdWx0cy5cbiAgICpcbiAgICogQG1ldGhvZCBfcnVuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcnVuKCkge1xuICAgIC8vIEZpbmQgdGhlIG51bWJlciBvZiBpdGVtcyB3ZSBuZWVkIHRvIHJlcXVlc3QuXG4gICAgY29uc3QgcGFnZVNpemUgPSBNYXRoLm1pbih0aGlzLnBhZ2luYXRpb25XaW5kb3cgLSB0aGlzLnNpemUsIFF1ZXJ5Lk1heFBhZ2VTaXplKTtcblxuICAgIC8vIElmIHRoZXJlIGlzIGEgcmVkdWN0aW9uIGluIHBhZ2luYXRpb24gd2luZG93LCB0aGVuIHRoaXMgdmFyaWFibGUgd2lsbCBiZSBuZWdhdGl2ZSwgYW5kIHdlIGNhbiBzaHJpbmtcbiAgICAvLyB0aGUgZGF0YS5cbiAgICBpZiAocGFnZVNpemUgPCAwKSB7XG4gICAgICBjb25zdCByZW1vdmVkRGF0YSA9IHRoaXMuZGF0YS5zbGljZSh0aGlzLnBhZ2luYXRpb25XaW5kb3cpO1xuICAgICAgdGhpcy5kYXRhID0gdGhpcy5kYXRhLnNsaWNlKDAsIHRoaXMucGFnaW5hdGlvbldpbmRvdyk7XG4gICAgICB0aGlzLmNsaWVudC5fY2hlY2tDYWNoZShyZW1vdmVkRGF0YSk7XG4gICAgICB0aGlzLl90cmlnZ2VyQXN5bmMoJ2NoYW5nZScsIHsgZGF0YTogW10gfSk7XG4gICAgfSBlbHNlIGlmIChwYWdlU2l6ZSA9PT0gMCkge1xuICAgICAgLy8gTm8gbmVlZCB0byBsb2FkIDAgcmVzdWx0cy5cbiAgICB9IGVsc2UgaWYgKHRoaXMubW9kZWwgPT09IENPTlZFUlNBVElPTikge1xuICAgICAgdGhpcy5fcnVuQ29udmVyc2F0aW9uKHBhZ2VTaXplKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMubW9kZWwgPT09IE1FU1NBR0UgJiYgdGhpcy5wcmVkaWNhdGUpIHtcbiAgICAgIHRoaXMuX3J1bk1lc3NhZ2UocGFnZVNpemUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgQ29udmVyc2F0aW9ucyBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqIEBtZXRob2QgX3J1bkNvbnZlcnNhdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0gIHtudW1iZXJ9IHBhZ2VTaXplIC0gTnVtYmVyIG9mIG5ldyByZXN1bHRzIHRvIHJlcXVlc3RcbiAgICovXG4gIF9ydW5Db252ZXJzYXRpb24ocGFnZVNpemUpIHtcbiAgICAvLyBUaGlzIGlzIGEgcGFnaW5hdGlvbiByYXRoZXIgdGhhbiBhbiBpbml0aWFsIHJlcXVlc3QgaWYgdGhlcmUgaXMgYWxyZWFkeSBkYXRhOyBnZXQgdGhlIGZyb21JZFxuICAgIC8vIHdoaWNoIGlzIHRoZSBpZCBvZiB0aGUgbGFzdCByZXN1bHQuXG4gICAgY29uc3QgbGFzdENvbnZlcnNhdGlvbiA9IHRoaXMuZGF0YVt0aGlzLmRhdGEubGVuZ3RoIC0gMV07XG4gICAgY29uc3QgbGFzdENvbnZlcnNhdGlvbkluc3RhbmNlID0gIWxhc3RDb252ZXJzYXRpb24gPyBudWxsIDogdGhpcy5fZ2V0SW5zdGFuY2UobGFzdENvbnZlcnNhdGlvbik7XG4gICAgY29uc3QgZnJvbUlkID0gKGxhc3RDb252ZXJzYXRpb25JbnN0YW5jZSAmJiBsYXN0Q29udmVyc2F0aW9uSW5zdGFuY2UuaXNTYXZlZCgpID9cbiAgICAgICcmZnJvbV9pZD0nICsgbGFzdENvbnZlcnNhdGlvbkluc3RhbmNlLmlkIDogJycpO1xuICAgIGNvbnN0IHNvcnRCeSA9IHRoaXMuX2dldFNvcnRGaWVsZCgpO1xuXG4gICAgdGhpcy5pc0ZpcmluZyA9IHRydWU7XG4gICAgY29uc3QgZmlyaW5nUmVxdWVzdCA9IHRoaXMuX2ZpcmluZ1JlcXVlc3QgPSBgY29udmVyc2F0aW9ucz9zb3J0X2J5PSR7c29ydEJ5fSZwYWdlX3NpemU9JHtwYWdlU2l6ZX0ke2Zyb21JZH1gO1xuICAgIHRoaXMuY2xpZW50Lnhocih7XG4gICAgICB1cmw6IGZpcmluZ1JlcXVlc3QsXG4gICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgc3luYzogZmFsc2UsXG4gICAgfSwgcmVzdWx0cyA9PiB0aGlzLl9wcm9jZXNzUnVuUmVzdWx0cyhyZXN1bHRzLCBmaXJpbmdSZXF1ZXN0KSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgc29ydCBmaWVsZCBmb3IgdGhlIHF1ZXJ5LlxuICAgKlxuICAgKiBSZXR1cm5zIE9uZSBvZjpcbiAgICpcbiAgICogKiAncG9zaXRpb24nIChNZXNzYWdlcyBvbmx5KVxuICAgKiAqICdsYXN0X21lc3NhZ2UnIChDb252ZXJzYXRpb25zIG9ubHkpXG4gICAqICogJ2NyZWF0ZWRfYXQnIChDb252ZXJzYXRpb25zIG9ubHkpXG4gICAqIEBtZXRob2QgX2dldFNvcnRGaWVsZFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2dldFNvcnRGaWVsZCgpIHtcbiAgICBpZiAodGhpcy5tb2RlbCA9PT0gTUVTU0FHRSkgcmV0dXJuICdwb3NpdGlvbic7XG4gICAgaWYgKHRoaXMuc29ydEJ5ICYmIHRoaXMuc29ydEJ5WzBdICYmIHRoaXMuc29ydEJ5WzBdWydsYXN0TWVzc2FnZS5zZW50QXQnXSkgcmV0dXJuICdsYXN0X21lc3NhZ2UnO1xuICAgIHJldHVybiAnY3JlYXRlZF9hdCc7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBDb252ZXJzYXRpb24gVVVJRCBmcm9tIHRoZSBwcmVkaWNhdGUgcHJvcGVydHkuXG4gICAqXG4gICAqIEV4dHJhY3QgdGhlIENvbnZlcnNhdGlvbidzIFVVSUQgZnJvbSB0aGUgcHJlZGljYXRlLi4uIG9yIHJldHVybmVkIHRoZSBjYWNoZWQgdmFsdWUuXG4gICAqXG4gICAqIEBtZXRob2QgX2dldENvbnZlcnNhdGlvblVVSURcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9nZXRDb252ZXJzYXRpb25QcmVkaWNhdGVJZHMoKSB7XG4gICAgaWYgKHRoaXMucHJlZGljYXRlLm1hdGNoKGZpbmRDb252SWRSZWdleCkpIHtcbiAgICAgIGNvbnN0IGNvbnZlcnNhdGlvbklkID0gdGhpcy5wcmVkaWNhdGUucmVwbGFjZShmaW5kQ29udklkUmVnZXgsICckMScpO1xuXG4gICAgICAvLyBXZSB3aWxsIGFscmVhZHkgaGF2ZSBhIHRoaXMuX3ByZWRpY2F0ZSBpZiB3ZSBhcmUgcGFnaW5nOyBlbHNlIHdlIG5lZWQgdG8gZXh0cmFjdCB0aGUgVVVJRCBmcm9tXG4gICAgICAvLyB0aGUgY29udmVyc2F0aW9uSWQuXG4gICAgICBjb25zdCB1dWlkID0gKHRoaXMuX3ByZWRpY2F0ZSB8fCBjb252ZXJzYXRpb25JZCkucmVwbGFjZSgvXih0ZW1wXyk/bGF5ZXJcXDpcXC9cXC9cXC9jb252ZXJzYXRpb25zXFwvLywgJycpO1xuICAgICAgaWYgKHV1aWQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICB1dWlkLFxuICAgICAgICAgIGlkOiBjb252ZXJzYXRpb25JZCxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0IE1lc3NhZ2VzIGZyb20gdGhlIHNlcnZlci5cbiAgICpcbiAgICogQG1ldGhvZCBfcnVuTWVzc2FnZVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0gIHtudW1iZXJ9IHBhZ2VTaXplIC0gTnVtYmVyIG9mIG5ldyByZXN1bHRzIHRvIHJlcXVlc3RcbiAgICovXG4gIF9ydW5NZXNzYWdlKHBhZ2VTaXplKSB7XG4gICAgLy8gVGhpcyBpcyBhIHBhZ2luYXRpb24gcmF0aGVyIHRoYW4gYW4gaW5pdGlhbCByZXF1ZXN0IGlmIHRoZXJlIGlzIGFscmVhZHkgZGF0YTsgZ2V0IHRoZSBmcm9tSWRcbiAgICAvLyB3aGljaCBpcyB0aGUgaWQgb2YgdGhlIGxhc3QgcmVzdWx0LlxuICAgIGNvbnN0IGxhc3RNZXNzYWdlID0gdGhpcy5kYXRhW3RoaXMuZGF0YS5sZW5ndGggLSAxXTtcbiAgICBjb25zdCBsYXN0TWVzc2FnZUluc3RhbmNlID0gIWxhc3RNZXNzYWdlID8gbnVsbCA6IHRoaXMuX2dldEluc3RhbmNlKGxhc3RNZXNzYWdlKTtcbiAgICBsZXQgZnJvbUlkID0gKGxhc3RNZXNzYWdlSW5zdGFuY2UgJiYgbGFzdE1lc3NhZ2VJbnN0YW5jZS5pc1NhdmVkKCkgPyAnJmZyb21faWQ9JyArIGxhc3RNZXNzYWdlSW5zdGFuY2UuaWQgOiAnJyk7XG4gICAgY29uc3QgcHJlZGljYXRlSWRzID0gdGhpcy5fZ2V0Q29udmVyc2F0aW9uUHJlZGljYXRlSWRzKCk7XG5cbiAgICAvLyBEbyBub3RoaW5nIGlmIHdlIGRvbid0IGhhdmUgYSBjb252ZXJzYXRpb24gdG8gcXVlcnkgb25cbiAgICBpZiAocHJlZGljYXRlSWRzKSB7XG4gICAgICBjb25zdCBjb252ZXJzYXRpb25JZCA9ICdsYXllcjovLy9jb252ZXJzYXRpb25zLycgKyBwcmVkaWNhdGVJZHMudXVpZDtcbiAgICAgIGlmICghdGhpcy5fcHJlZGljYXRlKSB0aGlzLl9wcmVkaWNhdGUgPSBwcmVkaWNhdGVJZHMuaWQ7XG4gICAgICBjb25zdCBjb252ZXJzYXRpb24gPSB0aGlzLmNsaWVudC5nZXRDb252ZXJzYXRpb24oY29udmVyc2F0aW9uSWQpO1xuXG4gICAgICAvLyBJZiB0aGUgb25seSBNZXNzYWdlIGlzIHRoZSBDb252ZXJzYXRpb24ncyBsYXN0TWVzc2FnZSwgdGhlbiB3ZSBwcm9iYWJseSBnb3QgdGhpc1xuICAgICAgLy8gcmVzdWx0IGZyb20gYEdFVCAvY29udmVyc2F0aW9uc2AsIGFuZCBub3QgZnJvbSBgR0VUIC9tZXNzYWdlc2AuICBHZXQgQUxMIE1lc3NhZ2VzLFxuICAgICAgLy8gbm90IGp1c3QgbWVzc2FnZXMgYWZ0ZXIgdGhlIGBsYXN0TWVzc2FnZWAgaWYgd2UndmUgbmV2ZXIgcmVjZWl2ZWQgYW55IG1lc3NhZ2VzIGZyb21cbiAgICAgIC8vIGBHRVQgL21lc3NhZ2VzYCAoc2FmZXR5IGNvZGUsIG5vdCByZXF1aXJlZCBjb2RlKS4gIFRoaXMgYWxzbyBtZWFucyB0aGF0IHRoZSBmaXJzdFxuICAgICAgLy8gUXVlcnkgZ2V0cyBNQVhfUEFHRV9TSVpFIHJlc3VsdHMgaW5zdGVhZCBvZiBNQVhfUEFHRV9TSVpFICsgMSByZXN1bHRzLlxuICAgICAgaWYgKGNvbnZlcnNhdGlvbiAmJiBjb252ZXJzYXRpb24ubGFzdE1lc3NhZ2UgJiZcbiAgICAgICAgICBsYXN0TWVzc2FnZSAmJiBsYXN0TWVzc2FnZS5pZCA9PT0gY29udmVyc2F0aW9uLmxhc3RNZXNzYWdlLmlkKSB7XG4gICAgICAgIGZyb21JZCA9ICcnO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGUgbGFzdCBtZXNzYWdlIHdlIGhhdmUgbG9hZGVkIGlzIGFscmVhZHkgdGhlIENvbnZlcnNhdGlvbidzIGxhc3RNZXNzYWdlLCB0aGVuIGp1c3QgcmVxdWVzdCBkYXRhIHdpdGhvdXQgcGFnaW5nLFxuICAgICAgLy8gY29tbW9uIG9jY3VyZW5jZSB3aGVuIHF1ZXJ5IGlzIHBvcHVsYXRlZCB3aXRoIG9ubHkgYSBzaW5nbGUgcmVzdWx0OiBjb252ZXJzYXRpb24ubGFzdE1lc3NhZ2UuXG4gICAgICAvLyBpZiAoY29udmVyc2F0aW9uICYmIGNvbnZlcnNhdGlvbi5sYXN0TWVzc2FnZSAmJiBsYXN0TWVzc2FnZSAmJiBsYXN0TWVzc2FnZS5pZCA9PT0gY29udmVyc2F0aW9uLmxhc3RNZXNzYWdlLmlkKSBmcm9tSWQgPSAnJztcbiAgICAgIGNvbnN0IG5ld1JlcXVlc3QgPSBgY29udmVyc2F0aW9ucy8ke3ByZWRpY2F0ZUlkcy51dWlkfS9tZXNzYWdlcz9wYWdlX3NpemU9JHtwYWdlU2l6ZX0ke2Zyb21JZH1gO1xuXG4gICAgICAvLyBEb24ndCBxdWVyeSBvbiB0ZW1wb3JhcnkgaWRzLCBub3IgcmVwZWF0IHN0aWxsIGZpcmluZyBxdWVyaWVzXG4gICAgICBpZiAoIXRoaXMuX3ByZWRpY2F0ZS5tYXRjaCgvdGVtcF8vKSAmJiBuZXdSZXF1ZXN0ICE9PSB0aGlzLl9maXJpbmdSZXF1ZXN0KSB7XG4gICAgICAgIHRoaXMuaXNGaXJpbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLl9maXJpbmdSZXF1ZXN0ID0gbmV3UmVxdWVzdDtcbiAgICAgICAgdGhpcy5jbGllbnQueGhyKHtcbiAgICAgICAgICB1cmw6IG5ld1JlcXVlc3QsXG4gICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICBzeW5jOiBmYWxzZSxcbiAgICAgICAgfSwgcmVzdWx0cyA9PiB0aGlzLl9wcm9jZXNzUnVuUmVzdWx0cyhyZXN1bHRzLCBuZXdSZXF1ZXN0KSk7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHRoZXJlIGFyZSBubyByZXN1bHRzLCB0aGVuIGl0cyBhIG5ldyBxdWVyeTsgYXV0b21hdGljYWxseSBwb3B1bGF0ZSBpdCB3aXRoIHRoZSBDb252ZXJzYXRpb24ncyBsYXN0TWVzc2FnZS5cbiAgICAgIGlmICh0aGlzLmRhdGEubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGlmIChjb252ZXJzYXRpb24gJiYgY29udmVyc2F0aW9uLmxhc3RNZXNzYWdlKSB7XG4gICAgICAgICAgdGhpcy5kYXRhID0gW3RoaXMuX2dldERhdGEoY29udmVyc2F0aW9uLmxhc3RNZXNzYWdlKV07XG4gICAgICAgICAgLy8gVHJpZ2dlciB0aGUgY2hhbmdlIGV2ZW50XG4gICAgICAgICAgdGhpcy5fdHJpZ2dlckNoYW5nZSh7XG4gICAgICAgICAgICB0eXBlOiAnZGF0YScsXG4gICAgICAgICAgICBkYXRhOiB0aGlzLl9nZXREYXRhKGNvbnZlcnNhdGlvbi5sYXN0TWVzc2FnZSksXG4gICAgICAgICAgICBxdWVyeTogdGhpcyxcbiAgICAgICAgICAgIHRhcmdldDogdGhpcy5jbGllbnQsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCF0aGlzLnByZWRpY2F0ZS5tYXRjaCgvWydcIl0vKSkge1xuICAgICAgTG9nZ2VyLmVycm9yKCdUaGlzIHF1ZXJ5IG1heSBuZWVkIHRvIHF1b3RlIGl0cyB2YWx1ZScpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzIHRoZSByZXN1bHRzIG9mIHRoZSBgX3J1bmAgbWV0aG9kOyBjYWxscyBfX2FwcGVuZFJlc3VsdHMuXG4gICAqXG4gICAqIEBtZXRob2QgX3Byb2Nlc3NSdW5SZXN1bHRzXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdH0gcmVzdWx0cyAtIEZ1bGwgeGhyIHJlc3BvbnNlIG9iamVjdCB3aXRoIHNlcnZlciByZXN1bHRzXG4gICAqL1xuICBfcHJvY2Vzc1J1blJlc3VsdHMocmVzdWx0cywgcmVxdWVzdFVybCkge1xuICAgIGlmIChyZXF1ZXN0VXJsICE9PSB0aGlzLl9maXJpbmdSZXF1ZXN0IHx8IHRoaXMuaXNEZXN0cm95ZWQpIHJldHVybjtcblxuICAgIHRoaXMuaXNGaXJpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9maXJpbmdSZXF1ZXN0ID0gJyc7XG4gICAgaWYgKHJlc3VsdHMuc3VjY2Vzcykge1xuXG4gICAgICAvLyBJZiB0aGVyZSBhcmUgcmVzdWx0cywgdXNlIHRoZW1cbiAgICAgIGlmIChyZXN1bHRzLmRhdGEubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuX3JldHJ5Q291bnQgPSAwO1xuICAgICAgICB0aGlzLl9hcHBlbmRSZXN1bHRzKHJlc3VsdHMpO1xuICAgICAgICB0aGlzLnRvdGFsU2l6ZSA9IE51bWJlcihyZXN1bHRzLnhoci5nZXRSZXNwb25zZUhlYWRlcignTGF5ZXItQ291bnQnKSB8fCAwKTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vIHJlc3VsdHMsIGFuZCB3ZSBoYXZlIG5vIHJlc3VsdHMsIHRoZXJlIG1heSBiZSBkYXRhIHN0aWxsIHN5bmNpbmcgdG8gdGhlIHNlcnZlcjsgc28gcG9sbCBmb3IgYSBiaXRcbiAgICAgIGVsc2UgaWYgKHRoaXMuc2l6ZSA9PT0gMCkge1xuICAgICAgICBpZiAodGhpcy5fcmV0cnlDb3VudCA8IFF1ZXJ5Lk1heFJldHJ5Q291bnQpIHtcbiAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3JldHJ5Q291bnQrKztcbiAgICAgICAgICAgIHRoaXMuX3J1bigpO1xuICAgICAgICAgIH0sIDE1MDApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gV2UndmUgcG9sbGVkIGZvciBhIGJpdC4gIE5vIGRhdGEuICBQcmVzdW1lIHRoZXJlIGlzIGluIGZhY3Qgbm8gZGF0YVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB0aGlzLl9yZXRyeUNvdW50ID0gMDtcbiAgICAgICAgICB0aGlzLl90cmlnZ2VyQ2hhbmdlKHtcbiAgICAgICAgICAgIHR5cGU6ICdkYXRhJyxcbiAgICAgICAgICAgIGRhdGE6IFtdLFxuICAgICAgICAgICAgcXVlcnk6IHRoaXMsXG4gICAgICAgICAgICB0YXJnZXQ6IHRoaXMuY2xpZW50LFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudHJpZ2dlcignZXJyb3InLCB7IGVycm9yOiByZXN1bHRzLmRhdGEgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFwcGVuZHMgYXJyYXlzIG9mIGRhdGEgdG8gdGhlIFF1ZXJ5IHJlc3VsdHMuXG4gICAqXG4gICAqIEBtZXRob2QgIF9hcHBlbmRSZXN1bHRzXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfYXBwZW5kUmVzdWx0cyhyZXN1bHRzKSB7XG4gICAgLy8gRm9yIGFsbCByZXN1bHRzLCByZWdpc3RlciB0aGVtIHdpdGggdGhlIGNsaWVudFxuICAgIC8vIElmIGFscmVhZHkgcmVnaXN0ZXJlZCB3aXRoIHRoZSBjbGllbnQsIHByb3BlcnRpZXMgd2lsbCBiZSB1cGRhdGVkIGFzIG5lZWRlZFxuICAgIHJlc3VsdHMuZGF0YS5mb3JFYWNoKGl0ZW0gPT4gdGhpcy5jbGllbnQuX2NyZWF0ZU9iamVjdChpdGVtKSk7XG5cbiAgICAvLyBGaWx0ZXIgcmVzdWx0cyB0byBqdXN0IHRoZSBuZXcgcmVzdWx0c1xuICAgIGNvbnN0IG5ld1Jlc3VsdHMgPSByZXN1bHRzLmRhdGEuZmlsdGVyKGl0ZW0gPT4gdGhpcy5fZ2V0SW5kZXgoaXRlbS5pZCkgPT09IC0xKTtcblxuICAgIC8vIFVwZGF0ZSB0aGlzLmRhdGFcbiAgICBpZiAodGhpcy5kYXRhVHlwZSA9PT0gUXVlcnkuT2JqZWN0RGF0YVR5cGUpIHtcbiAgICAgIHRoaXMuZGF0YSA9IFtdLmNvbmNhdCh0aGlzLmRhdGEpO1xuICAgIH1cbiAgICBjb25zdCBkYXRhID0gdGhpcy5kYXRhO1xuICAgIG5ld1Jlc3VsdHMuZm9yRWFjaChpdGVtSW4gPT4ge1xuICAgICAgbGV0IGluZGV4O1xuICAgICAgY29uc3QgaXRlbSA9IHRoaXMuY2xpZW50Ll9nZXRPYmplY3QoaXRlbUluLmlkKTtcbiAgICAgIGlmICh0aGlzLm1vZGVsID09PSBNRVNTQUdFKSB7XG4gICAgICAgIGluZGV4ID0gdGhpcy5fZ2V0SW5zZXJ0TWVzc2FnZUluZGV4KGl0ZW0sIGRhdGEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW5kZXggPSB0aGlzLl9nZXRJbnNlcnRDb252ZXJzYXRpb25JbmRleChpdGVtLCBkYXRhKTtcbiAgICAgIH1cbiAgICAgIGRhdGEuc3BsaWNlKGluZGV4LCAwLCB0aGlzLl9nZXREYXRhKGl0ZW0pKTtcbiAgICB9KTtcblxuXG4gICAgLy8gVHJpZ2dlciB0aGUgY2hhbmdlIGV2ZW50XG4gICAgdGhpcy5fdHJpZ2dlckNoYW5nZSh7XG4gICAgICB0eXBlOiAnZGF0YScsXG4gICAgICBkYXRhOiByZXN1bHRzLmRhdGEubWFwKGl0ZW0gPT4gdGhpcy5fZ2V0RGF0YSh0aGlzLmNsaWVudC5fZ2V0T2JqZWN0KGl0ZW0uaWQpKSksXG4gICAgICBxdWVyeTogdGhpcyxcbiAgICAgIHRhcmdldDogdGhpcy5jbGllbnQsXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIGNvcnJlY3RseSBmb3JtYXR0ZWQgb2JqZWN0IHJlcHJlc2VudGluZyBhIHJlc3VsdC5cbiAgICpcbiAgICogRm9ybWF0IGlzIHNwZWNpZmllZCBieSB0aGUgYGRhdGFUeXBlYCBwcm9wZXJ0eS5cbiAgICpcbiAgICogQG1ldGhvZCBfZ2V0RGF0YVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0gIHtsYXllci5Sb290fSBpdGVtIC0gQ29udmVyc2F0aW9uIG9yIE1lc3NhZ2UgaW5zdGFuY2VcbiAgICogQHJldHVybiB7T2JqZWN0fSAtIENvbnZlcnNhdGlvbiBvciBNZXNzYWdlIGluc3RhbmNlIG9yIE9iamVjdFxuICAgKi9cbiAgX2dldERhdGEoaXRlbSkge1xuICAgIGlmICh0aGlzLmRhdGFUeXBlID09PSBRdWVyeS5PYmplY3REYXRhVHlwZSkge1xuICAgICAgcmV0dXJuIGl0ZW0udG9PYmplY3QoKTtcbiAgICB9XG4gICAgcmV0dXJuIGl0ZW07XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhbiBpbnN0YW5jZSByZWdhcmRsZXNzIG9mIHdoZXRoZXIgdGhlIGlucHV0IGlzIGluc3RhbmNlIG9yIG9iamVjdFxuICAgKiBAbWV0aG9kXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7bGF5ZXIuUm9vdHxPYmplY3R9IGl0ZW0gLSBDb252ZXJzYXRpb24gb3IgTWVzc2FnZSBvYmplY3QvaW5zdGFuY2VcbiAgICogQHJldHVybiB7bGF5ZXIuUm9vdH1cbiAgICovXG4gIF9nZXRJbnN0YW5jZShpdGVtKSB7XG4gICAgaWYgKGl0ZW0gaW5zdGFuY2VvZiBSb290KSByZXR1cm4gaXRlbTtcbiAgICByZXR1cm4gdGhpcy5jbGllbnQuX2dldE9iamVjdChpdGVtLmlkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBc2sgdGhlIHF1ZXJ5IGZvciB0aGUgaXRlbSBtYXRjaGluZyB0aGUgSUQuXG4gICAqXG4gICAqIFJldHVybnMgdW5kZWZpbmVkIGlmIHRoZSBJRCBpcyBub3QgZm91bmQuXG4gICAqXG4gICAqIEBtZXRob2QgX2dldEl0ZW1cbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtICB7c3RyaW5nfSBpZFxuICAgKiBAcmV0dXJuIHtPYmplY3R9IENvbnZlcnNhdGlvbiBvciBNZXNzYWdlIG9iamVjdCBvciBpbnN0YW5jZVxuICAgKi9cbiAgX2dldEl0ZW0oaWQpIHtcbiAgICBzd2l0Y2ggKFV0aWwudHlwZUZyb21JRChpZCkpIHtcbiAgICAgIGNhc2UgJ21lc3NhZ2VzJzpcbiAgICAgICAgaWYgKHRoaXMubW9kZWwgPT09IE1FU1NBR0UpIHtcbiAgICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuX2dldEluZGV4KGlkKTtcbiAgICAgICAgICByZXR1cm4gaW5kZXggPT09IC0xID8gbnVsbCA6IHRoaXMuZGF0YVtpbmRleF07XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5tb2RlbCA9PT0gQ09OVkVSU0FUSU9OKSB7XG4gICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IHRoaXMuZGF0YS5sZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgICAgIGNvbnN0IGNvbnZlcnNhdGlvbiA9IHRoaXMuZGF0YVtpbmRleF07XG4gICAgICAgICAgICBpZiAoY29udmVyc2F0aW9uLmxhc3RNZXNzYWdlICYmIGNvbnZlcnNhdGlvbi5sYXN0TWVzc2FnZS5pZCA9PT0gaWQpIHJldHVybiBjb252ZXJzYXRpb24ubGFzdE1lc3NhZ2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnY29udmVyc2F0aW9ucyc6XG4gICAgICAgIGlmICh0aGlzLm1vZGVsID09PSBDT05WRVJTQVRJT04pIHtcbiAgICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuX2dldEluZGV4KGlkKTtcbiAgICAgICAgICByZXR1cm4gaW5kZXggPT09IC0xID8gbnVsbCA6IHRoaXMuZGF0YVtpbmRleF07XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgaW5kZXggb2YgdGhlIGl0ZW0gcmVwcmVzZW50ZWQgYnkgdGhlIHNwZWNpZmllZCBJRDsgb3IgcmV0dXJuIC0xLlxuICAgKlxuICAgKiBAbWV0aG9kIF9nZXRJbmRleFxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IGlkXG4gICAqIEByZXR1cm4ge251bWJlcn1cbiAgICovXG4gIF9nZXRJbmRleChpZCkge1xuICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCB0aGlzLmRhdGEubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICBpZiAodGhpcy5kYXRhW2luZGV4XS5pZCA9PT0gaWQpIHJldHVybiBpbmRleDtcbiAgICB9XG4gICAgcmV0dXJuIC0xO1xuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZSBhbnkgY2hhbmdlIGV2ZW50IHJlY2VpdmVkIGZyb20gdGhlIGxheWVyLkNsaWVudC5cbiAgICpcbiAgICogVGhlc2UgY2FuIGJlIGNhdXNlZCBieSB3ZWJzb2NrZXQgZXZlbnRzLCBhcyB3ZWxsIGFzIGxvY2FsXG4gICAqIHJlcXVlc3RzIHRvIGNyZWF0ZS9kZWxldGUvbW9kaWZ5IENvbnZlcnNhdGlvbnMgYW5kIE1lc3NhZ2VzLlxuICAgKlxuICAgKiBUaGUgZXZlbnQgZG9lcyBub3QgbmVjZXNzYXJpbHkgYXBwbHkgdG8gdGhpcyBRdWVyeSwgYnV0IHRoZSBRdWVyeVxuICAgKiBtdXN0IGV4YW1pbmUgaXQgdG8gZGV0ZXJtaW5lIGlmIGl0IGFwcGxpZXMuXG4gICAqXG4gICAqIEBtZXRob2QgX2hhbmRsZUNoYW5nZUV2ZW50c1xuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge3N0cmluZ30gZXZlbnROYW1lIC0gXCJtZXNzYWdlczphZGRcIiwgXCJjb252ZXJzYXRpb25zOmNoYW5nZVwiXG4gICAqIEBwYXJhbSB7bGF5ZXIuTGF5ZXJFdmVudH0gZXZ0XG4gICAqL1xuICBfaGFuZGxlQ2hhbmdlRXZlbnRzKGV2ZW50TmFtZSwgZXZ0KSB7XG4gICAgaWYgKHRoaXMubW9kZWwgPT09IENPTlZFUlNBVElPTikge1xuICAgICAgdGhpcy5faGFuZGxlQ29udmVyc2F0aW9uRXZlbnRzKGV2dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2hhbmRsZU1lc3NhZ2VFdmVudHMoZXZ0KTtcbiAgICB9XG4gIH1cblxuICBfaGFuZGxlQ29udmVyc2F0aW9uRXZlbnRzKGV2dCkge1xuICAgIHN3aXRjaCAoZXZ0LmV2ZW50TmFtZSkge1xuXG4gICAgICAvLyBJZiBhIENvbnZlcnNhdGlvbidzIHByb3BlcnR5IGhhcyBjaGFuZ2VkLCBhbmQgdGhlIENvbnZlcnNhdGlvbiBpcyBpbiB0aGlzXG4gICAgICAvLyBRdWVyeSdzIGRhdGEsIHRoZW4gdXBkYXRlIGl0LlxuICAgICAgY2FzZSAnY29udmVyc2F0aW9uczpjaGFuZ2UnOlxuICAgICAgICB0aGlzLl9oYW5kbGVDb252ZXJzYXRpb25DaGFuZ2VFdmVudChldnQpO1xuICAgICAgICBicmVhaztcblxuICAgICAgLy8gSWYgYSBDb252ZXJzYXRpb24gaXMgYWRkZWQsIGFuZCBpdCBpc24ndCBhbHJlYWR5IGluIHRoZSBRdWVyeSxcbiAgICAgIC8vIGFkZCBpdCBhbmQgdHJpZ2dlciBhbiBldmVudFxuICAgICAgY2FzZSAnY29udmVyc2F0aW9uczphZGQnOlxuICAgICAgICB0aGlzLl9oYW5kbGVDb252ZXJzYXRpb25BZGRFdmVudChldnQpO1xuICAgICAgICBicmVhaztcblxuICAgICAgLy8gSWYgYSBDb252ZXJzYXRpb24gaXMgZGVsZXRlZCwgYW5kIGl0cyBzdGlsbCBpbiBvdXIgZGF0YSxcbiAgICAgIC8vIHJlbW92ZSBpdCBhbmQgdHJpZ2dlciBhbiBldmVudC5cbiAgICAgIGNhc2UgJ2NvbnZlcnNhdGlvbnM6cmVtb3ZlJzpcbiAgICAgICAgdGhpcy5faGFuZGxlQ29udmVyc2F0aW9uUmVtb3ZlRXZlbnQoZXZ0KTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgLy8gVE9ETyBXRUItOTY4OiBSZWZhY3RvciB0aGlzIGludG8gZnVuY3Rpb25zIGZvciBpbnN0YW5jZSwgb2JqZWN0LCBzb3J0QnkgY3JlYXRlZEF0LCBzb3J0QnkgbGFzdE1lc3NhZ2VcbiAgX2hhbmRsZUNvbnZlcnNhdGlvbkNoYW5nZUV2ZW50KGV2dCkge1xuICAgIGxldCBpbmRleCA9IHRoaXMuX2dldEluZGV4KGV2dC50YXJnZXQuaWQpO1xuXG4gICAgLy8gSWYgaXRzIGFuIElEIGNoYW5nZSAoZnJvbSB0ZW1wIHRvIG5vbi10ZW1wIGlkKSBtYWtlIHN1cmUgdG8gdXBkYXRlIG91ciBkYXRhLlxuICAgIC8vIElmIGRhdGFUeXBlIGlzIGFuIGluc3RhbmNlLCBpdHMgYmVlbiB1cGRhdGVkIGZvciB1cy5cbiAgICBpZiAodGhpcy5kYXRhVHlwZSA9PT0gUXVlcnkuT2JqZWN0RGF0YVR5cGUpIHtcbiAgICAgIGNvbnN0IGlkQ2hhbmdlcyA9IGV2dC5nZXRDaGFuZ2VzRm9yKCdpZCcpO1xuICAgICAgaWYgKGlkQ2hhbmdlcy5sZW5ndGgpIHtcbiAgICAgICAgaW5kZXggPSB0aGlzLl9nZXRJbmRleChpZENoYW5nZXNbMF0ub2xkVmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElmIGRhdGFUeXBlIGlzIFwib2JqZWN0XCIgdGhlbiB1cGRhdGUgdGhlIG9iamVjdCBhbmQgb3VyIGFycmF5O1xuICAgIC8vIGVsc2UgdGhlIG9iamVjdCBpcyBhbHJlYWR5IHVwZGF0ZWQuXG4gICAgLy8gSWdub3JlIHJlc3VsdHMgdGhhdCBhcmVuJ3QgYWxyZWFkeSBpbiBvdXIgZGF0YTsgUmVzdWx0cyBhcmUgYWRkZWQgdmlhXG4gICAgLy8gY29udmVyc2F0aW9uczphZGQgZXZlbnRzLiAgV2Vic29ja2V0IE1hbmFnZXIgYXV0b21hdGljYWxseSBsb2FkcyBhbnl0aGluZyB0aGF0IHJlY2VpdmVzIGFuIGV2ZW50XG4gICAgLy8gZm9yIHdoaWNoIHdlIGhhdmUgbm8gb2JqZWN0LCBzbyB3ZSdsbCBnZXQgdGhlIGFkZCBldmVudCBhdCB0aGF0IHRpbWUuXG4gICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgY29uc3Qgc29ydEZpZWxkID0gdGhpcy5fZ2V0U29ydEZpZWxkKCk7XG4gICAgICBjb25zdCByZW9yZGVyID0gZXZ0Lmhhc1Byb3BlcnR5KCdsYXN0TWVzc2FnZScpICYmIHNvcnRGaWVsZCA9PT0gJ2xhc3RfbWVzc2FnZSc7XG5cbiAgICAgIGlmICh0aGlzLmRhdGFUeXBlID09PSBRdWVyeS5PYmplY3REYXRhVHlwZSkge1xuICAgICAgICBpZiAoIXJlb3JkZXIpIHtcbiAgICAgICAgICAvLyBSZXBsYWNlIHRoZSBjaGFuZ2VkIENvbnZlcnNhdGlvbiB3aXRoIGEgbmV3IGltbXV0YWJsZSBvYmplY3RcbiAgICAgICAgICB0aGlzLmRhdGEgPSBbXG4gICAgICAgICAgICAuLi50aGlzLmRhdGEuc2xpY2UoMCwgaW5kZXgpLFxuICAgICAgICAgICAgZXZ0LnRhcmdldC50b09iamVjdCgpLFxuICAgICAgICAgICAgLi4udGhpcy5kYXRhLnNsaWNlKGluZGV4ICsgMSksXG4gICAgICAgICAgXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBNb3ZlIHRoZSBjaGFuZ2VkIENvbnZlcnNhdGlvbiB0byB0aGUgdG9wIG9mIHRoZSBsaXN0XG4gICAgICAgICAgdGhpcy5kYXRhLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgdGhpcy5kYXRhID0gW1xuICAgICAgICAgICAgZXZ0LnRhcmdldC50b09iamVjdCgpLFxuICAgICAgICAgICAgLi4udGhpcy5kYXRhLFxuICAgICAgICAgIF07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gRWxzZSBkYXRhVHlwZSBpcyBpbnN0YW5jZSBub3Qgb2JqZWN0XG4gICAgICBlbHNlIHtcbiAgICAgICAgaWYgKHJlb3JkZXIpIHtcbiAgICAgICAgICB0aGlzLmRhdGEuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICB0aGlzLmRhdGEudW5zaGlmdChldnQudGFyZ2V0KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBUcmlnZ2VyIGEgJ3Byb3BlcnR5JyBldmVudFxuICAgICAgdGhpcy5fdHJpZ2dlckNoYW5nZSh7XG4gICAgICAgIHR5cGU6ICdwcm9wZXJ0eScsXG4gICAgICAgIHRhcmdldDogdGhpcy5fZ2V0RGF0YShldnQudGFyZ2V0KSxcbiAgICAgICAgcXVlcnk6IHRoaXMsXG4gICAgICAgIGlzQ2hhbmdlOiB0cnVlLFxuICAgICAgICBjaGFuZ2VzOiBldnQuY2hhbmdlcyxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIF9nZXRJbnNlcnRDb252ZXJzYXRpb25JbmRleChjb252ZXJzYXRpb24sIGRhdGEpIHtcbiAgICBjb25zdCBzb3J0RmllbGQgPSB0aGlzLl9nZXRTb3J0RmllbGQoKTtcbiAgICBsZXQgaW5kZXg7XG4gICAgaWYgKHNvcnRGaWVsZCA9PT0gJ2NyZWF0ZWRfYXQnKSB7XG4gICAgICBmb3IgKGluZGV4ID0gMDsgaW5kZXggPCBkYXRhLmxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICBpZiAoY29udmVyc2F0aW9uLmNyZWF0ZWRBdCA+PSBkYXRhW2luZGV4XS5jcmVhdGVkQXQpIGJyZWFrO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGluZGV4O1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBkMSA9IGNvbnZlcnNhdGlvbi5sYXN0TWVzc2FnZSA/IGNvbnZlcnNhdGlvbi5sYXN0TWVzc2FnZS5zZW50QXQgOiBjb252ZXJzYXRpb24uY3JlYXRlZEF0O1xuICAgICAgZm9yIChpbmRleCA9IDA7IGluZGV4IDwgZGF0YS5sZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgY29uc3QgZDIgPSBkYXRhW2luZGV4XS5sYXN0TWVzc2FnZSA/IGRhdGFbaW5kZXhdLmxhc3RNZXNzYWdlLnNlbnRBdCA6IGRhdGFbaW5kZXhdLmNyZWF0ZWRBdDtcbiAgICAgICAgaWYgKGQxID49IGQyKSBicmVhaztcbiAgICAgIH1cbiAgICAgIHJldHVybiBpbmRleDtcbiAgICB9XG4gIH1cblxuICBfZ2V0SW5zZXJ0TWVzc2FnZUluZGV4KG1lc3NhZ2UsIGRhdGEpIHtcbiAgICBsZXQgaW5kZXg7XG4gICAgZm9yIChpbmRleCA9IDA7IGluZGV4IDwgZGF0YS5sZW5ndGg7IGluZGV4KyspIHtcbiAgICAgIGlmIChtZXNzYWdlLnBvc2l0aW9uID4gZGF0YVtpbmRleF0ucG9zaXRpb24pIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBpbmRleDtcbiAgfVxuXG5cbiAgX2hhbmRsZUNvbnZlcnNhdGlvbkFkZEV2ZW50KGV2dCkge1xuICAgIC8vIEZpbHRlciBvdXQgYW55IENvbnZlcnNhdGlvbnMgYWxyZWFkeSBpbiBvdXIgZGF0YVxuICAgIGNvbnN0IGxpc3QgPSBldnQuY29udmVyc2F0aW9uc1xuICAgICAgICAgICAgICAgICAgLmZpbHRlcihjb252ZXJzYXRpb24gPT4gdGhpcy5fZ2V0SW5kZXgoY29udmVyc2F0aW9uLmlkKSA9PT0gLTEpO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoKSB7XG4gICAgICBjb25zdCBkYXRhID0gdGhpcy5kYXRhO1xuICAgICAgbGlzdC5mb3JFYWNoKGNvbnZlcnNhdGlvbiA9PiB7XG4gICAgICAgIGNvbnN0IG5ld0luZGV4ID0gdGhpcy5fZ2V0SW5zZXJ0Q29udmVyc2F0aW9uSW5kZXgoY29udmVyc2F0aW9uLCBkYXRhKTtcbiAgICAgICAgZGF0YS5zcGxpY2UobmV3SW5kZXgsIDAsIHRoaXMuX2dldERhdGEoY29udmVyc2F0aW9uKSk7XG4gICAgICB9KTtcblxuICAgICAgLy8gV2hldGhlciBzb3J0aW5nIGJ5IGxhc3RfbWVzc2FnZSBvciBjcmVhdGVkX2F0LCBuZXcgcmVzdWx0cyBnbyBhdCB0aGUgdG9wIG9mIHRoZSBsaXN0XG4gICAgICBpZiAodGhpcy5kYXRhVHlwZSA9PT0gUXVlcnkuT2JqZWN0RGF0YVR5cGUpIHtcbiAgICAgICAgdGhpcy5kYXRhID0gW10uY29uY2F0KGRhdGEpO1xuICAgICAgfVxuICAgICAgdGhpcy50b3RhbFNpemUgKz0gbGlzdC5sZW5ndGg7XG5cbiAgICAgIC8vIFRyaWdnZXIgYW4gJ2luc2VydCcgZXZlbnQgZm9yIGVhY2ggaXRlbSBhZGRlZDtcbiAgICAgIC8vIHR5cGljYWxseSBidWxrIGluc2VydHMgaGFwcGVuIHZpYSBfYXBwZW5kUmVzdWx0cygpLlxuICAgICAgbGlzdC5mb3JFYWNoKChjb252ZXJzYXRpb24pID0+IHtcbiAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMuX2dldERhdGEoY29udmVyc2F0aW9uKTtcbiAgICAgICAgdGhpcy5fdHJpZ2dlckNoYW5nZSh7XG4gICAgICAgICAgdHlwZTogJ2luc2VydCcsXG4gICAgICAgICAgaW5kZXg6IHRoaXMuZGF0YS5pbmRleE9mKGl0ZW0pLFxuICAgICAgICAgIHRhcmdldDogaXRlbSxcbiAgICAgICAgICBxdWVyeTogdGhpcyxcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuXG4gIF9oYW5kbGVDb252ZXJzYXRpb25SZW1vdmVFdmVudChldnQpIHtcbiAgICBjb25zdCByZW1vdmVkID0gW107XG4gICAgZXZ0LmNvbnZlcnNhdGlvbnMuZm9yRWFjaChjb252ZXJzYXRpb24gPT4ge1xuICAgICAgY29uc3QgaW5kZXggPSB0aGlzLl9nZXRJbmRleChjb252ZXJzYXRpb24uaWQpO1xuICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICByZW1vdmVkLnB1c2goe1xuICAgICAgICAgIGRhdGE6IGNvbnZlcnNhdGlvbixcbiAgICAgICAgICBpbmRleCxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICh0aGlzLmRhdGFUeXBlID09PSBRdWVyeS5PYmplY3REYXRhVHlwZSkge1xuICAgICAgICAgIHRoaXMuZGF0YSA9IFsuLi50aGlzLmRhdGEuc2xpY2UoMCwgaW5kZXgpLCAuLi50aGlzLmRhdGEuc2xpY2UoaW5kZXggKyAxKV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5kYXRhLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMudG90YWxTaXplIC09IHJlbW92ZWQubGVuZ3RoO1xuICAgIHJlbW92ZWQuZm9yRWFjaChyZW1vdmVkT2JqID0+IHtcbiAgICAgIHRoaXMuX3RyaWdnZXJDaGFuZ2Uoe1xuICAgICAgICB0eXBlOiAncmVtb3ZlJyxcbiAgICAgICAgaW5kZXg6IHJlbW92ZWRPYmouaW5kZXgsXG4gICAgICAgIHRhcmdldDogdGhpcy5fZ2V0RGF0YShyZW1vdmVkT2JqLmRhdGEpLFxuICAgICAgICBxdWVyeTogdGhpcyxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgX2hhbmRsZU1lc3NhZ2VFdmVudHMoZXZ0KSB7XG4gICAgc3dpdGNoIChldnQuZXZlbnROYW1lKSB7XG5cbiAgICAgIC8vIElmIGEgQ29udmVyc2F0aW9uJ3MgSUQgaGFzIGNoYW5nZWQsIGNoZWNrIG91ciBwcmVkaWNhdGUsIGFuZCB1cGRhdGUgaXQgYXV0b21hdGljYWxseSBpZiBuZWVkZWQuXG4gICAgICBjYXNlICdjb252ZXJzYXRpb25zOmNoYW5nZSc6XG4gICAgICAgIHRoaXMuX2hhbmRsZU1lc3NhZ2VDb252SWRDaGFuZ2VFdmVudChldnQpO1xuICAgICAgICBicmVhaztcblxuICAgICAgLy8gSWYgYSBNZXNzYWdlIGhhcyBjaGFuZ2VkIGFuZCBpdHMgaW4gb3VyIHJlc3VsdCBzZXQsIHJlcGxhY2VcbiAgICAgIC8vIGl0IHdpdGggYSBuZXcgaW1tdXRhYmxlIG9iamVjdFxuICAgICAgY2FzZSAnbWVzc2FnZXM6Y2hhbmdlJzpcbiAgICAgIGNhc2UgJ21lc3NhZ2VzOnJlYWQnOlxuICAgICAgICB0aGlzLl9oYW5kbGVNZXNzYWdlQ2hhbmdlRXZlbnQoZXZ0KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIC8vIElmIE1lc3NhZ2VzIGFyZSBhZGRlZCwgYW5kIHRoZXkgYXJlbid0IGFscmVhZHkgaW4gb3VyIHJlc3VsdCBzZXRcbiAgICAgIC8vIGFkZCB0aGVtLlxuICAgICAgY2FzZSAnbWVzc2FnZXM6YWRkJzpcbiAgICAgICAgdGhpcy5faGFuZGxlTWVzc2FnZUFkZEV2ZW50KGV2dCk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICAvLyBJZiBhIE1lc3NhZ2UgaXMgZGVsZXRlZCBhbmQgaXRzIGluIG91ciByZXN1bHQgc2V0LCByZW1vdmUgaXRcbiAgICAgIC8vIGFuZCB0cmlnZ2VyIGFuIGV2ZW50XG4gICAgICBjYXNlICdtZXNzYWdlczpyZW1vdmUnOlxuICAgICAgICB0aGlzLl9oYW5kbGVNZXNzYWdlUmVtb3ZlRXZlbnQoZXZ0KTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgX2hhbmRsZU1lc3NhZ2VDb252SWRDaGFuZ2VFdmVudChldnQpIHtcbiAgICBjb25zdCBjaWRDaGFuZ2VzID0gZXZ0LmdldENoYW5nZXNGb3IoJ2lkJyk7XG4gICAgaWYgKGNpZENoYW5nZXMubGVuZ3RoKSB7XG4gICAgICBpZiAodGhpcy5fcHJlZGljYXRlID09PSBjaWRDaGFuZ2VzWzBdLm9sZFZhbHVlKSB7XG4gICAgICAgIHRoaXMuX3ByZWRpY2F0ZSA9IGNpZENoYW5nZXNbMF0ubmV3VmFsdWU7XG4gICAgICAgIHRoaXMucHJlZGljYXRlID0gXCJjb252ZXJzYXRpb24uaWQgPSAnXCIgKyB0aGlzLl9wcmVkaWNhdGUgKyBcIidcIjtcbiAgICAgICAgdGhpcy5fcnVuKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIElmIHRoZSBJRCBvZiB0aGUgbWVzc2FnZSBoYXMgY2hhbmdlZCwgdGhlbiB0aGUgcG9zaXRpb24gcHJvcGVydHkgaGFzIGxpa2VseSBjaGFuZ2VkIGFzIHdlbGwuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIHRlc3RzIHRvIHNlZSBpZiBjaGFuZ2VzIHRvIHRoZSBwb3NpdGlvbiBwcm9wZXJ0eSBoYXZlIGltcGFjdGVkIHRoZSBtZXNzYWdlJ3MgcG9zaXRpb24gaW4gdGhlXG4gICAqIGRhdGEgYXJyYXkuLi4gYW5kIHVwZGF0ZXMgdGhlIGFycmF5IGlmIGl0IGhhcy5cbiAgICpcbiAgICogQG1ldGhvZCBfaGFuZGxlTWVzc2FnZVBvc2l0aW9uQ2hhbmdlXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7bGF5ZXIuTGF5ZXJFdmVudH0gZXZ0ICBBIE1lc3NhZ2UgQ2hhbmdlIGV2ZW50XG4gICAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleCAgSW5kZXggb2YgdGhlIG1lc3NhZ2UgaW4gdGhlIGN1cnJlbnQgZGF0YSBhcnJheVxuICAgKiBAcmV0dXJuIHtib29sZWFufSBUcnVlIGlmIGEgZGF0YSB3YXMgY2hhbmdlZCBhbmQgYSBjaGFuZ2UgZXZlbnQgd2FzIGVtaXR0ZWRcbiAgICovXG4gIF9oYW5kbGVNZXNzYWdlUG9zaXRpb25DaGFuZ2UoZXZ0LCBpbmRleCkge1xuICAgIC8vIElmIHRoZSBtZXNzYWdlIGlzIG5vdCBpbiB0aGUgY3VycmVudCBkYXRhLCB0aGVuIHRoZXJlIGlzIG5vIGNoYW5nZSB0byBvdXIgcXVlcnkgcmVzdWx0cy5cbiAgICBpZiAoaW5kZXggPT09IC0xKSByZXR1cm4gZmFsc2U7XG5cbiAgICAvLyBDcmVhdGUgYW4gYXJyYXkgd2l0aG91dCBvdXIgZGF0YSBpdGVtIGFuZCB0aGVuIGZpbmQgb3V0IHdoZXJlIHRoZSBkYXRhIGl0ZW0gU2hvdWxkIGJlIGluc2VydGVkLlxuICAgIC8vIE5vdGU6IHdlIGNvdWxkIGp1c3QgbG9va3VwIHRoZSBwb3NpdGlvbiBpbiBvdXIgY3VycmVudCBkYXRhIGFycmF5LCBidXQgaXRzIHRvbyBlYXN5IHRvIGludHJvZHVjZVxuICAgIC8vIGVycm9ycyB3aGVyZSBjb21wYXJpbmcgdGhpcyBtZXNzYWdlIHRvIGl0c2VsZiBtYXkgeWllbGQgaW5kZXggb3IgaW5kZXggKyAxLlxuICAgIGNvbnN0IG5ld0RhdGEgPSBbXG4gICAgICAuLi50aGlzLmRhdGEuc2xpY2UoMCwgaW5kZXgpLFxuICAgICAgLi4udGhpcy5kYXRhLnNsaWNlKGluZGV4ICsgMSksXG4gICAgXTtcbiAgICBjb25zdCBuZXdJbmRleCA9IHRoaXMuX2dldEluc2VydE1lc3NhZ2VJbmRleChldnQudGFyZ2V0LCBuZXdEYXRhKTtcblxuICAgIC8vIElmIHRoZSBkYXRhIGl0ZW0gZ29lcyBpbiB0aGUgc2FtZSBpbmRleCBhcyBiZWZvcmUsIHRoZW4gdGhlcmUgaXMgbm8gY2hhbmdlIHRvIGJlIGhhbmRsZWQgaGVyZTtcbiAgICAvLyBlbHNlIGluc2VydCB0aGUgaXRlbSBhdCB0aGUgcmlnaHQgaW5kZXgsIHVwZGF0ZSB0aGlzLmRhdGEgYW5kIGZpcmUgYSBjaGFuZ2UgZXZlbnRcbiAgICBpZiAobmV3SW5kZXggIT09IGluZGV4KSB7XG4gICAgICBuZXdEYXRhLnNwbGljZShuZXdJbmRleCwgMCwgdGhpcy5fZ2V0RGF0YShldnQudGFyZ2V0KSk7XG4gICAgICB0aGlzLmRhdGEgPSBuZXdEYXRhO1xuICAgICAgdGhpcy5fdHJpZ2dlckNoYW5nZSh7XG4gICAgICAgIHR5cGU6ICdwcm9wZXJ0eScsXG4gICAgICAgIHRhcmdldDogdGhpcy5fZ2V0RGF0YShldnQudGFyZ2V0KSxcbiAgICAgICAgcXVlcnk6IHRoaXMsXG4gICAgICAgIGlzQ2hhbmdlOiB0cnVlLFxuICAgICAgICBjaGFuZ2VzOiBldnQuY2hhbmdlcyxcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgX2hhbmRsZU1lc3NhZ2VDaGFuZ2VFdmVudChldnQpIHtcbiAgICBsZXQgaW5kZXggPSB0aGlzLl9nZXRJbmRleChldnQudGFyZ2V0LmlkKTtcbiAgICBjb25zdCBtaWRDaGFuZ2VzID0gZXZ0LmdldENoYW5nZXNGb3IoJ2lkJyk7XG5cbiAgICBpZiAobWlkQ2hhbmdlcy5sZW5ndGgpIHtcbiAgICAgIGlmICh0aGlzLmRhdGFUeXBlID09PSBRdWVyeS5PYmplY3REYXRhVHlwZSkgaW5kZXggPSB0aGlzLl9nZXRJbmRleChtaWRDaGFuZ2VzWzBdLm9sZFZhbHVlKTtcbiAgICAgIGlmICh0aGlzLl9oYW5kbGVNZXNzYWdlUG9zaXRpb25DaGFuZ2UoZXZ0LCBpbmRleCkpIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZXZ0LnRhcmdldC5jb252ZXJzYXRpb25JZCA9PT0gdGhpcy5fcHJlZGljYXRlICYmIGluZGV4ICE9PSAtMSkge1xuICAgICAgaWYgKHRoaXMuZGF0YVR5cGUgPT09IFF1ZXJ5Lk9iamVjdERhdGFUeXBlKSB7XG4gICAgICAgIHRoaXMuZGF0YSA9IFtcbiAgICAgICAgICAuLi50aGlzLmRhdGEuc2xpY2UoMCwgaW5kZXgpLFxuICAgICAgICAgIGV2dC50YXJnZXQudG9PYmplY3QoKSxcbiAgICAgICAgICAuLi50aGlzLmRhdGEuc2xpY2UoaW5kZXggKyAxKSxcbiAgICAgICAgXTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX3RyaWdnZXJDaGFuZ2Uoe1xuICAgICAgICB0eXBlOiAncHJvcGVydHknLFxuICAgICAgICB0YXJnZXQ6IHRoaXMuX2dldERhdGEoZXZ0LnRhcmdldCksXG4gICAgICAgIHF1ZXJ5OiB0aGlzLFxuICAgICAgICBpc0NoYW5nZTogdHJ1ZSxcbiAgICAgICAgY2hhbmdlczogZXZ0LmNoYW5nZXMsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBfaGFuZGxlTWVzc2FnZUFkZEV2ZW50KGV2dCkge1xuICAgIC8vIE9ubHkgdXNlIGFkZGVkIG1lc3NhZ2VzIHRoYXQgYXJlIHBhcnQgb2YgdGhpcyBDb252ZXJzYXRpb25cbiAgICAvLyBhbmQgbm90IGFscmVhZHkgaW4gb3VyIHJlc3VsdCBzZXRcbiAgICBjb25zdCBsaXN0ID0gZXZ0Lm1lc3NhZ2VzXG4gICAgICAgICAgICAgICAgICAuZmlsdGVyKG1lc3NhZ2UgPT4gbWVzc2FnZS5jb252ZXJzYXRpb25JZCA9PT0gdGhpcy5fcHJlZGljYXRlKVxuICAgICAgICAgICAgICAgICAgLmZpbHRlcihtZXNzYWdlID0+IHRoaXMuX2dldEluZGV4KG1lc3NhZ2UuaWQpID09PSAtMSlcbiAgICAgICAgICAgICAgICAgIC5tYXAobWVzc2FnZSA9PiB0aGlzLl9nZXREYXRhKG1lc3NhZ2UpKTtcblxuICAgIC8vIEFkZCB0aGVtIHRvIG91ciByZXN1bHQgc2V0IGFuZCB0cmlnZ2VyIGFuIGV2ZW50IGZvciBlYWNoIG9uZVxuICAgIGlmIChsaXN0Lmxlbmd0aCkge1xuICAgICAgY29uc3QgZGF0YSA9IHRoaXMuZGF0YSA9IHRoaXMuZGF0YVR5cGUgPT09IFF1ZXJ5Lk9iamVjdERhdGFUeXBlID8gW10uY29uY2F0KHRoaXMuZGF0YSkgOiB0aGlzLmRhdGE7XG4gICAgICBsaXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5fZ2V0SW5zZXJ0TWVzc2FnZUluZGV4KGl0ZW0sIGRhdGEpO1xuICAgICAgICBkYXRhLnNwbGljZShpbmRleCwgMCwgaXRlbSk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy50b3RhbFNpemUgKz0gbGlzdC5sZW5ndGg7XG5cbiAgICAgIC8vIEluZGV4IGNhbGN1bGF0ZWQgYWJvdmUgbWF5IHNoaWZ0IGFmdGVyIGFkZGl0aW9uYWwgaW5zZXJ0aW9ucy4gIFRoaXMgaGFzXG4gICAgICAvLyB0byBiZSBkb25lIGFmdGVyIHRoZSBhYm92ZSBpbnNlcnRpb25zIGhhdmUgY29tcGxldGVkLlxuICAgICAgbGlzdC5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICB0aGlzLl90cmlnZ2VyQ2hhbmdlKHtcbiAgICAgICAgICB0eXBlOiAnaW5zZXJ0JyxcbiAgICAgICAgICBpbmRleDogdGhpcy5kYXRhLmluZGV4T2YoaXRlbSksXG4gICAgICAgICAgdGFyZ2V0OiBpdGVtLFxuICAgICAgICAgIHF1ZXJ5OiB0aGlzLFxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIF9oYW5kbGVNZXNzYWdlUmVtb3ZlRXZlbnQoZXZ0KSB7XG4gICAgY29uc3QgcmVtb3ZlZCA9IFtdO1xuICAgIGV2dC5tZXNzYWdlcy5mb3JFYWNoKG1lc3NhZ2UgPT4ge1xuICAgICAgY29uc3QgaW5kZXggPSB0aGlzLl9nZXRJbmRleChtZXNzYWdlLmlkKTtcbiAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgcmVtb3ZlZC5wdXNoKHtcbiAgICAgICAgICBkYXRhOiBtZXNzYWdlLFxuICAgICAgICAgIGluZGV4LFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YVR5cGUgPT09IFF1ZXJ5Lk9iamVjdERhdGFUeXBlKSB7XG4gICAgICAgICAgdGhpcy5kYXRhID0gW1xuICAgICAgICAgICAgLi4udGhpcy5kYXRhLnNsaWNlKDAsIGluZGV4KSxcbiAgICAgICAgICAgIC4uLnRoaXMuZGF0YS5zbGljZShpbmRleCArIDEpLFxuICAgICAgICAgIF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5kYXRhLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMudG90YWxTaXplIC09IHJlbW92ZWQubGVuZ3RoO1xuICAgIHJlbW92ZWQuZm9yRWFjaChyZW1vdmVkT2JqID0+IHtcbiAgICAgIHRoaXMuX3RyaWdnZXJDaGFuZ2Uoe1xuICAgICAgICB0eXBlOiAncmVtb3ZlJyxcbiAgICAgICAgdGFyZ2V0OiB0aGlzLl9nZXREYXRhKHJlbW92ZWRPYmouZGF0YSksXG4gICAgICAgIGluZGV4OiByZW1vdmVkT2JqLmluZGV4LFxuICAgICAgICBxdWVyeTogdGhpcyxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgX3RyaWdnZXJDaGFuZ2UoZXZ0KSB7XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnLCBldnQpO1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlOicgKyBldnQudHlwZSwgZXZ0KTtcbiAgfVxufVxuXG5cblF1ZXJ5LnByZWZpeFVVSUQgPSAnbGF5ZXI6Ly8vcXVlcmllcy8nO1xuXG4vKipcbiAqIFF1ZXJ5IGZvciBDb252ZXJzYXRpb25zLlxuICpcbiAqIFVzZSB0aGlzIHZhbHVlIGluIHRoZSBtb2RlbCBwcm9wZXJ0eS5cbiAqIEB0eXBlIHtzdHJpbmd9XG4gKiBAc3RhdGljXG4gKi9cblF1ZXJ5LkNvbnZlcnNhdGlvbiA9IENPTlZFUlNBVElPTjtcblxuLyoqXG4gKiBRdWVyeSBmb3IgTWVzc2FnZXMuXG4gKlxuICogVXNlIHRoaXMgdmFsdWUgaW4gdGhlIG1vZGVsIHByb3BlcnR5LlxuICogQHR5cGUge3N0cmluZ31cbiAqIEBzdGF0aWNcbiAqL1xuUXVlcnkuTWVzc2FnZSA9IE1FU1NBR0U7XG5cbi8qKlxuICogR2V0IGRhdGEgYXMgUE9KT3MvaW1tdXRhYmxlIG9iamVjdHMuXG4gKlxuICogWW91ciBRdWVyeSBkYXRhIGFuZCBldmVudHMgd2lsbCBwcm92aWRlIE1lc3NhZ2VzL0NvbnZlcnNhdGlvbnMgYXMgb2JqZWN0cy5cbiAqIEB0eXBlIHtzdHJpbmd9XG4gKiBAc3RhdGljXG4gKi9cblF1ZXJ5Lk9iamVjdERhdGFUeXBlID0gJ29iamVjdCc7XG5cbi8qKlxuICogR2V0IGRhdGEgYXMgaW5zdGFuY2VzIG9mIGxheWVyLk1lc3NhZ2UgYW5kIGxheWVyLkNvbnZlcnNhdGlvbi5cbiAqXG4gKiBZb3VyIFF1ZXJ5IGRhdGEgYW5kIGV2ZW50cyB3aWxsIHByb3ZpZGUgTWVzc2FnZXMvQ29udmVyc2F0aW9ucyBhcyBpbnN0YW5jZXMuXG4gKiBAdHlwZSB7c3RyaW5nfVxuICogQHN0YXRpY1xuICovXG5RdWVyeS5JbnN0YW5jZURhdGFUeXBlID0gJ2luc3RhbmNlJztcblxuLyoqXG4gKiBTZXQgdGhlIG1heGltdW0gcGFnZSBzaXplIGZvciBxdWVyaWVzLlxuICpcbiAqIEB0eXBlIHtudW1iZXJ9XG4gKiBAc3RhdGljXG4gKi9cblF1ZXJ5Lk1heFBhZ2VTaXplID0gMTAwO1xuXG4vKipcbiAqIEFjY2VzcyB0aGUgbnVtYmVyIG9mIHJlc3VsdHMgY3VycmVudGx5IGxvYWRlZC5cbiAqXG4gKiBAdHlwZSB7TnVtYmVyfVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUXVlcnkucHJvdG90eXBlLCAnc2l6ZScsIHtcbiAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgcmV0dXJuICF0aGlzLmRhdGEgPyAwIDogdGhpcy5kYXRhLmxlbmd0aDtcbiAgfSxcbn0pO1xuXG4vKiogQWNjZXNzIHRoZSB0b3RhbCBudW1iZXIgb2YgcmVzdWx0cyBvbiB0aGUgc2VydmVyLlxuICpcbiAqIFdpbGwgYmUgMCB1bnRpbCB0aGUgZmlyc3QgcXVlcnkgaGFzIHN1Y2Nlc3NmdWxseSBsb2FkZWQgcmVzdWx0cy5cbiAqXG4gKiBAdHlwZSB7TnVtYmVyfVxuICovXG5RdWVyeS5wcm90b3R5cGUudG90YWxTaXplID0gMDtcblxuXG4vKipcbiAqIEFjY2VzcyB0byB0aGUgY2xpZW50IHNvIGl0IGNhbiBsaXN0ZW4gdG8gd2Vic29ja2V0IGFuZCBsb2NhbCBldmVudHMuXG4gKlxuICogQHR5cGUge2xheWVyLkNsaWVudH1cbiAqIEBwcm90ZWN0ZWRcbiAqL1xuUXVlcnkucHJvdG90eXBlLmNsaWVudCA9IG51bGw7XG5cbi8qKlxuICogUXVlcnkgcmVzdWx0cy5cbiAqXG4gKiBBcnJheSBvZiBkYXRhIHJlc3VsdGluZyBmcm9tIHRoZSBRdWVyeTsgZWl0aGVyIGEgbGF5ZXIuUm9vdCBzdWJjbGFzcy5cbiAqXG4gKiBvciBwbGFpbiBPYmplY3RzXG4gKiBAdHlwZSB7T2JqZWN0W119XG4gKi9cblF1ZXJ5LnByb3RvdHlwZS5kYXRhID0gbnVsbDtcblxuLyoqXG4gKiBTcGVjaWZpZXMgdGhlIHR5cGUgb2YgZGF0YSBiZWluZyBxdWVyaWVkIGZvci5cbiAqXG4gKiBNb2RlbCBpcyBvbmUgb2ZcbiAqICogbGF5ZXIuUXVlcnkuQ29udmVyc2F0aW9uXG4gKiAqIGxheWVyLlF1ZXJ5Lk1lc3NhZ2VcbiAqXG4gKiBAdHlwZSB7U3RyaW5nfVxuICovXG5RdWVyeS5wcm90b3R5cGUubW9kZWwgPSBDT05WRVJTQVRJT047XG5cbi8qKlxuICogV2hhdCB0eXBlIG9mIHJlc3VsdHMgdG8gcmVxdWVzdCBvZiB0aGUgc2VydmVyLlxuICpcbiAqIE5vdCB5ZXQgc3VwcG9ydGVkOyByZXR1cm5UeXBlIGlzIG9uZSBvZlxuICpcbiAqICogb2JqZWN0XG4gKiAqIGlkXG4gKiAqIGNvdW50XG4gKlxuICogVGhpcyBRdWVyeSBBUEkgaXMgZGVzaWduZWQgb25seSBmb3IgdXNlIHdpdGggJ29iamVjdCcuXG4gKiBAdHlwZSB7U3RyaW5nfVxuICovXG5RdWVyeS5wcm90b3R5cGUucmV0dXJuVHlwZSA9ICdvYmplY3QnO1xuXG4vKipcbiAqIFNwZWNpZnkgd2hhdCBraW5kIG9mIGRhdGEgYXJyYXkgeW91ciBhcHBsaWNhdGlvbiByZXF1aXJlcy5cbiAqXG4gKiBVc2VkIHRvIHNwZWNpZnkgcXVlcnkgZGF0YVR5cGUuICBPbmUgb2ZcbiAqICogUXVlcnkuT2JqZWN0RGF0YVR5cGVcbiAqICogUXVlcnkuSW5zdGFuY2VEYXRhVHlwZVxuICpcbiAqIEB0eXBlIHtTdHJpbmd9XG4gKi9cblF1ZXJ5LnByb3RvdHlwZS5kYXRhVHlwZSA9IFF1ZXJ5Lkluc3RhbmNlRGF0YVR5cGU7XG5cbi8qKlxuICogTnVtYmVyIG9mIHJlc3VsdHMgZnJvbSB0aGUgc2VydmVyIHRvIHJlcXVlc3QvY2FjaGUuXG4gKlxuICogVGhlIHBhZ2luYXRpb24gd2luZG93IGNhbiBiZSBpbmNyZWFzZWQgdG8gZG93bmxvYWQgYWRkaXRpb25hbCBpdGVtcywgb3IgZGVjcmVhc2VkIHRvIHB1cmdlIHJlc3VsdHNcbiAqIGZyb20gdGhlIGRhdGEgcHJvcGVydHkuXG4gKlxuICogICAgIHF1ZXJ5LnVwZGF0ZSh7XG4gKiAgICAgICBwYWdpbmF0aW9uV2luZG93OiAxNTBcbiAqICAgICB9KVxuICpcbiAqIFRoaXMgY2FsbCB3aWxsIGxvYWQgMTUwIHJlc3VsdHMuICBJZiBpdCBwcmV2aW91c2x5IGhhZCAxMDAsXG4gKiB0aGVuIGl0IHdpbGwgbG9hZCA1MCBtb3JlLiBJZiBpdCBwcmV2aW91c2x5IGhhZCAyMDAsIGl0IHdpbGwgZHJvcCA1MC5cbiAqXG4gKiBOb3RlIHRoYXQgdGhlIHNlcnZlciB3aWxsIG9ubHkgcGVybWl0IDEwMCBhdCBhIHRpbWUsIHNvXG4gKiBzZXR0aW5nIGEgbGFyZ2UgcGFnaW5hdGlvbiB3aW5kb3cgbWF5IHJlc3VsdCBpbiBtYW55XG4gKiByZXF1ZXN0cyB0byB0aGUgc2VydmVyIHRvIHJlYWNoIHRoZSBzcGVjaWZpZWQgcGFnZSB2YWx1ZS5cbiAqIEB0eXBlIHtOdW1iZXJ9XG4gKi9cblF1ZXJ5LnByb3RvdHlwZS5wYWdpbmF0aW9uV2luZG93ID0gMTAwO1xuXG4vKipcbiAqIFNvcnRpbmcgY3JpdGVyaWEgZm9yIENvbnZlcnNhdGlvbiBRdWVyaWVzLlxuICpcbiAqIE9ubHkgc3VwcG9ydHMgYW4gYXJyYXkgb2Ygb25lIGZpZWxkL2VsZW1lbnQuXG4gKiBPbmx5IHN1cHBvcnRzIHRoZSBmb2xsb3dpbmcgb3B0aW9uczpcbiAqXG4gKiAgICAgW3snY3JlYXRlZEF0JzogJ2Rlc2MnfV1cbiAqICAgICBbeydsYXN0TWVzc2FnZS5zZW50QXQnOiAnZGVzYyd9XVxuICpcbiAqIFdoeSBzdWNoIGxpbWl0YXRpb25zPyBXaHkgdGhpcyBzdHJ1Y3R1cmU/ICBUaGUgc2VydmVyIHdpbGwgYmUgZXhwb3NpbmcgYSBRdWVyeSBBUEkgYXQgd2hpY2ggcG9pbnQgdGhlXG4gKiBhYm92ZSBzb3J0IG9wdGlvbnMgd2lsbCBtYWtlIGEgbG90IG1vcmUgc2Vuc2UsIGFuZCBmdWxsIHNvcnRpbmcgd2lsbCBiZSBwcm92aWRlZC5cbiAqXG4gKiBAdHlwZSB7U3RyaW5nfVxuICovXG5RdWVyeS5wcm90b3R5cGUuc29ydEJ5ID0gbnVsbDtcblxuLyoqXG4gKiBUaGlzIHZhbHVlIHRlbGxzIHVzIHdoYXQgdG8gcmVzZXQgdGhlIHBhZ2luYXRpb25XaW5kb3cgdG8gd2hlbiB0aGUgcXVlcnkgaXMgcmVkZWZpbmVkLlxuICpcbiAqIEB0eXBlIHtOdW1iZXJ9XG4gKiBAcHJpdmF0ZVxuICovXG5RdWVyeS5wcm90b3R5cGUuX2luaXRpYWxQYWdpbmF0aW9uV2luZG93ID0gMTAwO1xuXG4vKipcbiAqIFlvdXIgUXVlcnkncyBXSEVSRSBjbGF1c2UuXG4gKlxuICogQ3VycmVudGx5LCB0aGUgb25seSBxdWVyeSBzdXBwb3J0ZWQgaXMgXCJjb252ZXJzYXRpb24uaWQgPSAnbGF5ZXI6Ly8vY29udmVyc2F0aW9ucy91dWlkJ1wiXG4gKiBOb3RlIHRoYXQgYm90aCAnIGFuZCBcIiBhcmUgc3VwcG9ydGVkLlxuICogQHR5cGUge3N0cmluZ31cbiAqL1xuUXVlcnkucHJvdG90eXBlLnByZWRpY2F0ZSA9IG51bGw7XG5cbi8qKlxuICogVHJ1ZSBpZiB0aGUgUXVlcnkgaXMgY29ubmVjdGluZyB0byB0aGUgc2VydmVyLlxuICpcbiAqIEl0IGlzIG5vdCBnYXVyZW50ZWVkIHRoYXQgZXZlcnkgdXBkYXRlKCk7IGZvciBleGFtcGxlLCB1cGRhdGluZyBhIHBhZ2luYXRpb25XaW5kb3cgdG8gYmUgc21hbGxlcixcbiAqIE9yIGNoYW5naW5nIGEgdmFsdWUgdG8gdGhlIGV4aXN0aW5nIHZhbHVlIHdvdWxkIGNhdXNlIHRoZSByZXF1ZXN0IG5vdCB0byBmaXJlLlxuICogUiBlY29tbWVuZGVkIHBhdHRlcm4gaXM6XG4gKlxuICogICAgICBxdWVyeS51cGRhdGUoe3BhZ2luYXRpb25XaW5kb3c6IDUwfSk7XG4gKiAgICAgIGlmICghcXVlcnkuaXNGaXJpbmcpIHtcbiAqICAgICAgICBhbGVydChcIkRvbmVcIik7XG4gKiAgICAgIH0gZWxzZSB7XG4gKiAgICAgICAgICBxdWVyeS5vbihcImNoYW5nZVwiLCBmdW5jdGlvbihldnQpIHtcbiAqICAgICAgICAgICAgaWYgKGV2dC50eXBlID09IFwiZGF0YVwiKSBhbGVydChcIkRvbmVcIik7XG4gKiAgICAgICAgICB9KTtcbiAqICAgICAgfVxuICpcbiAqIEB0eXBlIHtCb29sZWFufVxuICovXG5RdWVyeS5wcm90b3R5cGUuaXNGaXJpbmcgPSBmYWxzZTtcblxuLyoqXG4gKiBUaGUgbGFzdCByZXF1ZXN0IGZpcmVkLlxuICpcbiAqIElmIG11bHRpcGxlIHJlcXVlc3RzIGFyZSBpbmZsaWdodCwgdGhlIHJlc3BvbnNlXG4gKiBtYXRjaGluZyB0aGlzIHJlcXVlc3QgaXMgdGhlIE9OTFkgcmVzcG9uc2Ugd2Ugd2lsbCBwcm9jZXNzLlxuICogQHR5cGUge1N0cmluZ31cbiAqIEBwcml2YXRlXG4gKi9cblF1ZXJ5LnByb3RvdHlwZS5fZmlyaW5nUmVxdWVzdCA9ICcnO1xuXG5RdWVyeS5wcm90b3R5cGUuX3JldHJ5Q291bnQgPSAwO1xuXG4vKipcbiAqIEluIHRoZSBldmVudCB0aGF0IGEgbmV3IFF1ZXJ5IGdldHMgbm8gZGF0YSwgcmV0cnkgdGhlIHF1ZXJ5IGEgZmV3IHRpbWVzLlxuICpcbiAqIFdoeSB1c2UgdGhpcz8gIExldHMgc2F5IGEgdXNlciBoYXMgYmVlbiBhZGRlZCB0byBhIGxvbmcgcnVubmluZyBDb252ZXJzYXRpb24uXG4gKiBUaGUgY29udmVyc2F0aW9uIGFycml2ZXMsIGJ1dCB0aGUgc2VydmVyIGlzIHN0aWxsIHN5bmNpbmcgTWVzc2FnZXMgZm9yIHRoaXMgdXNlcixcbiAqIGFuZCBpdCBtYXkgdGFrZSBhIGZldyB0cmllcyBiZWZvcmUgdGhlIHNlcnZlciBoYXMgZmluaXNoZWQgcG9wdWxhdGluZyB0aGUgTWVzc2FnZXMgb2YgdGhlIG5ldyBDb252ZXJzYXRpb24uXG4gKiBIb3cgbWFueSByZXRyaWVzIGlzIHVwIHRvIGVhY2ggZGV2ZWxvcGVyOyBidXQgMTAgaXMgYSBnb29kIG51bWJlciB0byBzdGFydCB3aXRoLlxuICogQWZ0ZXIgMTAgcmV0cmllcywgaWYgbm8gZGF0YSBzaG93cyB1cCwgdGhlbiB0aGUgcXVlcnkgd2lsbCBhc3N1bWUgdGhhdCB0aGVyZSBpcyBubyBkYXRhLFxuICogYW5kIHRyaWdnZXIgaXRzIGBjaGFuZ2VgIGV2ZW50IHdpdGggYGRhdGE6IFtdYC5cbiAqXG4gKiBXaHkgbm90IHVzZSB0aGlzPyBCZWNhdXNlIGl0IGRlbGF5cyB0aGUgY29tcGxldGlvbiBldmVudCwgYW5kIGlzIG5vdCBhIGNvbW1vbiBvY2N1cmFuY2VcbiAqIGZvciBtb3N0IGFwcGxpY2F0aW9ucy5cbiAqXG4gKiBAdHlwZSB7TnVtYmVyfVxuICogQHN0YXRpY1xuICovXG5RdWVyeS5NYXhSZXRyeUNvdW50ID0gMDtcblxuUXVlcnkuX3N1cHBvcnRlZEV2ZW50cyA9IFtcbiAgLyoqXG4gICAqIFRoZSBxdWVyeSBkYXRhIGhhcyBjaGFuZ2VkOyBhbnkgY2hhbmdlIGV2ZW50IHdpbGwgY2F1c2UgdGhpcyBldmVudCB0byB0cmlnZ2VyLlxuICAgKiBAZXZlbnQgY2hhbmdlXG4gICAqL1xuICAnY2hhbmdlJyxcblxuICAvKipcbiAgICogQSBuZXcgcGFnZSBvZiBkYXRhIGhhcyBiZWVuIGxvYWRlZCBmcm9tIHRoZSBzZXJ2ZXJcbiAgICogQGV2ZW50ICdjaGFuZ2U6ZGF0YSdcbiAgICovXG4gICdjaGFuZ2U6ZGF0YScsXG5cbiAgLyoqXG4gICAqIEFsbCBkYXRhIGZvciB0aGlzIHF1ZXJ5IGhhcyBiZWVuIHJlc2V0IGR1ZSB0byBhIGNoYW5nZSBpbiB0aGUgUXVlcnkgcHJlZGljYXRlLlxuICAgKiBAZXZlbnQgJ2NoYW5nZTpyZXNldCdcbiAgICovXG4gICdjaGFuZ2U6cmVzZXQnLFxuXG4gIC8qKlxuICAgKiBBbiBpdGVtIG9mIGRhdGEgd2l0aGluIHRoaXMgUXVlcnkgaGFzIGhhZCBhIHByb3BlcnR5IGNoYW5nZSBpdHMgdmFsdWUuXG4gICAqIEBldmVudCAnY2hhbmdlOnByb3BlcnR5J1xuICAgKi9cbiAgJ2NoYW5nZTpwcm9wZXJ0eScsXG5cbiAgLyoqXG4gICAqIEEgbmV3IGl0ZW0gb2YgZGF0YSBoYXMgYmVlbiBpbnNlcnRlZCBpbnRvIHRoZSBRdWVyeS4gTm90IHRyaWdnZXJlZCBieSBsb2FkaW5nXG4gICAqIGEgbmV3IHBhZ2Ugb2YgZGF0YSBmcm9tIHRoZSBzZXJ2ZXIsIGJ1dCBpcyB0cmlnZ2VyZWQgYnkgbG9jYWxseSBjcmVhdGluZyBhIG1hdGNoaW5nXG4gICAqIGl0ZW0gb2YgZGF0YSwgb3IgcmVjZWl2aW5nIGEgbmV3IGl0ZW0gb2YgZGF0YSB2aWEgd2Vic29ja2V0LlxuICAgKiBAZXZlbnQgJ2NoYW5nZTppbnNlcnQnXG4gICAqL1xuICAnY2hhbmdlOmluc2VydCcsXG5cbiAgLyoqXG4gICAqIEFuIGl0ZW0gb2YgZGF0YSBoYXMgYmVlbiByZW1vdmVkIGZyb20gdGhlIFF1ZXJ5LiBOb3QgdHJpZ2dlcmVkIGZvciBldmVyeSByZW1vdmFsLCBidXRcbiAgICogaXMgdHJpZ2dlcmVkIGJ5IGxvY2FsbHkgZGVsZXRpbmcgYSByZXN1bHQsIG9yIHJlY2VpdmluZyBhIHJlcG9ydCBvZiBkZWxldGlvbiB2aWEgd2Vic29ja2V0LlxuICAgKiBAZXZlbnQgJ2NoYW5nZTpyZW1vdmUnXG4gICAqL1xuICAnY2hhbmdlOnJlbW92ZScsXG5cbiAgLyoqXG4gICAqIFRoZSBxdWVyeSBkYXRhIGZhaWxlZCB0byBsb2FkIGZyb20gdGhlIHNlcnZlci5cbiAgICogQGV2ZW50IGVycm9yXG4gICAqL1xuICAnZXJyb3InLFxuXS5jb25jYXQoUm9vdC5fc3VwcG9ydGVkRXZlbnRzKTtcblxuUm9vdC5pbml0Q2xhc3MuYXBwbHkoUXVlcnksIFtRdWVyeSwgJ1F1ZXJ5J10pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFF1ZXJ5O1xuIl19
