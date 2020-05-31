import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";

function deployEnv() {
  return process.env.DEPLOY_ENV || "dev";
}

function envSpecific(logicalName: string | Function) {
  const suffix =
    typeof logicalName === "function" ? logicalName.name : logicalName;
  return `${deployEnv()}-${suffix}`;
}

export class MultipleAccountsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, props?: cdk.StackProps) {
    super(scope, envSpecific(MultipleAccountsStack), props);

    new s3.Bucket(this, "MyBucket", {
      bucketName: envSpecific("important-assets"),
    });
  }
}
