import sys
import asyncio

async def wait_a_bit_then_exit():
    await asyncio.sleep(1)
    sys.exit()

class MitmproxyAddon:
    # Wait until we’ve started up, and presumably generated the SSL certs, then exit. (The wait is because if I put a `sys.exit()` directly inside `running()`, the certs aren’t yet generated; I guess there’s some enqueued work I need to wait to complete)
    def running(self):
        asyncio.get_running_loop().create_task(wait_a_bit_then_exit())

addons = [MitmproxyAddon()]
