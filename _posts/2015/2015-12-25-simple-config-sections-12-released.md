---
layout: post
title: "Simple Config Sections 1.2 released"
date: "2015-12-25 10:21"
categories:
  - .net
tags:
  - .net
author: piotr
---

About a week ago I've released another version of [**SimpleConfigSections**](https://github.com/miensol/SimpleConfigSections). It's marked `1.2.0` and you can install it through `Install-Package SimpleConfigSections`.

## What is SimpleConfigSections?

SimpleConfigSections is a little library that simplifies defining [.net configuration sections](https://msdn.microsoft.com/pl-pl/library/2tw134k3.aspx). As you can see in the mentioned msdn documentation the amount of boilerplate code is substantial. An equivalent example in **SimpleConfigSections** looks like follows:

<script src="https://gist.github.com/miensol/f5801742f7a039c820dc.js?file=MsdnExample.cs"></script>

As you can see the `SimpleConfigSection`s version is more concise and a bit easier to write. More examples can be found [on project's github page](https://github.com/miensol/SimpleConfigSections).
