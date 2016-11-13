/**
 * Layer does not at this time have a concept of Users, so this class
 * is more of a convenience/utility than required use.
 *
 * The main conveniences provided by this class are that when
 * used in conjunction with the `client.users`  array,
 * and the `client.addUser(user)` method, each instance
 * will look for/monitor for Conversations that are direct
 * messages between the currently authenticated user and
 * the user represented by this User instance.
 *
 * This is useful if listing users and want to show their last
 * message or their unread message count.
 *
 *      client.addUser(new layer.User({
 *          displayName: 'Fred',
 *          id: 'fred1234',
 *          data: {
 *              a: 'a',
 *              b: 'b',
 *              lastName: 'Huh?'
 *          }
 *      }));
 *
 * The id will be what is used to find matching Conversations.
 *
 * displayName is not required, but is a convenient place
 * to store a displayable name.
 *
 * The data property contains an arbitrary javascript object
 * with any relevant details of your user.
 *
 * TODO: Replace client with clientId
 *
 * @class  layer.User
 * @extends layer.Root
 * @private // Make this public when Identities is released
 */
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Root = require("./root");
var Util = require("./client-utils");

var User = function (_Root) {
    _inherits(User, _Root);

    function User(options) {
        _classCallCheck(this, User);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(User).call(this, options));

        _this.on("all", _this._clearObject, _this);
        return _this;
    }

    /**
     * Sets the Client property.
     *
     * This is called as a side-effect of `client.addUser(user)`
     *
     * If you directly manipulate `client.users`, instead of calling
     * addUser(), you may need to call this method and set the client property.
     *
     * @method setClient
     * @param  {layer.Client} client
     */


    _createClass(User, [{
        key: "setClient",
        value: function setClient(client) {
            if (client) {
                var conversations = Object.keys(client._conversationsHash).map(function (id) {
                    return client.getConversation(id);
                }).filter(function (c) {
                    return c.participants.length == 2 && c.participants.indexOf(this.id) != -1;
                }, this);

                Util.sortBy(conversations, function (conversation) {
                    return conversation.lastMessage ? conversation.lastMessage.sentAt : null;
                }, true);
                if (conversations.length) {
                    this.conversation = conversations[0];
                } else {
                    client.on("conversations:add", this._checkNewConversation, this);
                }
            }
        }

        /**
         * Searches all new Conversations for matching Conversation.
         *
         * A matching Conversation is a direct message conversation
         * between this user and the client's authenticated user.
         *
         * If its a match, updates this.conversation and stops
         * listening for new Conversations.
         *
         * @method _checkNewConversation
         * @private
         * @param  {layer.LayerEvent} evt
         */

    }, {
        key: "_checkNewConversation",
        value: function _checkNewConversation(evt) {
            var _this2 = this;

            var conversations = evt.conversations;
            conversations.forEach(function (conversation) {
                if (conversation.participants.length == 2 && conversation.participants.indexOf(_this2.id) != -1) {
                    _this2.conversation = conversation;
                    conversation.client.off(null, null, _this2);
                }
            });
        }

        /**
         * Handles new values for the Conversation property.
         *
         * Any time a new Conversation is assigned to this property,
         * subscribe to its "destroy" event and trigger a "conversations:change"
         * event on this user.
         *
         * @method __updateConversation
         * @private
         * @param  {layer.Conversation} conversation
         * @param  {layer.Conversation} oldConversation
         */

    }, {
        key: "__updateConversation",
        value: function __updateConversation(conversation, oldConversation) {
            if (oldConversation) oldConversation.off(null, null, this);
            if (conversation) conversation.on("destroy", this._destroyConversation, this);
            this.trigger("conversations:change");
        }

        /**
         * If the Conversation is destroyed, this user has no Conversation.
         *
         * @method _destroyConversation
         * @private
         * @param  {layer.LayerEvent} evt
         */

    }, {
        key: "_destroyConversation",
        value: function _destroyConversation(evt) {
            this.conversation = null;
        }
    }, {
        key: "toObject",
        value: function toObject() {
            if (!this._toObject) {
                this._toObject = _get(Object.getPrototypeOf(User.prototype), "toObject", this).call(this);
            }
            return this._toObject;
        }
    }, {
        key: "_clearObject",
        value: function _clearObject() {
            delete this._toObject;
        }
    }]);

    return User;
}(Root);

/**
 * Custom user data.
 *
 * This property has no built-in meaning; but is intended to let you store a custom data.
 * Initialize this via constructor:
 *
 *         new layer.User({
 *             data: {
 *                 age: 109,
 *                 nickName: "Freddy"
 *             },
 *             id: "fred"
 *         });
 *
 * @type {Object}
 */


User.prototype.data = null;

/**
 * Your User ID.
 *
 * This ID should match up with the IDs used in participants in Conversations;
 * such IDs are based on your own user IDs which are passed to the Layer services via Identity Tokens.
 * @type {String}
 */
User.prototype.id = "";

/**
 * Your user's displayable name.
 *
 * This property has no built-in meaning; but is intended to let you store a custom string
 * for how to render this user.  Initialize this via constructor:
 *
 *         new layer.User({
 *             displayName: "Freddy",
 *             id: "fred"
 *         });
 *
 * @type {String}
 */
User.prototype.displayName = "";

/**
 * CSS Class for user icon.
 *
 * This property has no built-in meaning; use this if your rendering engine needs this;
 * just pass it into the constructor;
 *
 *         new layer.User({
 *             iconClass: "unknown-face",
 *             id: "fred"
 *         });
 *
 * @type {String}
 */
User.prototype.iconClass = "";

/**
 * The User's Conversation.
 *
 * This property is managed by the user class and is set to always point to any matching Direct
 * Message conversation between this user and the currently authenticated user.  Useful
 * for rendering in a User List and showing unread counts, last message, etc...
 * Can also be used when selecting the user to quickly resume a Conversation.
 * @type {layer.Conversation}
 */
User.prototype.conversation = null;
User.prototype._toObject = null;

User._supportedEvents = ["conversations:change"].concat(Root._supportedEvents);
Root.initClass.apply(User, [User, "User"]);

module.exports = User;
//# sourceMappingURL=data:application/json;base64,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QWUsRUFBZixHQUFvQixFQUFwQjs7Ozs7Ozs7Ozs7Ozs7O0FBZUEsS0FBSyxTQUFMLENBQWUsV0FBZixHQUE2QixFQUE3Qjs7Ozs7Ozs7Ozs7Ozs7O0FBZUEsS0FBSyxTQUFMLENBQWUsU0FBZixHQUEyQixFQUEzQjs7Ozs7Ozs7Ozs7QUFXQSxLQUFLLFNBQUwsQ0FBZSxZQUFmLEdBQThCLElBQTlCO0FBQ0EsS0FBSyxTQUFMLENBQWUsU0FBZixHQUEyQixJQUEzQjs7QUFFQSxLQUFLLGdCQUFMLEdBQXdCLENBQUMsc0JBQUQsRUFBeUIsTUFBekIsQ0FBZ0MsS0FBSyxnQkFBTCxDQUF4RDtBQUNBLEtBQUssU0FBTCxDQUFlLEtBQWYsQ0FBcUIsSUFBckIsRUFBMkIsQ0FBQyxJQUFELEVBQU8sTUFBUCxDQUEzQjs7QUFFQSxPQUFPLE9BQVAsR0FBaUIsSUFBakIiLCJmaWxlIjoidXNlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogTGF5ZXIgZG9lcyBub3QgYXQgdGhpcyB0aW1lIGhhdmUgYSBjb25jZXB0IG9mIFVzZXJzLCBzbyB0aGlzIGNsYXNzXG4gKiBpcyBtb3JlIG9mIGEgY29udmVuaWVuY2UvdXRpbGl0eSB0aGFuIHJlcXVpcmVkIHVzZS5cbiAqXG4gKiBUaGUgbWFpbiBjb252ZW5pZW5jZXMgcHJvdmlkZWQgYnkgdGhpcyBjbGFzcyBhcmUgdGhhdCB3aGVuXG4gKiB1c2VkIGluIGNvbmp1bmN0aW9uIHdpdGggdGhlIGBjbGllbnQudXNlcnNgICBhcnJheSxcbiAqIGFuZCB0aGUgYGNsaWVudC5hZGRVc2VyKHVzZXIpYCBtZXRob2QsIGVhY2ggaW5zdGFuY2VcbiAqIHdpbGwgbG9vayBmb3IvbW9uaXRvciBmb3IgQ29udmVyc2F0aW9ucyB0aGF0IGFyZSBkaXJlY3RcbiAqIG1lc3NhZ2VzIGJldHdlZW4gdGhlIGN1cnJlbnRseSBhdXRoZW50aWNhdGVkIHVzZXIgYW5kXG4gKiB0aGUgdXNlciByZXByZXNlbnRlZCBieSB0aGlzIFVzZXIgaW5zdGFuY2UuXG4gKlxuICogVGhpcyBpcyB1c2VmdWwgaWYgbGlzdGluZyB1c2VycyBhbmQgd2FudCB0byBzaG93IHRoZWlyIGxhc3RcbiAqIG1lc3NhZ2Ugb3IgdGhlaXIgdW5yZWFkIG1lc3NhZ2UgY291bnQuXG4gKlxuICogICAgICBjbGllbnQuYWRkVXNlcihuZXcgbGF5ZXIuVXNlcih7XG4gKiAgICAgICAgICBkaXNwbGF5TmFtZTogJ0ZyZWQnLFxuICogICAgICAgICAgaWQ6ICdmcmVkMTIzNCcsXG4gKiAgICAgICAgICBkYXRhOiB7XG4gKiAgICAgICAgICAgICAgYTogJ2EnLFxuICogICAgICAgICAgICAgIGI6ICdiJyxcbiAqICAgICAgICAgICAgICBsYXN0TmFtZTogJ0h1aD8nXG4gKiAgICAgICAgICB9XG4gKiAgICAgIH0pKTtcbiAqXG4gKiBUaGUgaWQgd2lsbCBiZSB3aGF0IGlzIHVzZWQgdG8gZmluZCBtYXRjaGluZyBDb252ZXJzYXRpb25zLlxuICpcbiAqIGRpc3BsYXlOYW1lIGlzIG5vdCByZXF1aXJlZCwgYnV0IGlzIGEgY29udmVuaWVudCBwbGFjZVxuICogdG8gc3RvcmUgYSBkaXNwbGF5YWJsZSBuYW1lLlxuICpcbiAqIFRoZSBkYXRhIHByb3BlcnR5IGNvbnRhaW5zIGFuIGFyYml0cmFyeSBqYXZhc2NyaXB0IG9iamVjdFxuICogd2l0aCBhbnkgcmVsZXZhbnQgZGV0YWlscyBvZiB5b3VyIHVzZXIuXG4gKlxuICogVE9ETzogUmVwbGFjZSBjbGllbnQgd2l0aCBjbGllbnRJZFxuICpcbiAqIEBjbGFzcyAgbGF5ZXIuVXNlclxuICogQGV4dGVuZHMgbGF5ZXIuUm9vdFxuICogQHByaXZhdGUgLy8gTWFrZSB0aGlzIHB1YmxpYyB3aGVuIElkZW50aXRpZXMgaXMgcmVsZWFzZWRcbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgUm9vdCA9IHJlcXVpcmUoXCIuL3Jvb3RcIik7XG52YXIgVXRpbCA9IHJlcXVpcmUoXCIuL2NsaWVudC11dGlsc1wiKTtcbmNsYXNzIFVzZXIgZXh0ZW5kcyBSb290IHtcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xuICAgICAgICB0aGlzLm9uKFwiYWxsXCIsIHRoaXMuX2NsZWFyT2JqZWN0LCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBDbGllbnQgcHJvcGVydHkuXG4gICAgICpcbiAgICAgKiBUaGlzIGlzIGNhbGxlZCBhcyBhIHNpZGUtZWZmZWN0IG9mIGBjbGllbnQuYWRkVXNlcih1c2VyKWBcbiAgICAgKlxuICAgICAqIElmIHlvdSBkaXJlY3RseSBtYW5pcHVsYXRlIGBjbGllbnQudXNlcnNgLCBpbnN0ZWFkIG9mIGNhbGxpbmdcbiAgICAgKiBhZGRVc2VyKCksIHlvdSBtYXkgbmVlZCB0byBjYWxsIHRoaXMgbWV0aG9kIGFuZCBzZXQgdGhlIGNsaWVudCBwcm9wZXJ0eS5cbiAgICAgKlxuICAgICAqIEBtZXRob2Qgc2V0Q2xpZW50XG4gICAgICogQHBhcmFtICB7bGF5ZXIuQ2xpZW50fSBjbGllbnRcbiAgICAgKi9cbiAgICBzZXRDbGllbnQoY2xpZW50KSB7XG4gICAgICAgIGlmIChjbGllbnQpIHtcbiAgICAgICAgICAgIHZhciBjb252ZXJzYXRpb25zID0gT2JqZWN0LmtleXMoY2xpZW50Ll9jb252ZXJzYXRpb25zSGFzaCkubWFwKGlkID0+IGNsaWVudC5nZXRDb252ZXJzYXRpb24oaWQpKVxuICAgICAgICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24oYykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYy5wYXJ0aWNpcGFudHMubGVuZ3RoID09IDIgJiYgYy5wYXJ0aWNpcGFudHMuaW5kZXhPZih0aGlzLmlkKSAhPSAtMTtcbiAgICAgICAgICAgICAgICB9LCB0aGlzKTtcblxuICAgICAgICAgICAgVXRpbC5zb3J0QnkoY29udmVyc2F0aW9ucywgZnVuY3Rpb24oY29udmVyc2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnZlcnNhdGlvbi5sYXN0TWVzc2FnZSA/IGNvbnZlcnNhdGlvbi5sYXN0TWVzc2FnZS5zZW50QXQgOiBudWxsO1xuICAgICAgICAgICAgfSwgdHJ1ZSk7XG4gICAgICAgICAgICBpZiAoY29udmVyc2F0aW9ucy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnZlcnNhdGlvbiA9IGNvbnZlcnNhdGlvbnNbMF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNsaWVudC5vbihcImNvbnZlcnNhdGlvbnM6YWRkXCIsIHRoaXMuX2NoZWNrTmV3Q29udmVyc2F0aW9uLCB0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNlYXJjaGVzIGFsbCBuZXcgQ29udmVyc2F0aW9ucyBmb3IgbWF0Y2hpbmcgQ29udmVyc2F0aW9uLlxuICAgICAqXG4gICAgICogQSBtYXRjaGluZyBDb252ZXJzYXRpb24gaXMgYSBkaXJlY3QgbWVzc2FnZSBjb252ZXJzYXRpb25cbiAgICAgKiBiZXR3ZWVuIHRoaXMgdXNlciBhbmQgdGhlIGNsaWVudCdzIGF1dGhlbnRpY2F0ZWQgdXNlci5cbiAgICAgKlxuICAgICAqIElmIGl0cyBhIG1hdGNoLCB1cGRhdGVzIHRoaXMuY29udmVyc2F0aW9uIGFuZCBzdG9wc1xuICAgICAqIGxpc3RlbmluZyBmb3IgbmV3IENvbnZlcnNhdGlvbnMuXG4gICAgICpcbiAgICAgKiBAbWV0aG9kIF9jaGVja05ld0NvbnZlcnNhdGlvblxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtICB7bGF5ZXIuTGF5ZXJFdmVudH0gZXZ0XG4gICAgICovXG4gICAgX2NoZWNrTmV3Q29udmVyc2F0aW9uKGV2dCkge1xuICAgICAgICB2YXIgY29udmVyc2F0aW9ucyA9IGV2dC5jb252ZXJzYXRpb25zO1xuICAgICAgICBjb252ZXJzYXRpb25zLmZvckVhY2goY29udmVyc2F0aW9uID0+IHtcbiAgICAgICAgICAgIGlmIChjb252ZXJzYXRpb24ucGFydGljaXBhbnRzLmxlbmd0aCA9PSAyICYmIGNvbnZlcnNhdGlvbi5wYXJ0aWNpcGFudHMuaW5kZXhPZih0aGlzLmlkKSAhPSAtMSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY29udmVyc2F0aW9uID0gY29udmVyc2F0aW9uO1xuICAgICAgICAgICAgICAgIGNvbnZlcnNhdGlvbi5jbGllbnQub2ZmKG51bGwsIG51bGwsIHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIG5ldyB2YWx1ZXMgZm9yIHRoZSBDb252ZXJzYXRpb24gcHJvcGVydHkuXG4gICAgICpcbiAgICAgKiBBbnkgdGltZSBhIG5ldyBDb252ZXJzYXRpb24gaXMgYXNzaWduZWQgdG8gdGhpcyBwcm9wZXJ0eSxcbiAgICAgKiBzdWJzY3JpYmUgdG8gaXRzIFwiZGVzdHJveVwiIGV2ZW50IGFuZCB0cmlnZ2VyIGEgXCJjb252ZXJzYXRpb25zOmNoYW5nZVwiXG4gICAgICogZXZlbnQgb24gdGhpcyB1c2VyLlxuICAgICAqXG4gICAgICogQG1ldGhvZCBfX3VwZGF0ZUNvbnZlcnNhdGlvblxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtICB7bGF5ZXIuQ29udmVyc2F0aW9ufSBjb252ZXJzYXRpb25cbiAgICAgKiBAcGFyYW0gIHtsYXllci5Db252ZXJzYXRpb259IG9sZENvbnZlcnNhdGlvblxuICAgICAqL1xuICAgIF9fdXBkYXRlQ29udmVyc2F0aW9uKGNvbnZlcnNhdGlvbiwgb2xkQ29udmVyc2F0aW9uKSB7XG4gICAgICAgIGlmIChvbGRDb252ZXJzYXRpb24pIG9sZENvbnZlcnNhdGlvbi5vZmYobnVsbCwgbnVsbCwgdGhpcyk7XG4gICAgICAgIGlmIChjb252ZXJzYXRpb24pIGNvbnZlcnNhdGlvbi5vbihcImRlc3Ryb3lcIiwgdGhpcy5fZGVzdHJveUNvbnZlcnNhdGlvbiwgdGhpcyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcihcImNvbnZlcnNhdGlvbnM6Y2hhbmdlXCIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIElmIHRoZSBDb252ZXJzYXRpb24gaXMgZGVzdHJveWVkLCB0aGlzIHVzZXIgaGFzIG5vIENvbnZlcnNhdGlvbi5cbiAgICAgKlxuICAgICAqIEBtZXRob2QgX2Rlc3Ryb3lDb252ZXJzYXRpb25cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSAge2xheWVyLkxheWVyRXZlbnR9IGV2dFxuICAgICAqL1xuICAgIF9kZXN0cm95Q29udmVyc2F0aW9uKGV2dCkge1xuICAgICAgICB0aGlzLmNvbnZlcnNhdGlvbiA9IG51bGw7XG4gICAgfVxuXG4gICAgdG9PYmplY3QoKSB7XG4gICAgICAgIGlmICghdGhpcy5fdG9PYmplY3QpIHtcbiAgICAgICAgICAgIHRoaXMuX3RvT2JqZWN0ID0gc3VwZXIudG9PYmplY3QoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fdG9PYmplY3Q7XG4gICAgfVxuXG4gICAgX2NsZWFyT2JqZWN0KCkgeyBkZWxldGUgdGhpcy5fdG9PYmplY3Q7fVxufVxuXG4vKipcbiAqIEN1c3RvbSB1c2VyIGRhdGEuXG4gKlxuICogVGhpcyBwcm9wZXJ0eSBoYXMgbm8gYnVpbHQtaW4gbWVhbmluZzsgYnV0IGlzIGludGVuZGVkIHRvIGxldCB5b3Ugc3RvcmUgYSBjdXN0b20gZGF0YS5cbiAqIEluaXRpYWxpemUgdGhpcyB2aWEgY29uc3RydWN0b3I6XG4gKlxuICogICAgICAgICBuZXcgbGF5ZXIuVXNlcih7XG4gKiAgICAgICAgICAgICBkYXRhOiB7XG4gKiAgICAgICAgICAgICAgICAgYWdlOiAxMDksXG4gKiAgICAgICAgICAgICAgICAgbmlja05hbWU6IFwiRnJlZGR5XCJcbiAqICAgICAgICAgICAgIH0sXG4gKiAgICAgICAgICAgICBpZDogXCJmcmVkXCJcbiAqICAgICAgICAgfSk7XG4gKlxuICogQHR5cGUge09iamVjdH1cbiAqL1xuVXNlci5wcm90b3R5cGUuZGF0YSA9IG51bGw7XG5cbi8qKlxuICogWW91ciBVc2VyIElELlxuICpcbiAqIFRoaXMgSUQgc2hvdWxkIG1hdGNoIHVwIHdpdGggdGhlIElEcyB1c2VkIGluIHBhcnRpY2lwYW50cyBpbiBDb252ZXJzYXRpb25zO1xuICogc3VjaCBJRHMgYXJlIGJhc2VkIG9uIHlvdXIgb3duIHVzZXIgSURzIHdoaWNoIGFyZSBwYXNzZWQgdG8gdGhlIExheWVyIHNlcnZpY2VzIHZpYSBJZGVudGl0eSBUb2tlbnMuXG4gKiBAdHlwZSB7U3RyaW5nfVxuICovXG5Vc2VyLnByb3RvdHlwZS5pZCA9IFwiXCI7XG5cbi8qKlxuICogWW91ciB1c2VyJ3MgZGlzcGxheWFibGUgbmFtZS5cbiAqXG4gKiBUaGlzIHByb3BlcnR5IGhhcyBubyBidWlsdC1pbiBtZWFuaW5nOyBidXQgaXMgaW50ZW5kZWQgdG8gbGV0IHlvdSBzdG9yZSBhIGN1c3RvbSBzdHJpbmdcbiAqIGZvciBob3cgdG8gcmVuZGVyIHRoaXMgdXNlci4gIEluaXRpYWxpemUgdGhpcyB2aWEgY29uc3RydWN0b3I6XG4gKlxuICogICAgICAgICBuZXcgbGF5ZXIuVXNlcih7XG4gKiAgICAgICAgICAgICBkaXNwbGF5TmFtZTogXCJGcmVkZHlcIixcbiAqICAgICAgICAgICAgIGlkOiBcImZyZWRcIlxuICogICAgICAgICB9KTtcbiAqXG4gKiBAdHlwZSB7U3RyaW5nfVxuICovXG5Vc2VyLnByb3RvdHlwZS5kaXNwbGF5TmFtZSA9IFwiXCI7XG5cbi8qKlxuICogQ1NTIENsYXNzIGZvciB1c2VyIGljb24uXG4gKlxuICogVGhpcyBwcm9wZXJ0eSBoYXMgbm8gYnVpbHQtaW4gbWVhbmluZzsgdXNlIHRoaXMgaWYgeW91ciByZW5kZXJpbmcgZW5naW5lIG5lZWRzIHRoaXM7XG4gKiBqdXN0IHBhc3MgaXQgaW50byB0aGUgY29uc3RydWN0b3I7XG4gKlxuICogICAgICAgICBuZXcgbGF5ZXIuVXNlcih7XG4gKiAgICAgICAgICAgICBpY29uQ2xhc3M6IFwidW5rbm93bi1mYWNlXCIsXG4gKiAgICAgICAgICAgICBpZDogXCJmcmVkXCJcbiAqICAgICAgICAgfSk7XG4gKlxuICogQHR5cGUge1N0cmluZ31cbiAqL1xuVXNlci5wcm90b3R5cGUuaWNvbkNsYXNzID0gXCJcIjtcblxuLyoqXG4gKiBUaGUgVXNlcidzIENvbnZlcnNhdGlvbi5cbiAqXG4gKiBUaGlzIHByb3BlcnR5IGlzIG1hbmFnZWQgYnkgdGhlIHVzZXIgY2xhc3MgYW5kIGlzIHNldCB0byBhbHdheXMgcG9pbnQgdG8gYW55IG1hdGNoaW5nIERpcmVjdFxuICogTWVzc2FnZSBjb252ZXJzYXRpb24gYmV0d2VlbiB0aGlzIHVzZXIgYW5kIHRoZSBjdXJyZW50bHkgYXV0aGVudGljYXRlZCB1c2VyLiAgVXNlZnVsXG4gKiBmb3IgcmVuZGVyaW5nIGluIGEgVXNlciBMaXN0IGFuZCBzaG93aW5nIHVucmVhZCBjb3VudHMsIGxhc3QgbWVzc2FnZSwgZXRjLi4uXG4gKiBDYW4gYWxzbyBiZSB1c2VkIHdoZW4gc2VsZWN0aW5nIHRoZSB1c2VyIHRvIHF1aWNrbHkgcmVzdW1lIGEgQ29udmVyc2F0aW9uLlxuICogQHR5cGUge2xheWVyLkNvbnZlcnNhdGlvbn1cbiAqL1xuVXNlci5wcm90b3R5cGUuY29udmVyc2F0aW9uID0gbnVsbDtcblVzZXIucHJvdG90eXBlLl90b09iamVjdCA9IG51bGw7XG5cblVzZXIuX3N1cHBvcnRlZEV2ZW50cyA9IFtcImNvbnZlcnNhdGlvbnM6Y2hhbmdlXCJdLmNvbmNhdChSb290Ll9zdXBwb3J0ZWRFdmVudHMpO1xuUm9vdC5pbml0Q2xhc3MuYXBwbHkoVXNlciwgW1VzZXIsIFwiVXNlclwiXSk7XG5cbm1vZHVsZS5leHBvcnRzID0gVXNlcjtcbiJdfQ==
