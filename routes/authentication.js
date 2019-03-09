let express = require('express')
let router = express.Router()
let crypto = require('crypto')
let passport = require('passport')
let LocalStrategy = require('passport-local').Strategy
let CronJob = require('cron').CronJob


let User = require('../models/user')

function getToken(callback) {
  crypto.randomBytes(20, function(err, buf) {
    let token = buf.toString('hex')
    callback(token)
  })
}

router.get('/login', (req, res) => {
  res.render('login')
})

router.get('/signup', (req, res) => {
  res.render('signup')
})

router.post('/signup', (req, res) => {
  let b = req.body

  User.getUserByUsername(b.username, (err, user) => {
    if (err) return handleError(err)
    if (user !== null) {
      res.send(JSON.stringify({ valid: false, error: 'Username taken.', inputName: 'username' }))
    } else {
      User.getUserByEmail(b.email, (err, user) => {
        if (err) return handleError(err)
        if (user !== null) {
          res.send(JSON.stringify({ valid: false, error: 'Email taken.', inputName: 'email' }))
        } else {
          getToken((token) => {
            

            let user = new User({
              username: b.username,
              email: b.email,
              password: b.password,
              confirmed: false,
              accountConfirmation: {
                token: token,
                expires: Date.now() + 604800000, // 7 days : 604800000
              },
            })
            User.createUser(user, (err) => {
              if (err) return handleError(err)
  
  
              req.flash('success', 'You created an account and can now log in.')
              res.send(JSON.stringify({ valid: true, error: null, inputName: null }))
            })
          })
        }
      })
    }
  })
})

// RUN EVERY HOUR '0 0 * * * *'
new CronJob('0 * * * * *', function() {
  User.find({ confirmed: false }, (err, docs) => {
    if (err) return handleError(err)

    let length = docs.length
    for (let i =0;i<length;i++) {
      if (new Date(docs[0].accountConfirmation.expires).getTime() < Date.now()) {
        User.deleteOne({ username: docs[i].username }, (err) => {
          if (err) return handleError(err)
        })
      }
    }
  })
}, null, true, 'America/Los_Angeles')

passport.use(new LocalStrategy(function(username, password, done) {
  User.getUserByUsername(username.trim(), function(err, user) {
    if (err) throw err
    if (!user) {
      return done(null, !1, {
        message: 'Unknown username'
      })
    }
    User.comparePassword(password, user.password, function(err, isMatch) {
      if (err) throw err
      if (isMatch) {
        return done(null, user)
      } else {
        return done(null, !1, {
          message: 'Wrong password'
        })
      }
    })
  })
}))
passport.serializeUser(function(user, done) {
  done(null, user.id)
})
passport.deserializeUser(function(id, done) {
  User.getUserById(id, function(err, user) {
    done(err, user)
  })
})

module.exports = router
