
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
  res.header('Access-Control-Allow-Origin', '*/*');
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
  console.log(__line);
  var params = {Item:req.body,TableName:'users'};
  params.Item.date = {S:(new Date()).toISOString()};
  dynamodb.putItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.get('/users/:id',function(req,res){
  console.log(__line);
  var params = {Key:{id:{S:req.params.id}},TableName:'users'};
  dynamodb.getItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.get('/users',function(req,res){
  console.log(__line);
  var params = {TableName:'users',AttributesToGet:['id']};
  dynamodb.scan(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.post('/users/:id',function(req,res){
  console.log(__line);
  var params = {Key:{id:{S:req.params.id}},TableName:'users',AttributeUpdates:req.body};
  dynamodb.updateItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.delete('/users/:id',function(req,res){
  console.log(__line);
  var params = {Key:{id:{S:req.params.id}},TableName:'users'};
  dynamodb.deleteItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.put('/items/',function(req,res){
  console.log(__line);
  var params = {Item:req.body,TableName:'items'};
  params.Item.date = {S:(new Date()).toISOString()};
  dynamodb.putItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.get('/items/:id',function(req,res){
  console.log(__line);
  var params = {Key:{id:{S:req.params.id}},TableName:'items'};
  dynamodb.getItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.get('/items/',function(req,res){
  console.log(__line);
  var result = {Count:0,Items:[],ScannedCount:0};
  var params = {
    TableName:'items', 
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

app.post('/items/:id',function(req,res){
  console.log(__line);
  var params = {Key:{id:{S:req.params.id}},TableName:'items',AttributeUpdates:req.body};
  dynamodb.updateItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.delete('/items/:id',function(req,res){
  console.log(__line);
  var params = {Key:{id:{S:req.params.id}},TableName:'items'};
  dynamodb.deleteItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.put('/lists.users/',function(req,res){
  console.log(__line);
  var params = {Item:req.body,TableName:'lists.users'};
  params.Item.date = {S:(new Date()).toISOString()};
  dynamodb.putItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.get('/lists.users/:lid/:uid',function(req,res){
  console.log(__line);
  var params = {Key:{lid:{S:req.params.lid},uid:{S:req.params.uid}},TableName:'lists.users'};
  dynamodb.getItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.get('/lists.users/:lid',function(req,res){
  console.log(__line);
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

app.get('/lists.users/',function(req,res){
  console.log(__line);
  var params = {TableName:'lists.users',AttributesToGet:['lid','uid']};
  dynamodb.scan(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.delete('/lists.users/:lid/:uid',function(req,res){
  console.log(__line);
  var params = {Key:{lid:{S:req.params.lid},uid:{S:req.params.uid}},TableName:'lists.users'};
  dynamodb.deleteItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.put('/lists.items/',function(req,res){
  console.log(__line);
  var params = {Item:req.body,TableName:'lists.items'};
  params.Item.date = {S:(new Date()).toISOString()};
  dynamodb.putItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.get('/lists.items/:lid/:iid',function(req,res){
  console.log(__line);
  var params = {Key:{lid:{S:req.params.lid},iid:{S:req.params.iid}},TableName:'lists.items'};
  dynamodb.getItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.get('/lists.items/:lid',function(req,res){
  console.log(__line);
  var result = {Count:0,Items:[],ScannedCount:0};
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
  async.doWhilst(
    function (callback) {
      dynamodb.query(params,function(err,data){
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

app.get('/lists.items/',function(req,res){
  console.log(__line);
  var params = {TableName:'lists.items',AttributesToGet:['lid','iid']};
  dynamodb.scan(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.delete('/lists.items/:lid/:iid',function(req,res){
  console.log(__line);
  var params = {Key:{lid:{S:req.params.lid},iid:{S:req.params.iid}},TableName:'lists.items'};
  dynamodb.deleteItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.post('/items.users/:iid/:uid',function(req,res){
  console.log(__line);
  var params = {Key:{iid:{S:req.params.iid},uid:{S:req.params.uid}},AttributeUpdates:req.body,TableName:'items.users'};
  params.AttributeUpdates.date = {Action:'PUT', Value:{S:(new Date()).toISOString()}};
  dynamodb.updateItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.get('/items.users/:iid/:uid',function(req,res){
  console.log(__line);
  var params = {Key:{iid:{S:req.params.iid},uid:{S:req.params.uid}},TableName:'items.users'};
  dynamodb.getItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.get('/items.users/:iid',function(req,res){
  console.log(__line);
  var params = {
    KeyConditions:{
      iid:{
        ComparisonOperator:'EQ'
      , AttributeValueList:[
          {S:req.params.iid}
        ]
      }
    }
  , TableName:'items.users'
  };
  dynamodb.query(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.get('/items.users/',function(req,res){
  console.log(__line);
  var params = {TableName:'items.users'};
  dynamodb.scan(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.delete('/items.users/:iid/:uid',function(req,res){
  console.log(__line);
  var params = {Key:{iid:{S:req.params.iid},uid:{S:req.params.uid}},TableName:'items.users'};
  dynamodb.deleteItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.post('/users.items/:uid/:iid',function(req,res){
  console.log(__line);
  var params = {Key:{uid:{S:req.params.uid},iid:{S:req.params.iid}},AttributeUpdates:req.body,TableName:'users.items'};
  params.AttributeUpdates.date = {Action:'PUT', Value:{S:(new Date()).toISOString()}};
  dynamodb.updateItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.get('/users.items/:uid/:iid',function(req,res){
  console.log(__line);
  var params = {Key:{uid:{S:req.params.uid},iid:{S:req.params.iid}},TableName:'users.items'};
  dynamodb.getItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.get('/users.items/:uid',function(req,res){
  console.log(__line);
  var params = {
    KeyConditions:{
      uid:{
        ComparisonOperator:'EQ'
      , AttributeValueList:[
          {S:req.params.uid}
        ]
      }
    }
  , TableName:'users.items'
  };
  dynamodb.query(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.get('/users.items/',function(req,res){
  console.log(__line);
  var params = {TableName:'users.items'};
  dynamodb.scan(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

app.delete('/users.items/:uid/:iid',function(req,res){
  console.log(__line);
  var params = {Key:{uid:{S:req.params.uid},iid:{S:req.params.iid}},TableName:'users.items'};
  dynamodb.deleteItem(params,function(err,data){
    if(err)console.log(err);
    else res.json(data);
  });
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

Object.defineProperty(global, '__stack', {
  get: function(){
    var orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function(_, stack){ return stack; };
    var err = new Error;
    Error.captureStackTrace(err, arguments.callee);
    var stack = err.stack;
    Error.prepareStackTrace = orig;
    return stack;
  }
});

Object.defineProperty(global, '__line', {
  get: function(){
    return __stack[1].getLineNumber();
  }
});

