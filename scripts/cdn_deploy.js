#!/usr/bin/env node

const AWS = require('aws-sdk');
const Git = require('nodegit');
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
		...argv,
	}

	// if(!config.version)
	// 	return console.error("Missing argument: --version");

	const s3 = new AWS.S3({
		accessKeyId: config.s3Key,
		secretAccessKey: config.s3Secret
	});

	let repo = await Git.Repository.open(path.resolve(config.path));
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

	console.log(`Starting Ably Javascript S3 library deployment for version ${config.tag}`);

	fs.readdirSync(config.path).filter((file)=>/.*\.(map|min\.js|html)/.exec(file))


	console.log(repo);
}


run();


function fatal(message){
	console.error(message);
	process.exit(1);
}
