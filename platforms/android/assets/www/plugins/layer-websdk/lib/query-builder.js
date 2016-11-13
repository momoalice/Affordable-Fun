'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Query = require('./query');
var LayerError = require('./layer-error');

/**
 * Query builder class generating queries for a set of messages.
 * Used in Creating and Updating layer.Query instances.
 *
 * Using the Query Builder, we should be able to instantiate a Query
 *
 *      var qBuilder = QueryBuilder
 *       .messages()
 *       .forConversation('layer:///conversations/ffffffff-ffff-ffff-ffff-ffffffffffff')
 *       .paginationWindow(100);
 *      var query = client.createQuery(qBuilder);
 *
 *
 * You can then create additional builders and update the query:
 *
 *      var qBuilder2 = QueryBuilder
 *       .messages()
 *       .forConversation('layer:///conversations/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
 *       .paginationWindow(200);
 *      query.update(qBuilder);
 *
 * @class layer.QueryBuilder.MessagesQuery
 */

var MessagesQuery = function () {

  /**
   * Creates a new query builder for a set of messages.
   *
   * Standard use is without any arguments.
   *
   * @method constructor
   * @param  {Object} [query=null]
   */

  function MessagesQuery(query) {
    _classCallCheck(this, MessagesQuery);

    if (query) {
      this._query = {
        model: query.model,
        returnType: query.returnType,
        dataType: query.dataType,
        paginationWindow: query.paginationWindow
      };
    } else {
      this._query = {
        model: Query.Message,
        returnType: 'object',
        dataType: 'object',
        paginationWindow: Query.prototype.paginationWindow
      };
    }

    // TODO remove when messages can be fetched via query API rather than `GET /messages`
    this._conversationIdSet = false;
  }

  /**
   * Query for messages in this Conversation.
   *
   * @method forConversation
   * @param  {String} conversationId
   */


  _createClass(MessagesQuery, [{
    key: 'forConversation',
    value: function forConversation(conversationId) {
      if (conversationId) {
        this._query.predicate = 'conversation.id = \'' + conversationId + '\'';
        this._conversationIdSet = true;
      } else {
        delete this._query.predicate;
        this._conversationIdSet = false;
      }
      return this;
    }

    /**
     * Sets the pagination window/number of messages to fetch from the local cache or server.
     *
     * Currently only positive integers are supported.
     *
     * @method paginationWindow
     * @param  {number} win
     */

  }, {
    key: 'paginationWindow',
    value: function paginationWindow(win) {
      this._query.paginationWindow = win;
      return this;
    }

    /**
     * Returns the built query object to send to the server.
     *
     * Called by layer.QueryBuilder. You should not need to call this.
     *
     * @method build
     */

  }, {
    key: 'build',
    value: function build() {
      if (!this._conversationIdSet) {
        throw new Error(LayerError.dictionary.conversationMissing);
      }

      return this._query;
    }
  }]);

  return MessagesQuery;
}();

/**
 * Query builder class generating queries for a set of Conversations.
 *
 * Used in Creating and Updating layer.Query instances.
 * Note that at this time, the only thing we can query for is
 * ALL Conversations; primary use for this is to page through the Conversations.
 *
 * To get started:
 *
 *      var qBuilder = QueryBuilder
 *       .conversations()
 *       .paginationWindow(100);
 *      var query = client.createQuery(qBuilder);
 *
 * You can then create additional builders and update the query:
 *
 *      var qBuilder2 = QueryBuilder
 *       .conversations()
 *       .paginationWindow(200);
 *      query.update(qBuilder);
 *
 * @class layer.QueryBuilder.ConversationsQuery
 */


var ConversationsQuery = function () {

  /**
   * Creates a new query builder for a set of conversations.
   *
   * Standard use is without any arguments.
   *
   * @method constructor
   * @param  {Object} [query=null]
   */

  function ConversationsQuery(query) {
    _classCallCheck(this, ConversationsQuery);

    if (query) {
      this._query = {
        model: query.model,
        returnType: query.returnType,
        dataType: query.dataType,
        paginationWindow: query.paginationWindow,
        sortBy: query.sortBy
      };
    } else {
      this._query = {
        model: Query.Conversation,
        returnType: 'object',
        dataType: 'object',
        paginationWindow: Query.prototype.paginationWindow,
        sortBy: null
      };
    }
  }

  /**
   * Sets the pagination window/number of messages to fetch from the local cache or server.
   *
   * Currently only positive integers are supported.
   *
   * @method paginationWindow
   * @param  {number} win
   * @return {layer.QueryBuilder} this
   */


  _createClass(ConversationsQuery, [{
    key: 'paginationWindow',
    value: function paginationWindow(win) {
      this._query.paginationWindow = win;
      return this;
    }

    /**
     * Sets the sorting options for the Conversation.
     *
     * Currently only supports descending order
     * Currently only supports fieldNames of "createdAt" and "lastMessage.sentAt"
     *
     * @method sortBy
     * @param  {string} fieldName  - field to sort by
     * @param  {boolean} asc - Is an ascending sort?
     * @return {layer.QueryBuilder} this
     */

  }, {
    key: 'sortBy',
    value: function sortBy(fieldName) {
      var asc = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

      this._query.sortBy = [_defineProperty({}, fieldName, asc ? 'asc' : 'desc')];
      return this;
    }

    /**
     * Returns the built query object to send to the server.
     *
     * Called by layer.QueryBuilder. You should not need to call this.
     *
     * @method build
     */

  }, {
    key: 'build',
    value: function build() {
      return this._query;
    }
  }]);

  return ConversationsQuery;
}();

/**
 * Query builder class. Used with layer.Query to specify what local/remote
 * data changes to subscribe to.  For examples, see layer.QueryBuilder.MessagesQuery
 * and layer.QueryBuilder.ConversationsQuery.  This static class is used to instantiate
 * MessagesQuery and ConversationsQuery Builder instances:
 *
 *      var conversationsQueryBuilder = QueryBuilder.conversations();
 *      var messagesQueryBuidler = QueryBuilder.messages();
 *
 * Should you use these instead of directly using the layer.Query class?
 * That is a matter of programming style and preference, there is no
 * correct answer.
 *
 * @class layer.QueryBuilder
 */


var QueryBuilder = {

  /**
   * Create a new layer.MessagesQuery instance.
   *
   * @method messages
   * @static
   * @returns {layer.QueryBuilder.MessagesQuery}
   */

  messages: function messages() {
    return new MessagesQuery();
  },


  /**
   * Create a new layer.ConversationsQuery instance.
   *
   * @method conversations
   * @static
   * @returns {layer.QueryBuilder.ConversationsQuery}
   */
  conversations: function conversations() {
    return new ConversationsQuery();
  },


  /**
   * Takes the return value of QueryBuilder.prototype.build and creates a
   * new QueryBuilder.
   *
   * Used within layer.Query.prototype.toBuilder.
   *
   * @method fromQueryObject
   * @private
   * @param {Object} obj
   * @static
   */
  fromQueryObject: function fromQueryObject(obj) {
    switch (obj.model) {
      case Query.Message:
        return new MessagesQuery(obj);
      case Query.Conversation:
        return new ConversationsQuery(obj);
      default:
        return null;
    }
  }
};

module.exports = QueryBuilder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9xdWVyeS1idWlsZGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUEsSUFBTSxRQUFRLFFBQVEsU0FBUixDQUFSO0FBQ04sSUFBTSxhQUFhLFFBQVEsZUFBUixDQUFiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQXlCQTs7Ozs7Ozs7Ozs7QUFVSixXQVZJLGFBVUosQ0FBWSxLQUFaLEVBQW1COzBCQVZmLGVBVWU7O0FBQ2pCLFFBQUksS0FBSixFQUFXO0FBQ1QsV0FBSyxNQUFMLEdBQWM7QUFDWixlQUFPLE1BQU0sS0FBTjtBQUNQLG9CQUFZLE1BQU0sVUFBTjtBQUNaLGtCQUFVLE1BQU0sUUFBTjtBQUNWLDBCQUFrQixNQUFNLGdCQUFOO09BSnBCLENBRFM7S0FBWCxNQU9PO0FBQ0wsV0FBSyxNQUFMLEdBQWM7QUFDWixlQUFPLE1BQU0sT0FBTjtBQUNQLG9CQUFZLFFBQVo7QUFDQSxrQkFBVSxRQUFWO0FBQ0EsMEJBQWtCLE1BQU0sU0FBTixDQUFnQixnQkFBaEI7T0FKcEIsQ0FESztLQVBQOzs7QUFEaUIsUUFrQmpCLENBQUssa0JBQUwsR0FBMEIsS0FBMUIsQ0FsQmlCO0dBQW5COzs7Ozs7Ozs7O2VBVkk7O29DQXFDWSxnQkFBZ0I7QUFDOUIsVUFBSSxjQUFKLEVBQW9CO0FBQ2xCLGFBQUssTUFBTCxDQUFZLFNBQVosNEJBQThDLHFCQUE5QyxDQURrQjtBQUVsQixhQUFLLGtCQUFMLEdBQTBCLElBQTFCLENBRmtCO09BQXBCLE1BR087QUFDTCxlQUFPLEtBQUssTUFBTCxDQUFZLFNBQVosQ0FERjtBQUVMLGFBQUssa0JBQUwsR0FBMEIsS0FBMUIsQ0FGSztPQUhQO0FBT0EsYUFBTyxJQUFQLENBUjhCOzs7Ozs7Ozs7Ozs7OztxQ0FtQmYsS0FBSztBQUNwQixXQUFLLE1BQUwsQ0FBWSxnQkFBWixHQUErQixHQUEvQixDQURvQjtBQUVwQixhQUFPLElBQVAsQ0FGb0I7Ozs7Ozs7Ozs7Ozs7NEJBWWQ7QUFDTixVQUFJLENBQUMsS0FBSyxrQkFBTCxFQUF5QjtBQUM1QixjQUFNLElBQUksS0FBSixDQUFVLFdBQVcsVUFBWCxDQUFzQixtQkFBdEIsQ0FBaEIsQ0FENEI7T0FBOUI7O0FBSUEsYUFBTyxLQUFLLE1BQUwsQ0FMRDs7OztTQXBFSjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQXFHQTs7Ozs7Ozs7Ozs7QUFVSixXQVZJLGtCQVVKLENBQVksS0FBWixFQUFtQjswQkFWZixvQkFVZTs7QUFDakIsUUFBSSxLQUFKLEVBQVc7QUFDVCxXQUFLLE1BQUwsR0FBYztBQUNaLGVBQU8sTUFBTSxLQUFOO0FBQ1Asb0JBQVksTUFBTSxVQUFOO0FBQ1osa0JBQVUsTUFBTSxRQUFOO0FBQ1YsMEJBQWtCLE1BQU0sZ0JBQU47QUFDbEIsZ0JBQVEsTUFBTSxNQUFOO09BTFYsQ0FEUztLQUFYLE1BUU87QUFDTCxXQUFLLE1BQUwsR0FBYztBQUNaLGVBQU8sTUFBTSxZQUFOO0FBQ1Asb0JBQVksUUFBWjtBQUNBLGtCQUFVLFFBQVY7QUFDQSwwQkFBa0IsTUFBTSxTQUFOLENBQWdCLGdCQUFoQjtBQUNsQixnQkFBUSxJQUFSO09BTEYsQ0FESztLQVJQO0dBREY7Ozs7Ozs7Ozs7Ozs7ZUFWSTs7cUNBdUNhLEtBQUs7QUFDcEIsV0FBSyxNQUFMLENBQVksZ0JBQVosR0FBK0IsR0FBL0IsQ0FEb0I7QUFFcEIsYUFBTyxJQUFQLENBRm9COzs7Ozs7Ozs7Ozs7Ozs7OzsyQkFnQmYsV0FBd0I7VUFBYiw0REFBTSxxQkFBTzs7QUFDN0IsV0FBSyxNQUFMLENBQVksTUFBWixHQUFxQixxQkFBSSxXQUFZLE1BQU0sS0FBTixHQUFjLE1BQWQsQ0FBaEIsQ0FBckIsQ0FENkI7QUFFN0IsYUFBTyxJQUFQLENBRjZCOzs7Ozs7Ozs7Ozs7OzRCQVl2QjtBQUNOLGFBQU8sS0FBSyxNQUFMLENBREQ7Ozs7U0FuRUo7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBdUZOLElBQU0sZUFBZTs7Ozs7Ozs7OztBQVNuQixnQ0FBVztBQUNULFdBQU8sSUFBSSxhQUFKLEVBQVAsQ0FEUztHQVRROzs7Ozs7Ozs7O0FBb0JuQiwwQ0FBZ0I7QUFDZCxXQUFPLElBQUksa0JBQUosRUFBUCxDQURjO0dBcEJHOzs7Ozs7Ozs7Ozs7OztBQW1DbkIsNENBQWdCLEtBQUs7QUFDbkIsWUFBUSxJQUFJLEtBQUo7QUFDTixXQUFLLE1BQU0sT0FBTjtBQUNILGVBQU8sSUFBSSxhQUFKLENBQWtCLEdBQWxCLENBQVAsQ0FERjtBQURGLFdBR08sTUFBTSxZQUFOO0FBQ0gsZUFBTyxJQUFJLGtCQUFKLENBQXVCLEdBQXZCLENBQVAsQ0FERjtBQUhGO0FBTUksZUFBTyxJQUFQLENBREY7QUFMRixLQURtQjtHQW5DRjtDQUFmOztBQStDTixPQUFPLE9BQVAsR0FBaUIsWUFBakIiLCJmaWxlIjoicXVlcnktYnVpbGRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IFF1ZXJ5ID0gcmVxdWlyZSgnLi9xdWVyeScpO1xuY29uc3QgTGF5ZXJFcnJvciA9IHJlcXVpcmUoJy4vbGF5ZXItZXJyb3InKTtcblxuLyoqXG4gKiBRdWVyeSBidWlsZGVyIGNsYXNzIGdlbmVyYXRpbmcgcXVlcmllcyBmb3IgYSBzZXQgb2YgbWVzc2FnZXMuXG4gKiBVc2VkIGluIENyZWF0aW5nIGFuZCBVcGRhdGluZyBsYXllci5RdWVyeSBpbnN0YW5jZXMuXG4gKlxuICogVXNpbmcgdGhlIFF1ZXJ5IEJ1aWxkZXIsIHdlIHNob3VsZCBiZSBhYmxlIHRvIGluc3RhbnRpYXRlIGEgUXVlcnlcbiAqXG4gKiAgICAgIHZhciBxQnVpbGRlciA9IFF1ZXJ5QnVpbGRlclxuICogICAgICAgLm1lc3NhZ2VzKClcbiAqICAgICAgIC5mb3JDb252ZXJzYXRpb24oJ2xheWVyOi8vL2NvbnZlcnNhdGlvbnMvZmZmZmZmZmYtZmZmZi1mZmZmLWZmZmYtZmZmZmZmZmZmZmZmJylcbiAqICAgICAgIC5wYWdpbmF0aW9uV2luZG93KDEwMCk7XG4gKiAgICAgIHZhciBxdWVyeSA9IGNsaWVudC5jcmVhdGVRdWVyeShxQnVpbGRlcik7XG4gKlxuICpcbiAqIFlvdSBjYW4gdGhlbiBjcmVhdGUgYWRkaXRpb25hbCBidWlsZGVycyBhbmQgdXBkYXRlIHRoZSBxdWVyeTpcbiAqXG4gKiAgICAgIHZhciBxQnVpbGRlcjIgPSBRdWVyeUJ1aWxkZXJcbiAqICAgICAgIC5tZXNzYWdlcygpXG4gKiAgICAgICAuZm9yQ29udmVyc2F0aW9uKCdsYXllcjovLy9jb252ZXJzYXRpb25zL2JiYmJiYmJiLWJiYmItYmJiYi1iYmJiLWJiYmJiYmJiYmJiYicpXG4gKiAgICAgICAucGFnaW5hdGlvbldpbmRvdygyMDApO1xuICogICAgICBxdWVyeS51cGRhdGUocUJ1aWxkZXIpO1xuICpcbiAqIEBjbGFzcyBsYXllci5RdWVyeUJ1aWxkZXIuTWVzc2FnZXNRdWVyeVxuICovXG5jbGFzcyBNZXNzYWdlc1F1ZXJ5IHtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBxdWVyeSBidWlsZGVyIGZvciBhIHNldCBvZiBtZXNzYWdlcy5cbiAgICpcbiAgICogU3RhbmRhcmQgdXNlIGlzIHdpdGhvdXQgYW55IGFyZ3VtZW50cy5cbiAgICpcbiAgICogQG1ldGhvZCBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0gIHtPYmplY3R9IFtxdWVyeT1udWxsXVxuICAgKi9cbiAgY29uc3RydWN0b3IocXVlcnkpIHtcbiAgICBpZiAocXVlcnkpIHtcbiAgICAgIHRoaXMuX3F1ZXJ5ID0ge1xuICAgICAgICBtb2RlbDogcXVlcnkubW9kZWwsXG4gICAgICAgIHJldHVyblR5cGU6IHF1ZXJ5LnJldHVyblR5cGUsXG4gICAgICAgIGRhdGFUeXBlOiBxdWVyeS5kYXRhVHlwZSxcbiAgICAgICAgcGFnaW5hdGlvbldpbmRvdzogcXVlcnkucGFnaW5hdGlvbldpbmRvdyxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3F1ZXJ5ID0ge1xuICAgICAgICBtb2RlbDogUXVlcnkuTWVzc2FnZSxcbiAgICAgICAgcmV0dXJuVHlwZTogJ29iamVjdCcsXG4gICAgICAgIGRhdGFUeXBlOiAnb2JqZWN0JyxcbiAgICAgICAgcGFnaW5hdGlvbldpbmRvdzogUXVlcnkucHJvdG90eXBlLnBhZ2luYXRpb25XaW5kb3csXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIFRPRE8gcmVtb3ZlIHdoZW4gbWVzc2FnZXMgY2FuIGJlIGZldGNoZWQgdmlhIHF1ZXJ5IEFQSSByYXRoZXIgdGhhbiBgR0VUIC9tZXNzYWdlc2BcbiAgICB0aGlzLl9jb252ZXJzYXRpb25JZFNldCA9IGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIFF1ZXJ5IGZvciBtZXNzYWdlcyBpbiB0aGlzIENvbnZlcnNhdGlvbi5cbiAgICpcbiAgICogQG1ldGhvZCBmb3JDb252ZXJzYXRpb25cbiAgICogQHBhcmFtICB7U3RyaW5nfSBjb252ZXJzYXRpb25JZFxuICAgKi9cbiAgZm9yQ29udmVyc2F0aW9uKGNvbnZlcnNhdGlvbklkKSB7XG4gICAgaWYgKGNvbnZlcnNhdGlvbklkKSB7XG4gICAgICB0aGlzLl9xdWVyeS5wcmVkaWNhdGUgPSBgY29udmVyc2F0aW9uLmlkID0gJyR7Y29udmVyc2F0aW9uSWR9J2A7XG4gICAgICB0aGlzLl9jb252ZXJzYXRpb25JZFNldCA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlbGV0ZSB0aGlzLl9xdWVyeS5wcmVkaWNhdGU7XG4gICAgICB0aGlzLl9jb252ZXJzYXRpb25JZFNldCA9IGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBwYWdpbmF0aW9uIHdpbmRvdy9udW1iZXIgb2YgbWVzc2FnZXMgdG8gZmV0Y2ggZnJvbSB0aGUgbG9jYWwgY2FjaGUgb3Igc2VydmVyLlxuICAgKlxuICAgKiBDdXJyZW50bHkgb25seSBwb3NpdGl2ZSBpbnRlZ2VycyBhcmUgc3VwcG9ydGVkLlxuICAgKlxuICAgKiBAbWV0aG9kIHBhZ2luYXRpb25XaW5kb3dcbiAgICogQHBhcmFtICB7bnVtYmVyfSB3aW5cbiAgICovXG4gIHBhZ2luYXRpb25XaW5kb3cod2luKSB7XG4gICAgdGhpcy5fcXVlcnkucGFnaW5hdGlvbldpbmRvdyA9IHdpbjtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBidWlsdCBxdWVyeSBvYmplY3QgdG8gc2VuZCB0byB0aGUgc2VydmVyLlxuICAgKlxuICAgKiBDYWxsZWQgYnkgbGF5ZXIuUXVlcnlCdWlsZGVyLiBZb3Ugc2hvdWxkIG5vdCBuZWVkIHRvIGNhbGwgdGhpcy5cbiAgICpcbiAgICogQG1ldGhvZCBidWlsZFxuICAgKi9cbiAgYnVpbGQoKSB7XG4gICAgaWYgKCF0aGlzLl9jb252ZXJzYXRpb25JZFNldCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKExheWVyRXJyb3IuZGljdGlvbmFyeS5jb252ZXJzYXRpb25NaXNzaW5nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fcXVlcnk7XG4gIH1cblxufVxuXG4vKipcbiAqIFF1ZXJ5IGJ1aWxkZXIgY2xhc3MgZ2VuZXJhdGluZyBxdWVyaWVzIGZvciBhIHNldCBvZiBDb252ZXJzYXRpb25zLlxuICpcbiAqIFVzZWQgaW4gQ3JlYXRpbmcgYW5kIFVwZGF0aW5nIGxheWVyLlF1ZXJ5IGluc3RhbmNlcy5cbiAqIE5vdGUgdGhhdCBhdCB0aGlzIHRpbWUsIHRoZSBvbmx5IHRoaW5nIHdlIGNhbiBxdWVyeSBmb3IgaXNcbiAqIEFMTCBDb252ZXJzYXRpb25zOyBwcmltYXJ5IHVzZSBmb3IgdGhpcyBpcyB0byBwYWdlIHRocm91Z2ggdGhlIENvbnZlcnNhdGlvbnMuXG4gKlxuICogVG8gZ2V0IHN0YXJ0ZWQ6XG4gKlxuICogICAgICB2YXIgcUJ1aWxkZXIgPSBRdWVyeUJ1aWxkZXJcbiAqICAgICAgIC5jb252ZXJzYXRpb25zKClcbiAqICAgICAgIC5wYWdpbmF0aW9uV2luZG93KDEwMCk7XG4gKiAgICAgIHZhciBxdWVyeSA9IGNsaWVudC5jcmVhdGVRdWVyeShxQnVpbGRlcik7XG4gKlxuICogWW91IGNhbiB0aGVuIGNyZWF0ZSBhZGRpdGlvbmFsIGJ1aWxkZXJzIGFuZCB1cGRhdGUgdGhlIHF1ZXJ5OlxuICpcbiAqICAgICAgdmFyIHFCdWlsZGVyMiA9IFF1ZXJ5QnVpbGRlclxuICogICAgICAgLmNvbnZlcnNhdGlvbnMoKVxuICogICAgICAgLnBhZ2luYXRpb25XaW5kb3coMjAwKTtcbiAqICAgICAgcXVlcnkudXBkYXRlKHFCdWlsZGVyKTtcbiAqXG4gKiBAY2xhc3MgbGF5ZXIuUXVlcnlCdWlsZGVyLkNvbnZlcnNhdGlvbnNRdWVyeVxuICovXG5jbGFzcyBDb252ZXJzYXRpb25zUXVlcnkge1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IHF1ZXJ5IGJ1aWxkZXIgZm9yIGEgc2V0IG9mIGNvbnZlcnNhdGlvbnMuXG4gICAqXG4gICAqIFN0YW5kYXJkIHVzZSBpcyB3aXRob3V0IGFueSBhcmd1bWVudHMuXG4gICAqXG4gICAqIEBtZXRob2QgY29uc3RydWN0b3JcbiAgICogQHBhcmFtICB7T2JqZWN0fSBbcXVlcnk9bnVsbF1cbiAgICovXG4gIGNvbnN0cnVjdG9yKHF1ZXJ5KSB7XG4gICAgaWYgKHF1ZXJ5KSB7XG4gICAgICB0aGlzLl9xdWVyeSA9IHtcbiAgICAgICAgbW9kZWw6IHF1ZXJ5Lm1vZGVsLFxuICAgICAgICByZXR1cm5UeXBlOiBxdWVyeS5yZXR1cm5UeXBlLFxuICAgICAgICBkYXRhVHlwZTogcXVlcnkuZGF0YVR5cGUsXG4gICAgICAgIHBhZ2luYXRpb25XaW5kb3c6IHF1ZXJ5LnBhZ2luYXRpb25XaW5kb3csXG4gICAgICAgIHNvcnRCeTogcXVlcnkuc29ydEJ5LFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fcXVlcnkgPSB7XG4gICAgICAgIG1vZGVsOiBRdWVyeS5Db252ZXJzYXRpb24sXG4gICAgICAgIHJldHVyblR5cGU6ICdvYmplY3QnLFxuICAgICAgICBkYXRhVHlwZTogJ29iamVjdCcsXG4gICAgICAgIHBhZ2luYXRpb25XaW5kb3c6IFF1ZXJ5LnByb3RvdHlwZS5wYWdpbmF0aW9uV2luZG93LFxuICAgICAgICBzb3J0Qnk6IG51bGwsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBwYWdpbmF0aW9uIHdpbmRvdy9udW1iZXIgb2YgbWVzc2FnZXMgdG8gZmV0Y2ggZnJvbSB0aGUgbG9jYWwgY2FjaGUgb3Igc2VydmVyLlxuICAgKlxuICAgKiBDdXJyZW50bHkgb25seSBwb3NpdGl2ZSBpbnRlZ2VycyBhcmUgc3VwcG9ydGVkLlxuICAgKlxuICAgKiBAbWV0aG9kIHBhZ2luYXRpb25XaW5kb3dcbiAgICogQHBhcmFtICB7bnVtYmVyfSB3aW5cbiAgICogQHJldHVybiB7bGF5ZXIuUXVlcnlCdWlsZGVyfSB0aGlzXG4gICAqL1xuICBwYWdpbmF0aW9uV2luZG93KHdpbikge1xuICAgIHRoaXMuX3F1ZXJ5LnBhZ2luYXRpb25XaW5kb3cgPSB3aW47XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgc29ydGluZyBvcHRpb25zIGZvciB0aGUgQ29udmVyc2F0aW9uLlxuICAgKlxuICAgKiBDdXJyZW50bHkgb25seSBzdXBwb3J0cyBkZXNjZW5kaW5nIG9yZGVyXG4gICAqIEN1cnJlbnRseSBvbmx5IHN1cHBvcnRzIGZpZWxkTmFtZXMgb2YgXCJjcmVhdGVkQXRcIiBhbmQgXCJsYXN0TWVzc2FnZS5zZW50QXRcIlxuICAgKlxuICAgKiBAbWV0aG9kIHNvcnRCeVxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IGZpZWxkTmFtZSAgLSBmaWVsZCB0byBzb3J0IGJ5XG4gICAqIEBwYXJhbSAge2Jvb2xlYW59IGFzYyAtIElzIGFuIGFzY2VuZGluZyBzb3J0P1xuICAgKiBAcmV0dXJuIHtsYXllci5RdWVyeUJ1aWxkZXJ9IHRoaXNcbiAgICovXG4gIHNvcnRCeShmaWVsZE5hbWUsIGFzYyA9IGZhbHNlKSB7XG4gICAgdGhpcy5fcXVlcnkuc29ydEJ5ID0gW3sgW2ZpZWxkTmFtZV06IGFzYyA/ICdhc2MnIDogJ2Rlc2MnIH1dO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGJ1aWx0IHF1ZXJ5IG9iamVjdCB0byBzZW5kIHRvIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqIENhbGxlZCBieSBsYXllci5RdWVyeUJ1aWxkZXIuIFlvdSBzaG91bGQgbm90IG5lZWQgdG8gY2FsbCB0aGlzLlxuICAgKlxuICAgKiBAbWV0aG9kIGJ1aWxkXG4gICAqL1xuICBidWlsZCgpIHtcbiAgICByZXR1cm4gdGhpcy5fcXVlcnk7XG4gIH1cbn1cblxuLyoqXG4gKiBRdWVyeSBidWlsZGVyIGNsYXNzLiBVc2VkIHdpdGggbGF5ZXIuUXVlcnkgdG8gc3BlY2lmeSB3aGF0IGxvY2FsL3JlbW90ZVxuICogZGF0YSBjaGFuZ2VzIHRvIHN1YnNjcmliZSB0by4gIEZvciBleGFtcGxlcywgc2VlIGxheWVyLlF1ZXJ5QnVpbGRlci5NZXNzYWdlc1F1ZXJ5XG4gKiBhbmQgbGF5ZXIuUXVlcnlCdWlsZGVyLkNvbnZlcnNhdGlvbnNRdWVyeS4gIFRoaXMgc3RhdGljIGNsYXNzIGlzIHVzZWQgdG8gaW5zdGFudGlhdGVcbiAqIE1lc3NhZ2VzUXVlcnkgYW5kIENvbnZlcnNhdGlvbnNRdWVyeSBCdWlsZGVyIGluc3RhbmNlczpcbiAqXG4gKiAgICAgIHZhciBjb252ZXJzYXRpb25zUXVlcnlCdWlsZGVyID0gUXVlcnlCdWlsZGVyLmNvbnZlcnNhdGlvbnMoKTtcbiAqICAgICAgdmFyIG1lc3NhZ2VzUXVlcnlCdWlkbGVyID0gUXVlcnlCdWlsZGVyLm1lc3NhZ2VzKCk7XG4gKlxuICogU2hvdWxkIHlvdSB1c2UgdGhlc2UgaW5zdGVhZCBvZiBkaXJlY3RseSB1c2luZyB0aGUgbGF5ZXIuUXVlcnkgY2xhc3M/XG4gKiBUaGF0IGlzIGEgbWF0dGVyIG9mIHByb2dyYW1taW5nIHN0eWxlIGFuZCBwcmVmZXJlbmNlLCB0aGVyZSBpcyBub1xuICogY29ycmVjdCBhbnN3ZXIuXG4gKlxuICogQGNsYXNzIGxheWVyLlF1ZXJ5QnVpbGRlclxuICovXG5jb25zdCBRdWVyeUJ1aWxkZXIgPSB7XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBsYXllci5NZXNzYWdlc1F1ZXJ5IGluc3RhbmNlLlxuICAgKlxuICAgKiBAbWV0aG9kIG1lc3NhZ2VzXG4gICAqIEBzdGF0aWNcbiAgICogQHJldHVybnMge2xheWVyLlF1ZXJ5QnVpbGRlci5NZXNzYWdlc1F1ZXJ5fVxuICAgKi9cbiAgbWVzc2FnZXMoKSB7XG4gICAgcmV0dXJuIG5ldyBNZXNzYWdlc1F1ZXJ5KCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBsYXllci5Db252ZXJzYXRpb25zUXVlcnkgaW5zdGFuY2UuXG4gICAqXG4gICAqIEBtZXRob2QgY29udmVyc2F0aW9uc1xuICAgKiBAc3RhdGljXG4gICAqIEByZXR1cm5zIHtsYXllci5RdWVyeUJ1aWxkZXIuQ29udmVyc2F0aW9uc1F1ZXJ5fVxuICAgKi9cbiAgY29udmVyc2F0aW9ucygpIHtcbiAgICByZXR1cm4gbmV3IENvbnZlcnNhdGlvbnNRdWVyeSgpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBUYWtlcyB0aGUgcmV0dXJuIHZhbHVlIG9mIFF1ZXJ5QnVpbGRlci5wcm90b3R5cGUuYnVpbGQgYW5kIGNyZWF0ZXMgYVxuICAgKiBuZXcgUXVlcnlCdWlsZGVyLlxuICAgKlxuICAgKiBVc2VkIHdpdGhpbiBsYXllci5RdWVyeS5wcm90b3R5cGUudG9CdWlsZGVyLlxuICAgKlxuICAgKiBAbWV0aG9kIGZyb21RdWVyeU9iamVjdFxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gICAqIEBzdGF0aWNcbiAgICovXG4gIGZyb21RdWVyeU9iamVjdChvYmopIHtcbiAgICBzd2l0Y2ggKG9iai5tb2RlbCkge1xuICAgICAgY2FzZSBRdWVyeS5NZXNzYWdlOlxuICAgICAgICByZXR1cm4gbmV3IE1lc3NhZ2VzUXVlcnkob2JqKTtcbiAgICAgIGNhc2UgUXVlcnkuQ29udmVyc2F0aW9uOlxuICAgICAgICByZXR1cm4gbmV3IENvbnZlcnNhdGlvbnNRdWVyeShvYmopO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9LFxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBRdWVyeUJ1aWxkZXI7XG5cbiJdfQ==
