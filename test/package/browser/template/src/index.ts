import { Realtime } from 'ably';

(async () => {
  const realtime = new Realtime({ key: '' });

  const channel = realtime.channels.get('someChannel');
  await channel.attach();
})();
