
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , AWS = require('aws-sdk')
  , path = require('path')
  , _ = require('underscore')
  , request = require('request')
  , async = require('async');

var app = express();

AWS.config.update({
  region: 'us-west-1'
, accessKeyId: 'AKIAI3F7NZ7YOD57XO7Q'
, secretAccessKey: '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'
});

var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get('/', routes.index);

app.get('/cats',function(req,res){
  request('http://api.shopstyle.com/api/v2/categories?pid=uid1444-23870038-13&', function (error, response, body) {
    var dict = JSON.parse(body);
    var tree = {name:'shopstyle',children:[]};
    var all = [];
    _.each(dict.categories, function(category){
      var pair = {name:category.id, parent:category.parentId, children:[]};
      tree.children.push(pair);
      all.push(pair);
    });
    for(var i=0;i<all.length;i++){
      var v = all[i];
      for(var j=0;j<all.length;j++){
        var u = all[j];
        if(u.parent === v.name){
          v.children.push(u);
          tree.children.splice(j,1);
        }
      }
    }
    res.json(tree);
  });
});

app.put('/users',function(req,res){
  var params = {Item:req.body,TableName:'users'};
  dynamodb.putItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.get('/users/:id',function(req,res){
  var params = {Key:{id:{S:req.params.id}},TableName:'users'};
  dynamodb.getItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.get('/users',function(req,res){
  var params = {TableName:'users',AttributesToGet:['id']};
  dynamodb.scan(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.post('/users/:id',function(req,res){
  var params = {Key:{id:{S:req.params.id}},TableName:'users',AttributeUpdates:req.body};
  console.log(params);
  dynamodb.updateItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.delete('/users/:id',function(req,res){
  var params = {Key:{id:{S:req.params.id}},TableName:'users'};
  dynamodb.deleteItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.put('/items/:gender/',function(req,res){
  var tableName = 'items_'+req.params.gender
  console.log(tableName);
  var params = {Item:req.body,TableName:'items_'+req.params.gender};
  dynamodb.putItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.get('/items/:gender/:id',function(req,res){
  var params = {Key:{id:{S:req.params.id}},TableName:'items_'+req.params.gender};
  dynamodb.getItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.get('/items/:gender/',function(req,res){
  var result = {Count:0,Items:[],ScannedCount:0};
  var params = {
    TableName:'items_'+req.params.gender, 
    AttributesToGet:['id'],
  };
  async.doWhilst(
    function (callback) {
      dynamodb.scan(params, function(err, data) {
        if (err){
          console.log(err, err.stack);
          callback(err);
        }else{
          result.Count += data.Count;
          result.Items.push.apply(result.Items, data.Items);
          result.ScannedCount += data.ScannedCount;
          params.ExclusiveStartKey = data.LastEvaluatedKey;
          callback();
        }
      });
    },
    function () {
      return params.ExclusiveStartKey;
    },
    function (err) {
        res.json(result);
    }
  );
});

app.post('/items/:gender/:id',function(req,res){
  var params = {Key:{id:{S:req.params.id}},TableName:'items_'+req.params.gender,AttributeUpdates:req.body};
  console.log(params);
  dynamodb.updateItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.delete('/items/:gender/:id',function(req,res){
  var params = {Key:{id:{S:req.params.id}},TableName:'items_'+req.params.gender};
  dynamodb.deleteItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.put('/lists/users/',function(req,res){
  var params = {Item:req.body,TableName:'lists.users'};
  dynamodb.putItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.get('/lists/users/:lid/:uid',function(req,res){
  var params = {Key:{lid:{S:req.params.lid},uid:{S:req.params.uid}},TableName:'lists.users'};
  dynamodb.getItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.get('/lists/users/:lid',function(req,res){
  var params = {
    KeyConditions:{
      lid:{
        ComparisonOperator:'EQ'
      , AttributeValueList:[
          {S:req.params.lid}
        ]
      }
    }
  , AttributesToGet: ['uid']
  , TableName:'lists.users'
  };
  dynamodb.query(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.get('/lists/users/',function(req,res){
  var params = {TableName:'lists.users',AttributesToGet:['lid','uid']};
  dynamodb.scan(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.delete('/lists/users/:lid/:uid',function(req,res){
  var params = {Key:{lid:{S:req.params.lid},uid:{S:req.params.uid}},TableName:'lists.users'};
  dynamodb.deleteItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.put('/lists/items/',function(req,res){
  var params = {Item:req.body,TableName:'lists.items'};
  dynamodb.putItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.get('/lists/items/:lid/:iid',function(req,res){
  var params = {Key:{lid:{S:req.params.lid},iid:{S:req.params.iid}},TableName:'lists.items'};
  dynamodb.getItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.get('/lists/items/:lid',function(req,res){
  var params = {
    KeyConditions:{
      lid:{
        ComparisonOperator:'EQ'
      , AttributeValueList:[
          {S:req.params.lid}
        ]
      }
    }
  , AttributesToGet: ['iid']
  , TableName:'lists.items'
  };
  dynamodb.query(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.get('/lists/items/',function(req,res){
  var params = {TableName:'lists.items',AttributesToGet:['lid','iid']};
  dynamodb.scan(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.delete('/lists/items/:lid/:iid',function(req,res){
  var params = {Key:{lid:{S:req.params.lid},iid:{S:req.params.iid}},TableName:'lists.items'};
  dynamodb.deleteItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
