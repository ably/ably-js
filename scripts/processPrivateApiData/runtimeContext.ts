import { PrivateApiContextDto, PrivateApiUsageDto } from './dto';
import { Group, groupedAndDeduped } from './grouping';
import { joinComponents } from './utils';

/**
 * Used for determining whether two contexts are equal.
 */
export function runtimeContextIdentifier(context: RuntimeContext) {
  return joinComponents([
    { key: 'type', value: context.type },
    { key: 'file', value: context.file ?? 'null' },
    { key: 'suite', value: context.suite?.join(',') ?? 'null' },
    { key: 'title', value: context.type === 'definition' ? context.label : context.title },
    { key: 'helperStack', value: 'helperStack' in context ? context.helperStack.join(',') : 'null' },
    {
      key: 'parameterisedTestTitle',
      value: ('parameterisedTestTitle' in context ? context.parameterisedTestTitle : null) ?? 'null',
    },
  ]);
}

export type RuntimeContext = PrivateApiContextDto;

export function groupedAndDedupedByRuntimeContext(
  usages: PrivateApiUsageDto[],
): Group<RuntimeContext, PrivateApiUsageDto>[] {
  return groupedAndDeduped(
    usages,
    (usage) => usage.context,
    (context1, context2) => runtimeContextIdentifier(context1) === runtimeContextIdentifier(context2),
  );
}
