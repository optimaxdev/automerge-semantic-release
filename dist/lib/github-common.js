"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeRefPrefixFromBranchName = exports.getBranchRef = exports.getBranchHeadsRefPrefix = exports.getBranchRefPrefix = exports.getBranchNameByRefDescription = exports.getBranchNameByRefString = exports.getPRSourceBranchSHA = exports.getPRTargetBranchName = exports.getPRRepoOwner = exports.getPRRepo = exports.getPRBranchName = void 0;
const path_1 = __importDefault(require("path"));
const github_1 = require("../const/github");
/**
 * Get a name of a PR's branch
 *
 * @param {IGitHubPushDescription} pushDescription
 * @returns {string} - A name of a branch from which the PR was created
 */
function getPRBranchName(pushDescription) {
    return pushDescription.head.ref;
}
exports.getPRBranchName = getPRBranchName;
/**
 * Get a name of PR's repository
 *
 * @export
 * @param {IGitHubPushDescription} pushDescription
 * @returns {string}
 */
function getPRRepo(pushDescription) {
    return pushDescription.base.repo.name;
}
exports.getPRRepo = getPRRepo;
/**
 * Get a login of PR's repository owner
 *
 * @export
 * @param {IGitHubPushDescription} pushDescription
 * @returns {string}
 */
function getPRRepoOwner(pushDescription) {
    return pushDescription.base.repo.owner.login;
}
exports.getPRRepoOwner = getPRRepoOwner;
/**
 * Get a name of a target branch for the PR
 *
 * @param {IGitHubPushDescription} pushDescription
 * @returns {string} - A name of a target branch the PR
 */
function getPRTargetBranchName(pushDescription) {
    return pushDescription.base.ref;
}
exports.getPRTargetBranchName = getPRTargetBranchName;
/**
 * Retuns SHA of the of the source branche's name
 *
 * @export
 * @param {IGitHubPushDescription} pushDescription
 */
function getPRSourceBranchSHA(pushDescription) {
    return pushDescription.head.sha;
}
exports.getPRSourceBranchSHA = getPRSourceBranchSHA;
/**
 * Return branch name by a branch ref string
 *
 * @param {TArrayElement<TGitHubApiRestRefResponseData>} refString - string which represented a ref of the branch
 * @returns {string}
 */
function getBranchNameByRefString(refString) {
    return refString.trim().slice(github_1.GIT_REF_HEADS_PREFIX.length).trim();
}
exports.getBranchNameByRefString = getBranchNameByRefString;
/**
 * Return branch name by a branch description
 *
 * @param {TArrayElement<TGitHubApiRestRefResponseData>} refDescription
 * @returns {string}
 */
function getBranchNameByRefDescription(refDescription) {
    return getBranchNameByRefString(refDescription.ref);
}
exports.getBranchNameByRefDescription = getBranchNameByRefDescription;
/**
 * Return full reference to a branch's prefix
 *
 * @export
 * @param {string} branchPrefix
 * @returns {string}
 */
function getBranchRefPrefix(branchPrefix) {
    return path_1.default.join(github_1.GIT_HEADS_PREFIX, branchPrefix.trim(), '/');
}
exports.getBranchRefPrefix = getBranchRefPrefix;
/**
 * get a reference for the branch by it's name
 *
 * @export
 * @param {string} branchName
 */
function getBranchHeadsRefPrefix(branchName) {
    return `${getBranchRef(branchName)}/`;
}
exports.getBranchHeadsRefPrefix = getBranchHeadsRefPrefix;
/**
 * get a reference for the branch by it's name
 *
 * @export
 * @param {string} branchName
 */
function getBranchRef(branchName) {
    const resultedBranchName = path_1.default.join(github_1.GIT_REF_HEADS_PREFIX, branchName.trim(), '/');
    return resultedBranchName.substring(0, resultedBranchName.length - 1);
}
exports.getBranchRef = getBranchRef;
/**
* Removes refs prefix from a branch name
*
* @param {TArrayElement<TGitHubApiRestRefResponseData>} refString - string which represented a ref of the branch
* @returns {string}
*/
function removeRefPrefixFromBranchName(branchNameStrging) {
    return branchNameStrging.trim().startsWith(github_1.GIT_REF_HEADS_PREFIX) ? getBranchNameByRefString(branchNameStrging) : branchNameStrging.trim();
}
exports.removeRefPrefixFromBranchName = removeRefPrefixFromBranchName;
