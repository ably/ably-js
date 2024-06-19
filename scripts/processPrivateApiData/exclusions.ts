import { PrivateApiUsageDto } from './dto';

type ExclusionRule = {
  privateAPIIdentifier: string;
  // i.e. only ignore when called from within this helper
  helper?: string;
};

/**
 * This exclusions mechanism is not currently being used on `main`, but I will use it on a separate unified test suite branch in order to exclude some private API usage that can currently be disregarded in the context of the unified test suite.
 */
export function applyingExclusions(usageDtos: PrivateApiUsageDto[]) {
  const exclusionRules: ExclusionRule[] = [];

  return usageDtos.filter(
    (usageDto) =>
      !exclusionRules.some(
        (exclusionRule) =>
          exclusionRule.privateAPIIdentifier === usageDto.privateAPIIdentifier &&
          (!('helper' in exclusionRule) || usageDto.context.helperStack.includes(exclusionRule.helper!)),
      ),
  );
}
