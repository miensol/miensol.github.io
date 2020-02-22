---
template: post
title: How to convert an express app to AWS Lambda?
author: piotr
hidden: false
tags: [aws, cloudformation, lambda, cloudform]
comments: true
crosspost: false
socialImage: ../images/express-js.webp
date: 2018-05-29
---

In this post we will see how to convert an existing [express](https://expressjs.com/) application to AWS Lambda. This can help reduce AWS bill even by an order of magnitude. We will also use [cloudform](https://github.com/bright/cloudform) to describe the [CloudFormation](https://aws.amazon.com/cloudformation/) stack.

![lambda](../images/express-js.webp)

## An express app

For our example to be complete we need an express application. Let's use a single `index.js` file to define it:

```javascript
const express = require('express');

function apiRoutes(){
    const routes = new express.Router();

    routes.get('/v1/version', (req, res) => res.send({version: '1'}));

    routes.post('/v1/echo', (req, res) => res.send({...req.body}));

    return routes;
}


const app = express()
    .use(express.json())
    .use(apiRoutes());

app.listen(3000, () => console.log(`Listening on 3000`));
```

The above application has only 2 endpoints: 
- `GET /v1/version` returns API version
- `POST /v1/echo` sends back the request body

We start the application as any other node app with `node index.js`.

## Convert the express app to AWS Lambda

[The AWS Lambda Node.js](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-handler.html) runtime model differs from a simple `node fileName.js` invocation. For the AWS Lambda to invoke our application code we need to structure it appropriately. Thankfully the [aws-serverless-express](https://github.com/awslabs/aws-serverless-express) module adapts express to AWS Lambda Node.js runtime model.

Let's adapt our `index.js` file to support `aws-serverless-express`:

```javascript
const isInLambda = !!process.env.LAMBDA_TASK_ROOT;
if (isInLambda) {
    const serverlessExpress = require('aws-serverless-express');
    const server = serverlessExpress.createServer(app);
    exports.main = (event, context) => serverlessExpress.proxy(server, event, context)
} else {
    app.listen(3000, () => console.log(`Listening on 3000`));
}
```

The `main` function is called by the AWS Lambda Node.js runtime. Note that we've used [`LAMBDA_TASK_ROOT`](https://docs.aws.amazon.com/lambda/latest/dg/current-supported-versions.html#lambda-environment-variables) environment variable to detect if the app is running inside AWS Lambda. It is better to split the express application setup and `listen` call into separate files and use 2 different _main_ files e.g. `development.js` calling `listen(port)` and `lambda.js` using `aws-serverless-express`. However, this would complicate our example unnecessarily.

## Deploy the express app to AWS Lambda

I already showed [how we can deploy lambda with cloudform]({% post_url 2018-03-11-deploy-lambda-with-cloudformation %}). We will use the previous example as a base:

```typescript
import cloudform, { Lambda, IAM, Fn, ApiGateway, Refs,  } from 'cloudform';
import { FunctionProperties } from 'cloudform/types/lambda/function';
import { readFileSync } from 'fs';

const
    LambdaExecutionRole = 'LambdaExecutionRole',
    ExpressMain = 'ExpressMain',
    RestApi = 'RestApi',
    RestApiMainResource = 'RestApiMainResource',
    PackageKey = 'PackageKey',
    RestApiDeployment = 'RestApiDeployment',
    RestApiMethod = 'RestApiMethod';

export default cloudform({
    Parameters: {
        PackageKey: {
            Type: 'String',
            Default: 'express-lambda.zip'
        }
    },
    Resources: {
        [ExpressMain]: new Lambda.Function({
            Code: { S3Bucket: 'bright-tmp', S3Key: Fn.Ref(PackageKey) },
            Handler: "index.main",
            Role: Fn.GetAtt(LambdaExecutionRole, "Arn"),
            Runtime: "nodejs6.10"
        }),
        [LambdaExecutionRole]: new IAM.Role({
            AssumeRolePolicyDocument: {
                Statement: [{
                    Effect: "Allow",
                    Principal: { Service: ["lambda.amazonaws.com"] },
                    Action: ["sts:AssumeRole"]
                }]
            },
            ManagedPolicyArns: ["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"]
        }),
        PermissionToInvokeLambda: new Lambda.Permission({
            Action: 'lambda:InvokeFunction',
            FunctionName: Fn.GetAtt(ExpressMain, 'Arn'),
            Principal: 'apigateway.amazonaws.com',
            SourceArn: Fn.Join('', [
                'arn:aws:execute-api:', Refs.Region, ':', Refs.AccountId, ':', Fn.Ref(RestApi), '/*']
            )
        })
        ... // Rest Api Gateway see below
    }
})
```

For the AWS Lambda function source we use a zip file hosted in a S3 Bucket named `packages` at key specified in the template parameter `PackageKey`. The package zip file must contain all application source code including `node_modules`. We also define `PermissionToInvokeLambda` so that API Gateway can invoke the lambda function.

## Add API Gateway to call AWS Lambda

To be able to invoke the AWS Lambda function using HTTP protocol we will use [API Gateway](https://aws.amazon.com/api-gateway/). There are multiple ways of setting up the API gateway but we will use an appoach that is simplest in my opinion.

```typescript
[RestApi]: new ApiGateway.RestApi({ Name: "Express API" }),
[RestApiMainResource]: new ApiGateway.Resource({
    RestApiId: Fn.Ref(RestApi),
    ParentId: Fn.GetAtt(RestApi, 'RootResourceId'),
    PathPart: "{proxy+}",
}),
[RestApiMethod]: new ApiGateway.Method({
    HttpMethod: 'ANY',
    ResourceId: Fn.Ref(RestApiMainResource),
    RestApiId: Fn.Ref(RestApi),
    AuthorizationType: 'NONE',
    Integration: {
        Type: "AWS_PROXY",
        IntegrationHttpMethod: "POST",
        Uri: Fn.Sub("arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${ExpressMain.Arn}/invocations", {})
    }
}),
[RestApiDeployment]: new ApiGateway.Deployment({
    RestApiId: Fn.Ref(RestApi),
    StageName: 'test'
})
```

We first define a [`RestApi`](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigateway-restapi.html) which is a collection of resources with various configuration options describing the API. Next is the [`RestApiMainResource`](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigateway-resource.html) which depicts a single REST resource. However, in our case we use wildcard `PathPart` to match **all** paths. This way we can have a single resource encompassing all API endpoints. For the `RestApiMainResource` we also need to define a single [`RestApiMethod`](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigateway-method.html). Note that the `HttpMethod` is set to `ANY` which matches all verbs. The `Integration` specifies that we would like to proxy requests to the `ExpressMain` AWS Lambda function. Last but not least we define a [`RestApiDeployment`](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigateway-deployment.html) so that we have an URL to call the API.

It is handy to define `Outputs` in our template so that we can easily access the API url:

```typescript
Outputs: {
    RestApiUrl: {
        Value: Fn.Join('', [Fn.Ref(RestApi), '.execute-api.', Refs.Region, '.amazonaws.com/test'])
    }
}
```

## Test API Gateway calling AWS Lambda

With our cloudform template deployed with a single command:

```bash
aws cloudformation update-stack \
  --stack-name lambda-example \
  --capabilities CAPABILITY_IAM \
  --template-body file://<(./node_modules/.bin/cloudform aws-template.ts)
```

We can also fetch the API url:

```bash
API_URL=$(aws cloudformation describe-stacks \
  --stack-name lambda-example \
  --query 'Stacks[0].Outputs[?OutputKey==`RestApiUrl`].OutputValue' \
  --output text)
```

Finally, with the help of [`httpie`](https://httpie.org/) we can test our API:

```bash
> http https://${API_URL}/v1/version

HTTP/1.1 200 OK
Connection: keep-alive
Content-Length: 15
Content-Type: application/json; charset=utf-8
Date: Mon, 28 May 2018 19:58:13 GMT
Via: 1.1 XXXXXXXXXXXXX.cloudfront.net (CloudFront)
X-Amz-Cf-Id: XXXXXXXXXXXXX==
X-Amzn-Trace-Id: Root=1-5b0c5f54-806e190d437c7d31a4a0d4ba
X-Cache: Miss from cloudfront
etag: W/"f-sHigu4BMVa0IJ0LR3NDJ5y8l4sc"
x-amz-apigw-id: HnPVQH4yjoEF8-w=
x-amzn-Remapped-connection: close
x-amzn-Remapped-content-length: 15
x-amzn-Remapped-date: Mon, 28 May 2018 19:58:13 GMT
x-amzn-RequestId: 73eff8a6-62b1-11e8-907c-79117668835e
x-powered-by: Express

{
    "version": "1"
}
```

And a `POST` to the echo endpoint:

```bash
http https://${API_URL}/v1/echo message="Hello 👋 My name is Piotr"

HTTP/1.1 200 OK
Connection: keep-alive
Content-Length: 41
Content-Type: application/json; charset=utf-8
Date: Mon, 28 May 2018 20:00:31 GMT
Via: 1.1 XXXXXXXXXXXXX.cloudfront.net (CloudFront)
X-Amz-Cf-Id: XXXXXXXXXXXXX==
X-Amzn-Trace-Id: Root=1-5b0c5fdf-802178cceb5160684ef2cc34
X-Cache: Miss from cloudfront
etag: W/"29-SKqhJThIfjmVId6IIeTilD7Mkk0"
x-amz-apigw-id: HnPq5HeJjoEFuRQ=
x-amzn-Remapped-connection: close
x-amzn-Remapped-content-length: 41
x-amzn-Remapped-date: Mon, 28 May 2018 20:00:31 GMT
x-amzn-RequestId: c67b41c0-62b1-11e8-a23f-c7cbebde15f2
x-powered-by: Express

{
    "message": "Hello 👋 My name is Piotr"
}

```


## Reduced infrastructure cost

With the above setup we no longer have to pay for an always running EC2 instance. Our monthly bill depends on the number of requests that are executed against the exposed API. More than that, we get much better scalability characteristics, especially when we have nonlinear request rates. 
