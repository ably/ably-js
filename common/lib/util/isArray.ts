/*
* Determine whether or not a given object is
* an array.
*/
export default Array.isArray || function (value: unknown): value is Array<unknown> {
  return Object.prototype.toString.call(value) == '[object Array]';
}
