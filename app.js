
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , cloudstorage = require('./components/cloudstorage');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 8080);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());

  app.use(express.static(path.join(__dirname, 'assets')));
/**
 * Not ready for less yet... @media queries need to be refactored
 *
 *
  app.use(require('less-middleware')({
    src: __dirname + '/assets',
    compress: true,
    dest: __dirname + 'assets',
    once: true,
    debug: true
  }));*/

  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/cloudstorage', cloudstorage.app);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
