
module.exports = function(server, app) {
    
    const fs = require('fs')
    const sharp = require('sharp')
    const { v4: uuidv4 } = require('uuid')
    const auth = require('../../helpers/auth')
    const db = require('../../helpers/db')

    server.get('/profile', auth.isAuthorized, (req, res) => {
        app.render(req, res, req.path, { user: req.user });
    })
    server.post('/profileName', auth.isAuthorized, async (req, res) => {
        const {firstName, lastName} = req.body
        await db('users').update({firstName, lastName}).where({id: req.user.id})
        res.json({firstName, lastName, success: true})
    })
    server.post('/profileImage', auth.isAuthorized, async (req, res) => {
        const {image, name, type} = req.body
        const imageBase64Data = image.replace(new RegExp(`^data:${type};base64,`), '');
    
        const imageNamePrefix = uuidv4()
        const imageName = `${imageNamePrefix}.webp`
        const imageUrl = `img/${imageName}`
        
        const imageBuffer = Buffer.from(imageBase64Data, 'base64')
        const info = await sharp(imageBuffer).webp({ lossless: true }).toFile(`public/${imageUrl}`)
        // create chat img 100x100
        const chatImageName = `${imageNamePrefix}-chat.webp`
        const infoChat = await sharp(`public/${imageUrl}`).resize(100).toFile(`public/img/${chatImageName}`) // resize & save
    
        await db('users').update({profilePicture: imageName, chatPicture: chatImageName}).where({id: req.user.id})
        // delete old picture if it exists
        if(req.user.profilePicture != null && req.user.profilePicture != '' && fs.existsSync(`public/img/${req.user.profilePicture}`)) {
            fs.unlinkSync(`public/img/${req.user.profilePicture}`)
        }
        if(req.user.chatPicture != null && req.user.chatPicture != '' && fs.existsSync(`public/img/${req.user.chatPicture}`)) {
            fs.unlinkSync(`public/img/${req.user.chatPicture}`)
        }
        res.json({imageName, success: true})
    })
}