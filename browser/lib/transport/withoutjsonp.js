/**
 * This file exists for React Native and Nativescript in order to exclude the unsupported JSONP transport from these platforms.
 */
import XHRPollingTransport from './xhrpollingtransport.js';
import XHRStreamingTransport from './xhrstreamingtransport.js';

export default [
  XHRPollingTransport,
  XHRStreamingTransport
];
