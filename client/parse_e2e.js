const fs = require('fs');
const data = JSON.parse(fs.readFileSync('c:/Users/HOME/Desktop/UTAxi/client/test-results/e2e-results.json'));
const failures = [];

data.suites.forEach(suite => {
  suite.suites?.forEach(sub => {
    sub.specs?.forEach(spec => {
      const result = spec.tests[0]?.results[0];
      if (result && result.status !== 'expected' && result.status !== 'skipped') {
        failures.push(sub.title + ' -> ' + spec.title);
      }
    });
  });
});

console.log('--- FAILED TESTS ---');
console.log(failures.length ? failures.join('\n') : 'No failures found');
