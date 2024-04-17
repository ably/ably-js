export enum InterceptedConnectionEvent {
  /**
   * The proxy’s WebSocket connection to the client emitted a `close` event.
   */
  ClientClose,

  /**
   * The proxy’s WebSocket connection to the server emitted an `open` event.
   */
  ServerOpen,

  /**
   * The proxy’s WebSocket connection to the server emitted a `close` event.
   */
  ServerClose,
}

export enum InterceptedConnectionState {
  /**
   * Initial state.
   *
   * Transitions:
   *
   * Event: ClientClose
   * New state: ConnectingToServerButNoLongerConnectedToClient
   *
   * Event: ServerOpen
   * New state: ConnectedToClientAndServer
   *
   * Event: ServerClose
   * New state: ConnectedToClientAndFailedToConnectToServer
   */
  ConnectedToClientButNotYetServer,

  /**
   * The client closed the connection whilst we were connecting to the server.
   *
   * Transitions:
   *
   * Event: ServerOpen
   * New state: ConnectedToServerButNoLongerToClient
   *
   * Event: ServerClose
   * New state: Disconnected
   */
  ConnectingToServerButNoLongerConnectedToClient,

  /**
   * We failed to establish a connection to the server.
   *
   * Transitions:
   *
   * Event: ClientClose
   * New state: Disconnected
   */
  ConnectedToClientAndFailedToConnectToServer,

  /**
   * In this state, we can send messages in both directions.
   *
   * Transitions:
   *
   * Event: ClientClose
   * New state: ConnectedToServerButNoLongerToClient
   *
   * Event: ServerClose
   * New state: ConnectedToClientButNoLongerToServer
   */
  ConnectedToClientAndServer,

  /**
   * The server closed the connection.
   *
   * Transitions:
   *
   * Event: ClientClose
   * New state: Disconnected
   */
  ConnectedToClientButNoLongerToServer,

  /**
   * The client closed the connection.
   *
   * Transitions:
   *
   * Event: ServerClose
   * New state: Disconnected
   */
  ConnectedToServerButNoLongerToClient,

  /**
   * Final state.
   */
  Disconnected,
}

export interface InterceptedConnectionStateMachineTransition {
  newState: InterceptedConnectionState;
}

interface InterceptedConnectionStateMachineRule {
  fromState: InterceptedConnectionState;
  event: InterceptedConnectionEvent;
  transition: InterceptedConnectionStateMachineTransition;
}

class InterceptedConnectionStateMachineDefinition {
  private rules: InterceptedConnectionStateMachineRule[] = [];

  constructor() {
    this.addRule(
      InterceptedConnectionState.ConnectedToClientButNotYetServer,
      InterceptedConnectionEvent.ClientClose,
      InterceptedConnectionState.ConnectingToServerButNoLongerConnectedToClient,
    );
    this.addRule(
      InterceptedConnectionState.ConnectedToClientButNotYetServer,
      InterceptedConnectionEvent.ServerOpen,
      InterceptedConnectionState.ConnectedToClientAndServer,
    );
    this.addRule(
      InterceptedConnectionState.ConnectedToClientButNotYetServer,
      InterceptedConnectionEvent.ServerClose,
      InterceptedConnectionState.ConnectedToClientAndFailedToConnectToServer,
    );
    this.addRule(
      InterceptedConnectionState.ConnectingToServerButNoLongerConnectedToClient,
      InterceptedConnectionEvent.ServerOpen,
      InterceptedConnectionState.ConnectedToServerButNoLongerToClient,
    );
    this.addRule(
      InterceptedConnectionState.ConnectingToServerButNoLongerConnectedToClient,
      InterceptedConnectionEvent.ServerClose,
      InterceptedConnectionState.Disconnected,
    );
    this.addRule(
      InterceptedConnectionState.ConnectedToClientAndFailedToConnectToServer,
      InterceptedConnectionEvent.ClientClose,
      InterceptedConnectionState.Disconnected,
    );
    this.addRule(
      InterceptedConnectionState.ConnectedToClientAndServer,
      InterceptedConnectionEvent.ClientClose,
      InterceptedConnectionState.ConnectedToServerButNoLongerToClient,
    );
    this.addRule(
      InterceptedConnectionState.ConnectedToClientAndServer,
      InterceptedConnectionEvent.ServerClose,
      InterceptedConnectionState.ConnectedToClientButNoLongerToServer,
    );
    this.addRule(
      InterceptedConnectionState.ConnectedToClientButNoLongerToServer,
      InterceptedConnectionEvent.ClientClose,
      InterceptedConnectionState.Disconnected,
    );
    this.addRule(
      InterceptedConnectionState.ConnectedToServerButNoLongerToClient,
      InterceptedConnectionEvent.ServerClose,
      InterceptedConnectionState.Disconnected,
    );
  }

  private addRule(
    fromState: InterceptedConnectionState,
    event: InterceptedConnectionEvent,
    newState: InterceptedConnectionState,
  ) {
    this.rules.push({ fromState, event, transition: { newState } });
  }

  fetchTransition(
    fromState: InterceptedConnectionState,
    event: InterceptedConnectionEvent,
  ): InterceptedConnectionStateMachineTransition | null {
    for (const rule of this.rules) {
      if (rule.fromState == fromState && rule.event == event) {
        return rule.transition;
      }
    }

    return null;
  }
}

export const stateMachineDefinition = new InterceptedConnectionStateMachineDefinition();
