'use strict';
const TestRailConnector = require("./TestRailConnector");
const credentials = require( "../../../tr_credentials.json");


class TestRaiImporter {
    constructor(run) {
        this.connection();
        this.run = run;
    }

    connection() {
        this.tr = new TestRailConnector({
            host: credentials.host,
            user: credentials.username,
            password: credentials.password,
        });

        console.log("Auth in TestRAil");
        this._project = this.findProject(credentials.project_name);
        this._suite = this.findSuite(credentials.suite_name, this._project.id);
    }

    findProject(name) {
        console.log("Find project by " + name);
        let projects = this.tr.getProjects({is_completed: 0});
        if (projects.filter(p => p.name === name).length === 0) {
            throw new Error("Project " + name + " does not found")
        } else {
            this.project = projects.filter(p => p.name === name)[0];
        }
        return this.project;
    }

    findSuite(name, projectId) {
        console.log("Find suite by " + name + " in " + projectId);
        let suites = this.tr.getSuites(projectId);
        if (suites.filter(p => p.name === name).length === 0) {
            throw new Error("Suite " + name + " does not found in a project:" + projectId)
        } else {
            this.suite = suites.filter(p => p.name === name)[0];
        }
        return this.suite;
    }

    getSuiteCases(projectId, suiteId) {
        console.log("Get case list from suite " + suiteId + " in " + projectId);
        if (projectId && suiteId)
            return this.tr.getCases(projectId, {suite_id: suiteId});
        else
            throw new Error('Project id or Suite id eqls null')
    }

    getSectionCases(projectId, suiteId, sectionId) {
        console.log("Get case list from section " + sectionId + " in " + suiteId);
        if (projectId && suiteId)
            return this.tr.getCases(projectId, {suite_id: suiteId, section_id: sectionId});
        else
            throw new Error('Project id or Suite id eqls null')
    }

    getSuiteSections(projectId, suiteId) {
        console.log("Get section list from suite " + suiteId + " in " + projectId);
        if (projectId && suiteId)
            return this.tr.getSections(projectId, {suite_id: suiteId});
        else
            throw new Error('Project id or Suite id eqls null')
    }

    getRuns(projectId) {
        console.log("Get run list for" + projectId);
        if (projectId)
            return this.tr.getRuns(projectId, {is_completed: 0});
        else
            throw new Error('Project id eql null')
    }

    createNewCase(sectionId, name, description) {
        console.log("Add new case: " + name + " in section " + sectionId);
        let body = {
            title: name,
            custom_steps_separated: [{
                content: description,
                expected: "Correct work of the automated test."
            }]
        }
        return this.tr.addCase(sectionId, body);
    }

    createNewSection(projectId, suiteId, name) {
        console.log("Add new section: " + name + " in project/suite " + projectId + '/' + suiteId);
        let body = {
            name: name,
            suite_id: suiteId
        }
        return this.tr.addSection(projectId, body);
    }

    createNewRun(projectId, suiteId, name, description) {
        console.log("Create new  run: " + name + " in project " + projectId);
        let body = {
            name: name,
            include_all: true,
            suite_id: suiteId,
            description: description
        }
        return this.tr.addRun(projectId, body);
    }

    updateRun(runId, suiteId, name, description) {
        console.log("Update run: " + name + " in " + runId);
        let body = {
            name: name,
            include_all: true,
            suite_id: suiteId,
            description: description
        }
        return this.tr.updateRun(runId, body);
    }

    attachToCaseResult(resultId, file) {
        let auth = Buffer.from(credentials.username + ":" + credentials.password).toString('base64');
        return this.tr.addAttachmentToResult(auth, resultId, file);
    }

    getResultsByRun(runId, statusesId) {
        console.log("Get results for run: " + runId + " by " + statusesId);
        return this.tr.getResultsForRun(runId, {status_id: statusesId})
    }

    getResultsByCase(runId, caseId, statusesId) {
        console.log("Get results for case: " + caseId + " by status " + statusesId);
        return this.tr.getResultsForCase(runId, caseId, {status_id: statusesId})
    }

    updateSuiteCases() {
        this.run.runs.forEach(r => {
            let sections = this.getSuiteSections(this._project.id, this._suite.id);
            if (sections.filter(section => section.name === r.spec.name).length === 0) {
                let section = this.createNewSection(this._project.id, this._suite.id, r.spec.name);
                r.tests.forEach(test => {
                    this.createNewCase(section.id, test.title.map((s) => {
                        return s.trim()
                    })[test.title.length - 1], test.body)
                })
            } else {
                let section = sections.filter(section => section.name === r.spec.name)[0];
                let cases = this.getSectionCases(this._project.id, this._suite.id, section.id);
                r.tests.forEach(test => {
                    if (cases.filter(c => c.title.toString === test.title.map((s) => {
                        return s.trim()
                    })[test.title.length - 1].toString).length === 0) {
                        this.createNewCase(section.id, test.title[test.title.length - 1], test.body)
                    }
                })
            }
        })

    }

    sendResults(projectId, suiteId, runId, casesTR, run) {
        let casesReport = [];
        run.runs.forEach(localRun => {
            let section = this.getSuiteSections(projectId, suiteId).filter(section => section.name === localRun.spec.name)[0];
            let cases = this.getSectionCases(projectId, suiteId, section.id);
            cases.forEach(caseTR => {

                localRun.tests.forEach(caseLocal => {
                    if (caseLocal.title.map((s) => {
                        return s.trim()
                    })[caseLocal.title.length - 1] === caseTR.title) {
                        let statusCase;
                        let errorString = '';
                        if (caseLocal.state === 'failed') {
                            statusCase = 5
                            caseLocal.attempts.forEach(e => {
                                errorString +=
                                    e.error.name + "\n" +
                                    e.error.message + "\n" +
                                    e.error.stack + "\n" +
                                    "=======================V \n\n\n"
                            })
                        } else if (caseLocal.state === 'passed') {
                            statusCase = 1
                            errorString = '';
                        } else {
                            statusCase = 2
                            errorString = '';
                        }

                        let caseReport = {
                            case_id: caseTR.id,
                            status_id: statusCase,
                            comment: errorString
                        }
                        casesReport.push(caseReport);
                    }
                })


            })
        })

        casesReport.forEach(c => console.log("Send results for " + c.case_id + " to run:" + runId + " by status " + c.status_id));
        return this.tr.addResultsForCases(runId, casesReport);
    }

    importStatusesToNewRun() {
        let cases = this.getSuiteCases(this._project.id, this._suite.id);
        let runs = this.getRuns(this._project.id);

        let date = new Date();
        let options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        };
        let runName = "UI Test run [based on Cypress] " + date.toLocaleDateString("en-US", options);
        let timeStampRun = "Started/Ended: " + this.run.startedTestsAt + "-" + this.run.endedTestsAt;
        let browserName = "Browser: " + this.run.browserName + " " + this.run.browserVersion;
        let os = "OS: " + this.run.osName + " " + this.run.osVersion;
        let cypressVersion = "Cypress: " + this.run.cypressVersion;
        let nodeVersion = "Cypress: " + this.run.config.resolvedNodeVersion;
        let screenSize = "Screen size: Width: " + this.run.config.viewportWidth + " Height: " + this.run.config.viewportHeight;
        let envData = "WEB_BASE_URL: " + this.run.config.env.WEB_BASE_URL +
            "\n" + " ADMIN_BASE_URL: " + this.run.config.env.ADMIN_BASE_URL +
            "\n" + " LOGIN: " + this.run.config.env.LOGIN +
            "\n" + " PASS: ********* ";

        let runDescription = timeStampRun + "\n" +
            browserName + "\n" +
            os + "\n" +
            cypressVersion + "\n" +
            nodeVersion + "\n" +
            screenSize + "\n" +
            envData + "\n";


        let runObj;
        if (runs.filter(r => r.name === runName).length === 0) {
            runObj = this.createNewRun(this._project.id, this._suite.id, runName, runDescription);
        } else {
            runObj = runs.filter(r => r.name === runName)[0];
            this.updateRun(runObj.id, this._suite.id, runName, runDescription)
        }

        this.sendResults(this._project.id, this._suite.id, runObj.id, cases, this.run)
        this.uploadScreenShotsToFailedTests();
    }

    uploadScreenShotsToFailedTests() {
        let date = new Date();
        let options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        };

        let runName = "UI Test run [based on Cypress] " + date.toLocaleDateString("en-US", options);
        let runs = this.getRuns(this._project.id);
        let cases = this.getSuiteCases(this._project.id, this._suite.id);

        let runObj;
        if (runs.filter(r => r.name === runName).length === 1) {
            runObj = runs.filter(r => r.name === runName)[0];
        } else {
            throw new Error("Cannot upload images to the failed tests, because the run " + runName + " does not found")
        }

        this.run.runs.forEach(localData => {
            localData.tests.forEach(caseLocal => {
                if (caseLocal.state === 'failed') {
                    let caseTRiD = cases.filter(caseTR => caseLocal.title.map((s) => {
                        return s.trim()
                    })[caseLocal.title.length - 1] === caseTR.title)[0];
                    let results = this.getResultsByCase(runObj.id, caseTRiD.id, [5])
                    if (caseLocal.attempts[0].screenshots.length !== 0 && results.length !== 0) {
                        caseLocal.attempts[0].screenshots.forEach(screenShot => {
                            console.log("Upload screenshot to result " + results[0].id + " by path " + screenShot.path)
                            this.attachToCaseResult(results[0].id, screenShot.path)
                        })
                    }
                }

            });
        })
    }

    //console command:  node -r esm TestRaiImporter.js
    // let tr = new TestRaiImporter(this.run);
    // tr.updateSuiteCases();
    // tr.importStatusesToNewRun();
    //file example hrs/plugins/tr_integration/run_all_cases.json
}

module.exports = TestRaiImporter;