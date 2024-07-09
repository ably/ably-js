import { PrivateApiUsageDto } from './dto';

type ExclusionRule = {
  privateAPIIdentifier: string;
  // i.e. only ignore when called from within this helper
  helper?: string;
};

export function applyingExclusions(usageDtos: PrivateApiUsageDto[]) {
  const exclusionRules: ExclusionRule[] = [
    // This is all helper stuff that we could pull into the test suite, and which for now we could just continue using the version privately exposed by ably-js, even in the UTS.
    { privateAPIIdentifier: 'call.BufferUtils.areBuffersEqual' },
    { privateAPIIdentifier: 'call.BufferUtils.base64Decode' },
    { privateAPIIdentifier: 'call.BufferUtils.base64Encode' },
    { privateAPIIdentifier: 'call.BufferUtils.hexEncode' },
    { privateAPIIdentifier: 'call.BufferUtils.isBuffer' },
    { privateAPIIdentifier: 'call.BufferUtils.toArrayBuffer' },
    { privateAPIIdentifier: 'call.BufferUtils.utf8Encode' },
    { privateAPIIdentifier: 'call.Utils.copy' },
    { privateAPIIdentifier: 'call.Utils.inspectError' },
    { privateAPIIdentifier: 'call.Utils.keysArray' },
    { privateAPIIdentifier: 'call.Utils.mixin' },
    { privateAPIIdentifier: 'call.Utils.toQueryString' },
    { privateAPIIdentifier: 'call.msgpack.decode' },
    { privateAPIIdentifier: 'call.msgpack.encode' },
    { privateAPIIdentifier: 'call.http.doUri', helper: 'getJWT' },
  ];

  return usageDtos.filter(
    (usageDto) =>
      !exclusionRules.some(
        (exclusionRule) =>
          exclusionRule.privateAPIIdentifier === usageDto.privateAPIIdentifier &&
          (!('helper' in exclusionRule) || usageDto.context.helperStack.includes(exclusionRule.helper!)),
      ),
  );
}
