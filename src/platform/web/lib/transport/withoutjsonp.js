/**
 * This file exists for React Native and Nativescript in order to exclude the unsupported JSONP transport from these platforms.
 */
import XHRPollingTransport from './xhrpollingtransport';
import XHRStreamingTransport from './xhrstreamingtransport';

export default [XHRPollingTransport, XHRStreamingTransport];
