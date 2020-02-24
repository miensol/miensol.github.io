---
template: post
title: How to call a load balanced ECS service?
author: piotr
draft: false
tags: [aws, ecs, cloudformation, elb, cloudform]
comments: true
crosspost: true
socialImage: ../images/ecs-service/containers.jpeg
date: 2018-03-06
---

A service running [ECS](https://aws.amazon.com/ecs/) can call plethora of AWS APIs. It can read messages from queues, publish messages to [SNS](https://aws.amazon.com/sns/) topics, query a database. These are all valid ways to communicate with the service. However, often the most appropriate way is to call the service by an HTTP API. In this post I'll describe how to configure an ECS service running inside VPC so that other services can call its API.

![containers](../images/ecs-service/containers.jpeg)

## Deploy an ECS service to multiple hosts

Whenever we care about availability of a service running inside AWS, we need to have it running in at least 2 availability zones. For that reason when defining the ECS Cluster Auto Scaling Group we need to specify at least 2 VPC Subnets running in different availability zones.

```json
"ECSMainCluster": {
    "Type": "AWS::ECS::Cluster",
    "Properties": { "ClusterName": "Main Cluster" }
},
"ECSAutoScalingGroup": {
    "Type": "AWS::AutoScaling::AutoScalingGroup",
    "Properties": {
        "VPCZoneIdentifier": [
            { "Ref": "PrivateASubnet" },
            { "Ref": "PrivateBSubnet" }
        ],
        "LaunchConfigurationName": { "Ref": "ContainerHostInstances" },
        "MinSize": "2",
        "MaxSize": "6",
        "DesiredCapacity": "2"                
    }
},
"ServiceA": {
    "Type": "AWS::ECS::Service",
    "Properties": {
        "Cluster": { "Ref": "ECSMainCluster" },
        "DesiredCount": 2,
        "LoadBalancers": [{
            "ContainerName": "serviceA",
            "ContainerPort": 8080,
            "TargetGroupArn": { "Ref": "ServiceAAlbTargetGroup" }
        }],
        "DeploymentConfiguration": { "MinimumHealthyPercent": 50 },
        "Role": { "Ref": "ECSServiceRole" },
        "TaskDefinition": { "Ref": "ServiceATask" }
    }
}
```

Notice how we are using 2 private subnets as `VPCZoneIdentifier`. The `MinSize` is also set to 2 which will cause both availability zones to have at least 1 instance running. For brevity subnets and VPC definitions are not included. You can find more details about how to configure the EC2 instances inside ECS cluster [in my previous post](/how-to-deploy-a-service-to-amazon-elastic-container-service-with-cloud-formation ).

The `ServiceA` deployed in `ECSMainCluster` is also specifying that at it has [`DesiredCount`](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_services.html) of 2 which instructs ECS to have at least 2 instances of the service running. The [`LoadBalancers`](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ecs-service.html#cfn-ecs-service-loadbalancers) and [`Role`](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ecs-service.html#cfn-ecs-service-role) attributes are required for the load balanced setup. The `ECSServiceRole` must allow the ECS agent to make calls to the load balancer API. The `LoadBalancers` reference [an ALB target group](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html) to which the running ECS task should be added.

## A private load balancer

In order for us to be able to call an API exposed by ECS service running on multiple instances we will use [an internal Application Load Balancer](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-load-balancing.html). By internal, I mean that the load balancer will not be accessible outside of the VPC.

```json
"PrivateApiLoadBalancer": {
    "Type": "AWS::ElasticLoadBalancingV2::LoadBalancer",
    "Properties": {
        "Subnets": [
            { "Ref": "PrivateASubnet" },
            { "Ref": "PrivateBSubnet" }
        ],
        "Name": "PrivateApiLoadBalancer",
        "Scheme": "internal",
        "SecurityGroups": [{
            "Ref": "HttpHttpsProxySecurityGroup"
        }]
    }
},
"HttpHttpsProxySecurityGroup": {
    "Type": "AWS::EC2::SecurityGroup",
    "Properties": {
        "GroupDescription": "Enable http and https access",
        "VpcId": { "Ref": "VPC" },
        "SecurityGroupIngress": [{
            "IpProtocol": "tcp", "FromPort": "80", "ToPort": "80",
            "CidrIp": { "Ref": "VPCCidr" }
        }, {
            "IpProtocol": "tcp", "FromPort": "443", "ToPort": "443",
            "CidrIp": { "Ref": "VPCCidr" }
        }],
        "SecurityGroupEgress": [{
            "IpProtocol": "-1",
            "CidrIp": { "Ref": "VPCCidr" }
        }]
    }
}
```

There are only 2 important aspects to the `PrivateApiLoadBalancer`. First, it is attached to the same subnets as our ECS task definition. Secondly, it has a security group configured which allows for incoming HTTP/HTTPS traffic and outgoing traffic to any IP in the VPC CIDR address. The egress rule is required for the load balancer to be able to check the health of its targets.

For the load balancer to perform some actions we need to configure listeners that define its behavior in response to incoming traffic.

```json
"PrivateApiLoadBalancerHttpListener": {
    "Type": "AWS::ElasticLoadBalancingV2::Listener",
    "Properties": {
        "Port": 80,
        "Protocol": "HTTP",
        "LoadBalancerArn": { "Ref": "PrivateApiLoadBalancer" },
        "DefaultActions": [{
            "Type": "forward",
            "TargetGroupArn": {
                "Ref": "PrivateApiLoadBalancerInvalidHostGroup"
            }
        }]
    }
},
"PrivateApiLoadBalancerInvalidHostGroup": {
    "Type": "AWS::ElasticLoadBalancingV2::TargetGroup",
    "Properties": {
        "Protocol": "HTTP",
        "Port": 80,
        "VpcId": { "Ref": "VPC" },
        "Name": "invalid-target-group"
    }
}
```

The `PrivateApiLoadBalancerHttpListener` specifies that the HTTP request to `PrivateApiLoadBalancer` on port 80 should be routed to `PrivateApiLoadBalancerInvalidHostGroup`. The `AWS::ElasticLoadBalancingV2::Listener` requires us to set the `DefaultActions`. The above setup allows us to fail in a consistent manner. Unless there are `AWS::ElasticLoadBalancingV2::ListenerRule` which match an incoming the HTTP request it will be routed to an empty `AWS::ElasticLoadBalancingV2::TargetGroup` which in turn will result in 502 Bad Gateway. This allows us to effectively decouple the `DefaultActions` of the load balancer listener from a specific ECS service instance.

## Attach ECS service to an Application Load Balancer

It is time to route a request from the Application Load Balancer to the ECS service instances. The [`AWS::ElasticLoadBalancingV2::ListenerRule`](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticloadbalancingv2-listenerrule.html) allows us to configure such behavior:

```json
"ServiceAAlbHttpListenerRule": {
    "Type": "AWS::ElasticLoadBalancingV2::ListenerRule",
    "Properties": {
        "Actions": [{
            "Type": "forward",
            "TargetGroupArn": { "Ref": "ServiceAAlbTargetGroup" }
        }],
        "Priority": 1,
        "Conditions": [{
            "Field": "host-header",
            "Values": [ "service-a.in.example.com"]
        }],
        "ListenerArn": {
            "Ref": "PrivateApiLoadBalancerHttpListener"
        }
    }
},
"ServiceAAlbTargetGroup": {
    "Type": "AWS::ElasticLoadBalancingV2::TargetGroup",
    "Properties": {
        "Protocol": "HTTP",
        "Port": 8080,
        "HealthCheckPath": "/application-status/health",
        "HealthyThresholdCount": 2,
        "UnhealthyThresholdCount": 10,
        "HealthCheckIntervalSeconds": 5,
        "HealthCheckTimeoutSeconds": 4,
        "VpcId": { "Ref": "VPC" },
        "Name": "service-a-target-group"
    }
}
```

The `ServiceAAlbHttpListenerRule` states that any request with a `Host` equal to `service-a.in.example.com` should be routed to an instance from the `ServiceAAlbTargetGroup`. The `ServiceAAlbTargetGroup` group is referenced from the `ServiceA` definition and contains all running and healthy instances of our task. This means that in order to call the HTTP API exposed by `ServiceA` we will simply use the `service-a.in.example.com` domain name.

## A private DNS record

The last part is to define a [Private Hosted Zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-creating.html) and [a DNS Record Set](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-route53-recordset.html) so that a DNS look up, happening inside the VPC, for `service-a.in.example.com` results in an IP address of the `PrivateApiLoadBalancer`.

```json
"PrivateHostedZone": {
    "Type": "AWS::Route53::HostedZone",
    "Properties": {
        "VPCs": [{
            "VPCId": { "Ref": "VPC" },
            "VPCRegion": { "Ref": "AWS::Region" }
        }],
        "Name": "in.example.com"
    }
},
 "ServiceALoadBalancerDNSRecord": {
    "Type": "AWS::Route53::RecordSet",
    "Properties": {
        "Name": "service-a.in.example.com",
        "HostedZoneId": { "Ref": "PrivateHostedZone" },
        "ResourceRecords": [{
            "Fn::GetAtt": ["PrivateApiLoadBalancer", "DNSName"]
        }],
        "TTL": 60,
        "Type": "CNAME"
    }
}
```

The `PrivateHostedZone` merely defines the name of the domain which we will use for addressing ECS services running inside our VPC. It is recommended to use a domain name that you control so that a mistake in the DNS configuration will not cause your services to call an address that you do not own. The `ServiceALoadBalancerDNSRecord` defines a CNAME that uses `PrivateApiLoadBalancer` AWS assigned DNS name. This way the lookup for `service-a.in.example.com` will effectively resolve to multiple IPs in different availability zones.

With the above configuration in place we can call an HTTP API exposed privately by a load balanced service running inside VPC on ECS cluster using the most natural way i.e. a DNS name.
