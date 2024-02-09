import * as API from 'ably';

export const arrEvery = (Array.prototype.every as unknown)
  ? function <T>(arr: Array<T>, fn: (value: T, index: number, arr: Array<T>) => boolean) {
      return arr.every(fn);
    }
  : function <T>(arr: Array<T>, fn: (value: T, index: number, arr: Array<T>) => boolean) {
      const len = arr.length;
      for (let i = 0; i < len; i++) {
        if (!fn(arr[i], i, arr)) {
          return false;
        }
      }
      return true;
    };

export function shallowEquals(source: Record<string, unknown>, target: Record<string, unknown>) {
  return (
    Object.keys(source).every((key) => source[key] === target[key]) &&
    Object.keys(target).every((key) => target[key] === source[key])
  );
}

export function arrEquals(a: any[], b: any[]) {
  return (
    a.length === b.length &&
    arrEvery(a, function (val, i) {
      return val === b[i];
    })
  );
}

export function omitAgent(channelParams?: API.Types.ChannelParams) {
  const { agent: _, ...paramsWithoutAgent } = channelParams || {};
  return paramsWithoutAgent;
}
