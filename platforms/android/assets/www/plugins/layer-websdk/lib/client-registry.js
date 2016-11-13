"use strict";

/**
 * Allows all components to have a clientId instead of a client pointer.
 * Allows an app to have multiple Clients, each with its own appId.
 * Provides a global utility that can be required by all modules for accessing
 * the client.
 *
 * @class  layer.ClientRegistry
 * @private
 */

var registry = {};

/**
 * Register a new Client; will destroy any previous client with the same appId.
 *
 * @method register
 * @param  {layer.Client} client
 */
function register(client) {
  var appId = client.appId;
  if (registry[appId] && !registry[appId].isDestroyed) {
    registry[appId].destroy();
  }
  registry[appId] = client;
}

/**
 * Removes a Client.
 *
 * @method unregister
 * @param  {layer.Client} client
 */
function unregister(client) {
  if (registry[client.appId]) delete registry[client.appId];
}

/**
 * Get a Client by appId
 *
 * @method get
 * @param  {string} appId
 * @return {layer.Client}
 */
function get(appId) {
  return registry[appId];
}

function getAll() {
  return Object.keys(registry).map(function (key) {
    return registry[key];
  });
}

module.exports = {
  get: get,
  getAll: getAll,
  register: register,
  unregister: unregister
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jbGllbnQtcmVnaXN0cnkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBVUEsSUFBTSxXQUFXLEVBQVg7Ozs7Ozs7O0FBUU4sU0FBUyxRQUFULENBQWtCLE1BQWxCLEVBQTBCO0FBQ3hCLE1BQU0sUUFBUSxPQUFPLEtBQVAsQ0FEVTtBQUV4QixNQUFJLFNBQVMsS0FBVCxLQUFtQixDQUFDLFNBQVMsS0FBVCxFQUFnQixXQUFoQixFQUE2QjtBQUNuRCxhQUFTLEtBQVQsRUFBZ0IsT0FBaEIsR0FEbUQ7R0FBckQ7QUFHQSxXQUFTLEtBQVQsSUFBa0IsTUFBbEIsQ0FMd0I7Q0FBMUI7Ozs7Ozs7O0FBY0EsU0FBUyxVQUFULENBQW9CLE1BQXBCLEVBQTRCO0FBQzFCLE1BQUksU0FBUyxPQUFPLEtBQVAsQ0FBYixFQUE0QixPQUFPLFNBQVMsT0FBTyxLQUFQLENBQWhCLENBQTVCO0NBREY7Ozs7Ozs7OztBQVdBLFNBQVMsR0FBVCxDQUFhLEtBQWIsRUFBb0I7QUFDbEIsU0FBTyxTQUFTLEtBQVQsQ0FBUCxDQURrQjtDQUFwQjs7QUFJQSxTQUFTLE1BQVQsR0FBa0I7QUFDaEIsU0FBTyxPQUFPLElBQVAsQ0FBWSxRQUFaLEVBQXNCLEdBQXRCLENBQTBCO1dBQU8sU0FBUyxHQUFUO0dBQVAsQ0FBakMsQ0FEZ0I7Q0FBbEI7O0FBSUEsT0FBTyxPQUFQLEdBQWlCO0FBQ2YsVUFEZTtBQUVmLGdCQUZlO0FBR2Ysb0JBSGU7QUFJZix3QkFKZTtDQUFqQiIsImZpbGUiOiJjbGllbnQtcmVnaXN0cnkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEFsbG93cyBhbGwgY29tcG9uZW50cyB0byBoYXZlIGEgY2xpZW50SWQgaW5zdGVhZCBvZiBhIGNsaWVudCBwb2ludGVyLlxuICogQWxsb3dzIGFuIGFwcCB0byBoYXZlIG11bHRpcGxlIENsaWVudHMsIGVhY2ggd2l0aCBpdHMgb3duIGFwcElkLlxuICogUHJvdmlkZXMgYSBnbG9iYWwgdXRpbGl0eSB0aGF0IGNhbiBiZSByZXF1aXJlZCBieSBhbGwgbW9kdWxlcyBmb3IgYWNjZXNzaW5nXG4gKiB0aGUgY2xpZW50LlxuICpcbiAqIEBjbGFzcyAgbGF5ZXIuQ2xpZW50UmVnaXN0cnlcbiAqIEBwcml2YXRlXG4gKi9cblxuY29uc3QgcmVnaXN0cnkgPSB7fTtcblxuLyoqXG4gKiBSZWdpc3RlciBhIG5ldyBDbGllbnQ7IHdpbGwgZGVzdHJveSBhbnkgcHJldmlvdXMgY2xpZW50IHdpdGggdGhlIHNhbWUgYXBwSWQuXG4gKlxuICogQG1ldGhvZCByZWdpc3RlclxuICogQHBhcmFtICB7bGF5ZXIuQ2xpZW50fSBjbGllbnRcbiAqL1xuZnVuY3Rpb24gcmVnaXN0ZXIoY2xpZW50KSB7XG4gIGNvbnN0IGFwcElkID0gY2xpZW50LmFwcElkO1xuICBpZiAocmVnaXN0cnlbYXBwSWRdICYmICFyZWdpc3RyeVthcHBJZF0uaXNEZXN0cm95ZWQpIHtcbiAgICByZWdpc3RyeVthcHBJZF0uZGVzdHJveSgpO1xuICB9XG4gIHJlZ2lzdHJ5W2FwcElkXSA9IGNsaWVudDtcbn1cblxuLyoqXG4gKiBSZW1vdmVzIGEgQ2xpZW50LlxuICpcbiAqIEBtZXRob2QgdW5yZWdpc3RlclxuICogQHBhcmFtICB7bGF5ZXIuQ2xpZW50fSBjbGllbnRcbiAqL1xuZnVuY3Rpb24gdW5yZWdpc3RlcihjbGllbnQpIHtcbiAgaWYgKHJlZ2lzdHJ5W2NsaWVudC5hcHBJZF0pIGRlbGV0ZSByZWdpc3RyeVtjbGllbnQuYXBwSWRdO1xufVxuXG4vKipcbiAqIEdldCBhIENsaWVudCBieSBhcHBJZFxuICpcbiAqIEBtZXRob2QgZ2V0XG4gKiBAcGFyYW0gIHtzdHJpbmd9IGFwcElkXG4gKiBAcmV0dXJuIHtsYXllci5DbGllbnR9XG4gKi9cbmZ1bmN0aW9uIGdldChhcHBJZCkge1xuICByZXR1cm4gcmVnaXN0cnlbYXBwSWRdO1xufVxuXG5mdW5jdGlvbiBnZXRBbGwoKSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhyZWdpc3RyeSkubWFwKGtleSA9PiByZWdpc3RyeVtrZXldKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGdldCxcbiAgZ2V0QWxsLFxuICByZWdpc3RlcixcbiAgdW5yZWdpc3Rlcixcbn07XG4iXX0=
