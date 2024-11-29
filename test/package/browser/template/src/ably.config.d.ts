import { LiveCounter, LiveMap } from 'ably';

type CustomRoot = {
  numberKey: number;
  stringKey: string;
  booleanKey: boolean;
  couldBeUndefined?: string;
  mapKey?: LiveMap<{
    foo: 'bar';
    nestedMap?: LiveMap<{
      baz: 'qux';
    }>;
  }>;
  counterKey?: LiveCounter;
};

declare global {
  export interface LiveObjectsTypes {
    root: CustomRoot;
  }
}
