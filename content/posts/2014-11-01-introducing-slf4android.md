---
template: post
title: "Introducing slf4android - a simple slf4j implementation for android"
date: 2014-11-01
permalink: "introducing-slf4android.html"
tags: ["android"]
---

Every now and then you have a bug that is hard to reproduce or only happens on certain phones or android versions. The thing that really comes handy in such case is a detailed application log. That's why it's so important to take time to add useful log entries in every non trivial part of the codebase. At the very minimum you'll want to log any errors.

## Logging frameworks
That's why it's so important to create log entries easily. The default solution that comes with Android by means of [`Log`](http://developer.android.com/reference/android/util/Log.html) is the most commonly used. However for me it's really  the least pleasant to use:

```java
Log.e("MyTag", "Failed to download " + url +  "due to occurred " + ex);
```

I really don't like that I have to specify a tag each time I need to log something. Moreover having to concatenate strings seems tedious and error prone.

### Logging with `java.util.logging`
Another alternative that is available by default on android is packaged inside `java.util.logging.*`. And here's an example of how to use it:

```java
    private static final Logger LOG = Logger.getLogger(MyActivity.class.getName());
    // and then
    LOG.log(Level.FINE, "Starting activity {0} saved instance {1}", new Object[]{this, savedInstanceState});

```

You're able to use [`MessageFormatter`](http://developer.android.com/reference/java/text/MessageFormat.html) style to format log entries. However no variable arguments method overload makes it both harder to read and write. More importantly **by default** if you use above statement the message **will not be printed anywhere**. It's easy to [fix](http://stackoverflow.com/questions/4561345/how-to-configure-java-util-logging-on-android) when you know where to look for.

### Powerful `logback`

[logback](http://logback.qos.ch/) is probably the most powerful and configurable logging framework. Among many features you can for example send an email with 50 last log entries - I've used it in one project, it can be a bit hard to configure but it really comes handy during testing. In order to use it on android one needs to use a ported version [logback-android](http://tony19.github.io/logback-android/). There is one caveat though - this library is costs about 512kB - and takes about 4200 out of [dex method limit](https://medium.com/@rotxed/dex-skys-the-limit-no-65k-methods-is-28e6cb40cf71).

### Simple [android-logger](https://github.com/noveogroup/android-logger)

`android-logger` is a small (<50KB) library that let's you use slf4j api to print to logcat. It ships with various configuration options that let you change the format of output messages as well as log level based on hierarchical logger names. However you won't be able to print messages to [an additional file](https://github.com/noveogroup/android-logger/issues/25) and you can only [configure the logger through properties files](https://github.com/noveogroup/android-logger/issues/28).

## [slf4android](https://github.com/bright/slf4android)
Since I wasn't perfectly happy with above and because some design decisions made in [android-logger](https://github.com/noveogroup/android-logger) make it not so easy to add features like logging to a file, creating custom patterns and configuring it from code I decided to create yet another logging utility.

It's a tiny wrapper around [slf4j api](http://www.slf4j.org/) baked by the `java.util.logging` logger mechanism. This means you can easily hook in any existing `java.util.logging.Handler` implementations.

To use this little gem you'll need to add [`http://bright.github.io/maven-repo/`](http://bright.github.io/maven-repo/) to repository list:

```groovy
repositories {
    maven {
        url "http://bright.github.io/maven-repo/"
    }
}
```

and then declare a dependency inside a module:

```groovy
dependencies {
    compile('pl.brightinventions:slf4android:0.0.4@aar'){
      transitive = true
    }
    //other dependencies
}
```

As with any slf4j compatible implementation using slf4android looks like this:

```java
class HomeActivity extends Activity {
    private static final Logger LOG = LoggerFactory.getLogger(HomeActivity.class.getSimpleName());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        LOG.debug("Hello from {} saved instance state {}", this, savedInstanceState);
    }
}
```

### Logging to a file
To print messages to a separate file just add:

```java
LoggerConfiguration.configuration().addHandlerToLogger("", LoggerConfiguration.fileLogHandler(this));
```

inside your custom `android.app.Application` `onCreate` method. This will create rotated log files inside `context.getApplicationInfo().dataDir` with a name derived from `context.getPackageName()` and a default message pattern `%date %level [%thread] %name - %message%newline`

### More features
`slf4android` let's you register custom message patterns and configure logging level - although the api for that is still rough around the edges. It also features a simple (and not well tested) mechanism for error reporting that, when enabled, will display a `Dialog` prompting tester to notify developer through email whenever an error is encountered. You can enable it with:

```java
LoggerConfiguration.configuration().notifyDeveloperWithLogcatDataHandler(applicationContext, "developer.address@domain.com")
```

and receive emails with attached logcat output which comes handy during development.
