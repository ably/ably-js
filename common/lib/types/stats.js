this.Stats = (function() {
	var messagetypes = (typeof(clientmessage_refs) == 'object') ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');

	function Stats() {}

	Stats.decodeSStats = function(encoded, callback) { Thrift.decode(new messagetypes.SStats(), encoded, callback); }
	Stats.decodeSStatsArray = function(encoded, callback) { Thrift.decode(new messagetypes.SStatsArray(), encoded, callback); }

	return Stats;
})();
