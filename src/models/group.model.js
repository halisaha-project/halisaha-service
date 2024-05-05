const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GroupSchema = new Schema({
    groupName: {
        type: String,
        required: true,
        trim: true
    },
    members: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        shirtNumber: {
            type: Number
        },
        position: {
            type: String,
            required: true
        }
    }],
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    createdDate: {
        type: Date,
        default: Date.now
    }
}, { collection: 'groups', timestamps: true });

const Group = mongoose.model('Group', GroupSchema);

module.exports = Group;