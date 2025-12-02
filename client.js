// Fallback entry for environments that don't respect `exports` subpaths.
// Redirects to the built client logger implementation.
module.exports = require('./dist/client/index.js');
