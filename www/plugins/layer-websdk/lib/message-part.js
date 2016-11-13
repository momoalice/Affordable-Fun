'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * The MessagePart class represents an element of a message.
 *
 *      // Create a Message Part with any mimeType
 *      var part = new layer.MessagePart({
 *          body: "hello",
 *          mimeType: "text/plain"
 *      });
 *
 *      // Create a text/plain only Message Part
 *      var part = new layer.MessagePart("Hello I am text/plain");
 *
 * You can also create a Message Part from a File Input dom node:
 *
 *      var fileInputNode = document.getElementById("myFileInput");
 *      var part = new layer.MessagePart(fileInputNode.files[0]);
 *
 * You can also create Message Parts from a file drag and drop operation:
 *
 *      onFileDrop: function(evt) {
 *           var files = evt.dataTransfer.files;
 *           var m = conversation.createMessage({
 *               parts: files.map(function(file) {
 *                  return new layer.MessagePart({body: file, mimeType: file.type});
 *               }
 *           });
 *      });
 *
 * You can also use base64 encoded data:
 *
 *      var part = new layer.MessagePart({
 *          encoding: 'base64',
 *          mimeType: 'image/png',
 *          body: 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAECElEQVR4Xu2ZO44TURREa0SAWBASKST8xCdDQMAq+OyAzw4ISfmLDBASISERi2ADEICEWrKlkYWny6+77fuqalJfz0zVOXNfv/ER8mXdwJF1+oRHBDCXIAJEAPMGzONnA0QA8wbM42cDRADzBszjZwNEAPMGzONnA0QA8wbM42cDRADzBszjZwNEAPMGzONnA0QA8wbM42cDRADzBszjZwNEAPMGzONnA0QA8wbM42cDRADzBszjZwNEAPMGzONnA0QA8wbM42cDRADzBszjZwNEAPMGzONnA0QA8wbM42cDRADzBszjZwNEAPMGzONnA0QA8waWjX8OwHcAv5f9Me3fPRugvbuxd14C8B7AVwA3q0oQAcYwtr2+hn969faPVSWIAG2AT3rXJvz17CcAN6ptgggwrwDb4JeVIALMJ8AY/JISRIB5BGDhr3/aZwDXKxwHEWC6AJcBvAOwfuBjvuNfABcBfGGGl5yJANPabYV/B8DLaT96nndHgPYeu4c/RI8AbQJIwO9FgDMAfrVxWuRdMvB7EOA+gHsALgD4uQjO3b6pFPzqAjwA8HTF5weA8weWQA5+ZQGOw1//jR5SAkn4VQV4CODJls18CAmuAHjbcM8vc9U76ZSrdgt4BODxyLG8Twla4P8BcLfKPX/sEaeSAAz8fR4H8vArHQHXAHwYs3Xj9SU3gQX8SgKcAvBitTp38WAJCWzgVxJg+F0qSGAFv5oAh5bADn5FAQ4lwVUAb3a86nX1tL/tXK10Czj+O+7zOLCFX3UDrEXYhwTW8KsLsPRx0Ap/+A/fq12uKpVnqx4BSx8Hgb9quAcB5t4EgX/sz6sXAeaSIPA3zqOeBJgqwTMAzxuuelJn/ubzSG8CTJFg12ex4Z4vDb+HW8A2aK1XRFYCC/g9C7DkJrCB37sAS0hgBV9BgDklGODfBvCaPScU5np8CPxf71OfCSzhq2yAqZ8d2MJXE6DlOLCGryjALhLYw1cVgJEg8Dv7MKjlgXvbg2Hgd/ph0BwSBH7nHwZNkeCW4z1/rDCV/wOM5RyOg7MAvo0Nur3uIoAbVzpvBKCr0hyMAJpc6VQRgK5KczACaHKlU0UAuirNwQigyZVOFQHoqjQHI4AmVzpVBKCr0hyMAJpc6VQRgK5KczACaHKlU0UAuirNwQigyZVOFQHoqjQHI4AmVzpVBKCr0hyMAJpc6VQRgK5KczACaHKlU0UAuirNwQigyZVOFQHoqjQHI4AmVzpVBKCr0hyMAJpc6VQRgK5KczACaHKlU0UAuirNwQigyZVOFQHoqjQHI4AmVzpVBKCr0hyMAJpc6VQRgK5KczACaHKlU0UAuirNwQigyZVOFQHoqjQHI4AmVzpVBKCr0hz8BzIXtYE3VcPnAAAAAElFTkSuQmCC'
 *      });
 *
 * ### Accesing Rich Content
 *
 * There are two ways of accessing rich content
 *
 * 1. Access the data directly: `part.fetchContent(function(data) {myRenderData(data);})`. This approach downloads the data,
 *    writes it to the the `body` property, writes a Data URI to the part's `url` property, and then calls your callback.
 *    By downloading the data and storing it in `body`, the data does not expire.
 * 2. Access the URL rather than the data: `part.fetchStream(callback)`.  URLs are needed for streaming, and for content that doesn't
 *    yet need to be rendered (hyperlinks to data that will render when clicked).  These URLs expire.  The url property will return a
 *    string if the url is valid, or '' if its expired and fetchStream must be called to update the url.
 *    The following pattern is recommended:
 *
 *        if (!part.url) {
 *          part.fetchStream(function(url) {myRenderUrl(url)});
 *        } else {
 *          myRenderUrl(part.url);
 *        }
 *
 * NOTE: `layer.MessagePart.url` should have a value when the message is first received, and will only fail `if (!part.url)` once the url has expired.
 *
 * @class  layer.MessagePart
 * @extends layer.Root
 * @author Michael Kantor
 */

var Root = require('./root');
var Content = require('./content');
var xhr = require('./xhr');
var ClientRegistry = require('./client-registry');
var LayerError = require('./layer-error');
var HasBlob = typeof Blob !== 'undefined';

/* istanbul ignore next */
var LocalFileReader = typeof window === 'undefined' ? require('filereader') : FileReader;

var MessagePart = function (_Root) {
  _inherits(MessagePart, _Root);

  /**
   * Constructor
   *
   * @method constructor
   * @param  {Object} options - Can be an object with body and mimeType, or it can be a string, or a Blob/File
   * @param  {string} options.body - To send binary, use base64 encoded string
   * @param  {string} [options.mimeType=text/plain] - Mime type; can be anything; if your client doesn't have a renderer for it, it will be ignored.
   * @param  {string} [options.encoding=] - Encoding for your MessagePart; use 'base64' if the body is a base64 string; else leave blank.
   * @param  {number} [options.size=0] - Size of your part. Will be calculated for you if not provided.
   *
   * @return {layer.MessagePart}
   */

  function MessagePart(options) {
    _classCallCheck(this, MessagePart);

    var newOptions = options;
    if (typeof options === 'string') {
      newOptions = { body: options };
      if (arguments.length - 1 > 0) {
        newOptions.mimeType = arguments.length <= 1 ? undefined : arguments[1];
      } else {
        newOptions.mimeType = 'text/plain';
      }
    } else if (HasBlob && (options instanceof Blob || options.body instanceof Blob)) {
      var bodyBlob = options instanceof Blob ? options : options.body;
      newOptions = {
        mimeType: bodyBlob.type,
        body: bodyBlob,
        size: bodyBlob.size,
        hasContent: true
      };
    }

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(MessagePart).call(this, newOptions));

    if (!_this.size && _this.body) _this.size = _this.body.length;
    if (HasBlob && _this.body instanceof Blob) {
      _this.url = URL.createObjectURL(_this.body);
    }
    return _this;
  }

  _createClass(MessagePart, [{
    key: 'destroy',
    value: function destroy() {
      if (this.__url) {
        URL.revokeObjectURL(this.__url);
        this.__url = null;
      }
      this.body = null;
      _get(Object.getPrototypeOf(MessagePart.prototype), 'destroy', this).call(this);
    }

    /**
     * Get the layer.Client associated with this layer.MessagePart.
     *
     * Uses the layer.MessagePart.clientId property.
     *
     * @method _getClient
     * @private
     * @return {layer.Client}
     */

  }, {
    key: '_getClient',
    value: function _getClient() {
      return ClientRegistry.get(this.clientId);
    }

    /**
     * Get the layer.Message associated with this layer.MessagePart.
     *
     * @method _getMessage
     * @private
     * @return {layer.Message}
     */

  }, {
    key: '_getMessage',
    value: function _getMessage() {
      return this._getClient().getMessage(this.id.replace(/\/parts.*$/, ''));
    }

    /**
     * Download Rich Content from cloud server.
     *
     * For MessageParts with rich content, will load the data from google's cloud storage.
     * The body property of this MessagePart is set to the result.
     *
     *      messagepart.fetchContent()
     *      .on("content-loaded", function() {
     *          render(messagepart.body);
     *      });
     *
     * @method fetchContent
     * @param {Function} [callback]
     * @param {Mixed} callback.data - Either a string (mimeType=text/plain) or a Blob (all other mimeTypes)
     */

  }, {
    key: 'fetchContent',
    value: function fetchContent(callback) {
      var _this2 = this;

      if (this._content && !this.isFiring) {
        this.isFiring = true;
        var type = this.mimeType === 'image/jpeg+preview' ? 'image/jpeg' : this.mimeType;
        this._content.loadContent(type, function (err, result) {
          return _this2._fetchContentCallback(err, result, callback);
        });
      }
      return this;
    }
  }, {
    key: '_fetchContentCallback',
    value: function _fetchContentCallback(err, result, callback) {
      var _this3 = this;

      if (err) {
        this.trigger('content-loaded-error', err);
      } else {
        this.url = URL.createObjectURL(result);
        this.isFiring = false;
        if (this.mimeType === 'text/plain') {
          (function () {
            var reader = new LocalFileReader();
            reader.addEventListener('loadend', function () {
              _this3._fetchContentComplete(reader.result, callback);
            });
            reader.readAsText(result);
          })();
        } else {
          this._fetchContentComplete(result, callback);
        }
      }
    }
  }, {
    key: '_fetchContentComplete',
    value: function _fetchContentComplete(body, callback) {
      var message = this._getMessage();

      this.body = body;

      this.trigger('content-loaded');
      message._triggerAsync('messages:change', {
        oldValue: message.parts,
        newValue: message.parts,
        property: 'parts'
      });
      if (callback) callback(this.body);
    }

    /**
     * Access the URL to the remote resource.
     *
     * For MessageParts with Rich Content, will lookup a URL to your Rich Content.
     * Useful for streaming and content so that you don't have to download the entire file before rendering it.
     *
     *      messagepart.fetchStream(function(url) {
     *          render(url);
     *      });
     *
     * @method fetchStream
     * @param {Function} [callback]
     * @param {Mixed} callback.url
     */

  }, {
    key: 'fetchStream',
    value: function fetchStream(callback) {
      var _this4 = this;

      if (!this._content) throw new Error(LayerError.dictionary.contentRequired);
      if (this._content.isExpired()) {
        this._content.refreshContent(this._getClient(), function (url) {
          return _this4._fetchStreamComplete(url, callback);
        });
      } else {
        this._fetchStreamComplete(this._content.downloadUrl, callback);
      }
    }

    // Does not set this.url; instead relies on fact that this._content.downloadUrl has been updated

  }, {
    key: '_fetchStreamComplete',
    value: function _fetchStreamComplete(url, callback) {
      var message = this._getMessage();

      this.trigger('url-loaded');
      message._triggerAsync('messages:change', {
        oldValue: message.parts,
        newValue: message.parts,
        property: 'parts'
      });
      if (callback) callback(url);
    }

    /**
     * Preps a MessagePart for sending.  Normally that is trivial.
     * But if there is rich content, then the content must be uploaded
     * and then we can trigger a "parts:send" event indicating that
     * the part is ready to send.
     *
     * @method _send
     * @protected
     * @param  {layer.Client} client
     * @fires parts:send
     */

  }, {
    key: '_send',
    value: function _send(client) {
      // There is already a Content object, presumably the developer
      // already took care of this step for us.
      if (this._content) {
        this._sendWithContent();
      }

      // If the size is large, Create and upload the Content
      if (this.size > 2048) {
        this._generateContentAndSend(client);
      }

      // If the body is a blob either base64 encode it
      else if (typeof Blob !== 'undefined' && this.body instanceof Blob) {
          this._sendBlob(client);
        }

        // Else the message part can be sent as is.
        else {
            this._sendBody();
          }
    }
  }, {
    key: '_sendBody',
    value: function _sendBody() {
      var obj = {
        mime_type: this.mimeType,
        body: this.body
      };
      if (this.encoding) obj.encoding = this.encoding;
      this.trigger('parts:send', obj);
    }
  }, {
    key: '_sendWithContent',
    value: function _sendWithContent() {
      this.trigger('parts:send', {
        mime_type: this.mimeType,
        content: {
          size: this.size,
          id: this._content.id
        }
      });
    }
  }, {
    key: '_sendBlob',
    value: function _sendBlob(client) {
      var _this5 = this;

      /* istanbul ignore else */
      var reader = new LocalFileReader();
      reader.onloadend = function () {
        var base64data = reader.result;
        if (base64data.length < 2048) {
          _this5.body = base64data;
          _this5.body = _this5.body.substring(_this5.body.indexOf(',') + 1);
          _this5.encoding = 'base64';
          _this5._sendBody(client);
        } else {
          _this5._generateContentAndSend(client);
        }
      };
      reader.readAsDataURL(this.body); // encodes to base64
    }

    /**
     * Create an rich Content object on the server
     * and then call _processContentResponse
     *
     * @method _generateContentAndSend
     * @private
     * @param  {layer.Client} client
     */

  }, {
    key: '_generateContentAndSend',
    value: function _generateContentAndSend(client) {
      var _this6 = this;

      this.hasContent = true;
      client.xhr({
        url: '/content',
        method: 'POST',
        headers: {
          'Upload-Content-Type': this.mimeType,
          'Upload-Content-Length': this.size,
          'Upload-Origin': typeof location !== 'undefined' ? location.origin : ''
        },
        sync: {}
      }, function (result) {
        _this6._processContentResponse(result.data, client);
      });
    }

    /**
     * Creates a layer.Content object from the server's
     * Content object, and then uploads the data to google cloud storage.
     *
     * @method _processContentResponse
     * @private
     * @param  {Object} response
     * @param  {layer.Client} client
     */

  }, {
    key: '_processContentResponse',
    value: function _processContentResponse(response, client) {
      var _this7 = this;

      this._content = new Content(response.id);
      this.hasContent = true;
      xhr({
        url: response.upload_url,
        method: 'PUT',
        data: this.body,
        headers: {
          'Upload-Content-Length': this.size,
          'Upload-Content-Type': this.mimeType
        }
      }, function (result) {
        return _this7._processContentUploadResponse(result, response, client);
      });
    }
  }, {
    key: '_processContentUploadResponse',
    value: function _processContentUploadResponse(uploadResult, contentResponse, client) {
      if (!uploadResult.success) {
        if (!client.onlineManager.isOnline) {
          client.onlineManager.once('connected', this._processContentResponse.bind(this, contentResponse, client), this);
        } else {
          console.error('We don\'t yet handle this!');
        }
      } else {
        this.trigger('parts:send', {
          mime_type: this.mimeType,
          content: {
            size: this.size,
            id: this._content.id
          }
        });
      }
    }

    /**
     * Returns the text for any text/plain part.
     *
     * Returns '' if its not a text/plain part.
     *
     * @method getText
     * @return {string}
     */

  }, {
    key: 'getText',
    value: function getText() {
      if (this.mimeType === 'text/plain') {
        return this.body;
      } else {
        return '';
      }
    }

    /**
     * Updates the MessagePart with new data from the server.
     *
     * Currently, MessagePart properties do not update... however,
     * the layer.Content object that Rich Content MessageParts contain
     * do get updated with refreshed expiring urls.
     *
     * @method _populateFromServer
     * @param  {Object} part - Server representation of a part
     * @private
     */

  }, {
    key: '_populateFromServer',
    value: function _populateFromServer(part) {
      if (part.content && this._content) {
        this._content.downloadUrl = part.content.download_url;
        this._content.expiration = new Date(part.content.expiration);
      }
    }

    /**
     * Creates a MessagePart from a server representation of the part
     *
     * @method _createFromServer
     * @private
     * @static
     * @param  {Object} part - Server representation of a part
     */

  }], [{
    key: '_createFromServer',
    value: function _createFromServer(part) {
      var content = part.content ? Content._createFromServer(part.content) : null;

      return new MessagePart({
        id: part.id,
        mimeType: part.mime_type,
        body: part.body || '',
        _content: content,
        hasContent: Boolean(content),
        size: part.size || 0,
        encoding: part.encoding || ''
      });
    }
  }]);

  return MessagePart;
}(Root);

/**
 * layer.Client that the conversation belongs to.
 *
 * Actual value of this string matches the appId.
 * @type {string}
 */


MessagePart.prototype.clientId = '';

/**
 * Server generated identifier for the part
 * @type {string}
 */
MessagePart.prototype.id = '';

/**
 * Body of your message part.
 *
 * This is the core data of your part.
 * @type {string}
 */
MessagePart.prototype.body = null;

/**
 * Rich content object.
 *
 * This will be automatically created for you if your layer.MessagePart.body
 * is large.
 * @type {layer.Content}
 * @private
 */
MessagePart.prototype._content = null;

/**
 * The Part has rich content
 * @type {Boolean}
 */
MessagePart.prototype.hasContent = false;

/**
 * URL to rich content object.
 *
 * Parts with rich content will be initialized with this property set.  But its value will expire.
 *
 * Will contain an expiring url at initialization time and be refreshed with calls to `layer.MessagePart.fetchStream()`.
 * Will contain a non-expiring url to a local resource if `layer.MessagePart.fetchContent()` is called.
 *
 * @type {layer.Content}
 */
Object.defineProperty(MessagePart.prototype, 'url', {
  enumerable: true,
  get: function get() {
    // Its possible to have a url and no content if it has been instantiated but not yet sent.
    // If there is a __url then its a local url generated from the body property and does not expire.
    if (this.__url) return this.__url;
    if (this._content) return this._content.isExpired() ? '' : this._content.downloadUrl;
    return '';
  },
  set: function set(inValue) {
    this.__url = inValue;
  }
});

/**
 * Mime Type for the data in layer.MessagePart.body.
 *
 * @type {String}
 */
MessagePart.prototype.mimeType = 'text/plain';

/**
 * Encoding used for the body of this part.
 *
 * No value is the default encoding.  'base64' is also a common value.
 * @type {String}
 */
MessagePart.prototype.encoding = '';

/**
 * Size of the layer.MessagePart.body.
 *
 * Will be set for you if not provided.
 * Only needed for use with rich content.
 *
 * @type {number}
 */
MessagePart.prototype.size = 0;

MessagePart._supportedEvents = ['parts:send', 'content-loaded', 'url-loaded', 'content-loaded-error'].concat(Root._supportedEvents);
Root.initClass.apply(MessagePart, [MessagePart, 'MessagePart']);

module.exports = MessagePart;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tZXNzYWdlLXBhcnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQTZEQSxJQUFNLE9BQU8sUUFBUSxRQUFSLENBQVA7QUFDTixJQUFNLFVBQVUsUUFBUSxXQUFSLENBQVY7QUFDTixJQUFNLE1BQU0sUUFBUSxPQUFSLENBQU47QUFDTixJQUFNLGlCQUFpQixRQUFRLG1CQUFSLENBQWpCO0FBQ04sSUFBTSxhQUFhLFFBQVEsZUFBUixDQUFiO0FBQ04sSUFBTSxVQUFVLE9BQU8sSUFBUCxLQUFnQixXQUFoQjs7O0FBR2hCLElBQU0sa0JBQWtCLE9BQU8sTUFBUCxLQUFrQixXQUFsQixHQUFnQyxRQUFRLFlBQVIsQ0FBaEMsR0FBd0QsVUFBeEQ7O0lBR2xCOzs7Ozs7Ozs7Ozs7Ozs7O0FBY0osV0FkSSxXQWNKLENBQVksT0FBWixFQUE4QjswQkFkMUIsYUFjMEI7O0FBQzVCLFFBQUksYUFBYSxPQUFiLENBRHdCO0FBRTVCLFFBQUksT0FBTyxPQUFQLEtBQW1CLFFBQW5CLEVBQTZCO0FBQy9CLG1CQUFhLEVBQUUsTUFBTSxPQUFOLEVBQWYsQ0FEK0I7QUFFL0IsVUFBSSx1QkFBYyxDQUFkLEVBQWlCO0FBQ25CLG1CQUFXLFFBQVgsb0RBRG1CO09BQXJCLE1BRU87QUFDTCxtQkFBVyxRQUFYLEdBQXNCLFlBQXRCLENBREs7T0FGUDtLQUZGLE1BT08sSUFBSSxZQUFZLG1CQUFtQixJQUFuQixJQUEyQixRQUFRLElBQVIsWUFBd0IsSUFBeEIsQ0FBdkMsRUFBc0U7QUFDL0UsVUFBTSxXQUFXLG1CQUFtQixJQUFuQixHQUEwQixPQUExQixHQUFvQyxRQUFRLElBQVIsQ0FEMEI7QUFFL0UsbUJBQWE7QUFDWCxrQkFBVSxTQUFTLElBQVQ7QUFDVixjQUFNLFFBQU47QUFDQSxjQUFNLFNBQVMsSUFBVDtBQUNOLG9CQUFZ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RUFBdUIsS0FBN0MsRUFBb0Q7QUFDbEQsY0FBWSxJQUFaO0FBQ0EsT0FBSyxTQUFTLEdBQVQsR0FBZTs7O0FBR2xCLFFBQUksS0FBSyxLQUFMLEVBQVksT0FBTyxLQUFLLEtBQUwsQ0FBdkI7QUFDQSxRQUFJLEtBQUssUUFBTCxFQUFlLE9BQU8sS0FBSyxRQUFMLENBQWMsU0FBZCxLQUE0QixFQUE1QixHQUFpQyxLQUFLLFFBQUwsQ0FBYyxXQUFkLENBQTNEO0FBQ0EsV0FBTyxFQUFQLENBTGtCO0dBQWY7QUFPTCxPQUFLLFNBQVMsR0FBVCxDQUFhLE9BQWIsRUFBc0I7QUFDekIsU0FBSyxLQUFMLEdBQWEsT0FBYixDQUR5QjtHQUF0QjtDQVRQOzs7Ozs7O0FBbUJBLFlBQVksU0FBWixDQUFzQixRQUF0QixHQUFpQyxZQUFqQzs7Ozs7Ozs7QUFRQSxZQUFZLFNBQVosQ0FBc0IsUUFBdEIsR0FBaUMsRUFBakM7Ozs7Ozs7Ozs7QUFVQSxZQUFZLFNBQVosQ0FBc0IsSUFBdEIsR0FBNkIsQ0FBN0I7O0FBRUEsWUFBWSxnQkFBWixHQUErQixDQUM3QixZQUQ2QixFQUU3QixnQkFGNkIsRUFHN0IsWUFINkIsRUFJN0Isc0JBSjZCLEVBSzdCLE1BTDZCLENBS3RCLEtBQUssZ0JBQUwsQ0FMVDtBQU1BLEtBQUssU0FBTCxDQUFlLEtBQWYsQ0FBcUIsV0FBckIsRUFBa0MsQ0FBQyxXQUFELEVBQWMsYUFBZCxDQUFsQzs7QUFFQSxPQUFPLE9BQVAsR0FBaUIsV0FBakIiLCJmaWxlIjoibWVzc2FnZS1wYXJ0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBUaGUgTWVzc2FnZVBhcnQgY2xhc3MgcmVwcmVzZW50cyBhbiBlbGVtZW50IG9mIGEgbWVzc2FnZS5cbiAqXG4gKiAgICAgIC8vIENyZWF0ZSBhIE1lc3NhZ2UgUGFydCB3aXRoIGFueSBtaW1lVHlwZVxuICogICAgICB2YXIgcGFydCA9IG5ldyBsYXllci5NZXNzYWdlUGFydCh7XG4gKiAgICAgICAgICBib2R5OiBcImhlbGxvXCIsXG4gKiAgICAgICAgICBtaW1lVHlwZTogXCJ0ZXh0L3BsYWluXCJcbiAqICAgICAgfSk7XG4gKlxuICogICAgICAvLyBDcmVhdGUgYSB0ZXh0L3BsYWluIG9ubHkgTWVzc2FnZSBQYXJ0XG4gKiAgICAgIHZhciBwYXJ0ID0gbmV3IGxheWVyLk1lc3NhZ2VQYXJ0KFwiSGVsbG8gSSBhbSB0ZXh0L3BsYWluXCIpO1xuICpcbiAqIFlvdSBjYW4gYWxzbyBjcmVhdGUgYSBNZXNzYWdlIFBhcnQgZnJvbSBhIEZpbGUgSW5wdXQgZG9tIG5vZGU6XG4gKlxuICogICAgICB2YXIgZmlsZUlucHV0Tm9kZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibXlGaWxlSW5wdXRcIik7XG4gKiAgICAgIHZhciBwYXJ0ID0gbmV3IGxheWVyLk1lc3NhZ2VQYXJ0KGZpbGVJbnB1dE5vZGUuZmlsZXNbMF0pO1xuICpcbiAqIFlvdSBjYW4gYWxzbyBjcmVhdGUgTWVzc2FnZSBQYXJ0cyBmcm9tIGEgZmlsZSBkcmFnIGFuZCBkcm9wIG9wZXJhdGlvbjpcbiAqXG4gKiAgICAgIG9uRmlsZURyb3A6IGZ1bmN0aW9uKGV2dCkge1xuICogICAgICAgICAgIHZhciBmaWxlcyA9IGV2dC5kYXRhVHJhbnNmZXIuZmlsZXM7XG4gKiAgICAgICAgICAgdmFyIG0gPSBjb252ZXJzYXRpb24uY3JlYXRlTWVzc2FnZSh7XG4gKiAgICAgICAgICAgICAgIHBhcnRzOiBmaWxlcy5tYXAoZnVuY3Rpb24oZmlsZSkge1xuICogICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IGxheWVyLk1lc3NhZ2VQYXJ0KHtib2R5OiBmaWxlLCBtaW1lVHlwZTogZmlsZS50eXBlfSk7XG4gKiAgICAgICAgICAgICAgIH1cbiAqICAgICAgICAgICB9KTtcbiAqICAgICAgfSk7XG4gKlxuICogWW91IGNhbiBhbHNvIHVzZSBiYXNlNjQgZW5jb2RlZCBkYXRhOlxuICpcbiAqICAgICAgdmFyIHBhcnQgPSBuZXcgbGF5ZXIuTWVzc2FnZVBhcnQoe1xuICogICAgICAgICAgZW5jb2Rpbmc6ICdiYXNlNjQnLFxuICogICAgICAgICAgbWltZVR5cGU6ICdpbWFnZS9wbmcnLFxuICogICAgICAgICAgYm9keTogJ2lWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFJQUFBQUNBQ0FZQUFBRERQbUhMQUFBRUNFbEVRVlI0WHUyWk80NFRVUlJFYTBTQVdCQVNLU1Q4eENkRFFNQXErT3lBenc0SVNmbUxEQkFTSVNFUmkyQURFSUNFV3JLbGtZV255Nis3N2Z1cWFsSmZ6MHpWT1hOZnYvRVI4bVhkd0pGMStvUkhCRENYSUFKRUFQTUd6T05uQTBRQTh3Yk00MmNEUkFEekJzempad05FQVBNR3pPTm5BMFFBOHdiTTQyY0RSQUR6QnN6alp3TkVBUE1Hek9ObkEwUUE4d2JNNDJjRFJBRHpCc3pqWndORUFQTUd6T05uQTBRQTh3Yk00MmNEUkFEekJzempad05FQVBNR3pPTm5BMFFBOHdiTTQyY0RSQUR6QnN6alp3TkVBUE1Hek9ObkEwUUE4d2JNNDJjRFJBRHpCc3pqWndORUFQTUd6T05uQTBRQTh3YVdqWDhPd0hjQXY1ZjlNZTNmUFJ1Z3ZidXhkMTRDOEI3QVZ3QTNxMG9RQWNZd3RyMitobjk2OWZhUFZTV0lBRzJBVDNyWEp2ejE3Q2NBTjZwdGdnZ3dyd0RiNEplVklBTE1KOEFZL0pJU1JJQjVCR0RocjMvYVp3RFhLeHdIRVdDNkFKY0J2QU93ZnVCanZ1TmZBQmNCZkdHR2w1eUpBTlBhYllWL0I4RExhVDk2bm5kSGdQWWV1NGMvUkk4QWJRSkl3TzlGZ0RNQWZyVnhXdVJkTXZCN0VPQStnSHNBTGdENHVRak8zYjZwRlB6cUFqd0E4SFRGNXdlQTh3ZVdRQTUrWlFHT3cxLy9qUjVTQWtuNFZRVjRDT0RKbHMxOENBbXVBSGpiY004dmM5VTc2WlNyZGd0NEJPRHh5TEc4VHdsYTRQOEJjTGZLUFgvc0VhZVNBQXo4ZlI0SDh2QXJIUUhYQUh3WXMzWGo5U1UzZ1FYOFNnS2NBdkJpdFRwMzhXQUpDV3pnVnhKZytGMHFTR0FGdjVvQWg1YkFEbjVGQVE0bHdWVUFiM2E4Nm5YMXRML3RYSzEwQ3pqK08rN3pPTENGWDNVRHJFWFlod1RXOEtzTHNQUngwQXAvK0EvZnExMnVLcFZucXg0QlN4OEhnYjlxdUFjQjV0NEVnWC9zejZzWEFlYVNJUEEzenFPZUJKZ3F3VE1Benh1dWVsSm4vdWJ6U0c4Q1RKRmcxMmV4NFo0dkRiK0hXOEEyYUsxWFJGWUNDL2c5QzdEa0pyQ0IzN3NBUzBoZ0JWOUJnRGtsR09EZkJ2Q2FQU2NVNW5wOENQeGY3MU9mQ1N6aHEyeUFxWjhkMk1KWEU2RGxPTENHcnlqQUxoTFl3MWNWZ0pFZzhEdjdNS2psZ1h2YmcySGdkL3BoMEJ3U0JIN25Id1pOa2VDVzR6MS9yRENWL3dPTTVSeU9nN01Bdm8wTnVyM3VJb0FiVnpwdkJLQ3IwaHlNQUpwYzZWUVJnSzVLY3pBQ2FIS2xVMFVBdWlyTndRaWd5WlZPRlFIb3FqUUhJNEFtVnpwVkJLQ3IwaHlNQUpwYzZWUVJnSzVLY3pBQ2FIS2xVMFVBdWlyTndRaWd5WlZPRlFIb3FqUUhJNEFtVnpwVkJLQ3IwaHlNQUpwYzZWUVJnSzVLY3pBQ2FIS2xVMFVBdWlyTndRaWd5WlZPRlFIb3FqUUhJNEFtVnpwVkJLQ3IwaHlNQUpwYzZWUVJnSzVLY3pBQ2FIS2xVMFVBdWlyTndRaWd5WlZPRlFIb3FqUUhJNEFtVnpwVkJLQ3IwaHlNQUpwYzZWUVJnSzVLY3pBQ2FIS2xVMFVBdWlyTndRaWd5WlZPRlFIb3FqUUhJNEFtVnpwVkJLQ3IwaHo4QnpJWHRZRTNWY1BuQUFBQUFFbEZUa1N1UW1DQydcbiAqICAgICAgfSk7XG4gKlxuICogIyMjIEFjY2VzaW5nIFJpY2ggQ29udGVudFxuICpcbiAqIFRoZXJlIGFyZSB0d28gd2F5cyBvZiBhY2Nlc3NpbmcgcmljaCBjb250ZW50XG4gKlxuICogMS4gQWNjZXNzIHRoZSBkYXRhIGRpcmVjdGx5OiBgcGFydC5mZXRjaENvbnRlbnQoZnVuY3Rpb24oZGF0YSkge215UmVuZGVyRGF0YShkYXRhKTt9KWAuIFRoaXMgYXBwcm9hY2ggZG93bmxvYWRzIHRoZSBkYXRhLFxuICogICAgd3JpdGVzIGl0IHRvIHRoZSB0aGUgYGJvZHlgIHByb3BlcnR5LCB3cml0ZXMgYSBEYXRhIFVSSSB0byB0aGUgcGFydCdzIGB1cmxgIHByb3BlcnR5LCBhbmQgdGhlbiBjYWxscyB5b3VyIGNhbGxiYWNrLlxuICogICAgQnkgZG93bmxvYWRpbmcgdGhlIGRhdGEgYW5kIHN0b3JpbmcgaXQgaW4gYGJvZHlgLCB0aGUgZGF0YSBkb2VzIG5vdCBleHBpcmUuXG4gKiAyLiBBY2Nlc3MgdGhlIFVSTCByYXRoZXIgdGhhbiB0aGUgZGF0YTogYHBhcnQuZmV0Y2hTdHJlYW0oY2FsbGJhY2spYC4gIFVSTHMgYXJlIG5lZWRlZCBmb3Igc3RyZWFtaW5nLCBhbmQgZm9yIGNvbnRlbnQgdGhhdCBkb2Vzbid0XG4gKiAgICB5ZXQgbmVlZCB0byBiZSByZW5kZXJlZCAoaHlwZXJsaW5rcyB0byBkYXRhIHRoYXQgd2lsbCByZW5kZXIgd2hlbiBjbGlja2VkKS4gIFRoZXNlIFVSTHMgZXhwaXJlLiAgVGhlIHVybCBwcm9wZXJ0eSB3aWxsIHJldHVybiBhXG4gKiAgICBzdHJpbmcgaWYgdGhlIHVybCBpcyB2YWxpZCwgb3IgJycgaWYgaXRzIGV4cGlyZWQgYW5kIGZldGNoU3RyZWFtIG11c3QgYmUgY2FsbGVkIHRvIHVwZGF0ZSB0aGUgdXJsLlxuICogICAgVGhlIGZvbGxvd2luZyBwYXR0ZXJuIGlzIHJlY29tbWVuZGVkOlxuICpcbiAqICAgICAgICBpZiAoIXBhcnQudXJsKSB7XG4gKiAgICAgICAgICBwYXJ0LmZldGNoU3RyZWFtKGZ1bmN0aW9uKHVybCkge215UmVuZGVyVXJsKHVybCl9KTtcbiAqICAgICAgICB9IGVsc2Uge1xuICogICAgICAgICAgbXlSZW5kZXJVcmwocGFydC51cmwpO1xuICogICAgICAgIH1cbiAqXG4gKiBOT1RFOiBgbGF5ZXIuTWVzc2FnZVBhcnQudXJsYCBzaG91bGQgaGF2ZSBhIHZhbHVlIHdoZW4gdGhlIG1lc3NhZ2UgaXMgZmlyc3QgcmVjZWl2ZWQsIGFuZCB3aWxsIG9ubHkgZmFpbCBgaWYgKCFwYXJ0LnVybClgIG9uY2UgdGhlIHVybCBoYXMgZXhwaXJlZC5cbiAqXG4gKiBAY2xhc3MgIGxheWVyLk1lc3NhZ2VQYXJ0XG4gKiBAZXh0ZW5kcyBsYXllci5Sb290XG4gKiBAYXV0aG9yIE1pY2hhZWwgS2FudG9yXG4gKi9cblxuY29uc3QgUm9vdCA9IHJlcXVpcmUoJy4vcm9vdCcpO1xuY29uc3QgQ29udGVudCA9IHJlcXVpcmUoJy4vY29udGVudCcpO1xuY29uc3QgeGhyID0gcmVxdWlyZSgnLi94aHInKTtcbmNvbnN0IENsaWVudFJlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9jbGllbnQtcmVnaXN0cnknKTtcbmNvbnN0IExheWVyRXJyb3IgPSByZXF1aXJlKCcuL2xheWVyLWVycm9yJyk7XG5jb25zdCBIYXNCbG9iID0gdHlwZW9mIEJsb2IgIT09ICd1bmRlZmluZWQnO1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuY29uc3QgTG9jYWxGaWxlUmVhZGVyID0gdHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyByZXF1aXJlKCdmaWxlcmVhZGVyJykgOiBGaWxlUmVhZGVyO1xuXG5cbmNsYXNzIE1lc3NhZ2VQYXJ0IGV4dGVuZHMgUm9vdCB7XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdG9yXG4gICAqXG4gICAqIEBtZXRob2QgY29uc3RydWN0b3JcbiAgICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zIC0gQ2FuIGJlIGFuIG9iamVjdCB3aXRoIGJvZHkgYW5kIG1pbWVUeXBlLCBvciBpdCBjYW4gYmUgYSBzdHJpbmcsIG9yIGEgQmxvYi9GaWxlXG4gICAqIEBwYXJhbSAge3N0cmluZ30gb3B0aW9ucy5ib2R5IC0gVG8gc2VuZCBiaW5hcnksIHVzZSBiYXNlNjQgZW5jb2RlZCBzdHJpbmdcbiAgICogQHBhcmFtICB7c3RyaW5nfSBbb3B0aW9ucy5taW1lVHlwZT10ZXh0L3BsYWluXSAtIE1pbWUgdHlwZTsgY2FuIGJlIGFueXRoaW5nOyBpZiB5b3VyIGNsaWVudCBkb2Vzbid0IGhhdmUgYSByZW5kZXJlciBmb3IgaXQsIGl0IHdpbGwgYmUgaWdub3JlZC5cbiAgICogQHBhcmFtICB7c3RyaW5nfSBbb3B0aW9ucy5lbmNvZGluZz1dIC0gRW5jb2RpbmcgZm9yIHlvdXIgTWVzc2FnZVBhcnQ7IHVzZSAnYmFzZTY0JyBpZiB0aGUgYm9keSBpcyBhIGJhc2U2NCBzdHJpbmc7IGVsc2UgbGVhdmUgYmxhbmsuXG4gICAqIEBwYXJhbSAge251bWJlcn0gW29wdGlvbnMuc2l6ZT0wXSAtIFNpemUgb2YgeW91ciBwYXJ0LiBXaWxsIGJlIGNhbGN1bGF0ZWQgZm9yIHlvdSBpZiBub3QgcHJvdmlkZWQuXG4gICAqXG4gICAqIEByZXR1cm4ge2xheWVyLk1lc3NhZ2VQYXJ0fVxuICAgKi9cbiAgY29uc3RydWN0b3Iob3B0aW9ucywgLi4uYXJncykge1xuICAgIGxldCBuZXdPcHRpb25zID0gb3B0aW9ucztcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdzdHJpbmcnKSB7XG4gICAgICBuZXdPcHRpb25zID0geyBib2R5OiBvcHRpb25zIH07XG4gICAgICBpZiAoYXJncy5sZW5ndGggPiAwKSB7XG4gICAgICAgIG5ld09wdGlvbnMubWltZVR5cGUgPSBhcmdzWzBdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV3T3B0aW9ucy5taW1lVHlwZSA9ICd0ZXh0L3BsYWluJztcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKEhhc0Jsb2IgJiYgKG9wdGlvbnMgaW5zdGFuY2VvZiBCbG9iIHx8IG9wdGlvbnMuYm9keSBpbnN0YW5jZW9mIEJsb2IpKSB7XG4gICAgICBjb25zdCBib2R5QmxvYiA9IG9wdGlvbnMgaW5zdGFuY2VvZiBCbG9iID8gb3B0aW9ucyA6IG9wdGlvbnMuYm9keTtcbiAgICAgIG5ld09wdGlvbnMgPSB7XG4gICAgICAgIG1pbWVUeXBlOiBib2R5QmxvYi50eXBlLFxuICAgICAgICBib2R5OiBib2R5QmxvYixcbiAgICAgICAgc2l6ZTogYm9keUJsb2Iuc2l6ZSxcbiAgICAgICAgaGFzQ29udGVudDogdHJ1ZSxcbiAgICAgIH07XG4gICAgfVxuICAgIHN1cGVyKG5ld09wdGlvbnMpO1xuICAgIGlmICghdGhpcy5zaXplICYmIHRoaXMuYm9keSkgdGhpcy5zaXplID0gdGhpcy5ib2R5Lmxlbmd0aDtcbiAgICBpZiAoSGFzQmxvYiAmJiB0aGlzLmJvZHkgaW5zdGFuY2VvZiBCbG9iKSB7XG4gICAgICB0aGlzLnVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwodGhpcy5ib2R5KTtcbiAgICB9XG4gIH1cblxuICBkZXN0cm95KCkge1xuICAgIGlmICh0aGlzLl9fdXJsKSB7XG4gICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHRoaXMuX191cmwpO1xuICAgICAgdGhpcy5fX3VybCA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMuYm9keSA9IG51bGw7XG4gICAgc3VwZXIuZGVzdHJveSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgbGF5ZXIuQ2xpZW50IGFzc29jaWF0ZWQgd2l0aCB0aGlzIGxheWVyLk1lc3NhZ2VQYXJ0LlxuICAgKlxuICAgKiBVc2VzIHRoZSBsYXllci5NZXNzYWdlUGFydC5jbGllbnRJZCBwcm9wZXJ0eS5cbiAgICpcbiAgICogQG1ldGhvZCBfZ2V0Q2xpZW50XG4gICAqIEBwcml2YXRlXG4gICAqIEByZXR1cm4ge2xheWVyLkNsaWVudH1cbiAgICovXG4gIF9nZXRDbGllbnQoKSB7XG4gICAgcmV0dXJuIENsaWVudFJlZ2lzdHJ5LmdldCh0aGlzLmNsaWVudElkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGxheWVyLk1lc3NhZ2UgYXNzb2NpYXRlZCB3aXRoIHRoaXMgbGF5ZXIuTWVzc2FnZVBhcnQuXG4gICAqXG4gICAqIEBtZXRob2QgX2dldE1lc3NhZ2VcbiAgICogQHByaXZhdGVcbiAgICogQHJldHVybiB7bGF5ZXIuTWVzc2FnZX1cbiAgICovXG4gIF9nZXRNZXNzYWdlKCkge1xuICAgIHJldHVybiB0aGlzLl9nZXRDbGllbnQoKS5nZXRNZXNzYWdlKHRoaXMuaWQucmVwbGFjZSgvXFwvcGFydHMuKiQvLCAnJykpO1xuICB9XG5cbiAgLyoqXG4gICAqIERvd25sb2FkIFJpY2ggQ29udGVudCBmcm9tIGNsb3VkIHNlcnZlci5cbiAgICpcbiAgICogRm9yIE1lc3NhZ2VQYXJ0cyB3aXRoIHJpY2ggY29udGVudCwgd2lsbCBsb2FkIHRoZSBkYXRhIGZyb20gZ29vZ2xlJ3MgY2xvdWQgc3RvcmFnZS5cbiAgICogVGhlIGJvZHkgcHJvcGVydHkgb2YgdGhpcyBNZXNzYWdlUGFydCBpcyBzZXQgdG8gdGhlIHJlc3VsdC5cbiAgICpcbiAgICogICAgICBtZXNzYWdlcGFydC5mZXRjaENvbnRlbnQoKVxuICAgKiAgICAgIC5vbihcImNvbnRlbnQtbG9hZGVkXCIsIGZ1bmN0aW9uKCkge1xuICAgKiAgICAgICAgICByZW5kZXIobWVzc2FnZXBhcnQuYm9keSk7XG4gICAqICAgICAgfSk7XG4gICAqXG4gICAqIEBtZXRob2QgZmV0Y2hDb250ZW50XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja11cbiAgICogQHBhcmFtIHtNaXhlZH0gY2FsbGJhY2suZGF0YSAtIEVpdGhlciBhIHN0cmluZyAobWltZVR5cGU9dGV4dC9wbGFpbikgb3IgYSBCbG9iIChhbGwgb3RoZXIgbWltZVR5cGVzKVxuICAgKi9cbiAgZmV0Y2hDb250ZW50KGNhbGxiYWNrKSB7XG4gICAgaWYgKHRoaXMuX2NvbnRlbnQgJiYgIXRoaXMuaXNGaXJpbmcpIHtcbiAgICAgIHRoaXMuaXNGaXJpbmcgPSB0cnVlO1xuICAgICAgY29uc3QgdHlwZSA9IHRoaXMubWltZVR5cGUgPT09ICdpbWFnZS9qcGVnK3ByZXZpZXcnID8gJ2ltYWdlL2pwZWcnIDogdGhpcy5taW1lVHlwZTtcbiAgICAgIHRoaXMuX2NvbnRlbnQubG9hZENvbnRlbnQodHlwZSwgKGVyciwgcmVzdWx0KSA9PiB0aGlzLl9mZXRjaENvbnRlbnRDYWxsYmFjayhlcnIsIHJlc3VsdCwgY2FsbGJhY2spKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBfZmV0Y2hDb250ZW50Q2FsbGJhY2soZXJyLCByZXN1bHQsIGNhbGxiYWNrKSB7XG4gICAgaWYgKGVycikge1xuICAgICAgdGhpcy50cmlnZ2VyKCdjb250ZW50LWxvYWRlZC1lcnJvcicsIGVycik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChyZXN1bHQpO1xuICAgICAgdGhpcy5pc0ZpcmluZyA9IGZhbHNlO1xuICAgICAgaWYgKHRoaXMubWltZVR5cGUgPT09ICd0ZXh0L3BsYWluJykge1xuICAgICAgICBjb25zdCByZWFkZXIgPSBuZXcgTG9jYWxGaWxlUmVhZGVyKCk7XG4gICAgICAgIHJlYWRlci5hZGRFdmVudExpc3RlbmVyKCdsb2FkZW5kJywgKCkgPT4ge1xuICAgICAgICAgIHRoaXMuX2ZldGNoQ29udGVudENvbXBsZXRlKHJlYWRlci5yZXN1bHQsIGNhbGxiYWNrKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJlYWRlci5yZWFkQXNUZXh0KHJlc3VsdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9mZXRjaENvbnRlbnRDb21wbGV0ZShyZXN1bHQsIGNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBfZmV0Y2hDb250ZW50Q29tcGxldGUoYm9keSwgY2FsbGJhY2spIHtcbiAgICBjb25zdCBtZXNzYWdlID0gdGhpcy5fZ2V0TWVzc2FnZSgpO1xuXG4gICAgdGhpcy5ib2R5ID0gYm9keTtcblxuICAgIHRoaXMudHJpZ2dlcignY29udGVudC1sb2FkZWQnKTtcbiAgICBtZXNzYWdlLl90cmlnZ2VyQXN5bmMoJ21lc3NhZ2VzOmNoYW5nZScsIHtcbiAgICAgIG9sZFZhbHVlOiBtZXNzYWdlLnBhcnRzLFxuICAgICAgbmV3VmFsdWU6IG1lc3NhZ2UucGFydHMsXG4gICAgICBwcm9wZXJ0eTogJ3BhcnRzJyxcbiAgICB9KTtcbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKHRoaXMuYm9keSk7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBBY2Nlc3MgdGhlIFVSTCB0byB0aGUgcmVtb3RlIHJlc291cmNlLlxuICAgKlxuICAgKiBGb3IgTWVzc2FnZVBhcnRzIHdpdGggUmljaCBDb250ZW50LCB3aWxsIGxvb2t1cCBhIFVSTCB0byB5b3VyIFJpY2ggQ29udGVudC5cbiAgICogVXNlZnVsIGZvciBzdHJlYW1pbmcgYW5kIGNvbnRlbnQgc28gdGhhdCB5b3UgZG9uJ3QgaGF2ZSB0byBkb3dubG9hZCB0aGUgZW50aXJlIGZpbGUgYmVmb3JlIHJlbmRlcmluZyBpdC5cbiAgICpcbiAgICogICAgICBtZXNzYWdlcGFydC5mZXRjaFN0cmVhbShmdW5jdGlvbih1cmwpIHtcbiAgICogICAgICAgICAgcmVuZGVyKHVybCk7XG4gICAqICAgICAgfSk7XG4gICAqXG4gICAqIEBtZXRob2QgZmV0Y2hTdHJlYW1cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXVxuICAgKiBAcGFyYW0ge01peGVkfSBjYWxsYmFjay51cmxcbiAgICovXG4gIGZldGNoU3RyZWFtKGNhbGxiYWNrKSB7XG4gICAgaWYgKCF0aGlzLl9jb250ZW50KSB0aHJvdyBuZXcgRXJyb3IoTGF5ZXJFcnJvci5kaWN0aW9uYXJ5LmNvbnRlbnRSZXF1aXJlZCk7XG4gICAgaWYgKHRoaXMuX2NvbnRlbnQuaXNFeHBpcmVkKCkpIHtcbiAgICAgIHRoaXMuX2NvbnRlbnQucmVmcmVzaENvbnRlbnQodGhpcy5fZ2V0Q2xpZW50KCksIHVybCA9PiB0aGlzLl9mZXRjaFN0cmVhbUNvbXBsZXRlKHVybCwgY2FsbGJhY2spKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZmV0Y2hTdHJlYW1Db21wbGV0ZSh0aGlzLl9jb250ZW50LmRvd25sb2FkVXJsLCBjYWxsYmFjayk7XG4gICAgfVxuICB9XG5cbiAgLy8gRG9lcyBub3Qgc2V0IHRoaXMudXJsOyBpbnN0ZWFkIHJlbGllcyBvbiBmYWN0IHRoYXQgdGhpcy5fY29udGVudC5kb3dubG9hZFVybCBoYXMgYmVlbiB1cGRhdGVkXG4gIF9mZXRjaFN0cmVhbUNvbXBsZXRlKHVybCwgY2FsbGJhY2spIHtcbiAgICBjb25zdCBtZXNzYWdlID0gdGhpcy5fZ2V0TWVzc2FnZSgpO1xuXG4gICAgdGhpcy50cmlnZ2VyKCd1cmwtbG9hZGVkJyk7XG4gICAgbWVzc2FnZS5fdHJpZ2dlckFzeW5jKCdtZXNzYWdlczpjaGFuZ2UnLCB7XG4gICAgICBvbGRWYWx1ZTogbWVzc2FnZS5wYXJ0cyxcbiAgICAgIG5ld1ZhbHVlOiBtZXNzYWdlLnBhcnRzLFxuICAgICAgcHJvcGVydHk6ICdwYXJ0cycsXG4gICAgfSk7XG4gICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayh1cmwpO1xuICB9XG5cbiAgLyoqXG4gICAqIFByZXBzIGEgTWVzc2FnZVBhcnQgZm9yIHNlbmRpbmcuICBOb3JtYWxseSB0aGF0IGlzIHRyaXZpYWwuXG4gICAqIEJ1dCBpZiB0aGVyZSBpcyByaWNoIGNvbnRlbnQsIHRoZW4gdGhlIGNvbnRlbnQgbXVzdCBiZSB1cGxvYWRlZFxuICAgKiBhbmQgdGhlbiB3ZSBjYW4gdHJpZ2dlciBhIFwicGFydHM6c2VuZFwiIGV2ZW50IGluZGljYXRpbmcgdGhhdFxuICAgKiB0aGUgcGFydCBpcyByZWFkeSB0byBzZW5kLlxuICAgKlxuICAgKiBAbWV0aG9kIF9zZW5kXG4gICAqIEBwcm90ZWN0ZWRcbiAgICogQHBhcmFtICB7bGF5ZXIuQ2xpZW50fSBjbGllbnRcbiAgICogQGZpcmVzIHBhcnRzOnNlbmRcbiAgICovXG4gIF9zZW5kKGNsaWVudCkge1xuICAgIC8vIFRoZXJlIGlzIGFscmVhZHkgYSBDb250ZW50IG9iamVjdCwgcHJlc3VtYWJseSB0aGUgZGV2ZWxvcGVyXG4gICAgLy8gYWxyZWFkeSB0b29rIGNhcmUgb2YgdGhpcyBzdGVwIGZvciB1cy5cbiAgICBpZiAodGhpcy5fY29udGVudCkge1xuICAgICAgdGhpcy5fc2VuZFdpdGhDb250ZW50KCk7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlIHNpemUgaXMgbGFyZ2UsIENyZWF0ZSBhbmQgdXBsb2FkIHRoZSBDb250ZW50XG4gICAgaWYgKHRoaXMuc2l6ZSA+IDIwNDgpIHtcbiAgICAgIHRoaXMuX2dlbmVyYXRlQ29udGVudEFuZFNlbmQoY2xpZW50KTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGUgYm9keSBpcyBhIGJsb2IgZWl0aGVyIGJhc2U2NCBlbmNvZGUgaXRcbiAgICBlbHNlIGlmICh0eXBlb2YgQmxvYiAhPT0gJ3VuZGVmaW5lZCcgJiYgdGhpcy5ib2R5IGluc3RhbmNlb2YgQmxvYikge1xuICAgICAgdGhpcy5fc2VuZEJsb2IoY2xpZW50KTtcbiAgICB9XG5cbiAgICAvLyBFbHNlIHRoZSBtZXNzYWdlIHBhcnQgY2FuIGJlIHNlbnQgYXMgaXMuXG4gICAgZWxzZSB7XG4gICAgICB0aGlzLl9zZW5kQm9keSgpO1xuICAgIH1cbiAgfVxuXG4gIF9zZW5kQm9keSgpIHtcbiAgICBjb25zdCBvYmogPSB7XG4gICAgICBtaW1lX3R5cGU6IHRoaXMubWltZVR5cGUsXG4gICAgICBib2R5OiB0aGlzLmJvZHksXG4gICAgfTtcbiAgICBpZiAodGhpcy5lbmNvZGluZykgb2JqLmVuY29kaW5nID0gdGhpcy5lbmNvZGluZztcbiAgICB0aGlzLnRyaWdnZXIoJ3BhcnRzOnNlbmQnLCBvYmopO1xuICB9XG5cbiAgX3NlbmRXaXRoQ29udGVudCgpIHtcbiAgICB0aGlzLnRyaWdnZXIoJ3BhcnRzOnNlbmQnLCB7XG4gICAgICBtaW1lX3R5cGU6IHRoaXMubWltZVR5cGUsXG4gICAgICBjb250ZW50OiB7XG4gICAgICAgIHNpemU6IHRoaXMuc2l6ZSxcbiAgICAgICAgaWQ6IHRoaXMuX2NvbnRlbnQuaWQsXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgX3NlbmRCbG9iKGNsaWVudCkge1xuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgY29uc3QgcmVhZGVyID0gbmV3IExvY2FsRmlsZVJlYWRlcigpO1xuICAgIHJlYWRlci5vbmxvYWRlbmQgPSAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlNjRkYXRhID0gcmVhZGVyLnJlc3VsdDtcbiAgICAgIGlmIChiYXNlNjRkYXRhLmxlbmd0aCA8IDIwNDgpIHtcbiAgICAgICAgdGhpcy5ib2R5ID0gYmFzZTY0ZGF0YTtcbiAgICAgICAgdGhpcy5ib2R5ID0gdGhpcy5ib2R5LnN1YnN0cmluZyh0aGlzLmJvZHkuaW5kZXhPZignLCcpICsgMSk7XG4gICAgICAgIHRoaXMuZW5jb2RpbmcgPSAnYmFzZTY0JztcbiAgICAgICAgdGhpcy5fc2VuZEJvZHkoY2xpZW50KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2dlbmVyYXRlQ29udGVudEFuZFNlbmQoY2xpZW50KTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHJlYWRlci5yZWFkQXNEYXRhVVJMKHRoaXMuYm9keSk7IC8vIGVuY29kZXMgdG8gYmFzZTY0XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGFuIHJpY2ggQ29udGVudCBvYmplY3Qgb24gdGhlIHNlcnZlclxuICAgKiBhbmQgdGhlbiBjYWxsIF9wcm9jZXNzQ29udGVudFJlc3BvbnNlXG4gICAqXG4gICAqIEBtZXRob2QgX2dlbmVyYXRlQ29udGVudEFuZFNlbmRcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtICB7bGF5ZXIuQ2xpZW50fSBjbGllbnRcbiAgICovXG4gIF9nZW5lcmF0ZUNvbnRlbnRBbmRTZW5kKGNsaWVudCkge1xuICAgIHRoaXMuaGFzQ29udGVudCA9IHRydWU7XG4gICAgY2xpZW50Lnhocih7XG4gICAgICB1cmw6ICcvY29udGVudCcsXG4gICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ1VwbG9hZC1Db250ZW50LVR5cGUnOiB0aGlzLm1pbWVUeXBlLFxuICAgICAgICAnVXBsb2FkLUNvbnRlbnQtTGVuZ3RoJzogdGhpcy5zaXplLFxuICAgICAgICAnVXBsb2FkLU9yaWdpbic6IHR5cGVvZiBsb2NhdGlvbiAhPT0gJ3VuZGVmaW5lZCcgPyBsb2NhdGlvbi5vcmlnaW4gOiAnJyxcbiAgICAgIH0sXG4gICAgICBzeW5jOiB7fSxcbiAgICB9LCByZXN1bHQgPT4ge1xuICAgICAgdGhpcy5fcHJvY2Vzc0NvbnRlbnRSZXNwb25zZShyZXN1bHQuZGF0YSwgY2xpZW50KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbGF5ZXIuQ29udGVudCBvYmplY3QgZnJvbSB0aGUgc2VydmVyJ3NcbiAgICogQ29udGVudCBvYmplY3QsIGFuZCB0aGVuIHVwbG9hZHMgdGhlIGRhdGEgdG8gZ29vZ2xlIGNsb3VkIHN0b3JhZ2UuXG4gICAqXG4gICAqIEBtZXRob2QgX3Byb2Nlc3NDb250ZW50UmVzcG9uc2VcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtICB7T2JqZWN0fSByZXNwb25zZVxuICAgKiBAcGFyYW0gIHtsYXllci5DbGllbnR9IGNsaWVudFxuICAgKi9cbiAgX3Byb2Nlc3NDb250ZW50UmVzcG9uc2UocmVzcG9uc2UsIGNsaWVudCkge1xuICAgIHRoaXMuX2NvbnRlbnQgPSBuZXcgQ29udGVudChyZXNwb25zZS5pZCk7XG4gICAgdGhpcy5oYXNDb250ZW50ID0gdHJ1ZTtcbiAgICB4aHIoe1xuICAgICAgdXJsOiByZXNwb25zZS51cGxvYWRfdXJsLFxuICAgICAgbWV0aG9kOiAnUFVUJyxcbiAgICAgIGRhdGE6IHRoaXMuYm9keSxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ1VwbG9hZC1Db250ZW50LUxlbmd0aCc6IHRoaXMuc2l6ZSxcbiAgICAgICAgJ1VwbG9hZC1Db250ZW50LVR5cGUnOiB0aGlzLm1pbWVUeXBlLFxuICAgICAgfSxcbiAgICB9LCByZXN1bHQgPT4gdGhpcy5fcHJvY2Vzc0NvbnRlbnRVcGxvYWRSZXNwb25zZShyZXN1bHQsIHJlc3BvbnNlLCBjbGllbnQpKTtcbiAgfVxuXG4gIF9wcm9jZXNzQ29udGVudFVwbG9hZFJlc3BvbnNlKHVwbG9hZFJlc3VsdCwgY29udGVudFJlc3BvbnNlLCBjbGllbnQpIHtcbiAgICBpZiAoIXVwbG9hZFJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICBpZiAoIWNsaWVudC5vbmxpbmVNYW5hZ2VyLmlzT25saW5lKSB7XG4gICAgICAgIGNsaWVudC5vbmxpbmVNYW5hZ2VyLm9uY2UoJ2Nvbm5lY3RlZCcsIHRoaXMuX3Byb2Nlc3NDb250ZW50UmVzcG9uc2UuYmluZCh0aGlzLCBjb250ZW50UmVzcG9uc2UsIGNsaWVudCksIHRoaXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignV2UgZG9uXFwndCB5ZXQgaGFuZGxlIHRoaXMhJyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudHJpZ2dlcigncGFydHM6c2VuZCcsIHtcbiAgICAgICAgbWltZV90eXBlOiB0aGlzLm1pbWVUeXBlLFxuICAgICAgICBjb250ZW50OiB7XG4gICAgICAgICAgc2l6ZTogdGhpcy5zaXplLFxuICAgICAgICAgIGlkOiB0aGlzLl9jb250ZW50LmlkLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHRleHQgZm9yIGFueSB0ZXh0L3BsYWluIHBhcnQuXG4gICAqXG4gICAqIFJldHVybnMgJycgaWYgaXRzIG5vdCBhIHRleHQvcGxhaW4gcGFydC5cbiAgICpcbiAgICogQG1ldGhvZCBnZXRUZXh0XG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICovXG4gIGdldFRleHQoKSB7XG4gICAgaWYgKHRoaXMubWltZVR5cGUgPT09ICd0ZXh0L3BsYWluJykge1xuICAgICAgcmV0dXJuIHRoaXMuYm9keTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHRoZSBNZXNzYWdlUGFydCB3aXRoIG5ldyBkYXRhIGZyb20gdGhlIHNlcnZlci5cbiAgICpcbiAgICogQ3VycmVudGx5LCBNZXNzYWdlUGFydCBwcm9wZXJ0aWVzIGRvIG5vdCB1cGRhdGUuLi4gaG93ZXZlcixcbiAgICogdGhlIGxheWVyLkNvbnRlbnQgb2JqZWN0IHRoYXQgUmljaCBDb250ZW50IE1lc3NhZ2VQYXJ0cyBjb250YWluXG4gICAqIGRvIGdldCB1cGRhdGVkIHdpdGggcmVmcmVzaGVkIGV4cGlyaW5nIHVybHMuXG4gICAqXG4gICAqIEBtZXRob2QgX3BvcHVsYXRlRnJvbVNlcnZlclxuICAgKiBAcGFyYW0gIHtPYmplY3R9IHBhcnQgLSBTZXJ2ZXIgcmVwcmVzZW50YXRpb24gb2YgYSBwYXJ0XG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcG9wdWxhdGVGcm9tU2VydmVyKHBhcnQpIHtcbiAgICBpZiAocGFydC5jb250ZW50ICYmIHRoaXMuX2NvbnRlbnQpIHtcbiAgICAgIHRoaXMuX2NvbnRlbnQuZG93bmxvYWRVcmwgPSBwYXJ0LmNvbnRlbnQuZG93bmxvYWRfdXJsO1xuICAgICAgdGhpcy5fY29udGVudC5leHBpcmF0aW9uID0gbmV3IERhdGUocGFydC5jb250ZW50LmV4cGlyYXRpb24pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgTWVzc2FnZVBhcnQgZnJvbSBhIHNlcnZlciByZXByZXNlbnRhdGlvbiBvZiB0aGUgcGFydFxuICAgKlxuICAgKiBAbWV0aG9kIF9jcmVhdGVGcm9tU2VydmVyXG4gICAqIEBwcml2YXRlXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtICB7T2JqZWN0fSBwYXJ0IC0gU2VydmVyIHJlcHJlc2VudGF0aW9uIG9mIGEgcGFydFxuICAgKi9cbiAgc3RhdGljIF9jcmVhdGVGcm9tU2VydmVyKHBhcnQpIHtcbiAgICBjb25zdCBjb250ZW50ID0gKHBhcnQuY29udGVudCkgPyBDb250ZW50Ll9jcmVhdGVGcm9tU2VydmVyKHBhcnQuY29udGVudCkgOiBudWxsO1xuXG4gICAgcmV0dXJuIG5ldyBNZXNzYWdlUGFydCh7XG4gICAgICBpZDogcGFydC5pZCxcbiAgICAgIG1pbWVUeXBlOiBwYXJ0Lm1pbWVfdHlwZSxcbiAgICAgIGJvZHk6IHBhcnQuYm9keSB8fCAnJyxcbiAgICAgIF9jb250ZW50OiBjb250ZW50LFxuICAgICAgaGFzQ29udGVudDogQm9vbGVhbihjb250ZW50KSxcbiAgICAgIHNpemU6IHBhcnQuc2l6ZSB8fCAwLFxuICAgICAgZW5jb2Rpbmc6IHBhcnQuZW5jb2RpbmcgfHwgJycsXG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBsYXllci5DbGllbnQgdGhhdCB0aGUgY29udmVyc2F0aW9uIGJlbG9uZ3MgdG8uXG4gKlxuICogQWN0dWFsIHZhbHVlIG9mIHRoaXMgc3RyaW5nIG1hdGNoZXMgdGhlIGFwcElkLlxuICogQHR5cGUge3N0cmluZ31cbiAqL1xuTWVzc2FnZVBhcnQucHJvdG90eXBlLmNsaWVudElkID0gJyc7XG5cbi8qKlxuICogU2VydmVyIGdlbmVyYXRlZCBpZGVudGlmaWVyIGZvciB0aGUgcGFydFxuICogQHR5cGUge3N0cmluZ31cbiAqL1xuTWVzc2FnZVBhcnQucHJvdG90eXBlLmlkID0gJyc7XG5cbi8qKlxuICogQm9keSBvZiB5b3VyIG1lc3NhZ2UgcGFydC5cbiAqXG4gKiBUaGlzIGlzIHRoZSBjb3JlIGRhdGEgb2YgeW91ciBwYXJ0LlxuICogQHR5cGUge3N0cmluZ31cbiAqL1xuTWVzc2FnZVBhcnQucHJvdG90eXBlLmJvZHkgPSBudWxsO1xuXG4vKipcbiAqIFJpY2ggY29udGVudCBvYmplY3QuXG4gKlxuICogVGhpcyB3aWxsIGJlIGF1dG9tYXRpY2FsbHkgY3JlYXRlZCBmb3IgeW91IGlmIHlvdXIgbGF5ZXIuTWVzc2FnZVBhcnQuYm9keVxuICogaXMgbGFyZ2UuXG4gKiBAdHlwZSB7bGF5ZXIuQ29udGVudH1cbiAqIEBwcml2YXRlXG4gKi9cbk1lc3NhZ2VQYXJ0LnByb3RvdHlwZS5fY29udGVudCA9IG51bGw7XG5cbi8qKlxuICogVGhlIFBhcnQgaGFzIHJpY2ggY29udGVudFxuICogQHR5cGUge0Jvb2xlYW59XG4gKi9cbk1lc3NhZ2VQYXJ0LnByb3RvdHlwZS5oYXNDb250ZW50ID0gZmFsc2U7XG5cbi8qKlxuICogVVJMIHRvIHJpY2ggY29udGVudCBvYmplY3QuXG4gKlxuICogUGFydHMgd2l0aCByaWNoIGNvbnRlbnQgd2lsbCBiZSBpbml0aWFsaXplZCB3aXRoIHRoaXMgcHJvcGVydHkgc2V0LiAgQnV0IGl0cyB2YWx1ZSB3aWxsIGV4cGlyZS5cbiAqXG4gKiBXaWxsIGNvbnRhaW4gYW4gZXhwaXJpbmcgdXJsIGF0IGluaXRpYWxpemF0aW9uIHRpbWUgYW5kIGJlIHJlZnJlc2hlZCB3aXRoIGNhbGxzIHRvIGBsYXllci5NZXNzYWdlUGFydC5mZXRjaFN0cmVhbSgpYC5cbiAqIFdpbGwgY29udGFpbiBhIG5vbi1leHBpcmluZyB1cmwgdG8gYSBsb2NhbCByZXNvdXJjZSBpZiBgbGF5ZXIuTWVzc2FnZVBhcnQuZmV0Y2hDb250ZW50KClgIGlzIGNhbGxlZC5cbiAqXG4gKiBAdHlwZSB7bGF5ZXIuQ29udGVudH1cbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1lc3NhZ2VQYXJ0LnByb3RvdHlwZSwgJ3VybCcsIHtcbiAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgLy8gSXRzIHBvc3NpYmxlIHRvIGhhdmUgYSB1cmwgYW5kIG5vIGNvbnRlbnQgaWYgaXQgaGFzIGJlZW4gaW5zdGFudGlhdGVkIGJ1dCBub3QgeWV0IHNlbnQuXG4gICAgLy8gSWYgdGhlcmUgaXMgYSBfX3VybCB0aGVuIGl0cyBhIGxvY2FsIHVybCBnZW5lcmF0ZWQgZnJvbSB0aGUgYm9keSBwcm9wZXJ0eSBhbmQgZG9lcyBub3QgZXhwaXJlLlxuICAgIGlmICh0aGlzLl9fdXJsKSByZXR1cm4gdGhpcy5fX3VybDtcbiAgICBpZiAodGhpcy5fY29udGVudCkgcmV0dXJuIHRoaXMuX2NvbnRlbnQuaXNFeHBpcmVkKCkgPyAnJyA6IHRoaXMuX2NvbnRlbnQuZG93bmxvYWRVcmw7XG4gICAgcmV0dXJuICcnO1xuICB9LFxuICBzZXQ6IGZ1bmN0aW9uIHNldChpblZhbHVlKSB7XG4gICAgdGhpcy5fX3VybCA9IGluVmFsdWU7XG4gIH0sXG59KTtcblxuLyoqXG4gKiBNaW1lIFR5cGUgZm9yIHRoZSBkYXRhIGluIGxheWVyLk1lc3NhZ2VQYXJ0LmJvZHkuXG4gKlxuICogQHR5cGUge1N0cmluZ31cbiAqL1xuTWVzc2FnZVBhcnQucHJvdG90eXBlLm1pbWVUeXBlID0gJ3RleHQvcGxhaW4nO1xuXG4vKipcbiAqIEVuY29kaW5nIHVzZWQgZm9yIHRoZSBib2R5IG9mIHRoaXMgcGFydC5cbiAqXG4gKiBObyB2YWx1ZSBpcyB0aGUgZGVmYXVsdCBlbmNvZGluZy4gICdiYXNlNjQnIGlzIGFsc28gYSBjb21tb24gdmFsdWUuXG4gKiBAdHlwZSB7U3RyaW5nfVxuICovXG5NZXNzYWdlUGFydC5wcm90b3R5cGUuZW5jb2RpbmcgPSAnJztcblxuLyoqXG4gKiBTaXplIG9mIHRoZSBsYXllci5NZXNzYWdlUGFydC5ib2R5LlxuICpcbiAqIFdpbGwgYmUgc2V0IGZvciB5b3UgaWYgbm90IHByb3ZpZGVkLlxuICogT25seSBuZWVkZWQgZm9yIHVzZSB3aXRoIHJpY2ggY29udGVudC5cbiAqXG4gKiBAdHlwZSB7bnVtYmVyfVxuICovXG5NZXNzYWdlUGFydC5wcm90b3R5cGUuc2l6ZSA9IDA7XG5cbk1lc3NhZ2VQYXJ0Ll9zdXBwb3J0ZWRFdmVudHMgPSBbXG4gICdwYXJ0czpzZW5kJyxcbiAgJ2NvbnRlbnQtbG9hZGVkJyxcbiAgJ3VybC1sb2FkZWQnLFxuICAnY29udGVudC1sb2FkZWQtZXJyb3InLFxuXS5jb25jYXQoUm9vdC5fc3VwcG9ydGVkRXZlbnRzKTtcblJvb3QuaW5pdENsYXNzLmFwcGx5KE1lc3NhZ2VQYXJ0LCBbTWVzc2FnZVBhcnQsICdNZXNzYWdlUGFydCddKTtcblxubW9kdWxlLmV4cG9ydHMgPSBNZXNzYWdlUGFydDtcbiJdfQ==
