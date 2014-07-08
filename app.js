
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
  , request = require('request');

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

app.get('/', routes.index);
app.get('/users', user.list);
app.get('/import', function(req,res){
  console.log('importing');
  var count = 0;
  for(var i=0;i<1355844/50;i++){
    if(i*50 > 10000)break;
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

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
