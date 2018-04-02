export namespace Types {
  export class ClientOptions {
    key?: string;
    clientId?: string;

    /**
     * When true, time is queried from the Ably servers. Example help text.
     */
    queryTime?: boolean;

    constructor(options?: ClientOptions);
  }
}

export declare class Realtime {
  constructor(options: Types.ClientOptions | string);

  /**
   * Example function to expose clientOptions. See https://foo.bar
   */
  getClientOptions: () => string;
}
