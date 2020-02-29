---
template: post
title: "Google Play Services is no longer a giant monolith"
date: 2014-12-09 10:00:00
tags: ["android"]
---

Nowadays it's getting harder and harder to build a meaningful app and not rely on [Google Play Services](https://developer.android.com/google/play-services/index.html) to aid us in some commonly required features such as [maps](http://developer.android.com/google/play-services/maps.html), better [location provider](https://developer.android.com/google/play-services/location.html), [geo fencing](http://developer.android.com/training/location/geofencing.html) and so much more. Unfortunately up until now the library shipped as a giant monolith ripping us from [one third of dex method limit](http://jakewharton.com/play-services-is-a-monolith/). For curious reader here's are method counts in couple of versions:

| Version       | Method Count  |
| -------------: | -------------: |
| 3.2.65 | 6330 |
| 4.4.52 | 16933 |
| 5.0.89 | 20312 |
| 6.1.71 | 23641 |

and [a full breakdown](https://gist.github.com/miensol/c6ac03fa4f6f52441992).

## Google Play Services 6.5 granular dependency management

Today Google has made the awaited, more than usual, version of their [SDK available](https://developer.android.com/google/play-services/index.html). With the update apart from new features you can finally depend only on a subset of enormous API. Here's a table from documentation along with [dex method counts](https://github.com/mihaip/dex-method-counts):

| API Name       | Gradle depdenency | Dex method count
| ------------- |:-------------:| -----: |
| Google Play Services|com.google.android.gms:play-services:6.5.87|24525
| Google+|com.google.android.gms:play-services-plus:6.5.87|1525
| Google Account Login|com.google.android.gms:play-services-identity:6.5.87|181
| Google Activity Recognition|com.google.android.gms:play-services-location:6.5.87|857
| Google App Indexing|com.google.android.gms:play-services-appindexing:6.5.87|482
| Google Cast|com.google.android.gms:play-services-cast:6.5.87|976
| Google Drive|com.google.android.gms:play-services-drive:6.5.87|2328
| Google Fit|com.google.android.gms:play-services-fitness:6.5.87|1895
| Google Maps|com.google.android.gms:play-services-maps:6.5.87|2568
| Google Mobile Ads|com.google.android.gms:play-services-ads:6.5.87|3278
| Google Panorama Viewer|com.google.android.gms:play-services-panorama:6.5.87|94
| Google Play Game services|com.google.android.gms:play-services-games:6.5.87|5046
| Google Wallet|com.google.android.gms:play-services-wallet:6.5.87|1116
| Android Wear|com.google.android.gms:play-services-wearable:6.5.87|1187
| Google Actions<br /> Google Analytics <br /> Google Cloud Messaging |com.google.android.gms:play-services-base:6.5.87|5212

## A small change to improve build time

For me the biggest win is that in one of the apps we are actively developing granular dependency declaration means with a simple change from

```groovy
compile 'com.google.android.gms:play-services:6.1.71'
```

to

```groovy
compile 'com.google.android.gms:play-services-maps:6.5.87'
compile 'com.google.android.gms:play-services-location:6.5.87'
compile 'com.google.android.gms:play-services-base:6.5.87'
```

 I no longer have to run [Proguard](http://proguard.sourceforge.net/) during development. No wonder my build time just improved by 15 seconds.


*This article is cross-posted with [my company blog](http://blog.brightinventions.pl)*
