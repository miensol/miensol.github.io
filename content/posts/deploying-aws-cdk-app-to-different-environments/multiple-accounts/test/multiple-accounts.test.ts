import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as MultipleAccounts from '../lib/multiple-accounts-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new MultipleAccounts.MultipleAccountsStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
