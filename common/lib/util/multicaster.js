var Multicaster = (function() {

	function Multicaster(members) {
		members = members || [];
		var multi = function(err, data) { for(var i = 0; i < members.length; i++) try { members[i](err, data); } catch(e){} };
		multi.__proto__ = this.__proto__;
		multi.members = members;
		return multi;
	}
	Utils.inherits(Multicaster, Function);

	Multicaster.prototype.push = function() { Array.prototype.push.apply(this.members, arguments); };

	return Multicaster;
})();
