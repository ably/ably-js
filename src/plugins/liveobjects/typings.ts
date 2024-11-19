import { LiveCounter } from './livecounter';
import { LiveMap } from './livemap';
import { StateValue } from './statemessage';

declare global {
  // define a global interface which can be used by users to define their own types for LiveObjects.
  export interface LiveObjectsTypes {
    [key: string]: unknown;
  }
}

// LiveMap type representation of how it looks to the end-user. A mapping of string keys to the scalar values (StateValue) or other Live Objects.
export type LiveMapType = { [key: string]: StateValue | LiveMap<LiveMapType> | LiveCounter | undefined };

export type DefaultRoot =
  // we need a way to understand when no types were provided by the user.
  // we expect a "root" property to be set on LiveObjectsTypes interface, e.g. it won't be "unknown" anymore
  unknown extends LiveObjectsTypes['root']
    ? LiveMapType // no types provided by the user, use the default map type for the root
    : LiveObjectsTypes['root'] extends LiveMapType
      ? LiveObjectsTypes['root'] // "root" was provided by the user, and it is of an expected type, we can use this interface for the root object in LiveObjects.
      : `Provided type definition for the "root" object in LiveObjectsTypes is not of an expected LiveMapType type`;
