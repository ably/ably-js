import ErrorInfo from '../types/errorinfo';

class ConnectionStateChange {
  previous?: string;
  current?: string;
  retryIn?: number;
  reason?: ErrorInfo;

  constructor(previous?: string, current?: string, retryIn?: number | null, reason?: ErrorInfo) {
    this.previous = previous;
    this.current = current;
    if (retryIn) this.retryIn = retryIn;
    if (reason) this.reason = reason;
  }
}

export default ConnectionStateChange;
