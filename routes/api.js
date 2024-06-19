'use strict';

module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(function (req, res){
      let { stock, like } = req.query

      
    });
    
};
