var debug = require('debug')('mongrove:db:crud');
var UserError = require('usererror');
var parseBody = require('co-body');

var utils = require('../utils');

/* CRUD functions */
module.exports.create = function(collection) {
  //debug("create", collection)
  return function *create(uid, payload) {
    debug('create');

    var record = utils.makeRecord('create', uid, payload);
    try {
      var res = yield collection.insert(record);
    } catch(e) {
      throw new UserError(e.message);
    }

    return 'Created(1)';
  }
}

module.exports.read = function(collection) {
  //debug("read", collection)
  return function *read(uid, criteria) {
    debug('read');

    var criteria = utils.getCriteria(uid, criteria);

    return yield collection.find(criteria);
  }
}

module.exports.update = function(collection) {
  //debug("update", collection)
  return function *update(uid, payload, criteria) {
    debug('update');

    var record = utils.makeRecord('update', uid, payload);
    var criteria = utils.getCriteria(uid, criteria);
    try {
      var res = yield collection.update(criteria, { $set: record }, {upsert: false, multi: true});
    } catch(e) {
      throw new UserError(e.message);
    }

    if (res == 0) {
      throw new UserError(JSON.stringify({'No such post': uid.uid}));
    }

    return 'Updated('+res+')';
  }
}

module.exports.delete = function(collection) {
  //debug("remove", collection)
  return function *_delete(uid, criteria) {
    debug('delete');

    var criteria = utils.getCriteria(uid, criteria);
    var res = yield collection.remove(criteria);

    if (res == 0) {
      throw new UserError(JSON.stringify({'No such post': uid.uid}));
    }
    return 'Removed('+res+')';
  }
}