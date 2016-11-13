'use strict';

/**
 * Layer Constants are stored in two places:
 *
 * 1. As part of the layer.Constants singleton
 * 2. As static properties on classes.
 *
 * Typically the static property constants are designed to be changed by developers to customize behaviors,
 * and tend to only be used by that single class.
 *
 * @class layer.Constants
 * @singleton
 */
module.exports = {
  /**
   * Is the object synchronized with the server?
   * @property {Object} [SYNC_STATE=null]
   * @property {string} SYNC_STATE.NEW      - Object is newly created, was created locally, not from server data, and has not yet been sent to the server.
   * @property {string} SYNC_STATE.SAVING   - Object is newly created and is being sent to the server.
   * @property {string} SYNC_STATE.SYNCING  - Object exists both locally and on server but is being synced with changes.
   * @property {string} SYNC_STATE.SYNCED   - Object exists both locally and on server and at last check was in sync.
   * @property {string} SYNC_STATE.LOADING  - Object is being loaded from the server and may not have its properties set yet.
   */
  SYNC_STATE: {
    NEW: 'NEW',
    SAVING: 'SAVING',
    SYNCING: 'SYNCING',
    SYNCED: 'SYNCED',
    LOADING: 'LOADING'
  },

  /**
   * Values for readStatus/deliveryStatus
   * @property {Object} [RECIPIENT_STATE=]
   * @property {string} RECIPIENT_STATE.NONE - No users have read (or received) this Message
   * @property {string} RECIPIENT_STATE.SOME - Some users have read (or received) this Message
   * @property {string} RECIPIENT_STATE.ALL  - All users have read (or received) this Message
   */
  RECIPIENT_STATE: {
    NONE: 'NONE',
    SOME: 'SOME',
    ALL: 'ALL'
  },

  /**
   * Values for recipientStatus
   * @property {Object} [RECEIPT_STATE=]
   * @property {string} RECEIPT_STATE.SENT      - The Message has been sent to the specified user but it has not yet been received by their device.
   * @property {string} RECEIPT_STATE.DELIVERED - The Message has been delivered to the specified use but has not yet been read.
   * @property {string} RECEIPT_STATE.READ      - The Message has been read by the specified user.
   * @property {string} RECEIPT_STATE.PENDING   - The request to send this Message to the specified user has not yet been received by the server.
   */
  RECEIPT_STATE: {
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
    PENDING: 'pending'
  },
  LOCALSTORAGE_KEYS: {
    SESSIONDATA: 'layer-session-data-'
  },
  ACCEPT: 'application/vnd.layer+json; version=1.0',

  /**
   * Log levels
   * @property {Object} [LOG=]
   * @property {number} LOG.DEBUG     Log detailed information about requests, responses, events, state changes, etc...
   * @property {number} LOG.INFO      Log sparse information about requests, responses and events
   * @property {number} LOG.WARN      Log failures that are expected, normal, handled, but suggests that an operation didn't complete as intended
   * @property {number} LOG.ERROR     Log failures that are not expected or could not be handled
   * @property {number} LOG.NONE      Logs? Who needs em?
   */
  LOG: {
    DEBUG: 4,
    INFO: 3,
    WARN: 2,
    ERROR: 1,
    NONE: 0
  },
  DELETION_MODE: {
    ALL: 1
  }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jb25zdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQVlBLE9BQU8sT0FBUCxHQUFpQjs7Ozs7Ozs7OztBQVVmLGNBQVk7QUFDVixTQUFLLEtBQUw7QUFDQSxZQUFRLFFBQVI7QUFDQSxhQUFTLFNBQVQ7QUFDQSxZQUFRLFFBQVI7QUFDQSxhQUFTLFNBQVQ7R0FMRjs7Ozs7Ozs7O0FBZUEsbUJBQWlCO0FBQ2YsVUFBTSxNQUFOO0FBQ0EsVUFBTSxNQUFOO0FBQ0EsU0FBSyxLQUFMO0dBSEY7Ozs7Ozs7Ozs7QUFjQSxpQkFBZTtBQUNiLFVBQU0sTUFBTjtBQUNBLGVBQVcsV0FBWDtBQUNBLFVBQU0sTUFBTjtBQUNBLGFBQVMsU0FBVDtHQUpGO0FBTUEscUJBQW1CO0FBQ2pCLGlCQUFhLHFCQUFiO0dBREY7QUFHQSxVQUFRLHlDQUFSOzs7Ozs7Ozs7OztBQVdBLE9BQUs7QUFDSCxXQUFPLENBQVA7QUFDQSxVQUFNLENBQU47QUFDQSxVQUFNLENBQU47QUFDQSxXQUFPLENBQVA7QUFDQSxVQUFNLENBQU47R0FMRjtBQU9BLGlCQUFlO0FBQ2IsU0FBSyxDQUFMO0dBREY7Q0FsRUYiLCJmaWxlIjoiY29uc3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIExheWVyIENvbnN0YW50cyBhcmUgc3RvcmVkIGluIHR3byBwbGFjZXM6XG4gKlxuICogMS4gQXMgcGFydCBvZiB0aGUgbGF5ZXIuQ29uc3RhbnRzIHNpbmdsZXRvblxuICogMi4gQXMgc3RhdGljIHByb3BlcnRpZXMgb24gY2xhc3Nlcy5cbiAqXG4gKiBUeXBpY2FsbHkgdGhlIHN0YXRpYyBwcm9wZXJ0eSBjb25zdGFudHMgYXJlIGRlc2lnbmVkIHRvIGJlIGNoYW5nZWQgYnkgZGV2ZWxvcGVycyB0byBjdXN0b21pemUgYmVoYXZpb3JzLFxuICogYW5kIHRlbmQgdG8gb25seSBiZSB1c2VkIGJ5IHRoYXQgc2luZ2xlIGNsYXNzLlxuICpcbiAqIEBjbGFzcyBsYXllci5Db25zdGFudHNcbiAqIEBzaW5nbGV0b25cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gIC8qKlxuICAgKiBJcyB0aGUgb2JqZWN0IHN5bmNocm9uaXplZCB3aXRoIHRoZSBzZXJ2ZXI/XG4gICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBbU1lOQ19TVEFURT1udWxsXVxuICAgKiBAcHJvcGVydHkge3N0cmluZ30gU1lOQ19TVEFURS5ORVcgICAgICAtIE9iamVjdCBpcyBuZXdseSBjcmVhdGVkLCB3YXMgY3JlYXRlZCBsb2NhbGx5LCBub3QgZnJvbSBzZXJ2ZXIgZGF0YSwgYW5kIGhhcyBub3QgeWV0IGJlZW4gc2VudCB0byB0aGUgc2VydmVyLlxuICAgKiBAcHJvcGVydHkge3N0cmluZ30gU1lOQ19TVEFURS5TQVZJTkcgICAtIE9iamVjdCBpcyBuZXdseSBjcmVhdGVkIGFuZCBpcyBiZWluZyBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBTWU5DX1NUQVRFLlNZTkNJTkcgIC0gT2JqZWN0IGV4aXN0cyBib3RoIGxvY2FsbHkgYW5kIG9uIHNlcnZlciBidXQgaXMgYmVpbmcgc3luY2VkIHdpdGggY2hhbmdlcy5cbiAgICogQHByb3BlcnR5IHtzdHJpbmd9IFNZTkNfU1RBVEUuU1lOQ0VEICAgLSBPYmplY3QgZXhpc3RzIGJvdGggbG9jYWxseSBhbmQgb24gc2VydmVyIGFuZCBhdCBsYXN0IGNoZWNrIHdhcyBpbiBzeW5jLlxuICAgKiBAcHJvcGVydHkge3N0cmluZ30gU1lOQ19TVEFURS5MT0FESU5HICAtIE9iamVjdCBpcyBiZWluZyBsb2FkZWQgZnJvbSB0aGUgc2VydmVyIGFuZCBtYXkgbm90IGhhdmUgaXRzIHByb3BlcnRpZXMgc2V0IHlldC5cbiAgICovXG4gIFNZTkNfU1RBVEU6IHtcbiAgICBORVc6ICdORVcnLFxuICAgIFNBVklORzogJ1NBVklORycsXG4gICAgU1lOQ0lORzogJ1NZTkNJTkcnLFxuICAgIFNZTkNFRDogJ1NZTkNFRCcsXG4gICAgTE9BRElORzogJ0xPQURJTkcnLFxuICB9LFxuXG4gIC8qKlxuICAgKiBWYWx1ZXMgZm9yIHJlYWRTdGF0dXMvZGVsaXZlcnlTdGF0dXNcbiAgICogQHByb3BlcnR5IHtPYmplY3R9IFtSRUNJUElFTlRfU1RBVEU9XVxuICAgKiBAcHJvcGVydHkge3N0cmluZ30gUkVDSVBJRU5UX1NUQVRFLk5PTkUgLSBObyB1c2VycyBoYXZlIHJlYWQgKG9yIHJlY2VpdmVkKSB0aGlzIE1lc3NhZ2VcbiAgICogQHByb3BlcnR5IHtzdHJpbmd9IFJFQ0lQSUVOVF9TVEFURS5TT01FIC0gU29tZSB1c2VycyBoYXZlIHJlYWQgKG9yIHJlY2VpdmVkKSB0aGlzIE1lc3NhZ2VcbiAgICogQHByb3BlcnR5IHtzdHJpbmd9IFJFQ0lQSUVOVF9TVEFURS5BTEwgIC0gQWxsIHVzZXJzIGhhdmUgcmVhZCAob3IgcmVjZWl2ZWQpIHRoaXMgTWVzc2FnZVxuICAgKi9cbiAgUkVDSVBJRU5UX1NUQVRFOiB7XG4gICAgTk9ORTogJ05PTkUnLFxuICAgIFNPTUU6ICdTT01FJyxcbiAgICBBTEw6ICdBTEwnLFxuICB9LFxuXG4gIC8qKlxuICAgKiBWYWx1ZXMgZm9yIHJlY2lwaWVudFN0YXR1c1xuICAgKiBAcHJvcGVydHkge09iamVjdH0gW1JFQ0VJUFRfU1RBVEU9XVxuICAgKiBAcHJvcGVydHkge3N0cmluZ30gUkVDRUlQVF9TVEFURS5TRU5UICAgICAgLSBUaGUgTWVzc2FnZSBoYXMgYmVlbiBzZW50IHRvIHRoZSBzcGVjaWZpZWQgdXNlciBidXQgaXQgaGFzIG5vdCB5ZXQgYmVlbiByZWNlaXZlZCBieSB0aGVpciBkZXZpY2UuXG4gICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBSRUNFSVBUX1NUQVRFLkRFTElWRVJFRCAtIFRoZSBNZXNzYWdlIGhhcyBiZWVuIGRlbGl2ZXJlZCB0byB0aGUgc3BlY2lmaWVkIHVzZSBidXQgaGFzIG5vdCB5ZXQgYmVlbiByZWFkLlxuICAgKiBAcHJvcGVydHkge3N0cmluZ30gUkVDRUlQVF9TVEFURS5SRUFEICAgICAgLSBUaGUgTWVzc2FnZSBoYXMgYmVlbiByZWFkIGJ5IHRoZSBzcGVjaWZpZWQgdXNlci5cbiAgICogQHByb3BlcnR5IHtzdHJpbmd9IFJFQ0VJUFRfU1RBVEUuUEVORElORyAgIC0gVGhlIHJlcXVlc3QgdG8gc2VuZCB0aGlzIE1lc3NhZ2UgdG8gdGhlIHNwZWNpZmllZCB1c2VyIGhhcyBub3QgeWV0IGJlZW4gcmVjZWl2ZWQgYnkgdGhlIHNlcnZlci5cbiAgICovXG4gIFJFQ0VJUFRfU1RBVEU6IHtcbiAgICBTRU5UOiAnc2VudCcsXG4gICAgREVMSVZFUkVEOiAnZGVsaXZlcmVkJyxcbiAgICBSRUFEOiAncmVhZCcsXG4gICAgUEVORElORzogJ3BlbmRpbmcnLFxuICB9LFxuICBMT0NBTFNUT1JBR0VfS0VZUzoge1xuICAgIFNFU1NJT05EQVRBOiAnbGF5ZXItc2Vzc2lvbi1kYXRhLScsXG4gIH0sXG4gIEFDQ0VQVDogJ2FwcGxpY2F0aW9uL3ZuZC5sYXllcitqc29uOyB2ZXJzaW9uPTEuMCcsXG5cbiAgLyoqXG4gICAqIExvZyBsZXZlbHNcbiAgICogQHByb3BlcnR5IHtPYmplY3R9IFtMT0c9XVxuICAgKiBAcHJvcGVydHkge251bWJlcn0gTE9HLkRFQlVHICAgICBMb2cgZGV0YWlsZWQgaW5mb3JtYXRpb24gYWJvdXQgcmVxdWVzdHMsIHJlc3BvbnNlcywgZXZlbnRzLCBzdGF0ZSBjaGFuZ2VzLCBldGMuLi5cbiAgICogQHByb3BlcnR5IHtudW1iZXJ9IExPRy5JTkZPICAgICAgTG9nIHNwYXJzZSBpbmZvcm1hdGlvbiBhYm91dCByZXF1ZXN0cywgcmVzcG9uc2VzIGFuZCBldmVudHNcbiAgICogQHByb3BlcnR5IHtudW1iZXJ9IExPRy5XQVJOICAgICAgTG9nIGZhaWx1cmVzIHRoYXQgYXJlIGV4cGVjdGVkLCBub3JtYWwsIGhhbmRsZWQsIGJ1dCBzdWdnZXN0cyB0aGF0IGFuIG9wZXJhdGlvbiBkaWRuJ3QgY29tcGxldGUgYXMgaW50ZW5kZWRcbiAgICogQHByb3BlcnR5IHtudW1iZXJ9IExPRy5FUlJPUiAgICAgTG9nIGZhaWx1cmVzIHRoYXQgYXJlIG5vdCBleHBlY3RlZCBvciBjb3VsZCBub3QgYmUgaGFuZGxlZFxuICAgKiBAcHJvcGVydHkge251bWJlcn0gTE9HLk5PTkUgICAgICBMb2dzPyBXaG8gbmVlZHMgZW0/XG4gICAqL1xuICBMT0c6IHtcbiAgICBERUJVRzogNCxcbiAgICBJTkZPOiAzLFxuICAgIFdBUk46IDIsXG4gICAgRVJST1I6IDEsXG4gICAgTk9ORTogMCxcbiAgfSxcbiAgREVMRVRJT05fTU9ERToge1xuICAgIEFMTDogMSxcbiAgfSxcbn07XG4iXX0=
