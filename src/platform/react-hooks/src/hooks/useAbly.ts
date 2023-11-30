import React from 'react';
import { getContext } from '../AblyProvider.js';
import * as API from '../../../../../ably.js';

export function useAbly(id = 'default'): API.Types.AbstractRealtime {
  const client = React.useContext(getContext(id)) as API.Types.AbstractRealtime;

  if (!client) {
    throw new Error(
      'Could not find ably client in context. ' + 'Make sure your ably hooks are called inside an <AblyProvider>'
    );
  }

  return client;
}
