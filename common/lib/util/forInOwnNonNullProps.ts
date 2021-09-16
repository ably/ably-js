export default function(ob: {[key: string]: unknown}, fn: Function) {
	for (var prop in ob) {
		if (Object.prototype.hasOwnProperty.call(ob, prop) && ob[prop]) {
			fn(prop);
		}
	}
};
