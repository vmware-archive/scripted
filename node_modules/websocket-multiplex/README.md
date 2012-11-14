
WebSocket-multiplex
===================

WebSocket-multiplex is a small library on top of SockJS that allows
you to do multiplexing over a single SockJS connection.

The rationale for that is explained in details in the following blog
post:

  * https://www.rabbitmq.com/blog/2012/02/23/how-to-compose-apps-using-websockets/


Usage from the browser
----------------------

On the client side (browser) load library like that:

    <script src="http://cdn.sockjs.org/websocket-multiplex-0.1.js">
      </script>

Alternatively, if you're using SSL:

    <script src="https://d1fxtkz8shb9d2.cloudfront.net/websocket-multiplex-0.1.js">
      </script>

Usage example:

```javascript
    var sockjs_url = '/multiplex';
    var sockjs = new SockJS(sockjs_url);

    var multiplexer = new WebSocketMultiplex(sockjs);
    var ann  = multiplexer.channel('ann');
    var bob  = multiplexer.channel('bob');
    var carl = multiplexer.channel('carl');
```

Usage from the node.js server
-----------------------------

On the node.js server side, you can use npm to get the code:

    npm install websocket-multiplex

And a simplistic example:

```javascript
    var multiplex_server = require('websocket-multiplex');

    // 1. Setup SockJS server
    var service = sockjs.createServer();

    // 2. Setup multiplexing
    var multiplexer = new multiplex_server.MultiplexServer(service);

    var ann = multiplexer.registerChannel('ann');
    ann.on('connection', function(conn) {
        conn.write('Ann says hi!');
        conn.on('data', function(data) {
            conn.write('Ann nods: ' + data);
        });
    });

    // 3. Setup http server
    var server = http.createServer();
    sockjs_echo.installHandlers(server, {prefix:'/multiplex'});
    var app = express.createServer();
```

For a full-featured example see the
[/examples/sockjs](https://github.com/sockjs/websocket-multiplex/tree/master/examples/sockjs)
directory.


Protocol
--------

The underlying protocol is quite simple. Each message consists of
four comma separated parts: _type_, _topic_, _id and _payload_. There are
three valid message types:

 * `sub` - expresses a will to subscribe to a given _topic_.
 * `msg` - a message with _payload_ is being sent on a _topic_.
 * `uns` - a will to unsubscribe from a _topic_.

The _topic identifies a channel registered on the server side.

The _id_ is unique id generated on the client side when it 
request to subscribe to a topic. The _id_ identifies a connection instance. 
This makes it possible for a single client to open multiple connections to 
a single server-side service.

Invalid messages like wrong unsubscriptions or publishes to a _topic_
to which a client was not subscribed to are simply ignored.

This protocol assumes that both parties are genrally willing to
copperate and no party can express any kind of errors. All invalid
messages should be ignored.

It's important to notice that the namespace is shared between both
parties and it is not a good idea to use the same topic names on the
client and on the server side. Both parties may express a will to
unsubscribe itself or other party from a topic.
