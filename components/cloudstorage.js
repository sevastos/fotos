
var cloudstorage = {};

exports = module.exports = cloudstorage;

cloudstorage.app = function(req, res) {
  // prep headers
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET'
  });

  switch(req.method) {
    case 'GET':

    break;
    case 'POST':

    break;
    default:

    break;
  }
  res.send('hello');
};
