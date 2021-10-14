export type StandardCallback<T> = (err?: ErrorInfo | null, result?: T) => void;
export type ErrCallback = (err?: ErrorInfo | null) => void;
