const esbuild = require('esbuild');

// List of all modules accepted in ModulesMap
const moduleNames = ['Rest', 'Crypto'];

function formatBytes(bytes) {
  const kb = bytes / 1024;
  const formatted = kb.toFixed(2);
  return `${formatted}kb`;
}

// Gets the bundled size of an array of named exports from 'ably/modules' formatted as a string
function getImportSize(modules) {
  const outfile = modules.join('');
  const result = esbuild.buildSync({
    stdin: {
      contents: `export { ${modules.join(', ')} } from './build/modules'`,
      resolveDir: '.',
    },
    metafile: true,
    minify: true,
    bundle: true,
    outfile,
    write: false,
  });

  return formatBytes(result.metafile.outputs[outfile].bytes);
}

// First display the size of the BaseClient
console.log(`BaseClient: ${getImportSize(['BaseClient'])}`);

// Then display the size of each module together with the BaseClient
moduleNames.forEach((moduleName) => {
  const sizeInBytes = getImportSize(['BaseClient', moduleName]);
  console.log(`BaseClient + ${moduleName}: ${sizeInBytes}`);
});
