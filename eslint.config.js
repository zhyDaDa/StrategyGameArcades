import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

// 依赖方向（CLAUDE.md 第 3 节）。这里的 group 是 gitignore 风格 glob：
// 约定跨目录一律使用 `@/` 别名，因此可以精确约束各层边界。
const forbiddenUi = ['react', 'react-dom', 'react/*', 'react-dom/*', 'motion', 'motion/*', '*.less', '*.css']
const forbiddenAbove = [
  '@/games/**',
  '@/components/**',
  '@/presentation/**',
  '@/app/**',
  '@/controllers/**',
  '@/integrations/**',
  '@/systems/**',
  '@/routers/**',
]

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },

  // 基础规则：覆盖全部 TS/TSX 文件
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // 项目约定用 `_` 前缀表示「接口要求但当前实现未使用」的参数。
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // core：纯 TS，不依赖 React / Motion / 样式 / 任何上层
  {
    files: ['src/core/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: forbiddenUi, message: 'core 不得依赖 React / Motion / 样式' },
            { group: forbiddenAbove, message: 'core 不得依赖上层模块' },
          ],
        },
      ],
    },
  },

  // 游戏领域层：纯 TS，不依赖 React / Motion / 样式 / UI / app
  {
    files: ['src/games/*/domain/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: forbiddenUi, message: 'domain 不得依赖 React / Motion / 样式' },
            {
              group: ['@/components/**', '@/presentation/**', '@/app/**', '@/routers/**', '@/games/*/ui/**', '@/games/registry'],
              message: 'domain 不得依赖 UI / 路由层或其它游戏',
            },
          ],
        },
      ],
    },
  },

  // presentation：不得依赖具体游戏 / 通用组件 / app
  {
    files: ['src/presentation/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/games/**', '@/components/**', '@/app/**', '@/routers/**'], message: 'presentation 不得依赖具体游戏 / 组件 / 路由 / app' },
          ],
        },
      ],
    },
  },

  // components：通用 UI，不得依赖具体游戏 / app
  {
    files: ['src/components/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: ['@/games/**', '@/app/**', '@/controllers/**', '@/routers/**'], message: 'components 不得依赖具体游戏 / app / controllers / 路由' }],
        },
      ],
    },
  },

  // controllers：决策适配器，不得依赖 UI / 具体游戏
  {
    files: ['src/controllers/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: forbiddenUi, message: 'controllers 不得依赖 React / Motion / 样式' },
            { group: ['@/games/**', '@/components/**', '@/presentation/**', '@/app/**', '@/routers/**'], message: 'controllers 不得依赖具体游戏 / UI / 路由' },
          ],
        },
      ],
    },
  },

  // routers：路由层。可依赖 presentation 的通用页面过渡动画，不得依赖具体游戏 / app 页面。
  {
    files: ['src/routers/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/games/**', '@/controllers/**', '@/integrations/**', '@/app/**'],
              message: 'routers 不得依赖具体游戏 / app 页面；页面应由 app/routes.tsx 注入',
            },
          ],
        },
      ],
    },
  },
)