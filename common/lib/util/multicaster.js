var Multicaster = (function() {

	function Multicaster(members) {
		members = members || [];

		var handler = function() {
			for(var i = 0; i < members.length; i++) {
				var member = members[i];
				if(member) {
					try {
						member.apply(null, arguments);
					} catch(e){
						Logger.logAction(Logger.LOG_ERROR, 'Multicaster multiple callback handler', 'Unexpected exception: ' + e + '; stack = ' + e.stack);
					}
				}
			}
		};

		handler.push = function() {
			Array.prototype.push.apply(members, arguments);
		};
		return handler;
	}

	return Multicaster;
})();
