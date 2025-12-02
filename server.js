// Fallback entry for environments that don't respect `exports` subpaths.
// Redirects to the built server logger implementation.
module.exports = require('./dist/server/index.js');
