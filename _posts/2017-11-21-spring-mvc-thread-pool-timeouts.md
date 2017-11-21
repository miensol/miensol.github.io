---
layout: post
title: Request timeouts in Spring MVC
author: piotr
hidden: false
tags: spring mvc spring-boot thread-pool timeout
comments: true
crosspost: true
image: /images/thread-pool-timeouts/thread-pool.jpg
---

Last time we reviewed [how to configure HTTP client timeouts]({% post_url 2017-11-05-http-client-timeouts %}). This time let us focus on the other side of the HTTP request i.e. server. There is pretty much always a thread pool involved when we write a Spring MVC application. The thread pool configuration will vary depending on particular servlet container (Tomcat, Undertow, Jetty) so we have to watch out for subtle differences. However, most if not all of them will use a thread pool with fixed maximum size. As we already know, a pool of resources might get exhausted. In particular, a thread pool is more likely to get exhausted if we do not control timeouts diligently.  

## Threads involved in a Spring MVC request handling

A typical servlet container will use one or more thread pools to handle a request. In particular one of the thread pools is used to execute the Spring MVC part of request handling. Let us call this thread pool the request worker thread pool. The request worker thread pool will have a default maximum size:
- Tomcat: `server.tomcat.max-threads` controlling [`maxThreads`](https://tomcat.apache.org/tomcat-8.5-doc/config/http.html) with a default of 200
- Undertow: `server.undertow.worker-threads` controlling [`WORKER_TASK_CORE_THREADS`](http://undertow.io/undertow-docs/undertow-docs-1.2.0/listeners.html) with a default of [`availableProcessors() * 8`](https://github.com/undertow-io/undertow/blob/b6a87a4b4a467b297363c46747c344faaee15ded/core/src/main/java/io/undertow/Undertow.java#L419)
- Jetty: There is no Spring configuration property available currently. One can customize the Jetty Thread Pool through code and jetty specific configuration though. The default maximum number of worker threads is 200.

![Thread pool](/images/thread-pool-timeouts/thread-pool.jpg)

## What happens when the request processing thread pool is empty?

 Once the request processing thread pool is empty, the servlet container will typically queue the requests. The queue is processed by the request processing thread pool. Queueing up requests is consuming server memory and sockets thus there typically is a limit after which a new incoming request is going to be immediately rejected.

- Tomcat: `server.tomcat.accept-count` Maximum queue length for incoming connection requests when all possible request processing threads are in use. [The default value is 100](https://tomcat.apache.org/tomcat-8.5-doc/config/http.html).
- Undertow: As far as I can tell by default the requests will be queued and the only bound is system capacity. There is [Request Limiting Handler](http://undertow.io/undertow-docs/undertow-docs-1.2.0/#built-in-handlers) available though that allows configuring maximum concurrent requests as well as maximum queue size. 
- Jetty: By default will queue requests using unbounded queue. You can configure it though [as documented](https://wiki.eclipse.org/Jetty/Howto/High_Load):

```xml
<Configure id="Server" class="org.eclipse.jetty.server.Server">
    <Set name="ThreadPool">
      <New class="org.eclipse.jetty.util.thread.QueuedThreadPool">
        <!-- specify a bounded queue -->
        <Arg>
           <New class="java.util.concurrent.ArrayBlockingQueue">
              <Arg type="int">6000</Arg>
           </New>
      </Arg>
        <Set name="minThreads">10</Set>
        <Set name="maxThreads">200</Set>
        <Set name="detailedDump">false</Set>
      </New>
    </Set>
</Configure>
```

Queuing requests is necessary in the most commons scenarios to handle temporary spikes in load. For example, if your application can handle 100 requests per second, and if you can allow it to recover from one minute of excessive high load, you can set the queue capacity to 60*100=6000.

## How is the request processing thread pool related to timeouts?

Let us assume that the thread pool (max) size is 100 and that on average a request takes 1 second to process. In such server we can thus handle 100 requests per second (rps). Any requests over the rps limit is going to be queued. Now imagine we have a single type of request that for some reason takes much longer to process than usual e.g. 120 seconds due to some dependent service issue. When such request is processed, it will first block subsequent requesting processing threads until all of them are _busy waiting_. Depending on the limit of queue size and system capacity our server will soon start rejecting **all new requests**. It is worth noting that the _slow_ requests are also going to be put in queue after thread pool capacity is reached. 

One of the ways to mitigate the issue and speed up system recovery is **to apply timeouts**. When a timeout for a particular request elapses ideally few things should happen:
 - the client should be notified about the error ([503, 504 or 408](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes) depending on the use case)
 - the request should be removed from the processing queue
 - the thread processing the requests should be interrupted 

 Let's review what options are available.
 - Tomcat has [Stuck Thread Detection Valve](http://tomcat.apache.org/tomcat-8.5-doc/config/valve.html#Stuck_Thread_Detection_Valve):
   > This valve allows to detect requests that take a long time to process, which might indicate that the thread that is processing it is stuck. Additionally it can optionally interrupt such threads to try and unblock them.
 The valve has 2 configuration options:
 - `threshold`: Minimum duration in seconds after which a thread is considered stuck. Default is 600 seconds. 
 - `interruptThreadThreshold`: Minimum duration in seconds after which a stuck thread should be interrupted to attempt to "free" it.

_AFAIK the valve only applies to requests that did start processing by the thread pool._

- Undertow and Jetty do not allow for setting a request timeout directly. They both do have _idle_ connection detection and can timeout it accordingly. Unfortunately since HTTP/2 multiplexing the timeouts options may not be suitable to timeout a single request. 

- In Spring MVC there is no way to configure a timeout unless you use [async method](https://spring.io/guides/gs/async-method/). With async method one can use `spring.mvc.async.request-timeout=` to set amount of time (in milliseconds) before asynchronous request handling times out. However, using Async Servlet with Spring MVC requires changing the controller methods return types.

## There is no standard request timeout configuration

There are only couple of options available to set encompass request handling with a timeout. This is partially due to historical reasons. The servlet container specification did not consider timeouts until Async Servlet was defined. Another reason is that the there is no way [to safely _stop_ a thread](https://docs.oracle.com/javase/1.5.0/docs/guide/misc/threadPrimitiveDeprecation.html) that a framework could use. The application code needs to cooperate to safely terminate the request handling execution. In the next post we will show how to add a request timeout to a Spring MVC application.