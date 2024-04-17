from base64 import b64encode, b64decode
from dataclasses import dataclass
from intercepted_messages_queue import DropMessageAction, ReplaceMessageAction
from typing import Literal
import logging

@dataclass
class JSONRPCRequest:
    id: str

    def create_dto(self):
        return { "jsonrpc": "2.0", "id": self.id }

@dataclass
class TransformInterceptedMessageJSONRPCRequest(JSONRPCRequest):
    type: Literal["binary", "text"]
    data: bytes | str
    from_client: bool

    def create_dto(self):
        data_param = None
        match self.type:
            case "binary":
                data_param = b64encode(self.data).decode('utf-8')
            case "text":
                data_param = self.data

        params = { 'type': self.type, 'data': data_param, 'fromClient': self.from_client }
        return { **super().create_dto(), "method": "transformInterceptedMessage", "params": params }

def json_rpc_response_from_dto(dto):
    # TODO when we add more methods we’ll need a way to know which method the request corresponds to, via the ID
    return TransformInterceptedMessageJSONRPCResponse.from_dto(dto)

@dataclass
class JSONRPCResponse:
    id: str

@dataclass
class TransformInterceptedMessageJSONRPCResponse(JSONRPCResponse):
    result: DropMessageAction | ReplaceMessageAction

    def from_dto(dto):
        match dto['result']['action']:
            case 'drop':
                result = DropMessageAction()
            case 'replace':
                type = dto['result']['type']
                match type:
                    case 'binary':
                        data = b64decode(dto['result']['data'])
                    case 'text':
                        data = dto['result']['data']
                result = ReplaceMessageAction(type, data)

        return TransformInterceptedMessageJSONRPCResponse(id = dto['id'], result = result)
