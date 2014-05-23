---
layout: post
title: "ng-click and double post"
date: 2014-05-21
categories: ["angularjs"]
---

Recently I was fixing a bug in an application written in angularjs which turned out to be pretty interesting for me. At first I couldn't reproduce the error and just when I got frustrated it happened exactly as stated in the issue tracker. As it turned out the problem was caused by fast clicking on the same button.
Click handler triggered an http POST to server which creates a row in table - no wonder it looked strange when 2 rows where created after someone accidentally clicked twice.

## Some solutions
I've quickly googled to find out what others are doing in such scenario and found at least couple of ways of handling it - some of them I have considered while others where completely new to me.
### Disable button
The most simple approach is to use `ng-disabled` on the same button as `ng-click` directive. Which would look like this:

```html
<button ng-click="executePost()" ng-disabled="buttonDisabled">Click me</button>
```

```javascript
$scope.executePost = function(){
  $scope.buttonDisabled = true;
  runHttpPost().then(function(){
    //do something useful with a response
  }).finally(function(){
      $scope.buttonDisabled = false;
  })
};
```

As you can see the code is pretty straight forward especially when you make use of angularjs promise api provided by `$q` service.

### Stop relying on the result of asynchronous action
Another approach is to design user interface in such a way that the we can safely predict what result the action will produce. For instance if we're editing an entity and have performed as much validation as possible on client side it's offen safe to assume that the request will be processed successfully and our changes will persist. If so we don't have to wait for the server to finish processing and can move to a next screen in the application that will display values already available in  browser. As a bonus our application will feel much faster and in many cases it makes a significant difference. It's not always easy though and sometimes requires significant changes in the way we design our user interface as well as our [server api](http://codebetter.com/gregyoung/2010/02/16/cqrs-task-based-uis-event-sourcing-agh/). [Alex MacCaw](http://blog.alexmaccaw.com/asynchronous-ui) summarised it nicely.

### Make sure a second request will not make it to the server

An approach I haven't thought about is to actually prevent second request that looks identical to the first one and is created just after the first one. Michał Ostruszka [described an implememtation](http://blog.codebrag.com/post/57412530001/preventing-duplicated-requests-in-angularjs) of this technique. I haven't actually tried it as it seemed way too complex for an issue that I was fixing. The approach can be very tempting as it allows to handle double requests globally - once per application. Although I suspect it may be difficult to use if the act of making request that was blocked is causing side affects to the state of the application.

## `bi-click` approach
 Most of async operation in modern browser based libraries are expressed using a flavour of promise/deferred api. This is no different in angularjs which provides [`$q`](https://docs.angularjs.org/api/ng/service/$q). So if we would like to block the button until the operation is completed it seems like a natural fit to use promises to achieve that. Here is an example of such directive:
<iframe class="jsfiddle" width="100%" height="300" src="http://jsfiddle.net/miensol/7PETf/3/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>

### Further usage
Every web developer out there has probably implemented an ajax throbber of some kind. In Angularjs world most of the examples I see are very similar to our button blocking with `isDisabled` flag. Usually it will mean something along these lines:

```javascript
$scope.executePost = function(){
  $scope.showThrobber = true;
  runHttpPost().finally(function(){
      $scope.showThrobber = false;
  })
};
```

```html
<div class="ajax-thorbber" ng-show="showThrobber"></div>
```

While there is nothing wrong in particular with this example I find handling those flags in a controller rather tedious. As with the `bi-click` example one can very easily create a directive to handle throbber toggling in one place.
