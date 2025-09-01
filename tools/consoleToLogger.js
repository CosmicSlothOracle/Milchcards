const { parse } = require('recast');

module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  let didChange = false;

  // Ensure logger import exists
  function ensureImport() {
    const existing = root.find(j.ImportDeclaration, {
      source: { value: '../debug/logger' }
    });
    if (existing.size() === 0) {
      const importDecl = j.importDeclaration(
        [j.importSpecifier(j.identifier('logger'))],
        j.literal('../debug/logger')
      );
      root.get().node.program.body.unshift(importDecl);
    } else if (
      existing.find(j.ImportSpecifier, { imported: { name: 'logger' } }).size() === 0
    ) {
      existing.at(0).get('specifiers').value.push(
        j.importSpecifier(j.identifier('logger'))
      );
    }
  }

  const replacements = {
    log: 'dbg',
    warn: 'warn',
    info: 'info',
    error: 'err',
    debug: 'dbg',
  };

  root.find(j.MemberExpression, {
    object: { name: 'console' },
    property: { type: 'Identifier' }
  }).forEach(path => {
    const method = path.value.property.name;
    if (replacements[method]) {
      path.value.object.name = 'logger';
      path.value.property.name = replacements[method];
      didChange = true;
    }
  });

  if (didChange) {
    ensureImport();
    return root.toSource();
  }
  return null;
};
