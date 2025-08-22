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
exports.executeSemanticReleaseMerge = exports.mergeToSemanticBranches = exports.mergeSemanticSourceToBranch = exports.getSemanticRelatedBranches = exports.getSemanticTargetBranches = exports.isSameMajorVersion = exports.compareSemanticVersions = exports.parseSemanticBranchName = exports.getBranchNameWithoutRefsPrefix = void 0;
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
 * Parse semantic version branch name (e.g., "1.2.x" or "2.x") into version components
 *
 * @export
 * @param {string} branchName - branch name like "1.2.x" or "2.x"
 * @returns {{ major: number; minor?: number; patch?: number } | null}
 */
function parseSemanticBranchName(branchName) {
    const cleanBranchName = getBranchNameWithoutRefsPrefix(branchName).trim();
    // Match patterns like "1.x", "2.x", "1.1.x", "1.2.x", etc.
    const semverPattern = /^(\d+)(?:\.(\d+))?\.x$/;
    const match = cleanBranchName.match(semverPattern);
    if (!match) {
        return null;
    }
    const major = parseInt(match[1], 10);
    const minor = match[2] ? parseInt(match[2], 10) : undefined;
    return { major, minor };
}
exports.parseSemanticBranchName = parseSemanticBranchName;
/**
 * Compare two semantic version branch descriptors
 * Returns -1 if a < b, 0 if a === b, 1 if a > b
 *
 * @export
 * @param {object} a - first version descriptor
 * @param {object} b - second version descriptor
 * @returns {number}
 */
function compareSemanticVersions(a, b) {
    var _a, _b;
    if (a.major !== b.major) {
        return a.major - b.major;
    }
    // If majors are equal, compare minors
    const aMinor = (_a = a.minor) !== null && _a !== void 0 ? _a : 0;
    const bMinor = (_b = b.minor) !== null && _b !== void 0 ? _b : 0;
    return aMinor - bMinor;
}
exports.compareSemanticVersions = compareSemanticVersions;
/**
 * Check if two semantic versions are in the same major version family
 *
 * @export
 * @param {object} a - first version descriptor
 * @param {object} b - second version descriptor
 * @returns {boolean}
 */
function isSameMajorVersion(a, b) {
    return a.major === b.major;
}
exports.isSameMajorVersion = isSameMajorVersion;
/**
 * Filter and sort branches that should receive merges from the source branch
 * For semantic-release: merge hotfixes from 1.1.x to 1.2.x, 1.3.x, etc. (same major)
 *
 * @export
 * @param {string} sourceBranchName - e.g., "1.1.x"
 * @param {string[]} allBranches - all available branches
 * @returns {string[]} - sorted list of target branches
 */
function getSemanticTargetBranches(sourceBranchName, allBranches) {
    const sourceVersion = parseSemanticBranchName(sourceBranchName);
    if (!sourceVersion) {
        (0, log_1.debug)(`Source branch ${sourceBranchName} is not a semantic version branch`);
        return [];
    }
    const targetBranches = [];
    for (const branch of allBranches) {
        const branchVersion = parseSemanticBranchName(branch);
        if (!branchVersion) {
            continue; // Skip non-semantic branches
        }
        // Only include branches from the same major version
        if (!isSameMajorVersion(sourceVersion, branchVersion)) {
            continue;
        }
        // Only include branches with higher version numbers
        if (compareSemanticVersions(branchVersion, sourceVersion) <= 0) {
            continue;
        }
        targetBranches.push({ branch, version: branchVersion });
    }
    // Sort by version (ascending)
    targetBranches.sort((a, b) => compareSemanticVersions(a.version, b.version));
    (0, log_1.debug)(`Found ${targetBranches.length} target branches for ${sourceBranchName}:`, targetBranches.map(t => t.branch));
    return targetBranches.map(t => t.branch);
}
exports.getSemanticTargetBranches = getSemanticTargetBranches;
/**
 * Get branches related to the push description for semantic-release workflow
 *
 * @export
 * @param {IGitHubPushDescription} pushDescription
 * @param {IContextEnv} contextEnv
 * @param {string[]} allBranches
 * @returns {Promise<string[]>}
 */
function getSemanticRelatedBranches(pushDescription, contextEnv, allBranches) {
    return __awaiter(this, void 0, void 0, function* () {
        const sourceBranch = (0, github_common_1.getPRTargetBranchName)(pushDescription);
        if (!sourceBranch) {
            throw new Error('Failed to determine source branch from push description');
        }
        (0, log_1.debug)('Semantic-release merge: analyzing source branch', sourceBranch);
        // Filter branches that match our semantic pattern
        const semanticBranches = allBranches.filter(branch => {
            return parseSemanticBranchName(branch) !== null;
        });
        (0, log_1.debug)(`Found ${semanticBranches.length} semantic version branches:`, semanticBranches);
        const targetBranches = getSemanticTargetBranches(sourceBranch, semanticBranches);
        return targetBranches;
    });
}
exports.getSemanticRelatedBranches = getSemanticRelatedBranches;
/**
 * Merge source branch to a single target branch (semantic-release version)
 *
 * @export
 * @param {TGitHubOctokit} octokit
 * @param {IGitHubPushDescription} pushDescription
 * @param {IContextEnv} contextEnv
 * @param {string} targetBranchName
 * @returns {Promise<undefined | false>}
 */
function mergeSemanticSourceToBranch(octokit, pushDescription, contextEnv, targetBranchName) {
    return __awaiter(this, void 0, void 0, function* () {
        const sourceBranchName = (0, github_common_1.getPRBranchName)(pushDescription);
        (0, log_1.debug)(`Attempting to merge ${sourceBranchName} to ${targetBranchName}`);
        const result = yield (0, repo_api_1.mergeBranchTo)(octokit, pushDescription, targetBranchName, sourceBranchName);
        if (result === false) {
            // Merge conflict occurred
            (0, log_1.debug)(`Merge conflict occurred: ${sourceBranchName} -> ${targetBranchName}`);
            yield (0, repo_1.createPullRequest)(octokit, pushDescription, targetBranchName, sourceBranchName, contextEnv.automergePrLabel);
            return false;
        }
        else {
            (0, log_1.debug)(`Successfully merged: ${sourceBranchName} -> ${targetBranchName}`);
        }
        return undefined;
    });
}
exports.mergeSemanticSourceToBranch = mergeSemanticSourceToBranch;
/**
 * Merge to multiple semantic target branches
 * Stops on first merge conflict
 *
 * @export
 * @param {TGitHubOctokit} octokit
 * @param {IGitHubPushDescription} pushDescription
 * @param {IContextEnv} contextEnv
 * @param {string[]} targetBranches
 * @returns {Promise<void>}
 */
function mergeToSemanticBranches(octokit, pushDescription, contextEnv, targetBranches) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, log_1.debug)('Semantic merge: starting merge to branches', targetBranches);
        const uniqueBranches = Array.from(new Set(targetBranches));
        const sourceBranchName = (0, github_common_1.getPRBranchName)(pushDescription);
        if (uniqueBranches.length === 0) {
            (0, log_1.debug)('No target branches found for semantic merge');
            return;
        }
        for (const targetBranch of uniqueBranches) {
            const result = yield mergeSemanticSourceToBranch(octokit, pushDescription, contextEnv, targetBranch);
            if (result === false) {
                (0, log_1.debug)(`Stopping merge process due to conflict with ${targetBranch}`);
                break;
            }
            (0, log_1.debug)(`Successfully processed merge: ${sourceBranchName} -> ${targetBranch}`);
        }
        (0, log_1.debug)('Semantic merge process completed');
    });
}
exports.mergeToSemanticBranches = mergeToSemanticBranches;
/**
 * Main function to execute semantic-release automerge workflow
 *
 * @export
 * @param {TGitHubOctokit} octokit
 * @param {IGitHubPushDescription} pushDescription
 * @param {IContextEnv} contextEnv
 * @param {string[]} allBranches
 * @returns {Promise<void>}
 */
function executeSemanticReleaseMerge(octokit, pushDescription, contextEnv, allBranches) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Get branches that should receive the merge
            const targetBranches = yield getSemanticRelatedBranches(pushDescription, contextEnv, allBranches);
            if (targetBranches.length === 0) {
                (0, log_1.debug)('No semantic target branches found, skipping merge');
                return;
            }
            // Execute the merges
            yield mergeToSemanticBranches(octokit, pushDescription, contextEnv, targetBranches);
        }
        catch (error) {
            (0, log_1.debug)('Error in semantic-release merge:', error);
            throw error;
        }
    });
}
exports.executeSemanticReleaseMerge = executeSemanticReleaseMerge;
