declare module 'platform-webstorage' {
	export const get: typeof import('../../browser/lib/util/webstorage').get;
	export const getSession: typeof import('../../browser/lib/util/webstorage').getSession;
	export const set: typeof import('../../browser/lib/util/webstorage').set;
	export const setSession: typeof import('../../browser/lib/util/webstorage').setSession;
	export const remove: typeof import('../../browser/lib/util/webstorage').remove;
	export const removeSession: typeof import('../../browser/lib/util/webstorage').removeSession;
}
