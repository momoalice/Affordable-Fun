'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Utils = require('./client-utils');
var LayerEvent = require('./layer-event');
var LayerError = require('./layer-error');
var Events = require('backbone-events-standalone/backbone-events-standalone');
var Logger = require('./logger');

/*
 * Provides a system bus that can be accessed by all components of the system.
 * Currently used to listen to messages sent via postMessage, but envisioned to
 * do far more.
 */
function EventClass() {}
EventClass.prototype = Events;

var SystemBus = new EventClass();
if (typeof postMessage === 'function') {
  addEventListener('message', function (event) {
    if (event.data.type === 'layer-delayed-event') {
      SystemBus.trigger(event.data.internalId + '-delayed-event');
    }
  });
}

// Used to generate a unique internalId for every Root instance
var uniqueIds = {};

// Regex for splitting an event string such as obj.on('evtName1 evtName2 evtName3')
var eventSplitter = /\s+/;

/**
 * The root class of all layer objects. Provides the following utilities
 *
 * 1. Mixes in the Backbone event model
 *
 *        var person = new Person();
 *        person.on('destroy', function() {
 *            console.log('I have been destroyed!');
 *        });
 *
 *        // Fire the console log handler:
 *        person.trigger('destroy');
 *
 *        // Unsubscribe
 *        person.off('destroy');
 *
 * 2. Adds a subscriptions object so that any event handlers on an object can be quickly found and removed
 *
 *        var person1 = new Person();
 *        var person2 = new Person();
 *        person2.on('destroy', function() {
 *            console.log('I have been destroyed!');
 *        }, person1);
 *
 *        // Pointers to person1 held onto by person2 are removed
 *        person1.destroy();
 *
 * 3. Adds support for event listeners in the constructor
 *    Any event handler can be passed into the constructor
 *    just as though it were a property.
 *
 *        var person = new Person({
 *            age: 150,
 *            destroy: function() {
 *                console.log('I have been destroyed!');
 *            }
 *        });
 *
 * 4. A _disableEvents property
 *
 *        myMethod() {
 *          if (this.isInitializing) {
 *              this._disableEvents = true;
 *
 *              // Event only received if _disableEvents = false
 *              this.trigger('destroy');
 *              this._disableEvents = false;
 *          }
 *        }
 *
 * 5. A _supportedEvents static property for each class
 *
 *     This property defines which events can be triggered.
 *
 *     * Any attempt to trigger
 *       an event not in _supportedEvents will log an error.
 *     * Any attempt to register a listener for an event not in _supportedEvents will
 *     *throw* an error.
 *
 *     This allows us to insure developers only subscribe to valid events.
 *
 *     This allows us to control what events can be fired and which ones blocked.
 *
 * 6. Adds an internalId property
 *
 *        var person = new Person();
 *        console.log(person.internalId); // -> 'Person1'
 *
 * 7. Adds a toObject method to create a simplified Plain Old Javacript Object from your object
 *
 *        var person = new Person();
 *        var simplePerson = person.toObject();
 *
 * 8. Provides __adjustProperty method support
 *
 *     For any property of a class, an `__adjustProperty` method can be defined.  If its defined,
 *     it will be called prior to setting that property, allowing:
 *
 *     A. Modification of the value that is actually set
 *     B. Validation of the value; throwing errors if invalid.
 *
 * 9. Provides __udpateProperty method support
 *
 *     After setting any property for which there is an `__updateProperty` method defined,
 *     the method will be called, allowing the new property to be applied.
 *
 *     Typically used for
 *
 *     A. Triggering events
 *     B. Firing XHR requests
 *     C. Updating the UI to match the new property value
 *
 *
 * @class layer.Root
 * @abstract
 * @author Michael Kantor
 */

var Root = function (_EventClass) {
  _inherits(Root, _EventClass);

  /**
   * Superclass constructor handles copying in properties and registering event handlers.
   *
   * @method constructor
   * @param  {Object} options - a hash of properties and event handlers
   * @return {layer.Root}
   */

  function Root() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Root);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Root).call(this));

    _this._subscriptions = [];
    _this._delayedTriggers = [];
    _this._lastDelayedTrigger = Date.now();
    _this._events = {};

    // Generate an internalId
    var name = _this.constructor.name;
    if (!uniqueIds[name]) uniqueIds[name] = 0;
    _this.internalId = name + uniqueIds[name]++;

    // Every component listens to the SystemBus for postMessage (triggerAsync) events
    SystemBus.on(_this.internalId + '-delayed-event', _this._processDelayedTriggers, _this);

    // Generate a temporary id if there isn't an id
    if (!_this.id && !options.id && _this.constructor.prefixUUID) {
      _this.id = 'temp_' + _this.constructor.prefixUUID + Utils.generateUUID();
    }

    // Copy in all properties; setup all event handlers
    var key = undefined;
    for (key in options) {
      if (_this.constructor._supportedEvents.indexOf(key) !== -1) {
        _this.on(key, options[key]);
      } else if (key in _this && typeof _this[key] !== 'function') {
        _this[key] = options[key];
      }
    }
    _this.isInitializing = false;
    return _this;
  }

  /**
   * Takes as input an id, returns boolean reporting on whether its a valid id for this class.
   *
   * @method _validateId
   * @protected
   * @return {boolean}
   */


  _createClass(Root, [{
    key: '_validateId',
    value: function _validateId() {
      var id = String(this.id);
      var prefix = this.constructor.prefixUUID;
      if (id.indexOf(prefix) !== 0 && id.indexOf('temp_' + prefix) !== 0) return false;
      if (!id.substring(prefix.length).match(/.{8}-.{4}-.{4}-.{4}-.{12}$/)) return false;
      return true;
    }

    /**
     * Destroys the object.
     *
     * Cleans up all events / subscriptions
     * and marks the object as isDestroyed.
     *
     * @method destroy
     */

  }, {
    key: 'destroy',
    value: function destroy() {
      var _this2 = this;

      if (this.isDestroyed) throw new Error(LayerError.dictionary.alreadyDestroyed);

      // If anyone is listening, notify them
      this.trigger('destroy');

      // Cleanup pointers to SystemBus. Failure to call destroy
      // will have very serious consequences...
      SystemBus.off(this.internalId + '-delayed-event', null, this);

      // Remove all events, and all pointers passed to this object by other objects
      this.off();

      // Find all of the objects that this object has passed itself to in the form
      // of event handlers and remove all references to itself.
      this._subscriptions.forEach(function (item) {
        return item.off(null, null, _this2);
      });

      this._subscriptions = null;
      this._delayedTriggers = null;
      this.isDestroyed = true;
    }

    /**
     * Convert class instance to Plain Javascript Object.
     *
     * Strips out all private members, and insures no datastructure loops.
     * Recursively converting all subobjects using calls to toObject.
     *
     *      console.dir(myobj.toObject());
     *
     * Note: While it would be tempting to have noChildren default to true,
     * this would result in Message.toObject() not outputing its MessageParts.
     *
     * Private data (_ prefixed properties) will not be output.
     *
     * @method toObject
     * @param  {boolean} [noChildren=false] Don't output sub-components
     * @return {Object}
     */

  }, {
    key: 'toObject',
    value: function toObject() {
      var _this3 = this;

      var noChildren = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

      this.__inToObject = true;
      var obj = {};

      // Iterate over all formally defined properties
      try {
        var keys = Object.keys(this.constructor.prototype);
        keys.forEach(function (key) {
          var v = _this3[key];

          // Ignore private/protected properties and functions
          if (key.indexOf('_') === 0) return;
          if (typeof v === 'function') return;

          // Generate arrays...
          if (Array.isArray(v)) {
            obj[key] = [];
            v.forEach(function (item) {
              if (item instanceof Root) {
                if (noChildren) {
                  delete obj[key];
                } else if (!item.__inToObject) {
                  obj[key].push(item.toObject());
                }
              } else {
                obj[key].push(item);
              }
            });
          }

          // Generate subcomponents
          else if (v instanceof Root) {
              if (!v.__inToObject && !noChildren) {
                obj[key] = v.toObject();
              }
            }

            // Generate dates (creates a copy to separate it from the source object)
            else if (v instanceof Date) {
                obj[key] = new Date(v);
              }

              // Generate simple properties
              else {
                  obj[key] = v;
                }
        });
      } catch (e) {
        // no-op
      }
      this.__inToObject = false;
      return obj;
    }

    /**
     * Log a warning for attempts to subscribe to unsupported events.
     *
     * @method _warnForEvent
     * @private
     */

  }, {
    key: '_warnForEvent',
    value: function _warnForEvent(eventName) {
      if (!Utils.includes(this.constructor._supportedEvents, eventName)) {
        throw new Error('Event ' + eventName + ' not defined for ' + this.toString());
      }
    }

    /**
     * Prepare for processing an event subscription call.
     *
     * If context is a Root class, add this object to the context's subscriptions.
     *
     * @method _prepareOn
     * @private
     */

  }, {
    key: '_prepareOn',
    value: function _prepareOn(name, handler, context) {
      var _this4 = this;

      if (context instanceof Root) {
        if (context.isDestroyed) {
          throw new Error(LayerError.dictionary.isDestroyed);
        }
        context._subscriptions.push(this);
      }
      if (typeof name === 'string' && name !== 'all') {
        if (eventSplitter.test(name)) {
          var names = name.split(eventSplitter);
          names.forEach(function (n) {
            return _this4._warnForEvent(n);
          });
        } else {
          this._warnForEvent(name);
        }
      } else if (name && (typeof name === 'undefined' ? 'undefined' : _typeof(name)) === 'object') {
        Object.keys(name).forEach(function (keyName) {
          return _this4._warnForEvent(keyName);
        });
      }
    }

    /**
     * Subscribe to events.
     *
     * Note that the context parameter serves double importance here:
     *
     * 1. It determines the context in which to execute the event handler
     * 2. Create a backlink so that if either subscriber or subscribee is destroyed,
     *    all pointers between them can be found and removed.
     *
     *      obj.on('someEventName someOtherEventName', mycallback, mycontext);
     *
     *      obj.on({
     *          eventName1: callback1,
     *          eventName2: callback2
     *      }, mycontext);
     *
     * @method on
     * @param  {String} name - Name of the event
     * @param  {Function} handler - Event handler
     * @param  {layer.LayerEvent} handler.event - Event object delivered to the handler
     * @param  {Object} context - This pointer AND link to help with cleanup
     * @return {layer.Root} this
     */

  }, {
    key: 'on',
    value: function on(name, handler, context) {
      this._prepareOn(name, handler, context);
      Events.on.apply(this, [name, handler, context]);
      return this;
    }

    /**
     * Subscribe to the first occurance of the specified event.
     *
     * @method once
     */

  }, {
    key: 'once',
    value: function once(name, handler, context) {
      this._prepareOn(name, handler, context);
      Events.once.apply(this, [name, handler, context]);
      return this;
    }

    /**
     * Unsubscribe from events.
     *
     *      // Removes all event handlers for this event:
     *      obj.off('someEventName');
     *
     *      // Removes all event handlers using this function pointer as callback
     *      obj.off(null, f, null);
     *
     *      // Removes all event handlers that `this` has subscribed to; requires
     *      // obj.on to be called with `this` as its `context` parameter.
     *      obj.off(null, null, this);
     *
     * @method off
     * @param  {String} name - Name of the event; null for all event names
     * @param  {Function} handler - Event handler; null for all functions
     * @param  {Object} context - The context from the `on()` call to search for; null for all contexts
     */

    /**
     * Trigger an event for any event listeners.
     *
     * Events triggered this way will be blocked if _disableEvents = true
     *
     * @method trigger
     * @param {string} eventName    Name of the event that one should subscribe to in order to receive this event
     * @param {Mixed} arg           Values that will be placed within a layer.LayerEvent
     * @return {layer.Root} this
     */

  }, {
    key: 'trigger',
    value: function trigger() {
      if (this._disableEvents) return this;
      return this._trigger.apply(this, arguments);
    }

    /**
     * Triggers an event.
     *
     * @method trigger
     * @private
     * @param {string} eventName - Name of the event
     * @return {Object} Return *this* for chaining
     */

  }, {
    key: '_trigger',
    value: function _trigger() {
      if (!Utils.includes(this.constructor._supportedEvents, arguments.length <= 0 ? undefined : arguments[0])) {
        if (!Utils.includes(this.constructor._ignoredEvents, arguments.length <= 0 ? undefined : arguments[0])) {
          Logger.error(this.toString() + ' ignored ' + (arguments.length <= 0 ? undefined : arguments[0]));
        }
        return;
      }

      var computedArgs = this._getTriggerArgs.apply(this, arguments);

      Events.trigger.apply(this, computedArgs);

      var parentProp = this.constructor.bubbleEventParent;
      if (parentProp) {
        var _parentValue;

        var parentValue = this[parentProp];
        parentValue = typeof parentValue === 'function' ? parentValue.apply(this) : parentValue;
        if (parentValue) (_parentValue = parentValue).trigger.apply(_parentValue, _toConsumableArray(computedArgs));
      }
    }

    /**
     * Generates a layer.LayerEvent from a trigger call's arguments.
     *
     * * If parameter is already a layer.LayerEvent, we're done.
     * * If parameter is an object, a `target` property is added to that object and its delivered to all subscribers
     * * If the parameter is non-object value, it is added to an object with a `target` property, and the value is put in
     *   the `data` property.
     *
     * @method _getTriggerArgs
     * @private
     * @return {Mixed[]} - First element of array is eventName, second element is layer.LayerEvent.
     */

  }, {
    key: '_getTriggerArgs',
    value: function _getTriggerArgs() {
      var _this5 = this;

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var computedArgs = Array.prototype.slice.call(args);

      if (args[1]) {
        (function () {
          var newArg = { target: _this5 };

          if (computedArgs[1] instanceof LayerEvent) {
            // A LayerEvent will be an argument when bubbling events up; these args can be used as-is
          } else {
              if (_typeof(computedArgs[1]) === 'object') {
                Object.keys(computedArgs[1]).forEach(function (name) {
                  newArg[name] = computedArgs[1][name];
                });
              } else {
                newArg.data = computedArgs[1];
              }
              computedArgs[1] = new LayerEvent(newArg, computedArgs[0]);
            }
        })();
      } else {
        computedArgs[1] = new LayerEvent({ target: this }, computedArgs[0]);
      }

      return computedArgs;
    }

    /**
     * Same as _trigger() method, but delays briefly before firing.
     *
     * When would you want to delay an event?
     *
     * 1. There is an event rollup that may be needed for the event;
     *    this requires the framework to be able to see ALL events that have been
     *    generated, roll them up, and THEN fire them.
     * 2. The event is intended for UI rendering... which should not hold up the rest of
     *    this framework's execution.
     *
     * When NOT to delay an event?
     *
     * 1. Lifecycle events frequently require response at the time the event has fired
     *
     * @method _triggerAsync
     * @private
     * @param {string} eventName    Name of the event that one should subscribe to in order to receive this event
     * @param {Mixed} arg           Values that will be placed within a layer.LayerEvent
     * @return {layer.Root} this
     */

  }, {
    key: '_triggerAsync',
    value: function _triggerAsync() {
      var _this6 = this;

      var computedArgs = this._getTriggerArgs.apply(this, arguments);
      this._delayedTriggers.push(computedArgs);

      // NOTE: It is unclear at this time how it happens, but on very rare occasions, we see processDelayedTriggers
      // fail to get called when length = 1, and after that length just continuously grows.  So we add
      // the _lastDelayedTrigger test to insure that it will still run.
      var shouldScheduleTrigger = this._delayedTriggers.length === 1 || this._delayedTriggers.length && this._lastDelayedTrigger + 500 < Date.now();
      if (shouldScheduleTrigger) {
        this._lastDelayedTrigger = Date.now();
        if (typeof postMessage === 'function' && typeof jasmine === 'undefined') {
          window.postMessage({
            type: 'layer-delayed-event',
            internalId: this.internalId
          }, '*');
        } else {
          setTimeout(function () {
            return _this6._processDelayedTriggers();
          }, 0);
        }
      }
    }

    /**
     * Combines a set of events into a single event.
     *
     * Given an event structure of
     *
     *      {
     *          customName: [value1]
     *      }
     *      {
     *          customName: [value2]
     *      }
     *      {
     *          customName: [value3]
     *      }
     *
     * Merge them into
     *
     *      {
     *          customName: [value1, value2, value3]
     *      }
     *
     * @method _foldEvents
     * @private
     * @param  {layer.LayerEvent[]} events
     * @param  {string} name      Name of the property (i.e. 'customName')
     * @param  {layer.Root}    newTarget Value of the target for the folded resulting event
     */

  }, {
    key: '_foldEvents',
    value: function _foldEvents(events, name, newTarget) {
      var firstEvt = events.length ? events[0][1] : null;
      var firstEvtProp = firstEvt ? firstEvt[name] : null;
      events.forEach(function (evt, i) {
        if (i > 0) {
          firstEvtProp.push(evt[1][name][0]);
          this._delayedTriggers.splice(this._delayedTriggers.indexOf(evt), 1);
        }
      }, this);
      if (events.length && newTarget) events[0][1].target = newTarget;
    }

    /**
     * Fold a set of Change events into a single Change event.
     *
     * Given a set change events on this component,
     * fold all change events into a single event via
     * the layer.LayerEvent's changes array.
     *
     * @method _foldChangeEvents
     * @private
     */

  }, {
    key: '_foldChangeEvents',
    value: function _foldChangeEvents() {
      var _this7 = this;

      var events = this._delayedTriggers.filter(function (evt) {
        return evt[1].isChange;
      });
      events.forEach(function (evt, i) {
        if (i > 0) {
          events[0][1]._mergeChanges(evt[1]);
          _this7._delayedTriggers.splice(_this7._delayedTriggers.indexOf(evt), 1);
        }
      });
    }

    /**
     * Execute all delayed events for this compoennt.
     *
     * @method _processDelayedTriggers
     * @private
     */

  }, {
    key: '_processDelayedTriggers',
    value: function _processDelayedTriggers() {
      if (this.isDestroyed) return;
      this._foldChangeEvents();

      this._delayedTriggers.forEach(function (evt) {
        this.trigger.apply(this, _toConsumableArray(evt));
      }, this);
      this._delayedTriggers = [];
    }

    /**
     * Returns a string representation of the class that is nicer than [Object].
     *
     * @method toString
     * @return {String}
     */

  }, {
    key: 'toString',
    value: function toString() {
      return this.internalId;
    }
  }]);

  return Root;
}(EventClass);

function defineProperty(newClass, propertyName) {
  var pKey = '__' + propertyName;
  var camel = propertyName.substring(0, 1).toUpperCase() + propertyName.substring(1);

  var hasDefinitions = newClass.prototype['__adjust' + camel] || newClass.prototype['__update' + camel] || newClass.prototype['__get' + camel];
  if (hasDefinitions) {
    // set default value
    newClass.prototype[pKey] = newClass.prototype[propertyName];

    Object.defineProperty(newClass.prototype, propertyName, {
      enumerable: true,
      get: function get() {
        return this['__get' + camel] ? this['__get' + camel](pKey) : this[pKey];
      },
      set: function set(inValue) {
        if (this.isDestroyed) return;
        var initial = this[pKey];
        if (inValue !== initial) {
          if (this['__adjust' + camel]) {
            var result = this['__adjust' + camel](inValue);
            if (result !== undefined) inValue = result;
          }
          this[pKey] = inValue;
        }
        if (inValue !== initial) {
          if (!this.isInitializing && this['__update' + camel]) {
            this['__update' + camel](inValue, initial);
          }
        }
      }
    });
  }
}

function initClass(newClass, className) {
  // Make sure our new class has a name property
  if (!newClass.name) newClass.name = className;

  // Make sure our new class has a _supportedEvents, _ignoredEvents, _inObjectIgnore and EVENTS properties
  if (!newClass._supportedEvents) newClass._supportedEvents = Root._supportedEvents;
  if (!newClass._ignoredEvents) newClass._ignoredEvents = Root._ignoredEvents;

  // Generate a list of properties for this class; we don't include any
  // properties from layer.Root
  var keys = Object.keys(newClass.prototype).filter(function (key) {
    return newClass.prototype.hasOwnProperty(key) && !Root.prototype.hasOwnProperty(key) && typeof newClass.prototype[key] !== 'function';
  });

  // Define getters/setters for any property that has __adjust or __update methods defined
  keys.forEach(function (name) {
    return defineProperty(newClass, name);
  });
}

/**
 * Set to true once destroy() has been called.
 *
 * A destroyed object will likely cause errors in any attempt
 * to call methods on it, and will no longer trigger events.
 *
 * @type {boolean}
 */
Root.prototype.isDestroyed = false;

/**
 * Every instance has its own internal ID.
 *
 * This ID is distinct from any IDs assigned by the server.
 * The internal ID is gaurenteed not to change within the lifetime of the Object/session;
 * it is possible, on creating a new object, for its `id` property to change.
 *
 * @type {string}
 */
Root.prototype.internalId = '';

/**
 * True while we are in the constructor.
 *
 * @type {boolean}
 */
Root.prototype.isInitializing = true;

/**
 * Objects that this object is listening for events from.
 *
 * @type {layer.Root[]}
 */
Root.prototype._subscriptions = null;

/**
 * Disable all events triggered on this object.
 * @type {boolean}
 */
Root.prototype._disableEvents = false;

Root._supportedEvents = ['destroy', 'all'];
Root._ignoredEvents = [];
module.exports = Root;
module.exports.initClass = initClass;
//# sourceMappingURL=data:application/json;base64,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LE1BS2xDLENBQUMsU0FBUyxnQkFBVCxFQUEyQixTQUFTLGdCQUFULEdBQTRCLEtBQUssZ0JBQUwsQ0FBNUQ7QUFDQSxNQUFJLENBQUMsU0FBUyxjQUFULEVBQXlCLFNBQVMsY0FBVCxHQUEwQixLQUFLLGNBQUwsQ0FBeEQ7Ozs7QUFOc0MsTUFVaEMsT0FBTyxPQUFPLElBQVAsQ0FBWSxTQUFTLFNBQVQsQ0FBWixDQUFnQyxNQUFoQyxDQUF1QztXQUNsRCxTQUFTLFNBQVQsQ0FBbUIsY0FBbkIsQ0FBa0MsR0FBbEMsS0FDQSxDQUFDLEtBQUssU0FBTCxDQUFlLGNBQWYsQ0FBOEIsR0FBOUIsQ0FBRCxJQUNBLE9BQU8sU0FBUyxTQUFULENBQW1CLEdBQW5CLENBQVAsS0FBbUMsVUFBbkM7R0FIa0QsQ0FBOUM7OztBQVZnQyxNQWlCdEMsQ0FBSyxPQUFMLENBQWE7V0FBUSxlQUFlLFFBQWYsRUFBeUIsSUFBekI7R0FBUixDQUFiLENBakJzQztDQUF4Qzs7Ozs7Ozs7OztBQTRCQSxLQUFLLFNBQUwsQ0FBZSxXQUFmLEdBQTZCLEtBQTdCOzs7Ozs7Ozs7OztBQVdBLEtBQUssU0FBTCxDQUFlLFVBQWYsR0FBNEIsRUFBNUI7Ozs7Ozs7QUFPQSxLQUFLLFNBQUwsQ0FBZSxjQUFmLEdBQWdDLElBQWhDOzs7Ozs7O0FBT0EsS0FBSyxTQUFMLENBQWUsY0FBZixHQUFnQyxJQUFoQzs7Ozs7O0FBTUEsS0FBSyxTQUFMLENBQWUsY0FBZixHQUFnQyxLQUFoQzs7QUFHQSxLQUFLLGdCQUFMLEdBQXdCLENBQUMsU0FBRCxFQUFZLEtBQVosQ0FBeEI7QUFDQSxLQUFLLGNBQUwsR0FBc0IsRUFBdEI7QUFDQSxPQUFPLE9BQVAsR0FBaUIsSUFBakI7QUFDQSxPQUFPLE9BQVAsQ0FBZSxTQUFmLEdBQTJCLFNBQTNCIiwiZmlsZSI6InJvb3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBVdGlscyA9IHJlcXVpcmUoJy4vY2xpZW50LXV0aWxzJyk7XG5jb25zdCBMYXllckV2ZW50ID0gcmVxdWlyZSgnLi9sYXllci1ldmVudCcpO1xuY29uc3QgTGF5ZXJFcnJvciA9IHJlcXVpcmUoJy4vbGF5ZXItZXJyb3InKTtcbmNvbnN0IEV2ZW50cyA9IHJlcXVpcmUoJ2JhY2tib25lLWV2ZW50cy1zdGFuZGFsb25lL2JhY2tib25lLWV2ZW50cy1zdGFuZGFsb25lJyk7XG5jb25zdCBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlcicpO1xuXG4vKlxuICogUHJvdmlkZXMgYSBzeXN0ZW0gYnVzIHRoYXQgY2FuIGJlIGFjY2Vzc2VkIGJ5IGFsbCBjb21wb25lbnRzIG9mIHRoZSBzeXN0ZW0uXG4gKiBDdXJyZW50bHkgdXNlZCB0byBsaXN0ZW4gdG8gbWVzc2FnZXMgc2VudCB2aWEgcG9zdE1lc3NhZ2UsIGJ1dCBlbnZpc2lvbmVkIHRvXG4gKiBkbyBmYXIgbW9yZS5cbiAqL1xuZnVuY3Rpb24gRXZlbnRDbGFzcygpIHsgfVxuRXZlbnRDbGFzcy5wcm90b3R5cGUgPSBFdmVudHM7XG5cbmNvbnN0IFN5c3RlbUJ1cyA9IG5ldyBFdmVudENsYXNzKCk7XG5pZiAodHlwZW9mIHBvc3RNZXNzYWdlID09PSAnZnVuY3Rpb24nKSB7XG4gIGFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBpZiAoZXZlbnQuZGF0YS50eXBlID09PSAnbGF5ZXItZGVsYXllZC1ldmVudCcpIHtcbiAgICAgIFN5c3RlbUJ1cy50cmlnZ2VyKGV2ZW50LmRhdGEuaW50ZXJuYWxJZCArICctZGVsYXllZC1ldmVudCcpO1xuICAgIH1cbiAgfSk7XG59XG5cbi8vIFVzZWQgdG8gZ2VuZXJhdGUgYSB1bmlxdWUgaW50ZXJuYWxJZCBmb3IgZXZlcnkgUm9vdCBpbnN0YW5jZVxuY29uc3QgdW5pcXVlSWRzID0ge307XG5cbi8vIFJlZ2V4IGZvciBzcGxpdHRpbmcgYW4gZXZlbnQgc3RyaW5nIHN1Y2ggYXMgb2JqLm9uKCdldnROYW1lMSBldnROYW1lMiBldnROYW1lMycpXG5jb25zdCBldmVudFNwbGl0dGVyID0gL1xccysvO1xuXG4vKipcbiAqIFRoZSByb290IGNsYXNzIG9mIGFsbCBsYXllciBvYmplY3RzLiBQcm92aWRlcyB0aGUgZm9sbG93aW5nIHV0aWxpdGllc1xuICpcbiAqIDEuIE1peGVzIGluIHRoZSBCYWNrYm9uZSBldmVudCBtb2RlbFxuICpcbiAqICAgICAgICB2YXIgcGVyc29uID0gbmV3IFBlcnNvbigpO1xuICogICAgICAgIHBlcnNvbi5vbignZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICogICAgICAgICAgICBjb25zb2xlLmxvZygnSSBoYXZlIGJlZW4gZGVzdHJveWVkIScpO1xuICogICAgICAgIH0pO1xuICpcbiAqICAgICAgICAvLyBGaXJlIHRoZSBjb25zb2xlIGxvZyBoYW5kbGVyOlxuICogICAgICAgIHBlcnNvbi50cmlnZ2VyKCdkZXN0cm95Jyk7XG4gKlxuICogICAgICAgIC8vIFVuc3Vic2NyaWJlXG4gKiAgICAgICAgcGVyc29uLm9mZignZGVzdHJveScpO1xuICpcbiAqIDIuIEFkZHMgYSBzdWJzY3JpcHRpb25zIG9iamVjdCBzbyB0aGF0IGFueSBldmVudCBoYW5kbGVycyBvbiBhbiBvYmplY3QgY2FuIGJlIHF1aWNrbHkgZm91bmQgYW5kIHJlbW92ZWRcbiAqXG4gKiAgICAgICAgdmFyIHBlcnNvbjEgPSBuZXcgUGVyc29uKCk7XG4gKiAgICAgICAgdmFyIHBlcnNvbjIgPSBuZXcgUGVyc29uKCk7XG4gKiAgICAgICAgcGVyc29uMi5vbignZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICogICAgICAgICAgICBjb25zb2xlLmxvZygnSSBoYXZlIGJlZW4gZGVzdHJveWVkIScpO1xuICogICAgICAgIH0sIHBlcnNvbjEpO1xuICpcbiAqICAgICAgICAvLyBQb2ludGVycyB0byBwZXJzb24xIGhlbGQgb250byBieSBwZXJzb24yIGFyZSByZW1vdmVkXG4gKiAgICAgICAgcGVyc29uMS5kZXN0cm95KCk7XG4gKlxuICogMy4gQWRkcyBzdXBwb3J0IGZvciBldmVudCBsaXN0ZW5lcnMgaW4gdGhlIGNvbnN0cnVjdG9yXG4gKiAgICBBbnkgZXZlbnQgaGFuZGxlciBjYW4gYmUgcGFzc2VkIGludG8gdGhlIGNvbnN0cnVjdG9yXG4gKiAgICBqdXN0IGFzIHRob3VnaCBpdCB3ZXJlIGEgcHJvcGVydHkuXG4gKlxuICogICAgICAgIHZhciBwZXJzb24gPSBuZXcgUGVyc29uKHtcbiAqICAgICAgICAgICAgYWdlOiAxNTAsXG4gKiAgICAgICAgICAgIGRlc3Ryb3k6IGZ1bmN0aW9uKCkge1xuICogICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0kgaGF2ZSBiZWVuIGRlc3Ryb3llZCEnKTtcbiAqICAgICAgICAgICAgfVxuICogICAgICAgIH0pO1xuICpcbiAqIDQuIEEgX2Rpc2FibGVFdmVudHMgcHJvcGVydHlcbiAqXG4gKiAgICAgICAgbXlNZXRob2QoKSB7XG4gKiAgICAgICAgICBpZiAodGhpcy5pc0luaXRpYWxpemluZykge1xuICogICAgICAgICAgICAgIHRoaXMuX2Rpc2FibGVFdmVudHMgPSB0cnVlO1xuICpcbiAqICAgICAgICAgICAgICAvLyBFdmVudCBvbmx5IHJlY2VpdmVkIGlmIF9kaXNhYmxlRXZlbnRzID0gZmFsc2VcbiAqICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIoJ2Rlc3Ryb3knKTtcbiAqICAgICAgICAgICAgICB0aGlzLl9kaXNhYmxlRXZlbnRzID0gZmFsc2U7XG4gKiAgICAgICAgICB9XG4gKiAgICAgICAgfVxuICpcbiAqIDUuIEEgX3N1cHBvcnRlZEV2ZW50cyBzdGF0aWMgcHJvcGVydHkgZm9yIGVhY2ggY2xhc3NcbiAqXG4gKiAgICAgVGhpcyBwcm9wZXJ0eSBkZWZpbmVzIHdoaWNoIGV2ZW50cyBjYW4gYmUgdHJpZ2dlcmVkLlxuICpcbiAqICAgICAqIEFueSBhdHRlbXB0IHRvIHRyaWdnZXJcbiAqICAgICAgIGFuIGV2ZW50IG5vdCBpbiBfc3VwcG9ydGVkRXZlbnRzIHdpbGwgbG9nIGFuIGVycm9yLlxuICogICAgICogQW55IGF0dGVtcHQgdG8gcmVnaXN0ZXIgYSBsaXN0ZW5lciBmb3IgYW4gZXZlbnQgbm90IGluIF9zdXBwb3J0ZWRFdmVudHMgd2lsbFxuICogICAgICp0aHJvdyogYW4gZXJyb3IuXG4gKlxuICogICAgIFRoaXMgYWxsb3dzIHVzIHRvIGluc3VyZSBkZXZlbG9wZXJzIG9ubHkgc3Vic2NyaWJlIHRvIHZhbGlkIGV2ZW50cy5cbiAqXG4gKiAgICAgVGhpcyBhbGxvd3MgdXMgdG8gY29udHJvbCB3aGF0IGV2ZW50cyBjYW4gYmUgZmlyZWQgYW5kIHdoaWNoIG9uZXMgYmxvY2tlZC5cbiAqXG4gKiA2LiBBZGRzIGFuIGludGVybmFsSWQgcHJvcGVydHlcbiAqXG4gKiAgICAgICAgdmFyIHBlcnNvbiA9IG5ldyBQZXJzb24oKTtcbiAqICAgICAgICBjb25zb2xlLmxvZyhwZXJzb24uaW50ZXJuYWxJZCk7IC8vIC0+ICdQZXJzb24xJ1xuICpcbiAqIDcuIEFkZHMgYSB0b09iamVjdCBtZXRob2QgdG8gY3JlYXRlIGEgc2ltcGxpZmllZCBQbGFpbiBPbGQgSmF2YWNyaXB0IE9iamVjdCBmcm9tIHlvdXIgb2JqZWN0XG4gKlxuICogICAgICAgIHZhciBwZXJzb24gPSBuZXcgUGVyc29uKCk7XG4gKiAgICAgICAgdmFyIHNpbXBsZVBlcnNvbiA9IHBlcnNvbi50b09iamVjdCgpO1xuICpcbiAqIDguIFByb3ZpZGVzIF9fYWRqdXN0UHJvcGVydHkgbWV0aG9kIHN1cHBvcnRcbiAqXG4gKiAgICAgRm9yIGFueSBwcm9wZXJ0eSBvZiBhIGNsYXNzLCBhbiBgX19hZGp1c3RQcm9wZXJ0eWAgbWV0aG9kIGNhbiBiZSBkZWZpbmVkLiAgSWYgaXRzIGRlZmluZWQsXG4gKiAgICAgaXQgd2lsbCBiZSBjYWxsZWQgcHJpb3IgdG8gc2V0dGluZyB0aGF0IHByb3BlcnR5LCBhbGxvd2luZzpcbiAqXG4gKiAgICAgQS4gTW9kaWZpY2F0aW9uIG9mIHRoZSB2YWx1ZSB0aGF0IGlzIGFjdHVhbGx5IHNldFxuICogICAgIEIuIFZhbGlkYXRpb24gb2YgdGhlIHZhbHVlOyB0aHJvd2luZyBlcnJvcnMgaWYgaW52YWxpZC5cbiAqXG4gKiA5LiBQcm92aWRlcyBfX3VkcGF0ZVByb3BlcnR5IG1ldGhvZCBzdXBwb3J0XG4gKlxuICogICAgIEFmdGVyIHNldHRpbmcgYW55IHByb3BlcnR5IGZvciB3aGljaCB0aGVyZSBpcyBhbiBgX191cGRhdGVQcm9wZXJ0eWAgbWV0aG9kIGRlZmluZWQsXG4gKiAgICAgdGhlIG1ldGhvZCB3aWxsIGJlIGNhbGxlZCwgYWxsb3dpbmcgdGhlIG5ldyBwcm9wZXJ0eSB0byBiZSBhcHBsaWVkLlxuICpcbiAqICAgICBUeXBpY2FsbHkgdXNlZCBmb3JcbiAqXG4gKiAgICAgQS4gVHJpZ2dlcmluZyBldmVudHNcbiAqICAgICBCLiBGaXJpbmcgWEhSIHJlcXVlc3RzXG4gKiAgICAgQy4gVXBkYXRpbmcgdGhlIFVJIHRvIG1hdGNoIHRoZSBuZXcgcHJvcGVydHkgdmFsdWVcbiAqXG4gKlxuICogQGNsYXNzIGxheWVyLlJvb3RcbiAqIEBhYnN0cmFjdFxuICogQGF1dGhvciBNaWNoYWVsIEthbnRvclxuICovXG5jbGFzcyBSb290IGV4dGVuZHMgRXZlbnRDbGFzcyB7XG5cbiAgLyoqXG4gICAqIFN1cGVyY2xhc3MgY29uc3RydWN0b3IgaGFuZGxlcyBjb3B5aW5nIGluIHByb3BlcnRpZXMgYW5kIHJlZ2lzdGVyaW5nIGV2ZW50IGhhbmRsZXJzLlxuICAgKlxuICAgKiBAbWV0aG9kIGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9ucyAtIGEgaGFzaCBvZiBwcm9wZXJ0aWVzIGFuZCBldmVudCBoYW5kbGVyc1xuICAgKiBAcmV0dXJuIHtsYXllci5Sb290fVxuICAgKi9cbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLl9zdWJzY3JpcHRpb25zID0gW107XG4gICAgdGhpcy5fZGVsYXllZFRyaWdnZXJzID0gW107XG4gICAgdGhpcy5fbGFzdERlbGF5ZWRUcmlnZ2VyID0gRGF0ZS5ub3coKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAgIC8vIEdlbmVyYXRlIGFuIGludGVybmFsSWRcbiAgICBjb25zdCBuYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuICAgIGlmICghdW5pcXVlSWRzW25hbWVdKSB1bmlxdWVJZHNbbmFtZV0gPSAwO1xuICAgIHRoaXMuaW50ZXJuYWxJZCA9IG5hbWUgKyB1bmlxdWVJZHNbbmFtZV0rKztcblxuICAgIC8vIEV2ZXJ5IGNvbXBvbmVudCBsaXN0ZW5zIHRvIHRoZSBTeXN0ZW1CdXMgZm9yIHBvc3RNZXNzYWdlICh0cmlnZ2VyQXN5bmMpIGV2ZW50c1xuICAgIFN5c3RlbUJ1cy5vbih0aGlzLmludGVybmFsSWQgKyAnLWRlbGF5ZWQtZXZlbnQnLCB0aGlzLl9wcm9jZXNzRGVsYXllZFRyaWdnZXJzLCB0aGlzKTtcblxuICAgIC8vIEdlbmVyYXRlIGEgdGVtcG9yYXJ5IGlkIGlmIHRoZXJlIGlzbid0IGFuIGlkXG4gICAgaWYgKCF0aGlzLmlkICYmICFvcHRpb25zLmlkICYmIHRoaXMuY29uc3RydWN0b3IucHJlZml4VVVJRCkge1xuICAgICAgdGhpcy5pZCA9ICd0ZW1wXycgKyB0aGlzLmNvbnN0cnVjdG9yLnByZWZpeFVVSUQgKyBVdGlscy5nZW5lcmF0ZVVVSUQoKTtcbiAgICB9XG5cbiAgICAvLyBDb3B5IGluIGFsbCBwcm9wZXJ0aWVzOyBzZXR1cCBhbGwgZXZlbnQgaGFuZGxlcnNcbiAgICBsZXQga2V5O1xuICAgIGZvciAoa2V5IGluIG9wdGlvbnMpIHtcbiAgICAgIGlmICh0aGlzLmNvbnN0cnVjdG9yLl9zdXBwb3J0ZWRFdmVudHMuaW5kZXhPZihrZXkpICE9PSAtMSkge1xuICAgICAgICB0aGlzLm9uKGtleSwgb3B0aW9uc1trZXldKTtcbiAgICAgIH0gZWxzZSBpZiAoa2V5IGluIHRoaXMgJiYgdHlwZW9mIHRoaXNba2V5XSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzW2tleV0gPSBvcHRpb25zW2tleV07XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuaXNJbml0aWFsaXppbmcgPSBmYWxzZTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFRha2VzIGFzIGlucHV0IGFuIGlkLCByZXR1cm5zIGJvb2xlYW4gcmVwb3J0aW5nIG9uIHdoZXRoZXIgaXRzIGEgdmFsaWQgaWQgZm9yIHRoaXMgY2xhc3MuXG4gICAqXG4gICAqIEBtZXRob2QgX3ZhbGlkYXRlSWRcbiAgICogQHByb3RlY3RlZFxuICAgKiBAcmV0dXJuIHtib29sZWFufVxuICAgKi9cbiAgX3ZhbGlkYXRlSWQoKSB7XG4gICAgY29uc3QgaWQgPSBTdHJpbmcodGhpcy5pZCk7XG4gICAgY29uc3QgcHJlZml4ID0gdGhpcy5jb25zdHJ1Y3Rvci5wcmVmaXhVVUlEO1xuICAgIGlmIChpZC5pbmRleE9mKHByZWZpeCkgIT09IDAgJiYgaWQuaW5kZXhPZigndGVtcF8nICsgcHJlZml4KSAhPT0gMCkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghaWQuc3Vic3RyaW5nKHByZWZpeC5sZW5ndGgpLm1hdGNoKC8uezh9LS57NH0tLns0fS0uezR9LS57MTJ9JC8pKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIG9iamVjdC5cbiAgICpcbiAgICogQ2xlYW5zIHVwIGFsbCBldmVudHMgLyBzdWJzY3JpcHRpb25zXG4gICAqIGFuZCBtYXJrcyB0aGUgb2JqZWN0IGFzIGlzRGVzdHJveWVkLlxuICAgKlxuICAgKiBAbWV0aG9kIGRlc3Ryb3lcbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgaWYgKHRoaXMuaXNEZXN0cm95ZWQpIHRocm93IG5ldyBFcnJvcihMYXllckVycm9yLmRpY3Rpb25hcnkuYWxyZWFkeURlc3Ryb3llZCk7XG5cbiAgICAvLyBJZiBhbnlvbmUgaXMgbGlzdGVuaW5nLCBub3RpZnkgdGhlbVxuICAgIHRoaXMudHJpZ2dlcignZGVzdHJveScpO1xuXG4gICAgLy8gQ2xlYW51cCBwb2ludGVycyB0byBTeXN0ZW1CdXMuIEZhaWx1cmUgdG8gY2FsbCBkZXN0cm95XG4gICAgLy8gd2lsbCBoYXZlIHZlcnkgc2VyaW91cyBjb25zZXF1ZW5jZXMuLi5cbiAgICBTeXN0ZW1CdXMub2ZmKHRoaXMuaW50ZXJuYWxJZCArICctZGVsYXllZC1ldmVudCcsIG51bGwsIHRoaXMpO1xuXG4gICAgLy8gUmVtb3ZlIGFsbCBldmVudHMsIGFuZCBhbGwgcG9pbnRlcnMgcGFzc2VkIHRvIHRoaXMgb2JqZWN0IGJ5IG90aGVyIG9iamVjdHNcbiAgICB0aGlzLm9mZigpO1xuXG4gICAgLy8gRmluZCBhbGwgb2YgdGhlIG9iamVjdHMgdGhhdCB0aGlzIG9iamVjdCBoYXMgcGFzc2VkIGl0c2VsZiB0byBpbiB0aGUgZm9ybVxuICAgIC8vIG9mIGV2ZW50IGhhbmRsZXJzIGFuZCByZW1vdmUgYWxsIHJlZmVyZW5jZXMgdG8gaXRzZWxmLlxuICAgIHRoaXMuX3N1YnNjcmlwdGlvbnMuZm9yRWFjaChpdGVtID0+IGl0ZW0ub2ZmKG51bGwsIG51bGwsIHRoaXMpKTtcblxuICAgIHRoaXMuX3N1YnNjcmlwdGlvbnMgPSBudWxsO1xuICAgIHRoaXMuX2RlbGF5ZWRUcmlnZ2VycyA9IG51bGw7XG4gICAgdGhpcy5pc0Rlc3Ryb3llZCA9IHRydWU7XG4gIH1cblxuICAvKipcbiAgICogQ29udmVydCBjbGFzcyBpbnN0YW5jZSB0byBQbGFpbiBKYXZhc2NyaXB0IE9iamVjdC5cbiAgICpcbiAgICogU3RyaXBzIG91dCBhbGwgcHJpdmF0ZSBtZW1iZXJzLCBhbmQgaW5zdXJlcyBubyBkYXRhc3RydWN0dXJlIGxvb3BzLlxuICAgKiBSZWN1cnNpdmVseSBjb252ZXJ0aW5nIGFsbCBzdWJvYmplY3RzIHVzaW5nIGNhbGxzIHRvIHRvT2JqZWN0LlxuICAgKlxuICAgKiAgICAgIGNvbnNvbGUuZGlyKG15b2JqLnRvT2JqZWN0KCkpO1xuICAgKlxuICAgKiBOb3RlOiBXaGlsZSBpdCB3b3VsZCBiZSB0ZW1wdGluZyB0byBoYXZlIG5vQ2hpbGRyZW4gZGVmYXVsdCB0byB0cnVlLFxuICAgKiB0aGlzIHdvdWxkIHJlc3VsdCBpbiBNZXNzYWdlLnRvT2JqZWN0KCkgbm90IG91dHB1dGluZyBpdHMgTWVzc2FnZVBhcnRzLlxuICAgKlxuICAgKiBQcml2YXRlIGRhdGEgKF8gcHJlZml4ZWQgcHJvcGVydGllcykgd2lsbCBub3QgYmUgb3V0cHV0LlxuICAgKlxuICAgKiBAbWV0aG9kIHRvT2JqZWN0XG4gICAqIEBwYXJhbSAge2Jvb2xlYW59IFtub0NoaWxkcmVuPWZhbHNlXSBEb24ndCBvdXRwdXQgc3ViLWNvbXBvbmVudHNcbiAgICogQHJldHVybiB7T2JqZWN0fVxuICAgKi9cbiAgdG9PYmplY3Qobm9DaGlsZHJlbiA9IGZhbHNlKSB7XG4gICAgdGhpcy5fX2luVG9PYmplY3QgPSB0cnVlO1xuICAgIGNvbnN0IG9iaiA9IHt9O1xuXG4gICAgLy8gSXRlcmF0ZSBvdmVyIGFsbCBmb3JtYWxseSBkZWZpbmVkIHByb3BlcnRpZXNcbiAgICB0cnkge1xuICAgICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMuY29uc3RydWN0b3IucHJvdG90eXBlKTtcbiAgICAgIGtleXMuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICBjb25zdCB2ID0gdGhpc1trZXldO1xuXG4gICAgICAgIC8vIElnbm9yZSBwcml2YXRlL3Byb3RlY3RlZCBwcm9wZXJ0aWVzIGFuZCBmdW5jdGlvbnNcbiAgICAgICAgaWYgKGtleS5pbmRleE9mKCdfJykgPT09IDApIHJldHVybjtcbiAgICAgICAgaWYgKHR5cGVvZiB2ID09PSAnZnVuY3Rpb24nKSByZXR1cm47XG5cbiAgICAgICAgLy8gR2VuZXJhdGUgYXJyYXlzLi4uXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHYpKSB7XG4gICAgICAgICAgb2JqW2tleV0gPSBbXTtcbiAgICAgICAgICB2LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIFJvb3QpIHtcbiAgICAgICAgICAgICAgaWYgKG5vQ2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgb2JqW2tleV07XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAoIWl0ZW0uX19pblRvT2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgb2JqW2tleV0ucHVzaChpdGVtLnRvT2JqZWN0KCkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBvYmpba2V5XS5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2VuZXJhdGUgc3ViY29tcG9uZW50c1xuICAgICAgICBlbHNlIGlmICh2IGluc3RhbmNlb2YgUm9vdCkge1xuICAgICAgICAgIGlmICghdi5fX2luVG9PYmplY3QgJiYgIW5vQ2hpbGRyZW4pIHtcbiAgICAgICAgICAgIG9ialtrZXldID0gdi50b09iamVjdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdlbmVyYXRlIGRhdGVzIChjcmVhdGVzIGEgY29weSB0byBzZXBhcmF0ZSBpdCBmcm9tIHRoZSBzb3VyY2Ugb2JqZWN0KVxuICAgICAgICBlbHNlIGlmICh2IGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICAgIG9ialtrZXldID0gbmV3IERhdGUodik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZW5lcmF0ZSBzaW1wbGUgcHJvcGVydGllc1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBvYmpba2V5XSA9IHY7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIG5vLW9wXG4gICAgfVxuICAgIHRoaXMuX19pblRvT2JqZWN0ID0gZmFsc2U7XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2cgYSB3YXJuaW5nIGZvciBhdHRlbXB0cyB0byBzdWJzY3JpYmUgdG8gdW5zdXBwb3J0ZWQgZXZlbnRzLlxuICAgKlxuICAgKiBAbWV0aG9kIF93YXJuRm9yRXZlbnRcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF93YXJuRm9yRXZlbnQoZXZlbnROYW1lKSB7XG4gICAgaWYgKCFVdGlscy5pbmNsdWRlcyh0aGlzLmNvbnN0cnVjdG9yLl9zdXBwb3J0ZWRFdmVudHMsIGV2ZW50TmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRXZlbnQgJyArIGV2ZW50TmFtZSArICcgbm90IGRlZmluZWQgZm9yICcgKyB0aGlzLnRvU3RyaW5nKCkpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQcmVwYXJlIGZvciBwcm9jZXNzaW5nIGFuIGV2ZW50IHN1YnNjcmlwdGlvbiBjYWxsLlxuICAgKlxuICAgKiBJZiBjb250ZXh0IGlzIGEgUm9vdCBjbGFzcywgYWRkIHRoaXMgb2JqZWN0IHRvIHRoZSBjb250ZXh0J3Mgc3Vic2NyaXB0aW9ucy5cbiAgICpcbiAgICogQG1ldGhvZCBfcHJlcGFyZU9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcHJlcGFyZU9uKG5hbWUsIGhhbmRsZXIsIGNvbnRleHQpIHtcbiAgICBpZiAoY29udGV4dCBpbnN0YW5jZW9mIFJvb3QpIHtcbiAgICAgIGlmIChjb250ZXh0LmlzRGVzdHJveWVkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihMYXllckVycm9yLmRpY3Rpb25hcnkuaXNEZXN0cm95ZWQpO1xuICAgICAgfVxuICAgICAgY29udGV4dC5fc3Vic2NyaXB0aW9ucy5wdXNoKHRoaXMpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG5hbWUgPT09ICdzdHJpbmcnICYmIG5hbWUgIT09ICdhbGwnKSB7XG4gICAgICBpZiAoZXZlbnRTcGxpdHRlci50ZXN0KG5hbWUpKSB7XG4gICAgICAgIGNvbnN0IG5hbWVzID0gbmFtZS5zcGxpdChldmVudFNwbGl0dGVyKTtcbiAgICAgICAgbmFtZXMuZm9yRWFjaChuID0+IHRoaXMuX3dhcm5Gb3JFdmVudChuKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl93YXJuRm9yRXZlbnQobmFtZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChuYW1lICYmIHR5cGVvZiBuYW1lID09PSAnb2JqZWN0Jykge1xuICAgICAgT2JqZWN0LmtleXMobmFtZSkuZm9yRWFjaChrZXlOYW1lID0+IHRoaXMuX3dhcm5Gb3JFdmVudChrZXlOYW1lKSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFN1YnNjcmliZSB0byBldmVudHMuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB0aGUgY29udGV4dCBwYXJhbWV0ZXIgc2VydmVzIGRvdWJsZSBpbXBvcnRhbmNlIGhlcmU6XG4gICAqXG4gICAqIDEuIEl0IGRldGVybWluZXMgdGhlIGNvbnRleHQgaW4gd2hpY2ggdG8gZXhlY3V0ZSB0aGUgZXZlbnQgaGFuZGxlclxuICAgKiAyLiBDcmVhdGUgYSBiYWNrbGluayBzbyB0aGF0IGlmIGVpdGhlciBzdWJzY3JpYmVyIG9yIHN1YnNjcmliZWUgaXMgZGVzdHJveWVkLFxuICAgKiAgICBhbGwgcG9pbnRlcnMgYmV0d2VlbiB0aGVtIGNhbiBiZSBmb3VuZCBhbmQgcmVtb3ZlZC5cbiAgICpcbiAgICogICAgICBvYmoub24oJ3NvbWVFdmVudE5hbWUgc29tZU90aGVyRXZlbnROYW1lJywgbXljYWxsYmFjaywgbXljb250ZXh0KTtcbiAgICpcbiAgICogICAgICBvYmoub24oe1xuICAgKiAgICAgICAgICBldmVudE5hbWUxOiBjYWxsYmFjazEsXG4gICAqICAgICAgICAgIGV2ZW50TmFtZTI6IGNhbGxiYWNrMlxuICAgKiAgICAgIH0sIG15Y29udGV4dCk7XG4gICAqXG4gICAqIEBtZXRob2Qgb25cbiAgICogQHBhcmFtICB7U3RyaW5nfSBuYW1lIC0gTmFtZSBvZiB0aGUgZXZlbnRcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGhhbmRsZXIgLSBFdmVudCBoYW5kbGVyXG4gICAqIEBwYXJhbSAge2xheWVyLkxheWVyRXZlbnR9IGhhbmRsZXIuZXZlbnQgLSBFdmVudCBvYmplY3QgZGVsaXZlcmVkIHRvIHRoZSBoYW5kbGVyXG4gICAqIEBwYXJhbSAge09iamVjdH0gY29udGV4dCAtIFRoaXMgcG9pbnRlciBBTkQgbGluayB0byBoZWxwIHdpdGggY2xlYW51cFxuICAgKiBAcmV0dXJuIHtsYXllci5Sb290fSB0aGlzXG4gICAqL1xuICBvbihuYW1lLCBoYW5kbGVyLCBjb250ZXh0KSB7XG4gICAgdGhpcy5fcHJlcGFyZU9uKG5hbWUsIGhhbmRsZXIsIGNvbnRleHQpO1xuICAgIEV2ZW50cy5vbi5hcHBseSh0aGlzLCBbbmFtZSwgaGFuZGxlciwgY29udGV4dF0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFN1YnNjcmliZSB0byB0aGUgZmlyc3Qgb2NjdXJhbmNlIG9mIHRoZSBzcGVjaWZpZWQgZXZlbnQuXG4gICAqXG4gICAqIEBtZXRob2Qgb25jZVxuICAgKi9cbiAgb25jZShuYW1lLCBoYW5kbGVyLCBjb250ZXh0KSB7XG4gICAgdGhpcy5fcHJlcGFyZU9uKG5hbWUsIGhhbmRsZXIsIGNvbnRleHQpO1xuICAgIEV2ZW50cy5vbmNlLmFwcGx5KHRoaXMsIFtuYW1lLCBoYW5kbGVyLCBjb250ZXh0XSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogVW5zdWJzY3JpYmUgZnJvbSBldmVudHMuXG4gICAqXG4gICAqICAgICAgLy8gUmVtb3ZlcyBhbGwgZXZlbnQgaGFuZGxlcnMgZm9yIHRoaXMgZXZlbnQ6XG4gICAqICAgICAgb2JqLm9mZignc29tZUV2ZW50TmFtZScpO1xuICAgKlxuICAgKiAgICAgIC8vIFJlbW92ZXMgYWxsIGV2ZW50IGhhbmRsZXJzIHVzaW5nIHRoaXMgZnVuY3Rpb24gcG9pbnRlciBhcyBjYWxsYmFja1xuICAgKiAgICAgIG9iai5vZmYobnVsbCwgZiwgbnVsbCk7XG4gICAqXG4gICAqICAgICAgLy8gUmVtb3ZlcyBhbGwgZXZlbnQgaGFuZGxlcnMgdGhhdCBgdGhpc2AgaGFzIHN1YnNjcmliZWQgdG87IHJlcXVpcmVzXG4gICAqICAgICAgLy8gb2JqLm9uIHRvIGJlIGNhbGxlZCB3aXRoIGB0aGlzYCBhcyBpdHMgYGNvbnRleHRgIHBhcmFtZXRlci5cbiAgICogICAgICBvYmoub2ZmKG51bGwsIG51bGwsIHRoaXMpO1xuICAgKlxuICAgKiBAbWV0aG9kIG9mZlxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IG5hbWUgLSBOYW1lIG9mIHRoZSBldmVudDsgbnVsbCBmb3IgYWxsIGV2ZW50IG5hbWVzXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBoYW5kbGVyIC0gRXZlbnQgaGFuZGxlcjsgbnVsbCBmb3IgYWxsIGZ1bmN0aW9uc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGNvbnRleHQgLSBUaGUgY29udGV4dCBmcm9tIHRoZSBgb24oKWAgY2FsbCB0byBzZWFyY2ggZm9yOyBudWxsIGZvciBhbGwgY29udGV4dHNcbiAgICovXG5cblxuICAvKipcbiAgICogVHJpZ2dlciBhbiBldmVudCBmb3IgYW55IGV2ZW50IGxpc3RlbmVycy5cbiAgICpcbiAgICogRXZlbnRzIHRyaWdnZXJlZCB0aGlzIHdheSB3aWxsIGJlIGJsb2NrZWQgaWYgX2Rpc2FibGVFdmVudHMgPSB0cnVlXG4gICAqXG4gICAqIEBtZXRob2QgdHJpZ2dlclxuICAgKiBAcGFyYW0ge3N0cmluZ30gZXZlbnROYW1lICAgIE5hbWUgb2YgdGhlIGV2ZW50IHRoYXQgb25lIHNob3VsZCBzdWJzY3JpYmUgdG8gaW4gb3JkZXIgdG8gcmVjZWl2ZSB0aGlzIGV2ZW50XG4gICAqIEBwYXJhbSB7TWl4ZWR9IGFyZyAgICAgICAgICAgVmFsdWVzIHRoYXQgd2lsbCBiZSBwbGFjZWQgd2l0aGluIGEgbGF5ZXIuTGF5ZXJFdmVudFxuICAgKiBAcmV0dXJuIHtsYXllci5Sb290fSB0aGlzXG4gICAqL1xuICB0cmlnZ2VyKC4uLmFyZ3MpIHtcbiAgICBpZiAodGhpcy5fZGlzYWJsZUV2ZW50cykgcmV0dXJuIHRoaXM7XG4gICAgcmV0dXJuIHRoaXMuX3RyaWdnZXIoLi4uYXJncyk7XG4gIH1cblxuICAvKipcbiAgICogVHJpZ2dlcnMgYW4gZXZlbnQuXG4gICAqXG4gICAqIEBtZXRob2QgdHJpZ2dlclxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge3N0cmluZ30gZXZlbnROYW1lIC0gTmFtZSBvZiB0aGUgZXZlbnRcbiAgICogQHJldHVybiB7T2JqZWN0fSBSZXR1cm4gKnRoaXMqIGZvciBjaGFpbmluZ1xuICAgKi9cbiAgX3RyaWdnZXIoLi4uYXJncykge1xuICAgIGlmICghVXRpbHMuaW5jbHVkZXModGhpcy5jb25zdHJ1Y3Rvci5fc3VwcG9ydGVkRXZlbnRzLCBhcmdzWzBdKSkge1xuICAgICAgaWYgKCFVdGlscy5pbmNsdWRlcyh0aGlzLmNvbnN0cnVjdG9yLl9pZ25vcmVkRXZlbnRzLCBhcmdzWzBdKSkge1xuICAgICAgICBMb2dnZXIuZXJyb3IodGhpcy50b1N0cmluZygpICsgJyBpZ25vcmVkICcgKyBhcmdzWzBdKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjb21wdXRlZEFyZ3MgPSB0aGlzLl9nZXRUcmlnZ2VyQXJncyguLi5hcmdzKTtcblxuICAgIEV2ZW50cy50cmlnZ2VyLmFwcGx5KHRoaXMsIGNvbXB1dGVkQXJncyk7XG5cbiAgICBjb25zdCBwYXJlbnRQcm9wID0gdGhpcy5jb25zdHJ1Y3Rvci5idWJibGVFdmVudFBhcmVudDtcbiAgICBpZiAocGFyZW50UHJvcCkge1xuICAgICAgbGV0IHBhcmVudFZhbHVlID0gdGhpc1twYXJlbnRQcm9wXTtcbiAgICAgIHBhcmVudFZhbHVlID0gKHR5cGVvZiBwYXJlbnRWYWx1ZSA9PT0gJ2Z1bmN0aW9uJykgPyBwYXJlbnRWYWx1ZS5hcHBseSh0aGlzKSA6IHBhcmVudFZhbHVlO1xuICAgICAgaWYgKHBhcmVudFZhbHVlKSBwYXJlbnRWYWx1ZS50cmlnZ2VyKC4uLmNvbXB1dGVkQXJncyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlcyBhIGxheWVyLkxheWVyRXZlbnQgZnJvbSBhIHRyaWdnZXIgY2FsbCdzIGFyZ3VtZW50cy5cbiAgICpcbiAgICogKiBJZiBwYXJhbWV0ZXIgaXMgYWxyZWFkeSBhIGxheWVyLkxheWVyRXZlbnQsIHdlJ3JlIGRvbmUuXG4gICAqICogSWYgcGFyYW1ldGVyIGlzIGFuIG9iamVjdCwgYSBgdGFyZ2V0YCBwcm9wZXJ0eSBpcyBhZGRlZCB0byB0aGF0IG9iamVjdCBhbmQgaXRzIGRlbGl2ZXJlZCB0byBhbGwgc3Vic2NyaWJlcnNcbiAgICogKiBJZiB0aGUgcGFyYW1ldGVyIGlzIG5vbi1vYmplY3QgdmFsdWUsIGl0IGlzIGFkZGVkIHRvIGFuIG9iamVjdCB3aXRoIGEgYHRhcmdldGAgcHJvcGVydHksIGFuZCB0aGUgdmFsdWUgaXMgcHV0IGluXG4gICAqICAgdGhlIGBkYXRhYCBwcm9wZXJ0eS5cbiAgICpcbiAgICogQG1ldGhvZCBfZ2V0VHJpZ2dlckFyZ3NcbiAgICogQHByaXZhdGVcbiAgICogQHJldHVybiB7TWl4ZWRbXX0gLSBGaXJzdCBlbGVtZW50IG9mIGFycmF5IGlzIGV2ZW50TmFtZSwgc2Vjb25kIGVsZW1lbnQgaXMgbGF5ZXIuTGF5ZXJFdmVudC5cbiAgICovXG4gIF9nZXRUcmlnZ2VyQXJncyguLi5hcmdzKSB7XG4gICAgY29uc3QgY29tcHV0ZWRBcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJncyk7XG5cbiAgICBpZiAoYXJnc1sxXSkge1xuICAgICAgY29uc3QgbmV3QXJnID0geyB0YXJnZXQ6IHRoaXMgfTtcblxuICAgICAgaWYgKGNvbXB1dGVkQXJnc1sxXSBpbnN0YW5jZW9mIExheWVyRXZlbnQpIHtcbiAgICAgICAgLy8gQSBMYXllckV2ZW50IHdpbGwgYmUgYW4gYXJndW1lbnQgd2hlbiBidWJibGluZyBldmVudHMgdXA7IHRoZXNlIGFyZ3MgY2FuIGJlIHVzZWQgYXMtaXNcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29tcHV0ZWRBcmdzWzFdID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgIE9iamVjdC5rZXlzKGNvbXB1dGVkQXJnc1sxXSkuZm9yRWFjaChuYW1lID0+IHtuZXdBcmdbbmFtZV0gPSBjb21wdXRlZEFyZ3NbMV1bbmFtZV07fSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbmV3QXJnLmRhdGEgPSBjb21wdXRlZEFyZ3NbMV07XG4gICAgICAgIH1cbiAgICAgICAgY29tcHV0ZWRBcmdzWzFdID0gbmV3IExheWVyRXZlbnQobmV3QXJnLCBjb21wdXRlZEFyZ3NbMF0pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb21wdXRlZEFyZ3NbMV0gPSBuZXcgTGF5ZXJFdmVudCh7IHRhcmdldDogdGhpcyB9LCBjb21wdXRlZEFyZ3NbMF0pO1xuICAgIH1cblxuICAgIHJldHVybiBjb21wdXRlZEFyZ3M7XG4gIH1cblxuICAvKipcbiAgICogU2FtZSBhcyBfdHJpZ2dlcigpIG1ldGhvZCwgYnV0IGRlbGF5cyBicmllZmx5IGJlZm9yZSBmaXJpbmcuXG4gICAqXG4gICAqIFdoZW4gd291bGQgeW91IHdhbnQgdG8gZGVsYXkgYW4gZXZlbnQ/XG4gICAqXG4gICAqIDEuIFRoZXJlIGlzIGFuIGV2ZW50IHJvbGx1cCB0aGF0IG1heSBiZSBuZWVkZWQgZm9yIHRoZSBldmVudDtcbiAgICogICAgdGhpcyByZXF1aXJlcyB0aGUgZnJhbWV3b3JrIHRvIGJlIGFibGUgdG8gc2VlIEFMTCBldmVudHMgdGhhdCBoYXZlIGJlZW5cbiAgICogICAgZ2VuZXJhdGVkLCByb2xsIHRoZW0gdXAsIGFuZCBUSEVOIGZpcmUgdGhlbS5cbiAgICogMi4gVGhlIGV2ZW50IGlzIGludGVuZGVkIGZvciBVSSByZW5kZXJpbmcuLi4gd2hpY2ggc2hvdWxkIG5vdCBob2xkIHVwIHRoZSByZXN0IG9mXG4gICAqICAgIHRoaXMgZnJhbWV3b3JrJ3MgZXhlY3V0aW9uLlxuICAgKlxuICAgKiBXaGVuIE5PVCB0byBkZWxheSBhbiBldmVudD9cbiAgICpcbiAgICogMS4gTGlmZWN5Y2xlIGV2ZW50cyBmcmVxdWVudGx5IHJlcXVpcmUgcmVzcG9uc2UgYXQgdGhlIHRpbWUgdGhlIGV2ZW50IGhhcyBmaXJlZFxuICAgKlxuICAgKiBAbWV0aG9kIF90cmlnZ2VyQXN5bmNcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50TmFtZSAgICBOYW1lIG9mIHRoZSBldmVudCB0aGF0IG9uZSBzaG91bGQgc3Vic2NyaWJlIHRvIGluIG9yZGVyIHRvIHJlY2VpdmUgdGhpcyBldmVudFxuICAgKiBAcGFyYW0ge01peGVkfSBhcmcgICAgICAgICAgIFZhbHVlcyB0aGF0IHdpbGwgYmUgcGxhY2VkIHdpdGhpbiBhIGxheWVyLkxheWVyRXZlbnRcbiAgICogQHJldHVybiB7bGF5ZXIuUm9vdH0gdGhpc1xuICAgKi9cbiAgX3RyaWdnZXJBc3luYyguLi5hcmdzKSB7XG4gICAgY29uc3QgY29tcHV0ZWRBcmdzID0gdGhpcy5fZ2V0VHJpZ2dlckFyZ3MoLi4uYXJncyk7XG4gICAgdGhpcy5fZGVsYXllZFRyaWdnZXJzLnB1c2goY29tcHV0ZWRBcmdzKTtcblxuICAgIC8vIE5PVEU6IEl0IGlzIHVuY2xlYXIgYXQgdGhpcyB0aW1lIGhvdyBpdCBoYXBwZW5zLCBidXQgb24gdmVyeSByYXJlIG9jY2FzaW9ucywgd2Ugc2VlIHByb2Nlc3NEZWxheWVkVHJpZ2dlcnNcbiAgICAvLyBmYWlsIHRvIGdldCBjYWxsZWQgd2hlbiBsZW5ndGggPSAxLCBhbmQgYWZ0ZXIgdGhhdCBsZW5ndGgganVzdCBjb250aW51b3VzbHkgZ3Jvd3MuICBTbyB3ZSBhZGRcbiAgICAvLyB0aGUgX2xhc3REZWxheWVkVHJpZ2dlciB0ZXN0IHRvIGluc3VyZSB0aGF0IGl0IHdpbGwgc3RpbGwgcnVuLlxuICAgIGNvbnN0IHNob3VsZFNjaGVkdWxlVHJpZ2dlciA9IHRoaXMuX2RlbGF5ZWRUcmlnZ2Vycy5sZW5ndGggPT09IDEgfHxcbiAgICAgIHRoaXMuX2RlbGF5ZWRUcmlnZ2Vycy5sZW5ndGggJiYgdGhpcy5fbGFzdERlbGF5ZWRUcmlnZ2VyICsgNTAwIDwgRGF0ZS5ub3coKTtcbiAgICBpZiAoc2hvdWxkU2NoZWR1bGVUcmlnZ2VyKSB7XG4gICAgICB0aGlzLl9sYXN0RGVsYXllZFRyaWdnZXIgPSBEYXRlLm5vdygpO1xuICAgICAgaWYgKHR5cGVvZiBwb3N0TWVzc2FnZSA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgamFzbWluZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICB0eXBlOiAnbGF5ZXItZGVsYXllZC1ldmVudCcsXG4gICAgICAgICAgaW50ZXJuYWxJZDogdGhpcy5pbnRlcm5hbElkLFxuICAgICAgICB9LCAnKicpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLl9wcm9jZXNzRGVsYXllZFRyaWdnZXJzKCksIDApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDb21iaW5lcyBhIHNldCBvZiBldmVudHMgaW50byBhIHNpbmdsZSBldmVudC5cbiAgICpcbiAgICogR2l2ZW4gYW4gZXZlbnQgc3RydWN0dXJlIG9mXG4gICAqXG4gICAqICAgICAge1xuICAgKiAgICAgICAgICBjdXN0b21OYW1lOiBbdmFsdWUxXVxuICAgKiAgICAgIH1cbiAgICogICAgICB7XG4gICAqICAgICAgICAgIGN1c3RvbU5hbWU6IFt2YWx1ZTJdXG4gICAqICAgICAgfVxuICAgKiAgICAgIHtcbiAgICogICAgICAgICAgY3VzdG9tTmFtZTogW3ZhbHVlM11cbiAgICogICAgICB9XG4gICAqXG4gICAqIE1lcmdlIHRoZW0gaW50b1xuICAgKlxuICAgKiAgICAgIHtcbiAgICogICAgICAgICAgY3VzdG9tTmFtZTogW3ZhbHVlMSwgdmFsdWUyLCB2YWx1ZTNdXG4gICAqICAgICAgfVxuICAgKlxuICAgKiBAbWV0aG9kIF9mb2xkRXZlbnRzXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSAge2xheWVyLkxheWVyRXZlbnRbXX0gZXZlbnRzXG4gICAqIEBwYXJhbSAge3N0cmluZ30gbmFtZSAgICAgIE5hbWUgb2YgdGhlIHByb3BlcnR5IChpLmUuICdjdXN0b21OYW1lJylcbiAgICogQHBhcmFtICB7bGF5ZXIuUm9vdH0gICAgbmV3VGFyZ2V0IFZhbHVlIG9mIHRoZSB0YXJnZXQgZm9yIHRoZSBmb2xkZWQgcmVzdWx0aW5nIGV2ZW50XG4gICAqL1xuICBfZm9sZEV2ZW50cyhldmVudHMsIG5hbWUsIG5ld1RhcmdldCkge1xuICAgIGNvbnN0IGZpcnN0RXZ0ID0gZXZlbnRzLmxlbmd0aCA/IGV2ZW50c1swXVsxXSA6IG51bGw7XG4gICAgY29uc3QgZmlyc3RFdnRQcm9wID0gZmlyc3RFdnQgPyBmaXJzdEV2dFtuYW1lXSA6IG51bGw7XG4gICAgZXZlbnRzLmZvckVhY2goZnVuY3Rpb24gKGV2dCwgaSkge1xuICAgICAgaWYgKGkgPiAwKSB7XG4gICAgICAgIGZpcnN0RXZ0UHJvcC5wdXNoKGV2dFsxXVtuYW1lXVswXSk7XG4gICAgICAgIHRoaXMuX2RlbGF5ZWRUcmlnZ2Vycy5zcGxpY2UodGhpcy5fZGVsYXllZFRyaWdnZXJzLmluZGV4T2YoZXZ0KSwgMSk7XG4gICAgICB9XG4gICAgfSwgdGhpcyk7XG4gICAgaWYgKGV2ZW50cy5sZW5ndGggJiYgbmV3VGFyZ2V0KSBldmVudHNbMF1bMV0udGFyZ2V0ID0gbmV3VGFyZ2V0O1xuICB9XG5cbiAgLyoqXG4gICAqIEZvbGQgYSBzZXQgb2YgQ2hhbmdlIGV2ZW50cyBpbnRvIGEgc2luZ2xlIENoYW5nZSBldmVudC5cbiAgICpcbiAgICogR2l2ZW4gYSBzZXQgY2hhbmdlIGV2ZW50cyBvbiB0aGlzIGNvbXBvbmVudCxcbiAgICogZm9sZCBhbGwgY2hhbmdlIGV2ZW50cyBpbnRvIGEgc2luZ2xlIGV2ZW50IHZpYVxuICAgKiB0aGUgbGF5ZXIuTGF5ZXJFdmVudCdzIGNoYW5nZXMgYXJyYXkuXG4gICAqXG4gICAqIEBtZXRob2QgX2ZvbGRDaGFuZ2VFdmVudHNcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9mb2xkQ2hhbmdlRXZlbnRzKCkge1xuICAgIGNvbnN0IGV2ZW50cyA9IHRoaXMuX2RlbGF5ZWRUcmlnZ2Vycy5maWx0ZXIoZXZ0ID0+IGV2dFsxXS5pc0NoYW5nZSk7XG4gICAgZXZlbnRzLmZvckVhY2goKGV2dCwgaSkgPT4ge1xuICAgICAgaWYgKGkgPiAwKSB7XG4gICAgICAgIGV2ZW50c1swXVsxXS5fbWVyZ2VDaGFuZ2VzKGV2dFsxXSk7XG4gICAgICAgIHRoaXMuX2RlbGF5ZWRUcmlnZ2Vycy5zcGxpY2UodGhpcy5fZGVsYXllZFRyaWdnZXJzLmluZGV4T2YoZXZ0KSwgMSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRXhlY3V0ZSBhbGwgZGVsYXllZCBldmVudHMgZm9yIHRoaXMgY29tcG9lbm50LlxuICAgKlxuICAgKiBAbWV0aG9kIF9wcm9jZXNzRGVsYXllZFRyaWdnZXJzXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcHJvY2Vzc0RlbGF5ZWRUcmlnZ2VycygpIHtcbiAgICBpZiAodGhpcy5pc0Rlc3Ryb3llZCkgcmV0dXJuO1xuICAgIHRoaXMuX2ZvbGRDaGFuZ2VFdmVudHMoKTtcblxuICAgIHRoaXMuX2RlbGF5ZWRUcmlnZ2Vycy5mb3JFYWNoKGZ1bmN0aW9uIChldnQpIHtcbiAgICAgIHRoaXMudHJpZ2dlciguLi5ldnQpO1xuICAgIH0sIHRoaXMpO1xuICAgIHRoaXMuX2RlbGF5ZWRUcmlnZ2VycyA9IFtdO1xuICB9XG5cblxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjbGFzcyB0aGF0IGlzIG5pY2VyIHRoYW4gW09iamVjdF0uXG4gICAqXG4gICAqIEBtZXRob2QgdG9TdHJpbmdcbiAgICogQHJldHVybiB7U3RyaW5nfVxuICAgKi9cbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMuaW50ZXJuYWxJZDtcbiAgfVxufVxuXG5mdW5jdGlvbiBkZWZpbmVQcm9wZXJ0eShuZXdDbGFzcywgcHJvcGVydHlOYW1lKSB7XG4gIGNvbnN0IHBLZXkgPSAnX18nICsgcHJvcGVydHlOYW1lO1xuICBjb25zdCBjYW1lbCA9IHByb3BlcnR5TmFtZS5zdWJzdHJpbmcoMCwgMSkudG9VcHBlckNhc2UoKSArIHByb3BlcnR5TmFtZS5zdWJzdHJpbmcoMSk7XG5cbiAgY29uc3QgaGFzRGVmaW5pdGlvbnMgPSBuZXdDbGFzcy5wcm90b3R5cGVbJ19fYWRqdXN0JyArIGNhbWVsXSB8fCBuZXdDbGFzcy5wcm90b3R5cGVbJ19fdXBkYXRlJyArIGNhbWVsXSB8fFxuICAgIG5ld0NsYXNzLnByb3RvdHlwZVsnX19nZXQnICsgY2FtZWxdO1xuICBpZiAoaGFzRGVmaW5pdGlvbnMpIHtcbiAgICAvLyBzZXQgZGVmYXVsdCB2YWx1ZVxuICAgIG5ld0NsYXNzLnByb3RvdHlwZVtwS2V5XSA9IG5ld0NsYXNzLnByb3RvdHlwZVtwcm9wZXJ0eU5hbWVdO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG5ld0NsYXNzLnByb3RvdHlwZSwgcHJvcGVydHlOYW1lLCB7XG4gICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzWydfX2dldCcgKyBjYW1lbF0gPyB0aGlzWydfX2dldCcgKyBjYW1lbF0ocEtleSkgOiB0aGlzW3BLZXldO1xuICAgICAgfSxcbiAgICAgIHNldDogZnVuY3Rpb24gc2V0KGluVmFsdWUpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNEZXN0cm95ZWQpIHJldHVybjtcbiAgICAgICAgY29uc3QgaW5pdGlhbCA9IHRoaXNbcEtleV07XG4gICAgICAgIGlmIChpblZhbHVlICE9PSBpbml0aWFsKSB7XG4gICAgICAgICAgaWYgKHRoaXNbJ19fYWRqdXN0JyArIGNhbWVsXSkge1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpc1snX19hZGp1c3QnICsgY2FtZWxdKGluVmFsdWUpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdCAhPT0gdW5kZWZpbmVkKSBpblZhbHVlID0gcmVzdWx0O1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzW3BLZXldID0gaW5WYWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaW5WYWx1ZSAhPT0gaW5pdGlhbCkge1xuICAgICAgICAgIGlmICghdGhpcy5pc0luaXRpYWxpemluZyAmJiB0aGlzWydfX3VwZGF0ZScgKyBjYW1lbF0pIHtcbiAgICAgICAgICAgIHRoaXNbJ19fdXBkYXRlJyArIGNhbWVsXShpblZhbHVlLCBpbml0aWFsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaW5pdENsYXNzKG5ld0NsYXNzLCBjbGFzc05hbWUpIHtcbiAgLy8gTWFrZSBzdXJlIG91ciBuZXcgY2xhc3MgaGFzIGEgbmFtZSBwcm9wZXJ0eVxuICBpZiAoIW5ld0NsYXNzLm5hbWUpIG5ld0NsYXNzLm5hbWUgPSBjbGFzc05hbWU7XG5cbiAgLy8gTWFrZSBzdXJlIG91ciBuZXcgY2xhc3MgaGFzIGEgX3N1cHBvcnRlZEV2ZW50cywgX2lnbm9yZWRFdmVudHMsIF9pbk9iamVjdElnbm9yZSBhbmQgRVZFTlRTIHByb3BlcnRpZXNcbiAgaWYgKCFuZXdDbGFzcy5fc3VwcG9ydGVkRXZlbnRzKSBuZXdDbGFzcy5fc3VwcG9ydGVkRXZlbnRzID0gUm9vdC5fc3VwcG9ydGVkRXZlbnRzO1xuICBpZiAoIW5ld0NsYXNzLl9pZ25vcmVkRXZlbnRzKSBuZXdDbGFzcy5faWdub3JlZEV2ZW50cyA9IFJvb3QuX2lnbm9yZWRFdmVudHM7XG5cbiAgLy8gR2VuZXJhdGUgYSBsaXN0IG9mIHByb3BlcnRpZXMgZm9yIHRoaXMgY2xhc3M7IHdlIGRvbid0IGluY2x1ZGUgYW55XG4gIC8vIHByb3BlcnRpZXMgZnJvbSBsYXllci5Sb290XG4gIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhuZXdDbGFzcy5wcm90b3R5cGUpLmZpbHRlcihrZXkgPT5cbiAgICBuZXdDbGFzcy5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkoa2V5KSAmJlxuICAgICFSb290LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eShrZXkpICYmXG4gICAgdHlwZW9mIG5ld0NsYXNzLnByb3RvdHlwZVtrZXldICE9PSAnZnVuY3Rpb24nXG4gICk7XG5cbiAgLy8gRGVmaW5lIGdldHRlcnMvc2V0dGVycyBmb3IgYW55IHByb3BlcnR5IHRoYXQgaGFzIF9fYWRqdXN0IG9yIF9fdXBkYXRlIG1ldGhvZHMgZGVmaW5lZFxuICBrZXlzLmZvckVhY2gobmFtZSA9PiBkZWZpbmVQcm9wZXJ0eShuZXdDbGFzcywgbmFtZSkpO1xufVxuXG4vKipcbiAqIFNldCB0byB0cnVlIG9uY2UgZGVzdHJveSgpIGhhcyBiZWVuIGNhbGxlZC5cbiAqXG4gKiBBIGRlc3Ryb3llZCBvYmplY3Qgd2lsbCBsaWtlbHkgY2F1c2UgZXJyb3JzIGluIGFueSBhdHRlbXB0XG4gKiB0byBjYWxsIG1ldGhvZHMgb24gaXQsIGFuZCB3aWxsIG5vIGxvbmdlciB0cmlnZ2VyIGV2ZW50cy5cbiAqXG4gKiBAdHlwZSB7Ym9vbGVhbn1cbiAqL1xuUm9vdC5wcm90b3R5cGUuaXNEZXN0cm95ZWQgPSBmYWxzZTtcblxuLyoqXG4gKiBFdmVyeSBpbnN0YW5jZSBoYXMgaXRzIG93biBpbnRlcm5hbCBJRC5cbiAqXG4gKiBUaGlzIElEIGlzIGRpc3RpbmN0IGZyb20gYW55IElEcyBhc3NpZ25lZCBieSB0aGUgc2VydmVyLlxuICogVGhlIGludGVybmFsIElEIGlzIGdhdXJlbnRlZWQgbm90IHRvIGNoYW5nZSB3aXRoaW4gdGhlIGxpZmV0aW1lIG9mIHRoZSBPYmplY3Qvc2Vzc2lvbjtcbiAqIGl0IGlzIHBvc3NpYmxlLCBvbiBjcmVhdGluZyBhIG5ldyBvYmplY3QsIGZvciBpdHMgYGlkYCBwcm9wZXJ0eSB0byBjaGFuZ2UuXG4gKlxuICogQHR5cGUge3N0cmluZ31cbiAqL1xuUm9vdC5wcm90b3R5cGUuaW50ZXJuYWxJZCA9ICcnO1xuXG4vKipcbiAqIFRydWUgd2hpbGUgd2UgYXJlIGluIHRoZSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAdHlwZSB7Ym9vbGVhbn1cbiAqL1xuUm9vdC5wcm90b3R5cGUuaXNJbml0aWFsaXppbmcgPSB0cnVlO1xuXG4vKipcbiAqIE9iamVjdHMgdGhhdCB0aGlzIG9iamVjdCBpcyBsaXN0ZW5pbmcgZm9yIGV2ZW50cyBmcm9tLlxuICpcbiAqIEB0eXBlIHtsYXllci5Sb290W119XG4gKi9cblJvb3QucHJvdG90eXBlLl9zdWJzY3JpcHRpb25zID0gbnVsbDtcblxuLyoqXG4gKiBEaXNhYmxlIGFsbCBldmVudHMgdHJpZ2dlcmVkIG9uIHRoaXMgb2JqZWN0LlxuICogQHR5cGUge2Jvb2xlYW59XG4gKi9cblJvb3QucHJvdG90eXBlLl9kaXNhYmxlRXZlbnRzID0gZmFsc2U7XG5cblxuUm9vdC5fc3VwcG9ydGVkRXZlbnRzID0gWydkZXN0cm95JywgJ2FsbCddO1xuUm9vdC5faWdub3JlZEV2ZW50cyA9IFtdO1xubW9kdWxlLmV4cG9ydHMgPSBSb290O1xubW9kdWxlLmV4cG9ydHMuaW5pdENsYXNzID0gaW5pdENsYXNzO1xuIl19
