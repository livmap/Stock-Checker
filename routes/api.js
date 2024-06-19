'use strict';
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const XMLHttpRequest = require('xhr2');
const API_URL = "https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/"
require('dotenv').config()

mongoose.connect(process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true});


const {Schema} = mongoose;
const stockSchema = new Schema ({
  stock: {type: String, required: true},
  likes: [String]
})
const Stock = mongoose.model("Stock", stockSchema);


const hashIP = (ip) => {
  const salt = "$2b$04$QhABBJmDzxdeTxTtgMJABe";
  return bcrypt.hashSync(ip, salt); 
}

function getStockData(item) {
  return new Promise( function (res,rej) {
    const stockreq = new XMLHttpRequest();
    stockreq.open('GET',`${API_URL}${item}/quote`, true);
    stockreq.onload = function () {
      if (stockreq.status >= 200 && stockreq.status < 300) {
        res(JSON.parse(stockreq.responseText));
      } else {
        res(stockreq.status + " - API didn't respond.");
      }
    }
    stockreq.send()
  });
}

 
async function clearLikes(stock1, stock2, ip) {
  const hash = hashIP(ip);
  console.log("\nClearing likes from test stocks for local IP...\n");

  const stockLikes1 = await Stock.findOne({stock: stock1});
  const stockLikes2 = await Stock.findOne({stock: stock2});

  if (stockLikes1 && stockLikes2) {
    stockLikes1.likes = stockLikes1.likes.filter( item => item != hash );
    stockLikes2.likes = stockLikes2.likes.filter( item => item != hash );
    await stockLikes1.save();
    await stockLikes2.save();
  }

}


module.exports = {routes: function (app) {
  
  
  app.route('/api/stock-prices')
    .get( async function (req, res) {


      let {stock, like} = req.query;
     
      if (stock) {
        let results = [];  

       
        if (typeof(stock) == "string") {
          stock = [stock];
        } else if (stock.length > 2) { 
          return res.json({error: "Maximum of two stocks can be accepted"})
        }
        
        try {

          
          for await (const item of stock) {
                      

            const apiData = await getStockData(item);
            
            let mystock = {stock: apiData.symbol, price: apiData.latestPrice};

            if (mystock.stock) {
      
              let stockLikes = await Stock.findOne({stock: mystock.stock});

    
              if (!stockLikes) {
                stockLikes = new Stock({stock: mystock.stock, likes: []});
                stockLikes = await stockLikes.save();
              }

            
              if (like) {
       
                const myIP = hashIP(req.ip)
                
                if (!stockLikes.likes.includes(myIP)) {
                  stockLikes.likes.push(myIP);
                  stockLikes.save();
                }
              }

              mystock['likes'] = stockLikes.likes.length;
            } else {
              mystock = {stock: item, price: "Not Found", likes: 0}
            }
            
            results.push(mystock)
          }
        } catch (error) {
          console.log("Error: " + error);
        }

        if (results.length > 1) {

          results[0]['rel_likes'] = results[0].likes - results[1].likes;
          results[1]['rel_likes'] = -results[0].rel_likes;
          for (let x in results) {delete results[x]["likes"]}

          return res.json({stockData: results})
 
        } else {
          return res.json({stockData: results[0]})
        }
 
      } else {
        return res.json({error: "You must supply at least one stock for retrieval."})
      }

      return res.json({error: "Unknown error occurred"})
    });
}, clearLikes};