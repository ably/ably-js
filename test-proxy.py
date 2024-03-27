import logging
import mitmproxy
import asyncio
import websockets
import json
from uuid import uuid4
from base64 import b64encode

# TODO

async def run_control_server():
    async with websockets.serve(handle_websocket_connection, "", 8001):
        await asyncio.Future() # run forever

control_websocket_connections = []

async def handle_websocket_connection(websocket):
    logging.info(f'TestProxy handle_websocket_connection {websocket}, open {websocket.open}')
    # Store the connection so we can broadcast to it later.
    control_websocket_connections.append(websocket)
    logging.info(f'TestProxy now has websockets {control_websocket_connections}')

    async for message in websocket:
        logging.info(f'TestProxy received control message: {message}, intercepted messages queue is {intercepted_messages_queue}')
        handle_response(message)

intercepted_messages_queue = []

# we're currently expecting to only operate using text frames
def handle_response(message):
    response = json.loads(message)
    logging.info(f'TestProxy got response: {response}')

    found = False
    for i, data in enumerate(intercepted_messages_queue):
        if response.id == data.id:
            found = True
            data.replacement = message.params
            break

    if !found:
        raise Exception(f'TestProxy doesn’t recognise repsonse ID {response.id}')

    flush_intercepted_messages_queue

def flush_intercepted_messages_queue:
    # TODO flush everything in intercepted_messages_queue with a `replacement` (might be null)
    pass

def broadcast_message(message):
    json_rpc_request_id = str(uuid4())
    intercepted_messages_queue.append({ 'json_rpc_request_id': json_rpc_request_id, 'message': message })
    # drop the message; we’ll insert it later when the client tells us to (TODO)
    message.drop()

    # Broadcast to everyone connected to the control server.
    logging.info(f'TestProxy broadcast_message {message!r}')

    json_rpc_request_params = { 'content': b64encode(message.content).decode('utf-8'), 'from_client': message.from_client }
    json_rpc_request = { "jsonrpc": "2.0", "method": "transformInterceptedMessage", "params": json_rpc_request_params, "id": json_rpc_request_id }

    json_rpc_request_data = json.dumps(json_rpc_request)

    logging.info(f'TestProxy broadcast_message JSON {json_rpc_request_data}')
    for websocket in control_websocket_connections:
        logging.info(f'TestProxy broadcast to connection {websocket}, open {websocket.open}')
        # this isn't working for some reason
        # https://websockets.readthedocs.io/en/stable/reference/asyncio/server.html#websockets.server.WebSocketServerProtocol
        asyncio.get_running_loop().create_task(websocket.send(json_rpc_request_data))

class TestProxy:
    # Called when an addon is first loaded. This event receives a Loader object, which contains methods for adding options and commands. This method is where the addon configures itself.
    def load(self, loader: mitmproxy.addonmanager.Loader):
        self.server_task = asyncio.get_running_loop().create_task(run_control_server())
        logging.info("TestProxy load")

    # A WebSocket connection has commenced.
    def websocket_start(self, flow: mitmproxy.http.HTTPFlow):
        logging.info("TestProxy websocket_start")

    # Called when a WebSocket message is received from the client or server. The most recent message will be flow.messages[-1]. The message is user-modifiable. Currently there are two types of messages, corresponding to the BINARY and TEXT frame types.
    def websocket_message(self, flow: mitmproxy.http.HTTPFlow):
        logging.info("TestProxy websocket_message")
        broadcast_message(flow.websocket.messages[-1])

    # A WebSocket connection has ended. You can check flow.websocket.close_code to determine why it ended.
    def websocket_end(self, flow: mitmproxy.http.HTTPFlow):
        logging.info("TestProxy websocket_end")

addons = [TestProxy()]
