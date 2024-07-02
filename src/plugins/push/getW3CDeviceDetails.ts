import { ActivationStateMachine } from 'plugins/push/pushactivation';

function toBase64Url(arrayBuffer: ArrayBuffer) {
  const buffer = new Uint8Array(arrayBuffer.slice(0, arrayBuffer.byteLength));
  return btoa(String.fromCharCode.apply(null, Array.from(buffer)));
}

function urlBase64ToBase64(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  return base64;
}

function base64ToUint8Array(base64String: string) {
  const rawData = window.atob(base64String);
  const rawDataChars = [];
  for (let i = 0; i < rawData.length; i++) {
    rawDataChars.push(rawData[i].charCodeAt(0));
  }
  return Uint8Array.from(rawDataChars);
}

export async function getW3CPushDeviceDetails(machine: ActivationStateMachine) {
  const GettingPushDeviceDetailsFailed = machine.GettingPushDeviceDetailsFailed;
  const GotPushDeviceDetails = machine.GotPushDeviceDetails;
  const { ErrorInfo, Defaults } = machine.client;

  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    machine.handleEvent(
      new GettingPushDeviceDetailsFailed(new ErrorInfo('User denied permission to send notifications', 400, 40000)),
    );
    return;
  }

  const swUrl = machine.client.options.pushServiceWorkerUrl;
  if (!swUrl) {
    machine.handleEvent(
      new GettingPushDeviceDetailsFailed(new ErrorInfo('Missing ClientOptions.pushServiceWorkerUrl', 400, 40000)),
    );
    return;
  }

  try {
    const worker = await navigator.serviceWorker.register(swUrl);

    machine._pushManager = worker.pushManager;

    const headers = Defaults.defaultGetHeaders(machine.client.options, { format: 'text' });
    const appServerKey = (
      await machine.client.rest.Resource.get(machine.client, '/push/publicVapidKey', headers, {}, null, true)
    ).body as string;

    if (!worker.active) {
      await navigator.serviceWorker.ready;
    }

    const subscription = await worker.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(urlBase64ToBase64(appServerKey)),
    });

    const endpoint = subscription.endpoint;

    const [p256dh, auth] = [subscription.getKey('p256dh'), subscription.getKey('auth')];

    if (!p256dh || !auth) {
      throw new ErrorInfo('Public key not found', 50000, 500);
    }

    const device = machine.client.device;
    device.push.recipient = {
      transportType: 'web',
      targetUrl: btoa(endpoint),
      publicVapidKey: appServerKey,
      encryptionKey: {
        p256dh: toBase64Url(p256dh),
        auth: toBase64Url(auth),
      },
    };
    device.persist();

    machine.handleEvent(new GotPushDeviceDetails());
  } catch (err) {
    machine.handleEvent(
      new GettingPushDeviceDetailsFailed(new ErrorInfo('Failed to register service worker', 50000, 500, err as Error)),
    );
  }
}
