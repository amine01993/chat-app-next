
import React from 'react'
import Head from 'next/head'
import io from 'socket.io-client'
import SocketIOFileClient from 'socket.io-file-client'
import moment from 'moment'
import {Button, Icon, Chip} from 'react-materialize'

import emojione from '../public/emojione/emojione.min'

import Layout from './layout'
import Channel from '../components/Channel'
import Message from '../components/Message'
import ChatDate from '../components/ChatDate'
import AttachmentUpload from '../components/AttachmentUpload'
import AttachmentFilePreview from '../components/AttachmentFilePreview'
import AttachmentImagePreview from '../components/AttachmentImagePreview'
import {unReadMessages, prev, setConnectionStatus, getConnectionStatus} from '../public/js/utility'

export default class Chat extends React.Component {

    static async getInitialProps(props) {
        console.log('Chat', props)
        return {
            connectedUserId: props.query.id
        }
    };

    constructor(props) {
        super(props)

        this.state = {
            channels: [],
            messages: [],
            users: [],
            selected_channel_uuid: null,
            connectionStatus: '',
            addGroupAction: false,
            addGroupContainer: false,
            autoCompleteUsers: {},
            autoCompleteUsersSelected: [],

            attachmentFiles: []
        }

        this.handleChannelActive = this.handleChannelActive.bind(this)
        this.handleMessageSend = this.handleMessageSend.bind(this)
        this.handleAddGroup = this.handleAddGroup.bind(this)
        this.handleAddUsers = this.handleAddUsers.bind(this)
        this.handleUploadFile = this.handleUploadFile.bind(this)
        this.handleUploadFileInput = this.handleUploadFileInput.bind(this)
        this.resizeChatLayout = this.resizeChatLayout.bind(this)

        this.channelsEvent = this.channelsEvent.bind(this)
        this.chatEvent = this.chatEvent.bind(this)
        this.messageListenerEvent = this.messageListenerEvent.bind(this)
        this.updateAddGroupEvent = this.updateAddGroupEvent.bind(this)
        this.uploadCompleteEvent = this.uploadCompleteEvent.bind(this)
        this.deletedAttachmentEvent = this.deletedAttachmentEvent.bind(this)
        
        this.connectionStatusListener = this.connectionStatusListener.bind(this)

        this.messageInput = React.createRef()
        this.chatContent = React.createRef()
        this.uploadFile = React.createRef()
        this.uploadFileInput = React.createRef()
        this.chatCard = React.createRef()
        this.msgForm = React.createRef()

        this.ac_users = {}
        this.ac_users_selected = []
    }

    handleChannelActive(channel_uuid, users) {
        const channels = this.state.channels.slice()
        for(const channel of channels) {
            channel.active = channel.channel_uuid == channel_uuid
        }
        this.setState({channels})

        this.socket.emit('chat', {
            userIds: users.map(u => u.user_id),
            channel_uuid,
        })
    }

    handleMessageSend() {

        const {selected_channel_uuid, attachmentFiles} = this.state
        const messageTxt = this.messageInput.current.innerHTML.trim()

        let uploadsOver = true, file_ids = []
        for(const file of attachmentFiles) {
            if(file.progress < 100) {
                uploadsOver = false
                break
            }
            else {
                file_ids.push(file.id)
            }
        }

        if(selected_channel_uuid 
           && (attachmentFiles.length == 0 && messageTxt != '' 
           || attachmentFiles.length > 0 && uploadsOver)) {
            this.socket.emit('handleMessage', {
                channel_uuid: selected_channel_uuid,
                value: messageTxt,
                file_ids: file_ids.length == 0 ? null : file_ids.join(',')
            })
            this.messageInput.current.innerHTML = ''
            this.setState({
                attachmentFiles: []
            })
            this.resizeChatLayout()
        }

    }

    channelsEvent(channels) {
        console.log(channels)

        if(this.state.selected_channel_uuid) {
            for(const channel of channels) {
                channel.active = channel.channel_uuid == this.state.selected_channel_uuid
            }
        }

        this.setState({channels})
    }

    async chatEvent({channel_uuid, users, messages, channel_item_id, acUsers}) {
        console.log('chat', {channel_uuid, users, messages, channel_item_id})
        const {connectedUserId} = this.props
        const _users = users.filter(u => (users.length == 1 || u.user_id != connectedUserId) && u.lastConnection)
        let lastConnection = null
        if(_users.length > 0) {
            const _user = _users.sort((la, lb) => la.lastConnection <= lb.lastConnection ? 1 : -1)[0]
            lastConnection = _user.lastConnection
        }
        const connectionStatus = getConnectionStatus(channel_uuid, lastConnection)
        
        // update channel uuid/unread_count
        let channel, channels = this.state.channels.slice()
        if(channel_item_id) {
            channel = channels.find(c => c.channel_uuid == channel_item_id)
            channel.channel_uuid = channel_uuid
        }
        else {
            channel = channels.find(c => c.channel_uuid == channel_uuid)
        }
        channel.unread_count = 0
        
        unReadMessages.splice(0)
        
        this.setState({
            users, messages, channels,
            selected_channel_uuid: channel_uuid,
            connectionStatus
        })

        // update addGroup AutoComplete
        this.updateAddGroup(acUsers)

        if(this.chatContent.current.clientHeight == this.chatContent.current.scrollHeight) {
            this.updateMessageRead()
        }
        
        await this.scrollToLastMessage()
    }

    updatedMessageReadEvent(readMsgs) {
        console.log('readMsgs', readMsgs)
        for(const mid of readMsgs) {
            const mi = unReadMessages.findIndex(mi => mi == mid)
            if(mi !== -1) unReadMessages.splice(mi, 1)
        }
    }

    updateAddGroup(acUsers) {
        this.ac_users = acUsers.reduce((acc, val) => Object.assign(acc, {[val.username]: val.id}), {})

        this.setState(state => ({
            autoCompleteUsersSelected: [],
            addGroupAction: true, 
            autoCompleteUsers: acUsers.reduce((acc, val) => Object.assign(acc, {[val.username]: null}), {})
        }))
    }

    handleAddGroup(event) {
        this.setState((state) => ({
            addGroupContainer: !state.addGroupContainer
        }))
    }

    handleAddUsers(event) {
        if(!this.state.selected_channel_uuid)
            return

        const users = this.ac_users_selected.map(c => this.ac_users[c.tag])
        this.socket.emit('addUsersToChannel', {
            users,
            channel_uuid: this.state.selected_channel_uuid
        })
    }

    handleUploadFile(event) {
        this.uploadFileInput.current.click()
    }

    handleUploadFileInput(event) {
        console.log('handleUploadFileInput', this.uploadFileInput.current.files)
        if (this.uploadFileInput.current.files && this.uploadFileInput.current.files.length > 0) {
            console.log('true')
            const uploadIds = this.uploader.upload(this.uploadFileInput.current, {
                data: { /* Arbitrary data... */ }
            })           
        }
    }

    updateAddGroupEvent(acUsers) {
        this.updateAddGroup(acUsers)
    }

    initMessageInput() {
        // Emojis
        emojione.ascii = true

        const combination = new RegExp(emojione.regAscii.source + '|' + emojione.regShortNames.source, 'g')

        function emojify(elArg) {

            function placeCaretAtEnd(el, moveTo) {
                el.focus()
                if (typeof window.getSelection != "undefined" &&
                    typeof document.createRange != "undefined") {
                    const range = document.createRange()
                    range.setStartBefore(moveTo)
                    range.collapse(false)
                    const sel = window.getSelection()
                    sel.removeAllRanges()
                    sel.addRange(range)
                }
            }

            elArg.childNodes.forEach(node => {

                const matches = node.textContent.match(combination)
                let emo = null
                if (matches) {
                    for(let i = 0; i < matches.length; i++) {
                        const match = matches[i]
                        const start = node.textContent.indexOf(match)
                        const end = node.textContent.indexOf(match) + match.length
            
                        const stringToConvert = node.textContent.slice(start, end)
            
                        const temp_container = document.createElement('div')
                        temp_container.innerHTML = emojione.toImage(stringToConvert)
            
                        emo = temp_container.querySelector('.emojione') || temp_container.firstChild
            
                        const beforeText = document.createTextNode(node.textContent.slice(0, start))
                        const afterText = document.createTextNode(node.textContent.slice(end))
            
                        node.parentNode.insertBefore(beforeText, node)
                        node.parentNode.insertBefore(afterText, node.nextSibling)
                        node.parentNode.replaceChild(emo, node)

                        node = afterText
                    }
                    if(emo) {
                        placeCaretAtEnd(elArg, emo.nextSibling)
                    }
                }
            })
        }

        function removeOuterStyle(html) {
            for(const child of html.children) {
                if(!['emojione'].some(c => child.classList.contains(c))) {
                    child.setAttribute('style', '')
                    child.className = ''
                }
                removeOuterStyle(child)
            }
        }

        this.messageInput.current.addEventListener('input', () => {
            emojify(this.messageInput.current)
            removeOuterStyle(this.messageInput.current)
            this.resizeChatLayout()
        })

        const _this = this
        this.uploader.on('start', function(fileInfo) {
            console.log('Start uploading', fileInfo)

            _this.setState(state => {
                const newAttachmentFiles = state.attachmentFiles.slice()
                newAttachmentFiles.push({
                    uploadId: fileInfo.uploadId,
                    fileName: fileInfo.name,
                    progress: 0
                })
                return { attachmentFiles: newAttachmentFiles }
            })

            _this.resizeChatLayout()
        })
        this.uploader.on('stream', function(fileInfo) {
            console.log('Streaming... sent ' + fileInfo.sent + ' bytes.')

            _this.setState(state => {
                const newAttachmentFiles = state.attachmentFiles.slice()
                const attachmentFileIndex = newAttachmentFiles.findIndex(af => af.uploadId == fileInfo.uploadId)
                const newAttachmentFile = {...newAttachmentFiles[attachmentFileIndex], ...{progress: fileInfo.sent / fileInfo.size}}
                newAttachmentFiles[attachmentFileIndex] = newAttachmentFile
                return {
                    attachmentFiles: newAttachmentFiles
                }
            })
        })
        this.uploader.on('complete', function(fileInfo) {
            console.log('Upload Complete', fileInfo)

            _this.setState(state => {
                const newAttachmentFiles = state.attachmentFiles.slice()
                const attachmentFileIndex = newAttachmentFiles.findIndex(af => af.uploadId == fileInfo.uploadId)
                const newAttachmentFile = {...newAttachmentFiles[attachmentFileIndex], ...{progress: 100, name: fileInfo.name}}
                newAttachmentFiles[attachmentFileIndex] = newAttachmentFile
                return {
                    attachmentFiles: newAttachmentFiles
                }
            })
        })
        this.uploader.on('error', function(err) {
            console.log('Error!', err)
        })
        this.uploader.on('abort', function(fileInfo) {
            console.log('Aborted: ', fileInfo)

            _this.setState(state => {
                const newAttachmentFiles = state.attachmentFiles.slice()
                const attachmentFileIndex = newAttachmentFiles.findIndex(af => af.uploadId == fileInfo.uploadId)
                newAttachmentFiles.splice(attachmentFileIndex, 1)
                return {
                    attachmentFiles: newAttachmentFiles
                }
            })
        })        
    }

    resizeChatLayout() {
        const gtr = `88px calc(100vh - 88px - 1px - ${this.msgForm.current.offsetHeight}px) ${this.msgForm.current.offsetHeight}px`
        this.chatCard.current.style.gridTemplateRows = gtr
    }

    scrollToMessage(msgElem) {
        return new Promise((resolve, reject) => {
            if(msgElem) {
                const imgs = document.querySelectorAll('.chat-message img:not([alt="avatar"])')
                let loadedCount = imgs.length
                const load = () => {
                    if(--loadedCount <= 0) {
                        msgElem.scrollIntoView(true)
                        resolve()
                    }
                }
                if(loadedCount == 0) {
                    load()
                }
                else {
                    for(const img of imgs) {
                        if(img.complete) {
                            load()
                        }
                        else {
                            img.addEventListener('load', () => {
                                load()
                            })
                        }
                    }
                }
            }
            else {
                resolve()
            }
        })
    }

    async scrollToLastMessage() {
        const lastChatMsg = document.querySelector('.chat-message:last-child') 
        await this.scrollToMessage(lastChatMsg)
    }

    // check if an unread message has been read, if true return message id else false
    isMessageRead(chatMsg) {
        const msg_id = chatMsg.msg_id
        const mi = unReadMessages.findIndex(mId => mId == msg_id)
        if(mi == -1) return false

        const chatMsgElem = document.querySelector(`.chat-message[data-msg-id="${msg_id}"]`)
        const msgBound = chatMsgElem.getBoundingClientRect()
        // is in viewport
        if( msgBound.top >= 0 && msgBound.left >= 0 &&
            msgBound.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            msgBound.right <= (window.innerWidth || document.documentElement.clientWidth) ) {
            // if container show the message
            const containerBound = this.chatContent.current.getBoundingClientRect()
            if( msgBound.top >= containerBound.top && msgBound.bottom <= containerBound.bottom ) {
                return msg_id
            }
        }
        return false
    }

    updateMessageRead() {
        const readMsgs = []

        for(const msg of this.state.messages) {
            const mid = this.isMessageRead(msg)
            if(mid) readMsgs.push(mid)
        }
        
        if(readMsgs.length > 0) {
            this.socket.emit('updateMessageRead', readMsgs)
        }
    }

    uploadCompleteEvent({id, imageUrl, originalFileName, fileName, type}) {

        this.setState(state => {
            const newAttachmentFiles = state.attachmentFiles.slice()
            const attachmentFileIndex = newAttachmentFiles.findIndex(af => af.name == fileName)
            const newAttachmentFile = {
                ...newAttachmentFiles[attachmentFileIndex], 
                ...{
                    id, imageUrl, originalFileName, type, opacity: 1,
                    onClose: () => {
                        this.setState(state => {
                            const newAttachmentFiles = state.attachmentFiles.slice()
                            const attachmentFileIndex = newAttachmentFiles.findIndex(af => af.id == id)
                            const newAttachmentFile = {
                                ...newAttachmentFiles[attachmentFileIndex], 
                                ...{opacity: .75}
                            }
                            newAttachmentFiles[attachmentFileIndex] = newAttachmentFile
                            return { attachmentFiles: newAttachmentFiles }
                        })
                        this.socket.emit('deleteAttachment', {id})
                    }
                }
            }
            newAttachmentFiles[attachmentFileIndex] = newAttachmentFile
            return {
                attachmentFiles: newAttachmentFiles
            }
        })

        this.resizeChatLayout()
    }

    deletedAttachmentEvent({id, name}) {

        this.setState(state => {
            const newAttachmentFiles = state.attachmentFiles.slice()
            const attachmentFileIndex = newAttachmentFiles.findIndex(af => af.id == id)
            newAttachmentFiles.splice(attachmentFileIndex, 1)
            return {
                attachmentFiles: newAttachmentFiles
            }
        })
        this.resizeChatLayout()
    }

    async messageListenerEvent(data) {
        console.log(data)
        this.setState({
            messages: [...this.state.messages, data.msg]
        })
        await this.scrollToLastMessage()
    }

    connectionStatusListener({user_id, connected, lastConnection}) {
        console.log('connectionStatusListener', user_id)
        // if one user is connected then the channel is online
        const channels = this.state.channels.slice()

        for(const channel of channels) {
            if(channel.users.find(u => u.user_id == user_id)) {
                channel.connectionStatus = connected ? true : false
                setConnectionStatus(channel.channel_uuid, connected ? true : false)
            }
        }

        let connectionStatus = ''
        if(this.state.selected_channel_uuid) {
            connectionStatus = getConnectionStatus(this.state.selected_channel_uuid, lastConnection)
        }

        this.setState({channels, connectionStatus})
    }

    componentDidUpdate() {
        this.resizeChatLayout()
    }

    componentDidMount() {
        this.socket = io('https://chat-app-next.herokuapp.com:81')
        this.uploader = new SocketIOFileClient(this.socket)

        this.socket.on('channels', this.channelsEvent)
        this.socket.on('chat', this.chatEvent)
        this.socket.on('updatedMessageRead', this.updatedMessageReadEvent)
        this.socket.on('updateAddGroup', this.updateAddGroupEvent)
        this.socket.on('uploadComplete', this.uploadCompleteEvent)
        this.socket.on('deletedAttachment', this.deletedAttachmentEvent)
        this.socket.on('messageListener', this.messageListenerEvent)

        this.initMessageInput()
    }

    componentWillUnmount() {
        this.socket.removeAllListeners('channels')
        this.socket.removeAllListeners('chat')
        this.socket.removeAllListeners('updatedMessageRead')
        this.socket.removeAllListeners('updateAddGroup')
        this.socket.removeAllListeners('uploadComplete')
        this.socket.removeAllListeners('deletedAttachment')
        this.socket.removeAllListeners('messageListener')
    }

    render() {
        const {channels, messages, users, connectionStatus, addGroupAction, addGroupContainer, 
            autoCompleteUsers, autoCompleteUsersSelected, attachmentFiles} = this.state
        const {connectedUserId} = this.props

        prev.day = null
        prev.user_id = null
        let messagesList = []
        for(const message of messages) {
            const {user_id, msg_id, msg, files, chatPicture, sex, created_at, read_at} = message
            
            const dateMoment = moment(new Date(created_at))
            if(prev.day == null || prev.day != dateMoment.format('DDMMYYYY')) {
                prev.day = dateMoment.format('DDMMYYYY')
                messagesList.push(<ChatDate key={prev.day} dateMoment={dateMoment} />)
            }            

            messagesList.push(<Message key={msg_id} {...message} connectedUserId={connectedUserId} />)

            if(user_id != connectedUserId && !read_at) {
                unReadMessages.push(msg_id)
            }
        }

        let attachmentFilesList = []
        for(const attachmentFile of attachmentFiles) {
            if(attachmentFile.hasOwnProperty('type')) {
                if(/^image/i.test(attachmentFile.type)) {
                    attachmentFilesList.push(<AttachmentImagePreview key={attachmentFile.uploadId} {...attachmentFile} />)
                }
                else {
                    attachmentFilesList.push(<AttachmentFilePreview key={attachmentFile.uploadId} {...attachmentFile} />)
                }
            }
            else {
                attachmentFilesList.push(<AttachmentUpload key={attachmentFile.uploadId} {...attachmentFile} />)
            }
        }

        let _this = this

        return (
            <Layout title='Chat'>
                <Head>
                    <link rel="stylesheet" href="css/chat.css" />
                    <link rel="stylesheet" href="emojione/emojione.min.css" />
                </Head>
                <div className="chat-app">
                    <div className='chat-container'>
                        <div className='chat-part'>
                            <div className='card' id="chat-card" ref={this.chatCard}>
                                <div className='card-content'>
                                    <span className='card-title'>
                                        Chat with {users.filter(u => users.length == 1 || u.user_id != connectedUserId).map(u => u.username).join(', ')}
                                    </span>
                                    <p className='connection-status'>
                                        {connectionStatus}
                                    </p>
                                    {/* <!-- right menu --> */}
                                    <a href="#" className={`chat-action btn-floating blue ${addGroupAction ? '' : 'hide'}`} 
                                        style={{right: '24px'}} onClick={this.handleAddGroup}
                                        title="Add other users to this conversation">
                                        <i className="material-icons">group_add</i>
                                    </a>
                                </div>
                                <div className='card-content chat-content custom-scrollbar' ref={this.chatContent}>
                                    <div className={`add-group-container z-depth-1 ${addGroupContainer ? '' : 'hide'}`}>
                                        {/* <!-- Customizable input  --> */}
                                        <Chip
                                            data={autoCompleteUsersSelected}
                                            options={{
                                                autocompleteOptions: {
                                                    data: autoCompleteUsers,
                                                    minLength: 1,
                                                },
                                                onChipAdd() {
                                                    _this.ac_users_selected = this.chipsData;
                                                },
                                                onChipDelete() {
                                                    _this.ac_users_selected = this.chipsData;
                                                }
                                            }}
                                        />
                                        <a className="waves-effect waves-light btn blue" onClick={this.handleAddUsers}>
                                            Add
                                            <i className="material-icons left">add</i>
                                        </a>
                                    </div>
                                    <div className="chat-wrapper">
                                        {messagesList}
                                    </div>
                                </div>
                                <div className='chat-input'>
                                    <form action="" id="message-form" style={{marginBottom: 0}} ref={this.msgForm}>
                                        <div className='chat-input-bar'>
                                            <div id="message-attachments">
                                                <ul className="message-attachments-list custom-scrollbar-horizontal">
                                                    {attachmentFilesList}
                                                </ul>
                                            </div>
                                            
                                            <div id="message-input" ref={this.messageInput}
                                                className='editable custom-scrollbar' contentEditable="true" 
                                                placeholder='Write a message...'></div>

                                            <div className='chat-input-actions'>
                                                <a href="#" id="upload-file" onClick={this.handleUploadFile}
                                                    ref={this.uploadFile}
                                                    className="chat-input-action btn-floating blue" title="Upload file">
                                                    <i className="material-icons">attach_file</i>
                                                </a>

                                                <a href="#" id="send-message" onClick={this.handleMessageSend}
                                                    className="chat-input-action btn-floating blue" title="Send message">
                                                    <i className="material-icons">send</i>
                                                </a>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>

                        <div className="chat-part">
                            <div className="card">
                                <div className='card-content'>
                                    <span className="card-title">Friends</span>
                                    {/* <!-- <p>12 Friends online</p> --> */}
                                </div>
                                <ul className="collection flush custom-scrollbar" id="channels-list">
                                    {channels.map(channel => {
                                        return <Channel key={channel.channel_uuid} {...channel} 
                                            connectedUserId={connectedUserId} onClick={this.handleChannelActive} />
                                    })}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                <div style={{display: 'none'}}>
                    <input type="file" onChange={this.handleUploadFileInput}
                        ref={this.uploadFileInput} id="upload-file-input" multiple />
                </div>
            </Layout>
        )
    }
}