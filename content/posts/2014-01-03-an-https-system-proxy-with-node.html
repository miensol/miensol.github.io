---
title: "An HTTPS system proxy with node"
template: "post"
permalink: "/2014/01/an-https-system-proxy-with-node.html"
uuid: "9086513793560316710"
guid: "tag:blogger.com,1999:blog-8010146885187116176.post-9086513793560316710"
date: "2014-01-03 06:34:00"
updated: "2014-01-03 06:34:49"
description:
blogger:
    siteid: "8010146885187116176"
    postid: "9086513793560316710"
    comments: "0"
tags: [http, node.js, https, proxy]
author:
    name: "Piotr Mionskowski"
    url: "https://plus.google.com/117451536189361867209?rel=author"
    image: "//lh3.googleusercontent.com/-6M7kaKrVJcU/AAAAAAAAAAI/AAAAAAAAAGE/QI7pFI1vNEA/s512-c/photo.jpg"
---
<p>Creating a simple http proxy in node.js is super easy thanks to an excellent module – <a href="https://github.com/nodejitsu/node-http-proxy" target="_blank">http-proxy</a>.
  With only the following code you’ll have a proxy that can be used as system or
  browser level proxy:</p>
```
var httpProxy = require('http-proxy');
var proxyServer = httpProxy.createServer(function (req,res,proxy) {
  var hostNameHeader = req.headers.host,
  hostAndPort = hostNameHeader.split(':'),
  host = hostAndPort[0],
  port = parseInt(hostAndPort[1]) || 80;
  proxy.proxyRequest(req,res, {
    host: host,
    port: port
  });
});
proxyServer.listen(8888);
```

<h2>Adding support for HTTPS</h2>
<p>The first thing we will need is a certificate that will be used by <a href="http://en.wikipedia.org/wiki/Transport_Layer_Security" target="_blank">TLS</a> implementation for encryption. A server has access to certificate private and public key thus it is
  able to get a clear text from a message encrypted with public key. It’s a common knowledge that asymmetric encryption is more expensive in terms of CPU cycles than its symmetric counterpart. That’s way when using HTTPS connection asymmetric encryption
  is only used during initial handshake to exchange a session key in a secure manner between client and server. This session key is then used by both client and server for traffic encryption using symmetric algorithm.</p>
<p>Naturally to get or rather to buy a proper certificate one would have to be verified by a valid certification authority. Fortunately for the sake of a demo we can generate a self signed certificate. That’s really easy, a nice description is available
  on <a href="https://devcenter.heroku.com/articles/ssl-certificate-self" target="_blank">heroku help pages</a>:</p>
```
openssl genrsa -des3 -passout pass:x -out proxy-mirror.pass.key 2048
echo "Generated proxy-mirror.pass.key"

openssl rsa -passin pass:x -in proxy-mirror.pass.key -out proxy-mirror.key
rm proxy-mirror.pass.key
echo "Generated proxy-mirror.key"

openssl req -new -batch -key proxy-mirror.key -out proxy-mirror.csr -subj /CN=proxy-mirror/emailAddress=piotr.mionskowski@gmail.com/OU=proxy-mirror/C=PL/O=proxy-mirror
echo "Generated proxy-mirror.csr"

openssl x509 -req -days 365 -in proxy-mirror.csr -signkey proxy-mirror.key -out proxy-mirror.crt
echo "Generated proxy-mirror.crt"

```

<h3>http-proxy support for https</h3>
<p>http-proxy module supports various https configuration for example passing traffic from https to http and vice versa. Unfortunately I couldn’t find a way to get it working without preconfiguring target host and port – which was a problem while I was implementing
  <a
  href="https://github.com/miensol/proxy-mirror" target="_blank">proxy-mirror</a>. Here is what <em>curl</em>will print out when trying to use such proxy:</p>
```
curl -vk --proxy https://localhost:8888/ https://pl-pl.facebook.com/
* timeout on name lookup is not supported
* About to connect() to proxy localhost port 8888 (#0)
* Trying 127.0.0.1...
* connected
* Connected to localhost (127.0.0.1) port 8888 (#0)
* Establish HTTP proxy tunnel to pl-pl.facebook.com:443
&gt; CONNECT pl-pl.facebook.com:443 HTTP/1.1
&gt; Host: pl-pl.facebook.com:443
&gt; User-Agent: curl/7.26.0
&gt; Proxy-Connection: Keep-Alive
&gt;
```

<p>I suspect the problem is inherently related to the way http-proxy uses nodejs core http(s) modules – I might be wrong here though. The workaround I’ve used in <a href="https://github.com/miensol/proxy-mirror" target="_blank">proxy-mirror</a> was to listen
  to <em><a href="http://nodejs.org/api/http.html#http_event_connect" target="_blank">CONNECT</a>    </em>event on http server, establish socket connection to a fake https server listening on different port. When the https connection is established the
  fake https server handler proxies requests further. The advantage of this approach is that we can use the same proxy address for both http and https. Here is the code:</p>
```
var httpProxy = require('http-proxy'),
  fs = require('fs'),
  https = require('https'),
  net = require('net'),
  httpsOptions = {
    key: fs.readFileSync('proxy-mirror.key', 'utf8'),
    cert: fs.readFileSync('proxy-mirror.crt', 'utf8')
  };

var proxyServer = httpProxy.createServer(function (req, res, proxy) {
  console.log('will proxy request', req.url);
  var hostNameHeader = req.headers.host,
  hostAndPort = hostNameHeader.split(':'),
  host = hostAndPort[0],
  port = parseInt(hostAndPort[1]) || 80;
  proxy.proxyRequest(req, res, {
    host: host,
    port: port
  });
});

proxyServer.addListener('connect', function (request, socketRequest, bodyhead) {
  var srvSocket = net.connect(8889, 'localhost', function () {
    socketRequest.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    srvSocket.write(bodyhead);
    srvSocket.pipe(socketRequest);
    socketRequest.pipe(srvSocket);
  });
});

var fakeHttps = https.createServer(httpsOptions, function (req, res) {
  var hostNameHeader = req.headers.host,
  hostAndPort = hostNameHeader.split(':'),
  host = hostAndPort[0],
  port = parseInt(hostAndPort[1]) || 443;

  proxyServer.proxy.proxyRequest(req, res, {
    host: host,
    port: port,
    changeOrigin: true,
    target: {
      https: true
    }
  });
});

proxyServer.listen(8888);
fakeHttps.listen(8889);
```

<h2>HTML5 WebSocket support</h2>
<p>The above code has still problems handling <a href="http://en.wikipedia.org/wiki/WebSocket" target="_blank">WebSockets</a>. This is because browsers, according to the spec, change the way they establish initial connection when they detect that they are
  behind an http proxy. As you can read on <a href="http://en.wikipedia.org/wiki/WebSocket#Proxy_traversal" target="_blank">wikipedia</a> more existing http proxy implementation suffer from this.&#160; I still haven’t figured out how to handle this scenario
  elegantly with http-proxy and node.js, when I do I will post my findings here.</p>
