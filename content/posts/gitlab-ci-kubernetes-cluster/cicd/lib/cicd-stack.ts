import * as ec2 from "@aws-cdk/aws-ec2";
import { InstanceClass, InstanceSize } from "@aws-cdk/aws-ec2";
import * as eks from "@aws-cdk/aws-eks";
import * as iam from "@aws-cdk/aws-iam";
import * as cdk from "@aws-cdk/core";
import { ClusterAutoscaler } from "./cluster-autoscaler";

export class CICDStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const clusterAdmin = new iam.Role(this, "Cluster Master Role", {
      assumedBy: new iam.AccountRootPrincipal(),
    });

    const clusterName = "cicd";
    const cluster = new eks.Cluster(this, "CICD Cluster", {
      mastersRole: clusterAdmin,
      clusterName: clusterName,
      defaultCapacity: 0,
    });

    const mainNodeGroup = cluster.addNodegroup("main", {
      desiredSize: 1,
      instanceType: ec2.InstanceType.of(InstanceClass.M5, InstanceSize.XLARGE2),
      nodegroupName: "main",
      maxSize: 10
    });

    new ClusterAutoscaler(this, "cluster-autoscaler", {
      cluster: cluster,
      nodeGroups: [mainNodeGroup],
      clusterName,
    });

    cluster.addChart("gitlab-runner", {
      chart: "gitlab-runner",
      repository: "https://charts.gitlab.io/",
      version: "v0.17.1",
      wait: true,
      values: {
        gitlabUrl: "https://gitlab.com/",
        runnerRegistrationToken: "<runner registration token>",
        rbac: {
          create: true,
        },
        runners: {
          // https://gitlab.com/gitlab-org/charts/gitlab-runner/blob/master/values.yaml
          // required for dind
          privileged: true,
          builds: {
            cpuRequests: "1",
            cpuRequestsOverwriteMaxAllowed: "16",
            cpuLimitOverwriteMaxAllowed: "16",
            memoryRequests: "4Gi",
            memoryLimitOverwriteMaxAllowed: "16Gi",
            memoryRequestsOverwriteMaxAllowed: "16Gi",
          },
        },
      },
    });
  }
}
