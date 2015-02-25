var IframeTransport = (function() {
	var origin = location.origin || location.protocol + "//" + location.hostname + (location.port ? ':' + location.port: '');

	/* public constructor */
	function IframeTransport(connectionManager, auth, params) {
		params.binary = false;
		Transport.call(this, connectionManager, auth, params);
		this.wrapIframe = null;
		this.wrapWindow = null;
		this.destWindow = null;
		this.destOrigin = null;
	}
	Utils.inherits(IframeTransport, Transport);

	IframeTransport.isAvailable = function() {
		var phantomJS = (typeof(window) == 'object') && (/PhantomJS/.test(window.navigator.userAgent));
		// Disable iFrame transport in PhantomJS tests until root cause can be discovered
		return ((window.postMessage !== undefined) && !phantomJS);
	};

	if(IframeTransport.isAvailable())
		ConnectionManager.httpTransports['iframe'] = ConnectionManager.transports['iframe'] = IframeTransport;

	IframeTransport.tryConnect = function(connectionManager, auth, params, callback) {
		var transport = new IframeTransport(connectionManager, auth, params);
		var errorCb = callback;
		transport.on('iferror', errorCb);
		transport.on('ifopen', function() {
			Logger.logAction(Logger.LOG_MINOR, 'IframeTransport.tryConnect()', 'viable transport ' + transport);
			transport.off('iferror', errorCb);
			callback(null, transport);
		});
		transport.connect();
	};

	IframeTransport.prototype.toString = function() {
		return 'IframeTransport; uri=' + this.uri;
	};

	IframeTransport.prototype.connect = function() {
		Logger.logAction(Logger.LOG_MINOR, 'IframeTransport.connect()', 'starting');
		Transport.prototype.connect.call(this);
		var self = this;

		this.auth.getAuthParams(function(err, authParams) {
			if(err) {
				self.abort(err);
				return;
			}
			var connectParams = self.params.getConnectParams(authParams);
			connectParams.origin = origin;
			self.createIframe(connectParams, function(err) {
				if(err) {
					self.emit('iferror', err);
					return;
				}
				self.emit('ifopen');
			});
		});
	};

	IframeTransport.prototype.send = function(message) {
		var destWindow = this.destWindow;
		if(destWindow)
			destWindow.postMessage(JSON.stringify(message), this.destOrigin);
	};

	IframeTransport.prototype.createIframe = function(params, callback) {
		var wrapIframe = this.wrapIframe = document.createElement('iframe'),
			options = this.params.options,
			destOrigin = this.destOrigin = 'https://' + Defaults.getHost(options) + ':' + Defaults.getPort(options, true),
			destUri = destOrigin + '/static/iframe.html' + Utils.toQueryString(params),
			iframeComplete = false,
			wrapWindow = null,
			self = this;

		Logger.logAction(Logger.LOG_MINOR, 'IframeTransport.createIframe()', 'destUri: ' + destUri);
		DomEvent.addUnloadListener(clearIframe);

		function clearIframe() {
			self.dispose();
		}

		function onload() {
			self.destWindow = wrapWindow.destWindow;
			DomEvent.addMessageListener(wrapWindow, self.messageListener = messageListener);
			iframeComplete = true;
			callback(null, wrapIframe);
		};

		function onerror(e) {
			clearIframe();
			if(!iframeComplete) {
				iframeComplete = true;
				e = e || new Error('Unknown error loading iframe');
				callback(e);
			}
		};

		function messageListener(ev) {
			self.onData(ev.data);
		};

		wrapIframe.style.display = 'none';
		wrapIframe.style.position = 'absolute';
		wrapIframe.onerror = onerror;

		DomEvent.addListener(wrapIframe, 'load', (self.onloadListener = onload));
		document.body.appendChild(wrapIframe);
		wrapWindow = self.wrapWindow = wrapIframe.contentWindow;

		var wrapDocument = wrapWindow.document;
		wrapDocument.open();
		wrapDocument.write(wrapIframeContent(destUri));
		wrapDocument.close();
	};

	IframeTransport.prototype.onData = function(data) {
		Logger.logAction(Logger.LOG_MICRO, 'IframeTransport.onData()', 'length = ' + data.length);
		try {
			var items = JSON.parse(String(data));
			if(items && items.length)
				for(var i = 0; i < items.length; i++)
					this.onChannelMessage(items[i]);
		} catch (e) {
			Logger.logAction(Logger.LOG_ERROR, 'IframeTransport.onData()', 'Unexpected exception handing channel event: ' + e);
		}
	};

	IframeTransport.prototype.dispose = function() {
		Logger.logAction(Logger.LOG_MICRO, 'IframeTransport.dispose()', '');

		var messageListener = this.messageListener;
		if(messageListener) {
			DomEvent.removeMessageListener(this.wrapWindow, messageListener);
			this.messageListener = null;
		}

		var wrapIframe = this.wrapIframe;
		if(wrapIframe) {
			var onloadListener = this.onloadListener;
			if(onloadListener)
				DomEvent.removeListener(wrapIframe, 'load', onloadListener);

			wrapIframe.onerror = null;
			this.wrapIframe = null;
			/* This timeout makes chrome fire onbeforeunload event
			 * within iframe. Without the timeout it goes straight to
			 * addUnloadListener. */
			setTimeout(function() {
				wrapIframe.parentNode.removeChild(wrapIframe);
			}, 0);
		}
	};

	function wrapIframeContent(src) {
		return '<!DOCTYPE html>\n'
			+	'<html>\n'
			+	'  <head>\n'
			+	'    <script type="text/javascript">\n'
			+	'    var destWindow;\n'
			+	'    function onIframeLoaded() {\n'
			+	'      destWindow = document.getElementById("dest").contentWindow;\n'
			+	'    }\n'
			+	'    </script>\n'
			+	'  </head>\n'
			+	'  <body>\n'
			+	'    <iframe id="dest" src="' + src + '" onload="onIframeLoaded();">\n'
			+	'    </iframe>\n'
			+	'  </body>\n'
			+	'</html>\n';
	}

	return IframeTransport;
})();
