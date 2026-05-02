import '@testing-library/jest-dom'

// requestAnimationFrame: don't immediately call to avoid infinite loop in animation loops.
// Tests that need rAF behavior can override this per-test.
global.requestAnimationFrame = jest.fn(() => 0)
global.cancelAnimationFrame = jest.fn()
