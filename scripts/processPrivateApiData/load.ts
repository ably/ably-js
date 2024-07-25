import { readFileSync } from 'fs';
import { applyingExclusions } from './exclusions';
import { splittingRecords, stripFilePrefix } from './utils';
import { Record } from './dto';

export function load(jsonFilePath: string) {
  let records = JSON.parse(readFileSync(jsonFilePath).toString('utf-8')) as Record[];

  stripFilePrefix(records);

  let { usageDtos, testStartRecords } = splittingRecords(records);

  usageDtos = applyingExclusions(usageDtos);

  return { usageDtos, testStartRecords };
}
