
module.exports = function(server, app, passport) {

    const {body, validationResult} = require('express-validator')
    const bcrypt = require('bcrypt')
    const saltRounds = 10
    const db = require('../../helpers/db')

    server.post('/register', [
        // username must be at least 5 chars long and unique
        body('username', 'Username must be at least 5 chars long and unique').isLength({
            min: 5
        }),
        body('username').custom(async value => {
            user = await db.select('username').from('users').where('username', '=', value).first()
            if (user) {
                throw new Error('Username already exists')
            }
            // Indicates the success of this synchronous custom validator
            return true;
        }),
        // username must be an email
        body('email', 'Invalid Email').isEmail(),
        body('email').custom(async value => {
            user = await db.select('email').from('users').where('email', '=', value).first()
            if (user) {
                throw new Error('Email already exists')
            }
            // Indicates the success of this synchronous custom validator
            return true;
        }),
        body('password', 'Password must be at least 5 chars long and unique').isLength({
            min: 5
        }),
        body('password').custom((value, {req}) => {
            if(value != req.body.confirmPassword) {
                throw new Error('Password confirmation does not match password')
            }
            return true
        })
    ], async (req, res) => {
        // Finds the validation errors in this request and wraps them in an object with handy functions
        const errors = validationResult(req)
    
        if (!errors.isEmpty()) {
            return app.render(req, res, req.path, {
                errors: errors.mapped(), 
                data: req.body
            })
        }
    
        // save user in the database
        let {username, email, password, firstName, lastName, sex} = req.body
    
        // Save user in DB.
        await db('users').insert({
            username,
            email,
            password: bcrypt.hashSync(password, saltRounds),
            firstName,
            lastName,
            profilePicture: null,
            chatPicture: null,
            sex
        })
    
        passport.authenticate('local')(req, res, () => {
            res.redirect('/profile')
        })
    })
    server.post('/login', (req, res, next) => {
    
        passport.authenticate('local', (err, user, info) => {
            if (info) {
                return app.render(req, res, req.path, {msg: info.message})
            }
            if (err) {
                return next(err)
            }
            if (!user) {
                return res.redirect('/login')
            }
    
            req.login(user, (err) => {
                if (err) {
                    return next(err)
                }
                return res.redirect('/chat')
            })
        })(req, res, next)
    })
}