'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * This class represents a Layer Error.
 *
 * At this point, a LayerError is only used in response to an error from the server.
 * It may be extended to report on internal errors... but typically internal errors
 * are reported via `throw new Error(...);`
 *
 * Layer Error is passed as part of the layer.LayerEvent's data property.
 *
 *     object.trigger('xxx-error', new LayerEvent({
 *       data: new LayerError()
 *     }));
 *
 * @class layer.LayerError
 */
var Logger = require('./logger');

var LayerError = function () {
  function LayerError(options) {
    var _this = this;

    _classCallCheck(this, LayerError);

    if (options instanceof LayerError) {
      options = {
        errType: options.errType,
        httpStatus: options.httpStatus,
        message: options.message,
        code: options.code,
        url: options.url,
        data: options.data
      };
    } else if (options && (typeof options === 'undefined' ? 'undefined' : _typeof(options)) === 'object') {
      options.errType = options.id;
    } else {
      options = {
        message: options
      };
    }

    Object.keys(options).forEach(function (name) {
      return _this[name] = options[name];
    });
    if (!this.data) this.data = {};
  }

  /**
   * Returns either '' or a nonce.
   *
   * If a nonce has been returned
   * by the server as part of a session-expiration error,
   * then this method will return that nonce.
   *
   * @method getNonce
   * @return {string} nonce
   */


  _createClass(LayerError, [{
    key: 'getNonce',
    value: function getNonce() {
      return this.data && this.data.nonce ? this.data.nonce : '';
    }

    /**
     * String representation of the error
     *
     * @method toString
     * @return {string}
     */

  }, {
    key: 'toString',
    value: function toString() {
      return this.code + ' (' + this.id + '): ' + this.message + '; (see ' + this.url + ')';
    }

    /**
     * Log the errors
     *
     * @method log
     * @deprecated see layer.Logger
     */

  }, {
    key: 'log',
    value: function log() {
      Logger.error('Layer-Error: ' + this.toString());
    }
  }]);

  return LayerError;
}();

/**
 * A string name for the event; these names are paired with codes.
 *
 * Codes can be looked up at https://github.com/layerhq/docs/blob/web-api/specs/rest-api.md#client-errors
 * @type {String}
 */


LayerError.prototype.errType = '';

/**
 * Numerical error code.
 *
 * https://developer.layer.com/docs/client/rest#full-list
 * @type {Number}
 */
LayerError.prototype.code = 0;

/**
 * URL to go to for more information on this error.
 * @type {String}
 */
LayerError.prototype.url = '';

/**
 * Detailed description of the error.
 * @type {String}
 */
LayerError.prototype.message = '';

/**
 * Http error code; no value if its a websocket response.
 * @type {Number}
 */
LayerError.prototype.httpStatus = 0;

/**
 * Contains data from the xhr request object.
 *
 *  * url: the url to the service endpoint
 *  * data: xhr.data,
 *  * xhr: XMLHttpRequest object
 *
 * @type {Object}
 */
LayerError.prototype.request = null;

/**
 * Any additional details about the error sent as additional properties.
 * @type {Object}
 */
LayerError.prototype.data = null;

/**
 * Pointer to the xhr object that fired the actual request and contains the response.
 * @type {XMLHttpRequest}
 */
LayerError.prototype.xhr = null;

/**
 * Dictionary of error messages
 * @property {Object} [dictionary={}]
 */
LayerError.dictionary = {
  appIdMissing: 'Property missing: appId is required',
  identityTokenMissing: 'Identity Token missing: answerAuthenticationChallenge requires an identity token',
  sessionTokenMissing: 'Session Token missing: _authComplete requires a {session_token: value} input',
  clientMissing: 'Property missing: client is required',
  conversationMissing: 'Property missing: conversation is required',
  partsMissing: 'Property missing: parts is required',
  moreParticipantsRequired: 'Conversation needs participants other than the current user',
  isDestroyed: 'Object is destroyed',
  urlRequired: 'Object needs a url property',
  invalidUrl: 'URL is invalid',
  invalidId: 'Identifier is invalid',
  idParamRequired: 'The ID Parameter is required',
  wrongClass: 'Parameter class error; should be: ',
  inProgress: 'Operation already in progress',
  cantChangeIfConnected: 'You can not change value after connecting',
  alreadySent: 'Already sent or sending',
  contentRequired: 'MessagePart requires rich content for this call',
  alreadyDestroyed: 'This object has already been destroyed',
  deletionModeUnsupported: 'Call to deletion was made with an unsupported deletion mode'
};

module.exports = LayerError;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9sYXllci1lcnJvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWVBLElBQU0sU0FBUyxRQUFRLFVBQVIsQ0FBVDs7SUFDQTtBQUNKLFdBREksVUFDSixDQUFZLE9BQVosRUFBcUI7OzswQkFEakIsWUFDaUI7O0FBQ25CLFFBQUksbUJBQW1CLFVBQW5CLEVBQStCO0FBQ2pDLGdCQUFVO0FBQ1IsaUJBQVMsUUFBUSxPQUFSO0FBQ1Qsb0JBQVksUUFBUSxVQUFSO0FBQ1osaUJBQVMsUUFBUSxPQUFSO0FBQ1QsY0FBTSxRQUFRLElBQVI7QUFDTixhQUFLLFFBQVEsR0FBUjtBQUNMLGNBQU0sUUFBUSxJQUFSO09BTlIsQ0FEaUM7S0FBbkMsTUFTTyxJQUFJLFdBQVcsUUFBTyx5REFBUCxLQUFtQixRQUFuQixFQUE2QjtBQUNqRCxjQUFRLE9BQVIsR0FBa0IsUUFBUSxFQUFSLENBRCtCO0tBQTVDLE1BRUE7QUFDTCxnQkFBVTtBQUNSLGlCQUFTLE9BQVQ7T0FERixDQURLO0tBRkE7O0FBUVAsV0FBTyxJQUFQLENBQVksT0FBWixFQUFxQixPQUFyQixDQUE2QjthQUFRLE1BQUssSUFBTCxJQUFhLFFBQVEsSUFBUixDQUFiO0tBQVIsQ0FBN0IsQ0FsQm1CO0FBbUJuQixRQUFJLENBQUMsS0FBSyxJQUFMLEVBQVcsS0FBSyxJQUFMLEdBQVksRUFBWixDQUFoQjtHQW5CRjs7Ozs7Ozs7Ozs7Ozs7ZUFESTs7K0JBaUNPO0FBQ1QsYUFBTyxJQUFDLENBQUssSUFBTCxJQUFhLEtBQUssSUFBTCxDQUFVLEtBQVYsR0FBbUIsS0FBSyxJQUFMLENBQVUsS0FBVixHQUFrQixFQUFuRCxDQURFOzs7Ozs7Ozs7Ozs7K0JBVUE7QUFDVCxhQUFPLEtBQUssSUFBTCxHQUFZLElBQVosR0FBbUIsS0FBSyxFQUFMLEdBQVUsS0FBN0IsR0FBcUMsS0FBSyxPQUFMLEdBQWUsU0FBcEQsR0FBZ0UsS0FBSyxHQUFMLEdBQVcsR0FBM0UsQ0FERTs7Ozs7Ozs7Ozs7OzBCQVVMO0FBQ0osYUFBTyxLQUFQLENBQWEsa0JBQWtCLEtBQUssUUFBTCxFQUFsQixDQUFiLENBREk7Ozs7U0FyREY7Ozs7Ozs7Ozs7O0FBaUVOLFdBQVcsU0FBWCxDQUFxQixPQUFyQixHQUErQixFQUEvQjs7Ozs7Ozs7QUFRQSxXQUFXLFNBQVgsQ0FBcUIsSUFBckIsR0FBNEIsQ0FBNUI7Ozs7OztBQU1BLFdBQVcsU0FBWCxDQUFxQixHQUFyQixHQUEyQixFQUEzQjs7Ozs7O0FBTUEsV0FBVyxTQUFYLENBQXFCLE9BQXJCLEdBQStCLEVBQS9COzs7Ozs7QUFNQSxXQUFXLFNBQVgsQ0FBcUIsVUFBckIsR0FBa0MsQ0FBbEM7Ozs7Ozs7Ozs7O0FBV0EsV0FBVyxTQUFYLENBQXFCLE9BQXJCLEdBQStCLElBQS9COzs7Ozs7QUFNQSxXQUFXLFNBQVgsQ0FBcUIsSUFBckIsR0FBNEIsSUFBNUI7Ozs7OztBQU1BLFdBQVcsU0FBWCxDQUFxQixHQUFyQixHQUEyQixJQUEzQjs7Ozs7O0FBTUEsV0FBVyxVQUFYLEdBQXdCO0FBQ3RCLGdCQUFjLHFDQUFkO0FBQ0Esd0JBQXNCLGtGQUF0QjtBQUNBLHVCQUFxQiw4RUFBckI7QUFDQSxpQkFBZSxzQ0FBZjtBQUNBLHVCQUFxQiw0Q0FBckI7QUFDQSxnQkFBYyxxQ0FBZDtBQUNBLDRCQUEwQiw2REFBMUI7QUFDQSxlQUFhLHFCQUFiO0FBQ0EsZUFBYSw2QkFBYjtBQUNBLGNBQVksZ0JBQVo7QUFDQSxhQUFXLHVCQUFYO0FBQ0EsbUJBQWlCLDhCQUFqQjtBQUNBLGNBQVksb0NBQVo7QUFDQSxjQUFZLCtCQUFaO0FBQ0EseUJBQXVCLDJDQUF2QjtBQUNBLGVBQWEseUJBQWI7QUFDQSxtQkFBaUIsaURBQWpCO0FBQ0Esb0JBQWtCLHdDQUFsQjtBQUNBLDJCQUF5Qiw2REFBekI7Q0FuQkY7O0FBc0JBLE9BQU8sT0FBUCxHQUFpQixVQUFqQiIsImZpbGUiOiJsYXllci1lcnJvci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVGhpcyBjbGFzcyByZXByZXNlbnRzIGEgTGF5ZXIgRXJyb3IuXG4gKlxuICogQXQgdGhpcyBwb2ludCwgYSBMYXllckVycm9yIGlzIG9ubHkgdXNlZCBpbiByZXNwb25zZSB0byBhbiBlcnJvciBmcm9tIHRoZSBzZXJ2ZXIuXG4gKiBJdCBtYXkgYmUgZXh0ZW5kZWQgdG8gcmVwb3J0IG9uIGludGVybmFsIGVycm9ycy4uLiBidXQgdHlwaWNhbGx5IGludGVybmFsIGVycm9yc1xuICogYXJlIHJlcG9ydGVkIHZpYSBgdGhyb3cgbmV3IEVycm9yKC4uLik7YFxuICpcbiAqIExheWVyIEVycm9yIGlzIHBhc3NlZCBhcyBwYXJ0IG9mIHRoZSBsYXllci5MYXllckV2ZW50J3MgZGF0YSBwcm9wZXJ0eS5cbiAqXG4gKiAgICAgb2JqZWN0LnRyaWdnZXIoJ3h4eC1lcnJvcicsIG5ldyBMYXllckV2ZW50KHtcbiAqICAgICAgIGRhdGE6IG5ldyBMYXllckVycm9yKClcbiAqICAgICB9KSk7XG4gKlxuICogQGNsYXNzIGxheWVyLkxheWVyRXJyb3JcbiAqL1xuY29uc3QgTG9nZ2VyID0gcmVxdWlyZSgnLi9sb2dnZXInKTtcbmNsYXNzIExheWVyRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMgaW5zdGFuY2VvZiBMYXllckVycm9yKSB7XG4gICAgICBvcHRpb25zID0ge1xuICAgICAgICBlcnJUeXBlOiBvcHRpb25zLmVyclR5cGUsXG4gICAgICAgIGh0dHBTdGF0dXM6IG9wdGlvbnMuaHR0cFN0YXR1cyxcbiAgICAgICAgbWVzc2FnZTogb3B0aW9ucy5tZXNzYWdlLFxuICAgICAgICBjb2RlOiBvcHRpb25zLmNvZGUsXG4gICAgICAgIHVybDogb3B0aW9ucy51cmwsXG4gICAgICAgIGRhdGE6IG9wdGlvbnMuZGF0YSxcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChvcHRpb25zICYmIHR5cGVvZiBvcHRpb25zID09PSAnb2JqZWN0Jykge1xuICAgICAgb3B0aW9ucy5lcnJUeXBlID0gb3B0aW9ucy5pZDtcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0aW9ucyA9IHtcbiAgICAgICAgbWVzc2FnZTogb3B0aW9ucyxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgT2JqZWN0LmtleXMob3B0aW9ucykuZm9yRWFjaChuYW1lID0+IHRoaXNbbmFtZV0gPSBvcHRpb25zW25hbWVdKTtcbiAgICBpZiAoIXRoaXMuZGF0YSkgdGhpcy5kYXRhID0ge307XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBlaXRoZXIgJycgb3IgYSBub25jZS5cbiAgICpcbiAgICogSWYgYSBub25jZSBoYXMgYmVlbiByZXR1cm5lZFxuICAgKiBieSB0aGUgc2VydmVyIGFzIHBhcnQgb2YgYSBzZXNzaW9uLWV4cGlyYXRpb24gZXJyb3IsXG4gICAqIHRoZW4gdGhpcyBtZXRob2Qgd2lsbCByZXR1cm4gdGhhdCBub25jZS5cbiAgICpcbiAgICogQG1ldGhvZCBnZXROb25jZVxuICAgKiBAcmV0dXJuIHtzdHJpbmd9IG5vbmNlXG4gICAqL1xuICBnZXROb25jZSgpIHtcbiAgICByZXR1cm4gKHRoaXMuZGF0YSAmJiB0aGlzLmRhdGEubm9uY2UpID8gdGhpcy5kYXRhLm5vbmNlIDogJyc7XG4gIH1cblxuICAvKipcbiAgICogU3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBlcnJvclxuICAgKlxuICAgKiBAbWV0aG9kIHRvU3RyaW5nXG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICovXG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLmNvZGUgKyAnICgnICsgdGhpcy5pZCArICcpOiAnICsgdGhpcy5tZXNzYWdlICsgJzsgKHNlZSAnICsgdGhpcy51cmwgKyAnKSc7XG4gIH1cblxuICAvKipcbiAgICogTG9nIHRoZSBlcnJvcnNcbiAgICpcbiAgICogQG1ldGhvZCBsb2dcbiAgICogQGRlcHJlY2F0ZWQgc2VlIGxheWVyLkxvZ2dlclxuICAgKi9cbiAgbG9nKCkge1xuICAgIExvZ2dlci5lcnJvcignTGF5ZXItRXJyb3I6ICcgKyB0aGlzLnRvU3RyaW5nKCkpO1xuICB9XG5cbn1cblxuLyoqXG4gKiBBIHN0cmluZyBuYW1lIGZvciB0aGUgZXZlbnQ7IHRoZXNlIG5hbWVzIGFyZSBwYWlyZWQgd2l0aCBjb2Rlcy5cbiAqXG4gKiBDb2RlcyBjYW4gYmUgbG9va2VkIHVwIGF0IGh0dHBzOi8vZ2l0aHViLmNvbS9sYXllcmhxL2RvY3MvYmxvYi93ZWItYXBpL3NwZWNzL3Jlc3QtYXBpLm1kI2NsaWVudC1lcnJvcnNcbiAqIEB0eXBlIHtTdHJpbmd9XG4gKi9cbkxheWVyRXJyb3IucHJvdG90eXBlLmVyclR5cGUgPSAnJztcblxuLyoqXG4gKiBOdW1lcmljYWwgZXJyb3IgY29kZS5cbiAqXG4gKiBodHRwczovL2RldmVsb3Blci5sYXllci5jb20vZG9jcy9jbGllbnQvcmVzdCNmdWxsLWxpc3RcbiAqIEB0eXBlIHtOdW1iZXJ9XG4gKi9cbkxheWVyRXJyb3IucHJvdG90eXBlLmNvZGUgPSAwO1xuXG4vKipcbiAqIFVSTCB0byBnbyB0byBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiB0aGlzIGVycm9yLlxuICogQHR5cGUge1N0cmluZ31cbiAqL1xuTGF5ZXJFcnJvci5wcm90b3R5cGUudXJsID0gJyc7XG5cbi8qKlxuICogRGV0YWlsZWQgZGVzY3JpcHRpb24gb2YgdGhlIGVycm9yLlxuICogQHR5cGUge1N0cmluZ31cbiAqL1xuTGF5ZXJFcnJvci5wcm90b3R5cGUubWVzc2FnZSA9ICcnO1xuXG4vKipcbiAqIEh0dHAgZXJyb3IgY29kZTsgbm8gdmFsdWUgaWYgaXRzIGEgd2Vic29ja2V0IHJlc3BvbnNlLlxuICogQHR5cGUge051bWJlcn1cbiAqL1xuTGF5ZXJFcnJvci5wcm90b3R5cGUuaHR0cFN0YXR1cyA9IDA7XG5cbi8qKlxuICogQ29udGFpbnMgZGF0YSBmcm9tIHRoZSB4aHIgcmVxdWVzdCBvYmplY3QuXG4gKlxuICogICogdXJsOiB0aGUgdXJsIHRvIHRoZSBzZXJ2aWNlIGVuZHBvaW50XG4gKiAgKiBkYXRhOiB4aHIuZGF0YSxcbiAqICAqIHhocjogWE1MSHR0cFJlcXVlc3Qgb2JqZWN0XG4gKlxuICogQHR5cGUge09iamVjdH1cbiAqL1xuTGF5ZXJFcnJvci5wcm90b3R5cGUucmVxdWVzdCA9IG51bGw7XG5cbi8qKlxuICogQW55IGFkZGl0aW9uYWwgZGV0YWlscyBhYm91dCB0aGUgZXJyb3Igc2VudCBhcyBhZGRpdGlvbmFsIHByb3BlcnRpZXMuXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG5MYXllckVycm9yLnByb3RvdHlwZS5kYXRhID0gbnVsbDtcblxuLyoqXG4gKiBQb2ludGVyIHRvIHRoZSB4aHIgb2JqZWN0IHRoYXQgZmlyZWQgdGhlIGFjdHVhbCByZXF1ZXN0IGFuZCBjb250YWlucyB0aGUgcmVzcG9uc2UuXG4gKiBAdHlwZSB7WE1MSHR0cFJlcXVlc3R9XG4gKi9cbkxheWVyRXJyb3IucHJvdG90eXBlLnhociA9IG51bGw7XG5cbi8qKlxuICogRGljdGlvbmFyeSBvZiBlcnJvciBtZXNzYWdlc1xuICogQHByb3BlcnR5IHtPYmplY3R9IFtkaWN0aW9uYXJ5PXt9XVxuICovXG5MYXllckVycm9yLmRpY3Rpb25hcnkgPSB7XG4gIGFwcElkTWlzc2luZzogJ1Byb3BlcnR5IG1pc3Npbmc6IGFwcElkIGlzIHJlcXVpcmVkJyxcbiAgaWRlbnRpdHlUb2tlbk1pc3Npbmc6ICdJZGVudGl0eSBUb2tlbiBtaXNzaW5nOiBhbnN3ZXJBdXRoZW50aWNhdGlvbkNoYWxsZW5nZSByZXF1aXJlcyBhbiBpZGVudGl0eSB0b2tlbicsXG4gIHNlc3Npb25Ub2tlbk1pc3Npbmc6ICdTZXNzaW9uIFRva2VuIG1pc3Npbmc6IF9hdXRoQ29tcGxldGUgcmVxdWlyZXMgYSB7c2Vzc2lvbl90b2tlbjogdmFsdWV9IGlucHV0JyxcbiAgY2xpZW50TWlzc2luZzogJ1Byb3BlcnR5IG1pc3Npbmc6IGNsaWVudCBpcyByZXF1aXJlZCcsXG4gIGNvbnZlcnNhdGlvbk1pc3Npbmc6ICdQcm9wZXJ0eSBtaXNzaW5nOiBjb252ZXJzYXRpb24gaXMgcmVxdWlyZWQnLFxuICBwYXJ0c01pc3Npbmc6ICdQcm9wZXJ0eSBtaXNzaW5nOiBwYXJ0cyBpcyByZXF1aXJlZCcsXG4gIG1vcmVQYXJ0aWNpcGFudHNSZXF1aXJlZDogJ0NvbnZlcnNhdGlvbiBuZWVkcyBwYXJ0aWNpcGFudHMgb3RoZXIgdGhhbiB0aGUgY3VycmVudCB1c2VyJyxcbiAgaXNEZXN0cm95ZWQ6ICdPYmplY3QgaXMgZGVzdHJveWVkJyxcbiAgdXJsUmVxdWlyZWQ6ICdPYmplY3QgbmVlZHMgYSB1cmwgcHJvcGVydHknLFxuICBpbnZhbGlkVXJsOiAnVVJMIGlzIGludmFsaWQnLFxuICBpbnZhbGlkSWQ6ICdJZGVudGlmaWVyIGlzIGludmFsaWQnLFxuICBpZFBhcmFtUmVxdWlyZWQ6ICdUaGUgSUQgUGFyYW1ldGVyIGlzIHJlcXVpcmVkJyxcbiAgd3JvbmdDbGFzczogJ1BhcmFtZXRlciBjbGFzcyBlcnJvcjsgc2hvdWxkIGJlOiAnLFxuICBpblByb2dyZXNzOiAnT3BlcmF0aW9uIGFscmVhZHkgaW4gcHJvZ3Jlc3MnLFxuICBjYW50Q2hhbmdlSWZDb25uZWN0ZWQ6ICdZb3UgY2FuIG5vdCBjaGFuZ2UgdmFsdWUgYWZ0ZXIgY29ubmVjdGluZycsXG4gIGFscmVhZHlTZW50OiAnQWxyZWFkeSBzZW50IG9yIHNlbmRpbmcnLFxuICBjb250ZW50UmVxdWlyZWQ6ICdNZXNzYWdlUGFydCByZXF1aXJlcyByaWNoIGNvbnRlbnQgZm9yIHRoaXMgY2FsbCcsXG4gIGFscmVhZHlEZXN0cm95ZWQ6ICdUaGlzIG9iamVjdCBoYXMgYWxyZWFkeSBiZWVuIGRlc3Ryb3llZCcsXG4gIGRlbGV0aW9uTW9kZVVuc3VwcG9ydGVkOiAnQ2FsbCB0byBkZWxldGlvbiB3YXMgbWFkZSB3aXRoIGFuIHVuc3VwcG9ydGVkIGRlbGV0aW9uIG1vZGUnLFxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBMYXllckVycm9yO1xuIl19
