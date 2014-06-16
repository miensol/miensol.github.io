---
layout: post
title: "Guide to javascript generators"
date: 2014-06-15
categories: ['javascript', 'nodejs', 'ES6', 'generators']
permalink: "/2014/06/15/guide-to-javascript-generators.html"
---
![Yield sign](/images/yield-sign.jpg)
For a while now I've been hearing and reading about a new exciting features of ES6 like arrow functions, array comprehensions, classes, modules, generators and many more. While many of them are easy to understand [generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*) can take a while to grok. So I thought it would be a good idea to write some samples to master this particular feature.

## What are generators
Generators or to be more precise *generator functions* are functions which can be exited and then reentered with function execution context (variable binding) preserved - a limited version of [coroutines](http://en.wikipedia.org/wiki/Coroutine) if you will. Traditionally they are used to write iterators more easily but of course they have many more interesting use cases.

*To run following samples your `node` version has to support harmony generators. You can check that with `node --v8-options | grep harmony`. The latest unstable version 0.11.12 supports them.*

### A simple generator
Here's a very simple example of generator that yields only two values:
{% gist miensol/9cf18bc90b2021018403 %}
when executed it will output:

```bash
{value: 1, done: false}
{value: 2, done: false}
{value: undefined, done: true}
```

### A Fibonacci generator
Of course since we have an easy way to create iterators we have to have a way to iterate over them. One approach is to just use a while loop:
{% gist miensol/367d27fb1b3f7966e31a %}

but honestly this would be a step back. Fortunately es6 comes with a new kind of `for-of` loop designed specifically to work with iterators:

```javascript
for(var current of fibo()){
  console.log(current);
}
```

### Iterators and iterables
I've mentioned couple of times a word iterator, but what exactly is that? In ES6 iterator is an object that has `next` method which when called returns and object having 2 properties:

- `value` - which represents value returned by iterator
- `done` - a boolean indicating whether iterator has done it's job or not

As we saw in the above generator examples every generator is an implicit iterator thus we can loop through it using new `for-of` syntax.

There is one more object *type* it is good to know of - `iterable`. According to [ES6 Wiki](http://wiki.ecmascript.org/doku.php?id=harmony:iterators) an object is iterable if has a internal property named `iterator` which is a function returning iterator. Unfortunatelly the latests specs aren't yet implemented in v8 (or incorporated in node.js) so the following example is only my understanding of the specs:

```javascript
var iterable = {};
iterable[Symbol.iterator] = function(){
    console.log('calling Symbol.iterator')
    return (function *(){
      yield 1;
      yield 2;
    }());
};

for(var item of iterable){
  console.log(item);
}
```

which would print:

```bash
calling Symbol.iterator
1
2
```

## Passing values to generators
So far we've covered the most simplistic usage of generators for those familiar with .NET it reassembles a `yield` keyword introduced in C# 2.0 in 2005. Since ES6 Generators design was influenced a lot by python generators now wonder we can also pass values to generator functions. You do it by passing value to `next` function call:
{% gist miensol/30aa3afe5396bdc6b8c1 %}

Running it should output something similar to:

```bash
How old are you? oracle says:  0.760754773626104
Why? oracle says:  0.36784305213950574
Thank you!
```

A careful reader will notice that the first question is silently ignored by our *oracle* generator. This is logical although might be strange at first. The generator function body isn't executed until we call `next` for the **first time** - which is like *starting* the generator. The call to `next` will execute function body until it encounters `yield` - the control flow changes and the function is left to be entered later on - on future `next` call. Notice that we there is no logical place to store/assign the value passed to first `next()` call - **a value that we pass to first `next()` call is ignored.**

*Thanks to @NOtherDev for pointing that out*.

### Generators error handling
Now that we know how to yield values and receive them inside generators. It's equally important to be able to handle exceptions gracefully. Since generators are executing synchronously semantics of typical `try {} catch {}` should be preseved:
{% gist miensol/f740e31ccc73283809a5 %}
which would output:

```bash
Generator entered, yielding first value
Generator asked for second value - will go bum
[Error: You can only call this generator once, sorry!]
```

It's important to note however that if you try to call `next` method on a generator that has thrown an exception you'll get another error:

```bash
throwingGenerator.next();
                  ^
Error: Generator is already running
    at GeneratorFunctionPrototype.next (native)
```

Now this was a case when a generator has thrown exception at caller. What if we would like to tell generator that an error occured at caller's site. Thanks to generator `throw` function that is easy enough:

{% gist miensol/d5dd0e6d46c05f51f0ed %}

This as you may expect will produce:

```bash
I will stop when you tell me about error
Got value from you: I will throw in a moment!
Got error from you: This is the end. Goodbye!
```

## Practical generator usage
An obvious use case is of course creating lazy evaluated collections. One can now very easily implement collection operators that are available in LINQ. Consider following examples:
{% gist miensol/e5c8f929e2fcdf0253b2 %}
which when executed will output *(note the order or DEBUG calls)*:

```bash
DEBUG: concat yielding first generator values
DEBUG: reverse will yield 6
DEBUG: filter predicate value true for item 6
DEBUG: take will yield  6 counter 1
DEBUG: select will yield Even number 6
Even number 6
DEBUG: reverse will yield 5
DEBUG: filter predicate value false for item 5
DEBUG: reverse will yield 4
DEBUG: filter predicate value true for item 4
DEBUG: take will yield  4 counter 2
DEBUG: select will yield Even number 4
Even number 4
DEBUG: concat yielding second generator values
At the end
```

Note the `concat` function implementation uses `yield *otherGenerator()` to yield values yielded by other generator which greatly reduces a boilerplate code needed otherwise.

### Simplifying asynchronous operations
It may as first be a surprise that generators can streamline asynchronous code - how would synchronously executing `yield` help in managing asynchronous calls? If you think of the way we write asynchronous code in most of mainstream languages it typically boils down to either:

- passing a callback function(s) that will be called when the operation completes
- immediately getting back a promise of result from async function
- using a library similar to [Reactive Extensions](http://msdn.microsoft.com/pl-pl/data/gg577609.aspx) - that when it comes to asynchronous code somewhat similar in usage to promises but offers very rich API

Now when you look at async code consuming:

```javascript
var power = function(number, exponent){
  var deferred = Q.defer();
  setTimeout(function(){
    deferred.resolve(Math.pow(number, exponent))
  }, 300);
  return deferred.promise;
};

power(2,3).then(function(result){
  console.log(result);
});
```

I immediately translate promise calls in my head to a more natural flow:

```javascript
var result = _wait_for_async_ power(2,3);
console.log(result);
```

Now since we don't have `async` feature like the one C# 5 has ([or rather we don't yet have it](http://wiki.ecmascript.org/doku.php?id=strawman:async_functions)) it's not yet possible to achieve this kind of simplification. Still if you think of how the *imaginary* `_wait_for_async_` keyword would work it seems that it (in case of promise based implememntation):

*  would wait for the promise to complete in a non blocking fashion - possibly leaving function execution context
*  when the promise completes it would return to the exact place from where it was *called* and return value that it got from promise or throw an exception

Essentially that's the way `yield` keyword works - however we still need an umbrella machinery that will  take care of calling generator `next` method so it will return to the original caller as well as it `throw` method to report exceptions.

As you may have guessed there are already plenty of implementations of this machinery - the one I like most is [co](https://github.com/visionmedia/co). Take a look at an example from their page and enjoy callback free life!
