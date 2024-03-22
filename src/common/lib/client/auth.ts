import Logger from '../util/logger';
import * as Utils from '../util/utils';
import Multicaster, { MulticasterInstance } from '../util/multicaster';
import ErrorInfo, { IPartialErrorInfo } from '../types/errorinfo';
import { RequestResultError, RequestParams, RequestResult } from '../../types/http';
import * as API from '../../../../ably';
import BaseClient from './baseclient';
import BaseRealtime from './baserealtime';
import ClientOptions from '../../types/ClientOptions';
import HttpMethods from '../../constants/HttpMethods';
import HttpStatusCodes from 'common/constants/HttpStatusCodes';
import Platform, { Bufferlike } from '../../platform';
import Defaults from '../util/defaults';

type BatchResult<T> = API.BatchResult<T>;
type TokenRevocationTargetSpecifier = API.TokenRevocationTargetSpecifier;
type TokenRevocationOptions = API.TokenRevocationOptions;
type TokenRevocationSuccessResult = API.TokenRevocationSuccessResult;
type TokenRevocationFailureResult = API.TokenRevocationFailureResult;
type TokenRevocationResult = BatchResult<TokenRevocationSuccessResult | TokenRevocationFailureResult>;

const MAX_TOKEN_LENGTH = Math.pow(2, 17);
function random() {
  return ('000000' + Math.floor(Math.random() * 1e16)).slice(-16);
}

function isRealtime(client: BaseClient): client is BaseRealtime {
  return !!(client as BaseRealtime).connection;
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
  const bufferUtils = Platform.BufferUtils;

  const textBuffer = bufferUtils.utf8Encode(text);
  const keyBuffer = bufferUtils.utf8Encode(key);

  const digest = bufferUtils.hmacSha256(textBuffer, keyBuffer);

  return bufferUtils.base64Encode(digest);
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

function logAndValidateTokenAuthMethod(authOptions: AuthOptions) {
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
export function useTokenAuth(options: ClientOptions) {
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

/**
 * Auth options used only for testing.
 */
type PrivateAuthOptions = {
  requestHeaders?: Record<string, string>;
  suppressMaxLengthCheck?: boolean;
};

type AuthOptions = API.AuthOptions & PrivateAuthOptions;

class Auth {
  client: BaseClient;
  tokenParams: API.TokenParams;
  currentTokenRequestId: number | null;
  waitingForTokenRequest: MulticasterInstance<API.TokenDetails> | null;
  // This initialization is always overwritten and only used to prevent a TypeScript compiler error
  authOptions: AuthOptions = {} as AuthOptions;
  tokenDetails?: API.TokenDetails | null;
  method?: string;
  key?: string;
  basicKey?: string;
  clientId?: string | null;

  constructor(client: BaseClient, options: ClientOptions) {
    this.client = client;
    this.tokenParams = options.defaultTokenParams || {};
    /* The id of the current token request if one is in progress, else null */
    this.currentTokenRequestId = null;
    this.waitingForTokenRequest = null;

    if (useTokenAuth(options)) {
      /* Token auth */
      if (noWayToRenew(options)) {
        Logger.logAction(
          Logger.LOG_ERROR,
          'Auth()',
          'Warning: library initialized with a token literal without any way to renew the token when it expires (no authUrl, authCallback, or key). See https://help.ably.io/error/40171 for help',
        );
      }
      this._saveTokenOptions(options.defaultTokenParams as API.TokenDetails, options);
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
   */
  async authorize(): Promise<API.TokenDetails>;

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
   */
  async authorize(tokenParams: API.TokenParams | null): Promise<API.TokenDetails>;

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
   */
  async authorize(tokenParams: API.TokenParams | null, authOptions: AuthOptions | null): Promise<API.TokenDetails>;

  async authorize(
    tokenParams?: Record<string, any> | null,
    authOptions?: AuthOptions | null,
  ): Promise<API.TokenDetails> {
    /* RSA10a: authorize() call implies token auth. If a key is passed it, we
     * just check if it doesn't clash and assume we're generating a token from it */
    if (authOptions && authOptions.key && this.authOptions.key !== authOptions.key) {
      throw new ErrorInfo('Unable to update auth options with incompatible key', 40102, 401);
    }

    try {
      let tokenDetails = await this._forceNewToken(tokenParams ?? null, authOptions ?? null);

      /* RTC8
       * - When authorize called by an end user and have a realtime connection,
       * don't call back till new token has taken effect.
       * - Use this.client.connection as a proxy for (this.client instanceof BaseRealtime),
       * which doesn't work in node as BaseRealtime isn't part of the vm context for Rest clients */
      if (isRealtime(this.client)) {
        return new Promise((resolve, reject) => {
          (this.client as BaseRealtime).connection.connectionManager.onAuthUpdated(
            tokenDetails,
            (err: unknown, tokenDetails?: API.TokenDetails) => (err ? reject(err) : resolve(tokenDetails!)),
          );
        });
      } else {
        return tokenDetails;
      }
    } catch (err) {
      if ((this.client as BaseRealtime).connection && (err as ErrorInfo).statusCode === HttpStatusCodes.Forbidden) {
        /* Per RSA4d & RSA4d1, if the auth server explicitly repudiates our right to
         * stay connecticed by returning a 403, we actively disconnect the connection
         * even though we may well still have time left in the old token. */
        (this.client as BaseRealtime).connection.connectionManager.actOnErrorFromAuthorize(err as ErrorInfo);
      }
      throw err;
    }
  }

  /* For internal use, eg by connectionManager - useful when want to call back
   * as soon as we have the new token, rather than waiting for it to take
   * effect on the connection as #authorize does */
  async _forceNewToken(
    tokenParams: API.TokenParams | null,
    authOptions: AuthOptions | null,
  ): Promise<API.TokenDetails> {
    /* get rid of current token even if still valid */
    this.tokenDetails = null;

    /* _save normalises the tokenParams and authOptions and updates the auth
     * object. All subsequent operations should use the values on `this`,
     * not the passed in ones. */
    this._saveTokenOptions(tokenParams, authOptions);

    logAndValidateTokenAuthMethod(this.authOptions);

    try {
      return this._ensureValidAuthCredentials(true);
    } finally {
      /* RSA10g */
      delete this.tokenParams.timestamp;
      delete this.authOptions.queryTime;
    }
  }

  /**
   * Request an access token
   */
  async requestToken(): Promise<API.TokenDetails>;

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
   */
  async requestToken(tokenParams: API.TokenParams | null): Promise<API.TokenDetails>;

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
   */
  async requestToken(tokenParams: API.TokenParams | null, authOptions: AuthOptions): Promise<API.TokenDetails>;

  async requestToken(tokenParams?: API.TokenParams | null, authOptions?: AuthOptions): Promise<API.TokenDetails> {
    /* RSA8e: if authOptions passed in, they're used instead of stored, don't merge them */
    const resolvedAuthOptions = authOptions || this.authOptions;
    const resolvedTokenParams = tokenParams || Utils.copy(this.tokenParams);

    /* first set up whatever callback will be used to get signed
     * token requests */
    let tokenRequestCallback: (
        data: API.TokenParams,
        callback: (
          error: API.ErrorInfo | RequestResultError | string | null,
          tokenRequestOrDetails: API.TokenDetails | API.TokenRequest | string | null,
          contentType?: string,
        ) => void,
      ) => void,
      client = this.client;

    if (resolvedAuthOptions.authCallback) {
      Logger.logAction(Logger.LOG_MINOR, 'Auth.requestToken()', 'using token auth with authCallback');
      tokenRequestCallback = resolvedAuthOptions.authCallback;
    } else if (resolvedAuthOptions.authUrl) {
      Logger.logAction(Logger.LOG_MINOR, 'Auth.requestToken()', 'using token auth with authUrl');
      tokenRequestCallback = (params, cb) => {
        const authHeaders = Utils.mixin(
          { accept: 'application/json, text/plain' },
          resolvedAuthOptions.authHeaders,
        ) as Record<string, string>;
        const usePost = resolvedAuthOptions.authMethod && resolvedAuthOptions.authMethod.toLowerCase() === 'post';
        let providedQsParams;
        /* Combine authParams with any qs params given in the authUrl */
        const queryIdx = resolvedAuthOptions.authUrl!.indexOf('?');
        if (queryIdx > -1) {
          providedQsParams = Utils.parseQueryString(resolvedAuthOptions.authUrl!.slice(queryIdx));
          resolvedAuthOptions.authUrl = resolvedAuthOptions.authUrl!.slice(0, queryIdx);
          if (!usePost) {
            /* In case of conflict, authParams take precedence over qs params in the authUrl */
            resolvedAuthOptions.authParams = Utils.mixin(
              providedQsParams,
              resolvedAuthOptions.authParams,
            ) as typeof resolvedAuthOptions.authParams;
          }
        }
        /* RSA8c2 */
        const authParams = Utils.mixin({}, resolvedAuthOptions.authParams || {}, params) as RequestParams;
        const authUrlRequestCallback = function (result: RequestResult) {
          let body = (result.body ?? null) as string | Bufferlike | API.TokenDetails | API.TokenRequest | null;

          let contentType: string | null = null;
          if (result.error) {
            Logger.logAction(
              Logger.LOG_MICRO,
              'Auth.requestToken().tokenRequestCallback',
              'Received Error: ' + Utils.inspectError(result.error),
            );
          } else {
            const contentTypeHeaderOrHeaders = result.headers!['content-type'] ?? null;
            if (Array.isArray(contentTypeHeaderOrHeaders)) {
              // Combine multiple header values into a comma-separated list per https://datatracker.ietf.org/doc/html/rfc9110#section-5.2; see https://github.com/ably/ably-js/issues/1616 for doing this consistently across the codebase.
              contentType = contentTypeHeaderOrHeaders.join(', ');
            } else {
              contentType = contentTypeHeaderOrHeaders;
            }
            Logger.logAction(
              Logger.LOG_MICRO,
              'Auth.requestToken().tokenRequestCallback',
              'Received; content-type: ' + contentType + '; body: ' + Utils.inspectBody(body),
            );
          }
          if (result.error) {
            cb(result.error, null);
            return;
          }
          if (result.unpacked) {
            cb(null, body as Exclude<typeof body, Bufferlike>);
            return;
          }
          if (Platform.BufferUtils.isBuffer(body)) body = body.toString();
          if (!contentType) {
            cb(new ErrorInfo('authUrl response is missing a content-type header', 40170, 401), null);
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
                401,
              ),
              null,
            );
            return;
          }
          if (json) {
            if ((body as string).length > MAX_TOKEN_LENGTH) {
              cb(new ErrorInfo('authUrl response exceeded max permitted length', 40170, 401), null);
              return;
            }
            try {
              body = JSON.parse(body as string);
            } catch (e) {
              cb(
                new ErrorInfo(
                  'Unexpected error processing authURL response; err = ' + (e as Error).message,
                  40170,
                  401,
                ),
                null,
              );
              return;
            }
          }
          cb(null, body as Exclude<typeof body, Bufferlike>, contentType);
        };
        Logger.logAction(
          Logger.LOG_MICRO,
          'Auth.requestToken().tokenRequestCallback',
          'Requesting token from ' +
            resolvedAuthOptions.authUrl +
            '; Params: ' +
            JSON.stringify(authParams) +
            '; method: ' +
            (usePost ? 'POST' : 'GET'),
        );
        if (usePost) {
          /* send body form-encoded */
          const headers = authHeaders || {};
          headers['content-type'] = 'application/x-www-form-urlencoded';
          const body = Utils.toQueryString(authParams).slice(1); /* slice is to remove the initial '?' */
          Utils.whenPromiseSettles(
            this.client.http.doUri(
              HttpMethods.Post,
              resolvedAuthOptions.authUrl!,
              headers,
              body,
              providedQsParams as Record<string, string>,
            ),
            (err: any, result) =>
              err
                ? authUrlRequestCallback(err) // doUri isn’t meant to throw an error, but handle any just in case
                : authUrlRequestCallback(result!),
          );
        } else {
          Utils.whenPromiseSettles(
            this.client.http.doUri(HttpMethods.Get, resolvedAuthOptions.authUrl!, authHeaders || {}, null, authParams),
            (err: any, result) =>
              err
                ? authUrlRequestCallback(err) // doUri isn’t meant to throw an error, but handle any just in case
                : authUrlRequestCallback(result!),
          );
        }
      };
    } else if (resolvedAuthOptions.key) {
      Logger.logAction(Logger.LOG_MINOR, 'Auth.requestToken()', 'using token auth with client-side signing');
      tokenRequestCallback = (params, cb) => {
        Utils.whenPromiseSettles(this.createTokenRequest(params, resolvedAuthOptions), (err, result) =>
          cb(err as string | ErrorInfo | null, result ?? null),
        );
      };
    } else {
      const msg =
        'Need a new token, but authOptions does not include any way to request one (no authUrl, authCallback, or key)';
      Logger.logAction(
        Logger.LOG_ERROR,
        'Auth()',
        'library initialized with a token literal without any way to renew the token when it expires (no authUrl, authCallback, or key). See https://help.ably.io/error/40171 for help',
      );
      throw new ErrorInfo(msg, 40171, 403);
    }

    /* normalise token params */
    if ('capability' in (resolvedTokenParams as Record<string, any>))
      (resolvedTokenParams as Record<string, any>).capability = c14n(
        (resolvedTokenParams as Record<string, any>).capability,
      );

    const tokenRequest = (
      signedTokenParams: Record<string, any>,
      tokenCb: (err: RequestResultError | null, tokenResponse?: API.TokenDetails | string, unpacked?: boolean) => void,
    ) => {
      const keyName = signedTokenParams.keyName,
        path = '/keys/' + keyName + '/requestToken',
        tokenUri = function (host: string) {
          return client.baseUri(host) + path;
        };

      const requestHeaders = Defaults.defaultPostHeaders(this.client.options);
      if (resolvedAuthOptions.requestHeaders) Utils.mixin(requestHeaders, resolvedAuthOptions.requestHeaders);
      Logger.logAction(
        Logger.LOG_MICRO,
        'Auth.requestToken().requestToken',
        'Sending POST to ' + path + '; Token params: ' + JSON.stringify(signedTokenParams),
      );
      Utils.whenPromiseSettles(
        this.client.http.do(HttpMethods.Post, tokenUri, requestHeaders, JSON.stringify(signedTokenParams), null),
        (err: any, result) =>
          err
            ? tokenCb(err) // doUri isn’t meant to throw an error, but handle any just in case
            : tokenCb(result!.error, result!.body as API.TokenDetails | string | undefined, result!.unpacked),
      );
    };

    return new Promise((resolve, reject) => {
      let tokenRequestCallbackTimeoutExpired = false,
        timeoutLength = this.client.options.timeouts.realtimeRequestTimeout,
        tokenRequestCallbackTimeout = setTimeout(function () {
          tokenRequestCallbackTimeoutExpired = true;
          const msg = 'Token request callback timed out after ' + timeoutLength / 1000 + ' seconds';
          Logger.logAction(Logger.LOG_ERROR, 'Auth.requestToken()', msg);
          reject(new ErrorInfo(msg, 40170, 401));
        }, timeoutLength);

      tokenRequestCallback!(resolvedTokenParams, function (err, tokenRequestOrDetails, contentType) {
        if (tokenRequestCallbackTimeoutExpired) return;
        clearTimeout(tokenRequestCallbackTimeout);

        if (err) {
          Logger.logAction(
            Logger.LOG_ERROR,
            'Auth.requestToken()',
            'token request signing call returned error; err = ' + Utils.inspectError(err),
          );
          reject(normaliseAuthcallbackError(err));
          return;
        }
        /* the response from the callback might be a token string, a signed request or a token details */
        if (typeof tokenRequestOrDetails === 'string') {
          if (tokenRequestOrDetails.length === 0) {
            reject(new ErrorInfo('Token string is empty', 40170, 401));
          } else if (tokenRequestOrDetails.length > MAX_TOKEN_LENGTH) {
            reject(
              new ErrorInfo(
                'Token string exceeded max permitted length (was ' + tokenRequestOrDetails.length + ' bytes)',
                40170,
                401,
              ),
            );
          } else if (tokenRequestOrDetails === 'undefined' || tokenRequestOrDetails === 'null') {
            /* common failure mode with poorly-implemented authCallbacks */
            reject(new ErrorInfo('Token string was literal null/undefined', 40170, 401));
          } else if (
            tokenRequestOrDetails[0] === '{' &&
            !(contentType && contentType.indexOf('application/jwt') > -1)
          ) {
            reject(
              new ErrorInfo(
                "Token was double-encoded; make sure you're not JSON-encoding an already encoded token request or details",
                40170,
                401,
              ),
            );
          } else {
            resolve({ token: tokenRequestOrDetails } as API.TokenDetails);
          }
          return;
        }
        if (typeof tokenRequestOrDetails !== 'object' || tokenRequestOrDetails === null) {
          const msg =
            'Expected token request callback to call back with a token string or token request/details object, but got a ' +
            typeof tokenRequestOrDetails;
          Logger.logAction(Logger.LOG_ERROR, 'Auth.requestToken()', msg);
          reject(new ErrorInfo(msg, 40170, 401));
          return;
        }
        const objectSize = JSON.stringify(tokenRequestOrDetails).length;
        if (objectSize > MAX_TOKEN_LENGTH && !resolvedAuthOptions.suppressMaxLengthCheck) {
          reject(
            new ErrorInfo(
              'Token request/details object exceeded max permitted stringified size (was ' + objectSize + ' bytes)',
              40170,
              401,
            ),
          );
          return;
        }
        if ('issued' in tokenRequestOrDetails) {
          /* a tokenDetails object */
          resolve(tokenRequestOrDetails);
          return;
        }
        if (!('keyName' in tokenRequestOrDetails)) {
          const msg =
            'Expected token request callback to call back with a token string, token request object, or token details object';
          Logger.logAction(Logger.LOG_ERROR, 'Auth.requestToken()', msg);
          reject(new ErrorInfo(msg, 40170, 401));
          return;
        }
        /* it's a token request, so make the request */
        tokenRequest(tokenRequestOrDetails, function (err, tokenResponse, unpacked) {
          if (err) {
            Logger.logAction(
              Logger.LOG_ERROR,
              'Auth.requestToken()',
              'token request API call returned error; err = ' + Utils.inspectError(err),
            );
            reject(normaliseAuthcallbackError(err));
            return;
          }
          if (!unpacked) tokenResponse = JSON.parse(tokenResponse as string);
          Logger.logAction(Logger.LOG_MINOR, 'Auth.getToken()', 'token received');
          resolve(tokenResponse as API.TokenDetails);
        });
      });
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
   */
  async createTokenRequest(tokenParams: API.TokenParams | null, authOptions: any): Promise<API.TokenRequest> {
    /* RSA9h: if authOptions passed in, they're used instead of stored, don't merge them */
    authOptions = authOptions || this.authOptions;
    tokenParams = tokenParams || Utils.copy<API.TokenParams>(this.tokenParams);

    const key = authOptions.key;
    if (!key) {
      throw new ErrorInfo('No key specified', 40101, 403);
    }
    const keyParts = key.split(':'),
      keyName = keyParts[0],
      keySecret = keyParts[1];

    if (!keySecret) {
      throw new ErrorInfo('Invalid key specified', 40101, 403);
    }

    if (tokenParams.clientId === '') {
      throw new ErrorInfo('clientId can’t be an empty string', 40012, 400);
    }

    if ('capability' in tokenParams) {
      tokenParams.capability = c14n(tokenParams.capability);
    }

    const request: Partial<API.TokenRequest> = Utils.mixin({ keyName: keyName }, tokenParams),
      clientId = tokenParams.clientId || '',
      ttl = tokenParams.ttl || '',
      capability = tokenParams.capability || '';

    if (!request.timestamp) {
      request.timestamp = await this.getTimestamp(authOptions && authOptions.queryTime);
    }

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

    return request as API.TokenRequest;
  }

  /**
   * Get the auth query params to use for a websocket connection,
   * based on the current auth parameters
   */
  async getAuthParams(): Promise<Record<string, string>> {
    if (this.method == 'basic') return { key: this.key! };
    else {
      let tokenDetails = await this._ensureValidAuthCredentials(false);
      if (!tokenDetails) {
        throw new Error('Auth.getAuthParams(): _ensureValidAuthCredentials returned no error or tokenDetails');
      }
      return { access_token: tokenDetails.token };
    }
  }

  /**
   * Get the authorization header to use for a REST or comet request,
   * based on the current auth parameters
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    if (this.method == 'basic') {
      return { authorization: 'Basic ' + this.basicKey };
    } else {
      const tokenDetails = await this._ensureValidAuthCredentials(false);
      if (!tokenDetails) {
        throw new Error('Auth.getAuthParams(): _ensureValidAuthCredentials returned no error or tokenDetails');
      }
      return { authorization: 'Bearer ' + Utils.toBase64(tokenDetails.token) };
    }
  }

  /**
   * Get the current time based on the local clock,
   * or if the option queryTime is true, return the server time.
   * The server time offset from the local time is stored so that
   * only one request to the server to get the time is ever needed
   */
  async getTimestamp(queryTime: boolean): Promise<number> {
    if (!this.isTimeOffsetSet() && (queryTime || this.authOptions.queryTime)) {
      return this.client.time();
    } else {
      return this.getTimestampUsingOffset();
    }
  }

  getTimestampUsingOffset() {
    return Date.now() + (this.client.serverTimeOffset || 0);
  }

  isTimeOffsetSet() {
    return this.client.serverTimeOffset !== null;
  }

  _saveBasicOptions(authOptions: AuthOptions) {
    this.method = 'basic';
    this.key = authOptions.key;
    this.basicKey = Utils.toBase64(authOptions.key as string);
    this.authOptions = authOptions || {};
    if ('clientId' in authOptions) {
      this._userSetClientId(authOptions.clientId);
    }
  }

  _saveTokenOptions(tokenParams: API.TokenParams | null, authOptions: AuthOptions | null) {
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
            ? ({ token: authOptions.token } as API.TokenDetails)
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
  async _ensureValidAuthCredentials(forceSupersede: boolean): Promise<API.TokenDetails> {
    const token = this.tokenDetails;

    if (token) {
      if (this._tokenClientIdMismatch(token.clientId)) {
        /* 403 to trigger a permanently failed client - RSA15c */
        throw new ErrorInfo(
          'Mismatch between clientId in token (' + token.clientId + ') and current clientId (' + this.clientId + ')',
          40102,
          403,
        );
      }
      /* RSA4b1 -- if we have a server time offset set already, we can
       * automatically remove expired tokens. Else just use the cached token. If it is
       * expired Ably will tell us and we'll discard it then. */
      if (!this.isTimeOffsetSet() || !token.expires || token.expires >= this.getTimestampUsingOffset()) {
        Logger.logAction(Logger.LOG_MINOR, 'Auth.getToken()', 'using cached token; expires = ' + token.expires);
        return token;
      }
      /* expired, so remove and fallthrough to getting a new one */
      Logger.logAction(Logger.LOG_MINOR, 'Auth.getToken()', 'deleting expired token');
      this.tokenDetails = null;
    }

    const promise = (
      this.waitingForTokenRequest || (this.waitingForTokenRequest = Multicaster.create())
    ).createPromise();
    if (this.currentTokenRequestId !== null && !forceSupersede) {
      return promise;
    }

    /* Request a new token */
    const tokenRequestId = (this.currentTokenRequestId = getTokenRequestId());

    let tokenResponse: API.TokenDetails,
      caughtError: ErrorInfo | null = null;
    try {
      tokenResponse = await this.requestToken(this.tokenParams, this.authOptions);
    } catch (err) {
      caughtError = err as ErrorInfo;
    }

    if ((this.currentTokenRequestId as number) > tokenRequestId) {
      Logger.logAction(
        Logger.LOG_MINOR,
        'Auth._ensureValidAuthCredentials()',
        'Discarding token request response; overtaken by newer one',
      );
      return promise;
    }

    this.currentTokenRequestId = null;
    const multicaster = this.waitingForTokenRequest;
    this.waitingForTokenRequest = null;
    if (caughtError) {
      multicaster?.rejectAll(caughtError);
      return promise;
    }
    multicaster?.resolveAll((this.tokenDetails = tokenResponse!));

    return promise;
  }

  /* User-set: check types, '*' is disallowed, throw any errors */
  _userSetClientId(clientId: string | undefined) {
    if (!(typeof clientId === 'string' || clientId === null)) {
      throw new ErrorInfo('clientId must be either a string or null', 40012, 400);
    } else if (clientId === '*') {
      throw new ErrorInfo(
        'Can’t use "*" as a clientId as that string is reserved. (To change the default token request behaviour to use a wildcard clientId, instantiate the library with {defaultTokenParams: {clientId: "*"}}), or if calling authorize(), pass it in as a tokenParam: authorize({clientId: "*"}, authOptions)',
        40012,
        400,
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
  ): Promise<TokenRevocationResult> {
    return this.client.rest.revokeTokens(specifiers, options);
  }
}

export default Auth;
