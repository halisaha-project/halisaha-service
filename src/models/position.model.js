const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PositionSchema = new Schema({
    positionName: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    }
}, { collection: 'positions', timestamps: true });

const Position = mongoose.model('Position', PositionSchema);

module.exports = Position;
