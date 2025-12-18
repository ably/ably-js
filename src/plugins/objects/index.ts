import { LiveCounterValueType } from './livecountervaluetype';
import { LiveMapValueType } from './livemapvaluetype';
import { ObjectMessage, WireObjectMessage } from './objectmessage';
import { RealtimeObject } from './realtimeobject';

export {
  LiveCounterValueType as LiveCounter,
  LiveMapValueType as LiveMap,
  ObjectMessage,
  RealtimeObject,
  WireObjectMessage,
};

/**
 * The named Objects plugin object export to be passed to the Ably client.
 */
export const Objects = {
  LiveCounter: LiveCounterValueType,
  LiveMap: LiveMapValueType,
  ObjectMessage,
  RealtimeObject,
  WireObjectMessage,
};
