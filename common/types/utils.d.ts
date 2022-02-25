export type StandardCallback<T> = (err?: ErrorInfo | null, result?: T) => void;
export type ErrCallback = (err?: ErrorInfo | null) => void;
export type PaginatedResultCallback<T> = StandardCallback<PaginatedResult<T>>;
/**
 * Use this to override specific property typings on an existing object type
 */
export type Modify<T, R> = Omit<T, keyof R> & R;
