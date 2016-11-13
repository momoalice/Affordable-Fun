# Javascript SDK Change Log

## 1.0.8

* Disable Query Retry by default

## 1.0.7

* Improves logic around reconnecting websockets to validate that the session is still valid. (WEB-1055)
* Removes tests for Message `ffffffff....` which were used to validate the session is still valid.

## 1.0.6

* Query will retry when no data is detected in case the server has not yet received data for this user.

## 1.0.5

* Fixes bug in layer.Content.refreshContent where expiration is improperly set
* Fixes bug in layer.Query when `dataType` is layer.Query.ObjectDataType which fails to update data for a `messages:read` event

## 1.0.4

* Fixes parsing of Identity Token to handle URL Encoded strings

## 1.0.3

* Fixes support for Query.dataType == layer.Query.InstanceDataType in handling Message ID change events.

## 1.0.2

* Fixes support for the `sessionToken` in the constructor; broken with the introduction of the `isTrustedDevice` property. This is used as part of the [Alternate Authentication Process](https://developer.layer.com/docs/websdk#the-alternate-authentication-process).

## 1.0.1

* Adds `isTrustedDevice` property to layer.Client which defaults to false.  If this is false, session tokens will NOT be written to localStorage, and will not be restored next time the page reloads.

## 1.0.0

* Updated version number and language from beta to GA

## 0.9.3

* Minor bug fix to layer.Query

## 0.9.2

#### Public API Changes

* layer.Conversation
  * The `delete` method now requires a layer.Constant.DELETION_MODE argument and no longer supports Boolean arguments.
* Adds `isNew` `isSaving`, `isSynced` and `isSaved` methods; these will show up as properties when calling toObject().
* layer.Message
  * The `recipientStatus` property now returns layer.RECEIPT_STATE.PENDING for any recipient to whom the Message has not yet been sent
  * The `getImageURLs` method has been removed.
  * The `delete` method now requires a layer.Constant.DELETION_MODE argument and no longer supports Boolean arguments.
  * Adds `isNew` `isSaving`, `isSynced` and `isSaved` methods; these will show up as properties when calling toObject().
  * Removes the `isSending` property; use `isSaving` instead; `isSaving` will show up as a property for immutable objects.
* layer.MessagePart
  * The `fetchContent` method now triggers an `content-loaded-error` event if it fails to load the Content (content has expired for example, and must be refreshed)
* layer.Query
  * Now runs query as soon as client is ready (for queries created prior to Ready).
* layer.TypingIndicators.TypingListener
  * Now has a setInput method that can be used to change what input the Listener is monitoring when sending
    typing indicators to other users.
* layer.Client
  * Adds registerIOSPushToken() method for push notification support in hybrid apps
  * Adds registerAndroidPushToken() method for push notification support in hybrid apps
  * Adds unregisterPushToken() method
* layer.User
  * Flagged as a private class; it is recommended that you not use this until `v1.1` which will have Identity Management.

#### Bug Fixes

* A round of memory leak fixes

## 0.9.1

#### Bug Fixes

* layer.MessagePart now loads new Rich Content downloadUrl and expiration dates whenever Query reloads the Message.

#### Public API Changes

* layer.Query
  * The `dataType` property is now set with static properties, either layer.Query.InstanceDataType or layer.Query.ObjectDataType
  * A `paginationWindow` property larger than the maximum page size that then automatically loads multiple pages is no longer supported.  A paginationWindow larger than the maximum page size will be automatically adjusted to the maximum page size (a value of 500 will be changed to `query.data.length + 100` if its too large)
  * There is now a `totalSize` property reporting on the total number of results of the query there are on the server.
  * There is now a `size` property reporting on the total number of results of the query have been loaded from the server.
  * Previously you subscribe to `change` event and check the `evt.type` for values of `data`, `insert`, `remove`, `reset` and `property`.
    This still works, but now you can *also* choose to subscribe to `change:data`, `change:insert`, `change:remove`, `change:reset` and `change:property`.
* layer.TypingIndicators.TypingListener
  * Change to constructor parameters.  If using `client.createTypingListener` then it does not affect you
* layer.TypingIndicators.TypingPublisher
  * Change to constructor parameters.  If using `client.createTypingPublisher` then it does not affect you

#### Fixes

* Fixes issues with websocket reconnect logic

## 0.9.0 Public Beta Launch

#### Public API Changes

* layer.Client.createConversation now defaults to creating Distinct Conversations.


## 0.1.4

#### Public API Changes

* layer.Client
  * Now has an `online` event for reporting on whether it is or is not connected to the server.
  * Now clears all queries and reloads their data from the server if disconnected more than 30 hours

## 0.1.3

#### Public API Changes

* layer.Message
  * Now has an `isSending` property
  * Removes the `isLoaded` method
  * Adds the `isLoading` property
* layer.Conversation
  * Removes the `isLoaded` method
  * Adds the `isLoading` property
* layer.Client
  * Now supports a logLevel property with enhanced logging support
  * Adds `messages:notify` event which can be used to help drive desktop notifications more reliably than the `messages:add` event.

#### Fixes

* Fixes to error handling in websocket requests that timeout

## 0.1.2

#### Public API Changes

* layer.MessagePart
   * Now has a `hasContent` property
   * `loadContent()` method has been renamed to fetchContent
   * `fetchContent` now triggers a messages:change event on completion.
   * `content` property has been removed; this is now a private property
   * layer.MessagePart now has a `url` property; returns "" if url has expired.
   * `url` will be set asynchronously by calling `fetchContent()`
     This url will be to a resource cached in the browser.
   * `url` will be set asynchronously by calling `layer.MessagePart.fetchStream()`.
      This url will point to a remote resource, but this is an expiring URL.
   * The expiring url will be cleared when it has expired, requiring another
   call to fetchStream():
```
   function render(part) {}
    if (part.url) {
      return "<img src='{part.url}' />";
    } else {
      part.fetchStream(() => this.rerender());
      return "<img src='' />";
    }
  }
```
* layer.Client now provides a layer.Client.getMessagePart(id) method

#### Fixes

* Fixes to read receipts; no longer sends read receipt if already marked as read
* Fixes to Websocket reconnect logic insures that missed events are requested

## 0.1.1

#### Public API Changes

* `authenticated-expired` event has been replaced with `deauthenticated` event.
* layer.Query and layer.QueryBuilder now support a `sortBy` property which allows for sorting by `lastMessage.sentAt` or `createdAt`.
* Removes option to use XHR instead of websocket for sending messages and conversations
* `message.sendReceipt('read')` now sets the `isRead` property.
* Websocket PATCH events will load the object from the server if it isn't already cached; patch events are not emitted locally but the conversations:add/messages:add event will trigger showing the current state of the newly loaded object.
* Message.sentBy will now always have a value, even if the message is not yet sent.
* Message.isSending property has been added
* Fixes to layer.Query enable Message Queries to populate with the Conversation's lastMessage while waiting for the rest of the messages to load.
* Fixes to layer.Query now ignore any response but the most recent response (occurs when quickly changing between query predicates)


## 0.1.0

#### Public API Changes

* `client.getObject()` is now a protected method; use `client.getConversation()` or `client.getMessage()` instead
* `client.getConversation(id)` no longer loads the Conversation from the server if its not cached; `client.getConversation(id, true)` WILL load the Conversation from the server if its not cached.
* `client.getMessage(id)` no longer loads the Message from the server if its not cached; `client.getMessage(id, true)` WILL load the Message from the server if its not cached.
