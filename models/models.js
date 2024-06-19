import db from "../connection";
const mongoose = require('mongoose')
const { Schema } = mongoose

const StockSchema = new Schema({
    stock: { type: String, required: true },
    likes: { type: Number, required: true }
})

const IPSchema = new Schema({
    ip: { type: String, required: true }
})

const Stock = mongoose.model("Stock", StockSchema)
const IP = mongoose.model('IP', IPSchema)

exports.Stock = Stock
exports.IP = IP