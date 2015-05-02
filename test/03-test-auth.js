/*
$> DEBUG=mongrove* NODE_ENV=test npm test
*/

var should = require("should");
var mocha = require('mocha');
var request = require('supertest');
var koa = require('koa');
var mount = require('koa-mount');

if ( process.env.NODE_ENV !== 'test' ) {
    console.log("Woops, you want NODE_ENV=test before you try this again!");
    process.exit(1);
}

describe('Testing AUTH:', function() { 

  var server;

  before(function(done){
    var app = koa();

    var mongrove = require('../');
    var checkpoint = require('mongrove-checkpoint')

    var conn = mongrove.db.connection(require('../credentials').mongodb, 'mongrove.posts');
    conn.cleanUp();
    
    var api_user = mongrove({
      name: 'API user', 
      uid_prefix: 'user:acmecorp.users',
      collection: conn.collection
    });

    var api_checkpoint = checkpoint({
      name: 'API checkpoint', 
      uid_prefix: 'user:acmecorp.users',
      collection: conn.collection      
    });

    // Mount apps    
    app.use(mount('/checkpoint', api_checkpoint));
    app.use(mount('/api_user', api_user));


    
    server = app.listen();
    done();
  });

  describe('Adding users:', function() {

    it('GET: success with no data', function(done) {
      request(server)
        .get('/api_user/*')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .expect(function(res) { 
          res.body.should.have.property("status", "success");
          res.body.should.containDeep({data: []});
        })
        .end(done);
    });

    it('POST: success with data "Created(1)"', function(done) {
      request(server)
        .post('/api_user/$111')
        .send({
          user: 'zchnim', 
          pass: 'abc', 
          permissions: [
            ['*', 'a+crud']
          ]
        })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .expect(function(res) { 
          res.body.should.have.property("status", "success");
          res.body.should.containDeep({data: "Created(1)"});
        })
        .end(done);
    });

    it('POST: success with data "Created(1)"', function(done) {
      request(server)
        .post('/api_user/$222')
        .send({
          user: 'gnim', 
          pass: 'def', 
          permissions: [
            ['product:acmecorp.acmeapp.food$*', 'o+crud']
          ]
        })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .expect(function(res) { 
          res.body.should.have.property("status", "success");
          res.body.should.containDeep({data: "Created(1)"});
        })
        .end(done);
    });

    it('GET: success with two(2) data elements', function(done) {
      request(server)
        .get('/api_user/*')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .expect(function(res) { 
          res.body.should.have.property("status", "success");
          res.body.data.should.have.length(2);
          res.body.should.containDeep({data: [
            {
              oid: 111,
              document: {user: 'zchnim', pass: 'abc'}
            },
            {
              oid: 222,
              document: {user: 'gnim', pass: 'def'}
            }
          ]});
        })
        .end(done);
    });

  });

  describe('User auth:', function() {
  
    it('GET: fail with 401 "Unauthorized"', function(done) {
      request(server)
        .get('/checkpoint/authenticate')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(401)      
        .end(done);
    });

    it('POST: fail with credentials missing', function(done) {
      request(server)
        .post('/checkpoint/authenticate')
        .send({})
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .expect(function(res) { 
          res.body.should.have.property("status", "fail");
          res.body.should.have.property("data", {"credentials": "missing"});
        })
        .end(done);
    });

    it('POST: success with token', function(done) {
      request(server)
        .post('/checkpoint/authenticate')
        .send({
          name: 'gnim', 
          pass: 'def'        
        })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .expect(function(res) { 
          res.body.should.have.property("status", "success");
          res.body.should.containDeep({data: "eyJ0eXAiOiJKV"});
        })
        .end(done);
    });

    it('POST: authorize with token', function(done) {
      request(server)
        .post('/checkpoint/authorize')
        .send({
          action: 'read',
          target_uid: 'user:acmecorp.users$222',
          token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZGVudGl0eSI6ImduaW0ifQ.Rw65o8ZJEqatxq4cqhTco_mpCNUNLsJEmOqH2jbjD30'
        })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .expect(function(res) { 
          res.body.should.have.property("status", "success");
          res.body.should.have.property("data", {"allowed": true});
        })
        .end(done);
    });

  });

}); 
