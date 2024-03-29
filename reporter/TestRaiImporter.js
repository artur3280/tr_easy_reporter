'use strict';
const TestRailConnector = require("./TestRailConnector");
const credentials = require("../../../tr_credentials.json");
const fs = require('fs');
const json = require('json-update');
const sleep = require('sleep');
let resolve = require('path').resolve

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
        let projects = this.tr.getProjects({is_completed: 0}).projects;
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
            return this.tr.getCases(projectId, {suite_id: suiteId}).cases;
        else
            throw new Error('Project id or Suite id eqls null')
    }

    getSuiteCases(projectId, suiteId, offset) {
        console.log("Get case list from suite " + suiteId + " in " + projectId);
        if (projectId && suiteId)
            return this.tr.getCases(projectId, {suite_id: suiteId, offset: offset}).cases;
        else
            throw new Error('Project id or Suite id eqls null')
    }

    getSectionCases(projectId, suiteId, sectionId) {
        console.log("Get case list from section " + sectionId + " in " + suiteId);
        if (projectId && suiteId)
            return this.tr.getCases(projectId, {suite_id: suiteId, section_id: sectionId}).cases;
        else
            throw new Error('Project id or Suite id eqls null')
    }

    getSuiteSections(projectId, suiteId) {
        console.log("Get section list from suite " + suiteId + " in " + projectId);
        if (projectId && suiteId)
            return this.tr.getSections(projectId, {suite_id: suiteId}).sections;
        else
            throw new Error('Project id or Suite id eqls null')
    }

    getSuiteSections(projectId, suiteId, offset) {
        console.log("Get section list from suite " + suiteId + " in " + projectId);
        if (projectId && suiteId)
            return this.tr.getSections(projectId, {suite_id: suiteId, offset: offset}).sections;
        else
            throw new Error('Project id or Suite id eqls null')
    }

    getRuns(projectId) {
        console.log("Get run list for" + projectId);
        if (projectId)
            return this.tr.getRuns(projectId, {is_completed: 0}).runs;
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

    createNewSection(projectId, suiteId, name, parent_id) {
        console.log("Add new section: " + name + " in project/suite " + projectId + '/' + suiteId + ' for parent section ' + parent_id);
        let body = {
            name: name,
            suite_id: suiteId,
            parent_id: parent_id
        }
        return JSON.parse(this.tr.addSection(projectId, body).responseText);
    }


    createNewRun(projectId, suiteId, name, description) {
        console.log("Create new  run: " + name + " in project " + projectId);
        let body = {
            name: name,
            include_all: true,
            suite_id: suiteId,
            description: description
        }
        return JSON.parse(this.tr.addRun(projectId, body).responseText);
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
        return this.tr.getResultsForRun(runId, {status_id: statusesId}).results;
    }

    getResultsByCase(runId, caseId, statusesId) {
        console.log("Get results for case: " + caseId + " by status " + statusesId);
        return this.tr.getResultsForCase(runId, caseId, {status_id: statusesId}).results;
    }

    closeRun(runId, close) {
        if (runId && close) {
            this.tr.closeRun(runId);
            console.log("Run " + runId + " has been closed.")
        }
    }

    updateSuiteCases() {
        let sections = this.getSuiteSections(this._project.id, this._suite.id);
        let cases_from_suite = this.getSuiteCases(this._project.id, this._suite.id)

        let completed_data = {};
        let completed_sections = [];


        sections.forEach(section => {
            let filtered_cases = cases_from_suite.filter(c => c.section_id === section.id)
            let s = {};
            if (filtered_cases.length === 0) {
                s.section_name = section.name;
                s.section_id = section.id;
                s.cases = [];
            } else {
                s.section_name = section.name;
                s.section_id = section.id;
                s.cases = filtered_cases;
            }
            completed_sections.push(s);
        })
        completed_data.sections = completed_sections;

        this.run.runs.forEach(r => {
            let filtered_section = completed_data.sections.filter(section => section.section_name === r.spec.name);
            if (filtered_section.length === 0) {
                let section = this.createNewSection(this._project.id, this._suite.id, r.spec.name);
                r.tests.forEach(test => {
                    this.createNewCase(section.id, test.title.map((s) => {
                        return s.trim()
                    })[test.title.length - 1], test.body)
                })
            } else {
                r.tests.forEach(test => {
                    if (filtered_section[0].cases.filter(c => c.title === test.title.map((s) => {
                        return s.trim()
                    })[test.title.length - 1]).length === 0) {
                        this.createNewCase(filtered_section[0].section_id, test.title.map((s) => {
                            return s.trim()
                        })[test.title.length - 1], test.body)
                    }
                })
            }
        });
    }

    addCasesFromArtifacts(fromFolder) {
        let resolve = require('path').resolve
        fs.readdir(fromFolder, (err, files) => {
            files.forEach(file => {
                let absolute_path_to_file = resolve(fromFolder.concat(file));
                console.log(absolute_path_to_file);
                let data_from_file = require(absolute_path_to_file);
                let failed_sections = data_from_file.sections.filter(
                    section => section.cases.filter(c => c.isCreated === false).length > 0);

                let sections_from_server = this.getAllSections()
                // console.log(sections_from_server)

                for (let failedSection of failed_sections) {
                    // console.log(failedSection.section_name.split('/')[failedSection.section_name.split('/').length-1])
                    let section_id = sections_from_server.filter(s => s.name === failedSection.section_name.split('/')[failedSection.section_name.split('/').length - 1])[0].id;
                    let failed_cases = failedSection.cases.filter(c => c.isCreated === false);
                    if (failed_cases.length > 0) {
                        for (let failedCase of failed_cases) {
                            let request;
                            try {
                                request = this.createNewCase(section_id, failedCase.title.trim(), 'You can see more details on the Dashboard.');
                            } catch (e) {
                                console.log("Status code was ".concat(request.status, " When creating new case"))
                                let cases = this.getSectionCases(this._project.id, this._suite.id, section_id).filter(c => c.title === failedCase.title.trim());
                                if (cases.length === 0) {
                                    console.log('Try to recreate new request '.concat(failedCase.title.trim(), ' for ', section_id, ' section'))
                                    this.createNewCase(section_id, failedCase.title.trim(), 'You can see more details on the Dashboard.');
                                } else {
                                    console.log('Case '.concat(cases[0].id, ' was created'))
                                }
                            }
                        }
                    }
                }
            });
        });
    }

    createSections(fromFolder) {
        let resolve = require('path').resolve
        fs.readdir(fromFolder, (err, files) => {
            files.forEach(file => {
                let absolute_path_to_file = resolve(fromFolder.concat(file));
                console.log(absolute_path_to_file);
                let data_from_file = require(absolute_path_to_file);

                let sections_from_server = this.getAllSections()

                data_from_file.sections.forEach(s => {
                    console.log(s.section_name.split('/'))
                    let section_path = s.section_name.split('/');

                    this.parent_section_id = null;
                    for (let i = 0; i < section_path.length; i++) {
                        let created_sections = sections_from_server.filter(s => s.name === section_path[i]);

                        if (created_sections.length > 0) {
                            continue;
                        }

                        if (section_path.length === 1) {
                            this.parent_section_id = null;
                        } else {
                            if (section_path[i].includes('.spec.js')) {
                                let posion_s = section_path.indexOf(section_path[i]);
                                if (posion_s !== '-1') {
                                    let created_sections = sections_from_server.filter(s => s.name === section_path[posion_s - 1]);
                                    this.parent_section_id = created_sections[0].id
                                }
                            } else if (section_path.indexOf(section_path[i]) > 0) {
                                let posion_s = section_path.indexOf(section_path[i]);
                                // console.log(section_path[i])
                                if (posion_s !== '-1') {
                                    let created_sections = sections_from_server.filter(s => s.name === section_path[posion_s - 1]);
                                    this.parent_section_id = created_sections[0].id
                                }
                            }
                        }

                        this.section_body = this.createNewSection(this._project.id, this._suite.id, section_path[i], this.parent_section_id);
                        this.parent_section_id = this.section_body.id;
                        this.section_body.created_from_script = true;
                        sections_from_server.push(this.section_body)
                    }
                })
            });
        });

    }

    saveArtifact(saveTo) {
        let sections = this.getAllSections();
        let cases_from_suite = this.getAllCases();

        let completed_data = {};
        completed_data.startedTestsAt = this.run.startedTestsAt;
        completed_data.endedTestsAt = this.run.endedTestsAt;
        completed_data.totalTests = this.run.totalTests;
        completed_data.browserName = this.run.browserName;
        completed_data.browserVersion = this.run.browserVersion;
        completed_data.osVersion = this.run.osVersion;
        completed_data.cypressVersion = this.run.cypressVersion;
        completed_data.runUrl = this.run.runUrl;

        let completed_sections = [];

        this.run.runs.forEach(r => {
            let filtered_section = sections.filter(section => section.name === r.spec.name.split('/')[r.spec.name.split('/').length - 1]);

            let s = {};
            if (filtered_section.length === 0) {
                let cases = [];
                s.section_name = r.spec.name;
                s.section_id = null;
                s.isCreated = false;
                s.cases_length = r.tests.length;

                r.tests.forEach(test => {
                    let runCase = {};
                    runCase.title = test.title[test.title.length - 1];
                    runCase.state_string = test.state;
                    runCase.isCreated = false;

                    if (test.state === 'passed') {
                        runCase.state_id = 1;
                    }

                    if (test.state === 'skipped') {
                        runCase.state_id = 2;
                    }

                    if (test.state === 'failed') {
                        runCase.state_id = 5;
                    }

                    if (test.state === 'failed' && test.attempts[0].error !== null) {
                        runCase.error_message = test.attempts[0].error.message;
                    }

                    if (test.state !== 'passed' && test.attempts[0].screenshots.length !== 0) {
                        runCase.screenshots = test.attempts[0].screenshots;
                    }

                    cases.push(runCase);
                })
                s.cases = cases;
            } else {
                let filtered_cases = cases_from_suite.filter(c => c.section_id === filtered_section[0].id)

                let cases = [];
                s.section_name = filtered_section[0].name;
                s.section_id = filtered_section[0].id;
                s.isCreated = true;
                s.cases_length = r.tests.length;

                r.tests.forEach(test => {
                    let runCase = {};
                    runCase.title = test.title[test.title.length - 1];
                    runCase.state_string = test.state;

                    let found_case = filtered_cases.filter(c => c.title === test.title.map((s) => {
                        return s.trim()
                    })[test.title.length - 1]);

                    if (found_case.length === 0) {
                        runCase.isCreated = false;
                    } else {
                        runCase.isCreated = true;
                    }

                    if (test.state === 'passed') {
                        runCase.state_id = 1;
                    }

                    if (test.state === 'skipped') {
                        runCase.state_id = 2;
                    }

                    if (test.state === 'failed') {
                        runCase.state_id = 5;
                    }

                    if (test.state !== 'passed' && test.attempts[0].error !== null) {
                        runCase.error_message = test.attempts[0].error.message;
                    }

                    if (test.state !== 'passed' && test.attempts[0].screenshots.length !== 0) {
                        runCase.screenshots = test.attempts[0].screenshots;
                    }

                    cases.push(runCase);
                })
                s.cases = cases;
            }
            completed_sections.push(s)
        });
        completed_data.sections = completed_sections;

        json.update(saveTo.concat('run_data_', new Date().getMilliseconds(), '.json'), completed_data);
    }

    sendResultsFromArtifacts(projectId, suiteId, runId, dataFromArtifact, completed_data) {
        let casesReport = [];

        dataFromArtifact.sections.forEach(localRun => {
            this.casesFromTR = completed_data.filter(s =>
                s.section_name === localRun.section_name.split('/')[localRun.section_name.split('/').length - 1])[0];
            this.casesFromTR.cases.forEach(caseTR => {
                let caseLocal = localRun.cases.filter(c => c.title.trim() === caseTR.title)[0];
                if (caseLocal !== undefined) {
                    let errorString = 'Test was passed!';

                    if (caseLocal.state_string === 'failed') {
                        this.statusCase = caseLocal.state_id;
                        errorString = caseLocal.error_message
                    }

                    if (caseLocal.state_string === 'passed') {
                        this.statusCase = caseLocal.state_id;
                        errorString = 'Looks good!';
                    }

                    if (caseLocal.state_string === 'skipped') {
                        this.statusCase = caseLocal.state_id;
                        errorString = 'Case was skipped!';
                    }

                    let caseReport = {
                        case_id: caseTR.id,
                        status_id: this.statusCase,
                        comment: errorString
                    }
                    casesReport.push(caseReport);
                } else {
                    let caseReport = {
                        case_id: caseTR.id,
                        status_id: 4,
                        comment: "This case may have been deleted or renamed earlier. Please see the test code."
                    }
                    casesReport.push(caseReport);
                }
            })
        })

        let n = 100;
        let temp = [];
        for (let i = 0; i < casesReport.length; i += n) {
            let request;
            try {
                casesReport.slice(i, i + n).forEach(c => console.log("Send results for " + c.case_id + " to run:" + runId + " by status " + c.status_id));
                request = this.tr.addResultsForCases(runId, casesReport.slice(i, i + n));
                console.log('Wait 5 seconds')
                sleep.sleep(5);
            } catch (e) {
                console.log("Status code was ".concat(request.status, " When adding results"))
                casesReport.slice(i, i + n).forEach(c => console.log("Send results for " + c.case_id + " to run:" + runId + " by status " + c.status_id));
                request = this.tr.addResultsForCases(runId, casesReport.slice(i, i + n));
                console.log('Wait 5 seconds')
                sleep.sleep(5);
            }
        }
    }

    sendResults(projectId, suiteId, runId, run) {
        let sections = this.getSuiteSections(this._project.id, this._suite.id);
        let cases_from_suite = this.getSuiteCases(this._project.id, this._suite.id)

        let completed_data = {};
        let completed_sections = [];


        sections.forEach(section => {
            let filtered_cases = cases_from_suite.filter(c => c.section_id === section.id)
            let s = {};
            if (filtered_cases.length === 0) {
                s.section_name = section.name;
                s.section_id = section.id;
                s.cases = [];
            } else {
                s.section_name = section.name;
                s.section_id = section.id;
                s.cases = filtered_cases;
            }
            completed_sections.push(s);
        })
        completed_data.sections = completed_sections;

        let casesReport = [];

        run.runs.forEach(localRun => {
            this.casesFromTR = completed_data.sections.filter(s => s.section_name === localRun.spec.name)[0].cases;
            this.casesFromTR.forEach(caseTR => {
                localRun.tests.forEach(caseLocal => {
                        if (caseLocal.title.map((s) => {
                            return s.trim()
                        })[caseLocal.title.length - 1] === caseTR.title) {

                            let errorString = 'Test was passed!'
                            if (caseLocal.state === 'failed') {
                                this.statusCase = 5
                                caseLocal.attempts.forEach(e => {
                                    errorString +=
                                        e.error.name + "\n" +
                                        e.error.message + "\n" +
                                        e.error.stack + "\n" +
                                        "=======================V \n\n\n"
                                })
                            }

                            if (caseLocal.state === 'passed') {
                                this.statusCase = 1
                                errorString = '';
                            }

                            if (caseLocal.state === 'skipped') {
                                this.statusCase = 2
                                errorString = '';
                            }

                            let caseReport = {
                                case_id: caseTR.id,
                                status_id: this.statusCase,
                                comment: errorString
                            }
                            casesReport.push(caseReport);
                        }
                    }
                )
            })
        })

        casesReport.forEach(c => console.log("Send results for " + c.case_id + " to run:" + runId + " by status " + c.status_id));
        return this.tr.addResultsForCases(runId, casesReport);
    }

    getCurrentCasesBySections(projectId, suiteId) {
        let currentCases = [];

        let sections = this.getSuiteSections(projectId, suiteId);
        for (let section of sections) {
            let object = {};
            object.section_name = section.name;
            object.cases = this.getSectionCases(projectId, suiteId, section.id);
            currentCases.push(object);
        }
        return currentCases;
    }

    importStatusesToNewRun(closeRun, send_images) {
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

        this.sendResults(this._project.id, this._suite.id, runObj.id, this.run)
        this.uploadScreenShotsToFailedTests(send_images);
        this.closeRun(runObj.id, closeRun)
    }

    importStatusesToNewRunFromArtifacts(closeRun, fromFolder) {
        fs.readdir(fromFolder, (err, files) => {
            let runs = this.getRuns(this._project.id);

            let date = new Date();
            let options = {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            };

            this.runName = "UI Test run [based on Cypress] ".concat(date.toLocaleDateString("en-US", options));

            let absolute_path_to_file = resolve(fromFolder.concat(files[0]));
            console.log(absolute_path_to_file);
            let info = require(absolute_path_to_file);

            let timeStampRun = "Started/Ended: ".concat(info.startedTestsAt, '-', info.endedTestsAt);
            this.totalTests = "Total tests: ".concat(info.totalTests);
            if (this.runUrl) {
                this.runUrl = "Run url: ".concat(info.runUrl);
            } else {
                this.runUrl = '';
            }
            let browserName = "Browser: ".concat(info.browserName, " ", info.browserVersion);
            let cypressVersion = "Cypress: ".concat(info.cypressVersion);

            this.runDescription = timeStampRun + "\n" +
                this.totalTests + "\n" +
                browserName + "\n" +
                this.runUrl + "\n" +
                cypressVersion + "\n";

            let runObj;
            if (runs.filter(r => r.name === this.runName).length === 0) {
                runObj = this.createNewRun(this._project.id, this._suite.id, this.runName, this.runDescription);
            } else {
                runObj = runs.filter(r => r.name === this.runName)[0];
                this.updateRun(runObj.id, this._suite.id, this.runName, this.runDescription)
            }

            let completed_sections = [];

            let sections = this.getAllSections();
            let cases_from_suite = this.getAllCases();
            sections.forEach(section => {
                let filtered_cases = cases_from_suite.filter(c => c.section_id === section.id);

                if (filtered_cases.length > 0) {
                    let s = {};
                    s.section_name = section.name;
                    s.section_id = section.id;
                    s.cases = filtered_cases;
                    completed_sections.push(s);
                }
            })

            files.forEach(file => {
                let absolute_path_to_file = resolve(fromFolder.concat(file));
                console.log(absolute_path_to_file);
                let data_from_file = require(absolute_path_to_file);
                this.sendResultsFromArtifacts(this._project.id, this._suite.id, runObj.id, data_from_file, completed_sections)
            });

            this.closeRun(runObj.id, closeRun)
        });


    }

    getAllCases() {
        let cases_from_suite = [];
        let current_page = 0;
        let current_step = 0;
        do {
            let c = this.getSuiteCases(this._project.id, this._suite.id, current_step);
            current_page = c.length;
            c.forEach(cp => {
                cases_from_suite.push(cp);
            })
            current_step += 250

        } while (250 <= current_page)
        return cases_from_suite;
    }

    getAllSections() {
        let sections_from_suite = [];
        let current_page = 0;
        let current_step = 0;
        do {
            let c = this.getSuiteSections(this._project.id, this._suite.id, current_step);

            current_page = c.length;
            c.forEach(cp => {
                sections_from_suite.push(cp);
            })
            current_step += 250

        } while (250 <= current_page)
        return sections_from_suite;
    }

    uploadScreenShotsToFailedTests(send_images) {
        if (send_images) {
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
                                if (fs.existsSync(screenShot.path)) {
                                    console.log("Upload screenshot to result " + results[0].id + " by path " + screenShot.path)
                                    this.attachToCaseResult(results[0].id, screenShot.path)
                                } else {
                                    console.log("Not exist file by path " + screenShot.path)
                                }
                            })
                        }
                    }

                });
            })
        }
    }

    //console command:  node -r esm TestRaiImporter.js
    // let tr = new TestRaiImporter(this.run);
    // tr.updateSuiteCases();
    // tr.importStatusesToNewRun();
    //file example /plugins/tr_integration/run_all_cases.json

    // import js from "../../../fixtures/add_metrics.json";
    // let tr = new TestRaiImporter(js);
    // tr.saveArtifact('./artifact/')
    // tr.createSections('../artifact/')
    // tr.addCasesFromArtifacts('../artifact/');
    // tr.importStatusesToNewRunFromArtifacts(false, '../artifact/');
}

module.exports = TestRaiImporter;
