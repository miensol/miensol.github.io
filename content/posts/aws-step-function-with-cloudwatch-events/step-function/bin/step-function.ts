#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { StepFunctionStack } from '../lib/step-function-stack';

const app = new cdk.App();
new StepFunctionStack(app, 'StepFunctionStack');
