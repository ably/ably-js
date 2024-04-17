import logging
import mitmproxy
import asyncio

from control_server import ControlServer
from interception_context import InterceptionContext

# TODO cleanup as control server connections go away
# TODO cleanup as intercepted connections go away

class AblyInterceptionProxyAddon:
    # Called when an addon is first loaded. This event receives a Loader object, which contains methods for adding options and commands. This method is where the addon configures itself.
    def load(self, loader: mitmproxy.addonmanager.Loader):
        logging.info("TestProxy load")
        self._interception_context = InterceptionContext()
        self._control_server = ControlServer(self._interception_context)
        self._interception_context.control_server = self._control_server
        self._control_server_task = asyncio.get_running_loop().create_task(self._control_server.run())

# events I observe when the script is hot-reloaded upon changing this file:
#
# [17:46:19.517] Loading script test-proxy.py
#
# presumably the old one:
# [17:46:19.519] TestProxy done
#
# presumably the new one:
# [17:46:19.525] TestProxy load
# [17:46:19.526] TestProxy configure
# [17:46:19.526] TestProxy running
#
# want to make sure the server get shut down, because it didn't before and I got errors

    def done(self):
        logging.info("TestProxy done")
        # wrote this before seeing https://websockets.readthedocs.io/en/stable/faq/server.html#how-do-i-stop-a-server, will keep what I’ve got here until I understand that incantation
        # hmm, doesn't actually seem to be working, look into it further
        self._control_server_task.cancel()
        self._control_server = None

    def configure(self, updated):
        logging.info("TestProxy configure")

    def running(self):
        logging.info("TestProxy running")

    # A WebSocket connection has commenced.
    def websocket_start(self, flow: mitmproxy.http.HTTPFlow):
        logging.info("TestProxy websocket_start")

    # Called when a WebSocket message is received from the client or server. The most recent message will be flow.messages[-1]. The message is user-modifiable. Currently there are two types of messages, corresponding to the BINARY and TEXT frame types.
    # TODO do we need to think about fragmentation?
    def websocket_message(self, flow: mitmproxy.http.HTTPFlow):
        message = flow.websocket.messages[-1]

        if message.injected:
            logging.info("TestProxy re-received injected message; not doing anything to it")
            return

        logging.info("TestProxy websocket_message")
        self._interception_context.enqueue_message(message, flow)

    # A WebSocket connection has ended. You can check flow.websocket.close_code to determine why it ended.
    def websocket_end(self, flow: mitmproxy.http.HTTPFlow):
        logging.info("TestProxy websocket_end")

addons = [AblyInterceptionProxyAddon()]
