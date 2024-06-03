import { isIdentifier, isStringLiteral } from '@babel/types';
import { parse, ParserOptions } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import fs from 'fs/promises';
import { glob } from 'glob';
import path from 'path';

async function run() {
  //const directories = ['browser', 'realtime', 'rest', 'support'];
  //const testFiles = await glob(directories.map((directory) => path.join(__dirname, '..', 'test', directory, '**/*.js')));
  const testFiles = await glob(path.join(__dirname, '..', 'test', '**/*.test.js'));
  console.log("testFiles is", testFiles);

  for (const testFilePath of testFiles) {
    console.log('reading', testFilePath);
    const contents = (await fs.readFile(testFilePath)).toString();
    const parserOptions: ParserOptions = {};
    if (path.basename(testFilePath) === 'modular.test.js') {
      parserOptions.sourceType = 'module';
    }
    const ast = parse(contents, parserOptions);

    traverse(ast, {
      CallExpression(callExpression) {
        if (isIdentifier(callExpression.node.callee, { name: 'it' })) {
          const itFirstArg = callExpression.node.arguments[0];
          if (isStringLiteral(itFirstArg)) {
            const description = itFirstArg.value;
            console.log("got an it:", description);
          } else {
            // TODO
            console.log("got a parameterised it:", generate(itFirstArg).code);
          }
        }
      }
    });
  }
}

run();
