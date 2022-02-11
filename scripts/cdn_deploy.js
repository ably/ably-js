#!/usr/bin/env node

const AWS = require('aws-sdk');
const Git = require('nodegit');
const fs = require('fs');
const path = require('path');
const argv =  require('minimist')(process.argv.slice(2));
const S3_DEFAULT_BUCKET = "cdn.ably.io";
const S3_DEFAULT_ROOT = "lib";

async function run(){
	let config = {
		bucket: S3_DEFAULT_BUCKET,
		root: S3_DEFAULT_ROOT,
		s3Key: process.env.AWS_ACCESS_KEY,
		s3Secret: process.env.AWS_SECRET_ACCESS_KEY,
		path: ".",
		includeDirs: ".",
		excludeDirs: "node_modules,.git",
		fileRegex: "^(?!\\.).*\\.(map|js|html)$",
		...argv,
	}
	config.path = path.resolve(config.path);
	config.includeDirs = config.includeDirs.split(",").map((dir)=>path.resolve(dir));
	config.excludeDirs = config.excludeDirs.split(",").map((dir)=>path.resolve(dir));

	// if(!config.version)
	// 	return console.error("Missing argument: --version");

	console.log(config.s3Key, config.s3Secret);

	const s3 = new AWS.S3({
		region: "REGION",
		accessKeyId: config.s3Key,
		secretAccessKey: config.s3Secret,
		endpoint: config.endpoint,
	})


	let repo = await Git.Repository.open(config.path);
	if(!config.tag && !config.force) {
		let refs = await repo.getReferences();
		console.log("Available tags:");
		refs.filter((r)=>r.isTag()).forEach((r)=>console.log(`${r.name().substring(r.name().indexOf("tags/")+5)}`))
		return fatal("You must supply a tag with --tag or skip this with --force")
	}


	if(config.tag) {
		let ref = await repo.getReference(config.tag);

		if (!ref.isTag() && !config.force)
			return fatal(`Reference '${config.tag}' is a branch not a tag, please select a versioned release to deploy.`)

		await repo.checkoutRef(ref);
	}

	console.log(`Starting Ably Javascript S3 library deployment for version ${await repo.getCurrentBranch()}`);

	const files = recursiveFile(config.includeDirs, config.excludeDirs, config.fileRegex);
	console.log(`Found ${files.length} files to upload...`);
	try {
		for (let file of files) {
			console.log(`Uploading ${file}...`);
			await upload(s3, {
				Body: fs.readFileSync(file),
				Key: path.relative(config.path, file),
				Bucket: config.bucket,
			})
		}
		console.log("Success!");
	}catch(e){
		console.log(e);
	}
}

function upload(s3, upload){
	return new Promise((fulfill, reject)=>{
		s3.upload(upload, (err, body)=>{
			if(err)reject(err);
			else fulfill(body);
		})
	})
}

run();

function recursiveFile(includes, excludes, regex){
	return includes.flatMap(scanDir(excludes)).filter((file)=>file && new RegExp(regex, "gi").test(path.basename(file)))
}

function scanDir(excludes){
	return (dir)=>{
		if(excludes?.includes(dir))return null;
		return fs.readdirSync(dir).flatMap((file)=>{
			const filePath = path.join(dir, file);
			const stat = fs.statSync(filePath);
			if(stat.isDirectory()) return scanDir(excludes)(filePath);
			return filePath;
		})
	}
}


function fatal(message){
	console.error(message);
	process.exit(1);
}
