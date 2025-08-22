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
exports.createPullRequest = exports.getBranchNameForTargetBranchAutomergeFailed = void 0;
const repo_api_1 = require("../lib/repo-api");
const log_1 = require("../lib/log");
const github_common_1 = require("../lib/github-common");
/**
 * Returns name of a branch when automerge failed
 *
 * @export
 * @param {string} sourceBranchName
 * @param {string} targetBranchName
 * @returns {string}
 */
function getBranchNameForTargetBranchAutomergeFailed(targetBranchName, sourceBranchName) {
    return `automerge_${(0, github_common_1.removeRefPrefixFromBranchName)(sourceBranchName)}_to_${(0, github_common_1.removeRefPrefixFromBranchName)(targetBranchName).trim()}_${Date.now()}`;
}
exports.getBranchNameForTargetBranchAutomergeFailed = getBranchNameForTargetBranchAutomergeFailed;
/**
 * Create a pull request from sourceBranchName
 * to targetBranchName if not already exists
 * for this two branches.
 *
 * @export
 * @param {TGitHubOctokit} octokit
 * @param {IGitHubPushDescription} pushDescription
 * @param {string} branchName
 * @param {string} sourceBranchName
 * @param {string} pushDescriptionLabel - a label for pull request if created automatically
 * @returns {(Promise<void>)} - returns void if a pull request is exists or was successfully created
 */
function createPullRequest(octokit, pushDescription, targetBranchName, sourceBranchName, pushDescriptionLabel) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, log_1.debug)(`createPullRequest::start::from ${sourceBranchName} to ${targetBranchName} branch`);
        const automergeCustomBranchName = getBranchNameForTargetBranchAutomergeFailed(targetBranchName, sourceBranchName);
        (0, log_1.debug)(`createPullRequest::Create new branch ${automergeCustomBranchName}`);
        const automergeBranchName = yield (0, repo_api_1.createBranch)(octokit, pushDescription, automergeCustomBranchName, (0, github_common_1.getPRSourceBranchSHA)(pushDescription));
        (0, log_1.debug)(`createPullRequest::New branch created ${automergeCustomBranchName};
    createPullRequest::Create new pull request from ${automergeBranchName} to ${targetBranchName} branch;`);
        const pushDescriptionNumber = yield (0, repo_api_1.createNewPR)(octokit, pushDescription, targetBranchName, automergeBranchName);
        if (typeof pushDescriptionNumber !== 'number') {
            throw new Error('Pull request was created with unknown number');
        }
        (0, log_1.debug)(`createPullRequest::Pull request from ${automergeBranchName} to ${targetBranchName} branch was created with number ${pushDescriptionNumber}`);
        if (pushDescriptionLabel && pushDescriptionLabel.trim()) {
            (0, log_1.debug)(`createPullRequest::Pull request from ${automergeBranchName} to ${targetBranchName} add the label ${pushDescriptionLabel} to the Pull Request created`);
            try {
                yield (0, repo_api_1.addLabelForPr)(octokit, pushDescription, pushDescriptionNumber, pushDescriptionLabel.trim());
            }
            catch (err) {
                (0, log_1.debug)(`createPullRequest::failed to add label for Pull request from ${automergeBranchName} to ${targetBranchName}`);
                (0, log_1.error)(err);
            }
        }
    });
}
exports.createPullRequest = createPullRequest;
