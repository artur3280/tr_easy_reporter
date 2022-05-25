# TestRail reporter for Cypress
## _Updates_
### Version 1.0.00

1. import optimization
2. added building multi-level cascading sections based on folders and subfolders in your tests
3. The first load of tests is still slow (depending on the number of tests and their structure), but all subsequent checks and loads are much faster.

### Version 0.7.0
* Added new methods:
```sh
let tr = new TestRaiImporter(run_data);

// Save run data to the local folder 
tr.saveArtifact('./artifact/')

// Get saved data and deploy to TR 
tr.updateSuiteCasesFromArtifacts('./artifact/');

// Update satuses from file 
tr.importStatusesToNewRunFromArtifacts(false, './artifact/');
```
* Import optimization 
### Version: 0.5.0
* Optimize imports data to TR
* Optimize all requests
### Version: 0.2
* Optimize imports data to TR
* Fix upload non-exist images
* Removing not used requests from importer

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

