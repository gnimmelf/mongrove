/*
$> DEBUG=mongrove* NODE_ENV=test npm test
*/

var should = require("should");
var mocha = require('mocha');
var request = require('supertest');
var koa = require('koa');
var mount = require('koa-mount');

console.log("-----------------------------")
console.log('NODE_ENV: '+process.env.NODE_ENV);

if ( process.env.NODE_ENV !== 'test' ) {
    console.log("Woops, you want NODE_ENV=test before you try this again!");
    process.exit(1);
}

describe('Testing MULTI-SETUP:', function() {

  var server;

  before(function(done){
    var mongrove = require('../');

    var conn = mongrove.db.connection(require('../credentials').mongodb, 'mongrove.posts');
    conn.cleanUp();

    var api_user = mongrove({
      name: 'API user',
      uid_prefix: 'user:acmecorp.users',
      collection: conn.collection
    });

    var api_product = mongrove({
      name: 'API product',
      uid_prefix: 'product:acmecorp.acmeapp.products',
      collection: conn.collection
    });

    var api_acmecorp = mongrove({
      name: 'API acmecorp',
      uid_prefix: '*:acmecorp',
      collection: conn.collection
    });

    // Mount apps
    var app = koa();
    app.use(mount('/api_user', api_user));
    app.use(mount('/api_product', api_product));
    app.use(mount('/api_acmecorp', api_acmecorp));

    server = app.listen();

    done();
  });


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

  it('GET: success with no data', function(done) {
    request(server)
      .get('/api_product/*')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(function(res) {
        res.body.should.have.property("status", "success");
        res.body.should.containDeep({data: []});
      })
      .end(done);
  });

  it('GET: success with no data', function(done) {
    request(server)
      .get('/api_acmecorp/*')
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
        pass: 'def'
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
      .post('/api_product/food$111')
      .send({name: 'Kidney beans', contents: {beans: '20%' , kidneys: '80%' }})
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(function(res) {
        res.body.should.have.property("status", "success");
        res.body.should.containDeep({data: "Created(1)"});
      })
      .end(done);
  });

  it('GET: success with one(2) data elements', function(done) {
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
