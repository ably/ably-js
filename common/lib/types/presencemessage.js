var PresenceMessage = (function() {

	/* public constructor */
	function PresenceMessage(clientId, clientData, memberId) {
		this.clientId = clientId;
		this.clientData = clientData;
		this.memberId = memberId;
	}

	return PresenceMessage;
})();
