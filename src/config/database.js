const mongoose = require('mongoose');

mongoose.connect(process.env.DB_URL)
    .then(() => {
        console.log("Database connection is successful.");
    })
    .catch((error) => {
        console.error("Database connection error:", error);
    });
