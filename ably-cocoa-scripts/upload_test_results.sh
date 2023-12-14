#!/bin/bash

# Uploads a test results file from junit/*.junit to the test observability server.
# Must be run from root of repo.

# Options:
# -u / --upload-server-base-url <url>: Allows you to specify a URL to use as the upload server base URL. Defaults to https://test-observability.herokuapp.com.
# -i / --iteration <number>: If running the tests in a loop inside a single CI job, indicates which iteration of the loop is currently executing. Defaults to 1.
# -j / --job-index <number>: The index to which the current job corresponds in the response from the "list jobs for a workflow run attempt" GitHub API (https://docs.github.com/en/rest/actions/workflow-jobs?apiVersion=2022-11-28#list-jobs-for-a-workflow-run-attempt). If you specify `GITHUB_TOKEN` but not `--job-index`, and the response from this API contains more than one job, the script will fail.
#
# Optional environment variables:
#
# GITHUB_TOKEN: A GitHub access token. If provided, the script will perform a GitHub API call in order to discover the web URL for the current job, and will include this URL in the observability server upload.

set -e

# 1. Check dependencies.

if ! which jq > /dev/null
then
  echo "You need to install jq." 2>&1
  exit 1
fi

if ! which gh > /dev/null
then
  echo "You need to install the GitHub CLI." 2>&1
  exit 1
fi

# 2. Grab the variables from the environment.

if [[ -z $TEST_OBSERVABILITY_SERVER_AUTH_KEY ]]
then
  echo "The TEST_OBSERVABILITY_SERVER_AUTH_KEY environment variable must be set." 2>&1
  exit 1
fi

if [[ -z $GITHUB_REPOSITORY ]]
then
  echo "The GITHUB_REPOSITORY environment variable must be set." 2>&1
  exit 1
fi

if [[ -z $GITHUB_SHA ]]
then
  echo "The GITHUB_SHA environment variable must be set." 2>&1
  exit 1
fi

if [[ -z $GITHUB_REF_NAME ]]
then
  echo "The GITHUB_REF_NAME environment variable must be set." 2>&1
  exit 1
fi

if [[ -z $GITHUB_RETENTION_DAYS ]]
then
  echo "The GITHUB_RETENTION_DAYS environment variable must be set." 2>&1
  exit 1
fi

if [[ -z $GITHUB_ACTION ]]
then
  echo "The GITHUB_ACTION environment variable must be set." 2>&1
  exit 1
fi

if [[ -z $GITHUB_RUN_NUMBER ]]
then
  echo "The GITHUB_RUN_NUMBER environment variable must be set." 2>&1
  exit 1
fi

if [[ -z $GITHUB_RUN_ATTEMPT ]]
then
  echo "The GITHUB_RUN_ATTEMPT environment variable must be set." 2>&1
  exit 1
fi

if [[ -z $GITHUB_RUN_ID ]]
then
  echo "The GITHUB_RUN_ID environment variable must be set." 2>&1
  exit 1
fi

if [[ -z $GITHUB_JOB ]]
then
  echo "The GITHUB_JOB environment variable must be set." 2>&1
  exit 1
fi

# 3. Grab command-line options.

# https://stackoverflow.com/questions/192249/how-do-i-parse-command-line-arguments-in-bash
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -i|--iteration) iteration="$2"; shift ;;
        -u|--upload-server-base-url) upload_server_base_url="$2"; shift ;;
        -j|--job-index) job_index="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

if [[ -z $iteration ]]
then
  iteration=1
fi

# 4. Find the JUnit test report.

test_reports=$(find junit -name '*.junit')
if [[ -z $test_reports ]]
then
  number_of_test_reports=0
else
  number_of_test_reports=$(echo "${test_reports}" | wc -l)
fi

if [[ $number_of_test_reports -eq 0 ]]
then
  echo "No test reports found." 2>&1
  exit 1
fi

if [[ $number_of_test_reports -gt 1 ]]
then
  echo -e "Multiple test reports found:\n${test_reports}" 2>&1
  exit 1
fi

echo "Test report found: ${test_reports}" 2>&1

# 5. Fetch the details of the current GitHub job, so that we can add a link to it in the upload.
#
# It’s a bit surprising that there’s no built-in functionality for this (see e.g. https://stackoverflow.com/questions/71240338/obtain-job-id-from-a-workflow-run-using-contexts or https://github.com/orgs/community/discussions/8945).

if [[ ! -z $GITHUB_TOKEN ]]
then
  temp_github_jobs_response_file=$(mktemp)
  gh api "/repos/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}/attempts/${GITHUB_RUN_ATTEMPT}/jobs" > $temp_github_jobs_response_file

  number_of_jobs=$(jq '.jobs | length' < "${temp_github_jobs_response_file}")

  if [[ -z $job_index && $number_of_jobs -gt 1 ]]
  then
    echo -e "Got ${number_of_jobs} jobs from GitHub API but don’t know which one to pick. You need to provide a --job-index argument." 2>&1
    exit 1
  fi

  if [[ -n $job_index ]]
  then
    if [[ $job_index -gt $number_of_jobs ]]
    then
      echo -e "The --job-index argument has value ${job_index}, but there are only ${number_of_jobs} jobs. This script does not currently handle pagination." 2>&1
      exit 1
    fi
  else
    if [[ $number_of_jobs -eq 0 ]]
    then
      echo -e "The GitHub API response contains no jobs." 2>&1
      exit 1
    fi
    job_index=0
  fi

  github_job_api_url=$(jq --exit-status --raw-output ".jobs[${job_index}].url" < "${temp_github_jobs_response_file}")
  github_job_html_url=$(jq --exit-status --raw-output ".jobs[${job_index}].html_url" < "${temp_github_jobs_response_file}")
fi

# 6. Create the JSON request body.

temp_request_body_file=$(mktemp)

# https://unix.stackexchange.com/questions/446847/conditionally-pass-params-to-a-script
optional_params=()

if [[ ! -z $GITHUB_BASE_REF ]]
then
  optional_params+=(--arg github_base_ref "${GITHUB_BASE_REF}")
else
  optional_params+=(--argjson github_base_ref null)
fi

if [[ ! -z $GITHUB_HEAD_REF ]]
then
  optional_params+=(--arg github_head_ref "${GITHUB_HEAD_REF}")
else
  optional_params+=(--argjson github_head_ref null)
fi

if [[ ! -z $github_job_api_url ]]
then
  optional_params+=(--arg github_job_api_url "${github_job_api_url}")
else
  optional_params+=(--argjson github_job_api_url null)
fi

if [[ ! -z $github_job_html_url ]]
then
  optional_params+=(--arg github_job_html_url "${github_job_html_url}")
else
  optional_params+=(--argjson github_job_html_url null)
fi

jq -n \
  --rawfile junit_report_xml "${test_reports}" \
  --arg github_repository "${GITHUB_REPOSITORY}" \
  --arg github_sha "${GITHUB_SHA}" \
  --arg github_ref_name "${GITHUB_REF_NAME}" \
  --arg github_retention_days "${GITHUB_RETENTION_DAYS}" \
  --arg github_action "${GITHUB_ACTION}" \
  --arg github_run_number "${GITHUB_RUN_NUMBER}" \
  --arg github_run_attempt "${GITHUB_RUN_ATTEMPT}" \
  --arg github_run_id "${GITHUB_RUN_ID}" \
  --arg github_job "${GITHUB_JOB}" \
  --arg iteration "${iteration}" \
  "${optional_params[@]}" \
  '{ junit_report_xml: $junit_report_xml | @base64, github_repository: $github_repository, github_sha: $github_sha, github_ref_name: $github_ref_name, github_retention_days: $github_retention_days, github_action: $github_action, github_run_number: $github_run_number, github_run_attempt: $github_run_attempt, github_run_id: $github_run_id, github_base_ref: $github_base_ref, github_head_ref: $github_head_ref, github_job: $github_job, github_job_api_url: $github_job_api_url, github_job_html_url: $github_job_html_url, iteration: $iteration }' \
  > "${temp_request_body_file}"

printf "Created request body:\n$(cat "${temp_request_body_file}")\n\n" 2>&1

# 7. Send the request.

echo "Uploading test report." 2>&1

if [[ -z $upload_server_base_url ]]
then
  upload_server_base_url="https://test-observability.herokuapp.com"
fi

request_id=$(uuidgen)

temp_response_body_file=$(mktemp)
curl -vvv --fail-with-body --data-binary "@${temp_request_body_file}" --header "Content-Type: application/json" --header "Test-Observability-Auth-Key: ${TEST_OBSERVABILITY_SERVER_AUTH_KEY}" --header "X-Request-ID: ${request_id}" "${upload_server_base_url}/uploads" | tee "${temp_response_body_file}"
echo 2>&1 # Print a newline to separate the `curl` output from the next log line.

# 8. Extract the ID of the created upload and log the web UI URL.

upload_id=$(jq --exit-status --raw-output '.id' < "${temp_response_body_file}")
web_ui_url="${upload_server_base_url}/repos/${GITHUB_REPOSITORY}/uploads/${upload_id}"
echo "Test results uploaded successfully: ${web_ui_url}"
