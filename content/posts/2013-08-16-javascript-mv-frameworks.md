---
title: "Javascript MV* frameworks"
template: "post"
permalink: "/2013/08/javascript-mv-frameworks.html"
uuid: "5523541864620939404"
guid: "tag:blogger.com,1999:blog-8010146885187116176.post-5523541864620939404"
date: "2013-08-16 07:27:00"
updated: "2013-09-15 11:11:52"
description:
blogger:
    siteid: "8010146885187116176"
    postid: "5523541864620939404"
    comments: "0"
tags: [javascript, mvvm, mvc]
author:
    name: "Piotr Mionskowski"
    url: "https://plus.google.com/117451536189361867209?rel=author"
    image: "//lh3.googleusercontent.com/-6M7kaKrVJcU/AAAAAAAAAAI/AAAAAAAAAGE/QI7pFI1vNEA/s512-c/photo.jpg"
---
Building a web application today isn’t nearly as hard as it was couple of years ago. Back then creating a rich client application using HTML and JS was possible but the number of options you had is a fraction of what is available today. The first
<a href="http://en.wikipedia.org/wiki/Single-page_application" target="_blank">SPA</a>I helped building was relatively simple project –built with <a href="http://www.sencha.com/products/extjs" target="_blank">ExtJs</a> library when it was still in version
2. There were of course other options like <a href="http://dojotoolkit.org/" target="_blank">dojo</a> but with our team’s little experience in web technology ExtJs seemed like a better choice solely because of its superior support. Shortly after I worked
on another web application built with <a href="http://www.asp.net/web-forms" target="_blank">Web Forms</a> and <a href="http://jquery.com/" target="_blank">jQuery</a>.&#160; We finished both projects, they worked on most browsers but we didn’t avoid creating
a mess in JavaScript. Presentation logic was mixed with business rules scattered through event handlers inside unstructured components source code. Just to be fair it definitely was not caused by the frameworks we used but because of our lack of knowledge
and experience.&#160; I guess that happened to lots of developers and wise people soon enough realized that there has to be a better way of doing things. I think that this was the main reason of the explosion of JS libraries/frameworks options that aim
to help structuring client side code.

<h2>MVC, MVP, MVVM or …</h2>The number of libraries and frameworks available is overwhelming. <a href="http://angularjs.org/" target="_blank">AngularJS</a>, <a href="http://backbonejs.org/" target="_blank">Backbone.js</a>, <a href="http://emberjs.com/" target="_blank">Ember</a>,
<a href="http://javascriptmvc.com/" target="_blank">JavaScriptMVC</a>, <a href="http://knockoutjs.com/" target="_blank">Knockout</a> or <a href="http://sammyjs.org/" target="_blank">Sammy.js</a> are just a few I had a chance to look at from the <a href="https://github.com/search?q=javascript+mvc&amp;ref=cmdform"
target="_blank">outstanding list</a>. You can even compare <a href="http://todomvc.com/" target="_blank">how to built simple TODO application</a> with them. <a href="http://addyosmani.com/blog/" target="_blank">Addy Osmani</a> wrote an excellent <a href="http://coding.smashingmagazine.com/2012/07/27/journey-through-the-javascript-mvc-jungle/"
target="_blank">article</a> that really helps making your choice sane. Most if not all of those frameworks utilize one or more of MV* patterns. An important thing to remember though is that <a href="http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller"
target="_blank">Model View Controller</a> is more an architectural pattern for presentation than an code design pattern like <a href="http://www.oodesign.com/builder-pattern.html" target="_blank">Builder</a>. It means it does not provide very concrete implementation
template but rather a guidance for objects/modules/roles relationships. Similar observations apply to MVC cousins namely <a href="http://martinfowler.com/eaaDev/PresentationModel.html" target="_blank">Model View ViewModel or Presentation Model</a> and
<a
href="http://martinfowler.com/eaaDev/ModelViewPresenter.html" target="_blank">Model View Presenter</a>. This can cause some confusion for someone already familiar with MVC pattern in Asp.net mvc, Fubu or Rails. I always try to find a framework/library author’s explanation of how they applied above patterns – it really helps understanding
  core concepts of their work.

  <h2>Library or Framework</h2>Some of the tools are called frameworks while other libraries. But what’s the difference anyway? A very common and brief explanation is the one provided by <a href="http://martinfowler.com/" target="_blank">Martin Fowler</a> inside <a href="http://martinfowler.com/bliki/InversionOfControl.html"
  target="_blank">Inversion of Control article</a>:

  <blockquote>Inversion of Control is a key part of what makes a framework different to a library. A library is essentially a set of functions
    <strong>that you can call</strong>, these days usually organized into classes. Each call does some work and returns control to the client. A framework embodies some abstract design, with more behavior built in. In order to use it you need to insert
    your behavior into various places in the framework either by subclassing or by plugging in your own classes. The framework's code then
    <strong>calls your code</strong>at these points.There are various ways you can plug your code in to be called.</blockquote>Of course the distinction is not always firm and clear. Still, it is important to keep in mind while choosing
  <em>the right</em>tool for a job. A library will usually give you more control inside infrastructure code but it often requires more work to unify boilerplate gluing code and requires some degree of experience. A framework on the other hand will typically
  provide you with a setup where you can hook your code hopefully focused mostly on the valuable functional stuff. A framework will limit your freedom to some extent in turn it will eliminate some part of work that you presumably would have to do in order
  to keep your design clean.

  <h2>Productivity</h2>For me the biggest advantage of using a modern MV* JavaScript framework is productivity. After some time I realized that the amount of boring, repetitive code focused only on filling DOM with data and giving it behaviour is substantial. Sure I am able
  to separate presentation concerns rather cleanly without aid from any tool. However what’s the point if so many great libraries and frameworks, created by way more experienced people, is out there. It gets even more valid point when working on a big
  project. Even if all the team members are experienced and closely collaborating it will be hard to have and maintain a common, well understood structure among different parts of JavaScript code base just because understanding and preferences about MVC
  and related patterns will vary. In my next blog posts I’ll try to review 3 tools that caught my eye. Namely <a href="http://angularjs.org/" target="_blank">AngularJS</a>, <a href="http://backbonejs.org/" target="_blank">Backbone.js</a> and <a href="http://knockoutjs.com/"
  target="_blank">Knockout</a> that seem to be most popular these days. They all show some signs of maturity and have vibrant community around them. It will by no means be a comparison as they really are different beasts built with different goals in mind.
  The only comparison I may be tempted to do is about productivity. Still I already know it will not be comprehensive as there will be only one person working on the codebase and the micro product will be focused mostly on a rich data visualization –
  which is what I do mostly now. Maybe it will help to the framework/library that we’ll use in our current project.
