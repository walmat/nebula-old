/* eslint-disable import/no-extraneous-dependencies */
const fs = require('fs');
const glob = require('glob');
const javascriptObfuscator = require('javascript-obfuscator');
const path = require('path');

const config = require('../.jsobfrc.js');

const files = glob.sync('lib/**', {
  cwd: path.resolve(__dirname, '..'),
  nodir: true,
});

files.forEach(file => {
  try {
    const filePath = path.resolve(__dirname, '..', file);
    const outputPath = path.resolve(__dirname, '..', file.replace('lib/', 'dist/'));
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    if (filePath.endsWith('.js')) {
      const data = fs.readFileSync(filePath);
      const contents = data.toString();
      const result = javascriptObfuscator.obfuscate(contents, config);
      fs.writeFileSync(outputPath, result.getObfuscatedCode());
    } else {
      fs.copyFileSync(filePath, outputPath);
    }
  } catch (err) {
    console.error('[ERROR]: Could not obfuscate %s! %s', file, err.message);
  }
});
