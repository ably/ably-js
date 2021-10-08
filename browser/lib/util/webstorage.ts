import * as Utils from '../../../common/lib/util/utils';

let sessionSupported: boolean;
let localSupported: boolean;
const test = 'ablyjs-storage-test';

/* Even just accessing the session/localStorage object can throw a
	* security exception in some circumstances with some browsers. In
	* others, calling setItem will throw. So have to check in this
	* somewhat roundabout way. (If unsupported or no global object,
	* will throw on accessing a property of undefined) */
try {
	global.sessionStorage.setItem(test, test);
	global.sessionStorage.removeItem(test);
	sessionSupported = true;
} catch(e) {
	sessionSupported = false;
}

try {
	global.localStorage.setItem(test, test);
	global.localStorage.removeItem(test);
	localSupported = true;
} catch(e) {
	localSupported = false;
}

function storageInterface(session: any) {
	return session ? global.sessionStorage : global.localStorage;
}

function set(name: string, value: string, ttl: number | undefined, session: any) {
	const wrappedValue: Record<string, any> = {value: value};
	if(ttl) {
		wrappedValue.expires = Utils.now() + ttl;
	}
	return storageInterface(session).setItem(name, JSON.stringify(wrappedValue));
}

function get(name: string, session: any) {
	const rawItem = storageInterface(session).getItem(name);
	if(!rawItem) return null;
	const wrappedValue = JSON.parse(rawItem);
	if(wrappedValue.expires && (wrappedValue.expires < Utils.now())) {
		storageInterface(session).removeItem(name);
		return null;
	}
	return wrappedValue.value;
}

function remove(name: string, session: any) {
	return storageInterface(session).removeItem(name);
}

class WebStorage {
	static set?: (name: string, value: string, ttl?: number) => void;
	static get?: (name: string) => any;
	static remove?: (name: string) => void;
	static setSession?: (name: string, value: string, ttl?: number) => void;
	static getSession?: (name: string) => any;
	static removeSession?: (name: string) => void;
}

if(localSupported) {
	WebStorage.set    = function(name: string, value: string, ttl?: number) { return set(name, value, ttl, false); };
	WebStorage.get    = function(name) { return get(name, false); };
	WebStorage.remove = function(name: string) { return remove(name, false); };
}

if(sessionSupported) {
	WebStorage.setSession    = function(name: string, value: string, ttl?: number) { return set(name, value, ttl, true); };
	WebStorage.getSession    = function(name: string) { return get(name, true); };
	WebStorage.removeSession = function(name: string) { return remove(name, true); };
}

export default WebStorage;
