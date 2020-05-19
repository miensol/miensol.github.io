import { Handler } from "aws-lambda";
const StepFunctions = require("aws-sdk/clients/stepfunctions");
const DynamoDb = require("aws-sdk/clients/dynamodb");

interface SignDocumentEvent {
  documentId: string;
  signer: string;
  stepFunctionToken: string;
}

const documentClient = new DynamoDb.DocumentClient();
const signRequestsTableName = process.env.signRequestsTableName;

export const requestDocumentSignature: Handler<SignDocumentEvent> = async (
  event
) => {
  console.log("Request signature for", event);

  await documentClient
    .put({
      TableName: signRequestsTableName,
      Item: event,
    })
    .promise();
};

const stepFunctions = new StepFunctions();
export const completeSignatureRequest: Handler<{ documentId: string }> = async (
  event
) => {
  const tableItem = await documentClient
    .get({
      TableName: signRequestsTableName,
      Key: { documentId: event.documentId },
    })
    .promise();

  const signRequest: SignDocumentEvent = tableItem.Item;
  console.log("Received signature for", signRequest);

  const output = JSON.stringify({
    signature: `${signRequest.signer} signed ${signRequest.documentId}`,
  });

  await stepFunctions
    .sendTaskSuccess({
      output: output,
      taskToken: signRequest.stepFunctionToken,
    })
    .promise();
};

const delay = (millis: number) =>
  new Promise((resolve) => setTimeout(resolve, millis));

export const signDocument: Handler<{
  documentId: string;
  signer: string;
}> = async (event) => {
  await delay(1000);
  console.log("Sign document", event);
  return {
    result: `${event.signer} signed ${event.documentId}`,
  };
};
