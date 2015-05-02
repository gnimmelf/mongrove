var debug = require('debug')('mongrove:setup');
var _ = require('underscore');
var router = require('koa-trie-router');
var assert = require('assert');

var db = require('./db');
var utils = require('./utils');
var middleware = require('./middleware');

/**
 * Setup
 */

module.exports = function(app, options) {
  debug("setup")

  _.defaults(options, {
    uid_prefix: '',
    middleware: [] /*  or function, see below*/,
    name: 'Mongrove',
    collection: null
  });

  app.name = options.name;

  assert(options.collection, 'Options.collection required!');
  assert(options.uid_prefix, 'Options.uid_prefix required!');

  // Build crud handler stacks
  var db_functions = utils.extractHandlerMv(db.crud, options.collection);
  // Pass the `db_functions` as params to each crud middleware respectively
  var crud_stacks = utils.extractHandlerMv(middleware.crud, db_functions);

  // Prepend middleware
  if (_.isFunction(options.middleware)) {
    options.middleware = [options.middleware]
  }

  options.middleware.filter(function(mv) {
    if (_.isArray(mv) || _.isFunction(mv)) {
      // Prefix all crud handlers with `middleware`
      crud_stacks = utils.prependKeyedHandlers(crud_stacks, mv)
    }
    else {
      // Assume object
      // Prefix specified crud handlers with `middleware`
      utils.validateObjCrudKeys(mv)
      crud_stacks = utils.mergeKeyedHandlers(mv, crud_stacks)
    }
  })

  // Prefix crud handler stacks with Default mv
  crud_stacks = utils.prependKeyedHandlers(crud_stacks, [
    middleware.jSendWrapper(),
    middleware.setUid(options.uid_prefix)
  ])

  console.log(crud_stacks)

  // Set up routes for the app
  if (!app.route) {
    app.use(router(app));
  }

  app.route('/:uid')
    .head(crud_stacks.read)
    .get(crud_stacks.read)
    .post(crud_stacks.create)
    .put(crud_stacks.update)
    .del(crud_stacks.delete)
}
