declare module 'platform-webstorage' {
  export const get: typeof import('../../platform/web/lib/util/webstorage').get;
  export const getSession: typeof import('../../platform/web/lib/util/webstorage').getSession;
  export const set: typeof import('../../platform/web/lib/util/webstorage').set;
  export const setSession: typeof import('../../platform/web/lib/util/webstorage').setSession;
  export const remove: typeof import('../../platform/web/lib/util/webstorage').remove;
  export const removeSession: typeof import('../../platform/web/lib/util/webstorage').removeSession;
}
