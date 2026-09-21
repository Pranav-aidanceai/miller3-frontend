// Jest auto-mock for `react-markdown` (placed at <rootDir>/__mocks__/<pkg>.tsx
// per Jest's node_modules mocking convention — applied automatically to
// every test, no jest.mock() call needed).
//
// react-markdown ships as pure ESM with a deep unified/remark/mdast
// dependency chain that next/jest's default transformIgnorePatterns
// doesn't transform, so importing it (even transitively, e.g. via
// TermsOfUse.tsx) crashes any test file that pulls it in. None of this
// project's component tests assert on actual Markdown parsing, so a plain
// passthrough is sufficient and keeps tests fast.
import type { ReactNode } from 'react';

export default function ReactMarkdown({ children }: { children?: ReactNode }) {
    return <div data-testid="markdown-mock">{children}</div>;
}
