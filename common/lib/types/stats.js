var Stats = (function() {

	function MessageCount(values) {
		this.count = (values && values.count) || 0;
		this.data = (values && values.data) || 0;
		this.uncompressedData = (values && values.uncompressedData) || 0;
		this.failed = (values && values.failed) || 0;
		this.refused = (values && values.refused) || 0;
	}

	function MessageCategory(values) {
		var self = this;
		MessageCount.call(this, values);
		this.category = undefined;
		if (values && values.category) {
			this.category = { };
			Utils.forInOwnNonNullProps(values.category, function(prop) {
				self.category[prop] = new MessageCount(values.category[prop]);
			});
		}
	}

	function ResourceCount(values) {
		this.peak = (values && values.peak) || 0;
		this.min = (values && values.min) || 0;
		this.mean = (values && values.mean) || 0;
		this.opened = (values && values.opened) || 0;
		this.refused = (values && values.refused) || 0;
	}

	function RequestCount(values) {
		this.succeeded = (values && values.succeeded) || 0;
		this.failed = (values && values.failed) || 0;
		this.refused = (values && values.refused) || 0;
	}

	function ConnectionTypes(values) {
		this.plain = new ResourceCount(values && values.plain);
		this.tls = new ResourceCount(values && values.tls);
		this.all = new ResourceCount(values && values.all);
	}

	function MessageTypes(values) {
		this.messages = new MessageCategory(values && values.messages);
		this.presence = new MessageCategory(values && values.presence);
		this.all = new MessageCategory(values && values.all);
	}

	function MessageTraffic(values) {
		this.realtime = new MessageTypes(values && values.realtime);
		this.rest = new MessageTypes(values && values.rest);
		this.webhook = new MessageTypes(values && values.webhook);
		this.sharedQueue = new MessageTypes(values && values.sharedQueue);
		this.externalQueue = new MessageTypes(values && values.externalQueue);
		this.httpEvent = new MessageTypes(values && values.httpEvent);
		this.push = new MessageTypes(values && values.push);
		this.all = new MessageTypes(values && values.all);
	}

	function MessageDirections(values) {
		this.all           = new MessageTypes(values && values.all);
		this.inbound       = new MessageTraffic(values && values.inbound);
		this.outbound      = new MessageTraffic(values && values.outbound);
	}

	function XchgMessages(values) {
		this.all           = new MessageTypes(values && values.all);
		this.producerPaid  = new MessageDirections(values && values.producerPaid);
		this.consumerPaid  = new MessageDirections(values && values.consumerPaid);
	}

	function PushStats(values) {
		this.messages = (values && values.messages) || 0;
		var notifications = values && values.notifications;
		this.notifications = {
			invalid: notifications && notifications.invalid || 0,
			attempted: notifications && notifications.attempted || 0,
			successful: notifications && notifications.successful || 0,
			failed: notifications && notifications.failed || 0
		};
		this.directPublishes = (values && values.directPublishes) || 0;
	}

	function ProcessedCount(values) {
		this.succeeded = (values && values.succeeded) || 0;
		this.skipped = (values && values.skipped) || 0;
		this.failed = (values && values.failed) || 0;
	}

	function ProcessedMessages(values) {
		var self = this;
		this.delta = undefined;
		if (values && values.delta) {
			this.delta = { };
			Utils.forInOwnNonNullProps(values.delta, function(prop) {
				self.delta[prop] = new ProcessedCount(values.delta[prop]);
			});
		}
	}

	function Stats(values) {
		MessageDirections.call(this, values);
		this.persisted     = new MessageTypes(values && values.persisted);
		this.connections   = new ConnectionTypes(values && values.connections);
		this.channels      = new ResourceCount(values && values.channels);
		this.apiRequests   = new RequestCount(values && values.apiRequests);
		this.tokenRequests = new RequestCount(values && values.tokenRequests);
		this.xchgProducer  = new XchgMessages(values && values.xchgProducer);
		this.xchgConsumer  = new XchgMessages(values && values.xchgConsumer);
		this.push          = new PushStats(values && values.pushStats);
		this.processed     = new ProcessedMessages(values && values.processed);
		this.inProgress    = (values && values.inProgress) || undefined;
		this.unit          = (values && values.unit) || undefined;
		this.intervalId    = (values && values.intervalId) || undefined;
	}

	Stats.fromValues = function(values) {
		return new Stats(values);
	};

	return Stats;
})();
