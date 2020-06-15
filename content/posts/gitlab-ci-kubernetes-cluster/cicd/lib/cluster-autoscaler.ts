import { Construct } from "@aws-cdk/core";
import * as cdk from "@aws-cdk/core";
import * as eks from "@aws-cdk/aws-eks";
import * as iam from "@aws-cdk/aws-iam";

interface ClusterAutoscalerProps {
  clusterName: string; // it's easier to use than props.cluster.clusterName due to:  Resolution error: "k8s.io/cluster-autoscaler/${Token[TOKEN.223]}" is used as the key in a map so must resolve to a string, but it resolves to: {"Fn::Join":["",["k8s.io/cluster-autoscaler/",{"Ref":"CICDClusterA2BC6B36"}]]}. Consider using "CfnJson" to delay resolution to deployment-time.
  cluster: eks.Cluster;
  nodeGroups: eks.Nodegroup[];
  version?: string;
}

//https://docs.aws.amazon.com/eks/latest/userguide/cluster-autoscaler.html#ca-ng-considerations
export class ClusterAutoscaler extends cdk.Construct {
  constructor(scope: Construct, id: string, props: ClusterAutoscalerProps) {
    super(scope, id);
    const version = props.version ?? "v1.18.1"; // https://github.com/kubernetes/autoscaler/releases
    const policyStatement = new iam.PolicyStatement();
    policyStatement.addResources("*");
    policyStatement.addActions(
      "autoscaling:DescribeAutoScalingGroups",
      "autoscaling:DescribeAutoScalingInstances",
      "autoscaling:DescribeLaunchConfigurations",
      "autoscaling:DescribeTags",
      "autoscaling:SetDesiredCapacity",
      "autoscaling:TerminateInstanceInAutoScalingGroup",
      "ec2:DescribeLaunchTemplateVersions"
    );

    // create the policy based on the statements
    const policy = new iam.Policy(this, "policy", {
      policyName: "ClusterAutoscalerPolicy",
      statements: [policyStatement],
    });

    const clusterName = props.clusterName;
    props.nodeGroups.forEach((nodeGroup) => {
      cdk.Tag.add(
        nodeGroup,
        "k8s.io/cluster-autoscaler/" + clusterName,
        "owned",
        {
          applyToLaunchedInstances: true,
        }
      );
      cdk.Tag.add(nodeGroup, `k8s.io/cluster-autoscaler/enabled`, "true", {
        applyToLaunchedInstances: true,
      });
      policy.attachToRole(nodeGroup.role);
    });

    new eks.KubernetesResource(this, "autoscaler-k8s", {
      cluster: props.cluster,
      // curl https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml | | yq r -j -d'*' -
      manifest: [
        {
          apiVersion: "v1",
          kind: "ServiceAccount",
          metadata: {
            labels: {
              "k8s-addon": "cluster-autoscaler.addons.k8s.io",
              "k8s-app": "cluster-autoscaler",
            },
            name: "cluster-autoscaler",
            namespace: "kube-system",
          },
        },
        {
          apiVersion: "rbac.authorization.k8s.io/v1",
          kind: "ClusterRole",
          metadata: {
            labels: {
              "k8s-addon": "cluster-autoscaler.addons.k8s.io",
              "k8s-app": "cluster-autoscaler",
            },
            name: "cluster-autoscaler",
          },
          rules: [
            {
              apiGroups: [""],
              resources: ["events", "endpoints"],
              verbs: ["create", "patch"],
            },
            {
              apiGroups: [""],
              resources: ["pods/eviction"],
              verbs: ["create"],
            },
            { apiGroups: [""], resources: ["pods/status"], verbs: ["update"] },
            {
              apiGroups: [""],
              resourceNames: ["cluster-autoscaler"],
              resources: ["endpoints"],
              verbs: ["get", "update"],
            },
            {
              apiGroups: [""],
              resources: ["nodes"],
              verbs: ["watch", "list", "get", "update"],
            },
            {
              apiGroups: [""],
              resources: [
                "pods",
                "services",
                "replicationcontrollers",
                "persistentvolumeclaims",
                "persistentvolumes",
              ],
              verbs: ["watch", "list", "get"],
            },
            {
              apiGroups: ["extensions"],
              resources: ["replicasets", "daemonsets"],
              verbs: ["watch", "list", "get"],
            },
            {
              apiGroups: ["policy"],
              resources: ["poddisruptionbudgets"],
              verbs: ["watch", "list"],
            },
            {
              apiGroups: ["apps"],
              resources: ["statefulsets", "replicasets", "daemonsets"],
              verbs: ["watch", "list", "get"],
            },
            {
              apiGroups: ["storage.k8s.io"],
              resources: ["storageclasses", "csinodes"],
              verbs: ["watch", "list", "get"],
            },
            {
              apiGroups: ["batch", "extensions"],
              resources: ["jobs"],
              verbs: ["get", "list", "watch", "patch"],
            },
            {
              apiGroups: ["coordination.k8s.io"],
              resources: ["leases"],
              verbs: ["create"],
            },
            {
              apiGroups: ["coordination.k8s.io"],
              resourceNames: ["cluster-autoscaler"],
              resources: ["leases"],
              verbs: ["get", "update"],
            },
          ],
        },
        {
          apiVersion: "rbac.authorization.k8s.io/v1",
          kind: "Role",
          metadata: {
            labels: {
              "k8s-addon": "cluster-autoscaler.addons.k8s.io",
              "k8s-app": "cluster-autoscaler",
            },
            name: "cluster-autoscaler",
            namespace: "kube-system",
          },
          rules: [
            {
              apiGroups: [""],
              resources: ["configmaps"],
              verbs: ["create", "list", "watch"],
            },
            {
              apiGroups: [""],
              resourceNames: [
                "cluster-autoscaler-status",
                "cluster-autoscaler-priority-expander",
              ],
              resources: ["configmaps"],
              verbs: ["delete", "get", "update", "watch"],
            },
          ],
        },
        {
          apiVersion: "rbac.authorization.k8s.io/v1",
          kind: "ClusterRoleBinding",
          metadata: {
            labels: {
              "k8s-addon": "cluster-autoscaler.addons.k8s.io",
              "k8s-app": "cluster-autoscaler",
            },
            name: "cluster-autoscaler",
          },
          roleRef: {
            apiGroup: "rbac.authorization.k8s.io",
            kind: "ClusterRole",
            name: "cluster-autoscaler",
          },
          subjects: [
            {
              kind: "ServiceAccount",
              name: "cluster-autoscaler",
              namespace: "kube-system",
            },
          ],
        },
        {
          apiVersion: "rbac.authorization.k8s.io/v1",
          kind: "RoleBinding",
          metadata: {
            labels: {
              "k8s-addon": "cluster-autoscaler.addons.k8s.io",
              "k8s-app": "cluster-autoscaler",
            },
            name: "cluster-autoscaler",
            namespace: "kube-system",
          },
          roleRef: {
            apiGroup: "rbac.authorization.k8s.io",
            kind: "Role",
            name: "cluster-autoscaler",
          },
          subjects: [
            {
              kind: "ServiceAccount",
              name: "cluster-autoscaler",
              namespace: "kube-system",
            },
          ],
        },
        {
          apiVersion: "apps/v1",
          kind: "Deployment",
          metadata: {
            labels: { app: "cluster-autoscaler" },
            name: "cluster-autoscaler",
            namespace: "kube-system",
            annotations: {
              "cluster-autoscaler.kubernetes.io/safe-to-evict": "false",
            },
          },
          spec: {
            replicas: 1,
            selector: { matchLabels: { app: "cluster-autoscaler" } },
            template: {
              metadata: {
                annotations: {
                  "prometheus.io/port": "8085",
                  "prometheus.io/scrape": "true",
                },
                labels: { app: "cluster-autoscaler" },
              },
              spec: {
                containers: [
                  {
                    command: [
                      "./cluster-autoscaler",
                      "--v=4",
                      "--stderrthreshold=info",
                      "--cloud-provider=aws",
                      "--skip-nodes-with-local-storage=false",
                      "--expander=least-waste",
                      "--node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/" +
                        clusterName,
                      "--balance-similar-node-groups",
                      "--skip-nodes-with-system-pods=false",
                    ],
                    image: `eu.gcr.io/k8s-artifacts-prod/autoscaling/cluster-autoscaler:${version}`,
                    imagePullPolicy: "Always",
                    name: "cluster-autoscaler",
                    resources: {
                      limits: { cpu: "100m", memory: "300Mi" },
                      requests: { cpu: "100m", memory: "300Mi" },
                    },
                    volumeMounts: [
                      {
                        mountPath: "/etc/ssl/certs/ca-certificates.crt",
                        name: "ssl-certs",
                        readOnly: true,
                      },
                    ],
                  },
                ],
                serviceAccountName: "cluster-autoscaler",
                volumes: [
                  {
                    hostPath: { path: "/etc/ssl/certs/ca-bundle.crt" },
                    name: "ssl-certs",
                  },
                ],
              },
            },
          },
        },
      ],
    });
  }
}
