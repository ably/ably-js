import Logger from './logger';

type AnyFunction = (...args: any[]) => unknown;

export interface MulticasterInstance extends Function {
  (...args: unknown[]): void;
  push: (fn: AnyFunction) => void;
}

class Multicaster {
  members: Array<AnyFunction>;

  // Private constructor; use static Multicaster.create instead
  private constructor(members?: Array<AnyFunction | undefined>) {
    this.members = (members as Array<AnyFunction>) || [];
  }

  call(...args: unknown[]): void {
    for (const member of this.members) {
      if (member) {
        try {
          member(...args);
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

  push(...args: Array<AnyFunction>): void {
    this.members.push(...args);
  }

  static create(members?: Array<AnyFunction | undefined>): MulticasterInstance {
    const instance = new Multicaster(members);
    return Object.assign((...args: unknown[]) => instance.call(...args), {
      push: (fn: AnyFunction) => instance.push(fn),
    });
  }
}

export default Multicaster;
