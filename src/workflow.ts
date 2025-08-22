import * as core from '@actions/core'
import {init} from './init'
import {fetchAllBranchesForSemanticRelease} from './lib/repo-api'
import {debug, error} from './lib/log'
import {
  executeSemanticReleaseMerge,
  parseSemanticBranchName
} from './semantic-release-merge'

export async function run(): Promise<void> {
  try {
    core.debug(new Date().toTimeString())

    const initResult = init()

    if (!initResult) {
      return
    }

    const {pushDescription, octokit, contextEnv} = initResult
    
    // Fetch all branches
    const branchesList = await fetchAllBranchesForSemanticRelease(
      octokit,
      pushDescription,
      contextEnv
    )
    
    debug('Fetched branches', branchesList)
    
    if (!branchesList.length) {
      throw new Error('No branches were found')
    }

    // Determine the source branch from the push
    const sourceBranch = pushDescription.base?.ref || pushDescription.head?.ref
    
    if (!sourceBranch) {
      throw new Error('Unable to determine source branch from push description')
    }

    debug('Source branch for merge analysis:', sourceBranch)

    // Check if this is a semantic version branch
    const sourceSemanticVersion = parseSemanticBranchName(sourceBranch)
    
    if (!sourceSemanticVersion) {
      debug('Non-semantic version branch detected. This action only supports semantic version branches (e.g., 1.x, 1.1.x)')
      core.setFailed('This action only supports semantic version branches (e.g., 1.x, 1.1.x). Current branch: ' + sourceBranch)
      return
    }

    debug('Detected semantic version branch, executing semantic-release automerge workflow')
    
    // Execute semantic-release specific logic
    await executeSemanticReleaseMerge(
      octokit,
      pushDescription,
      contextEnv,
      branchesList
    )
    
  } catch (err) {
    error(err as Error)
    core.setFailed((err as Error).message)
  }
}
