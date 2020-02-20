---
layout: post
title: Request timeouts in Spring MVC
author: piotr
hidden: false
tags: spring mvc spring-boot request timeout
comments: true
crosspost: true
image: /images/spring-mvc-request-timeout/late.jpg
date: 2017-11-28 22:14:00
---

[As we saw previously]({% post_url 2017-11-21-spring-mvc-thread-pool-timeouts %}), we only have limited options to configure maximum time a request processing can take in Spring MVC. In this post I will show how to enforce such timeout through a custom [Servlet Filter](https://docs.oracle.com/cd/B14099_19/web.1012/b14017/filters.htm).

![Late request](../images/spring-mvc-request-timeout/late.jpg)

## Request timeout Servlet Filter

Without further ado let us dive right into a sample filter implementation in Kotlin:

```kotlin
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class TimeoutFilter : OncePerRequestFilter() {
    override fun doFilterInternal(request: HttpServletRequest, response: HttpServletResponse, filterChain: FilterChain) {
        val completed = AtomicBoolean(false)
        val requestHandlingThread = Thread.currentThread()
        val timeout = timeoutsPool.schedule({
            if (completed.compareAndSet(false, true)) {
                requestHandlingThread.interrupt()
            }
        }, 5, TimeUnit.SECONDS)

        try {
            filterChain.doFilter(request, response)
            timeout.cancel(false)
        } finally {
            completed.set(true)
        }
    }

    companion object {
        private val timeoutsPool = Executors.newScheduledThreadPool(10)
    }

    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    class TimeoutException(message: String) : java.util.concurrent.TimeoutException(message)
}
```

The above code declares a Servlet Filter that will interrupt thread processing a request after 5 seconds. There are couple of interesting points about how it works.

- `@Order(Ordered.HIGHEST_PRECEDENCE)` puts the Filter at the beginning of filter chain
- `val completed = AtomicBoolean(false)` denotes whether the request processing completed. 
- `val timeoutsPool = Executors.newScheduledThreadPool(10)` creates a thread pool responsible for running timeouts. The `newScheduledThreadPool` creates a thread pool that is efficient at running delayed tasks.
- `timeoutsPool.schedule({ ... })` schedules a code that will interrupt `requestHandlingThread` after 5 seconds
- `completed.compareAndSet(false, true)` updates the `completed` flag in a thread safe fashion

## Testing request timeout Servlet Filter

For the test purposes let us create a simple Spring Boot MVC application written in Kotlin:

```kotlin
@SpringBootApplication
@EnableWebMvc
class Application {
    companion object {
        @JvmStatic
        fun main(args: Array<String>) {
            SpringApplication.run(Application::class.java)
        }
    }
}

@RestController
class TimeoutController {
    @GetMapping("/timeout")
    fun timeout(@RequestParam(required = false) timeoutInMillis: Long?): ResponseEntity<*> {
        Thread.sleep(timeoutInMillis ?: 1000)
        return ResponseEntity.ok("completed")
    }
}
```

The `TimeoutController` will sleep for an amount of time given in a parameter. Let's simulate a short request with [`httpie`](https://httpie.org/):

```bash
http :8080/timeout timeoutInMillis==2000

HTTP/1.1 200 
Content-Length: 9
Content-Type: text/plain;charset=ISO-8859-1
Date: Mon, 27 Nov 2017 12:19:03 GMT

completed

```

This was the happy path. Now let's try a timeout path:

```bash
http  :8080/timeout timeoutInMillis==6000       

HTTP/1.1 500 
Connection: close
Content-Type: application/json;charset=UTF-8
Date: Mon, 27 Nov 2017 12:21:30 GMT
Transfer-Encoding: chunked

{
    "error": "Internal Server Error",
    "exception": "java.lang.InterruptedException",
    "message": "sleep interrupted",
    "path": "/timeout",
    "status": 500,
    "timestamp": 1511785290518
}
```

As you can see in the exception message, we see that the `Thread.sleep` in the controller action has been interrupted 🎉

## A word of warning

The above Servlet Filter will not work if we use [Async Servlet Filters](https://docs.oracle.com/javaee/7/tutorial/servlets012.htm). When using Async Servlet Filter there is typically **more than 1** thread that handles a request hence the above approach will not work. Having said that if you use Async Servlet Filter there already is a way to apply a timeout that [is defined by the API](https://docs.oracle.com/javaee/6/api/javax/servlet/AsyncContext.html#setTimeout(long)). Another important point is to check how the request processing thread pool handles interrupted threads. [As we have discussed earlier]({% post_url 2017-11-21-spring-mvc-thread-pool-timeouts %}), the concrete implementation of thread pool used to process request depends on servlet container and configured used in the application. We should make sure that the interrupted thread is eventually replaced with a new thread by the pool so that timeouts do not change the effective thread pool size.

