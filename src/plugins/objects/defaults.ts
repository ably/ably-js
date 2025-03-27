export const DEFAULTS = {
  gcInterval: 1000 * 60 * 5, // 5 minutes
  /**
   * Must be > 2 minutes to ensure we keep tombstones long enough to avoid the possibility of receiving an operation
   * with an earlier serial that would not have been applied if the tombstone still existed.
   *
   * Applies both for map entries tombstones and object tombstones.
   */
  gcGracePeriod: 1000 * 60 * 60 * 24, // 24 hours
};
