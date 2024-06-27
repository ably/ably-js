import { readFileSync, writeFileSync } from 'fs';
import { stringify as csvStringify } from 'csv-stringify/sync';

type TestPrivateApiContextDto = {
  type: 'test';
  title: string;
  parameterisedTestTitle: string;
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

type TestStartRecord = {
  context: TestPrivateApiContextDto;
  privateAPIIdentifier: null;
};

type Record = PrivateApiUsageDto | TestStartRecord;

let records = JSON.parse(
  readFileSync('private-api-usage-f5959cec85ebaa1f55a769c0ebf8b649d62ba4fa.json').toString('utf-8'),
) as Record[];

function stripFilePrefix(records: Record[]) {
  for (const record of records) {
    if (record.context.file !== null) {
      record.context.file = record.context.file.replace('/home/runner/work/ably-js/ably-js/', '');
    }
  }
}

stripFilePrefix(records);

function splittingRecords(records: Record[]) {
  return {
    testStartRecords: records.filter((record) => record.privateAPIIdentifier == null) as TestStartRecord[],
    usageDtos: records.filter((record) => record.privateAPIIdentifier !== null) as PrivateApiUsageDto[],
  };
}

let { usageDtos, testStartRecords } = splittingRecords(records);

function filtered(usageDtos: PrivateApiUsageDto[]) {
  // Ignore things called via one of these helpers.
  const excludedHelpers = [
    // I’m pretty sure we can find a way to get the same effect without private APIs 🤷
    'closeAndFinish',
  ];

  // Ignore usage of these private APIs.
  const excludedPrivateAPIIdentifiers = [
    // This is all helper stuff that we could pull into the test suite, and which for now we could just continue using the version privately exposed by ably-js, even in the UTS.
    'call.BufferUtils.areBuffersEqual',
    'call.BufferUtils.base64Decode',
    'call.BufferUtils.base64Encode',
    'call.BufferUtils.hexEncode',
    'call.BufferUtils.isBuffer',
    'call.BufferUtils.toArrayBuffer',
    'call.BufferUtils.utf8Encode',
    'call.Utils.copy',
    'call.Utils.inspectError',
    'call.Utils.keysArray',
    'call.Utils.mixin',
    'call.Utils.toQueryString',
    'call.msgpack.decode',
    'call.msgpack.encode',
  ];

  function intersects(a: string[], b: string[]) {
    for (const element of a) {
      if (b.includes(element)) {
        return true;
      }
    }
    return false;
  }

  return usageDtos.filter(
    (usageDto) =>
      !(
        intersects(usageDto.context.helperStack, excludedHelpers) ||
        excludedPrivateAPIIdentifiers.includes(usageDto.privateAPIIdentifier)
      ),
  );
}

usageDtos = filtered(usageDtos);

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

function suiteAtLevelForCSV(suites: string[] | null, level: number) {
  return suites?.[level] ?? '';
}

function suitesColumnsForCSV(suites: string[] | null, maxSuiteLevel: number) {
  const result: string[] = [];
  for (let i = 0; i < maxSuiteLevel; i++) {
    result.push(suiteAtLevelForCSV(suites, i));
  }
  return result;
}

function suitesHeaders(maxSuiteLevel: number) {
  const result: string[] = [];
  for (let i = 0; i < maxSuiteLevel; i++) {
    result.push(`Suite (level ${i + 1})`);
  }
  return result;
}

function commonHeaders(maxSuiteLevel: number, includeParameterisedTestTitle: boolean) {
  return [
    'File',
    ...suitesHeaders(maxSuiteLevel),
    includeParameterisedTestTitle ? 'Parameterised test title' : null,
    'Description',
  ].filter((val) => val !== null) as string[];
}

function writePrivateAPIUsageCSV(contextGroups: ContextGroup[]) {
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/max#getting_the_maximum_element_of_an_array
  const maxSuiteLevel = contextGroups
    .map((group) => (group.context.suite ?? []).length)
    .reduce((a, b) => Math.max(a, b), -Infinity);

  const columnHeaders = ['Context', ...commonHeaders(maxSuiteLevel, true), 'Via helpers', 'Private API called'];

  const csvRows = contextGroups
    .map((contextGroup) => {
      const context = contextGroup.context as PrivateApiContextDto;
      const contextColumns = [
        context.type,
        context.file,
        ...suitesColumnsForCSV(context.suite, maxSuiteLevel),
        context.type === 'test' ? context.parameterisedTestTitle : '',
        context.type === 'definition' ? context.label : context.title,
      ];

      return contextGroup.usages.map((usage) => [
        ...contextColumns,
        [...usage.helperStack].reverse().join(' -> '),
        usage.privateAPIIdentifier,
      ]);
    })
    .flat();

  const result = csvStringify([columnHeaders, ...csvRows]);
  writeFileSync('private-api-data.csv', result);
}

function extractTestsWithoutPrivateAPIUsage(testStartRecords: TestStartRecord[], groupedUsages: ContextGroup[]) {
  return testStartRecords.filter(
    (testStartRecord) =>
      !groupedUsages.some(
        (contextGroup) =>
          groupIdentifier(testStartRecord.context) === groupIdentifier(contextGroup.context as PrivateApiContextDto),
      ),
  );
}

const testsWithoutPrivateAPIUsage = extractTestsWithoutPrivateAPIUsage(testStartRecords, grouped);

function writeNoPrivateAPIUsageCSV(testStartRecords: TestStartRecord[]) {
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/max#getting_the_maximum_element_of_an_array
  const maxSuiteLevel = testStartRecords
    .map((record) => record.context.suite.length)
    .reduce((a, b) => Math.max(a, b), -Infinity);

  const columnHeaders = commonHeaders(maxSuiteLevel, false);

  const csvRows = testStartRecords.map((record) => {
    const context = record.context;
    return [context.file, ...suitesColumnsForCSV(context.suite, maxSuiteLevel), context.title];
  });

  const result = csvStringify([columnHeaders, ...csvRows]);
  writeFileSync('no-private-api-data.csv', result);
}

function percentageString(value: number, total: number) {
  return `${((100 * value) / total).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

const totalNumberOfTests = testStartRecords.length;
const numberOfTestsWithNoPrivateAPIUsage = testsWithoutPrivateAPIUsage.length;
const numberOfTestsWithPrivateAPIUsage = grouped.length;

console.log(
  `Total number of tests: ${totalNumberOfTests}
Number of tests with no private API usage: ${numberOfTestsWithNoPrivateAPIUsage} (${percentageString(
    numberOfTestsWithNoPrivateAPIUsage,
    totalNumberOfTests,
  )})
Number of tests with private API usage: ${numberOfTestsWithPrivateAPIUsage} (${percentageString(
    numberOfTestsWithPrivateAPIUsage,
    totalNumberOfTests,
  )})
`,
);

// TODO we need
// 1. a way to categorise the tests that are parameterised so that we have an idea of the _effort_ — I think that we could add the common function’s name as a helper or something
// 3. something that lets us speculate like "if we were to change x, we’d be able to run y% of tests" etc
// 4. a way to make notes about the usages

writePrivateAPIUsageCSV(grouped);
writeNoPrivateAPIUsageCSV(testsWithoutPrivateAPIUsage);
