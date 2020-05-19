import * as dynamodb from "@aws-cdk/aws-dynamodb";
import { AttributeType, BillingMode } from "@aws-cdk/aws-dynamodb";
import * as iam from "@aws-cdk/aws-iam";
import * as lambda from "@aws-cdk/aws-lambda-nodejs";
import * as sfn from "@aws-cdk/aws-stepfunctions";
import { ServiceIntegrationPattern, Data } from "@aws-cdk/aws-stepfunctions";
import * as tasks from "@aws-cdk/aws-stepfunctions-tasks";
import * as cdk from "@aws-cdk/core";
import { Duration } from "@aws-cdk/core";

export class StepFunctionStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const signRequestsTable = new dynamodb.Table(this, "Signature Requests", {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "documentId", type: AttributeType.STRING },
    });

    const requestDocumentSignature = new lambda.NodejsFunction(
      this,
      "Request Document Signature",
      {
        entry: __dirname + "/sign-document.ts",
        handler: "requestDocumentSignature",
        environment: {
          signRequestsTableName: signRequestsTable.tableName,
        },
      }
    );

    const completeSignatureRequest = new lambda.NodejsFunction(
      this,
      "Complete Document Signature",
      {
        entry: __dirname + "/sign-document.ts",
        handler: "completeSignatureRequest",
        environment: {
          signRequestsTableName: signRequestsTable.tableName,
        },
      }
    );

    signRequestsTable.grantReadWriteData(requestDocumentSignature);
    signRequestsTable.grantReadWriteData(completeSignatureRequest);

    const bobSignature = new sfn.Task(this, "Bob Signature", {
      task: new tasks.RunLambdaTask(requestDocumentSignature, {
        integrationPattern: ServiceIntegrationPattern.WAIT_FOR_TASK_TOKEN,
        payload: sfn.TaskInput.fromObject({
          stepFunctionToken: sfn.Context.taskToken,
          signer: "Bob",
          documentId: Data.stringAt("$.documentId"),
        }),
      }),
    });

    const signDocument = new lambda.NodejsFunction(this, "Sign Document", {
      entry: __dirname + "/sign-document.ts",
      handler: "signDocument",
    });

    const aliceSignature = new sfn.Task(this, "Alice Signature", {
      task: new tasks.RunLambdaTask(signDocument, {
        payload: sfn.TaskInput.fromObject({
          signer: "Alice",
          documentId: Data.stringAt("$.documentId"),
        }),
      }),
    });

    const flow = new sfn.Parallel(this, "Give document to signers").branch(
      bobSignature,
      aliceSignature
    );

    const waitForSignaturesTimeout = Duration.seconds(60);
    const stateMachine = new sfn.StateMachine(this, "Step Function", {
      definition: flow,
      timeout: waitForSignaturesTimeout,
    });

    completeSignatureRequest.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["states:SendTaskSuccess", "states:SendTaskFailure"],
        resources: [stateMachine.stateMachineArn],
      })
    );
  }
}
