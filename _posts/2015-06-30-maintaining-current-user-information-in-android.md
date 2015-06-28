---
layout: post
title: "Maintaining current user information in Android"
date: 2015-06-30
categories: ["android"]
---

Every but trivial android application needs to maintain information about current user - regardless if he has authenticated or not. While this may sound easy there are still at least handful of ways one can do it - in this article I'm going to explore couple of them.

## Keeping state in custom `Application` class

This technique boils down to having custom application class like so:

<script src="https://gist.github.com/miensol/e7fcce936e0acb3499ec.js?file=MyApplication.java"></script>

While the above is both easy to write and understand there are several problems with it. First and foremost if you would like to get some user property you'll need to reference `MyApplication` i.e.:

<script src="https://gist.github.com/miensol/e7fcce936e0acb3499ec.js?file=ActionBar.java"></script>

Since data about current user will be used in several places spread through the code each of those places will now be coupled to `MyApplication`. This on the other hand will jeopardize any attempt to break the code base into modules. Furthermore this approach may encourage sharing other global application state through static variables defined on custom `Application` class. In short **don't do this**.

## Keeping global state in `User` class

A slightly better idea is to move static variables from `Application` class into `User` class itself:

<script src="https://gist.github.com/miensol/e7fcce936e0acb3499ec.js?file=User.java"></script>

Now our `Application` class has one less responsibility and we don't need smelly references spread around the codebase. We may also be able to split the project into modules - as long as we're not too inclined to separating concerns. Problems arise as soon as you start unit testing though. Remember that good unit test should be as isolated as possible. Using global state through static methods on `User` class forces us to properly `setUp()` and `tearDown()` its state in every test. It would be much easier if we could properly inject information about current user through tested component(s) constructor(s).

I mentioned [separation of concerns](https://en.wikipedia.org/wiki/Separation_of_concerns) - does a user class have any reason to know whether a user has signed in? I don't think so.

## Separating concerns with User Session

I find it helpful to think about objects lifetimes when designing components. In every application that allows users to sign in there will be a time where we don't have a *user object* to work with. To express that property I usually store the information about current user in a *Session* object. There is only one *user* session whenever an application is running. After user signs in the session is updated to represent it. After signing out it's usually a good idea to reset session state. Consider following example:

<script src="https://gist.github.com/miensol/e7fcce936e0acb3499ec.js?file=Session.java"></script>

Couple of things to note here. First and foremost the `Session` class **is not public** it's local to package responsible for maintaining it's state. Typically it's a package dealing with user registration, sign in and keeping remote services auth tokens fresh. Secondly `Session` public interface only covers methods defined in `CurrentUserInfo` exposing methods that come handy when getting current user name. The `Session` object is not limited to one interface. Quite opposite it may implement more interfaces depending on different *clients* (components requesting various details about current user) needs.

Since `Session` embraces [Interface Segregation Principle](https://en.wikipedia.org/wiki/Interface_segregation_principle) it's much easier to test code that requests information about current user i.e `AppBeahvior`. A reusable [fake](http://www.martinfowler.com/bliki/TestDouble.html) can be coded with no effort - it only has to implement very limited set of methods.

Notice that I've not used static methods nor variables in above example. Instead I've simply marked the class with `@Singleton` annotation to ensure that there will only be single instance ever created, injected and used. I highly encourage using Dependency Injection frameworks (a.k.a IoC containers) with [Dagger](http://square.github.io/dagger/) (and [Dagger 2](http://google.github.io/dagger/)) taking the lead in Android space.

In the next article I'm going to show a way to deal with application behavior changing depending on user being logged in or not.

*This article is cross-posted with [my company blog](http://blog.brightinventions.pl)*
