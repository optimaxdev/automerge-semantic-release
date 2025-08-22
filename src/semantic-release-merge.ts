import {TGitHubOctokit, IGitHubPushDescription} from './types/github'
import {IContextEnv} from './types/context'
import {debug} from './lib/log'
import {getPRTargetBranchName, getPRBranchName} from './lib/github-common'
import {mergeBranchTo} from './lib/repo-api'
import {createPullRequest} from './utils/repo'
import {GIT_REF_HEADS_PREFIX} from './const/github'

/**
 * Remove refs/heads prefix from a branch name,
 * if it is presented in a branches name string.
 *
 * @export
 * @param {string} branchName
 * @returns {string}
 */
export function getBranchNameWithoutRefsPrefix(branchName: string): string {
  const regEx = new RegExp(`^[ ]*/*${GIT_REF_HEADS_PREFIX}`, 'i')
  const matching = branchName.match(regEx)
  return matching && matching[0]
    ? branchName.slice(matching[0].length)
    : branchName
}

/**
 * Parse semantic version branch name (e.g., "1.2.x" or "2.x") into version components
 * 
 * @export
 * @param {string} branchName - branch name like "1.2.x" or "2.x"
 * @returns {{ major: number; minor?: number; patch?: number } | null}
 */
export function parseSemanticBranchName(branchName: string): { major: number; minor?: number; patch?: number } | null {
  const cleanBranchName = getBranchNameWithoutRefsPrefix(branchName).trim()
  
  // Match patterns like "1.x", "2.x", "1.1.x", "1.2.x", etc.
  const semverPattern = /^(\d+)(?:\.(\d+))?\.x$/
  const match = cleanBranchName.match(semverPattern)
  
  if (!match) {
    return null
  }
  
  const major = parseInt(match[1], 10)
  const minor = match[2] ? parseInt(match[2], 10) : undefined
  
  return { major, minor }
}

/**
 * Compare two semantic version branch descriptors
 * Returns -1 if a < b, 0 if a === b, 1 if a > b
 * 
 * @export
 * @param {object} a - first version descriptor
 * @param {object} b - second version descriptor  
 * @returns {number}
 */
export function compareSemanticVersions(
  a: { major: number; minor?: number },
  b: { major: number; minor?: number }
): number {
  if (a.major !== b.major) {
    return a.major - b.major
  }
  
  // If majors are equal, compare minors
  const aMinor = a.minor ?? 0
  const bMinor = b.minor ?? 0
  
  return aMinor - bMinor
}

/**
 * Check if two semantic versions are in the same major version family
 * 
 * @export
 * @param {object} a - first version descriptor
 * @param {object} b - second version descriptor
 * @returns {boolean}
 */
export function isSameMajorVersion(
  a: { major: number; minor?: number },
  b: { major: number; minor?: number }
): boolean {
  return a.major === b.major
}

/**
 * Filter and sort branches that should receive merges from the source branch
 * For semantic-release: merge hotfixes from 1.1.x to 1.2.x, 1.3.x, etc. (same major)
 * 
 * @export
 * @param {string} sourceBranchName - e.g., "1.1.x"
 * @param {string[]} allBranches - all available branches
 * @returns {string[]} - sorted list of target branches
 */
export function getSemanticTargetBranches(
  sourceBranchName: string,
  allBranches: string[]
): string[] {
  const sourceVersion = parseSemanticBranchName(sourceBranchName)
  
  if (!sourceVersion) {
    debug(`Source branch ${sourceBranchName} is not a semantic version branch`)
    return []
  }
  
  const targetBranches: Array<{ branch: string; version: { major: number; minor?: number } }> = []
  
  for (const branch of allBranches) {
    const branchVersion = parseSemanticBranchName(branch)
    
    if (!branchVersion) {
      continue // Skip non-semantic branches
    }
    
    // Only include branches from the same major version
    if (!isSameMajorVersion(sourceVersion, branchVersion)) {
      continue
    }
    
    // Only include branches with higher version numbers
    if (compareSemanticVersions(branchVersion, sourceVersion) <= 0) {
      continue
    }
    
    targetBranches.push({ branch, version: branchVersion })
  }
  
  // Sort by version (ascending)
  targetBranches.sort((a, b) => compareSemanticVersions(a.version, b.version))
  
  debug(`Found ${targetBranches.length} target branches for ${sourceBranchName}:`, 
        targetBranches.map(t => t.branch))
  
  return targetBranches.map(t => t.branch)
}

/**
 * Get branches related to the push description for semantic-release workflow
 * 
 * @export
 * @param {IGitHubPushDescription} pushDescription
 * @param {IContextEnv} contextEnv
 * @param {string[]} allBranches
 * @returns {Promise<string[]>}
 */
export async function getSemanticRelatedBranches(
  pushDescription: IGitHubPushDescription,
  contextEnv: IContextEnv,
  allBranches: string[]
): Promise<string[]> {
  const sourceBranch = getPRTargetBranchName(pushDescription)
  
  if (!sourceBranch) {
    throw new Error('Failed to determine source branch from push description')
  }
  
  debug('Semantic-release merge: analyzing source branch', sourceBranch)
  
  // Filter branches that match our semantic pattern
  const semanticBranches = allBranches.filter(branch => {
    return parseSemanticBranchName(branch) !== null
  })
  
  debug(`Found ${semanticBranches.length} semantic version branches:`, semanticBranches)
  
  const targetBranches = getSemanticTargetBranches(sourceBranch, semanticBranches)
  
  return targetBranches
}

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
export async function mergeSemanticSourceToBranch(
  octokit: TGitHubOctokit,
  pushDescription: IGitHubPushDescription,
  contextEnv: IContextEnv,
  targetBranchName: string
): Promise<undefined | false> {
  const sourceBranchName = getPRBranchName(pushDescription)
  
  debug(`Attempting to merge ${sourceBranchName} to ${targetBranchName}`)
  
  const result = await mergeBranchTo(
    octokit,
    pushDescription,
    targetBranchName,
    sourceBranchName
  )
  
  if (result === false) {
    // Merge conflict occurred
    debug(`Merge conflict occurred: ${sourceBranchName} -> ${targetBranchName}`)
    
    await createPullRequest(
      octokit,
      pushDescription,
      targetBranchName,
      sourceBranchName,
      contextEnv.automergePrLabel
    )
    
    return false
  } else {
    debug(`Successfully merged: ${sourceBranchName} -> ${targetBranchName}`)
  }
  
  return undefined
}

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
export async function mergeToSemanticBranches(
  octokit: TGitHubOctokit,
  pushDescription: IGitHubPushDescription,
  contextEnv: IContextEnv,
  targetBranches: string[]
): Promise<void> {
  debug('Semantic merge: starting merge to branches', targetBranches)
  
  const uniqueBranches = Array.from(new Set(targetBranches))
  const sourceBranchName = getPRBranchName(pushDescription)
  
  if (uniqueBranches.length === 0) {
    debug('No target branches found for semantic merge')
    return
  }
  
  for (const targetBranch of uniqueBranches) {
    const result = await mergeSemanticSourceToBranch(
      octokit,
      pushDescription,
      contextEnv,
      targetBranch
    )
    
    if (result === false) {
      debug(`Stopping merge process due to conflict with ${targetBranch}`)
      break
    }
    
    debug(`Successfully processed merge: ${sourceBranchName} -> ${targetBranch}`)
  }
  
  debug('Semantic merge process completed')
}

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
export async function executeSemanticReleaseMerge(
  octokit: TGitHubOctokit,
  pushDescription: IGitHubPushDescription,
  contextEnv: IContextEnv,
  allBranches: string[]
): Promise<void> {
  try {
    // Get branches that should receive the merge
    const targetBranches = await getSemanticRelatedBranches(
      pushDescription,
      contextEnv,
      allBranches
    )
    
    if (targetBranches.length === 0) {
      debug('No semantic target branches found, skipping merge')
      return
    }
    
    // Execute the merges
    await mergeToSemanticBranches(
      octokit,
      pushDescription,
      contextEnv,
      targetBranches
    )
    
  } catch (error) {
    debug('Error in semantic-release merge:', error)
    throw error
  }
}
