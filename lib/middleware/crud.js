var debug = require('debug')('mongrove:middleware:crud');
var UserError = require('usererror');
var parseBody = require('co-body');

/* CRUD functions */
module.exports.create = function(creater_fn) {
  return function *create(next) {
    debug('create');

    var payload = this.payload || (yield parseBody.json(this, {limit: '1kb'}));

    this.body = yield creater_fn(this.uid, payload);

    yield next;
  }
}

module.exports.read = function(reader_fn) {
  return function *get(next) {
    debug('get');

    this.body = yield reader_fn(this.uid);

    yield next;
  }
}

module.exports.update = function(updater_fn) {
  return function *update(next) {
    debug('update');

    var payload = this.payload || (yield parseBody.json(this, {limit: '1kb'}));

    this.body = yield updater_fn(this.uid, payload);

    yield next;
  }
}

module.exports.delete = function(deleter_fn) {
  return function *_delete(next) {
    debug('delete');

    this.body = yield deleter_fn(this.uid);

    yield next;
  }
}