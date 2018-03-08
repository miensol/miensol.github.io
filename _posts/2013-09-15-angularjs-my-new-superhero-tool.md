---
title: "AngularJs – my new superhero tool."
layout: "post"
permalink: "/2013/09/angularjs-my-new-superhero-tool.html"
uuid: "7985976294168401382"
guid: "tag:blogger.com,1999:blog-8010146885187116176.post-7985976294168401382"
date: "2013-09-15 11:53:00"
updated: "2013-09-15 11:55:32"
description: "Introduction to angular"
blogger:
    siteid: "8010146885187116176"
    postid: "7985976294168401382"
    comments: "0"
categories: [javascript, mvvm, angularjs, mvc]
author:
    name: "Piotr Mionskowski"
    url: "https://plus.google.com/117451536189361867209?rel=author"
    image: "//lh3.googleusercontent.com/-6M7kaKrVJcU/AAAAAAAAAAI/AAAAAAAAAGE/QI7pFI1vNEA/s512-c/photo.jpg"
---

As I mentioned in my previous post I’ll describe my thoughts and findings about 3 popular JavaScript libraries that help building large web application. I’ll start with [AngularJs](http://angularjs.org/) which is the first one I’ve used in a real product.

## Model View Whatever

Angular team didn’t try hard to map their concepts to classical MVC pattern. You can see it even in the title of its home page. Instead they focused on making a development path of a large web application as smooth and productive, in a long term, as possible. This means its really important to return to [documentation](http://docs.angularjs.org/api/) and [developer guide](http://docs.angularjs.org/guide/) if you feel you’re getting lost along the way. Learning Angular is a really interesting journey especially that many concepts that I previously had categorized as not for the web turned out to be totally useful.

## Model and view model

This term has really a short definition according to angular way:

> a model is any data that is reachable as a property of an angular [Scope](http://docs.angularjs.org/guide/scope) object

The nice thing about it is that it really is up to you how you choose to encapsulate the most valuable and complex logic inside your model or view model classes. No base “_class”_ , no artificial properties and helpers is required. In fact the framework won’t force you to build a proper view model for data-binding. While this freedom gives you more flexibility it also means that you are responsible for keeping your [Controllers](http://docs.angularjs.org/guide/dev_guide.mvc.understanding_controller) clean and thin. I prefer to put logic that encapsulates data and provides global, shared behaviour into separate classes totally unaware of the UI. Depending on the use case I’ll then put an instance of this model into scope or  if the presentation logic is more complex create a view model that wraps some model objects. To make the model objects easily accessible and sharable between views angular provides [services](http://docs.angularjs.org/guide/dev_guide.services). For a very simple logic that augments the way a single piece of data is presented there are [filters](http://docs.angularjs.org/guide/dev_guide.templates.filters).

One important thing to understand though is that data-binding is only happening between view (and directives) and a scope object. If a model object provides events fired when its state changes they have to implemented in a traditional way. When I say traditional I mean that you typically will need to apply [Observer pattern](http://en.wikipedia.org/wiki/Observer_pattern) – or rather use one [of implementations available](https://github.com/js-coder/observable). This is somewhat different from the dirty checking mechanism that sits behind all the angular data-binding magic. Fortunately the framework provides a way to connect a non angular event to the scope with [$apply](http://docs.angularjs.org/api/ng.$rootScope.Scope#$apply) method. However be warned that you have to be really careful here to call it [only outside of angular digest cycle](http://stackoverflow.com/questions/12729122/prevent-error-digest-already-in-progress-when-calling-scope-apply).

## Controller – keep it thin

A [controller](http://docs.angularjs.org/guide/dev_guide.mvc.understanding_controller) is mainly responsible for setting up the scope object and as such is created on a per view basis. It is the most common entry point for an application behaviour triggered by DOM events. While its often easy to put more and more business logic inside them you should really try hard not to. As a reward I often found myself being able to reuse more logic than I anticipated. Another rule of thumb is to never access DOM elements from controller. Angular has a special place for all DOM related activities called directives.

## Directive — a way to reusable ui

This is the part of angular that causes lot of confusion when it comes to building custom directives. Especially that whenever you need to manipulate DOM in any way you should use them. To make things _easier_ there is a lot of not so obvious vocabulary used like [compile](http://docs.angularjs.org/api/ng.$compile), [interpolate](http://docs.angularjs.org/api/ng.$interpolate), link and my favourite [transclude](http://docs.angularjs.org/guide/directive). In my opinion directives make working with data-binding in angular so productive. They are kind of hard to understand deeply at first, but reading [the guide](http://docs.angularjs.org/guide/directive) couple of times helps a lot. To demonstrate its power I’ll just say that entire [jQuery ui](http://jqueryui.com/) is easily accessible with just one directive. I guess I have to little experience to provide some tips about building directives - the most complex one I’ve built was [paginate](http://jsfiddle.net/YShcw/1/). Here is a HTML snippet of how to use it:  

```html
<div paginate="items">
  <ul>
      <li ng-repeat="item in pager.paged">
          {{ item.index }} {{ item.text }} 
      </li>
  </ul>
  <button ng-click="pager.previous()">Previous</button>
  <span ng-repeat="page in pager.pages"
           ng-class="pager.classForPage(page)">
    <a ng-click="pager.goTo(page)">{{ page }} </a>
  </span>
  <button ng-click="pager.next()">Next</button>
```

Directive is the hardest part to fully understand but if you do learn them and built them in a generic way you can accelerate development a lot.

## Views

I’ve only touched couple of aspects of Angular - there is a lot more to it. In particular I haven’t commented on View part in MVC trio. Angular tends to be criticised for the way it handles views. Mainly because you may get to a stage where it is hard to see actual html inside tons of directives attached to DOM elements. An alternative approach would be to use existing template engines like [Handlebars](http://handlebarsjs.com/) – that’s the way it’s done in [Ember.js](http://emberjs.com/) – but it’s not really practical in Angular.

However I really like the idea that behaviour of html elements is immediately visible when you scan views mainly because declarative nature of directives. It makes it possible for an CSS or UI design expert, not familiar with Angular nor JavaScript, to make safe changes to views. In addition you no longer need to repeat selectors to access DOM and attach behaviour to it. This eliminates some of the maintenance burden. Like with any tool you have to be careful though not to overload html with directives and never put logic inside your views even if its only presentation related. If you find yourself repeating the same set of directives in many places of your codebase it may be good to step back a little and think of a way to encapsulate a common behaviour – probably with a more specific directives.

I’ll soon try to comment on features that Angular provides that make it suitable for large scale application development.