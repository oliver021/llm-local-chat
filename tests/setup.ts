import '@testing-library/jest-dom';

// Reset localStorage between every test so tests are fully isolated
beforeEach(() => {
  localStorage.clear();
});
