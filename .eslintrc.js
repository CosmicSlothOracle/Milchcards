module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    // Keep the default rule behaviour from react-app; only add narrowly
    // scoped exceptions inline when the code genuinely requires them.
  },
  env: {
    node: true,
    browser: true,
    es6: true
  }
};
