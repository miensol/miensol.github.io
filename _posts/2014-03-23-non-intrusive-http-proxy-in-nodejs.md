---
title: "Nonintrusive http proxy in nodejs"
layout: "post"
categories: [nodejs, http, proxy]
permalink: "/2014/03/23/nonintrusive-http-proxy-in-nodejs.html"
date: "2014-03-23 22:14:00"
---

In my previous posts I wrote about problems that might occur when
using http proxy written in nodejs to debug http issues.
Today I'm going to describe how to use nodejs builtin parser to 
overcome these problems.
##Nodejs streams
Node.js has decent support for handling streams. Especially
the `pipe` function takes a lot of burden away - whereas previously
it had to be carefully handled by programmer.
As a first step let's use a simple socket server and tunnel http requests
through it:

```javascript
var net = require('net');
var stdout = process.stdout;
var server = net.createServer(function(clientSocket){
  var serverSocket = net.connect(8888,'localhost', function(){

      clientSocket.pipe(serverSocket);
      clientSocket.pipe(stdout);

      serverSocket.pipe(clientSocket);
      serverSocket.pipe(stdout);

  });
});
server.listen(9000);
```

The above code creates a socket server listening on port `9000`.
When it gets a connection from client it will immediately try to
connect to other server listening on port `8888` - this is a port
used by Fiddler or Charles. After the connection is established
it uses `pipe` function to pass all data coming in on port `9000`
to port `8888` as well as to standard output just so we can see
what data is sent from client. We also need to pass data returned
from port `8888` back to client that's why there is the second pair
of `pipe` calls.

With that we can already use `curl` to see raw http traffic written
directly to standard output.

```bash
curl http://wp.pl/ --proxy http://localhost:9000/
```

##Creating http proxy on network level
The above example albeit simple doesn't really provide any value as
we still need a *external* proxy to properly pass http traffic.
In order to make it a **real** http proxy we need to add parsing logic
that will extract information about target server where we should pass
incoming data too. While building a very simple http parser isn't difficult
why don't we use existing one that is built right into node.js core http module?

Using node.js http parser isn't exactly documented and I guess it's not
part of public API. Nevertheless it is exposed to client code intentionally
and a quick look through the core http module source code gives
enough examples of how to use it. With existing parser
instance the only thing left to do is to extract `Host` header
value, use it to connect to target server. Here is a core part
of code required:

```javascript
net.createServer(function (socketRequest) {
    var requestParser = HttpParsingStream.createForRequest(socketRequest);

    requestParser.on('headers', function (req) {
        //pause the request until we setup necessary plumbing
        req.pause();
        //extract information about target server
        var hostNameHeader = req.headers.host,
            hostAndPort = hostNameHeader.split(':'),
            host = hostAndPort[0],
            port = parseInt(hostAndPort[1]) || 80;
        // now we now where to tunnel client request
        var srvSocket = net.connect(port, host, function () {
            //a response parser as a replacement for stdout
            var responseParser = HttpParsingStream.createForResponse(srvSocket);
            srvSocket.pipe(responseParser);
            //pipe data from server to client
            srvSocket.pipe(socketRequest);

            //flush data buffered in parser to target server
            requestParser.writeCurrentChunks(srvSocket);
            //pipe remaining data from client to target server
            socketRequest.pipe(srvSocket);
            //resume processing
            req.resume();
        });
    });

    //pipe data from client to request parser
    socketRequest.pipe(requestParser);

}).listen(9000);
```

The above code makes use of `HttpParsingStream` which is a hand
rolled writable `Stream` that uses node.js http parser to emit
events. As you can see we first pipe client socket to `requestParser`
to get information about target server. As soon as we get `headers`
event the incoming client request is paused, we setup connection
to target server, write raw data buffered in `requestParser`
and setup `pipe`s in a similar fashion as in the previous example.
The most important property of this http proxy is that it
**does not change** data coming from client and from target server
in any way which is invaluable when debugging problems in
http implementations.

## HttpParsingStream explained
The above example relies on 2 instances of `HttpParsingStream`
for request and response respectively:

```javascript
var net = require('net'),
    http = require('http'),
    stream = require('stream'),
    Writable = stream.Writable,
    parsers = http.parsers,
    HTTPParser = process.binding('http_parser').HTTPParser,
    util = require('util');

var HttpParsingStream = function (options) {
    Writable.call(this, {});
    var socket = options.socket;
    //get an instance of node parser
    var parser = parsers.alloc();
    //buffer for raw data
    var streamChunks = [];
    var that = this;
    //initialize as request or response parser
    parser.reinitialize(options.parserMode);
    parser.socket = socket;
    socket.parser = parser;
    //called by node http module when headers are parsed
    parser.onIncoming = function (request) {
        that.emit('headers', request);
        request.on('data', function () {
            //this is one of ways to get 'end' event
        });
        request.on('end', function () {
            that.emit('end');
            //free parser
            freeParser(parser, request);
        });
    };
    socket.on('close', function () {
        that.emit('socket.close');
    });

    this._write = function (chunk, encoding, callback) {
        streamChunks.push({
            chunk: chunk,
            encoding: encoding
        });
        //pass data to parser
        parser.execute(chunk, 0, chunk.length);
        callback && callback();
    };

    //write data currently in buffer to other stream
    this.writeCurrentChunks = function (writableStream) {
        streamChunks.forEach(function (chunkObj) {
            writableStream.write(chunkObj.chunk, chunkObj.encoding);
        });
    };
};
util.inherits(HttpParsingStream, Writable);
```

The `HttpParsingStream` accepts 2 options:

- `socket` for underlying request and response
- `parserMode` used to properly initialise node.js http parser

Here's how we create objects with it:

```javascript

HttpParsingStream.createForRequest = function (socket) {
    return new HttpParsingStream({
        socket: socket,
        parserMode: HTTPParser.REQUEST,
        //used only for debugging
        name: 'request'
    });
};
HttpParsingStream.createForResponse = function (socket) {
    return new HttpParsingStream({
        socket: socket,
        parserMode: HTTPParser.RESPONSE,
        //used only for debugging
        name: 'response'
    });
};
```

Because `HttpParsingStream` is a `Writable` stream we can
use it as:

```javascript
socketRequest.pipe(HttpParsingStream.createForRequest(socketRequest));

serverSocket.pipe(HttpParsingStream.createForResponse(serverSocket));
```

and let node.js code handle buffering, pausing and resuming.
There is also one additional function used to clean up and return
a parser instance back to pool - it's a copy paste from node.js
http module source code:

```javascript
function freeParser(parser, req) {
    if (parser) {
        parser._headers = [];
        parser.onIncoming = null;
        if (parser.socket) {
            parser.socket.onend = null;
            parser.socket.ondata = null;
            parser.socket.parser = null;
        }
        parser.socket = null;
        parser.incoming = null;
        parsers.free(parser);
        parser = null;
    }
    if (req) {
        req.parser = null;
    }
}
```

## Why create yet another http proxy implementation?
proxy-mirror a simple http debugging tool that I wrote
so far relies on an excellent http-proxy module.
However because http-proxy was created to be used mostly as a
reverse proxy to route http traffic to different http servers
it does not provide a way to access raw tcp data. With the above
code I now have an easy way to access the data - so I can
display it in a byte level manner - a feature of Fiddler that
I find handy from time to time.

Moreover the target server will receive a request from client in an unchanged
form. The same applies for response received by client.
This is extremely important when resolving issues related
to improper implementations of HTTP protocol.

I haven't yet checked how the above code handles WebSocket
connections - I'll explore that in a next post. For the referece
you can find full code in this [gist](https://gist.github.com/9726643).
