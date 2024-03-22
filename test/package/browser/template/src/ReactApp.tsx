import * as Ably from 'ably';
import { useChannel } from 'ably/react';
import { useEffect, useState } from 'react';

export function App() {
  // check that we can refer to the types exported by Ably.
  const [messages, updateMessages] = useState<Ably.Message[]>([]);

  // check that we can use ably/react exported members
  const { channel, ably } = useChannel({ channelName: 'channel' }, (message) => {
    updateMessages((prev) => [...prev, message]);
  });

  const messagePreviews = messages.map((message, idx) => <MessagePreview key={idx} message={message} />);

  useEffect(() => {
    async function publishMessages() {
      try {
        // Check that we can use the TypeScript overload that accepts name and data as separate arguments
        await channel.publish('message', { foo: 'bar' });

        // Check that we can use the TypeScript overload that accepts a Message object
        await channel.publish({ name: 'message', data: { foo: 'baz' } });
        (window as any).onResult();
      } catch (error) {
        (window as any).onResult(error);
      }
    }

    publishMessages();
  }, [channel]);

  return (
    <div>
      <header>Ably NPM package test (react export)</header>
      <div>
        <h2>Messages</h2>
        <ul>{messagePreviews}</ul>
      </div>
    </div>
  );
}

function MessagePreview({ message }: { message: Ably.Message }) {
  return (
    <li>
      {message.name}: {message.data.foo}
    </li>
  );
}
