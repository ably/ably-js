import { PrivateApiUsageDto } from './dto';
import { joinComponents } from './utils';
import { Group, groupedAndDeduped } from './grouping';

export type MiscHelperStaticContext = {
  type: 'miscHelper';
  title: string;
};

export type TestDefinitionStaticContext = {
  type: 'testDefinition';
  title: string;
  file: string;
  suite: string[];
};

export type RootHookStaticContext = {
  type: 'rootHook';
  title: string;
};

export type HookStaticContext = {
  type: 'hook';
  title: string;
  file: string;
  suite: string[];
};

export type ParameterisedTestHelperStaticContext = {
  type: 'parameterisedTestHelper';
  title: string;
  file: string;
  suite: string[];
};

export type TestStaticContext = {
  type: 'test';
  title: string;
  file: string;
  suite: string[];
};

export type StaticContext =
  | MiscHelperStaticContext
  | TestDefinitionStaticContext
  | RootHookStaticContext
  | HookStaticContext
  | ParameterisedTestHelperStaticContext
  | TestStaticContext;

/**
 * Used for determining whether two contexts are equal.
 */
export function staticContextIdentifier(context: StaticContext) {
  return joinComponents([
    { key: 'type', value: context.type },
    { key: 'file', value: 'file' in context ? context.file : 'null' },
    { key: 'suite', value: 'suite' in context ? context.suite.join(',') : 'null' },
    { key: 'title', value: context.title },
  ]);
}

export function staticContextForUsage(usage: PrivateApiUsageDto): StaticContext {
  if (usage.context.helperStack.length > 0) {
    return {
      type: 'miscHelper',
      title: usage.context.helperStack[0],
    };
  } else if (usage.context.type === 'definition') {
    return {
      type: 'testDefinition',
      file: usage.context.file,
      suite: usage.context.suite,
      title: usage.context.label,
    };
  } else if (usage.context.type === 'hook') {
    if (usage.context.file === null) {
      return {
        type: 'rootHook',
        title: usage.context.title,
      };
    } else {
      return {
        type: 'hook',
        file: usage.context.file,
        suite: usage.context.suite,
        title: usage.context.title,
      };
    }
  } else {
    if (usage.context.parameterisedTestTitle !== null) {
      return {
        type: 'parameterisedTestHelper',
        file: usage.context.file,
        suite: usage.context.suite,
        title: usage.context.parameterisedTestTitle,
      };
    } else {
      return {
        type: 'test',
        file: usage.context.file,
        suite: usage.context.suite,
        title: usage.context.title,
      };
    }
  }
}

export function groupedAndDedupedByStaticContext(
  usages: PrivateApiUsageDto[],
): Group<StaticContext, PrivateApiUsageDto>[] {
  return groupedAndDeduped(
    usages,
    (usage) => staticContextForUsage(usage),
    (context1, context2) => staticContextIdentifier(context1) === staticContextIdentifier(context2),
  );
}
