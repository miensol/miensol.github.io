---
layout: post
title: Handling different user types in android application
date: '2015-07-12 23:40'
categories:
  - android
---

In the [previous post]({% post_url 2015-06-30-maintaining-current-user-information-in-android %}) you can read how to use `Session` object to maintain current user information through the application lifecycle. Now we'll explore different options of implementing varying behavior depending on user type.

## When an app has only one user type

I find it neat when an application allows me to use it before I'm forced to create an account or sign in. In such a case there will be a, potentially very long, time where we have no way of identifying the user. At the same time we'll want to provide as much features of an identified user as possible. There will however be cases where application behavior will be different depending on whether the user is logged in or not.

### A simple `if` will not do any harm, or will it?

Let's assume that our application allows changing preferences for both anonymous and authenticated users. When saving or reading user dependent application settings we can write a simple `if` statement to decide which preferences to use.

<script src="https://gist.github.com/miensol/4268ec47392ed4ea232e.js?file=CurrentUserProvider.java"></script>

Notice how in line `23` we do a check to decide the name of `SharedPreferences` to use. There's nothing wrong with doing such a check in 1 or 2 places however this type of logic will typically spread over dozens and more places in the various parts of the code base.

### The Null Object pattern to the rescue

Instead of relying on null checks we can use a simple pattern described in detail by [Martin Fowler](http://refactoring.com/catalog/introduceNullObject.html). Here's how it would look like in our case:

<script src="https://gist.github.com/miensol/4268ec47392ed4ea232e.js?file=CurrentUserProvider2.java"></script>

Now all places where we require an easily substitutable information about the user can be handled with plain old polymorphism.

The above approach will work whenever we need a default value for the anonymous user - no so much when we need different behavior. It's tempting to embed various actions into `UserReference` interface implementations (`AnonymousUserReference` and `RegularUserReference`) however this will make the mentioned interface depend on UI concepts which I would like to avoid.

## When an app has more than one user type

Before I show how to avoid putting too much weight onto `UserReference` interface, let's make our situation a bit more complicated. Let's assume that our app can be used by three types of users: anonymous, regular and premium.
A very common approach is to use an enum to handle that i.e.:

<script src="https://gist.github.com/miensol/2c4ffa7ed6fc24b4003c.js"></script>

In fact because `case` supports `default` the above implementation works well as long as we have a small number of user types and there's little shared behavior.

A slightly different approach is to hide the decision making and expose method(s) that accept different behaviors.
The following code is an example of how we can approach encapsulating differences between user types in by explicitly declaring a behavior:

<script src="https://gist.github.com/miensol/363cc59fc5c3b8373a47.js"></script>

Note that the above uses [double dispatch](https://en.wikipedia.org/wiki/Double_dispatch) but it could easily be replaced with a `switch` statement. Using separate class to encapsulate differences should make it easier to keep unnecessary logic out of `Activity`.

A curious reader might notice that if we would like to change how we handle only one user type we're still forced to override all methods. There's a fairly simple way to improve the above though:

<script src="https://gist.github.com/miensol/7872540e0e2d166bc975.js"></script>

Now we can implement custom actions as well as indicate a default. As usual whether to go with a simple `if` statement, a `switch` or a double dispatch depends on a use case. However it's useful to know the different ways of tackling the same problem.

*This article is cross-posted with [my company blog](http://blog.brightinventions.pl)*
