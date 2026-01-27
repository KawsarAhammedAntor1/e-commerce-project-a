const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userModel'); // Ensure this path is correct based on folder structure
const crypto = require('crypto');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists
            let user = await User.findOne({ email: profile.emails[0].value });

            if (user) {
                return done(null, user);
            }

            // If not, create a new user
            // Password is required by schema, so we generate a random secure one
            const randomPassword = crypto.randomBytes(16).toString('hex');

            user = await User.create({
                name: profile.displayName,
                email: profile.emails[0].value,
                password: randomPassword,
                profilePic: profile.photos[0].value,
                role: 'user' // Default role
            });

            return done(null, user);
        } catch (err) {
            return done(err, false);
        }
    }));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});
