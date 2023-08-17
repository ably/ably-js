import { Rest } from './rest';
import { IUntypedCryptoStatic } from '../../types/ICryptoStatic';
import { MsgPack } from 'common/types/msgpack';

export interface ModulesMap {
  Rest?: typeof Rest;
  Crypto?: IUntypedCryptoStatic;
  MsgPack?: MsgPack;
}

export const allCommonModules: ModulesMap = { Rest };
