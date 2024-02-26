declare module 'consistent-hash' {
  interface ConsistentHashOptions {
    range?: number;
    weight?: number;
    distribution?: 'uniform';
    orderNodes?: (nodes: any[]) => any[];
  }

  class ConsistentHash {
    constructor(options?: ConsistentHashOptions);

    nodeCount: number;
    keyCount: number;

    add(node: string, weight?: number, points?: number[]): ConsistentHash;
    remove(node: string): ConsistentHash;
    get(name: string | number, count?: number): string;
    getNodes(): string[];
    getPoints(node: any): number[] | undefined;
  }

  export = ConsistentHash;
}
