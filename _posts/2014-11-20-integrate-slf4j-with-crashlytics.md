---
layout: post
title: "Integrate slf4j with Crashlytics"
date: 2014-11-20 21:00:00
categories: ["android"]
---

As I mentioned in my previous post having meaningful log entries comes handy during development. When an app reaches beta testers as well as goes live it's equally or even more important to be able to figure out why the app you've carefully coded isn't behaving as it should. Testing the app on all android flavours is literally impossible that's why getting an insight into what caused a crash is vital.

## [Crashlytics](https://dev.twitter.com/products/crashlytics)

Error reporting providers are getting more and more popular. There are plenty of options to choose from: [Raygun](https://raygun.io/), [Airbrake](https://airbrake.io/) and [Crashlytics](https://dev.twitter.com/products/crashlytics) are just frew examples. At [Bright Inventions](http://brightinventions.pl/) we use the last one and are more and more pleased with it. Setting it up is really easy - if you don't mind installing an IDE plugin it provides. Frankly I would prefer being able to configure a project with a simple command line tool but I understand a motivation behind it which is making the installation as seamless as possible.

Crashlytics let's you not only report [uncaught exceptions](http://developer.android.com/reference/java/lang/Thread.html#setDefaultUncaughtExceptionHandler(java.lang.Thread.UncaughtExceptionHandler)) but also handled errors with additional information provided by log entries:

```java
try {
  Crashlytics.log(Log.INFO, "HomeActivity", "Make request");
  makeRequest();
}catch(RuntimeException ex){
  Crashlytics.log(Log.ERROR, "HomeActivity", "Error making request " + ex);
}
```

This will print messages to logcat as well as well as well as make them available in Crashlytics dashboard.

## Using [slf4j](https://github.com/bright/slf4android) with Crashlytics

I've already explained why [I don't like this approach to logging](/2014/11/01/introducing-slf4android.html). Thankfully with [slf4android](https://github.com/bright/slf4android) it's really easy to replace a default logcat appender with a `CrashlyticsLoggerHandler`:

```java
public class CrashlyticsLoggerHandler extends Handler {
  MessageValueSupplier messageValueSupplier = new MessageValueSupplier();

  @Override
  public void publish(java.util.logging.LogRecord record) {
    LogRecord logRecord = pl.brightinventions.slf4android.LogRecord.fromRecord(record);
    StringBuilder messageBuilder = new StringBuilder();
    messageValueSupplier.append(logRecord, messageBuilder);
    String tag = record.getLoggerName();
    int androidLogLevel = logRecord.getLogLevel().getAndroidLevel();
    Crashlytics.log(androidLogLevel, tag, messageBuilder.toString());
  }

  @Override
  public void close() {}
  @Override
  public void flush() {}
}
```

All that is left is to add the handler to root logger in your custom application `onCreate` method:

```java
LoggerConfiguration.configuration()
  .removeRootLogcatHandler()
  .addHandlerToRootLogger(new CrashlyticsLoggerHandler());
```

From now on all log messages will go through Crashlytics API and couple of last log entries will be available next to crash report details in dashboard.

*This article is cross-posted [my company blog](http://blog.brightinventions.pl/)*
