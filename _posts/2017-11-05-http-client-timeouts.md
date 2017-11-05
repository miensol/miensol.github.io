---
layout: post
title: HTTP client timeouts
author: piotr
hidden: false
tags: http timeout network rest api
comments: true
crosspost: true
image: /images/http-client-timeouts/waiting.jpg
---

We have already touched upon [the importance of timeouts]({% post_url 2017-10-23-the-importance-of-timeouts %}) and described most important [related JDBC knobs]({% post_url 2017-10-31-database-timeouts %}). The next aspect of timeouts I would like to focus on is using API clients. Specifically HTTP clients which are by far the most popular. We will review couple of popular HTTP client libraries and their configuration regarding timeouts. 

![Waiting](/images/http-client-timeouts/waiting.jpg)

## HttpURLConnection timeouts

[`HttpURLConnection`](https://docs.oracle.com/javase/7/docs/api/java/net/HttpURLConnection.html) available since JDK 1.1 has gained the ability to timeout its network communication in version JDK 5. The 2 available timeouts [`setConnectionTimeout`](https://docs.oracle.com/javase/7/docs/api/java/net/URLConnection.html#setConnectTimeout(int)), [`setReadTimeout`](https://docs.oracle.com/javase/7/docs/api/java/net/URLConnection.html#setReadTimeout(int)) control how long to wait until connection is established and how long to wait for a data from the server respectively. The default values are **infinite ‼️**. 

## Apache HttpClient timeouts

[HttpClient](https://hc.apache.org/httpcomponents-client-4.5.x/index.html) from Apache HttpComponents suite has been a standard choice for http communication. It is a mature project, with rich API that fills many `HttpURLConnection` shortcomings e.g. connection pooling. Many of the APIs have been deprecated e.g. `DefaultHttpClient`, `org.apache.http.params.CoreConnectionPNames` hence one needs to be careful when setting the timeouts they fallback to system defined socket level defaults. 

There are 3 timeouts settings available:

```kotlin
val requestConfig = RequestConfig.custom()
    // Determines the timeout in milliseconds until a connection is established.
    .setConnectTimeout(5_000) 
    // Defines the socket timeout in milliseconds,
    // which is the timeout for waiting for data or, put differently,
    // a maximum period inactivity between two consecutive data packets).
    .setSocketTimeout(5_000)
    // Returns the timeout in milliseconds used when requesting a connection
    // from the connection manager.
    .setConnectionRequestTimeout(2_000)
    .build()
```

The `requestConfig` can be further used as a default for an `HttpClient` instance:

```kotlin
val httpClient = HttpClients.custom()
    .setDefaultRequestConfig(requestConfig)
    .build()
```

It is also possible to configure each request separately:

```kotlin
val get = HttpGet("http://httpbin.org/get").apply { 
    config = requestConfig
}
httpClient.execute(get)
```

## OkHttp

[OkHttp](http://square.github.io/okhttp/) is my favorite HTTP & HTTP/2 client for Android and Java applications. It is efficient and has **good configuration defaults**. There are 3 timeout settings available:

```kotlin
val client = OkHttpClient.Builder()
    // Sets the default connect timeout for new connections.
    .connectTimeout(5, TimeUnit.SECONDS)
    // Sets the default read timeout for new connections.
    .readTimeout(10, TimeUnit.SECONDS)
    // Sets the default write timeout for new connections.
    .writeTimeout(20, TimeUnit.SECONDS)
    .build()
```

All `connectTimeout`, `readTimeout` and `writeTimeout` default to **10 seconds** 👍.


## XMLHttpRequest and Fetch API timeouts

`XMLHttpRequest` is the standard foundation of network communication of Web application for over 10 years now. Nowadays it is being replaced with Fetch API but it still is, and will continue to be, the most popular for couple of years. There is only a single `timeout` configuration available in [`XMLHttpRequest`](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/timeout):

> The XMLHttpRequest.timeout property is an unsigned long representing the number of milliseconds a request can take before automatically being terminated. The default value is 0, which means there is no timeout.

**Default is infinite ‼️**

Since the default value is not configured we should diligently set the timeout in our code! It may be tempting to think that client side timeout is not so important compared to the one on the server. This is a questionable attitude to say the least. We need to keep in mind that there is a hard limit on the number of connections a browser will make to a single domain which is very important if we use **HTTP 1.***. When we reach maximum number of concurrently opened connections, any new `XMLHttpRequest` is going to be queued indefinitely. The limit value varies in browsers and the [recent RCF](https://tools.ietf.org/html/rfc7230#section-6.4) relaxes it. **HTTP/2** alleviates the issue [with connection multiplexing](http://qnimate.com/what-is-multiplexing-in-http2/) nonetheless its adoption is still low. According to w3techs it is [about 20% as of today](https://w3techs.com/technologies/details/ce-http2/all/all). The timeout value used in `XMLHttpRequest` is even more important in Single Page Applications. In SPAs the `XMLHttpRequest` without a timeout can live for as long as server and intermediate network parties allow effectively blocking all subsequent network calls.

[Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) is meant to replace `XMLHttpRequest`. It is thus sad that the ability to timeout a request has not yet made it into [the standard](https://fetch.spec.whatwg.org/). **Currently there is no standard way to enforce a timeout**. There are couple of GitHub issues active: [Add timeout option](https://github.com/whatwg/fetch/issues/20#issuecomment-323740783), [Add option to reject the fetch promise automatically after a certain time elapsed](https://github.com/whatwg/fetch/issues/179) that go over potential solutions. There was a proposal for [cancelable promises](https://github.com/tc39/proposal-cancelable-promises) which had been withdrawn after [lots of discussion and lack of consensus](https://github.com/tc39/proposal-cancelable-promises/issues/70). A brand new way [has recently been implemented by Edge and Firefox](https://developers.google.com/web/updates/2017/09/abortable-fetch) allows one to timeout a Fetch API call 🎉 through [the DOM standardized `AbortController`](https://dom.spec.whatwg.org/#aborting-ongoing-activities). Hopefully it will get into the Fetch API standard soon.

```javascript
const controller = new AbortController();
const signal = controller.signal;

setTimeout(() => controller.abort(), 5000);

fetch(url, { signal }).then(response => {
  return response.text();
}).then(text => {
  console.log(text);
});
```

## URLSession timeouts

[`URLSession`](https://developer.apple.com/documentation/foundation/urlsession) is the successor to `NSURLConnection` that underlays most if not all iOS http clients e.g. Alamofire. There are 2 main timeout values to configure both of which have default values available via `URLSessionConfiguration.default`:

```swift
let sessionConfig = URLSessionConfiguration.default
sessionConfig.timeoutIntervalForRequest = 20.0
sessionConfig.timeoutIntervalForResource = 40.0

let session = URLSession(configuration: sessionConfig)
```

Fortunately there are default values configured:

- `timeoutIntervalForRequest`: 
  > This property determines the request timeout interval for all tasks within sessions based on this configuration. The request timeout interval controls how long (in seconds) a task should wait for additional data to arrive before giving up. The timer associated with this value is reset whenever new data arrives. 
  The default value is 60.

- `timeoutIntervalForResource`:
  > This property determines the resource timeout interval for all tasks within sessions based on this configuration. The resource timeout interval controls how long (in seconds) to wait for an entire resource to transfer before giving up. 
  The default value is 7 days.

Note that `timeoutIntervalForResource` is a higher level timeout that what we have considered in other HTTP clients. It encompasses retries and or request timeouts hence has a large default. 

## Summary

Many of HTTP clients do not have a good default timeout configuration. Hence, if you care about your application resource usage and system stability you have to carefully review and configure timeouts where applicable. It is reassuring to see that modern HTTP clients e.g. OkHttp and URLSession have a short but sane default. 