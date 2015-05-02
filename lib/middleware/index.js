var debug = require('debug')('mongrove:middleware');
var assert = require('assert');
var UserError = require('usererror');

var utils = require('../utils');

exports.crud = require('./crud');

exports.jSendWrapper = function() {
  // jSend: http://labs.omniti.com/labs/jsend
  return function *jSendWrapper(next) {
    var jSend = {
      status: 'success',
    }
    // Info-collector following the request through the mv stack.
    this.meta = {};

    try {
      this.type = 'application/json';
      if(this.is('application/json') == false) {
        throw new UserError('Only application/json accepted');
      };
      yield next;

      jSend.data = this.body;

    } catch(e) {
      if (e.name == 'UserError' || e.name == 'AssertionError') {
        jSend.status = 'fail';
        this.status = 400;
      } else {
        this.app.emit('error', e, this);
        jSend.status = 'error';
        this.status = 500;
      }

      try {
        // What am I doing here?
        jSend.message = JSON.parse(e.message);
      } catch(e2) {
        jSend.message = e.message || require('http').STATUS_CODES[this.status||500];
      }
    }
    jSend.meta = this.meta;
    this.body = jSend;
  }
}

/* Set uid on context */
exports.setUid = function(uid_prefix) {
  debug("setUid: "+uid_prefix);

  assert( !/\*$/.test(uid_prefix), "uid_prefix cannot end with *");

  return function *setUid(next) {

    debug('setUid:uid_prefix', uid_prefix);
    debug('setUid:req.params.uid', this.params.uid);

    // Build uid_str
    if (!this.params.uid) {
      var uid_str = uid_prefix;
    }
    else if (['$', '*'].indexOf(this.params.uid[0]) >= 0) {
      // Params.uid starts-with '*' or  '$', so no '.'-concatenation
      // "user:acmecorp.users" + "$*"
      var uid_str = uid_prefix + this.params.uid;
    } else {
      // Params.uid starts not-with '*' or  '$', so '.'-concatenation
      // "product:acmecorp.products" + "." + "food$*"
      var uid_str = uid_prefix + "." + this.params.uid;
    }
    debug('setUid:uid_str:', uid_str);

    if (!(uid_str && typeof(uid_str) == 'string' && uid_str.match(utils.uidRegExp))) {
      throw new UserError(JSON.stringify({'uid': "Invalid ('"+uid_str+"')"}));
    }

    this.uid = utils.parseUid(uid_str);

    this.meta.uid = this.uid.uid

    yield next;
  }
}