This directory is for scripts used by the CI for deployment, etc.

### cdn_deploy.js

Deploys correctly versioned code and source maps to the CDN.

Arguments:

**--bucket**: The S3 bucket name to deploy to, defaults to `cdn.ably.io`.
**--root**: The base directory inside the bucket to deploy to, defaults to `lib`.
**--s3Key**: S3 Access Key. Can also be set with AWS_ACCESS_KEY env variable.
**--s3Secret**: S3 Secret Access Key. Can also be set with AWS_SECRET_ACCESS_KEY env variable.
**--path**: The local path to retrieve source files from. Defaults to `.`.
**--includeDirs**: A comma separated list of directories to include. Defaults to `.`.
**--excludeDirs**: A comma separated list of directories to exclude. Defaults to `node_modules,.git`.
**--fileRegex**: A regular expression to test file names against for upload. Defaults to `^(?!\.).*\.(map|js|html)$`.
**--endpoint**: Optional. The S3 endpoint to deploy to.
**--skipCheckout**: Optional. Skip checking out the branch before running.


