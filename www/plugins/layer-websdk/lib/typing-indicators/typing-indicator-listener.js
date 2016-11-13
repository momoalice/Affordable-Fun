'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * The TypingIndicatorListener receives Typing Indicator state
 * for other users via a websocket, and notifies
 * the client of the updated state.  Typical applications
 * do not access this component directly, but DO subscribe
 * to events produced by this component:
 *
 *      client.on('typing-indicator-change', function(evt) {
 *        if (evt.conversationId == conversationICareAbout) {
 *          console.log('The following users are typing: ' + evt.typing.join(', '));
 *          console.log('The following users are paused: ' + evt.paused.join(', '));
 *        }
 *      });
 *
 * @class layer.TypingIndicators.TypingIndicatorListener
 * @extends {layer.Root}
 */

var Root = require('../root');
var ClientRegistry = require('../client-registry');

var _require = require('./typing-indicators');

var STARTED = _require.STARTED;
var PAUSED = _require.PAUSED;
var FINISHED = _require.FINISHED;

var TypingIndicatorListener = function (_Root) {
  _inherits(TypingIndicatorListener, _Root);

  /**
   * Creates a Typing Indicator Listener for this Client.
   *
   * @method constructor
   * @protected
   * @param  {Object} args
   * @param {string} args.clientId - ID of the client this belongs to
   */

  function TypingIndicatorListener(args) {
    _classCallCheck(this, TypingIndicatorListener);

    /**
     * Stores the state of all Conversations, indicating who is typing and who is paused.
     *
     * People who are stopped are removed from this state.
     * @property {Object} state
     */

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(TypingIndicatorListener).call(this, args));

    _this.state = {};
    _this._pollId = 0;
    var client = _this._getClient();
    client.on('ready', function () {
      return _this._clientReady();
    });
    return _this;
  }

  /**
   * Called when the client is ready
   *
   * @method _clientReady
   * @private
   */


  _createClass(TypingIndicatorListener, [{
    key: '_clientReady',
    value: function _clientReady() {
      var client = this._getClient();
      this.userId = client.userId;
      var ws = client.socketManager;
      ws.on('message', this._handleSocketEvent, this);
      this._startPolling();
    }

    /**
     * Determines if this event is relevant to report on.
     * Must be a typing indicator signal that is reporting on
     * someone other than this user.
     *
     * @method _isRelevantEvent
     * @private
     * @param  {Object}  Websocket event data
     * @return {Boolean}
     */

  }, {
    key: '_isRelevantEvent',
    value: function _isRelevantEvent(evt) {
      return evt.type === 'signal' && evt.body.type === 'typing_indicator' && evt.body.data.user_id !== this.userId;
    }

    /**
     * This method receives websocket events and
     * if they are typing indicator events, updates its state.
     *
     * @method _handleSocketEvent
     * @private
     * @param {layer.LayerEvent} evtIn - All websocket events
     */

  }, {
    key: '_handleSocketEvent',
    value: function _handleSocketEvent(evtIn) {
      var evt = evtIn.data;

      if (this._isRelevantEvent(evt)) {
        var userId = evt.body.data.user_id;
        var state = evt.body.data.action;
        var conversationId = evt.body.object.id;
        var stateEntry = this.state[conversationId];
        if (!stateEntry) {
          stateEntry = this.state[conversationId] = {
            users: {},
            typing: [],
            paused: []
          };
        }
        stateEntry.users[userId] = {
          startTime: Date.now(),
          state: state
        };
        if (stateEntry.users[userId].state === FINISHED) {
          delete stateEntry.users[userId];
        }

        this._updateState(stateEntry, state, userId);

        this.trigger('typing-indicator-change', {
          conversationId: conversationId,
          typing: stateEntry.typing,
          paused: stateEntry.paused
        });
      }
    }

    /**
     * Updates the state of a single stateEntry; a stateEntry
     * represents a single Conversation's typing indicator data.
     *
     * Updates typing and paused arrays following immutable strategies
     * in hope that this will help Flex based architectures.
     *
     * @method _updateState
     * @private
     * @param  {Object} stateEntry - A Conversation's typing indicator state
     * @param  {string} newState   - started, paused or finished
     * @param  {string} userId     - ID of the user whose state has changed
     */

  }, {
    key: '_updateState',
    value: function _updateState(stateEntry, newState, userId) {
      var typingIndex = stateEntry.typing.indexOf(userId);
      if (newState !== STARTED && typingIndex !== -1) {
        stateEntry.typing = [].concat(_toConsumableArray(stateEntry.typing.slice(0, typingIndex)), _toConsumableArray(stateEntry.typing.slice(typingIndex + 1)));
      }
      var pausedIndex = stateEntry.paused.indexOf(userId);
      if (newState !== PAUSED && pausedIndex !== -1) {
        stateEntry.paused = [].concat(_toConsumableArray(stateEntry.paused.slice(0, pausedIndex)), _toConsumableArray(stateEntry.paused.slice(pausedIndex + 1)));
      }

      if (newState === STARTED && typingIndex === -1) {
        stateEntry.typing = [].concat(_toConsumableArray(stateEntry.typing), [userId]);
      } else if (newState === PAUSED && pausedIndex === -1) {
        stateEntry.paused = [].concat(_toConsumableArray(stateEntry.paused), [userId]);
      }
    }

    /**
     * Any time a state change becomes more than 6 seconds stale,
     * assume that the user is 'finished'.
     *
     * In theory, we should
     * receive a new event every 2.5 seconds.  If the current user
     * has gone offline, lack of this code would cause the people
     * currently flagged as typing as still typing hours from now.
     *
     * For this first pass, we just mark the user as 'finished'
     * but a future pass may move from 'started' to 'paused'
     * and 'paused to 'finished'
     *
     * @method _startPolling
     * @private
     */

  }, {
    key: '_startPolling',
    value: function _startPolling() {
      var _this2 = this;

      if (this._pollId) return;
      this._pollId = setInterval(function () {
        return _this2._poll();
      }, 5000);
    }
  }, {
    key: '_poll',
    value: function _poll() {
      var _this3 = this;

      var conversationIds = Object.keys(this.state);

      conversationIds.forEach(function (id) {
        var state = _this3.state[id];
        Object.keys(_this3.state[id].users).forEach(function (userId) {
          if (Date.now() >= state.users[userId].startTime + 6000) {
            _this3._updateState(state, FINISHED, userId);
            delete state.users[userId];
            _this3.trigger('typing-indicator-change', {
              conversationId: id,
              typing: state.typing,
              paused: state.paused
            });
          }
        });
      });
    }

    /**
     * Get the Client associated with this class.  Uses the clientId
     * property.
     *
     * @method _getClient
     * @protected
     * @return {layer.Client}
     */

  }, {
    key: '_getClient',
    value: function _getClient() {
      return ClientRegistry.get(this.clientId);
    }
  }]);

  return TypingIndicatorListener;
}(Root);

/**
 * setTimeout ID for polling for states to transition
 * @type {Number}
 * @private
 */


TypingIndicatorListener.prototype._pollId = 0;

/**
 * ID of the client this instance is associated with
 * @type {String}
 */
TypingIndicatorListener.prototype.clientId = '';

TypingIndicatorListener.bubbleEventParent = '_getClient';

TypingIndicatorListener._supportedEvents = [
/**
 * There has been a change in typing indicator state of other users.
 * @event change
 * @param {layer.LayerEvent} evt
 * @param {string[]} evt.typing - Array of userIds of people who are typing
 * @param {string[]} evt.paused - Array of userIds of people who are paused
 * @param {string} evt.conversationId - ID of the Converation that has changed typing indicator state
 */
'typing-indicator-change'].concat(Root._supportedEvents);

Root.initClass.apply(TypingIndicatorListener, [TypingIndicatorListener, 'TypingIndicatorListener']);
module.exports = TypingIndicatorListener;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy90eXBpbmctaW5kaWNhdG9ycy90eXBpbmctaW5kaWNhdG9yLWxpc3RlbmVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWtCQSxJQUFNLE9BQU8sUUFBUSxTQUFSLENBQVA7QUFDTixJQUFNLGlCQUFpQixRQUFRLG9CQUFSLENBQWpCOztlQUU4QixRQUFRLHFCQUFSOztJQUE3QjtJQUFTO0lBQVE7O0lBQ2xCOzs7Ozs7Ozs7Ozs7QUFVSixXQVZJLHVCQVVKLENBQVksSUFBWixFQUFrQjswQkFWZCx5QkFVYzs7Ozs7Ozs7O3VFQVZkLG9DQVdJLE9BRFU7O0FBU2hCLFVBQUssS0FBTCxHQUFhLEVBQWIsQ0FUZ0I7QUFVaEIsVUFBSyxPQUFMLEdBQWUsQ0FBZixDQVZnQjtBQVdoQixRQUFNLFNBQVMsTUFBSyxVQUFMLEVBQVQsQ0FYVTtBQVloQixXQUFPLEVBQVAsQ0FBVSxPQUFWLEVBQW1CO2FBQU0sTUFBSyxZQUFMO0tBQU4sQ0FBbkIsQ0FaZ0I7O0dBQWxCOzs7Ozs7Ozs7O2VBVkk7O21DQStCVztBQUNiLFVBQU0sU0FBUyxLQUFLLFVBQUwsRUFBVCxDQURPO0FBRWIsV0FBSyxNQUFMLEdBQWMsT0FBTyxNQUFQLENBRkQ7QUFHYixVQUFNLEtBQUssT0FBTyxhQUFQLENBSEU7QUFJYixTQUFHLEVBQUgsQ0FBTSxTQUFOLEVBQWlCLEtBQUssa0JBQUwsRUFBeUIsSUFBMUMsRUFKYTtBQUtiLFdBQUssYUFBTCxHQUxhOzs7Ozs7Ozs7Ozs7Ozs7O3FDQWtCRSxLQUFLO0FBQ3BCLGFBQU8sSUFBSSxJQUFKLEtBQWEsUUFBYixJQUNMLElBQUksSUFBSixDQUFTLElBQVQsS0FBa0Isa0JBQWxCLElBQ0EsSUFBSSxJQUFKLENBQVMsSUFBVCxDQUFjLE9BQWQsS0FBMEIsS0FBSyxNQUFMLENBSFI7Ozs7Ozs7Ozs7Ozs7O3VDQWNILE9BQU87QUFDeEIsVUFBTSxNQUFNLE1BQU0sSUFBTixD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QWUsS0FBZixDQUFaLENBQ0csT0FESCxDQUNXLFVBQUMsTUFBRCxFQUFZO0FBQ25CLGNBQUksS0FBSyxHQUFMLE1BQWMsTUFBTSxLQUFOLENBQVksTUFBWixFQUFvQixTQUFwQixHQUFnQyxJQUFoQyxFQUFzQztBQUN0RCxtQkFBSyxZQUFMLENBQWtCLEtBQWxCLEVBQXlCLFFBQXpCLEVBQW1DLE1BQW5DLEVBRHNEO0FBRXRELG1CQUFPLE1BQU0sS0FBTixDQUFZLE1BQVosQ0FBUCxDQUZzRDtBQUd0RCxtQkFBSyxPQUFMLENBQWEseUJBQWIsRUFBd0M7QUFDdEMsOEJBQWdCLEVBQWhCO0FBQ0Esc0JBQVEsTUFBTSxNQUFOO0FBQ1Isc0JBQVEsTUFBTSxNQUFOO2FBSFYsRUFIc0Q7V0FBeEQ7U0FETyxDQURYLENBRjRCO09BQU4sQ0FBeEIsQ0FITTs7Ozs7Ozs7Ozs7Ozs7aUNBNEJLO0FBQ1gsYUFBTyxlQUFlLEdBQWYsQ0FBbUIsS0FBSyxRQUFMLENBQTFCLENBRFc7Ozs7U0F0TFQ7RUFBZ0M7Ozs7Ozs7OztBQWdNdEMsd0JBQXdCLFNBQXhCLENBQWtDLE9BQWxDLEdBQTRDLENBQTVDOzs7Ozs7QUFNQSx3QkFBd0IsU0FBeEIsQ0FBa0MsUUFBbEMsR0FBNkMsRUFBN0M7O0FBRUEsd0JBQXdCLGlCQUF4QixHQUE0QyxZQUE1Qzs7QUFHQSx3QkFBd0IsZ0JBQXhCLEdBQTJDOzs7Ozs7Ozs7QUFTekMseUJBVHlDLEVBVXpDLE1BVnlDLENBVWxDLEtBQUssZ0JBQUwsQ0FWVDs7QUFZQSxLQUFLLFNBQUwsQ0FBZSxLQUFmLENBQXFCLHVCQUFyQixFQUE4QyxDQUFDLHVCQUFELEVBQTBCLHlCQUExQixDQUE5QztBQUNBLE9BQU8sT0FBUCxHQUFpQix1QkFBakIiLCJmaWxlIjoidHlwaW5nLWluZGljYXRvci1saXN0ZW5lci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVGhlIFR5cGluZ0luZGljYXRvckxpc3RlbmVyIHJlY2VpdmVzIFR5cGluZyBJbmRpY2F0b3Igc3RhdGVcbiAqIGZvciBvdGhlciB1c2VycyB2aWEgYSB3ZWJzb2NrZXQsIGFuZCBub3RpZmllc1xuICogdGhlIGNsaWVudCBvZiB0aGUgdXBkYXRlZCBzdGF0ZS4gIFR5cGljYWwgYXBwbGljYXRpb25zXG4gKiBkbyBub3QgYWNjZXNzIHRoaXMgY29tcG9uZW50IGRpcmVjdGx5LCBidXQgRE8gc3Vic2NyaWJlXG4gKiB0byBldmVudHMgcHJvZHVjZWQgYnkgdGhpcyBjb21wb25lbnQ6XG4gKlxuICogICAgICBjbGllbnQub24oJ3R5cGluZy1pbmRpY2F0b3ItY2hhbmdlJywgZnVuY3Rpb24oZXZ0KSB7XG4gKiAgICAgICAgaWYgKGV2dC5jb252ZXJzYXRpb25JZCA9PSBjb252ZXJzYXRpb25JQ2FyZUFib3V0KSB7XG4gKiAgICAgICAgICBjb25zb2xlLmxvZygnVGhlIGZvbGxvd2luZyB1c2VycyBhcmUgdHlwaW5nOiAnICsgZXZ0LnR5cGluZy5qb2luKCcsICcpKTtcbiAqICAgICAgICAgIGNvbnNvbGUubG9nKCdUaGUgZm9sbG93aW5nIHVzZXJzIGFyZSBwYXVzZWQ6ICcgKyBldnQucGF1c2VkLmpvaW4oJywgJykpO1xuICogICAgICAgIH1cbiAqICAgICAgfSk7XG4gKlxuICogQGNsYXNzIGxheWVyLlR5cGluZ0luZGljYXRvcnMuVHlwaW5nSW5kaWNhdG9yTGlzdGVuZXJcbiAqIEBleHRlbmRzIHtsYXllci5Sb290fVxuICovXG5cbmNvbnN0IFJvb3QgPSByZXF1aXJlKCcuLi9yb290Jyk7XG5jb25zdCBDbGllbnRSZWdpc3RyeSA9IHJlcXVpcmUoJy4uL2NsaWVudC1yZWdpc3RyeScpO1xuXG5jb25zdCB7U1RBUlRFRCwgUEFVU0VELCBGSU5JU0hFRH0gPSByZXF1aXJlKCcuL3R5cGluZy1pbmRpY2F0b3JzJyk7XG5jbGFzcyBUeXBpbmdJbmRpY2F0b3JMaXN0ZW5lciBleHRlbmRzIFJvb3Qge1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgVHlwaW5nIEluZGljYXRvciBMaXN0ZW5lciBmb3IgdGhpcyBDbGllbnQuXG4gICAqXG4gICAqIEBtZXRob2QgY29uc3RydWN0b3JcbiAgICogQHByb3RlY3RlZFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3NcbiAgICogQHBhcmFtIHtzdHJpbmd9IGFyZ3MuY2xpZW50SWQgLSBJRCBvZiB0aGUgY2xpZW50IHRoaXMgYmVsb25ncyB0b1xuICAgKi9cbiAgY29uc3RydWN0b3IoYXJncykge1xuICAgIHN1cGVyKGFyZ3MpO1xuXG4gICAgLyoqXG4gICAgICogU3RvcmVzIHRoZSBzdGF0ZSBvZiBhbGwgQ29udmVyc2F0aW9ucywgaW5kaWNhdGluZyB3aG8gaXMgdHlwaW5nIGFuZCB3aG8gaXMgcGF1c2VkLlxuICAgICAqXG4gICAgICogUGVvcGxlIHdobyBhcmUgc3RvcHBlZCBhcmUgcmVtb3ZlZCBmcm9tIHRoaXMgc3RhdGUuXG4gICAgICogQHByb3BlcnR5IHtPYmplY3R9IHN0YXRlXG4gICAgICovXG4gICAgdGhpcy5zdGF0ZSA9IHt9O1xuICAgIHRoaXMuX3BvbGxJZCA9IDA7XG4gICAgY29uc3QgY2xpZW50ID0gdGhpcy5fZ2V0Q2xpZW50KCk7XG4gICAgY2xpZW50Lm9uKCdyZWFkeScsICgpID0+IHRoaXMuX2NsaWVudFJlYWR5KCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSBjbGllbnQgaXMgcmVhZHlcbiAgICpcbiAgICogQG1ldGhvZCBfY2xpZW50UmVhZHlcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9jbGllbnRSZWFkeSgpIHtcbiAgICBjb25zdCBjbGllbnQgPSB0aGlzLl9nZXRDbGllbnQoKTtcbiAgICB0aGlzLnVzZXJJZCA9IGNsaWVudC51c2VySWQ7XG4gICAgY29uc3Qgd3MgPSBjbGllbnQuc29ja2V0TWFuYWdlcjtcbiAgICB3cy5vbignbWVzc2FnZScsIHRoaXMuX2hhbmRsZVNvY2tldEV2ZW50LCB0aGlzKTtcbiAgICB0aGlzLl9zdGFydFBvbGxpbmcoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIGlmIHRoaXMgZXZlbnQgaXMgcmVsZXZhbnQgdG8gcmVwb3J0IG9uLlxuICAgKiBNdXN0IGJlIGEgdHlwaW5nIGluZGljYXRvciBzaWduYWwgdGhhdCBpcyByZXBvcnRpbmcgb25cbiAgICogc29tZW9uZSBvdGhlciB0aGFuIHRoaXMgdXNlci5cbiAgICpcbiAgICogQG1ldGhvZCBfaXNSZWxldmFudEV2ZW50XG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdH0gIFdlYnNvY2tldCBldmVudCBkYXRhXG4gICAqIEByZXR1cm4ge0Jvb2xlYW59XG4gICAqL1xuICBfaXNSZWxldmFudEV2ZW50KGV2dCkge1xuICAgIHJldHVybiBldnQudHlwZSA9PT0gJ3NpZ25hbCcgJiZcbiAgICAgIGV2dC5ib2R5LnR5cGUgPT09ICd0eXBpbmdfaW5kaWNhdG9yJyAmJlxuICAgICAgZXZ0LmJvZHkuZGF0YS51c2VyX2lkICE9PSB0aGlzLnVzZXJJZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGlzIG1ldGhvZCByZWNlaXZlcyB3ZWJzb2NrZXQgZXZlbnRzIGFuZFxuICAgKiBpZiB0aGV5IGFyZSB0eXBpbmcgaW5kaWNhdG9yIGV2ZW50cywgdXBkYXRlcyBpdHMgc3RhdGUuXG4gICAqXG4gICAqIEBtZXRob2QgX2hhbmRsZVNvY2tldEV2ZW50XG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7bGF5ZXIuTGF5ZXJFdmVudH0gZXZ0SW4gLSBBbGwgd2Vic29ja2V0IGV2ZW50c1xuICAgKi9cbiAgX2hhbmRsZVNvY2tldEV2ZW50KGV2dEluKSB7XG4gICAgY29uc3QgZXZ0ID0gZXZ0SW4uZGF0YTtcblxuICAgIGlmICh0aGlzLl9pc1JlbGV2YW50RXZlbnQoZXZ0KSkge1xuICAgICAgY29uc3QgdXNlcklkID0gZXZ0LmJvZHkuZGF0YS51c2VyX2lkO1xuICAgICAgY29uc3Qgc3RhdGUgPSBldnQuYm9keS5kYXRhLmFjdGlvbjtcbiAgICAgIGNvbnN0IGNvbnZlcnNhdGlvbklkID0gZXZ0LmJvZHkub2JqZWN0LmlkO1xuICAgICAgbGV0IHN0YXRlRW50cnkgPSB0aGlzLnN0YXRlW2NvbnZlcnNhdGlvbklkXTtcbiAgICAgIGlmICghc3RhdGVFbnRyeSkge1xuICAgICAgICBzdGF0ZUVudHJ5ID0gdGhpcy5zdGF0ZVtjb252ZXJzYXRpb25JZF0gPSB7XG4gICAgICAgICAgdXNlcnM6IHt9LFxuICAgICAgICAgIHR5cGluZzogW10sXG4gICAgICAgICAgcGF1c2VkOiBbXSxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHN0YXRlRW50cnkudXNlcnNbdXNlcklkXSA9IHtcbiAgICAgICAgc3RhcnRUaW1lOiBEYXRlLm5vdygpLFxuICAgICAgICBzdGF0ZTogc3RhdGUsXG4gICAgICB9O1xuICAgICAgaWYgKHN0YXRlRW50cnkudXNlcnNbdXNlcklkXS5zdGF0ZSA9PT0gRklOSVNIRUQpIHtcbiAgICAgICAgZGVsZXRlIHN0YXRlRW50cnkudXNlcnNbdXNlcklkXTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fdXBkYXRlU3RhdGUoc3RhdGVFbnRyeSwgc3RhdGUsIHVzZXJJZCk7XG5cbiAgICAgIHRoaXMudHJpZ2dlcigndHlwaW5nLWluZGljYXRvci1jaGFuZ2UnLCB7XG4gICAgICAgIGNvbnZlcnNhdGlvbklkLFxuICAgICAgICB0eXBpbmc6IHN0YXRlRW50cnkudHlwaW5nLFxuICAgICAgICBwYXVzZWQ6IHN0YXRlRW50cnkucGF1c2VkLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgdGhlIHN0YXRlIG9mIGEgc2luZ2xlIHN0YXRlRW50cnk7IGEgc3RhdGVFbnRyeVxuICAgKiByZXByZXNlbnRzIGEgc2luZ2xlIENvbnZlcnNhdGlvbidzIHR5cGluZyBpbmRpY2F0b3IgZGF0YS5cbiAgICpcbiAgICogVXBkYXRlcyB0eXBpbmcgYW5kIHBhdXNlZCBhcnJheXMgZm9sbG93aW5nIGltbXV0YWJsZSBzdHJhdGVnaWVzXG4gICAqIGluIGhvcGUgdGhhdCB0aGlzIHdpbGwgaGVscCBGbGV4IGJhc2VkIGFyY2hpdGVjdHVyZXMuXG4gICAqXG4gICAqIEBtZXRob2QgX3VwZGF0ZVN0YXRlXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge09iamVjdH0gc3RhdGVFbnRyeSAtIEEgQ29udmVyc2F0aW9uJ3MgdHlwaW5nIGluZGljYXRvciBzdGF0ZVxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IG5ld1N0YXRlICAgLSBzdGFydGVkLCBwYXVzZWQgb3IgZmluaXNoZWRcbiAgICogQHBhcmFtICB7c3RyaW5nfSB1c2VySWQgICAgIC0gSUQgb2YgdGhlIHVzZXIgd2hvc2Ugc3RhdGUgaGFzIGNoYW5nZWRcbiAgICovXG4gIF91cGRhdGVTdGF0ZShzdGF0ZUVudHJ5LCBuZXdTdGF0ZSwgdXNlcklkKSB7XG4gICAgY29uc3QgdHlwaW5nSW5kZXggPSBzdGF0ZUVudHJ5LnR5cGluZy5pbmRleE9mKHVzZXJJZCk7XG4gICAgaWYgKG5ld1N0YXRlICE9PSBTVEFSVEVEICYmIHR5cGluZ0luZGV4ICE9PSAtMSkge1xuICAgICAgc3RhdGVFbnRyeS50eXBpbmcgPSBbXG4gICAgICAgIC4uLnN0YXRlRW50cnkudHlwaW5nLnNsaWNlKDAsIHR5cGluZ0luZGV4KSxcbiAgICAgICAgLi4uc3RhdGVFbnRyeS50eXBpbmcuc2xpY2UodHlwaW5nSW5kZXggKyAxKSxcbiAgICAgIF07XG4gICAgfVxuICAgIGNvbnN0IHBhdXNlZEluZGV4ID0gc3RhdGVFbnRyeS5wYXVzZWQuaW5kZXhPZih1c2VySWQpO1xuICAgIGlmIChuZXdTdGF0ZSAhPT0gUEFVU0VEICYmIHBhdXNlZEluZGV4ICE9PSAtMSkge1xuICAgICAgc3RhdGVFbnRyeS5wYXVzZWQgPSBbXG4gICAgICAgIC4uLnN0YXRlRW50cnkucGF1c2VkLnNsaWNlKDAsIHBhdXNlZEluZGV4KSxcbiAgICAgICAgLi4uc3RhdGVFbnRyeS5wYXVzZWQuc2xpY2UocGF1c2VkSW5kZXggKyAxKSxcbiAgICAgIF07XG4gICAgfVxuXG5cbiAgICBpZiAobmV3U3RhdGUgPT09IFNUQVJURUQgJiYgdHlwaW5nSW5kZXggPT09IC0xKSB7XG4gICAgICBzdGF0ZUVudHJ5LnR5cGluZyA9IFsuLi5zdGF0ZUVudHJ5LnR5cGluZywgdXNlcklkXTtcbiAgICB9IGVsc2UgaWYgKG5ld1N0YXRlID09PSBQQVVTRUQgJiYgcGF1c2VkSW5kZXggPT09IC0xKSB7XG4gICAgICBzdGF0ZUVudHJ5LnBhdXNlZCA9IFsuLi5zdGF0ZUVudHJ5LnBhdXNlZCwgdXNlcklkXTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQW55IHRpbWUgYSBzdGF0ZSBjaGFuZ2UgYmVjb21lcyBtb3JlIHRoYW4gNiBzZWNvbmRzIHN0YWxlLFxuICAgKiBhc3N1bWUgdGhhdCB0aGUgdXNlciBpcyAnZmluaXNoZWQnLlxuICAgKlxuICAgKiBJbiB0aGVvcnksIHdlIHNob3VsZFxuICAgKiByZWNlaXZlIGEgbmV3IGV2ZW50IGV2ZXJ5IDIuNSBzZWNvbmRzLiAgSWYgdGhlIGN1cnJlbnQgdXNlclxuICAgKiBoYXMgZ29uZSBvZmZsaW5lLCBsYWNrIG9mIHRoaXMgY29kZSB3b3VsZCBjYXVzZSB0aGUgcGVvcGxlXG4gICAqIGN1cnJlbnRseSBmbGFnZ2VkIGFzIHR5cGluZyBhcyBzdGlsbCB0eXBpbmcgaG91cnMgZnJvbSBub3cuXG4gICAqXG4gICAqIEZvciB0aGlzIGZpcnN0IHBhc3MsIHdlIGp1c3QgbWFyayB0aGUgdXNlciBhcyAnZmluaXNoZWQnXG4gICAqIGJ1dCBhIGZ1dHVyZSBwYXNzIG1heSBtb3ZlIGZyb20gJ3N0YXJ0ZWQnIHRvICdwYXVzZWQnXG4gICAqIGFuZCAncGF1c2VkIHRvICdmaW5pc2hlZCdcbiAgICpcbiAgICogQG1ldGhvZCBfc3RhcnRQb2xsaW5nXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc3RhcnRQb2xsaW5nKCkge1xuICAgIGlmICh0aGlzLl9wb2xsSWQpIHJldHVybjtcbiAgICB0aGlzLl9wb2xsSWQgPSBzZXRJbnRlcnZhbCgoKSA9PiB0aGlzLl9wb2xsKCksIDUwMDApO1xuICB9XG5cbiAgX3BvbGwoKSB7XG4gICAgY29uc3QgY29udmVyc2F0aW9uSWRzID0gT2JqZWN0LmtleXModGhpcy5zdGF0ZSk7XG5cbiAgICBjb252ZXJzYXRpb25JZHMuZm9yRWFjaChpZCA9PiB7XG4gICAgICBjb25zdCBzdGF0ZSA9IHRoaXMuc3RhdGVbaWRdO1xuICAgICAgT2JqZWN0LmtleXModGhpcy5zdGF0ZVtpZF0udXNlcnMpXG4gICAgICAgIC5mb3JFYWNoKCh1c2VySWQpID0+IHtcbiAgICAgICAgICBpZiAoRGF0ZS5ub3coKSA+PSBzdGF0ZS51c2Vyc1t1c2VySWRdLnN0YXJ0VGltZSArIDYwMDApIHtcbiAgICAgICAgICAgIHRoaXMuX3VwZGF0ZVN0YXRlKHN0YXRlLCBGSU5JU0hFRCwgdXNlcklkKTtcbiAgICAgICAgICAgIGRlbGV0ZSBzdGF0ZS51c2Vyc1t1c2VySWRdO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCd0eXBpbmctaW5kaWNhdG9yLWNoYW5nZScsIHtcbiAgICAgICAgICAgICAgY29udmVyc2F0aW9uSWQ6IGlkLFxuICAgICAgICAgICAgICB0eXBpbmc6IHN0YXRlLnR5cGluZyxcbiAgICAgICAgICAgICAgcGF1c2VkOiBzdGF0ZS5wYXVzZWQsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgQ2xpZW50IGFzc29jaWF0ZWQgd2l0aCB0aGlzIGNsYXNzLiAgVXNlcyB0aGUgY2xpZW50SWRcbiAgICogcHJvcGVydHkuXG4gICAqXG4gICAqIEBtZXRob2QgX2dldENsaWVudFxuICAgKiBAcHJvdGVjdGVkXG4gICAqIEByZXR1cm4ge2xheWVyLkNsaWVudH1cbiAgICovXG4gIF9nZXRDbGllbnQoKSB7XG4gICAgcmV0dXJuIENsaWVudFJlZ2lzdHJ5LmdldCh0aGlzLmNsaWVudElkKTtcbiAgfVxufVxuXG4vKipcbiAqIHNldFRpbWVvdXQgSUQgZm9yIHBvbGxpbmcgZm9yIHN0YXRlcyB0byB0cmFuc2l0aW9uXG4gKiBAdHlwZSB7TnVtYmVyfVxuICogQHByaXZhdGVcbiAqL1xuVHlwaW5nSW5kaWNhdG9yTGlzdGVuZXIucHJvdG90eXBlLl9wb2xsSWQgPSAwO1xuXG4vKipcbiAqIElEIG9mIHRoZSBjbGllbnQgdGhpcyBpbnN0YW5jZSBpcyBhc3NvY2lhdGVkIHdpdGhcbiAqIEB0eXBlIHtTdHJpbmd9XG4gKi9cblR5cGluZ0luZGljYXRvckxpc3RlbmVyLnByb3RvdHlwZS5jbGllbnRJZCA9ICcnO1xuXG5UeXBpbmdJbmRpY2F0b3JMaXN0ZW5lci5idWJibGVFdmVudFBhcmVudCA9ICdfZ2V0Q2xpZW50JztcblxuXG5UeXBpbmdJbmRpY2F0b3JMaXN0ZW5lci5fc3VwcG9ydGVkRXZlbnRzID0gW1xuICAvKipcbiAgICogVGhlcmUgaGFzIGJlZW4gYSBjaGFuZ2UgaW4gdHlwaW5nIGluZGljYXRvciBzdGF0ZSBvZiBvdGhlciB1c2Vycy5cbiAgICogQGV2ZW50IGNoYW5nZVxuICAgKiBAcGFyYW0ge2xheWVyLkxheWVyRXZlbnR9IGV2dFxuICAgKiBAcGFyYW0ge3N0cmluZ1tdfSBldnQudHlwaW5nIC0gQXJyYXkgb2YgdXNlcklkcyBvZiBwZW9wbGUgd2hvIGFyZSB0eXBpbmdcbiAgICogQHBhcmFtIHtzdHJpbmdbXX0gZXZ0LnBhdXNlZCAtIEFycmF5IG9mIHVzZXJJZHMgb2YgcGVvcGxlIHdobyBhcmUgcGF1c2VkXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBldnQuY29udmVyc2F0aW9uSWQgLSBJRCBvZiB0aGUgQ29udmVyYXRpb24gdGhhdCBoYXMgY2hhbmdlZCB0eXBpbmcgaW5kaWNhdG9yIHN0YXRlXG4gICAqL1xuICAndHlwaW5nLWluZGljYXRvci1jaGFuZ2UnLFxuXS5jb25jYXQoUm9vdC5fc3VwcG9ydGVkRXZlbnRzKTtcblxuUm9vdC5pbml0Q2xhc3MuYXBwbHkoVHlwaW5nSW5kaWNhdG9yTGlzdGVuZXIsIFtUeXBpbmdJbmRpY2F0b3JMaXN0ZW5lciwgJ1R5cGluZ0luZGljYXRvckxpc3RlbmVyJ10pO1xubW9kdWxlLmV4cG9ydHMgPSBUeXBpbmdJbmRpY2F0b3JMaXN0ZW5lcjtcbiJdfQ==
