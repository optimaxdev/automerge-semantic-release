"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = exports.getPushDescription = exports.initContextEnv = void 0;
const core = __importStar(require("@actions/core"));
const gitHub = __importStar(require("@actions/github"));
const log_1 = require("./lib/log");
const github_common_1 = require("./lib/github-common");
const semantic_release_merge_1 = require("./semantic-release-merge");
/**
 * Initialize the context values for semantic-release automerge
 *
 * @returns {IContextEnv}
 */
const initContextEnv = () => {
    return {
        token: core.getInput('token', { required: true }),
        automergePrLabel: core.getInput('automergePrLabel', { required: false }),
        remoteName: core.getInput('remoteName', { required: false }),
    };
};
exports.initContextEnv = initContextEnv;
/**
 * Make a push description from a
 * github context description given
 *
 * @param {typeof gitHub.context} context
 * @exports
 * @returns {IGitHubPushDescription}
 * @throws - if some property is not exits in the context it will throw
 */
function getPushDescription(context) {
    var _a;
    //https://developer.github.com/webhooks/event-payloads/#pull_request
    if (context.payload.pull_request) {
        // pull request interface mathes to the IGitHubPushDescription
        return context.payload.pull_request;
    }
    //https://developer.github.com/webhooks/event-payloads/#push
    const repoName = (_a = context.payload.repository) === null || _a === void 0 ? void 0 : _a.name;
    if (!repoName) {
        throw new Error('Failed to get repository name');
    }
    // If pushed not according to a pull request,
    // then base.ref === head.ref and equals to
    // the branch were commit
    const pushedToBranchRef = context.payload.ref;
    (0, log_1.debug)('getPushDescription::context.payload', context.payload);
    return {
        base: {
            ref: pushedToBranchRef,
            repo: {
                name: repoName,
                owner: {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    login: context.payload.repository.owner.login,
                },
            },
        },
        head: {
            ref: pushedToBranchRef,
            sha: context.sha,
        },
    };
}
exports.getPushDescription = getPushDescription;
/**
 * Prepare the semantic-release automerge action to run
 * and return the common values which are necessary to work with.
 *
 * @export
 * @returns {IInitReturnValue | undefined} - returns "undefined" if there is nothing to do
 * @throws
 */
function init() {
    const context = gitHub.context;
    if (!context) {
        throw new Error('Failed to get GitHub context');
    }
    const pushDescription = getPushDescription(context);
    (0, log_1.debug)('init::pushDescription', pushDescription);
    // Get event description related to this action
    if (!pushDescription) {
        throw new Error('Failed to get event description');
    }
    const contextEnv = (0, exports.initContextEnv)();
    (0, log_1.debug)('init with context env', contextEnv);
    const targetBranch = (0, github_common_1.getPRTargetBranchName)(pushDescription);
    // Check if this is a semantic version branch
    const semanticVersion = (0, semantic_release_merge_1.parseSemanticBranchName)(targetBranch);
    if (!semanticVersion) {
        (0, log_1.debug)(`Not a semantic version branch: ${targetBranch}. This action only supports semantic version branches (e.g., 1.x, 1.1.x)`);
        return;
    }
    (0, log_1.debug)(`Semantic version branch detected: ${targetBranch}`, semanticVersion);
    const { token: gitHubToken } = contextEnv;
    let octokit;
    // initialize the Octokit instance
    try {
        octokit = gitHub.getOctokit(gitHubToken);
    }
    catch (err) {
        console.log(err);
        throw new Error('Failed to connect to the Octokit');
    }
    return {
        pushDescription,
        octokit,
        contextEnv,
    };
}
exports.init = init;
