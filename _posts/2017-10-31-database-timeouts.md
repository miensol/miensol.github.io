---
layout: post
title: Database timeouts
author: piotr
hidden: false
tags: database timeout jdbc query transaction
comments: true
crosspost: true
image: /images/database-timeouts/database-files.jpg
date: 2017-10-31 22:14:00
---

Last time I have outlined [the importance of timeouts]({% post_url 2017-10-23-the-importance-of-timeouts %}). Without a carefully considered timeouts our application can become unresponsive easily. In this post I will focus on configuring various timeouts related to interaction with database. I am going to focus specifically on relational databases. The principles and practices however can be applied equally well to other types of databases.

![Database](../images/database-timeouts/database-files.jpg)

## Different kinds of timeouts

Asking a database for results of a query is one of the most common activities a back end application will do. Let us decompose this simple task into steps:

1. [Establish database connection(s) in pool](#init)
1. [Take the connection out of the pool](#pool)
1. [Validate the acquired connection](#validate)
1. [Send statement(s) to database](#send)
1. [Read query results](#read)

Each of the above steps can involve a specific timeout configuration. The details depend on particular technology stack and type of database we are querying. 

### <a name="init">Establish database connection(s) in pool</a>

Dealing with raw database connections is almost always done with the help of connection pool. Establishing a connection to database is very expensive compared to running a simple statement. The pool alleviates this cost by reusing connections for as long as needed. 

The first timeout is the maximum duration until a database connection is established. In JDBC this can be controlled by:

- `connectTimeout` in [MySQL JDBC driver](https://dev.mysql.com/doc/connector-j/5.1/en/connector-j-reference-configuration-properties.html) 
  
  > Timeout for socket connect (in milliseconds), with 0 being no timeout. Only works on JDK-1.4 or newer. Defaults to '0'.
  
  The default is **infinite ‼️**

- `socketTimeout` in [MySQL JDBC driver](https://dev.mysql.com/doc/connector-j/5.1/en/connector-j-reference-configuration-properties.html) 
  
  > Timeout (in milliseconds) on network socket operations (0, the default means no timeout).
  
- `loginTimeout` in [MySQL JDBC driver](https://docs.oracle.com/javase/8/docs/api/java/sql/DriverManager.html#setLoginTimeout-int-) 
  
  > Sets the maximum time in seconds that a driver will wait while attempting to connect to a database once the driver has been identified.

  The default value 0 means **infinite ‼️**

- `loginTimeout` in [PostgreSQL JDBC driver](https://jdbc.postgresql.org/documentation/head/connect.html):
  
  > Specify how long to wait for establishment of a database connection. The timeout is specified in seconds.

  **Default is infinite ‼️**

- `connectTimeout` in [PostgreSQL JDBC driver](https://jdbc.postgresql.org/documentation/head/connect.html):
  
  > The timeout value used for socket connect operations. If connecting to the server takes longer than this value, the connection is broken. The timeout is specified in seconds and a value of zero means that it is disabled.

- `socketTimeout` in [PostgreSQL JDBC driver](https://jdbc.postgresql.org/documentation/head/connect.html):
  
  > The timeout value used for socket read operations. If reading from the server takes longer than this value, the connection is closed. This can be used as both a brute force global query timeout and a method of detecting network problems. The timeout is specified in seconds and a value of zero means that it is disabled.

You probably have noticed a recurring theme above: **default timeouts are either infinite or disabled at the driver level**. _In case of `socketTimeout` and `connectTimeout` there can still be a system level timeout involved both on [Linux](https://linux.die.net/man/7/socket) and [Windows](https://msdn.microsoft.com/en-us/library/windows/desktop/ms740476(v=vs.85).aspx). However, those only work on blocking send and receive operations and how the JDBC driver interacts with the socket is an implementation detail for the most part._

In order to demonstrate how the above timeouts work in practice we will use the following test cases:

```kotlin
class JdbcTimeoutTest {
    @Test
    fun `mysql getConnection`() {
        val mysqlDataSource = mysqlDataSource()

        assertTimeoutPreemptively(Duration.ofMinutes(3)) {
            useResource { mysqlDataSource.connection }
        }
    }

    @Test
    fun `postgresql getConnection`() {
        val mysqlDataSource = postgreSQLDataSource()

        assertTimeoutPreemptively(Duration.ofMinutes(3)) {
            useResource { mysqlDataSource.connection }
        }
    }

    fun useResource(resourceProvider: () -> AutoCloseable) {
        val start = Instant.now()
        try {
            resourceProvider().use {
                println("Completed in ${Duration.between(start, Instant.now())}")
            }
        } catch (e: Exception) {
            println("Error $e after ${Duration.between(start, Instant.now())}")
        }
    }

    fun mysqlDataSource(): MysqlDataSource {
        return MysqlDataSource().apply {
            this.setURL("jdbc:mysql://localhost:3306/database")
            this.user = "user"
            this.setPassword("password")
        }
    }

    fun postgreSQLDataSource(): PGSimpleDataSource {
        return PGSimpleDataSource().apply {
            this.user = "user"
            this.password = "password"
            this.databaseName = "database"
            this.serverName = "localhost"
        }
    }
}
```

To simulate a misbehaving database server we'll use `netcat` listening on standard MySQL and PostgreSQL port e.g.:

```bash
nc -k -l 3306 # listen on MySQL port, PostgreSQL uses 5432 by default
```

Both of the above tests will fail due to `assertTimeoutPreemptively`.

The most appropriate candidate to use for establishing connection is `loginTimeout`. This works in PostgreSQL but does not with MySQL. Apparently the MySQL JDBC driver in versions 5.1, 6.0 and 8.0 implement the method as [Noop](https://en.wikipedia.org/wiki/Noop). Interestingly it is possible to force MySQL driver to respect the timeout when it is set **globally** through a static method `java.sql.DriverManager.setLoginTimeout`. 

A slightly less correct option is to use `connectTimeout` or `socketTimeout`. The socket level options work oblivious to database protocol hence it is impossible to set the timeout accurately for the whole establish connection operation. Additionally, the `socketTimeout` is applied to socket read operations not only to initial connection handshake. The fake `netcat` server is not suitable for testing the `connectTimeout` however we can use it for `socketTimeout`. The PostgreSQL driver correctly reported error after about 2 seconds after setting `pgSimpleDataSource.socketTimeout = 2`. Unfortunately settings `socketTimeout` in MySQL driver had **no effect** on the `getConnection` behavior. Interestingly no matter what value I've set the `socketTimeout` to, the error was thrown after about 26 seconds. I have no idea why it behaves like that 🤔.

**Be aware of the shortcomings of MySQL JDBC Driver.**

### <a name="pool">Take the connection out of the pool</a>

Reusing database connections gives the application great performance boost. However, writing an efficient and bug free database connection pool is no easy task thus we should all rely on proven solutions. In JVM world there are multiple choices when it comes to JDBC:

- [Hikari](https://brettwooldridge.github.io/HikariCP/) Claims to be the fastest and has limited number of configuration knobs and sane defaults. My favorite by far.
- [DBCP 2](https://commons.apache.org/proper/commons-dbcp/) A recently resurrected project which has a potential of being applicable to all resources pools with its `commons-pool2` module. 
- [Tomcat JDBC Connection Pool](https://tomcat.apache.org/tomcat-8.0-doc/jdbc-pool.html) Commonly used with lots of configuration options. Came to be as a replacement of dbcp.

When there are no connections available in the pool, the code asking for it needs to wait until one is available. The amount of time a thread is blocked waiting for a connection needs to be considered carefully. It is important to note that there are 2 situations we need to consider. The first one is when the pool has reached its maximum size and all connections are being used already. This is when there is very little actual work required to acquire a connection. The second case is when all currently opened connections are in use but the pool is allowed to create a new connection because it is not yet full. Here we need to keep in mind that time to establish a connection to the database may easily be around 200ms hence timeout should not be too short. Below you'll find how to configure the timeout in the mentioned connection pools:

- Hikari: `connectionTimeout`
  
  > This property controls the maximum number of milliseconds that a client (that's you) will wait for a connection from the pool. If this time is exceeded without a connection becoming available, a SQLException will be thrown. Lowest acceptable connection timeout is 250 ms. Default: 30000 (30 seconds)

- DBCP: `maxWaitMillis` 
  
  > The maximum number of milliseconds that the pool will wait (when there are no available connections) for a connection to be returned before throwing an exception, or -1 to wait indefinitely. 
  
  **Default is infinite ‼️**

- Tomcat: `maxWait`
  
  > (int) The maximum number of milliseconds that the pool will wait (when there are no available connections) for a connection to be returned before throwing an exception. Default value is 30000 (30 seconds)

My rule of thumb is to set this timeout **be under 5 seconds**.

### <a name="validate">Validate the acquired connection</a>

A database connection can be opened for several hours or even days. However, because there is network involved there are numerous cases where a socket that is seemingly open on the client side may in fact be part of a broken connection. A well behaving connection pool should avoid handing such connection to an application code. A common strategy to alleviate the problem is to test the connection just before it is taken out of the pool. In the past the test was performed using a simple SQL query e.g. `SELECT 1`. Nowadays there is a [`isValid`](https://docs.oracle.com/javase/7/docs/api/java/sql/Connection.html#isValid(int)) method available on the JDBC `Connection` itself which moves the responsibility to the driver itself:

> Returns true if the connection has not been closed and is still valid. The driver shall submit a query on the connection or use some other mechanism that positively verifies the connection is still valid when this method is called.

- Hikari: `validationTimeout`:
  
  > This property controls the maximum amount of time that a connection will be tested for aliveness. This value must be less than the `connectionTimeout`. Lowest acceptable validation timeout is 250 ms. Default: 5000

- DBCP: `validationQueryTimeout`:
  
  > The timeout in seconds before connection validation queries fail. If set to a positive value, this value is passed to the driver via the `setQueryTimeout` method of the `Statement` used to execute the validation query.

  **Default is infinite ‼️**

- Tomcat: `validationQueryTimeout`:
  
  > (int) The timeout in seconds before a connection validation queries fail. This works by calling java.sql.Statement.setQueryTimeout(seconds) on the statement that executes the validationQuery. The pool itself doesn't timeout the query, it is still up to the JDBC driver to enforce query timeouts. A value less than or equal to zero will disable this feature. The default value is -1.

  **Default is infinite ‼️**

### <a name="send">Send statement(s) to database</a> and <a name="read">read query results</a>

We have finally arrived at the most common usage. Every query that we send to a database should have a timeout configured either at the statement level or at the transaction level. When it comes to individual statements, there is [`setQueryTimeout`](https://docs.oracle.com/javase/7/docs/api/java/sql/Statement.html#setQueryTimeout(int)) available:

> Sets the number of seconds the driver will wait for a Statement object to execute to the given number of seconds. By default there is no limit on the amount of time allowed for a running statement to complete. If the limit is exceeded, an SQLTimeoutException is thrown. A JDBC driver must apply this limit to the execute, executeQuery and executeUpdate methods.

Additionally, it's up to the driver to decide what the above timeout means exactly:

> Note: JDBC driver implementations may also apply this limit to ResultSet methods (consult your driver vendor documentation for details).

> Note: In the case of Statement batching, it is implementation defined as to whether the time-out is applied to individual SQL commands added via the addBatch method or to the entire batch of SQL commands invoked by the executeBatch method (consult your driver vendor documentation for details).

A time required for a query to complete is very use case dependent thus we should **not expect a sane default** to be there. Instead, we need to ask ourself how long we are willing to wait for a query to complete. It is very easy to forget about this rule hence it is very handy to be able to set this timeout globally:

- DBCP: `defaultQueryTimeout`
  
  > defaultQueryTimeout	null	If non-null, the value of this Integer property determines the query timeout that will be used for Statements created from connections managed by the pool. null means that the driver default will be used.

- Tomcat: `queryTimeout` available through [QueryTimeoutInterceptor](https://tomcat.apache.org/tomcat-8.0-doc/jdbc-pool.html#JDBC_interceptors)
  
  > (int as String) The number of seconds to set for the query timeout. A value less than or equal to zero will disable this feature. The default value is 1 seconds.

- Hikari: Not available but fairly easy to add by wrapping a DataSource e.g.:

```kotlin
class CustomTimeoutsDataSource(val innerDataSource: DataSource, private val queryTimeoutProperties: DataSourceConfiguration.QueryTimeoutProperties) : DataSource by innerDataSource {

    override fun getConnection(username: String?, password: String?) = configureTimeouts(innerDataSource.getConnection(username, password))
    override fun getConnection() = configureTimeouts(innerDataSource.connection)

    private fun configureTimeouts(connection: Connection):Connection = CustomTimeoutsConnection(connection, queryTimeoutProperties)

    private class CustomTimeoutsConnection(val innerConnection: Connection, private val queryTimeoutProperties: DataSourceConfiguration.QueryTimeoutProperties)
        : Connection by innerConnection {

        private fun <T : Statement> configure(prepareStatement: T): T {
            //0 means no timeout
            val desiredTimeout = queryTimeoutProperties.statementQueryTimeoutInSeconds ?: 0
            prepareStatement.queryTimeout = desiredTimeout
            LOG.trace("Configure timeout {} seconds for statement {}", desiredTimeout, prepareStatement)
            return prepareStatement
        }

        override fun prepareStatement(sql: String?, autoGeneratedKeys: Int) = configure(innerConnection.prepareStatement(sql, autoGeneratedKeys))
        override fun prepareStatement(sql: String?, resultSetType: Int, resultSetConcurrency: Int, resultSetHoldability: Int) = configure(innerConnection.prepareStatement(sql, resultSetType, resultSetConcurrency, resultSetHoldability))
        override fun prepareStatement(sql: String?) = configure(innerConnection.prepareStatement(sql))
        override fun prepareStatement(sql: String?, columnNames: Array<out String>?) = configure(innerConnection.prepareStatement(sql, columnNames))
        override fun prepareStatement(sql: String?, resultSetType: Int, resultSetConcurrency: Int) = configure(innerConnection.prepareStatement(sql, resultSetType, resultSetConcurrency))
        override fun prepareStatement(sql: String?, columnIndexes: IntArray?)= configure(innerConnection.prepareStatement(sql, columnIndexes))
        override fun prepareCall(sql: String?) = configure(innerConnection.prepareCall(sql))
        override fun prepareCall(sql: String?, resultSetType: Int, resultSetConcurrency: Int) = configure(innerConnection.prepareCall(sql, resultSetType, resultSetConcurrency))
        override fun prepareCall(sql: String?, resultSetType: Int, resultSetConcurrency: Int, resultSetHoldability: Int) = configure(innerConnection.prepareCall(sql, resultSetType, resultSetConcurrency, resultSetHoldability))
        override fun createStatement() = configure(innerConnection.createStatement())
        override fun createStatement(resultSetType: Int, resultSetConcurrency: Int) = configure(innerConnection.createStatement(resultSetType, resultSetConcurrency))
        override fun createStatement(resultSetType: Int, resultSetConcurrency: Int, resultSetHoldability: Int) = configure(innerConnection.createStatement(resultSetType, resultSetConcurrency, resultSetHoldability))

        override fun toString(): String {
            return "CustomTimeoutsConnection(innerConnection=$innerConnection)"
        }
    }

    companion object {
        private val LOG = LoggerFactory.getLogger(CustomTimeoutsDataSource::class.java)
    }
}
```

The JDBC level `queryTimeout` is enforced at the application code side i.e. there's a code executed after the timeout elapses which stops the query execution. Recent releases of both MySQL and PostgreSQL offer a database server level statement timeout capabilities. 

- MySQL: [`MAX_EXECUTION_TIME`](https://dev.mysql.com/doc/refman/5.7/en/optimizer-hints.html#optimizer-hints-execution-time)
  
  > The MAX_EXECUTION_TIME hint is permitted only for SELECT statements. It places a limit N (a timeout value in milliseconds) on how long a statement is permitted to execute before the server terminates it:

- PostgreSQL: [`statement_timeout`](https://www.postgresql.org/docs/9.6/static/runtime-config-client.html)
  
  > Abort any statement that takes more than the specified number of milliseconds, starting from the time the command arrives at the server from the client. If log_min_error_statement is set to ERROR or lower, the statement that timed out will also be logged. A value of zero (the default) turns this off. 
  Setting statement_timeout in postgresql.conf is not recommended because it would affect all sessions.

If you are using a JPA provider like Hibernate, you might be urged to use [`javax.persistence.query.timeout`](https://docs.jboss.org/hibernate/entitymanager/3.5/reference/en/html/configuration.html). However, from my experience using Hibernate this timeout, when configured globally, is enforced in some uses cases and completely ignored in others. There were multiple bugs reported related to this feature: [Bug 303360](https://bugs.eclipse.org/bugs/show_bug.cgi?id=303360), [HHH-9929](https://hibernate.atlassian.net/browse/HHH-9929), ["Query timeout in persistence.xml doesn't work"](https://forum.hibernate.org/viewtopic.php?p=2466990) and some of them are still not addressed.

There is no transaction scoped timeout available in JDBC. However, one can still apply the timeout in the application code through e.g. [`@Transactional.timeout`](https://docs.spring.io/spring/docs/current/javadoc-api/org/springframework/transaction/annotation/Transactional.html#timeout--). 

### Keep all timeouts short

The best timeout is a short one. It is often tempting to increase a query or wait timeout in face of performance or throughput problems. However, doing so will increase the amount of resources blocked on the server and is thus a rarely a good choice. Blocking more and more resources on server e.g. threads, may at some point, cause the entire server to [collapse abruptly](https://en.wikipedia.org/wiki/Thrashing_(computer_science)). I keep the timeouts as short as possible especially when certain API is called often. If you are looking for a good read on the topic I highly recommend [Release It!](https://pragprog.com/book/mnee/release-it) by Michael T. Nygard. This books covers many resiliency related topics including timeouts and provides strategies to avoid increasing them.
