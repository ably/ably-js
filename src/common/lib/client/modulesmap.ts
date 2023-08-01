import { Rest } from './rest';
import { IUntypedCryptoStatic } from '../../types/ICryptoStatic';

export interface ModulesMap {
  Rest?: typeof Rest;
  Crypto?: IUntypedCryptoStatic;
}

export const allCommonModules: ModulesMap = { Rest };
