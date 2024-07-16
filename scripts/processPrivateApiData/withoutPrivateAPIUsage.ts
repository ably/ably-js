import { PrivateApiUsageDto, TestStartRecord } from './dto';
import { Group } from './grouping';
import { RuntimeContext } from './runtimeContext';

function areStringArraysEqual(arr1: string[], arr2: string[]) {
  if (arr1.length !== arr2.length) {
    return false;
  }

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }

  return true;
}

function mustSuiteHierarchyBeExecutedToRunTest(test: TestStartRecord, suites: string[]) {
  // i.e. is `suites` a prefix of `test.context.suite`?
  return areStringArraysEqual(test.context.suite.slice(0, suites.length), suites);
}

function mustRuntimeContextBeExecutedToRunTest(test: TestStartRecord, runtimeContext: RuntimeContext) {
  if (runtimeContext.type === 'hook') {
    if (runtimeContext.file === null) {
      // root hook; must be executed to run _any_ test
      return true;
    }
    if (
      runtimeContext.file === test.context.file &&
      mustSuiteHierarchyBeExecutedToRunTest(test, runtimeContext.suite)
    ) {
      // the hook must be executed to run this test
      return true;
    }
  }

  // otherwise, return true iff it’s the same test
  return (
    runtimeContext.type === 'test' &&
    runtimeContext.file === test.context.file &&
    areStringArraysEqual(runtimeContext.suite, test.context.suite) &&
    test.context.title === runtimeContext.title
  );
}

/**
 * This extracts all of the test start records for the tests that can be run without any private API usage. That is, neither the test itself, nor any of the hooks that the test requires, call a private API. It does not consider whether private APIs are required in order to define the test (that is, contexts of type `testDefinition`).
 */
export function splitTestsByPrivateAPIUsageRequirement(
  testStartRecords: TestStartRecord[],
  groupedUsages: Group<RuntimeContext, PrivateApiUsageDto>[],
): { requiringPrivateAPIUsage: TestStartRecord[]; notRequiringPrivateAPIUsage: TestStartRecord[] } {
  const result: { requiringPrivateAPIUsage: TestStartRecord[]; notRequiringPrivateAPIUsage: TestStartRecord[] } = {
    requiringPrivateAPIUsage: [],
    notRequiringPrivateAPIUsage: [],
  };

  for (const testStartRecord of testStartRecords) {
    if (
      groupedUsages.some((contextGroup) => mustRuntimeContextBeExecutedToRunTest(testStartRecord, contextGroup.key))
    ) {
      result.requiringPrivateAPIUsage.push(testStartRecord);
    } else {
      result.notRequiringPrivateAPIUsage.push(testStartRecord);
    }
  }

  return result;
}
