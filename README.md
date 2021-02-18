# TestRail reporter for Cypress
## _First step:_
The first step is to enable the experimental Cypress feature: ``` "experimentalRunEvents": true ```
Then you need to add a new event to cypress/plugins/index.js
```sh
on('after:run', (run, results) => {
})
```
Now receive data from a Run object.

## _Next step:_
- add the tr_credentials.json file to the project root
```sh
{
  "host": "https://<name>.testrail.net",
  "username": "",
  "password": "",
  "project_name": "",
  "suite_name": ""
}
```
* Add to the new event:
```sh
const TestRaiImporter = require("tr_cypress_reporter_simple");
****
on('after:run', (run, results) => {
    let tr = new TestRaiImporter(run);
    tr.updateSuiteCases();
    tr.importStatusesToNewRun();
})
```
* You can also close RUN. If you leave the parameter empty, RUN will not be closed.
```sh
const TestRaiImporter = require("tr_cypress_reporter_simple");
****
on('after:run', (run, results) => {
    let tr = new TestRaiImporter(run);
    tr.updateSuiteCases();
    tr.importStatusesToNewRun(true);
})
```
## The data will be sent only after starting RUN.

