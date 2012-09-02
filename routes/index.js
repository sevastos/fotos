var express = require('express')
  , app = express();

/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', {
    title: 'Express',
    production: 'production' == app.get('env')
  });
};