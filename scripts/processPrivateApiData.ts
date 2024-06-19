import { readFileSync, writeFileSync } from 'fs';
import { stringify as csvStringify } from 'csv-stringify/sync';

console.log('here');

type TestPrivateApiContextDto = {
  type: 'test';
  title: string;
  helperStack: string[];
  file: string;
  suite: string[];
};

type HookPrivateApiContextDto = {
  type: 'hook';
  title: string;
  helperStack: string[];
  file: string;
  suite: string[];
};

type RootHookPrivateApiContextDto = {
  type: 'hook';
  title: string;
  helperStack: string[];
  file: null;
  suite: null;
};

type TestDefinitionPrivateApiContextDto = {
  type: 'definition';
  label: string;
  helperStack: string[];
  file: string;
  suite: string[];
};

type PrivateApiContextDto =
  | TestPrivateApiContextDto
  | HookPrivateApiContextDto
  | RootHookPrivateApiContextDto
  | TestDefinitionPrivateApiContextDto;

type PrivateApiUsageDto = {
  context: PrivateApiContextDto;
  privateAPIIdentifier: string;
};

const usageDtos = JSON.parse(readFileSync('private-api-usage-9986dc4.json').toString('utf-8')) as PrivateApiUsageDto[];

function stripFilePrefix(usageDtos: PrivateApiUsageDto[]) {
  for (const usage of usageDtos) {
    if (usage.context.file !== null) {
      usage.context.file = usage.context.file.replace('/home/runner/work/ably-js/ably-js/', '');
    }
  }
}

stripFilePrefix(usageDtos);

console.log(usageDtos);

/* figuring out the plan:
 *
 * 1. group by context (excluding helperStack)
 *
 *    1. first the root hooks
 *    2. then for each (file, suite)
 *    3. then inside each (file, suite) the definitions
 *    4. then inside each (file, suite) the tests
 *
 * 2. group by (privateAPIIdentifier, helperStack)
 *
 */

//function sortingLevels(context: PrivateApiContextDto) {
//if (context.type === 'hook') {
//}
//}

/*
 * root
 * then grouped by file
 * then within file grouped by suite
 */
//function suiteIdentifier(context: PrivateApiContextDto): string | null {
//if (suite.type === '
//}

function groupIdentifier(context: PrivateApiContextDto) {
  let components: { key: string; value: string }[] = [
    { key: 'type', value: context.type },
    { key: 'file', value: context.file ?? 'null' },
    { key: 'suite', value: context.suite?.join(',') ?? 'null' },
    { key: 'title', value: context.type === 'definition' ? context.label : context.title },
  ];

  return components.map((pair) => `${pair.key}=${pair.value}`).join(';');
}

type ContextGroup = {
  context: Omit<PrivateApiContextDto, 'helperStack'>;
  usages: { privateAPIIdentifier: string; helperStack: string[] }[];
};

/**
 * Doesn’t consider helperStack to be part of the context
 */
function groupedByContext(usages: PrivateApiUsageDto[]): ContextGroup[] {
  const result: ContextGroup[] = [];

  for (const usage of usageDtos) {
    let existingGroup = result.find(
      (otherUsage) =>
        groupIdentifier((otherUsage as unknown as PrivateApiUsageDto).context) === groupIdentifier(usage.context),
    );

    if (existingGroup === undefined) {
      existingGroup = { context: usage.context, usages: [] };
      result.push(existingGroup);
    }

    existingGroup.usages.push({
      privateAPIIdentifier: usage.privateAPIIdentifier,
      helperStack: usage.context.helperStack,
    });
  }

  return result;
}

const grouped = groupedByContext(usageDtos);

/**
 * Makes sure that each private API is only listed once for a given helperStack in a given context.
 */
function dedupeUsages(contextGroups: ContextGroup[]) {
  for (const contextGroup of contextGroups) {
    const newUsages: typeof contextGroup.usages = [];

    for (const usage of contextGroup.usages) {
      const existing = newUsages.find(
        (otherUsage) =>
          otherUsage.privateAPIIdentifier === usage.privateAPIIdentifier &&
          JSON.stringify(otherUsage.helperStack) === JSON.stringify(usage.helperStack),
      );
      if (existing === undefined) {
        newUsages.push(usage);
      }
    }

    contextGroup.usages = newUsages;
  }
}

dedupeUsages(grouped);

console.log(grouped);

const forCSV = grouped;

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/max#getting_the_maximum_element_of_an_array
const maxSuiteLevel = forCSV
  .map((group) => (group.context.suite ?? []).length)
  .reduce((a, b) => Math.max(a, b), -Infinity);

function suiteAtLevelForCSV(suites: string[] | null, level: number) {
  return suites?.[level] ?? '';
}

function suitesColumnsForCSV(suites: string[] | null) {
  const result: string[] = [];
  for (let i = 0; i < maxSuiteLevel; i++) {
    result.push(suiteAtLevelForCSV(suites, i));
  }
  return result;
}

function suitesHeaders() {
  const result: string[] = [];
  for (let i = 0; i < maxSuiteLevel; i++) {
    result.push(`Suite (level ${i + 1})`);
  }
  return result;
}

const columnHeaders = ['Context', 'File', ...suitesHeaders(), 'Description', 'Via helpers', 'Private API called'];

const records = forCSV
  .map((contextGroup) => {
    const context = contextGroup.context as PrivateApiContextDto;
    const contextColumns = [
      context.type,
      context.file,
      ...suitesColumnsForCSV(context.suite),
      context.type === 'definition' ? context.label : context.title,
    ];

    return contextGroup.usages.map((usage) => [
      ...contextColumns,
      [...usage.helperStack].reverse().join(' -> '),
      usage.privateAPIIdentifier,
    ]);
  })
  .flat();

const result = csvStringify([columnHeaders, ...records]);
console.log(result);

writeFileSync('private-api-data.csv', result);

// TODO we need
// 1. stats on the whole test suite (i.e. also tests that don’t use private APIs) so we can get percentages
// 2. to indicate which tests use private APIs as a result of a hook they rely on
// 3. something that lets us speculate like "if we were to change x, we’d be able to run y% of tests" etc
// 4. a way to make notes about the usages
// 5. a way to attribute the hooks to the tests instead (needed for the above)
