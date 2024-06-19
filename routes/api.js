'use strict';
const Stock = require('../models/models').Stock
const IP = require('../models/models').IP
const bcrypt = require('bcrypt')

module.exports = function (app) {

  const hashIP = (ip) => {
    const salt = "$2b$04$QhABBJmDzxdeTxTtgMJABe";
    return bcrypt.hashSync(ip, salt); 
  }

  let dataPrice = []
  let currentLikes = []

  const setPrice = (d) => {
    dataPrice.push(d['latestPrice'])
  }

  const fetchPrice = async (sym) => {
    base_url = 'https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/'
    await fetch(base_url + sym + "/quote")
      .then(response => response.json())
      .then(data => setPrice(data))
      .catch(err => console.error('Error Occured'))
  }

  app.route('/api/stock-prices')
  .get(async (req, res) => {
    let { s, l } = req.query

    if(s){
      let results = []
      if(typeof(s) == "string"){
        s = [s]
      } else if (s.length > 2){
        return res.json({error: "Maximum of two stocks can be accepted"})
      }

      }

      if(s.length == 2){
        s.forEach(async (elem, ind) => {
          fetchPrice(elem)
          try {
            const stock = await Stock.findOne({ symbol: s })
            currentLikes.push(Number(stock.likes))
            results.push({ "stockData": { "stock": stock, "price": Number(dataPrice[ind]), "rel_likes": Number(stock.likes) } })
          } catch(err) {
            res.send('Stock Not Found: Invalid Symbol')
          }
  
        })

        const likesDiff = results[0]["stockData"]["rel_likes"] - results[1]["stockData"]["rel_likes"]
        results[0]["stockData"]["rel_likes"] = likesDiff
        results[1]["stockData"]["rel_likes"] = -likesDiff
        
      } else {
        s.forEach(async (elem, ind) => {
          fetchPrice(elem)
          try {
            const stock = await Stock.findOne({ symbol: s })
            results.push({ "stockData": { "stock": stock, "price": Number(dataPrice[ind]), "likes": Number(stock.likes) } })
          } catch(err) {
            res.send('Stock Not Found: Invalid Symbol')
          }
  
        })
      }

      if(l){
        const ip = hashIP(req.ip)
        let confirm = IP.findOne({ ip: ip })
        if (!confirm) {
          if(results.length == 1){
            results[0]["stockData"]["likes"] = results[0]["stockData"]["likes"] + 1
            const newIP = new IP({ ip })
            const stock = await Stock.findOneAndUpdate({ symbol: s }, { likes: results[0]["stockData"]["likes"] })
            try {
              let ipSend = await newIP.save()
            } catch(err){
              res.send('Error')
            }
          } else if(results.length == 2) {
            results.forEach(async (elem, ind) => {
              const stock = await Stock.findOneAndUpdate({ symbol: s }, { likes: (currentLikes[ind] + 1) })
            })
          }
        }
      }

      return res.json(results)
  })
    


    
};
