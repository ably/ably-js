#!/bin/bash

# Allows us to upload test results to an instance of the test
# observability server running locally on a developer’s machine.

export TEST_OBSERVABILITY_SERVER_AUTH_KEY="abc123"
export GITHUB_SHA="fakesha"
export GITHUB_REF_NAME="fake-ref-name"
export GITHUB_RETENTION_DAYS="30"
export GITHUB_ACTION="fake-action"
export GITHUB_RUN_NUMBER="132423"
export GITHUB_RUN_ID="fake-run-id"
export GITHUB_RUN_ATTEMPT="1"
export GITHUB_BASE_REF="main"
export GITHUB_HEAD_REF="my-branch"
export GITHUB_JOB="fake-job"
export GITHUB_REPOSITORY="ably/ably-cocoa"

./Scripts/upload_test_results.sh --upload-server-base-url "http://localhost:3000"
