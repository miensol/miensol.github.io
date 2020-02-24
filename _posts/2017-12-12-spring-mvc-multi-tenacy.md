---
template: post
title: Multi tenancy in Spring MVC 
author: piotr
draft: false
tags: [spring, mvc, spring boot, multi-tenant, reactive, reactor]
comments: true
crosspost: true
socialImage: ../images/spring-mvc-multi-tenancy/feeding-animals.jpg
date: 2017-12-12 22:14:00
---

One of our clients aimed to replace old, often DOS based, point of sale systems with a cloud based, SaaS modeled solution. [At Bright Inventions]({{ site.url }}) we have developed all required components including AWS based back-end processing requests originating from multiple clients. Each business that uses the SaaS point of sale can be considered a tenant in a multi-tenant environment. There many aspects involved when developing multi-tenant application with [data isolation and partitioning being the most discussed topic](http://blog.memsql.com/database-multi-tenancy-in-the-cloud-and-beyond/). However, today I would like to focus on computational and resource isolation aspect. 

![Multiple consumers](../images/spring-mvc-multi-tenancy/feeding-animals.jpg)

## Controlled resource usage

In the discussed case each tenant would have multiple iOS based API clients. The exact number varies from 1 to couple of dozens. Each iOS application would be open constantly throughout a sales day and execute frequent requests against the back-end API. In the iOS application there was a code that polls the server for data changes in frequent and regular intervals. Unfortunately a bug slipped through a code review and caused the app to ask the server for changes around 50 times per second instead of once in half of a minute. The bug caused an explosion of API requests issued by a single API client with a throughput 10 to 100 times bigger than expected. To make things worse the rate at which the bug increased polling frequency exceeded back-end the scaling out policy. Soon all request processing threads were busy processing requests issued by only a small percentile of API clients. 

In a multi-tenant application one needs to take special care to prevent tenant "A" from affecting, even indirectly, tenant "B" operations. We have failed that requirement on the CPU/thread pool level and that caused the support lines to be hot. 

## Reverse proxy request rate limit

The first solution that comes to mind is to apply a per API client request rate limiting. In fact this solution is so common that it is available as a configuration opt-in in many servers. For instance [in NGINX you could do](https://www.nginx.com/blog/rate-limiting-nginx/):

```
limit_req_zone $binary_remote_addr zone=mylimit:10m rate=10r/s;

server {
    location /login/ {
        limit_req zone=mylimit burst=20;

        proxy_pass http://my_upstream;
    }
}
```

The above would only allow up to 10 request per second from the same IP address. Any request that comes in at higher rate would be queued up to specified capacity (`burst=20`). Any request above the limit would get rejected with 503 status code. 

The nginx approach is battle tested and fairly easy to apply. Instead of using IP address it would be better to group requests by a tenant identifier. However, it may not be easy to determine exactly which tenant is making the request unless the information is easily available in the request headers. For that matter it is good to consider sending the API client identification using a custom HTTP header. For instance if the API client provides `X-Tenant-Id: tenant.1` you can use it as `limit_req_zone $http_x_tenant_id zone=mylimit:10m rate=10r/s;`. When using JWT, you often can determine _who_ is making the request by parsing the `Authorization` header value. 

## Spring MVC request rate limit

It is often not feasible to apply the request rate limit at the reverse proxy level. In such scenario we can apply the limit inside Spring MVC application. For start one can try suing [Servlet Filter](http://www.oracle.com/technetwork/java/filters-137243.html). [There are several solutions](https://stackoverflow.com/questions/10127472/servlet-filter-very-simple-rate-limiting-filter-allowing-bursts) available including a [DoSFilter that is part of Jetty project](https://www.eclipse.org/jetty/javadoc/9.4.7.v20170914/org/eclipse/jetty/servlets/DoSFilter.html).

Using a ready-made Servlet Filter is often sufficient especially when the available customization options suit our needs. In case of our client however, we wanted the limits to depend on the _size_ of the client. In other words the more service you buy, the more resources are available to you. Moreover, I wanted to have a have fine-grained control at **a controller action** level. To my surprise such behavior was not easy to accomplish using [AsyncHandlerInterceptor](https://docs.spring.io/spring/docs/current/javadoc-api/org/springframework/web/servlet/AsyncHandlerInterceptor.html). Fortunately I did find a way to achieve a desired result using a mix of extensibility points and hacks. 

The first step is to customize [`RequestMappingHandlerAdapter`](https://docs.spring.io/spring/docs/current/javadoc-api/org/springframework/web/servlet/mvc/method/annotation/RequestMappingHandlerAdapter.html) used by Spring MVC to transform `@RequestMapping` annotation into handler classes. The following configuration class in Kotlin achieves just that:

```kotlin
@Configuration
class WebMvcConfiguration : DelegatingWebMvcConfiguration() {

    @Autowired(required = false)
    private val mvcProperties: WebMvcProperties? = null

    @Inject lateinit var reactiveRequestCommandFactory: ReactiveRequestCommandFactory
    @Inject lateinit var reactiveRequestsProperties: ReactiveRequestsConfiguration.RequestsProperties

    @Bean
    override fun requestMappingHandlerAdapter(): RequestMappingHandlerAdapter {
        //copy pasted from WebMvcConfigurationSupport
        val argumentResolvers = ArrayList<HandlerMethodArgumentResolver>()
        addArgumentResolvers(argumentResolvers)

        val returnValueHandlers = ArrayList<HandlerMethodReturnValueHandler>()
        addReturnValueHandlers(returnValueHandlers)

        val adapter = RateLimitingRequestMappingHandlerAdapter(reactiveRequestCommandFactory, reactiveRequestsProperties)

        adapter.setContentNegotiationManager(mvcContentNegotiationManager())
        adapter.messageConverters = messageConverters
        adapter.webBindingInitializer = configurableWebBindingInitializer
        adapter.customArgumentResolvers = argumentResolvers

        adapter.customReturnValueHandlers = returnValueHandlers

        val requestBodyAdvices = ArrayList<RequestBodyAdvice>()
        requestBodyAdvices.add(JsonViewRequestBodyAdvice())
        adapter.setRequestBodyAdvice(requestBodyAdvices)

        val responseBodyAdvices = ArrayList<ResponseBodyAdvice<*>>()
        responseBodyAdvices.add(JsonViewResponseBodyAdvice())
        adapter.setResponseBodyAdvice(responseBodyAdvices)

        configureAsync(adapter)


        adapter.setIgnoreDefaultModelOnRedirect(mvcProperties?.isIgnoreDefaultModelOnRedirect != false)
        return adapter
    }

    private fun configureAsync(adapter: RequestMappingHandlerAdapter) {
        //expose field publicly
        val configurer = object : AsyncSupportConfigurer() {
            public override fun getTaskExecutor() = super.getTaskExecutor()
            public override fun getTimeout() = super.getTimeout()
            public override fun getCallableInterceptors() = super.getCallableInterceptors()
            public override fun getDeferredResultInterceptors() = super.getDeferredResultInterceptors()
        }

        configureAsyncSupport(configurer)

        if (configurer.taskExecutor != null) {
            adapter.setTaskExecutor(configurer.taskExecutor)
        }

        if (configurer.timeout != null) {
            adapter.setAsyncRequestTimeout(configurer.timeout!!)
        }

        adapter.setCallableInterceptors(configurer.callableInterceptors)
        adapter.setDeferredResultInterceptors(configurer.deferredResultInterceptors)
    }
}
```

Note that we are injecting `reactiveRequestCommandFactory` and `reactiveRequestsProperties` and pass them into our core `RateLimitingRequestMappingHandlerAdapter`. All other code is a mostly a copy-paste from `DelegatingWebMvcConfiguration` base class.


```kotlin
@Target(AnnotationTarget.CLASS, AnnotationTarget.FUNCTION)
annotation class RequestCommand(
    val enabled: Boolean = true,
    val timeoutInMillis: Int = 60_000
)

class RateLimitingRequestMappingHandlerAdapter(private val reactiveRequestCommandFactory: ReactiveRequestCommandFactory,
                                               private val reactiveRequestProperties: ReactiveRequestsConfiguration.RequestsProperties) : RequestMappingHandlerAdapter() {
    private val handlerMethodConfigurationsCache = ConcurrentHashMap<HandlerMethod, RequestCommandConfiguration>()

    override fun createInvocableHandlerMethod(handlerMethod: HandlerMethod): ServletInvocableHandlerMethod? {
        val configuration = requestCommandConfigurationFor(handlerMethod)

        return when {
            configuration.enabled && reactiveRequestProperties.enabled -> CommandInvocableHandlerMethod(handlerMethod, reactiveRequestCommandFactory, configuration)
            else -> super.createInvocableHandlerMethod(handlerMethod)
        }
    }

    private fun requestCommandConfigurationFor(handlerMethod: HandlerMethod): RequestCommandConfiguration {
        return handlerMethodConfigurationsCache.getOrPut(handlerMethod) {
            val method = handlerMethod.getMethodAnnotation(RequestCommand::class.java)
            val methodOrController = method ?: AnnotatedElementUtils.findMergedAnnotation(handlerMethod.beanType, RequestCommand::class.java)
            methodOrController?.let { RequestCommandConfiguration(it) } ?: RequestCommandConfiguration.Default
        }
    }
}
```

Inside of `createInvocableHandlerMethod` we get the configuration for the `handlerMethod` determined by Spring MVC. The `handlerMethod` denotes a controller action. Then we decide if we should use the rate limiting handler or fallback to the default one. In case we need to apply rate limiting we switch the invocation to use custom `CommandInvocableHandlerMethod`:

```kotlin
class CommandInvocableHandlerMethod(private val handlerMethod: HandlerMethod,
                                    private val requestCommandFactory: RequestCommandFactory,
                                    private val configuration: RequestCommandConfiguration) : ServletInvocableHandlerMethod(handlerMethod) {
    private lateinit var returnValueHandlers: HandlerMethodReturnValueHandlerComposite

    override fun invokeForRequest(request: NativeWebRequest?, mavContainer: ModelAndViewContainer?, vararg providedArgs: Any?): Any {
        // same as super.invokeForRequest(request, mavContainer, *providedArgs)
        // but with request passed to do invoke
        val args = this.getMethodArgumentValuesCallable.invoke(request, mavContainer, providedArgs)
        val result = doInvokeWithRequest(request, args)
        return result
    }

    private fun doInvokeWithRequest(request: NativeWebRequest?, args: Array<out Any?>?): Any {
        val nativeRequest = request?.getNativeRequest(HttpServletRequest::class.java)

        // If the response has already set error status code tomcat will not wait for async result
        return if (nativeRequest != null && nativeRequest.dispatcherType == DispatcherType.REQUEST) {
            val callSuper = Callable {
                super.doInvoke(*(args ?: emptyArray()))
            }

            val job = callSuper

            val context = RequestCommandContext(configuration, handlerMethod, SecurityContextHolder.getContext(), job)

            val result = requestCommandFactory.createSingle(context)

            MonoDeferredResult(result)
        } else {
            super.doInvoke(*(args ?: emptyArray()))
        }
    }

    override fun setHandlerMethodReturnValueHandlers(returnValueHandlers: HandlerMethodReturnValueHandlerComposite?) {
        this.returnValueHandlers = returnValueHandlers!!
        super.setHandlerMethodReturnValueHandlers(returnValueHandlers)
    }

    override fun wrapConcurrentResult(result: Any?): ServletInvocableHandlerMethod {
        return ConcurrentResultHandlerMethod(result, ConcurrentResultMethodParameter(result))
    }

...

```

The above code is using *private* [`getMethodArgumentValues`](https://github.com/spring-projects/spring-framework/blob/cc74a28/spring-web/src/main/java/org/springframework/web/method/support/InvocableHandlerMethod.java#L147) API to achieve the desired behavior‼ The `doInvokeWithRequest` checks if an asynchronous dispatch should be performed and if so creates a [`Mono`](https://projectreactor.io/docs/core/release/api/reactor/core/publisher/Mono.html) that denotes the result of the controller action method invocation. `RequestCommandContext` stores the information about target controller action method and current security context. The security context needs to be preserved when invoking the controller action on a different thread. The [`ConcurrentResultHandlerMethod`](https://gist.github.com/miensol/cca73d158ce8e7664ed653a30fc8dc70) extends `ServletInvocableHandlerMethod` to add support for using `Mono` on regular, synchronous controller action. The core logic of rate limiting is delegated to `ReactiveRequestCommandFactory`:

```kotlin
interface ReactiveRequestCommandFactory {
    fun createSingle(context: RequestCommandContext): Mono<Optional<Any>>
}
```

The factory responsibilty it to convert a request context into an async result. Spring MVC 5 [has built in support for Reactor](https://docs.spring.io/spring-framework/docs/5.0.0.BUILD-SNAPSHOT/spring-framework-reference/html/web-reactive.html) hence we decided to use this implementation of [Reactive Streams specification](http://www.reactive-streams.org/). The `ReactiveRequestCommandFactory` looks as follows:

```kotlin
@Component
class ReactorRequestCommandFactory(
    threadPoolPropertiesCalculator: ThreadPoolPropertiesCalculator,
    @param:Named("reactiveRequestsScheduler")
    private val reactiveRequestsScheduler: Schedule
) : ReactiveRequestCommandFactory {
    private val threadPoolPropertiesCalculator = HystrixConfigurationAwarePropertiesCalculator(threadPoolPropertiesCalculator)
    private val tenants = ConcurrentHashMap<String, TenantTaskCoordinator>()

    override fun createSingle(context: RequestCommandContext): Mono<Optional<Any>> {
        val properties = threadPoolPropertiesCalculator.newThreadPoolProperties(context)

        val taskCoordinator = tenants.computeIfAbsent(properties.threadPoolName) {
            TenantTaskCoordinator(reactiveRequestsScheduler,
                maximumConcurrency = properties.maximumThreads,
                maximumQueueSize = properties.maximumQueueSize,
                name = properties.threadPoolName
            )
        }

        val optionalCallable = OptionalCallable(context.job)
        val configureRequestAttributes = SpringServletRequestAttributesCallable(optionalCallable)
        val configureLocale = SpringLocaleContextCallable(configureRequestAttributes)
        val securityCallable = DelegatingSecurityContextCallable(configureLocale, context.securityContext)

        return taskCoordinator.execute(securityCallable)
            .timeout(Duration.ofMillis(context.configuration.timeoutInMillis.toLong()))
    }
}

class OptionalCallable(private val inner: RequestHandlerJob) : Callable<Optional<Any>> {
    override fun call(): Optional<Any> = Optional.ofNullable(inner.call())
}
```

The `ThreadPoolPropertiesCalculator` calculates how concurrent threads and how big the requests queue should be for particular tenant or tenants group. Then for each tenant group, in particular a single tenant, we create a `TenantTaskCoordinator` responsible for calculating and enforcing limits on concurrently handled requests. Further down we decorate the `Callable` representing the actual request handling with security delegation, locale configuration and request attributes setup. Finally, we ask the `TenantTaskCoordinator` to execute the decorated job with a configured timeout.

The last piece of the puzzle, namely `TenantTaskCoordinator` requires a separate blog post so stay tuned.
