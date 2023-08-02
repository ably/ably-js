import { Rest } from './rest';

export interface ModulesMap {
  Rest?: typeof Rest;
}

export const allCommonModules: ModulesMap = { Rest };
