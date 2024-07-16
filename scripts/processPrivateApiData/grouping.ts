import { PrivateApiUsageDto } from './dto';

export type Group<Key, Value> = {
  key: Key;
  values: Value[];
};

export function grouped<Key, Value>(
  values: Value[],
  keyForValue: (value: Value) => Key,
  areKeysEqual: (key1: Key, key2: Key) => boolean,
) {
  const result: Group<Key, Value>[] = [];

  for (const value of values) {
    const key = keyForValue(value);

    let existingGroup = result.find((group) => areKeysEqual(group.key, key));

    if (existingGroup === undefined) {
      existingGroup = { key, values: [] };
      result.push(existingGroup);
    }

    existingGroup.values.push(value);
  }

  return result;
}

/**
 * Makes sure that each private API is only listed once in a given context.
 */
function dedupeUsages<Key>(contextGroups: Group<Key, PrivateApiUsageDto>[]) {
  for (const contextGroup of contextGroups) {
    const newUsages: typeof contextGroup.values = [];

    for (const usage of contextGroup.values) {
      const existing = newUsages.find((otherUsage) => otherUsage.privateAPIIdentifier === usage.privateAPIIdentifier);
      if (existing === undefined) {
        newUsages.push(usage);
      }
    }

    contextGroup.values = newUsages;
  }
}

export function groupedAndDeduped<Key>(
  usages: PrivateApiUsageDto[],
  keyForUsage: (usage: PrivateApiUsageDto) => Key,
  areKeysEqual: (key1: Key, key2: Key) => boolean,
) {
  const result = grouped(usages, keyForUsage, areKeysEqual);
  dedupeUsages(result);
  return result;
}

/**
 * Return value is sorted in decreasing order of usage of a given private API identifer
 */
export function groupedAndSortedByPrivateAPIIdentifier<Key>(
  groupedByKey: Group<Key, PrivateApiUsageDto>[],
): Group<string, Key>[] {
  const flattened = groupedByKey.flatMap((group) => group.values.map((value) => ({ key: group.key, value })));

  const groupedByPrivateAPIIdentifier = grouped(
    flattened,
    (value) => value.value.privateAPIIdentifier,
    (id1, id2) => id1 === id2,
  ).map((group) => ({ key: group.key, values: group.values.map((value) => value.key) }));

  groupedByPrivateAPIIdentifier.sort((group1, group2) => group2.values.length - group1.values.length);

  return groupedByPrivateAPIIdentifier;
}
