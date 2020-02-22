---
title: "Building an HTTP sniffer with node.js"
template: "post"
permalink: "/2014/01/building-http-sniffer-with-nodejs.html"
uuid: "60101041435460219"
guid: "tag:blogger.com,1999:blog-8010146885187116176.post-60101041435460219"
date: "2014-01-01 22:14:00"
updated: "2014-01-01 22:15:37"
description:
blogger:
    siteid: "8010146885187116176"
    postid: "60101041435460219"
    comments: "0"
tags: [javascript, http, angularjs, node.js, express.js, https, proxy]
author:
    name: "Piotr Mionskowski"
    url: "https://plus.google.com/117451536189361867209?rel=author"
    image: "//lh3.googleusercontent.com/-6M7kaKrVJcU/AAAAAAAAAAI/AAAAAAAAAGE/QI7pFI1vNEA/s512-c/photo.jpg"
---
<p>Whether to inspect a server response, optimize network usage or just to fiddle with new REST API it almost always make sense to use an application that can display http requests and responses for investigation. On Windows there is the great <a href="http://fiddler2.com/"
  target="_blank">Fiddler</a>. While it’s possible to use Fiddler on other platforms using virtualization software I think it’s an overkill. Fortunately there are alternatives. <a href="http://www.charlesproxy.com/" target="_blank">Charles</a> looks like
  the most advanced one offering most if not all features available in Fiddler. There is also a little less popular <a href="http://www.tuffcode.com/" target="_blank">HTTP Scoop</a>. Both Charles and HTTP Scoop aren’t free but in my opinion they are worth
  the price especially if used often. Command line lovers might find <a href="http://mitmproxy.org/" target="_blank">mitmproxy</a> suit their needs. If you only need basic features <a href="https://ngrok.com/" target="_blank">ngrok</a> might serve you well.
  To dive a bit deeper and see http traffic on a tcp level <a href="http://www.wireshark.org/" target="_blank">WireShark</a> is indispensable.</p>
<p>As you can see there are plenty of tools available to help understand what is happening on http level. As I was learning about http caching a question popped to my head. How hard would it be to actually build a simple http sniffer?</p>
<h2>proxy-mirror – a simple http inspector</h2>
<p>As it turned out it’s actually not that hard to built one thus <a href="https://github.com/miensol/proxy-mirror" target="_blank">proxy-mirror</a> came to be. Of course this is a very simplistic http sniffer – nowhere near to tools I mentioned above both
  in terms of features and reliability – but it works (at least in most scenarios :-)). It’s open source and I learned couple of new things about HTTP while implementing it – more on that in future posts. Here are some screen shoots of the the tool:
  <img src="https://raw.github.com/miensol/proxy-mirror/master/misc/screenshot-landscape.png" width="603" height="367" />&#160;</p>
<p>
  <img src="https://raw.github.com/miensol/proxy-mirror/master/misc/screenshot-portrait.png" width="609" height="652" />
</p>
<p>As you might have guessed from screenshots proxy-mirror is a web application. Right now it’s not very easy to try it out – the instructions are in the <a href="https://github.com/miensol/proxy-mirror" target="_blank">Readme</a> – I’ll try to fix it soon.</p>
<h2>How it works</h2>
<p>I wanted to run proxy-mirror on many platforms and rely on a foundation that has both great support for http and building web applications. I picked node.js over java or ruby mainly because I wanted to sharpen my skills in it.</p>
<p>You can think of proxy-mirror as 2 logical components. The first is a regular http proxy that you can use by configuring your browser or system. I didn’t want to focus on building that first so I utilized a great node module call <a href="https://github.com/nodejitsu/node-http-proxy"
  target="_blank">http-proxy</a>. With it’s helped you can have a system wide proxy in couple of minutes. The http proxy component emits events whenever a request or response goes through it. Those events are consumed by the second logical component –
  a web application built with <a href="http://expressjs.com/?utm_source=buffer&amp;utm_campaign=Buffer&amp;utm_content=buffer73c90&amp;utm_medium=google" target="_blank">express.js</a>. The information about http traffic received from events is then pushed
  to browser part through <a href="http://socket.io/" target="_blank">socket.io</a> where a simple SPA built with <a href="http://miensol.blogspot.com/2013/09/angularjs-my-new-superhero-tool.html" target="_blank">my beloved</a>&#160;<a href="http://angularjs.org/"
  target="_blank">AngularJS</a> displays information about them.</p>
<h2>Features</h2>
<p>Right now proxy-mirror has only couple of features:</p>
<ul>
  <li>http and https support – although the latter one requires additional setup</li>
  <li>simple session list – a <a href="http://angular-ui.github.io/ng-grid/" target="_blank">grid</a> with list of request/response pairs that you can inspect</li>
  <li>a detailed view – both for request and response that can display headers, message body and a preview right in the browser</li>
</ul>
<p>Although it still is a very simple (and buggy) application I actually found that it has most of features I frequently use – probably except for filtering. Maybe someday it will become a reasonable alternative for Charles - at least for me.</p>
<p>I think building an http sniffer is a great exercise in the process of learning how http(s) works. I guess the famous saying about journey being more more important than the destination fits nice here.</p>
