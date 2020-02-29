---
template: post
title: In-memory database tests with Querydsl
author: piotr
draft: false
tags: [kotlin, querydsl, hibernate, jpa, database]
comments: true
crosspost: true
socialImage: ../../static/media/querydsl-tests/test.jpg
date: 2018-02-12 22:14:00
---

Writing tests is an important skill of a software engineer. I used to write lots of very focused, narrow unit tests. However, I often found such tests to hinder refactoring and barely help in catching regressions. Whether such issues were caused by my poor design choices or are intrinsic to unit tests is not the focus of this post. However, the fact is that nowadays I tend to write more coarse-grained, integration style tests. There is one downside to such approach: speed. For instance, using Hibernate with a full fledged database is relatively slow compared to using a fake repository implementation. Today I write about abstracting the database access using [Querydsl](http://www.querydsl.com/) in a way that aids testing.

![test](../../static/media/querydsl-tests/test.jpg)

## Querydsl is awesome

[Querydsl](http://www.querydsl.com/) is a set of libraries that, as the name implies, provides strongly typed Domain Specific Language to execute queries. [Querydsl](http://www.querydsl.com/) supports many data access technologies e.g. JDBC, Hibernate, JDO. 
The following example in Kotlin illustrates how a DSL generated based on entity class can be used to find some entities through JPA interface:

```kotlin
val queryFactory: JPAQueryFactory = ...
val userEmailToSearch = "alamakota@gmail.com"
val user = queryFactory.query()
    .from(QUser.user)
    .where(QUser.user.email.eq(userEmailToSearch))
    .select(QUser.user)
    .fetchOne()
```

One important option available is the [Collections](https://github.com/querydsl/querydsl/tree/master/querydsl-collections) module that offers an integration to POJO collections and beans. The following example in Kotlin shows how a list of users can be queried:

```kotlin
val users = listOf(userAlan, userBob, userAlice)
val user = CollQuery<Nothing>()
    .from(QUser.user, users)
    .where(QUser.user.email.eq(userEmailToSearch))
    .select(QUser.user)
    .fetchOne()
```

## Abstract the complex away

The above examples look similar thanks to common interface provided by Querydsl. However, while the default DSL is very capable I found it a bit verbose in the most common cases. For that matter let us define a bit simpler interface that will allow for finding entities given some criteria

```kotlin
interface EntityQueries {
    fun <TQEntity : EntityPath<TEntity>, TEntity : Any> findFirst(
        qEntity: TQEntity, 
        where: (TQEntity) -> Predicate? = { null }, 
        orderBy: ((TQEntity) -> OrderSpecifier<*>?) = { null }): TEntity? 
}

val queries:EntityQueries = ....

val ala = queries.findFirst(QUser.user, where = { it.email.eq("ala@gmail.com") })
val latestUser = queries.findFirst(QUser.user, orderBy = { it.created.desc() })
```

The above interface allows us to express commonly used queries in a more succinct fashion.

## Define production implementation

With Querydsl it is easy enough to implement the `EntityQueries` interface. First the production implementation delegating to JPA for actual data access technology:

```kotlin
class QueryDslDomainQueryFactory(private val queryFactory: JPAQueryFactory) : EntityQueries {
    override fun <TQEntity : EntityPath<TEntity>, TEntity : Any> findFirst(qEntity: TQEntity, where: (TQEntity) -> Predicate?, orderBy: (TQEntity) -> OrderSpecifier<*>?): TEntity? {
        return queryFactory.query()
            .from(qEntity)
            .where(where(qEntity))
            .apply { orderBy(qEntity)?.let { this.orderBy(it) }  }
            .select(qEntity)
            .fetchFirst()
    }
}
```

The above lets us use the `EntityQueries` interface instead of JPA in e.g. Spring controllers like so:

```kotlin
@RestController
class UsersController(private val queries: EntityQueries) {
    @GetMapping("/users")
    fun getByEmail(@RequestParam email: String) = queries.findFirst(QUser.user, where = { it.email.eq(email) })
}
```

One of the Spring recommended ways to abstract the specifics of query technology is to use [repository interfaces](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/#repositories.query-methods) e.g:

```kotlin
interface UserRepository : Repository<User, Long> {
  fun findByEmail(String email): User?
}
```

Such interface would be _magically_ implemented by Spring runtime and put in the application context. The approach may seem appealing at first since we do not have to implement the interface. There are however, multiple issues:
- an application context is required which in turn is slow to bootstrap
- there is no compile time checks
- the refactoring is harder without a special support from IDE
- the actual behavior is hard to figure out without a careful documentation lecture (what will happen if e.g. there are multiple users with the same email?)

The `EntityQueries` invocation to find users by email is almost as readable as `findByEmail` but does not suffer from any of downsides listed above. Encapsulating more complex filtering logic can be done with a simple extension method or a more elaborate [Specification pattern](https://en.wikipedia.org/wiki/Specification_pattern). 

## Using in-memory database in tests

We can use Spring test helpers to ease writing tests involving an application context that lets us inject e.g. `UsersController` instance to invoke its methods. However, such tests are, comparatively, very slow to run and thus cause the feedback loop to be much slower. Fortunately the `EntityQueries` abstraction is very easy to implement using POJO in-memory collections.

```kotlin
class InMemoryEntityQueries : QueriesBase(), EntityQueries {
    val entities = mutableMapOf<Class<*>, MutableList<*>>()

    override fun <TQEntity : EntityPath<TEntity>, TEntity : Any> findFirst(qEntity: TQEntity, where: (TQEntity) -> Predicate?, orderBy: (TQEntity) -> OrderSpecifier<*>?): TEntity? {
        val entities = entities.getOrPut(qEntity.type, { mutableListOf<TEntity>() }) as List<TEntity>
        return CollQuery<Nothing>()
            .from(qEntity, entities)
            .where(where(qEntity))
            .apply { orderBy(qEntity)?.let { this.orderBy(it) } }
            .select(qEntity)
            .fetchFirst()
    }
}
```

The above implementation looks almost exactly the same as the production one. We can of course try to extract the common code to make things more DRY. However, the most important observation is that we delegate to Querydsl implementation for the important filtering and ordering logic. This can increase our confidence that the fake implementation behaves the same as production one with only difference being the actual entity storage.

Given the above implementation we can now easily replace the `UsersController` dependency and instantiate it as a regular POJO:

```kotlin
class UsersControllerTests {
    val db = InMemoryEntityQueries()
    val controller = UsersController(db)

    @Test
    fun canFindByEmail(){
        db.entities[User::class.java] =  listOf(User(email = "ala@gmail.com"), User(email = "ola@gmail.com"))

        controller.getByEmail("ola@gmail.com").email.shouldEqual("ola@gmail.com")
        controller.getByEmail("peter@gmail.com").shouldEqual(null)
    }
}
```

## Notes on in-memory implementation

The `EntityQueries` interface above is obviously a simplified version. The most important missing piece is the ability to save entities. However, this is not a hard thing to implement given the in-memory implementation. We can, for instance, make use of the fact that all of our entities are marked JPA Persistence annotations to find a field marked with `@Id`, generate the id and assign it based on the contents of the `entities` variable. Another approach is to mark all entities with a dedicated interface e.g.

```kotlin
interface HasId<TId> {
    var id: TId
}
```

An entity implementing `HasId` could be checked in the `save` method of the in-memory implementation and assigned with a unique identifier e.g.:

```kotlin
fun <TEntity: HasId<Long>> save(entity: TEntity) {
    val entities = entities.getOrPut(entity.javaClass, { mutableListOf<TEntity>() }) as List<TEntity>
    if(entity.id == null){
        entity.id = (entities.map { it.id }.max() ?: 0) + 1
    }
    entities += entity
}
```

Following the above approach we can easily add missing operations e.g. to remove an entity and that in turn allows us to write even more tests that run fully in-memory. It is worth noting that using an in-memory database implementation works best for queries that fetch, save or update one or multiple instances. As soon as we need to use a features natural to a database technology e.g. joins in SQL, we are better of connecting to a real database. While Querydsl collections module supports both join and group operations the in-memory implementation is often not equivalent to the database one especially around `null` values handling.
