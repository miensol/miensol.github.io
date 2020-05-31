#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { MultipleAccountsStack } from "../lib/multiple-accounts-stack";

const app = new cdk.App();
new MultipleAccountsStack(app);
