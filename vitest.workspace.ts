import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      name: 'shared',
      include: ['shared/**/*.test.ts'],
    },
  },
  {
    test: {
      name: 'server',
      include: ['server/**/*.test.ts'],
    },
  },
  {
    test: {
      name: 'client',
      include: ['client/**/*.test.ts'],
    },
  },
])
