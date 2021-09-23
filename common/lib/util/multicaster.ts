import Logger from './logger';

class Multicaster {
	members: Array<Function>;

  // Private constructor; use static Multicaster.create instead
	private constructor(members?: Array<Function>) {
		this.members = members || [];
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

	push(...args: Array<Function>): void {
		this.members.push(...args);
	}

	static create(members?: Array<Function>) {
		const instance = new Multicaster(members);
		return Object.assign(
      (...args: unknown[]) => instance.call(...args),
      {
        push: (fn: Function) => instance.push(fn)
      }
		);
	}
}

export default Multicaster;
