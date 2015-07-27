---
layout: post
title: 'Android Data Binding Part 2: Observer pattern to the bone'
date: '2015-07-27 08:45'
categories:
  - android
tags:
  - android
author: piotr
---

In the [previous part]({% post_url 2015/2015-07-20-android-data-binding-part-1-why-it-is-important %}) I've described typical problems we have to face when developing applications on Android. I've also highlighted that some of them may be mitigated when [data binding api](https://developer.android.com/tools/data-binding/guide.html) is utilized properly. It's time to dive into more details of how this promising api works.

## Observer Pattern
At the root of many of solutions we find in today's APIs is a design pattern. In case of the discussed android api it is [Observer Pattern](https://en.wikipedia.org/wiki/Observer_pattern) applied to the bone. In fact this particular pattern is so common and powerful that some languages and runtimes (C# with .net, Objective-C and Swift on iOS and Mac) provide neat support for it. You may wonder why it is important in context of android data binding? The answer is simple yet easy to ignore - memory management. The following diagram depicts dependencies of an observer pattern's elements in the context of android data binding:
![Android data binding diagram](/images/android_data_binding_diagram.png)
On the right side we have the *observable* part producing notifications about changes - an object implementing `android.databinding.Observable` interface. In the observer pattern *events producer* can have many *events listeners* - `OnPropertyChangedCallback` implementations. Android data binding provides implementations of *events listeners* taking care of property values changes as well us collection elements changes.

Note that the `Observable` object knows nothing about concrete `OnPropertyChangedCallback` implementations ([Dependency Inversion Principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle) at its best). However at runtime the `Observable` object will hold references to many `OnPropertyChangedCallback`s instances. If you look further down the diagram you'll see that in order for `OnPropertyChangedCallback` implementations provided by android data binding library to update state of view component a reference to it is required. This means that although the view model knows nothing about the view components at compile time they will reference them at runtime.

## How android data binding library aids memory management?
As stated above in a simple implementation we would have a lightweight and testable view model retain expensive view widgets - thus making it heavy. In android context it means that even though an `Activity` got destroyed we could have other object still retaining its `Views`, trying to update them and preventing them from being garbage collected. Not so nice, huh?

If you look closer at how android data binding is implemented you'll immediately see that its `OnPropertyChangedCallback` hold only [weak references](http://developer.android.com/reference/java/lang/ref/WeakReference.html) to views.
`WeakPropertyListener`, `WeakListListener`, `WeakMapListener` and `ViewDataBinding.WeakListener` make sure that the `Observable` object is not retaining views. This means that there's no need for a developer to manually *stop* data binding in an activity `onDestroy` or a fragment `onDestroyView` methods. If you use [RxJava](https://github.com/ReactiveX/RxJava) you probably know that this extra step is tedious and requires a great deal of attention and boilerplate code. You can find out more about the problem in at least couple of issues on github: [1](https://github.com/ReactiveX/RxJava/issues/386), [2](https://github.com/ReactiveX/RxAndroid/issues/12).

Because android data binding library takes extra steps to make sure a view model will not cause views to be retained we can detach a view model's lifecycle from that of an activity or a fragment. We now have an easy way to i.e. do a simple in memory caching via singleton view models. More importantly, we can cross out at least one place when looking for a memory leak cause.
