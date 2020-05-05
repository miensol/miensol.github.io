#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { CertificateStack, FrontendStack } from "../lib/frontend-stack";

const app = new cdk.App();
new CertificateStack(app);
new FrontendStack(app, {
  certificateArn:
    "arn:aws:acm:us-east-1:899337079433:certificate/b424046a-f8f6-4438-b040-402a32c1491b",
});
