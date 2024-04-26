const mongoose = require('mongoose');


mongoose.connect('mongodb://127.0.0.1:27017/halisaha')
    .then(() => {
        console.log("Database connection is successful.");
    })
    .catch((error) => {
        console.error("Database connection error:", error);
    });
