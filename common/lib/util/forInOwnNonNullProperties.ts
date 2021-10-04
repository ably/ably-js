export default function(ob: Record<string, unknown>, fn: Function) {
	for (let prop in ob) {
		if (Object.prototype.hasOwnProperty.call(ob, prop) && ob[prop]) {
			fn(prop);
		}
	}
};
