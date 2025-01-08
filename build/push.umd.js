/*@license Copyright 2015-2022 Ably Real-time Ltd (ably.com)

Ably JavaScript Library v2.6.0
https://github.com/ably/ably-js

Released under the Apache Licence v2.0*/(function (g, f) {
    if ("object" == typeof exports && "object" == typeof module) {
      module.exports = f();
    } else if ("function" == typeof define && define.amd) {
      define([], f);
    } else if ("object" == typeof exports) {
      exports["AblyPushPlugin"] = f();
    } else {
      g["AblyPushPlugin"] = f();
    }
  }(this, () => {
var exports = {};
var module = { exports };
"use strict";
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/ulid/stubs/crypto.js
var require_crypto = __commonJS({
  "node_modules/ulid/stubs/crypto.js"() {
  }
});

// src/plugins/push/index.ts
var push_exports = {};
__export(push_exports, {
  ActivationStateMachine: () => ActivationStateMachine,
  CalledActivate: () => CalledActivate,
  CalledDeactivate: () => CalledDeactivate,
  PushChannel: () => pushchannel_default,
  default: () => push_default,
  getW3CPushDeviceDetails: () => getW3CPushDeviceDetails,
  localDeviceFactory: () => localDeviceFactory
});
module.exports = __toCommonJS(push_exports);

// src/plugins/push/pushchannel.ts
var PushChannel = class {
  constructor(channel) {
    this.channel = channel;
    this.client = channel.client;
  }
  async subscribeDevice() {
    const client = this.client;
    const device = client.device;
    const format = client.options.useBinaryProtocol ? client.Utils.Format.msgpack : client.Utils.Format.json, body = { deviceId: device.id, channel: this.channel.name }, headers = client.Defaults.defaultPostHeaders(client.options, { format });
    if (client.options.headers)
      client.Utils.mixin(headers, client.options.headers);
    client.Utils.mixin(headers, this._getPushAuthHeaders());
    const requestBody = client.Utils.encodeBody(body, client._MsgPack, format);
    await client.rest.Resource.post(client, "/push/channelSubscriptions", requestBody, headers, {}, format, true);
  }
  async unsubscribeDevice() {
    const client = this.client;
    const device = client.device;
    const format = client.options.useBinaryProtocol ? client.Utils.Format.msgpack : client.Utils.Format.json, headers = client.Defaults.defaultPostHeaders(client.options, { format });
    if (client.options.headers)
      client.Utils.mixin(headers, client.options.headers);
    client.Utils.mixin(headers, this._getPushAuthHeaders());
    await client.rest.Resource.delete(
      client,
      "/push/channelSubscriptions",
      headers,
      { deviceId: device.id, channel: this.channel.name },
      format,
      true
    );
  }
  async subscribeClient() {
    const client = this.client;
    const clientId = this.client.auth.clientId;
    if (!clientId) {
      throw new this.client.ErrorInfo("Cannot subscribe from client without client ID", 5e4, 500);
    }
    const format = client.options.useBinaryProtocol ? client.Utils.Format.msgpack : client.Utils.Format.json, body = { clientId, channel: this.channel.name }, headers = client.Defaults.defaultPostHeaders(client.options, { format });
    if (client.options.headers)
      client.Utils.mixin(headers, client.options.headers);
    const requestBody = client.Utils.encodeBody(body, client._MsgPack, format);
    await client.rest.Resource.post(client, "/push/channelSubscriptions", requestBody, headers, {}, format, true);
  }
  async unsubscribeClient() {
    const client = this.client;
    const clientId = this.client.auth.clientId;
    if (!clientId) {
      throw new this.client.ErrorInfo("Cannot unsubscribe from client without client ID", 5e4, 500);
    }
    const format = client.options.useBinaryProtocol ? client.Utils.Format.msgpack : client.Utils.Format.json, headers = client.Defaults.defaultPostHeaders(client.options, { format });
    if (client.options.headers)
      client.Utils.mixin(headers, client.options.headers);
    await client.rest.Resource.delete(
      client,
      "/push/channelSubscriptions",
      headers,
      { clientId, channel: this.channel.name },
      format,
      true
    );
  }
  async listSubscriptions(params) {
    this.client.Logger.logAction(
      this.client.logger,
      this.client.Logger.LOG_MICRO,
      "PushChannel.listSubscriptions()",
      "channel = " + this.channel.name
    );
    return this.client.push.admin.channelSubscriptions.list(__spreadProps(__spreadValues({}, params), {
      channel: this.channel.name,
      concatFilters: true
    }));
  }
  _getDeviceIdentityToken() {
    const device = this.client.device;
    const deviceIdentityToken = device.deviceIdentityToken;
    if (deviceIdentityToken) {
      return deviceIdentityToken;
    } else {
      throw new this.client.ErrorInfo("Cannot subscribe from client without deviceIdentityToken", 5e4, 500);
    }
  }
  _getPushAuthHeaders() {
    const deviceIdentityToken = this._getDeviceIdentityToken();
    return { "X-Ably-DeviceToken": deviceIdentityToken };
  }
};
var pushchannel_default = PushChannel;

// src/plugins/push/getW3CDeviceDetails.ts
function toBase64Url(arrayBuffer) {
  const buffer = new Uint8Array(arrayBuffer.slice(0, arrayBuffer.byteLength));
  return btoa(String.fromCharCode.apply(null, Array.from(buffer)));
}
function urlBase64ToBase64(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  return base64;
}
function base64ToUint8Array(base64String) {
  const rawData = window.atob(base64String);
  const rawDataChars = [];
  for (let i = 0; i < rawData.length; i++) {
    rawDataChars.push(rawData[i].charCodeAt(0));
  }
  return Uint8Array.from(rawDataChars);
}
async function getW3CPushDeviceDetails(machine) {
  const GettingPushDeviceDetailsFailed2 = machine.GettingPushDeviceDetailsFailed;
  const GotPushDeviceDetails2 = machine.GotPushDeviceDetails;
  const { ErrorInfo: ErrorInfo2, Defaults } = machine.client;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    machine.handleEvent(
      new GettingPushDeviceDetailsFailed2(new ErrorInfo2("User denied permission to send notifications", 400, 4e4))
    );
    return;
  }
  const swUrl = machine.client.options.pushServiceWorkerUrl;
  if (!swUrl) {
    machine.handleEvent(
      new GettingPushDeviceDetailsFailed2(new ErrorInfo2("Missing ClientOptions.pushServiceWorkerUrl", 400, 4e4))
    );
    return;
  }
  try {
    const worker = await navigator.serviceWorker.register(swUrl);
    machine._pushManager = worker.pushManager;
    const headers = Defaults.defaultGetHeaders(machine.client.options, { format: "text" });
    const appServerKey = (await machine.client.rest.Resource.get(machine.client, "/push/publicVapidKey", headers, {}, null, true)).body;
    if (!worker.active) {
      await navigator.serviceWorker.ready;
    }
    const subscription = await worker.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(urlBase64ToBase64(appServerKey))
    });
    const endpoint = subscription.endpoint;
    const [p256dh, auth] = [subscription.getKey("p256dh"), subscription.getKey("auth")];
    if (!p256dh || !auth) {
      throw new ErrorInfo2("Public key not found", 5e4, 500);
    }
    const device = machine.client.device;
    device.push.recipient = {
      transportType: "web",
      targetUrl: btoa(endpoint),
      publicVapidKey: appServerKey,
      encryptionKey: {
        p256dh: toBase64Url(p256dh),
        auth: toBase64Url(auth)
      }
    };
    device.persist();
    machine.handleEvent(new GotPushDeviceDetails2());
  } catch (err) {
    machine.handleEvent(
      new GettingPushDeviceDetailsFailed2(new ErrorInfo2("Failed to register service worker", 5e4, 500, err))
    );
  }
}

// node_modules/ulid/dist/index.esm.js
function createError(message) {
  var err = new Error(message);
  err.source = "ulid";
  return err;
}
var ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
var ENCODING_LEN = ENCODING.length;
var TIME_MAX = Math.pow(2, 48) - 1;
var TIME_LEN = 10;
var RANDOM_LEN = 16;
function randomChar(prng) {
  var rand = Math.floor(prng() * ENCODING_LEN);
  if (rand === ENCODING_LEN) {
    rand = ENCODING_LEN - 1;
  }
  return ENCODING.charAt(rand);
}
function encodeTime(now, len) {
  if (isNaN(now)) {
    throw new Error(now + " must be a number");
  }
  if (now > TIME_MAX) {
    throw createError("cannot encode time greater than " + TIME_MAX);
  }
  if (now < 0) {
    throw createError("time must be positive");
  }
  if (Number.isInteger(now) === false) {
    throw createError("time must be an integer");
  }
  var mod = void 0;
  var str = "";
  for (; len > 0; len--) {
    mod = now % ENCODING_LEN;
    str = ENCODING.charAt(mod) + str;
    now = (now - mod) / ENCODING_LEN;
  }
  return str;
}
function encodeRandom(len, prng) {
  var str = "";
  for (; len > 0; len--) {
    str = randomChar(prng) + str;
  }
  return str;
}
function detectPrng() {
  var allowInsecure = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : false;
  var root = arguments[1];
  if (!root) {
    root = typeof window !== "undefined" ? window : null;
  }
  var browserCrypto = root && (root.crypto || root.msCrypto);
  if (browserCrypto) {
    return function() {
      var buffer = new Uint8Array(1);
      browserCrypto.getRandomValues(buffer);
      return buffer[0] / 255;
    };
  } else {
    try {
      var nodeCrypto = require_crypto();
      return function() {
        return nodeCrypto.randomBytes(1).readUInt8() / 255;
      };
    } catch (e) {
    }
  }
  if (allowInsecure) {
    try {
      console.error("secure crypto unusable, falling back to insecure Math.random()!");
    } catch (e) {
    }
    return function() {
      return Math.random();
    };
  }
  throw createError("secure crypto unusable, insecure Math.random not allowed");
}
function factory(currPrng) {
  if (!currPrng) {
    currPrng = detectPrng();
  }
  return function ulid2(seedTime) {
    if (isNaN(seedTime)) {
      seedTime = Date.now();
    }
    return encodeTime(seedTime, TIME_LEN) + encodeRandom(RANDOM_LEN, currPrng);
  };
}
var ulid = factory();

// src/plugins/push/pushactivation.ts
var persistKeys = {
  deviceId: "ably.push.deviceId",
  deviceSecret: "ably.push.deviceSecret",
  deviceIdentityToken: "ably.push.deviceIdentityToken",
  pushRecipient: "ably.push.pushRecipient",
  activationState: "ably.push.activationState"
};
function localDeviceFactory(deviceDetails) {
  return class LocalDevice extends deviceDetails {
    constructor(rest) {
      super();
      this.push = {};
      this.rest = rest;
    }
    static load(rest) {
      const device = new LocalDevice(rest);
      device.loadPersisted();
      return device;
    }
    loadPersisted() {
      var _a;
      const Platform2 = this.rest.Platform;
      if (!Platform2.Config.push) {
        throw new this.rest.ErrorInfo("Push activation is not available on this platform", 4e4, 400);
      }
      this.platform = Platform2.Config.push.platform;
      this.clientId = (_a = this.rest.auth.clientId) != null ? _a : void 0;
      this.formFactor = Platform2.Config.push.formFactor;
      this.id = Platform2.Config.push.storage.get(persistKeys.deviceId);
      if (this.id) {
        this.deviceSecret = Platform2.Config.push.storage.get(persistKeys.deviceSecret) || void 0;
        this.deviceIdentityToken = JSON.parse(
          Platform2.Config.push.storage.get(persistKeys.deviceIdentityToken) || "null"
        );
        this.push.recipient = JSON.parse(Platform2.Config.push.storage.get(persistKeys.pushRecipient) || "null");
      } else {
        this.resetId();
      }
    }
    persist() {
      const config = this.rest.Platform.Config;
      if (!config.push) {
        throw new this.rest.ErrorInfo("Push activation is not available on this platform", 4e4, 400);
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
    getAuthDetails(rest, headers, params) {
      if (!this.deviceIdentityToken) {
        throw new this.rest.ErrorInfo("Unable to update device registration; no deviceIdentityToken", 5e4, 500);
      }
      if (this.rest.http.supportsAuthHeaders) {
        return {
          headers: rest.Utils.mixin(
            { authorization: "Bearer " + rest.Utils.toBase64(this.deviceIdentityToken) },
            headers
          ),
          params
        };
      } else {
        return { headers, params: rest.Utils.mixin({ access_token: this.deviceIdentityToken }, params) };
      }
    }
  };
}
var ActivationStateMachine = class {
  constructor(rest) {
    // exported for testing
    this.GettingPushDeviceDetailsFailed = GettingPushDeviceDetailsFailed;
    this.GotPushDeviceDetails = GotPushDeviceDetails;
    this.client = rest;
    this._pushConfig = rest.Platform.Config.push;
    this.current = new ActivationStates[this.pushConfig.storage.get(persistKeys.activationState) || "NotActivated"](null);
    this.pendingEvents = [];
    this.handling = false;
  }
  get pushConfig() {
    if (!this._pushConfig) {
      throw new this.client.ErrorInfo("This platform is not supported as a target of push notifications", 4e4, 400);
    }
    return this._pushConfig;
  }
  persist() {
    if (isPersistentState(this.current)) {
      this.pushConfig.storage.set(persistKeys.activationState, this.current.name);
    }
  }
  callUpdateRegistrationFailedCallback(reason) {
    if (this.updateFailedCallback) {
      this.updateFailedCallback(reason);
    } else {
      this.client.Logger.logAction(
        this.client.logger,
        this.client.Logger.LOG_ERROR,
        "UpdateRegistrationFailed",
        "Failed updating device push registration: " + this.client.Utils.inspectError(reason)
      );
    }
  }
  callCustomRegisterer(device, isNew) {
    var _a;
    (_a = this.registerCallback) == null ? void 0 : _a.call(this, device, (error, deviceRegistration) => {
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
            new this.client.ErrorInfo("registerCallback did not return deviceRegistration", 4e4, 400)
          )
        );
      }
      if (isNew) {
        this.handleEvent(new GotDeviceRegistration(deviceRegistration));
      } else {
        this.handleEvent(new RegistrationSynced());
      }
    });
  }
  callCustomDeregisterer(device) {
    var _a;
    (_a = this.deregisterCallback) == null ? void 0 : _a.call(this, device, (err) => {
      if (err) {
        this.handleEvent(new DeregistrationFailed(err));
        return;
      }
      this.handleEvent(new Deregistered());
    });
  }
  async updateRegistration() {
    const localDevice = this.client.device;
    if (this.registerCallback) {
      this.callCustomRegisterer(localDevice, false);
    } else {
      const client = this.client;
      const format = client.options.useBinaryProtocol ? this.client.Utils.Format.msgpack : this.client.Utils.Format.json, body = client.rest.DeviceDetails.fromLocalDevice(localDevice), headers = this.client.Defaults.defaultPostHeaders(this.client.options, { format }), params = {};
      if (client.options.headers) {
        this.client.Utils.mixin(headers, client.options.headers);
      }
      if (client.options.pushFullWait) {
        this.client.Utils.mixin(params, { fullWait: "true" });
      }
      const requestBody = this.client.Utils.encodeBody(body, client._MsgPack, format);
      const authDetails = localDevice.getAuthDetails(client, headers, params);
      try {
        const response = await this.client.rest.Resource.patch(
          client,
          "/push/deviceRegistrations",
          requestBody,
          authDetails.headers,
          authDetails.params,
          format,
          true
        );
        this.handleEvent(new GotDeviceRegistration(response.body));
      } catch (err) {
        this.handleEvent(new GettingDeviceRegistrationFailed(err));
      }
    }
  }
  async deregister() {
    const device = this.client.device;
    if (this.deregisterCallback) {
      this.callCustomDeregisterer(device);
    } else {
      const rest = this.client;
      const format = rest.options.useBinaryProtocol ? this.client.Utils.Format.msgpack : this.client.Utils.Format.json, headers = this.client.Defaults.defaultPostHeaders(rest.options, { format }), params = { deviceId: device.id };
      if (rest.options.headers)
        this.client.Utils.mixin(headers, rest.options.headers);
      if (rest.options.pushFullWait)
        this.client.Utils.mixin(params, { fullWait: "true" });
      try {
        await this.client.rest.Resource.delete(rest, "/push/deviceRegistrations", headers, params, format, true);
        this.handleEvent(new Deregistered());
      } catch (err) {
        this.handleEvent(new DeregistrationFailed(err));
      }
    }
  }
  callActivatedCallback(err) {
    var _a;
    (_a = this.activatedCallback) == null ? void 0 : _a.call(this, err);
    delete this.activatedCallback;
  }
  callDeactivatedCallback(err) {
    var _a;
    (_a = this.deactivatedCallback) == null ? void 0 : _a.call(this, err);
    delete this.deactivatedCallback;
  }
  handleEvent(event) {
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
      "Push.ActivationStateMachine.handleEvent()",
      "handling event " + event.name + " from " + this.current.name
    );
    let maybeNext = this.current.processEvent(this, event);
    if (!maybeNext) {
      this.client.Logger.logAction(
        this.client.logger,
        this.client.Logger.LOG_MAJOR,
        "Push.ActivationStateMachine.handleEvent()",
        "enqueing event: " + event.name
      );
      this.pendingEvents.push(event);
      this.handling = false;
      return;
    }
    this.client.Logger.logAction(
      this.client.logger,
      this.client.Logger.LOG_MAJOR,
      "Push.ActivationStateMachine.handleEvent()",
      "transition: " + this.current.name + " -(" + event.name + ")-> " + maybeNext.name
    );
    this.current = maybeNext;
    while (this.pendingEvents.length > 0) {
      const pending = this.pendingEvents[0];
      this.client.Logger.logAction(
        this.client.logger,
        this.client.Logger.LOG_MAJOR,
        "Push.ActivationStateMachine.handleEvent()",
        "attempting to consume pending event: " + pending.name
      );
      maybeNext = this.current.processEvent(this, pending);
      if (!maybeNext) {
        break;
      }
      this.pendingEvents.splice(0, 1);
      this.client.Logger.logAction(
        this.client.logger,
        this.client.Logger.LOG_MAJOR,
        "Push.ActivationStateMachine.handleEvent()",
        "transition: " + this.current.name + " -(" + pending.name + ")-> " + maybeNext.name
      );
      this.current = maybeNext;
    }
    this.persist();
    this.handling = false;
  }
};
var CalledActivate = class {
  constructor(machine, registerCallback) {
    this.name = "CalledActivate";
    if (registerCallback) {
      machine.registerCallback = registerCallback;
    }
    machine.persist();
  }
};
var CalledDeactivate = class {
  constructor(machine, deregisterCallback) {
    this.name = "CalledDeactivate";
    machine.deregisterCallback = deregisterCallback;
    machine.persist();
  }
};
var GotPushDeviceDetails = class {
  constructor() {
    this.name = "GotPushDeviceDetails";
  }
};
var GettingPushDeviceDetailsFailed = class {
  constructor(reason) {
    this.name = "GettingPushDeviceDetailsFailed";
    this.reason = reason;
  }
};
var GotDeviceRegistration = class {
  constructor(deviceRegistration) {
    this.name = "GotDeviceRegistration";
    this.tokenDetails = deviceRegistration.deviceIdentityToken;
  }
};
var GettingDeviceRegistrationFailed = class {
  constructor(reason) {
    this.name = "GettingDeviceRegistrationFailed";
    this.reason = reason;
  }
};
var RegistrationSynced = class {
  constructor() {
    this.name = "RegistrationSynced";
  }
};
var SyncRegistrationFailed = class {
  constructor(reason) {
    this.name = "SyncRegistrationFailed";
    this.reason = reason;
  }
};
var Deregistered = class {
  constructor() {
    this.name = "Deregistered";
  }
};
var DeregistrationFailed = class {
  constructor(reason) {
    this.name = "DeregistrationFailed";
    this.reason = reason;
  }
};
var ActivationState = class {
  constructor(name) {
    this.name = name;
  }
};
var NotActivated = class _NotActivated extends ActivationState {
  constructor() {
    super("NotActivated");
  }
  processEvent(machine, event) {
    var _a, _b;
    if (event instanceof CalledDeactivate) {
      machine.callDeactivatedCallback(null);
      return new _NotActivated();
    } else if (event instanceof CalledActivate) {
      const device = machine.client.device;
      if (device.deviceIdentityToken != null) {
        if (device.clientId && device.clientId !== machine.client.auth.clientId) {
          machine.handleEvent(
            new SyncRegistrationFailed(
              new machine.client.ErrorInfo("clientId not compatible with local device clientId", 61002, 400)
            )
          );
          return null;
        }
        machine.pendingEvents.push(event);
        return new WaitingForNewPushDeviceDetails();
      }
      if (device.push.recipient) {
        machine.pendingEvents.push(new GotPushDeviceDetails());
      } else if (machine.pushConfig.getPushDeviceDetails) {
        (_b = (_a = machine.pushConfig).getPushDeviceDetails) == null ? void 0 : _b.call(_a, machine);
      } else if (machine.pushConfig.platform === "browser" /* Browser */) {
        getW3CPushDeviceDetails(machine);
      } else {
        machine.handleEvent(
          new GettingPushDeviceDetailsFailed(
            new machine.client.ErrorInfo("No available implementation to get push device details", 5e4, 500)
          )
        );
      }
      return new WaitingForPushDeviceDetails();
    } else if (event instanceof GotPushDeviceDetails) {
      return new _NotActivated();
    }
    return null;
  }
};
var WaitingForPushDeviceDetails = class _WaitingForPushDeviceDetails extends ActivationState {
  constructor() {
    super("WaitingForPushDeviceDetails");
  }
  processEvent(machine, event) {
    if (event instanceof CalledActivate) {
      return new _WaitingForPushDeviceDetails();
    } else if (event instanceof CalledDeactivate) {
      machine.callDeactivatedCallback(null);
      return new NotActivated();
    } else if (event instanceof GotPushDeviceDetails) {
      const client = machine.client;
      const device = client.device;
      if (machine.registerCallback) {
        machine.callCustomRegisterer(device, true);
      } else {
        const format = client.options.useBinaryProtocol ? machine.client.Utils.Format.msgpack : machine.client.Utils.Format.json, body = client.rest.DeviceDetails.fromLocalDevice(device), headers = machine.client.Defaults.defaultPostHeaders(client.options, { format }), params = {};
        if (client.options.headers)
          machine.client.Utils.mixin(headers, client.options.headers);
        if (client.options.pushFullWait)
          machine.client.Utils.mixin(params, { fullWait: "true" });
        const requestBody = machine.client.Utils.encodeBody(body, client._MsgPack, format);
        machine.client.rest.Resource.post(client, "/push/deviceRegistrations", requestBody, headers, params, null, true).then((response) => {
          const deviceDetails = response.unpacked ? response.body : client.rest.DeviceDetails.fromResponseBody(response.body, client._MsgPack, format);
          machine.handleEvent(new GotDeviceRegistration(deviceDetails));
        }).catch((err) => {
          machine.handleEvent(new GettingDeviceRegistrationFailed(err));
        });
      }
      return new WaitingForDeviceRegistration();
    } else if (event instanceof GettingPushDeviceDetailsFailed) {
      machine.callActivatedCallback(event.reason);
      return new NotActivated();
    }
    return null;
  }
};
var WaitingForDeviceRegistration = class _WaitingForDeviceRegistration extends ActivationState {
  constructor() {
    super("WaitingForDeviceRegistration");
  }
  processEvent(machine, event) {
    if (event instanceof CalledActivate) {
      return new _WaitingForDeviceRegistration();
    } else if (event instanceof GotDeviceRegistration) {
      const device = machine.client.device;
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
};
var WaitingForNewPushDeviceDetails = class _WaitingForNewPushDeviceDetails extends ActivationState {
  constructor() {
    super("WaitingForNewPushDeviceDetails");
  }
  processEvent(machine, event) {
    if (event instanceof CalledActivate) {
      machine.callActivatedCallback(null);
      return new _WaitingForNewPushDeviceDetails();
    } else if (event instanceof CalledDeactivate) {
      machine.deregister();
      return new WaitingForDeregistration(this);
    } else if (event instanceof GotPushDeviceDetails) {
      machine.updateRegistration();
      return new WaitingForRegistrationSync();
    }
    return null;
  }
};
var WaitingForRegistrationSync = class _WaitingForRegistrationSync extends ActivationState {
  constructor(triggeredByCalledActivate = false) {
    super("WaitingForRegistrationSync");
    this.triggeredByCalledActivate = triggeredByCalledActivate;
  }
  processEvent(machine, event) {
    if (event instanceof CalledActivate && !this.triggeredByCalledActivate) {
      machine.callActivatedCallback(null);
      return new _WaitingForRegistrationSync(true);
    } else if (event instanceof RegistrationSynced) {
      return new WaitingForNewPushDeviceDetails();
    } else if (event instanceof SyncRegistrationFailed) {
      machine.callUpdateRegistrationFailedCallback(event.reason);
      return new AfterRegistrationSyncFailed();
    }
    return null;
  }
};
var AfterRegistrationSyncFailed = class extends ActivationState {
  constructor() {
    super("AfterRegistrationSyncFailed");
  }
  processEvent(machine, event) {
    if (event instanceof CalledActivate || event instanceof GotPushDeviceDetails) {
      machine.updateRegistration();
      return new WaitingForRegistrationSync(event instanceof CalledActivate);
    } else if (event instanceof CalledDeactivate) {
      machine.deregister();
      return new WaitingForDeregistration(this);
    }
    return null;
  }
};
var WaitingForDeregistration = class _WaitingForDeregistration extends ActivationState {
  constructor(previousState) {
    super("WaitingForDeregistration");
    this.previousState = previousState;
  }
  processEvent(machine, event) {
    if (event instanceof CalledDeactivate) {
      return new _WaitingForDeregistration(this.previousState);
    } else if (event instanceof Deregistered) {
      const device = machine.client.device;
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
};
var ActivationStates = {
  NotActivated,
  WaitingForPushDeviceDetails,
  WaitingForDeviceRegistration,
  WaitingForNewPushDeviceDetails,
  WaitingForRegistrationSync,
  AfterRegistrationSyncFailed,
  WaitingForDeregistration
};
function isPersistentState(state) {
  return state.name == "NotActivated" || state.name == "WaitingForNewPushDeviceDetails";
}

// src/plugins/push/index.ts
var push_default = {
  ActivationStateMachine,
  localDeviceFactory,
  CalledActivate,
  CalledDeactivate,
  PushChannel: pushchannel_default,
  getW3CPushDeviceDetails
};
if (typeof module.exports == "object" && typeof exports == "object") {
  var __cp = (to, from, except, desc) => {
    if ((from && typeof from === "object") || typeof from === "function") {
      for (let key of Object.getOwnPropertyNames(from)) {
        if (!Object.prototype.hasOwnProperty.call(to, key) && key !== except)
        Object.defineProperty(to, key, {
          get: () => from[key],
          enumerable: !(desc = Object.getOwnPropertyDescriptor(from, key)) || desc.enumerable,
        });
      }
    }
    return to;
  };
  module.exports = __cp(module.exports, exports);
}
return module.exports;
}))
//# sourceMappingURL=push.umd.js.map
