---
template: post 
title: Migrate EC2-Classic RDS to a VPC - Step 1 - Replication
tags: [database, EC2-Classic, AWS-CDK, AWS, RDS]
socialImage: ./replica.jpeg 
date: 2022-01-30
---

In [the last blog post](/blog/migrating-ec2-classic-rds-to-vpc-plan) I sketched a plan to migrate an
EC2-Classic RDS database to a VPC. It is time to dive into the details of setting up replication. There
are great blog posts with an in-depth
explanation [of the SQL and PostgreSQL related aspects](https://www.percona.com/blog/postgresql-logical-replication-using-an-rds-snapshot/)
. We are going to focus on the automation of the replication setup using AWS-CDK.

![](./replica.jpeg "replicated lollipops")

## The source EC2-Classic RDS database parameters

In the case of our client, the EC2-Classic RDS PostgreSQL database was deployed with CloudFormation.
With AWS-CDK it is possible to import an existing CloudFormation template and thus gradually switch
to a more modern approach. Once imported it is easy enough to update the parameters
through [`ParameterGroup`](https://docs.aws.amazon.com/cdk/api/v2//docs/aws-cdk-lib.aws_rds.ParameterGroup.html#initializer):

```typescript
const included: CfnInclude = loadCloudFormationTemplate();

const cfnDatabase: CfnDBInstance = included.getResource("Database") as CfnDBInstance;

const parameterGroup = new ParameterGroup(this, 'Replication Source Parameters', {
  engine: DatabaseInstanceEngine.postgres({
    version: PostgresEngineVersion.VER_11
  }),
  parameters: {
    max_replication_slots: '10',
    max_wal_senders: '10',
    max_worker_processes: '10',
    track_commit_timestamp: '1',
    wal_level: 'logical',
  }
});

cfnDatabase.dbParameterGroupName = parameterGroup.bindToInstance({}).parameterGroupName
```

If the database has a custom parameter group we need to modify its properties instead of creating a
new one. Changing the above database parameters sometimes requires a reboot. It is thus important to
schedule it ahead of time in the low traffic hours.

## Create a replication user with AWS-CDK

It is best to create a dedicated replication user at a database level. Running SQL through
CloudFormation can be cumbersome. Thankfully we have developed
the [cloudformation-sql-run](https://www.npmjs.com/package/cloudformation-sql-run) AWS-CDK construct
to make this easier.

```typescript
const replicationUserPassword = new secretmanager.Secret(this, 'Replication User Password', {
  generateSecretString: {
    excludeCharacters: DEFAULT_PASSWORD_EXCLUDE_CHARS
  }
})

const sourceDatabaseConnection = SqlRunConnection.fromDriverTypeHostPort({
  password: SqlSecret.fromSecretsManager(sourceDatabasePassword),
  username: cfnDatabase.masterUsername!,
  driverType: 'postgresql',
  database: cfnDatabase.dbName!,
  host: cfnDatabase.attrEndpointAddress!,
  port: cfnDatabase.attrEndpointPort! as any as number
});

const createReplicationUser = new SqlRun(this, 'Create Replication User', {
  vpc: vpc,
  connection: sourceDatabaseConnection,
  up: {
    run: [{
      sql: `CREATE USER pgrepuser WITH password '${replicationUserPassword.secretValue}'`
    }, {
      sql: `GRANT rds_replication TO pgrepuser`,
    }, {
      sql: `GRANT SELECT ON ALL TABLES IN SCHEMA public TO pgrepuser`,
    }],
  },
  down: {
    run: [{
      sql: `DROP USER IF EXISTS pgrepuser`
    }]
  }
});
```

## Setup replication slots at source RDS database

We create a dedicated SQL user for replication purposes. Now it is time to prepare for the
replication itself. Thankfully this is easy and all we need is 2 additional SQL commands

```typescript
const createPublication = new SqlRun(this, 'Create Publication', {
  vpc: vpc,
  connection: sourceDatabaseConnection,
  up: {
    run: [{
      sql: `CREATE PUBLICATION pglogical_rep01 FOR ALL TABLES`
    }, {
      sql: `SELECT pg_create_logical_replication_slot('pglogical_rep01', 'pgoutput')`
    },],
  },
  down: {
    run: [{
      sql: `DROP PUBLICATION IF EXISTS pglogical_rep01`
    }]
  }
});
```

## Create snapshot at the original database

To speed up replication we'll use take a snapshot and restore approach. First, we use a snapshot is
to create a new VPC based RDS database. Then we set up a logical replication using the above
preparation. Unfortunately at the moment taking a snapshot of a database with AWS-CDK requires a
custom construct. I will create another blog post describing the details of such construct. However,
for the time being, it is enough for you to know that creating and using it is relatively easy:

```typescript
const cfnDatabase: CfnDBInstance = included.getResource("Database") as CfnDBInstance;

const sourceDataseSnapshot = new DatabaseSnapshot(this, 'Source Database Snapshot', {
  dbInstanceIdentifier: cfnDatabase.dbInstanceIdentifier
})
```

The snapshot name is going to be available at `sourceDataseSnapshot.dbInstanceSnapshotIdentifier`

## Create a new database from snapshot

It is time to finally create a new RDS database in the target VPC. We create the database from the
snapshot created above. The database will use the same database parameter group. It will not receive
any production traffic yet. Notice that we create a database cluster instead of a database instance.
It doesn't matter though. The procedure is the same for the database instance.

```typescript
const vpc: IVpc = props.vpc
const targetDatabaseCluster = new DatabaseClusterFromSnapshot(this, 'Database', {
  instanceProps: {
    vpc: vpc,
  },
  engine: DatabaseClusterEngine.auroraPostgres({
    version: AuroraPostgresEngineVersion.VER_11_4
  }),
  snapshotIdentifier: databaseSnapshot.dbInstanceSnapshotIdentifier,
  parameterGroup: parameterGroup
})
```

## Finding out where to start replication from

Once the database cluster restored from a snapshot is ready we have to start replication. First we
create a subscription. Notice that we're using references to source RDS database.

```typescript
const createSubscription = new SqlRun(this, 'Create Subscription', {
  vpc: vpc,
  connection: SqlRunConnection.fromDatabaseCluster(targetDatabaseCluster),
  up: {
    run: [{
      sql: `CREATE SUBSCRIPTION pglogical_sub01 
CONNECTION 'host=${cfnDatabase.attrEndpointAddress!} port=5432 dbname=${cfnDatabase.dbName!} 
user=pgrepuser password=${replicationUserPassword.secretValue}' PUBLICATION pglogical_rep01
WITH (
  copy_data = false,
  create_slot = false,
  enabled = false,
  connect = true,
  slot_name = 'pglogical_rep01'
)`
    }, {
      sql: `SELECT 'pg_'||oid::text AS "external_id"
FROM pg_subscription 
WHERE subname = 'pglogical_sub01'`
    }],
  },
  down: {
    run: [{
      sql: `DROP SUBSCRIPTION IF EXISTS pglogical_sub01`
    }]
  }
});
```

Now that we have a subscription ready to synchronize data. However, we need to advance the
replication into the correct position. To do that we need to find the latest log file
positions. The RDS service provides API for that. For now, we'll assume we have
a `LatestLogPosition` AWS-CDK construct that reads the position for us. In the next blog post, I'll
describe how to create such a construct.

```typescript
const externalId = createSubscription.getStatementResult(0, 'external_id')

const latestLogFile = new LatestLogPosition(this, 'Replication Position', {
  cluster: targetDatabaseCluster
})


const advanceAndEnableSubscription = new SqlRun(this, 'Enable Subscription', {
  vpc: vpc,
  connection: SqlRunConnection.fromDatabaseCluster(targetDatabaseCluster),
  up: {
    run: [{
      sql: `SELECT pg_replication_origin_advance(:externalId, :logFilePosition)`,
      parameters: {
        externalId: externalId,
        logFilePosition: latestLogFile.logFilePosition
      }
    }, {
      sql: `ALTER SUBSCRIPTION pglogical_sub01 ENABLE`
    }]
  },
  down: {
    run: [{
      sql: 'ALTER SUBSCRIPTION pglogical_sub01 DISABLE'
    }]
  }
})
```

In the last SQL statement, we have enabled the subscription. Now the VPC based RDS database is
synchronized with EC2-Classic instance!
For the above to work we need to make sure the source database allows establishing connections from
VPC-based database on a network level.

## Summary

Automating the above process is cumbersome. However, it gives us a solid way to test the approach in
a pre-production environment. This way we can find any loopholes in our approach. We can also
better estimate how long the procedure is going to take on production. We have also not caused any downtime or degradation of performance to the source database. This is very important since it is still used by our clients! 
