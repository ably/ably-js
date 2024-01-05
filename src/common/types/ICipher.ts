export default interface ICipher<InputPlaintext, OutputCiphertext, InputCiphertext, OutputPlaintext> {
  algorithm: string;
  encrypt: (plaintext: InputPlaintext, callback: (error: Error | null, data?: OutputCiphertext) => void) => void;
  decrypt: (ciphertext: InputCiphertext) => Promise<OutputPlaintext>;
}
