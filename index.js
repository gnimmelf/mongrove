var debug = require('debug')('mongrove');

var koa = require('koa');

var setup = require('./lib/setup');
var db = require('./lib/db');
var utils = require('./lib/utils');
var middleware = require('./lib/middleware');

if (module.parent) {
  // Exports
  var exports = module.exports = function(options) {
    var app = koa();
    setup(app, options);
    return app;
  };
  exports.db = db;
  exports.utils = utils;
  exports.middleware = middleware;
  exports.error = require('usererror');
}
else {
  /**
   * Start as standalone
   * NODE_ENV=test DEBUG=mongrove* node ./index.js --db-str mongodb://127.0.0.1:27017/mongrove --uid-prefix=user:acmecorp
   */
  var argv = require('minimist')(process.argv.slice(2));
  if (argv['help'] || !argv['db-str']) {
    console.log('Arguments: --db-str: <mongodb-connection-str> [--uid-prefix=<doc-class[:<uid-prefix>]>] [--collection=<collection-name>] [--port=<port#>]');
    console.log('Eg:\n"--db-str=mongodb://<user>:<password>@<url> --uid-prefix=product:acmecorp.acmeapp"')
    return;
  }

  var app = koa();
  if ( process.env.NODE_ENV == 'test' || process.env.NODE_ENV == 'dev' ) {
    app.use( middleware.errorHandler() );
    app.use( require('koa-favi')() );
    app.use( require('koa-json')() );
  }

  var conn = db.connection(argv['db-str'], argv['collection']||'mongrove.posts');

  setup(app, {
    uid_prefix: argv['uid-prefix'],
    collection: conn.collection
  });

  var port = argv['port'] || 3001;
  app.listen(port);
  console.log(app.name+' listening on port '+port);
}
