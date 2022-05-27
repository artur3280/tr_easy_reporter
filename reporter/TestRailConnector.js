'use strict';
const qs = require('querystring');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const unirest = require('unirest');
const sleep = require('sleep');

class TestRailConnector {
    constructor(options) {
        this.host = options.host;
        this.user = options.user;
        this.password = options.password;
        this.uri = '/index.php?/api/v2/';
    }

    apiGet(apiMethod, queryVariables) {
        let url = this.host + this.uri + apiMethod;
        return JSON.parse(this._call('get', url, queryVariables, null).responseText);
    };

    apiPost(apiMethod, body, queryVariables) {
        let url = this.host + this.uri + apiMethod;
        return this._call('post', url, queryVariables, body);
    };

    apiAttachFiles(auth, apiMethod, filePath, queryVariables) {
        let url = this.host + this.uri + apiMethod;
        return this._upload(auth, url, queryVariables, filePath)
    }

    _call(method, url, queryVariables, body) {
        let xmlHttp = new XMLHttpRequest();
        if (queryVariables != null) {
            url += '&' + qs.stringify(queryVariables);
        } else {
            url += ''
        }

        xmlHttp.open(method, url, false, this.user, this.password);
        xmlHttp.setRequestHeader('Content-Type', 'application/json')
        xmlHttp.setRequestHeader('Accept', 'application/json')
        xmlHttp.setRequestHeader('x-api-ident', 'beta')
        xmlHttp.send(body);
        return xmlHttp;
    }

    // _call(method, url, queryVariables, body) {
    //     let xmlHttp = new XMLHttpRequest();
    //     if (queryVariables != null) {
    //         url += '&' + qs.stringify(queryVariables);
    //     } else {
    //         url += ''
    //     }
    //
    //     xmlHttp.open(method, url, false, this.user, this.password);
    //     xmlHttp.setRequestHeader('Content-Type', 'application/json')
    //     xmlHttp.setRequestHeader('Accept', 'application/json')
    //     xmlHttp.setRequestHeader('x-api-ident', 'beta')
    //     xmlHttp.send(body);
    //
    //     if (xmlHttp.status === 500) {
    //         for (let i = 0; i < 5; i++) {
    //             console.log("Retry requests with waiter as 5 sec.....")
    //             sleep.sleep(5);
    //             let xmlHttp = new XMLHttpRequest();
    //             if (queryVariables != null) {
    //                 url += '&' + qs.stringify(queryVariables);
    //             } else {
    //                 url += ''
    //             }
    //
    //             xmlHttp.open(method, url, false, this.user, this.password);
    //             xmlHttp.setRequestHeader('Content-Type', 'application/json')
    //             xmlHttp.setRequestHeader('Accept', 'application/json')
    //             xmlHttp.setRequestHeader('x-api-ident', 'beta')
    //             xmlHttp.send(body);
    //             if (xmlHttp.status !== 500 && xmlHttp.status === 200) {
    //                 break;
    //             }
    //         }
    //     } else if (xmlHttp.status === 429) {
    //         console.log('Account is undergoing daily maintenance.')
    //         sleep.sleep(60);
    //         let xmlHttp = new XMLHttpRequest();
    //         if (queryVariables != null) {
    //             url += '&' + qs.stringify(queryVariables);
    //         } else {
    //             url += ''
    //         }
    //
    //         xmlHttp.open(method, url, false, this.user, this.password);
    //         xmlHttp.setRequestHeader('Content-Type', 'application/json')
    //         xmlHttp.setRequestHeader('Accept', 'application/json')
    //         xmlHttp.setRequestHeader('x-api-ident', 'beta')
    //         xmlHttp.send(body);
    //         if (xmlHttp.status !== 200) throw new Error(xmlHttp.status + ":" + xmlHttp.statusText + "\n " + xmlHttp.responseText)
    //     } else if (xmlHttp.status !== 200) {
    //         throw new Error(xmlHttp.status + ":" + xmlHttp.statusText + "\n " + xmlHttp.responseText)
    //     }
    //
    //     return JSON.parse(xmlHttp.responseText);
    // }

    _upload(auth, url, queryVariables, filePath) {
        if (queryVariables != null) {
            url += '&' + qs.stringify(queryVariables);
        } else {
            url += ''
        }

        unirest('POST', url)
            .headers({
                'Content-Type': 'multipart/form-data',
                'Authorization': 'Basic ' + auth
            })
            .attach('attachment', filePath)
            .end(function (res) {
                if (res.error) throw new Error(res.error);
                console.log("===========> Uploaded" + JSON.stringify(res.raw_body));
            });
    }

    // ----- Cases -----

    getCase(id) {
        return this.apiGet('get_case/' + id);
    };

    getCases(project_id, filters) {
        let uri = 'get_cases/' + project_id;
        return this.apiGet(uri, filters);
    };

    addCase(section_id, data) {
        return this.apiPost('add_case/' + section_id, JSON.stringify(data));
    };

    updateCase(case_id, data) {
        return this.apiPost('update_case/' + case_id, JSON.stringify(data));
    };

    deleteCase(case_id) {
        return this.apiPost('delete_case/' + case_id);
    };

    // ----- Case Fields -----

    getCaseFields() {
        return this.apiGet('get_case_fields');
    };

// ----- Case Types -----

    getCaseTypes() {
        return this.apiGet('get_case_types');
    };

// ----- Configurations -----

    getConfigs(project_id) {
        return this.apiGet('get_configs/' + project_id);
    };

    addConfigGroup(project_id, data) {
        return this.apiPost('add_config_group/' + project_id, JSON.stringify(data));
    };

    addConfig(config_group_id, data) {
        return this.apiPost('add_config/' + config_group_id, JSON.stringify(data));
    };

    updateConfigGroup(config_group_id, data) {
        return this.apiPost('update_config_group/' + config_group_id, JSON.stringify(data));
    };

    updateConfig(config_id, data) {
        return this.apiPost('update_config/' + config_id, JSON.stringify(data));
    };

    deleteConfigGroup(config_group_id) {
        return this.apiPost('delete_config_group/' + config_group_id);
    };

    deleteConfig(config_id) {
        return this.apiPost('delete_config/' + config_id);
    };

// ----- Milestones -----

    getMilestone(id) {
        return this.apiGet('get_milestone/' + id);
    };

    getMilestones(project_id, filters) {
        let uri = 'get_milestones/' + project_id;
        return this.apiGet(uri, filters);
    };

    addMilestone(project_id, data) {
        return this.apiPost('add_milestone/' + project_id, JSON.stringify(data));
    };

    updateMilestone(milestone_id, data) {
        return this.apiPost('update_milestone/' + milestone_id, JSON.stringify(data));
    };

    deleteMilestone(milestone_id) {
        return this.apiPost('delete_milestone/' + milestone_id);
    };

// ----- Plans -----

    getPlan(id) {
        return this.apiGet('get_plan/' + id);
    };

    getPlans(project_id, filters) {
        let uri = 'get_plans/' + project_id;
        return this.apiGet(uri, filters);
    };

    addPlan(project_id, data) {
        return this.apiPost('add_plan/' + project_id, JSON.stringify(data));
    };

    addPlanEntry(plan_id, data) {
        return this.apiPost('add_plan_entry/' + plan_id, JSON.stringify(data));
    };

    updatePlan(plan_id, data) {
        return this.apiPost('update_plan/' + plan_id, JSON.stringify(data));
    };

    updatePlanEntry(plan_id, entry_id, data) {
        return this.apiPost('update_plan_entry/' + plan_id + '/' + entry_id, JSON.stringify(data));
    };

    closePlan(plan_id) {
        return this.apiPost('close_plan/' + plan_id);
    };

    deletePlan(plan_id) {
        return this.apiPost('delete_plan/' + plan_id);
    };

    deletePlanEntry(plan_id, entry_id) {
        return this.apiPost('delete_plan_entry/' + plan_id + '/' + entry_id);
    };

// ----- Priorities -----

    getPriorities() {
        return this.apiGet('get_priorities');
    };

// ----- Projects -----

    getProject(id) {
        return this.apiGet('get_project/' + id);
    };

    getProjects(filters) {
        let uri = 'get_projects';
        return this.apiGet(uri, filters);
    };

    addProject(data) {
        return this.apiPost('add_project', JSON.stringify(data));
    };

    updateProject(project_id, data) {
        return this.apiPost('update_project/' + project_id, JSON.stringify(data));
    };

    deleteProject(project_id) {
        return this.apiPost('delete_project/' + project_id);
    };

// ----- Results -----

    getResults(test_id, filters) {
        let uri = 'get_results/' + test_id;
        return this.apiGet(uri, filters);
    };

    getResultsForCase(run_id, case_id, filters) {
        let uri = 'get_results_for_case/' + run_id + '/' + case_id;
        return this.apiGet(uri, filters);
    };

    getResultsForRun(run_id, filters) {
        let uri = 'get_results_for_run/' + run_id;
        return this.apiGet(uri, filters);
    };

    addResult(test_id, data) {
        return this.apiPost('add_result/' + test_id, JSON.stringify(data));
    };

    addResultForCase(run_id, case_id, data) {
        return this.apiPost('add_result_for_case/' + run_id + '/' + case_id, JSON.stringify(data));
    };

    addResults(run_id, data) {
        return this.apiPost('add_results/' + run_id, JSON.stringify({results: data}));
    };

    addResultsForCases(run_id, data) {
        return this.apiPost('add_results_for_cases/' + run_id, JSON.stringify({results: data}));
    };

// ----- Result Fields -----

    getResultFields() {
        return this.apiGet('get_result_fields');
    };

// ----- Runs -----

    getRun(id) {
        return this.apiGet('get_run/' + id);
    };

    getRuns(project_id, filters) {
        let uri = 'get_runs/' + project_id;
        return this.apiGet(uri, filters);
    };

    addRun(project_id, data) {
        return this.apiPost('add_run/' + project_id, JSON.stringify(data));
    };

    updateRun(run_id, data) {
        return this.apiPost('update_run/' + run_id, JSON.stringify(data));
    };

    closeRun(run_id) {
        return this.apiPost('close_run/' + run_id);
    };

    deleteRun(run_id) {
        return this.apiPost('delete_run/' + run_id);
    };

// ----- Sections -----

    getSection(id) {
        return this.apiGet('get_section/' + id);
    };

    getSections(project_id, filters) {
        let uri = 'get_sections/' + project_id;
        return this.apiGet(uri, filters);
    };

    addSection(project_id, data) {
        return this.apiPost('add_section/' + project_id, JSON.stringify(data));
    };

    updateSection(section_id, data) {
        return this.apiPost('update_section/' + section_id, JSON.stringify(data));
    };

    deleteSection(section_id) {
        return this.apiPost('delete_section/' + section_id);
    };

// ----- Statuses -----

    getStatuses() {
        return this.apiGet('get_statuses');
    };

// ----- Suites -----

    getSuite(id) {
        return this.apiGet('get_suite/' + id);
    };

    getSuites(project_id) {
        return this.apiGet('get_suites/' + project_id);
    };

    addSuite(project_id, data) {
        return this.apiPost('add_suite/' + project_id, JSON.stringify(data));
    };

    updateSuite(suite_id, data) {
        return this.apiPost('update_suite/' + suite_id, JSON.stringify(data));
    };

    deleteSuite(suite_id) {
        return this.apiPost('delete_suite/' + suite_id);
    };

// ----- Templates -----

    getTemplates(project_id) {
        return this.apiGet('get_templates/' + project_id);
    };

// ----- Tests -----

    getTest(id) {
        return this.apiGet('get_test/' + id);
    };

    getTests(run_id, filters) {
        let uri = 'get_tests/' + run_id;
        return this.apiGet(uri, filters);
    };

// ----- Users -----

    getUser(id) {
        return this.apiGet('get_user/' + id);
    };

    getUserByEmail(email) {
        return this.apiGet('get_user_by_email', {email: email});
    };

    getUsers() {
        return this.apiGet('get_users');
    };

// ----- Attachments -----

    addAttachmentToCase(caseId, payload) {
        return this.apiPost('add_attachment_to_case/' + caseId, JSON.stringify({form: {attachment: payload}}), null);
    }

    addAttachmentToPlan(planId, payload) {
        return this.apiPost('add_attachment_to_plan/' + planId, JSON.stringify({form: {attachment: payload}}), null);
    }

    addAttachmentToPlanEntry(planId, entryId, payload) {
        return this.apiPost('add_attachment_to_plan_entry/' + planId + "/" + entryId, JSON.stringify({form: {attachment: payload}}), null);
    }

    addAttachmentToResult(auth, resultId, file) {
        return this.apiAttachFiles(auth, 'add_attachment_to_result/' + resultId, file, null);
    }

    addAttachmentToRun(runId, payload) {
        return this.apiPost('add_attachment_to_run/' + runId, JSON.stringify({form: {attachment: payload}}), null);
    }

    getAttachmentsForCase(caseId, filter) {
        return this.apiGet('get_attachments_for_case/' + caseId, JSON.stringify(filter));
    }

    getAttachmentsForPlan(planId, filter) {
        return this.apiGet('get_attachments_for_plan/' + planId, JSON.stringify(filter));
    }

    getAttachmentsForPlanEntry(planId, entryId) {
        return this.apiGet('get_attachments_for_plan_entry/' + planId + "/" + entryId, null);
    }

    getAttachmentsForRun(runId, filter) {
        return this.apiGet('get_attachments_for_run/' + runId, JSON.stringify(filter));
    }

    getAttachmentsForTest(testId, filter) {
        return this.apiGet('get_attachments_for_test/' + testId, JSON.stringify(filter));
    }

    getAttachment(attachmentId, filter) {
        return this.apiGet('get_attachment/' + attachmentId, JSON.stringify(filter));
    }

    deleteAttachment(attachmentId) {
        return this.apiPost('delete_attachment/' + attachmentId, null, null);
    }
}

module.exports = TestRailConnector;


