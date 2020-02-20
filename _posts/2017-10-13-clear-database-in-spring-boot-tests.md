---
layout: post
title: How to clear database in Spring Boot tests?
tags: tests spring boot database kotlin
author: piotr
comments: true
hidden: false
crosspost: true
date: 2017-10-13 22:14:00
---

Nowadays using a production like database in _unit_<sup>[1](#sup-1)</sup> tests is a common practice. Calling a real database can increase our confidence that a tested code actually works. Having said that a database, by its very nature, brings external state into a test that will affect its behavior, hence we need to pay special attention to prepare the test execution. There are couple of ways to handle the database state in tests and I'm going to describe an approach I like most.

![Database](../images/clear-database-in-spring-boot-tests/disk.jpg){: .center-image}

## Problems with Spring Boot Transactional tests

Spring Boot offers many helpers to make testing application easier. Among many you can use a [`@DataJpaTest`](https://docs.spring.io/spring-boot/docs/current/reference/html/boot-features-testing.html#boot-features-testing-spring-boot-applications-testing-autoconfigured-jpa-test) which by default will configure an in-memory embedded database. You can use a production type database in tests by adding `@AutoConfigureTestDatabase(replace=Replace.NONE)` like so:

```java
@RunWith(SpringRunner.class)
@DataJpaTest
@AutoConfigureTestDatabase(replace=Replace.NONE)
public class ExampleRepositoryTests {

    // ...

}

``` 

The `@DataJpaTest` uses `@Transactional` under the hood. A test is wrapped inside a transaction that is rolled back at the end. This means that when using e.g. Hibernate one needs to pay special attention to how the tested code is written. [As shown in the Java example below](https://docs.spring.io/spring/docs/4.3.11.RELEASE/spring-framework-reference/htmlsingle/#testcontext-tx-enabling-transactions), a manual flush is indeed required:


```java
@RunWith(SpringRunner.class)
@ContextConfiguration(classes = TestConfig.class)
@Transactional
public class HibernateUserRepositoryTests {
    ...
    @Test
    public void createUser() {
        // track initial state in test database:
        final int count = countRowsInTable("user");

        User user = new User(...);
        repository.save(user);

        // Manual flush is required to avoid false positive in test
        sessionFactory.getCurrentSession().flush();
        assertNumUsers(count + 1);
    }
}
```

Using `@Transactional` annotation on tests is certainly easy but **I still don't use it** for the following reasons:
- The production code is using transactions with different scope.
- It is easy to forget about a flush and thus have false positive in test.
- On failure and when debugging it is hard to see what values were actually saved in db.
- It is much harder to write tests of production code that requires a transaction to be committed. 
- The test code needs to be more tightly coupled to production code and [we all know that it hinders refactoring](http://blog.cleancoder.com/uncle-bob/2017/10/03/TestContravariance.html).


## Cleaning database with SQL

In tests involving a database I reset its state **before each** test using plain old SQL. This makes the test code less dependent on how a transaction is scoped inside production code. Furthermore, one can easily review the values saved **after a test failure**. It turns out it is easy to write a JUnit `@Rule` or [`BeforeEachCallback`](http://junit.org/junit5/docs/5.0.1/api/org/junit/jupiter/api/extension/BeforeEachCallback.html) that will remove all rows from all tables. Moreover, we can do so without hard coding table names which would increase maintenance cost.

Let's start with defining a `@Rule` in Kotlin in that will be called before each test:

```kotlin
import org.junit.rules.ExternalResource
import org.springframework.stereotype.Component
import javax.sql.DataSource

@Component
class DatabaseCleanerRule(private val dataSource: DataSource) : ExternalResource() {

    override fun before() {
        if (databaseCleaner == null) {
            // Consider inspecting dataSource to check if we are connecting to test database
            databaseCleaner = DatabaseCleaner(dataSource::getConnection)
        }
        databaseCleaner!!.reset()
    }

    companion object {
        internal var databaseCleaner: DatabaseCleaner? = null
    }
}
```
Consider inspecting `dataSource` to check if we are about to connect to test database and **not one used for development.** It is very easy to use incorrect Spring Profile and wipe out your development data. Ask me how I know?

We can use the `DatabaseCleanerRule` in a spring enabled test as any other JUnit rule e.g. `@Rule @Inject lateinit var cleanerRule: DatabaseCleanerRule`.

Notice that we've delegated the actual important work to `DatabaseCleaner` class defined in Kotlin below. 

```kotlin
import com.practi.util.iterator
import org.slf4j.LoggerFactory
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.SQLException

class DatabaseCleaner(private val connectionProvider: () -> Connection) {
    private val tablesToExclude = mutableSetOf<String>()
    private var tablesForClearing: List<TableRef>? = null

    fun excludeTables(vararg tableNames: String) {
        tablesToExclude += tableNames.flatMap { listOf(it, it.toLowerCase()) }
    }

    fun reset() {
        if (notPrepared) {
            prepare()
        }
        executeReset()
    }

    private val notPrepared get() = tablesForClearing == null

    private fun prepare() {
        connectionProvider().use { connection ->
            val metaData = connection.metaData
            val tableRefs = metaData.getTables(connection.catalog, null, null, arrayOf("TABLE")).use { tables ->
                iterator(tables::next) { tables.getString("TABLE_NAME") }
                    .asSequence()
                    .filterNot(tablesToExclude::contains)
                    .map(::TableRef)
                    .toList()
            }

            tablesForClearing = tableRefs

            LOG.info("Prepared clean db command: {}", tablesForClearing)
        }
    }

    private fun executeReset() {
        try {
            connectionProvider().use { connection ->
                val reset = buildClearStatement(connection)
                val result = reset.executeBatch()
                result
            }
        } catch (e: SQLException) {
            val status = engineInnoDbStatus()
            LOG.error("Failed to remove rows because {}. InnoDb status: {}", e, status)
            throw e
        }
    }

    private fun engineInnoDbStatus(): String { ... }

    private fun buildClearStatement(connection: Connection): PreparedStatement {
        val reset = connection.prepareStatement("")
        reset.addBatch("SET FOREIGN_KEY_CHECKS = 0")
        tablesForClearing?.forEach { ref ->
            reset.addBatch("DELETE FROM `${ref.name}`")
        }
        reset.addBatch("SET FOREIGN_KEY_CHECKS = 1")
        return reset
    }

    data class TableRef(val name: String)

    companion object {
        private val LOG = LoggerFactory.getLogger(DatabaseCleaner::class.java)!!
    }
}
```

Notice that we've defined `tablesToExclude` set that allows us to omit certain tables. This comes in handy when you're using a database migration tool that stores its state inside some table(s).

[The JDBC metadata](https://docs.oracle.com/javase/7/docs/api/java/sql/DatabaseMetaData.html) allows us to introspect schema regardless of the database vendor. The `iterator` is a tiny Kotlin function that aids consuming iterator like objects:

```kotlin
inline fun <T> iterator(crossinline next: () -> Boolean, crossinline value: () -> T): AbstractIterator<out T> = object : AbstractIterator<T>() {
    override fun computeNext() {
        if (next()) {
            setNext(value())
        } else {
            done()
        }
    }
}
```

The `buildClearStatement` constructs a large query that `DELETE`s all rows from each relevant table. The example above uses MySQL where it is very easy to disable foreign key checks. This is important since foreign keys would prevent rows to be removed unless we paid special attention to the order of removal. A more generic example of how to deal with referential integrity when clearing a database can be found in the [Respawn project](https://github.com/jbogard/Respawn).

Last but not least, when a `SQLException` is thrown we log the exception accompanied with [`SHOW ENGINE INNODB STATUS`](https://dev.mysql.com/doc/refman/5.7/en/show-engine.html). The status information can hint us about failure reason e.g. another test process executing against the same database or a rogue, runaway thread that locks some rows. 

```kotlin
private fun engineInnoDbStatus(): String {
    return connectionProvider().use { connection ->
        connection.createStatement().executeQuery("SHOW ENGINE INNODB STATUS ").use {
            iterator(it::next) { it.getString("Status") }.asSequence().toList()
        }.joinToString(System.lineSeparator())
    }
}
```

The above examples show that it is not hard to manually reset the database. I've found that using this approach makes my tests more trustworthy and less coupled to the underlying persistence layer. In fact, we can easily switch e.g. from JPA to `JdbcTemplate` in a performance critical code area without a need to change a test.

_<sup>1</sup>_<a name="sup-1"></a> Whether it is actually unit or integration test is a different topic.

