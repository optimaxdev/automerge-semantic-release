import {
  parseSemanticBranchName,
  compareSemanticVersions,
  isSameMajorVersion,
  getSemanticTargetBranches,
  getSemanticRelatedBranches
} from '../semantic-release-merge'

describe('semantic-release-merge', () => {
  describe('parseSemanticBranchName', () => {
    it('should parse major.x branches', () => {
      expect(parseSemanticBranchName('1.x')).toEqual({ major: 1, minor: undefined })
      expect(parseSemanticBranchName('2.x')).toEqual({ major: 2, minor: undefined })
      expect(parseSemanticBranchName('10.x')).toEqual({ major: 10, minor: undefined })
    })

    it('should parse major.minor.x branches', () => {
      expect(parseSemanticBranchName('1.1.x')).toEqual({ major: 1, minor: 1 })
      expect(parseSemanticBranchName('2.5.x')).toEqual({ major: 2, minor: 5 })
      expect(parseSemanticBranchName('10.20.x')).toEqual({ major: 10, minor: 20 })
    })

    it('should handle refs/heads prefix', () => {
      expect(parseSemanticBranchName('refs/heads/1.2.x')).toEqual({ major: 1, minor: 2 })
      expect(parseSemanticBranchName('  refs/heads/2.x  ')).toEqual({ major: 2, minor: undefined })
    })

    it('should return null for non-semantic branches', () => {
      expect(parseSemanticBranchName('main')).toBeNull()
      expect(parseSemanticBranchName('develop')).toBeNull()
      expect(parseSemanticBranchName('feature/test')).toBeNull()
      expect(parseSemanticBranchName('release/1.0.0')).toBeNull()
      expect(parseSemanticBranchName('1.0.0')).toBeNull() // needs .x suffix
      expect(parseSemanticBranchName('v1.x')).toBeNull() // no v prefix
    })
  })

  describe('compareSemanticVersions', () => {
    it('should compare major versions correctly', () => {
      expect(compareSemanticVersions({ major: 1 }, { major: 2 })).toBeLessThan(0)
      expect(compareSemanticVersions({ major: 2 }, { major: 1 })).toBeGreaterThan(0)
      expect(compareSemanticVersions({ major: 1 }, { major: 1 })).toBe(0)
    })

    it('should compare minor versions when major is equal', () => {
      expect(compareSemanticVersions({ major: 1, minor: 1 }, { major: 1, minor: 2 })).toBeLessThan(0)
      expect(compareSemanticVersions({ major: 1, minor: 2 }, { major: 1, minor: 1 })).toBeGreaterThan(0)
      expect(compareSemanticVersions({ major: 1, minor: 1 }, { major: 1, minor: 1 })).toBe(0)
    })

    it('should treat undefined minor as 0', () => {
      expect(compareSemanticVersions({ major: 1 }, { major: 1, minor: 1 })).toBeLessThan(0)
      expect(compareSemanticVersions({ major: 1, minor: 1 }, { major: 1 })).toBeGreaterThan(0)
      expect(compareSemanticVersions({ major: 1 }, { major: 1 })).toBe(0)
    })
  })

  describe('isSameMajorVersion', () => {
    it('should return true for same major versions', () => {
      expect(isSameMajorVersion({ major: 1 }, { major: 1 })).toBe(true)
      expect(isSameMajorVersion({ major: 1, minor: 1 }, { major: 1, minor: 2 })).toBe(true)
      expect(isSameMajorVersion({ major: 2 }, { major: 2, minor: 5 })).toBe(true)
    })

    it('should return false for different major versions', () => {
      expect(isSameMajorVersion({ major: 1 }, { major: 2 })).toBe(false)
      expect(isSameMajorVersion({ major: 1, minor: 9 }, { major: 2, minor: 0 })).toBe(false)
    })
  })

  describe('getSemanticTargetBranches', () => {
    const branches = [
      '1.x',
      '1.1.x',
      '1.2.x',
      '1.3.x',
      '2.x',
      '2.1.x',
      '2.2.x',
      '3.x',
      'main',
      'develop'
    ]

    it('should find higher versions in same major for minor.x branch', () => {
      const targets = getSemanticTargetBranches('1.1.x', branches)
      expect(targets).toEqual(['1.2.x', '1.3.x'])
    })

    it('should find higher versions in same major for major.x branch', () => {
      const targets = getSemanticTargetBranches('1.x', branches)
      expect(targets).toEqual(['1.1.x', '1.2.x', '1.3.x'])
    })

    it('should not cross major version boundaries', () => {
      const targets = getSemanticTargetBranches('1.3.x', branches)
      expect(targets).toEqual([])
      expect(targets).not.toContain('2.x')
      expect(targets).not.toContain('2.1.x')
    })

    it('should work for different major versions', () => {
      const targets = getSemanticTargetBranches('2.1.x', branches)
      expect(targets).toEqual(['2.2.x'])
    })

    it('should return empty for highest version in major', () => {
      const targets = getSemanticTargetBranches('2.2.x', branches)
      expect(targets).toEqual([])
    })

    it('should return empty for non-semantic source branch', () => {
      const targets = getSemanticTargetBranches('main', branches)
      expect(targets).toEqual([])
    })

    it('should sort results by version', () => {
      const mixedBranches = ['1.3.x', '1.1.x', '1.5.x', '1.2.x', '1.4.x']
      const targets = getSemanticTargetBranches('1.x', mixedBranches)
      expect(targets).toEqual(['1.1.x', '1.2.x', '1.3.x', '1.4.x', '1.5.x'])
    })
  })

  describe('getSemanticRelatedBranches', () => {
    const mockPushDescription = {
      base: { ref: '1.1.x' },
      head: { ref: '1.1.x' }
    } as any

    const mockContextEnv = {} as any

    const branches = ['1.x', '1.1.x', '1.2.x', '1.3.x', '2.x', '2.1.x']

    it('should return semantic target branches', async () => {
      const result = await getSemanticRelatedBranches(
        mockPushDescription,
        mockContextEnv,
        branches
      )
      expect(result).toEqual(['1.2.x', '1.3.x'])
    })

    it('should throw error if no source branch found', async () => {
      const invalidPushDescription = {
        base: null,
        head: null
      } as any

      await expect(getSemanticRelatedBranches(
        invalidPushDescription,
        mockContextEnv,
        branches
      )).rejects.toThrow('Failed to determine source branch')
    })
  })
})
