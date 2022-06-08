import ErrorInfo from '../types/errorinfo';

class ChannelStateChange {
  previous: string;
  current: string;
  resumed?: boolean;
  reason?: string | Error | ErrorInfo;

  constructor(previous: string, current: string, resumed?: boolean, reason?: string | Error | ErrorInfo | null) {
    this.previous = previous;
    this.current = current;
    if (current === 'attached') this.resumed = resumed;
    if (reason) this.reason = reason;
  }
}

export default ChannelStateChange;
