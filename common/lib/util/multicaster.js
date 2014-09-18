var Multicaster = (function() {

	function Multicaster(members) {
		members = members || [];

		var handler = function() {
			for(var i = 0; i < members.length; i++) {
				var member = members[i];
				try { member.apply(null, arguments); } catch(e){} };
			};

		handler.push = function() {
			Array.prototype.push.apply(members, arguments);
		};
		return handler;
	};

	return Multicaster;
})();
