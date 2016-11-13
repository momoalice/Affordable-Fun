module.exports = {
  Root: require('./src/root'),
  Client: require('./src/client'),
  ClientAuthenticator: require('./src/client-authenticator'),
  Conversation: require('./src/conversation'),
  Message: require('./src/message'),
  MessagePart: require('./src/message-part'),
  Query: require('./src/query'),
  QueryBuilder: require('./src/query-builder'),
  xhr: require('./src/xhr'),
  User: require('./src/user'),
  LayerError: require('./src/layer-error'),
  LayerEvent: require('./src/layer-event'),
  Content: require('./src/content'),
  SyncManager: require('./src/sync-manager'),
  SyncEvent: require('./src/sync-event').SyncEvent,
  XHRSyncEvent: require('./src/sync-event').XHRSyncEvent,
  WebsocketSyncEvent: require('./src/sync-event').WebsocketSyncEvent,
  Websockets: {
    SocketManager: require('./src/websockets/socket-manager'),
    RequestManager: require('./src/websockets/request-manager'),
    ChangeManager: require('./src/websockets/change-manager'),
  },
  OnlineStateManager: require('./src/online-state-manager'),
  Constants: require('./src/const'),
  Util: require('./src/client-utils'),
  TypingIndicators: require('./src/typing-indicators/typing-indicators'),
};
module.exports.TypingIndicators.TypingListener = require('./src/typing-indicators/typing-listener');
module.exports.TypingIndicators.TypingPublisher = require('./src/typing-indicators/typing-publisher');
