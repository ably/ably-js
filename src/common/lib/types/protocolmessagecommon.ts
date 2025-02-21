// constant definitions that can be imported by anyone without worrying about circular
// deps

export const actions = {
  HEARTBEAT: 0,
  ACK: 1,
  NACK: 2,
  CONNECT: 3,
  CONNECTED: 4,
  DISCONNECT: 5,
  DISCONNECTED: 6,
  CLOSE: 7,
  CLOSED: 8,
  ERROR: 9,
  ATTACH: 10,
  ATTACHED: 11,
  DETACH: 12,
  DETACHED: 13,
  PRESENCE: 14,
  MESSAGE: 15,
  SYNC: 16,
  AUTH: 17,
  ACTIVATE: 18,
};

export const ActionName: string[] = [];
Object.keys(actions).forEach(function (name) {
  ActionName[(actions as { [key: string]: number })[name]] = name;
});

export const flags: { [key: string]: number } = {
  /* Channel attach state flags */
  HAS_PRESENCE: 1 << 0,
  HAS_BACKLOG: 1 << 1,
  RESUMED: 1 << 2,
  TRANSIENT: 1 << 4,
  ATTACH_RESUME: 1 << 5,
  /* Channel mode flags */
  PRESENCE: 1 << 16,
  PUBLISH: 1 << 17,
  SUBSCRIBE: 1 << 18,
  PRESENCE_SUBSCRIBE: 1 << 19,
};

export const flagNames = Object.keys(flags);

flags.MODE_ALL = flags.PRESENCE | flags.PUBLISH | flags.SUBSCRIBE | flags.PRESENCE_SUBSCRIBE;

export const channelModes = ['PRESENCE', 'PUBLISH', 'SUBSCRIBE', 'PRESENCE_SUBSCRIBE'];
