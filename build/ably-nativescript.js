/*!
 * @license Copyright 2015-2022 Ably Real-time Ltd (ably.com)
 *
 * Ably JavaScript Library v2.6.3
 * https://github.com/ably/ably-js
 *
 * Released under the Apache Licence v2.0
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("nativescript-websockets"), require("@nativescript/core/application-settings"));
	else if(typeof define === 'function' && define.amd)
		define(["nativescript-websockets", "@nativescript/core/application-settings"], factory);
	else if(typeof exports === 'object')
		exports["Ably"] = factory(require("nativescript-websockets"), require("@nativescript/core/application-settings"));
	else
		root["Ably"] = factory(root["nativescript-websockets"], root["@nativescript/core/application-settings"]);
})(global, (__WEBPACK_EXTERNAL_MODULE__7602__, __WEBPACK_EXTERNAL_MODULE__1008__) => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 3912:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
var HttpMethods;
(function (HttpMethods) {
    HttpMethods["Get"] = "get";
    HttpMethods["Delete"] = "delete";
    HttpMethods["Post"] = "post";
    HttpMethods["Put"] = "put";
    HttpMethods["Patch"] = "patch";
})(HttpMethods || (HttpMethods = {}));
exports["default"] = HttpMethods;


/***/ }),

/***/ 5632:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isSuccessCode = void 0;
var HttpStatusCodes;
(function (HttpStatusCodes) {
    HttpStatusCodes[HttpStatusCodes["Success"] = 200] = "Success";
    HttpStatusCodes[HttpStatusCodes["NoContent"] = 204] = "NoContent";
    HttpStatusCodes[HttpStatusCodes["BadRequest"] = 400] = "BadRequest";
    HttpStatusCodes[HttpStatusCodes["Unauthorized"] = 401] = "Unauthorized";
    HttpStatusCodes[HttpStatusCodes["Forbidden"] = 403] = "Forbidden";
    HttpStatusCodes[HttpStatusCodes["RequestTimeout"] = 408] = "RequestTimeout";
    HttpStatusCodes[HttpStatusCodes["InternalServerError"] = 500] = "InternalServerError";
})(HttpStatusCodes || (HttpStatusCodes = {}));
function isSuccessCode(statusCode) {
    return statusCode >= HttpStatusCodes.Success && statusCode < HttpStatusCodes.BadRequest;
}
exports.isSuccessCode = isSuccessCode;
exports["default"] = HttpStatusCodes;


/***/ }),

/***/ 1228:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TransportNames = void 0;
var TransportNames;
(function (TransportNames) {
    TransportNames.WebSocket = 'web_socket';
    TransportNames.Comet = 'comet';
    TransportNames.XhrPolling = 'xhr_polling';
})(TransportNames = exports.TransportNames || (exports.TransportNames = {}));


/***/ }),

/***/ 6882:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
var XHRStates;
(function (XHRStates) {
    XHRStates[XHRStates["REQ_SEND"] = 0] = "REQ_SEND";
    XHRStates[XHRStates["REQ_RECV"] = 1] = "REQ_RECV";
    XHRStates[XHRStates["REQ_RECV_POLL"] = 2] = "REQ_RECV_POLL";
    XHRStates[XHRStates["REQ_RECV_STREAM"] = 3] = "REQ_RECV_STREAM";
})(XHRStates || (XHRStates = {}));
exports["default"] = XHRStates;


/***/ }),

/***/ 1047:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.useTokenAuth = void 0;
const tslib_1 = __webpack_require__(7582);
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const multicaster_1 = tslib_1.__importDefault(__webpack_require__(578));
const errorinfo_1 = tslib_1.__importDefault(__webpack_require__(1798));
const HttpMethods_1 = tslib_1.__importDefault(__webpack_require__(3912));
const HttpStatusCodes_1 = tslib_1.__importDefault(__webpack_require__(5632));
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
const defaults_1 = tslib_1.__importDefault(__webpack_require__(3925));
const MAX_TOKEN_LENGTH = Math.pow(2, 17);
function random() {
    return ('000000' + Math.floor(Math.random() * 1e16)).slice(-16);
}
function isRealtime(client) {
    return !!client.connection;
}
/* A client auth callback may give errors in any number of formats; normalise to an ErrorInfo or PartialErrorInfo */
function normaliseAuthcallbackError(err) {
    if (!Utils.isErrorInfoOrPartialErrorInfo(err)) {
        return new errorinfo_1.default(Utils.inspectError(err), err.code || 40170, err.statusCode || 401);
    }
    /* network errors will not have an inherent error code */
    if (!err.code) {
        if (err.statusCode === 403) {
            err.code = 40300;
        }
        else {
            err.code = 40170;
            /* normalise statusCode to 401 per RSA4e */
            err.statusCode = 401;
        }
    }
    return err;
}
let hmac = (text, key) => {
    const bufferUtils = platform_1.default.BufferUtils;
    const textBuffer = bufferUtils.utf8Encode(text);
    const keyBuffer = bufferUtils.utf8Encode(key);
    const digest = bufferUtils.hmacSha256(textBuffer, keyBuffer);
    return bufferUtils.base64Encode(digest);
};
function c14n(capability) {
    if (!capability)
        return '';
    if (typeof capability == 'string')
        capability = JSON.parse(capability);
    const c14nCapability = Object.create(null);
    const keys = Utils.keysArray(capability, true);
    if (!keys)
        return '';
    keys.sort();
    for (let i = 0; i < keys.length; i++) {
        c14nCapability[keys[i]] = capability[keys[i]].sort();
    }
    return JSON.stringify(c14nCapability);
}
function logAndValidateTokenAuthMethod(authOptions, logger) {
    if (authOptions.authCallback) {
        logger_1.default.logAction(logger, logger_1.default.LOG_MINOR, 'Auth()', 'using token auth with authCallback');
    }
    else if (authOptions.authUrl) {
        logger_1.default.logAction(logger, logger_1.default.LOG_MINOR, 'Auth()', 'using token auth with authUrl');
    }
    else if (authOptions.key) {
        logger_1.default.logAction(logger, logger_1.default.LOG_MINOR, 'Auth()', 'using token auth with client-side signing');
    }
    else if (authOptions.tokenDetails) {
        logger_1.default.logAction(logger, logger_1.default.LOG_MINOR, 'Auth()', 'using token auth with supplied token only');
    }
    else {
        const msg = 'authOptions must include valid authentication parameters';
        logger_1.default.logAction(logger, logger_1.default.LOG_ERROR, 'Auth()', msg);
        throw new Error(msg);
    }
}
function basicAuthForced(options) {
    return 'useTokenAuth' in options && !options.useTokenAuth;
}
/* RSA4 */
function useTokenAuth(options) {
    return (options.useTokenAuth ||
        (!basicAuthForced(options) && (options.authCallback || options.authUrl || options.token || options.tokenDetails)));
}
exports.useTokenAuth = useTokenAuth;
/* RSA4a */
function noWayToRenew(options) {
    return !options.key && !options.authCallback && !options.authUrl;
}
let trId = 0;
function getTokenRequestId() {
    return trId++;
}
class Auth {
    constructor(client, options) {
        // This initialization is always overwritten and only used to prevent a TypeScript compiler error
        this.authOptions = {};
        this.client = client;
        this.tokenParams = options.defaultTokenParams || {};
        /* The id of the current token request if one is in progress, else null */
        this.currentTokenRequestId = null;
        this.waitingForTokenRequest = null;
        if (useTokenAuth(options)) {
            /* Token auth */
            if (noWayToRenew(options)) {
                logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'Auth()', 'Warning: library initialized with a token literal without any way to renew the token when it expires (no authUrl, authCallback, or key). See https://help.ably.io/error/40171 for help');
            }
            this._saveTokenOptions(options.defaultTokenParams, options);
            logAndValidateTokenAuthMethod(this.authOptions, this.logger);
        }
        else {
            /* Basic auth */
            if (!options.key) {
                const msg = 'No authentication options provided; need one of: key, authUrl, or authCallback (or for testing only, token or tokenDetails)';
                logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'Auth()', msg);
                throw new errorinfo_1.default(msg, 40160, 401);
            }
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'Auth()', 'anonymous, using basic auth');
            this._saveBasicOptions(options);
        }
    }
    get logger() {
        return this.client.logger;
    }
    async authorize(tokenParams, authOptions) {
        /* RSA10a: authorize() call implies token auth. If a key is passed it, we
         * just check if it doesn't clash and assume we're generating a token from it */
        if (authOptions && authOptions.key && this.authOptions.key !== authOptions.key) {
            throw new errorinfo_1.default('Unable to update auth options with incompatible key', 40102, 401);
        }
        try {
            let tokenDetails = await this._forceNewToken(tokenParams !== null && tokenParams !== void 0 ? tokenParams : null, authOptions !== null && authOptions !== void 0 ? authOptions : null);
            /* RTC8
             * - When authorize called by an end user and have a realtime connection,
             * don't call back till new token has taken effect.
             * - Use this.client.connection as a proxy for (this.client instanceof BaseRealtime),
             * which doesn't work in node as BaseRealtime isn't part of the vm context for Rest clients */
            if (isRealtime(this.client)) {
                return new Promise((resolve, reject) => {
                    this.client.connection.connectionManager.onAuthUpdated(tokenDetails, (err, tokenDetails) => (err ? reject(err) : resolve(tokenDetails)));
                });
            }
            else {
                return tokenDetails;
            }
        }
        catch (err) {
            if (this.client.connection && err.statusCode === HttpStatusCodes_1.default.Forbidden) {
                /* Per RSA4d & RSA4d1, if the auth server explicitly repudiates our right to
                 * stay connecticed by returning a 403, we actively disconnect the connection
                 * even though we may well still have time left in the old token. */
                this.client.connection.connectionManager.actOnErrorFromAuthorize(err);
            }
            throw err;
        }
    }
    /* For internal use, eg by connectionManager - useful when want to call back
     * as soon as we have the new token, rather than waiting for it to take
     * effect on the connection as #authorize does */
    async _forceNewToken(tokenParams, authOptions) {
        /* get rid of current token even if still valid */
        this.tokenDetails = null;
        /* _save normalises the tokenParams and authOptions and updates the auth
         * object. All subsequent operations should use the values on `this`,
         * not the passed in ones. */
        this._saveTokenOptions(tokenParams, authOptions);
        logAndValidateTokenAuthMethod(this.authOptions, this.logger);
        try {
            return this._ensureValidAuthCredentials(true);
        }
        finally {
            /* RSA10g */
            delete this.tokenParams.timestamp;
            delete this.authOptions.queryTime;
        }
    }
    async requestToken(tokenParams, authOptions) {
        /* RSA8e: if authOptions passed in, they're used instead of stored, don't merge them */
        const resolvedAuthOptions = authOptions || this.authOptions;
        const resolvedTokenParams = tokenParams || Utils.copy(this.tokenParams);
        /* first set up whatever callback will be used to get signed
         * token requests */
        let tokenRequestCallback, client = this.client;
        if (resolvedAuthOptions.authCallback) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'Auth.requestToken()', 'using token auth with authCallback');
            tokenRequestCallback = resolvedAuthOptions.authCallback;
        }
        else if (resolvedAuthOptions.authUrl) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'Auth.requestToken()', 'using token auth with authUrl');
            tokenRequestCallback = (params, cb) => {
                const authHeaders = Utils.mixin({ accept: 'application/json, text/plain' }, resolvedAuthOptions.authHeaders);
                const usePost = resolvedAuthOptions.authMethod && resolvedAuthOptions.authMethod.toLowerCase() === 'post';
                let providedQsParams;
                /* Combine authParams with any qs params given in the authUrl */
                const queryIdx = resolvedAuthOptions.authUrl.indexOf('?');
                if (queryIdx > -1) {
                    providedQsParams = Utils.parseQueryString(resolvedAuthOptions.authUrl.slice(queryIdx));
                    resolvedAuthOptions.authUrl = resolvedAuthOptions.authUrl.slice(0, queryIdx);
                    if (!usePost) {
                        /* In case of conflict, authParams take precedence over qs params in the authUrl */
                        resolvedAuthOptions.authParams = Utils.mixin(providedQsParams, resolvedAuthOptions.authParams);
                    }
                }
                /* RSA8c2 */
                const authParams = Utils.mixin({}, resolvedAuthOptions.authParams || {}, params);
                const authUrlRequestCallback = (result) => {
                    var _a, _b;
                    let body = ((_a = result.body) !== null && _a !== void 0 ? _a : null);
                    let contentType = null;
                    if (result.error) {
                        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'Auth.requestToken().tokenRequestCallback', 'Received Error: ' + Utils.inspectError(result.error));
                    }
                    else {
                        const contentTypeHeaderOrHeaders = (_b = result.headers['content-type']) !== null && _b !== void 0 ? _b : null;
                        if (Array.isArray(contentTypeHeaderOrHeaders)) {
                            // Combine multiple header values into a comma-separated list per https://datatracker.ietf.org/doc/html/rfc9110#section-5.2; see https://github.com/ably/ably-js/issues/1616 for doing this consistently across the codebase.
                            contentType = contentTypeHeaderOrHeaders.join(', ');
                        }
                        else {
                            contentType = contentTypeHeaderOrHeaders;
                        }
                        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'Auth.requestToken().tokenRequestCallback', 'Received; content-type: ' + contentType + '; body: ' + Utils.inspectBody(body));
                    }
                    if (result.error) {
                        cb(result.error, null);
                        return;
                    }
                    if (result.unpacked) {
                        cb(null, body);
                        return;
                    }
                    if (platform_1.default.BufferUtils.isBuffer(body))
                        body = body.toString();
                    if (!contentType) {
                        cb(new errorinfo_1.default('authUrl response is missing a content-type header', 40170, 401), null);
                        return;
                    }
                    const json = contentType.indexOf('application/json') > -1, text = contentType.indexOf('text/plain') > -1 || contentType.indexOf('application/jwt') > -1;
                    if (!json && !text) {
                        cb(new errorinfo_1.default('authUrl responded with unacceptable content-type ' +
                            contentType +
                            ', should be either text/plain, application/jwt or application/json', 40170, 401), null);
                        return;
                    }
                    if (json) {
                        if (body.length > MAX_TOKEN_LENGTH) {
                            cb(new errorinfo_1.default('authUrl response exceeded max permitted length', 40170, 401), null);
                            return;
                        }
                        try {
                            body = JSON.parse(body);
                        }
                        catch (e) {
                            cb(new errorinfo_1.default('Unexpected error processing authURL response; err = ' + e.message, 40170, 401), null);
                            return;
                        }
                    }
                    cb(null, body, contentType);
                };
                logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'Auth.requestToken().tokenRequestCallback', 'Requesting token from ' +
                    resolvedAuthOptions.authUrl +
                    '; Params: ' +
                    JSON.stringify(authParams) +
                    '; method: ' +
                    (usePost ? 'POST' : 'GET'));
                if (usePost) {
                    /* send body form-encoded */
                    const headers = authHeaders || {};
                    headers['content-type'] = 'application/x-www-form-urlencoded';
                    const body = Utils.toQueryString(authParams).slice(1); /* slice is to remove the initial '?' */
                    Utils.whenPromiseSettles(this.client.http.doUri(HttpMethods_1.default.Post, resolvedAuthOptions.authUrl, headers, body, providedQsParams), (err, result) => err
                        ? authUrlRequestCallback(err) // doUri isn’t meant to throw an error, but handle any just in case
                        : authUrlRequestCallback(result));
                }
                else {
                    Utils.whenPromiseSettles(this.client.http.doUri(HttpMethods_1.default.Get, resolvedAuthOptions.authUrl, authHeaders || {}, null, authParams), (err, result) => err
                        ? authUrlRequestCallback(err) // doUri isn’t meant to throw an error, but handle any just in case
                        : authUrlRequestCallback(result));
                }
            };
        }
        else if (resolvedAuthOptions.key) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'Auth.requestToken()', 'using token auth with client-side signing');
            tokenRequestCallback = (params, cb) => {
                Utils.whenPromiseSettles(this.createTokenRequest(params, resolvedAuthOptions), (err, result) => cb(err, result !== null && result !== void 0 ? result : null));
            };
        }
        else {
            const msg = 'Need a new token, but authOptions does not include any way to request one (no authUrl, authCallback, or key)';
            logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'Auth()', 'library initialized with a token literal without any way to renew the token when it expires (no authUrl, authCallback, or key). See https://help.ably.io/error/40171 for help');
            throw new errorinfo_1.default(msg, 40171, 403);
        }
        /* normalise token params */
        if ('capability' in resolvedTokenParams)
            resolvedTokenParams.capability = c14n(resolvedTokenParams.capability);
        const tokenRequest = (signedTokenParams, tokenCb) => {
            const keyName = signedTokenParams.keyName, path = '/keys/' + keyName + '/requestToken', tokenUri = function (host) {
                return client.baseUri(host) + path;
            };
            const requestHeaders = defaults_1.default.defaultPostHeaders(this.client.options);
            if (resolvedAuthOptions.requestHeaders)
                Utils.mixin(requestHeaders, resolvedAuthOptions.requestHeaders);
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'Auth.requestToken().requestToken', 'Sending POST to ' + path + '; Token params: ' + JSON.stringify(signedTokenParams));
            Utils.whenPromiseSettles(this.client.http.do(HttpMethods_1.default.Post, tokenUri, requestHeaders, JSON.stringify(signedTokenParams), null), (err, result) => err
                ? tokenCb(err) // doUri isn’t meant to throw an error, but handle any just in case
                : tokenCb(result.error, result.body, result.unpacked));
        };
        return new Promise((resolve, reject) => {
            let tokenRequestCallbackTimeoutExpired = false, timeoutLength = this.client.options.timeouts.realtimeRequestTimeout, tokenRequestCallbackTimeout = setTimeout(() => {
                tokenRequestCallbackTimeoutExpired = true;
                const msg = 'Token request callback timed out after ' + timeoutLength / 1000 + ' seconds';
                logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'Auth.requestToken()', msg);
                reject(new errorinfo_1.default(msg, 40170, 401));
            }, timeoutLength);
            tokenRequestCallback(resolvedTokenParams, (err, tokenRequestOrDetails, contentType) => {
                if (tokenRequestCallbackTimeoutExpired)
                    return;
                clearTimeout(tokenRequestCallbackTimeout);
                if (err) {
                    logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'Auth.requestToken()', 'token request signing call returned error; err = ' + Utils.inspectError(err));
                    reject(normaliseAuthcallbackError(err));
                    return;
                }
                /* the response from the callback might be a token string, a signed request or a token details */
                if (typeof tokenRequestOrDetails === 'string') {
                    if (tokenRequestOrDetails.length === 0) {
                        reject(new errorinfo_1.default('Token string is empty', 40170, 401));
                    }
                    else if (tokenRequestOrDetails.length > MAX_TOKEN_LENGTH) {
                        reject(new errorinfo_1.default('Token string exceeded max permitted length (was ' + tokenRequestOrDetails.length + ' bytes)', 40170, 401));
                    }
                    else if (tokenRequestOrDetails === 'undefined' || tokenRequestOrDetails === 'null') {
                        /* common failure mode with poorly-implemented authCallbacks */
                        reject(new errorinfo_1.default('Token string was literal null/undefined', 40170, 401));
                    }
                    else if (tokenRequestOrDetails[0] === '{' &&
                        !(contentType && contentType.indexOf('application/jwt') > -1)) {
                        reject(new errorinfo_1.default("Token was double-encoded; make sure you're not JSON-encoding an already encoded token request or details", 40170, 401));
                    }
                    else {
                        resolve({ token: tokenRequestOrDetails });
                    }
                    return;
                }
                if (typeof tokenRequestOrDetails !== 'object' || tokenRequestOrDetails === null) {
                    const msg = 'Expected token request callback to call back with a token string or token request/details object, but got a ' +
                        typeof tokenRequestOrDetails;
                    logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'Auth.requestToken()', msg);
                    reject(new errorinfo_1.default(msg, 40170, 401));
                    return;
                }
                const objectSize = JSON.stringify(tokenRequestOrDetails).length;
                if (objectSize > MAX_TOKEN_LENGTH && !resolvedAuthOptions.suppressMaxLengthCheck) {
                    reject(new errorinfo_1.default('Token request/details object exceeded max permitted stringified size (was ' + objectSize + ' bytes)', 40170, 401));
                    return;
                }
                if ('issued' in tokenRequestOrDetails) {
                    /* a tokenDetails object */
                    resolve(tokenRequestOrDetails);
                    return;
                }
                if (!('keyName' in tokenRequestOrDetails)) {
                    const msg = 'Expected token request callback to call back with a token string, token request object, or token details object';
                    logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'Auth.requestToken()', msg);
                    reject(new errorinfo_1.default(msg, 40170, 401));
                    return;
                }
                /* it's a token request, so make the request */
                tokenRequest(tokenRequestOrDetails, (err, tokenResponse, unpacked) => {
                    if (err) {
                        logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'Auth.requestToken()', 'token request API call returned error; err = ' + Utils.inspectError(err));
                        reject(normaliseAuthcallbackError(err));
                        return;
                    }
                    if (!unpacked)
                        tokenResponse = JSON.parse(tokenResponse);
                    logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'Auth.getToken()', 'token received');
                    resolve(tokenResponse);
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
    async createTokenRequest(tokenParams, authOptions) {
        /* RSA9h: if authOptions passed in, they're used instead of stored, don't merge them */
        authOptions = authOptions || this.authOptions;
        tokenParams = tokenParams || Utils.copy(this.tokenParams);
        const key = authOptions.key;
        if (!key) {
            throw new errorinfo_1.default('No key specified', 40101, 403);
        }
        const keyParts = key.split(':'), keyName = keyParts[0], keySecret = keyParts[1];
        if (!keySecret) {
            throw new errorinfo_1.default('Invalid key specified', 40101, 403);
        }
        if (tokenParams.clientId === '') {
            throw new errorinfo_1.default('clientId can’t be an empty string', 40012, 400);
        }
        if ('capability' in tokenParams) {
            tokenParams.capability = c14n(tokenParams.capability);
        }
        const request = Utils.mixin({ keyName: keyName }, tokenParams), clientId = tokenParams.clientId || '', ttl = tokenParams.ttl || '', capability = tokenParams.capability || '';
        if (!request.timestamp) {
            request.timestamp = await this.getTimestamp(authOptions && authOptions.queryTime);
        }
        /* nonce */
        /* NOTE: there is no expectation that the client
         * specifies the nonce; this is done by the library
         * However, this can be overridden by the client
         * simply for testing purposes. */
        const nonce = request.nonce || (request.nonce = random()), timestamp = request.timestamp;
        const signText = request.keyName + '\n' + ttl + '\n' + capability + '\n' + clientId + '\n' + timestamp + '\n' + nonce + '\n';
        /* mac */
        /* NOTE: there is no expectation that the client
         * specifies the mac; this is done by the library
         * However, this can be overridden by the client
         * simply for testing purposes. */
        request.mac = request.mac || hmac(signText, keySecret);
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'Auth.getTokenRequest()', 'generated signed request');
        return request;
    }
    /**
     * Get the auth query params to use for a websocket connection,
     * based on the current auth parameters
     */
    async getAuthParams() {
        if (this.method == 'basic')
            return { key: this.key };
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
    async getAuthHeaders() {
        if (this.method == 'basic') {
            return { authorization: 'Basic ' + this.basicKey };
        }
        else {
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
    async getTimestamp(queryTime) {
        if (!this.isTimeOffsetSet() && (queryTime || this.authOptions.queryTime)) {
            return this.client.time();
        }
        else {
            return this.getTimestampUsingOffset();
        }
    }
    getTimestampUsingOffset() {
        return Date.now() + (this.client.serverTimeOffset || 0);
    }
    isTimeOffsetSet() {
        return this.client.serverTimeOffset !== null;
    }
    _saveBasicOptions(authOptions) {
        this.method = 'basic';
        this.key = authOptions.key;
        this.basicKey = Utils.toBase64(authOptions.key);
        this.authOptions = authOptions || {};
        if ('clientId' in authOptions) {
            this._userSetClientId(authOptions.clientId);
        }
    }
    _saveTokenOptions(tokenParams, authOptions) {
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
                        ? { token: authOptions.token }
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
    async _ensureValidAuthCredentials(forceSupersede) {
        const token = this.tokenDetails;
        if (token) {
            if (this._tokenClientIdMismatch(token.clientId)) {
                /* 403 to trigger a permanently failed client - RSA15c */
                throw new errorinfo_1.default('Mismatch between clientId in token (' + token.clientId + ') and current clientId (' + this.clientId + ')', 40102, 403);
            }
            /* RSA4b1 -- if we have a server time offset set already, we can
             * automatically remove expired tokens. Else just use the cached token. If it is
             * expired Ably will tell us and we'll discard it then. */
            if (!this.isTimeOffsetSet() || !token.expires || token.expires >= this.getTimestampUsingOffset()) {
                logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'Auth.getToken()', 'using cached token; expires = ' + token.expires);
                return token;
            }
            /* expired, so remove and fallthrough to getting a new one */
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'Auth.getToken()', 'deleting expired token');
            this.tokenDetails = null;
        }
        const promise = (this.waitingForTokenRequest || (this.waitingForTokenRequest = multicaster_1.default.create(this.logger))).createPromise();
        if (this.currentTokenRequestId !== null && !forceSupersede) {
            return promise;
        }
        /* Request a new token */
        const tokenRequestId = (this.currentTokenRequestId = getTokenRequestId());
        let tokenResponse, caughtError = null;
        try {
            tokenResponse = await this.requestToken(this.tokenParams, this.authOptions);
        }
        catch (err) {
            caughtError = err;
        }
        if (this.currentTokenRequestId > tokenRequestId) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'Auth._ensureValidAuthCredentials()', 'Discarding token request response; overtaken by newer one');
            return promise;
        }
        this.currentTokenRequestId = null;
        const multicaster = this.waitingForTokenRequest;
        this.waitingForTokenRequest = null;
        if (caughtError) {
            multicaster === null || multicaster === void 0 ? void 0 : multicaster.rejectAll(caughtError);
            return promise;
        }
        multicaster === null || multicaster === void 0 ? void 0 : multicaster.resolveAll((this.tokenDetails = tokenResponse));
        return promise;
    }
    /* User-set: check types, '*' is disallowed, throw any errors */
    _userSetClientId(clientId) {
        if (!(typeof clientId === 'string' || clientId === null)) {
            throw new errorinfo_1.default('clientId must be either a string or null', 40012, 400);
        }
        else if (clientId === '*') {
            throw new errorinfo_1.default('Can’t use "*" as a clientId as that string is reserved. (To change the default token request behaviour to use a wildcard clientId, instantiate the library with {defaultTokenParams: {clientId: "*"}}), or if calling authorize(), pass it in as a tokenParam: authorize({clientId: "*"}, authOptions)', 40012, 400);
        }
        else {
            const err = this._uncheckedSetClientId(clientId);
            if (err)
                throw err;
        }
    }
    /* Ably-set: no typechecking, '*' is allowed but not set on this.clientId), return errors to the caller */
    _uncheckedSetClientId(clientId) {
        if (this._tokenClientIdMismatch(clientId)) {
            /* Should never happen in normal circumstances as realtime should
             * recognise mismatch and return an error */
            const msg = 'Unexpected clientId mismatch: client has ' + this.clientId + ', requested ' + clientId;
            const err = new errorinfo_1.default(msg, 40102, 401);
            logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'Auth._uncheckedSetClientId()', msg);
            return err;
        }
        else {
            /* RSA7a4: if options.clientId is provided and is not
             * null, it overrides defaultTokenParams.clientId */
            this.clientId = this.tokenParams.clientId = clientId;
            return null;
        }
    }
    _tokenClientIdMismatch(tokenClientId) {
        return !!(this.clientId &&
            this.clientId !== '*' &&
            tokenClientId &&
            tokenClientId !== '*' &&
            this.clientId !== tokenClientId);
    }
    static isTokenErr(error) {
        return error.code && error.code >= 40140 && error.code < 40150;
    }
    revokeTokens(specifiers, options) {
        return this.client.rest.revokeTokens(specifiers, options);
    }
}
exports["default"] = Auth;


/***/ }),

/***/ 8738:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(7582);
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const defaults_1 = tslib_1.__importDefault(__webpack_require__(3925));
const auth_1 = tslib_1.__importDefault(__webpack_require__(1047));
const errorinfo_1 = tslib_1.__importDefault(__webpack_require__(1798));
const http_1 = __webpack_require__(1223);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
const utils_1 = __webpack_require__(2678);
/**
 `BaseClient` acts as the base class for all of the client classes exported by the SDK. It is an implementation detail and this class is not advertised publicly.
 */
class BaseClient {
    constructor(options) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        /**
         * These exports are for use by UMD plugins; reason being so that constructors and static methods can be accessed by these plugins without needing to import the classes directly and result in the class existing in both the plugin and the core library.
         */
        this.Platform = platform_1.default;
        this.ErrorInfo = errorinfo_1.default;
        this.Logger = logger_1.default;
        this.Defaults = defaults_1.default;
        this.Utils = Utils;
        this._additionalHTTPRequestImplementations = (_a = options.plugins) !== null && _a !== void 0 ? _a : null;
        this.logger = new logger_1.default();
        this.logger.setLog(options.logLevel, options.logHandler);
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'BaseClient()', 'initialized with clientOptions ' + platform_1.default.Config.inspect(options));
        this._MsgPack = (_c = (_b = options.plugins) === null || _b === void 0 ? void 0 : _b.MsgPack) !== null && _c !== void 0 ? _c : null;
        const normalOptions = (this.options = defaults_1.default.normaliseOptions(options, this._MsgPack, this.logger));
        /* process options */
        if (normalOptions.key) {
            const keyMatch = normalOptions.key.match(/^([^:\s]+):([^:.\s]+)$/);
            if (!keyMatch) {
                const msg = 'invalid key parameter';
                logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'BaseClient()', msg);
                throw new errorinfo_1.default(msg, 40400, 404);
            }
            normalOptions.keyName = keyMatch[1];
            normalOptions.keySecret = keyMatch[2];
        }
        if ('clientId' in normalOptions) {
            if (!(typeof normalOptions.clientId === 'string' || normalOptions.clientId === null))
                throw new errorinfo_1.default('clientId must be either a string or null', 40012, 400);
            else if (normalOptions.clientId === '*')
                throw new errorinfo_1.default('Can’t use "*" as a clientId as that string is reserved. (To change the default token request behaviour to use a wildcard clientId, use {defaultTokenParams: {clientId: "*"}})', 40012, 400);
        }
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'BaseClient()', 'started; version = ' + defaults_1.default.version);
        this._currentFallback = null;
        this.serverTimeOffset = null;
        this.http = new http_1.Http(this);
        this.auth = new auth_1.default(this, normalOptions);
        this._rest = ((_d = options.plugins) === null || _d === void 0 ? void 0 : _d.Rest) ? new options.plugins.Rest(this) : null;
        this._Crypto = (_f = (_e = options.plugins) === null || _e === void 0 ? void 0 : _e.Crypto) !== null && _f !== void 0 ? _f : null;
        this.__FilteredSubscriptions = (_h = (_g = options.plugins) === null || _g === void 0 ? void 0 : _g.MessageInteractions) !== null && _h !== void 0 ? _h : null;
        this._Annotations = (_k = (_j = options.plugins) === null || _j === void 0 ? void 0 : _j.Annotations) !== null && _k !== void 0 ? _k : null;
    }
    get rest() {
        if (!this._rest) {
            (0, utils_1.throwMissingPluginError)('Rest');
        }
        return this._rest;
    }
    get _FilteredSubscriptions() {
        if (!this.__FilteredSubscriptions) {
            (0, utils_1.throwMissingPluginError)('MessageInteractions');
        }
        return this.__FilteredSubscriptions;
    }
    get channels() {
        return this.rest.channels;
    }
    get push() {
        return this.rest.push;
    }
    get device() {
        var _a;
        if (!((_a = this.options.plugins) === null || _a === void 0 ? void 0 : _a.Push) || !this.push.LocalDevice) {
            (0, utils_1.throwMissingPluginError)('Push');
        }
        if (!this._device) {
            this._device = this.push.LocalDevice.load(this);
        }
        return this._device;
    }
    baseUri(host) {
        return defaults_1.default.getHttpScheme(this.options) + host + ':' + defaults_1.default.getPort(this.options, false);
    }
    async stats(params) {
        return this.rest.stats(params);
    }
    async time(params) {
        return this.rest.time(params);
    }
    async request(method, path, version, params, body, customHeaders) {
        return this.rest.request(method, path, version, params, body, customHeaders);
    }
    batchPublish(specOrSpecs) {
        return this.rest.batchPublish(specOrSpecs);
    }
    batchPresence(channels) {
        return this.rest.batchPresence(channels);
    }
    setLog(logOptions) {
        this.logger.setLog(logOptions.level, logOptions.handler);
    }
}
BaseClient.Platform = platform_1.default;
exports["default"] = BaseClient;


/***/ }),

/***/ 5792:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(7582);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const baseclient_1 = tslib_1.__importDefault(__webpack_require__(8738));
const eventemitter_1 = tslib_1.__importDefault(__webpack_require__(3388));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const connection_1 = tslib_1.__importDefault(__webpack_require__(4313));
const realtimechannel_1 = tslib_1.__importDefault(__webpack_require__(6884));
const errorinfo_1 = tslib_1.__importDefault(__webpack_require__(1798));
const TransportName_1 = __webpack_require__(1228);
const defaults_1 = tslib_1.__importDefault(__webpack_require__(3925));
/**
 `BaseRealtime` is an export of the tree-shakable version of the SDK, and acts as the base class for the `DefaultRealtime` class exported by the non tree-shakable version.
 */
class BaseRealtime extends baseclient_1.default {
    /*
     * The public typings declare that this only accepts an object, but since we want to emit a good error message in the case where a non-TypeScript user does one of these things:
     *
     * 1. passes a string (which is quite likely if they’re e.g. migrating from the default variant to the modular variant)
     * 2. passes no argument at all
     *
     * tell the compiler that these cases are possible so that it forces us to handle them.
     */
    constructor(options) {
        var _a, _b;
        super(defaults_1.default.objectifyOptions(options, false, 'BaseRealtime', logger_1.default.defaultLogger));
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'Realtime()', '');
        // currently we cannot support using Ably.Realtime instances in Vercel Edge runtime.
        // this error can be removed after fixing https://github.com/ably/ably-js/issues/1731,
        // and https://github.com/ably/ably-js/issues/1732
        // @ts-ignore
        if (typeof EdgeRuntime === 'string') {
            throw new errorinfo_1.default(`Ably.Realtime instance cannot be used in Vercel Edge runtime.` +
                ` If you are running Vercel Edge functions, please replace your` +
                ` "new Ably.Realtime()" with "new Ably.Rest()" and use Ably Rest API` +
                ` instead of the Realtime API. If you are server-rendering your application` +
                ` in the Vercel Edge runtime, please use the condition "if (typeof EdgeRuntime === 'string')"` +
                ` to prevent instantiating Ably.Realtime instance during SSR in the Vercel Edge runtime.`, 40000, 400);
        }
        this._additionalTransportImplementations = BaseRealtime.transportImplementationsFromPlugins(this.options.plugins);
        this._RealtimePresence = (_b = (_a = this.options.plugins) === null || _a === void 0 ? void 0 : _a.RealtimePresence) !== null && _b !== void 0 ? _b : null;
        this.connection = new connection_1.default(this, this.options);
        this._channels = new Channels(this);
        if (this.options.autoConnect !== false)
            this.connect();
    }
    static transportImplementationsFromPlugins(plugins) {
        const transports = {};
        if (plugins === null || plugins === void 0 ? void 0 : plugins.WebSocketTransport) {
            transports[TransportName_1.TransportNames.WebSocket] = plugins.WebSocketTransport;
        }
        if (plugins === null || plugins === void 0 ? void 0 : plugins.XHRPolling) {
            transports[TransportName_1.TransportNames.XhrPolling] = plugins.XHRPolling;
        }
        return transports;
    }
    get channels() {
        return this._channels;
    }
    connect() {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'Realtime.connect()', '');
        this.connection.connect();
    }
    close() {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'Realtime.close()', '');
        this.connection.close();
    }
}
// internal API to make EventEmitter usable in other SDKs
BaseRealtime.EventEmitter = eventemitter_1.default;
class Channels extends eventemitter_1.default {
    constructor(realtime) {
        super(realtime.logger);
        this.realtime = realtime;
        this.all = Object.create(null);
        realtime.connection.connectionManager.on('transport.active', () => {
            this.onTransportActive();
        });
    }
    channelSerials() {
        let serials = {};
        for (const name of Utils.keysArray(this.all, true)) {
            const channel = this.all[name];
            if (channel.properties.channelSerial) {
                serials[name] = channel.properties.channelSerial;
            }
        }
        return serials;
    }
    // recoverChannels gets the given channels and sets their channel serials.
    recoverChannels(channelSerials) {
        for (const name of Utils.keysArray(channelSerials, true)) {
            const channel = this.get(name);
            channel.properties.channelSerial = channelSerials[name];
        }
    }
    // Access to this method is synchronised by ConnectionManager#processChannelMessage.
    async processChannelMessage(msg) {
        const channelName = msg.channel;
        if (channelName === undefined) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'Channels.processChannelMessage()', 'received event unspecified channel, action = ' + msg.action);
            return;
        }
        const channel = this.all[channelName];
        if (!channel) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'Channels.processChannelMessage()', 'received event for non-existent channel: ' + channelName);
            return;
        }
        await channel.processMessage(msg);
    }
    /* called when a transport becomes connected; reattempt attach/detach
     * for channels that are attaching or detaching. */
    onTransportActive() {
        for (const channelName in this.all) {
            const channel = this.all[channelName];
            if (channel.state === 'attaching' || channel.state === 'detaching') {
                channel.checkPendingState();
            }
            else if (channel.state === 'suspended') {
                channel._attach(false, null);
            }
            else if (channel.state === 'attached') {
                // Note explicity request the state, channel.attach() would do nothing
                // as its already attached.
                channel.requestState('attaching');
            }
        }
    }
    /* Connection interruptions (ie when the connection will no longer queue
     * events) imply connection state changes for any channel which is either
     * attached, pending, or will attempt to become attached in the future */
    propogateConnectionInterruption(connectionState, reason) {
        const connectionStateToChannelState = {
            closing: 'detached',
            closed: 'detached',
            failed: 'failed',
            suspended: 'suspended',
        };
        const fromChannelStates = ['attaching', 'attached', 'detaching', 'suspended'];
        const toChannelState = connectionStateToChannelState[connectionState];
        for (const channelId in this.all) {
            const channel = this.all[channelId];
            if (fromChannelStates.includes(channel.state)) {
                channel.notifyState(toChannelState, reason);
            }
        }
    }
    get(name, channelOptions) {
        name = String(name);
        let channel = this.all[name];
        if (!channel) {
            channel = this.all[name] = new realtimechannel_1.default(this.realtime, name, channelOptions);
        }
        else if (channelOptions) {
            if (channel._shouldReattachToSetOptions(channelOptions, channel.channelOptions)) {
                throw new errorinfo_1.default('Channels.get() cannot be used to set channel options that would cause the channel to reattach. Please, use RealtimeChannel.setOptions() instead.', 40000, 400);
            }
            channel.setOptions(channelOptions);
        }
        return channel;
    }
    getDerived(name, deriveOptions, channelOptions) {
        if (deriveOptions.filter) {
            const filter = Utils.toBase64(deriveOptions.filter);
            const match = Utils.matchDerivedChannel(name);
            name = `[filter=${filter}${match.qualifierParam}]${match.channelName}`;
        }
        return this.get(name, channelOptions);
    }
    /* Included to support certain niche use-cases; most users should ignore this.
     * Please do not use this unless you know what you're doing */
    release(name) {
        name = String(name);
        const channel = this.all[name];
        if (!channel) {
            return;
        }
        const releaseErr = channel.getReleaseErr();
        if (releaseErr) {
            throw releaseErr;
        }
        delete this.all[name];
    }
}
exports["default"] = BaseRealtime;


/***/ }),

/***/ 3730:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BaseRest = void 0;
const tslib_1 = __webpack_require__(7582);
const baseclient_1 = tslib_1.__importDefault(__webpack_require__(8738));
const rest_1 = __webpack_require__(8708);
const defaults_1 = tslib_1.__importDefault(__webpack_require__(3925));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
/**
 `BaseRest` is an export of the tree-shakable version of the SDK, and acts as the base class for the `DefaultRest` class exported by the non tree-shakable version.

 It always includes the `Rest` plugin.
 */
class BaseRest extends baseclient_1.default {
    /*
     * The public typings declare that this only accepts an object, but since we want to emit a good error message in the case where a non-TypeScript user does one of these things:
     *
     * 1. passes a string (which is quite likely if they’re e.g. migrating from the default variant to the modular variant)
     * 2. passes no argument at all
     *
     * tell the compiler that these cases are possible so that it forces us to handle them.
     */
    constructor(options) {
        super(defaults_1.default.objectifyOptions(options, false, 'BaseRest', logger_1.default.defaultLogger, { Rest: rest_1.Rest }));
    }
}
exports.BaseRest = BaseRest;


/***/ }),

/***/ 9358:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
class ChannelStateChange {
    constructor(previous, current, resumed, hasBacklog, reason) {
        this.previous = previous;
        this.current = current;
        if (current === 'attached') {
            this.resumed = resumed;
            this.hasBacklog = hasBacklog;
        }
        if (reason)
            this.reason = reason;
    }
}
exports["default"] = ChannelStateChange;


/***/ }),

/***/ 4313:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(7582);
const eventemitter_1 = tslib_1.__importDefault(__webpack_require__(3388));
const connectionmanager_1 = tslib_1.__importDefault(__webpack_require__(3959));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
class Connection extends eventemitter_1.default {
    constructor(ably, options) {
        super(ably.logger);
        this.whenState = ((state) => {
            return eventemitter_1.default.prototype.whenState.call(this, state, this.state);
        });
        this.ably = ably;
        this.connectionManager = new connectionmanager_1.default(ably, options);
        this.state = this.connectionManager.state.state;
        this.key = undefined;
        this.id = undefined;
        this.errorReason = null;
        this.connectionManager.on('connectionstate', (stateChange) => {
            const state = (this.state = stateChange.current);
            platform_1.default.Config.nextTick(() => {
                this.emit(state, stateChange);
            });
        });
        this.connectionManager.on('update', (stateChange) => {
            platform_1.default.Config.nextTick(() => {
                this.emit('update', stateChange);
            });
        });
    }
    connect() {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'Connection.connect()', '');
        this.connectionManager.requestState({ state: 'connecting' });
    }
    async ping() {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'Connection.ping()', '');
        return this.connectionManager.ping();
    }
    close() {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'Connection.close()', 'connectionKey = ' + this.key);
        this.connectionManager.requestState({ state: 'closing' });
    }
    get recoveryKey() {
        this.logger.deprecationWarning('The `Connection.recoveryKey` attribute has been replaced by the `Connection.createRecoveryKey()` method. Replace your usage of `recoveryKey` with the return value of `createRecoveryKey()`. `recoveryKey` will be removed in a future version.');
        return this.createRecoveryKey();
    }
    createRecoveryKey() {
        return this.connectionManager.createRecoveryKey();
    }
}
exports["default"] = Connection;


/***/ }),

/***/ 7313:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
class ConnectionStateChange {
    constructor(previous, current, retryIn, reason) {
        this.previous = previous;
        this.current = current;
        if (retryIn)
            this.retryIn = retryIn;
        if (reason)
            this.reason = reason;
    }
}
exports["default"] = ConnectionStateChange;


/***/ }),

/***/ 5788:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DefaultRealtime = void 0;
const tslib_1 = __webpack_require__(7582);
const baserealtime_1 = tslib_1.__importDefault(__webpack_require__(5792));
const modularplugins_1 = __webpack_require__(5507);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const connectionmanager_1 = tslib_1.__importDefault(__webpack_require__(3959));
const protocolmessage_1 = tslib_1.__importDefault(__webpack_require__(8294));
const defaultmessage_1 = __webpack_require__(1128);
const realtimepresence_1 = tslib_1.__importDefault(__webpack_require__(6258));
const defaultpresencemessage_1 = __webpack_require__(5321);
const defaultannotation_1 = __webpack_require__(1738);
const websockettransport_1 = tslib_1.__importDefault(__webpack_require__(2346));
const filteredsubscriptions_1 = __webpack_require__(1506);
const presencemap_1 = __webpack_require__(7872);
const presencemessage_1 = tslib_1.__importStar(__webpack_require__(4470));
const realtimeannotations_1 = tslib_1.__importDefault(__webpack_require__(6810));
const restannotations_1 = tslib_1.__importDefault(__webpack_require__(1560));
const annotation_1 = tslib_1.__importStar(__webpack_require__(9327));
const http_1 = __webpack_require__(1223);
const defaults_1 = tslib_1.__importDefault(__webpack_require__(3925));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
/**
 `DefaultRealtime` is the class that the non tree-shakable version of the SDK exports as `Realtime`. It ensures that this version of the SDK includes all of the functionality which is optionally available in the tree-shakable version.
 */
class DefaultRealtime extends baserealtime_1.default {
    // The public typings declare that this requires an argument to be passed, but since we want to emit a good error message in the case where a non-TypeScript user does not pass an argument, tell the compiler that this is possible so that it forces us to handle it.
    constructor(options) {
        var _a;
        const MsgPack = DefaultRealtime._MsgPack;
        if (!MsgPack) {
            throw new Error('Expected DefaultRealtime._MsgPack to have been set');
        }
        super(defaults_1.default.objectifyOptions(options, true, 'Realtime', logger_1.default.defaultLogger, Object.assign(Object.assign({}, modularplugins_1.allCommonModularPlugins), { Crypto: (_a = DefaultRealtime.Crypto) !== null && _a !== void 0 ? _a : undefined, MsgPack, RealtimePresence: {
                RealtimePresence: realtimepresence_1.default,
                PresenceMessage: presencemessage_1.default,
                WirePresenceMessage: presencemessage_1.WirePresenceMessage,
            }, Annotations: {
                Annotation: annotation_1.default,
                WireAnnotation: annotation_1.WireAnnotation,
                RealtimeAnnotations: realtimeannotations_1.default,
                RestAnnotations: restannotations_1.default,
            }, WebSocketTransport: websockettransport_1.default, MessageInteractions: filteredsubscriptions_1.FilteredSubscriptions })));
    }
    static get Crypto() {
        if (this._Crypto === null) {
            throw new Error('Encryption not enabled; use ably.encryption.js instead');
        }
        return this._Crypto;
    }
    static set Crypto(newValue) {
        this._Crypto = newValue;
    }
}
exports.DefaultRealtime = DefaultRealtime;
DefaultRealtime.Utils = Utils;
DefaultRealtime.ConnectionManager = connectionmanager_1.default;
DefaultRealtime.ProtocolMessage = protocolmessage_1.default;
DefaultRealtime._Crypto = null;
DefaultRealtime.Message = defaultmessage_1.DefaultMessage;
DefaultRealtime.PresenceMessage = defaultpresencemessage_1.DefaultPresenceMessage;
DefaultRealtime.Annotation = defaultannotation_1.DefaultAnnotation;
DefaultRealtime._MsgPack = null;
// Used by tests
DefaultRealtime._Http = http_1.Http;
DefaultRealtime._PresenceMap = presencemap_1.PresenceMap;


/***/ }),

/***/ 6930:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DefaultRest = void 0;
const tslib_1 = __webpack_require__(7582);
const baserest_1 = __webpack_require__(3730);
const modularplugins_1 = __webpack_require__(5507);
const defaultmessage_1 = __webpack_require__(1128);
const defaultpresencemessage_1 = __webpack_require__(5321);
const defaultannotation_1 = __webpack_require__(1738);
const http_1 = __webpack_require__(1223);
const realtimeannotations_1 = tslib_1.__importDefault(__webpack_require__(6810));
const restannotations_1 = tslib_1.__importDefault(__webpack_require__(1560));
const annotation_1 = tslib_1.__importStar(__webpack_require__(9327));
const defaults_1 = tslib_1.__importDefault(__webpack_require__(3925));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
/**
 `DefaultRest` is the class that the non tree-shakable version of the SDK exports as `Rest`. It ensures that this version of the SDK includes all of the functionality which is optionally available in the tree-shakable version.
 */
class DefaultRest extends baserest_1.BaseRest {
    // The public typings declare that this requires an argument to be passed, but since we want to emit a good error message in the case where a non-TypeScript user does not pass an argument, tell the compiler that this is possible so that it forces us to handle it.
    constructor(options) {
        var _a, _b;
        const MsgPack = DefaultRest._MsgPack;
        if (!MsgPack) {
            throw new Error('Expected DefaultRest._MsgPack to have been set');
        }
        super(defaults_1.default.objectifyOptions(options, true, 'Rest', logger_1.default.defaultLogger, Object.assign(Object.assign({}, modularplugins_1.allCommonModularPlugins), { Crypto: (_a = DefaultRest.Crypto) !== null && _a !== void 0 ? _a : undefined, MsgPack: (_b = DefaultRest._MsgPack) !== null && _b !== void 0 ? _b : undefined, Annotations: {
                Annotation: annotation_1.default,
                WireAnnotation: annotation_1.WireAnnotation,
                RealtimeAnnotations: realtimeannotations_1.default,
                RestAnnotations: restannotations_1.default,
            } })));
    }
    static get Crypto() {
        if (this._Crypto === null) {
            throw new Error('Encryption not enabled; use ably.encryption.js instead');
        }
        return this._Crypto;
    }
    static set Crypto(newValue) {
        this._Crypto = newValue;
    }
}
exports.DefaultRest = DefaultRest;
DefaultRest._Crypto = null;
DefaultRest.Message = defaultmessage_1.DefaultMessage;
DefaultRest.PresenceMessage = defaultpresencemessage_1.DefaultPresenceMessage;
DefaultRest.Annotation = defaultannotation_1.DefaultAnnotation;
DefaultRest._MsgPack = null;
// Used by tests
DefaultRest._Http = http_1.Http;


/***/ }),

/***/ 1506:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FilteredSubscriptions = void 0;
class FilteredSubscriptions {
    static subscribeFilter(channel, filter, listener) {
        const filteredListener = (m) => {
            var _a, _b, _c, _d, _e, _f;
            const mapping = {
                name: m.name,
                refTimeserial: (_b = (_a = m.extras) === null || _a === void 0 ? void 0 : _a.ref) === null || _b === void 0 ? void 0 : _b.timeserial,
                refType: (_d = (_c = m.extras) === null || _c === void 0 ? void 0 : _c.ref) === null || _d === void 0 ? void 0 : _d.type,
                isRef: !!((_f = (_e = m.extras) === null || _e === void 0 ? void 0 : _e.ref) === null || _f === void 0 ? void 0 : _f.timeserial),
                clientId: m.clientId,
            };
            // Check if any values are defined in the filter and if they match the value in the message object
            if (Object.entries(filter).find(([key, value]) => value !== undefined ? mapping[key] !== value : false)) {
                return;
            }
            listener(m);
        };
        this.addFilteredSubscription(channel, filter, listener, filteredListener);
        channel.subscriptions.on(filteredListener);
    }
    // Adds a new filtered subscription
    static addFilteredSubscription(channel, filter, realListener, filteredListener) {
        var _a;
        if (!channel.filteredSubscriptions) {
            channel.filteredSubscriptions = new Map();
        }
        if (channel.filteredSubscriptions.has(realListener)) {
            const realListenerMap = channel.filteredSubscriptions.get(realListener);
            // Add the filtered listener to the map, or append to the array if this filter has already been used
            realListenerMap.set(filter, ((_a = realListenerMap === null || realListenerMap === void 0 ? void 0 : realListenerMap.get(filter)) === null || _a === void 0 ? void 0 : _a.concat(filteredListener)) || [filteredListener]);
        }
        else {
            channel.filteredSubscriptions.set(realListener, new Map([[filter, [filteredListener]]]));
        }
    }
    static getAndDeleteFilteredSubscriptions(channel, filter, realListener) {
        // No filtered subscriptions map means there has been no filtered subscriptions yet, so return nothing
        if (!channel.filteredSubscriptions) {
            return [];
        }
        // Only a filter is passed in with no specific listener
        if (!realListener && filter) {
            // Return each listener which is attached to the specified filter object
            return Array.from(channel.filteredSubscriptions.entries())
                .map(([key, filterMaps]) => {
                var _a;
                // Get (then delete) the maps matching this filter
                let listenerMaps = filterMaps.get(filter);
                filterMaps.delete(filter);
                // Clear the parent if nothing is left
                if (filterMaps.size === 0) {
                    (_a = channel.filteredSubscriptions) === null || _a === void 0 ? void 0 : _a.delete(key);
                }
                return listenerMaps;
            })
                .reduce((prev, cur) => (cur ? prev.concat(...cur) : prev), []);
        }
        // No subscriptions for this listener
        if (!realListener || !channel.filteredSubscriptions.has(realListener)) {
            return [];
        }
        const realListenerMap = channel.filteredSubscriptions.get(realListener);
        // If no filter is specified return all listeners using that function
        if (!filter) {
            // array.flat is not available unless we support es2019 or higher
            const listeners = Array.from(realListenerMap.values()).reduce((prev, cur) => prev.concat(...cur), []);
            // remove the listener from the map
            channel.filteredSubscriptions.delete(realListener);
            return listeners;
        }
        let listeners = realListenerMap.get(filter);
        realListenerMap.delete(filter);
        return listeners || [];
    }
}
exports.FilteredSubscriptions = FilteredSubscriptions;


/***/ }),

/***/ 5507:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.allCommonModularPlugins = void 0;
const rest_1 = __webpack_require__(8708);
exports.allCommonModularPlugins = { Rest: rest_1.Rest };


/***/ }),

/***/ 6164:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.HttpPaginatedResponse = exports.PaginatedResult = void 0;
const tslib_1 = __webpack_require__(7582);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const resource_1 = tslib_1.__importDefault(__webpack_require__(6468));
const HttpStatusCodes_1 = tslib_1.__importDefault(__webpack_require__(5632));
function getRelParams(linkUrl) {
    const urlMatch = linkUrl.match(/^\.\/(\w+)\?(.*)$/);
    return urlMatch && urlMatch[2] && Utils.parseQueryString(urlMatch[2]);
}
function parseRelLinks(linkHeader) {
    if (typeof linkHeader == 'string')
        linkHeader = linkHeader.split(',');
    const relParams = {};
    for (let i = 0; i < linkHeader.length; i++) {
        const linkMatch = linkHeader[i].match(/^\s*<(.+)>;\s*rel="(\w+)"$/);
        if (linkMatch) {
            const params = getRelParams(linkMatch[1]);
            if (params)
                relParams[linkMatch[2]] = params;
        }
    }
    return relParams;
}
function returnErrOnly(err, body, useHPR) {
    /* If using httpPaginatedResponse, errors from Ably are returned as part of
     * the HPR, only throw `err` for network errors etc. which don't
     * return a body and/or have no ably-originated error code (non-numeric
     * error codes originate from node) */
    return !(useHPR && (body || typeof err.code === 'number'));
}
class PaginatedResource {
    constructor(client, path, headers, envelope, bodyHandler, useHttpPaginatedResponse) {
        this.client = client;
        this.path = path;
        this.headers = headers;
        this.envelope = envelope !== null && envelope !== void 0 ? envelope : null;
        this.bodyHandler = bodyHandler;
        this.useHttpPaginatedResponse = useHttpPaginatedResponse || false;
    }
    get logger() {
        return this.client.logger;
    }
    async get(params) {
        const result = await resource_1.default.get(this.client, this.path, this.headers, params, this.envelope, false);
        return this.handlePage(result);
    }
    async delete(params) {
        const result = await resource_1.default.delete(this.client, this.path, this.headers, params, this.envelope, false);
        return this.handlePage(result);
    }
    async post(params, body) {
        const result = await resource_1.default.post(this.client, this.path, body, this.headers, params, this.envelope, false);
        return this.handlePage(result);
    }
    async put(params, body) {
        const result = await resource_1.default.put(this.client, this.path, body, this.headers, params, this.envelope, false);
        return this.handlePage(result);
    }
    async patch(params, body) {
        const result = await resource_1.default.patch(this.client, this.path, body, this.headers, params, this.envelope, false);
        return this.handlePage(result);
    }
    async handlePage(result) {
        if (result.err && returnErrOnly(result.err, result.body, this.useHttpPaginatedResponse)) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'PaginatedResource.handlePage()', 'Unexpected error getting resource: err = ' + Utils.inspectError(result.err));
            throw result.err;
        }
        let items, linkHeader, relParams;
        try {
            items =
                result.statusCode == HttpStatusCodes_1.default.NoContent
                    ? []
                    : await this.bodyHandler(result.body, result.headers || {}, result.unpacked);
        }
        catch (e) {
            /* If we got an error, the failure to parse the body is almost certainly
             * due to that, so throw that in preference over the parse error */
            throw result.err || e;
        }
        if (result.headers && (linkHeader = result.headers['Link'] || result.headers['link'])) {
            relParams = parseRelLinks(linkHeader);
        }
        if (this.useHttpPaginatedResponse) {
            return new HttpPaginatedResponse(this, items, result.headers || {}, result.statusCode, relParams, result.err);
        }
        else {
            return new PaginatedResult(this, items, relParams);
        }
    }
}
class PaginatedResult {
    constructor(resource, items, relParams) {
        this.resource = resource;
        this.items = items;
        const self = this;
        if (relParams) {
            if ('first' in relParams) {
                this.first = async function () {
                    return self.get(relParams.first);
                };
            }
            if ('current' in relParams) {
                this.current = async function () {
                    return self.get(relParams.current);
                };
            }
            this.next = async function () {
                if ('next' in relParams) {
                    return self.get(relParams.next);
                }
                else {
                    return null;
                }
            };
            this.hasNext = function () {
                return 'next' in relParams;
            };
            this.isLast = () => {
                var _a;
                return !((_a = this.hasNext) === null || _a === void 0 ? void 0 : _a.call(this));
            };
        }
    }
    /* We assume that only the initial request can be a POST, and that accessing
     * the rest of a multipage set of results can always be done with GET */
    async get(params) {
        const res = this.resource;
        const result = await resource_1.default.get(res.client, res.path, res.headers, params, res.envelope, false);
        return res.handlePage(result);
    }
}
exports.PaginatedResult = PaginatedResult;
class HttpPaginatedResponse extends PaginatedResult {
    constructor(resource, items, headers, statusCode, relParams, err) {
        super(resource, items, relParams);
        this.statusCode = statusCode;
        this.success = statusCode < 300 && statusCode >= 200;
        this.headers = headers;
        this.errorCode = err && err.code;
        this.errorMessage = err && err.message;
    }
    toJSON() {
        return {
            items: this.items,
            statusCode: this.statusCode,
            success: this.success,
            headers: this.headers,
            errorCode: this.errorCode,
            errorMessage: this.errorMessage,
        };
    }
}
exports.HttpPaginatedResponse = HttpPaginatedResponse;
exports["default"] = PaginatedResource;


/***/ }),

/***/ 7872:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PresenceMap = void 0;
const tslib_1 = __webpack_require__(7582);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const eventemitter_1 = tslib_1.__importDefault(__webpack_require__(3388));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const presencemessage_1 = tslib_1.__importDefault(__webpack_require__(4470));
function newerThan(item, existing) {
    /* RTP2b1: if either is synthesised, compare by timestamp */
    if (item.isSynthesized() || existing.isSynthesized()) {
        // RTP2b1a: if equal, prefer the newly-arrived one
        return item.timestamp >= existing.timestamp;
    }
    /* RTP2b2 */
    const itemOrderings = item.parseId(), existingOrderings = existing.parseId();
    if (itemOrderings.msgSerial === existingOrderings.msgSerial) {
        return itemOrderings.index > existingOrderings.index;
    }
    else {
        return itemOrderings.msgSerial > existingOrderings.msgSerial;
    }
}
class PresenceMap extends eventemitter_1.default {
    constructor(presence, memberKey, newer = newerThan) {
        super(presence.logger);
        this.presence = presence;
        this.map = Object.create(null);
        this.syncInProgress = false;
        this.residualMembers = null;
        this.memberKey = memberKey;
        this.newerThan = newer;
    }
    get(key) {
        return this.map[key];
    }
    getClient(clientId) {
        const map = this.map, result = [];
        for (const key in map) {
            const item = map[key];
            if (item.clientId == clientId && item.action != 'absent')
                result.push(item);
        }
        return result;
    }
    list(params) {
        const map = this.map, clientId = params && params.clientId, connectionId = params && params.connectionId, result = [];
        for (const key in map) {
            const item = map[key];
            if (item.action === 'absent')
                continue;
            if (clientId && clientId != item.clientId)
                continue;
            if (connectionId && connectionId != item.connectionId)
                continue;
            result.push(item);
        }
        return result;
    }
    put(item) {
        if (item.action === 'enter' || item.action === 'update') {
            item = presencemessage_1.default.fromValues(item);
            item.action = 'present';
        }
        const map = this.map, key = this.memberKey(item);
        /* we've seen this member, so do not remove it at the end of sync */
        if (this.residualMembers)
            delete this.residualMembers[key];
        /* compare the timestamp of the new item with any existing member (or ABSENT witness) */
        const existingItem = map[key];
        if (existingItem && !this.newerThan(item, existingItem)) {
            return false;
        }
        map[key] = item;
        return true;
    }
    values() {
        const map = this.map, result = [];
        for (const key in map) {
            const item = map[key];
            if (item.action != 'absent')
                result.push(item);
        }
        return result;
    }
    remove(item) {
        const map = this.map, key = this.memberKey(item);
        const existingItem = map[key];
        if (existingItem && !this.newerThan(item, existingItem)) {
            return false;
        }
        /* RTP2f */
        if (this.syncInProgress) {
            item = presencemessage_1.default.fromValues(item);
            item.action = 'absent';
            map[key] = item;
        }
        else {
            delete map[key];
        }
        return !!existingItem;
    }
    startSync() {
        const map = this.map, syncInProgress = this.syncInProgress;
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'PresenceMap.startSync()', 'channel = ' + this.presence.channel.name + '; syncInProgress = ' + syncInProgress);
        /* we might be called multiple times while a sync is in progress */
        if (!this.syncInProgress) {
            this.residualMembers = Utils.copy(map);
            this.setInProgress(true);
        }
    }
    endSync() {
        const map = this.map, syncInProgress = this.syncInProgress;
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'PresenceMap.endSync()', 'channel = ' + this.presence.channel.name + '; syncInProgress = ' + syncInProgress);
        if (syncInProgress) {
            /* we can now strip out the ABSENT members, as we have
             * received all of the out-of-order sync messages */
            for (const memberKey in map) {
                const entry = map[memberKey];
                if (entry.action === 'absent') {
                    delete map[memberKey];
                }
            }
            /* any members that were present at the start of the sync,
             * and have not been seen in sync, can be removed, and leave events emitted */
            this.presence._synthesizeLeaves(Utils.valuesArray(this.residualMembers));
            for (const memberKey in this.residualMembers) {
                delete map[memberKey];
            }
            this.residualMembers = null;
            /* finish, notifying any waiters */
            this.setInProgress(false);
        }
        this.emit('sync');
    }
    waitSync(callback) {
        const syncInProgress = this.syncInProgress;
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'PresenceMap.waitSync()', 'channel = ' + this.presence.channel.name + '; syncInProgress = ' + syncInProgress);
        if (!syncInProgress) {
            callback();
            return;
        }
        this.once('sync', callback);
    }
    clear() {
        this.map = {};
        this.setInProgress(false);
        this.residualMembers = null;
    }
    setInProgress(inProgress) {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'PresenceMap.setInProgress()', 'inProgress = ' + inProgress);
        this.syncInProgress = inProgress;
        this.presence.syncComplete = !inProgress;
    }
}
exports.PresenceMap = PresenceMap;


/***/ }),

/***/ 7625:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(7582);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const devicedetails_1 = tslib_1.__importDefault(__webpack_require__(7689));
const resource_1 = tslib_1.__importDefault(__webpack_require__(6468));
const paginatedresource_1 = tslib_1.__importDefault(__webpack_require__(6164));
const errorinfo_1 = tslib_1.__importDefault(__webpack_require__(1798));
const pushchannelsubscription_1 = tslib_1.__importDefault(__webpack_require__(8315));
const defaults_1 = tslib_1.__importDefault(__webpack_require__(3925));
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
class Push {
    constructor(client) {
        var _a;
        this.client = client;
        this.admin = new Admin(client);
        if (platform_1.default.Config.push && ((_a = client.options.plugins) === null || _a === void 0 ? void 0 : _a.Push)) {
            this.stateMachine = new client.options.plugins.Push.ActivationStateMachine(client);
            this.LocalDevice = client.options.plugins.Push.localDeviceFactory(devicedetails_1.default);
        }
    }
    async activate(registerCallback, updateFailedCallback) {
        await new Promise((resolve, reject) => {
            var _a;
            if (!((_a = this.client.options.plugins) === null || _a === void 0 ? void 0 : _a.Push)) {
                reject(Utils.createMissingPluginError('Push'));
                return;
            }
            if (!this.stateMachine) {
                reject(new errorinfo_1.default('This platform is not supported as a target of push notifications', 40000, 400));
                return;
            }
            if (this.stateMachine.activatedCallback) {
                reject(new errorinfo_1.default('Activation already in progress', 40000, 400));
                return;
            }
            this.stateMachine.activatedCallback = (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            };
            this.stateMachine.updateFailedCallback = updateFailedCallback;
            this.stateMachine.handleEvent(new this.client.options.plugins.Push.CalledActivate(this.stateMachine, registerCallback));
        });
    }
    async deactivate(deregisterCallback) {
        await new Promise((resolve, reject) => {
            var _a;
            if (!((_a = this.client.options.plugins) === null || _a === void 0 ? void 0 : _a.Push)) {
                reject(Utils.createMissingPluginError('Push'));
                return;
            }
            if (!this.stateMachine) {
                reject(new errorinfo_1.default('This platform is not supported as a target of push notifications', 40000, 400));
                return;
            }
            if (this.stateMachine.deactivatedCallback) {
                reject(new errorinfo_1.default('Deactivation already in progress', 40000, 400));
                return;
            }
            this.stateMachine.deactivatedCallback = (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            };
            this.stateMachine.handleEvent(new this.client.options.plugins.Push.CalledDeactivate(this.stateMachine, deregisterCallback));
        });
    }
}
class Admin {
    constructor(client) {
        this.client = client;
        this.deviceRegistrations = new DeviceRegistrations(client);
        this.channelSubscriptions = new ChannelSubscriptions(client);
    }
    async publish(recipient, payload) {
        const client = this.client;
        const format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json, headers = defaults_1.default.defaultPostHeaders(client.options, { format }), params = {};
        const body = Utils.mixin({ recipient: recipient }, payload);
        Utils.mixin(headers, client.options.headers);
        if (client.options.pushFullWait)
            Utils.mixin(params, { fullWait: 'true' });
        const requestBody = Utils.encodeBody(body, client._MsgPack, format);
        await resource_1.default.post(client, '/push/publish', requestBody, headers, params, null, true);
    }
}
class DeviceRegistrations {
    constructor(client) {
        this.client = client;
    }
    async save(device) {
        const client = this.client;
        const body = devicedetails_1.default.fromValues(device);
        const format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json, headers = defaults_1.default.defaultPostHeaders(client.options, { format }), params = {};
        Utils.mixin(headers, client.options.headers);
        if (client.options.pushFullWait)
            Utils.mixin(params, { fullWait: 'true' });
        const requestBody = Utils.encodeBody(body, client._MsgPack, format);
        const response = await resource_1.default.put(client, '/push/deviceRegistrations/' + encodeURIComponent(device.id), requestBody, headers, params, null, true);
        return devicedetails_1.default.fromResponseBody(response.body, client._MsgPack, response.unpacked ? undefined : format);
    }
    async get(deviceIdOrDetails) {
        const client = this.client, format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json, headers = defaults_1.default.defaultGetHeaders(client.options, { format }), deviceId = deviceIdOrDetails.id || deviceIdOrDetails;
        if (typeof deviceId !== 'string' || !deviceId.length) {
            throw new errorinfo_1.default('First argument to DeviceRegistrations#get must be a deviceId string or DeviceDetails', 40000, 400);
        }
        Utils.mixin(headers, client.options.headers);
        const response = await resource_1.default.get(client, '/push/deviceRegistrations/' + encodeURIComponent(deviceId), headers, {}, null, true);
        return devicedetails_1.default.fromResponseBody(response.body, client._MsgPack, response.unpacked ? undefined : format);
    }
    async list(params) {
        const client = this.client, format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json, envelope = this.client.http.supportsLinkHeaders ? undefined : format, headers = defaults_1.default.defaultGetHeaders(client.options, { format });
        Utils.mixin(headers, client.options.headers);
        return new paginatedresource_1.default(client, '/push/deviceRegistrations', headers, envelope, async function (body, headers, unpacked) {
            return devicedetails_1.default.fromResponseBody(body, client._MsgPack, unpacked ? undefined : format);
        }).get(params);
    }
    async remove(deviceIdOrDetails) {
        const client = this.client, format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json, headers = defaults_1.default.defaultGetHeaders(client.options, { format }), params = {}, deviceId = deviceIdOrDetails.id || deviceIdOrDetails;
        if (typeof deviceId !== 'string' || !deviceId.length) {
            throw new errorinfo_1.default('First argument to DeviceRegistrations#remove must be a deviceId string or DeviceDetails', 40000, 400);
        }
        Utils.mixin(headers, client.options.headers);
        if (client.options.pushFullWait)
            Utils.mixin(params, { fullWait: 'true' });
        await resource_1.default['delete'](client, '/push/deviceRegistrations/' + encodeURIComponent(deviceId), headers, params, null, true);
    }
    async removeWhere(params) {
        const client = this.client, format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json, headers = defaults_1.default.defaultGetHeaders(client.options, { format });
        Utils.mixin(headers, client.options.headers);
        if (client.options.pushFullWait)
            Utils.mixin(params, { fullWait: 'true' });
        await resource_1.default['delete'](client, '/push/deviceRegistrations', headers, params, null, true);
    }
}
class ChannelSubscriptions {
    constructor(client) {
        /* ChannelSubscriptions have no unique id; removing one is equivalent to removeWhere by its properties */
        this.remove = ChannelSubscriptions.prototype.removeWhere;
        this.client = client;
    }
    async save(subscription) {
        const client = this.client;
        const body = pushchannelsubscription_1.default.fromValues(subscription);
        const format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json, headers = defaults_1.default.defaultPostHeaders(client.options, { format }), params = {};
        Utils.mixin(headers, client.options.headers);
        if (client.options.pushFullWait)
            Utils.mixin(params, { fullWait: 'true' });
        const requestBody = Utils.encodeBody(body, client._MsgPack, format);
        const response = await resource_1.default.post(client, '/push/channelSubscriptions', requestBody, headers, params, null, true);
        return pushchannelsubscription_1.default.fromResponseBody(response.body, client._MsgPack, response.unpacked ? undefined : format);
    }
    async list(params) {
        const client = this.client, format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json, envelope = this.client.http.supportsLinkHeaders ? undefined : format, headers = defaults_1.default.defaultGetHeaders(client.options, { format });
        Utils.mixin(headers, client.options.headers);
        return new paginatedresource_1.default(client, '/push/channelSubscriptions', headers, envelope, async function (body, headers, unpacked) {
            return pushchannelsubscription_1.default.fromResponseBody(body, client._MsgPack, unpacked ? undefined : format);
        }).get(params);
    }
    async removeWhere(params) {
        const client = this.client, format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json, headers = defaults_1.default.defaultGetHeaders(client.options, { format });
        Utils.mixin(headers, client.options.headers);
        if (client.options.pushFullWait)
            Utils.mixin(params, { fullWait: 'true' });
        await resource_1.default['delete'](client, '/push/channelSubscriptions', headers, params, null, true);
    }
    async listChannels(params) {
        const client = this.client, format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json, envelope = this.client.http.supportsLinkHeaders ? undefined : format, headers = defaults_1.default.defaultGetHeaders(client.options, { format });
        Utils.mixin(headers, client.options.headers);
        if (client.options.pushFullWait)
            Utils.mixin(params, { fullWait: 'true' });
        return new paginatedresource_1.default(client, '/push/channels', headers, envelope, async function (body, headers, unpacked) {
            const parsedBody = (!unpacked && format ? Utils.decodeBody(body, client._MsgPack, format) : body);
            for (let i = 0; i < parsedBody.length; i++) {
                parsedBody[i] = String(parsedBody[i]);
            }
            return parsedBody;
        }).get(params);
    }
}
exports["default"] = Push;


/***/ }),

/***/ 6810:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(7582);
const eventemitter_1 = tslib_1.__importDefault(__webpack_require__(3388));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const protocolmessagecommon_1 = __webpack_require__(3507);
const protocolmessage_1 = __webpack_require__(8294);
const errorinfo_1 = tslib_1.__importDefault(__webpack_require__(1798));
const realtimechannel_1 = tslib_1.__importDefault(__webpack_require__(6884));
const restannotations_1 = tslib_1.__importStar(__webpack_require__(1560));
class RealtimeAnnotations {
    constructor(channel) {
        this.channel = channel;
        this.logger = channel.logger;
        this.subscriptions = new eventemitter_1.default(this.logger);
    }
    async publish(msgOrSerial, annotationValues) {
        const channelName = this.channel.name;
        const annotation = (0, restannotations_1.constructValidateAnnotation)(msgOrSerial, annotationValues);
        const wireAnnotation = await annotation.encode();
        this.channel._throwIfUnpublishableState();
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'RealtimeAnnotations.publish()', 'channelName = ' + channelName + ', sending annotation with messageSerial = ' + annotation.messageSerial + ', type = ' + annotation.type);
        const pm = (0, protocolmessage_1.fromValues)({
            action: protocolmessagecommon_1.actions.ANNOTATION,
            channel: channelName,
            annotations: [wireAnnotation],
        });
        return this.channel.sendMessage(pm);
    }
    async subscribe(..._args /* [type], listener */) {
        const args = realtimechannel_1.default.processListenerArgs(_args);
        const event = args[0];
        const listener = args[1];
        const channel = this.channel;
        if (channel.state === 'failed') {
            throw errorinfo_1.default.fromValues(channel.invalidStateError());
        }
        await channel.attach();
        if ((this.channel._mode & protocolmessagecommon_1.flags.ANNOTATION_SUBSCRIBE) === 0) {
            throw new errorinfo_1.default("You're trying to add an annotation listener, but you haven't requested the annotation_subscribe channel mode in ChannelOptions, so this won't do anything (we only deliver annotations to clients who have explicitly requested them)", 93001, 400);
        }
        this.subscriptions.on(event, listener);
    }
    unsubscribe(..._args /* [event], listener */) {
        const args = realtimechannel_1.default.processListenerArgs(_args);
        const event = args[0];
        const listener = args[1];
        this.subscriptions.off(event, listener);
    }
    _processIncoming(annotations) {
        for (const annotation of annotations) {
            this.subscriptions.emit(annotation.type || '', annotation);
        }
    }
    async get(serial, params) {
        return restannotations_1.default.prototype.get.call(this, serial, params);
    }
}
exports["default"] = RealtimeAnnotations;


/***/ }),

/***/ 6884:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(7582);
const protocolmessagecommon_1 = __webpack_require__(3507);
const protocolmessage_1 = __webpack_require__(8294);
const eventemitter_1 = tslib_1.__importDefault(__webpack_require__(3388));
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const basemessage_1 = __webpack_require__(1976);
const message_1 = tslib_1.__importStar(__webpack_require__(3176));
const channelstatechange_1 = tslib_1.__importDefault(__webpack_require__(9358));
const errorinfo_1 = tslib_1.__importStar(__webpack_require__(1798));
const defaults_1 = __webpack_require__(3925);
const noop = function () { };
function validateChannelOptions(options) {
    if (options && 'params' in options && !Utils.isObject(options.params)) {
        return new errorinfo_1.default('options.params must be an object', 40000, 400);
    }
    if (options && 'modes' in options) {
        if (!Array.isArray(options.modes)) {
            return new errorinfo_1.default('options.modes must be an array', 40000, 400);
        }
        for (let i = 0; i < options.modes.length; i++) {
            const currentMode = options.modes[i];
            if (!currentMode ||
                typeof currentMode !== 'string' ||
                !protocolmessagecommon_1.channelModes.includes(String.prototype.toUpperCase.call(currentMode))) {
                return new errorinfo_1.default('Invalid channel mode: ' + currentMode, 40000, 400);
            }
        }
    }
}
class RealtimeChannel extends eventemitter_1.default {
    get presence() {
        if (!this._presence) {
            Utils.throwMissingPluginError('RealtimePresence');
        }
        return this._presence;
    }
    get annotations() {
        if (!this._annotations) {
            Utils.throwMissingPluginError('Annotations');
        }
        return this._annotations;
    }
    constructor(client, name, options) {
        var _a, _b;
        super(client.logger);
        this._annotations = null;
        this._mode = 0;
        this.retryCount = 0;
        this.history = async function (params) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'RealtimeChannel.history()', 'channel = ' + this.name);
            // We fetch this first so that any plugin-not-provided error takes priority over other errors
            const restMixin = this.client.rest.channelMixin;
            if (params && params.untilAttach) {
                if (this.state !== 'attached') {
                    throw new errorinfo_1.default('option untilAttach requires the channel to be attached', 40000, 400);
                }
                if (!this.properties.attachSerial) {
                    throw new errorinfo_1.default('untilAttach was specified and channel is attached, but attachSerial is not defined', 40000, 400);
                }
                delete params.untilAttach;
                params.from_serial = this.properties.attachSerial;
            }
            return restMixin.history(this, params);
        };
        this.whenState = ((state) => {
            return eventemitter_1.default.prototype.whenState.call(this, state, this.state);
        });
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'RealtimeChannel()', 'started; name = ' + name);
        this.name = name;
        this.channelOptions = (0, defaults_1.normaliseChannelOptions)((_a = client._Crypto) !== null && _a !== void 0 ? _a : null, this.logger, options);
        this.client = client;
        this._presence = client._RealtimePresence ? new client._RealtimePresence.RealtimePresence(this) : null;
        if (client._Annotations) {
            this._annotations = new client._Annotations.RealtimeAnnotations(this);
        }
        this.connectionManager = client.connection.connectionManager;
        this.state = 'initialized';
        this.subscriptions = new eventemitter_1.default(this.logger);
        this.syncChannelSerial = undefined;
        this.properties = {
            attachSerial: undefined,
            channelSerial: undefined,
        };
        this.setOptions(options);
        this.errorReason = null;
        this._attachResume = false;
        this._decodingContext = {
            channelOptions: this.channelOptions,
            plugins: client.options.plugins || {},
            baseEncodedPreviousPayload: undefined,
        };
        this._lastPayload = {
            messageId: null,
            protocolMessageChannelSerial: null,
            decodeFailureRecoveryInProgress: null,
        };
        /* Only differences between this and the public event emitter is that this emits an
         * update event for all ATTACHEDs, whether resumed or not */
        this._allChannelChanges = new eventemitter_1.default(this.logger);
        if ((_b = client.options.plugins) === null || _b === void 0 ? void 0 : _b.Push) {
            this._push = new client.options.plugins.Push.PushChannel(this);
        }
    }
    get push() {
        if (!this._push) {
            Utils.throwMissingPluginError('Push');
        }
        return this._push;
    }
    invalidStateError() {
        return new errorinfo_1.default('Channel operation failed as channel state is ' + this.state, 90001, 400, this.errorReason || undefined);
    }
    static processListenerArgs(args) {
        /* [event], listener */
        args = Array.prototype.slice.call(args);
        if (typeof args[0] === 'function') {
            args.unshift(null);
        }
        return args;
    }
    async setOptions(options) {
        var _a;
        const previousChannelOptions = this.channelOptions;
        const err = validateChannelOptions(options);
        if (err) {
            throw err;
        }
        this.channelOptions = (0, defaults_1.normaliseChannelOptions)((_a = this.client._Crypto) !== null && _a !== void 0 ? _a : null, this.logger, options);
        if (this._decodingContext)
            this._decodingContext.channelOptions = this.channelOptions;
        if (this._shouldReattachToSetOptions(options, previousChannelOptions)) {
            /* This does not just do _attach(true, null, callback) because that would put us
             * into the 'attaching' state until we receive the new attached, which is
             * conceptually incorrect: we are still attached, we just have a pending request to
             * change some channel params. Per RTL17 going into the attaching state would mean
             * rejecting messages until we have confirmation that the options have changed,
             * which would unnecessarily lose message continuity. */
            this.attachImpl();
            return new Promise((resolve, reject) => {
                // Ignore 'attaching' -- could be just due to to a resume & reattach, should not
                // call back setOptions until we're definitely attached with the new options (or
                // else in a terminal state)
                this._allChannelChanges.once(['attached', 'update', 'detached', 'failed'], function (stateChange) {
                    switch (this.event) {
                        case 'update':
                        case 'attached':
                            resolve();
                            break;
                        default:
                            reject(stateChange.reason);
                    }
                });
            });
        }
    }
    _shouldReattachToSetOptions(options, prevOptions) {
        if (!(this.state === 'attached' || this.state === 'attaching')) {
            return false;
        }
        if (options === null || options === void 0 ? void 0 : options.params) {
            // Don't check against the `agent` param - it isn't returned in the ATTACHED message
            const requestedParams = omitAgent(options.params);
            const existingParams = omitAgent(prevOptions.params);
            if (Object.keys(requestedParams).length !== Object.keys(existingParams).length) {
                return true;
            }
            if (!Utils.shallowEquals(existingParams, requestedParams)) {
                return true;
            }
        }
        if (options === null || options === void 0 ? void 0 : options.modes) {
            if (!prevOptions.modes || !Utils.arrEquals(options.modes, prevOptions.modes)) {
                return true;
            }
        }
        return false;
    }
    async publish(...args) {
        let messages;
        let argCount = args.length;
        if (argCount == 1) {
            if (Utils.isObject(args[0])) {
                messages = [message_1.default.fromValues(args[0])];
            }
            else if (Array.isArray(args[0])) {
                messages = message_1.default.fromValuesArray(args[0]);
            }
            else {
                throw new errorinfo_1.default('The single-argument form of publish() expects a message object or an array of message objects', 40013, 400);
            }
        }
        else {
            messages = [message_1.default.fromValues({ name: args[0], data: args[1] })];
        }
        const maxMessageSize = this.client.options.maxMessageSize;
        // TODO get rid of CipherOptions type assertion, indicates channeloptions types are broken
        const wireMessages = await (0, message_1.encodeArray)(messages, this.channelOptions);
        /* RSL1i */
        const size = (0, message_1.getMessagesSize)(wireMessages);
        if (size > maxMessageSize) {
            throw new errorinfo_1.default('Maximum size of messages that can be published at once exceeded ( was ' +
                size +
                ' bytes; limit is ' +
                maxMessageSize +
                ' bytes)', 40009, 400);
        }
        this._throwIfUnpublishableState();
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'RealtimeChannel.publish()', 'sending message; channel state is ' + this.state + ', message count = ' + wireMessages.length);
        const pm = (0, protocolmessage_1.fromValues)({ action: protocolmessagecommon_1.actions.MESSAGE, channel: this.name, messages: wireMessages });
        return this.sendMessage(pm);
    }
    _throwIfUnpublishableState() {
        if (!this.connectionManager.activeState()) {
            throw this.connectionManager.getError();
        }
        if (this.state === 'failed' || this.state === 'suspended') {
            throw this.invalidStateError();
        }
    }
    onEvent(messages) {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'RealtimeChannel.onEvent()', 'received message');
        const subscriptions = this.subscriptions;
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            subscriptions.emit(message.name, message);
        }
    }
    async attach() {
        if (this.state === 'attached') {
            return null;
        }
        return new Promise((resolve, reject) => {
            this._attach(false, null, (err, result) => (err ? reject(err) : resolve(result)));
        });
    }
    _attach(forceReattach, attachReason, callback) {
        if (!callback) {
            callback = (err) => {
                if (err) {
                    logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'RealtimeChannel._attach()', 'Channel attach failed: ' + err.toString());
                }
            };
        }
        const connectionManager = this.connectionManager;
        if (!connectionManager.activeState()) {
            callback(connectionManager.getError());
            return;
        }
        if (this.state !== 'attaching' || forceReattach) {
            this.requestState('attaching', attachReason);
        }
        this.once(function (stateChange) {
            switch (this.event) {
                case 'attached':
                    callback === null || callback === void 0 ? void 0 : callback(null, stateChange);
                    break;
                case 'detached':
                case 'suspended':
                case 'failed':
                    callback === null || callback === void 0 ? void 0 : callback(stateChange.reason ||
                        connectionManager.getError() ||
                        new errorinfo_1.default('Unable to attach; reason unknown; state = ' + this.event, 90000, 500));
                    break;
                case 'detaching':
                    callback === null || callback === void 0 ? void 0 : callback(new errorinfo_1.default('Attach request superseded by a subsequent detach request', 90000, 409));
                    break;
            }
        });
    }
    attachImpl() {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'RealtimeChannel.attachImpl()', 'sending ATTACH message');
        const attachMsg = (0, protocolmessage_1.fromValues)({
            action: protocolmessagecommon_1.actions.ATTACH,
            channel: this.name,
            params: this.channelOptions.params,
            // RTL4c1: Includes the channel serial to resume from a previous message
            // or attachment.
            channelSerial: this.properties.channelSerial,
        });
        if (this.channelOptions.modes) {
            attachMsg.encodeModesToFlags(Utils.allToUpperCase(this.channelOptions.modes));
        }
        if (this._attachResume) {
            attachMsg.setFlag('ATTACH_RESUME');
        }
        if (this._lastPayload.decodeFailureRecoveryInProgress) {
            attachMsg.channelSerial = this._lastPayload.protocolMessageChannelSerial;
        }
        this.sendMessage(attachMsg).catch(noop);
    }
    async detach() {
        const connectionManager = this.connectionManager;
        if (!connectionManager.activeState()) {
            throw connectionManager.getError();
        }
        switch (this.state) {
            case 'suspended':
                this.notifyState('detached');
                return;
            case 'detached':
                return;
            case 'failed':
                throw new errorinfo_1.default('Unable to detach; channel state = failed', 90001, 400);
            default:
                this.requestState('detaching');
            // eslint-disable-next-line no-fallthrough
            case 'detaching':
                return new Promise((resolve, reject) => {
                    this.once(function (stateChange) {
                        switch (this.event) {
                            case 'detached':
                                resolve();
                                break;
                            case 'attached':
                            case 'suspended':
                            case 'failed':
                                reject(stateChange.reason ||
                                    connectionManager.getError() ||
                                    new errorinfo_1.default('Unable to detach; reason unknown; state = ' + this.event, 90000, 500));
                                break;
                            case 'attaching':
                                reject(new errorinfo_1.default('Detach request superseded by a subsequent attach request', 90000, 409));
                                break;
                        }
                    });
                });
        }
    }
    detachImpl() {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'RealtimeChannel.detach()', 'sending DETACH message');
        const msg = (0, protocolmessage_1.fromValues)({ action: protocolmessagecommon_1.actions.DETACH, channel: this.name });
        this.sendMessage(msg).catch(noop);
    }
    async subscribe(...args /* [event], listener */) {
        const [event, listener] = RealtimeChannel.processListenerArgs(args);
        if (this.state === 'failed') {
            throw errorinfo_1.default.fromValues(this.invalidStateError());
        }
        // Filtered
        if (event && typeof event === 'object' && !Array.isArray(event)) {
            this.client._FilteredSubscriptions.subscribeFilter(this, event, listener);
        }
        else {
            this.subscriptions.on(event, listener);
        }
        // (RTL7g)
        if (this.channelOptions.attachOnSubscribe !== false) {
            return this.attach();
        }
        else {
            return null;
        }
    }
    unsubscribe(...args /* [event], listener */) {
        var _a;
        const [event, listener] = RealtimeChannel.processListenerArgs(args);
        // If we either have a filtered listener, a filter or both we need to do additional processing to find the original function(s)
        if ((typeof event === 'object' && !listener) || ((_a = this.filteredSubscriptions) === null || _a === void 0 ? void 0 : _a.has(listener))) {
            this.client._FilteredSubscriptions
                .getAndDeleteFilteredSubscriptions(this, event, listener)
                .forEach((l) => this.subscriptions.off(l));
            return;
        }
        this.subscriptions.off(event, listener);
    }
    sync() {
        /* check preconditions */
        switch (this.state) {
            case 'initialized':
            case 'detaching':
            case 'detached':
                throw new errorinfo_1.PartialErrorInfo('Unable to sync to channel; not attached', 40000);
            default:
        }
        const connectionManager = this.connectionManager;
        if (!connectionManager.activeState()) {
            throw connectionManager.getError();
        }
        /* send sync request */
        const syncMessage = (0, protocolmessage_1.fromValues)({ action: protocolmessagecommon_1.actions.SYNC, channel: this.name });
        if (this.syncChannelSerial) {
            syncMessage.channelSerial = this.syncChannelSerial;
        }
        connectionManager.send(syncMessage);
    }
    async sendMessage(msg) {
        return new Promise((resolve, reject) => {
            this.connectionManager.send(msg, this.client.options.queueMessages, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    async sendPresence(presence) {
        const msg = (0, protocolmessage_1.fromValues)({
            action: protocolmessagecommon_1.actions.PRESENCE,
            channel: this.name,
            presence: presence,
        });
        return this.sendMessage(msg);
    }
    // Access to this method is synchronised by ConnectionManager#processChannelMessage, in order to synchronise access to the state stored in _decodingContext.
    async processMessage(message) {
        if (message.action === protocolmessagecommon_1.actions.ATTACHED ||
            message.action === protocolmessagecommon_1.actions.MESSAGE ||
            message.action === protocolmessagecommon_1.actions.PRESENCE) {
            // RTL15b
            this.setChannelSerial(message.channelSerial);
        }
        let syncChannelSerial, isSync = false;
        switch (message.action) {
            case protocolmessagecommon_1.actions.ATTACHED: {
                this.properties.attachSerial = message.channelSerial;
                this._mode = message.getMode();
                this.params = message.params || {};
                const modesFromFlags = message.decodeModesFromFlags();
                this.modes = (modesFromFlags && Utils.allToLowerCase(modesFromFlags)) || undefined;
                const resumed = message.hasFlag('RESUMED');
                const hasPresence = message.hasFlag('HAS_PRESENCE');
                const hasBacklog = message.hasFlag('HAS_BACKLOG');
                if (this.state === 'attached') {
                    if (!resumed) {
                        /* On a loss of continuity, the presence set needs to be re-synced */
                        if (this._presence) {
                            this._presence.onAttached(hasPresence);
                        }
                    }
                    const change = new channelstatechange_1.default(this.state, this.state, resumed, hasBacklog, message.error);
                    this._allChannelChanges.emit('update', change);
                    if (!resumed || this.channelOptions.updateOnAttached) {
                        this.emit('update', change);
                    }
                }
                else if (this.state === 'detaching') {
                    /* RTL5i: re-send DETACH and remain in the 'detaching' state */
                    this.checkPendingState();
                }
                else {
                    this.notifyState('attached', message.error, resumed, hasPresence, hasBacklog);
                }
                break;
            }
            case protocolmessagecommon_1.actions.DETACHED: {
                const detachErr = message.error
                    ? errorinfo_1.default.fromValues(message.error)
                    : new errorinfo_1.default('Channel detached', 90001, 404);
                if (this.state === 'detaching') {
                    this.notifyState('detached', detachErr);
                }
                else if (this.state === 'attaching') {
                    /* Only retry immediately if we were previously attached. If we were
                     * attaching, go into suspended, fail messages, and wait a few seconds
                     * before retrying */
                    this.notifyState('suspended', detachErr);
                }
                else if (this.state === 'attached' || this.state === 'suspended') {
                    // RTL13a
                    this.requestState('attaching', detachErr);
                }
                // else no action (detached in initialized, detached, or failed state is a noop)
                break;
            }
            case protocolmessagecommon_1.actions.SYNC:
                /* syncs can have channelSerials, but might not if the sync is one page long */
                isSync = true;
                syncChannelSerial = this.syncChannelSerial = message.channelSerial;
                /* syncs can happen on channels with no presence data as part of connection
                 * resuming, in which case protocol message has no presence property */
                if (!message.presence)
                    break;
            // eslint-disable-next-line no-fallthrough
            case protocolmessagecommon_1.actions.PRESENCE: {
                if (!message.presence) {
                    break;
                }
                (0, basemessage_1.populateFieldsFromParent)(message);
                const options = this.channelOptions;
                if (this._presence) {
                    const presenceMessages = await Promise.all(message.presence.map((wpm) => {
                        return wpm.decode(options, this.logger);
                    }));
                    this._presence.setPresence(presenceMessages, isSync, syncChannelSerial);
                }
                break;
            }
            case protocolmessagecommon_1.actions.MESSAGE: {
                //RTL17
                if (this.state !== 'attached') {
                    logger_1.default.logAction(this.logger, logger_1.default.LOG_MAJOR, 'RealtimeChannel.processMessage()', 'Message "' +
                        message.id +
                        '" skipped as this channel "' +
                        this.name +
                        '" state is not "attached" (state is "' +
                        this.state +
                        '").');
                    return;
                }
                (0, basemessage_1.populateFieldsFromParent)(message);
                const encoded = message.messages, firstMessage = encoded[0], lastMessage = encoded[encoded.length - 1];
                if (firstMessage.extras &&
                    firstMessage.extras.delta &&
                    firstMessage.extras.delta.from !== this._lastPayload.messageId) {
                    const msg = 'Delta message decode failure - previous message not available for message "' +
                        message.id +
                        '" on this channel "' +
                        this.name +
                        '".';
                    logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'RealtimeChannel.processMessage()', msg);
                    this._startDecodeFailureRecovery(new errorinfo_1.default(msg, 40018, 400));
                    break;
                }
                let messages = [];
                for (let i = 0; i < encoded.length; i++) {
                    const { decoded, err } = await encoded[i].decodeWithErr(this._decodingContext, this.logger);
                    messages[i] = decoded;
                    if (err) {
                        switch (err.code) {
                            case 40018:
                                /* decode failure */
                                this._startDecodeFailureRecovery(err);
                                return;
                            case 40019: /* No vcdiff plugin passed in - no point recovering, give up */
                            case 40021:
                                /* Browser does not support deltas, similarly no point recovering */
                                this.notifyState('failed', err);
                                return;
                            default:
                            // do nothing, continue decoding
                        }
                    }
                }
                this._lastPayload.messageId = lastMessage.id;
                this._lastPayload.protocolMessageChannelSerial = message.channelSerial;
                this.onEvent(messages);
                break;
            }
            case protocolmessagecommon_1.actions.ANNOTATION: {
                (0, basemessage_1.populateFieldsFromParent)(message);
                const options = this.channelOptions;
                if (this._annotations) {
                    const annotations = await Promise.all((message.annotations || []).map((wpm) => {
                        return wpm.decode(options, this.logger);
                    }));
                    this._annotations._processIncoming(annotations);
                }
                break;
            }
            case protocolmessagecommon_1.actions.ERROR: {
                /* there was a channel-specific error */
                const err = message.error;
                if (err && err.code == 80016) {
                    /* attach/detach operation attempted on superseded transport handle */
                    this.checkPendingState();
                }
                else {
                    this.notifyState('failed', errorinfo_1.default.fromValues(err));
                }
                break;
            }
            default:
                // RSF1, should handle unrecognized message actions gracefully and don't abort the realtime connection to ensure forward compatibility
                logger_1.default.logAction(this.logger, logger_1.default.LOG_MAJOR, 'RealtimeChannel.processMessage()', 'Protocol error: unrecognised message action (' + message.action + ')');
        }
    }
    _startDecodeFailureRecovery(reason) {
        if (!this._lastPayload.decodeFailureRecoveryInProgress) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MAJOR, 'RealtimeChannel.processMessage()', 'Starting decode failure recovery process.');
            this._lastPayload.decodeFailureRecoveryInProgress = true;
            this._attach(true, reason, () => {
                this._lastPayload.decodeFailureRecoveryInProgress = false;
            });
        }
    }
    onAttached() {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'RealtimeChannel.onAttached', 'activating channel; name = ' + this.name);
    }
    notifyState(state, reason, resumed, hasPresence, hasBacklog) {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'RealtimeChannel.notifyState', 'name = ' + this.name + ', current state = ' + this.state + ', notifying state ' + state);
        this.clearStateTimer();
        // RTP5a1
        if (['detached', 'suspended', 'failed'].includes(state)) {
            this.properties.channelSerial = null;
        }
        if (state === this.state) {
            return;
        }
        if (this._presence) {
            this._presence.actOnChannelState(state, hasPresence, reason);
        }
        if (state === 'suspended' && this.connectionManager.state.sendEvents) {
            this.startRetryTimer();
        }
        else {
            this.cancelRetryTimer();
        }
        if (reason) {
            this.errorReason = reason;
        }
        const change = new channelstatechange_1.default(this.state, state, resumed, hasBacklog, reason);
        const action = 'Channel state for channel "' + this.name + '"';
        const message = state + (reason ? '; reason: ' + reason : '');
        if (state === 'failed') {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, action, message);
        }
        else {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MAJOR, action, message);
        }
        if (state !== 'attaching' && state !== 'suspended') {
            this.retryCount = 0;
        }
        /* Note: we don't set inProgress for pending states until the request is actually in progress */
        if (state === 'attached') {
            this.onAttached();
        }
        if (state === 'attached') {
            this._attachResume = true;
        }
        else if (state === 'detaching' || state === 'failed') {
            this._attachResume = false;
        }
        this.state = state;
        this._allChannelChanges.emit(state, change);
        this.emit(state, change);
    }
    requestState(state, reason) {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'RealtimeChannel.requestState', 'name = ' + this.name + ', state = ' + state);
        this.notifyState(state, reason);
        /* send the event and await response */
        this.checkPendingState();
    }
    checkPendingState() {
        /* if can't send events, do nothing */
        const cmState = this.connectionManager.state;
        if (!cmState.sendEvents) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'RealtimeChannel.checkPendingState', 'sendEvents is false; state is ' + this.connectionManager.state.state);
            return;
        }
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'RealtimeChannel.checkPendingState', 'name = ' + this.name + ', state = ' + this.state);
        /* Only start the state timer running when actually sending the event */
        switch (this.state) {
            case 'attaching':
                this.startStateTimerIfNotRunning();
                this.attachImpl();
                break;
            case 'detaching':
                this.startStateTimerIfNotRunning();
                this.detachImpl();
                break;
            case 'attached':
                /* resume any sync operation that was in progress */
                this.sync();
                break;
            default:
                break;
        }
    }
    timeoutPendingState() {
        switch (this.state) {
            case 'attaching': {
                const err = new errorinfo_1.default('Channel attach timed out', 90007, 408);
                this.notifyState('suspended', err);
                break;
            }
            case 'detaching': {
                const err = new errorinfo_1.default('Channel detach timed out', 90007, 408);
                this.notifyState('attached', err);
                break;
            }
            default:
                this.checkPendingState();
                break;
        }
    }
    startStateTimerIfNotRunning() {
        if (!this.stateTimer) {
            this.stateTimer = setTimeout(() => {
                logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'RealtimeChannel.startStateTimerIfNotRunning', 'timer expired');
                this.stateTimer = null;
                this.timeoutPendingState();
            }, this.client.options.timeouts.realtimeRequestTimeout);
        }
    }
    clearStateTimer() {
        const stateTimer = this.stateTimer;
        if (stateTimer) {
            clearTimeout(stateTimer);
            this.stateTimer = null;
        }
    }
    startRetryTimer() {
        if (this.retryTimer)
            return;
        this.retryCount++;
        const retryDelay = Utils.getRetryTime(this.client.options.timeouts.channelRetryTimeout, this.retryCount);
        this.retryTimer = setTimeout(() => {
            /* If connection is not connected, just leave in suspended, a reattach
             * will be triggered once it connects again */
            if (this.state === 'suspended' && this.connectionManager.state.sendEvents) {
                this.retryTimer = null;
                logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'RealtimeChannel retry timer expired', 'attempting a new attach');
                this.requestState('attaching');
            }
        }, retryDelay);
    }
    cancelRetryTimer() {
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
    }
    /* @returns null (if can safely be released) | ErrorInfo (if cannot) */
    getReleaseErr() {
        const s = this.state;
        if (s === 'initialized' || s === 'detached' || s === 'failed') {
            return null;
        }
        return new errorinfo_1.default('Can only release a channel in a state where there is no possibility of further updates from the server being received (initialized, detached, or failed); was ' +
            s, 90001, 400);
    }
    setChannelSerial(channelSerial) {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'RealtimeChannel.setChannelSerial()', 'Updating channel serial; serial = ' + channelSerial + '; previous = ' + this.properties.channelSerial);
        // RTP17h: Only update the channel serial if its present (it won't always
        // be set).
        if (channelSerial) {
            this.properties.channelSerial = channelSerial;
        }
    }
    async status() {
        return this.client.rest.channelMixin.status(this);
    }
}
function omitAgent(channelParams) {
    const _a = channelParams || {}, { agent: _ } = _a, paramsWithoutAgent = tslib_1.__rest(_a, ["agent"]);
    return paramsWithoutAgent;
}
exports["default"] = RealtimeChannel;


/***/ }),

/***/ 6258:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(7582);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const eventemitter_1 = tslib_1.__importDefault(__webpack_require__(3388));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const presencemessage_1 = tslib_1.__importDefault(__webpack_require__(4470));
const errorinfo_1 = tslib_1.__importStar(__webpack_require__(1798));
const realtimechannel_1 = tslib_1.__importDefault(__webpack_require__(6884));
const multicaster_1 = tslib_1.__importDefault(__webpack_require__(578));
const channelstatechange_1 = tslib_1.__importDefault(__webpack_require__(9358));
const presencemap_1 = __webpack_require__(7872);
function getClientId(realtimePresence) {
    return realtimePresence.channel.client.auth.clientId;
}
function isAnonymousOrWildcard(realtimePresence) {
    const realtime = realtimePresence.channel.client;
    /* If not currently connected, we can't assume that we're an anonymous
     * client, as realtime may inform us of our clientId in the CONNECTED
     * message. So assume we're not anonymous and leave it to realtime to
     * return an error if we are */
    const clientId = realtime.auth.clientId;
    return (!clientId || clientId === '*') && realtime.connection.state === 'connected';
}
/* Callback is called only in the event of an error */
function waitAttached(channel, callback, action) {
    switch (channel.state) {
        case 'attached':
        case 'suspended':
            action();
            break;
        case 'initialized':
        case 'detached':
        case 'detaching':
        case 'attaching':
            Utils.whenPromiseSettles(channel.attach(), function (err) {
                if (err)
                    callback(err);
                else
                    action();
            });
            break;
        default:
            callback(errorinfo_1.default.fromValues(channel.invalidStateError()));
    }
}
class RealtimePresence extends eventemitter_1.default {
    constructor(channel) {
        super(channel.logger);
        this.channel = channel;
        this.syncComplete = false;
        this.members = new presencemap_1.PresenceMap(this, (item) => item.clientId + ':' + item.connectionId);
        // RTP17h: Store own members by clientId only.
        this._myMembers = new presencemap_1.PresenceMap(this, (item) => item.clientId);
        this.subscriptions = new eventemitter_1.default(this.logger);
        this.pendingPresence = [];
    }
    async enter(data) {
        if (isAnonymousOrWildcard(this)) {
            throw new errorinfo_1.default('clientId must be specified to enter a presence channel', 40012, 400);
        }
        return this._enterOrUpdateClient(undefined, undefined, data, 'enter');
    }
    async update(data) {
        if (isAnonymousOrWildcard(this)) {
            throw new errorinfo_1.default('clientId must be specified to update presence data', 40012, 400);
        }
        return this._enterOrUpdateClient(undefined, undefined, data, 'update');
    }
    async enterClient(clientId, data) {
        return this._enterOrUpdateClient(undefined, clientId, data, 'enter');
    }
    async updateClient(clientId, data) {
        return this._enterOrUpdateClient(undefined, clientId, data, 'update');
    }
    async _enterOrUpdateClient(id, clientId, data, action) {
        const channel = this.channel;
        if (!channel.connectionManager.activeState()) {
            throw channel.connectionManager.getError();
        }
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'RealtimePresence.' + action + 'Client()', 'channel = ' + channel.name + ', id = ' + id + ', client = ' + (clientId || '(implicit) ' + getClientId(this)));
        const presence = presencemessage_1.default.fromData(data);
        presence.action = action;
        if (id) {
            presence.id = id;
        }
        if (clientId) {
            presence.clientId = clientId;
        }
        const wirePresMsg = await presence.encode(channel.channelOptions);
        switch (channel.state) {
            case 'attached':
                return channel.sendPresence([wirePresMsg]);
            case 'initialized':
            case 'detached':
                channel.attach();
            // eslint-disable-next-line no-fallthrough
            case 'attaching':
                return new Promise((resolve, reject) => {
                    this.pendingPresence.push({
                        presence: wirePresMsg,
                        callback: (err) => (err ? reject(err) : resolve()),
                    });
                });
            default: {
                const err = new errorinfo_1.PartialErrorInfo('Unable to ' + action + ' presence channel while in ' + channel.state + ' state', 90001);
                err.code = 90001;
                throw err;
            }
        }
    }
    async leave(data) {
        if (isAnonymousOrWildcard(this)) {
            throw new errorinfo_1.default('clientId must have been specified to enter or leave a presence channel', 40012, 400);
        }
        return this.leaveClient(undefined, data);
    }
    async leaveClient(clientId, data) {
        const channel = this.channel;
        if (!channel.connectionManager.activeState()) {
            throw channel.connectionManager.getError();
        }
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'RealtimePresence.leaveClient()', 'leaving; channel = ' + this.channel.name + ', client = ' + clientId);
        const presence = presencemessage_1.default.fromData(data);
        presence.action = 'leave';
        if (clientId) {
            presence.clientId = clientId;
        }
        const wirePresMsg = await presence.encode(channel.channelOptions);
        switch (channel.state) {
            case 'attached':
                return channel.sendPresence([wirePresMsg]);
            case 'attaching':
                return new Promise((resolve, reject) => {
                    this.pendingPresence.push({
                        presence: wirePresMsg,
                        callback: (err) => (err ? reject(err) : resolve()),
                    });
                });
            case 'initialized':
            case 'failed': {
                /* we're not attached; therefore we let any entered status
                 * timeout by itself instead of attaching just in order to leave */
                throw new errorinfo_1.PartialErrorInfo('Unable to leave presence channel (incompatible state)', 90001);
            }
            default:
                throw channel.invalidStateError();
        }
    }
    async get(params) {
        const waitForSync = !params || ('waitForSync' in params ? params.waitForSync : true);
        return new Promise((resolve, reject) => {
            function returnMembers(members) {
                resolve(params ? members.list(params) : members.values());
            }
            /* Special-case the suspended state: can still get (stale) presence set if waitForSync is false */
            if (this.channel.state === 'suspended') {
                if (waitForSync) {
                    reject(errorinfo_1.default.fromValues({
                        statusCode: 400,
                        code: 91005,
                        message: 'Presence state is out of sync due to channel being in the SUSPENDED state',
                    }));
                }
                else {
                    returnMembers(this.members);
                }
                return;
            }
            waitAttached(this.channel, (err) => reject(err), () => {
                const members = this.members;
                if (waitForSync) {
                    members.waitSync(function () {
                        returnMembers(members);
                    });
                }
                else {
                    returnMembers(members);
                }
            });
        });
    }
    async history(params) {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'RealtimePresence.history()', 'channel = ' + this.name);
        // We fetch this first so that any plugin-not-provided error takes priority over other errors
        const restMixin = this.channel.client.rest.presenceMixin;
        if (params && params.untilAttach) {
            if (this.channel.state === 'attached') {
                delete params.untilAttach;
                params.from_serial = this.channel.properties.attachSerial;
            }
            else {
                throw new errorinfo_1.default('option untilAttach requires the channel to be attached, was: ' + this.channel.state, 40000, 400);
            }
        }
        return restMixin.history(this, params);
    }
    setPresence(presenceSet, isSync, syncChannelSerial) {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'RealtimePresence.setPresence()', 'received presence for ' + presenceSet.length + ' participants; syncChannelSerial = ' + syncChannelSerial);
        let syncCursor, match;
        const members = this.members, myMembers = this._myMembers, broadcastMessages = [], connId = this.channel.connectionManager.connectionId;
        if (isSync) {
            this.members.startSync();
            if (syncChannelSerial && (match = syncChannelSerial.match(/^[\w-]+:(.*)$/))) {
                syncCursor = match[1];
            }
        }
        for (let presence of presenceSet) {
            switch (presence.action) {
                case 'leave':
                    if (members.remove(presence)) {
                        broadcastMessages.push(presence);
                    }
                    if (presence.connectionId === connId && !presence.isSynthesized()) {
                        myMembers.remove(presence);
                    }
                    break;
                case 'enter':
                case 'present':
                case 'update':
                    if (members.put(presence)) {
                        broadcastMessages.push(presence);
                    }
                    if (presence.connectionId === connId) {
                        myMembers.put(presence);
                    }
                    break;
            }
        }
        /* if this is the last (or only) message in a sequence of sync updates, end the sync */
        if (isSync && !syncCursor) {
            members.endSync();
            this.channel.syncChannelSerial = null;
        }
        /* broadcast to listeners */
        for (let i = 0; i < broadcastMessages.length; i++) {
            const presence = broadcastMessages[i];
            this.subscriptions.emit(presence.action, presence);
        }
    }
    onAttached(hasPresence) {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'RealtimePresence.onAttached()', 'channel = ' + this.channel.name + ', hasPresence = ' + hasPresence);
        if (hasPresence) {
            this.members.startSync();
        }
        else {
            this._synthesizeLeaves(this.members.values());
            this.members.clear();
        }
        // RTP17f: Re-enter own members when moving into the attached state.
        this._ensureMyMembersPresent();
        /* NB this must be after the _ensureMyMembersPresent call, which may add items to pendingPresence */
        const pendingPresence = this.pendingPresence, pendingPresCount = pendingPresence.length;
        if (pendingPresCount) {
            this.pendingPresence = [];
            const presenceArray = [];
            const multicaster = multicaster_1.default.create(this.logger);
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'RealtimePresence.onAttached', 'sending ' + pendingPresCount + ' queued presence messages');
            for (let i = 0; i < pendingPresCount; i++) {
                const event = pendingPresence[i];
                presenceArray.push(event.presence);
                multicaster.push(event.callback);
            }
            this.channel
                .sendPresence(presenceArray)
                .then(() => multicaster())
                .catch((err) => multicaster(err));
        }
    }
    actOnChannelState(state, hasPresence, err) {
        switch (state) {
            case 'attached':
                this.onAttached(hasPresence);
                break;
            case 'detached':
            case 'failed':
                this._clearMyMembers();
                this.members.clear();
            /* falls through */
            case 'suspended':
                this.failPendingPresence(err);
                break;
        }
    }
    failPendingPresence(err) {
        if (this.pendingPresence.length) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'RealtimeChannel.failPendingPresence', 'channel; name = ' + this.channel.name + ', err = ' + Utils.inspectError(err));
            for (let i = 0; i < this.pendingPresence.length; i++)
                try {
                    this.pendingPresence[i].callback(err);
                    // eslint-disable-next-line no-empty
                }
                catch (e) { }
            this.pendingPresence = [];
        }
    }
    _clearMyMembers() {
        this._myMembers.clear();
    }
    _ensureMyMembersPresent() {
        const myMembers = this._myMembers;
        const connId = this.channel.connectionManager.connectionId;
        for (const memberKey in myMembers.map) {
            const entry = myMembers.map[memberKey];
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'RealtimePresence._ensureMyMembersPresent()', 'Auto-reentering clientId "' + entry.clientId + '" into the presence set');
            // RTP17g: Send ENTER containing the member id, clientId and data
            // attributes.
            // RTP17g1: suppress id if the connId has changed
            const id = entry.connectionId === connId ? entry.id : undefined;
            this._enterOrUpdateClient(id, entry.clientId, entry.data, 'enter').catch((err) => {
                const wrappedErr = new errorinfo_1.default('Presence auto re-enter failed', 91004, 400, err);
                logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'RealtimePresence._ensureMyMembersPresent()', 'Presence auto re-enter failed; reason = ' + Utils.inspectError(err));
                const change = new channelstatechange_1.default(this.channel.state, this.channel.state, true, false, wrappedErr);
                this.channel.emit('update', change);
            });
        }
    }
    _synthesizeLeaves(items) {
        const subscriptions = this.subscriptions;
        items.forEach(function (item) {
            const presence = presencemessage_1.default.fromValues({
                action: 'leave',
                connectionId: item.connectionId,
                clientId: item.clientId,
                data: item.data,
                encoding: item.encoding,
                timestamp: Date.now(),
            });
            subscriptions.emit('leave', presence);
        });
    }
    async subscribe(..._args /* [event], listener */) {
        const args = realtimechannel_1.default.processListenerArgs(_args);
        const event = args[0];
        const listener = args[1];
        const channel = this.channel;
        if (channel.state === 'failed') {
            throw errorinfo_1.default.fromValues(channel.invalidStateError());
        }
        this.subscriptions.on(event, listener);
        // (RTP6d)
        if (channel.channelOptions.attachOnSubscribe !== false) {
            await channel.attach();
        }
    }
    unsubscribe(..._args /* [event], listener */) {
        const args = realtimechannel_1.default.processListenerArgs(_args);
        const event = args[0];
        const listener = args[1];
        this.subscriptions.off(event, listener);
    }
}
exports["default"] = RealtimePresence;


/***/ }),

/***/ 6468:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(7582);
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const auth_1 = tslib_1.__importDefault(__webpack_require__(1047));
const HttpMethods_1 = tslib_1.__importDefault(__webpack_require__(3912));
const errorinfo_1 = __webpack_require__(1798);
const http_1 = __webpack_require__(1223);
const HttpStatusCodes_1 = tslib_1.__importDefault(__webpack_require__(5632));
async function withAuthDetails(client, headers, params, opCallback) {
    if (client.http.supportsAuthHeaders) {
        const authHeaders = await client.auth.getAuthHeaders();
        return opCallback(Utils.mixin(authHeaders, headers), params);
    }
    else {
        const authParams = await client.auth.getAuthParams();
        return opCallback(headers, Utils.mixin(authParams, params));
    }
}
function unenvelope(result, MsgPack, format) {
    if (result.err && !result.body) {
        return { err: result.err };
    }
    if (result.statusCode === HttpStatusCodes_1.default.NoContent) {
        return Object.assign(Object.assign({}, result), { body: [], unpacked: true });
    }
    let body = result.body;
    if (!result.unpacked) {
        try {
            body = Utils.decodeBody(body, MsgPack, format);
        }
        catch (e) {
            if (Utils.isErrorInfoOrPartialErrorInfo(e)) {
                return { err: e };
            }
            else {
                return { err: new errorinfo_1.PartialErrorInfo(Utils.inspectError(e), null) };
            }
        }
    }
    if (!body) {
        return { err: new errorinfo_1.PartialErrorInfo('unenvelope(): Response body is missing', null) };
    }
    const { statusCode: wrappedStatusCode, response, headers: wrappedHeaders } = body;
    if (wrappedStatusCode === undefined) {
        /* Envelope already unwrapped by the transport */
        return Object.assign(Object.assign({}, result), { body, unpacked: true });
    }
    if (wrappedStatusCode < 200 || wrappedStatusCode >= 300) {
        /* handle wrapped errors */
        let wrappedErr = (response && response.error) || result.err;
        if (!wrappedErr) {
            wrappedErr = new Error('Error in unenveloping ' + body);
            wrappedErr.statusCode = wrappedStatusCode;
        }
        return { err: wrappedErr, body: response, headers: wrappedHeaders, unpacked: true, statusCode: wrappedStatusCode };
    }
    return { err: result.err, body: response, headers: wrappedHeaders, unpacked: true, statusCode: wrappedStatusCode };
}
function logResult(result, method, path, params, logger) {
    if (result.err) {
        logger_1.default.logAction(logger, logger_1.default.LOG_MICRO, 'Resource.' + method + '()', 'Received Error; ' + (0, http_1.appendingParams)(path, params) + '; Error: ' + Utils.inspectError(result.err));
    }
    else {
        logger_1.default.logAction(logger, logger_1.default.LOG_MICRO, 'Resource.' + method + '()', 'Received; ' +
            (0, http_1.appendingParams)(path, params) +
            '; Headers: ' +
            (0, http_1.paramString)(result.headers) +
            '; StatusCode: ' +
            result.statusCode +
            '; Body: ' +
            (platform_1.default.BufferUtils.isBuffer(result.body)
                ? ' (Base64): ' + platform_1.default.BufferUtils.base64Encode(result.body)
                : ': ' + platform_1.default.Config.inspect(result.body)));
    }
}
class Resource {
    static async get(client, path, headers, params, envelope, throwError) {
        return Resource.do(HttpMethods_1.default.Get, client, path, null, headers, params, envelope, throwError !== null && throwError !== void 0 ? throwError : false);
    }
    static async delete(client, path, headers, params, envelope, throwError) {
        return Resource.do(HttpMethods_1.default.Delete, client, path, null, headers, params, envelope, throwError);
    }
    static async post(client, path, body, headers, params, envelope, throwError) {
        return Resource.do(HttpMethods_1.default.Post, client, path, body, headers, params, envelope, throwError);
    }
    static async patch(client, path, body, headers, params, envelope, throwError) {
        return Resource.do(HttpMethods_1.default.Patch, client, path, body, headers, params, envelope, throwError);
    }
    static async put(client, path, body, headers, params, envelope, throwError) {
        return Resource.do(HttpMethods_1.default.Put, client, path, body, headers, params, envelope, throwError);
    }
    static async do(method, client, path, body, headers, params, envelope, throwError) {
        if (envelope) {
            (params = params || {})['envelope'] = envelope;
        }
        const logger = client.logger;
        async function doRequest(headers, params) {
            var _a;
            if (logger.shouldLog(logger_1.default.LOG_MICRO)) {
                let decodedBody = body;
                if (((_a = headers['content-type']) === null || _a === void 0 ? void 0 : _a.indexOf('msgpack')) > 0) {
                    try {
                        if (!client._MsgPack) {
                            Utils.throwMissingPluginError('MsgPack');
                        }
                        decodedBody = client._MsgPack.decode(body);
                    }
                    catch (decodeErr) {
                        logger_1.default.logAction(logger, logger_1.default.LOG_MICRO, 'Resource.' + method + '()', 'Sending MsgPack Decoding Error: ' + Utils.inspectError(decodeErr));
                    }
                }
                logger_1.default.logAction(logger, logger_1.default.LOG_MICRO, 'Resource.' + method + '()', 'Sending; ' + (0, http_1.appendingParams)(path, params) + '; Body: ' + decodedBody);
            }
            const httpResult = await client.http.do(method, path, headers, body, params);
            if (httpResult.error && auth_1.default.isTokenErr(httpResult.error)) {
                /* token has expired, so get a new one */
                await client.auth.authorize(null, null);
                /* retry ... */
                return withAuthDetails(client, headers, params, doRequest);
            }
            return {
                err: httpResult.error,
                body: httpResult.body,
                headers: httpResult.headers,
                unpacked: httpResult.unpacked,
                statusCode: httpResult.statusCode,
            };
        }
        let result = await withAuthDetails(client, headers, params, doRequest);
        if (envelope) {
            result = unenvelope(result, client._MsgPack, envelope);
        }
        if (logger.shouldLog(logger_1.default.LOG_MICRO)) {
            logResult(result, method, path, params, logger);
        }
        if (throwError) {
            if (result.err) {
                throw result.err;
            }
            else {
                const response = Object.assign({}, result);
                delete response.err;
                return response;
            }
        }
        return result;
    }
}
exports["default"] = Resource;


/***/ }),

/***/ 8708:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Rest = void 0;
const tslib_1 = __webpack_require__(7582);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const defaults_1 = tslib_1.__importDefault(__webpack_require__(3925));
const push_1 = tslib_1.__importDefault(__webpack_require__(7625));
const paginatedresource_1 = tslib_1.__importDefault(__webpack_require__(6164));
const restchannel_1 = tslib_1.__importDefault(__webpack_require__(8364));
const errorinfo_1 = tslib_1.__importDefault(__webpack_require__(1798));
const stats_1 = tslib_1.__importDefault(__webpack_require__(3276));
const HttpMethods_1 = tslib_1.__importDefault(__webpack_require__(3912));
const resource_1 = tslib_1.__importDefault(__webpack_require__(6468));
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
const auth_1 = __webpack_require__(1047);
const restchannelmixin_1 = __webpack_require__(8369);
const restpresencemixin_1 = __webpack_require__(449);
const devicedetails_1 = tslib_1.__importDefault(__webpack_require__(7689));
class Rest {
    constructor(client) {
        this.channelMixin = restchannelmixin_1.RestChannelMixin;
        this.presenceMixin = restpresencemixin_1.RestPresenceMixin;
        // exposed for plugins but shouldn't be bundled with minimal realtime
        this.Resource = resource_1.default;
        this.DeviceDetails = devicedetails_1.default;
        this.client = client;
        this.channels = new Channels(this.client);
        this.push = new push_1.default(this.client);
    }
    async stats(params) {
        const headers = defaults_1.default.defaultGetHeaders(this.client.options), format = this.client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json, envelope = this.client.http.supportsLinkHeaders ? undefined : format;
        Utils.mixin(headers, this.client.options.headers);
        return new paginatedresource_1.default(this.client, '/stats', headers, envelope, function (body, headers, unpacked) {
            const statsValues = unpacked ? body : JSON.parse(body);
            for (let i = 0; i < statsValues.length; i++)
                statsValues[i] = stats_1.default.fromValues(statsValues[i]);
            return statsValues;
        }).get(params);
    }
    async time(params) {
        const headers = defaults_1.default.defaultGetHeaders(this.client.options);
        if (this.client.options.headers)
            Utils.mixin(headers, this.client.options.headers);
        const timeUri = (host) => {
            return this.client.baseUri(host) + '/time';
        };
        let { error, body, unpacked } = await this.client.http.do(HttpMethods_1.default.Get, timeUri, headers, null, params);
        if (error) {
            throw error;
        }
        if (!unpacked)
            body = JSON.parse(body);
        const time = body[0];
        if (!time) {
            throw new errorinfo_1.default('Internal error (unexpected result type from GET /time)', 50000, 500);
        }
        /* calculate time offset only once for this device by adding to the prototype */
        this.client.serverTimeOffset = time - Date.now();
        return time;
    }
    async request(method, path, version, params, body, customHeaders) {
        var _a;
        const [encoder, decoder, format] = (() => {
            if (this.client.options.useBinaryProtocol) {
                if (!this.client._MsgPack) {
                    Utils.throwMissingPluginError('MsgPack');
                }
                return [this.client._MsgPack.encode, this.client._MsgPack.decode, Utils.Format.msgpack];
            }
            else {
                return [JSON.stringify, JSON.parse, Utils.Format.json];
            }
        })();
        const envelope = this.client.http.supportsLinkHeaders ? undefined : format;
        params = params || {};
        const _method = method.toLowerCase();
        const headers = _method == 'get'
            ? defaults_1.default.defaultGetHeaders(this.client.options, { format, protocolVersion: version })
            : defaults_1.default.defaultPostHeaders(this.client.options, { format, protocolVersion: version });
        if (typeof body !== 'string') {
            body = (_a = encoder(body)) !== null && _a !== void 0 ? _a : null;
        }
        Utils.mixin(headers, this.client.options.headers);
        if (customHeaders) {
            Utils.mixin(headers, customHeaders);
        }
        const paginatedResource = new paginatedresource_1.default(this.client, path, headers, envelope, async function (resbody, headers, unpacked) {
            return Utils.ensureArray(unpacked ? resbody : decoder(resbody));
        }, 
        /* useHttpPaginatedResponse: */ true);
        if (!platform_1.default.Http.methods.includes(_method)) {
            throw new errorinfo_1.default('Unsupported method ' + _method, 40500, 405);
        }
        if (platform_1.default.Http.methodsWithBody.includes(_method)) {
            return paginatedResource[_method](params, body);
        }
        else {
            return paginatedResource[_method](params);
        }
    }
    async batchPublish(specOrSpecs) {
        let requestBodyDTO;
        let singleSpecMode;
        if (Array.isArray(specOrSpecs)) {
            requestBodyDTO = specOrSpecs;
            singleSpecMode = false;
        }
        else {
            requestBodyDTO = [specOrSpecs];
            singleSpecMode = true;
        }
        const format = this.client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json, headers = defaults_1.default.defaultPostHeaders(this.client.options, { format });
        if (this.client.options.headers)
            Utils.mixin(headers, this.client.options.headers);
        const requestBody = Utils.encodeBody(requestBodyDTO, this.client._MsgPack, format);
        const response = await resource_1.default.post(this.client, '/messages', requestBody, headers, {}, null, true);
        const batchResults = (response.unpacked ? response.body : Utils.decodeBody(response.body, this.client._MsgPack, format));
        // I don't love the below type assertions but not sure how to avoid them
        if (singleSpecMode) {
            return batchResults[0];
        }
        else {
            return batchResults;
        }
    }
    async batchPresence(channels) {
        const format = this.client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json, headers = defaults_1.default.defaultPostHeaders(this.client.options, { format });
        if (this.client.options.headers)
            Utils.mixin(headers, this.client.options.headers);
        const channelsParam = channels.join(',');
        const response = await resource_1.default.get(this.client, '/presence', headers, { channels: channelsParam }, null, true);
        return (response.unpacked ? response.body : Utils.decodeBody(response.body, this.client._MsgPack, format));
    }
    async revokeTokens(specifiers, options) {
        if ((0, auth_1.useTokenAuth)(this.client.options)) {
            throw new errorinfo_1.default('Cannot revoke tokens when using token auth', 40162, 401);
        }
        const keyName = this.client.options.keyName;
        let resolvedOptions = options !== null && options !== void 0 ? options : {};
        const requestBodyDTO = Object.assign({ targets: specifiers.map((specifier) => `${specifier.type}:${specifier.value}`) }, resolvedOptions);
        const format = this.client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json, headers = defaults_1.default.defaultPostHeaders(this.client.options, { format });
        if (this.client.options.headers)
            Utils.mixin(headers, this.client.options.headers);
        const requestBody = Utils.encodeBody(requestBodyDTO, this.client._MsgPack, format);
        const response = await resource_1.default.post(this.client, `/keys/${keyName}/revokeTokens`, requestBody, headers, {}, null, true);
        return (response.unpacked ? response.body : Utils.decodeBody(response.body, this.client._MsgPack, format));
    }
}
exports.Rest = Rest;
class Channels {
    constructor(client) {
        this.client = client;
        this.all = Object.create(null);
    }
    get(name, channelOptions) {
        name = String(name);
        let channel = this.all[name];
        if (!channel) {
            this.all[name] = channel = new restchannel_1.default(this.client, name, channelOptions);
        }
        else if (channelOptions) {
            channel.setOptions(channelOptions);
        }
        return channel;
    }
    /* Included to support certain niche use-cases; most users should ignore this.
     * Please do not use this unless you know what you're doing */
    release(name) {
        delete this.all[String(name)];
    }
}


/***/ }),

/***/ 1560:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.constructValidateAnnotation = void 0;
const tslib_1 = __webpack_require__(7582);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const annotation_1 = tslib_1.__importStar(__webpack_require__(9327));
const defaults_1 = tslib_1.__importDefault(__webpack_require__(3925));
const paginatedresource_1 = tslib_1.__importDefault(__webpack_require__(6164));
const resource_1 = tslib_1.__importDefault(__webpack_require__(6468));
const errorinfo_1 = tslib_1.__importDefault(__webpack_require__(1798));
function constructValidateAnnotation(msgOrSerial, annotationValues) {
    let messageSerial;
    switch (typeof msgOrSerial) {
        case 'string':
            messageSerial = msgOrSerial;
            break;
        case 'object':
            messageSerial = msgOrSerial.serial;
            break;
    }
    if (!messageSerial || typeof messageSerial !== 'string') {
        throw new errorinfo_1.default('First argument of annotation.publish() must be either a Message (or at least an object with a string `serial` property) or a message serial (string)', 40003, 400);
    }
    if (!annotationValues || typeof annotationValues !== 'object') {
        throw new errorinfo_1.default('Second argument of annotation.publish() must be an object (the intended annotation to publish)', 40003, 400);
    }
    const annotation = annotation_1.default.fromValues(annotationValues);
    annotation.messageSerial = messageSerial;
    if (!annotation.action) {
        annotation.action = 'annotation.create';
    }
    return annotation;
}
exports.constructValidateAnnotation = constructValidateAnnotation;
function basePathForSerial(channel, serial) {
    return (channel.client.rest.channelMixin.basePath(channel) + '/messages/' + encodeURIComponent(serial) + '/annotations');
}
class RestAnnotations {
    constructor(channel) {
        this.channel = channel;
    }
    async publish(msgOrSerial, annotationValues) {
        const annotation = constructValidateAnnotation(msgOrSerial, annotationValues);
        const wireAnnotation = await annotation.encode();
        const client = this.channel.client, options = client.options, format = options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json, headers = defaults_1.default.defaultPostHeaders(client.options, { format }), params = {};
        const requestBody = Utils.encodeBody([wireAnnotation], client._MsgPack, format);
        await resource_1.default.post(client, basePathForSerial(this.channel, annotation.messageSerial), requestBody, headers, params, null, true);
    }
    async get(serial, params) {
        const client = this.channel.client, format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json, envelope = client.http.supportsLinkHeaders ? undefined : format, headers = defaults_1.default.defaultGetHeaders(client.options, { format });
        Utils.mixin(headers, client.options.headers);
        return new paginatedresource_1.default(client, basePathForSerial(this.channel, serial), headers, envelope, async (body, _, unpacked) => {
            const decoded = (unpacked ? body : Utils.decodeBody(body, client._MsgPack, format));
            return (0, annotation_1._fromEncodedArray)(decoded, this.channel);
        }).get(params);
    }
}
exports["default"] = RestAnnotations;


/***/ }),

/***/ 8364:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(7582);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const restpresence_1 = tslib_1.__importDefault(__webpack_require__(6049));
const message_1 = tslib_1.__importStar(__webpack_require__(3176));
const errorinfo_1 = tslib_1.__importDefault(__webpack_require__(1798));
const resource_1 = tslib_1.__importDefault(__webpack_require__(6468));
const defaults_1 = tslib_1.__importStar(__webpack_require__(3925));
const MSG_ID_ENTROPY_BYTES = 9;
function allEmptyIds(messages) {
    return messages.every(function (message) {
        return !message.id;
    });
}
class RestChannel {
    get annotations() {
        if (!this._annotations) {
            Utils.throwMissingPluginError('Annotations');
        }
        return this._annotations;
    }
    constructor(client, name, channelOptions) {
        var _a, _b;
        this._annotations = null;
        logger_1.default.logAction(client.logger, logger_1.default.LOG_MINOR, 'RestChannel()', 'started; name = ' + name);
        this.name = name;
        this.client = client;
        this.presence = new restpresence_1.default(this);
        this.channelOptions = (0, defaults_1.normaliseChannelOptions)((_a = client._Crypto) !== null && _a !== void 0 ? _a : null, this.logger, channelOptions);
        if ((_b = client.options.plugins) === null || _b === void 0 ? void 0 : _b.Push) {
            this._push = new client.options.plugins.Push.PushChannel(this);
        }
        if (client._Annotations) {
            this._annotations = new client._Annotations.RestAnnotations(this);
        }
    }
    get push() {
        if (!this._push) {
            Utils.throwMissingPluginError('Push');
        }
        return this._push;
    }
    get logger() {
        return this.client.logger;
    }
    setOptions(options) {
        var _a;
        this.channelOptions = (0, defaults_1.normaliseChannelOptions)((_a = this.client._Crypto) !== null && _a !== void 0 ? _a : null, this.logger, options);
    }
    async history(params) {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'RestChannel.history()', 'channel = ' + this.name);
        return this.client.rest.channelMixin.history(this, params);
    }
    async publish(...args) {
        const first = args[0], second = args[1];
        let messages;
        let params;
        if (typeof first === 'string' || first === null) {
            /* (name, data, ...) */
            messages = [message_1.default.fromValues({ name: first, data: second })];
            params = args[2];
        }
        else if (Utils.isObject(first)) {
            messages = [message_1.default.fromValues(first)];
            params = args[1];
        }
        else if (Array.isArray(first)) {
            messages = message_1.default.fromValuesArray(first);
            params = args[1];
        }
        else {
            throw new errorinfo_1.default('The single-argument form of publish() expects a message object or an array of message objects', 40013, 400);
        }
        if (!params) {
            /* No params supplied */
            params = {};
        }
        const client = this.client, options = client.options, format = options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json, idempotentRestPublishing = client.options.idempotentRestPublishing, headers = defaults_1.default.defaultPostHeaders(client.options, { format });
        Utils.mixin(headers, options.headers);
        if (idempotentRestPublishing && allEmptyIds(messages)) {
            const msgIdBase = await Utils.randomString(MSG_ID_ENTROPY_BYTES);
            messages.forEach(function (message, index) {
                message.id = msgIdBase + ':' + index.toString();
            });
        }
        const wireMessages = await (0, message_1.encodeArray)(messages, this.channelOptions);
        /* RSL1i */
        const size = (0, message_1.getMessagesSize)(wireMessages), maxMessageSize = options.maxMessageSize;
        if (size > maxMessageSize) {
            throw new errorinfo_1.default('Maximum size of messages that can be published at once exceeded ( was ' +
                size +
                ' bytes; limit is ' +
                maxMessageSize +
                ' bytes)', 40009, 400);
        }
        await this._publish((0, message_1.serialize)(wireMessages, client._MsgPack, format), headers, params);
    }
    async _publish(requestBody, headers, params) {
        await resource_1.default.post(this.client, this.client.rest.channelMixin.basePath(this) + '/messages', requestBody, headers, params, null, true);
    }
    async status() {
        return this.client.rest.channelMixin.status(this);
    }
}
exports["default"] = RestChannel;


/***/ }),

/***/ 8369:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RestChannelMixin = void 0;
const tslib_1 = __webpack_require__(7582);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const message_1 = __webpack_require__(3176);
const defaults_1 = tslib_1.__importDefault(__webpack_require__(3925));
const paginatedresource_1 = tslib_1.__importDefault(__webpack_require__(6164));
const resource_1 = tslib_1.__importDefault(__webpack_require__(6468));
class RestChannelMixin {
    static basePath(channel) {
        return '/channels/' + encodeURIComponent(channel.name);
    }
    static history(channel, params) {
        const client = channel.client, format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json, envelope = channel.client.http.supportsLinkHeaders ? undefined : format, headers = defaults_1.default.defaultGetHeaders(client.options, { format });
        Utils.mixin(headers, client.options.headers);
        return new paginatedresource_1.default(client, this.basePath(channel) + '/messages', headers, envelope, async function (body, headers, unpacked) {
            const decoded = (unpacked ? body : Utils.decodeBody(body, client._MsgPack, format));
            return (0, message_1._fromEncodedArray)(decoded, channel);
        }).get(params);
    }
    static async status(channel) {
        const format = channel.client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json;
        const headers = defaults_1.default.defaultPostHeaders(channel.client.options, { format });
        const response = await resource_1.default.get(channel.client, this.basePath(channel), headers, {}, format, true);
        return response.body;
    }
}
exports.RestChannelMixin = RestChannelMixin;


/***/ }),

/***/ 6049:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(7582);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const paginatedresource_1 = tslib_1.__importDefault(__webpack_require__(6164));
const presencemessage_1 = __webpack_require__(4470);
const defaults_1 = tslib_1.__importDefault(__webpack_require__(3925));
class RestPresence {
    constructor(channel) {
        this.channel = channel;
    }
    get logger() {
        return this.channel.logger;
    }
    async get(params) {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'RestPresence.get()', 'channel = ' + this.channel.name);
        const client = this.channel.client, format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json, envelope = this.channel.client.http.supportsLinkHeaders ? undefined : format, headers = defaults_1.default.defaultGetHeaders(client.options, { format });
        Utils.mixin(headers, client.options.headers);
        return new paginatedresource_1.default(client, this.channel.client.rest.presenceMixin.basePath(this), headers, envelope, async (body, headers, unpacked) => {
            const decoded = (unpacked ? body : Utils.decodeBody(body, client._MsgPack, format));
            return (0, presencemessage_1._fromEncodedArray)(decoded, this.channel);
        }).get(params);
    }
    async history(params) {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'RestPresence.history()', 'channel = ' + this.channel.name);
        return this.channel.client.rest.presenceMixin.history(this, params);
    }
}
exports["default"] = RestPresence;


/***/ }),

/***/ 449:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RestPresenceMixin = void 0;
const tslib_1 = __webpack_require__(7582);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const defaults_1 = tslib_1.__importDefault(__webpack_require__(3925));
const paginatedresource_1 = tslib_1.__importDefault(__webpack_require__(6164));
const presencemessage_1 = __webpack_require__(4470);
const restchannelmixin_1 = __webpack_require__(8369);
class RestPresenceMixin {
    static basePath(presence) {
        return restchannelmixin_1.RestChannelMixin.basePath(presence.channel) + '/presence';
    }
    static async history(presence, params) {
        const client = presence.channel.client, format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json, envelope = presence.channel.client.http.supportsLinkHeaders ? undefined : format, headers = defaults_1.default.defaultGetHeaders(client.options, { format });
        Utils.mixin(headers, client.options.headers);
        return new paginatedresource_1.default(client, this.basePath(presence) + '/history', headers, envelope, async (body, headers, unpacked) => {
            const decoded = (unpacked ? body : Utils.decodeBody(body, client._MsgPack, format));
            return (0, presencemessage_1._fromEncodedArray)(decoded, presence.channel);
        }).get(params);
    }
}
exports.RestPresenceMixin = RestPresenceMixin;


/***/ }),

/***/ 3546:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(7582);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const protocolmessagecommon_1 = __webpack_require__(3507);
const protocolmessage_1 = __webpack_require__(8294);
const transport_1 = tslib_1.__importDefault(__webpack_require__(9856));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const defaults_1 = tslib_1.__importDefault(__webpack_require__(3925));
const connectionerrors_1 = tslib_1.__importDefault(__webpack_require__(836));
const auth_1 = tslib_1.__importDefault(__webpack_require__(1047));
const errorinfo_1 = tslib_1.__importDefault(__webpack_require__(1798));
const XHRStates_1 = tslib_1.__importDefault(__webpack_require__(6882));
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
/* TODO: can remove once realtime sends protocol message responses for comet errors */
function shouldBeErrorAction(err) {
    const UNRESOLVABLE_ERROR_CODES = [80015, 80017, 80030];
    if (err.code) {
        if (auth_1.default.isTokenErr(err))
            return false;
        if (UNRESOLVABLE_ERROR_CODES.includes(err.code))
            return true;
        return err.code >= 40000 && err.code < 50000;
    }
    else {
        /* Likely a network or transport error of some kind. Certainly not fatal to the connection */
        return false;
    }
}
function protocolMessageFromRawError(err) {
    /* err will be either a legacy (non-protocolmessage) comet error response
     * (which will have an err.code), or a xhr/network error (which won't). */
    if (shouldBeErrorAction(err)) {
        return [(0, protocolmessage_1.fromValues)({ action: protocolmessagecommon_1.actions.ERROR, error: err })];
    }
    else {
        return [(0, protocolmessage_1.fromValues)({ action: protocolmessagecommon_1.actions.DISCONNECTED, error: err })];
    }
}
/*
 * A base comet transport class
 */
class CometTransport extends transport_1.default {
    constructor(connectionManager, auth, params) {
        super(connectionManager, auth, params, /* binary not supported for comet so force JSON protocol */ true);
        /* Historical comment, back from when we supported JSONP:
         *
         * > For comet, we could do the auth update by aborting the current recv and
         * > starting a new one with the new token, that'd be sufficient for realtime.
         * > Problem is JSONP - you can't cancel truly abort a recv once started. So
         * > we need to send an AUTH for jsonp. In which case it's simpler to keep all
         * > comet transports the same and do it for all of them. So we send the AUTH
         * > instead, and don't need to abort the recv
         *
         * Now that we’ve dropped JSONP support, we may be able to revisit the above;
         * see https://github.com/ably/ably-js/issues/1214.
         */
        this.onAuthUpdated = (tokenDetails) => {
            this.authParams = { access_token: tokenDetails.token };
        };
        this.stream = 'stream' in params ? params.stream : true;
        this.sendRequest = null;
        this.recvRequest = null;
        this.pendingCallback = null;
        this.pendingItems = null;
    }
    connect() {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'CometTransport.connect()', 'starting');
        transport_1.default.prototype.connect.call(this);
        const params = this.params;
        const options = params.options;
        const host = defaults_1.default.getHost(options, params.host);
        const port = defaults_1.default.getPort(options);
        const cometScheme = options.tls ? 'https://' : 'http://';
        this.baseUri = cometScheme + host + ':' + port + '/comet/';
        const connectUri = this.baseUri + 'connect';
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'CometTransport.connect()', 'uri: ' + connectUri);
        Utils.whenPromiseSettles(this.auth.getAuthParams(), (err, authParams) => {
            if (err) {
                this.disconnect(err);
                return;
            }
            if (this.isDisposed) {
                return;
            }
            this.authParams = authParams;
            const connectParams = this.params.getConnectParams(authParams);
            if ('stream' in connectParams)
                this.stream = connectParams.stream;
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'CometTransport.connect()', 'connectParams:' + Utils.toQueryString(connectParams));
            /* this will be the 'recvRequest' so this connection can stream messages */
            let preconnected = false;
            const connectRequest = (this.recvRequest = this.createRequest(connectUri, null, connectParams, null, this.stream ? XHRStates_1.default.REQ_RECV_STREAM : XHRStates_1.default.REQ_RECV));
            connectRequest.on('data', (data) => {
                if (!this.recvRequest) {
                    /* the transport was disposed before we connected */
                    return;
                }
                if (!preconnected) {
                    preconnected = true;
                    this.emit('preconnect');
                }
                this.onData(data);
            });
            connectRequest.on('complete', (err) => {
                if (!this.recvRequest) {
                    /* the transport was disposed before we connected */
                    err = err || new errorinfo_1.default('Request cancelled', 80003, 400);
                }
                this.recvRequest = null;
                /* Connect request may complete without a emitting 'data' event since that is not
                 * emitted for e.g. a non-streamed error response. Still implies preconnect. */
                if (!preconnected && !err) {
                    preconnected = true;
                    this.emit('preconnect');
                }
                this.onActivity();
                if (err) {
                    if (err.code) {
                        /* A protocol error received from realtime. TODO: once realtime
                         * consistendly sends errors wrapped in protocol messages, should be
                         * able to remove this */
                        this.onData(protocolMessageFromRawError(err));
                    }
                    else {
                        /* A network/xhr error. Don't bother wrapping in a protocol message,
                         * just disconnect the transport */
                        this.disconnect(err);
                    }
                    return;
                }
                platform_1.default.Config.nextTick(() => {
                    this.recv();
                });
            });
            connectRequest.exec();
        });
    }
    requestClose() {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'CometTransport.requestClose()');
        this._requestCloseOrDisconnect(true);
    }
    requestDisconnect() {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'CometTransport.requestDisconnect()');
        this._requestCloseOrDisconnect(false);
    }
    _requestCloseOrDisconnect(closing) {
        const closeOrDisconnectUri = closing ? this.closeUri : this.disconnectUri;
        if (closeOrDisconnectUri) {
            const request = this.createRequest(closeOrDisconnectUri, null, this.authParams, null, XHRStates_1.default.REQ_SEND);
            request.on('complete', (err) => {
                if (err) {
                    logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'CometTransport.request' + (closing ? 'Close()' : 'Disconnect()'), 'request returned err = ' + Utils.inspectError(err));
                    this.finish('disconnected', err);
                }
            });
            request.exec();
        }
    }
    dispose() {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'CometTransport.dispose()', '');
        if (!this.isDisposed) {
            this.isDisposed = true;
            if (this.recvRequest) {
                logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'CometTransport.dispose()', 'aborting recv request');
                this.recvRequest.abort();
                this.recvRequest = null;
            }
            /* In almost all cases the transport will be finished before it's
             * disposed. Finish here just to make sure. */
            this.finish('disconnected', connectionerrors_1.default.disconnected());
            platform_1.default.Config.nextTick(() => {
                this.emit('disposed');
            });
        }
    }
    onConnect(message) {
        var _a;
        /* if this transport has been disposed whilst awaiting connection, do nothing */
        if (this.isDisposed) {
            return;
        }
        /* the connectionKey in a comet connected response is really
         * <instId>-<connectionKey> */
        const connectionStr = (_a = message.connectionDetails) === null || _a === void 0 ? void 0 : _a.connectionKey;
        transport_1.default.prototype.onConnect.call(this, message);
        const baseConnectionUri = this.baseUri + connectionStr;
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'CometTransport.onConnect()', 'baseUri = ' + baseConnectionUri);
        this.sendUri = baseConnectionUri + '/send';
        this.recvUri = baseConnectionUri + '/recv';
        this.closeUri = baseConnectionUri + '/close';
        this.disconnectUri = baseConnectionUri + '/disconnect';
    }
    send(message) {
        if (this.sendRequest) {
            /* there is a pending send, so queue this message */
            this.pendingItems = this.pendingItems || [];
            this.pendingItems.push(message);
            return;
        }
        /* send this, plus any pending, now */
        const pendingItems = this.pendingItems || [];
        pendingItems.push(message);
        this.pendingItems = null;
        this.sendItems(pendingItems);
    }
    sendAnyPending() {
        const pendingItems = this.pendingItems;
        if (!pendingItems) {
            return;
        }
        this.pendingItems = null;
        this.sendItems(pendingItems);
    }
    sendItems(items) {
        const sendRequest = (this.sendRequest = this.createRequest(this.sendUri, null, this.authParams, this.encodeRequest(items), XHRStates_1.default.REQ_SEND));
        sendRequest.on('complete', (err, data) => {
            if (err)
                logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'CometTransport.sendItems()', 'on complete: err = ' + Utils.inspectError(err));
            this.sendRequest = null;
            /* the result of the request, even if a nack, is usually a protocol response
             * contained in the data. An err is anomolous, and indicates some issue with the
             * network,transport, or connection */
            if (err) {
                if (err.code) {
                    /* A protocol error received from realtime. TODO: once realtime
                     * consistendly sends errors wrapped in protocol messages, should be
                     * able to remove this */
                    this.onData(protocolMessageFromRawError(err));
                }
                else {
                    /* A network/xhr error. Don't bother wrapping in a protocol message,
                     * just disconnect the transport */
                    this.disconnect(err);
                }
                return;
            }
            if (data) {
                this.onData(data);
            }
            if (this.pendingItems) {
                platform_1.default.Config.nextTick(() => {
                    /* If there's a new send request by now, any pending items will have
                     * been picked up by that; any new ones added since then will be
                     * picked up after that one completes */
                    if (!this.sendRequest) {
                        this.sendAnyPending();
                    }
                });
            }
        });
        sendRequest.exec();
    }
    recv() {
        /* do nothing if there is an active request, which might be streaming */
        if (this.recvRequest)
            return;
        /* If we're no longer connected, do nothing */
        if (!this.isConnected)
            return;
        const recvRequest = (this.recvRequest = this.createRequest(this.recvUri, null, this.authParams, null, this.stream ? XHRStates_1.default.REQ_RECV_STREAM : XHRStates_1.default.REQ_RECV_POLL));
        recvRequest.on('data', (data) => {
            this.onData(data);
        });
        recvRequest.on('complete', (err) => {
            this.recvRequest = null;
            /* A request completing must be considered activity, as realtime sends
             * heartbeats every 15s since a request began, not every 15s absolutely */
            this.onActivity();
            if (err) {
                if (err.code) {
                    /* A protocol error received from realtime. TODO: once realtime
                     * consistently sends errors wrapped in protocol messages, should be
                     * able to remove this */
                    this.onData(protocolMessageFromRawError(err));
                }
                else {
                    /* A network/xhr error. Don't bother wrapping in a protocol message,
                     * just disconnect the transport */
                    this.disconnect(err);
                }
                return;
            }
            platform_1.default.Config.nextTick(() => {
                this.recv();
            });
        });
        recvRequest.exec();
    }
    onData(responseData) {
        try {
            const items = this.decodeResponse(responseData);
            if (items && items.length)
                for (let i = 0; i < items.length; i++)
                    this.onProtocolMessage((0, protocolmessage_1.fromDeserialized)(items[i], this.connectionManager.realtime._RealtimePresence, this.connectionManager.realtime._Annotations));
        }
        catch (e) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'CometTransport.onData()', 'Unexpected exception handing channel event: ' + e.stack);
        }
    }
    encodeRequest(requestItems) {
        return JSON.stringify(requestItems);
    }
    decodeResponse(responseData) {
        if (typeof responseData == 'string')
            return JSON.parse(responseData);
        return responseData;
    }
}
exports["default"] = CometTransport;


/***/ }),

/***/ 836:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isRetriable = void 0;
const tslib_1 = __webpack_require__(7582);
const errorinfo_1 = tslib_1.__importDefault(__webpack_require__(1798));
const ConnectionErrorCodes = {
    DISCONNECTED: 80003,
    SUSPENDED: 80002,
    FAILED: 80000,
    CLOSING: 80017,
    CLOSED: 80017,
    UNKNOWN_CONNECTION_ERR: 50002,
    UNKNOWN_CHANNEL_ERR: 50001,
};
const ConnectionErrors = {
    disconnected: () => errorinfo_1.default.fromValues({
        statusCode: 400,
        code: ConnectionErrorCodes.DISCONNECTED,
        message: 'Connection to server temporarily unavailable',
    }),
    suspended: () => errorinfo_1.default.fromValues({
        statusCode: 400,
        code: ConnectionErrorCodes.SUSPENDED,
        message: 'Connection to server unavailable',
    }),
    failed: () => errorinfo_1.default.fromValues({
        statusCode: 400,
        code: ConnectionErrorCodes.FAILED,
        message: 'Connection failed or disconnected by server',
    }),
    closing: () => errorinfo_1.default.fromValues({
        statusCode: 400,
        code: ConnectionErrorCodes.CLOSING,
        message: 'Connection closing',
    }),
    closed: () => errorinfo_1.default.fromValues({
        statusCode: 400,
        code: ConnectionErrorCodes.CLOSED,
        message: 'Connection closed',
    }),
    unknownConnectionErr: () => errorinfo_1.default.fromValues({
        statusCode: 500,
        code: ConnectionErrorCodes.UNKNOWN_CONNECTION_ERR,
        message: 'Internal connection error',
    }),
    unknownChannelErr: () => errorinfo_1.default.fromValues({
        statusCode: 500,
        code: ConnectionErrorCodes.UNKNOWN_CONNECTION_ERR,
        message: 'Internal channel error',
    }),
};
function isRetriable(err) {
    if (!err.statusCode || !err.code || err.statusCode >= 500) {
        return true;
    }
    return Object.values(ConnectionErrorCodes).includes(err.code);
}
exports.isRetriable = isRetriable;
exports["default"] = ConnectionErrors;


/***/ }),

/***/ 3959:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TransportParams = void 0;
const tslib_1 = __webpack_require__(7582);
const protocolmessagecommon_1 = __webpack_require__(3507);
const protocolmessage_1 = __webpack_require__(8294);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const protocol_1 = tslib_1.__importStar(__webpack_require__(4273));
const defaults_1 = tslib_1.__importStar(__webpack_require__(3925));
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
const eventemitter_1 = tslib_1.__importDefault(__webpack_require__(3388));
const messagequeue_1 = tslib_1.__importDefault(__webpack_require__(3218));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const connectionstatechange_1 = tslib_1.__importDefault(__webpack_require__(7313));
const connectionerrors_1 = tslib_1.__importStar(__webpack_require__(836));
const errorinfo_1 = tslib_1.__importStar(__webpack_require__(1798));
const auth_1 = tslib_1.__importDefault(__webpack_require__(1047));
const message_1 = __webpack_require__(3176);
const multicaster_1 = tslib_1.__importDefault(__webpack_require__(578));
const transport_1 = tslib_1.__importDefault(__webpack_require__(9856));
const HttpStatusCodes_1 = tslib_1.__importDefault(__webpack_require__(5632));
const TransportName_1 = __webpack_require__(1228);
let globalObject = typeof __webpack_require__.g !== 'undefined' ? __webpack_require__.g : typeof window !== 'undefined' ? window : self;
const haveWebStorage = () => { var _a; return typeof platform_1.default.WebStorage !== 'undefined' && ((_a = platform_1.default.WebStorage) === null || _a === void 0 ? void 0 : _a.localSupported); };
const haveSessionStorage = () => { var _a; return typeof platform_1.default.WebStorage !== 'undefined' && ((_a = platform_1.default.WebStorage) === null || _a === void 0 ? void 0 : _a.sessionSupported); };
const noop = function () { };
const transportPreferenceName = 'ably-transport-preference';
function bundleWith(dest, src, maxSize) {
    let action;
    if (dest.channel !== src.channel) {
        /* RTL6d3 */
        return false;
    }
    if ((action = dest.action) !== protocolmessagecommon_1.actions.PRESENCE && action !== protocolmessagecommon_1.actions.MESSAGE) {
        /* RTL6d - can only bundle messages or presence */
        return false;
    }
    if (action !== src.action) {
        /* RTL6d4 */
        return false;
    }
    const kind = action === protocolmessagecommon_1.actions.PRESENCE ? 'presence' : 'messages', proposed = dest[kind].concat(src[kind]), size = (0, message_1.getMessagesSize)(proposed);
    if (size > maxSize) {
        /* RTL6d1 */
        return false;
    }
    if (!Utils.allSame(proposed, 'clientId')) {
        /* RTL6d2 */
        return false;
    }
    if (!proposed.every(function (msg) {
        return !msg.id;
    })) {
        /* RTL6d7 */
        return false;
    }
    /* we're good to go! */
    dest[kind] = proposed;
    return true;
}
function decodeRecoveryKey(recoveryKey) {
    try {
        return JSON.parse(recoveryKey);
    }
    catch (e) {
        return null;
    }
}
class TransportParams {
    constructor(options, host, mode, connectionKey) {
        this.options = options;
        this.host = host;
        this.mode = mode;
        this.connectionKey = connectionKey;
        this.format = options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json;
    }
    getConnectParams(authParams) {
        const params = authParams ? Utils.copy(authParams) : {};
        const options = this.options;
        switch (this.mode) {
            case 'resume':
                params.resume = this.connectionKey;
                break;
            case 'recover': {
                const recoveryContext = decodeRecoveryKey(options.recover);
                if (recoveryContext) {
                    params.recover = recoveryContext.connectionKey;
                }
                break;
            }
            default:
        }
        if (options.clientId !== undefined) {
            params.clientId = options.clientId;
        }
        if (options.echoMessages === false) {
            params.echo = 'false';
        }
        if (this.format !== undefined) {
            params.format = this.format;
        }
        if (this.stream !== undefined) {
            params.stream = this.stream;
        }
        if (this.heartbeats !== undefined) {
            params.heartbeats = this.heartbeats;
        }
        params.v = defaults_1.default.protocolVersion;
        params.agent = (0, defaults_1.getAgentString)(this.options);
        if (options.transportParams !== undefined) {
            Utils.mixin(params, options.transportParams);
        }
        return params;
    }
    toString() {
        let result = '[mode=' + this.mode;
        if (this.host) {
            result += ',host=' + this.host;
        }
        if (this.connectionKey) {
            result += ',connectionKey=' + this.connectionKey;
        }
        if (this.format) {
            result += ',format=' + this.format;
        }
        result += ']';
        return result;
    }
}
exports.TransportParams = TransportParams;
class ConnectionManager extends eventemitter_1.default {
    constructor(realtime, options) {
        super(realtime.logger);
        this.supportedTransports = {};
        this.disconnectedRetryCount = 0;
        this.pendingChannelMessagesState = { isProcessing: false, queue: [] };
        this.realtime = realtime;
        this.initTransports();
        this.options = options;
        const timeouts = options.timeouts;
        /* connectingTimeout: leave webSocketConnectTimeout (~6s) to try the
         * websocket transport, then realtimeRequestTimeout (~10s) to establish
         * the base transport in case that fails */
        const connectingTimeout = timeouts.webSocketConnectTimeout + timeouts.realtimeRequestTimeout;
        this.states = {
            initialized: {
                state: 'initialized',
                terminal: false,
                queueEvents: true,
                sendEvents: false,
                failState: 'disconnected',
            },
            connecting: {
                state: 'connecting',
                terminal: false,
                queueEvents: true,
                sendEvents: false,
                retryDelay: connectingTimeout,
                failState: 'disconnected',
            },
            connected: {
                state: 'connected',
                terminal: false,
                queueEvents: false,
                sendEvents: true,
                failState: 'disconnected',
            },
            disconnected: {
                state: 'disconnected',
                terminal: false,
                queueEvents: true,
                sendEvents: false,
                retryDelay: timeouts.disconnectedRetryTimeout,
                failState: 'disconnected',
            },
            suspended: {
                state: 'suspended',
                terminal: false,
                queueEvents: false,
                sendEvents: false,
                retryDelay: timeouts.suspendedRetryTimeout,
                failState: 'suspended',
            },
            closing: {
                state: 'closing',
                terminal: false,
                queueEvents: false,
                sendEvents: false,
                retryDelay: timeouts.realtimeRequestTimeout,
                failState: 'closed',
            },
            closed: { state: 'closed', terminal: true, queueEvents: false, sendEvents: false, failState: 'closed' },
            failed: { state: 'failed', terminal: true, queueEvents: false, sendEvents: false, failState: 'failed' },
        };
        this.state = this.states.initialized;
        this.errorReason = null;
        this.queuedMessages = new messagequeue_1.default(this.logger);
        this.msgSerial = 0;
        this.connectionDetails = undefined;
        this.connectionId = undefined;
        this.connectionKey = undefined;
        this.connectionStateTtl = timeouts.connectionStateTtl;
        this.maxIdleInterval = null;
        this.transports = Utils.intersect(options.transports || defaults_1.default.defaultTransports, this.supportedTransports);
        this.transportPreference = null;
        if (this.transports.includes(TransportName_1.TransportNames.WebSocket)) {
            this.webSocketTransportAvailable = true;
        }
        if (this.transports.includes(TransportName_1.TransportNames.XhrPolling)) {
            this.baseTransport = TransportName_1.TransportNames.XhrPolling;
        }
        else if (this.transports.includes(TransportName_1.TransportNames.Comet)) {
            this.baseTransport = TransportName_1.TransportNames.Comet;
        }
        this.httpHosts = defaults_1.default.getHosts(options);
        this.wsHosts = defaults_1.default.getHosts(options, true);
        this.activeProtocol = null;
        this.host = null;
        this.lastAutoReconnectAttempt = null;
        this.lastActivity = null;
        this.forceFallbackHost = false;
        this.connectCounter = 0;
        this.wsCheckResult = null;
        this.webSocketSlowTimer = null;
        this.webSocketGiveUpTimer = null;
        this.abandonedWebSocket = false;
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'Realtime.ConnectionManager()', 'started');
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'Realtime.ConnectionManager()', 'requested transports = [' + (options.transports || defaults_1.default.defaultTransports) + ']');
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'Realtime.ConnectionManager()', 'available transports = [' + this.transports + ']');
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'Realtime.ConnectionManager()', 'http hosts = [' + this.httpHosts + ']');
        if (!this.transports.length) {
            const msg = 'no requested transports available';
            logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'realtime.ConnectionManager()', msg);
            throw new Error(msg);
        }
        const addEventListener = platform_1.default.Config.addEventListener;
        if (addEventListener) {
            /* intercept close event in browser to persist connection id if requested */
            if (haveSessionStorage() && typeof options.recover === 'function') {
                addEventListener('beforeunload', this.persistConnection.bind(this));
            }
            if (options.closeOnUnload === true) {
                addEventListener('beforeunload', () => {
                    logger_1.default.logAction(this.logger, logger_1.default.LOG_MAJOR, 'Realtime.ConnectionManager()', 'beforeunload event has triggered the connection to close as closeOnUnload is true');
                    this.requestState({ state: 'closing' });
                });
            }
            /* Listen for online and offline events */
            addEventListener('online', () => {
                var _a;
                if (this.state == this.states.disconnected || this.state == this.states.suspended) {
                    logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager caught browser ‘online’ event', 'reattempting connection');
                    this.requestState({ state: 'connecting' });
                }
                else if (this.state == this.states.connecting) {
                    // RTN20c: if 'online' event recieved while CONNECTING, abandon connection attempt and retry
                    (_a = this.pendingTransport) === null || _a === void 0 ? void 0 : _a.off();
                    this.disconnectAllTransports();
                    this.startConnect();
                }
            });
            addEventListener('offline', () => {
                if (this.state == this.states.connected) {
                    logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager caught browser ‘offline’ event', 'disconnecting active transport');
                    // Not sufficient to just go to the 'disconnected' state, want to
                    // force all transports to reattempt the connection. Will immediately
                    // retry.
                    this.disconnectAllTransports();
                }
            });
        }
    }
    /*********************
     * transport management
     *********************/
    // Used by tests
    static supportedTransports(additionalImplementations) {
        const storage = { supportedTransports: {} };
        this.initTransports(additionalImplementations, storage);
        return storage.supportedTransports;
    }
    static initTransports(additionalImplementations, storage) {
        const implementations = Object.assign(Object.assign({}, platform_1.default.Transports.bundledImplementations), additionalImplementations);
        [TransportName_1.TransportNames.WebSocket, ...platform_1.default.Transports.order].forEach((transportName) => {
            const transport = implementations[transportName];
            if (transport && transport.isAvailable()) {
                storage.supportedTransports[transportName] = transport;
            }
        });
    }
    initTransports() {
        ConnectionManager.initTransports(this.realtime._additionalTransportImplementations, this);
    }
    createTransportParams(host, mode) {
        return new TransportParams(this.options, host, mode, this.connectionKey);
    }
    getTransportParams(callback) {
        const decideMode = (modeCb) => {
            if (this.connectionKey) {
                modeCb('resume');
                return;
            }
            if (typeof this.options.recover === 'string') {
                modeCb('recover');
                return;
            }
            const recoverFn = this.options.recover, lastSessionData = this.getSessionRecoverData(), sessionRecoveryName = this.sessionRecoveryName();
            if (lastSessionData && typeof recoverFn === 'function') {
                logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.getTransportParams()', 'Calling clientOptions-provided recover function with last session data (recovery scope: ' +
                    sessionRecoveryName +
                    ')');
                recoverFn(lastSessionData, (shouldRecover) => {
                    if (shouldRecover) {
                        this.options.recover = lastSessionData.recoveryKey;
                        modeCb('recover');
                    }
                    else {
                        modeCb('clean');
                    }
                });
                return;
            }
            modeCb('clean');
        };
        decideMode((mode) => {
            const transportParams = this.createTransportParams(null, mode);
            if (mode === 'recover') {
                logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.getTransportParams()', 'Transport recovery mode = recover; recoveryKey = ' + this.options.recover);
                const recoveryContext = decodeRecoveryKey(this.options.recover);
                if (recoveryContext) {
                    this.msgSerial = recoveryContext.msgSerial;
                }
            }
            else {
                logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.getTransportParams()', 'Transport params = ' + transportParams.toString());
            }
            callback(transportParams);
        });
    }
    /**
     * Attempt to connect using a given transport
     * @param transportParams
     * @param candidate, the transport to try
     * @param callback
     */
    tryATransport(transportParams, candidate, callback) {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'ConnectionManager.tryATransport()', 'trying ' + candidate);
        this.proposedTransport = transport_1.default.tryConnect(this.supportedTransports[candidate], this, this.realtime.auth, transportParams, (wrappedErr, transport) => {
            const state = this.state;
            if (state == this.states.closing || state == this.states.closed || state == this.states.failed) {
                if (transport) {
                    logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.tryATransport()', 'connection ' + state.state + ' while we were attempting the transport; closing ' + transport);
                    transport.close();
                }
                callback(true);
                return;
            }
            if (wrappedErr) {
                logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.tryATransport()', 'transport ' + candidate + ' ' + wrappedErr.event + ', err: ' + wrappedErr.error.toString());
                /* Comet transport onconnect token errors can be dealt with here.
                 * Websocket ones only happen after the transport claims to be viable,
                 * so are dealt with as non-onconnect token errors */
                if (auth_1.default.isTokenErr(wrappedErr.error) &&
                    !(this.errorReason && auth_1.default.isTokenErr(this.errorReason))) {
                    this.errorReason = wrappedErr.error;
                    /* re-get a token and try again */
                    Utils.whenPromiseSettles(this.realtime.auth._forceNewToken(null, null), (err) => {
                        if (err) {
                            this.actOnErrorFromAuthorize(err);
                            return;
                        }
                        this.tryATransport(transportParams, candidate, callback);
                    });
                }
                else if (wrappedErr.event === 'failed') {
                    /* Error that's fatal to the connection */
                    this.notifyState({ state: 'failed', error: wrappedErr.error });
                    callback(true);
                }
                else if (wrappedErr.event === 'disconnected') {
                    if (!(0, connectionerrors_1.isRetriable)(wrappedErr.error)) {
                        /* Error received from the server that does not call for trying a fallback host, eg a rate limit */
                        this.notifyState({ state: this.states.connecting.failState, error: wrappedErr.error });
                        callback(true);
                    }
                    else {
                        /* Error with that transport only; continue trying other fallback hosts */
                        callback(false);
                    }
                }
                return;
            }
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'ConnectionManager.tryATransport()', 'viable transport ' + candidate + '; setting pending');
            this.setTransportPending(transport, transportParams);
            callback(null, transport);
        });
    }
    /**
     * Called when a transport is indicated to be viable, and the ConnectionManager
     * expects to activate this transport as soon as it is connected.
     * @param transport
     * @param transportParams
     */
    setTransportPending(transport, transportParams) {
        const mode = transportParams.mode;
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.setTransportPending()', 'transport = ' + transport + '; mode = ' + mode);
        this.pendingTransport = transport;
        this.cancelWebSocketSlowTimer();
        this.cancelWebSocketGiveUpTimer();
        transport.once('connected', (error, connectionId, connectionDetails) => {
            this.activateTransport(error, transport, connectionId, connectionDetails);
            if (mode === 'recover' && this.options.recover) {
                /* After a successful recovery, we unpersist, as a recovery key cannot
                 * be used more than once */
                delete this.options.recover;
                this.unpersistConnection();
            }
        });
        const self = this;
        transport.on(['disconnected', 'closed', 'failed'], function (error) {
            self.deactivateTransport(transport, this.event, error);
        });
        this.emit('transport.pending', transport);
    }
    /**
     * Called when a transport is connected, and the connectionmanager decides that
     * it will now be the active transport. Returns whether or not it activated
     * the transport (if the connection is closing/closed it will choose not to).
     * @param transport the transport instance
     * @param connectionId the id of the new active connection
     * @param connectionDetails the details of the new active connection
     */
    activateTransport(error, transport, connectionId, connectionDetails) {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.activateTransport()', 'transport = ' + transport);
        if (error) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'ConnectionManager.activateTransport()', 'error = ' + error);
        }
        if (connectionId) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'ConnectionManager.activateTransport()', 'connectionId =  ' + connectionId);
        }
        if (connectionDetails) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'ConnectionManager.activateTransport()', 'connectionDetails =  ' + JSON.stringify(connectionDetails));
        }
        this.persistTransportPreference(transport);
        /* if the connectionmanager moved to the closing/closed state before this
         * connection event, then we won't activate this transport */
        const existingState = this.state, connectedState = this.states.connected.state;
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.activateTransport()', 'current state = ' + existingState.state);
        if (existingState.state == this.states.closing.state ||
            existingState.state == this.states.closed.state ||
            existingState.state == this.states.failed.state) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.activateTransport()', 'Disconnecting transport and abandoning');
            transport.disconnect();
            return false;
        }
        delete this.pendingTransport;
        /* if the transport is not connected then don't activate it */
        if (!transport.isConnected) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.activateTransport()', 'Declining to activate transport ' + transport + ' since it appears to no longer be connected');
            return false;
        }
        /* the given transport is connected; this will immediately
         * take over as the active transport */
        const existingActiveProtocol = this.activeProtocol;
        this.activeProtocol = new protocol_1.default(transport);
        this.host = transport.params.host;
        const connectionKey = connectionDetails.connectionKey;
        if (connectionKey && this.connectionKey != connectionKey) {
            this.setConnection(connectionId, connectionDetails, !!error);
        }
        /* Rebroadcast any new connectionDetails from the active transport, which
         * can come at any time (eg following a reauth), and emit an RTN24 UPDATE
         * event. (Listener added on nextTick because we're in a transport.on('connected')
         * callback at the moment; if we add it now we'll be adding it to the end
         * of the listeners array and it'll be called immediately) */
        this.onConnectionDetailsUpdate(connectionDetails, transport);
        platform_1.default.Config.nextTick(() => {
            transport.on('connected', (connectedErr, _connectionId, connectionDetails) => {
                this.onConnectionDetailsUpdate(connectionDetails, transport);
                this.emit('update', new connectionstatechange_1.default(connectedState, connectedState, null, connectedErr));
            });
        });
        /* If previously not connected, notify the state change (including any
         * error). */
        if (existingState.state === this.states.connected.state) {
            if (error) {
                this.errorReason = this.realtime.connection.errorReason = error;
                this.emit('update', new connectionstatechange_1.default(connectedState, connectedState, null, error));
            }
        }
        else {
            this.notifyState({ state: 'connected', error: error });
            this.errorReason = this.realtime.connection.errorReason = error || null;
        }
        /* Send after the connection state update, as Channels hooks into this to
         * resend attaches on a new transport if necessary */
        this.emit('transport.active', transport);
        /* Gracefully terminate existing protocol */
        if (existingActiveProtocol) {
            if (existingActiveProtocol.messageQueue.count() > 0) {
                /* We could just requeue pending messages on the new transport, but
                 * actually this should never happen: transports should only take over
                 * from other active transports when upgrading, and upgrading waits for
                 * the old transport to be idle. So log an error. */
                logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'ConnectionManager.activateTransport()', 'Previous active protocol (for transport ' +
                    existingActiveProtocol.transport.shortName +
                    ', new one is ' +
                    transport.shortName +
                    ') finishing with ' +
                    existingActiveProtocol.messageQueue.count() +
                    ' messages still pending');
            }
            if (existingActiveProtocol.transport === transport) {
                const msg = 'Assumption violated: activating a transport that was also the transport for the previous active protocol; transport = ' +
                    transport.shortName +
                    '; stack = ' +
                    new Error().stack;
                logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'ConnectionManager.activateTransport()', msg);
            }
            else {
                existingActiveProtocol.finish();
            }
        }
        return true;
    }
    /**
     * Called when a transport is no longer the active transport. This can occur
     * in any transport connection state.
     * @param transport
     */
    deactivateTransport(transport, state, error) {
        const currentProtocol = this.activeProtocol, wasActive = currentProtocol && currentProtocol.getTransport() === transport, wasPending = transport === this.pendingTransport, noTransportsScheduledForActivation = this.noTransportsScheduledForActivation();
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.deactivateTransport()', 'transport = ' + transport);
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.deactivateTransport()', 'state = ' +
            state +
            (wasActive ? '; was active' : wasPending ? '; was pending' : '') +
            (noTransportsScheduledForActivation ? '' : '; another transport is scheduled for activation'));
        if (error && error.message)
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'ConnectionManager.deactivateTransport()', 'reason =  ' + error.message);
        if (wasActive) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'ConnectionManager.deactivateTransport()', 'Getting, clearing, and requeuing ' +
                this.activeProtocol.messageQueue.count() +
                ' pending messages');
            this.queuePendingMessages(currentProtocol.getPendingMessages());
            /* Clear any messages we requeue to allow the protocol to become idle.*/
            currentProtocol.clearPendingMessages();
            this.activeProtocol = this.host = null;
        }
        this.emit('transport.inactive', transport);
        /* this transport state change is a state change for the connectionmanager if
         * - the transport was the active transport and there are no transports
         *   which are connected and scheduled for activation, just waiting for the
         *   active transport to finish what its doing; or
         * - the transport was the active transport and the error was fatal (so
         *   unhealable by another transport); or
         * - there is no active transport, and this is the last remaining
         *   pending transport (so we were in the connecting state)
         */
        if ((wasActive && noTransportsScheduledForActivation) ||
            (wasActive && state === 'failed') ||
            state === 'closed' ||
            (currentProtocol === null && wasPending)) {
            /* If we're disconnected with a 5xx we need to try fallback hosts
             * (RTN14d), but (a) due to how the upgrade sequence works, the
             * host/transport selection sequence only cares about getting to
             * `preconnect` (eg establishing a websocket) getting a `disconnected`
             * protocol message afterwards is too late; and (b) host retry only
             * applies to connectBase unless the stored preference transport doesn't
             * work. We solve this by unpersisting the transport preference and
             * setting an instance variable to force fallback hosts to be used (if
             * any) here. Bit of a kludge, but no real better alternatives without
             * rewriting the entire thing */
            if (state === 'disconnected' && error && error.statusCode > 500 && this.httpHosts.length > 1) {
                this.unpersistTransportPreference();
                this.forceFallbackHost = true;
                /* and try to connect again to try a fallback host without waiting for the usual 15s disconnectedRetryTimeout */
                this.notifyState({ state: state, error: error, retryImmediately: true });
                return;
            }
            /* TODO remove below line once realtime sends token errors as DISCONNECTEDs */
            const newConnectionState = state === 'failed' && auth_1.default.isTokenErr(error) ? 'disconnected' : state;
            this.notifyState({ state: newConnectionState, error: error });
            return;
        }
    }
    /* Helper that returns true if there are no transports which are pending,
     * have been connected, and are just waiting for onceNoPending to fire before
     * being activated */
    noTransportsScheduledForActivation() {
        return !this.pendingTransport || !this.pendingTransport.isConnected;
    }
    setConnection(connectionId, connectionDetails, hasConnectionError) {
        /* if connectionKey changes but connectionId stays the same, then just a
         * transport change on the same connection. If connectionId changes, we're
         * on a new connection, with implications for msgSerial and channel state */
        /* If no previous connectionId, don't reset the msgSerial as it may have
         * been set by recover data (unless the recover failed) */
        const prevConnId = this.connectionId, connIdChanged = prevConnId && prevConnId !== connectionId, recoverFailure = !prevConnId && hasConnectionError;
        if (connIdChanged || recoverFailure) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.setConnection()', 'Resetting msgSerial');
            this.msgSerial = 0;
            // RTN19a2: In the event of a new connectionId, previous msgSerials are
            // meaningless.
            this.queuedMessages.resetSendAttempted();
        }
        if (this.connectionId !== connectionId) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.setConnection()', 'New connectionId; reattaching any attached channels');
        }
        this.realtime.connection.id = this.connectionId = connectionId;
        this.realtime.connection.key = this.connectionKey = connectionDetails.connectionKey;
    }
    clearConnection() {
        this.realtime.connection.id = this.connectionId = undefined;
        this.realtime.connection.key = this.connectionKey = undefined;
        this.msgSerial = 0;
        this.unpersistConnection();
    }
    createRecoveryKey() {
        // RTN16g2.
        if (!this.connectionKey) {
            return null;
        }
        return JSON.stringify({
            connectionKey: this.connectionKey,
            msgSerial: this.msgSerial,
            channelSerials: this.realtime.channels.channelSerials(),
        });
    }
    checkConnectionStateFreshness() {
        if (!this.lastActivity || !this.connectionId) {
            return;
        }
        const sinceLast = Date.now() - this.lastActivity;
        if (sinceLast > this.connectionStateTtl + this.maxIdleInterval) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.checkConnectionStateFreshness()', 'Last known activity from realtime was ' + sinceLast + 'ms ago; discarding connection state');
            this.clearConnection();
            this.states.connecting.failState = 'suspended';
        }
    }
    /**
     * Called when the connectionmanager wants to persist transport
     * state for later recovery. Only applicable in the browser context.
     */
    persistConnection() {
        if (haveSessionStorage()) {
            const recoveryKey = this.createRecoveryKey();
            if (recoveryKey) {
                this.setSessionRecoverData({
                    recoveryKey: recoveryKey,
                    disconnectedAt: Date.now(),
                    location: globalObject.location,
                    clientId: this.realtime.auth.clientId,
                });
            }
        }
    }
    /**
     * Called when the connectionmanager wants to persist transport
     * state for later recovery. Only applicable in the browser context.
     */
    unpersistConnection() {
        this.clearSessionRecoverData();
    }
    /*********************
     * state management
     *********************/
    getError() {
        if (this.errorReason) {
            // create new PartialErrorInfo so it has the correct stack trace
            // which points to the place which caused us to return this error.
            const newError = errorinfo_1.PartialErrorInfo.fromValues(this.errorReason);
            newError.cause = this.errorReason;
            return newError;
        }
        return this.getStateError();
    }
    getStateError() {
        var _a, _b;
        return (_b = (_a = connectionerrors_1.default)[this.state.state]) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    activeState() {
        return this.state.queueEvents || this.state.sendEvents;
    }
    enactStateChange(stateChange) {
        const action = 'Connection state';
        const message = stateChange.current + (stateChange.reason ? '; reason: ' + stateChange.reason : '');
        if (stateChange.current === 'failed') {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, action, message);
        }
        else {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MAJOR, action, message);
        }
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.enactStateChange', 'setting new state: ' +
            stateChange.current +
            '; reason = ' +
            (stateChange.reason && stateChange.reason.message));
        const newState = (this.state = this.states[stateChange.current]);
        if (stateChange.reason) {
            this.errorReason = stateChange.reason;
            // TODO remove this type assertion after fixing https://github.com/ably/ably-js/issues/1405
            this.realtime.connection.errorReason = stateChange.reason;
        }
        if (newState.terminal || newState.state === 'suspended') {
            /* suspended is nonterminal, but once in the suspended state, realtime
             * will have discarded our connection state, so futher connection
             * attempts should start from scratch */
            this.clearConnection();
        }
        this.emit('connectionstate', stateChange);
    }
    /****************************************
     * ConnectionManager connection lifecycle
     ****************************************/
    startTransitionTimer(transitionState) {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.startTransitionTimer()', 'transitionState: ' + transitionState.state);
        if (this.transitionTimer) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.startTransitionTimer()', 'clearing already-running timer');
            clearTimeout(this.transitionTimer);
        }
        this.transitionTimer = setTimeout(() => {
            if (this.transitionTimer) {
                this.transitionTimer = null;
                logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager ' + transitionState.state + ' timer expired', 'requesting new state: ' + transitionState.failState);
                this.notifyState({ state: transitionState.failState });
            }
        }, transitionState.retryDelay);
    }
    cancelTransitionTimer() {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.cancelTransitionTimer()', '');
        if (this.transitionTimer) {
            clearTimeout(this.transitionTimer);
            this.transitionTimer = null;
        }
    }
    startSuspendTimer() {
        if (this.suspendTimer)
            return;
        this.suspendTimer = setTimeout(() => {
            if (this.suspendTimer) {
                this.suspendTimer = null;
                logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager suspend timer expired', 'requesting new state: suspended');
                this.states.connecting.failState = 'suspended';
                this.notifyState({ state: 'suspended' });
            }
        }, this.connectionStateTtl);
    }
    checkSuspendTimer(state) {
        if (state !== 'disconnected' && state !== 'suspended' && state !== 'connecting')
            this.cancelSuspendTimer();
    }
    cancelSuspendTimer() {
        this.states.connecting.failState = 'disconnected';
        if (this.suspendTimer) {
            clearTimeout(this.suspendTimer);
            this.suspendTimer = null;
        }
    }
    startRetryTimer(interval) {
        this.retryTimer = setTimeout(() => {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager retry timer expired', 'retrying');
            this.retryTimer = null;
            this.requestState({ state: 'connecting' });
        }, interval);
    }
    cancelRetryTimer() {
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
    }
    startWebSocketSlowTimer() {
        this.webSocketSlowTimer = setTimeout(() => {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager WebSocket slow timer', 'checking connectivity');
            this.checkWsConnectivity()
                .then(() => {
                logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager WebSocket slow timer', 'ws connectivity check succeeded');
                this.wsCheckResult = true;
            })
                .catch(() => {
                logger_1.default.logAction(this.logger, logger_1.default.LOG_MAJOR, 'ConnectionManager WebSocket slow timer', 'ws connectivity check failed');
                this.wsCheckResult = false;
            });
            if (this.realtime.http.checkConnectivity) {
                Utils.whenPromiseSettles(this.realtime.http.checkConnectivity(), (err, connectivity) => {
                    if (err || !connectivity) {
                        logger_1.default.logAction(this.logger, logger_1.default.LOG_MAJOR, 'ConnectionManager WebSocket slow timer', 'http connectivity check failed');
                        this.cancelWebSocketGiveUpTimer();
                        this.notifyState({
                            state: 'disconnected',
                            error: new errorinfo_1.default('Unable to connect (network unreachable)', 80003, 404),
                        });
                    }
                    else {
                        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager WebSocket slow timer', 'http connectivity check succeeded');
                    }
                });
            }
        }, this.options.timeouts.webSocketSlowTimeout);
    }
    cancelWebSocketSlowTimer() {
        if (this.webSocketSlowTimer) {
            clearTimeout(this.webSocketSlowTimer);
            this.webSocketSlowTimer = null;
        }
    }
    startWebSocketGiveUpTimer(transportParams) {
        this.webSocketGiveUpTimer = setTimeout(() => {
            var _a, _b;
            if (!this.wsCheckResult) {
                logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager WebSocket give up timer', 'websocket connection took more than 10s; ' + (this.baseTransport ? 'trying base transport' : ''));
                if (this.baseTransport) {
                    this.abandonedWebSocket = true;
                    (_a = this.proposedTransport) === null || _a === void 0 ? void 0 : _a.dispose();
                    (_b = this.pendingTransport) === null || _b === void 0 ? void 0 : _b.dispose();
                    this.connectBase(transportParams, ++this.connectCounter);
                }
                else {
                    // if we don't have a base transport to fallback to, just let the websocket connection attempt time out
                    logger_1.default.logAction(this.logger, logger_1.default.LOG_MAJOR, 'ConnectionManager WebSocket give up timer', 'websocket connectivity appears to be unavailable but no other transports to try');
                }
            }
        }, this.options.timeouts.webSocketConnectTimeout);
    }
    cancelWebSocketGiveUpTimer() {
        if (this.webSocketGiveUpTimer) {
            clearTimeout(this.webSocketGiveUpTimer);
            this.webSocketGiveUpTimer = null;
        }
    }
    notifyState(indicated) {
        var _a, _b;
        const state = indicated.state;
        /* We retry immediately if:
         * - something disconnects us while we're connected, or
         * - a viable (but not yet active) transport fails due to a token error (so
         *   this.errorReason will be set, and startConnect will do a forced
         *   authorize). If this.errorReason is already set (to a token error),
         *   then there has been at least one previous attempt to connect that also
         *   failed for a token error, so by RTN14b we go to DISCONNECTED and wait
         *   before trying again */
        const retryImmediately = state === 'disconnected' &&
            (this.state === this.states.connected ||
                indicated.retryImmediately ||
                (this.state === this.states.connecting &&
                    indicated.error &&
                    auth_1.default.isTokenErr(indicated.error) &&
                    !(this.errorReason && auth_1.default.isTokenErr(this.errorReason))));
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.notifyState()', 'new state: ' + state + (retryImmediately ? '; will retry connection immediately' : ''));
        /* do nothing if we're already in the indicated state */
        if (state == this.state.state)
            return;
        /* kill timers (possibly excepting suspend timer depending on the notified
         * state), as these are superseded by this notification */
        this.cancelTransitionTimer();
        this.cancelRetryTimer();
        this.cancelWebSocketSlowTimer();
        this.cancelWebSocketGiveUpTimer();
        this.checkSuspendTimer(indicated.state);
        if (state === 'suspended' || state === 'connected') {
            this.disconnectedRetryCount = 0;
        }
        /* do nothing if we're unable to move from the current state */
        if (this.state.terminal)
            return;
        /* process new state */
        const newState = this.states[indicated.state];
        let retryDelay = newState.retryDelay;
        if (newState.state === 'disconnected') {
            this.disconnectedRetryCount++;
            retryDelay = Utils.getRetryTime(newState.retryDelay, this.disconnectedRetryCount);
        }
        const change = new connectionstatechange_1.default(this.state.state, newState.state, retryDelay, indicated.error || ((_b = (_a = connectionerrors_1.default)[newState.state]) === null || _b === void 0 ? void 0 : _b.call(_a)));
        if (retryImmediately) {
            const autoReconnect = () => {
                if (this.state === this.states.disconnected) {
                    this.lastAutoReconnectAttempt = Date.now();
                    this.requestState({ state: 'connecting' });
                }
            };
            const sinceLast = this.lastAutoReconnectAttempt && Date.now() - this.lastAutoReconnectAttempt + 1;
            if (sinceLast && sinceLast < 1000) {
                logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'ConnectionManager.notifyState()', 'Last reconnect attempt was only ' +
                    sinceLast +
                    'ms ago, waiting another ' +
                    (1000 - sinceLast) +
                    'ms before trying again');
                setTimeout(autoReconnect, 1000 - sinceLast);
            }
            else {
                platform_1.default.Config.nextTick(autoReconnect);
            }
        }
        else if (state === 'disconnected' || state === 'suspended') {
            this.startRetryTimer(retryDelay);
        }
        /* If going into disconnect/suspended (and not retrying immediately), or a
         * terminal state, ensure there are no orphaned transports hanging around. */
        if ((state === 'disconnected' && !retryImmediately) || state === 'suspended' || newState.terminal) {
            /* Wait till the next tick so the connection state change is enacted,
             * so aborting transports doesn't trigger redundant state changes */
            platform_1.default.Config.nextTick(() => {
                this.disconnectAllTransports();
            });
        }
        if (state == 'connected' && !this.activeProtocol) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'ConnectionManager.notifyState()', 'Broken invariant: attempted to go into connected state, but there is no active protocol');
        }
        /* implement the change and notify */
        this.enactStateChange(change);
        if (this.state.sendEvents) {
            this.sendQueuedMessages();
        }
        else if (!this.state.queueEvents) {
            this.realtime.channels.propogateConnectionInterruption(state, change.reason);
            this.failQueuedMessages(change.reason); // RTN7c
        }
    }
    requestState(request) {
        var _a, _b;
        const state = request.state;
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.requestState()', 'requested state: ' + state + '; current state: ' + this.state.state);
        if (state == this.state.state)
            return; /* silently do nothing */
        /* kill running timers, as this request supersedes them */
        this.cancelWebSocketSlowTimer();
        this.cancelWebSocketGiveUpTimer();
        this.cancelTransitionTimer();
        this.cancelRetryTimer();
        /* for suspend timer check rather than cancel -- eg requesting a connecting
         * state should not reset the suspend timer */
        this.checkSuspendTimer(state);
        if (state == 'connecting' && this.state.state == 'connected')
            return;
        if (state == 'closing' && this.state.state == 'closed')
            return;
        const newState = this.states[state], change = new connectionstatechange_1.default(this.state.state, newState.state, null, request.error || ((_b = (_a = connectionerrors_1.default)[newState.state]) === null || _b === void 0 ? void 0 : _b.call(_a)));
        this.enactStateChange(change);
        if (state == 'connecting') {
            platform_1.default.Config.nextTick(() => {
                this.startConnect();
            });
        }
        if (state == 'closing') {
            this.closeImpl();
        }
    }
    startConnect() {
        if (this.state !== this.states.connecting) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.startConnect()', 'Must be in connecting state to connect, but was ' + this.state.state);
            return;
        }
        const auth = this.realtime.auth;
        /* The point of the connectCounter mechanism is to ensure that the
         * connection procedure can be cancelled. We want disconnectAllTransports
         * to be able to stop any in-progress connection, even before it gets to
         * the stage of having a pending (or even a proposed) transport that it can
         * dispose() of. So we check that it's still current after any async stage,
         * up until the stage that is synchronous with instantiating a transport */
        const connectCount = ++this.connectCounter;
        const connect = () => {
            this.checkConnectionStateFreshness();
            this.getTransportParams((transportParams) => {
                if (transportParams.mode === 'recover' && transportParams.options.recover) {
                    const recoveryContext = decodeRecoveryKey(transportParams.options.recover);
                    if (recoveryContext) {
                        this.realtime.channels.recoverChannels(recoveryContext.channelSerials);
                    }
                }
                if (connectCount !== this.connectCounter) {
                    return;
                }
                this.connectImpl(transportParams, connectCount);
            });
        };
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.startConnect()', 'starting connection');
        this.startSuspendTimer();
        this.startTransitionTimer(this.states.connecting);
        if (auth.method === 'basic') {
            connect();
        }
        else {
            const authCb = (err) => {
                if (connectCount !== this.connectCounter) {
                    return;
                }
                if (err) {
                    this.actOnErrorFromAuthorize(err);
                }
                else {
                    connect();
                }
            };
            if (this.errorReason && auth_1.default.isTokenErr(this.errorReason)) {
                /* Force a refetch of a new token */
                Utils.whenPromiseSettles(auth._forceNewToken(null, null), authCb);
            }
            else {
                Utils.whenPromiseSettles(auth._ensureValidAuthCredentials(false), authCb);
            }
        }
    }
    /*
     * there are, at most, two transports available with which a connection may
     * be attempted: web_socket and/or a base transport (xhr_polling in browsers,
     * comet in nodejs). web_socket is always preferred, and the base transport is
     * only used in case web_socket connectivity appears to be unavailable.
     *
     * connectImpl begins the transport selection process by checking which transports
     * are available, and if there is a cached preference. It then defers to the
     * transport-specific connect methods: connectWs and connectBase.
     *
     * It is also responsible for invalidating the cache in the case that a base
     * transport preference is stored but web socket connectivity is now available.
     *
     * handling of the case where we need to failover from web_socket to the base
     * transport is implemented in the connectWs method.
     */
    connectImpl(transportParams, connectCount) {
        const state = this.state.state;
        if (state !== this.states.connecting.state) {
            /* Only keep trying as long as in the 'connecting' state (or 'connected'
             * for upgrading). Any operation can put us into 'disconnected' to cancel
             * connection attempts and wait before retrying, or 'failed' to fail. */
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.connectImpl()', 'Must be in connecting state to connect, but was ' + state);
            return;
        }
        const transportPreference = this.getTransportPreference();
        // If transport preference is for a non-ws transport but websocket is now available, unpersist the preference for next time
        if (transportPreference && transportPreference === this.baseTransport && this.webSocketTransportAvailable) {
            this.checkWsConnectivity()
                .then(() => {
                this.unpersistTransportPreference();
                if (this.state === this.states.connecting) {
                    logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.connectImpl():', 'web socket connectivity available, cancelling connection attempt with ' + this.baseTransport);
                    this.disconnectAllTransports();
                    this.connectWs(transportParams, ++this.connectCounter);
                }
            })
                .catch(noop);
        }
        if ((transportPreference && transportPreference === this.baseTransport) ||
            (this.baseTransport && !this.webSocketTransportAvailable)) {
            this.connectBase(transportParams, connectCount);
        }
        else {
            this.connectWs(transportParams, connectCount);
        }
    }
    /*
     * connectWs starts two timers to monitor the success of a web_socket connection attempt:
     * - webSocketSlowTimer: if this timer fires before the connection succeeds,
     *   cm will simultaneously check websocket and http/xhr connectivity. if the http
     *   connectivity check fails, we give up the connection sequence entirely and
     *   transition to disconnected. if the websocket connectivity check fails then
     *   we assume no ws connectivity and failover to base transport. in the case that
     *   the checks succeed, we continue with websocket and wait for it to try fallback hosts
     *   and, if unsuccessful, ultimately transition to disconnected.
     * - webSocketGiveUpTimer: if this timer fires, and the preceding websocket
     *   connectivity check is still pending then we assume that there is an issue
     *   with the transport and fallback to base transport.
     */
    connectWs(transportParams, connectCount) {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'ConnectionManager.connectWs()');
        this.wsCheckResult = null;
        this.abandonedWebSocket = false;
        this.startWebSocketSlowTimer();
        this.startWebSocketGiveUpTimer(transportParams);
        this.tryTransportWithFallbacks('web_socket', transportParams, true, connectCount, () => {
            return this.wsCheckResult !== false && !this.abandonedWebSocket;
        });
    }
    connectBase(transportParams, connectCount) {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'ConnectionManager.connectBase()');
        if (this.baseTransport) {
            this.tryTransportWithFallbacks(this.baseTransport, transportParams, false, connectCount, () => true);
        }
        else {
            this.notifyState({
                state: 'disconnected',
                error: new errorinfo_1.default('No transports left to try', 80000, 404),
            });
        }
    }
    tryTransportWithFallbacks(transportName, transportParams, ws, connectCount, shouldContinue) {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'ConnectionManager.tryTransportWithFallbacks()', transportName);
        const giveUp = (err) => {
            this.notifyState({ state: this.states.connecting.failState, error: err });
        };
        const candidateHosts = ws ? this.wsHosts.slice() : this.httpHosts.slice();
        const hostAttemptCb = (fatal, transport) => {
            if (connectCount !== this.connectCounter) {
                return;
            }
            if (!shouldContinue()) {
                if (transport) {
                    transport.dispose();
                }
                return;
            }
            if (!transport && !fatal) {
                tryFallbackHosts();
            }
        };
        /* first try to establish a connection with the priority host with http transport */
        const host = candidateHosts.shift();
        if (!host) {
            giveUp(new errorinfo_1.default('Unable to connect (no available host)', 80003, 404));
            return;
        }
        transportParams.host = host;
        /* this is what we'll be doing if the attempt for the main host fails */
        const tryFallbackHosts = () => {
            /* if there aren't any fallback hosts, fail */
            if (!candidateHosts.length) {
                giveUp(new errorinfo_1.default('Unable to connect (and no more fallback hosts to try)', 80003, 404));
                return;
            }
            /* before trying any fallback (or any remaining fallback) we decide if
             * there is a problem with the ably host, or there is a general connectivity
             * problem */
            if (!this.realtime.http.checkConnectivity) {
                giveUp(new errorinfo_1.PartialErrorInfo('Internal error: Http.checkConnectivity not set', null, 500));
                return;
            }
            Utils.whenPromiseSettles(this.realtime.http.checkConnectivity(), (err, connectivity) => {
                if (connectCount !== this.connectCounter) {
                    return;
                }
                if (!shouldContinue()) {
                    return;
                }
                /* we know err won't happen but handle it here anyway */
                if (err) {
                    giveUp(err);
                    return;
                }
                if (!connectivity) {
                    /* the internet isn't reachable, so don't try the fallback hosts */
                    giveUp(new errorinfo_1.default('Unable to connect (network unreachable)', 80003, 404));
                    return;
                }
                /* the network is there, so there's a problem with the main host, or
                 * its dns. Try the fallback hosts. We could try them simultaneously but
                 * that would potentially cause a huge spike in load on the load balancer */
                transportParams.host = Utils.arrPopRandomElement(candidateHosts);
                this.tryATransport(transportParams, transportName, hostAttemptCb);
            });
        };
        if (this.forceFallbackHost && candidateHosts.length) {
            this.forceFallbackHost = false;
            tryFallbackHosts();
            return;
        }
        this.tryATransport(transportParams, transportName, hostAttemptCb);
    }
    closeImpl() {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.closeImpl()', 'closing connection');
        this.cancelSuspendTimer();
        this.startTransitionTimer(this.states.closing);
        if (this.pendingTransport) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'ConnectionManager.closeImpl()', 'Closing pending transport: ' + this.pendingTransport);
            this.pendingTransport.close();
        }
        if (this.activeProtocol) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'ConnectionManager.closeImpl()', 'Closing active transport: ' + this.activeProtocol.getTransport());
            this.activeProtocol.getTransport().close();
        }
        /* If there was an active transport, this will probably be
         * preempted by the notifyState call in deactivateTransport */
        this.notifyState({ state: 'closed' });
    }
    onAuthUpdated(tokenDetails, callback) {
        var _a;
        switch (this.state.state) {
            case 'connected': {
                logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'ConnectionManager.onAuthUpdated()', 'Sending AUTH message on active transport');
                /* Do any transport-specific new-token action */
                const activeTransport = (_a = this.activeProtocol) === null || _a === void 0 ? void 0 : _a.getTransport();
                if (activeTransport && activeTransport.onAuthUpdated) {
                    activeTransport.onAuthUpdated(tokenDetails);
                }
                const authMsg = (0, protocolmessage_1.fromValues)({
                    action: protocolmessagecommon_1.actions.AUTH,
                    auth: {
                        accessToken: tokenDetails.token,
                    },
                });
                this.send(authMsg);
                /* The answer will come back as either a connectiondetails event
                 * (realtime sends a CONNECTED to acknowledge the reauth) or a
                 * statechange to failed */
                const successListener = () => {
                    this.off(failureListener);
                    callback(null, tokenDetails);
                };
                const failureListener = (stateChange) => {
                    if (stateChange.current === 'failed') {
                        this.off(successListener);
                        this.off(failureListener);
                        callback(stateChange.reason || this.getStateError());
                    }
                };
                this.once('connectiondetails', successListener);
                this.on('connectionstate', failureListener);
                break;
            }
            case 'connecting':
                logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'ConnectionManager.onAuthUpdated()', 'Aborting current connection attempts in order to start again with the new auth details');
                this.disconnectAllTransports();
            /* fallthrough to add statechange listener */
            default: {
                logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'ConnectionManager.onAuthUpdated()', 'Connection state is ' + this.state.state + '; waiting until either connected or failed');
                const listener = (stateChange) => {
                    switch (stateChange.current) {
                        case 'connected':
                            this.off(listener);
                            callback(null, tokenDetails);
                            break;
                        case 'failed':
                        case 'closed':
                        case 'suspended':
                            this.off(listener);
                            callback(stateChange.reason || this.getStateError());
                            break;
                        default:
                            /* ignore till we get either connected or failed */
                            break;
                    }
                };
                this.on('connectionstate', listener);
                if (this.state.state === 'connecting') {
                    /* can happen if in the connecting state but no transport was pending
                     * yet, so disconnectAllTransports did not trigger a disconnected state */
                    this.startConnect();
                }
                else {
                    this.requestState({ state: 'connecting' });
                }
            }
        }
    }
    disconnectAllTransports() {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.disconnectAllTransports()', 'Disconnecting all transports');
        /* This will prevent any connection procedure in an async part of one of its early stages from continuing */
        this.connectCounter++;
        if (this.pendingTransport) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'ConnectionManager.disconnectAllTransports()', 'Disconnecting pending transport: ' + this.pendingTransport);
            this.pendingTransport.disconnect();
        }
        delete this.pendingTransport;
        if (this.proposedTransport) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'ConnectionManager.disconnectAllTransports()', 'Disconnecting proposed transport: ' + this.pendingTransport);
            this.proposedTransport.disconnect();
        }
        delete this.pendingTransport;
        if (this.activeProtocol) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'ConnectionManager.disconnectAllTransports()', 'Disconnecting active transport: ' + this.activeProtocol.getTransport());
            this.activeProtocol.getTransport().disconnect();
        }
        /* No need to notify state disconnected; disconnecting the active transport
         * will have that effect */
    }
    /******************
     * event queueing
     ******************/
    send(msg, queueEvent, callback) {
        callback = callback || noop;
        const state = this.state;
        if (state.sendEvents) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'ConnectionManager.send()', 'sending event');
            this.sendImpl(new protocol_1.PendingMessage(msg, callback));
            return;
        }
        const shouldQueue = queueEvent && state.queueEvents;
        if (!shouldQueue) {
            const err = 'rejecting event, queueEvent was ' + queueEvent + ', state was ' + state.state;
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'ConnectionManager.send()', err);
            callback(this.errorReason || new errorinfo_1.default(err, 90000, 400));
            return;
        }
        if (this.logger.shouldLog(logger_1.default.LOG_MICRO)) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'ConnectionManager.send()', 'queueing msg; ' + (0, protocolmessage_1.stringify)(msg, this.realtime._RealtimePresence, this.realtime._Annotations));
        }
        this.queue(msg, callback);
    }
    sendImpl(pendingMessage) {
        const msg = pendingMessage.message;
        /* If have already attempted to send this, resend with the same msgSerial,
         * so Ably can dedup if the previous send succeeded */
        if (pendingMessage.ackRequired && !pendingMessage.sendAttempted) {
            msg.msgSerial = this.msgSerial++;
        }
        try {
            this.activeProtocol.send(pendingMessage);
        }
        catch (e) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'ConnectionManager.sendImpl()', 'Unexpected exception in transport.send(): ' + e.stack);
        }
    }
    queue(msg, callback) {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'ConnectionManager.queue()', 'queueing event');
        const lastQueued = this.queuedMessages.last();
        const maxSize = this.options.maxMessageSize;
        /* If have already attempted to send a message, don't merge more messages
         * into it, as if the previous send actually succeeded and realtime ignores
         * the dup, they'll be lost */
        if (lastQueued && !lastQueued.sendAttempted && bundleWith(lastQueued.message, msg, maxSize)) {
            if (!lastQueued.merged) {
                lastQueued.callback = multicaster_1.default.create(this.logger, [lastQueued.callback]);
                lastQueued.merged = true;
            }
            lastQueued.callback.push(callback);
        }
        else {
            this.queuedMessages.push(new protocol_1.PendingMessage(msg, callback));
        }
    }
    sendQueuedMessages() {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'ConnectionManager.sendQueuedMessages()', 'sending ' + this.queuedMessages.count() + ' queued messages');
        let pendingMessage;
        while ((pendingMessage = this.queuedMessages.shift()))
            this.sendImpl(pendingMessage);
    }
    queuePendingMessages(pendingMessages) {
        if (pendingMessages && pendingMessages.length) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'ConnectionManager.queuePendingMessages()', 'queueing ' + pendingMessages.length + ' pending messages');
            this.queuedMessages.prepend(pendingMessages);
        }
    }
    failQueuedMessages(err) {
        const numQueued = this.queuedMessages.count();
        if (numQueued > 0) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'ConnectionManager.failQueuedMessages()', 'failing ' + numQueued + ' queued messages, err = ' + Utils.inspectError(err));
            this.queuedMessages.completeAllMessages(err);
        }
    }
    onChannelMessage(message, transport) {
        this.pendingChannelMessagesState.queue.push({ message, transport });
        if (!this.pendingChannelMessagesState.isProcessing) {
            this.processNextPendingChannelMessage();
        }
    }
    processNextPendingChannelMessage() {
        if (this.pendingChannelMessagesState.queue.length > 0) {
            this.pendingChannelMessagesState.isProcessing = true;
            const pendingChannelMessage = this.pendingChannelMessagesState.queue.shift();
            this.processChannelMessage(pendingChannelMessage.message)
                .catch((err) => {
                logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'ConnectionManager.processNextPendingChannelMessage() received error ', err);
            })
                .finally(() => {
                this.pendingChannelMessagesState.isProcessing = false;
                this.processNextPendingChannelMessage();
            });
        }
    }
    async processChannelMessage(message) {
        await this.realtime.channels.processChannelMessage(message);
    }
    async ping() {
        var _a;
        if (this.state.state !== 'connected') {
            throw new errorinfo_1.default('Unable to ping service; not connected', 40000, 400);
        }
        const transport = (_a = this.activeProtocol) === null || _a === void 0 ? void 0 : _a.getTransport();
        if (!transport) {
            throw this.getStateError();
        }
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.ping()', 'transport = ' + transport);
        const pingStart = Date.now();
        const id = Utils.cheapRandStr();
        return Utils.withTimeoutAsync(new Promise((resolve) => {
            const onHeartbeat = (responseId) => {
                if (responseId === id) {
                    transport.off('heartbeat', onHeartbeat);
                    resolve(Date.now() - pingStart);
                }
            };
            transport.on('heartbeat', onHeartbeat);
            transport.ping(id);
        }), this.options.timeouts.realtimeRequestTimeout, 'Timeout waiting for heartbeat response');
    }
    abort(error) {
        this.activeProtocol.getTransport().fail(error);
    }
    getTransportPreference() {
        var _a, _b;
        return this.transportPreference || (haveWebStorage() && ((_b = (_a = platform_1.default.WebStorage) === null || _a === void 0 ? void 0 : _a.get) === null || _b === void 0 ? void 0 : _b.call(_a, transportPreferenceName)));
    }
    persistTransportPreference(transport) {
        var _a, _b;
        this.transportPreference = transport.shortName;
        if (haveWebStorage()) {
            (_b = (_a = platform_1.default.WebStorage) === null || _a === void 0 ? void 0 : _a.set) === null || _b === void 0 ? void 0 : _b.call(_a, transportPreferenceName, transport.shortName);
        }
    }
    unpersistTransportPreference() {
        var _a, _b;
        this.transportPreference = null;
        if (haveWebStorage()) {
            (_b = (_a = platform_1.default.WebStorage) === null || _a === void 0 ? void 0 : _a.remove) === null || _b === void 0 ? void 0 : _b.call(_a, transportPreferenceName);
        }
    }
    /* This method is only used during connection attempts, so implements RSA4c1, RSA4c2,
     * and RSA4d. It is generally not invoked for serverside-triggered reauths or manual
     * reauths, so RSA4c3 does not apply, except (per per RSA4d1) in the case that the auth
     * server returns 403. */
    actOnErrorFromAuthorize(err) {
        if (err.code === 40171) {
            /* No way to reauth */
            this.notifyState({ state: 'failed', error: err });
        }
        else if (err.code === 40102) {
            this.notifyState({ state: 'failed', error: err });
        }
        else if (err.statusCode === HttpStatusCodes_1.default.Forbidden) {
            const msg = 'Client configured authentication provider returned 403; failing the connection';
            logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'ConnectionManager.actOnErrorFromAuthorize()', msg);
            this.notifyState({ state: 'failed', error: new errorinfo_1.default(msg, 80019, 403, err) });
        }
        else {
            const msg = 'Client configured authentication provider request failed';
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'ConnectionManager.actOnErrorFromAuthorize', msg);
            this.notifyState({ state: this.state.failState, error: new errorinfo_1.default(msg, 80019, 401, err) });
        }
    }
    onConnectionDetailsUpdate(connectionDetails, transport) {
        if (!connectionDetails) {
            return;
        }
        this.connectionDetails = connectionDetails;
        if (connectionDetails.maxMessageSize) {
            this.options.maxMessageSize = connectionDetails.maxMessageSize;
        }
        const clientId = connectionDetails.clientId;
        if (clientId) {
            const err = this.realtime.auth._uncheckedSetClientId(clientId);
            if (err) {
                logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'ConnectionManager.onConnectionDetailsUpdate()', err.message);
                /* Errors setting the clientId are fatal to the connection */
                transport.fail(err);
                return;
            }
        }
        const connectionStateTtl = connectionDetails.connectionStateTtl;
        if (connectionStateTtl) {
            this.connectionStateTtl = connectionStateTtl;
        }
        this.maxIdleInterval = connectionDetails.maxIdleInterval;
        this.emit('connectiondetails', connectionDetails);
    }
    checkWsConnectivity() {
        const wsConnectivityCheckUrl = this.options.wsConnectivityCheckUrl || defaults_1.default.wsConnectivityCheckUrl;
        const ws = new platform_1.default.Config.WebSocket(wsConnectivityCheckUrl);
        return new Promise((resolve, reject) => {
            let finished = false;
            ws.onopen = () => {
                if (!finished) {
                    finished = true;
                    resolve();
                    ws.close();
                }
            };
            ws.onclose = ws.onerror = () => {
                if (!finished) {
                    finished = true;
                    reject();
                }
            };
        });
    }
    sessionRecoveryName() {
        return this.options.recoveryKeyStorageName || 'ably-connection-recovery';
    }
    getSessionRecoverData() {
        var _a, _b;
        return haveSessionStorage() && ((_b = (_a = platform_1.default.WebStorage) === null || _a === void 0 ? void 0 : _a.getSession) === null || _b === void 0 ? void 0 : _b.call(_a, this.sessionRecoveryName()));
    }
    setSessionRecoverData(value) {
        var _a, _b;
        return haveSessionStorage() && ((_b = (_a = platform_1.default.WebStorage) === null || _a === void 0 ? void 0 : _a.setSession) === null || _b === void 0 ? void 0 : _b.call(_a, this.sessionRecoveryName(), value));
    }
    clearSessionRecoverData() {
        var _a, _b;
        return haveSessionStorage() && ((_b = (_a = platform_1.default.WebStorage) === null || _a === void 0 ? void 0 : _a.removeSession) === null || _b === void 0 ? void 0 : _b.call(_a, this.sessionRecoveryName()));
    }
}
exports["default"] = ConnectionManager;


/***/ }),

/***/ 3218:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(7582);
const eventemitter_1 = tslib_1.__importDefault(__webpack_require__(3388));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
class MessageQueue extends eventemitter_1.default {
    constructor(logger) {
        super(logger);
        this.messages = [];
    }
    count() {
        return this.messages.length;
    }
    push(message) {
        this.messages.push(message);
    }
    shift() {
        return this.messages.shift();
    }
    last() {
        return this.messages[this.messages.length - 1];
    }
    copyAll() {
        return this.messages.slice();
    }
    append(messages) {
        this.messages.push.apply(this.messages, messages);
    }
    prepend(messages) {
        this.messages.unshift.apply(this.messages, messages);
    }
    completeMessages(serial, count, err) {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'MessageQueue.completeMessages()', 'serial = ' + serial + '; count = ' + count);
        err = err || null;
        const messages = this.messages;
        if (messages.length === 0) {
            throw new Error('MessageQueue.completeMessages(): completeMessages called on any empty MessageQueue');
        }
        const first = messages[0];
        if (first) {
            const startSerial = first.message.msgSerial;
            const endSerial = serial + count; /* the serial of the first message that is *not* the subject of this call */
            if (endSerial > startSerial) {
                const completeMessages = messages.splice(0, endSerial - startSerial);
                for (const message of completeMessages) {
                    message.callback(err);
                }
            }
            if (messages.length == 0)
                this.emit('idle');
        }
    }
    completeAllMessages(err) {
        this.completeMessages(0, Number.MAX_SAFE_INTEGER || Number.MAX_VALUE, err);
    }
    resetSendAttempted() {
        for (let msg of this.messages) {
            msg.sendAttempted = false;
        }
    }
    clear() {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'MessageQueue.clear()', 'clearing ' + this.messages.length + ' messages');
        this.messages = [];
        this.emit('idle');
    }
}
exports["default"] = MessageQueue;


/***/ }),

/***/ 4273:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PendingMessage = void 0;
const tslib_1 = __webpack_require__(7582);
const protocolmessagecommon_1 = __webpack_require__(3507);
const protocolmessage_1 = __webpack_require__(8294);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const eventemitter_1 = tslib_1.__importDefault(__webpack_require__(3388));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const messagequeue_1 = tslib_1.__importDefault(__webpack_require__(3218));
const errorinfo_1 = tslib_1.__importDefault(__webpack_require__(1798));
class PendingMessage {
    constructor(message, callback) {
        this.message = message;
        this.callback = callback;
        this.merged = false;
        const action = message.action;
        this.sendAttempted = false;
        this.ackRequired = action == protocolmessagecommon_1.actions.MESSAGE || action == protocolmessagecommon_1.actions.PRESENCE || action == protocolmessagecommon_1.actions.ANNOTATION;
    }
}
exports.PendingMessage = PendingMessage;
class Protocol extends eventemitter_1.default {
    constructor(transport) {
        super(transport.logger);
        this.transport = transport;
        this.messageQueue = new messagequeue_1.default(this.logger);
        transport.on('ack', (serial, count) => {
            this.onAck(serial, count);
        });
        transport.on('nack', (serial, count, err) => {
            this.onNack(serial, count, err);
        });
    }
    onAck(serial, count) {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'Protocol.onAck()', 'serial = ' + serial + '; count = ' + count);
        this.messageQueue.completeMessages(serial, count);
    }
    onNack(serial, count, err) {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'Protocol.onNack()', 'serial = ' + serial + '; count = ' + count + '; err = ' + Utils.inspectError(err));
        if (!err) {
            err = new errorinfo_1.default('Unable to send message; channel not responding', 50001, 500);
        }
        this.messageQueue.completeMessages(serial, count, err);
    }
    onceIdle(listener) {
        const messageQueue = this.messageQueue;
        if (messageQueue.count() === 0) {
            listener();
            return;
        }
        messageQueue.once('idle', listener);
    }
    send(pendingMessage) {
        if (pendingMessage.ackRequired) {
            this.messageQueue.push(pendingMessage);
        }
        if (this.logger.shouldLog(logger_1.default.LOG_MICRO)) {
            logger_1.default.logActionNoStrip(this.logger, logger_1.default.LOG_MICRO, 'Protocol.send()', 'sending msg; ' +
                (0, protocolmessage_1.stringify)(pendingMessage.message, this.transport.connectionManager.realtime._RealtimePresence, this.transport.connectionManager.realtime._Annotations));
        }
        pendingMessage.sendAttempted = true;
        this.transport.send(pendingMessage.message);
    }
    getTransport() {
        return this.transport;
    }
    getPendingMessages() {
        return this.messageQueue.copyAll();
    }
    clearPendingMessages() {
        return this.messageQueue.clear();
    }
    finish() {
        const transport = this.transport;
        this.onceIdle(function () {
            transport.disconnect();
        });
    }
}
exports["default"] = Protocol;


/***/ }),

/***/ 9856:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(7582);
const protocolmessagecommon_1 = __webpack_require__(3507);
const protocolmessage_1 = __webpack_require__(8294);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const eventemitter_1 = tslib_1.__importDefault(__webpack_require__(3388));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const connectionerrors_1 = tslib_1.__importDefault(__webpack_require__(836));
const errorinfo_1 = tslib_1.__importDefault(__webpack_require__(1798));
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
const closeMessage = (0, protocolmessage_1.fromValues)({ action: protocolmessagecommon_1.actions.CLOSE });
const disconnectMessage = (0, protocolmessage_1.fromValues)({ action: protocolmessagecommon_1.actions.DISCONNECT });
/*
 * Transport instances inherit from EventEmitter and emit the following events:
 *
 * event name       data
 * closed           error
 * failed           error
 * disposed
 * connected        null error, connectionSerial, connectionId, connectionDetails
 * event            channel message object
 */
class Transport extends eventemitter_1.default {
    constructor(connectionManager, auth, params, forceJsonProtocol) {
        super(connectionManager.logger);
        if (forceJsonProtocol) {
            params.format = undefined;
            params.heartbeats = true;
        }
        this.connectionManager = connectionManager;
        this.auth = auth;
        this.params = params;
        this.timeouts = params.options.timeouts;
        this.format = params.format;
        this.isConnected = false;
        this.isFinished = false;
        this.isDisposed = false;
        this.maxIdleInterval = null;
        this.idleTimer = null;
        this.lastActivity = null;
    }
    connect() { }
    close() {
        if (this.isConnected) {
            this.requestClose();
        }
        this.finish('closed', connectionerrors_1.default.closed());
    }
    disconnect(err) {
        /* Used for network/transport issues that need to result in the transport
         * being disconnected, but should not transition the connection to 'failed' */
        if (this.isConnected) {
            this.requestDisconnect();
        }
        this.finish('disconnected', err || connectionerrors_1.default.disconnected());
    }
    fail(err) {
        /* Used for client-side-detected fatal connection issues */
        if (this.isConnected) {
            this.requestDisconnect();
        }
        this.finish('failed', err || connectionerrors_1.default.failed());
    }
    finish(event, err) {
        var _a;
        if (this.isFinished) {
            return;
        }
        this.isFinished = true;
        this.isConnected = false;
        this.maxIdleInterval = null;
        clearTimeout((_a = this.idleTimer) !== null && _a !== void 0 ? _a : undefined);
        this.idleTimer = null;
        this.emit(event, err);
        this.dispose();
    }
    onProtocolMessage(message) {
        if (this.logger.shouldLog(logger_1.default.LOG_MICRO)) {
            logger_1.default.logActionNoStrip(this.logger, logger_1.default.LOG_MICRO, 'Transport.onProtocolMessage()', 'received on ' +
                this.shortName +
                ': ' +
                (0, protocolmessage_1.stringify)(message, this.connectionManager.realtime._RealtimePresence, this.connectionManager.realtime._Annotations) +
                '; connectionId = ' +
                this.connectionManager.connectionId);
        }
        this.onActivity();
        switch (message.action) {
            case protocolmessagecommon_1.actions.HEARTBEAT:
                logger_1.default.logActionNoStrip(this.logger, logger_1.default.LOG_MICRO, 'Transport.onProtocolMessage()', this.shortName + ' heartbeat; connectionId = ' + this.connectionManager.connectionId);
                this.emit('heartbeat', message.id);
                break;
            case protocolmessagecommon_1.actions.CONNECTED:
                this.onConnect(message);
                this.emit('connected', message.error, message.connectionId, message.connectionDetails, message);
                break;
            case protocolmessagecommon_1.actions.CLOSED:
                this.onClose(message);
                break;
            case protocolmessagecommon_1.actions.DISCONNECTED:
                this.onDisconnect(message);
                break;
            case protocolmessagecommon_1.actions.ACK:
                this.emit('ack', message.msgSerial, message.count);
                break;
            case protocolmessagecommon_1.actions.NACK:
                this.emit('nack', message.msgSerial, message.count, message.error);
                break;
            case protocolmessagecommon_1.actions.SYNC:
                this.connectionManager.onChannelMessage(message, this);
                break;
            case protocolmessagecommon_1.actions.ACTIVATE:
                // Ignored.
                break;
            case protocolmessagecommon_1.actions.AUTH:
                Utils.whenPromiseSettles(this.auth.authorize(), (err) => {
                    if (err) {
                        logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'Transport.onProtocolMessage()', 'Ably requested re-authentication, but unable to obtain a new token: ' + Utils.inspectError(err));
                    }
                });
                break;
            case protocolmessagecommon_1.actions.ERROR:
                logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'Transport.onProtocolMessage()', 'received error action; connectionId = ' +
                    this.connectionManager.connectionId +
                    '; err = ' +
                    platform_1.default.Config.inspect(message.error) +
                    (message.channel ? ', channel: ' + message.channel : ''));
                if (message.channel === undefined) {
                    this.onFatalError(message);
                    break;
                }
                /* otherwise it's a channel-specific error, so handle it in the channel */
                this.connectionManager.onChannelMessage(message, this);
                break;
            default:
                /* all other actions are channel-specific */
                this.connectionManager.onChannelMessage(message, this);
        }
    }
    onConnect(message) {
        this.isConnected = true;
        if (!message.connectionDetails) {
            throw new Error('Transport.onConnect(): Connect message recieved without connectionDetails');
        }
        const maxPromisedIdle = message.connectionDetails.maxIdleInterval;
        if (maxPromisedIdle) {
            this.maxIdleInterval = maxPromisedIdle + this.timeouts.realtimeRequestTimeout;
            this.onActivity();
        }
        /* else Realtime declines to guarantee any maximum idle interval - CD2h */
    }
    onDisconnect(message) {
        /* Used for when the server has disconnected the client (usually with a
         * DISCONNECTED action) */
        const err = message && message.error;
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'Transport.onDisconnect()', 'err = ' + Utils.inspectError(err));
        this.finish('disconnected', err);
    }
    onFatalError(message) {
        /* On receipt of a fatal connection error, we can assume that the server
         * will close the connection and the transport, and do not need to request
         * a disconnection - RTN15i */
        const err = message && message.error;
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'Transport.onFatalError()', 'err = ' + Utils.inspectError(err));
        this.finish('failed', err);
    }
    onClose(message) {
        const err = message && message.error;
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'Transport.onClose()', 'err = ' + Utils.inspectError(err));
        this.finish('closed', err);
    }
    requestClose() {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'Transport.requestClose()', '');
        this.send(closeMessage);
    }
    requestDisconnect() {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'Transport.requestDisconnect()', '');
        this.send(disconnectMessage);
    }
    ping(id) {
        const msg = { action: protocolmessagecommon_1.actions.HEARTBEAT };
        if (id)
            msg.id = id;
        this.send((0, protocolmessage_1.fromValues)(msg));
    }
    dispose() {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'Transport.dispose()', '');
        this.isDisposed = true;
        this.off();
    }
    onActivity() {
        if (!this.maxIdleInterval) {
            return;
        }
        this.lastActivity = this.connectionManager.lastActivity = Date.now();
        this.setIdleTimer(this.maxIdleInterval + 100);
    }
    setIdleTimer(timeout) {
        if (!this.idleTimer) {
            this.idleTimer = setTimeout(() => {
                this.onIdleTimerExpire();
            }, timeout);
        }
    }
    onIdleTimerExpire() {
        if (!this.lastActivity || !this.maxIdleInterval) {
            throw new Error('Transport.onIdleTimerExpire(): lastActivity/maxIdleInterval not set');
        }
        this.idleTimer = null;
        const sinceLast = Date.now() - this.lastActivity;
        const timeRemaining = this.maxIdleInterval - sinceLast;
        if (timeRemaining <= 0) {
            const msg = 'No activity seen from realtime in ' + sinceLast + 'ms; assuming connection has dropped';
            logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'Transport.onIdleTimerExpire()', msg);
            this.disconnect(new errorinfo_1.default(msg, 80003, 408));
        }
        else {
            this.setIdleTimer(timeRemaining + 100);
        }
    }
    static tryConnect(transportCtor, connectionManager, auth, transportParams, callback) {
        const transport = new transportCtor(connectionManager, auth, transportParams);
        let transportAttemptTimer;
        const errorCb = function (err) {
            clearTimeout(transportAttemptTimer);
            callback({ event: this.event, error: err });
        };
        const realtimeRequestTimeout = connectionManager.options.timeouts.realtimeRequestTimeout;
        transportAttemptTimer = setTimeout(() => {
            transport.off(['preconnect', 'disconnected', 'failed']);
            transport.dispose();
            errorCb.call({ event: 'disconnected' }, new errorinfo_1.default('Timeout waiting for transport to indicate itself viable', 50000, 500));
        }, realtimeRequestTimeout);
        transport.on(['failed', 'disconnected'], errorCb);
        transport.on('preconnect', function () {
            logger_1.default.logAction(connectionManager.logger, logger_1.default.LOG_MINOR, 'Transport.tryConnect()', 'viable transport ' + transport);
            clearTimeout(transportAttemptTimer);
            transport.off(['failed', 'disconnected'], errorCb);
            callback(null, transport);
        });
        transport.connect();
        return transport;
    }
    static isAvailable() {
        throw new errorinfo_1.default('isAvailable not implemented for transport', 50000, 500);
    }
}
exports["default"] = Transport;


/***/ }),

/***/ 2346:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(7582);
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const transport_1 = tslib_1.__importDefault(__webpack_require__(9856));
const defaults_1 = tslib_1.__importDefault(__webpack_require__(3925));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const protocolmessage_1 = __webpack_require__(8294);
const errorinfo_1 = tslib_1.__importDefault(__webpack_require__(1798));
const TransportName_1 = __webpack_require__(1228);
const shortName = TransportName_1.TransportNames.WebSocket;
function isNodeWebSocket(ws) {
    return !!ws.on;
}
class WebSocketTransport extends transport_1.default {
    constructor(connectionManager, auth, params) {
        super(connectionManager, auth, params);
        this.shortName = shortName;
        /* If is a browser, can't detect pings, so request protocol heartbeats */
        params.heartbeats = platform_1.default.Config.useProtocolHeartbeats;
        this.wsHost = params.host;
    }
    static isAvailable() {
        return !!platform_1.default.Config.WebSocket;
    }
    createWebSocket(uri, connectParams) {
        this.uri = uri + Utils.toQueryString(connectParams);
        return new platform_1.default.Config.WebSocket(this.uri);
    }
    toString() {
        return 'WebSocketTransport; uri=' + this.uri;
    }
    connect() {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'WebSocketTransport.connect()', 'starting');
        transport_1.default.prototype.connect.call(this);
        const self = this, params = this.params, options = params.options;
        const wsScheme = options.tls ? 'wss://' : 'ws://';
        const wsUri = wsScheme + this.wsHost + ':' + defaults_1.default.getPort(options) + '/';
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'WebSocketTransport.connect()', 'uri: ' + wsUri);
        Utils.whenPromiseSettles(this.auth.getAuthParams(), function (err, authParams) {
            if (self.isDisposed) {
                return;
            }
            let paramStr = '';
            for (const param in authParams)
                paramStr += ' ' + param + ': ' + authParams[param] + ';';
            logger_1.default.logAction(self.logger, logger_1.default.LOG_MINOR, 'WebSocketTransport.connect()', 'authParams:' + paramStr + ' err: ' + err);
            if (err) {
                self.disconnect(err);
                return;
            }
            const connectParams = params.getConnectParams(authParams);
            try {
                const wsConnection = (self.wsConnection = self.createWebSocket(wsUri, connectParams));
                wsConnection.binaryType = platform_1.default.Config.binaryType;
                wsConnection.onopen = function () {
                    self.onWsOpen();
                };
                wsConnection.onclose = function (ev) {
                    self.onWsClose(ev);
                };
                wsConnection.onmessage = function (ev) {
                    self.onWsData(ev.data);
                };
                wsConnection.onerror = function (ev) {
                    self.onWsError(ev);
                };
                if (isNodeWebSocket(wsConnection)) {
                    /* node; browsers currently don't have a general eventemitter and can't detect
                     * pings. Also, no need to reply with a pong explicitly, ws lib handles that */
                    wsConnection.on('ping', function () {
                        self.onActivity();
                    });
                }
            }
            catch (e) {
                logger_1.default.logAction(self.logger, logger_1.default.LOG_ERROR, 'WebSocketTransport.connect()', 'Unexpected exception creating websocket: err = ' + (e.stack || e.message));
                self.disconnect(e);
            }
        });
    }
    send(message) {
        const wsConnection = this.wsConnection;
        if (!wsConnection) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'WebSocketTransport.send()', 'No socket connection');
            return;
        }
        try {
            wsConnection.send((0, protocolmessage_1.serialize)(message, this.connectionManager.realtime._MsgPack, this.params.format));
        }
        catch (e) {
            const msg = 'Exception from ws connection when trying to send: ' + Utils.inspectError(e);
            logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'WebSocketTransport.send()', msg);
            /* Don't try to request a disconnect, that'll just involve sending data
             * down the websocket again. Just finish the transport. */
            this.finish('disconnected', new errorinfo_1.default(msg, 50000, 500));
        }
    }
    onWsData(data) {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'WebSocketTransport.onWsData()', 'data received; length = ' + data.length + '; type = ' + typeof data);
        try {
            this.onProtocolMessage((0, protocolmessage_1.deserialize)(data, this.connectionManager.realtime._MsgPack, this.connectionManager.realtime._RealtimePresence, this.connectionManager.realtime._Annotations, this.format));
        }
        catch (e) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'WebSocketTransport.onWsData()', 'Unexpected exception handing channel message: ' + e.stack);
        }
    }
    onWsOpen() {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'WebSocketTransport.onWsOpen()', 'opened WebSocket');
        this.emit('preconnect');
    }
    onWsClose(ev) {
        let wasClean, code;
        if (typeof ev == 'object') {
            /* W3C spec-compatible */
            code = ev.code;
            // ev.wasClean is undefined in reactnative
            wasClean = ev.wasClean || code === 1000;
        } /*if(typeof(ev) == 'number')*/
        else {
            /* ws in node */
            code = ev;
            wasClean = code == 1000;
        }
        delete this.wsConnection;
        if (wasClean) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'WebSocketTransport.onWsClose()', 'Cleanly closed WebSocket');
            const err = new errorinfo_1.default('Websocket closed', 80003, 400);
            this.finish('disconnected', err);
        }
        else {
            const msg = 'Unclean disconnection of WebSocket ; code = ' + code, err = new errorinfo_1.default(msg, 80003, 400);
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'WebSocketTransport.onWsClose()', msg);
            this.finish('disconnected', err);
        }
        this.emit('disposed');
    }
    onWsError(err) {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'WebSocketTransport.onError()', 'Error from WebSocket: ' + err.message);
        /* Wait a tick before aborting: if the websocket was connected, this event
         * will be immediately followed by an onclose event with a close code. Allow
         * that to close it (so we see the close code) rather than anticipating it */
        platform_1.default.Config.nextTick(() => {
            this.disconnect(Error(err.message));
        });
    }
    dispose() {
        logger_1.default.logAction(this.logger, logger_1.default.LOG_MINOR, 'WebSocketTransport.dispose()', '');
        this.isDisposed = true;
        const wsConnection = this.wsConnection;
        if (wsConnection) {
            /* Ignore any messages that come through after dispose() is called but before
             * websocket is actually closed. (mostly would be harmless, but if it's a
             * CONNECTED, it'll re-tick isConnected and cause all sorts of havoc) */
            wsConnection.onmessage = function () { };
            delete this.wsConnection;
            /* defer until the next event loop cycle before closing the socket,
             * giving some implementations the opportunity to send any outstanding close message */
            platform_1.default.Config.nextTick(() => {
                logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'WebSocketTransport.dispose()', 'closing websocket');
                if (!wsConnection) {
                    throw new Error('WebSocketTransport.dispose(): wsConnection is not defined');
                }
                wsConnection.close();
            });
        }
    }
}
exports["default"] = WebSocketTransport;


/***/ }),

/***/ 9327:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WireAnnotation = exports.fromValues = exports._fromEncodedArray = exports._fromEncoded = exports.fromEncodedArray = exports.fromEncoded = void 0;
const tslib_1 = __webpack_require__(7582);
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const basemessage_1 = __webpack_require__(1976);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const actions = ['annotation.create', 'annotation.delete'];
async function fromEncoded(logger, encoded, options) {
    const wa = WireAnnotation.fromValues(encoded);
    return wa.decode(options || {}, logger);
}
exports.fromEncoded = fromEncoded;
async function fromEncodedArray(logger, encodedArray, options) {
    return Promise.all(encodedArray.map(function (encoded) {
        return fromEncoded(logger, encoded, options);
    }));
}
exports.fromEncodedArray = fromEncodedArray;
// these forms of the functions are used internally when we have a channel instance
// already, so don't need to normalise channel options
async function _fromEncoded(encoded, channel) {
    return WireAnnotation.fromValues(encoded).decode(channel.channelOptions, channel.logger);
}
exports._fromEncoded = _fromEncoded;
async function _fromEncodedArray(encodedArray, channel) {
    return Promise.all(encodedArray.map(function (encoded) {
        return _fromEncoded(encoded, channel);
    }));
}
exports._fromEncodedArray = _fromEncodedArray;
// for tree-shakability
function fromValues(values) {
    return Annotation.fromValues(values);
}
exports.fromValues = fromValues;
class Annotation extends basemessage_1.BaseMessage {
    async encode() {
        const res = Object.assign(new WireAnnotation(), this, {
            action: actions.indexOf(this.action || 'annotation.create'),
        });
        // note: we do not pass cipheroptions/channeloptions here as annotations are not
        // encrypted (as the data needs to be parsed by the server for summarisation)
        return (0, basemessage_1.encode)(res, {});
    }
    static fromValues(values) {
        return Object.assign(new Annotation(), values);
    }
    static fromValuesArray(values) {
        return values.map((v) => Annotation.fromValues(v));
    }
    toString() {
        return (0, basemessage_1.strMsg)(this, 'Annotation');
    }
}
class WireAnnotation extends basemessage_1.BaseMessage {
    toJSON(...args) {
        return basemessage_1.wireToJSON.call(this, ...args);
    }
    static fromValues(values) {
        return Object.assign(new WireAnnotation(), values);
    }
    static fromValuesArray(values) {
        return values.map((v) => WireAnnotation.fromValues(v));
    }
    async decode(channelOptions, logger) {
        const res = Object.assign(new Annotation(), Object.assign(Object.assign({}, this), { action: actions[this.action] }));
        try {
            await (0, basemessage_1.decode)(res, channelOptions);
        }
        catch (e) {
            logger_1.default.logAction(logger, logger_1.default.LOG_ERROR, 'WireAnnotation.decode()', Utils.inspectError(e));
        }
        return res;
    }
    toString() {
        return (0, basemessage_1.strMsg)(this, 'WireAnnotation');
    }
}
exports.WireAnnotation = WireAnnotation;
exports["default"] = Annotation;


/***/ }),

/***/ 1976:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BaseMessage = exports.strMsg = exports.populateFieldsFromParent = exports.wireToJSON = exports.decode = exports.encode = exports.normalizeCipherOptions = void 0;
const tslib_1 = __webpack_require__(7582);
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
const errorinfo_1 = tslib_1.__importDefault(__webpack_require__(1798));
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const protocolmessagecommon_1 = __webpack_require__(3507);
function normaliseContext(context) {
    if (!context || !context.channelOptions) {
        return {
            channelOptions: context,
            plugins: {},
            baseEncodedPreviousPayload: undefined,
        };
    }
    return context;
}
function normalizeCipherOptions(Crypto, logger, options) {
    if (options && options.cipher) {
        if (!Crypto)
            Utils.throwMissingPluginError('Crypto');
        const cipher = Crypto.getCipher(options.cipher, logger);
        return {
            cipher: cipher.cipherParams,
            channelCipher: cipher.cipher,
        };
    }
    return options !== null && options !== void 0 ? options : {};
}
exports.normalizeCipherOptions = normalizeCipherOptions;
async function encrypt(msg, options) {
    let data = msg.data, encoding = msg.encoding, cipher = options.channelCipher;
    encoding = encoding ? encoding + '/' : '';
    if (!platform_1.default.BufferUtils.isBuffer(data)) {
        data = platform_1.default.BufferUtils.utf8Encode(String(data));
        encoding = encoding + 'utf-8/';
    }
    const ciphertext = await cipher.encrypt(data);
    msg.data = ciphertext;
    msg.encoding = encoding + 'cipher+' + cipher.algorithm;
    return msg;
}
async function encode(msg, options) {
    const data = msg.data;
    const nativeDataType = typeof data == 'string' || platform_1.default.BufferUtils.isBuffer(data) || data === null || data === undefined;
    if (!nativeDataType) {
        if (Utils.isObject(data) || Array.isArray(data)) {
            msg.data = JSON.stringify(data);
            msg.encoding = msg.encoding ? msg.encoding + '/json' : 'json';
        }
        else {
            throw new errorinfo_1.default('Data type is unsupported', 40013, 400);
        }
    }
    if (options != null && options.cipher) {
        return encrypt(msg, options);
    }
    else {
        return msg;
    }
}
exports.encode = encode;
async function decode(message, inputContext) {
    const context = normaliseContext(inputContext);
    let lastPayload = message.data;
    const encoding = message.encoding;
    if (encoding) {
        const xforms = encoding.split('/');
        let lastProcessedEncodingIndex, encodingsToProcess = xforms.length, data = message.data;
        let xform = '';
        try {
            while ((lastProcessedEncodingIndex = encodingsToProcess) > 0) {
                // eslint-disable-next-line security/detect-unsafe-regex
                const match = xforms[--encodingsToProcess].match(/([-\w]+)(\+([\w-]+))?/);
                if (!match)
                    break;
                xform = match[1];
                switch (xform) {
                    case 'base64':
                        data = platform_1.default.BufferUtils.base64Decode(String(data));
                        if (lastProcessedEncodingIndex == xforms.length) {
                            lastPayload = data;
                        }
                        continue;
                    case 'utf-8':
                        data = platform_1.default.BufferUtils.utf8Decode(data);
                        continue;
                    case 'json':
                        data = JSON.parse(data);
                        continue;
                    case 'cipher':
                        if (context.channelOptions != null &&
                            context.channelOptions.cipher &&
                            context.channelOptions.channelCipher) {
                            const xformAlgorithm = match[3], cipher = context.channelOptions.channelCipher;
                            /* don't attempt to decrypt unless the cipher params are compatible */
                            if (xformAlgorithm != cipher.algorithm) {
                                throw new Error('Unable to decrypt message with given cipher; incompatible cipher params');
                            }
                            data = await cipher.decrypt(data);
                            continue;
                        }
                        else {
                            throw new Error('Unable to decrypt message; not an encrypted channel');
                        }
                    case 'vcdiff':
                        if (!context.plugins || !context.plugins.vcdiff) {
                            throw new errorinfo_1.default('Missing Vcdiff decoder (https://github.com/ably-forks/vcdiff-decoder)', 40019, 400);
                        }
                        if (typeof Uint8Array === 'undefined') {
                            throw new errorinfo_1.default('Delta decoding not supported on this browser (need ArrayBuffer & Uint8Array)', 40020, 400);
                        }
                        try {
                            let deltaBase = context.baseEncodedPreviousPayload;
                            if (typeof deltaBase === 'string') {
                                deltaBase = platform_1.default.BufferUtils.utf8Encode(deltaBase);
                            }
                            // vcdiff expects Uint8Arrays, can't copy with ArrayBuffers.
                            const deltaBaseBuffer = platform_1.default.BufferUtils.toBuffer(deltaBase);
                            data = platform_1.default.BufferUtils.toBuffer(data);
                            data = platform_1.default.BufferUtils.arrayBufferViewToBuffer(context.plugins.vcdiff.decode(data, deltaBaseBuffer));
                            lastPayload = data;
                        }
                        catch (e) {
                            throw new errorinfo_1.default('Vcdiff delta decode failed with ' + e, 40018, 400);
                        }
                        continue;
                    default:
                        throw new Error('Unknown encoding');
                }
            }
        }
        catch (e) {
            const err = e;
            throw new errorinfo_1.default('Error processing the ' + xform + ' encoding, decoder returned ‘' + err.message + '’', err.code || 40013, 400);
        }
        finally {
            message.encoding =
                lastProcessedEncodingIndex <= 0 ? null : xforms.slice(0, lastProcessedEncodingIndex).join('/');
            message.data = data;
        }
    }
    context.baseEncodedPreviousPayload = lastPayload;
}
exports.decode = decode;
function wireToJSON(...args) {
    /* encode data to base64 if present and we're returning real JSON;
     * although msgpack calls toJSON(), we know it is a stringify()
     * call if it has a non-empty arguments list */
    let encoding = this.encoding;
    let data = this.data;
    if (data && platform_1.default.BufferUtils.isBuffer(data)) {
        if (args.length > 0) {
            /* stringify call */
            encoding = encoding ? encoding + '/base64' : 'base64';
            data = platform_1.default.BufferUtils.base64Encode(data);
        }
        else {
            /* Called by msgpack. toBuffer returns a datatype understandable by
             * that platform's msgpack implementation (Buffer in node, Uint8Array
             * in browsers) */
            data = platform_1.default.BufferUtils.toBuffer(data);
        }
    }
    return Object.assign({}, this, { encoding, data });
}
exports.wireToJSON = wireToJSON;
// in-place, generally called on the protocol message before decoding
function populateFieldsFromParent(parent) {
    const { id, connectionId, timestamp } = parent;
    let msgs;
    switch (parent.action) {
        case protocolmessagecommon_1.actions.MESSAGE: {
            msgs = parent.messages;
            break;
        }
        case protocolmessagecommon_1.actions.PRESENCE:
        case protocolmessagecommon_1.actions.SYNC:
            msgs = parent.presence;
            break;
        case protocolmessagecommon_1.actions.ANNOTATION:
            msgs = parent.annotations;
            break;
        default:
            throw new errorinfo_1.default('Unexpected action ' + parent.action, 40000, 400);
    }
    for (let i = 0; i < msgs.length; i++) {
        const msg = msgs[i];
        if (!msg.connectionId) {
            msg.connectionId = connectionId;
        }
        if (!msg.timestamp) {
            msg.timestamp = timestamp;
        }
        if (id && !msg.id) {
            msg.id = id + ':' + i;
        }
    }
}
exports.populateFieldsFromParent = populateFieldsFromParent;
function strMsg(m, cls) {
    let result = '[' + cls;
    for (const attr in m) {
        if (attr === 'data') {
            if (typeof m.data == 'string') {
                result += '; data=' + m.data;
            }
            else if (platform_1.default.BufferUtils.isBuffer(m.data)) {
                result += '; data (buffer)=' + platform_1.default.BufferUtils.base64Encode(m.data);
            }
            else {
                result += '; data (json)=' + JSON.stringify(m.data);
            }
        }
        else if (attr && (attr === 'extras' || attr === 'operation')) {
            result += '; ' + attr + '=' + JSON.stringify(m[attr]);
        }
        else if (m[attr] !== undefined) {
            result += '; ' + attr + '=' + m[attr];
        }
    }
    result += ']';
    return result;
}
exports.strMsg = strMsg;
class BaseMessage {
}
exports.BaseMessage = BaseMessage;


/***/ }),

/***/ 1738:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DefaultAnnotation = void 0;
const tslib_1 = __webpack_require__(7582);
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const annotation_1 = tslib_1.__importStar(__webpack_require__(9327));
/**
 `DefaultAnnotation` is the class returned by `DefaultRest` and `DefaultRealtime`’s `Annotation` static property. It introduces the static methods described in the `AnnotationStatic` interface of the public API of the non tree-shakable version of the library.
 */
class DefaultAnnotation extends annotation_1.default {
    static async fromEncoded(encoded, inputOptions) {
        return (0, annotation_1.fromEncoded)(logger_1.default.defaultLogger, encoded, inputOptions);
    }
    static async fromEncodedArray(encodedArray, options) {
        return (0, annotation_1.fromEncodedArray)(logger_1.default.defaultLogger, encodedArray, options);
    }
    static fromValues(values) {
        return annotation_1.default.fromValues(values);
    }
}
exports.DefaultAnnotation = DefaultAnnotation;


/***/ }),

/***/ 1128:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DefaultMessage = void 0;
const tslib_1 = __webpack_require__(7582);
const message_1 = tslib_1.__importStar(__webpack_require__(3176));
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
/**
 `DefaultMessage` is the class returned by `DefaultRest` and `DefaultRealtime`’s `Message` static property. It introduces the static methods described in the `MessageStatic` interface of the public API of the non tree-shakable version of the library.
 */
class DefaultMessage extends message_1.default {
    static async fromEncoded(encoded, inputOptions) {
        return (0, message_1.fromEncoded)(logger_1.default.defaultLogger, platform_1.default.Crypto, encoded, inputOptions);
    }
    static async fromEncodedArray(encodedArray, options) {
        return (0, message_1.fromEncodedArray)(logger_1.default.defaultLogger, platform_1.default.Crypto, encodedArray, options);
    }
    static fromValues(values) {
        return message_1.default.fromValues(values);
    }
}
exports.DefaultMessage = DefaultMessage;


/***/ }),

/***/ 5321:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DefaultPresenceMessage = void 0;
const tslib_1 = __webpack_require__(7582);
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const presencemessage_1 = tslib_1.__importStar(__webpack_require__(4470));
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
/**
 `DefaultPresenceMessage` is the class returned by `DefaultRest` and `DefaultRealtime`’s `PresenceMessage` static property. It introduces the static methods described in the `PresenceMessageStatic` interface of the public API of the non tree-shakable version of the library.
 */
class DefaultPresenceMessage extends presencemessage_1.default {
    static async fromEncoded(encoded, inputOptions) {
        return (0, presencemessage_1.fromEncoded)(logger_1.default.defaultLogger, platform_1.default.Crypto, encoded, inputOptions);
    }
    static async fromEncodedArray(encodedArray, options) {
        return (0, presencemessage_1.fromEncodedArray)(logger_1.default.defaultLogger, platform_1.default.Crypto, encodedArray, options);
    }
    static fromValues(values) {
        return presencemessage_1.default.fromValues(values);
    }
}
exports.DefaultPresenceMessage = DefaultPresenceMessage;


/***/ }),

/***/ 7689:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DevicePlatform = exports.DeviceFormFactor = void 0;
const tslib_1 = __webpack_require__(7582);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const errorinfo_1 = tslib_1.__importDefault(__webpack_require__(1798));
var DeviceFormFactor;
(function (DeviceFormFactor) {
    DeviceFormFactor["Phone"] = "phone";
    DeviceFormFactor["Tablet"] = "tablet";
    DeviceFormFactor["Desktop"] = "desktop";
    DeviceFormFactor["TV"] = "tv";
    DeviceFormFactor["Watch"] = "watch";
    DeviceFormFactor["Car"] = "car";
    DeviceFormFactor["Embedded"] = "embedded";
    DeviceFormFactor["Other"] = "other";
})(DeviceFormFactor = exports.DeviceFormFactor || (exports.DeviceFormFactor = {}));
var DevicePlatform;
(function (DevicePlatform) {
    DevicePlatform["Android"] = "android";
    DevicePlatform["IOS"] = "ios";
    DevicePlatform["Browser"] = "browser";
})(DevicePlatform = exports.DevicePlatform || (exports.DevicePlatform = {}));
class DeviceDetails {
    toJSON() {
        var _a, _b, _c;
        return {
            id: this.id,
            deviceSecret: this.deviceSecret,
            platform: this.platform,
            formFactor: this.formFactor,
            clientId: this.clientId,
            metadata: this.metadata,
            deviceIdentityToken: this.deviceIdentityToken,
            push: {
                recipient: (_a = this.push) === null || _a === void 0 ? void 0 : _a.recipient,
                state: (_b = this.push) === null || _b === void 0 ? void 0 : _b.state,
                error: (_c = this.push) === null || _c === void 0 ? void 0 : _c.error,
            },
        };
    }
    toString() {
        var _a, _b, _c, _d;
        let result = '[DeviceDetails';
        if (this.id)
            result += '; id=' + this.id;
        if (this.platform)
            result += '; platform=' + this.platform;
        if (this.formFactor)
            result += '; formFactor=' + this.formFactor;
        if (this.clientId)
            result += '; clientId=' + this.clientId;
        if (this.metadata)
            result += '; metadata=' + this.metadata;
        if (this.deviceIdentityToken)
            result += '; deviceIdentityToken=' + JSON.stringify(this.deviceIdentityToken);
        if ((_a = this.push) === null || _a === void 0 ? void 0 : _a.recipient)
            result += '; push.recipient=' + JSON.stringify(this.push.recipient);
        if ((_b = this.push) === null || _b === void 0 ? void 0 : _b.state)
            result += '; push.state=' + this.push.state;
        if ((_c = this.push) === null || _c === void 0 ? void 0 : _c.error)
            result += '; push.error=' + JSON.stringify(this.push.error);
        if ((_d = this.push) === null || _d === void 0 ? void 0 : _d.metadata)
            result += '; push.metadata=' + this.push.metadata;
        result += ']';
        return result;
    }
    static toRequestBody(body, MsgPack, format) {
        return Utils.encodeBody(body, MsgPack, format);
    }
    static fromResponseBody(body, MsgPack, format) {
        if (format) {
            body = Utils.decodeBody(body, MsgPack, format);
        }
        if (Array.isArray(body)) {
            return DeviceDetails.fromValuesArray(body);
        }
        else {
            return DeviceDetails.fromValues(body);
        }
    }
    static fromValues(values) {
        values.error = values.error && errorinfo_1.default.fromValues(values.error);
        return Object.assign(new DeviceDetails(), values);
    }
    static fromLocalDevice(device) {
        return Object.assign(new DeviceDetails(), device);
    }
    static fromValuesArray(values) {
        const count = values.length, result = new Array(count);
        for (let i = 0; i < count; i++)
            result[i] = DeviceDetails.fromValues(values[i]);
        return result;
    }
}
exports["default"] = DeviceDetails;


/***/ }),

/***/ 1798:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PartialErrorInfo = void 0;
const tslib_1 = __webpack_require__(7582);
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
const Utils = tslib_1.__importStar(__webpack_require__(2678));
function toString(err) {
    let result = '[' + err.constructor.name;
    if (err.message)
        result += ': ' + err.message;
    if (err.statusCode)
        result += '; statusCode=' + err.statusCode;
    if (err.code)
        result += '; code=' + err.code;
    if (err.cause)
        result += '; cause=' + Utils.inspectError(err.cause);
    if (err.href && !(err.message && err.message.indexOf('help.ably.io') > -1))
        result += '; see ' + err.href + ' ';
    result += ']';
    return result;
}
class ErrorInfo extends Error {
    constructor(message, code, statusCode, cause) {
        super(message);
        if (typeof Object.setPrototypeOf !== 'undefined') {
            Object.setPrototypeOf(this, ErrorInfo.prototype);
        }
        this.code = code;
        this.statusCode = statusCode;
        this.cause = cause;
    }
    toString() {
        return toString(this);
    }
    static fromValues(values) {
        const { message, code, statusCode } = values;
        if (typeof message !== 'string' || typeof code !== 'number' || typeof statusCode !== 'number') {
            throw new Error('ErrorInfo.fromValues(): invalid values: ' + platform_1.default.Config.inspect(values));
        }
        const result = Object.assign(new ErrorInfo(message, code, statusCode), values);
        if (result.code && !result.href) {
            result.href = 'https://help.ably.io/error/' + result.code;
        }
        return result;
    }
}
exports["default"] = ErrorInfo;
class PartialErrorInfo extends Error {
    constructor(message, code, statusCode, cause) {
        super(message);
        if (typeof Object.setPrototypeOf !== 'undefined') {
            Object.setPrototypeOf(this, PartialErrorInfo.prototype);
        }
        this.code = code;
        this.statusCode = statusCode;
        this.cause = cause;
    }
    toString() {
        return toString(this);
    }
    static fromValues(values) {
        const { message, code, statusCode } = values;
        if (typeof message !== 'string' ||
            (!Utils.isNil(code) && typeof code !== 'number') ||
            (!Utils.isNil(statusCode) && typeof statusCode !== 'number')) {
            throw new Error('PartialErrorInfo.fromValues(): invalid values: ' + platform_1.default.Config.inspect(values));
        }
        const result = Object.assign(new PartialErrorInfo(message, code, statusCode), values);
        if (result.code && !result.href) {
            result.href = 'https://help.ably.io/error/' + result.code;
        }
        return result;
    }
}
exports.PartialErrorInfo = PartialErrorInfo;


/***/ }),

/***/ 3176:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WireMessage = exports.getMessagesSize = exports.serialize = exports.encodeArray = exports._fromEncodedArray = exports._fromEncoded = exports.fromEncodedArray = exports.fromEncoded = void 0;
const tslib_1 = __webpack_require__(7582);
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const basemessage_1 = __webpack_require__(1976);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const actions = [
    'message.create',
    'message.update',
    'message.delete',
    'meta.occupancy',
    'message.summary',
];
function stringifyAction(action) {
    return actions[action || 0] || 'unknown';
}
function getMessageSize(msg) {
    let size = 0;
    if (msg.name) {
        size += msg.name.length;
    }
    if (msg.clientId) {
        size += msg.clientId.length;
    }
    if (msg.extras) {
        size += JSON.stringify(msg.extras).length;
    }
    if (msg.data) {
        size += Utils.dataSizeBytes(msg.data);
    }
    return size;
}
async function fromEncoded(logger, Crypto, encoded, inputOptions) {
    const options = (0, basemessage_1.normalizeCipherOptions)(Crypto, logger, inputOptions !== null && inputOptions !== void 0 ? inputOptions : null);
    const wm = WireMessage.fromValues(encoded);
    return wm.decode(options, logger);
}
exports.fromEncoded = fromEncoded;
async function fromEncodedArray(logger, Crypto, encodedArray, options) {
    return Promise.all(encodedArray.map(function (encoded) {
        return fromEncoded(logger, Crypto, encoded, options);
    }));
}
exports.fromEncodedArray = fromEncodedArray;
// these forms of the functions are used internally when we have a channel instance
// already, so don't need to normalise channel options
async function _fromEncoded(encoded, channel) {
    const wm = WireMessage.fromValues(encoded);
    return wm.decode(channel.channelOptions, channel.logger);
}
exports._fromEncoded = _fromEncoded;
async function _fromEncodedArray(encodedArray, channel) {
    return Promise.all(encodedArray.map(function (encoded) {
        return _fromEncoded(encoded, channel);
    }));
}
exports._fromEncodedArray = _fromEncodedArray;
async function encodeArray(messages, options) {
    return Promise.all(messages.map((message) => message.encode(options)));
}
exports.encodeArray = encodeArray;
exports.serialize = Utils.encodeBody;
/* This should be called on encode()d (and encrypt()d) Messages (as it
 * assumes the data is a string or buffer) */
function getMessagesSize(messages) {
    let msg, total = 0;
    for (let i = 0; i < messages.length; i++) {
        msg = messages[i];
        total += msg.size || (msg.size = getMessageSize(msg));
    }
    return total;
}
exports.getMessagesSize = getMessagesSize;
class Message extends basemessage_1.BaseMessage {
    expandFields() {
        if (this.action === 'message.create') {
            // TM2k
            if (this.version && !this.serial) {
                this.serial = this.version;
            }
            // TM2o
            if (this.timestamp && !this.createdAt) {
                this.createdAt = this.timestamp;
            }
        }
    }
    async encode(options) {
        const res = Object.assign(new WireMessage(), this, {
            action: actions.indexOf(this.action || 'message.create'),
        });
        return (0, basemessage_1.encode)(res, options);
    }
    static fromValues(values) {
        return Object.assign(new Message(), values);
    }
    static fromValuesArray(values) {
        return values.map((v) => Message.fromValues(v));
    }
    toString() {
        return (0, basemessage_1.strMsg)(this, 'Message');
    }
}
class WireMessage extends basemessage_1.BaseMessage {
    // Overload toJSON() to intercept JSON.stringify()
    toJSON(...args) {
        return basemessage_1.wireToJSON.call(this, ...args);
    }
    static fromValues(values) {
        return Object.assign(new WireMessage(), values);
    }
    static fromValuesArray(values) {
        return values.map((v) => WireMessage.fromValues(v));
    }
    // for contexts where some decoding errors need to be handled specially by the caller
    async decodeWithErr(inputContext, logger) {
        const res = Object.assign(new Message(), Object.assign(Object.assign({}, this), { action: stringifyAction(this.action) }));
        let err;
        try {
            await (0, basemessage_1.decode)(res, inputContext);
        }
        catch (e) {
            logger_1.default.logAction(logger, logger_1.default.LOG_ERROR, 'WireMessage.decode()', Utils.inspectError(e));
            err = e;
        }
        res.expandFields();
        return { decoded: res, err: err };
    }
    async decode(inputContext, logger) {
        const { decoded } = await this.decodeWithErr(inputContext, logger);
        return decoded;
    }
    toString() {
        return (0, basemessage_1.strMsg)(this, 'WireMessage');
    }
}
exports.WireMessage = WireMessage;
exports["default"] = Message;


/***/ }),

/***/ 4470:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WirePresenceMessage = exports.fromValues = exports._fromEncodedArray = exports._fromEncoded = exports.fromEncodedArray = exports.fromEncoded = void 0;
const tslib_1 = __webpack_require__(7582);
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const basemessage_1 = __webpack_require__(1976);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const actions = ['absent', 'present', 'enter', 'leave', 'update'];
async function fromEncoded(logger, Crypto, encoded, inputOptions) {
    const options = (0, basemessage_1.normalizeCipherOptions)(Crypto, logger, inputOptions !== null && inputOptions !== void 0 ? inputOptions : null);
    const wpm = WirePresenceMessage.fromValues(encoded);
    return wpm.decode(options, logger);
}
exports.fromEncoded = fromEncoded;
async function fromEncodedArray(logger, Crypto, encodedArray, options) {
    return Promise.all(encodedArray.map(function (encoded) {
        return fromEncoded(logger, Crypto, encoded, options);
    }));
}
exports.fromEncodedArray = fromEncodedArray;
// these forms of the functions are used internally when we have a channel instance
// already, so don't need to normalise channel options
async function _fromEncoded(encoded, channel) {
    return WirePresenceMessage.fromValues(encoded).decode(channel.channelOptions, channel.logger);
}
exports._fromEncoded = _fromEncoded;
async function _fromEncodedArray(encodedArray, channel) {
    return Promise.all(encodedArray.map(function (encoded) {
        return _fromEncoded(encoded, channel);
    }));
}
exports._fromEncodedArray = _fromEncodedArray;
// for tree-shakability
function fromValues(values) {
    return PresenceMessage.fromValues(values);
}
exports.fromValues = fromValues;
class PresenceMessage extends basemessage_1.BaseMessage {
    /* Returns whether this presenceMessage is synthesized, i.e. was not actually
     * sent by the connection (usually means a leave event sent 15s after a
     * disconnection). This is useful because synthesized messages cannot be
     * compared for newness by id lexicographically - RTP2b1
     */
    isSynthesized() {
        if (!this.id || !this.connectionId) {
            return true;
        }
        return this.id.substring(this.connectionId.length, 0) !== this.connectionId;
    }
    /* RTP2b2 */
    parseId() {
        if (!this.id)
            throw new Error('parseId(): Presence message does not contain an id');
        const parts = this.id.split(':');
        return {
            connectionId: parts[0],
            msgSerial: parseInt(parts[1], 10),
            index: parseInt(parts[2], 10),
        };
    }
    async encode(options) {
        const res = Object.assign(new WirePresenceMessage(), this, {
            action: actions.indexOf(this.action || 'present'),
        });
        return (0, basemessage_1.encode)(res, options);
    }
    static fromValues(values) {
        return Object.assign(new PresenceMessage(), values);
    }
    static fromValuesArray(values) {
        return values.map((v) => PresenceMessage.fromValues(v));
    }
    static fromData(data) {
        if (data instanceof PresenceMessage) {
            return data;
        }
        return PresenceMessage.fromValues({
            data,
        });
    }
    toString() {
        return (0, basemessage_1.strMsg)(this, 'PresenceMessage');
    }
}
class WirePresenceMessage extends basemessage_1.BaseMessage {
    toJSON(...args) {
        return basemessage_1.wireToJSON.call(this, ...args);
    }
    static fromValues(values) {
        return Object.assign(new WirePresenceMessage(), values);
    }
    static fromValuesArray(values) {
        return values.map((v) => WirePresenceMessage.fromValues(v));
    }
    async decode(channelOptions, logger) {
        const res = Object.assign(new PresenceMessage(), Object.assign(Object.assign({}, this), { action: actions[this.action] }));
        try {
            await (0, basemessage_1.decode)(res, channelOptions);
        }
        catch (e) {
            logger_1.default.logAction(logger, logger_1.default.LOG_ERROR, 'WirePresenceMessage.decode()', Utils.inspectError(e));
        }
        return res;
    }
    toString() {
        return (0, basemessage_1.strMsg)(this, 'WirePresenceMessage');
    }
}
exports.WirePresenceMessage = WirePresenceMessage;
exports["default"] = PresenceMessage;


/***/ }),

/***/ 8294:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.stringify = exports.fromValues = exports.fromDeserializedIncludingDependencies = exports.fromDeserialized = exports.deserialize = exports.serialize = void 0;
const tslib_1 = __webpack_require__(7582);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const errorinfo_1 = tslib_1.__importDefault(__webpack_require__(1798));
const message_1 = __webpack_require__(3176);
const presencemessage_1 = tslib_1.__importStar(__webpack_require__(4470));
const annotation_1 = tslib_1.__importStar(__webpack_require__(9327));
const realtimeannotations_1 = tslib_1.__importDefault(__webpack_require__(6810));
const restannotations_1 = tslib_1.__importDefault(__webpack_require__(1560));
const protocolmessagecommon_1 = __webpack_require__(3507);
exports.serialize = Utils.encodeBody;
function toStringArray(array) {
    const result = [];
    if (array) {
        for (let i = 0; i < array.length; i++) {
            result.push(array[i].toString());
        }
    }
    return '[ ' + result.join(', ') + ' ]';
}
function deserialize(serialized, MsgPack, presenceMessagePlugin, annotationsPlugin, format) {
    const deserialized = Utils.decodeBody(serialized, MsgPack, format);
    return fromDeserialized(deserialized, presenceMessagePlugin, annotationsPlugin);
}
exports.deserialize = deserialize;
function fromDeserialized(deserialized, presenceMessagePlugin, annotationsPlugin) {
    let error;
    if (deserialized.error) {
        error = errorinfo_1.default.fromValues(deserialized.error);
    }
    let messages;
    if (deserialized.messages) {
        messages = message_1.WireMessage.fromValuesArray(deserialized.messages);
    }
    let presence;
    if (presenceMessagePlugin && deserialized.presence) {
        presence = presenceMessagePlugin.WirePresenceMessage.fromValuesArray(deserialized.presence);
    }
    let annotations;
    if (annotationsPlugin && deserialized.annotations) {
        annotations = annotationsPlugin.WireAnnotation.fromValuesArray(deserialized.annotations);
    }
    return Object.assign(new ProtocolMessage(), Object.assign(Object.assign({}, deserialized), { presence, messages, annotations, error }));
}
exports.fromDeserialized = fromDeserialized;
/**
 * Used by the tests.
 */
function fromDeserializedIncludingDependencies(deserialized) {
    return fromDeserialized(deserialized, { PresenceMessage: presencemessage_1.default, WirePresenceMessage: presencemessage_1.WirePresenceMessage }, { Annotation: annotation_1.default, WireAnnotation: annotation_1.WireAnnotation, RealtimeAnnotations: realtimeannotations_1.default, RestAnnotations: restannotations_1.default });
}
exports.fromDeserializedIncludingDependencies = fromDeserializedIncludingDependencies;
function fromValues(values) {
    return Object.assign(new ProtocolMessage(), values);
}
exports.fromValues = fromValues;
function stringify(msg, presenceMessagePlugin, annotationsPlugin) {
    let result = '[ProtocolMessage';
    if (msg.action !== undefined)
        result += '; action=' + protocolmessagecommon_1.ActionName[msg.action] || 0;
    const simpleAttributes = ['id', 'channel', 'channelSerial', 'connectionId', 'count', 'msgSerial', 'timestamp'];
    let attribute;
    for (let attribIndex = 0; attribIndex < simpleAttributes.length; attribIndex++) {
        attribute = simpleAttributes[attribIndex];
        if (msg[attribute] !== undefined)
            result += '; ' + attribute + '=' + msg[attribute];
    }
    if (msg.messages)
        result += '; messages=' + toStringArray(message_1.WireMessage.fromValuesArray(msg.messages));
    if (msg.presence && presenceMessagePlugin)
        result += '; presence=' + toStringArray(presenceMessagePlugin.WirePresenceMessage.fromValuesArray(msg.presence));
    if (msg.annotations && annotationsPlugin) {
        result += '; annotations=' + toStringArray(annotationsPlugin.WireAnnotation.fromValuesArray(msg.annotations));
    }
    if (msg.error)
        result += '; error=' + errorinfo_1.default.fromValues(msg.error).toString();
    if (msg.auth && msg.auth.accessToken)
        result += '; token=' + msg.auth.accessToken;
    if (msg.flags)
        result += '; flags=' + protocolmessagecommon_1.flagNames.filter(msg.hasFlag).join(',');
    if (msg.params) {
        let stringifiedParams = '';
        Utils.forInOwnNonNullProperties(msg.params, function (prop) {
            if (stringifiedParams.length > 0) {
                stringifiedParams += '; ';
            }
            stringifiedParams += prop + '=' + msg.params[prop];
        });
        if (stringifiedParams.length > 0) {
            result += '; params=[' + stringifiedParams + ']';
        }
    }
    result += ']';
    return result;
}
exports.stringify = stringify;
class ProtocolMessage {
    constructor() {
        this.hasFlag = (flag) => {
            return (this.flags & protocolmessagecommon_1.flags[flag]) > 0;
        };
    }
    setFlag(flag) {
        return (this.flags = this.flags | protocolmessagecommon_1.flags[flag]);
    }
    getMode() {
        return (this.flags || 0) & protocolmessagecommon_1.flags.MODE_ALL;
    }
    encodeModesToFlags(modes) {
        modes.forEach((mode) => this.setFlag(mode));
    }
    decodeModesFromFlags() {
        const modes = [];
        protocolmessagecommon_1.channelModes.forEach((mode) => {
            if (this.hasFlag(mode)) {
                modes.push(mode);
            }
        });
        return modes.length > 0 ? modes : undefined;
    }
}
exports["default"] = ProtocolMessage;


/***/ }),

/***/ 3507:
/***/ ((__unused_webpack_module, exports) => {


// constant definitions that can be imported by anyone without worrying about circular
// deps
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.channelModes = exports.flagNames = exports.flags = exports.ActionName = exports.actions = void 0;
exports.actions = {
    HEARTBEAT: 0,
    ACK: 1,
    NACK: 2,
    CONNECT: 3,
    CONNECTED: 4,
    DISCONNECT: 5,
    DISCONNECTED: 6,
    CLOSE: 7,
    CLOSED: 8,
    ERROR: 9,
    ATTACH: 10,
    ATTACHED: 11,
    DETACH: 12,
    DETACHED: 13,
    PRESENCE: 14,
    MESSAGE: 15,
    SYNC: 16,
    AUTH: 17,
    ACTIVATE: 18,
    STATE: 19,
    STATE_SYNC: 20,
    ANNOTATION: 21,
};
exports.ActionName = [];
Object.keys(exports.actions).forEach(function (name) {
    exports.ActionName[exports.actions[name]] = name;
});
exports.flags = {
    /* Channel attach state flags */
    HAS_PRESENCE: 1 << 0,
    HAS_BACKLOG: 1 << 1,
    RESUMED: 1 << 2,
    TRANSIENT: 1 << 4,
    ATTACH_RESUME: 1 << 5,
    /* Channel mode flags */
    PRESENCE: 1 << 16,
    PUBLISH: 1 << 17,
    SUBSCRIBE: 1 << 18,
    PRESENCE_SUBSCRIBE: 1 << 19,
    ANNOTATION_PUBLISH: 1 << 21,
    ANNOTATION_SUBSCRIBE: 1 << 22,
};
exports.flagNames = Object.keys(exports.flags);
exports.flags.MODE_ALL =
    exports.flags.PRESENCE |
        exports.flags.PUBLISH |
        exports.flags.SUBSCRIBE |
        exports.flags.PRESENCE_SUBSCRIBE |
        exports.flags.ANNOTATION_PUBLISH |
        exports.flags.ANNOTATION_SUBSCRIBE;
exports.channelModes = [
    'PRESENCE',
    'PUBLISH',
    'SUBSCRIBE',
    'PRESENCE_SUBSCRIBE',
    'ANNOTATION_PUBLISH',
    'ANNOTATION_SUBSCRIBE',
];


/***/ }),

/***/ 8315:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(7582);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
class PushChannelSubscription {
    /**
     * Overload toJSON() to intercept JSON.stringify()
     * @return {*}
     */
    toJSON() {
        return {
            channel: this.channel,
            deviceId: this.deviceId,
            clientId: this.clientId,
        };
    }
    toString() {
        let result = '[PushChannelSubscription';
        if (this.channel)
            result += '; channel=' + this.channel;
        if (this.deviceId)
            result += '; deviceId=' + this.deviceId;
        if (this.clientId)
            result += '; clientId=' + this.clientId;
        result += ']';
        return result;
    }
    static fromResponseBody(body, MsgPack, format) {
        if (format) {
            body = Utils.decodeBody(body, MsgPack, format);
        }
        if (Array.isArray(body)) {
            return PushChannelSubscription.fromValuesArray(body);
        }
        else {
            return PushChannelSubscription.fromValues(body);
        }
    }
    static fromValues(values) {
        return Object.assign(new PushChannelSubscription(), values);
    }
    static fromValuesArray(values) {
        const count = values.length, result = new Array(count);
        for (let i = 0; i < count; i++)
            result[i] = PushChannelSubscription.fromValues(values[i]);
        return result;
    }
}
PushChannelSubscription.toRequestBody = Utils.encodeBody;
exports["default"] = PushChannelSubscription;


/***/ }),

/***/ 3276:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
class Stats {
    constructor(values) {
        this.entries = (values && values.entries) || undefined;
        this.schema = (values && values.schema) || undefined;
        this.appId = (values && values.appId) || undefined;
        this.inProgress = (values && values.inProgress) || undefined;
        this.unit = (values && values.unit) || undefined;
        this.intervalId = (values && values.intervalId) || undefined;
    }
    static fromValues(values) {
        return new Stats(values);
    }
}
exports["default"] = Stats;


/***/ }),

/***/ 3925:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getDefaults = exports.defaultPostHeaders = exports.defaultGetHeaders = exports.normaliseChannelOptions = exports.normaliseOptions = exports.objectifyOptions = exports.getAgentString = exports.getHosts = exports.getFallbackHosts = exports.environmentFallbackHosts = exports.getHttpScheme = exports.getPort = exports.getHost = void 0;
const tslib_1 = __webpack_require__(7582);
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const errorinfo_1 = tslib_1.__importDefault(__webpack_require__(1798));
const package_json_1 = __webpack_require__(4147);
let agent = 'ably-js/' + package_json_1.version;
const Defaults = {
    ENVIRONMENT: '',
    REST_HOST: 'rest.ably.io',
    REALTIME_HOST: 'realtime.ably.io',
    FALLBACK_HOSTS: [
        'A.ably-realtime.com',
        'B.ably-realtime.com',
        'C.ably-realtime.com',
        'D.ably-realtime.com',
        'E.ably-realtime.com',
    ],
    PORT: 80,
    TLS_PORT: 443,
    TIMEOUTS: {
        /* Documented as options params: */
        disconnectedRetryTimeout: 15000,
        suspendedRetryTimeout: 30000,
        /* Undocumented, but part of the api and can be used by customers: */
        httpRequestTimeout: 10000,
        httpMaxRetryDuration: 15000,
        channelRetryTimeout: 15000,
        fallbackRetryTimeout: 600000,
        /* For internal / test use only: */
        connectionStateTtl: 120000,
        realtimeRequestTimeout: 10000,
        recvTimeout: 90000,
        webSocketConnectTimeout: 10000,
        webSocketSlowTimeout: 4000,
    },
    httpMaxRetryCount: 3,
    maxMessageSize: 65536,
    version: package_json_1.version,
    protocolVersion: 3,
    agent,
    getHost,
    getPort,
    getHttpScheme,
    environmentFallbackHosts,
    getFallbackHosts,
    getHosts,
    checkHost,
    objectifyOptions,
    normaliseOptions,
    defaultGetHeaders,
    defaultPostHeaders,
};
function getHost(options, host, ws) {
    if (ws)
        host = (host == options.restHost && options.realtimeHost) || host || options.realtimeHost;
    else
        host = host || options.restHost;
    return host;
}
exports.getHost = getHost;
function getPort(options, tls) {
    return tls || options.tls ? options.tlsPort : options.port;
}
exports.getPort = getPort;
function getHttpScheme(options) {
    return options.tls ? 'https://' : 'http://';
}
exports.getHttpScheme = getHttpScheme;
// construct environment fallback hosts as per RSC15i
function environmentFallbackHosts(environment) {
    return [
        environment + '-a-fallback.ably-realtime.com',
        environment + '-b-fallback.ably-realtime.com',
        environment + '-c-fallback.ably-realtime.com',
        environment + '-d-fallback.ably-realtime.com',
        environment + '-e-fallback.ably-realtime.com',
    ];
}
exports.environmentFallbackHosts = environmentFallbackHosts;
function getFallbackHosts(options) {
    const fallbackHosts = options.fallbackHosts, httpMaxRetryCount = typeof options.httpMaxRetryCount !== 'undefined' ? options.httpMaxRetryCount : Defaults.httpMaxRetryCount;
    return fallbackHosts ? Utils.arrChooseN(fallbackHosts, httpMaxRetryCount) : [];
}
exports.getFallbackHosts = getFallbackHosts;
function getHosts(options, ws) {
    const hosts = [options.restHost].concat(getFallbackHosts(options));
    return ws ? hosts.map((host) => getHost(options, host, true)) : hosts;
}
exports.getHosts = getHosts;
function checkHost(host) {
    if (typeof host !== 'string') {
        throw new errorinfo_1.default('host must be a string; was a ' + typeof host, 40000, 400);
    }
    if (!host.length) {
        throw new errorinfo_1.default('host must not be zero-length', 40000, 400);
    }
}
function getRealtimeHost(options, production, environment, logger) {
    if (options.realtimeHost)
        return options.realtimeHost;
    /* prefer setting realtimeHost to restHost as a custom restHost typically indicates
     * a development environment is being used that can't be inferred by the library */
    if (options.restHost) {
        logger_1.default.logAction(logger, logger_1.default.LOG_MINOR, 'Defaults.normaliseOptions', 'restHost is set to "' +
            options.restHost +
            '" but realtimeHost is not set, so setting realtimeHost to "' +
            options.restHost +
            '" too. If this is not what you want, please set realtimeHost explicitly.');
        return options.restHost;
    }
    return production ? Defaults.REALTIME_HOST : environment + '-' + Defaults.REALTIME_HOST;
}
function getTimeouts(options) {
    /* Allow values passed in options to override default timeouts */
    const timeouts = {};
    for (const prop in Defaults.TIMEOUTS) {
        timeouts[prop] = options[prop] || Defaults.TIMEOUTS[prop];
    }
    return timeouts;
}
function getAgentString(options) {
    let agentStr = Defaults.agent;
    if (options.agents) {
        for (var agent in options.agents) {
            agentStr += ' ' + agent + '/' + options.agents[agent];
        }
    }
    return agentStr;
}
exports.getAgentString = getAgentString;
function objectifyOptions(options, allowKeyOrToken, sourceForErrorMessage, logger, modularPluginsToInclude) {
    if (options === undefined) {
        const msg = allowKeyOrToken
            ? `${sourceForErrorMessage} must be initialized with either a client options object, an Ably API key, or an Ably Token`
            : `${sourceForErrorMessage} must be initialized with a client options object`;
        logger_1.default.logAction(logger, logger_1.default.LOG_ERROR, `${sourceForErrorMessage}()`, msg);
        throw new Error(msg);
    }
    let optionsObj;
    if (typeof options === 'string') {
        if (options.indexOf(':') == -1) {
            if (!allowKeyOrToken) {
                const msg = `${sourceForErrorMessage} cannot be initialized with just an Ably Token; you must provide a client options object with a \`plugins\` property. (Set this Ably Token as the object’s \`token\` property.)`;
                logger_1.default.logAction(logger, logger_1.default.LOG_ERROR, `${sourceForErrorMessage}()`, msg);
                throw new Error(msg);
            }
            optionsObj = { token: options };
        }
        else {
            if (!allowKeyOrToken) {
                const msg = `${sourceForErrorMessage} cannot be initialized with just an Ably API key; you must provide a client options object with a \`plugins\` property. (Set this Ably API key as the object’s \`key\` property.)`;
                logger_1.default.logAction(logger, logger_1.default.LOG_ERROR, `${sourceForErrorMessage}()`, msg);
                throw new Error(msg);
            }
            optionsObj = { key: options };
        }
    }
    else {
        optionsObj = options;
    }
    if (modularPluginsToInclude) {
        optionsObj = Object.assign(Object.assign({}, optionsObj), { plugins: Object.assign(Object.assign({}, modularPluginsToInclude), optionsObj.plugins) });
    }
    return optionsObj;
}
exports.objectifyOptions = objectifyOptions;
function normaliseOptions(options, MsgPack, logger) {
    const loggerToUse = logger !== null && logger !== void 0 ? logger : logger_1.default.defaultLogger;
    if (typeof options.recover === 'function' && options.closeOnUnload === true) {
        logger_1.default.logAction(loggerToUse, logger_1.default.LOG_ERROR, 'Defaults.normaliseOptions', 'closeOnUnload was true and a session recovery function was set - these are mutually exclusive, so unsetting the latter');
        options.recover = undefined;
    }
    if (!('closeOnUnload' in options)) {
        /* Have closeOnUnload default to true unless we have any indication that
         * the user may want to recover the connection */
        options.closeOnUnload = !options.recover;
    }
    if (!('queueMessages' in options))
        options.queueMessages = true;
    /* infer hosts and fallbacks based on the configured environment */
    const environment = (options.environment && String(options.environment).toLowerCase()) || Defaults.ENVIRONMENT;
    const production = !environment || environment === 'production';
    if (!options.fallbackHosts && !options.restHost && !options.realtimeHost && !options.port && !options.tlsPort) {
        options.fallbackHosts = production ? Defaults.FALLBACK_HOSTS : environmentFallbackHosts(environment);
    }
    const restHost = options.restHost || (production ? Defaults.REST_HOST : environment + '-' + Defaults.REST_HOST);
    const realtimeHost = getRealtimeHost(options, production, environment, loggerToUse);
    (options.fallbackHosts || []).concat(restHost, realtimeHost).forEach(checkHost);
    options.port = options.port || Defaults.PORT;
    options.tlsPort = options.tlsPort || Defaults.TLS_PORT;
    if (!('tls' in options))
        options.tls = true;
    const timeouts = getTimeouts(options);
    if (MsgPack) {
        if ('useBinaryProtocol' in options) {
            options.useBinaryProtocol = platform_1.default.Config.supportsBinary && options.useBinaryProtocol;
        }
        else {
            options.useBinaryProtocol = platform_1.default.Config.preferBinary;
        }
    }
    else {
        options.useBinaryProtocol = false;
    }
    const headers = {};
    if (options.clientId) {
        headers['X-Ably-ClientId'] = platform_1.default.BufferUtils.base64Encode(platform_1.default.BufferUtils.utf8Encode(options.clientId));
    }
    if (!('idempotentRestPublishing' in options)) {
        options.idempotentRestPublishing = true;
    }
    let connectivityCheckParams = null;
    let connectivityCheckUrl = options.connectivityCheckUrl;
    if (options.connectivityCheckUrl) {
        let [uri, qs] = options.connectivityCheckUrl.split('?');
        connectivityCheckParams = qs ? Utils.parseQueryString(qs) : {};
        if (uri.indexOf('://') === -1) {
            uri = 'https://' + uri;
        }
        connectivityCheckUrl = uri;
    }
    let wsConnectivityCheckUrl = options.wsConnectivityCheckUrl;
    if (wsConnectivityCheckUrl && wsConnectivityCheckUrl.indexOf('://') === -1) {
        wsConnectivityCheckUrl = 'wss://' + wsConnectivityCheckUrl;
    }
    return Object.assign(Object.assign({}, options), { realtimeHost,
        restHost, maxMessageSize: options.maxMessageSize || Defaults.maxMessageSize, timeouts,
        connectivityCheckParams,
        connectivityCheckUrl,
        wsConnectivityCheckUrl,
        headers });
}
exports.normaliseOptions = normaliseOptions;
function normaliseChannelOptions(Crypto, logger, options) {
    const channelOptions = options || {};
    if (channelOptions.cipher) {
        if (!Crypto)
            Utils.throwMissingPluginError('Crypto');
        const cipher = Crypto.getCipher(channelOptions.cipher, logger);
        channelOptions.cipher = cipher.cipherParams;
        channelOptions.channelCipher = cipher.cipher;
    }
    else if ('cipher' in channelOptions) {
        /* Don't deactivate an existing cipher unless options
         * has a 'cipher' key that's falsey */
        channelOptions.cipher = undefined;
        channelOptions.channelCipher = null;
    }
    return channelOptions;
}
exports.normaliseChannelOptions = normaliseChannelOptions;
const contentTypes = {
    json: 'application/json',
    xml: 'application/xml',
    html: 'text/html',
    msgpack: 'application/x-msgpack',
    text: 'text/plain',
};
const defaultHeadersOptions = {
    format: Utils.Format.json,
    protocolVersion: Defaults.protocolVersion,
};
function defaultGetHeaders(options, { format = defaultHeadersOptions.format, protocolVersion = defaultHeadersOptions.protocolVersion, } = {}) {
    const accept = contentTypes[format];
    return {
        accept: accept,
        'X-Ably-Version': protocolVersion.toString(),
        'Ably-Agent': getAgentString(options),
    };
}
exports.defaultGetHeaders = defaultGetHeaders;
function defaultPostHeaders(options, { format = defaultHeadersOptions.format, protocolVersion = defaultHeadersOptions.protocolVersion, } = {}) {
    let contentType;
    const accept = (contentType = contentTypes[format]);
    return {
        accept: accept,
        'content-type': contentType,
        'X-Ably-Version': protocolVersion.toString(),
        'Ably-Agent': getAgentString(options),
    };
}
exports.defaultPostHeaders = defaultPostHeaders;
exports["default"] = Defaults;
function getDefaults(platformDefaults) {
    return Object.assign(Defaults, platformDefaults);
}
exports.getDefaults = getDefaults;


/***/ }),

/***/ 3388:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(7582);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
/* Call the listener, catch any exceptions and log, but continue operation*/
function callListener(logger, eventThis, listener, args) {
    try {
        listener.apply(eventThis, args);
    }
    catch (e) {
        logger_1.default.logAction(logger, logger_1.default.LOG_ERROR, 'EventEmitter.emit()', 'Unexpected listener exception: ' + e + '; stack = ' + (e && e.stack));
    }
}
/**
 * Remove listeners that match listener
 * @param targetListeners is an array of listener arrays or event objects with arrays of listeners
 * @param listener the listener callback to remove
 * @param eventFilter (optional) event name instructing the function to only remove listeners for the specified event
 */
function removeListener(targetListeners, listener, eventFilter) {
    let listeners;
    let index;
    let eventName;
    for (let targetListenersIndex = 0; targetListenersIndex < targetListeners.length; targetListenersIndex++) {
        listeners = targetListeners[targetListenersIndex];
        if (eventFilter) {
            listeners = listeners[eventFilter];
        }
        if (Array.isArray(listeners)) {
            while ((index = listeners.indexOf(listener)) !== -1) {
                listeners.splice(index, 1);
            }
            /* If events object has an event name key with no listeners then
                          remove the key to stop the list growing indefinitely */
            if (eventFilter && listeners.length === 0) {
                delete targetListeners[targetListenersIndex][eventFilter];
            }
        }
        else if (Utils.isObject(listeners)) {
            /* events */
            for (eventName in listeners) {
                if (Object.prototype.hasOwnProperty.call(listeners, eventName) && Array.isArray(listeners[eventName])) {
                    removeListener([listeners], listener, eventName);
                }
            }
        }
    }
}
class EventEmitter {
    constructor(logger) {
        this.logger = logger;
        this.any = [];
        this.events = Object.create(null);
        this.anyOnce = [];
        this.eventsOnce = Object.create(null);
    }
    on(...args) {
        if (args.length === 1) {
            const listener = args[0];
            if (typeof listener === 'function') {
                this.any.push(listener);
            }
            else {
                throw new Error('EventListener.on(): Invalid arguments: ' + platform_1.default.Config.inspect(args));
            }
        }
        if (args.length === 2) {
            const [event, listener] = args;
            if (typeof listener !== 'function') {
                throw new Error('EventListener.on(): Invalid arguments: ' + platform_1.default.Config.inspect(args));
            }
            if (Utils.isNil(event)) {
                this.any.push(listener);
            }
            else if (Array.isArray(event)) {
                event.forEach((eventName) => {
                    this.on(eventName, listener);
                });
            }
            else {
                if (typeof event !== 'string') {
                    throw new Error('EventListener.on(): Invalid arguments: ' + platform_1.default.Config.inspect(args));
                }
                const listeners = this.events[event] || (this.events[event] = []);
                listeners.push(listener);
            }
        }
    }
    off(...args) {
        if (args.length == 0 || (Utils.isNil(args[0]) && Utils.isNil(args[1]))) {
            this.any = [];
            this.events = Object.create(null);
            this.anyOnce = [];
            this.eventsOnce = Object.create(null);
            return;
        }
        const [firstArg, secondArg] = args;
        let listener = null;
        let event = null;
        if (args.length === 1 || !secondArg) {
            if (typeof firstArg === 'function') {
                /* we take this to be the listener and treat the event as "any" .. */
                listener = firstArg;
            }
            else {
                event = firstArg;
            }
            /* ... or we take event to be the actual event name and listener to be all */
        }
        else {
            if (typeof secondArg !== 'function') {
                throw new Error('EventEmitter.off(): invalid arguments:' + platform_1.default.Config.inspect(args));
            }
            [event, listener] = [firstArg, secondArg];
        }
        if (listener && Utils.isNil(event)) {
            removeListener([this.any, this.events, this.anyOnce, this.eventsOnce], listener);
            return;
        }
        if (Array.isArray(event)) {
            event.forEach((eventName) => {
                this.off(eventName, listener);
            });
            return;
        }
        /* "normal" case where event is an actual event */
        if (typeof event !== 'string') {
            throw new Error('EventEmitter.off(): invalid arguments:' + platform_1.default.Config.inspect(args));
        }
        if (listener) {
            removeListener([this.events, this.eventsOnce], listener, event);
        }
        else {
            delete this.events[event];
            delete this.eventsOnce[event];
        }
    }
    /**
     * Get the array of listeners for a given event; excludes once events
     * @param event (optional) the name of the event, or none for 'any'
     * @return array of events, or null if none
     */
    listeners(event) {
        if (event) {
            const listeners = this.events[event] || [];
            if (this.eventsOnce[event])
                Array.prototype.push.apply(listeners, this.eventsOnce[event]);
            return listeners.length ? listeners : null;
        }
        return this.any.length ? this.any : null;
    }
    /**
     * Emit an event
     * @param event the event name
     * @param args the arguments to pass to the listener
     */
    emit(event, ...args /* , args... */) {
        const eventThis = { event };
        const listeners = [];
        if (this.anyOnce.length) {
            Array.prototype.push.apply(listeners, this.anyOnce);
            this.anyOnce = [];
        }
        if (this.any.length) {
            Array.prototype.push.apply(listeners, this.any);
        }
        const eventsOnceListeners = this.eventsOnce[event];
        if (eventsOnceListeners) {
            Array.prototype.push.apply(listeners, eventsOnceListeners);
            delete this.eventsOnce[event];
        }
        const eventsListeners = this.events[event];
        if (eventsListeners) {
            Array.prototype.push.apply(listeners, eventsListeners);
        }
        listeners.forEach((listener) => {
            callListener(this.logger, eventThis, listener, args);
        });
    }
    once(...args) {
        const argCount = args.length;
        if (argCount === 0 || (argCount === 1 && typeof args[0] !== 'function')) {
            const event = args[0];
            return new Promise((resolve) => {
                this.once(event, resolve);
            });
        }
        const [firstArg, secondArg] = args;
        if (args.length === 1 && typeof firstArg === 'function') {
            this.anyOnce.push(firstArg);
        }
        else if (Utils.isNil(firstArg)) {
            if (typeof secondArg !== 'function') {
                throw new Error('EventEmitter.once(): Invalid arguments:' + platform_1.default.Config.inspect(args));
            }
            this.anyOnce.push(secondArg);
        }
        else if (Array.isArray(firstArg)) {
            const self = this;
            const listenerWrapper = function () {
                const innerArgs = Array.prototype.slice.call(arguments);
                firstArg.forEach(function (eventName) {
                    self.off(eventName, listenerWrapper);
                });
                if (typeof secondArg !== 'function') {
                    throw new Error('EventEmitter.once(): Invalid arguments:' + platform_1.default.Config.inspect(args));
                }
                secondArg.apply(this, innerArgs);
            };
            firstArg.forEach(function (eventName) {
                self.on(eventName, listenerWrapper);
            });
        }
        else {
            if (typeof firstArg !== 'string') {
                throw new Error('EventEmitter.once(): Invalid arguments:' + platform_1.default.Config.inspect(args));
            }
            const listeners = this.eventsOnce[firstArg] || (this.eventsOnce[firstArg] = []);
            if (secondArg) {
                if (typeof secondArg !== 'function') {
                    throw new Error('EventEmitter.once(): Invalid arguments:' + platform_1.default.Config.inspect(args));
                }
                listeners.push(secondArg);
            }
        }
    }
    /**
     * Listen for a single occurrence of a state event and fire immediately if currentState matches targetState
     * @param targetState the name of the state event to listen to
     * @param currentState the name of the current state of this object
     */
    async whenState(targetState, currentState) {
        if (typeof targetState !== 'string' || typeof currentState !== 'string') {
            throw new Error('whenState requires a valid state String argument');
        }
        if (targetState === currentState) {
            return null;
        }
        else {
            return this.once(targetState);
        }
    }
}
exports["default"] = EventEmitter;


/***/ }),

/***/ 1597:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(7582);
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
// Workaround for salesforce lightning locker compatibility
// This is a shorthand version of Utils.getGlobalObject (which we can't use here without creating a circular import)
let globalObject = typeof __webpack_require__.g !== 'undefined' ? __webpack_require__.g : typeof window !== 'undefined' ? window : self;
var LogLevels;
(function (LogLevels) {
    LogLevels[LogLevels["None"] = 0] = "None";
    LogLevels[LogLevels["Error"] = 1] = "Error";
    LogLevels[LogLevels["Major"] = 2] = "Major";
    LogLevels[LogLevels["Minor"] = 3] = "Minor";
    LogLevels[LogLevels["Micro"] = 4] = "Micro";
})(LogLevels || (LogLevels = {}));
function pad(timeSegment, three) {
    return `${timeSegment}`.padStart(three ? 3 : 2, '0');
}
function getHandler(logger) {
    return platform_1.default.Config.logTimestamps
        ? function (msg) {
            const time = new Date();
            logger(pad(time.getHours()) +
                ':' +
                pad(time.getMinutes()) +
                ':' +
                pad(time.getSeconds()) +
                '.' +
                pad(time.getMilliseconds(), 1) +
                ' ' +
                msg);
        }
        : function (msg) {
            logger(msg);
        };
}
const getDefaultLoggers = () => {
    var _b;
    let consoleLogger;
    let errorLogger;
    // we expect ably-js to be run in environments which have `console` object available with its `log` function
    if (typeof ((_b = globalObject === null || globalObject === void 0 ? void 0 : globalObject.console) === null || _b === void 0 ? void 0 : _b.log) === 'function') {
        consoleLogger = function (...args) {
            console.log.apply(console, args);
        };
        errorLogger = console.warn
            ? function (...args) {
                console.warn.apply(console, args);
            }
            : consoleLogger;
    }
    else {
        // otherwise we should fallback to noop for log functions
        consoleLogger = errorLogger = function () { };
    }
    return [consoleLogger, errorLogger].map(getHandler);
};
class Logger {
    static initLogHandlers() {
        const [logHandler, logErrorHandler] = getDefaultLoggers();
        this.defaultLogHandler = logHandler;
        this.defaultLogErrorHandler = logErrorHandler;
        this.defaultLogger = new Logger();
    }
    constructor() {
        this.deprecated = (description, msg) => {
            this.deprecationWarning(`${description} is deprecated and will be removed in a future version. ${msg}`);
        };
        /* Where a logging operation is expensive, such as serialisation of data, use shouldLog will prevent
             the object being serialised if the log level will not output the message */
        this.shouldLog = (level) => {
            return level <= this.logLevel;
        };
        this.setLog = (level, handler) => {
            if (level !== undefined)
                this.logLevel = level;
            if (handler !== undefined)
                this.logHandler = this.logErrorHandler = handler;
        };
        this.logLevel = Logger.defaultLogLevel;
        this.logHandler = Logger.defaultLogHandler;
        this.logErrorHandler = Logger.defaultLogErrorHandler;
    }
    /**
     * Calls to this method are never stripped by the `stripLogs` esbuild plugin. Use it for log statements that you wish to always be included in the modular variant of the SDK.
     */
    static logActionNoStrip(logger, level, action, message) {
        logger.logAction(level, action, message);
    }
    logAction(level, action, message) {
        if (this.shouldLog(level)) {
            (level === LogLevels.Error ? this.logErrorHandler : this.logHandler)('Ably: ' + action + ': ' + message, level);
        }
    }
    renamedClientOption(oldName, newName) {
        this.deprecationWarning(`The \`${oldName}\` client option has been renamed to \`${newName}\`. Please update your code to use \`${newName}\` instead. \`${oldName}\` will be removed in a future version.`);
    }
    renamedMethod(className, oldName, newName) {
        this.deprecationWarning(`\`${className}\`’s \`${oldName}\` method has been renamed to \`${newName}\`. Please update your code to use \`${newName}\` instead. \`${oldName}\` will be removed in a future version.`);
    }
    deprecationWarning(message) {
        if (this.shouldLog(LogLevels.Error)) {
            this.logErrorHandler(`Ably: Deprecation warning - ${message}`, LogLevels.Error);
        }
    }
}
_a = Logger;
Logger.defaultLogLevel = LogLevels.Error;
// public constants
Logger.LOG_NONE = LogLevels.None;
Logger.LOG_ERROR = LogLevels.Error;
Logger.LOG_MAJOR = LogLevels.Major;
Logger.LOG_MINOR = LogLevels.Minor;
Logger.LOG_MICRO = LogLevels.Micro;
/* public static functions */
/**
 * In the modular variant of the SDK, the `stripLogs` esbuild plugin strips out all calls to this method (when invoked as `Logger.logAction(...)`) except when called with level `Logger.LOG_ERROR`. If you wish for a log statement to never be stripped, use the {@link logActionNoStrip} method instead.
 *
 * The aforementioned plugin expects `level` to be an expression of the form `Logger.LOG_*`; that is, you can’t dynamically specify the log level.
 */
Logger.logAction = (logger, level, action, message) => {
    _a.logActionNoStrip(logger, level, action, message);
};
exports["default"] = Logger;


/***/ }),

/***/ 578:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(7582);
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
class Multicaster {
    // Private constructor; use static Multicaster.create instead
    constructor(logger, members) {
        this.logger = logger;
        this.members = members || [];
    }
    call(err, result) {
        for (const member of this.members) {
            if (member) {
                try {
                    member(err, result);
                }
                catch (e) {
                    logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'Multicaster multiple callback handler', 'Unexpected exception: ' + e + '; stack = ' + e.stack);
                }
            }
        }
    }
    push(...args) {
        this.members.push(...args);
    }
    createPromise() {
        return new Promise((resolve, reject) => {
            this.push((err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }
    resolveAll(result) {
        this.call(null, result);
    }
    rejectAll(err) {
        this.call(err);
    }
    static create(logger, members) {
        const instance = new Multicaster(logger, members);
        return Object.assign((err, result) => instance.call(err, result), {
            push: (fn) => instance.push(fn),
            createPromise: () => instance.createPromise(),
            resolveAll: (result) => instance.resolveAll(result),
            rejectAll: (err) => instance.rejectAll(err),
        });
    }
}
exports["default"] = Multicaster;


/***/ }),

/***/ 2678:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.withTimeoutAsync = exports.throwMissingPluginError = exports.createMissingPluginError = exports.arrEquals = exports.toBase64 = exports.matchDerivedChannel = exports.shallowEquals = exports.getGlobalObject = exports.getRetryTime = exports.getJitterCoefficient = exports.getBackoffCoefficient = exports.allToUpperCase = exports.allToLowerCase = exports.encodeBody = exports.decodeBody = exports.whenPromiseSettles = exports.arrChooseN = exports.randomString = exports.cheapRandStr = exports.dataSizeBytes = exports.inspectBody = exports.inspectError = exports.isErrorInfoOrPartialErrorInfo = exports.parseQueryString = exports.toQueryString = exports.arrPopRandomElement = exports.Format = exports.allSame = exports.forInOwnNonNullProperties = exports.valuesArray = exports.keysArray = exports.arrWithoutValue = exports.arrDeleteValue = exports.arrSubtract = exports.arrIntersectOb = exports.arrIntersect = exports.intersect = exports.containsValue = exports.inherits = exports.prototypicalClone = exports.shallowClone = exports.isNil = exports.isEmpty = exports.isObject = exports.ensureArray = exports.copy = exports.mixin = void 0;
const tslib_1 = __webpack_require__(7582);
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
const errorinfo_1 = tslib_1.__importStar(__webpack_require__(1798));
function randomPosn(arrOrStr) {
    return Math.floor(Math.random() * arrOrStr.length);
}
/**
 * Add a set of properties to a target object
 *
 * @param target the target object
 * @param args objects, which enumerable properties are added to target, by reference only
 * @returns target object with added properties
 */
function mixin(target, ...args) {
    for (let i = 0; i < args.length; i++) {
        const source = args[i];
        if (!source) {
            break;
        }
        for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
            }
        }
    }
    return target;
}
exports.mixin = mixin;
/**
 * Creates a copy of enumerable properties of the source object
 *
 * @param src object to copy
 * @returns copy of src
 */
function copy(src) {
    return mixin({}, src);
}
exports.copy = copy;
/*
 * Ensures that an Array object is always returned
 * returning the original Array of obj is an Array
 * else wrapping the obj in a single element Array
 */
function ensureArray(obj) {
    if (isNil(obj)) {
        return [];
    }
    if (Array.isArray(obj)) {
        return obj;
    }
    return [obj];
}
exports.ensureArray = ensureArray;
function isObject(ob) {
    return Object.prototype.toString.call(ob) == '[object Object]';
}
exports.isObject = isObject;
/*
 * Determine whether or not an object contains
 * any enumerable properties.
 * ob: the object
 */
function isEmpty(ob) {
    for (const prop in ob)
        return false;
    return true;
}
exports.isEmpty = isEmpty;
/**
 * Checks if `value` is `null` or `undefined`.
 *
 * Source: https://github.com/lodash/lodash/blob/main/src/isNil.ts
 */
function isNil(arg) {
    return arg == null;
}
exports.isNil = isNil;
/*
 * Perform a simple shallow clone of an object.
 * Result is an object irrespective of whether
 * the input is an object or array. All
 * enumerable properties are copied.
 * ob: the object
 */
function shallowClone(ob) {
    const result = new Object();
    for (const prop in ob)
        result[prop] = ob[prop];
    return result;
}
exports.shallowClone = shallowClone;
/*
 * Clone an object by creating a new object with the
 * given object as its prototype. Optionally
 * a set of additional own properties can be
 * supplied to be added to the newly created clone.
 * ob:            the object to be cloned
 * ownProperties: optional object with additional
 *                properties to add
 */
function prototypicalClone(ob, ownProperties) {
    class F {
    }
    F.prototype = ob;
    const result = new F();
    if (ownProperties)
        mixin(result, ownProperties);
    return result;
}
exports.prototypicalClone = prototypicalClone;
/*
 * Declare a constructor to represent a subclass
 * of another constructor
 * If platform has a built-in version we use that from Platform, else we
 * define here (so can make use of other Utils fns)
 * See node.js util.inherits
 */
const inherits = function (ctor, superCtor) {
    if (platform_1.default.Config.inherits) {
        platform_1.default.Config.inherits(ctor, superCtor);
        return;
    }
    ctor.super_ = superCtor;
    ctor.prototype = prototypicalClone(superCtor.prototype, { constructor: ctor });
};
exports.inherits = inherits;
/*
 * Determine whether or not an object has an enumerable
 * property whose value equals a given value.
 * ob:  the object
 * val: the value to find
 */
function containsValue(ob, val) {
    for (const i in ob) {
        if (ob[i] == val)
            return true;
    }
    return false;
}
exports.containsValue = containsValue;
function intersect(arr, ob) {
    return Array.isArray(ob) ? arrIntersect(arr, ob) : arrIntersectOb(arr, ob);
}
exports.intersect = intersect;
function arrIntersect(arr1, arr2) {
    const result = [];
    for (let i = 0; i < arr1.length; i++) {
        const member = arr1[i];
        if (arr2.indexOf(member) != -1)
            result.push(member);
    }
    return result;
}
exports.arrIntersect = arrIntersect;
function arrIntersectOb(arr, ob) {
    const result = [];
    for (let i = 0; i < arr.length; i++) {
        const member = arr[i];
        if (member in ob)
            result.push(member);
    }
    return result;
}
exports.arrIntersectOb = arrIntersectOb;
function arrSubtract(arr1, arr2) {
    const result = [];
    for (let i = 0; i < arr1.length; i++) {
        const element = arr1[i];
        if (arr2.indexOf(element) == -1)
            result.push(element);
    }
    return result;
}
exports.arrSubtract = arrSubtract;
function arrDeleteValue(arr, val) {
    const idx = arr.indexOf(val);
    const res = idx != -1;
    if (res)
        arr.splice(idx, 1);
    return res;
}
exports.arrDeleteValue = arrDeleteValue;
function arrWithoutValue(arr, val) {
    const newArr = arr.slice();
    arrDeleteValue(newArr, val);
    return newArr;
}
exports.arrWithoutValue = arrWithoutValue;
/*
 * Construct an array of the keys of the enumerable
 * properties of a given object, optionally limited
 * to only the own properties.
 * ob:      the object
 * ownOnly: boolean, get own properties only
 */
function keysArray(ob, ownOnly) {
    const result = [];
    for (const prop in ob) {
        if (ownOnly && !Object.prototype.hasOwnProperty.call(ob, prop))
            continue;
        result.push(prop);
    }
    return result;
}
exports.keysArray = keysArray;
/*
 * Construct an array of the values of the enumerable
 * properties of a given object, optionally limited
 * to only the own properties.
 * ob:      the object
 * ownOnly: boolean, get own properties only
 */
function valuesArray(ob, ownOnly) {
    const result = [];
    for (const prop in ob) {
        if (ownOnly && !Object.prototype.hasOwnProperty.call(ob, prop))
            continue;
        result.push(ob[prop]);
    }
    return result;
}
exports.valuesArray = valuesArray;
function forInOwnNonNullProperties(ob, fn) {
    for (const prop in ob) {
        if (Object.prototype.hasOwnProperty.call(ob, prop) && ob[prop]) {
            fn(prop);
        }
    }
}
exports.forInOwnNonNullProperties = forInOwnNonNullProperties;
function allSame(arr, prop) {
    if (arr.length === 0) {
        return true;
    }
    const first = arr[0][prop];
    return arr.every(function (item) {
        return item[prop] === first;
    });
}
exports.allSame = allSame;
var Format;
(function (Format) {
    Format["msgpack"] = "msgpack";
    Format["json"] = "json";
})(Format = exports.Format || (exports.Format = {}));
function arrPopRandomElement(arr) {
    return arr.splice(randomPosn(arr), 1)[0];
}
exports.arrPopRandomElement = arrPopRandomElement;
function toQueryString(params) {
    const parts = [];
    if (params) {
        for (const key in params)
            parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
    }
    return parts.length ? '?' + parts.join('&') : '';
}
exports.toQueryString = toQueryString;
function parseQueryString(query) {
    let match;
    const search = /([^?&=]+)=?([^&]*)/g;
    const result = {};
    while ((match = search.exec(query)))
        result[decodeURIComponent(match[1])] = decodeURIComponent(match[2]);
    return result;
}
exports.parseQueryString = parseQueryString;
function isErrorInfoOrPartialErrorInfo(err) {
    return typeof err == 'object' && err !== null && (err instanceof errorinfo_1.default || err instanceof errorinfo_1.PartialErrorInfo);
}
exports.isErrorInfoOrPartialErrorInfo = isErrorInfoOrPartialErrorInfo;
function inspectError(err) {
    var _a, _b;
    if (err instanceof Error ||
        ((_a = err === null || err === void 0 ? void 0 : err.constructor) === null || _a === void 0 ? void 0 : _a.name) === 'ErrorInfo' ||
        ((_b = err === null || err === void 0 ? void 0 : err.constructor) === null || _b === void 0 ? void 0 : _b.name) === 'PartialErrorInfo')
        return err.toString();
    return platform_1.default.Config.inspect(err);
}
exports.inspectError = inspectError;
function inspectBody(body) {
    if (platform_1.default.BufferUtils.isBuffer(body)) {
        return body.toString();
    }
    else if (typeof body === 'string') {
        return body;
    }
    else {
        return platform_1.default.Config.inspect(body);
    }
}
exports.inspectBody = inspectBody;
/* Data is assumed to be either a string or a buffer. */
function dataSizeBytes(data) {
    if (platform_1.default.BufferUtils.isBuffer(data)) {
        return platform_1.default.BufferUtils.byteLength(data);
    }
    if (typeof data === 'string') {
        return platform_1.default.Config.stringByteSize(data);
    }
    throw new Error('Expected input of Utils.dataSizeBytes to be a buffer or string, but was: ' + typeof data);
}
exports.dataSizeBytes = dataSizeBytes;
function cheapRandStr() {
    return String(Math.random()).substr(2);
}
exports.cheapRandStr = cheapRandStr;
/* Takes param the minimum number of bytes of entropy the string must
 * include, not the length of the string. String length produced is not
 * guaranteed. */
const randomString = async (numBytes) => {
    const buffer = await platform_1.default.Config.getRandomArrayBuffer(numBytes);
    return platform_1.default.BufferUtils.base64Encode(buffer);
};
exports.randomString = randomString;
/* Pick n elements at random without replacement from an array */
function arrChooseN(arr, n) {
    const numItems = Math.min(n, arr.length), mutableArr = arr.slice(), result = [];
    for (let i = 0; i < numItems; i++) {
        result.push(arrPopRandomElement(mutableArr));
    }
    return result;
}
exports.arrChooseN = arrChooseN;
/**
 * Uses a callback to communicate the result of a `Promise`. The first argument passed to the callback will be either an error (when the promise is rejected) or `null` (when the promise is fulfilled). In the case where the promise is fulfilled, the resulting value will be passed to the callback as a second argument.
 */
function whenPromiseSettles(promise, callback) {
    promise
        .then((result) => {
        callback === null || callback === void 0 ? void 0 : callback(null, result);
    })
        .catch((err) => {
        // We make no guarantees about the type of the error that gets passed to the callback. Issue https://github.com/ably/ably-js/issues/1617 will think about how to correctly handle error types.
        callback === null || callback === void 0 ? void 0 : callback(err);
    });
}
exports.whenPromiseSettles = whenPromiseSettles;
function decodeBody(body, MsgPack, format) {
    if (format == 'msgpack') {
        if (!MsgPack) {
            throwMissingPluginError('MsgPack');
        }
        return MsgPack.decode(body);
    }
    return JSON.parse(String(body));
}
exports.decodeBody = decodeBody;
function encodeBody(body, MsgPack, format) {
    if (format == 'msgpack') {
        if (!MsgPack) {
            throwMissingPluginError('MsgPack');
        }
        return MsgPack.encode(body, true);
    }
    return JSON.stringify(body);
}
exports.encodeBody = encodeBody;
function allToLowerCase(arr) {
    return arr.map(function (element) {
        return element && element.toLowerCase();
    });
}
exports.allToLowerCase = allToLowerCase;
function allToUpperCase(arr) {
    return arr.map(function (element) {
        return element && element.toUpperCase();
    });
}
exports.allToUpperCase = allToUpperCase;
function getBackoffCoefficient(count) {
    return Math.min((count + 2) / 3, 2);
}
exports.getBackoffCoefficient = getBackoffCoefficient;
function getJitterCoefficient() {
    return 1 - Math.random() * 0.2;
}
exports.getJitterCoefficient = getJitterCoefficient;
/**
 *
 * @param initialTimeout initial timeout value
 * @param retryAttempt integer indicating retryAttempt
 * @returns RetryTimeout value for given timeout and retryAttempt.
 * If x is the value generated then,
 * Upper bound = min((retryAttempt + 2) / 3, 2) * initialTimeout,
 * Lower bound = 0.8 * Upper bound,
 * Lower bound < x < Upper bound
 */
function getRetryTime(initialTimeout, retryAttempt) {
    return initialTimeout * getBackoffCoefficient(retryAttempt) * getJitterCoefficient();
}
exports.getRetryTime = getRetryTime;
function getGlobalObject() {
    if (typeof __webpack_require__.g !== 'undefined') {
        return __webpack_require__.g;
    }
    if (typeof window !== 'undefined') {
        return window;
    }
    return self;
}
exports.getGlobalObject = getGlobalObject;
function shallowEquals(source, target) {
    return (Object.keys(source).every((key) => source[key] === target[key]) &&
        Object.keys(target).every((key) => target[key] === source[key]));
}
exports.shallowEquals = shallowEquals;
function matchDerivedChannel(name) {
    /**
     * This regex check is to retain existing channel params if any e.g [?rewind=1]foo to
     * [filter=xyz?rewind=1]foo. This is to keep channel compatibility around use of
     * channel params that work with derived channels.
     *
     * This eslint unsafe regex warning is triggered because the RegExp uses nested quantifiers,
     * but it does not create any situation where the regex engine has to
     * explore a large number of possible matches so it’s safe to ignore
     */
    const regex = /^(\[([^?]*)(?:(.*))\])?(.+)$/; // eslint-disable-line
    const match = name.match(regex);
    if (!match || !match.length || match.length < 5) {
        throw new errorinfo_1.default('regex match failed', 400, 40010);
    }
    // Fail if there is already a channel qualifier, eg [meta]foo should fail instead of just overriding with [filter=xyz]foo
    if (match[2]) {
        throw new errorinfo_1.default(`cannot use a derived option with a ${match[2]} channel`, 400, 40010);
    }
    // Return match values to be added to derive channel quantifier.
    return {
        qualifierParam: match[3] || '',
        channelName: match[4],
    };
}
exports.matchDerivedChannel = matchDerivedChannel;
function toBase64(str) {
    const bufferUtils = platform_1.default.BufferUtils;
    const textBuffer = bufferUtils.utf8Encode(str);
    return bufferUtils.base64Encode(textBuffer);
}
exports.toBase64 = toBase64;
function arrEquals(a, b) {
    return (a.length === b.length &&
        a.every(function (val, i) {
            return val === b[i];
        }));
}
exports.arrEquals = arrEquals;
function createMissingPluginError(pluginName) {
    return new errorinfo_1.default(`${pluginName} plugin not provided`, 40019, 400);
}
exports.createMissingPluginError = createMissingPluginError;
function throwMissingPluginError(pluginName) {
    throw createMissingPluginError(pluginName);
}
exports.throwMissingPluginError = throwMissingPluginError;
async function withTimeoutAsync(promise, timeout = 5000, err = 'Timeout expired') {
    const e = new errorinfo_1.default(err, 50000, 500);
    return Promise.race([promise, new Promise((_resolve, reject) => setTimeout(() => reject(e), timeout))]);
}
exports.withTimeoutAsync = withTimeoutAsync;


/***/ }),

/***/ 7400:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
class Platform {
}
exports["default"] = Platform;


/***/ }),

/***/ 1223:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Http = exports.appendingParams = exports.paramString = void 0;
const tslib_1 = __webpack_require__(7582);
const defaults_1 = tslib_1.__importDefault(__webpack_require__(3925));
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
const errorinfo_1 = tslib_1.__importDefault(__webpack_require__(1798));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const Utils = tslib_1.__importStar(__webpack_require__(2678));
function paramString(params) {
    const paramPairs = [];
    if (params) {
        for (const needle in params) {
            paramPairs.push(needle + '=' + params[needle]);
        }
    }
    return paramPairs.join('&');
}
exports.paramString = paramString;
function appendingParams(uri, params) {
    return uri + (params ? '?' : '') + paramString(params);
}
exports.appendingParams = appendingParams;
function logResult(result, method, uri, params, logger) {
    if (result.error) {
        logger_1.default.logActionNoStrip(logger, logger_1.default.LOG_MICRO, 'Http.' + method + '()', 'Received Error; ' + appendingParams(uri, params) + '; Error: ' + Utils.inspectError(result.error));
    }
    else {
        logger_1.default.logActionNoStrip(logger, logger_1.default.LOG_MICRO, 'Http.' + method + '()', 'Received; ' +
            appendingParams(uri, params) +
            '; Headers: ' +
            paramString(result.headers) +
            '; StatusCode: ' +
            result.statusCode +
            '; Body' +
            (platform_1.default.BufferUtils.isBuffer(result.body)
                ? ' (Base64): ' + platform_1.default.BufferUtils.base64Encode(result.body)
                : ': ' + result.body));
    }
}
function logRequest(method, uri, body, params, logger) {
    if (logger.shouldLog(logger_1.default.LOG_MICRO)) {
        logger_1.default.logActionNoStrip(logger, logger_1.default.LOG_MICRO, 'Http.' + method + '()', 'Sending; ' +
            appendingParams(uri, params) +
            '; Body' +
            (platform_1.default.BufferUtils.isBuffer(body) ? ' (Base64): ' + platform_1.default.BufferUtils.base64Encode(body) : ': ' + body));
    }
}
class Http {
    constructor(client) {
        this.client = client;
        this.platformHttp = new platform_1.default.Http(client);
        this.checkConnectivity = this.platformHttp.checkConnectivity
            ? () => this.platformHttp.checkConnectivity()
            : undefined;
    }
    get logger() {
        var _a, _b;
        return (_b = (_a = this.client) === null || _a === void 0 ? void 0 : _a.logger) !== null && _b !== void 0 ? _b : logger_1.default.defaultLogger;
    }
    get supportsAuthHeaders() {
        return this.platformHttp.supportsAuthHeaders;
    }
    get supportsLinkHeaders() {
        return this.platformHttp.supportsLinkHeaders;
    }
    _getHosts(client) {
        /* If we're a connected realtime client, try the endpoint we're connected
         * to first -- but still have fallbacks, being connected is not an absolute
         * guarantee that a datacenter has free capacity to service REST requests. */
        const connection = client.connection, connectionHost = connection && connection.connectionManager.host;
        if (connectionHost) {
            return [connectionHost].concat(defaults_1.default.getFallbackHosts(client.options));
        }
        return defaults_1.default.getHosts(client.options);
    }
    /**
     * This method will not throw any errors; rather, it will communicate any error by populating the {@link RequestResult.error} property of the returned {@link RequestResult}.
     */
    async do(method, path, headers, body, params) {
        try {
            /* Unlike for doUri, the presence of `this.client` here is mandatory, as it's used to generate the hosts */
            const client = this.client;
            if (!client) {
                return { error: new errorinfo_1.default('http.do called without client', 50000, 500) };
            }
            const uriFromHost = typeof path === 'function'
                ? path
                : function (host) {
                    return client.baseUri(host) + path;
                };
            const currentFallback = client._currentFallback;
            if (currentFallback) {
                if (currentFallback.validUntil > Date.now()) {
                    /* Use stored fallback */
                    const result = await this.doUri(method, uriFromHost(currentFallback.host), headers, body, params);
                    if (result.error && this.platformHttp.shouldFallback(result.error)) {
                        /* unstore the fallback and start from the top with the default sequence */
                        client._currentFallback = null;
                        return this.do(method, path, headers, body, params);
                    }
                    return result;
                }
                else {
                    /* Fallback expired; remove it and fallthrough to normal sequence */
                    client._currentFallback = null;
                }
            }
            const hosts = this._getHosts(client);
            /* see if we have one or more than one host */
            if (hosts.length === 1) {
                return this.doUri(method, uriFromHost(hosts[0]), headers, body, params);
            }
            let tryAHostStartedAt = null;
            const tryAHost = async (candidateHosts, persistOnSuccess) => {
                const host = candidateHosts.shift();
                tryAHostStartedAt = tryAHostStartedAt !== null && tryAHostStartedAt !== void 0 ? tryAHostStartedAt : new Date();
                const result = await this.doUri(method, uriFromHost(host), headers, body, params);
                if (result.error && this.platformHttp.shouldFallback(result.error) && candidateHosts.length) {
                    // TO3l6
                    const elapsedTime = Date.now() - tryAHostStartedAt.getTime();
                    if (elapsedTime > client.options.timeouts.httpMaxRetryDuration) {
                        return {
                            error: new errorinfo_1.default(`Timeout for trying fallback hosts retries. Total elapsed time exceeded the ${client.options.timeouts.httpMaxRetryDuration}ms limit`, 50003, 500),
                        };
                    }
                    return tryAHost(candidateHosts, true);
                }
                if (persistOnSuccess) {
                    /* RSC15f */
                    client._currentFallback = {
                        host: host,
                        validUntil: Date.now() + client.options.timeouts.fallbackRetryTimeout,
                    };
                }
                return result;
            };
            return tryAHost(hosts);
        }
        catch (err) {
            // Handle any unexpected error, to ensure we always meet our contract of not throwing any errors
            return { error: new errorinfo_1.default(`Unexpected error in Http.do: ${Utils.inspectError(err)}`, 500, 50000) };
        }
    }
    /**
     * This method will not throw any errors; rather, it will communicate any error by populating the {@link RequestResult.error} property of the returned {@link RequestResult}.
     */
    async doUri(method, uri, headers, body, params) {
        try {
            logRequest(method, uri, body, params, this.logger);
            const result = await this.platformHttp.doUri(method, uri, headers, body, params);
            if (this.logger.shouldLog(logger_1.default.LOG_MICRO)) {
                logResult(result, method, uri, params, this.logger);
            }
            return result;
        }
        catch (err) {
            // Handle any unexpected error, to ensure we always meet our contract of not throwing any errors
            return { error: new errorinfo_1.default(`Unexpected error in Http.doUri: ${Utils.inspectError(err)}`, 500, 50000) };
        }
    }
}
exports.Http = Http;


/***/ }),

/***/ 6285:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(7582);
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
const defaults_1 = tslib_1.__importDefault(__webpack_require__(3925));
const errorinfo_1 = tslib_1.__importStar(__webpack_require__(1798));
const HttpMethods_1 = tslib_1.__importDefault(__webpack_require__(3912));
const XHRStates_1 = tslib_1.__importDefault(__webpack_require__(6882));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const HttpStatusCodes_1 = __webpack_require__(5632);
function createMissingImplementationError() {
    return new errorinfo_1.default('No HTTP request plugin provided. Provide at least one of the FetchRequest or XHRRequest plugins.', 400, 40000);
}
const Http = (_a = class {
        constructor(client) {
            var _a;
            this.checksInProgress = null;
            this.checkConnectivity = undefined;
            this.supportsAuthHeaders = false;
            this.supportsLinkHeaders = false;
            this.client = client !== null && client !== void 0 ? client : null;
            const connectivityCheckUrl = (client === null || client === void 0 ? void 0 : client.options.connectivityCheckUrl) || defaults_1.default.connectivityCheckUrl;
            const connectivityCheckParams = (_a = client === null || client === void 0 ? void 0 : client.options.connectivityCheckParams) !== null && _a !== void 0 ? _a : null;
            const connectivityUrlIsDefault = !(client === null || client === void 0 ? void 0 : client.options.connectivityCheckUrl);
            const requestImplementations = Object.assign(Object.assign({}, Http.bundledRequestImplementations), client === null || client === void 0 ? void 0 : client._additionalHTTPRequestImplementations);
            const xhrRequestImplementation = requestImplementations.XHRRequest;
            const fetchRequestImplementation = requestImplementations.FetchRequest;
            const hasImplementation = !!(xhrRequestImplementation || fetchRequestImplementation);
            if (!hasImplementation) {
                throw createMissingImplementationError();
            }
            if (platform_1.default.Config.xhrSupported && xhrRequestImplementation) {
                this.supportsAuthHeaders = true;
                this.Request = async function (method, uri, headers, params, body) {
                    return new Promise((resolve) => {
                        var _a;
                        const req = xhrRequestImplementation.createRequest(uri, headers, params, body, XHRStates_1.default.REQ_SEND, (_a = (client && client.options.timeouts)) !== null && _a !== void 0 ? _a : null, this.logger, method);
                        req.once('complete', (error, body, headers, unpacked, statusCode) => resolve({ error, body, headers, unpacked, statusCode }));
                        req.exec();
                    });
                };
                if (client === null || client === void 0 ? void 0 : client.options.disableConnectivityCheck) {
                    this.checkConnectivity = async function () {
                        return true;
                    };
                }
                else {
                    this.checkConnectivity = async function () {
                        var _a;
                        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, '(XHRRequest)Http.checkConnectivity()', 'Sending; ' + connectivityCheckUrl);
                        const requestResult = await this.doUri(HttpMethods_1.default.Get, connectivityCheckUrl, null, null, connectivityCheckParams);
                        let result = false;
                        if (!connectivityUrlIsDefault) {
                            result = !requestResult.error && (0, HttpStatusCodes_1.isSuccessCode)(requestResult.statusCode);
                        }
                        else {
                            result = !requestResult.error && ((_a = requestResult.body) === null || _a === void 0 ? void 0 : _a.replace(/\n/, '')) == 'yes';
                        }
                        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, '(XHRRequest)Http.checkConnectivity()', 'Result: ' + result);
                        return result;
                    };
                }
            }
            else if (platform_1.default.Config.fetchSupported && fetchRequestImplementation) {
                this.supportsAuthHeaders = true;
                this.Request = async (method, uri, headers, params, body) => {
                    return fetchRequestImplementation(method, client !== null && client !== void 0 ? client : null, uri, headers, params, body);
                };
                if (client === null || client === void 0 ? void 0 : client.options.disableConnectivityCheck) {
                    this.checkConnectivity = async function () {
                        return true;
                    };
                }
                else {
                    this.checkConnectivity = async function () {
                        var _a;
                        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, '(Fetch)Http.checkConnectivity()', 'Sending; ' + connectivityCheckUrl);
                        const requestResult = await this.doUri(HttpMethods_1.default.Get, connectivityCheckUrl, null, null, null);
                        const result = !requestResult.error && ((_a = requestResult.body) === null || _a === void 0 ? void 0 : _a.replace(/\n/, '')) == 'yes';
                        logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, '(Fetch)Http.checkConnectivity()', 'Result: ' + result);
                        return result;
                    };
                }
            }
            else {
                this.Request = async () => {
                    const error = hasImplementation
                        ? new errorinfo_1.PartialErrorInfo('no supported HTTP transports available', null, 400)
                        : createMissingImplementationError();
                    return { error };
                };
            }
        }
        get logger() {
            var _a, _b;
            return (_b = (_a = this.client) === null || _a === void 0 ? void 0 : _a.logger) !== null && _b !== void 0 ? _b : logger_1.default.defaultLogger;
        }
        async doUri(method, uri, headers, body, params) {
            if (!this.Request) {
                return { error: new errorinfo_1.PartialErrorInfo('Request invoked before assigned to', null, 500) };
            }
            return this.Request(method, uri, headers, params, body);
        }
        shouldFallback(errorInfo) {
            const statusCode = errorInfo.statusCode;
            /* 400 + no code = a generic xhr onerror. Browser doesn't give us enough
             * detail to know whether it's fallback-fixable, but it may be (eg if a
             * network issue), so try just in case */
            return ((statusCode === 408 && !errorInfo.code) ||
                (statusCode === 400 && !errorInfo.code) ||
                (statusCode >= 500 && statusCode <= 504));
        }
    },
    _a.methods = [HttpMethods_1.default.Get, HttpMethods_1.default.Delete, HttpMethods_1.default.Post, HttpMethods_1.default.Put, HttpMethods_1.default.Patch],
    _a.methodsWithoutBody = [HttpMethods_1.default.Get, HttpMethods_1.default.Delete],
    _a.methodsWithBody = [HttpMethods_1.default.Post, HttpMethods_1.default.Put, HttpMethods_1.default.Patch],
    _a);
exports["default"] = Http;


/***/ }),

/***/ 3277:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(7582);
const errorinfo_1 = tslib_1.__importStar(__webpack_require__(1798));
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
const defaults_1 = tslib_1.__importDefault(__webpack_require__(3925));
const Utils = tslib_1.__importStar(__webpack_require__(2678));
function isAblyError(responseBody, headers) {
    return !!headers.get('x-ably-errorcode');
}
function getAblyError(responseBody, headers) {
    if (isAblyError(responseBody, headers)) {
        return responseBody.error && errorinfo_1.default.fromValues(responseBody.error);
    }
}
function convertHeaders(headers) {
    const result = {};
    headers.forEach((value, key) => {
        result[key] = value;
    });
    return result;
}
async function fetchRequest(method, client, uri, headers, params, body) {
    const fetchHeaders = new Headers(headers || {});
    const _method = method ? method.toUpperCase() : Utils.isNil(body) ? 'GET' : 'POST';
    const controller = new AbortController();
    let timeout; // This way we don’t have to worry about the fact that the TypeScript compiler is — for reasons I haven’t looked into — picking up the signature of the Node version of setTimeout, which has a different return type to the web one
    const timeoutPromise = new Promise((resolve) => {
        timeout = setTimeout(() => {
            controller.abort();
            // When AbortController.abort() is called, the fetch() promise rejects with a DOMException named AbortError (source: https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
            // However, we beat it in the Promise.race() by resolving our custom 'Request timed out' error on the next line, thereby exposing users to the better-formatted error.
            resolve({ error: new errorinfo_1.PartialErrorInfo('Request timed out', null, 408) });
        }, client ? client.options.timeouts.httpRequestTimeout : defaults_1.default.TIMEOUTS.httpRequestTimeout);
    });
    const requestInit = {
        method: _method,
        headers: fetchHeaders,
        body: body,
        signal: controller.signal,
    };
    if (!platform_1.default.Config.isWebworker) {
        requestInit.credentials = fetchHeaders.has('authorization') ? 'include' : 'same-origin';
    }
    const resultPromise = (async () => {
        try {
            const urlParams = new URLSearchParams(params || {});
            urlParams.set('rnd', Utils.cheapRandStr());
            const preparedURI = uri + '?' + urlParams;
            const res = await Utils.getGlobalObject().fetch(preparedURI, requestInit);
            clearTimeout(timeout);
            if (res.status == 204) {
                return { error: null, statusCode: res.status };
            }
            const contentType = res.headers.get('Content-Type');
            let body;
            if (contentType && contentType.indexOf('application/x-msgpack') > -1) {
                body = await res.arrayBuffer();
            }
            else if (contentType && contentType.indexOf('application/json') > -1) {
                body = await res.json();
            }
            else {
                body = await res.text();
            }
            const unpacked = !!contentType && contentType.indexOf('application/x-msgpack') === -1;
            const headers = convertHeaders(res.headers);
            if (!res.ok) {
                const error = getAblyError(body, res.headers) ||
                    new errorinfo_1.PartialErrorInfo('Error response received from server: ' + res.status + ' body was: ' + platform_1.default.Config.inspect(body), null, res.status);
                return { error, body, headers, unpacked, statusCode: res.status };
            }
            else {
                return { error: null, body, headers, unpacked, statusCode: res.status };
            }
        }
        catch (error) {
            clearTimeout(timeout);
            return { error: error };
        }
    })();
    return Promise.race([timeoutPromise, resultPromise]);
}
exports["default"] = fetchRequest;


/***/ }),

/***/ 2492:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.modularBundledRequestImplementations = exports.defaultBundledRequestImplementations = void 0;
const tslib_1 = __webpack_require__(7582);
const xhrrequest_1 = tslib_1.__importDefault(__webpack_require__(9869));
const fetchrequest_1 = tslib_1.__importDefault(__webpack_require__(3277));
exports.defaultBundledRequestImplementations = {
    XHRRequest: xhrrequest_1.default,
    FetchRequest: fetchrequest_1.default,
};
exports.modularBundledRequestImplementations = {};


/***/ }),

/***/ 9869:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(7582);
const Utils = tslib_1.__importStar(__webpack_require__(2678));
const eventemitter_1 = tslib_1.__importDefault(__webpack_require__(3388));
const errorinfo_1 = tslib_1.__importStar(__webpack_require__(1798));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const defaults_1 = tslib_1.__importDefault(__webpack_require__(3925));
const XHRStates_1 = tslib_1.__importDefault(__webpack_require__(6882));
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
function isAblyError(responseBody, headers) {
    return Utils.allToLowerCase(Utils.keysArray(headers)).includes('x-ably-errorcode');
}
function getAblyError(responseBody, headers) {
    if (isAblyError(responseBody, headers)) {
        return responseBody.error && errorinfo_1.default.fromValues(responseBody.error);
    }
}
const noop = function () { };
let idCounter = 0;
const pendingRequests = {};
function getHeader(xhr, header) {
    return xhr.getResponseHeader && xhr.getResponseHeader(header);
}
/* Safari mysteriously returns 'Identity' for transfer-encoding when in fact
 * it is 'chunked'. So instead, decide that it is chunked when
 * transfer-encoding is present or content-length is absent.  ('or' because
 * when using http2 streaming, there's no transfer-encoding header, but can
 * still deduce streaming from lack of content-length) */
function isEncodingChunked(xhr) {
    return (xhr.getResponseHeader && (xhr.getResponseHeader('transfer-encoding') || !xhr.getResponseHeader('content-length')));
}
function getHeadersAsObject(xhr) {
    const headerPairs = xhr.getAllResponseHeaders().trim().split('\r\n');
    const headers = {};
    for (let i = 0; i < headerPairs.length; i++) {
        const parts = headerPairs[i].split(':').map((x) => x.trim());
        headers[parts[0].toLowerCase()] = parts[1];
    }
    return headers;
}
class XHRRequest extends eventemitter_1.default {
    constructor(uri, headers, params, body, requestMode, timeouts, logger, method) {
        super(logger);
        params = params || {};
        params.rnd = Utils.cheapRandStr();
        this.uri = uri + Utils.toQueryString(params);
        this.headers = headers || {};
        this.body = body;
        this.method = method ? method.toUpperCase() : Utils.isNil(body) ? 'GET' : 'POST';
        this.requestMode = requestMode;
        this.timeouts = timeouts;
        this.timedOut = false;
        this.requestComplete = false;
        this.id = String(++idCounter);
        pendingRequests[this.id] = this;
    }
    static createRequest(uri, headers, params, body, requestMode, timeouts, logger, method) {
        /* XHR requests are used either with the context being a realtime
         * transport, or with timeouts passed in (for when used by a rest client),
         * or completely standalone.  Use the appropriate timeouts in each case */
        const _timeouts = timeouts || defaults_1.default.TIMEOUTS;
        return new XHRRequest(uri, headers, Utils.copy(params), body, requestMode, _timeouts, logger, method);
    }
    complete(err, body, headers, unpacked, statusCode) {
        if (!this.requestComplete) {
            this.requestComplete = true;
            if (!err && body) {
                this.emit('data', body);
            }
            this.emit('complete', err, body, headers, unpacked, statusCode);
            this.dispose();
        }
    }
    abort() {
        this.dispose();
    }
    exec() {
        let headers = this.headers;
        const timeout = this.requestMode == XHRStates_1.default.REQ_SEND ? this.timeouts.httpRequestTimeout : this.timeouts.recvTimeout, timer = (this.timer = setTimeout(() => {
            this.timedOut = true;
            xhr.abort();
        }, timeout)), method = this.method, xhr = (this.xhr = new XMLHttpRequest()), accept = headers['accept'];
        let body = this.body;
        let responseType = 'text';
        if (!accept) {
            // Default to JSON
            headers['accept'] = 'application/json';
        }
        else if (accept.indexOf('application/x-msgpack') === 0) {
            // Msgpack responses will be typed as ArrayBuffer
            responseType = 'arraybuffer';
        }
        if (body) {
            const contentType = headers['content-type'] || (headers['content-type'] = 'application/json');
            if (contentType.indexOf('application/json') > -1 && typeof body != 'string')
                body = JSON.stringify(body);
        }
        // Can probably remove this directive if https://github.com/nodesecurity/eslint-plugin-security/issues/26 is resolved
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        xhr.open(method, this.uri, true);
        xhr.responseType = responseType;
        if ('authorization' in headers) {
            xhr.withCredentials = true;
        }
        for (const h in headers)
            xhr.setRequestHeader(h, headers[h]);
        const errorHandler = (errorEvent, message, code, statusCode) => {
            var _a;
            let errorMessage = message + ' (event type: ' + errorEvent.type + ')';
            if ((_a = this === null || this === void 0 ? void 0 : this.xhr) === null || _a === void 0 ? void 0 : _a.statusText)
                errorMessage += ', current statusText is ' + this.xhr.statusText;
            logger_1.default.logAction(this.logger, logger_1.default.LOG_ERROR, 'Request.on' + errorEvent.type + '()', errorMessage);
            this.complete(new errorinfo_1.PartialErrorInfo(errorMessage, code, statusCode));
        };
        xhr.onerror = function (errorEvent) {
            errorHandler(errorEvent, 'XHR error occurred', null, 400);
        };
        xhr.onabort = (errorEvent) => {
            if (this.timedOut) {
                errorHandler(errorEvent, 'Request aborted due to request timeout expiring', null, 408);
            }
            else {
                errorHandler(errorEvent, 'Request cancelled', null, 400);
            }
        };
        xhr.ontimeout = function (errorEvent) {
            errorHandler(errorEvent, 'Request timed out', null, 408);
        };
        let streaming;
        let statusCode;
        let successResponse;
        let streamPos = 0;
        let unpacked = false;
        const onResponse = () => {
            clearTimeout(timer);
            successResponse = statusCode < 400;
            if (statusCode == 204) {
                this.complete(null, null, null, null, statusCode);
                return;
            }
            streaming = this.requestMode == XHRStates_1.default.REQ_RECV_STREAM && successResponse && isEncodingChunked(xhr);
        };
        const onEnd = () => {
            let parsedResponse;
            try {
                const contentType = getHeader(xhr, 'content-type');
                /* Be liberal in what we accept; buggy auth servers may respond
                 * without the correct contenttype, but assume they're still
                 * responding with json */
                const json = contentType ? contentType.indexOf('application/json') >= 0 : xhr.responseType == 'text';
                if (json) {
                    /* If we requested msgpack but server responded with json, then since
                     * we set the responseType expecting msgpack, the response will be
                     * an ArrayBuffer containing json */
                    const jsonResponseBody = xhr.responseType === 'arraybuffer'
                        ? platform_1.default.BufferUtils.utf8Decode(xhr.response)
                        : String(xhr.responseText);
                    if (jsonResponseBody.length) {
                        parsedResponse = JSON.parse(jsonResponseBody);
                    }
                    else {
                        parsedResponse = jsonResponseBody;
                    }
                    unpacked = true;
                }
                else {
                    parsedResponse = xhr.response;
                }
                if (parsedResponse.response !== undefined) {
                    /* unwrap JSON envelope */
                    statusCode = parsedResponse.statusCode;
                    successResponse = statusCode < 400;
                    headers = parsedResponse.headers;
                    parsedResponse = parsedResponse.response;
                }
                else {
                    headers = getHeadersAsObject(xhr);
                }
            }
            catch (e) {
                this.complete(new errorinfo_1.PartialErrorInfo('Malformed response body from server: ' + e.message, null, 400));
                return;
            }
            /* If response is an array, it's an array of protocol messages -- even if
             * is contains an error action (hence the nonsuccess statuscode), we can
             * consider the request to have succeeded, just pass it on to
             * onProtocolMessage to decide what to do */
            if (successResponse || Array.isArray(parsedResponse)) {
                this.complete(null, parsedResponse, headers, unpacked, statusCode);
                return;
            }
            let err = getAblyError(parsedResponse, headers);
            if (!err) {
                err = new errorinfo_1.PartialErrorInfo('Error response received from server: ' +
                    statusCode +
                    ' body was: ' +
                    platform_1.default.Config.inspect(parsedResponse), null, statusCode);
            }
            this.complete(err, parsedResponse, headers, unpacked, statusCode);
        };
        function onProgress() {
            const responseText = xhr.responseText;
            const bodyEnd = responseText.length - 1;
            let idx, chunk;
            while (streamPos < bodyEnd && (idx = responseText.indexOf('\n', streamPos)) > -1) {
                chunk = responseText.slice(streamPos, idx);
                streamPos = idx + 1;
                onChunk(chunk);
            }
        }
        const onChunk = (chunk) => {
            try {
                chunk = JSON.parse(chunk);
            }
            catch (e) {
                this.complete(new errorinfo_1.PartialErrorInfo('Malformed response body from server: ' + e.message, null, 400));
                return;
            }
            this.emit('data', chunk);
        };
        const onStreamEnd = () => {
            onProgress();
            this.streamComplete = true;
            platform_1.default.Config.nextTick(() => {
                this.complete();
            });
        };
        xhr.onreadystatechange = function () {
            const readyState = xhr.readyState;
            if (readyState < 3)
                return;
            if (xhr.status !== 0) {
                if (statusCode === undefined) {
                    statusCode = xhr.status;
                    onResponse();
                }
                if (readyState == 3 && streaming) {
                    onProgress();
                }
                else if (readyState == 4) {
                    if (streaming)
                        onStreamEnd();
                    else
                        onEnd();
                }
            }
        };
        xhr.send(body);
    }
    dispose() {
        const xhr = this.xhr;
        if (xhr) {
            xhr.onreadystatechange = xhr.onerror = xhr.onabort = xhr.ontimeout = noop;
            this.xhr = null;
            const timer = this.timer;
            if (timer) {
                clearTimeout(timer);
                this.timer = null;
            }
            if (!this.requestComplete)
                xhr.abort();
        }
        delete pendingRequests[this.id];
    }
}
exports["default"] = XHRRequest;


/***/ }),

/***/ 5655:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ModularTransports = void 0;
const tslib_1 = __webpack_require__(7582);
const xhrpollingtransport_1 = tslib_1.__importDefault(__webpack_require__(8852));
const websockettransport_1 = tslib_1.__importDefault(__webpack_require__(2346));
// For reasons that I don’t understand, if we use [TransportNames.XhrPolling] for the keys in defaultTransports’s, then defaultTransports does not get tree-shaken. Hence using literals instead. They’re still correctly type-checked.
const order = ['xhr_polling'];
const defaultTransports = {
    order,
    bundledImplementations: {
        web_socket: websockettransport_1.default,
        xhr_polling: xhrpollingtransport_1.default,
    },
};
exports["default"] = defaultTransports;
exports.ModularTransports = {
    order,
    bundledImplementations: {},
};


/***/ }),

/***/ 8852:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(7582);
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
const comettransport_1 = tslib_1.__importDefault(__webpack_require__(3546));
const xhrrequest_1 = tslib_1.__importDefault(__webpack_require__(9869));
const TransportName_1 = __webpack_require__(1228);
var shortName = TransportName_1.TransportNames.XhrPolling;
class XHRPollingTransport extends comettransport_1.default {
    constructor(connectionManager, auth, params) {
        super(connectionManager, auth, params);
        this.shortName = shortName;
        params.stream = false;
        this.shortName = shortName;
    }
    static isAvailable() {
        return !!(platform_1.default.Config.xhrSupported && platform_1.default.Config.allowComet);
    }
    toString() {
        return 'XHRPollingTransport; uri=' + this.baseUri + '; isConnected=' + this.isConnected;
    }
    createRequest(uri, headers, params, body, requestMode) {
        return xhrrequest_1.default.createRequest(uri, headers, params, body, requestMode, this.timeouts, this.logger);
    }
}
exports["default"] = XHRPollingTransport;


/***/ }),

/***/ 1752:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(7582);
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
const hmac_sha256_1 = __webpack_require__(3330);
class BufferUtils {
    constructor() {
        this.base64CharSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        this.hexCharSet = '0123456789abcdef';
    }
    // https://gist.githubusercontent.com/jonleighton/958841/raw/f200e30dfe95212c0165ccf1ae000ca51e9de803/gistfile1.js
    uint8ViewToBase64(bytes) {
        let base64 = '';
        const encodings = this.base64CharSet;
        const byteLength = bytes.byteLength;
        const byteRemainder = byteLength % 3;
        const mainLength = byteLength - byteRemainder;
        let a, b, c, d;
        let chunk;
        // Main loop deals with bytes in chunks of 3
        for (let i = 0; i < mainLength; i = i + 3) {
            // Combine the three bytes into a single integer
            chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
            // Use bitmasks to extract 6-bit segments from the triplet
            a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
            b = (chunk & 258048) >> 12; // 258048   = (2^6 - 1) << 12
            c = (chunk & 4032) >> 6; // 4032     = (2^6 - 1) << 6
            d = chunk & 63; // 63       = 2^6 - 1
            // Convert the raw binary segments to the appropriate ASCII encoding
            base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
        }
        // Deal with the remaining bytes and padding
        if (byteRemainder == 1) {
            chunk = bytes[mainLength];
            a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2
            // Set the 4 least significant bits to zero
            b = (chunk & 3) << 4; // 3   = 2^2 - 1
            base64 += encodings[a] + encodings[b] + '==';
        }
        else if (byteRemainder == 2) {
            chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];
            a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
            b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4
            // Set the 2 least significant bits to zero
            c = (chunk & 15) << 2; // 15    = 2^4 - 1
            base64 += encodings[a] + encodings[b] + encodings[c] + '=';
        }
        return base64;
    }
    base64ToArrayBuffer(base64) {
        const binary_string = atob === null || atob === void 0 ? void 0 : atob(base64); // this will always be defined in browser so it's safe to cast
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            const ascii = binary_string.charCodeAt(i);
            bytes[i] = ascii;
        }
        return this.toArrayBuffer(bytes);
    }
    isBuffer(buffer) {
        return buffer instanceof ArrayBuffer || ArrayBuffer.isView(buffer);
    }
    toBuffer(buffer) {
        if (!ArrayBuffer) {
            throw new Error("Can't convert to Buffer: browser does not support the necessary types");
        }
        if (buffer instanceof ArrayBuffer) {
            return new Uint8Array(buffer);
        }
        if (ArrayBuffer.isView(buffer)) {
            return new Uint8Array(this.toArrayBuffer(buffer));
        }
        throw new Error('BufferUtils.toBuffer expected an ArrayBuffer or a view onto one');
    }
    toArrayBuffer(buffer) {
        if (!ArrayBuffer) {
            throw new Error("Can't convert to ArrayBuffer: browser does not support the necessary types");
        }
        if (buffer instanceof ArrayBuffer) {
            return buffer;
        }
        if (ArrayBuffer.isView(buffer)) {
            return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        }
        throw new Error('BufferUtils.toArrayBuffer expected an ArrayBuffer or a view onto one');
    }
    base64Encode(buffer) {
        return this.uint8ViewToBase64(this.toBuffer(buffer));
    }
    base64Decode(str) {
        if (ArrayBuffer && platform_1.default.Config.atob) {
            return this.base64ToArrayBuffer(str);
        }
        else {
            throw new Error('Expected ArrayBuffer to exist and Platform.Config.atob to be configured');
        }
    }
    hexEncode(buffer) {
        const uint8Array = this.toBuffer(buffer);
        return uint8Array.reduce((accum, byte) => accum + byte.toString(16).padStart(2, '0'), '');
    }
    hexDecode(hexEncodedBytes) {
        if (hexEncodedBytes.length % 2 !== 0) {
            throw new Error("Can't create a byte array from a hex string of odd length");
        }
        const uint8Array = new Uint8Array(hexEncodedBytes.length / 2);
        for (let i = 0; i < uint8Array.length; i++) {
            uint8Array[i] = parseInt(hexEncodedBytes.slice(2 * i, 2 * (i + 1)), 16);
        }
        return this.toArrayBuffer(uint8Array);
    }
    utf8Encode(string) {
        if (platform_1.default.Config.TextEncoder) {
            const encodedByteArray = new platform_1.default.Config.TextEncoder().encode(string);
            return this.toArrayBuffer(encodedByteArray);
        }
        else {
            throw new Error('Expected TextEncoder to be configured');
        }
    }
    /* For utf8 decoding we apply slightly stricter input validation than to
     * hexEncode/base64Encode/etc: in those we accept anything that Buffer.from
     * can take (in particular allowing strings, which are just interpreted as
     * binary); here we ensure that the input is actually a buffer since trying
     * to utf8-decode a string to another string is almost certainly a mistake */
    utf8Decode(buffer) {
        if (!this.isBuffer(buffer)) {
            throw new Error('Expected input of utf8decode to be an arraybuffer or typed array');
        }
        if (TextDecoder) {
            return new TextDecoder().decode(buffer);
        }
        else {
            throw new Error('Expected TextDecoder to be configured');
        }
    }
    areBuffersEqual(buffer1, buffer2) {
        if (!buffer1 || !buffer2)
            return false;
        const arrayBuffer1 = this.toArrayBuffer(buffer1);
        const arrayBuffer2 = this.toArrayBuffer(buffer2);
        if (arrayBuffer1.byteLength != arrayBuffer2.byteLength)
            return false;
        const bytes1 = new Uint8Array(arrayBuffer1);
        const bytes2 = new Uint8Array(arrayBuffer2);
        for (var i = 0; i < bytes1.length; i++) {
            if (bytes1[i] != bytes2[i])
                return false;
        }
        return true;
    }
    byteLength(buffer) {
        if (buffer instanceof ArrayBuffer || ArrayBuffer.isView(buffer)) {
            return buffer.byteLength;
        }
        return -1;
    }
    arrayBufferViewToBuffer(arrayBufferView) {
        return this.toArrayBuffer(arrayBufferView);
    }
    hmacSha256(message, key) {
        const hash = (0, hmac_sha256_1.hmac)(this.toBuffer(key), this.toBuffer(message));
        return this.toArrayBuffer(hash);
    }
}
exports["default"] = new BufferUtils();


/***/ }),

/***/ 2402:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createCryptoClass = void 0;
const tslib_1 = __webpack_require__(7582);
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const errorinfo_1 = tslib_1.__importDefault(__webpack_require__(1798));
var createCryptoClass = function (config, bufferUtils) {
    var DEFAULT_ALGORITHM = 'aes';
    var DEFAULT_KEYLENGTH = 256; // bits
    var DEFAULT_MODE = 'cbc';
    var DEFAULT_BLOCKLENGTH = 16; // bytes
    /**
     * Internal: checks that the cipherParams are a valid combination. Currently
     * just checks that the calculated keyLength is a valid one for aes-cbc
     */
    function validateCipherParams(params) {
        if (params.algorithm === 'aes' && params.mode === 'cbc') {
            if (params.keyLength === 128 || params.keyLength === 256) {
                return;
            }
            throw new Error('Unsupported key length ' +
                params.keyLength +
                ' for aes-cbc encryption. Encryption key must be 128 or 256 bits (16 or 32 ASCII characters)');
        }
    }
    function normaliseBase64(string) {
        /* url-safe base64 strings use _ and - instread of / and + */
        return string.replace('_', '/').replace('-', '+');
    }
    function isCipherParams(params) {
        // Although API.CipherParams is an interface, the documentation for its `key` property makes it clear that the only valid way to form one is by using getDefaultParams. The implementation of getDefaultParams returns an instance of CipherParams.
        return params instanceof CipherParams;
    }
    /**
     * A class encapsulating the client-specifiable parameters for
     * the cipher.
     *
     * algorithm is the name of the algorithm in the default system provider,
     * or the lower-cased version of it; eg "aes" or "AES".
     *
     * Clients are recommended to not call this directly, but instead to use the
     * Crypto.getDefaultParams helper, which will fill in any fields not supplied
     * with default values and validation the result.
     */
    class CipherParams {
        constructor(algorithm, keyLength, mode, key) {
            this.algorithm = algorithm;
            this.keyLength = keyLength;
            this.mode = mode;
            this.key = key;
        }
    }
    /**
     * Utility classes and interfaces for message payload encryption.
     *
     * This class supports AES/CBC/PKCS5 with a default keylength of 128 bits
     * but supporting other keylengths. Other algorithms and chaining modes are
     * not supported directly, but supportable by extending/implementing the base
     * classes and interfaces here.
     *
     * Secure random data for creation of Initialization Vectors (IVs) and keys
     * is obtained from window.crypto.getRandomValues.
     *
     * Each message payload is encrypted with an IV in CBC mode, and the IV is
     * concatenated with the resulting raw ciphertext to construct the "ciphertext"
     * data passed to the recipient.
     */
    class Crypto {
        /**
         * Obtain a complete CipherParams instance from the provided params, filling
         * in any not provided with default values, calculating a keyLength from
         * the supplied key, and validating the result.
         * @param params an object containing at a minimum a `key` key with value the
         * key, as either a binary or a base64-encoded string.
         * May optionally also contain: algorithm (defaults to AES),
         * mode (defaults to 'cbc')
         */
        static getDefaultParams(params) {
            var key;
            if (!params.key) {
                throw new Error('Crypto.getDefaultParams: a key is required');
            }
            if (typeof params.key === 'string') {
                key = bufferUtils.toArrayBuffer(bufferUtils.base64Decode(normaliseBase64(params.key)));
            }
            else if (params.key instanceof ArrayBuffer) {
                key = params.key;
            }
            else {
                key = bufferUtils.toArrayBuffer(params.key);
            }
            var algorithm = params.algorithm || DEFAULT_ALGORITHM;
            var keyLength = key.byteLength * 8;
            var mode = params.mode || DEFAULT_MODE;
            var cipherParams = new CipherParams(algorithm, keyLength, mode, key);
            if (params.keyLength && params.keyLength !== cipherParams.keyLength) {
                throw new Error('Crypto.getDefaultParams: a keyLength of ' +
                    params.keyLength +
                    ' was specified, but the key actually has length ' +
                    cipherParams.keyLength);
            }
            validateCipherParams(cipherParams);
            return cipherParams;
        }
        /**
         * Generate a random encryption key from the supplied keylength (or the
         * default keyLength if none supplied) as an ArrayBuffer
         * @param keyLength (optional) the required keyLength in bits
         */
        static async generateRandomKey(keyLength) {
            try {
                return config.getRandomArrayBuffer((keyLength || DEFAULT_KEYLENGTH) / 8);
            }
            catch (err) {
                throw new errorinfo_1.default('Failed to generate random key: ' + err.message, 400, 50000, err);
            }
        }
        /**
         * Internal; get a ChannelCipher instance based on the given cipherParams
         * @param params either a CipherParams instance or some subset of its
         * fields that includes a key
         */
        static getCipher(params, logger) {
            var _a;
            var cipherParams = isCipherParams(params) ? params : this.getDefaultParams(params);
            return {
                cipherParams: cipherParams,
                cipher: new CBCCipher(cipherParams, (_a = params.iv) !== null && _a !== void 0 ? _a : null, logger),
            };
        }
    }
    Crypto.CipherParams = CipherParams;
    Crypto;
    class CBCCipher {
        constructor(params, iv, logger) {
            this.logger = logger;
            if (!crypto.subtle) {
                if (isSecureContext) {
                    throw new Error('Crypto operations are not possible since the browser’s SubtleCrypto class is unavailable (reason unknown).');
                }
                else {
                    throw new Error('Crypto operations are is not possible since the current environment is a non-secure context and hence the browser’s SubtleCrypto class is not available.');
                }
            }
            this.algorithm = params.algorithm + '-' + String(params.keyLength) + '-' + params.mode;
            this.webCryptoAlgorithm = params.algorithm + '-' + params.mode;
            this.key = bufferUtils.toArrayBuffer(params.key);
            this.iv = iv ? bufferUtils.toArrayBuffer(iv) : null;
        }
        concat(buffer1, buffer2) {
            const output = new ArrayBuffer(buffer1.byteLength + buffer2.byteLength);
            const outputView = new DataView(output);
            const buffer1View = new DataView(bufferUtils.toArrayBuffer(buffer1));
            for (let i = 0; i < buffer1View.byteLength; i++) {
                outputView.setInt8(i, buffer1View.getInt8(i));
            }
            const buffer2View = new DataView(bufferUtils.toArrayBuffer(buffer2));
            for (let i = 0; i < buffer2View.byteLength; i++) {
                outputView.setInt8(buffer1View.byteLength + i, buffer2View.getInt8(i));
            }
            return output;
        }
        async encrypt(plaintext) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'CBCCipher.encrypt()', '');
            const iv = await this.getIv();
            const cryptoKey = await crypto.subtle.importKey('raw', this.key, this.webCryptoAlgorithm, false, ['encrypt']);
            const ciphertext = await crypto.subtle.encrypt({ name: this.webCryptoAlgorithm, iv }, cryptoKey, plaintext);
            return this.concat(iv, ciphertext);
        }
        async decrypt(ciphertext) {
            logger_1.default.logAction(this.logger, logger_1.default.LOG_MICRO, 'CBCCipher.decrypt()', '');
            const ciphertextArrayBuffer = bufferUtils.toArrayBuffer(ciphertext);
            const iv = ciphertextArrayBuffer.slice(0, DEFAULT_BLOCKLENGTH);
            const ciphertextBody = ciphertextArrayBuffer.slice(DEFAULT_BLOCKLENGTH);
            const cryptoKey = await crypto.subtle.importKey('raw', this.key, this.webCryptoAlgorithm, false, ['decrypt']);
            return crypto.subtle.decrypt({ name: this.webCryptoAlgorithm, iv }, cryptoKey, ciphertextBody);
        }
        async getIv() {
            if (this.iv) {
                var iv = this.iv;
                this.iv = null;
                return iv;
            }
            const randomBlock = await config.getRandomArrayBuffer(DEFAULT_BLOCKLENGTH);
            return bufferUtils.toArrayBuffer(randomBlock);
        }
    }
    return Crypto;
};
exports.createCryptoClass = createCryptoClass;


/***/ }),

/***/ 4074:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const TransportName_1 = __webpack_require__(1228);
const Defaults = {
    connectivityCheckUrl: 'https://internet-up.ably-realtime.com/is-the-internet-up.txt',
    wsConnectivityCheckUrl: 'wss://ws-up.ably-realtime.com',
    /* Order matters here: the base transport is the leftmost one in the
     * intersection of baseTransportOrder and the transports clientOption that's
     * supported. */
    defaultTransports: [TransportName_1.TransportNames.XhrPolling, TransportName_1.TransportNames.WebSocket],
};
exports["default"] = Defaults;


/***/ }),

/***/ 3330:
/***/ ((__unused_webpack_module, exports) => {


/**
 * Copied from https://gist.github.com/stevendesu/2d52f7b5e1f1184af3b667c0b5e054b8
 *
 * "A simple, open-source, HMAC-SHA256 implementation in pure JavaScript. Designed for efficient minification."
 *
 * I asked about licensing, and the author said:
 *
 * > Feel free to use it however you'd like 😄 As the gist title indicates,
 * > this is "a simple open source implementation". Feel free to choose whatever
 * > license you find most permissible, but I offer no warranty for the code.
 * > It's 100% free to do with as you please.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.hmac = void 0;
// To ensure cross-browser support even without a proper SubtleCrypto
// impelmentation (or without access to the impelmentation, as is the case with
// Chrome loaded over HTTP instead of HTTPS), this library can create SHA-256
// HMAC signatures using nothing but raw JavaScript
/* eslint-disable no-magic-numbers, id-length, no-param-reassign, new-cap */
// By giving internal functions names that we can mangle, future calls to
// them are reduced to a single byte (minor space savings in minified file)
var uint8Array = Uint8Array;
var uint32Array = Uint32Array;
var pow = Math.pow;
// Will be initialized below
// Using a Uint32Array instead of a simple array makes the minified code
// a bit bigger (we lose our `unshift()` hack), but comes with huge
// performance gains
var DEFAULT_STATE = new uint32Array(8);
var ROUND_CONSTANTS = [];
// Reusable object for expanded message
// Using a Uint32Array instead of a simple array makes the minified code
// 7 bytes larger, but comes with huge performance gains
var M = new uint32Array(64);
// After minification the code to compute the default state and round
// constants is smaller than the output. More importantly, this serves as a
// good educational aide for anyone wondering where the magic numbers come
// from. No magic numbers FTW!
function getFractionalBits(n) {
    return ((n - (n | 0)) * pow(2, 32)) | 0;
}
var n = 2, nPrime = 0;
while (nPrime < 64) {
    // isPrime() was in-lined from its original function form to save
    // a few bytes
    var isPrime = true;
    // Math.sqrt() was replaced with pow(n, 1/2) to save a few bytes
    // var sqrtN = pow(n, 1 / 2);
    // So technically to determine if a number is prime you only need to
    // check numbers up to the square root. However this function only runs
    // once and we're only computing the first 64 primes (up to 311), so on
    // any modern CPU this whole function runs in a couple milliseconds.
    // By going to n / 2 instead of sqrt(n) we net 8 byte savings and no
    // scaling performance cost
    for (var factor = 2; factor <= n / 2; factor++) {
        if (n % factor === 0) {
            isPrime = false;
        }
    }
    if (isPrime) {
        if (nPrime < 8) {
            DEFAULT_STATE[nPrime] = getFractionalBits(pow(n, 1 / 2));
        }
        ROUND_CONSTANTS[nPrime] = getFractionalBits(pow(n, 1 / 3));
        nPrime++;
    }
    n++;
}
// For cross-platform support we need to ensure that all 32-bit words are
// in the same endianness. A UTF-8 TextEncoder will return BigEndian data,
// so upon reading or writing to our ArrayBuffer we'll only swap the bytes
// if our system is LittleEndian (which is about 99% of CPUs)
var LittleEndian = !!new uint8Array(new uint32Array([1]).buffer)[0];
function convertEndian(word) {
    if (LittleEndian) {
        return (
        // byte 1 -> byte 4
        (word >>> 24) |
            // byte 2 -> byte 3
            (((word >>> 16) & 0xff) << 8) |
            // byte 3 -> byte 2
            ((word & 0xff00) << 8) |
            // byte 4 -> byte 1
            (word << 24));
    }
    else {
        return word;
    }
}
function rightRotate(word, bits) {
    return (word >>> bits) | (word << (32 - bits));
}
function sha256(data) {
    // Copy default state
    var STATE = DEFAULT_STATE.slice();
    // Caching this reduces occurrences of ".length" in minified JavaScript
    // 3 more byte savings! :D
    var legth = data.length;
    // Pad data
    var bitLength = legth * 8;
    var newBitLength = 512 - ((bitLength + 64) % 512) - 1 + bitLength + 65;
    // "bytes" and "words" are stored BigEndian
    var bytes = new uint8Array(newBitLength / 8);
    var words = new uint32Array(bytes.buffer);
    bytes.set(data, 0);
    // Append a 1
    bytes[legth] = 0b10000000;
    // Store length in BigEndian
    words[words.length - 1] = convertEndian(bitLength);
    // Loop iterator (avoid two instances of "var") -- saves 2 bytes
    var round;
    // Process blocks (512 bits / 64 bytes / 16 words at a time)
    for (var block = 0; block < newBitLength / 32; block += 16) {
        var workingState = STATE.slice();
        // Rounds
        for (round = 0; round < 64; round++) {
            var MRound;
            // Expand message
            if (round < 16) {
                // Convert to platform Endianness for later math
                MRound = convertEndian(words[block + round]);
            }
            else {
                var gamma0x = M[round - 15];
                var gamma1x = M[round - 2];
                MRound =
                    M[round - 7] +
                        M[round - 16] +
                        (rightRotate(gamma0x, 7) ^ rightRotate(gamma0x, 18) ^ (gamma0x >>> 3)) +
                        (rightRotate(gamma1x, 17) ^ rightRotate(gamma1x, 19) ^ (gamma1x >>> 10));
            }
            // M array matches platform endianness
            M[round] = MRound |= 0;
            // Computation
            var t1 = (rightRotate(workingState[4], 6) ^ rightRotate(workingState[4], 11) ^ rightRotate(workingState[4], 25)) +
                ((workingState[4] & workingState[5]) ^ (~workingState[4] & workingState[6])) +
                workingState[7] +
                MRound +
                ROUND_CONSTANTS[round];
            var t2 = (rightRotate(workingState[0], 2) ^ rightRotate(workingState[0], 13) ^ rightRotate(workingState[0], 22)) +
                ((workingState[0] & workingState[1]) ^ (workingState[2] & (workingState[0] ^ workingState[1])));
            for (var i = 7; i > 0; i--) {
                workingState[i] = workingState[i - 1];
            }
            workingState[0] = (t1 + t2) | 0;
            workingState[4] = (workingState[4] + t1) | 0;
        }
        // Update state
        for (round = 0; round < 8; round++) {
            STATE[round] = (STATE[round] + workingState[round]) | 0;
        }
    }
    // Finally the state needs to be converted to BigEndian for output
    // And we want to return a Uint8Array, not a Uint32Array
    return new uint8Array(new uint32Array(STATE.map(function (val) {
        return convertEndian(val);
    })).buffer);
}
function hmac(key, data) {
    if (key.length > 64)
        key = sha256(key);
    if (key.length < 64) {
        const tmp = new Uint8Array(64);
        tmp.set(key, 0);
        key = tmp;
    }
    // Generate inner and outer keys
    var innerKey = new Uint8Array(64);
    var outerKey = new Uint8Array(64);
    for (var i = 0; i < 64; i++) {
        innerKey[i] = 0x36 ^ key[i];
        outerKey[i] = 0x5c ^ key[i];
    }
    // Append the innerKey
    var msg = new Uint8Array(data.length + 64);
    msg.set(innerKey, 0);
    msg.set(data, 64);
    // Has the previous message and append the outerKey
    var result = new Uint8Array(64 + 32);
    result.set(outerKey, 0);
    result.set(sha256(msg), 64);
    // Hash the previous message
    return sha256(result);
}
exports.hmac = hmac;


/***/ }),

/***/ 6007:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
function inspect(buffer) {
    if (buffer === undefined)
        return 'undefined';
    let view;
    let type;
    if (buffer instanceof ArrayBuffer) {
        type = 'ArrayBuffer';
        view = new DataView(buffer);
    }
    else if (buffer instanceof DataView) {
        type = 'DataView';
        view = buffer;
    }
    if (!view)
        return JSON.stringify(buffer);
    const bytes = [];
    for (let i = 0; i < buffer.byteLength; i++) {
        if (i > 20) {
            bytes.push('...');
            break;
        }
        let byte_ = view.getUint8(i).toString(16);
        if (byte_.length === 1)
            byte_ = '0' + byte_;
        bytes.push(byte_);
    }
    return '<' + type + ' ' + bytes.join(' ') + '>';
}
// Encode string as utf8 into dataview at offset
function utf8Write(view, offset, string) {
    for (let i = 0, l = string.length; i < l; i++) {
        const codePoint = string.charCodeAt(i);
        // One byte of UTF-8
        if (codePoint < 0x80) {
            view.setUint8(offset++, ((codePoint >>> 0) & 0x7f) | 0x00);
            continue;
        }
        // Two bytes of UTF-8
        if (codePoint < 0x800) {
            view.setUint8(offset++, ((codePoint >>> 6) & 0x1f) | 0xc0);
            view.setUint8(offset++, ((codePoint >>> 0) & 0x3f) | 0x80);
            continue;
        }
        // Three bytes of UTF-8.
        if (codePoint < 0x10000) {
            view.setUint8(offset++, ((codePoint >>> 12) & 0x0f) | 0xe0);
            view.setUint8(offset++, ((codePoint >>> 6) & 0x3f) | 0x80);
            view.setUint8(offset++, ((codePoint >>> 0) & 0x3f) | 0x80);
            continue;
        }
        // Four bytes of UTF-8
        if (codePoint < 0x110000) {
            view.setUint8(offset++, ((codePoint >>> 18) & 0x07) | 0xf0);
            view.setUint8(offset++, ((codePoint >>> 12) & 0x3f) | 0x80);
            view.setUint8(offset++, ((codePoint >>> 6) & 0x3f) | 0x80);
            view.setUint8(offset++, ((codePoint >>> 0) & 0x3f) | 0x80);
            continue;
        }
        throw new Error('bad codepoint ' + codePoint);
    }
}
function utf8Read(view, offset, length) {
    let string = '';
    for (let i = offset, end = offset + length; i < end; i++) {
        const byte_ = view.getUint8(i);
        // One byte character
        if ((byte_ & 0x80) === 0x00) {
            string += String.fromCharCode(byte_);
            continue;
        }
        // Two byte character
        if ((byte_ & 0xe0) === 0xc0) {
            string += String.fromCharCode(((byte_ & 0x0f) << 6) | (view.getUint8(++i) & 0x3f));
            continue;
        }
        // Three byte character
        if ((byte_ & 0xf0) === 0xe0) {
            string += String.fromCharCode(((byte_ & 0x0f) << 12) | ((view.getUint8(++i) & 0x3f) << 6) | ((view.getUint8(++i) & 0x3f) << 0));
            continue;
        }
        // Four byte character
        if ((byte_ & 0xf8) === 0xf0) {
            string += String.fromCharCode(((byte_ & 0x07) << 18) |
                ((view.getUint8(++i) & 0x3f) << 12) |
                ((view.getUint8(++i) & 0x3f) << 6) |
                ((view.getUint8(++i) & 0x3f) << 0));
            continue;
        }
        throw new Error('Invalid byte ' + byte_.toString(16));
    }
    return string;
}
function utf8ByteCount(string) {
    let count = 0;
    for (let i = 0, l = string.length; i < l; i++) {
        const codePoint = string.charCodeAt(i);
        if (codePoint < 0x80) {
            count += 1;
            continue;
        }
        if (codePoint < 0x800) {
            count += 2;
            continue;
        }
        if (codePoint < 0x10000) {
            count += 3;
            continue;
        }
        if (codePoint < 0x110000) {
            count += 4;
            continue;
        }
        throw new Error('bad codepoint ' + codePoint);
    }
    return count;
}
function encode(value, sparse) {
    const size = sizeof(value, sparse);
    if (size === 0)
        return undefined;
    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);
    _encode(value, view, 0, sparse);
    return buffer;
}
const SH_L_32 = (1 << 16) * (1 << 16), SH_R_32 = 1 / SH_L_32;
function getInt64(view, offset) {
    offset = offset || 0;
    return view.getInt32(offset) * SH_L_32 + view.getUint32(offset + 4);
}
function getUint64(view, offset) {
    offset = offset || 0;
    return view.getUint32(offset) * SH_L_32 + view.getUint32(offset + 4);
}
function setInt64(view, offset, val) {
    if (val < 0x8000000000000000) {
        view.setInt32(offset, Math.floor(val * SH_R_32));
        view.setInt32(offset + 4, val & -1);
    }
    else {
        view.setUint32(offset, 0x7fffffff);
        view.setUint32(offset + 4, 0x7fffffff);
    }
}
function setUint64(view, offset, val) {
    if (val < 0x10000000000000000) {
        view.setUint32(offset, Math.floor(val * SH_R_32));
        view.setInt32(offset + 4, val & -1);
    }
    else {
        view.setUint32(offset, 0xffffffff);
        view.setUint32(offset + 4, 0xffffffff);
    }
}
// https://gist.github.com/frsyuki/5432559 - v5 spec
//
// I've used one extension point from `fixext 1` to store `undefined`. On the wire this
// should translate to exactly 0xd40000
//
// +--------+--------+--------+
// |  0xd4  |  0x00  |  0x00  |
// +--------+--------+--------+
//    ^ fixext |        ^ value part unused (fixed to be 0)
//             ^ indicates undefined value
//
class Decoder {
    constructor(view, offset) {
        this.map = (length) => {
            const value = {};
            for (let i = 0; i < length; i++) {
                const key = this.parse();
                value[key] = this.parse();
            }
            return value;
        };
        this.bin = (length) => {
            const value = new ArrayBuffer(length);
            new Uint8Array(value).set(new Uint8Array(this.view.buffer, this.offset, length), 0);
            this.offset += length;
            return value;
        };
        this.buf = this.bin;
        this.str = (length) => {
            const value = utf8Read(this.view, this.offset, length);
            this.offset += length;
            return value;
        };
        this.array = (length) => {
            const value = new Array(length);
            for (let i = 0; i < length; i++) {
                value[i] = this.parse();
            }
            return value;
        };
        this.ext = (length) => {
            this.offset += length;
            return {
                type: this.view.getInt8(this.offset),
                data: this.buf(length),
            };
        };
        this.parse = () => {
            const type = this.view.getUint8(this.offset);
            let value, length;
            // Positive FixInt - 0xxxxxxx
            if ((type & 0x80) === 0x00) {
                this.offset++;
                return type;
            }
            // FixMap - 1000xxxx
            if ((type & 0xf0) === 0x80) {
                length = type & 0x0f;
                this.offset++;
                return this.map(length);
            }
            // FixArray - 1001xxxx
            if ((type & 0xf0) === 0x90) {
                length = type & 0x0f;
                this.offset++;
                return this.array(length);
            }
            // FixStr - 101xxxxx
            if ((type & 0xe0) === 0xa0) {
                length = type & 0x1f;
                this.offset++;
                return this.str(length);
            }
            // Negative FixInt - 111xxxxx
            if ((type & 0xe0) === 0xe0) {
                value = this.view.getInt8(this.offset);
                this.offset++;
                return value;
            }
            switch (type) {
                // nil
                case 0xc0:
                    this.offset++;
                    return null;
                // 0xc1 never used - use for undefined (NON-STANDARD)
                case 0xc1:
                    this.offset++;
                    return undefined;
                // false
                case 0xc2:
                    this.offset++;
                    return false;
                // true
                case 0xc3:
                    this.offset++;
                    return true;
                // bin 8
                case 0xc4:
                    length = this.view.getUint8(this.offset + 1);
                    this.offset += 2;
                    return this.bin(length);
                // bin 16
                case 0xc5:
                    length = this.view.getUint16(this.offset + 1);
                    this.offset += 3;
                    return this.bin(length);
                // bin 32
                case 0xc6:
                    length = this.view.getUint32(this.offset + 1);
                    this.offset += 5;
                    return this.bin(length);
                // ext 8
                case 0xc7:
                    length = this.view.getUint8(this.offset + 1);
                    this.offset += 2;
                    return this.ext(length);
                // ext 16
                case 0xc8:
                    length = this.view.getUint16(this.offset + 1);
                    this.offset += 3;
                    return this.ext(length);
                // ext 32
                case 0xc9:
                    length = this.view.getUint32(this.offset + 1);
                    this.offset += 5;
                    return this.ext(length);
                // float 32
                case 0xca:
                    value = this.view.getFloat32(this.offset + 1);
                    this.offset += 5;
                    return value;
                // float 64
                case 0xcb:
                    value = this.view.getFloat64(this.offset + 1);
                    this.offset += 9;
                    return value;
                // uint8
                case 0xcc:
                    value = this.view.getUint8(this.offset + 1);
                    this.offset += 2;
                    return value;
                // uint 16
                case 0xcd:
                    value = this.view.getUint16(this.offset + 1);
                    this.offset += 3;
                    return value;
                // uint 32
                case 0xce:
                    value = this.view.getUint32(this.offset + 1);
                    this.offset += 5;
                    return value;
                // uint 64
                case 0xcf:
                    value = getUint64(this.view, this.offset + 1);
                    this.offset += 9;
                    return value;
                // int 8
                case 0xd0:
                    value = this.view.getInt8(this.offset + 1);
                    this.offset += 2;
                    return value;
                // int 16
                case 0xd1:
                    value = this.view.getInt16(this.offset + 1);
                    this.offset += 3;
                    return value;
                // int 32
                case 0xd2:
                    value = this.view.getInt32(this.offset + 1);
                    this.offset += 5;
                    return value;
                // int 64
                case 0xd3:
                    value = getInt64(this.view, this.offset + 1);
                    this.offset += 9;
                    return value;
                // fixext 1
                case 0xd4:
                    length = 1;
                    this.offset++;
                    return this.ext(length);
                // fixext 2
                case 0xd5:
                    length = 2;
                    this.offset++;
                    return this.ext(length);
                // fixext 4
                case 0xd6:
                    length = 4;
                    this.offset++;
                    return this.ext(length);
                // fixext 8
                case 0xd7:
                    length = 8;
                    this.offset++;
                    return this.ext(length);
                // fixext 16
                case 0xd8:
                    length = 16;
                    this.offset++;
                    return this.ext(length);
                // str8
                case 0xd9:
                    length = this.view.getUint8(this.offset + 1);
                    this.offset += 2;
                    return this.str(length);
                // str 16
                case 0xda:
                    length = this.view.getUint16(this.offset + 1);
                    this.offset += 3;
                    return this.str(length);
                // str 32
                case 0xdb:
                    length = this.view.getUint32(this.offset + 1);
                    this.offset += 5;
                    return this.str(length);
                // array 16
                case 0xdc:
                    length = this.view.getUint16(this.offset + 1);
                    this.offset += 3;
                    return this.array(length);
                // array 32
                case 0xdd:
                    length = this.view.getUint32(this.offset + 1);
                    this.offset += 5;
                    return this.array(length);
                // map 16
                case 0xde:
                    length = this.view.getUint16(this.offset + 1);
                    this.offset += 3;
                    return this.map(length);
                // map 32
                case 0xdf:
                    length = this.view.getUint32(this.offset + 1);
                    this.offset += 5;
                    return this.map(length);
            }
            throw new Error('Unknown type 0x' + type.toString(16));
        };
        this.offset = offset || 0;
        this.view = view;
    }
}
function decode(buffer) {
    const view = new DataView(buffer);
    const decoder = new Decoder(view);
    const value = decoder.parse();
    if (decoder.offset !== buffer.byteLength)
        throw new Error(buffer.byteLength - decoder.offset + ' trailing bytes');
    return value;
}
function encodeableKeys(value, sparse) {
    return Object.keys(value).filter(function (e) {
        const val = value[e], type = typeof val;
        return (!sparse || (val !== undefined && val !== null)) && ('function' !== type || !!val.toJSON);
    });
}
function _encode(value, view, offset, sparse) {
    const type = typeof value;
    // Strings Bytes
    // There are four string types: fixstr/str8/str16/str32
    if (typeof value === 'string') {
        const length = utf8ByteCount(value);
        // fixstr
        if (length < 0x20) {
            view.setUint8(offset, length | 0xa0);
            utf8Write(view, offset + 1, value);
            return 1 + length;
        }
        // str8
        if (length < 0x100) {
            view.setUint8(offset, 0xd9);
            view.setUint8(offset + 1, length);
            utf8Write(view, offset + 2, value);
            return 2 + length;
        }
        // str16
        if (length < 0x10000) {
            view.setUint8(offset, 0xda);
            view.setUint16(offset + 1, length);
            utf8Write(view, offset + 3, value);
            return 3 + length;
        }
        // str32
        if (length < 0x100000000) {
            view.setUint8(offset, 0xdb);
            view.setUint32(offset + 1, length);
            utf8Write(view, offset + 5, value);
            return 5 + length;
        }
    }
    if (ArrayBuffer.isView && ArrayBuffer.isView(value)) {
        // extract the arraybuffer and fallthrough
        value = value.buffer;
    }
    // There are three bin types: bin8/bin16/bin32
    if (value instanceof ArrayBuffer) {
        const length = value.byteLength;
        // bin8
        if (length < 0x100) {
            view.setUint8(offset, 0xc4);
            view.setUint8(offset + 1, length);
            new Uint8Array(view.buffer).set(new Uint8Array(value), offset + 2);
            return 2 + length;
        }
        // bin16
        if (length < 0x10000) {
            view.setUint8(offset, 0xc5);
            view.setUint16(offset + 1, length);
            new Uint8Array(view.buffer).set(new Uint8Array(value), offset + 3);
            return 3 + length;
        }
        // bin 32
        if (length < 0x100000000) {
            view.setUint8(offset, 0xc6);
            view.setUint32(offset + 1, length);
            new Uint8Array(view.buffer).set(new Uint8Array(value), offset + 5);
            return 5 + length;
        }
    }
    if (typeof value === 'number') {
        // Floating Point
        // NOTE: We're always using float64
        if (Math.floor(value) !== value) {
            view.setUint8(offset, 0xcb);
            view.setFloat64(offset + 1, value);
            return 9;
        }
        // Integers
        if (value >= 0) {
            // positive fixnum
            if (value < 0x80) {
                view.setUint8(offset, value);
                return 1;
            }
            // uint 8
            if (value < 0x100) {
                view.setUint8(offset, 0xcc);
                view.setUint8(offset + 1, value);
                return 2;
            }
            // uint 16
            if (value < 0x10000) {
                view.setUint8(offset, 0xcd);
                view.setUint16(offset + 1, value);
                return 3;
            }
            // uint 32
            if (value < 0x100000000) {
                view.setUint8(offset, 0xce);
                view.setUint32(offset + 1, value);
                return 5;
            }
            // uint 64
            if (value < 0x10000000000000000) {
                view.setUint8(offset, 0xcf);
                setUint64(view, offset + 1, value);
                return 9;
            }
            throw new Error('Number too big 0x' + value.toString(16));
        }
        // negative fixnum
        if (value >= -0x20) {
            view.setInt8(offset, value);
            return 1;
        }
        // int 8
        if (value >= -0x80) {
            view.setUint8(offset, 0xd0);
            view.setInt8(offset + 1, value);
            return 2;
        }
        // int 16
        if (value >= -0x8000) {
            view.setUint8(offset, 0xd1);
            view.setInt16(offset + 1, value);
            return 3;
        }
        // int 32
        if (value >= -0x80000000) {
            view.setUint8(offset, 0xd2);
            view.setInt32(offset + 1, value);
            return 5;
        }
        // int 64
        if (value >= -0x8000000000000000) {
            view.setUint8(offset, 0xd3);
            setInt64(view, offset + 1, value);
            return 9;
        }
        throw new Error('Number too small -0x' + (-value).toString(16).substr(1));
    }
    // undefined - use d4 (NON-STANDARD)
    if (type === 'undefined') {
        if (sparse)
            return 0;
        view.setUint8(offset, 0xd4);
        view.setUint8(offset + 1, 0x00);
        view.setUint8(offset + 2, 0x00);
        return 3;
    }
    // null
    if (value === null) {
        if (sparse)
            return 0;
        view.setUint8(offset, 0xc0);
        return 1;
    }
    // Boolean
    if (type === 'boolean') {
        view.setUint8(offset, value ? 0xc3 : 0xc2);
        return 1;
    }
    if ('function' === typeof value.toJSON)
        return _encode(value.toJSON(), view, offset, sparse);
    // Container Types
    if (type === 'object') {
        let length, size = 0;
        let keys;
        const isArray = Array.isArray(value);
        if (isArray) {
            length = value.length;
        }
        else {
            keys = encodeableKeys(value, sparse);
            length = keys.length;
        }
        if (length < 0x10) {
            view.setUint8(offset, length | (isArray ? 0x90 : 0x80));
            size = 1;
        }
        else if (length < 0x10000) {
            view.setUint8(offset, isArray ? 0xdc : 0xde);
            view.setUint16(offset + 1, length);
            size = 3;
        }
        else if (length < 0x100000000) {
            view.setUint8(offset, isArray ? 0xdd : 0xdf);
            view.setUint32(offset + 1, length);
            size = 5;
        }
        if (isArray) {
            for (let i = 0; i < length; i++) {
                size += _encode(value[i], view, offset + size, sparse);
            }
        }
        else if (keys) {
            for (let i = 0; i < length; i++) {
                const key = keys[i];
                size += _encode(key, view, offset + size);
                size += _encode(value[key], view, offset + size, sparse);
            }
        }
        return size;
    }
    if (type === 'function')
        return 0;
    throw new Error('Unknown type ' + type);
}
function sizeof(value, sparse) {
    const type = typeof value;
    // fixstr or str8 or str16 or str32
    if (type === 'string') {
        const length = utf8ByteCount(value);
        if (length < 0x20) {
            return 1 + length;
        }
        if (length < 0x100) {
            return 2 + length;
        }
        if (length < 0x10000) {
            return 3 + length;
        }
        if (length < 0x100000000) {
            return 5 + length;
        }
    }
    if (ArrayBuffer.isView && ArrayBuffer.isView(value)) {
        // extract the arraybuffer and fallthrough
        value = value.buffer;
    }
    // bin8 or bin16 or bin32
    if (value instanceof ArrayBuffer) {
        const length = value.byteLength;
        if (length < 0x100) {
            return 2 + length;
        }
        if (length < 0x10000) {
            return 3 + length;
        }
        if (length < 0x100000000) {
            return 5 + length;
        }
    }
    if (typeof value === 'number') {
        // Floating Point (32 bits)
        // double
        if (Math.floor(value) !== value)
            return 9;
        // Integers
        if (value >= 0) {
            // positive fixint
            if (value < 0x80)
                return 1;
            // uint 8
            if (value < 0x100)
                return 2;
            // uint 16
            if (value < 0x10000)
                return 3;
            // uint 32
            if (value < 0x100000000)
                return 5;
            // uint 64
            if (value < 0x10000000000000000)
                return 9;
            // Too big
            throw new Error('Number too big 0x' + value.toString(16));
        }
        // negative fixint
        if (value >= -0x20)
            return 1;
        // int 8
        if (value >= -0x80)
            return 2;
        // int 16
        if (value >= -0x8000)
            return 3;
        // int 32
        if (value >= -0x80000000)
            return 5;
        // int 64
        if (value >= -0x8000000000000000)
            return 9;
        // Too small
        throw new Error('Number too small -0x' + value.toString(16).substr(1));
    }
    // Boolean
    if (type === 'boolean')
        return 1;
    // undefined, null
    if (value === null)
        return sparse ? 0 : 1;
    if (value === undefined)
        return sparse ? 0 : 3;
    if ('function' === typeof value.toJSON)
        return sizeof(value.toJSON(), sparse);
    // Container Types
    if (type === 'object') {
        let length, size = 0;
        if (Array.isArray(value)) {
            length = value.length;
            for (let i = 0; i < length; i++) {
                size += sizeof(value[i], sparse);
            }
        }
        else {
            const keys = encodeableKeys(value, sparse);
            length = keys.length;
            for (let i = 0; i < length; i++) {
                const key = keys[i];
                size += sizeof(key) + sizeof(value[key], sparse);
            }
        }
        if (length < 0x10) {
            return 1 + size;
        }
        if (length < 0x10000) {
            return 3 + size;
        }
        if (length < 0x100000000) {
            return 5 + size;
        }
        throw new Error('Array or object too long 0x' + length.toString(16));
    }
    if (type === 'function')
        return 0;
    throw new Error('Unknown type ' + type);
}
exports["default"] = {
    encode,
    decode,
    inspect,
    utf8Write,
    utf8Read,
    utf8ByteCount,
};


/***/ }),

/***/ 1573:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* eslint-disable no-undef */
__webpack_require__(7602);

var randomBytes;
if (__webpack_require__.g.android) {
  randomBytes = function (size) {
    var sr = new java.security.SecureRandom();
    var buffer = Array.create('byte', size);
    sr.nextBytes(buffer);
    return android.util.Base64.encodeToString(buffer, android.util.Base64.DEFAULT);
  };
} else {
  randomBytes = function (size) {
    var bytes = NSMutableData.dataWithLength(size);
    SecRandomCopyBytes(kSecRandomDefault, size, bytes.mutableBytes());
    return bytes.base64EncodedStringWithOptions(0);
  };
}

var Config = {
  agent: 'nativescript',
  logTimestamps: true,
  binaryType: 'arraybuffer',
  WebSocket: WebSocket,
  xhrSupported: XMLHttpRequest,
  allowComet: true,
  useProtocolHeartbeats: true,
  supportsBinary: typeof TextDecoder !== 'undefined' && TextDecoder,
  preferBinary: false, // Motivation as on web; see `preferBinary` comment there.
  ArrayBuffer: ArrayBuffer,
  atob: null,
  nextTick: function (f) {
    setTimeout(f, 0);
  },
  addEventListener: null,
  inspect: JSON.stringify,
  stringByteSize: function (str) {
    /* str.length will be an underestimate for non-ascii strings. But if we're
     * in a browser too old to support TextDecoder, not much we can do. Better
     * to underestimate, so if we do go over-size, the server will reject the
     * message */
    return (typeof TextDecoder !== 'undefined' && new TextEncoder().encode(str).length) || str.length;
  },
  TextEncoder: __webpack_require__.g.TextEncoder,
  TextDecoder: __webpack_require__.g.TextDecoder,
  getRandomArrayBuffer: async function (byteLength) {
    var bytes = randomBytes(byteLength);
    return bytes;
  },
};

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Config);


/***/ }),

/***/ 1327:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _nativescript_core_application_settings__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1008);
/* harmony import */ var _nativescript_core_application_settings__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_nativescript_core_application_settings__WEBPACK_IMPORTED_MODULE_0__);


var WebStorage = (function () {
  function WebStorage() {}

  function set(name, value, ttl) {
    var wrappedValue = { value: value };
    if (ttl) {
      wrappedValue.expires = Date.now() + ttl;
    }
    return _nativescript_core_application_settings__WEBPACK_IMPORTED_MODULE_0___default().setString(name, JSON.stringify(wrappedValue));
  }

  function get(name) {
    var rawItem = _nativescript_core_application_settings__WEBPACK_IMPORTED_MODULE_0___default().getString(name);
    if (!rawItem) return null;
    var wrappedValue = JSON.parse(rawItem);
    if (wrappedValue.expires && wrappedValue.expires < Date.now()) {
      _nativescript_core_application_settings__WEBPACK_IMPORTED_MODULE_0___default().remove(name);
      return null;
    }
    return wrappedValue.value;
  }

  WebStorage.set = function (name, value, ttl) {
    return set(name, value, ttl);
  };
  WebStorage.get = function (name) {
    return get(name);
  };
  WebStorage.remove = function (name) {
    return _nativescript_core_application_settings__WEBPACK_IMPORTED_MODULE_0___default().remove(name);
  };

  return WebStorage;
})();

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (WebStorage);


/***/ }),

/***/ 1008:
/***/ ((module) => {

module.exports = __WEBPACK_EXTERNAL_MODULE__1008__;

/***/ }),

/***/ 7602:
/***/ ((module) => {

module.exports = __WEBPACK_EXTERNAL_MODULE__7602__;

/***/ }),

/***/ 7582:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   __addDisposableResource: () => (/* binding */ __addDisposableResource),
/* harmony export */   __assign: () => (/* binding */ __assign),
/* harmony export */   __asyncDelegator: () => (/* binding */ __asyncDelegator),
/* harmony export */   __asyncGenerator: () => (/* binding */ __asyncGenerator),
/* harmony export */   __asyncValues: () => (/* binding */ __asyncValues),
/* harmony export */   __await: () => (/* binding */ __await),
/* harmony export */   __awaiter: () => (/* binding */ __awaiter),
/* harmony export */   __classPrivateFieldGet: () => (/* binding */ __classPrivateFieldGet),
/* harmony export */   __classPrivateFieldIn: () => (/* binding */ __classPrivateFieldIn),
/* harmony export */   __classPrivateFieldSet: () => (/* binding */ __classPrivateFieldSet),
/* harmony export */   __createBinding: () => (/* binding */ __createBinding),
/* harmony export */   __decorate: () => (/* binding */ __decorate),
/* harmony export */   __disposeResources: () => (/* binding */ __disposeResources),
/* harmony export */   __esDecorate: () => (/* binding */ __esDecorate),
/* harmony export */   __exportStar: () => (/* binding */ __exportStar),
/* harmony export */   __extends: () => (/* binding */ __extends),
/* harmony export */   __generator: () => (/* binding */ __generator),
/* harmony export */   __importDefault: () => (/* binding */ __importDefault),
/* harmony export */   __importStar: () => (/* binding */ __importStar),
/* harmony export */   __makeTemplateObject: () => (/* binding */ __makeTemplateObject),
/* harmony export */   __metadata: () => (/* binding */ __metadata),
/* harmony export */   __param: () => (/* binding */ __param),
/* harmony export */   __propKey: () => (/* binding */ __propKey),
/* harmony export */   __read: () => (/* binding */ __read),
/* harmony export */   __rest: () => (/* binding */ __rest),
/* harmony export */   __runInitializers: () => (/* binding */ __runInitializers),
/* harmony export */   __setFunctionName: () => (/* binding */ __setFunctionName),
/* harmony export */   __spread: () => (/* binding */ __spread),
/* harmony export */   __spreadArray: () => (/* binding */ __spreadArray),
/* harmony export */   __spreadArrays: () => (/* binding */ __spreadArrays),
/* harmony export */   __values: () => (/* binding */ __values),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol */

var extendStatics = function(d, b) {
  extendStatics = Object.setPrototypeOf ||
      ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
      function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
  return extendStatics(d, b);
};

function __extends(d, b) {
  if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
  extendStatics(d, b);
  function __() { this.constructor = d; }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var __assign = function() {
  __assign = Object.assign || function __assign(t) {
      for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
      }
      return t;
  }
  return __assign.apply(this, arguments);
}

function __rest(s, e) {
  var t = {};
  for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
      t[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === "function")
      for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
          if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
              t[p[i]] = s[p[i]];
      }
  return t;
}

function __decorate(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}

function __param(paramIndex, decorator) {
  return function (target, key) { decorator(target, key, paramIndex); }
}

function __esDecorate(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
  function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
  var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
  var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
  var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
  var _, done = false;
  for (var i = decorators.length - 1; i >= 0; i--) {
      var context = {};
      for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
      for (var p in contextIn.access) context.access[p] = contextIn.access[p];
      context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
      var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
      if (kind === "accessor") {
          if (result === void 0) continue;
          if (result === null || typeof result !== "object") throw new TypeError("Object expected");
          if (_ = accept(result.get)) descriptor.get = _;
          if (_ = accept(result.set)) descriptor.set = _;
          if (_ = accept(result.init)) initializers.unshift(_);
      }
      else if (_ = accept(result)) {
          if (kind === "field") initializers.unshift(_);
          else descriptor[key] = _;
      }
  }
  if (target) Object.defineProperty(target, contextIn.name, descriptor);
  done = true;
};

function __runInitializers(thisArg, initializers, value) {
  var useValue = arguments.length > 2;
  for (var i = 0; i < initializers.length; i++) {
      value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
  }
  return useValue ? value : void 0;
};

function __propKey(x) {
  return typeof x === "symbol" ? x : "".concat(x);
};

function __setFunctionName(f, name, prefix) {
  if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
  return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};

function __metadata(metadataKey, metadataValue) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}

function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
      function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
      function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}

function __generator(thisArg, body) {
  var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
  function verb(n) { return function (v) { return step([n, v]); }; }
  function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while (g && (g = 0, op[0] && (_ = 0)), _) try {
          if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
          if (y = 0, t) op = [op[0] & 2, t.value];
          switch (op[0]) {
              case 0: case 1: t = op; break;
              case 4: _.label++; return { value: op[1], done: false };
              case 5: _.label++; y = op[1]; op = [0]; continue;
              case 7: op = _.ops.pop(); _.trys.pop(); continue;
              default:
                  if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                  if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                  if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                  if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                  if (t[2]) _.ops.pop();
                  _.trys.pop(); continue;
          }
          op = body.call(thisArg, _);
      } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
      if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
  }
}

var __createBinding = Object.create ? (function(o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  var desc = Object.getOwnPropertyDescriptor(m, k);
  if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
  }
  Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
});

function __exportStar(m, o) {
  for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p)) __createBinding(o, m, p);
}

function __values(o) {
  var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
  if (m) return m.call(o);
  if (o && typeof o.length === "number") return {
      next: function () {
          if (o && i >= o.length) o = void 0;
          return { value: o && o[i++], done: !o };
      }
  };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}

function __read(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  }
  catch (error) { e = { error: error }; }
  finally {
      try {
          if (r && !r.done && (m = i["return"])) m.call(i);
      }
      finally { if (e) throw e.error; }
  }
  return ar;
}

/** @deprecated */
function __spread() {
  for (var ar = [], i = 0; i < arguments.length; i++)
      ar = ar.concat(__read(arguments[i]));
  return ar;
}

/** @deprecated */
function __spreadArrays() {
  for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
  for (var r = Array(s), k = 0, i = 0; i < il; i++)
      for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
          r[k] = a[j];
  return r;
}

function __spreadArray(to, from, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
      if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
      }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
}

function __await(v) {
  return this instanceof __await ? (this.v = v, this) : new __await(v);
}

function __asyncGenerator(thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var g = generator.apply(thisArg, _arguments || []), i, q = [];
  return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
  function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
  function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
  function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
  function fulfill(value) { resume("next", value); }
  function reject(value) { resume("throw", value); }
  function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
}

function __asyncDelegator(o) {
  var i, p;
  return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
  function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v; } : f; }
}

function __asyncValues(o) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var m = o[Symbol.asyncIterator], i;
  return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
  function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
  function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
}

function __makeTemplateObject(cooked, raw) {
  if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
  return cooked;
};

var __setModuleDefault = Object.create ? (function(o, v) {
  Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
  o["default"] = v;
};

function __importStar(mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
  __setModuleDefault(result, mod);
  return result;
}

function __importDefault(mod) {
  return (mod && mod.__esModule) ? mod : { default: mod };
}

function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
}

function __classPrivateFieldIn(state, receiver) {
  if (receiver === null || (typeof receiver !== "object" && typeof receiver !== "function")) throw new TypeError("Cannot use 'in' operator on non-object");
  return typeof state === "function" ? receiver === state : state.has(receiver);
}

function __addDisposableResource(env, value, async) {
  if (value !== null && value !== void 0) {
    if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
    var dispose;
    if (async) {
        if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
        dispose = value[Symbol.asyncDispose];
    }
    if (dispose === void 0) {
        if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
        dispose = value[Symbol.dispose];
    }
    if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
    env.stack.push({ value: value, dispose: dispose, async: async });
  }
  else if (async) {
    env.stack.push({ async: true });
  }
  return value;
}

var _SuppressedError = typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

function __disposeResources(env) {
  function fail(e) {
    env.error = env.hasError ? new _SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
    env.hasError = true;
  }
  function next() {
    while (env.stack.length) {
      var rec = env.stack.pop();
      try {
        var result = rec.dispose && rec.dispose.call(rec.value);
        if (rec.async) return Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
      }
      catch (e) {
          fail(e);
      }
    }
    if (env.hasError) throw env.error;
  }
  return next();
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  __extends,
  __assign,
  __rest,
  __decorate,
  __param,
  __metadata,
  __awaiter,
  __generator,
  __createBinding,
  __exportStar,
  __values,
  __read,
  __spread,
  __spreadArrays,
  __spreadArray,
  __await,
  __asyncGenerator,
  __asyncDelegator,
  __asyncValues,
  __makeTemplateObject,
  __importStar,
  __importDefault,
  __classPrivateFieldGet,
  __classPrivateFieldSet,
  __classPrivateFieldIn,
  __addDisposableResource,
  __disposeResources,
});


/***/ }),

/***/ 4147:
/***/ ((module) => {

module.exports = JSON.parse('{"name":"ably","description":"Realtime client library for Ably, the realtime messaging service","version":"2.6.3","license":"Apache-2.0","bugs":{"url":"https://github.com/ably/ably-js/issues","email":"support@ably.com"},"main":"./build/ably-node.js","browser":"./build/ably.js","react-native":"./build/ably-reactnative.js","typings":"./ably.d.ts","exports":{".":{"types":"./ably.d.ts","node":"./build/ably-node.js","react-native":"./build/ably-reactnative.js","default":"./build/ably.js"},"./modular":{"types":"./modular.d.ts","import":"./build/modular/index.mjs"},"./react":{"require":"./react/cjs/index.js","import":"./react/mjs/index.js"},"./push":{"types":"./push.d.ts","import":"./build/push.js"}},"files":["build/**","ably.d.ts","push.d.ts","modular.d.ts","resources/**","src/**","react/**"],"dependencies":{"@ably/msgpack-js":"^0.4.0","fastestsmallesttextencoderdecoder":"^1.0.22","got":"^11.8.5","ulid":"^2.3.0","ws":"^8.17.1"},"peerDependencies":{"react":">=16.8.0","react-dom":">=16.8.0"},"peerDependenciesMeta":{"react":{"optional":true},"react-dom":{"optional":true}},"devDependencies":{"@ably/vcdiff-decoder":"1.0.6","@arethetypeswrong/cli":"^0.13.1","@babel/generator":"^7.23.6","@babel/parser":"^7.23.6","@babel/traverse":"^7.23.7","@testing-library/react":"^13.3.0","@types/cli-table":"^0.3.4","@types/jmespath":"^0.15.2","@types/node":"^18.0.0","@types/request":"^2.48.7","@types/ws":"^8.2.0","@typescript-eslint/eslint-plugin":"^5.59.6","@typescript-eslint/parser":"^5.59.6","@vitejs/plugin-react":"^1.3.2","async":"ably-forks/async#requirejs","aws-sdk":"^2.1413.0","chai":"^4.2.0","cli-table":"^0.3.11","cors":"^2.8.5","csv":"^6.3.9","dox":"^1.0.0","esbuild":"^0.18.10","esbuild-plugin-umd-wrapper":"ably-forks/esbuild-plugin-umd-wrapper#1.0.7-optional-amd-named-module","esbuild-runner":"^2.2.2","eslint":"^7.13.0","eslint-plugin-import":"^2.28.0","eslint-plugin-jsdoc":"^40.0.0","eslint-plugin-react":"^7.32.2","eslint-plugin-react-hooks":"^4.6.0","eslint-plugin-security":"^1.4.0","express":"^4.17.1","glob":"^10.4.2","grunt":"^1.6.1","grunt-cli":"~1.2.0","grunt-shell":"~1.1","grunt-webpack":"^5.0.0","hexy":"~0.2","jmespath":"^0.16.0","jsdom":"^20.0.0","minimist":"^1.2.5","mocha":"^8.1.3","mocha-junit-reporter":"^2.2.1","path-browserify":"^1.0.1","playwright":"^1.39.0","prettier":"^3.3.3","process":"^0.11.10","react":">=18.1.0","react-dom":">=18.1.0","requirejs":"~2.1","shelljs":"~0.8","source-map-explorer":"^2.5.2","source-map-support":"^0.5.21","stream-browserify":"^3.0.0","ts-loader":"^9.4.2","tsconfig-paths-webpack-plugin":"^4.0.1","tslib":"^2.3.1","typedoc":"^0.24.7","typescript":"^4.9.5","vite":"^4.4.9","vitest":"^0.18.0","webpack":"^5.79.0","webpack-cli":"^5.0.1"},"engines":{"node":">=16"},"repository":"ably/ably-js","jspm":{"registry":"npm","directories":{"lib":"build"},"main":"ably"},"scripts":{"start:react":"npx vite serve","grunt":"grunt","test":"npm run test:node","test:node":"npm run build:node && npm run build:push && mocha","test:grep":"npm run build:node && npm run build:push && mocha --grep","test:node:skip-build":"mocha","test:webserver":"grunt test:webserver","test:playwright":"node test/support/runPlaywrightTests.js","test:react":"vitest run","test:package":"grunt test:package","concat":"grunt concat","build":"grunt build:all && npm run build:react","build:node":"grunt build:node","build:browser":"grunt build:browser","build:react":"npm run build:react:mjs && npm run build:react:cjs && cp src/platform/react-hooks/res/package.react.json react/package.json","build:react:mjs":"tsc --project src/platform/react-hooks/tsconfig.mjs.json && cp src/platform/react-hooks/res/package.mjs.json react/mjs/package.json","build:react:cjs":"tsc --project src/platform/react-hooks/tsconfig.cjs.json && cp src/platform/react-hooks/res/package.cjs.json react/cjs/package.json","build:push":"grunt build:push","requirejs":"grunt requirejs","lint":"eslint .","lint:fix":"eslint --fix .","prepare":"npm run build","format":"prettier --write .","format:check":"prettier --check .","sourcemap":"source-map-explorer build/ably.min.js","modulereport":"tsc --noEmit --esModuleInterop scripts/moduleReport.ts && esr scripts/moduleReport.ts","speccoveragereport":"tsc --noEmit --esModuleInterop --target ES2017 --moduleResolution node scripts/specCoverageReport.ts && esr scripts/specCoverageReport.ts","process-private-api-data":"tsc --noEmit --esModuleInterop --strictNullChecks scripts/processPrivateApiData/run.ts && esr scripts/processPrivateApiData/run.ts","docs":"typedoc"}}');

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;
var __webpack_unused_export__;

__webpack_unused_export__ = ({ value: true });
const tslib_1 = __webpack_require__(7582);
// Common
const defaultrest_1 = __webpack_require__(6930);
const defaultrealtime_1 = __webpack_require__(5788);
const platform_1 = tslib_1.__importDefault(__webpack_require__(7400));
const errorinfo_1 = tslib_1.__importDefault(__webpack_require__(1798));
const protocolmessage_1 = __webpack_require__(8294);
// Platform Specific
const bufferutils_1 = tslib_1.__importDefault(__webpack_require__(1752));
// @ts-ignore
const crypto_1 = __webpack_require__(2402);
const http_1 = tslib_1.__importDefault(__webpack_require__(6285));
// @ts-ignore
const config_1 = tslib_1.__importDefault(__webpack_require__(1573));
// @ts-ignore
const transport_1 = tslib_1.__importDefault(__webpack_require__(5655));
const logger_1 = tslib_1.__importDefault(__webpack_require__(1597));
const defaults_1 = __webpack_require__(3925);
// @ts-ignore
const webstorage_1 = tslib_1.__importDefault(__webpack_require__(1327));
const defaults_2 = tslib_1.__importDefault(__webpack_require__(4074));
const msgpack_1 = tslib_1.__importDefault(__webpack_require__(6007));
const request_1 = __webpack_require__(2492);
const Crypto = (0, crypto_1.createCryptoClass)(config_1.default, bufferutils_1.default);
platform_1.default.Crypto = Crypto;
platform_1.default.BufferUtils = bufferutils_1.default;
platform_1.default.Http = http_1.default;
platform_1.default.Config = config_1.default;
platform_1.default.Transports = transport_1.default;
platform_1.default.WebStorage = webstorage_1.default;
for (const clientClass of [defaultrest_1.DefaultRest, defaultrealtime_1.DefaultRealtime]) {
    clientClass.Crypto = Crypto;
    clientClass._MsgPack = msgpack_1.default;
}
http_1.default.bundledRequestImplementations = request_1.defaultBundledRequestImplementations;
logger_1.default.initLogHandlers();
platform_1.default.Defaults = (0, defaults_1.getDefaults)(defaults_2.default);
if (platform_1.default.Config.agent) {
    // @ts-ignore
    platform_1.default.Defaults.agent += ' ' + platform_1.default.Config.agent;
}
exports["default"] = {
    ErrorInfo: errorinfo_1.default,
    Rest: defaultrest_1.DefaultRest,
    Realtime: defaultrealtime_1.DefaultRealtime,
    msgpack: msgpack_1.default,
    protocolMessageFromDeserialized: protocolmessage_1.fromDeserializedIncludingDependencies,
};

})();

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});