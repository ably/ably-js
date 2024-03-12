import * as Ably from 'ably';
import React from 'react';

export default function MessagePreview({ message }: { message: Ably.Types.Message }) {
  return <li>{message.data.text}</li>;
}
