import mitmproxy
import logging
import asyncio
import websockets
import json

async def send_ready_notification():
    uri = "ws://localhost:8001"
    logging.info(f'sending mitmproxyReady JSON-RPC notification to {uri}')
    async with websockets.connect(uri) as websocket:
        notification_dto = { "jsonrpc": "2.0", "method": "mitmproxyReady" }
        data = json.dumps(notification_dto)
        await websocket.send(data)

class MitmproxyAddon2:
    def running(self):
        # tell the control API that we’re ready to receive traffic
        asyncio.get_running_loop().create_task(send_ready_notification())

    # Copied from https://docs.mitmproxy.org/stable/addons-examples/#http-redirect-requests
    def request(self, flow: mitmproxy.http.HTTPFlow) -> None:
        # To make sure that when running in local redirect mode (and hence intercepting all traffic from the test process) we don’t mess with traffic from the test process to the control API
        # TODO see extended comments re this in test-node.yml and why it hasn’t yet been an issue in practice on macOS
        if not flow.request.port in [80, 443]:
            return

        # (b'Connection', b'Upgrade'), (b'Upgrade', b'websocket')
        intercept = MitmproxyAddon2.is_websocket_upgrade_request(flow.request)
        logging.info(f'MitmproxyAddon2 {"intercepting" if intercept else "not intercepting"} `request` {flow.request.url}, headers {flow.request.headers}')
        # pretty_host takes the "Host" header of the request into account,
        # which is useful in transparent mode where we usually only have the IP
        # otherwise.
        # if flow.request.pretty_host == "example.org":
        # I tried doing it in websocket_start instead but that didn’t work
        if MitmproxyAddon2.is_websocket_upgrade_request(flow.request):
            original_host = flow.request.pretty_host
            original_scheme = flow.request.scheme

            flow.request.host = "localhost"
            flow.request.port = 8002
            flow.request.scheme = 'http'
            # TODO understand how port fits into this
            flow.request.headers['Ably-Test-Host'] = original_host
            match original_scheme:
                case 'http':
                    flow.request.headers['Ably-Test-Proto'] = 'ws'
                case 'https':
                    flow.request.headers['Ably-Test-Proto'] = 'wss'

    def is_websocket_upgrade_request(request: mitmproxy.http.Request):
        # TODO this request handling is a bit fragile, the special case for `split` is just to handle the fact that Firefox sends 'Connection: keep-alive, Upgrade'
        return True if 'Connection' in request.headers and ('Upgrade' in request.headers['Connection'].split(", ")) and 'Upgrade' in request.headers and request.headers['Upgrade'] == 'websocket' else False

addons = [MitmproxyAddon2()]
