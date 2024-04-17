import websockets
import asyncio
import logging

class ControlServer:
    def __init__(self, interception_context):
        self._websocket_connections = []
        self._interception_context = interception_context

    # TODO make it not keep trying to restart this server every time I modify this file
    async def run(self):
        async with websockets.serve(self._handle_websocket_connection, "", 8001):
            await asyncio.Future() # run forever

    async def _handle_websocket_connection(self, websocket):
        logging.info(f'TestProxy handle_websocket_connection {websocket}, open {websocket.open}')
        # Store the connection so we can broadcast to it later.
        self._websocket_connections.append(websocket)
        logging.info(f'TestProxy now has websockets {self._websocket_connections}')

        async for message in websocket:
            logging.info(f'TestProxy received control message: {message}')
            try:
                self._interception_context.on_websocket_message(message)
            except Exception as err:
                logging.info(f'TestProxy got error handling control message: {err}')
