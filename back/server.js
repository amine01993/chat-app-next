// require('../helpers/configs')

const express = require('express')
const server = express()
const next = require('next')
    
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const http = require('http').createServer(server)
const io = require('socket.io')(http)
const { v4: uuidv4 } = require('uuid')
const db = require('../helpers/db')

async function getChannels(current_user) {

    const definedChannels = await db.raw(
        `SELECT ch_u.channel_uuid, ch_m.body, ch_m.sender_id, ch_m.created_at, ch_u.users, COALESCE(ch_stat.unread_count, 0) AS unread_count
        FROM (
            SELECT cu.channel_uuid,
                json_agg(json_build_object(
                    'user_id', cu.user_id, 'username', u.username, 'chatPicture', u."chatPicture", 'sex', u.sex,
                    'lastConnection', u."lastConnection"
                ) ORDER BY u."lastConnection" DESC NULLS LAST) users 
            FROM channel_user AS cu
            INNER JOIN users AS u ON u.id = cu.user_id
            GROUP BY cu.channel_uuid
            HAVING ${current_user.user_id} = ANY(array_agg(cu.user_id))
        ) AS ch_u
        LEFT JOIN (
            SELECT m1.channel_uuid, m1.body, m1.sender_id, m1.created_at
            FROM messages m1
            INNER JOIN (
                SELECT channel_uuid, MAX(created_at) AS created_at
                FROM messages
                GROUP BY channel_uuid
            ) m2 ON m1.channel_uuid = m2.channel_uuid AND m1.created_at = m2.created_at
        ) ch_m ON ch_m.channel_uuid = ch_u.channel_uuid
        LEFT JOIN (
            SELECT m.channel_uuid, COUNT(*) AS unread_count
            FROM messages m
            INNER JOIN message_metadatas mm ON m.id = mm.message_id 
                                            AND mm.participant_id = ${current_user.user_id}
                                            AND mm.read_at IS NULL
            WHERE m.created_at >= (
                SELECT COALESCE(MAX(_m.created_at), m.created_at) 
                FROM messages _m
                INNER JOIN message_metadatas _mm 
                    ON _m.id = _mm.message_id 
                    AND _mm.participant_id = ${current_user.user_id} 
                    AND _mm.read_at IS NOT NULL
                WHERE _m.channel_uuid = m.channel_uuid
            )
            GROUP BY m.channel_uuid
        ) ch_stat ON ch_stat.channel_uuid = ch_u.channel_uuid
        `
    )

    const users = await db.select('id', 'username', 'chatPicture', 'sex').from('users')

    const channels = []

    // insert defined channels
    for (let i = 0; i < definedChannels.rows.length; i++) {
        const definedChannel = definedChannels.rows[i]
        channels.push({
            channel_uuid: definedChannel.channel_uuid,
            body: definedChannel.body,
            sender_id: definedChannel.sender_id,
            created_at: definedChannel.created_at,
            users: definedChannel.users,
            unread_count: definedChannel.unread_count
        })
    }

    // add other undefined channels, 
    //  which include channels between 2 users that don't exist 
    //  and the channel of connected user if not defined
    for (let i = 0; i < users.length; i++) {
        const user = users[i]
        // we assume `dc.user_ids.includes(current_user_id)` is always true, because of `having` clause
        if (user.id == current_user.user_id) {
            const index = definedChannels.rows.findIndex(dc => dc.users.length == 1)
            if (index == -1) {
                channels.push({
                    channel_uuid: `id_${uuidv4()}`,
                    body: null,
                    sender_id: null,
                    created_at: null,
                    users: [{
                        user_id: user.id,
                        username: user.username,
                        chatPicture: user.chatPicture,
                        sex: user.sex,
                    }],
                    unread_count: 0
                })
            }
        } else {
            const index = definedChannels.rows.findIndex(dc => dc.users.length == 2 && dc.users.find(u => u.user_id == user.id))
            if (index == -1) {
                channels.push({
                    channel_uuid: `id_${uuidv4()}`,
                    body: null,
                    sender_id: null,
                    created_at: null,
                    users: [{
                        user_id: user.id,
                        username: user.username,
                        chatPicture: user.chatPicture,
                        sex: user.sex,
                    }, {
                        user_id: current_user.user_id,
                        username: current_user.username,
                        chatPicture: current_user.chatPicture,
                        sex: current_user.sex,
                    }],
                    unread_count: 0
                })
            }
        }
    }

    // add connectionStatus property to each channel
    const clients = io.sockets.clients() // connected users
    channels.forEach((channel, index) => {
        Object.keys(clients.connected).forEach(socketId => {
            const socket = clients.connected[socketId]
            if (channel.users.length == 1) {
                channel.connectionStatus = true
            } else {
                const _index = channel.users.findIndex(user => {
                    return user.user_id == socket.user_id && user.user_id != current_user.user_id
                })
                if (_index > -1) {
                    channel.connectionStatus = true
                }
            }
        })
    })

    return channels
}

app.prepare().then(() => {
    const SocketIOFile = require('socket.io-file')
    const compression = require('compression')
    const path = require('path')
    const bodyParser = require('body-parser')
    const bcrypt = require('bcrypt')
    const passport = require('passport')
    const LocalStrategy = require('passport-local').Strategy
    const session = require('express-session')
    const FileStore = require('session-file-store')(session)
    const sharedsession = require("express-socket.io-session")

    const sleep = require('../helpers/sleep')
    const random = require('../helpers/random')
    const auth = require('../helpers/auth')

    server.use(compression())
    server.use(express.static(path.join(__dirname, '/public')))
    server.use(bodyParser.json({ // to support JSON-encoded bodies
        limit: '5mb',
        extended: true
    }))
    server.use(bodyParser.urlencoded({ // to support URL-encoded bodies
        extended: true
    }))
    let _session
    server.use(_session = session({
        genid: (req) => {
            return uuidv4() // use UUIDs for session IDs
        },
        store: new FileStore(),
        secret: 'keyboard cat',
        resave: false,
        saveUninitialized: true
    }))
    io.use(sharedsession(_session, {
        autoSave: true
    }))
    // configure passport.js to use the local strategy
    passport.use(new LocalStrategy({},
        async (username, password, done) => {
            try{
                // local strategy
                const user = await db.select('*').from('users').where('username', '=', username).first()
        
                if (!user) {
                    sleep.sleep(random.int(2, 5))
                    return done(null, false, { message: 'Incorrect username.' })
                }
                if (!bcrypt.compareSync(password, user.password)) {
                    sleep.sleep(random.int(2, 5))
                    return done(null, false, { message: 'Incorrect password.' })
                }
                return done(null, user)
            }
            catch(ex) {
                return done(ex)
            }
        }
    ))
    // tell passport how to serialize the user
    passport.serializeUser((user, done) => {
        done(null, {
            id: user.id,
        })
    })
    passport.deserializeUser(async ({ id }, done) => {
        const user = await db.select('*').from('users').where('id', '=', id).first()
        done(null, user)
    })
    server.use(passport.initialize())
    server.use(passport.session())

    server.get('/', (req, res) => {
        return app.render(req, res, req.path, {name: 'John Doe'})
    })
    
    require('./routes/login')(server, app, passport)
    require('./routes/profile')(server, app)

    server.get('/chat', auth.isAuthorized, (req, res) => {
        return app.render(req, res, '/chat', {id: req.user.id})
    })

    // fallback url
    server.get('*', (req, res) => {
        return handle(req, res)
    })
      
    server.listen(80, (err) => {
        if (err) throw err
        console.log('> Ready on http://localhost:80')
    })

    http.listen(81, () => {
        console.log('listening on (socket.io) *:81')
    })

    io.on('connection', async (socket) => {
        socket.user_id = socket.handshake.session.passport.user.id

        const uploader = new SocketIOFile(socket, {
            uploadDir: 'public/attachments',
            accepts: [],
            // 5 MB. default is undefined(no limit)
            maxFileSize: 5 * 1024 * 1024,
            // 10 KB. default is 10240(1KB)
            chunkSize: 10 * 1024,
            // delay of each transmission, higher value saves more cpu resources, lower upload speed. default is 0(no delay)
            transmissionDelay: 0,
            // overwrite file if exists, default is true.
            overwrite: true,
            // Function rename: Rename the file before upload starts. Return value is use for the name. This option is useful to upload file without overwriting concerns.
            rename(filename, fileInfo) {
                const file = path.parse(filename)
                return `${uuidv4()}${file.ext}`;
            }
        })
        uploader.on('start', (fileInfo) => {
            console.log('Start uploading')
            console.log(fileInfo)
        })
        uploader.on('stream', (fileInfo) => {
            console.log(`${fileInfo.wrote} / ${fileInfo.size} byte(s)`)
        })
        uploader.on('complete', async (fileInfo) => {
            console.log('Upload Complete.')
            console.log(fileInfo)
            const msgFileId = (await db('message_files').insert({
                fileName: fileInfo.name,
                originalFileName: fileInfo.originalFileName,
                type: fileInfo.mime
            }).returning('id'))[0]

            socket.emit('uploadComplete', {
                id: msgFileId,
                imageUrl: `attachments/${fileInfo.name}`,
                fileName: fileInfo.name,
                originalFileName: fileInfo.originalFileName,
                type: fileInfo.mime
            })
        })
        uploader.on('error', (err) => {
            console.log('Error!', err)
        })
        uploader.on('abort', (fileInfo) => {
            console.log('Aborted: ', fileInfo)
        })

        const currentUser = await db.select('id AS user_id', 'username', 'chatPicture', 'sex')
            .from('users').where('id', '=', socket.user_id).first()
        const channels = await getChannels(currentUser)

        socket.emit('channels', channels)

        // update last connection
        const lastConnection = (await db('users')
        .where('id', '=', socket.user_id)
        .returning('lastConnection')
        .update({
            lastConnection: db.fn.now()
        }))[0]

        socket.broadcast.emit('connectionStatusListener', {
            user_id: socket.user_id,
            connected: true,
            lastConnection
        })

        console.log('a user connected, ' + socket.user_id + ', users: ' + Object.keys(io.sockets.clients().connected).length)

        socket.on('handleMessage', async (data) => {

            // insert message
            const message = await db('messages').insert({
                body: data.value,
                sender_id: socket.handshake.session.passport.user.id,
                channel_uuid: data.channel_uuid
            }).returning(['id','created_at'])

            // update message attachment files
            let files = []
            if(data.file_ids) {
                files = await db('message_files')
                .whereIn('id', data.file_ids.split(','))
                .update({
                    message_id: message[0].id
                })
                .returning(['fileName', 'type', 'originalFileName'])
            }

            // insert metadatas
            const users = await db.select('user_id').from('channel_user').where('channel_uuid', '=', data.channel_uuid)
            users.forEach(async ({user_id}) => {
                await db('message_metadatas').insert({
                    message_id: message[0].id,
                    participant_id: user_id,
                    read_at: user_id == socket.user_id ? db.fn.now() : null
                })
            })

            const currentUser = await db.select('chatPicture', 'sex')
                .from('users').where('id', '=', socket.user_id).first()

            io.in(data.channel_uuid).emit('messageListener', {
                msg: {
                    msg_id: message[0].id,
                    msg: data.value,
                    user_id: socket.user_id,
                    chatPicture: currentUser.chatPicture,
                    sex: currentUser.sex,
                    created_at: message[0].created_at,
                    files
                },
            });
        })

        socket.on('deleteAttachment', async ({id}) => {
            const name  = (await db('message_files').where('id', id).del().returning('fileName'))[0]
            socket.emit('deletedAttachment', {id, name})
        })

        socket.on('chat', async (data) => {

            const uuid = await db.select('uuid').from('channels').where('uuid', '=', data.channel_uuid).first()
            
            let channelExist = uuid != null, channel_uuid, messages = [], users

            if (channelExist) {
                channel_uuid = data.channel_uuid
                users = await db.select('u.id AS user_id', 'u.username', 'u.lastConnection')
                    .from('channel_user AS cu')
                    .innerJoin('users AS u', 'u.id', 'cu.user_id')
                    .where('cu.channel_uuid', '=', channel_uuid)
            } else {
                // when a channel is created but the other users don't have an updated data in the client side
                if(data.userIds.length == 2) {
                    const channelUsers = await db.select(
                            'cu.channel_uuid',
                            db.raw('json_agg(json_build_object(\'user_id\', cu.user_id, \'username\', u.username, \'lastConnection\', u."lastConnection")) users')
                        )
                        .from('channel_user AS cu')
                        .innerJoin('users AS u', 'u.id', 'cu.user_id')
                        .groupBy('cu.channel_uuid')
                        .havingRaw([...data.userIds.map(id => `${id} = ANY(array_agg(cu.user_id))`), 'COUNT(cu.user_id) = 2'].join(' AND ')).first()
                    
                    if(channelUsers && channelUsers.users.length == 2) {
                        channelExist = true
                        channel_uuid = data.channel_uuid
                        users = channelUsers.users
                    }
                }
            }

            if (channelExist) {
                messages = await db.select(
                    'm.id AS msg_id', 'm.body AS msg', 'u.id AS user_id', 
                    'u.chatPicture', 'u.sex', 'm.created_at', 'mm.read_at'
                    )
                    .select(db.raw(
                        `COALESCE(json_agg(
                            json_build_object('fileName', mf."fileName", 'type', mf.type, 'originalFileName', mf."originalFileName"
                        )) FILTER (WHERE mf."fileName" IS NOT NULL), '[]') AS files`
                    ))
                    .from('messages AS m')
                    .innerJoin('users AS u', 'u.id', 'm.sender_id')
                    .leftJoin('message_metadatas AS mm', 'mm.message_id', 'm.id')
                    .leftJoin('message_files AS mf', 'mf.message_id', 'm.id')
                    .where('m.channel_uuid', '=', data.channel_uuid)
                    .andWhere('mm.participant_id', '=', socket.handshake.session.passport.user.id)
                    .groupByRaw('m.id, m.body, u.id, u."chatPicture", u.sex, m.created_at, mm.read_at')
                    .orderBy('m.created_at')
            }

            if (!channelExist) {
                // insert new channel uuid
                const newUuid = uuidv4()
                await db('channels').insert({
                    uuid: newUuid,
                    one: data.userIds.length == 1
                })
                channel_uuid = newUuid

                // insert new channel_user
                data.userIds.forEach(async user_id => {
                    await db('channel_user').insert({
                        channel_uuid,
                        user_id
                    })
                })

                users = await db.select('u.id AS user_id', 'u.username')
                .from('channel_user AS cu')
                .innerJoin('users AS u', 'u.id', 'cu.user_id')
                .where('cu.channel_uuid', '=', channel_uuid)
            }

            socket.join(channel_uuid)

            console.log('From: ' + socket.user_id + ', Users joined chat room ' + channel_uuid + ': ');
            io.in(channel_uuid).clients((err, clients) => {
                // clients will be array of socket ids , currently available in given room
                console.log(clients)
            });

            const acUsers = await db.select('u.id', 'u.username')
            .from('users AS u')
            .whereNotExists(function() {
                this.select('*')
                .from('channel_user AS cu')
                .where('cu.channel_uuid', '=', channel_uuid)
                .andWhereRaw('cu.user_id = u.id')
            })

            socket.emit('chat', {
                channel_uuid,
                messages,
                users,
                channel_item_id: channelExist ? null : data.channel_uuid,
                acUsers
            })
        })

        socket.on('updateMessageRead', async readMsgs => {
            await db('message_metadatas')
            .where('participant_id', '=', socket.user_id)
            .andWhere(function(){ this.whereNull('read_at') })
            .andWhere(function(){ this.whereIn('message_id', readMsgs) })
            .update({read_at: db.fn.now()})

            socket.emit('updatedMessageRead', readMsgs)
        })

        socket.on('addUsersToChannel', async ({users, channel_uuid}) => {
            // check if the channel exist
            const channel = await db.select(
                'cu.channel_uuid',
                db.raw(`json_agg(json_build_object('user_id', cu.user_id, 'username', u.username, 'chatPicture', u."chatPicture", 'sex', u.sex)) users`)
            )
            .from('channel_user AS cu')
            .innerJoin('users AS u', 'u.id', 'cu.user_id')
            .where('cu.channel_uuid', '=', channel_uuid)
            .groupBy('cu.channel_uuid')
            .first()
            if(!channel) {
                return
            }

            // check if a channel with the same set of users doesn't exist
            const channel_user_ids = channel.users.map(u => u.user_id)
            users.forEach(user_id => {
                if(!channel_user_ids.includes(user_id)) {
                    channel_user_ids.push(user_id)
                }
            })
            const channelE = await db.select('cu.channel_uuid')
            .from('channel_user AS cu')
            .groupBy('cu.channel_uuid')
            .havingRaw(`${channel_user_ids.map(id => `${id} = ANY(array_agg(cu.user_id))`).join(' AND ')} AND COUNT(*) = ${channel_user_ids.length}`)
            .first()
            if(channelE) {
                return
            }

            const messages = await db.select('id')
            .from('messages')
            .where('channel_uuid', '=', channel_uuid)

            users.forEach(async user_id => {
                // add user to the channel
                await db('channel_user').insert({
                    user_id, channel_uuid
                })
                // add messages metadata
                messages.forEach(async m => {
                    await db('message_metadatas').insert({
                        message_id: m.id,
                        participant_id: user_id
                    })
                })
            })

            const clients = io.sockets.clients() // connected users
            Object.keys(clients.connected).forEach(async socketId => {
                const _socket = clients.connected[socketId]
                let user = channel.users.find(u => u.user_id == _socket.user_id)
                if(user) {
                    io.in(socketId).emit('channels', await getChannels(user))
                    _socket.join(channel_uuid)
                }
            })
            
            const acUsers = await db.select('u.id', 'u.username')
            .from('users AS u')
            .whereNotExists(function() {
                this.select('*')
                .from('channel_user AS cu')
                .where('cu.channel_uuid', '=', channel_uuid)
                .andWhereRaw('cu.user_id = u.id')
            })

            socket.emit('updateAddGroup', acUsers)
        })

        socket.on('disconnect', () => {
            console.log('user disconnected, ' + socket.user_id + ', users: ' + Object.keys(io.sockets.clients().connected).length)
            
            socket.broadcast.emit('connectionStatusListener', {
                user_id: socket.user_id,
                connected: false,
                lastConnection
            })
        })
    })
})
.catch(ex => {
    console.error(ex.stack)
    process.exit(1)
})

