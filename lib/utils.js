var debug = require('debug')('mongrove:utils');
var _ = require('underscore');
var UserError = require('usererror');
var traverse = require('traverse');
var assert = require('assert');

/***********************
UID: https://github.com/bengler/grove
***********************/

var uidRegExp = exports.uidRegExp = /(.*?)\:(.*?(?=\$|$))(\$(.+))?/;
var pathRegExp = exports.pathRegExp = /^([a-z_\*]{1}[a-z0-9_\*]*(\.[a-z_\*]{1}[a-z0-9_\*]*)*)$/

var parseUid = exports.parseUid = function(uid_str) {
  debug("parseUid:uid_str", uid_str)

  var matches = uidRegExp.exec(uid_str);
  var data = {};

  data.uid = uid_str;
  data.klass = matches[1];
  data.path = matches[2];
  data.oid = parseInt(matches[4])||'';

  if (!data.path.match(pathRegExp)) {
    throw new UserError(JSON.stringify({'path': "Invalid ('"+data.path+"')"}));
  }

  var path_parts = data.path.split('.')
  data.realm = path_parts.shift();
  data.app_id = path_parts.shift();

  return data
}

var uidStr2Regexp = exports.uidStr2Regexp = function(uid_str) {
  uid_str = uid_str.replace(/\:/g, '\\:');
  uid_str = uid_str.replace(/\./g, '\\.');
  uid_str = uid_str.replace(/\*/g, '(.*)');
  uid_str = uid_str.replace(/\$/g, '\\$');

  debug("uidStr2Regexp:uid_str:", uid_str);

  return new RegExp('^'+uid_str+'$');
}

var getCriteria = exports.getCriteria = function(uid, criteria) {
  criteria = (criteria ? obj2QuerySet(criteria) : {});

  // TODO! Find the most effective criteria?
  criteria.uid = uidStr2Regexp(uid.uid);

  debug('getCriteria:criteria:', criteria);

  return criteria;
}

var makeRecord = exports.makeRecord = function(action, uid, payload) {

  if (action == 'create') {

    // No wildcards when creating
    assert.ok(uid.uid.indexOf('*') > -1, "No wildcards in uid when creating");

    assert.ok(uid.oid, "Invalid uid.oid ("+uid.oid+")");
    assert.ok(uid.realm, "Invalid uid.realm ("+uid.realm+")");
    assert.ok(uid.app_id, "Invalid uid.app_id ("+uid.app_id+")");

    var record = {
      document: payload
    };
    _.extend(record, uid);
    record.created_at = new Date().toISOString();

  }
  else if (action == 'update') {

    var record = obj2QuerySet(payload, 'document.');
    record.updated_at = new Date().toISOString();

  }
  else {
    throw new Error("Can only set record payload for 'create' and 'update' actions!");
  }
  return record;
}

/***********************
Mongodb helper functions
***********************/

var tuples2Obj = exports.tuples2Obj = function(tuples) {
  function traverse(tuples, obj) {
    for (var i=0;i<tuples.length;i++) {
      obj[tuples[i][0]] = (_.isArray(tuples[i][1]) ? traverse(tuples[i][1], {}) : tuples[i][1]);
    }
    return obj;
  }
  return traverse(tuples, {});
}

var obj2Tuples = exports.obj2Tuples = function(obj) {
  function traverse(obj, tuples) {
    for (k in obj) {
      if (!{}.hasOwnProperty.call(obj, k)) continue;
      v = obj[k];
      tuples.push([k, (_.isObject(v) ? traverse(v, []) : v)])
    }
    return tuples;
  }
  return traverse(obj, []);
}

var obj2QuerySet = exports.obj2QuerySet = function(payload, prefix) {
  // Concatenate keys to object with dotted-paths keys and leaf values
  // https://github.com/substack/js-traverse
  return traverse(payload).reduce(function(paths, value) {
    if (this.isLeaf) {
      paths[(prefix||'')+this.path.join('.')] = value;
    }
    return paths;
  }, {});
}

/**************************
Middleware helper functions
**************************/

var validateObjCrudKeys = exports.validateObjCrudKeys = function(handlers_obj) {
  Object.keys(handlers_obj).filter(function(key) {
    if (['create', 'read', 'update', 'delete'].indexOf(key) == -1) {
      throw new Error("Unknown handler '"+key+"'", handlers_obj)
    }
  })
}

var filterHandlers = exports.filterHandlers = function(list) {
  return list.filter(function(x) { return _.isFunction(x); });
}

var flattenHandlers = exports.flattenHandlers = function(list) {
  return traverse(list).reduce(function (acc, x) {
    if (this.isLeaf && _.isFunction(x)) acc.push(x);
    return acc;
  }, []);
}

/* Flatten and add all additional args to the start of the passed list:
 * f([a,b], c, d) => [c, d, a, b]
 */
var flatPrependHandlers = exports.flatPrependHandlers = function(list) {
  var args = [].slice.call(arguments, 1);

  list = filterHandlers(list);

  // Flatten any list within lists
  var args_list = flattenHandlers(args);

  return args_list.concat(list);
}

/* Add additional arguments to the start of all the props of lists_obj:
 * f({c:[c1, c2], r:[r1, r2], u:[u1, u2]}, s1, s2)
 * => {c:[s1, s2, c1, c2], r:[s1, s2, r1, r2], u:[s1, s2, u1, u2]}
 */
var prependKeyedHandlers = exports.prependKeyedHandlers = function(lists_obj) {
  var args = [].slice.call(arguments, 1);
  var prepended = {};
  _.each(lists_obj, function(list, key) {
    if (!_.isArray(list)) {
      list = [list]
    }
    prepended[key] = flatPrependHandlers(list, args);
  });
  return prepended;
}

/* Merge handlers' functions into lists per handler name
 * f({a: a1, b: b1}, {a: a2, b: b2},{a: a3, b: b3})
 * => {a: [a1, a2, a3], b: [b1, b2, b3]}
 */
var mergeKeyedHandlers = exports.mergeKeyedHandlers = function() {
  var args = [].slice.call(arguments);
  var merged = {};

  for(var i=0;i<args.length;i++) {
    var lists_obj = args[i];
    for (var key in lists_obj) {
      if (!{}.hasOwnProperty.call(lists_obj, key)) continue;

      if (!merged[key]) {
        merged[key] = [];
      }

      var handlers = lists_obj[key];
      if (_.isArray(handlers)) {
        merged[key] = merged[key].concat( filterHandlers(handlers) );
      }
      else if (_.isFunction(handlers)) {
        merged[key].push(handlers);
      }

    }
  }
  return merged;
}

/**
 * Extract closure'ed generator functions from a handlers_obj-object,
 * Any extra arguments are treated as params to the handler wrapper functions.
 * -For arguments that are objects with keys matching an handler-action, the value for that
 *  key will be used as the argument instead of the whole object.
 */
var extractHandlerMv = exports.extractHandlerMv = function(handlers_obj) {
  var args = [].slice.call(arguments, 1);
  var extracted = {};

  var fn_names = _.keys(handlers_obj);

  for (var handler_key in handlers_obj) {
    debug('extractHandlers: '+handler_key);
    if (!{}.hasOwnProperty.call(handlers_obj, handler_key)) continue;
    var wrapper_fn = handlers_obj[handler_key];
    if (typeof(wrapper_fn) !== 'function') continue;

    // Parse args
    var parsed_args = [];
    for (var i=0; i<args.length;i++) {

      if (_.isObject(args[i]) && args[i][handler_key]  && !_.difference(_.keys(args[i]), fn_names).length) {
        /* The arg is an object with only keys matching the handlers_obj fn_names:
           use the handler_key value as an arg instad of the entire object */
        parsed_args.push( args[i][handler_key] );
      }
      else {
        parsed_args.push(args[i]);
      }
    }

    var plugged_fn = wrapper_fn.apply(wrapper_fn, parsed_args);

    assert.equal(typeof(plugged_fn), 'function', "Handler '"+handler_key+"'["+i+"] functions does not return a (generator) function!");

    extracted[handler_key] = plugged_fn;
  }
  return extracted;
}
