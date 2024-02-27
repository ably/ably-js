'use strict';

define(['shared_helper', 'delta_tests'], function (helper, registerDeltaTests) {
  const Platform = helper.Ably.Realtime.Platform;

  let config;

  if (Platform.Vcdiff.supported) {
    if (Platform.Vcdiff.bundledDecode) {
      config = {
        createRealtimeWithDeltaPlugin: (options) => {
          return helper.AblyRealtime(options);
        },
      };
    } else {
      throw new Error(
        'vcdiff is supported but not bundled; this should only be the case for the modular variant of the library, which this test doesn’t exercise',
      );
    }
  } else {
    config = {
      createRealtimeWithoutDeltaPlugin: (options) => {
        return new helper.AblyRealtime(options);
      },
    };
  }

  registerDeltaTests('realtime/delta', config);
});
