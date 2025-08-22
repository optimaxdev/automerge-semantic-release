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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeToBranches = exports.getTargetBranchesNames = exports.getBranchesRelatedToPD = exports.mergeSourceToBranch = exports.getBranchesWithUpperSerialNumber = exports.getBranchSerialNumber = exports.getBranchNameReleaseSerialNumber = exports.getBranchNameWithoutPrefix = exports.versionStringToNumber = exports.getBranchNameWithoutRefsPrefix = void 0;
const path_1 = __importDefault(require("path"));
const log_1 = require("./lib/log");
const github_common_1 = require("./lib/github-common");
const repo_api_1 = require("./lib/repo-api");
const repo_1 = require("./utils/repo");
const github_1 = require("./const/github");
/**
 * Remove refs/heads prefix from a branch name,
 * if it is presented in a branches name string.
 *
 * @export
 * @param {string} branchName
 * @returns {string}
 */
function getBranchNameWithoutRefsPrefix(branchName) {
    const regEx = new RegExp(`^[ ]*/*${github_1.GIT_REF_HEADS_PREFIX}`, 'i');
    const matching = branchName.match(regEx);
    return matching && matching[0]
        ? branchName.slice(matching[0].length)
        : branchName;
}
exports.getBranchNameWithoutRefsPrefix = getBranchNameWithoutRefsPrefix;
/**
 * Convert semantic version string (e.g. "1.2.3") to a numeric representation.
 * This is used to compare versioned release branches like "release/1.2.3".
 * The result is calculated as: major * 100 + minor * 10 + patch.
 *
 * Examples:
 *   "1.0.0" -> 100
 *   "1.2.3" -> 123
 *   "2.1.0" -> 210
 *
 * @export
 * @param {string} version - version string in the format "X.Y.Z"
 * @returns {number} - numeric representation of the version
 */
function versionStringToNumber(version) {
    const parts = version.split('.').map(part => parseInt(part, 10) || 0);
    const [major, minor, patch] = [parts[0] || 0, parts[1] || 0, parts[2] || 0];
    return major * 100 + minor * 10 + patch;
}
exports.versionStringToNumber = versionStringToNumber;
/**
 * Return branch name without prefix
 * passed in releasePrefix argument.
 *
 * @export
 * @param {string} branchName - full name of a branch, e.g. "release/v.1.9"
 * @param {string} releasePrefix - e.g. "release"
 * @returns {string}
 */
function getBranchNameWithoutPrefix(branchName, releasePrefix) {
    const branchNameTrimmed = getBranchNameWithoutRefsPrefix(branchName).trim();
    const releasePathTrimmed = branchName.includes('/')
        ? path_1.default.join(releasePrefix.trim(), '/')
        : releasePrefix.trim();
    return branchNameTrimmed.slice(releasePathTrimmed.length).trim();
}
exports.getBranchNameWithoutPrefix = getBranchNameWithoutPrefix;
/**
 * Get a serial number of the release related
 * to the branch name.
 *
 * @export
 * @param {string} branchName - e.g 'release/RLS-11'
 * @param {string} releasePrefix - e.g. 'release'
 * @param {string} releaseTaskPrefix - e.g. 'RLS-'
 * @returns {(number | undefined)} - e.g. 11. Return undefined if the branch name have no the releaseTaskPrefix.
 */
function getBranchNameReleaseSerialNumber(branchName, releasePrefix, releaseTaskPrefix) {
    const releaseTaskPrefixTrimmed = releaseTaskPrefix.trim();
    const branchNameWithoutPrefix = getBranchNameWithoutPrefix(branchName, releasePrefix);
    if (!branchNameWithoutPrefix.includes(releaseTaskPrefixTrimmed)) {
        return;
    }
    const branchNameWithoutTaskPrefix = branchNameWithoutPrefix
        .slice(releaseTaskPrefixTrimmed.length)
        .trim();
    const [releaseNumberString] = branchNameWithoutTaskPrefix.match(/^\d+/s) || [];
    const releaseNumber = Number(releaseNumberString);
    return isNaN(releaseNumber) ? undefined : releaseNumber;
}
exports.getBranchNameReleaseSerialNumber = getBranchNameReleaseSerialNumber;
/**
 * Determine the serial number of a release branch.
 * Supports both "release/RLS-001" and "release/1.0.1" formats.
 *
 * @export
 * @param {string} branchName
 * @param {string} releasePrefix
 * @param {string} releaseTaskPrefix
 * @returns {(number | undefined)}
 */
function getBranchSerialNumber(branchName, releasePrefix, releaseTaskPrefix) {
    const nameWithoutPrefix = getBranchNameWithoutPrefix(branchName, releasePrefix);
    // Check for semantic version style like 1.0.1
    if (/^\d+\.\d+\.\d+$/.test(nameWithoutPrefix)) {
        return versionStringToNumber(nameWithoutPrefix);
    }
    // Fall back to old RLS-style logic
    return getBranchNameReleaseSerialNumber(branchName, releasePrefix, releaseTaskPrefix);
}
exports.getBranchSerialNumber = getBranchSerialNumber;
/**
 * Filter a branches from the list
 * with branches with upper serial
 * number than the branch.
 *
 * @export
 * @param {string} currentBranchName - e.g 'release/RLS-11'
 * @param {string[]} branchesNamesList- e.g ['release/RLS-11', 'release/RLS-12', 'release/RLS-14', 'feature/TASK-1321']
 * @param {string} releasePrefix - e.g. 'release'
 * @param {string} releaseTaskPrefix - e.g. 'RLS-'
 * @returns {string[]} - e.g. ['release/RLS-12', 'release/RLS-14']
 * @throws - if failed to define the current branch serial number
 */
function getBranchesWithUpperSerialNumber(currentBranchName, branchesNamesList, releasePrefix, releaseTaskPrefix) {
    const currentBranchSerialNumber = getBranchSerialNumber(currentBranchName, releasePrefix, releaseTaskPrefix);
    if (!currentBranchSerialNumber && currentBranchSerialNumber !== 0) {
        throw new Error(`Failed to define a serial number for the PR branch "${currentBranchName}"`);
    }
    const branchesToSerialsMap = branchesNamesList.reduce((map, branchName) => {
        const branchNameTrimmed = branchName.trim();
        if (!map[branchNameTrimmed]) {
            const branchSerialNumber = getBranchSerialNumber(branchName, releasePrefix, releaseTaskPrefix);
            map[branchNameTrimmed] = branchSerialNumber;
        }
        return map;
    }, {});
    return branchesNamesList
        .filter(branchName => {
        const branchSerialNumber = branchesToSerialsMap[branchName.trim()];
        if (!branchSerialNumber) {
            return false;
        }
        return branchSerialNumber > currentBranchSerialNumber;
    })
        .sort((branchNameFirst, branchNameSecond) => {
        const branchNameFirstSerialNum = branchesToSerialsMap[branchNameFirst.trim()];
        const branchNameSecondSerialNum = branchesToSerialsMap[branchNameSecond.trim()];
        return (Number(branchNameFirstSerialNum) - Number(branchNameSecondSerialNum));
    });
}
exports.getBranchesWithUpperSerialNumber = getBranchesWithUpperSerialNumber;
function mergeSourceToBranch(octokit, pushDescription, contextEnv, targetBranchName) {
    return __awaiter(this, void 0, void 0, function* () {
        const sourceBranchName = (0, github_common_1.getPRBranchName)(pushDescription);
        const result = yield (0, repo_api_1.mergeBranchTo)(octokit, pushDescription, targetBranchName, sourceBranchName);
        if (result === false) {
            // if a merge conflict
            (0, log_1.debug)(`The result of merging branch ${sourceBranchName} to the branch ${targetBranchName} is merge conflict`);
            yield (0, repo_1.createPullRequest)(octokit, pushDescription, targetBranchName, sourceBranchName, contextEnv.automergePrLabel);
            return false;
        }
        else {
            (0, log_1.debug)(`The result of merging branch ${sourceBranchName} to the branch ${targetBranchName}:`, result);
        }
    });
}
exports.mergeSourceToBranch = mergeSourceToBranch;
/**
 * Merge PR's branch to related releases branches.
 *
 * @param {TGitHubOctokit} octokit
 * @param {IGitHubPushDescription} pushDescription
 * @param {IContextEnv} contextEnv
 * @param {string[]} targetBranchesList
 * @param {boolean} [mergeOnlyNextRelease=false] - merge only to the next release. If there is no next release related was found do nothing
 * @returns {Promist<string[]>} - returns a brnaches related found
 * @throws {Error}
 * @exports
 */
function getBranchesRelatedToPD(pushDescription, contextEnv, releaseBranchesList) {
    return __awaiter(this, void 0, void 0, function* () {
        const pushDescriptionTargetBranch = (0, github_common_1.getPRTargetBranchName)(pushDescription);
        if (!pushDescriptionTargetBranch) {
            throw new Error('Failed to determine PR target branch');
        }
        (0, log_1.debug)('mergeToRelated::start', 'Target branch name', pushDescriptionTargetBranch, 'releaseBranchesList:', releaseBranchesList, 'contextEnv', contextEnv);
        const branchesNamesRelated = getBranchesWithUpperSerialNumber(pushDescriptionTargetBranch, releaseBranchesList, contextEnv.releaseBranchPrfix, contextEnv.releaseBranchTaskPrefix);
        return branchesNamesRelated;
    });
}
exports.getBranchesRelatedToPD = getBranchesRelatedToPD;
/**
 * returns target branch names
 * where to merge a source
 * branch
 *
 * @export
 * @param {string[]} releaseBranchesList
 * @returns {string[]}
 */
function getTargetBranchesNames(releaseBranchesList) {
    return releaseBranchesList.length ? [releaseBranchesList[0]] : [];
}
exports.getTargetBranchesNames = getTargetBranchesNames;
/**
 * Merge PR's branch to related releases branches.
 * Stop merging on first merge conflict
 *
 * @param {TGitHubOctokit} octokit
 * @param {IGitHubPushDescription} pushDescription
 * @param {IContextEnv} contextEnv
 * @param {string[]} branchesNamesRelated - will try to merge PR's branch to every branch in this list
 * @returns {Promist<void>} - returns a count of branches merged to and merge conflic status
 * @throws {Error}
 * @exports
 */
function mergeToBranches(octokit, pushDescription, contextEnv, branchesNamesRelated) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, log_1.debug)('mergeToRelated::branches related', branchesNamesRelated);
        const branchesNamesUniq = Array.from(new Set(branchesNamesRelated));
        const branchesRelatedCount = branchesNamesUniq.length;
        let targetBranchIdx = 0;
        if (!branchesRelatedCount) {
            (0, log_1.debug)('mergeToRelated::no branches related was found');
            return;
        }
        const sourceBranchName = (0, github_common_1.getPRBranchName)(pushDescription);
        while (targetBranchIdx < branchesRelatedCount) {
            const branchName = branchesNamesUniq[targetBranchIdx];
            const result = yield mergeSourceToBranch(octokit, pushDescription, contextEnv, branchName);
            if (result === false) {
                break;
            }
            else {
                (0, log_1.debug)(`The result of merging branch ${sourceBranchName} to the branch ${branchName}:`, result);
            }
            targetBranchIdx += 1;
        }
    });
}
exports.mergeToBranches = mergeToBranches;
