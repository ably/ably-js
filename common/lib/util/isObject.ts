export default function(ob: unknown): ob is object {
  return Object.prototype.toString.call(ob) == '[object Object]';
};
