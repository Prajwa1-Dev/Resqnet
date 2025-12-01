// Filename: config/passport.js

const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// This line is the key: we are exporting a function.
module.exports = function(passport) {
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
      // Match User
      User.findOne({ email: email.toLowerCase() })
        .then(user => {
          if (!user) {
            return done(null, false, { message: 'That email is not registered' });
          }

          // Match password using bcrypt
          bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) throw err;
            if (isMatch) {
              return done(null, user);
            } else {
              return done(null, false, { message: 'Password incorrect' });
            }
          });
        })
        .catch(err => console.log(err));
    })
  );

  // This saves the user's ID to the session cookie
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // This retrieves the user's details from the database using the ID from the session cookie
 
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
};