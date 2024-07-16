import {
  writeByPrivateAPIIdentifierCSV,
  writeNoPrivateAPIUsageCSV,
  writeRuntimePrivateAPIUsageCSV,
  writeStaticPrivateAPIUsageCSV,
  writeSummary,
} from './output';
import { groupedAndDedupedByRuntimeContext } from './runtimeContext';
import { groupedAndDedupedByStaticContext } from './staticContext';
import { load } from './load';
import { percentageString, sortStaticContextUsages } from './utils';
import { splitTestsByPrivateAPIUsageRequirement } from './withoutPrivateAPIUsage';
import { groupedAndSortedByPrivateAPIIdentifier } from './grouping';

if (process.argv.length > 3) {
  throw new Error('Expected a single argument (path to private API usages JSON file');
}

const jsonFilePath = process.argv[2];

if (!jsonFilePath) {
  throw new Error('Path to private API usages JSON file not specified');
}

const { usageDtos, testStartRecords } = load(jsonFilePath);

const usagesGroupedByRuntimeContext = groupedAndDedupedByRuntimeContext(usageDtos);

const usagesGroupedByStaticContext = groupedAndDedupedByStaticContext(usageDtos);
sortStaticContextUsages(usagesGroupedByStaticContext);

const {
  requiringPrivateAPIUsage: testsThatRequirePrivateAPIUsage,
  notRequiringPrivateAPIUsage: testsThatDoNotRequirePrivateAPIUsage,
} = splitTestsByPrivateAPIUsageRequirement(testStartRecords, usagesGroupedByRuntimeContext);

const totalNumberOfTests = testStartRecords.length;
const numberOfTestsThatRequirePrivateApiUsage = testsThatRequirePrivateAPIUsage.length;
const numberOfTestsThatDoNotRequirePrivateAPIUsage = testsThatDoNotRequirePrivateAPIUsage.length;

const summary = `Total number of tests: ${totalNumberOfTests}
Number of tests that require private API usage: ${numberOfTestsThatRequirePrivateApiUsage} (${percentageString(
  numberOfTestsThatRequirePrivateApiUsage,
  totalNumberOfTests,
)})
Number of tests that do not require private API usage: ${numberOfTestsThatDoNotRequirePrivateAPIUsage} (${percentageString(
  numberOfTestsThatDoNotRequirePrivateAPIUsage,
  totalNumberOfTests,
)})
`;
console.log(summary);

const byPrivateAPIIdentifier = groupedAndSortedByPrivateAPIIdentifier(usagesGroupedByStaticContext);

writeRuntimePrivateAPIUsageCSV(usagesGroupedByRuntimeContext);
writeStaticPrivateAPIUsageCSV(usagesGroupedByStaticContext);
writeNoPrivateAPIUsageCSV(testsThatDoNotRequirePrivateAPIUsage);
writeByPrivateAPIIdentifierCSV(byPrivateAPIIdentifier);
writeSummary(summary);
