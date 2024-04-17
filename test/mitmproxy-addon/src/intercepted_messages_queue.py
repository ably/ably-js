import mitmproxy
import uuid
from dataclasses import dataclass
from typing import Literal

@dataclass
class InterceptedMessagePredicate:
    flow: mitmproxy.http.HTTPFlow
    from_client: bool

    # https://stackoverflow.com/a/4901847

    def __hash__(self):
        return hash((self.flow, self.from_client))

    def __eq__(self, other):
        return (self.flow, self.from_client) == (other.flow, other.from_client)

@dataclass
# A handle for locating a message within InterceptedMessageQueue.
class InterceptedMessageHandle:
    predicate: InterceptedMessagePredicate
    message_id: uuid.UUID

class DropMessageAction:
    pass

@dataclass
class ReplaceMessageAction:
    type: Literal["binary", "text"]
    data: bytes | str

@dataclass
class InterceptedMessage:
    message: mitmproxy.websocket.WebSocketMessage
    id: uuid.UUID = uuid.uuid4()
    action: None | DropMessageAction | ReplaceMessageAction = None

# Per-connection, per-direction message queue. We use it to queue intercepted messages whilst waiting for a control server message telling us what to do with the message at the head of the queue.
class InterceptedMessagesQueue:
    def __init__(self):
        # Maps an InterceptedMessagePredicate to a queue
        self.queues = {}

    def _messages_for(self, predicate, create_if_needed = False):
        if predicate in self.queues:
            return self.queues[predicate]
        else:
            result = []
            if create_if_needed:
                self.queues[predicate] = result
            return result

    def pop(self, predicate):
        return self._messages_for(predicate).pop(0)

    def has_messages(self, predicate):
        return len(self._messages_for(predicate)) != 0

    def append(self, message: InterceptedMessage, predicate):
        self._messages_for(predicate, create_if_needed = True).append(message)

    def count(self, predicate):
        return len(self._messages_for(predicate))

    def is_head(self, handle: InterceptedMessageHandle):
        head = self._messages_for(handle.predicate)[0]
        return head.id == handle.message_id

    def get_head(self, predicate: InterceptedMessagePredicate):
        return self._messages_for(predicate)[0]
