---
template: post
title: Use ShouldKO for better assertion messages 
author: piotr
draft: false
tags: [junit, hamcreset, kotlin, assertion, tests]
comments: true
crosspost: true
socialImage: ../../images/shouldko-1/search.jpg
date: 2018-01-17
---


Most of us write tests these days. Whether they are unit, integration, end-to-end or performance tests once written we often do not go back to them until they fail. It is thus vital to have a clear assertion message when a test fails.

![search](../../../images/shouldko-1/search.jpg)

## Hamcrest 

I think [Hamcrest](http://hamcrest.org/) is the most popular assertion library available in Java and Kotlin ecosystem. Let us look at an oversimplified example of [`Money`](https://martinfowler.com/bliki/ValueObject.html) class:

```kotlin
import java.math.BigDecimal
import java.util.*

data class Money(val amount: BigDecimal, val currency: Currency) {
    operator fun plus(other: Money): Money {
        if (currency != other.currency) {
            throw IllegalArgumentException("Cannot add $this to $other. Currencies must match.")
        }

        // an accidentally introduced bug 😈
        val newAmount = amount + other.amount + 10.0.toBigDecimal()
        return copy(amount = newAmount)
    }
}
```

Imagine we write a test for the [`plus`](https://kotlinlang.org/docs/reference/operator-overloading.html) operator using [JUnit](http://junit.org/junit5/) and [Hamcrest](http://hamcrest.org/):

```
class MoneyTests {
    val usd = Currency.getInstance("USD")

    @Test
    fun can_add() {
        val usd100 = Money(100.toBigDecimal(), usd)
        val usd50 = Money(50.toBigDecimal(), usd)

        assertThat((usd100 + usd50).amount, equalTo(150.toBigDecimal()))
    }
}
```

The test will fail with the following message:

```
java.lang.AssertionError: 
Expected: <150>
     but: was <160>
```

Let's see how we can improve on that.

## ShouldKO: better assertion messages for Kotlin

[ShouldKO](https://github.com/miensol/shouldko) is a simple library I've come up with that improves the assertion messages. Its idea is based on assertion libraries available in .NET e.g. [Shouldly](https://github.com/shouldly/shouldly). Let us see how the tests looks like using [ShouldKO](https://github.com/miensol/shouldko):

```kotlin
class MoneyTests {
    val usd = Currency.getInstance("USD")

    @Test
    fun can_add() {
        val usd100 = Money(100.toBigDecimal(), usd)
        val usd50 = Money(50.toBigDecimal(), usd)

        (usd100 + usd50).amount.shouldEqual(150.toBigDecimal())
    }
}
```

In my opinion [ShouldKO's](https://github.com/miensol/shouldko) assertion syntax improves readability. However, this is not where [ShouldKO](https://github.com/miensol/shouldko) main improvement is. Follow the improved assertion message:

```
java.lang.AssertionError: (usd100 + usd50).amount 
Expected: <150>
     but: was <160>
```

[ShouldKO](https://github.com/miensol/shouldko) incorporates a source code line with the assertion into the assertion message itself. This comes really handy when we have multiple lines with assertions that form one logical condition. This is a small thing, but can greatly improve debugging test issues especially when all we have is a log file produced by a test run.

## Installation of ShouldKO

[ShouldKO](https://github.com/miensol/shouldko) is currently available on [Jitpack](https://jitpack.io/). You need to first add Jitpack to your repositories:

```groovy
repositories {
    maven { url 'https://jitpack.io' }
    mavenCentral()
}
```

And include the library in your tests e.g.:

```groovy
testImplementation 'com.github.miensol.shouldko:hamcrest:v0.1.0'
```

[ShouldKO's](https://github.com/miensol/shouldko) Hamcrest library allows for using any Hamcrest matcher.
