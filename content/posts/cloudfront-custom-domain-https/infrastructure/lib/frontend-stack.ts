import * as cm from "@aws-cdk/aws-certificatemanager";
import { ValidationMethod } from "@aws-cdk/aws-certificatemanager";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as s3 from "@aws-cdk/aws-s3";
import * as s3deploy from "@aws-cdk/aws-s3-deployment";
import { CfnOutput } from "@aws-cdk/core";
import * as cdk from "@aws-cdk/core";
import * as path from "path";

const domainName = "fast-static-website.miensol.pl";

export class CertificateStack extends cdk.Stack {
  constructor(scope: cdk.Construct) {
    super(scope, "CertificateStack", {
      env: { region: "us-east-1" },
    });

    const certificate = new cm.Certificate(this, "CustomDomainCertificate", {
      domainName: domainName,
      validationMethod: ValidationMethod.DNS,
    });

    const certificateArn = certificate.certificateArn;
    new CfnOutput(this, "CertificateArn", {
      value: certificateArn,
    });
  }
}

interface FrontendProps {
  certificateArn: string;
}

export class FrontendStack extends cdk.Stack {
  constructor(scope: cdk.Construct, props: FrontendProps) {
    super(scope, "FrontendStack");

    const frontBucket = new s3.Bucket(this, "FrontendBucket", {
      websiteIndexDocument: "index.html",
      publicReadAccess: true,
    });

    const distribution = new cloudfront.CloudFrontWebDistribution(
      this,
      "Distribution",
      {
        viewerCertificate: {
          aliases: [domainName],
          props: {
            acmCertificateArn: props.certificateArn,
            sslSupportMethod: "sni-only",
          },
        },
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: frontBucket,
            },
            behaviors: [{ isDefaultBehavior: true }],
          },
        ],
      }
    );

    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: distribution.domainName,
    });

    new s3deploy.BucketDeployment(this, "DeployWebsite", {
      sources: [
        s3deploy.Source.asset(
          path.join(
            __dirname,
            "..",
            "..",
            "..",
            "fast-static-website-with-aws-cdk",
            "frontend",
            "build"
          )
        ),
      ],
      destinationBucket: frontBucket,
      distribution: distribution,
    });
  }
}
