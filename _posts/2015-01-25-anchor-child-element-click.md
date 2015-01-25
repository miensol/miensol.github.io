---
layout: post
title: "Anchor child element click"
date: 2015-01-25 17:00:00
categories: ["html", "javascript"]
---

I had to solve a seemingly trivial bug in an angularjs based application that turned out to be more interesting than usual.

## The bug

The bug report stated that *"Clicking on a label causes page reload"*. That should be an easy one I thought to myself and openeded chrome inspector to see a structure of DOM. Here's a simplified version of markup:

```html
<a  href="" ng-click="anchorAction($event)" ng-controller="ActionCtrl">
  Anchor
  <span ng-click="childAction($event)">
  A child
  </span>
</a>
```

```javascript
module.controller('ActionCtrl', function($scope){
  $scope.anchorAction = function($event){
    console.log('anchorAction');
  };
  $scope.childAction = function($event){
    $event.stopPropagation();
    console.log('childAction');
  };
});
```

My intention was to have different behaviour when an anchor or a span element is clicked. Just as in the example above when `a` is clicked `anchorAction` should be printed whereas the same event triggered on `span` should **only** print `childAction`.
Interestingly the actual behaviour is different.

When the anchor is clicked indeed a function attached by `ng-click` is executed properly. Note that even though we **did not** call `$event.preventDefault()` a page reload is not triggered. This is due to [`htmlAnchorDirective`](https://github.com/angular/angular.js/blob/master/src/ng/directive/a.js) provided by angularjs which effectively prevents empty `href` attribute from taking action.

A click on `span` element will stop event from bubbling up document tree - thus preventing `anchorAction` from executing. In addition it will obviously print `childAction` and to my surprise **it will cause a page reload**.

Wait a second didn't we just prevent the event from traveling up to the anchor element? Yes. So why does the page reload anyway?

## Searching for a root cause.

Almost immediately I've verified that calling `$event.preventDefault()` inside `childAction` fixes the problem. The fix got checked in and will be deployed soon - case closed. I was unhappy though because I didn't understand this behaviour at all.

At first I naively thought that it might be a Chrome bug - a quick check in FF and IE diminished this stupid idea.

Then I thought that it may be related to angularjs in some strange manner so I've prepared [an example fiddle](http://jsfiddle.net/83ov5tgm/4/) that demonstrates the issue. I've searched for and read many answers on [Stack Overflow](http://stackoverflow.com/) and other forums but none of them gave an in-depth explanation.

## The HTML spec

Since the example fiddle demonstrated same behaviour in all major desktop browsers I realised that it must be part of HTML spec - after an hour or so it turned out that it was a good  hunch.

Up until now I thought that an `event` (and a `click` event in particular) default action is dependent on an element it visits when it is dispatched through a DOM tree. In the above example it would mean that since I've stopped `click` from bubbling up it should not reach `a` element and because of that it **should not** execute its default action - in our case a page reload.

It turned out that my assumptions about events dispatching and elements default actions were wrong.

The relevant part of the specification describes [activation behavior](http://www.w3.org/html/wg/drafts/html/master/editing.html#activation) with an explanation of what I've experienced:

> 1. Let target be the element designated by the user (the target of event).
2. If target is a canvas element, run the canvas MouseEvent rerouting steps. If this changes event's target, then let target be the new target.
3. Set the click in progress flag on target to true.
4. **Let e be the nearest activatable element of target (defined below), if any**.
5. If there is an element e, run pre-click activation steps on it.
6. **Dispatch event (the required click event) at target.**
If there is an element e and the click event is not canceled, run post-click activation steps on element e.
If there is an element e and the event is canceled, run canceled activation steps on element e.
7. Set the click in progress flag on target to false.

The most relevant steps are *4.* and *6.* as they clearly indicate that *target* and *nearest activatable element* that triggers default action can be **separate**. What's left to have a complete understanding is how *nearest activatable element* is defined:

> Given an element target, the nearest activatable element is the element returned by the following algorithm:

> 1. If target has a defined activation behavior, then return target and abort these steps.
> 2. If target has a parent element, then set target to that parent element and return to the first step.
> 3. Otherwise, there is no nearest activatable element.

Now it is obvious why a default action of an `anchor` is executed even though a `click` event did not bubble up from its child.

*This article is cross-posted with [my company blog](http://blog.brightinventions.pl)*
