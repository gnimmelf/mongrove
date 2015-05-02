/*
$> DEBUG=mongrove* NODE_ENV=test npm test
*/

var should = require("should");
var mocha = require('mocha');
var request = require('supertest');
var koa = require('koa');

console.log("-----------------------------")
console.log('NODE_ENV: '+process.env.NODE_ENV);
 
if ( process.env.NODE_ENV !== 'test' ) {
    console.log("Woops, you want NODE_ENV=test before you try this again!");
    process.exit(1);
}

describe('Testing CRUD:', function() {
  
  var server;

  before(function(done){
    var mongrove = require('../');
    
    var conn = mongrove.db.connection(require('../credentials').mongodb, 'mongrove.posts');
    conn.cleanUp();
        
    var uid_prefix = 'product:acmecorp.acmeapp'; 
    var app = mongrove({
      uid_prefix: uid_prefix,
      collection: conn.collection
    });

    server = app.listen();

    done();
  });

  it('GET: success with no data', function(done) {
    request(server)
      .get('/*')
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
      .post('/food$111')
      .send({name: 'Tomato beans', contents: {beans: '20%' , tomatos: '80%' }})
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(function(res) { 
        res.body.should.have.property("status", "success");
        res.body.should.containDeep({data: "Created(1)"});
      })
      .end(done);
  });

  it('GET: success with one(1) data element', function(done) {
    request(server)
      .get('/*')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(function(res) { 
        res.body.should.have.property("status", "success");
        res.body.data.should.have.length(1);
        res.body.should.containDeep({data: [{
          oid: 111,
          document: {name: 'Tomato beans', contents: {beans: '20%' , tomatos: '80%' }}
        }]});
      })
      .end(done);
  });

  it('GET: success with no data', function(done) {
    request(server)
      .get('/')
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
      .post('/food$222')
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

  it('POST: fail with data "E11000 duplicate key error[...]"', function(done) {
    request(server)
      .post('/food$222')
      .send({name: 'Kidney beans', contents: {beans: '20%' , kidneys: '80%' }})
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(function(res) { 
        res.body.should.have.property("status", "fail");
        res.body.should.containDeep({data: "E11000 duplicate key error"});
      })
      .end(done);
  });

  it('GET: success with two(2) data elements', function(done) {
    request(server)
      .get('/*')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(function(res) { 
        res.body.should.have.property("status", "success");
        res.body.data.should.have.length(2);
        res.body.should.containDeep({data: [
          {
            oid: 111,
            document: {name: 'Tomato beans', contents: {beans: '20%' , tomatos: '80%' }}
          },
          {
            oid: 222,
            document: {name: 'Kidney beans', contents: {beans: '20%' , kidneys: '80%' }}
          }
        ]});
      })
      .end(done);
  });

  it('GET: success with one(1) data element', function(done) {
    request(server)
      .get('/*$111')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(function(res) { 
        res.body.should.have.property("status", "success");
        res.body.data.should.have.length(1);
        res.body.should.containDeep({data: [
          {
            oid: 111,
            document: {name: 'Tomato beans', contents: {beans: '20%' , tomatos: '80%' }}
          }
        ]});
      })
      .end(done);
  });

  it('PUT: success with data "Updated(1)"', function(done) {
    request(server)
      .put('/food$111')
      .send({name: 'Tomato beans w/ basil', contents: {tomatos: '75%', basil: '5%' }})
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(function(res) { 
        res.body.should.have.property("status", "success");
        res.body.should.containDeep({data: "Updated(1)"});
      })
      .end(done);
  });  

  it('GET: success with two(2) data elements, one updated', function(done) {
    request(server)
      .get('/*')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(function(res) { 
        res.body.should.have.property("status", "success");
        res.body.data.should.have.length(2);
        res.body.should.containDeep({data: [
          {
            oid: 111,
            document: {name: 'Tomato beans w/ basil', contents: {beans: '20%' , tomatos: '75%', basil: '5%' }}
          },
          {
            oid: 222,
            document: {name: 'Kidney beans', contents: {beans: '20%' , kidneys: '80%' }}
          }
        ]});
      })
      .end(done);
  });

  it('PUT: success with data "Updated(2)"', function(done) {
    request(server)
      .put('/food*')
      .send({packaging: 'tetra-pack'})
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(function(res) { 
        res.body.should.have.property("status", "success");
        res.body.should.containDeep({data: "Updated(2)"});
      })
      .end(done);
  });

  it('GET: success with two(2) data elements, two updated', function(done) {
    request(server)
      .get('/*')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(function(res) { 
        res.body.should.have.property("status", "success");
        res.body.data.should.have.length(2);
        res.body.should.containDeep({data: [
          {
            oid: 111,
            document: {name: 'Tomato beans w/ basil', contents: {beans: '20%' , tomatos: '75%', basil: '5%' }, packaging: 'tetra-pack'}
          },
          {
            oid: 222,
            document: {name: 'Kidney beans', contents: {beans: '20%' , kidneys: '80%' }, packaging: 'tetra-pack'}
          }
        ]});
      })
      .end(done);
  });

  it('POST: success with data "Created(1)"', function(done) {
    request(server)
      .post('/food$333')
      .send({name: 'Jumping beans', contents: {beans: '90%' , fleas: '10%' }})
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(function(res) { 
        res.body.should.have.property("status", "success");
        res.body.should.containDeep({data: "Created(1)"});
      })
      .end(done);
  });

  it('DEL: success with data "Removed(1)"', function(done) {
    request(server)
      .del('/food$333')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(function(res) { 
        res.body.should.have.property("status", "success");
        res.body.should.containDeep({data: "Removed(1)"});
      })
      .end(done);
  });

  it('DEL: success with data "Removed(2)"', function(done) {
    request(server)
      .del('/*')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(function(res) { 
        res.body.should.have.property("status", "success");
        res.body.should.containDeep({data: "Removed(2)"});
      })
      .end(done);
  });

  it('POST: fail with data "Invalid uid.oid"', function(done) {
    request(server)
      .post('/food')
      .send({name: 'Jumping beans', contents: {beans: '90%' , fleas: '10%' }})
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(function(res) { 
        res.body.should.have.property("status", "fail");
        res.body.should.containDeep({data: "Invalid uid.oid"});
      })
      .end(done);
  });


});