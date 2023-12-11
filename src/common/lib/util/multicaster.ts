import { StandardCallback } from 'common/types/utils';
import ErrorInfo from 'common/lib/types/errorinfo';
import Logger from './logger';

export interface MulticasterInstance<T> extends Function {
  (err?: ErrorInfo | null, result?: T): void;
  push: (fn: StandardCallback<T>) => void;
}

class Multicaster<T> {
  members: Array<StandardCallback<T>>;

  // Private constructor; use static Multicaster.create instead
  private constructor(members?: Array<StandardCallback<T> | undefined>) {
    this.members = (members as Array<StandardCallback<T>>) || [];
  }

  private call(err?: ErrorInfo | null, result?: T): void {
    for (const member of this.members) {
      if (member) {
        try {
          member(err, result);
        } catch (e) {
          Logger.logAction(
            Logger.LOG_ERROR,
            'Multicaster multiple callback handler',
            'Unexpected exception: ' + e + '; stack = ' + (e as Error).stack
          );
        }
      }
    }
  }

  push(...args: Array<StandardCallback<T>>): void {
    this.members.push(...args);
  }

  static create<T>(members?: Array<StandardCallback<T> | undefined>): MulticasterInstance<T> {
    const instance = new Multicaster(members);
    return Object.assign((err?: ErrorInfo | null, result?: T) => instance.call(err, result), {
      push: (fn: StandardCallback<T>) => instance.push(fn),
    });
  }
}

export default Multicaster;
