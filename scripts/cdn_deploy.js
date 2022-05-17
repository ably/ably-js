#!/usr/bin/env node

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const argv = require('minimist')(process.argv.slice(2));
const S3_DEFAULT_BUCKET = 'cdn.ably.io';
const S3_DEFAULT_ROOT = 'lib';

async function run() {
  let config = {
    // The S3 Bucket to upload into
    bucket: S3_DEFAULT_BUCKET,
    // The root folder inside the S3 bucket where the files should be places
    root: S3_DEFAULT_ROOT,
    // Local path to start from
    path: '.',
    // Comma separated directories (relative to `path`) to upload
    includeDirs: 'browser/static',
    // Comma separated directories (relative to `path`) to exclude from upload
    excludeDirs: 'node_modules,.git',
    // Regex to match files against for upload
    fileRegex: '^ably(\\.noencryption)?(\\.min)?\\.js(\\.map)?',
    ...argv,
  };

  // Resolve all the paths into full paths
  config.path = path.resolve(config.path);
  config.includeDirs = config.includeDirs.split(',').map((dir) => path.resolve(dir));
  config.excludeDirs = config.excludeDirs.split(',').map((dir) => path.resolve(dir));

  const s3 = new AWS.S3();

  // If no tag is specified, run an output displaying all available tags
  if (!config.tag) {
    let refs = await git('tag');
    console.log('Available tags:');
    console.log(refs);
    throw new Error('You must supply a tag with --tag or skip this with --force');
  }

  const isTag = await git('tag --points-at HEAD');
  if (!isTag)
    throw new Error(`Reference '${config.tag}' is a branch not a tag, please select a versioned release to deploy.`);

  if (!config.skipCheckout) await git(`checkout tags/${config.tag}`);

  console.log(`Starting Ably Javascript S3 library deployment`);
  console.log('Bucket:', config.bucket);
  console.log('Output Root:', config.root);
  console.log('Input Path:', config.path);
  console.log('Included Dirs:', config.includeDirs.join(', '));
  console.log('Excluded Dirs:', config.excludeDirs.join(', '));
  console.log('File Regex:', config.fileRegex);
  console.log('-------');

  const files = recursiveFile(config.includeDirs, config.excludeDirs, config.fileRegex);
  const versions = getVersions(config.tag);
  console.log(`Found ${files.length} files to upload...`);
  try {
    for (let file of files) {
      console.log(`Uploading ${file}...`);
      for (let version of versions) {
        const relativePath = path.relative(
          config.includeDirs.find((d) => file.startsWith(d)),
          file
        );
        const extIndex = relativePath.indexOf('.');
        const ext = relativePath.substring(extIndex);
        const newPath = `${relativePath.substring(0, extIndex)}-${version}${ext}`;
        let fileData = fs.readFileSync(file).toString();
        if (newPath.endsWith('.min.js'))
          fileData = fileData.replace('//# sourceMappingURL=ably.min.js.map', `//# sourceMappingURL=${newPath}.map`);
        await upload(s3, {
          Body: fileData,
          Key: path.join(config.root, newPath),
          Bucket: config.bucket,
        });
      }
    }
    console.log('Success!');
  } catch (e) {
    throw new Error(e);
  }
}

function upload(s3, upload) {
  return new Promise((resolve, reject) => {
    s3.upload(upload, (err, body) => {
      if (err) reject(err);
      else resolve(body);
    });
  });
}

function recursiveFile(includes, excludes, regex) {
  return includes
    .flatMap(scanDir(excludes))
    .filter((file) => file && new RegExp(regex, 'gi').test(path.basename(file)));
}

function scanDir(excludes) {
  return (dir) => {
    if (excludes?.includes(dir)) return null;
    return fs.readdirSync(dir).flatMap((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) return scanDir(excludes)(filePath);
      return filePath;
    });
  };
}

function getVersions(fullVersion) {
  const split = fullVersion.split('.');
  return split.map((v, i) => split.slice(0, i + 1).join('.'));
}

function git(command) {
  return new Promise((resolve, reject) => {
    exec(`git ${command}`, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout);
    });
  });
}

run();
