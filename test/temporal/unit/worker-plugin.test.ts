import { expect } from 'chai';
import type { WorkerOptions } from '@temporalio/worker';
import { restoreAll } from '../../uts/helpers';
import * as WorkerEntryPoint from '../../../src/platform/temporal/src/index';
import { AblyRestPlugin } from '../../../src/platform/temporal/src/worker/plugin';
import { ActivityNames } from '../../../src/platform/temporal/src/common/activities';
import { activityEnvironment, expectedHeaders, jsonBody, mockAbly, runActivity, toWire } from './worker-helpers';

// The Rest class from the built `ably` package, as an application would import it.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const BuiltRest = require('ably').Rest;

function configuredActivities(plugin: AblyRestPlugin, activities: object = {}): Record<string, any> {
  const options = plugin.configureWorker({ taskQueue: 'test', activities } as WorkerOptions);
  return options.activities as Record<string, any>;
}

describe('temporal/worker/plugin', function () {
  afterEach(function () {
    restoreAll();
  });

  it('is named AblyRestPlugin', function () {
    const { client } = mockAbly((req) => req.respond_with(200, {}));
    expect(new AblyRestPlugin({ client }).name).to.equal('AblyRestPlugin');
  });

  it('registers every Ably activity alongside the application activities', function () {
    const { client } = mockAbly((req) => req.respond_with(200, {}));
    const myActivity = async () => 'mine';

    const activities = configuredActivities(new AblyRestPlugin({ client }), { myActivity });

    expect(Object.keys(activities).sort()).to.deep.equal([...Object.values(ActivityNames), 'myActivity'].sort());
    expect(activities.myActivity).to.equal(myActivity);
    for (const name of Object.values(ActivityNames)) {
      expect(name.startsWith('ably.'), name).to.equal(true);
      expect(activities[name], name).to.be.a('function');
    }
  });

  it('uses the client it is given', async function () {
    const { client, requests } = mockAbly((req) => req.respond_with(201, { serials: ['s0'] }));
    const plugin = new AblyRestPlugin({ client });

    await runActivity(
      activityEnvironment(),
      configuredActivities(plugin)[ActivityNames.publish],
      toWire({ channel: 'chat', messages: [{ name: 'e' }] }),
    );

    expect(plugin.client).to.equal(client);
    expect(jsonBody(requests[0])[0].extras.headers).to.deep.equal(expectedHeaders);
  });

  it('passes temporalMetadata to the activities', async function () {
    const { client, requests } = mockAbly((req) => req.respond_with(201, { serials: ['s0'] }));
    const plugin = new AblyRestPlugin({ client, temporalMetadata: false });

    await runActivity(
      activityEnvironment(),
      configuredActivities(plugin)[ActivityNames.publish],
      toWire({ channel: 'chat', messages: [{ name: 'e' }] }),
    );

    expect(jsonBody(requests[0])[0]).to.not.have.property('extras');
  });

  it('passes channelOptions to the activities', async function () {
    const { client, requests } = mockAbly((req) => req.respond_with(201, { serials: ['s0'] }));
    const plugin = new AblyRestPlugin({ client, channelOptions: () => ({ cipher: { key: Buffer.alloc(32, 1) } }) });

    await runActivity(
      activityEnvironment(),
      configuredActivities(plugin)[ActivityNames.publish],
      toWire({ channel: 'chat', messages: [{ name: 'e', data: 'd' }] }),
    );

    expect(jsonBody(requests[0])[0].encoding).to.equal('utf-8/cipher+aes-256-cbc/base64');
  });

  it('accepts a client from the built ably package', function () {
    const client = new BuiltRest({ key: 'appId.keyId:keySecret' });

    expect(new AblyRestPlugin({ client }).client).to.equal(client);
  });

  it('rejects options without a client', function () {
    const message = /do not include an Ably REST client in `client`/;
    expect(() => new (AblyRestPlugin as any)()).to.throw(TypeError, message);
    expect(() => new AblyRestPlugin({} as any)).to.throw(TypeError, message);
    expect(() => new AblyRestPlugin({ ably: { key: 'appId.keyId:keySecret' } } as any)).to.throw(TypeError, message);
    expect(() => new AblyRestPlugin({ client: { key: 'appId.keyId:keySecret' } } as any)).to.throw(TypeError, message);
  });

  it('exports the worker API from the entry point', function () {
    expect(Object.keys(WorkerEntryPoint).sort()).to.deep.equal(
      [
        'ABLY_ERROR_TYPE',
        'AblyRestPlugin',
        'ActivityNames',
        'TemporalMetadataKeys',
        'createActivities',
        'getAblyErrorDetails',
      ].sort(),
    );
    expect(WorkerEntryPoint.TemporalMetadataKeys).to.deep.equal({
      namespace: 'temporalNamespace',
      workflowId: 'temporalWorkflowId',
      runId: 'temporalRunId',
      workflowType: 'temporalWorkflowType',
      activityId: 'temporalActivityId',
      attempt: 'temporalAttempt',
    });
  });
});
