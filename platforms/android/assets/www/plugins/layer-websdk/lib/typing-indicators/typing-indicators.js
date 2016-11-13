'use strict';

/**
 * Static properties here only needed if your directly using
 * the layer.TypingIndicators.TypingPublisher (not needed if
 * you are using the layer.TypingIndicators.TypingListener).
 *
 *      typingPublisher.setState(layer.TypingIndicators.STARTED);
 *
 * @class  layer.TypingIndicators
 * @static
 */
module.exports = {
  /**
   * Typing has started/resumed
   * @type {String}
   * @static
   */
  STARTED: 'started',

  /**
   * Typing has paused
   * @type {String}
   * @static
   */
  PAUSED: 'paused',

  /**
   * Typing has finished
   * @type {String}
   * @static
   */
  FINISHED: 'finished'
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy90eXBpbmctaW5kaWNhdG9ycy90eXBpbmctaW5kaWNhdG9ycy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFVQSxPQUFPLE9BQVAsR0FBaUI7Ozs7OztBQU1mLFdBQVMsU0FBVDs7Ozs7OztBQU9BLFVBQVEsUUFBUjs7Ozs7OztBQU9BLFlBQVUsVUFBVjtDQXBCRiIsImZpbGUiOiJ0eXBpbmctaW5kaWNhdG9ycy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogU3RhdGljIHByb3BlcnRpZXMgaGVyZSBvbmx5IG5lZWRlZCBpZiB5b3VyIGRpcmVjdGx5IHVzaW5nXG4gKiB0aGUgbGF5ZXIuVHlwaW5nSW5kaWNhdG9ycy5UeXBpbmdQdWJsaXNoZXIgKG5vdCBuZWVkZWQgaWZcbiAqIHlvdSBhcmUgdXNpbmcgdGhlIGxheWVyLlR5cGluZ0luZGljYXRvcnMuVHlwaW5nTGlzdGVuZXIpLlxuICpcbiAqICAgICAgdHlwaW5nUHVibGlzaGVyLnNldFN0YXRlKGxheWVyLlR5cGluZ0luZGljYXRvcnMuU1RBUlRFRCk7XG4gKlxuICogQGNsYXNzICBsYXllci5UeXBpbmdJbmRpY2F0b3JzXG4gKiBAc3RhdGljXG4gKi9cbm1vZHVsZS5leHBvcnRzID0ge1xuICAvKipcbiAgICogVHlwaW5nIGhhcyBzdGFydGVkL3Jlc3VtZWRcbiAgICogQHR5cGUge1N0cmluZ31cbiAgICogQHN0YXRpY1xuICAgKi9cbiAgU1RBUlRFRDogJ3N0YXJ0ZWQnLFxuXG4gIC8qKlxuICAgKiBUeXBpbmcgaGFzIHBhdXNlZFxuICAgKiBAdHlwZSB7U3RyaW5nfVxuICAgKiBAc3RhdGljXG4gICAqL1xuICBQQVVTRUQ6ICdwYXVzZWQnLFxuXG4gIC8qKlxuICAgKiBUeXBpbmcgaGFzIGZpbmlzaGVkXG4gICAqIEB0eXBlIHtTdHJpbmd9XG4gICAqIEBzdGF0aWNcbiAgICovXG4gIEZJTklTSEVEOiAnZmluaXNoZWQnLFxufTtcbiJdfQ==
