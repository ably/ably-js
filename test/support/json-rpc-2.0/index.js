/*
For some reason, the object that I get when I write
`require('json-rpc-2.0')` has all of the correct keys (JSONRPCClient etc)
but the values are all undefined. No idea why and don’t really want to spend
time debugging it. So, here I’ve copied the require statements from the
library’s entrypoint (../../../node_modules/json-rpc-2.0/dist/index.js) and
it’s working 🤷
*/
module.exports = {
  ...require('../../../node_modules/json-rpc-2.0/dist/client'),
  ...require('../../../node_modules/json-rpc-2.0/dist/interfaces'),
  ...require('../../../node_modules/json-rpc-2.0/dist/models'),
  ...require('../../../node_modules/json-rpc-2.0/dist/server'),
  ...require('../../../node_modules/json-rpc-2.0/dist/server-and-client'),
};
