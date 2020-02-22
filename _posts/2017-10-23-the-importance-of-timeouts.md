---
template: post
title: The importance of timeouts
author: piotr
hidden: false
tags: [server, request, timeout, query, resiliency, spring boot]
comments: true
crosspost: true
date: 2017-10-23 22:14:00
---

[Timeouts](https://en.wikipedia.org/wiki/Timeout_(computing)) are not an exciting thing to talk about. They do not add immediately perceivable value. They are difficult to ~~guess~~ get right and force one to [consider problems that are hard to solve](https://en.wikipedia.org/wiki/Byzantine_fault_tolerance#Byzantine_Generals.27_Problem). In fact, in my experience, the timeout is only ever considered when our software stops working or is about to. That is an enormous shame since, in my opinion, carefully applied timeouts can vastly improve software resiliency. 

![Man with a wrist clock](../images/the-importance-of-timeouts/man-clock.jpeg)

## An example application

Let us consider a simplistic example of a Spring Boot application generated using [Spring Initializr](https://start.spring.io/). The application will only expose [actuator](https://spring.io/guides/gs/actuator-service/) API which by default define a health check endpoint. Our example will also have a mail module configured. 

The dependencies section of `build.gradle`:

```groovy
dependencies {
	compile('org.springframework.boot:spring-boot-starter-actuator')
	compile('org.springframework.boot:spring-boot-starter-mail')
	compile('org.springframework.boot:spring-boot-starter-web')
	compile("org.jetbrains.kotlin:kotlin-stdlib-jre8:${kotlinVersion}")
	compile("org.jetbrains.kotlin:kotlin-reflect:${kotlinVersion}")
}
```

A typical health check endpoint verifies that application integration points work correctly. If the service talks to database then a connection is established and verified. A free disk space is checked. If the service sends emails through SMTP then a connection to a server is established.

The health checks are auto discovered and enabled when you include Spring Boot Actuator. By default, `/health` path is used for the endpoint. The SMTP server host, port and credentials obviously need to be configured. At minimum host entry is required e.g. `spring.mail.host=localhost`. _For the debugging purpose one can disable actuator security with `management.security.enabled=false` to verify what health checks are performed by actuator._

A last part of our example is the trivial application code:

```kotlin
@SpringBootApplication
class Application {
    companion object {
        @JvmStatic
        fun main(args: Array<String>) {
            SpringApplication.run(Application::class.java, *args)
        }
    }
}
```

When you request `/health` the API will return response similar to:

```
HTTP/1.1 200 
Content-Type: application/vnd.spring-boot.actuator.v1+json;charset=UTF-8
Date: Mon, 23 Oct 2017 08:08:32 GMT
Transfer-Encoding: chunked
X-Application-Context: application

{
    "diskSpace": {
        "free": 105755779072,
        "status": "UP",
        "threshold": 10485760,
        "total": 499046809600
    },
    "mail": {
        "location": "localhost:-1",
        "status": "UP"
    },
    "status": "UP"
}
```
An application health API, like the one in our example, is often hooked into external monitoring software. The monitor asks the target application about its health in regular intervals e.g. every 5 seconds. 

## Shooting yourself in the foot

The above example has an issue that can kill production server. More importantly, other metrics that are usually monitored e.g. CPU and memory usage will not warn about upcoming, dreadful service stall. The application will also not suffer from an enormous number of requests or emails being sent.

Imagine that the health endpoint is checked every 5 seconds and that there is **intermittent** issue with the SMPT server. The health endpoint will **rightfully** try to connect to the SMTP server and from time to time respond with error. From my experience, when a health check is introduced it typically takes a while to tweak the monitor thresholds so that we get rid of false alarms. It is thus very easy to ignore intermittent errors when we think they are caused by too sensitive thresholds. However, the ignored errors can after a while cause our server to stop responding to **any request**. 

![Man with a wrist clock](../images/the-importance-of-timeouts/error.jpg)

Why this can happen you ask and I answer. **There is no timeout configured!**

The mail server health check uses [`javax.mail.Service.connect`](https://docs.oracle.com/javaee/6/api/javax/mail/Service.html#connect(java.lang.String,%20java.lang.String)) under the hood. For a variety of reasons an attempt to establish a TCP connection can take arbitrary longer than usual. Unfortunately **the default** timeouts used by the `javax.mail.*` [are **infinite**](https://javaee.github.io/javamail/docs/api/com/sun/mail/smtp/package-summary.html). A thread that waits for the connection to be established cannot serve other requests even though it barely uses any CPU. The default maximum thread pool size used by embedded Tomcat in Spring Boot application is 200. Assuming that the blocked connection attempt happens twice an hour our application will stop working after 4 days.

## Never use infinite timeouts

As you can see it is very easy to miss a need for a timeout to be configured. To be fair the [Spring Boot documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/boot-features-email.html) states clearly:

>In particular, certain default timeout values are infinite and you may want to change that to avoid having a thread blocked by an unresponsive mail server:
>```
>spring.mail.properties.mail.smtp.connectiontimeout=5000
>spring.mail.properties.mail.smtp.timeout=3000
>spring.mail.properties.mail.smtp.writetimeout=5000
>```

In my option any library or framework should either force the programmer to configure the timeout or have some **sensible default**. Unfortunately this is not always possible to introduce them later on without breaking changes hence we should **check** what are the timeouts used when calling any **external service**.

## Timeouts needed everywhere

Imagine a controller action method that inserts a single row into a database. Let us further assume that the endpoint is called 50 times per second and it typically takes 100ms to complete. Things work well until we encounter an intermittent sloppiness of the database and now the insert takes 2 seconds to complete. The clients calling the API do not slow down. More request threads are blocked and **more database connections** are taken out of the pool. Soon as all database connections are in use and all other API endpoints start to fail. This is an example of cascading failure i.e. a problem in one component propagating to others. It is easier to avoid such issues when there is a timeout configured on the controller action and the interaction with the database. 

Every API endpoint **should have a timeout configured** if we want our services to be resilient. Unfortunately this rule is easy to neglect. Moreover, some frameworks do not even expose such ability. Even in the immensely popular Spring Mvc I could not find a way to set such timeout other than using an [async method](https://spring.io/guides/gs/async-method/). Fortunately there are libraries e.g. [Hystrix](https://github.com/Netflix/Hystrix) that tackle that problem and can be integrated easily.

Just to recap here is a short and incomplete list of cases where a timeout should be configured:
- a controller action 
- a database query, statement
- a database pool interaction
- a thread pool interaction
- an API client e.g. HTTP, SOAP, SMTP

I will describe how to deal with the cases in the following posts.
