"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAllBranchesForSemanticRelease = exports.createBranch = exports.addLabelForPr = exports.createNewPR = exports.checkActivePRExists = exports.mergeBranchTo = exports.fetchBranchesList = void 0;
const util_1 = require("util");
const log_1 = require("./log");
const github_common_1 = require("./github-common");
const PR_DESCRIPTION_TEXT = 'Auto-merge pull request created by Automerge-bot';
/**
 * List branches via the GitHub API
 * https://developer.github.com/v3/git/refs/#list-matching-references
 *
 * @export
 * @param {TGitHubOctokit} octokit
 * @param {IGitHubPushDescription} pushDescription
 * @param {number} [perPage=100] - how many items to fetch on one page
 * @param {number} [page=1] - requested page number
 * @param {string} [owner]
 * @throws {Error}
 * @returns {TGitHubApiRestRefResponseData} - descriptions of the branches
 */
function fetchBranchesList(octokit, pushDescription, branchPrefix, page = 1, perPage = 100) {
    return __awaiter(this, void 0, void 0, function* () {
        const requestParams = {
            owner: (0, github_common_1.getPRRepoOwner)(pushDescription),
            repo: (0, github_common_1.getPRRepo)(pushDescription),
            ref: (0, github_common_1.getBranchRefPrefix)(branchPrefix),
            page,
            per_page: perPage
        };
        (0, log_1.debug)('listBranches::start::params', requestParams);
        const res = yield octokit.request('GET /repos/{owner}/{repo}/git/matching-refs/{ref}', requestParams);
        (0, log_1.debug)('listBranches::::end', res);
        return res.data;
    });
}
exports.fetchBranchesList = fetchBranchesList;
/**
 * Fetch all branches for semantic-release workflow (fetches all branches, not just release ones)
 *
 * @export

/**
 * Merge  sourceBranchName to the targetBranchName
 * https://developer.github.com/v3/repos/merging/#merge-a-branch
 *
 * @param {TGitHubOctokit} octokit
 * @param {IGitHubPushDescription} pushDescription
 * @param {string} targetBranchName
 * @param {string} sourceBranchName
 * @returns {undefined | false} - return undefined if no error, false - if merge conflict
 * @throws - if any other error
 */
function mergeBranchTo(octokit, pushDescription, targetBranchName, sourceBranchName) {
    return __awaiter(this, void 0, void 0, function* () {
        const requestParams = {
            owner: (0, github_common_1.getPRRepoOwner)(pushDescription),
            repo: (0, github_common_1.getPRRepo)(pushDescription),
            base: targetBranchName,
            head: sourceBranchName,
        };
        (0, log_1.debug)('mergeBranchTo::start', 'targetBranchName', targetBranchName, 'sourceBranchName', sourceBranchName, 'params', requestParams);
        let response;
        try {
            response = yield octokit.request('POST /repos/{owner}/{repo}/merges', requestParams);
        }
        catch (err) {
            (0, log_1.debug)('mergeBranchTo::request-throw', err);
            response = err;
        }
        (0, log_1.debug)('mergeBranchTo::response', 'targetBranchName', targetBranchName, 'sourceBranchName', sourceBranchName, 'response', response);
        const { status, data } = response;
        if (Number(status) === 409) {
            (0, log_1.debug)('mergeBranchTo::merge-conflict', 'targetBranchName', targetBranchName, 'sourceBranchName', sourceBranchName);
            return false;
        }
        if (Number(status) === 204) {
            (0, log_1.debug)('mergeBranchTo::nothing-to-merge', 'targetBranchName', targetBranchName, 'sourceBranchName', sourceBranchName);
            return;
        }
        if (Number(status) === 201) {
            (0, log_1.debug)('mergeBranchTo::successfully-merged', 'targetBranchName', targetBranchName, 'sourceBranchName', sourceBranchName);
            return;
        }
        throw new Error(`
    Failed to merge branches.
    Status: ${status}.
    Data: 
    ${(0, util_1.inspect)(data)}.
  `);
    });
}
exports.mergeBranchTo = mergeBranchTo;
/**
 * Check a pull request from sourceBranchName to the targetBranchName is exists
 * and has the open state
 * https://octokit.github.io/rest.js/v18#pulls
 * https://developer.github.com/v3/pulls/#list-pull-requests
 *
 * @param {TGitHubOctokit} octokit
 * @param {IGitHubPushDescription} pushDescription
 * @param {string} targetBranchName - e.g. 'master'
 * @param {string} sourceBranchName - e.g. 'feature/TASK-11'
 * @returns {boolean} - true if a PR related to branches was found
 * @throws - if any other error
 */
function checkActivePRExists(octokit, pushDescription, targetBranchName, sourceBranchName) {
    return __awaiter(this, void 0, void 0, function* () {
        const requestConf = {
            owner: (0, github_common_1.getPRRepoOwner)(pushDescription),
            repo: (0, github_common_1.getPRRepo)(pushDescription),
            base: targetBranchName,
            head: sourceBranchName,
            state: "open",
            per_page: 1,
            page: 1
        };
        (0, log_1.debug)('checkActivePRExists::start::conf:', requestConf);
        const response = yield octokit.request('GET /repos/{owner}/{repo}/pulls', requestConf);
        (0, log_1.debug)('checkActivePRExists::response:', response);
        if (response.status === 200) {
            return response.data.length > 0;
        }
        (0, log_1.debug)('checkActivePRExists::failed::unknown-status-code', response.status);
        throw new Error(`checkActivePRExists::Unknown status code ${response.status}`);
    });
}
exports.checkActivePRExists = checkActivePRExists;
/**
 * Create a new pull request from sourceBranchName to the targetBranchName
 * https://octokit.github.io/rest.js/v18#pulls
 * https://developer.github.com/v3/pulls/#create-a-pull-request
 *
 * @param {TGitHubOctokit} octokit
 * @param {IGitHubPushDescription} pushDescription
 * @param {string} targetBranchName - e.g. 'master'
 * @param {string} sourceBranchName - e.g. 'feature/TASK-11'
 * @returns {number} - returns a number of pull request created
 * @throws - if any other error
 */
function createNewPR(octokit, pushDescription, targetBranchName, sourceBranchName) {
    return __awaiter(this, void 0, void 0, function* () {
        const requestConf = {
            owner: (0, github_common_1.getPRRepoOwner)(pushDescription),
            repo: (0, github_common_1.getPRRepo)(pushDescription),
            base: targetBranchName,
            head: sourceBranchName,
            title: `Merge release branch ${sourceBranchName} to the release branch ${targetBranchName}`,
            draft: false,
            maintainer_can_modify: true,
            body: PR_DESCRIPTION_TEXT,
        };
        (0, log_1.debug)('createNewPR::start::conf:', requestConf);
        const response = yield octokit.request('POST /repos/{owner}/{repo}/pulls', requestConf);
        (0, log_1.debug)('createNewPR::response:', response);
        if (response.status === 201) {
            // successfully created
            return Number(response.data.number);
        }
        (0, log_1.debug)('createNewPR::failed::unknown-status-code', response.status);
        throw new Error(`createNewPR::Unknown status code ${response.status}`);
    });
}
exports.createNewPR = createNewPR;
/**
 * Add a label or multiple labels for the pr
 * by it's number.
 * If the label is not exists it will be created automatically.
 * https://octokit.github.io/rest.js/v18#pulls-create
 * https://developer.github.com/v3/issues/labels/#add-labels-to-an-issue
 *
 * @export
 * @param {TGitHubOctokit} octokit
 * @param {IGitHubPushDescription} pushDescription
 * @param {number} prNumber
 * @param {(string | string[])} label - one or more labels to add
 * @returns {Promise<void>} - return nothing if successfully added
 * @throws - if unknown code is returned
 */
function addLabelForPr(octokit, pushDescription, prNumber, label) {
    return __awaiter(this, void 0, void 0, function* () {
        const requestConf = {
            owner: (0, github_common_1.getPRRepoOwner)(pushDescription),
            repo: (0, github_common_1.getPRRepo)(pushDescription),
            issue_number: prNumber,
            labels: Array.isArray(label) ? label : [label],
        };
        (0, log_1.debug)('addLabelForPr::start::conf:', requestConf);
        const response = yield octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/labels', requestConf);
        (0, log_1.debug)('addLabelForPr::response:', response);
        if (response.status === 200) {
            // succesfully created
            return;
        }
        (0, log_1.debug)('addLabelForPr::failed::unknown-status-code', response.status);
        throw new Error(`addLabelForPr::Unknown status code ${response.status}`);
    });
}
exports.addLabelForPr = addLabelForPr;
/**
 * Create a new branch from branch wich
 * has the latest commit sha
 * https://developer.github.com/v3/git/refs/#create-a-reference
 *
 *
 * @export
 * @param {string} branchName - new branche's name
 * @param {string} fromBranchCommitSha - sha of the latest commit
 * @returns {Promise<string>} - returns a new branche's name
 * @throws - throw on a request failed or if reponses code is not equal to the 201 (CREATED)
 */
function createBranch(octokit, pushDescription, branchName, fromBranchCommitSha) {
    return __awaiter(this, void 0, void 0, function* () {
        const requestConf = {
            owner: (0, github_common_1.getPRRepoOwner)(pushDescription),
            repo: (0, github_common_1.getPRRepo)(pushDescription),
            ref: (0, github_common_1.getBranchRef)(branchName),
            sha: fromBranchCommitSha,
        };
        (0, log_1.debug)('createBranch::start::conf:', requestConf);
        const response = yield octokit.request('POST /repos/{owner}/{repo}/git/refs', requestConf);
        (0, log_1.debug)('createBranch::end::response:', response);
        if (response.status !== 201) {
            throw new Error('Unknown status code returned from the server');
        }
        return (0, github_common_1.getBranchNameByRefString)(response.data.ref);
    });
}
exports.createBranch = createBranch;
/**
 * List branches via the GitHub GraphQL API
 * https://developer.github.com/v3/git/refs/#list-matching-references
 *
 * @export
 * @param {TGitHubOctokit} octokit
 * @param {string} repoName - e.g "test_github_actions"
 * @param {string} repoName - e.g "optimaxdev"
 * @param {string} releaseBranchRefPrfix - e.g "refs/heads/release"
 * @param {string} releaseBranchTaskPrefix - e.g. "REL-"
 * @param {number} first - how many items to fetch
 * @throws {Error}
 * @returns {TGitHubApiRestRefResponseData} - descriptions of the branches
 */
/**
 * Fetch all branches for semantic-release workflow (fetches all branches, not just release ones)
 *
 * @export
 * @param {TGitHubOctokit} octokit
 * @param {IGitHubPushDescription} pushDescription
 * @param {IContextEnv} contextEnv
 * @returns {Promise<string[]>}
 */
function fetchAllBranchesForSemanticRelease(octokit, pushDescription, contextEnv) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, log_1.debug)('fetchAllBranchesForSemanticRelease::start');
        const queryText = `
    {
      repository(name: "${(0, github_common_1.getPRRepo)(pushDescription)}", owner: "${(0, github_common_1.getPRRepoOwner)(pushDescription)}") {
        refs(refPrefix: "refs/heads/", first: 100, orderBy: {field: TAG_COMMIT_DATE, direction: DESC}) {
          edges {
            node {
              name
            }
          }
        }
      }
    }
  `;
        (0, log_1.debug)('fetchAllBranchesForSemanticRelease::query', queryText);
        const result = yield octokit.graphql(queryText);
        (0, log_1.debug)('fetchAllBranchesForSemanticRelease::result', result);
        const allBranches = result.repository.refs.edges.map(({ node }) => node.name);
        (0, log_1.debug)('fetchAllBranchesForSemanticRelease::allBranches', allBranches);
        return allBranches;
    });
}
exports.fetchAllBranchesForSemanticRelease = fetchAllBranchesForSemanticRelease;
