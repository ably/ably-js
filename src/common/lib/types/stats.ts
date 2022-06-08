import * as Utils from '../util/utils';

type MessageValues = {
  count?: number;
  data?: number;
  uncompressedData?: number;
  failed?: number;
  refused?: number;
  category?: Record<string, MessageValues>;
};

type ResourceValues = {
  peak?: number;
  min?: number;
  mean?: number;
  opened?: number;
  refused?: number;
};

type RequestValues = {
  succeeded?: number;
  failed?: number;
  refused?: number;
};

type ConnectionTypesValues = {
  plain?: ResourceValues;
  tls?: ResourceValues;
  all?: ResourceValues;
};

type MessageTypesValues = {
  messages?: MessageValues;
  presence?: MessageValues;
  all?: MessageValues;
};

type MessageTrafficValues = {
  realtime?: MessageTypesValues;
  rest?: MessageTypesValues;
  webhook?: MessageTypesValues;
  sharedQueue?: MessageTypesValues;
  externalQueue?: MessageTypesValues;
  httpEvent?: MessageTypesValues;
  push?: MessageTypesValues;
  all?: MessageTypesValues;
};

type MessageDirectionsValues = {
  all?: MessageTypesValues;
  inbound?: MessageTrafficValues;
  outbound?: MessageTrafficValues;
};

type XchgMessagesValues = {
  all?: MessageTypesValues;
  producerPaid?: MessageDirectionsValues;
  consumerPaid?: MessageDirectionsValues;
};

type NotificationsValues = {
  invalid?: number;
  attempted?: number;
  successful?: number;
  failed?: number;
};

type PushValues = {
  messages?: number;
  notifications?: NotificationsValues;
  directPublishes?: number;
};

type ProcessedCountValues = {
  succeeded?: number;
  skipped?: number;
  failed?: number;
};

type ProcessedMessagesValues = {
  delta?: Record<string, ProcessedCountValues>;
};

type StatsValues = {
  all?: MessageTypesValues;
  inbound?: MessageTrafficValues;
  outbound?: MessageTrafficValues;
  persisted?: MessageTypesValues;
  connections?: ConnectionTypesValues;
  channels?: ResourceValues;
  apiRequests?: RequestValues;
  tokenRequests?: RequestValues;
  xchgProducer?: XchgMessagesValues;
  xchgConsumer?: XchgMessagesValues;
  pushStats?: PushValues;
  processed?: ProcessedMessagesValues;
  inProgress?: never;
  unit?: never;
  intervalId?: never;
};

class MessageCount {
  count?: number;
  data?: number;
  uncompressedData?: number;
  failed?: number;
  refused?: number;

  constructor(values?: MessageValues) {
    this.count = (values && values.count) || 0;
    this.data = (values && values.data) || 0;
    this.uncompressedData = (values && values.uncompressedData) || 0;
    this.failed = (values && values.failed) || 0;
    this.refused = (values && values.refused) || 0;
  }
}

class MessageCategory extends MessageCount {
  category?: Record<string, MessageCount>;
  constructor(values?: MessageValues) {
    super(values);
    if (values && values.category) {
      this.category = {};
      Utils.forInOwnNonNullProperties(values.category, (prop: string) => {
        (this.category as Record<string, MessageCount>)[prop] = new MessageCount(
          (values.category as Record<string, MessageCount>)[prop]
        );
      });
    }
  }
}

class ResourceCount {
  peak?: number;
  min?: number;
  mean?: number;
  opened?: number;
  refused?: number;

  constructor(values?: ResourceValues) {
    this.peak = (values && values.peak) || 0;
    this.min = (values && values.min) || 0;
    this.mean = (values && values.mean) || 0;
    this.opened = (values && values.opened) || 0;
    this.refused = (values && values.refused) || 0;
  }
}

class RequestCount {
  succeeded?: number;
  failed?: number;
  refused?: number;

  constructor(values?: RequestValues) {
    this.succeeded = (values && values.succeeded) || 0;
    this.failed = (values && values.failed) || 0;
    this.refused = (values && values.refused) || 0;
  }
}

class ConnectionTypes {
  plain?: ResourceCount;
  tls?: ResourceCount;
  all?: ResourceCount;

  constructor(values?: ConnectionTypesValues) {
    this.plain = new ResourceCount(values && values.plain);
    this.tls = new ResourceCount(values && values.tls);
    this.all = new ResourceCount(values && values.all);
  }
}

class MessageTypes {
  messages?: MessageCategory;
  presence?: MessageCategory;
  all?: MessageCategory;

  constructor(values?: MessageTypesValues) {
    this.messages = new MessageCategory(values && values.messages);
    this.presence = new MessageCategory(values && values.presence);
    this.all = new MessageCategory(values && values.all);
  }
}

class MessageTraffic {
  realtime?: MessageTypes;
  rest?: MessageTypes;
  webhook?: MessageTypes;
  sharedQueue?: MessageTypes;
  externalQueue?: MessageTypes;
  httpEvent?: MessageTypes;
  push?: MessageTypes;
  all?: MessageTypes;

  constructor(values?: MessageTrafficValues) {
    this.realtime = new MessageTypes(values && values.realtime);
    this.rest = new MessageTypes(values && values.rest);
    this.webhook = new MessageTypes(values && values.webhook);
    this.sharedQueue = new MessageTypes(values && values.sharedQueue);
    this.externalQueue = new MessageTypes(values && values.externalQueue);
    this.httpEvent = new MessageTypes(values && values.httpEvent);
    this.push = new MessageTypes(values && values.push);
    this.all = new MessageTypes(values && values.all);
  }
}

class MessageDirections {
  all?: MessageTypes;
  inbound?: MessageTraffic;
  outbound?: MessageTraffic;

  constructor(values?: MessageDirectionsValues) {
    this.all = new MessageTypes(values && values.all);
    this.inbound = new MessageTraffic(values && values.inbound);
    this.outbound = new MessageTraffic(values && values.outbound);
  }
}

class XchgMessages {
  all?: MessageTypes;
  producerPaid?: MessageDirections;
  consumerPaid?: MessageDirections;

  constructor(values?: XchgMessagesValues) {
    this.all = new MessageTypes(values && values.all);
    this.producerPaid = new MessageDirections(values && values.producerPaid);
    this.consumerPaid = new MessageDirections(values && values.consumerPaid);
  }
}

class PushStats {
  messages?: number;
  notifications?: NotificationsValues;
  directPublishes?: number;

  constructor(values?: PushValues) {
    this.messages = (values && values.messages) || 0;
    const notifications = values && values.notifications;
    this.notifications = {
      invalid: (notifications && notifications.invalid) || 0,
      attempted: (notifications && notifications.attempted) || 0,
      successful: (notifications && notifications.successful) || 0,
      failed: (notifications && notifications.failed) || 0,
    };
    this.directPublishes = (values && values.directPublishes) || 0;
  }
}

class ProcessedCount {
  succeeded?: number;
  skipped?: number;
  failed?: number;

  constructor(values: ProcessedCountValues) {
    this.succeeded = (values && values.succeeded) || 0;
    this.skipped = (values && values.skipped) || 0;
    this.failed = (values && values.failed) || 0;
  }
}

class ProcessedMessages {
  delta?: Record<string, ProcessedCount>;

  constructor(values?: ProcessedMessagesValues) {
    this.delta = undefined;
    if (values && values.delta) {
      this.delta = {};
      Utils.forInOwnNonNullProperties(values.delta, (prop: string) => {
        (this.delta as Record<string, ProcessedCount>)[prop] = new ProcessedCount(
          (values.delta as Record<string, ProcessedCountValues>)[prop]
        );
      });
    }
  }
}

class Stats extends MessageDirections {
  persisted?: MessageTypes;
  connections?: ConnectionTypes;
  channels?: ResourceCount;
  apiRequests?: RequestCount;
  tokenRequests?: RequestCount;
  xchgProducer?: XchgMessages;
  xchgConsumer?: XchgMessages;
  push?: PushStats;
  processed?: ProcessedMessages;
  inProgress?: never;
  unit?: never;
  intervalId?: never;

  constructor(values?: StatsValues) {
    super(values as MessageDirectionsValues);
    this.persisted = new MessageTypes(values && values.persisted);
    this.connections = new ConnectionTypes(values && values.connections);
    this.channels = new ResourceCount(values && values.channels);
    this.apiRequests = new RequestCount(values && values.apiRequests);
    this.tokenRequests = new RequestCount(values && values.tokenRequests);
    this.xchgProducer = new XchgMessages(values && values.xchgProducer);
    this.xchgConsumer = new XchgMessages(values && values.xchgConsumer);
    this.push = new PushStats(values && values.pushStats);
    this.processed = new ProcessedMessages(values && values.processed);
    this.inProgress = (values && values.inProgress) || undefined;
    this.unit = (values && values.unit) || undefined;
    this.intervalId = (values && values.intervalId) || undefined;
  }

  static fromValues(values: StatsValues): Stats {
    return new Stats(values);
  }
}

export default Stats;
