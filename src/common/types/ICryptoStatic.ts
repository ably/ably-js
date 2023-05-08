import * as API from '../../../ably';
import ICipher from './ICipher';

export type IGetCipherParams<IV> = (API.Types.CipherParams | API.Types.CipherParamOptions) & { iv?: IV };
export interface IGetCipherReturnValue<Cipher> {
  cipher: Cipher;
  cipherParams: API.Types.CipherParams;
}

export default interface ICryptoStatic<IV, InputPlaintext, OutputCiphertext, InputCiphertext, OutputPlaintext>
  extends API.Types.Crypto {
  getCipher(
    params: IGetCipherParams<IV>
  ): IGetCipherReturnValue<ICipher<InputPlaintext, OutputCiphertext, InputCiphertext, OutputPlaintext>>;
}
