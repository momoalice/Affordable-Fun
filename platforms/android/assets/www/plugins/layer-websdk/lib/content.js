'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * The Content class represents Rich Content.
 *
 * Note that instances of this class will automatically be
 * generated for developers based on whether their message parts
 * require it.
 *
 * That means for the most part, you should never need to
 * instantiate one of these directly.
 *
 *      var content = new layer.Content({
 *          id: 'layer:///content/8c839735-5f95-439a-a867-30903c0133f2'
 *      });
 *
 * @class  layer.Content
 * @protected
 * @extends layer.Root
 * @author Michael Kantor
 */

var Root = require('./root');
var xhr = require('./xhr');

var Content = function (_Root) {
  _inherits(Content, _Root);

  /**
   * Constructor
   *
   * @method constructor
   * @param  {Object} options
   * @param  {string} options.id - Identifier for the content
   * @param  {string} [options.downloadUrl=null] - Url to download the content from
   * @param  {Date} [options.expiration] - Expiration date for the url
   * @param  {string} [options.refreshUrl] - Url to access to get a new downloadUrl after it has expired
   *
   * @return {layer.Content}
   */

  function Content(options) {
    _classCallCheck(this, Content);

    if (typeof options === 'string') {
      options = { id: options };
    }
    return _possibleConstructorReturn(this, Object.getPrototypeOf(Content).call(this, options));
  }

  /**
   * Loads the data from google's cloud storage.
   *
   * Data is provided via callback.
   *
   * Note that typically one should use layer.MessagePart.fetchContent() rather than layer.Content.loadContent()
   *
   * @method loadContent
   * @param {string} mimeType - Mime type for the Blob
   * @param {Function} callback
   * @param {Blob} callback.data - A Blob instance representing the data downloaded.  If Blob object is not available, then may use other format.
   */


  _createClass(Content, [{
    key: 'loadContent',
    value: function loadContent(mimeType, callback) {
      xhr({
        url: this.downloadUrl,
        responseType: 'arraybuffer'
      }, function (result) {
        if (result.success) {
          if (typeof Blob !== 'undefined') {
            var blob = new Blob([result.data], { type: mimeType });
            callback(null, blob);
          } else {
            // If the blob class isn't defined (nodejs) then just return the result as is
            callback(null, result.data);
          }
        } else {
          callback(result.data, null);
        }
      });
    }

    /**
     * Refreshes the URL, which updates the URL and resets the expiration time for the URL
     *
     * @method refreshContent
     * @param {layer.Client} client
     * @param {Function} [callback]
     */

  }, {
    key: 'refreshContent',
    value: function refreshContent(client, callback) {
      var _this2 = this;

      client.xhr({
        url: this.refreshUrl,
        method: 'GET'
      }, function (result) {
        var data = result.data;

        _this2.expiration = new Date(data.expiration);
        _this2.downloadUrl = data.download_url;
        if (callback) callback(_this2.downloadUrl);
      });
    }

    /**
     * Is the download url expired or about to expire?
     * We can't be sure of the state of the device's internal clock,
     * so if its within 10 minutes of expiring, just treat it as expired.
     *
     * @method isExpired
     * @returns {Boolean}
     */

  }, {
    key: 'isExpired',
    value: function isExpired() {
      var expirationLeeway = 10 * 60 * 1000;
      return this.expiration.getTime() - expirationLeeway < Date.now();
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
      return new Content({
        id: part.id,
        downloadUrl: part.download_url,
        expiration: new Date(part.expiration),
        refreshUrl: part.refresh_url
      });
    }
  }]);

  return Content;
}(Root);

/**
 * Server generated identifier
 * @type {string}
 */


Content.prototype.id = '';

Content.prototype.blob = null;

/**
 * Server generated url for downloading the content
 * @type {string}
 */
Content.prototype.downloadUrl = '';

/**
 * Url for refreshing the downloadUrl after it has expired
 * @type {string}
 */
Content.prototype.refreshUrl = '';

/**
 * Size of the content.
 *
 * This property only has a value when in the process
 * of Creating the rich content and sending the Message.
 *
 * @type {number}
 */
Content.prototype.size = 0;

/**
 * Expiration date for the downloadUrl
 * @type {Date}
 */
Content.prototype.expiration = null;

Root.initClass.apply(Content, [Content, 'Content']);
module.exports = Content;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jb250ZW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQW9CQSxJQUFNLE9BQU8sUUFBUSxRQUFSLENBQVA7QUFDTixJQUFNLE1BQU0sUUFBUSxPQUFSLENBQU47O0lBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7QUFjSixXQWRJLE9BY0osQ0FBWSxPQUFaLEVBQXFCOzBCQWRqQixTQWNpQjs7QUFDbkIsUUFBSSxPQUFPLE9BQVAsS0FBbUIsUUFBbkIsRUFBNkI7QUFDL0IsZ0JBQVUsRUFBRSxJQUFJLE9BQUosRUFBWixDQUQrQjtLQUFqQztrRUFmRSxvQkFrQkksVUFKYTtHQUFyQjs7Ozs7Ozs7Ozs7Ozs7OztlQWRJOztnQ0FpQ1EsVUFBVSxVQUFVO0FBQzlCLFVBQUk7QUFDRixhQUFLLEtBQUssV0FBTDtBQUNMLHNCQUFjLGFBQWQ7T0FGRixFQUdHLGtCQUFVO0FBQ1gsWUFBSSxPQUFPLE9BQVAsRUFBZ0I7QUFDbEIsY0FBSSxPQUFPLElBQVAsS0FBZ0IsV0FBaEIsRUFBNkI7QUFDL0IsZ0JBQU0sT0FBTyxJQUFJLElBQUosQ0FBUyxDQUFDLE9BQU8sSUFBUCxDQUFWLEVBQXdCLEVBQUUsTUFBTSxRQUFOLEVBQTFCLENBQVAsQ0FEeUI7QUFFL0IscUJBQVMsSUFBVCxFQUFlLElBQWYsRUFGK0I7V0FBakMsTUFHTzs7QUFFTCxxQkFBUyxJQUFULEVBQWUsT0FBTyxJQUFQLENBQWYsQ0FGSztXQUhQO1NBREYsTUFRTztBQUNMLG1CQUFTLE9BQU8sSUFBUCxFQUFhLElBQXRCLEVBREs7U0FSUDtPQURDLENBSEgsQ0FEOEI7Ozs7Ozs7Ozs7Ozs7bUNBMEJqQixRQUFRLFVBQVU7OztBQUMvQixhQUFPLEdBQVAsQ0FBVztBQUNULGFBQUssS0FBSyxVQUFMO0FBQ0wsZ0JBQVEsS0FBUjtPQUZGLEVBR0csa0JBQVU7WUFDSCxPQUFTLE9BQVQsS0FERzs7QUFFWCxlQUFLLFVBQUwsR0FBa0IsSUFBSSxJQUFKLENBQVMsS0FBSyxVQUFMLENBQTNCLENBRlc7QUFHWCxlQUFLLFdBQUwsR0FBbUIsS0FBSyxZQUFMLENBSFI7QUFJWCxZQUFJLFFBQUosRUFBYyxTQUFTLE9BQUssV0FBTCxDQUFULENBQWQ7T0FKQyxDQUhILENBRCtCOzs7Ozs7Ozs7Ozs7OztnQ0FvQnJCO0FBQ1YsVUFBTSxtQkFBbUIsS0FBSyxFQUFMLEdBQVUsSUFBVixDQURmO0FBRVYsYUFBUSxLQUFLLFVBQUwsQ0FBZ0IsT0FBaEIsS0FBNEIsZ0JBQTVCLEdBQStDLEtBQUssR0FBTCxFQUEvQyxDQUZFOzs7Ozs7Ozs7Ozs7OztzQ0FhYSxNQUFNO0FBQzdCLGFBQU8sSUFBSSxPQUFKLENBQVk7QUFDakIsWUFBSSxLQUFLLEVBQUw7QUFDSixxQkFBYSxLQUFLLFlBQUw7QUFDYixvQkFBWSxJQUFJLElBQUosQ0FBUyxLQUFLLFVBQUwsQ0FBckI7QUFDQSxvQkFBWSxLQUFLLFdBQUw7T0FKUCxDQUFQLENBRDZCOzs7O1NBNUYzQjtFQUFnQjs7Ozs7Ozs7QUEwR3RCLFFBQVEsU0FBUixDQUFrQixFQUFsQixHQUF1QixFQUF2Qjs7QUFFQSxRQUFRLFNBQVIsQ0FBa0IsSUFBbEIsR0FBeUIsSUFBekI7Ozs7OztBQU1BLFFBQVEsU0FBUixDQUFrQixXQUFsQixHQUFnQyxFQUFoQzs7Ozs7O0FBTUEsUUFBUSxTQUFSLENBQWtCLFVBQWxCLEdBQStCLEVBQS9COzs7Ozs7Ozs7O0FBVUEsUUFBUSxTQUFSLENBQWtCLElBQWxCLEdBQXlCLENBQXpCOzs7Ozs7QUFNQSxRQUFRLFNBQVIsQ0FBa0IsVUFBbEIsR0FBK0IsSUFBL0I7O0FBRUEsS0FBSyxTQUFMLENBQWUsS0FBZixDQUFxQixPQUFyQixFQUE4QixDQUFDLE9BQUQsRUFBVSxTQUFWLENBQTlCO0FBQ0EsT0FBTyxPQUFQLEdBQWlCLE9BQWpCIiwiZmlsZSI6ImNvbnRlbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFRoZSBDb250ZW50IGNsYXNzIHJlcHJlc2VudHMgUmljaCBDb250ZW50LlxuICpcbiAqIE5vdGUgdGhhdCBpbnN0YW5jZXMgb2YgdGhpcyBjbGFzcyB3aWxsIGF1dG9tYXRpY2FsbHkgYmVcbiAqIGdlbmVyYXRlZCBmb3IgZGV2ZWxvcGVycyBiYXNlZCBvbiB3aGV0aGVyIHRoZWlyIG1lc3NhZ2UgcGFydHNcbiAqIHJlcXVpcmUgaXQuXG4gKlxuICogVGhhdCBtZWFucyBmb3IgdGhlIG1vc3QgcGFydCwgeW91IHNob3VsZCBuZXZlciBuZWVkIHRvXG4gKiBpbnN0YW50aWF0ZSBvbmUgb2YgdGhlc2UgZGlyZWN0bHkuXG4gKlxuICogICAgICB2YXIgY29udGVudCA9IG5ldyBsYXllci5Db250ZW50KHtcbiAqICAgICAgICAgIGlkOiAnbGF5ZXI6Ly8vY29udGVudC84YzgzOTczNS01Zjk1LTQzOWEtYTg2Ny0zMDkwM2MwMTMzZjInXG4gKiAgICAgIH0pO1xuICpcbiAqIEBjbGFzcyAgbGF5ZXIuQ29udGVudFxuICogQHByb3RlY3RlZFxuICogQGV4dGVuZHMgbGF5ZXIuUm9vdFxuICogQGF1dGhvciBNaWNoYWVsIEthbnRvclxuICovXG5cbmNvbnN0IFJvb3QgPSByZXF1aXJlKCcuL3Jvb3QnKTtcbmNvbnN0IHhociA9IHJlcXVpcmUoJy4veGhyJyk7XG5cbmNsYXNzIENvbnRlbnQgZXh0ZW5kcyBSb290IHtcblxuICAvKipcbiAgICogQ29uc3RydWN0b3JcbiAgICpcbiAgICogQG1ldGhvZCBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnNcbiAgICogQHBhcmFtICB7c3RyaW5nfSBvcHRpb25zLmlkIC0gSWRlbnRpZmllciBmb3IgdGhlIGNvbnRlbnRcbiAgICogQHBhcmFtICB7c3RyaW5nfSBbb3B0aW9ucy5kb3dubG9hZFVybD1udWxsXSAtIFVybCB0byBkb3dubG9hZCB0aGUgY29udGVudCBmcm9tXG4gICAqIEBwYXJhbSAge0RhdGV9IFtvcHRpb25zLmV4cGlyYXRpb25dIC0gRXhwaXJhdGlvbiBkYXRlIGZvciB0aGUgdXJsXG4gICAqIEBwYXJhbSAge3N0cmluZ30gW29wdGlvbnMucmVmcmVzaFVybF0gLSBVcmwgdG8gYWNjZXNzIHRvIGdldCBhIG5ldyBkb3dubG9hZFVybCBhZnRlciBpdCBoYXMgZXhwaXJlZFxuICAgKlxuICAgKiBAcmV0dXJuIHtsYXllci5Db250ZW50fVxuICAgKi9cbiAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIG9wdGlvbnMgPSB7IGlkOiBvcHRpb25zIH07XG4gICAgfVxuICAgIHN1cGVyKG9wdGlvbnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvYWRzIHRoZSBkYXRhIGZyb20gZ29vZ2xlJ3MgY2xvdWQgc3RvcmFnZS5cbiAgICpcbiAgICogRGF0YSBpcyBwcm92aWRlZCB2aWEgY2FsbGJhY2suXG4gICAqXG4gICAqIE5vdGUgdGhhdCB0eXBpY2FsbHkgb25lIHNob3VsZCB1c2UgbGF5ZXIuTWVzc2FnZVBhcnQuZmV0Y2hDb250ZW50KCkgcmF0aGVyIHRoYW4gbGF5ZXIuQ29udGVudC5sb2FkQ29udGVudCgpXG4gICAqXG4gICAqIEBtZXRob2QgbG9hZENvbnRlbnRcbiAgICogQHBhcmFtIHtzdHJpbmd9IG1pbWVUeXBlIC0gTWltZSB0eXBlIGZvciB0aGUgQmxvYlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgKiBAcGFyYW0ge0Jsb2J9IGNhbGxiYWNrLmRhdGEgLSBBIEJsb2IgaW5zdGFuY2UgcmVwcmVzZW50aW5nIHRoZSBkYXRhIGRvd25sb2FkZWQuICBJZiBCbG9iIG9iamVjdCBpcyBub3QgYXZhaWxhYmxlLCB0aGVuIG1heSB1c2Ugb3RoZXIgZm9ybWF0LlxuICAgKi9cbiAgbG9hZENvbnRlbnQobWltZVR5cGUsIGNhbGxiYWNrKSB7XG4gICAgeGhyKHtcbiAgICAgIHVybDogdGhpcy5kb3dubG9hZFVybCxcbiAgICAgIHJlc3BvbnNlVHlwZTogJ2FycmF5YnVmZmVyJyxcbiAgICB9LCByZXN1bHQgPT4ge1xuICAgICAgaWYgKHJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgIGlmICh0eXBlb2YgQmxvYiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICBjb25zdCBibG9iID0gbmV3IEJsb2IoW3Jlc3VsdC5kYXRhXSwgeyB0eXBlOiBtaW1lVHlwZSB9KTtcbiAgICAgICAgICBjYWxsYmFjayhudWxsLCBibG9iKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBJZiB0aGUgYmxvYiBjbGFzcyBpc24ndCBkZWZpbmVkIChub2RlanMpIHRoZW4ganVzdCByZXR1cm4gdGhlIHJlc3VsdCBhcyBpc1xuICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdC5kYXRhKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbGJhY2socmVzdWx0LmRhdGEsIG51bGwpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZnJlc2hlcyB0aGUgVVJMLCB3aGljaCB1cGRhdGVzIHRoZSBVUkwgYW5kIHJlc2V0cyB0aGUgZXhwaXJhdGlvbiB0aW1lIGZvciB0aGUgVVJMXG4gICAqXG4gICAqIEBtZXRob2QgcmVmcmVzaENvbnRlbnRcbiAgICogQHBhcmFtIHtsYXllci5DbGllbnR9IGNsaWVudFxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdXG4gICAqL1xuICByZWZyZXNoQ29udGVudChjbGllbnQsIGNhbGxiYWNrKSB7XG4gICAgY2xpZW50Lnhocih7XG4gICAgICB1cmw6IHRoaXMucmVmcmVzaFVybCxcbiAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgfSwgcmVzdWx0ID0+IHtcbiAgICAgIGNvbnN0IHsgZGF0YSB9ID0gcmVzdWx0O1xuICAgICAgdGhpcy5leHBpcmF0aW9uID0gbmV3IERhdGUoZGF0YS5leHBpcmF0aW9uKTtcbiAgICAgIHRoaXMuZG93bmxvYWRVcmwgPSBkYXRhLmRvd25sb2FkX3VybDtcbiAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sodGhpcy5kb3dubG9hZFVybCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSXMgdGhlIGRvd25sb2FkIHVybCBleHBpcmVkIG9yIGFib3V0IHRvIGV4cGlyZT9cbiAgICogV2UgY2FuJ3QgYmUgc3VyZSBvZiB0aGUgc3RhdGUgb2YgdGhlIGRldmljZSdzIGludGVybmFsIGNsb2NrLFxuICAgKiBzbyBpZiBpdHMgd2l0aGluIDEwIG1pbnV0ZXMgb2YgZXhwaXJpbmcsIGp1c3QgdHJlYXQgaXQgYXMgZXhwaXJlZC5cbiAgICpcbiAgICogQG1ldGhvZCBpc0V4cGlyZWRcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc0V4cGlyZWQoKSB7XG4gICAgY29uc3QgZXhwaXJhdGlvbkxlZXdheSA9IDEwICogNjAgKiAxMDAwO1xuICAgIHJldHVybiAodGhpcy5leHBpcmF0aW9uLmdldFRpbWUoKSAtIGV4cGlyYXRpb25MZWV3YXkgPCBEYXRlLm5vdygpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgTWVzc2FnZVBhcnQgZnJvbSBhIHNlcnZlciByZXByZXNlbnRhdGlvbiBvZiB0aGUgcGFydFxuICAgKlxuICAgKiBAbWV0aG9kIF9jcmVhdGVGcm9tU2VydmVyXG4gICAqIEBwcml2YXRlXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtICB7T2JqZWN0fSBwYXJ0IC0gU2VydmVyIHJlcHJlc2VudGF0aW9uIG9mIGEgcGFydFxuICAgKi9cbiAgc3RhdGljIF9jcmVhdGVGcm9tU2VydmVyKHBhcnQpIHtcbiAgICByZXR1cm4gbmV3IENvbnRlbnQoe1xuICAgICAgaWQ6IHBhcnQuaWQsXG4gICAgICBkb3dubG9hZFVybDogcGFydC5kb3dubG9hZF91cmwsXG4gICAgICBleHBpcmF0aW9uOiBuZXcgRGF0ZShwYXJ0LmV4cGlyYXRpb24pLFxuICAgICAgcmVmcmVzaFVybDogcGFydC5yZWZyZXNoX3VybCxcbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAqIFNlcnZlciBnZW5lcmF0ZWQgaWRlbnRpZmllclxuICogQHR5cGUge3N0cmluZ31cbiAqL1xuQ29udGVudC5wcm90b3R5cGUuaWQgPSAnJztcblxuQ29udGVudC5wcm90b3R5cGUuYmxvYiA9IG51bGw7XG5cbi8qKlxuICogU2VydmVyIGdlbmVyYXRlZCB1cmwgZm9yIGRvd25sb2FkaW5nIHRoZSBjb250ZW50XG4gKiBAdHlwZSB7c3RyaW5nfVxuICovXG5Db250ZW50LnByb3RvdHlwZS5kb3dubG9hZFVybCA9ICcnO1xuXG4vKipcbiAqIFVybCBmb3IgcmVmcmVzaGluZyB0aGUgZG93bmxvYWRVcmwgYWZ0ZXIgaXQgaGFzIGV4cGlyZWRcbiAqIEB0eXBlIHtzdHJpbmd9XG4gKi9cbkNvbnRlbnQucHJvdG90eXBlLnJlZnJlc2hVcmwgPSAnJztcblxuLyoqXG4gKiBTaXplIG9mIHRoZSBjb250ZW50LlxuICpcbiAqIFRoaXMgcHJvcGVydHkgb25seSBoYXMgYSB2YWx1ZSB3aGVuIGluIHRoZSBwcm9jZXNzXG4gKiBvZiBDcmVhdGluZyB0aGUgcmljaCBjb250ZW50IGFuZCBzZW5kaW5nIHRoZSBNZXNzYWdlLlxuICpcbiAqIEB0eXBlIHtudW1iZXJ9XG4gKi9cbkNvbnRlbnQucHJvdG90eXBlLnNpemUgPSAwO1xuXG4vKipcbiAqIEV4cGlyYXRpb24gZGF0ZSBmb3IgdGhlIGRvd25sb2FkVXJsXG4gKiBAdHlwZSB7RGF0ZX1cbiAqL1xuQ29udGVudC5wcm90b3R5cGUuZXhwaXJhdGlvbiA9IG51bGw7XG5cblJvb3QuaW5pdENsYXNzLmFwcGx5KENvbnRlbnQsIFtDb250ZW50LCAnQ29udGVudCddKTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGVudDtcbiJdfQ==
