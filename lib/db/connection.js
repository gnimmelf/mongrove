var debug = require('debug')('mongrove:db:connection');
var monk = require('monk');
var coWrap = require('co-monk');
var _ = require('underscore');

function getCollection(connection, collection_name) {
  // Set co-wrapped collection for use with koa, generators & yield
  collection = coWrap(connection.get(collection_name));
  // Set indexes & constraints
  collection.ensureIndex( { "uid": 1 }, { unique: true } );  
  return collection;
}

/* Connection class */
var Connection = module.exports = function(connection_str, collection_name) {

  if (!(this instanceof Connection)) return new Connection(connection_str, collection_name);

  if (!collection_name) {
    throw new Error("collection name is required!')");
  }

  collection_name = collection_name.toLowerCase();
  if (!collection_name.match(/^([a-z_]{1}[a-z0-9_]*(\.[a-z_]{1}[a-z0-9_]*)*)$/)) {
    throw new Error("invalid collection name ('"+collection_name+"')");
  }

  this.connection = monk(connection_str, function(err) {
    if (err) throw err;
    debug('successfully connected to MongoDB');      
  });

  if (collection_name.split('.')[0] != 'mongrove') {
    // Prefix collection_name
    collection_name = 'mongrove.'+collection_name;
  } 

  this.collectionName = collection_name;

  // Suffix collection name with NODE_ENV string
  if (process.env.NODE_ENV == 'test') {
    this.collectionName += '.test';
  } 
  else {
    this.collectionName += '.dev';
  }    
  debug('collection: ' + this.collectionName);
  
  this.collection = getCollection(this.connection, this.collectionName)

  return this;
}

/* Prototype memebers */
var _Connection = Connection.prototype;

_Connection.cleanUp = function() {
  debug("cleanUp (collection '"+this.collectionName+")");
  this.collection.drop();  
  this.collection = getCollection(this.connection, this.collectionName);
} 

_Connection.crud = require('./crud');
