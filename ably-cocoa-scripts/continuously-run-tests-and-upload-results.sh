#!/bin/bash

set -e

# 1. Check dependencies.

if ! which timeout > /dev/null
then
  echo "You need to install timeout (\`brew install coreutils\` on macOS)." 2>&1
  exit 1
fi

# 2. Grab command-line options.

# https://stackoverflow.com/questions/192249/how-do-i-parse-command-line-arguments-in-bash
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -s|--script) script_name="$2"; shift ;;
        -u|--upload-server-base-url) upload_server_base_url="$2"; shift ;;
        -j|--job-index) job_index="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

if [[ -z $script_name ]]
then
  echo "You need to specify the NPM script to run (-s / --script)." 2>&1
  exit 1
fi

# 3. Capture the time at which we started, to make sure we don’t exceed the
# maximum job running time.
started_at=`date +%s`
# https://docs.github.com/en/actions/learn-github-actions/usage-limits-billing-and-administration
let github_job_maximum_execution_seconds=6*60*60
# We assume that the part of the job that ran before this script took at most 10 minutes.
let must_end_by=$((started_at + github_job_maximum_execution_seconds - 10 * 60))

echo "We’ll make sure this script ends by `date -r${must_end_by}`." 2>&1

# 4. Run the tests in a loop and report the results.

end_iteration_with_exit_value() {
  exit $1
}

declare -i iteration=1
while true
do
  echo "BEGIN ITERATION ${iteration}" 2>&1

  rm -rf junit

  set +e
  let allowed_execution_time=$must_end_by-`date +%s`
  set -e

  if [[ $allowed_execution_time -le 0 ]]; then
    echo "ITERATION ${iteration}: Allowed execution time reached. Exiting." 2>&1
    end_iteration_with_exit_value 0
  fi

  echo "ITERATION ${iteration}: Running NPM script ${script_name} with a timeout of ${allowed_execution_time} seconds." 2>&1

  set +e
  #timeout --kill-after=20 ${allowed_execution_time} npm run $script_name
  # Something is causing the test:playwright script to never exit; I wonder if it’s `timeout`. Let’s try without for now.
  npm run $script_name
  tests_exit_value=$?
  set -e

  if [[ tests_exit_value -eq 124 || tests_exit_value -eq 137 ]]; then
    # Execution timed out.
    echo "ITERATION ${iteration}: Cancelled the execution of NPM script since it exceeded timeout imposed by maximum GitHub running time. Terminating this script."
    end_iteration_with_exit_value 0
  fi

  if [[ tests_exit_value -eq 0 ]]
  then
    echo "ITERATION ${iteration}: Tests passed."
  else
    echo "ITERATION ${iteration}: Tests failed (exit value ${tests_exit_value})."
  fi

  echo "ITERATION ${iteration}: Uploading results to observability server."

  # https://unix.stackexchange.com/questions/446847/conditionally-pass-params-to-a-script
  optional_params=()

  if [[ ! -z $upload_server_base_url ]]
  then
    optional_params+=(--upload-server-base-url "${upload_server_base_url}")
  fi

  if [[ ! -z $job_index ]]
  then
    optional_params+=(--job-index "${job_index}")
  fi

  set +e
  ./ably-cocoa-scripts/upload_test_results.sh \
    --iteration $iteration \
    "${optional_params[@]}"
  upload_exit_value=$?
  set -e

  if [[ upload_exit_value -eq 0 ]]
  then
    echo "ITERATION ${iteration}: Upload succeeded."
  else
    echo "ITERATION ${iteration}: Upload failed (exit value ${upload_exit_value})."
  fi

  if [[ upload_exit_value -ne 0 ]]
  then
    echo "ITERATION ${iteration}: Terminating due to failed upload."
    end_iteration_with_exit_value $upload_exit_value
  fi

  echo "END ITERATION ${iteration}" 2>&1

  iteration+=1
done
