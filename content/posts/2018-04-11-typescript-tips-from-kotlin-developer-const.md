---
template: post
title: TypeScript tips from Kotlin developer - const
author: piotr
draft: false
tags: [TypeScript, Kotlin, const, immutability]
comments: true
crosspost: true
socialImage: ../../static/media/kotlin/kotlin-logo.png
date: 2018-04-11
---

Nowadays I mostly code in [Kotlin programming language](https://kotlinlang.org/). I got interested in it when I started working on a Java 7 codebase and quickly got fed up with the language. At [Bright Inventions](https://brightinventions.pl) we often use TypeScript for both back-end, front-end and mobile development so I thought I would share some thoughts and tips for TypeScript learned while using Kotlin. In particular this post is about constant variables.

## Use `const` whenever possible

[Using immutable variables](https://hackernoon.com/5-benefits-of-immutable-objects-worth-considering-for-your-next-project-f98e7e85b6ac) aids reasoning about the flow and state of a program. It helps compiler to provide more intelligent hints especially while dealing with nullable types.

In Kotlin a `val` keyword denotes a variable which value does not change after initialization e.g.:

```kotlin
val x: Int
val y = 3
x = 2
x = 20 // Error: Val cannot be reassigned
y = 30 // Error: Val cannot be reassigned
```

In [TypeScript](https://www.typescriptlang.org/) such a situation is handled with `const`:

```typescript
const x: number // Error: 'const' declarations must be initialized
const y: number = 3

y = 30 // Error: Cannot assign to 'y' because it is constant or read-only property
```

## Compilers love `const`

The first way in which the compiler gets smarter when we use `const` are null checks. When you enable [`strictNullChecks`](https://www.typescriptlang.org/docs/handbook/compiler-options.html), which you should, both Kotlin and TypeScript compiler understand if something can or cannot be null.

```typescript
const firstName: string | null = getFirstName()
let lastName: string | null = getLastName()

if (firstName !== null && lastName !== null) {
    setTimeout(() => {
        console.log(firstName.length)
        console.log(lastName.length) // Error: Object is possibly 'null'
    })
}
```

In the first 2 lines we declare `firstName` and `lastName` as holding `string` or `null`. The variables are initialized with the helper functions `getFirstName` and `getLastName`. After we check that `firstName` and `lastName` are **definitely not null** we fire some async function. We can safely use `firstName.length`. However, when we use `lastName.length` the compiler complains with `Object is possibly 'null'` error. This is because it is possible that in between the null check and the `console.log` statement _something_ could change the `lastName` value. We might know that this is not true just by looking at the code. The compiler however, cannot be 100% sure in all cases. Thankfully we have `const` and we can share our knowledge with the compiler.

## Compilers catch bugs with `const`

Because `const` and `val` can only be assigned once, compilers can prevent another class of bugs. Take a look at the code example blow. There is a bug 🐛 that could easily be avoided had we used `const` instead of `let`.

```typescript
let firstName: string = person.firstName
let lastName: string = person.lastName

const parsed = parseFormData((data: {name: string }) => {
    let first: string | null, last: string | null
    let parts = data.name.split(' ')
    lastName = parts[0]
    firstName = parts[1]
    return { firstName: first, lastName: last }
})

if (parsed.firstName !== firstName || parsed.lastName !== lastName) { 
    // submit changes
}
```

You may have spotted the bug. Chances are though, especially if you are like me, that after long hours when the coffee level in your blood drops substantially below the required level, it will take long minutes to figure out the cause. There is a very easy remedy though. With `firstName` and `lastName` declared as constant variables the compiler catches bugs for us:

```typescript
lastName = parts[0] // Error: Cannot assign 'lastName' because it is a constant or a read-only property
firstName = parts[1] // Error: Cannot assign 'firstName' because it is a constant or a read-only property
```
