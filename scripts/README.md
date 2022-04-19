This directory is for scripts used by the CI for deployment, etc.

### cdn_deploy.js

Deploys correctly versioned code and source maps to the CDN.

Arguments:

* **--bucket**: The S3 bucket name to deploy to, defaults to `cdn.ably.io`.
* **--root**: The base directory inside the bucket to deploy to, defaults to `lib`.
* **--path**: The local path to retrieve source files from. Defaults to `.`.
* **--includeDirs**: A comma separated list of directories to include. Defaults to `.`.
* **--excludeDirs**: A comma separated list of directories to exclude. Defaults to `node_modules,.git`.
* **--fileRegex**: A regular expression to test file names against for upload. Defaults to `^(?!\.).*\.(map|js|html)$`.
* **--skipCheckout**: Optional. Skip checking out the branch before running.

#### AWS Access

Expects AWS access to be configured in the surrounding environment. To run
locally, first set some temporary AWS credentials as environment variables
using `ably-env`:

```
source <(ably-env secrets print-aws)
```

See [AWS Access](https://ably.atlassian.net/wiki/spaces/ENG/pages/665190401/AWS+Access)
for more information about gaining access to AWS.
