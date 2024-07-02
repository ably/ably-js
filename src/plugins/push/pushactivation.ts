import * as API from '../../../ably';
import { IPlatformPushConfig } from 'common/types/IPlatformConfig';
import { ulid } from 'ulid';
import type { ErrCallback, StandardCallback } from 'common/types/utils';
import type ErrorInfo from 'common/lib/types/errorinfo';
import DeviceDetails, { DevicePlatform, DevicePushDetails } from 'common/lib/types/devicedetails';
import { getW3CPushDeviceDetails } from './getW3CDeviceDetails';
import type BaseClient from 'common/lib/client/baseclient';

const persistKeys = {
  deviceId: 'ably.push.deviceId',
  deviceSecret: 'ably.push.deviceSecret',
  deviceIdentityToken: 'ably.push.deviceIdentityToken',
  pushRecipient: 'ably.push.pushRecipient',
  activationState: 'ably.push.activationState',
};

type DeviceRegistration = Required<{
  [K in keyof DeviceDetails]: K extends 'deviceIdentityToken' ? API.TokenDetails : DeviceDetails[K];
}>;

export type RegisterCallback = (device: DeviceDetails, callback: StandardCallback<DeviceRegistration>) => void;
export type DeregisterCallback = (device: DeviceDetails, callback: StandardCallback<string>) => void;

export interface LocalDeviceAuthDetails {
  headers: Record<string, string>;
  params: Record<string, unknown>;
}

export type LocalDeviceFactory = ReturnType<typeof localDeviceFactory>;
export type LocalDevice = ReturnType<LocalDeviceFactory['load']>;

/**
 * LocalDevice extends DeviceDetails, but DeviceDetails is part of core ably-js and LocalDevice is part of the Push plugin
 * In order to avoid bundling the DeviceDetails class in both core ably-js and the plugin, the LocalDevice is exported as
 * a factory, and the DeviceDetails constructor is used to create the class declaration for LocalDevice when the plugin is
 * loaded.
 */
export function localDeviceFactory(deviceDetails: typeof DeviceDetails) {
  return class LocalDevice extends deviceDetails {
    rest: BaseClient;
    push: DevicePushDetails;

    private constructor(rest: BaseClient) {
      super();
      this.push = {};
      this.rest = rest;
    }

    static load(rest: BaseClient) {
      const device = new LocalDevice(rest);
      device.loadPersisted();
      return device;
    }

    loadPersisted() {
      const Platform = this.rest.Platform;
      if (!Platform.Config.push) {
        throw new this.rest.ErrorInfo('Push activation is not available on this platform', 40000, 400);
      }
      this.platform = Platform.Config.push.platform;
      this.clientId = this.rest.auth.clientId ?? undefined;
      this.formFactor = Platform.Config.push.formFactor;
      this.id = Platform.Config.push.storage.get(persistKeys.deviceId);

      if (this.id) {
        this.deviceSecret = Platform.Config.push.storage.get(persistKeys.deviceSecret) || undefined;
        this.deviceIdentityToken = JSON.parse(
          Platform.Config.push.storage.get(persistKeys.deviceIdentityToken) || 'null',
        );
        this.push.recipient = JSON.parse(Platform.Config.push.storage.get(persistKeys.pushRecipient) || 'null');
      } else {
        this.resetId();
      }
    }

    persist() {
      const config = this.rest.Platform.Config;
      if (!config.push) {
        throw new this.rest.ErrorInfo('Push activation is not available on this platform', 40000, 400);
      }
      if (this.id) {
        config.push.storage.set(persistKeys.deviceId, this.id);
      }
      if (this.deviceSecret) {
        config.push.storage.set(persistKeys.deviceSecret, this.deviceSecret);
      }
      if (this.deviceIdentityToken) {
        config.push.storage.set(persistKeys.deviceIdentityToken, JSON.stringify(this.deviceIdentityToken));
      }
      if (this.push.recipient) {
        config.push.storage.set(persistKeys.pushRecipient, JSON.stringify(this.push.recipient));
      }
    }

    resetId() {
      this.id = ulid();
      this.deviceSecret = ulid();
      this.persist();
    }

    getAuthDetails(
      rest: BaseClient,
      headers: Record<string, string>,
      params: Record<string, unknown>,
    ): LocalDeviceAuthDetails {
      if (!this.deviceIdentityToken) {
        throw new this.rest.ErrorInfo('Unable to update device registration; no deviceIdentityToken', 50000, 500);
      }
      if (this.rest.http.supportsAuthHeaders) {
        return {
          headers: rest.Utils.mixin(
            { authorization: 'Bearer ' + rest.Utils.toBase64(this.deviceIdentityToken) },
            headers,
          ) as Record<string, string>,
          params,
        };
      } else {
        return { headers, params: rest.Utils.mixin({ access_token: this.deviceIdentityToken }, params) };
      }
    }
  };
}

export class ActivationStateMachine {
  client: BaseClient;
  current: ActivationState;
  pendingEvents: ActivationEvent[];
  handling: boolean;
  deactivatedCallback?: ErrCallback;
  activatedCallback?: ErrCallback;
  _pushConfig?: IPlatformPushConfig;
  registerCallback?: RegisterCallback;
  deregisterCallback?: DeregisterCallback;
  updateFailedCallback?: ErrCallback;

  // Used for testing
  _pushManager?: PushManager;

  // exported for testing
  GettingPushDeviceDetailsFailed = GettingPushDeviceDetailsFailed;
  GotPushDeviceDetails = GotPushDeviceDetails;

  constructor(rest: BaseClient) {
    this.client = rest;
    this._pushConfig = rest.Platform.Config.push;
    this.current = new ActivationStates[
      (this.pushConfig.storage.get(persistKeys.activationState) as ActivationStateName) || 'NotActivated'
    ](null);
    this.pendingEvents = [];
    this.handling = false;
  }

  get pushConfig() {
    if (!this._pushConfig) {
      throw new this.client.ErrorInfo('This platform is not supported as a target of push notifications', 40000, 400);
    }
    return this._pushConfig;
  }

  persist() {
    if (isPersistentState(this.current)) {
      this.pushConfig.storage.set(persistKeys.activationState, this.current.name);
    }
  }

  callUpdateRegistrationFailedCallback(reason: ErrorInfo) {
    if (this.updateFailedCallback) {
      this.updateFailedCallback(reason);
    } else {
      this.client.Logger.logAction(
        this.client.logger,
        this.client.Logger.LOG_ERROR,
        'UpdateRegistrationFailed',
        'Failed updating device push registration: ' + this.client.Utils.inspectError(reason),
      );
    }
  }

  callCustomRegisterer(device: LocalDevice, isNew: boolean) {
    this.registerCallback?.(device, (error: ErrorInfo, deviceRegistration?: DeviceRegistration) => {
      if (error) {
        if (isNew) {
          this.handleEvent(new GettingDeviceRegistrationFailed(error));
        } else {
          this.handleEvent(new SyncRegistrationFailed(error));
        }
        return;
      }

      if (!deviceRegistration) {
        this.handleEvent(
          new GettingDeviceRegistrationFailed(
            new this.client.ErrorInfo('registerCallback did not return deviceRegistration', 40000, 400),
          ),
        );
      }

      if (isNew) {
        this.handleEvent(new GotDeviceRegistration(deviceRegistration as any));
      } else {
        this.handleEvent(new RegistrationSynced());
      }
    });
  }

  callCustomDeregisterer(device: LocalDevice) {
    this.deregisterCallback?.(device, (err: ErrorInfo) => {
      if (err) {
        this.handleEvent(new DeregistrationFailed(err));
        return;
      }
      this.handleEvent(new Deregistered());
    });
  }

  async updateRegistration() {
    const localDevice = this.client.device as LocalDevice;
    if (this.registerCallback) {
      this.callCustomRegisterer(localDevice, false);
    } else {
      const client = this.client;
      const format = client.options.useBinaryProtocol
          ? this.client.Utils.Format.msgpack
          : this.client.Utils.Format.json,
        body = client.rest.DeviceDetails.fromLocalDevice(localDevice),
        headers = this.client.Defaults.defaultPostHeaders(this.client.options, { format }),
        params = {};

      if (client.options.headers) {
        this.client.Utils.mixin(headers, client.options.headers);
      }

      if (client.options.pushFullWait) {
        this.client.Utils.mixin(params, { fullWait: 'true' });
      }

      const requestBody = this.client.Utils.encodeBody(body, client._MsgPack, format);
      const authDetails = localDevice.getAuthDetails(client, headers, params);
      try {
        const response = await this.client.rest.Resource.patch(
          client,
          '/push/deviceRegistrations',
          requestBody,
          authDetails.headers,
          authDetails.params,
          format,
          true,
        );
        this.handleEvent(new GotDeviceRegistration(response.body as DeviceRegistration));
      } catch (err) {
        this.handleEvent(new GettingDeviceRegistrationFailed(err as ErrorInfo));
      }
    }
  }

  async deregister() {
    const device = this.client.device as LocalDevice;
    if (this.deregisterCallback) {
      this.callCustomDeregisterer(device);
    } else {
      const rest = this.client;
      const format = rest.options.useBinaryProtocol ? this.client.Utils.Format.msgpack : this.client.Utils.Format.json,
        headers = this.client.Defaults.defaultPostHeaders(rest.options, { format }),
        params = { deviceId: device.id };

      if (rest.options.headers) this.client.Utils.mixin(headers, rest.options.headers);

      if (rest.options.pushFullWait) this.client.Utils.mixin(params, { fullWait: 'true' });

      try {
        await this.client.rest.Resource.delete(rest, '/push/deviceRegistrations', headers, params, format, true);
        this.handleEvent(new Deregistered());
      } catch (err) {
        this.handleEvent(new DeregistrationFailed(err as ErrorInfo));
      }
    }
  }

  callActivatedCallback(err: ErrorInfo | null) {
    this.activatedCallback?.(err);
    delete this.activatedCallback;
  }

  callDeactivatedCallback(err: ErrorInfo | null) {
    this.deactivatedCallback?.(err);
    delete this.deactivatedCallback;
  }

  handleEvent(event: ActivationEvent) {
    if (this.handling) {
      this.client.Platform.Config.nextTick(() => {
        this.handleEvent(event);
      });
      return;
    }

    this.handling = true;
    this.client.Logger.logAction(
      this.client.logger,
      this.client.Logger.LOG_MAJOR,
      'Push.ActivationStateMachine.handleEvent()',
      'handling event ' + event.name + ' from ' + this.current.name,
    );

    let maybeNext = this.current.processEvent(this, event);
    if (!maybeNext) {
      this.client.Logger.logAction(
        this.client.logger,
        this.client.Logger.LOG_MAJOR,
        'Push.ActivationStateMachine.handleEvent()',
        'enqueing event: ' + event.name,
      );
      this.pendingEvents.push(event);
      this.handling = false;
      return;
    }

    this.client.Logger.logAction(
      this.client.logger,
      this.client.Logger.LOG_MAJOR,
      'Push.ActivationStateMachine.handleEvent()',
      'transition: ' + this.current.name + ' -(' + event.name + ')-> ' + maybeNext.name,
    );
    this.current = maybeNext;

    while (this.pendingEvents.length > 0) {
      const pending = this.pendingEvents[0];

      this.client.Logger.logAction(
        this.client.logger,
        this.client.Logger.LOG_MAJOR,
        'Push.ActivationStateMachine.handleEvent()',
        'attempting to consume pending event: ' + pending.name,
      );

      maybeNext = this.current.processEvent(this, pending);
      if (!maybeNext) {
        break;
      }
      this.pendingEvents.splice(0, 1);

      this.client.Logger.logAction(
        this.client.logger,
        this.client.Logger.LOG_MAJOR,
        'Push.ActivationStateMachine.handleEvent()',
        'transition: ' + this.current.name + ' -(' + pending.name + ')-> ' + maybeNext.name,
      );
      this.current = maybeNext;
    }

    this.persist();
    this.handling = false;
  }
}

// Events
export class CalledActivate {
  name = 'CalledActivate';

  constructor(machine: ActivationStateMachine, registerCallback?: RegisterCallback) {
    if (registerCallback) {
      machine.registerCallback = registerCallback;
    }
    machine.persist();
  }
}

export class CalledDeactivate {
  name = 'CalledDeactivate';

  constructor(machine: ActivationStateMachine, deregisterCallback?: DeregisterCallback) {
    machine.deregisterCallback = deregisterCallback;
    machine.persist();
  }
}

export class GotPushDeviceDetails {
  name = 'GotPushDeviceDetails';
}

export class GettingPushDeviceDetailsFailed {
  name = 'GettingPushDeviceDetailsFailed';
  reason: ErrorInfo;

  constructor(reason: ErrorInfo) {
    this.reason = reason;
  }
}

class GotDeviceRegistration {
  name = 'GotDeviceRegistration';
  tokenDetails: API.TokenDetails;

  constructor(deviceRegistration: DeviceRegistration) {
    this.tokenDetails = deviceRegistration.deviceIdentityToken;
  }
}

class GettingDeviceRegistrationFailed {
  name = 'GettingDeviceRegistrationFailed';
  reason: ErrorInfo;
  constructor(reason: ErrorInfo) {
    this.reason = reason;
  }
}

class RegistrationSynced {
  name = 'RegistrationSynced';
}

class SyncRegistrationFailed {
  name = 'SyncRegistrationFailed';
  reason: ErrorInfo;

  constructor(reason: ErrorInfo) {
    this.reason = reason;
  }
}

class Deregistered {
  name = 'Deregistered';
}

class DeregistrationFailed {
  name = 'DeregistrationFailed';
  reason: ErrorInfo;
  constructor(reason: ErrorInfo) {
    this.reason = reason;
  }
}

type ActivationEvent =
  | CalledActivate
  | CalledDeactivate
  | GotPushDeviceDetails
  | GettingPushDeviceDetailsFailed
  | GotDeviceRegistration
  | GettingDeviceRegistrationFailed
  | RegistrationSynced
  | SyncRegistrationFailed
  | Deregistered
  | DeregistrationFailed;

// States
abstract class ActivationState {
  name: ActivationStateName;

  constructor(name: ActivationStateName) {
    this.name = name;
  }

  abstract processEvent(machine: ActivationStateMachine, event: ActivationEvent): ActivationState | null;
}

class NotActivated extends ActivationState {
  constructor() {
    super('NotActivated');
  }

  processEvent(machine: ActivationStateMachine, event: ActivationEvent): ActivationState | null {
    if (event instanceof CalledDeactivate) {
      machine.callDeactivatedCallback(null);
      return new NotActivated();
    } else if (event instanceof CalledActivate) {
      const device = machine.client.device as LocalDevice;

      if (device.deviceIdentityToken != null) {
        if (device.clientId && device.clientId !== machine.client.auth.clientId) {
          machine.handleEvent(
            new SyncRegistrationFailed(
              new machine.client.ErrorInfo('clientId not compatible with local device clientId', 61002, 400),
            ),
          );
          return null;
        }
        // Already registered.
        machine.pendingEvents.push(event);
        return new WaitingForNewPushDeviceDetails();
      }

      if (device.push.recipient) {
        machine.pendingEvents.push(new GotPushDeviceDetails());
      } else if (machine.pushConfig.getPushDeviceDetails) {
        machine.pushConfig.getPushDeviceDetails?.(machine);
      } else if (machine.pushConfig.platform === DevicePlatform.Browser) {
        getW3CPushDeviceDetails(machine);
      } else {
        machine.handleEvent(
          new GettingPushDeviceDetailsFailed(
            new machine.client.ErrorInfo('No available implementation to get push device details', 50000, 500),
          ),
        );
      }

      return new WaitingForPushDeviceDetails();
    } else if (event instanceof GotPushDeviceDetails) {
      return new NotActivated();
    }
    return null;
  }
}

class WaitingForPushDeviceDetails extends ActivationState {
  constructor() {
    super('WaitingForPushDeviceDetails');
  }

  processEvent(machine: ActivationStateMachine, event: ActivationEvent) {
    if (event instanceof CalledActivate) {
      return new WaitingForPushDeviceDetails();
    } else if (event instanceof CalledDeactivate) {
      machine.callDeactivatedCallback(null);
      return new NotActivated();
    } else if (event instanceof GotPushDeviceDetails) {
      const client = machine.client;
      const device = client.device as LocalDevice;

      if (machine.registerCallback) {
        machine.callCustomRegisterer(device, true);
      } else {
        const format = client.options.useBinaryProtocol
            ? machine.client.Utils.Format.msgpack
            : machine.client.Utils.Format.json,
          body = client.rest.DeviceDetails.fromLocalDevice(device),
          headers = machine.client.Defaults.defaultPostHeaders(client.options, { format }),
          params = {};

        if (client.options.headers) machine.client.Utils.mixin(headers, client.options.headers);

        if (client.options.pushFullWait) machine.client.Utils.mixin(params, { fullWait: 'true' });

        const requestBody = machine.client.Utils.encodeBody(body, client._MsgPack, format);

        machine.client.rest.Resource.post(client, '/push/deviceRegistrations', requestBody, headers, params, null, true)
          .then((response) => {
            const deviceDetails = response.unpacked
              ? response.body
              : client.rest.DeviceDetails.fromResponseBody(response.body as any, client._MsgPack, format);
            machine.handleEvent(new GotDeviceRegistration(deviceDetails as DeviceRegistration));
          })
          .catch((err) => {
            machine.handleEvent(new GettingDeviceRegistrationFailed(err as ErrorInfo));
          });
      }

      return new WaitingForDeviceRegistration();
    } else if (event instanceof GettingPushDeviceDetailsFailed) {
      machine.callActivatedCallback(event.reason);
      return new NotActivated();
    }
    return null;
  }
}

class WaitingForDeviceRegistration extends ActivationState {
  constructor() {
    super('WaitingForDeviceRegistration');
  }

  processEvent(machine: ActivationStateMachine, event: ActivationEvent) {
    if (event instanceof CalledActivate) {
      return new WaitingForDeviceRegistration();
    } else if (event instanceof GotDeviceRegistration) {
      const device = machine.client.device as LocalDevice;
      device.deviceIdentityToken = event.tokenDetails.token;
      device.persist();
      machine.callActivatedCallback(null);
      return new WaitingForNewPushDeviceDetails();
    } else if (event instanceof GettingDeviceRegistrationFailed) {
      machine.callActivatedCallback(event.reason);
      return new NotActivated();
    }
    return null;
  }
}

class WaitingForNewPushDeviceDetails extends ActivationState {
  constructor() {
    super('WaitingForNewPushDeviceDetails');
  }

  processEvent(machine: ActivationStateMachine, event: ActivationEvent) {
    if (event instanceof CalledActivate) {
      machine.callActivatedCallback(null);
      return new WaitingForNewPushDeviceDetails();
    } else if (event instanceof CalledDeactivate) {
      machine.deregister();
      return new WaitingForDeregistration(this);
    } else if (event instanceof GotPushDeviceDetails) {
      machine.updateRegistration();
      return new WaitingForRegistrationSync();
    }
    return null;
  }
}

class WaitingForRegistrationSync extends ActivationState {
  triggeredByCalledActivate: boolean | null;

  constructor(triggeredByCalledActivate: boolean | null = false) {
    super('WaitingForRegistrationSync');
    this.triggeredByCalledActivate = triggeredByCalledActivate;
  }

  processEvent(machine: ActivationStateMachine, event: ActivationEvent) {
    if (event instanceof CalledActivate && !this.triggeredByCalledActivate) {
      machine.callActivatedCallback(null);
      return new WaitingForRegistrationSync(true);
    } else if (event instanceof RegistrationSynced) {
      return new WaitingForNewPushDeviceDetails();
    } else if (event instanceof SyncRegistrationFailed) {
      machine.callUpdateRegistrationFailedCallback(event.reason);
      return new AfterRegistrationSyncFailed();
    }
    return null;
  }
}

class AfterRegistrationSyncFailed extends ActivationState {
  constructor() {
    super('AfterRegistrationSyncFailed');
  }

  processEvent(machine: ActivationStateMachine, event: ActivationEvent) {
    if (event instanceof CalledActivate || event instanceof GotPushDeviceDetails) {
      machine.updateRegistration();
      return new WaitingForRegistrationSync(event instanceof CalledActivate);
    } else if (event instanceof CalledDeactivate) {
      machine.deregister();
      return new WaitingForDeregistration(this);
    }
    return null;
  }
}

class WaitingForDeregistration extends ActivationState {
  previousState: ActivationState | null;

  constructor(previousState: ActivationState | null) {
    super('WaitingForDeregistration');
    this.previousState = previousState;
  }

  processEvent(machine: ActivationStateMachine, event: ActivationEvent): ActivationState | null {
    if (event instanceof CalledDeactivate) {
      return new WaitingForDeregistration(this.previousState);
    } else if (event instanceof Deregistered) {
      const device = machine.client.device as LocalDevice;
      delete device.deviceIdentityToken;
      delete device.push.recipient;
      device.resetId();
      device.persist();
      machine.callDeactivatedCallback(null);
      return new NotActivated();
    } else if (event instanceof DeregistrationFailed) {
      machine.callDeactivatedCallback(event.reason);
      return this.previousState;
    }
    return null;
  }
}

type ActivationStateName =
  | 'NotActivated'
  | 'WaitingForPushDeviceDetails'
  | 'WaitingForDeviceRegistration'
  | 'WaitingForNewPushDeviceDetails'
  | 'WaitingForRegistrationSync'
  | 'AfterRegistrationSyncFailed'
  | 'WaitingForDeregistration';

export const ActivationStates = {
  NotActivated,
  WaitingForPushDeviceDetails,
  WaitingForDeviceRegistration,
  WaitingForNewPushDeviceDetails,
  WaitingForRegistrationSync,
  AfterRegistrationSyncFailed,
  WaitingForDeregistration,
};

function isPersistentState(state: ActivationState) {
  return state.name == 'NotActivated' || state.name == 'WaitingForNewPushDeviceDetails';
}
