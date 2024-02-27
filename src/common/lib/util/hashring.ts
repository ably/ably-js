// HashRing currently implements a modulo-based hash partitioning scheme.
// It is used to distribute keys across a set of nodes.
// TODO(mschristensen): use consistent hashing instead of modulo-based hashing
// to avoid re-assigning all keys when nodes are added or removed.
export default class HashRing {
  private nodes: string[] = [];

  constructor(nodes?: string[]) {
    if (nodes) {
      this.nodes = nodes;
    }
  }

  add(node: string): void {
    if (this.nodes.includes(node)) {
      return;
    }
    this.nodes.push(node);
    this.nodes.sort();
  }

  remove(node: string): void {
    this.nodes = this.nodes.filter((n) => n !== node);
  }

  get(key: string): string {
    const hash = this.hash(key);
    const index = hash % this.nodes.length;
    return this.nodes[index];
  }

  hash(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash << 5) - hash + key.charCodeAt(i);
      hash = hash >>> 0; // convert to 32 bit unsigned integer
    }
    return hash;
  }

  getNodes(): string[] {
    return this.nodes;
  }
}
