import logging
import json
import uuid
import asyncio
import mitmproxy

from control_rpc import JSONRPCRequest, TransformInterceptedMessageJSONRPCRequest, JSONRPCResponse, TransformInterceptedMessageJSONRPCResponse, json_rpc_response_from_dto
from intercepted_messages_queue import InterceptedMessagesQueue, InterceptedMessagePredicate, InterceptedMessageHandle, DropMessageAction, ReplaceMessageAction, InterceptedMessage

class InterceptionContext:
    def __init__(self):
        self._intercepted_messages_queue = InterceptedMessagesQueue()
        self._json_rpc_request_ids_to_handles = {}
        self.control_server = None

    # control API currently only works with text frames
    def on_websocket_message(self, payload: str):
        dto = json.loads(payload)

        if 'error' in dto:
            raise Exception(f'TestProxy not expecting there to be an error in JSON-RPC response')
        elif 'result' in dto:
            response = json_rpc_response_from_dto(dto)
            self.handle_json_rpc_response(response)
        else:
            raise Exception(f'TestProxy got unrecognised control API message {dto}')

    def handle_json_rpc_response(self, response: JSONRPCResponse):
        logging.info(f'TestProxy got JSON-RPC response: {response}, type: {type(response)}')
        match response:
            case TransformInterceptedMessageJSONRPCResponse():
                self.handle_transform_intercepted_message_response(response)
            case _:
                raise Exception(f'TestProxy got unknown response {response}')

    def handle_transform_intercepted_message_response(self, response: TransformInterceptedMessageJSONRPCResponse):
        json_rpc_request_id = uuid.UUID(response.id)
        handle = self._json_rpc_request_ids_to_handles[json_rpc_request_id]

        if handle is None:
            raise Exception(f'TestProxy doesn’t recognise response ID {json_rpc_request_id}, enqueued, messages are {self._intercepted_messages_queue}')

        del self._json_rpc_request_ids_to_handles[json_rpc_request_id]

        if not self._intercepted_messages_queue.is_head(handle):
            raise Exception(f'TestProxy got response for an intercepted message that’s not at head of queue; shouldn’t be possible {json_rpc_request_id}')

        intercepted_message = self._intercepted_messages_queue.get_head(handle.predicate)

        if intercepted_message.action is not None:
            raise Exception(f'TestProxy was asked to set the action for a message that already has an action set; shouldn’t happen.')

        intercepted_message.action = response.result

        self._dequeue_intercepted_message(handle.predicate)

    def _dequeue_intercepted_message(self, predicate):
        logging.info(f'TestProxy dequeueing intercepted message')

        message = self._intercepted_messages_queue.pop(predicate)

        if message.action is None:
            raise Exception(f'TestProxy attempted to dequeue {message} but it doesn’t have action')

        match message.action:
            case ReplaceMessageAction(type, data):
                # inject the replacement
                # https://docs.mitmproxy.org/stable/addons-examples/#websocket-inject-message
                logging.info(f'TestProxy re-injecting message {message} with new type {type} and new data {data}')
                # https://github.com/mitmproxy/mitmproxy/blob/e834259215dc4dd6f1b58dee8e0f84943a002db6/mitmproxy/addons/proxyserver.py#L308-L322
                mitmproxy.ctx.master.commands.call("inject.websocket", predicate.flow, not predicate.from_client, data.encode() if type == 'text' else data, type == 'text')
            case DropMessageAction:
                # drop the message
                logging.info(f'TestProxy dropping message {message}')

        if self._intercepted_messages_queue.has_messages(predicate):
            self._broadcast_next_message(predicate)

    def _broadcast_json_rpc_request(self, request: JSONRPCRequest):
        data = json.dumps(request.create_dto())

        logging.info(f'TestProxy broadcast request JSON {data}')
        # TODO tidy up - have a method on server
        for websocket in self.control_server._websocket_connections:
            logging.info(f'TestProxy broadcast to connection {websocket}, open {websocket.open}')
            asyncio.get_running_loop().create_task(websocket.send(data))

    def _broadcast_next_message(self, predicate):
        intercepted_message = self._intercepted_messages_queue.get_head(predicate)

        json_rpc_request_id = uuid.uuid4()

        handle = InterceptedMessageHandle(predicate, intercepted_message.id)
        self._json_rpc_request_ids_to_handles[json_rpc_request_id] = handle

        # Broadcast to everyone connected to the control server.
        # TODO I think would be better for there to be one client who sends an explicit message to become the active client, or to only allow a single connection at a time; not important now though
        logging.info(f'TestProxy broadcast message {intercepted_message!r}')

        json_rpc_request = TransformInterceptedMessageJSONRPCRequest(id = str(json_rpc_request_id), type = "text" if intercepted_message.message.is_text else "binary", data = intercepted_message.message.text if intercepted_message.message.is_text else intercepted_message.message.content, from_client = intercepted_message.message.from_client)
        self._broadcast_json_rpc_request(json_rpc_request)

    def enqueue_message(self, message, flow):
        predicate = InterceptedMessagePredicate(flow, message.from_client)

        intercepted_message = InterceptedMessage(message)
        self._intercepted_messages_queue.append(intercepted_message, predicate)

        # drop the message; we’ll insert it later when the client tells us what to do with it
        message.drop()

        if self._intercepted_messages_queue.count(predicate) == 1:
            self._broadcast_next_message(predicate)
        else:
            logging.info(f'TestProxy enqueued message {message} since there are {self._intercepted_messages_queue.count(predicate) - 1} pending messages')
