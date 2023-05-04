import * as Utils from 'common/lib/util/utils';
import CometTransport from 'common/lib/transport/comettransport';
import Platform from 'common/platform';
import EventEmitter from 'common/lib/util/eventemitter';
import ErrorInfo, { IPartialErrorInfo, PartialErrorInfo } from 'common/lib/types/errorinfo';
import Defaults from 'common/lib/util/defaults';
import Logger from 'common/lib/util/logger';
import Auth from 'common/lib/client/auth';
import HttpMethods from 'common/constants/HttpMethods';
import { RequestParams } from 'common/types/http';
import ConnectionManager, { TransportParams } from 'common/lib/transport/connectionmanager';
import XHRStates from 'common/constants/XHRStates';

// Workaround for salesforce lightning locker compatibility
let globalObject = Utils.getGlobalObject() as unknown as {
  _ablyjs_jsonp: Record<string, unknown>;
  JSONPTransport: typeof JSONPTransport;
};

const noop = function () {};
/* Can't just use window.Ably, as that won't exist if using the commonjs version. */
const _: Record<string, unknown> = (globalObject._ablyjs_jsonp = {});

/* express strips out parantheses from the callback!
 * Kludge to still alow its responses to work, while not keeping the
 * function form for normal use and not cluttering window.Ably
 * https://github.com/expressjs/express/blob/5b4d4b4ab1324743534fbcd4709f4e75bb4b4e9d/lib/response.js#L305
 */
_._ = function (id: string) {
  return _['_' + id] || noop;
};
let idCounter = 1;
const shortName = 'jsonp';

export function createRequest(
  uri: string,
  headers: Record<string, string> | null,
  params?: RequestParams,
  body?: unknown,
  requestMode?: number,
  timeouts?: Record<string, number> | null,
  method?: HttpMethods
) {
  /* JSONP requests are used either with the context being a realtime
   * transport, or with timeouts passed in (for when used by a rest client),
   * or completely standalone.  Use the appropriate timeouts in each case */
  timeouts = timeouts || Defaults.TIMEOUTS;
  return new Request(
    undefined,
    uri,
    headers,
    Utils.copy<RequestParams>(params),
    body,
    requestMode as number,
    timeouts as Record<string, number>,
    method
  );
}

class JSONPTransport extends CometTransport {
  shortName = shortName;

  constructor(connectionManager: ConnectionManager, auth: Auth, params: TransportParams) {
    super(connectionManager, auth, params);
    params.stream = false;
  }

  static isAvailable() {
    return Platform.Config.jsonpSupported && Platform.Config.allowComet;
  }

  toString() {
    return 'JSONPTransport; uri=' + this.baseUri + '; isConnected=' + this.isConnected;
  }

  createRequest(
    uri: string,
    headers: Record<string, string> | null,
    params?: Record<string, string>,
    body?: unknown,
    requestMode?: number,
    timeouts?: Record<string, number>,
    method?: HttpMethods
  ) {
    /* JSONP requests are used either with the context being a realtime
     * transport, or with timeouts passed in (for when used by a rest client),
     * or completely standalone.  Use the appropriate timeouts in each case */
    timeouts = this?.timeouts || timeouts || Defaults.TIMEOUTS;
    return createRequest(uri, headers, params, body, requestMode, timeouts, method);
  }
}

export class Request extends EventEmitter {
  id: string | number;
  uri: string;
  params: Record<string, string>;
  body: unknown;
  requestMode: number;
  timeouts: Record<string, number>;
  requestComplete: boolean;
  method?: HttpMethods;
  script?: HTMLScriptElement;
  timer?: number | NodeJS.Timeout | null;

  constructor(
    id: string | number | undefined,
    uri: string,
    headers: Record<string, string> | null,
    params: Record<string, string> | null,
    body: unknown | null,
    requestMode: number,
    timeouts: Record<string, number>,
    method?: HttpMethods
  ) {
    super();
    if (id === undefined) id = idCounter++;
    this.id = id;
    this.uri = uri;
    this.params = params || {};
    this.params.rnd = Utils.cheapRandStr();
    if (headers) {
      /* JSONP doesn't allow headers. Cherry-pick a couple to turn into qs params */
      if (headers['X-Ably-Version']) this.params.v = headers['X-Ably-Version'];
      if (headers['X-Ably-Lib']) this.params.lib = headers['X-Ably-Lib'];
    }
    this.body = body;
    this.method = method;
    this.requestMode = requestMode;
    this.timeouts = timeouts;
    this.requestComplete = false;
  }

  exec() {
    const id = this.id,
      body = this.body,
      method = this.method,
      uri = this.uri,
      params = this.params;

    params.callback = '_ablyjs_jsonp._(' + id + ')';

    params.envelope = 'jsonp';
    if (body) {
      params.body = body as string;
    }
    if (method && method !== 'get') {
      params.method = method;
    }

    const script = (this.script = document.createElement('script'));
    const src = uri + Utils.toQueryString(params);
    script.src = src;
    if (script.src.split('/').slice(-1)[0] !== src.split('/').slice(-1)[0]) {
      /* The src has been truncated. Can't abort, but can at least emit an
       * error so the user knows what's gone wrong. (Can't compare strings
       * directly as src may have a port, script.src won't) */
      Logger.logAction(
        Logger.LOG_ERROR,
        'JSONP Request.exec()',
        'Warning: the browser appears to have truncated the script URI. This will likely result in the request failing due to an unparseable body param'
      );
    }
    script.async = true;
    script.type = 'text/javascript';
    script.charset = 'UTF-8';
    script.onerror = (err: string | Event) => {
      this.complete(
        new PartialErrorInfo('JSONP script error (event: ' + Platform.Config.inspect(err) + ')', null, 400)
      );
    };

    type JSONPResponse = {
      statusCode?: number;
      response: {
        error?: ErrorInfo;
      };
      headers?: Record<string, string>;
    };

    _['_' + id] = (message: JSONPResponse) => {
      if (message.statusCode) {
        /* Handle as enveloped jsonp, as all jsonp transport uses should be */
        const response = message.response;
        if (message.statusCode == 204) {
          this.complete(null, null, null, message.statusCode);
        } else if (!response) {
          this.complete(new PartialErrorInfo('Invalid server response: no envelope detected', null, 500));
        } else if (message.statusCode < 400 || Utils.isArray(response)) {
          /* If response is an array, it's an array of protocol messages -- even if
           * it contains an error action (hence the nonsuccess statuscode), we can
           * consider the request to have succeeded, just pass it on to
           * onProtocolMessage to decide what to do */
          this.complete(null, response, message.headers, message.statusCode);
        } else {
          const err =
            response.error || new PartialErrorInfo('Error response received from server', null, message.statusCode);
          this.complete(err);
        }
      } else {
        /* Handle as non-enveloped -- as will be eg from a customer's authUrl server */
        this.complete(null, message);
      }
    };

    const timeout =
      this.requestMode == XHRStates.REQ_SEND ? this.timeouts.httpRequestTimeout : this.timeouts.recvTimeout;
    this.timer = setTimeout(this.abort.bind(this), timeout);
    let head = document.getElementsByTagName('head')[0];
    (head as HTMLHeadElement).insertBefore(script, (head as HTMLHeadElement).firstChild);
  }

  complete(
    err?: IPartialErrorInfo | null,
    body?: unknown,
    headers?: Record<string, string> | null,
    statusCode?: number
  ) {
    headers = headers || {};
    if (!this.requestComplete) {
      this.requestComplete = true;
      let contentType;
      if (body) {
        contentType = typeof body == 'string' ? 'text/plain' : 'application/json';
        headers['content-type'] = contentType;
        this.emit('data', body);
      }

      this.emit('complete', err, body, headers, /* unpacked: */ true, statusCode);
      this.dispose();
    }
  }

  abort() {
    this.dispose();
  }

  dispose() {
    const timer = this.timer;
    if (timer) {
      clearTimeout(timer as NodeJS.Timeout);
      this.timer = null;
    }
    const script = this.script as HTMLScriptElement;
    if (script.parentNode) script.parentNode.removeChild(script);
    delete _[this.id];
    this.emit('disposed');
  }
}

export default function (connectionManager: typeof ConnectionManager): typeof JSONPTransport {
  globalObject.JSONPTransport = JSONPTransport;
  if (JSONPTransport.isAvailable()) {
    connectionManager.supportedTransports[shortName] = JSONPTransport;
  }
  return JSONPTransport;
}
