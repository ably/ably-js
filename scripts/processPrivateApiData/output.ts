import { stringify as csvStringify } from 'csv-stringify/sync';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { PrivateApiUsageDto, TestStartRecord } from './dto';
import { Group } from './grouping';
import { RuntimeContext } from './runtimeContext';
import { StaticContext } from './staticContext';
import path from 'path';

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

function commonHeaders(maxSuiteLevel: number) {
  return ['File', ...suitesHeaders(maxSuiteLevel), 'Description'].filter((val) => val !== null) as string[];
}

function writeToFile(data: string, name: string) {
  const outputDirectoryPath = path.join(__dirname, '..', '..', 'private-api-usage-reports');

  if (!existsSync(outputDirectoryPath)) {
    mkdirSync(outputDirectoryPath);
  }

  writeFileSync(path.join(outputDirectoryPath, name), data);
}

function writeCSVData(rows: string[][], name: string) {
  const data = csvStringify(rows);
  writeToFile(data, `${name}.csv`);
}

export function writeRuntimePrivateAPIUsageCSV(contextGroups: Group<RuntimeContext, PrivateApiUsageDto>[]) {
  const maxSuiteLevel = Math.max(...contextGroups.map((group) => (group.key.suite ?? []).length));

  const columnHeaders = [
    'Context',
    ...commonHeaders(maxSuiteLevel),
    'Via parameterised test helper',
    'Via misc. helpers',
    'Private API called',
  ];

  const csvRows = contextGroups
    .map((contextGroup) => {
      const runtimeContext = contextGroup.key;

      const contextColumns = [
        runtimeContext.type,
        runtimeContext.file ?? '',
        ...suitesColumnsForCSV(runtimeContext.suite, maxSuiteLevel),
        runtimeContext.type === 'definition' ? runtimeContext.label : runtimeContext.title,
      ];

      return contextGroup.values.map((usage) => [
        ...contextColumns,
        (usage.context.type === 'test' ? usage.context.parameterisedTestTitle : null) ?? '',
        [...usage.context.helperStack].reverse().join(' -> '),
        usage.privateAPIIdentifier,
      ]);
    })
    .flat();

  writeCSVData([columnHeaders, ...csvRows], 'runtime-private-api-usage');
}

export function columnsForStaticContext(staticContext: StaticContext, maxSuiteLevel: number) {
  return [
    staticContext.type,
    'file' in staticContext ? staticContext.file : '',
    ...suitesColumnsForCSV('suite' in staticContext ? staticContext.suite : null, maxSuiteLevel),
    staticContext.title,
  ];
}

export function writeStaticPrivateAPIUsageCSV(contextGroups: Group<StaticContext, PrivateApiUsageDto>[]) {
  const maxSuiteLevel = Math.max(...contextGroups.map((group) => ('suite' in group.key ? group.key.suite : []).length));

  const columnHeaders = ['Context', ...commonHeaders(maxSuiteLevel), 'Private API called'];

  const csvRows = contextGroups
    .map((contextGroup) =>
      contextGroup.values.map((usage) => [
        ...columnsForStaticContext(contextGroup.key, maxSuiteLevel),
        usage.privateAPIIdentifier,
      ]),
    )
    .flat();

  writeCSVData([columnHeaders, ...csvRows], 'static-private-api-usage');
}

export function writeNoPrivateAPIUsageCSV(testStartRecords: TestStartRecord[]) {
  const maxSuiteLevel = Math.max(...testStartRecords.map((record) => record.context.suite.length));

  const columnHeaders = commonHeaders(maxSuiteLevel);

  const csvRows = testStartRecords.map((record) => {
    const context = record.context;
    return [context.file, ...suitesColumnsForCSV(context.suite, maxSuiteLevel), context.title];
  });

  writeCSVData([columnHeaders, ...csvRows], 'tests-that-do-not-require-private-api');
}

export function writeByPrivateAPIIdentifierCSV(groups: Group<string, StaticContext>[]) {
  const maxSuiteLevel = Math.max(
    ...groups.flatMap((group) => group.values.map((context) => ('suite' in context ? context.suite.length : 0))),
  );

  const columnHeaders = ['Private API called', 'Context', ...commonHeaders(maxSuiteLevel)];

  const csvRows = groups
    .map((group) => {
      const privateAPIIdentifier = group.key;

      return group.values.map((staticContext) => [
        privateAPIIdentifier,
        ...columnsForStaticContext(staticContext, maxSuiteLevel),
      ]);
    })
    .flat();

  writeCSVData([columnHeaders, ...csvRows], 'static-private-api-usage-by-private-api');
}

export function writeSummary(summary: string) {
  writeToFile(summary, 'summary.txt');
}
