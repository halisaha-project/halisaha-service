const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VotingSchema = new Schema({
    matchId: {
        type: Schema.Types.ObjectId,
        ref: 'Match',
        required: true
    },
    votes: [{
        voterId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        votedUserId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 10
        }
    }]
}, { collection: 'votings', timestamps: true });

const Voting = mongoose.model('Voting', VotingSchema);

module.exports = Voting;
