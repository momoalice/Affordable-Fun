'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

/**
 * Basic XHR Library with some notions hardcoded in
 * of what the Layer server expects/returns.
 *
    layer.xhr({
      url: 'http://my.com/mydata',
      data: {hey: 'ho', there: 'folk'},
      method: 'GET',
      format: 'json',
      headers: {'fred': 'Joe'},
      timeout: 50000
    }, function(result) {
      if (!result.success) {
        errorHandler(result.data, result.headers, result.status);
      } else {
        successHandler(result.data, result.headers, result.xhr);
      }
    });
 *
 * @class layer.xhr
 */

/**
 * Send a Request.
 *
 * @method  xhr
 * @param {Object} options
 * @param {string} options.url
 * @param {Mixed} [options.data=null]
 * @param {string} [options.format=''] - set to 'json' to get result parsed as json (in case there is no obvious Content-Type in the response)
 * @param {Object} [options.headers={}] - Name value pairs for  headers and their values
 * @param {number} [options.timeout=0] - When does the request expire/timeout in miliseconds.
 * @param {Function} callback
 * @param {Object} callback.result
 * @param {number} callback.result.status - http status code
 * @param {boolean} callback.result.success - true if it was a successful response
 * @param {XMLHttpRequest} callback.result.xhr - The XHR object used for the request
 * @param {Object} callback.result.data -  The parsed response body
 *
 * TODO:
 *
 * 1. Make this a subclass of Root and make it a singleton so it can inherit a proper event system
 * 2. Result should be a layer.ServerResponse instance
 * 3. Should only access link headers if requested; annoying having it throw errors every other time.
 */

// Don't set xhr to window.XMLHttpRequest as it will bypass jasmine's
// ajax library
var Xhr = typeof window === 'undefined' ? require('xhr2') : null;

function parseLinkHeaders(linkHeader) {
  if (!linkHeader) return {};

  // Split parts by comma
  var parts = linkHeader.split(',');
  var links = {};

  // Parse each part into a named link
  parts.forEach(function (part) {
    var section = part.split(';');
    if (section.length !== 2) return;
    var url = section[0].replace(/<(.*)>/, '$1').trim();
    var name = section[1].replace(/rel='?(.*)'?/, '$1').trim();
    links[name] = url;
  });

  return links;
}

module.exports = function (request, callback) {
  var req = Xhr ? new Xhr() : new XMLHttpRequest();
  var method = (request.method || 'GET').toUpperCase();

  var onload = function onload() {
    var headers = {
      'content-type': this.getResponseHeader('content-type')
    };

    var result = {
      status: this.status,
      success: this.status && this.status < 300,
      xhr: this
    };
    var isJSON = String(headers['content-type']).split(/;/)[0].match(/^application\/json/) || request.format === 'json';

    if (this.responseType === 'blob' || this.responseType === 'arraybuffer') {
      // Damnit, this.response is a function if using jasmine test framework.
      result.data = typeof this.response === 'function' ? this.responseText : this.response;
    } else {
      if (isJSON && this.responseText) {
        try {
          result.data = JSON.parse(this.responseText);
        } catch (err) {
          result.data = {
            code: 999,
            message: 'Invalid JSON from server',
            response: this.responseText
          };
          result.status = 999;
        }
      } else {
        result.data = this.responseText;
      }

      module.exports.trigger({
        target: this,
        status: !this.responseText && !this.status ? 'connection:error' : 'connection:success'
      });

      if (!this.responseText && !this.status) {
        result.status = 408;
        result.data = {
          id: 'request_timeout',
          message: 'The server is not responding please try again in a few minutes',
          url: 'https://developer.layer.com/docs/websdk',
          code: 0,
          status: 408,
          httpStatus: 408
        };
      } else if (this.status === 404 && _typeof(result.data) !== 'object') {
        result.data = {
          id: 'operation_not_found',
          message: 'Endpoint ' + (request.method || 'GET') + ' ' + request.url + ' does not exist',
          status: this.status,
          httpStatus: 404,
          code: 106,
          url: 'https://developer.layer.com/docs/websdk'
        };
      } else if (typeof result.data === 'string' && this.status >= 400) {
        result.data = {
          id: 'unknown_error',
          message: result.data,
          status: this.status,
          httpStatus: this.status,
          code: 0,
          url: 'https://developer.layer.com/docs/websdk'
        };
      }
    }

    if (request.headers && (request.headers.accept || '').match(/application\/vnd.layer\+json/)) {
      var links = this.getResponseHeader('link');
      if (links) result.Links = parseLinkHeaders(links);
    }
    result.xhr = this;

    if (callback) callback(result);
  };

  req.onload = onload;

  // UNTESTED!!!
  req.onerror = req.ontimeout = onload;

  // Replace all headers in arbitrary case with all lower case
  // for easy matching.
  var headersList = Object.keys(request.headers || {});
  var headers = {};
  headersList.forEach(function (header) {
    if (header.toLowerCase() === 'content-type') {
      headers['content-type'] = request.headers[header];
    } else {
      headers[header.toLowerCase()] = request.headers[header];
    }
  });
  request.headers = headers;

  var data = '';
  if (request.data) {
    if (typeof Blob !== 'undefined' && request.data instanceof Blob) {
      data = request.data;
    } else if (request.headers && (String(request.headers['content-type']).match(/^application\/json/) || String(request.headers['content-type']) === 'application/vnd.layer-patch+json')) {
      data = typeof request.data === 'string' ? request.data : JSON.stringify(request.data);
    } else if (request.data && _typeof(request.data) === 'object') {
      Object.keys(request.data).forEach(function (name) {
        if (data) data += '&';
        data += name + '=' + request.data[name];
      });
    } else {
      data = request.data; // Some form of raw string/data
    }
  }
  if (data) {
    if (method === 'GET') {
      request.url += '?' + data;
    }
  }

  req.open(method, request.url, true);
  if (request.timeout) req.timeout = request.timeout;
  if (request.withCredentials) req.withCredentials = true;
  if (request.responseType) req.responseType = request.responseType;

  if (request.headers) {
    Object.keys(request.headers).forEach(function (headerName) {
      return req.setRequestHeader(headerName, request.headers[headerName]);
    });
  }

  try {
    if (method === 'GET') {
      req.send();
    } else {
      req.send(data);
    }
  } catch (e) {
    // do nothing
  }
};

var listeners = [];
module.exports.addConnectionListener = function (func) {
  return listeners.push(func);
};

module.exports.trigger = function (evt) {
  listeners.forEach(function (func) {
    func(evt);
  });
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy94aHIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWdEQSxJQUFNLE1BQU0sT0FBUSxNQUFQLEtBQWtCLFdBQWxCLEdBQWlDLFFBQVEsTUFBUixDQUFsQyxHQUFvRCxJQUFwRDs7QUFFWixTQUFTLGdCQUFULENBQTBCLFVBQTFCLEVBQXNDO0FBQ3BDLE1BQUksQ0FBQyxVQUFELEVBQWEsT0FBTyxFQUFQLENBQWpCOzs7QUFEb0MsTUFJOUIsUUFBUSxXQUFXLEtBQVgsQ0FBaUIsR0FBakIsQ0FBUixDQUo4QjtBQUtwQyxNQUFNLFFBQVEsRUFBUjs7O0FBTDhCLE9BUXBDLENBQU0sT0FBTixDQUFjLGdCQUFRO0FBQ3BCLFFBQU0sVUFBVSxLQUFLLEtBQUwsQ0FBVyxHQUFYLENBQVYsQ0FEYztBQUVwQixRQUFJLFFBQVEsTUFBUixLQUFtQixDQUFuQixFQUFzQixPQUExQjtBQUNBLFFBQU0sTUFBTSxRQUFRLENBQVIsRUFBVyxPQUFYLENBQW1CLFFBQW5CLEVBQTZCLElBQTdCLEVBQW1DLElBQW5DLEVBQU4sQ0FIYztBQUlwQixRQUFNLE9BQU8sUUFBUSxDQUFSLEVBQVcsT0FBWCxDQUFtQixjQUFuQixFQUFtQyxJQUFuQyxFQUF5QyxJQUF6QyxFQUFQLENBSmM7QUFLcEIsVUFBTSxJQUFOLElBQWMsR0FBZCxDQUxvQjtHQUFSLENBQWQsQ0FSb0M7O0FBZ0JwQyxTQUFPLEtBQVAsQ0FoQm9DO0NBQXRDOztBQW1CQSxPQUFPLE9BQVAsR0FBaUIsVUFBQyxPQUFELEVBQVUsUUFBVixFQUF1QjtBQUN0QyxNQUFNLE1BQU0sTUFBTSxJQUFJLEdBQUosRUFBTixHQUFrQixJQUFJLGNBQUosRUFBbEIsQ0FEMEI7QUFFdEMsTUFBTSxTQUFTLENBQUMsUUFBUSxNQUFSLElBQWtCLEtBQWxCLENBQUQsQ0FBMEIsV0FBMUIsRUFBVCxDQUZnQzs7QUFJdEMsTUFBTSxTQUFTLFNBQVMsTUFBVCxHQUFrQjtBQUMvQixRQUFNLFVBQVU7QUFDZCxzQkFBZ0IsS0FBSyxpQkFBTCxDQUF1QixjQUF2QixDQUFoQjtLQURJLENBRHlCOztBQUsvQixRQUFNLFNBQVM7QUFDYixjQUFRLEtBQUssTUFBTDtBQUNSLGVBQVMsS0FBSyxNQUFMLElBQWUsS0FBSyxNQUFMLEdBQWMsR0FBZDtBQUN4QixXQUFLLElBQUw7S0FISSxDQUx5QjtBQVUvQixRQUFNLFNBQVUsT0FBTyxRQUFRLGNBQVIsQ0FBUCxFQUFnQyxLQUFoQyxDQUFzQyxHQUF0QyxFQUEyQyxDQUEzQyxFQUE4QyxLQUE5QyxDQUFvRCxvQkFBcEQsS0FDVCxRQUFRLE1BQVIsS0FBbUIsTUFBbkIsQ0FYd0I7O0FBYS9CLFFBQUksS0FBSyxZQUFMLEtBQXNCLE1BQXRCLElBQWdDLEtBQUssWUFBTCxLQUFzQixhQUF0QixFQUFxQzs7QUFFdkUsYUFBTyxJQUFQLEdBQWMsT0FBTyxLQUFLLFFBQUwsS0FBa0IsVUFBekIsR0FBc0MsS0FBSyxZQUFMLEdBQW9CLEtBQUssUUFBTCxDQUZEO0tBQXpFLE1BR087QUFDTCxVQUFJLFVBQVUsS0FBSyxZQUFMLEVBQW1CO0FBQy9CLFlBQUk7QUFDRixpQkFBTyxJQUFQLEdBQWMsS0FBSyxLQUFMLENBQVcsS0FBSyxZQUFMLENBQXpCLENBREU7U0FBSixDQUVFLE9BQU8sR0FBUCxFQUFZO0FBQ1osaUJBQU8sSUFBUCxHQUFjO0FBQ1osa0JBQU0sR0FBTjtBQUNBLHFCQUFTLDBCQUFUO0FBQ0Esc0JBQVUsS0FBSyxZQUFMO1dBSFosQ0FEWTtBQU1aLGlCQUFPLE1BQVAsR0FBZ0IsR0FBaEIsQ0FOWTtTQUFaO09BSEosTUFXTztBQUNMLGVBQU8sSUFBUCxHQUFjLEtBQUssWUFBTCxDQURUO09BWFA7O0FBZ0JBLGFBQU8sT0FBUCxDQUFlLE9BQWYsQ0FBdUI7QUFDckIsZ0JBQVEsSUFBUjtBQUNBLGdCQUFRLENBQUMsS0FBSyxZQUFMLElBQXFCLENBQUMsS0FBSyxNQUFMLEdBQWMsa0JBQXJDLEdBQTBELG9CQUExRDtPQUZWLEVBakJLOztBQXNCTCxVQUFJLENBQUMsS0FBSyxZQUFMLElBQXFCLENBQUMsS0FBSyxNQUFMLEVBQWE7QUFDdEMsZUFBTyxNQUFQLEdBQWdCLEdBQWhCLENBRHNDO0FBRXRDLGVBQU8sSUFBUCxHQUFjO0FBQ1osY0FBSSxpQkFBSjtBQUNBLG1CQUFTLGdFQUFUO0FBQ0EsZUFBSyx5Q0FBTDtBQUNBLGdCQUFNLENBQU47QUFDQSxrQkFBUSxHQUFSO0FBQ0Esc0JBQVksR0FBWjtTQU5GLENBRnNDO09BQXhDLE1BVU8sSUFBSSxLQUFLLE1BQUwsS0FBZ0IsR0FBaEIsSUFBdUIsUUFBTyxPQUFPLElBQVAsQ0FBUCxLQUF1QixRQUF2QixFQUFpQztBQUNqRSxlQUFPLElBQVAsR0FBYztBQUNaLGNBQUkscUJBQUo7QUFDQSxtQkFBUyxlQUFlLFFBQVEsTUFBUixJQUFrQixLQUFsQixDQUFmLEdBQTBDLEdBQTFDLEdBQWdELFFBQVEsR0FBUixHQUFjLGlCQUE5RDtBQUNULGtCQUFRLEtBQUssTUFBTDtBQUNSLHNCQUFZLEdBQVo7QUFDQSxnQkFBTSxHQUFOO0FBQ0EsZUFBSyx5Q0FBTDtTQU5GLENBRGlFO09BQTVELE1BU0EsSUFBSSxPQUFPLE9BQU8sSUFBUCxLQUFnQixRQUF2QixJQUFtQyxLQUFLLE1BQUwsSUFBZSxHQUFmLEVBQW9CO0FBQ2hFLGVBQU8sSUFBUCxHQUFjO0FBQ1osY0FBSSxlQUFKO0FBQ0EsbUJBQVMsT0FBTyxJQUFQO0FBQ1Qsa0JBQVEsS0FBSyxNQUFMO0FBQ1Isc0JBQVksS0FBSyxNQUFMO0FBQ1osZ0JBQU0sQ0FBTjtBQUNBLGVBQUsseUNBQUw7U0FORixDQURnRTtPQUEzRDtLQTVDVDs7QUF3REEsUUFBSSxRQUFRLE9BQVIsSUFBbUIsQ0FBQyxRQUFRLE9BQVIsQ0FBZ0IsTUFBaEIsSUFBMEIsRUFBMUIsQ0FBRCxDQUErQixLQUEvQixDQUFxQyw4QkFBckMsQ0FBbkIsRUFBeUY7QUFDM0YsVUFBTSxRQUFRLEtBQUssaUJBQUwsQ0FBdUIsTUFBdkIsQ0FBUixDQURxRjtBQUUzRixVQUFJLEtBQUosRUFBVyxPQUFPLEtBQVAsR0FBZSxpQkFBaUIsS0FBakIsQ0FBZixDQUFYO0tBRkY7QUFJQSxXQUFPLEdBQVAsR0FBYSxJQUFiLENBekUrQjs7QUEyRS9CLFFBQUksUUFBSixFQUFjLFNBQVMsTUFBVCxFQUFkO0dBM0VhLENBSnVCOztBQWtGdEMsTUFBSSxNQUFKLEdBQWEsTUFBYjs7O0FBbEZzQyxLQXFGdEMsQ0FBSSxPQUFKLEdBQWMsSUFBSSxTQUFKLEdBQWdCLE1BQWhCOzs7O0FBckZ3QixNQXlGaEMsY0FBYyxPQUFPLElBQVAsQ0FBWSxRQUFRLE9BQVIsSUFBbUIsRUFBbkIsQ0FBMUIsQ0F6RmdDO0FBMEZ0QyxNQUFNLFVBQVUsRUFBVixDQTFGZ0M7QUEyRnRDLGNBQVksT0FBWixDQUFvQixrQkFBVTtBQUM1QixRQUFJLE9BQU8sV0FBUCxPQUF5QixjQUF6QixFQUF5QztBQUMzQyxjQUFRLGNBQVIsSUFBMEIsUUFBUSxPQUFSLENBQWdCLE1BQWhCLENBQTFCLENBRDJDO0tBQTdDLE1BRU87QUFDTCxjQUFRLE9BQU8sV0FBUCxFQUFSLElBQWdDLFFBQVEsT0FBUixDQUFnQixNQUFoQixDQUFoQyxDQURLO0tBRlA7R0FEa0IsQ0FBcEIsQ0EzRnNDO0FBa0d0QyxVQUFRLE9BQVIsR0FBa0IsT0FBbEIsQ0FsR3NDOztBQW9HdEMsTUFBSSxPQUFPLEVBQVAsQ0FwR2tDO0FBcUd0QyxNQUFJLFFBQVEsSUFBUixFQUFjO0FBQ2hCLFFBQUksT0FBTyxJQUFQLEtBQWdCLFdBQWhCLElBQStCLFFBQVEsSUFBUixZQUF3QixJQUF4QixFQUE4QjtBQUMvRCxhQUFPLFFBQVEsSUFBUixDQUR3RDtLQUFqRSxNQUVPLElBQUksUUFBUSxPQUFSLEtBQ1AsT0FBTyxRQUFRLE9BQVIsQ0FBZ0IsY0FBaEIsQ0FBUCxFQUF3QyxLQUF4QyxDQUE4QyxvQkFBOUMsS0FDQSxPQUFPLFFBQVEsT0FBUixDQUFnQixjQUFoQixDQUFQLE1BQTRDLGtDQUE1QyxDQUZPLEVBR1Q7QUFDQSxhQUFPLE9BQU8sUUFBUSxJQUFSLEtBQWlCLFFBQXhCLEdBQW1DLFFBQVEsSUFBUixHQUFlLEtBQUssU0FBTCxDQUFlLFFBQVEsSUFBUixDQUFqRSxDQURQO0tBSEssTUFLQSxJQUFJLFFBQVEsSUFBUixJQUFnQixRQUFPLFFBQVEsSUFBUixDQUFQLEtBQXdCLFFBQXhCLEVBQWtDO0FBQzNELGFBQU8sSUFBUCxDQUFZLFFBQVEsSUFBUixDQUFaLENBQTBCLE9BQTFCLENBQWtDLGdCQUFRO0FBQ3hDLFlBQUksSUFBSixFQUFVLFFBQVEsR0FBUixDQUFWO0FBQ0EsZ0JBQVEsT0FBTyxHQUFQLEdBQWEsUUFBUSxJQUFSLENBQWEsSUFBYixDQUFiLENBRmdDO09BQVIsQ0FBbEMsQ0FEMkQ7S0FBdEQsTUFLQTtBQUNMLGFBQU8sUUFBUSxJQUFSO0FBREYsS0FMQTtHQVJUO0FBaUJBLE1BQUksSUFBSixFQUFVO0FBQ1IsUUFBSSxXQUFXLEtBQVgsRUFBa0I7QUFDcEIsY0FBUSxHQUFSLElBQWUsTUFBTSxJQUFOLENBREs7S0FBdEI7R0FERjs7QUFNQSxNQUFJLElBQUosQ0FBUyxNQUFULEVBQWlCLFFBQVEsR0FBUixFQUFhLElBQTlCLEVBNUhzQztBQTZIdEMsTUFBSSxRQUFRLE9BQVIsRUFBaUIsSUFBSSxPQUFKLEdBQWMsUUFBUSxPQUFSLENBQW5DO0FBQ0EsTUFBSSxRQUFRLGVBQVIsRUFBeUIsSUFBSSxlQUFKLEdBQXNCLElBQXRCLENBQTdCO0FBQ0EsTUFBSSxRQUFRLFlBQVIsRUFBc0IsSUFBSSxZQUFKLEdBQW1CLFFBQVEsWUFBUixDQUE3Qzs7QUFFQSxNQUFJLFFBQVEsT0FBUixFQUFpQjtBQUNuQixXQUFPLElBQVAsQ0FBWSxRQUFRLE9BQVIsQ0FBWixDQUE2QixPQUE3QixDQUFxQzthQUFjLElBQUksZ0JBQUosQ0FBcUIsVUFBckIsRUFBaUMsUUFBUSxPQUFSLENBQWdCLFVBQWhCLENBQWpDO0tBQWQsQ0FBckMsQ0FEbUI7R0FBckI7O0FBSUEsTUFBSTtBQUNGLFFBQUksV0FBVyxLQUFYLEVBQWtCO0FBQ3BCLFVBQUksSUFBSixHQURvQjtLQUF0QixNQUVPO0FBQ0wsVUFBSSxJQUFKLENBQVMsSUFBVCxFQURLO0tBRlA7R0FERixDQU1FLE9BQU8sQ0FBUCxFQUFVOztHQUFWO0NBM0lhOztBQWdKakIsSUFBTSxZQUFZLEVBQVo7QUFDTixPQUFPLE9BQVAsQ0FBZSxxQkFBZixHQUF1QztTQUFRLFVBQVUsSUFBVixDQUFlLElBQWY7Q0FBUjs7QUFFdkMsT0FBTyxPQUFQLENBQWUsT0FBZixHQUF5QixVQUFDLEdBQUQsRUFBUztBQUNoQyxZQUFVLE9BQVYsQ0FBa0IsZ0JBQVE7QUFDeEIsU0FBSyxHQUFMLEVBRHdCO0dBQVIsQ0FBbEIsQ0FEZ0M7Q0FBVCIsImZpbGUiOiJ4aHIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEJhc2ljIFhIUiBMaWJyYXJ5IHdpdGggc29tZSBub3Rpb25zIGhhcmRjb2RlZCBpblxuICogb2Ygd2hhdCB0aGUgTGF5ZXIgc2VydmVyIGV4cGVjdHMvcmV0dXJucy5cbiAqXG4gICAgbGF5ZXIueGhyKHtcbiAgICAgIHVybDogJ2h0dHA6Ly9teS5jb20vbXlkYXRhJyxcbiAgICAgIGRhdGE6IHtoZXk6ICdobycsIHRoZXJlOiAnZm9sayd9LFxuICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgIGZvcm1hdDogJ2pzb24nLFxuICAgICAgaGVhZGVyczogeydmcmVkJzogJ0pvZSd9LFxuICAgICAgdGltZW91dDogNTAwMDBcbiAgICB9LCBmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgZXJyb3JIYW5kbGVyKHJlc3VsdC5kYXRhLCByZXN1bHQuaGVhZGVycywgcmVzdWx0LnN0YXR1cyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdWNjZXNzSGFuZGxlcihyZXN1bHQuZGF0YSwgcmVzdWx0LmhlYWRlcnMsIHJlc3VsdC54aHIpO1xuICAgICAgfVxuICAgIH0pO1xuICpcbiAqIEBjbGFzcyBsYXllci54aHJcbiAqL1xuXG4vKipcbiAqIFNlbmQgYSBSZXF1ZXN0LlxuICpcbiAqIEBtZXRob2QgIHhoclxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBwYXJhbSB7c3RyaW5nfSBvcHRpb25zLnVybFxuICogQHBhcmFtIHtNaXhlZH0gW29wdGlvbnMuZGF0YT1udWxsXVxuICogQHBhcmFtIHtzdHJpbmd9IFtvcHRpb25zLmZvcm1hdD0nJ10gLSBzZXQgdG8gJ2pzb24nIHRvIGdldCByZXN1bHQgcGFyc2VkIGFzIGpzb24gKGluIGNhc2UgdGhlcmUgaXMgbm8gb2J2aW91cyBDb250ZW50LVR5cGUgaW4gdGhlIHJlc3BvbnNlKVxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLmhlYWRlcnM9e31dIC0gTmFtZSB2YWx1ZSBwYWlycyBmb3IgIGhlYWRlcnMgYW5kIHRoZWlyIHZhbHVlc1xuICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLnRpbWVvdXQ9MF0gLSBXaGVuIGRvZXMgdGhlIHJlcXVlc3QgZXhwaXJlL3RpbWVvdXQgaW4gbWlsaXNlY29uZHMuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICogQHBhcmFtIHtPYmplY3R9IGNhbGxiYWNrLnJlc3VsdFxuICogQHBhcmFtIHtudW1iZXJ9IGNhbGxiYWNrLnJlc3VsdC5zdGF0dXMgLSBodHRwIHN0YXR1cyBjb2RlXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGNhbGxiYWNrLnJlc3VsdC5zdWNjZXNzIC0gdHJ1ZSBpZiBpdCB3YXMgYSBzdWNjZXNzZnVsIHJlc3BvbnNlXG4gKiBAcGFyYW0ge1hNTEh0dHBSZXF1ZXN0fSBjYWxsYmFjay5yZXN1bHQueGhyIC0gVGhlIFhIUiBvYmplY3QgdXNlZCBmb3IgdGhlIHJlcXVlc3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBjYWxsYmFjay5yZXN1bHQuZGF0YSAtICBUaGUgcGFyc2VkIHJlc3BvbnNlIGJvZHlcbiAqXG4gKiBUT0RPOlxuICpcbiAqIDEuIE1ha2UgdGhpcyBhIHN1YmNsYXNzIG9mIFJvb3QgYW5kIG1ha2UgaXQgYSBzaW5nbGV0b24gc28gaXQgY2FuIGluaGVyaXQgYSBwcm9wZXIgZXZlbnQgc3lzdGVtXG4gKiAyLiBSZXN1bHQgc2hvdWxkIGJlIGEgbGF5ZXIuU2VydmVyUmVzcG9uc2UgaW5zdGFuY2VcbiAqIDMuIFNob3VsZCBvbmx5IGFjY2VzcyBsaW5rIGhlYWRlcnMgaWYgcmVxdWVzdGVkOyBhbm5veWluZyBoYXZpbmcgaXQgdGhyb3cgZXJyb3JzIGV2ZXJ5IG90aGVyIHRpbWUuXG4gKi9cblxuLy8gRG9uJ3Qgc2V0IHhociB0byB3aW5kb3cuWE1MSHR0cFJlcXVlc3QgYXMgaXQgd2lsbCBieXBhc3MgamFzbWluZSdzXG4vLyBhamF4IGxpYnJhcnlcbmNvbnN0IFhociA9ICh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJykgPyByZXF1aXJlKCd4aHIyJykgOiBudWxsO1xuXG5mdW5jdGlvbiBwYXJzZUxpbmtIZWFkZXJzKGxpbmtIZWFkZXIpIHtcbiAgaWYgKCFsaW5rSGVhZGVyKSByZXR1cm4ge307XG5cbiAgLy8gU3BsaXQgcGFydHMgYnkgY29tbWFcbiAgY29uc3QgcGFydHMgPSBsaW5rSGVhZGVyLnNwbGl0KCcsJyk7XG4gIGNvbnN0IGxpbmtzID0ge307XG5cbiAgLy8gUGFyc2UgZWFjaCBwYXJ0IGludG8gYSBuYW1lZCBsaW5rXG4gIHBhcnRzLmZvckVhY2gocGFydCA9PiB7XG4gICAgY29uc3Qgc2VjdGlvbiA9IHBhcnQuc3BsaXQoJzsnKTtcbiAgICBpZiAoc2VjdGlvbi5sZW5ndGggIT09IDIpIHJldHVybjtcbiAgICBjb25zdCB1cmwgPSBzZWN0aW9uWzBdLnJlcGxhY2UoLzwoLiopPi8sICckMScpLnRyaW0oKTtcbiAgICBjb25zdCBuYW1lID0gc2VjdGlvblsxXS5yZXBsYWNlKC9yZWw9Jz8oLiopJz8vLCAnJDEnKS50cmltKCk7XG4gICAgbGlua3NbbmFtZV0gPSB1cmw7XG4gIH0pO1xuXG4gIHJldHVybiBsaW5rcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSAocmVxdWVzdCwgY2FsbGJhY2spID0+IHtcbiAgY29uc3QgcmVxID0gWGhyID8gbmV3IFhocigpIDogbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gIGNvbnN0IG1ldGhvZCA9IChyZXF1ZXN0Lm1ldGhvZCB8fCAnR0VUJykudG9VcHBlckNhc2UoKTtcblxuICBjb25zdCBvbmxvYWQgPSBmdW5jdGlvbiBvbmxvYWQoKSB7XG4gICAgY29uc3QgaGVhZGVycyA9IHtcbiAgICAgICdjb250ZW50LXR5cGUnOiB0aGlzLmdldFJlc3BvbnNlSGVhZGVyKCdjb250ZW50LXR5cGUnKSxcbiAgICB9O1xuXG4gICAgY29uc3QgcmVzdWx0ID0ge1xuICAgICAgc3RhdHVzOiB0aGlzLnN0YXR1cyxcbiAgICAgIHN1Y2Nlc3M6IHRoaXMuc3RhdHVzICYmIHRoaXMuc3RhdHVzIDwgMzAwLFxuICAgICAgeGhyOiB0aGlzLFxuICAgIH07XG4gICAgY29uc3QgaXNKU09OID0gKFN0cmluZyhoZWFkZXJzWydjb250ZW50LXR5cGUnXSkuc3BsaXQoLzsvKVswXS5tYXRjaCgvXmFwcGxpY2F0aW9uXFwvanNvbi8pIHx8XG4gICAgICAgICAgIHJlcXVlc3QuZm9ybWF0ID09PSAnanNvbicpO1xuXG4gICAgaWYgKHRoaXMucmVzcG9uc2VUeXBlID09PSAnYmxvYicgfHwgdGhpcy5yZXNwb25zZVR5cGUgPT09ICdhcnJheWJ1ZmZlcicpIHtcbiAgICAgIC8vIERhbW5pdCwgdGhpcy5yZXNwb25zZSBpcyBhIGZ1bmN0aW9uIGlmIHVzaW5nIGphc21pbmUgdGVzdCBmcmFtZXdvcmsuXG4gICAgICByZXN1bHQuZGF0YSA9IHR5cGVvZiB0aGlzLnJlc3BvbnNlID09PSAnZnVuY3Rpb24nID8gdGhpcy5yZXNwb25zZVRleHQgOiB0aGlzLnJlc3BvbnNlO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoaXNKU09OICYmIHRoaXMucmVzcG9uc2VUZXh0KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmVzdWx0LmRhdGEgPSBKU09OLnBhcnNlKHRoaXMucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgcmVzdWx0LmRhdGEgPSB7XG4gICAgICAgICAgICBjb2RlOiA5OTksXG4gICAgICAgICAgICBtZXNzYWdlOiAnSW52YWxpZCBKU09OIGZyb20gc2VydmVyJyxcbiAgICAgICAgICAgIHJlc3BvbnNlOiB0aGlzLnJlc3BvbnNlVGV4dCxcbiAgICAgICAgICB9O1xuICAgICAgICAgIHJlc3VsdC5zdGF0dXMgPSA5OTk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gdGhpcy5yZXNwb25zZVRleHQ7XG4gICAgICB9XG5cblxuICAgICAgbW9kdWxlLmV4cG9ydHMudHJpZ2dlcih7XG4gICAgICAgIHRhcmdldDogdGhpcyxcbiAgICAgICAgc3RhdHVzOiAhdGhpcy5yZXNwb25zZVRleHQgJiYgIXRoaXMuc3RhdHVzID8gJ2Nvbm5lY3Rpb246ZXJyb3InIDogJ2Nvbm5lY3Rpb246c3VjY2VzcycsXG4gICAgICB9KTtcblxuICAgICAgaWYgKCF0aGlzLnJlc3BvbnNlVGV4dCAmJiAhdGhpcy5zdGF0dXMpIHtcbiAgICAgICAgcmVzdWx0LnN0YXR1cyA9IDQwODtcbiAgICAgICAgcmVzdWx0LmRhdGEgPSB7XG4gICAgICAgICAgaWQ6ICdyZXF1ZXN0X3RpbWVvdXQnLFxuICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgc2VydmVyIGlzIG5vdCByZXNwb25kaW5nIHBsZWFzZSB0cnkgYWdhaW4gaW4gYSBmZXcgbWludXRlcycsXG4gICAgICAgICAgdXJsOiAnaHR0cHM6Ly9kZXZlbG9wZXIubGF5ZXIuY29tL2RvY3Mvd2Vic2RrJyxcbiAgICAgICAgICBjb2RlOiAwLFxuICAgICAgICAgIHN0YXR1czogNDA4LFxuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwOCxcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5zdGF0dXMgPT09IDQwNCAmJiB0eXBlb2YgcmVzdWx0LmRhdGEgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJlc3VsdC5kYXRhID0ge1xuICAgICAgICAgIGlkOiAnb3BlcmF0aW9uX25vdF9mb3VuZCcsXG4gICAgICAgICAgbWVzc2FnZTogJ0VuZHBvaW50ICcgKyAocmVxdWVzdC5tZXRob2QgfHwgJ0dFVCcpICsgJyAnICsgcmVxdWVzdC51cmwgKyAnIGRvZXMgbm90IGV4aXN0JyxcbiAgICAgICAgICBzdGF0dXM6IHRoaXMuc3RhdHVzLFxuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwNCxcbiAgICAgICAgICBjb2RlOiAxMDYsXG4gICAgICAgICAgdXJsOiAnaHR0cHM6Ly9kZXZlbG9wZXIubGF5ZXIuY29tL2RvY3Mvd2Vic2RrJyxcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHJlc3VsdC5kYXRhID09PSAnc3RyaW5nJyAmJiB0aGlzLnN0YXR1cyA+PSA0MDApIHtcbiAgICAgICAgcmVzdWx0LmRhdGEgPSB7XG4gICAgICAgICAgaWQ6ICd1bmtub3duX2Vycm9yJyxcbiAgICAgICAgICBtZXNzYWdlOiByZXN1bHQuZGF0YSxcbiAgICAgICAgICBzdGF0dXM6IHRoaXMuc3RhdHVzLFxuICAgICAgICAgIGh0dHBTdGF0dXM6IHRoaXMuc3RhdHVzLFxuICAgICAgICAgIGNvZGU6IDAsXG4gICAgICAgICAgdXJsOiAnaHR0cHM6Ly9kZXZlbG9wZXIubGF5ZXIuY29tL2RvY3Mvd2Vic2RrJyxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocmVxdWVzdC5oZWFkZXJzICYmIChyZXF1ZXN0LmhlYWRlcnMuYWNjZXB0IHx8ICcnKS5tYXRjaCgvYXBwbGljYXRpb25cXC92bmQubGF5ZXJcXCtqc29uLykpIHtcbiAgICAgIGNvbnN0IGxpbmtzID0gdGhpcy5nZXRSZXNwb25zZUhlYWRlcignbGluaycpO1xuICAgICAgaWYgKGxpbmtzKSByZXN1bHQuTGlua3MgPSBwYXJzZUxpbmtIZWFkZXJzKGxpbmtzKTtcbiAgICB9XG4gICAgcmVzdWx0LnhociA9IHRoaXM7XG5cbiAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKHJlc3VsdCk7XG4gIH07XG5cbiAgcmVxLm9ubG9hZCA9IG9ubG9hZDtcblxuICAvLyBVTlRFU1RFRCEhIVxuICByZXEub25lcnJvciA9IHJlcS5vbnRpbWVvdXQgPSBvbmxvYWQ7XG5cbiAgLy8gUmVwbGFjZSBhbGwgaGVhZGVycyBpbiBhcmJpdHJhcnkgY2FzZSB3aXRoIGFsbCBsb3dlciBjYXNlXG4gIC8vIGZvciBlYXN5IG1hdGNoaW5nLlxuICBjb25zdCBoZWFkZXJzTGlzdCA9IE9iamVjdC5rZXlzKHJlcXVlc3QuaGVhZGVycyB8fCB7fSk7XG4gIGNvbnN0IGhlYWRlcnMgPSB7fTtcbiAgaGVhZGVyc0xpc3QuZm9yRWFjaChoZWFkZXIgPT4ge1xuICAgIGlmIChoZWFkZXIudG9Mb3dlckNhc2UoKSA9PT0gJ2NvbnRlbnQtdHlwZScpIHtcbiAgICAgIGhlYWRlcnNbJ2NvbnRlbnQtdHlwZSddID0gcmVxdWVzdC5oZWFkZXJzW2hlYWRlcl07XG4gICAgfSBlbHNlIHtcbiAgICAgIGhlYWRlcnNbaGVhZGVyLnRvTG93ZXJDYXNlKCldID0gcmVxdWVzdC5oZWFkZXJzW2hlYWRlcl07XG4gICAgfVxuICB9KTtcbiAgcmVxdWVzdC5oZWFkZXJzID0gaGVhZGVycztcblxuICBsZXQgZGF0YSA9ICcnO1xuICBpZiAocmVxdWVzdC5kYXRhKSB7XG4gICAgaWYgKHR5cGVvZiBCbG9iICE9PSAndW5kZWZpbmVkJyAmJiByZXF1ZXN0LmRhdGEgaW5zdGFuY2VvZiBCbG9iKSB7XG4gICAgICBkYXRhID0gcmVxdWVzdC5kYXRhO1xuICAgIH0gZWxzZSBpZiAocmVxdWVzdC5oZWFkZXJzICYmIChcbiAgICAgICAgU3RyaW5nKHJlcXVlc3QuaGVhZGVyc1snY29udGVudC10eXBlJ10pLm1hdGNoKC9eYXBwbGljYXRpb25cXC9qc29uLykgfHxcbiAgICAgICAgU3RyaW5nKHJlcXVlc3QuaGVhZGVyc1snY29udGVudC10eXBlJ10pID09PSAnYXBwbGljYXRpb24vdm5kLmxheWVyLXBhdGNoK2pzb24nKVxuICAgICkge1xuICAgICAgZGF0YSA9IHR5cGVvZiByZXF1ZXN0LmRhdGEgPT09ICdzdHJpbmcnID8gcmVxdWVzdC5kYXRhIDogSlNPTi5zdHJpbmdpZnkocmVxdWVzdC5kYXRhKTtcbiAgICB9IGVsc2UgaWYgKHJlcXVlc3QuZGF0YSAmJiB0eXBlb2YgcmVxdWVzdC5kYXRhID09PSAnb2JqZWN0Jykge1xuICAgICAgT2JqZWN0LmtleXMocmVxdWVzdC5kYXRhKS5mb3JFYWNoKG5hbWUgPT4ge1xuICAgICAgICBpZiAoZGF0YSkgZGF0YSArPSAnJic7XG4gICAgICAgIGRhdGEgKz0gbmFtZSArICc9JyArIHJlcXVlc3QuZGF0YVtuYW1lXTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBkYXRhID0gcmVxdWVzdC5kYXRhOyAvLyBTb21lIGZvcm0gb2YgcmF3IHN0cmluZy9kYXRhXG4gICAgfVxuICB9XG4gIGlmIChkYXRhKSB7XG4gICAgaWYgKG1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICAgIHJlcXVlc3QudXJsICs9ICc/JyArIGRhdGE7XG4gICAgfVxuICB9XG5cbiAgcmVxLm9wZW4obWV0aG9kLCByZXF1ZXN0LnVybCwgdHJ1ZSk7XG4gIGlmIChyZXF1ZXN0LnRpbWVvdXQpIHJlcS50aW1lb3V0ID0gcmVxdWVzdC50aW1lb3V0O1xuICBpZiAocmVxdWVzdC53aXRoQ3JlZGVudGlhbHMpIHJlcS53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuICBpZiAocmVxdWVzdC5yZXNwb25zZVR5cGUpIHJlcS5yZXNwb25zZVR5cGUgPSByZXF1ZXN0LnJlc3BvbnNlVHlwZTtcblxuICBpZiAocmVxdWVzdC5oZWFkZXJzKSB7XG4gICAgT2JqZWN0LmtleXMocmVxdWVzdC5oZWFkZXJzKS5mb3JFYWNoKGhlYWRlck5hbWUgPT4gcmVxLnNldFJlcXVlc3RIZWFkZXIoaGVhZGVyTmFtZSwgcmVxdWVzdC5oZWFkZXJzW2hlYWRlck5hbWVdKSk7XG4gIH1cblxuICB0cnkge1xuICAgIGlmIChtZXRob2QgPT09ICdHRVQnKSB7XG4gICAgICByZXEuc2VuZCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXEuc2VuZChkYXRhKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICAvLyBkbyBub3RoaW5nXG4gIH1cbn07XG5cbmNvbnN0IGxpc3RlbmVycyA9IFtdO1xubW9kdWxlLmV4cG9ydHMuYWRkQ29ubmVjdGlvbkxpc3RlbmVyID0gZnVuYyA9PiBsaXN0ZW5lcnMucHVzaChmdW5jKTtcblxubW9kdWxlLmV4cG9ydHMudHJpZ2dlciA9IChldnQpID0+IHtcbiAgbGlzdGVuZXJzLmZvckVhY2goZnVuYyA9PiB7XG4gICAgZnVuYyhldnQpO1xuICB9KTtcbn07XG4iXX0=
