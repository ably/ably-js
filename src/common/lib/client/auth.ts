import Logger from '../util/logger';
import * as Utils from '../util/utils';
import Multicaster from '../util/multicaster';
import ErrorInfo, { IPartialErrorInfo } from '../types/errorinfo';
import HmacSHA256 from 'crypto-js/build/hmac-sha256';
import { stringify as stringifyBase64 } from 'crypto-js/build/enc-base64';
import { createHmac } from 'crypto';
import { ErrnoException, RequestCallback, RequestParams } from '../../types/http';
import * as API from '../../../../ably';
import { StandardCallback } from '../../types/utils';
import Rest from './rest';
import Realtime from './realtime';
import ClientOptions from '../../types/ClientOptions';
import HttpMethods from '../../constants/HttpMethods';
import HttpStatusCodes from 'common/constants/HttpStatusCodes';
import Platform from '../../platform';
import Resource from './resource';

type BatchResult<T> = API.Types.BatchResult<T>;
type TokenRevocationTargetSpecifier = API.Types.TokenRevocationTargetSpecifier;
type TokenRevocationOptions = API.Types.TokenRevocationOptions;
type TokenRevocationSuccessResult = API.Types.TokenRevocationSuccessResult;
type TokenRevocationFailureResult = API.Types.TokenRevocationFailureResult;
type TokenRevocationResult = BatchResult<TokenRevocationSuccessResult | TokenRevocationFailureResult>;

const MAX_TOKEN_LENGTH = Math.pow(2, 17);
function noop() {}
function random() {
  return ('000000' + Math.floor(Math.random() * 1e16)).slice(-16);
}

function isRealtime(client: Rest | Realtime): client is Realtime {
  return !!(client as Realtime).connection;
}

/* A client auth callback may give errors in any number of formats; normalise to an ErrorInfo or PartialErrorInfo */
function normaliseAuthcallbackError(err: any) {
  if (!Utils.isErrorInfoOrPartialErrorInfo(err)) {
    return new ErrorInfo(Utils.inspectError(err), err.code || 40170, err.statusCode || 401);
  }
  /* network errors will not have an inherent error code */
  if (!err.code) {
    if (err.statusCode === 403) {
      err.code = 40300;
    } else {
      err.code = 40170;
      /* normalise statusCode to 401 per RSA4e */
      err.statusCode = 401;
    }
  }
  return err;
}

let hmac = (text: string, key: string): string => {
  if (Platform.Config.createHmac) {
    const inst = (Platform.Config.createHmac as typeof createHmac)('SHA256', key);
    inst.update(text);
    return inst.digest('base64');
  }
  return stringifyBase64(HmacSHA256(text, key));
};

function c14n(capability?: string | Record<string, Array<string>>) {
  if (!capability) return '';

  if (typeof capability == 'string') capability = JSON.parse(capability);

  const c14nCapability: Record<string, Array<string>> = Object.create(null);
  const keys = Utils.keysArray(capability as Record<string, Array<string>>, true);
  if (!keys) return '';
  keys.sort();
  for (let i = 0; i < keys.length; i++) {
    c14nCapability[keys[i]] = (capability as Record<string, Array<string>>)[keys[i]].sort();
  }
  return JSON.stringify(c14nCapability);
}

function logAndValidateTokenAuthMethod(authOptions: API.Types.AuthOptions) {
  if (authOptions.authCallback) {
    Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'using token auth with authCallback');
  } else if (authOptions.authUrl) {
    Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'using token auth with authUrl');
  } else if (authOptions.key) {
    Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'using token auth with client-side signing');
  } else if (authOptions.tokenDetails) {
    Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'using token auth with supplied token only');
  } else {
    const msg = 'authOptions must include valid authentication parameters';
    Logger.logAction(Logger.LOG_ERROR, 'Auth()', msg);
    throw new Error(msg);
  }
}

function basicAuthForced(options: ClientOptions) {
  return 'useTokenAuth' in options && !options.useTokenAuth;
}

/* RSA4 */
function useTokenAuth(options: ClientOptions) {
  return (
    options.useTokenAuth ||
    (!basicAuthForced(options) && (options.authCallback || options.authUrl || options.token || options.tokenDetails))
  );
}

/* RSA4a */
function noWayToRenew(options: ClientOptions) {
  return !options.key && !options.authCallback && !options.authUrl;
}

let trId = 0;
function getTokenRequestId() {
  return trId++;
}

class Auth {
  client: Rest | Realtime;
  tokenParams: API.Types.TokenParams;
  currentTokenRequestId: number | null;
  waitingForTokenRequest: ReturnType<typeof Multicaster.create> | null;
  // This initialization is always overwritten and only used to prevent a TypeScript compiler error
  authOptions: API.Types.AuthOptions = {} as API.Types.AuthOptions;
  tokenDetails?: API.Types.TokenDetails | null;
  method?: string;
  key?: string;
  basicKey?: string;
  clientId?: string | null;

  constructor(client: Rest | Realtime, options: ClientOptions) {
    this.client = client;
    this.tokenParams = options.defaultTokenParams || {};
    /* The id of the current token request if one is in progress, else null */
    this.currentTokenRequestId = null;
    this.waitingForTokenRequest = null;

    if (useTokenAuth(options)) {
      /* Token auth */
      if (options.key && !hmac) {
        const msg = 'client-side token request signing not supported';
        Logger.logAction(Logger.LOG_ERROR, 'Auth()', msg);
        throw new Error(msg);
      }
      if (noWayToRenew(options)) {
        Logger.logAction(
          Logger.LOG_ERROR,
          'Auth()',
          'Warning: library initialized with a token literal without any way to renew the token when it expires (no authUrl, authCallback, or key). See https://help.ably.io/error/40171 for help'
        );
      }
      this._saveTokenOptions(options.defaultTokenParams as API.Types.TokenDetails, options);
      logAndValidateTokenAuthMethod(this.authOptions);
    } else {
      /* Basic auth */
      if (!options.key) {
        const msg =
          'No authentication options provided; need one of: key, authUrl, or authCallback (or for testing only, token or tokenDetails)';
        Logger.logAction(Logger.LOG_ERROR, 'Auth()', msg);
        throw new ErrorInfo(msg, 40160, 401);
      }
      Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'anonymous, using basic auth');
      this._saveBasicOptions(options);
    }
  }

  /**
   * Instructs the library to get a token immediately and ensures Token Auth
   * is used for all future requests, storing the tokenParams and authOptions
   * given as the new defaults for subsequent use.
   *
   * @param callback (err, tokenDetails)
   */
  authorize(callback: Function): void;

  /**
   * Instructs the library to get a token immediately and ensures Token Auth
   * is used for all future requests, storing the tokenParams and authOptions
   * given as the new defaults for subsequent use.
   *
   * @param tokenParams
   * an object containing the parameters for the requested token:
   *
   * - ttl:        (optional) the requested life of any new token in ms. If none
   *               is specified a default of 1 hour is provided. The maximum lifetime
   *               is 24hours; any request exceeding that lifetime will be rejected
   *               with an error.
   *
   * - capability: (optional) the capability to associate with the access token.
   *               If none is specified, a token will be requested with all of the
   *               capabilities of the specified key.
   *
   * - clientId:   (optional) a client ID to associate with the token
   *
   * - timestamp:  (optional) the time in ms since the epoch. If none is specified,
   *               the system will be queried for a time value to use.
   *
   * @param callback (err, tokenDetails)
   */
  authorize(tokenParams: API.Types.TokenParams | null, callback: Function): void;

  /**
   * Instructs the library to get a token immediately and ensures Token Auth
   * is used for all future requests, storing the tokenParams and authOptions
   * given as the new defaults for subsequent use.
   *
   * @param tokenParams
   * an object containing the parameters for the requested token:
   *
   * - ttl:        (optional) the requested life of any new token in ms. If none
   *               is specified a default of 1 hour is provided. The maximum lifetime
   *               is 24hours; any request exceeding that lifetime will be rejected
   *               with an error.
   *
   * - capability: (optional) the capability to associate with the access token.
   *               If none is specified, a token will be requested with all of the
   *               capabilities of the specified key.
   *
   * - clientId:   (optional) a client ID to associate with the token
   *
   * - timestamp:  (optional) the time in ms since the epoch. If none is specified,
   *               the system will be queried for a time value to use.
   *
   * @param authOptions
   * an object containing auth options relevant to token auth:
   *
   * - queryTime   (optional) boolean indicating that the Ably system should be
   *               queried for the current time when none is specified explicitly.
   *
   * - tokenDetails: (optional) object: An authenticated TokenDetails object.
   *
   * - token:        (optional) string: the `token` property of a tokenDetails object
   *
   * - authCallback:  (optional) a JavaScript callback to be called to get auth information.
   *                  authCallback should be a function of (tokenParams, callback) that calls
   *                  the callback with (err, result), where result is any of:
   *                  - a tokenRequest object (ie the result of a rest.auth.createTokenRequest call),
   *                  - a tokenDetails object (ie the result of a rest.auth.requestToken call),
   *                  - a token string
   *
   * - authUrl:       (optional) a URL to be used to GET or POST a set of token request
   *                  params, to obtain a signed token request.
   *
   * - authHeaders:   (optional) a set of application-specific headers to be added to any request
   *                  made to the authUrl.
   *
   * - authParams:    (optional) a set of application-specific query params to be added to any
   *                  request made to the authUrl.
   *
   *
   * - requestHeaders (optional, unsupported, for testing only) extra headers to add to the
   *                  requestToken request
   *
   * @param callback (err, tokenDetails)
   */
  authorize(
    tokenParams: API.Types.TokenParams | null,
    authOptions: API.Types.AuthOptions | null,
    callback: Function
  ): void;

  authorize(
    tokenParams: Record<string, any> | Function | null,
    authOptions?: API.Types.AuthOptions | null | Function,
    callback?: Function
  ): void | Promise<void> {
    let _authOptions: API.Types.AuthOptions | null;
    /* shuffle and normalise arguments as necessary */
    if (typeof tokenParams == 'function' && !callback) {
      callback = tokenParams;
      _authOptions = tokenParams = null;
    } else if (typeof authOptions == 'function' && !callback) {
      callback = authOptions;
      _authOptions = null;
    } else {
      _authOptions = authOptions as API.Types.AuthOptions;
    }
    if (!callback) {
      if (this.client.options.promises) {
        return Utils.promisify(this, 'authorize', arguments);
      }
    }

    /* RSA10a: authorize() call implies token auth. If a key is passed it, we
     * just check if it doesn't clash and assume we're generating a token from it */
    if (_authOptions && _authOptions.key && this.authOptions.key !== _authOptions.key) {
      throw new ErrorInfo('Unable to update auth options with incompatible key', 40102, 401);
    }

    if (_authOptions && 'force' in _authOptions) {
      Logger.logAction(
        Logger.LOG_ERROR,
        'Auth.authorize',
        'Deprecation warning: specifying {force: true} in authOptions is no longer necessary, authorize() now always gets a new token. Please remove this, as in version 1.0 and later, having a non-null authOptions will overwrite stored library authOptions, which may not be what you want'
      );
      /* Emulate the old behaviour: if 'force' was the only member of authOptions,
       * set it to null so it doesn't overwrite stored. TODO: remove in version 1.0 */
      if (Utils.isOnlyPropIn(_authOptions, 'force')) {
        _authOptions = null;
      }
    }

    this._forceNewToken(
      tokenParams as API.Types.TokenParams,
      _authOptions,
      (err: ErrorInfo, tokenDetails: API.Types.TokenDetails) => {
        if (err) {
          if ((this.client as Realtime).connection && err.statusCode === HttpStatusCodes.Forbidden) {
            /* Per RSA4d & RSA4d1, if the auth server explicitly repudiates our right to
             * stay connecticed by returning a 403, we actively disconnect the connection
             * even though we may well still have time left in the old token. */
            (this.client as Realtime).connection.connectionManager.actOnErrorFromAuthorize(err);
          }
          callback?.(err);
          return;
        }

        /* RTC8
         * - When authorize called by an end user and have a realtime connection,
         * don't call back till new token has taken effect.
         * - Use this.client.connection as a proxy for (this.client instanceof Realtime),
         * which doesn't work in node as Realtime isn't part of the vm context for Rest clients */
        if (isRealtime(this.client)) {
          this.client.connection.connectionManager.onAuthUpdated(tokenDetails, callback || noop);
        } else {
          callback?.(null, tokenDetails);
        }
      }
    );
  }

  authorise(tokenParams: API.Types.TokenParams | null, authOptions: API.Types.AuthOptions, callback: Function): void {
    Logger.deprecated('Auth.authorise', 'Auth.authorize');
    this.authorize(tokenParams, authOptions, callback);
  }

  /* For internal use, eg by connectionManager - useful when want to call back
   * as soon as we have the new token, rather than waiting for it to take
   * effect on the connection as #authorize does */
  _forceNewToken(
    tokenParams: API.Types.TokenParams | null,
    authOptions: API.Types.AuthOptions | null,
    callback: Function
  ) {
    /* get rid of current token even if still valid */
    this.tokenDetails = null;

    /* _save normalises the tokenParams and authOptions and updates the auth
     * object. All subsequent operations should use the values on `this`,
     * not the passed in ones. */
    this._saveTokenOptions(tokenParams, authOptions);

    logAndValidateTokenAuthMethod(this.authOptions);

    this._ensureValidAuthCredentials(true, (err: ErrorInfo | null, tokenDetails?: API.Types.TokenDetails) => {
      /* RSA10g */
      delete this.tokenParams.timestamp;
      delete this.authOptions.queryTime;
      callback(err, tokenDetails);
    });
  }

  /**
   * Request an access token
   * @param callback (err, tokenDetails)
   */
  requestToken(callback: StandardCallback<API.Types.TokenDetails>): void;

  /**
   * Request an access token
   * @param tokenParams
   * an object containing the parameters for the requested token:
   * - ttl:          (optional) the requested life of the token in milliseconds. If none is specified
   *                  a default of 1 hour is provided. The maximum lifetime is 24hours; any request
   *                  exceeding that lifetime will be rejected with an error.
   *
   * - capability:    (optional) the capability to associate with the access token.
   *                  If none is specified, a token will be requested with all of the
   *                  capabilities of the specified key.
   *
   * - clientId:      (optional) a client ID to associate with the token; if not
   *                  specified, a clientId passed in constructing the Rest interface will be used
   *
   * - timestamp:     (optional) the time in ms since the epoch. If none is specified,
   *                  the system will be queried for a time value to use.
   *
   * @param callback (err, tokenDetails)
   */
  requestToken(tokenParams: API.Types.TokenParams | null, callback: StandardCallback<API.Types.TokenDetails>): void;

  /**
   * Request an access token
   * @param tokenParams
   * an object containing the parameters for the requested token:
   * - ttl:          (optional) the requested life of the token in milliseconds. If none is specified
   *                  a default of 1 hour is provided. The maximum lifetime is 24hours; any request
   *                  exceeding that lifetime will be rejected with an error.
   *
   * - capability:    (optional) the capability to associate with the access token.
   *                  If none is specified, a token will be requested with all of the
   *                  capabilities of the specified key.
   *
   * - clientId:      (optional) a client ID to associate with the token; if not
   *                  specified, a clientId passed in constructing the Rest interface will be used
   *
   * - timestamp:     (optional) the time in ms since the epoch. If none is specified,
   *                  the system will be queried for a time value to use.
   *
   * @param authOptions
   * an object containing the request options:
   * - key:           the key to use.
   *
   * - authCallback:  (optional) a JavaScript callback to be called to get auth information.
   *                  authCallback should be a function of (tokenParams, callback) that calls
   *                  the callback with (err, result), where result is any of:
   *                  - a tokenRequest object (ie the result of a rest.auth.createTokenRequest call),
   *                  - a tokenDetails object (ie the result of a rest.auth.requestToken call),
   *                  - a token string
   *
   * - authUrl:       (optional) a URL to be used to GET or POST a set of token request
   *                  params, to obtain a signed token request.
   *
   * - authHeaders:   (optional) a set of application-specific headers to be added to any request
   *                  made to the authUrl.
   *
   * - authParams:    (optional) a set of application-specific query params to be added to any
   *                  request made to the authUrl.
   *
   * - queryTime      (optional) boolean indicating that the ably system should be
   *                  queried for the current time when none is specified explicitly
   *
   * - requestHeaders (optional, unsupported, for testing only) extra headers to add to the
   *                  requestToken request
   *
   * @param callback (err, tokenDetails)
   */
  requestToken(
    tokenParams: API.Types.TokenParams | null,
    authOptions: API.Types.AuthOptions,
    callback: StandardCallback<API.Types.TokenDetails>
  ): void;

  requestToken(
    tokenParams: API.Types.TokenParams | StandardCallback<API.Types.TokenDetails> | null,
    authOptions?: any | StandardCallback<API.Types.TokenDetails>,
    callback?: StandardCallback<API.Types.TokenDetails>
  ): void | Promise<void> {
    /* shuffle and normalise arguments as necessary */
    if (typeof tokenParams == 'function' && !callback) {
      callback = tokenParams;
      authOptions = tokenParams = null;
    } else if (typeof authOptions == 'function' && !callback) {
      callback = authOptions;
      authOptions = null;
    }
    if (!callback && this.client.options.promises) {
      return Utils.promisify(this, 'requestToken', arguments);
    }

    /* RSA8e: if authOptions passed in, they're used instead of stored, don't merge them */
    authOptions = authOptions || this.authOptions;
    tokenParams = tokenParams || Utils.copy(this.tokenParams);
    const _callback = callback || noop;

    /* first set up whatever callback will be used to get signed
     * token requests */
    let tokenRequestCallback,
      client = this.client;

    if (authOptions.authCallback) {
      Logger.logAction(Logger.LOG_MINOR, 'Auth.requestToken()', 'using token auth with authCallback');
      tokenRequestCallback = authOptions.authCallback;
    } else if (authOptions.authUrl) {
      Logger.logAction(Logger.LOG_MINOR, 'Auth.requestToken()', 'using token auth with authUrl');
      tokenRequestCallback = (params: Record<string, unknown>, cb: Function) => {
        const authHeaders = Utils.mixin({ accept: 'application/json, text/plain' }, authOptions.authHeaders) as Record<
          string,
          string
        >;
        const usePost = authOptions.authMethod && authOptions.authMethod.toLowerCase() === 'post';
        let providedQsParams;
        /* Combine authParams with any qs params given in the authUrl */
        const queryIdx = authOptions.authUrl.indexOf('?');
        if (queryIdx > -1) {
          providedQsParams = Utils.parseQueryString(authOptions.authUrl.slice(queryIdx));
          authOptions.authUrl = authOptions.authUrl.slice(0, queryIdx);
          if (!usePost) {
            /* In case of conflict, authParams take precedence over qs params in the authUrl */
            authOptions.authParams = Utils.mixin(providedQsParams, authOptions.authParams);
          }
        }
        /* RSA8c2 */
        const authParams = Utils.mixin({}, authOptions.authParams || {}, params) as RequestParams;
        const authUrlRequestCallback = function (
          err: ErrorInfo,
          body: string,
          headers: Record<string, string>,
          unpacked: any
        ) {
          let contentType;
          if (err) {
            Logger.logAction(
              Logger.LOG_MICRO,
              'Auth.requestToken().tokenRequestCallback',
              'Received Error: ' + Utils.inspectError(err)
            );
          } else {
            contentType = headers['content-type'];
            Logger.logAction(
              Logger.LOG_MICRO,
              'Auth.requestToken().tokenRequestCallback',
              'Received; content-type: ' + contentType + '; body: ' + Utils.inspectBody(body)
            );
          }
          if (err || unpacked) return cb(err, body);
          if (Platform.BufferUtils.isBuffer(body)) body = body.toString();
          if (!contentType) {
            cb(new ErrorInfo('authUrl response is missing a content-type header', 40170, 401));
            return;
          }
          const json = contentType.indexOf('application/json') > -1,
            text = contentType.indexOf('text/plain') > -1 || contentType.indexOf('application/jwt') > -1;
          if (!json && !text) {
            cb(
              new ErrorInfo(
                'authUrl responded with unacceptable content-type ' +
                  contentType +
                  ', should be either text/plain, application/jwt or application/json',
                40170,
                401
              )
            );
            return;
          }
          if (json) {
            if (body.length > MAX_TOKEN_LENGTH) {
              cb(new ErrorInfo('authUrl response exceeded max permitted length', 40170, 401));
              return;
            }
            try {
              body = JSON.parse(body);
            } catch (e) {
              cb(
                new ErrorInfo('Unexpected error processing authURL response; err = ' + (e as Error).message, 40170, 401)
              );
              return;
            }
          }
          cb(null, body, contentType);
        };
        Logger.logAction(
          Logger.LOG_MICRO,
          'Auth.requestToken().tokenRequestCallback',
          'Requesting token from ' +
            authOptions.authUrl +
            '; Params: ' +
            JSON.stringify(authParams) +
            '; method: ' +
            (usePost ? 'POST' : 'GET')
        );
        if (usePost) {
          /* send body form-encoded */
          const headers = authHeaders || {};
          headers['content-type'] = 'application/x-www-form-urlencoded';
          const body = Utils.toQueryString(authParams).slice(1); /* slice is to remove the initial '?' */
          this.client.http.doUri(
            HttpMethods.Post,
            client,
            authOptions.authUrl,
            headers,
            body,
            providedQsParams as Record<string, string>,
            authUrlRequestCallback as RequestCallback
          );
        } else {
          this.client.http.doUri(
            HttpMethods.Get,
            client,
            authOptions.authUrl,
            authHeaders || {},
            null,
            authParams,
            authUrlRequestCallback as RequestCallback
          );
        }
      };
    } else if (authOptions.key) {
      Logger.logAction(Logger.LOG_MINOR, 'Auth.requestToken()', 'using token auth with client-side signing');
      tokenRequestCallback = (params: any, cb: Function) => {
        this.createTokenRequest(params, authOptions, cb);
      };
    } else {
      const msg =
        'Need a new token, but authOptions does not include any way to request one (no authUrl, authCallback, or key)';
      Logger.logAction(
        Logger.LOG_ERROR,
        'Auth()',
        'library initialized with a token literal without any way to renew the token when it expires (no authUrl, authCallback, or key). See https://help.ably.io/error/40171 for help'
      );
      _callback(new ErrorInfo(msg, 40171, 403));
      return;
    }

    /* normalise token params */
    if ('capability' in (tokenParams as Record<string, any>))
      (tokenParams as Record<string, any>).capability = c14n((tokenParams as Record<string, any>).capability);

    const tokenRequest = (signedTokenParams: Record<string, any>, tokenCb: Function) => {
      const keyName = signedTokenParams.keyName,
        path = '/keys/' + keyName + '/requestToken',
        tokenUri = function (host: string) {
          return client.baseUri(host) + path;
        };

      const requestHeaders = Utils.defaultPostHeaders(this.client.options);
      if (authOptions.requestHeaders) Utils.mixin(requestHeaders, authOptions.requestHeaders);
      Logger.logAction(
        Logger.LOG_MICRO,
        'Auth.requestToken().requestToken',
        'Sending POST to ' + path + '; Token params: ' + JSON.stringify(signedTokenParams)
      );
      this.client.http.do(
        HttpMethods.Post,
        client,
        tokenUri,
        requestHeaders,
        JSON.stringify(signedTokenParams),
        null,
        tokenCb as RequestCallback
      );
    };

    let tokenRequestCallbackTimeoutExpired = false,
      timeoutLength = this.client.options.timeouts.realtimeRequestTimeout,
      tokenRequestCallbackTimeout = setTimeout(function () {
        tokenRequestCallbackTimeoutExpired = true;
        const msg = 'Token request callback timed out after ' + timeoutLength / 1000 + ' seconds';
        Logger.logAction(Logger.LOG_ERROR, 'Auth.requestToken()', msg);
        _callback(new ErrorInfo(msg, 40170, 401));
      }, timeoutLength);

    tokenRequestCallback(tokenParams, function (err: ErrorInfo, tokenRequestOrDetails: any, contentType: string) {
      if (tokenRequestCallbackTimeoutExpired) return;
      clearTimeout(tokenRequestCallbackTimeout);

      if (err) {
        Logger.logAction(
          Logger.LOG_ERROR,
          'Auth.requestToken()',
          'token request signing call returned error; err = ' + Utils.inspectError(err)
        );
        _callback(normaliseAuthcallbackError(err));
        return;
      }
      /* the response from the callback might be a token string, a signed request or a token details */
      if (typeof tokenRequestOrDetails === 'string') {
        if (tokenRequestOrDetails.length === 0) {
          _callback(new ErrorInfo('Token string is empty', 40170, 401));
        } else if (tokenRequestOrDetails.length > MAX_TOKEN_LENGTH) {
          _callback(
            new ErrorInfo(
              'Token string exceeded max permitted length (was ' + tokenRequestOrDetails.length + ' bytes)',
              40170,
              401
            )
          );
        } else if (tokenRequestOrDetails === 'undefined' || tokenRequestOrDetails === 'null') {
          /* common failure mode with poorly-implemented authCallbacks */
          _callback(new ErrorInfo('Token string was literal null/undefined', 40170, 401));
        } else if (tokenRequestOrDetails[0] === '{' && !(contentType && contentType.indexOf('application/jwt') > -1)) {
          _callback(
            new ErrorInfo(
              "Token was double-encoded; make sure you're not JSON-encoding an already encoded token request or details",
              40170,
              401
            )
          );
        } else {
          _callback(null, { token: tokenRequestOrDetails } as API.Types.TokenDetails);
        }
        return;
      }
      if (typeof tokenRequestOrDetails !== 'object') {
        const msg =
          'Expected token request callback to call back with a token string or token request/details object, but got a ' +
          typeof tokenRequestOrDetails;
        Logger.logAction(Logger.LOG_ERROR, 'Auth.requestToken()', msg);
        _callback(new ErrorInfo(msg, 40170, 401));
        return;
      }
      const objectSize = JSON.stringify(tokenRequestOrDetails).length;
      if (objectSize > MAX_TOKEN_LENGTH && !authOptions.suppressMaxLengthCheck) {
        _callback(
          new ErrorInfo(
            'Token request/details object exceeded max permitted stringified size (was ' + objectSize + ' bytes)',
            40170,
            401
          )
        );
        return;
      }
      if ('issued' in tokenRequestOrDetails) {
        /* a tokenDetails object */
        _callback(null, tokenRequestOrDetails);
        return;
      }
      if (!('keyName' in tokenRequestOrDetails)) {
        const msg =
          'Expected token request callback to call back with a token string, token request object, or token details object';
        Logger.logAction(Logger.LOG_ERROR, 'Auth.requestToken()', msg);
        _callback(new ErrorInfo(msg, 40170, 401));
        return;
      }
      /* it's a token request, so make the request */
      tokenRequest(
        tokenRequestOrDetails,
        function (
          err?: ErrorInfo | ErrnoException | null,
          tokenResponse?: API.Types.TokenDetails | string,
          headers?: Record<string, string>,
          unpacked?: boolean
        ) {
          if (err) {
            Logger.logAction(
              Logger.LOG_ERROR,
              'Auth.requestToken()',
              'token request API call returned error; err = ' + Utils.inspectError(err)
            );
            _callback(normaliseAuthcallbackError(err));
            return;
          }
          if (!unpacked) tokenResponse = JSON.parse(tokenResponse as string);
          Logger.logAction(Logger.LOG_MINOR, 'Auth.getToken()', 'token received');
          _callback(null, tokenResponse as API.Types.TokenDetails);
        }
      );
    });
  }

  /**
   * Create and sign a token request based on the given options.
   * NOTE this can only be used when the key value is available locally.
   * Otherwise, signed token requests must be obtained from the key
   * owner (either using the token request callback or url).
   *
   * @param authOptions
   * an object containing the request options:
   * - key:           the key to use. If not specified, a key passed in constructing
   *                  the Rest interface will be used
   *
   * - queryTime      (optional) boolean indicating that the ably system should be
   *                  queried for the current time when none is specified explicitly
   *
   * - requestHeaders (optional, unsupported, for testing only) extra headers to add to the
   *                  requestToken request
   *
   * @param tokenParams
   * an object containing the parameters for the requested token:
   * - ttl:       (optional) the requested life of the token in ms. If none is specified
   *                  a default of 1 hour is provided. The maximum lifetime is 24hours; any request
   *                  exceeding that lifetime will be rejected with an error.
   *
   * - capability:    (optional) the capability to associate with the access token.
   *                  If none is specified, a token will be requested with all of the
   *                  capabilities of the specified key.
   *
   * - clientId:      (optional) a client ID to associate with the token; if not
   *                  specified, a clientId passed in constructing the Rest interface will be used
   *
   * - timestamp:     (optional) the time in ms since the epoch. If none is specified,
   *                  the system will be queried for a time value to use.
   *
   * @param callback
   */
  createTokenRequest(tokenParams: API.Types.TokenParams | null, authOptions: any, callback: Function) {
    /* shuffle and normalise arguments as necessary */
    if (typeof tokenParams == 'function' && !callback) {
      callback = tokenParams;
      authOptions = tokenParams = null;
    } else if (typeof authOptions == 'function' && !callback) {
      callback = authOptions;
      authOptions = null;
    }
    if (!callback && this.client.options.promises) {
      return Utils.promisify(this, 'createTokenRequest', arguments);
    }

    /* RSA9h: if authOptions passed in, they're used instead of stored, don't merge them */
    authOptions = authOptions || this.authOptions;
    tokenParams = tokenParams || Utils.copy<API.Types.TokenParams>(this.tokenParams);

    const key = authOptions.key;
    if (!key) {
      callback(new ErrorInfo('No key specified', 40101, 403));
      return;
    }
    const keyParts = key.split(':'),
      keyName = keyParts[0],
      keySecret = keyParts[1];

    if (!keySecret) {
      callback(new ErrorInfo('Invalid key specified', 40101, 403));
      return;
    }

    if (tokenParams.clientId === '') {
      callback(new ErrorInfo('clientId can’t be an empty string', 40012, 400));
      return;
    }

    if ('capability' in tokenParams) {
      tokenParams.capability = c14n(tokenParams.capability);
    }

    const request = Utils.mixin({ keyName: keyName }, tokenParams),
      clientId = tokenParams.clientId || '',
      ttl = tokenParams.ttl || '',
      capability = tokenParams.capability || '';

    ((authoriseCb) => {
      if (request.timestamp) {
        authoriseCb();
        return;
      }
      this.getTimestamp(authOptions && authOptions.queryTime, function (err?: ErrorInfo | null, time?: number) {
        if (err) {
          callback(err);
          return;
        }
        request.timestamp = time;
        authoriseCb();
      });
    })(function () {
      /* nonce */
      /* NOTE: there is no expectation that the client
       * specifies the nonce; this is done by the library
       * However, this can be overridden by the client
       * simply for testing purposes. */
      const nonce = request.nonce || (request.nonce = random()),
        timestamp = request.timestamp;

      const signText =
        request.keyName + '\n' + ttl + '\n' + capability + '\n' + clientId + '\n' + timestamp + '\n' + nonce + '\n';

      /* mac */
      /* NOTE: there is no expectation that the client
       * specifies the mac; this is done by the library
       * However, this can be overridden by the client
       * simply for testing purposes. */
      request.mac = request.mac || hmac(signText, keySecret);

      Logger.logAction(Logger.LOG_MINOR, 'Auth.getTokenRequest()', 'generated signed request');
      callback(null, request);
    });
  }

  /**
   * Get the auth query params to use for a websocket connection,
   * based on the current auth parameters
   */
  getAuthParams(callback: Function) {
    if (this.method == 'basic') callback(null, { key: this.key });
    else
      this._ensureValidAuthCredentials(false, function (err: ErrorInfo | null, tokenDetails?: API.Types.TokenDetails) {
        if (err) {
          callback(err);
          return;
        }
        if (!tokenDetails) {
          throw new Error('Auth.getAuthParams(): _ensureValidAuthCredentials returned no error or tokenDetails');
        }
        callback(null, { access_token: tokenDetails.token });
      });
  }

  /**
   * Get the authorization header to use for a REST or comet request,
   * based on the current auth parameters
   */
  getAuthHeaders(callback: Function) {
    if (this.method == 'basic') {
      callback(null, { authorization: 'Basic ' + this.basicKey });
    } else {
      this._ensureValidAuthCredentials(false, function (err: ErrorInfo | null, tokenDetails?: API.Types.TokenDetails) {
        if (err) {
          callback(err);
          return;
        }
        if (!tokenDetails) {
          throw new Error('Auth.getAuthParams(): _ensureValidAuthCredentials returned no error or tokenDetails');
        }
        callback(null, { authorization: 'Bearer ' + Utils.toBase64(tokenDetails.token) });
      });
    }
  }

  /**
   * Get the current time based on the local clock,
   * or if the option queryTime is true, return the server time.
   * The server time offset from the local time is stored so that
   * only one request to the server to get the time is ever needed
   */
  getTimestamp(queryTime: boolean, callback: StandardCallback<number>): void {
    if (!this.isTimeOffsetSet() && (queryTime || this.authOptions.queryTime)) {
      this.client.time(callback);
    } else {
      callback(null, this.getTimestampUsingOffset());
    }
  }

  getTimestampUsingOffset() {
    return Utils.now() + (this.client.serverTimeOffset || 0);
  }

  isTimeOffsetSet() {
    return this.client.serverTimeOffset !== null;
  }

  _saveBasicOptions(authOptions: API.Types.AuthOptions) {
    this.method = 'basic';
    this.key = authOptions.key;
    this.basicKey = Utils.toBase64(authOptions.key as string);
    this.authOptions = authOptions || {};
    if ('clientId' in authOptions) {
      this._userSetClientId(authOptions.clientId);
    }
  }

  _saveTokenOptions(tokenParams: API.Types.TokenParams | null, authOptions: API.Types.AuthOptions | null) {
    this.method = 'token';

    if (tokenParams) {
      /* We temporarily persist tokenParams.timestamp in case a new token needs
       * to be requested, then null it out in the callback of
       * _ensureValidAuthCredentials for RSA10g compliance */
      this.tokenParams = tokenParams;
    }

    if (authOptions) {
      /* normalise */
      if (authOptions.token) {
        /* options.token may contain a token string or, for convenience, a TokenDetails */
        authOptions.tokenDetails =
          typeof authOptions.token === 'string'
            ? ({ token: authOptions.token } as API.Types.TokenDetails)
            : authOptions.token;
      }

      if (authOptions.tokenDetails) {
        this.tokenDetails = authOptions.tokenDetails;
      }

      if ('clientId' in authOptions) {
        this._userSetClientId(authOptions.clientId);
      }

      this.authOptions = authOptions;
    }
  }

  /* @param forceSupersede: force a new token request even if there's one in
   * progress, making all pending callbacks wait for the new one */
  _ensureValidAuthCredentials(
    forceSupersede: boolean,
    callback: (err: ErrorInfo | null, token?: API.Types.TokenDetails) => void
  ) {
    const token = this.tokenDetails;

    if (token) {
      if (this._tokenClientIdMismatch(token.clientId)) {
        /* 403 to trigger a permanently failed client - RSA15c */
        callback(
          new ErrorInfo(
            'Mismatch between clientId in token (' + token.clientId + ') and current clientId (' + this.clientId + ')',
            40102,
            403
          )
        );
        return;
      }
      /* RSA4b1 -- if we have a server time offset set already, we can
       * automatically remove expired tokens. Else just use the cached token. If it is
       * expired Ably will tell us and we'll discard it then. */
      if (!this.isTimeOffsetSet() || !token.expires || token.expires >= this.getTimestampUsingOffset()) {
        Logger.logAction(Logger.LOG_MINOR, 'Auth.getToken()', 'using cached token; expires = ' + token.expires);
        callback(null, token);
        return;
      }
      /* expired, so remove and fallthrough to getting a new one */
      Logger.logAction(Logger.LOG_MINOR, 'Auth.getToken()', 'deleting expired token');
      this.tokenDetails = null;
    }

    (this.waitingForTokenRequest || (this.waitingForTokenRequest = Multicaster.create())).push(callback);
    if (this.currentTokenRequestId !== null && !forceSupersede) {
      return;
    }

    /* Request a new token */
    const tokenRequestId = (this.currentTokenRequestId = getTokenRequestId());
    this.requestToken(this.tokenParams, this.authOptions, (err: Function, tokenResponse?: API.Types.TokenDetails) => {
      if ((this.currentTokenRequestId as number) > tokenRequestId) {
        Logger.logAction(
          Logger.LOG_MINOR,
          'Auth._ensureValidAuthCredentials()',
          'Discarding token request response; overtaken by newer one'
        );
        return;
      }
      this.currentTokenRequestId = null;
      const callbacks = this.waitingForTokenRequest || noop;
      this.waitingForTokenRequest = null;
      if (err) {
        callbacks(err);
        return;
      }
      callbacks(null, (this.tokenDetails = tokenResponse));
    });
  }

  /* User-set: check types, '*' is disallowed, throw any errors */
  _userSetClientId(clientId: string | undefined) {
    if (!(typeof clientId === 'string' || clientId === null)) {
      throw new ErrorInfo('clientId must be either a string or null', 40012, 400);
    } else if (clientId === '*') {
      throw new ErrorInfo(
        'Can’t use "*" as a clientId as that string is reserved. (To change the default token request behaviour to use a wildcard clientId, instantiate the library with {defaultTokenParams: {clientId: "*"}}), or if calling authorize(), pass it in as a tokenParam: authorize({clientId: "*"}, authOptions)',
        40012,
        400
      );
    } else {
      const err = this._uncheckedSetClientId(clientId);
      if (err) throw err;
    }
  }

  /* Ably-set: no typechecking, '*' is allowed but not set on this.clientId), return errors to the caller */
  _uncheckedSetClientId(clientId: string | undefined) {
    if (this._tokenClientIdMismatch(clientId)) {
      /* Should never happen in normal circumstances as realtime should
       * recognise mismatch and return an error */
      const msg = 'Unexpected clientId mismatch: client has ' + this.clientId + ', requested ' + clientId;
      const err = new ErrorInfo(msg, 40102, 401);
      Logger.logAction(Logger.LOG_ERROR, 'Auth._uncheckedSetClientId()', msg);
      return err;
    } else {
      /* RSA7a4: if options.clientId is provided and is not
       * null, it overrides defaultTokenParams.clientId */
      this.clientId = this.tokenParams.clientId = clientId;
      return null;
    }
  }

  _tokenClientIdMismatch(tokenClientId?: string | null): boolean {
    return !!(
      this.clientId &&
      this.clientId !== '*' &&
      tokenClientId &&
      tokenClientId !== '*' &&
      this.clientId !== tokenClientId
    );
  }

  static isTokenErr(error: IPartialErrorInfo) {
    return error.code && error.code >= 40140 && error.code < 40150;
  }

  revokeTokens(
    specifiers: TokenRevocationTargetSpecifier[],
    options?: TokenRevocationOptions,
    callback?: API.Types.StandardCallback<TokenRevocationResult>
  ): void;
  revokeTokens(
    specifiers: TokenRevocationTargetSpecifier[],
    options?: TokenRevocationOptions
  ): Promise<TokenRevocationResult>;
  revokeTokens(
    specifiers: TokenRevocationTargetSpecifier[],
    optionsOrCallbackArg?: TokenRevocationOptions | API.Types.StandardCallback<TokenRevocationResult>,
    callbackArg?: API.Types.StandardCallback<TokenRevocationResult>
  ): void | Promise<TokenRevocationResult> {
    if (useTokenAuth(this.client.options)) {
      throw new ErrorInfo('Cannot revoke tokens when using token auth', 40162, 401);
    }

    const keyName = this.client.options.keyName!;

    let resolvedOptions: TokenRevocationOptions;

    if (typeof optionsOrCallbackArg === 'function') {
      callbackArg = optionsOrCallbackArg;
      resolvedOptions = {};
    } else {
      resolvedOptions = optionsOrCallbackArg ?? {};
    }

    if (callbackArg === undefined) {
      if (this.client.options.promises) {
        return Utils.promisify(this, 'revokeTokens', [specifiers, resolvedOptions]);
      }
      callbackArg = noop;
    }

    const callback = callbackArg;

    const requestBodyDTO = {
      targets: specifiers.map((specifier) => `${specifier.type}:${specifier.value}`),
      ...resolvedOptions,
    };

    const format = this.client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Utils.defaultPostHeaders(this.client.options, format);

    if (this.client.options.headers) Utils.mixin(headers, this.client.options.headers);

    const requestBody = Utils.encodeBody(requestBodyDTO, format);
    Resource.post(
      this.client,
      `/keys/${keyName}/revokeTokens`,
      requestBody,
      headers,
      { newBatchResponse: 'true' },
      null,
      (err, body, headers, unpacked) => {
        if (err) {
          // TODO remove this type assertion after fixing https://github.com/ably/ably-js/issues/1405
          callback(err as API.Types.ErrorInfo);
          return;
        }

        const batchResult = (unpacked ? body : Utils.decodeBody(body, format)) as TokenRevocationResult;

        callback(null, batchResult);
      }
    );
  }
}

export default Auth;
