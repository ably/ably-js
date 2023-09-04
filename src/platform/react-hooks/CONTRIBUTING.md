## Contributing

This repository is configured to execute using Vite - which will load a sample web app that acts as a simple test harness for the hooks.

You can run the dev server from the terminal using:

```bash
npm run start
```

You'll need to provide an API key for the sample to work (or you'll just get a white page and some errors in the console). To do this, create the file `./sample-app/.env` and add the following line:

```.env
VITE_ABLY_API_KEY=<your-api-key>
```

This API key will be loaded by the vite dev server at build time.

You can run the `unit tests` by running `npm run test` in the terminal.

You can build the published artefacts by running `npm run ci` in the terminal. The node module is distrubted as an ES6 module, and requires consumers to be able to import modules in their react apps. The test application and unit tests are excluded from the generated `dist` folder to prevent confusion at runtime.

### Release process

1. Create a new branch for the release, for example `release/1.2.3`
2. Update the CHANGELOG.md with any customer-affecting changes since the last release and add this to the git index
3. Run `npm version <VERSION_NUMBER> --no-git-tag-version` with the new version and add the changes to the git index
4. Update the version number in [AblyReactHooks.ts]('./src/AblyReactHooks.ts')
5. Create a PR for the release branch
6. Once the release PR is landed to the `main` branch, checkout the `main` branch locally (remember to pull the remote changes)
7. Run `git tag <VERSION_NUMBER>` with the new version and push the tag to git
8. Run the GitHub action "Release NPM package" on the main branch
9. Visit https://github.com/ably-labs/react-hooks/tags and add release notes to the release (generally you can just copy the notes you added to the CHANGELOG)
