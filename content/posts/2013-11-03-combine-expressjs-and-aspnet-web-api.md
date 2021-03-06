---
title: "Combine Express.js and ASP.NET Web API"
template: "post"
permalink: "/2013/11/combine-expressjs-and-aspnet-web-api.html"
uuid: "7845679373898243767"
guid: "tag:blogger.com,1999:blog-8010146885187116176.post-7845679373898243767"
date: "2013-11-03 12:00:00"
updated: "2013-11-08 09:54:14"
description:
blogger:
    siteid: "8010146885187116176"
    postid: "7845679373898243767"
    comments: "0"
tags: [node.js, express.js, OWIN, asp.net web api]
author:
    name: "Piotr Mionskowski"
    url: "https://plus.google.com/117451536189361867209?rel=author"
    image: "//lh3.googleusercontent.com/-6M7kaKrVJcU/AAAAAAAAAAI/AAAAAAAAAGE/QI7pFI1vNEA/s512-c/photo.jpg"
---
<div class="css-full-post-content js-full-post-content">
  I’m really excited about the <a href="http://owin.org/" target="_blank">OWIN</a> initiative. This “standard” enables countless new ways of combining existing http web stacks with .net – a thing that up until recently was either impossible or not feasible.
  It gets even more positive knowing that Microsoft supports the case actively.


  <h2>OWIN - why you should care?</h2>
  <p>Open Web Interface for .NET aims to define a standard interface between web servers and web applications. Adhering to this interface will allow decoupling of server implementations from web frameworks. The idea isn’t something novel and other platforms
    benefited from it immensely. In Ruby we have pretty mature <a href="http://rack.github.io/" target="_blank">Rack</a> which allows hosting <a href="http://rubyonrails.org/" target="_blank">Rails</a>, <a href="http://www.sinatrarb.com/" target="_blank">Sinatra</a> or
    any other rack compatible application on a web server of your <a href="https://www.ruby-toolbox.com/categories/web_servers" target="_blank">choice</a>. In Node.js world there is <a href="http://www.senchalabs.org/connect/" target="_blank">Connect</a> middleware
    with frameworks like <a href="http://expressjs.com/" target="_blank">Express</a> and <a href="https://github.com/mauricemach/zappa" target="_blank">Zappa</a> built on top of it. To be fair Connect is not <a href="http://stackoverflow.com/questions/5284340/what-is-node-js-connect-express-and-middleware"
    target="_blank">exactly the same thing as Rack</a> but the analogy serves well to understand underlying ideas.</p>
  <p>Having a common middleware and frameworks built on top of it not only allows you to swap your web server at whim. It also means that you’re now able to combine many application into one easily even if they are implemented in different frameworks. It
    took me some time to realize how powerful concept it is until I built a demo for <a href="http://github.com/miensol/conf2013" target="_blank">a conference presentation</a>. I wanted to have single web server running in background so that I can easily
    switch between pages built with Angular, Backbone and Knockout. I also didn’t want to throw out separate templates scaffolded with <a href="http://yeoman.io/" target="_blank">Yeoman</a> and have a shared REST-like api built with Express. How surprised
    I was when the only thing I needed to do was to call equivalent of:


```
connect.use(angularApp);
connect.use(knockoutApp);
connect.use(backboneApp);
```

  </p>
  <h2>OWIN opens a new world for .NET web stacks</h2>This all may sound blurry for a .NET newbie or maybe even to experienced developer so I’ll give some examples of what is or will be possible to do in a near future.


  <ul>
    <li><strong>IIS as option not requirement</strong> – having a way to add a full fledged web interface for a windows service was not an easy thing to do. If only you could you use Asp.Net MVC things would be so much easier. Guess what, when Asp.Net MVC
      will support OWIN and I’m positive it someday will, this will be a no brainer.</li>
    <li><strong>Combine Nancy, FubuMVC, pick a name</strong> – maybe you would like to use some existing component and not have to rewrite it to match you stack. Or maybe you work on a really big project and some teams prefer one framework over the other.
      You are right, this already is possible.</li>
    <li><strong>Integration tests</strong> – say you would like to execute end to end tests over your web application. Right know you’ll either have to deploy your asp.net mvc app to IIS or IIS Express. This means spinning up separate processes even if you
      would like to run a single test on you development machine. You may be lucky and be using asp.net web api and be able to use <a href="http://msdn.microsoft.com/pl-pl/library/system.web.http.selfhost.httpselfhostserver(v=vs.108).aspx" target="_blank">HttpSelfHostServer</a> but
      then again you’re limited only to this stack. With OWIN it already is possible to use a lightweight <a href="https://github.com/Bobris/Nowin" target="_blank">Nowin</a> or <a href="http://katanaproject.codeplex.com/" target="_blank">Katana</a> to run
      any compatible application inside your tests.</li>
    <li><strong>Faster Tests</strong> – is hosting a http server inside you tests too expensive? With OWIN you might actually be able to run <a href="http://dhickey.ie/post/2013/08/27/Introducing-OwinTesting.aspx" target="_blank">tests entirely in memory</a> with
      no network involved whatsoever.</li>
    <li><strong>Cross cutting concerns</strong> – maybe you need to apply the same authentication mechanism to couple of separate applications. Yes you’re right implementing it as HttpModule might work, but what about this one that you have to support which
      is based on <a href="http://nancyfx.org/" target="_blank">Nancy</a>. Nancy already supports OWIN so you’re good to go.</li>
    <li><strong>Combining Express.js and Asp.Net Web Api</strong> – so you’re building a web app using Express.js but you’ve found that it would be nice to reuse some part of the existing code that is built in .NET. With the excellent <a href="http://tjanczuk.github.io/edge/"
      target="_blank">edge.js</a> and OWIN enabled middleware built on top of it called <a href="https://github.com/bbaia/connect-owin" target="_blank">connect-owin</a> you’re now allowed to this.</li>
  </ul>
  <h2>One app using both Express.js and ASP.NET Web Api</h2>The last example of OWIN usage seemed like the coolest to me so I wanted to try if it’s really doable at the moment. This wasn’t as easy as one could wish but bare in mind that the OWIN initiative is just starting getting momentum and we’re really on
  a bleeding edge. The <a href="https://github.com/miensol/connect-webapi-samples" target="_blank">connect-webapi-samples</a> repo contains a sample of single web app where some requests are served by express.js while others using ASP.NET Web Api. You can
  start the server with:

```
msbuild ./Connect.WebApi.sln
node ./index.js
```
Navigating to <a href="http://localhost:3000/hello">http://localhost:3000/hello</a> will give you response from Express:




  <a href="http://lh4.ggpht.com/-jUULKIlKPak/UnY0rAwhXlI/AAAAAAAABf4/P0sElEwX-uU/s1600-h/image%25255B8%25255D.png">
    <img alt="image" border="0" height="154" src="http://lh5.ggpht.com/-dMKd-Kuu8-c/UnY0rjiQa2I/AAAAAAAABgA/Qk30CJz0lRE/image_thumb%25255B4%25255D.png?imgmax=800" style="background-image: none; border-bottom-width: 0px; border-left-width: 0px; border-right-width: 0px; border-top-width: 0px; display: inline; padding-left: 0px; padding-right: 0px; padding-top: 0px;"
    title="image" width="601" />
  </a>



When you go to <a href="http://localhost:3000/webapi/values">http://localhost:3000/webapi/values</a> you’ll get a standard <i>ValuesController</i> response:




  <a href="http://lh5.ggpht.com/-lpDHvGGL6O4/UnY0sJlyz4I/AAAAAAAABgE/RNt-5mImYzs/s1600-h/image%25255B10%25255D.png">
    <img alt="image" border="0" height="201" src="http://lh6.ggpht.com/-Fi3AA5tgaNI/UnY0tBvfyxI/AAAAAAAABgQ/d4KN1caqBDs/image_thumb%25255B6%25255D.png?imgmax=800" style="background-image: none; border-bottom-width: 0px; border-left-width: 0px; border-right-width: 0px; border-top-width: 0px; display: inline; padding-left: 0px; padding-right: 0px; padding-top: 0px;"
    title="image" width="596" />
  </a>



Note that both requests are logged in console using <em>connect.logger</em> middleware:
  <a href="http://lh5.ggpht.com/-izO1Mw9h9KM/UnY0tlpMA1I/AAAAAAAABgU/P-8I1auBGGU/s1600-h/image%25255B16%25255D.png">
    <img alt="image" border="0" height="33" src="http://lh4.ggpht.com/-S18Xwf8AVr0/UnY0t8N6U-I/AAAAAAAABgc/XYCYSirgo88/image_thumb%25255B10%25255D.png?imgmax=800" style="background-image: none; border-bottom-width: 0px; border-left-width: 0px; border-right-width: 0px; border-top-width: 0px; display: inline; padding-left: 0px; padding-right: 0px; padding-top: 0px;"
    title="image" width="602" />
  </a>


  <p>I was thinking about a case where this combination could become handy. In a project I’m currently involved in we’re using Highcharts to present beautiful charts to clients. Unfortunately some of them still use ancient browsers like IE7 which does not
    handle many Highcharts displayed on one page – or rather dies trying to render them. For those browsers we actually produce similar chart images on server. This however requires a lot of boring code to convert from Higchart chart configuration to
    the 3rd party library format we use for rasterizing.</p>
  <p>What we could do very easily with OWIN is to keep a .NET component that generates a complete Highchart configuration and add a very thin “middleware” layer that would take a real configuration pass it into <a href="http://phantomjs.org/" target="_blank">Phantomjs</a> and
    get back an image that would look exactly the same as real chart. I’m pretty sure it would be much more robust solution than our current approach.</p>
</div>
