import Logger from './logger';

type AnyFunction = (...args: any[]) => unknown;

export interface MulticasterInstance extends Function {
  (...args: unknown[]): void;
  push: (fn: AnyFunction) => void;
  createPromise: () => Promise<any>;
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

  // TODO sort out this type; I think we need to tighten up the type of Multicaster in general
  // TODO handle errors
  createPromise(): Promise<any> {
    let resolveCallback: AnyFunction;
    const promise = new Promise<any>((resolve) => {
      resolveCallback = resolve;
    });
    this.push(resolveCallback!);
    return promise;
  }

  static create(members?: Array<AnyFunction | undefined>): MulticasterInstance {
    const instance = new Multicaster(members);
    return Object.assign((...args: unknown[]) => instance.call(...args), {
      push: (fn: AnyFunction) => instance.push(fn),
      createPromise: () => instance.createPromise(),
    });
  }
}

export default Multicaster;
