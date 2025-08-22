/**
 * Context values for semantic-release automerge action execution
 *
 * @export
 * @interface IContextEnv
 */
export interface IContextEnv {
  /**
   * GitHub token
   *
   * @type {string}
   * @memberof IContextEnv
   */
  token: string
  /**
   * Label which will be added to a PR created automatically
   * on a merge conflict. It will be created automatically if
   * not exists
   *
   * @type {string}
   * @memberof IContextEnv
   */
  automergePrLabel: string
  /**
   * Name of the git remote
   *
   * @type {string}
   * @memberof IContextEnv
   */
  remoteName: string
}
