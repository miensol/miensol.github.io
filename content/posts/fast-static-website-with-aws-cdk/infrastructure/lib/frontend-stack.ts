import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3'
import * as s3deploy from '@aws-cdk/aws-s3-deployment'
import * as cloudfront from '@aws-cdk/aws-cloudfront'
import * as path from 'path'

export class FrontendStack extends cdk.Stack {
  constructor(scope: cdk.Construct) {
    super(scope, 'FrontendStack');

    const frontBucket = new s3.Bucket(this, 'FrontendBucket', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true
    });

    const distribution = new cloudfront.CloudFrontWebDistribution(this, 'Distribution', {
      originConfigs: [{
        s3OriginSource: {
          s3BucketSource: frontBucket
        },
        behaviors : [ {isDefaultBehavior: true}]
      }]
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.domainName
    })

    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(
          path.join(__dirname, '..', '..', 'frontend', 'build')
      )],
      destinationBucket: frontBucket,
      distribution: distribution,
    });

  }
}
