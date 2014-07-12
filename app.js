
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

app.get('/import', function(req,res){
  console.log('importing');
  var count = 0;
  for(var i=0;i<1355844/50;i++){
    if(i*50 > 100)break;
    request('http://api.shopstyle.com/api/v2/products?pid=uid1444-23870038-13&offset='+ i*50 +'&limit=50&', function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var dict =JSON.parse(body);
        for(var j=0;j<dict.products.length;j++){
          var p = dict.products[j];
          if(typeof p.brand != 'undefined' && typeof p.retailer != 'undefined'){
            console.log(count,p.id, p.brand.name,p.retailer.name);
            count++;
            var params = {
              Item: { // required
                id: {
                  S: p.id + '',
                },
                name: {
                  S: p.name
                },
                brandedName:{
                  S: p.brandedName
                },
                unbrandedName:{
                  S: p.unbrandedName
                },
                brand:{
                  S: p.brand.id + ''
                },
                description:{
                  S: p.description
                },
                currency:{
                  S: p.currency
                },
                priceLabel:{
                  S: p.priceLabel
                },
                inStock:{
                  S: p.inStock + ''
                },
                retailer:{
                  S: p.retailer.id + ''
                },
                imageMediumURL:{
                  S: p.image.sizes.Medium.url
                },
                imageOriginalURL:{
                  S: p.image.sizes.Original.url
                },
                clickUrl:{
                  S: p.clickUrl
                },
                pageUrl:{
                  S: p.pageUrl
                },
                price:{
                  N: p.price + ''
                }
              },
              TableName: 'items',
              ReturnConsumedCapacity: 'TOTAL',
              ReturnItemCollectionMetrics: 'SIZE',
            };
            dynamodb.putItem(params, function(err, data) {
              if (err) console.log(err, err.stack); // an error occurred
              // else console.log('put');
            });
          }else{
            var params = {
              Key: { // required
                id: {
                  S: p.id + '',
                },
              },
              TableName: 'items',
              ReturnConsumedCapacity: 'TOTAL',
              ReturnItemCollectionMetrics: 'SIZE',
            };
            dynamodb.deleteItem(params, function(err, data) {
              if (err) console.log(err, err.stack); // an error occurred
              // else     console.log('delete');           // successful response
            });
          }
        }
      }
    });
  }
});

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

app.get('/scan', function(req,res){
  var params = {
    TableName: 'items', // required
    Limit: 100,
    Select: 'ALL_ATTRIBUTES'
  };
  dynamodb.scan(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else res.json(data);           // successful response
  });
});

app.get('/itemsCount',function(req,res){
  var count = 0;
  var params = {
    TableName: 'items', // required
    AttributesToGet:['id']
  };

  async.whilst(
      function () { return true; },
      function (callback) {
        dynamodb.scan(params, function(err, data) {
          if (err){
            console.log(err, err.stack);
            callback(err);
          }else{
            console.log(data.ScannedCount);
            params.ExclusiveStartKey = data.LastEvaluatedKey;
            _.each(data.Items, function(item){
              var params = {
                Key: item,
                TableName: 'items',
              };
              dynamodb.deleteItem(params, function(err, data) {
                if(err)console.log(err);
              });
            });
            callback();
          }
        });
      },
      function (err) {}
  );
});

app.get('/itemsDelete',function(req,res){
  var count = -1;
  var sum = 0;
  var params = { TableName: 'items', AttributesToGet: ['id']};
  async.whilst(
    function () { return count !==0; },
    function (callback) {
      dynamodb.scan(params, function(err, data) {
        if (err){
          console.log(err, err.stack);
          callback(err);
        }else{
          console.log(data);
          count = data.Count;
          sum += count;
          params.ExclusiveStartKey = data.LastEvaluatedKey;
          _.each(data.Items, function(item){
            var params = {
              Key: item,
              TableName: 'items',
            };
            dynamodb.deleteItem(params, function(err, data) {
              if(err)console.log(err);
            });
          });
          callback();
        }
      });
    },
    function (err) {
      res.send(count + ' items deleted');
    }
  );
});

app.put('/users',function(req,res){
  var params = {Item:req.body,TableName:'users'};
  dynamodb.putItem(params,function(err,data){
    if(err)res.json(err);
    else res.json(data);
  });
});

app.get('/users/:id',function(req,res){
  var params = {Key:{id:{S:req.params.id}},TableName:'users'};
  dynamodb.getItem(params,function(err,data){
    if(err)res.json(err);
    else res.json(data);
  });
});

app.get('/users',function(req,res){
  var params = {TableName:'users',AttributesToGet:['id']};
  dynamodb.scan(params,function(err,data){
    if(err)res.json(err);
    else res.json(data);
  });
});

app.post('/users/:id',function(req,res){
  var params = {Key:{id:{S:req.params.id}},TableName:'users',AttributeUpdates:req.body};
  console.log(params);
  dynamodb.updateItem(params,function(err,data){
    if(err)res.json(err);
    else res.json(data);
  });
});

app.delete('/users/:id',function(req,res){
  var params = {Key:{id:{S:req.params.id}},TableName:'users'};
  dynamodb.deleteItem(params,function(err,data){
    if(err)res.json(err);
    else res.json(data);
  });
});

app.put('/items',function(req,res){
  var params = {Item:req.body,TableName:'items'};
  dynamodb.putItem(params,function(err,data){
    if(err)res.json(err);
    else res.json(data);
  });
});

app.get('/items/:id',function(req,res){
  var params = {Key:{id:{S:req.params.id}},TableName:'items'};
  console.log(params);
  dynamodb.getItem(params,function(err,data){
    if(err)res.json(err);
    else res.json(data);
  });
});

app.get('/items',function(req,res){
  var params = {TableName:'items',AttributesToGet:['id']};
  dynamodb.scan(params,function(err,data){
    if(err)res.json(err);
    else res.json(data);
  });
});

app.post('/items/:id',function(req,res){
  var params = {Key:{id:{S:req.params.id}},TableName:'items',AttributeUpdates:req.body};
  console.log(params);
  dynamodb.updateItem(params,function(err,data){
    if(err)res.json(err);
    else res.json(data);
  });
});

app.delete('/items/:id',function(req,res){
  var params = {Key:{id:{S:req.params.id}},TableName:'items'};
  dynamodb.deleteItem(params,function(err,data){
    if(err)res.json(err);
    else res.json(data);
  });
});

app.put('/lists',function(req,res){
  var params = {Item:req.body,TableName:'lists'};
  dynamodb.putItem(params,function(err,data){
    if(err)res.json(err);
    else res.json(data);
  });
});

app.get('/lists/:id',function(req,res){
  var params = {Key:{id:{S:req.params.id}},TableName:'lists'};
  dynamodb.getItem(params,function(err,data){
    if(err)res.json(err);
    else res.json(data);
  });
});

app.get('/lists',function(req,res){
  var params = {TableName:'lists',AttributesToGet:['id']};
  dynamodb.scan(params,function(err,data){
    if(err)res.json(err);
    else res.json(data);
  });
});

app.post('/lists/:id',function(req,res){
  var params = {Key:{id:{S:req.params.id}},TableName:'lists',AttributeUpdates:req.body};
  console.log(params);
  dynamodb.updateItem(params,function(err,data){
    if(err)res.json(err);
    else res.json(data);
  });
});

app.delete('/lists/:id',function(req,res){
  var params = {Key:{id:{S:req.params.id}},TableName:'lists'};
  dynamodb.deleteItem(params,function(err,data){
    if(err)res.json(err);
    else res.json(data);
  });
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
