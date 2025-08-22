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
exports.run = void 0;
const core = __importStar(require("@actions/core"));
const init_1 = require("./init");
const repo_api_1 = require("./lib/repo-api");
const log_1 = require("./lib/log");
const semantic_release_merge_1 = require("./semantic-release-merge");
function run() {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            core.debug(new Date().toTimeString());
            const initResult = (0, init_1.init)();
            if (!initResult) {
                return;
            }
            const { pushDescription, octokit, contextEnv } = initResult;
            // Fetch all branches
            const branchesList = yield (0, repo_api_1.fetchAllBranchesForSemanticRelease)(octokit, pushDescription, contextEnv);
            (0, log_1.debug)('Fetched branches', branchesList);
            if (!branchesList.length) {
                throw new Error('No branches were found');
            }
            // Determine the source branch from the push
            const sourceBranch = ((_a = pushDescription.base) === null || _a === void 0 ? void 0 : _a.ref) || ((_b = pushDescription.head) === null || _b === void 0 ? void 0 : _b.ref);
            if (!sourceBranch) {
                throw new Error('Unable to determine source branch from push description');
            }
            (0, log_1.debug)('Source branch for merge analysis:', sourceBranch);
            // Check if this is a semantic version branch
            const sourceSemanticVersion = (0, semantic_release_merge_1.parseSemanticBranchName)(sourceBranch);
            if (!sourceSemanticVersion) {
                (0, log_1.debug)('Non-semantic version branch detected. This action only supports semantic version branches (e.g., 1.x, 1.1.x)');
                core.setFailed('This action only supports semantic version branches (e.g., 1.x, 1.1.x). Current branch: ' + sourceBranch);
                return;
            }
            (0, log_1.debug)('Detected semantic version branch, executing semantic-release automerge workflow');
            // Execute semantic-release specific logic
            yield (0, semantic_release_merge_1.executeSemanticReleaseMerge)(octokit, pushDescription, contextEnv, branchesList);
        }
        catch (err) {
            (0, log_1.error)(err);
            core.setFailed(err.message);
        }
    });
}
exports.run = run;
