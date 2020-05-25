
import React from 'react'
import moment from 'moment'

import {getChatPicture, setConnectionStatus, stripTags} from '../public/js/utility'

export default class Channel extends React.Component {

    constructor(props) {
        super(props)
    }

    render() {
        console.log(this.props)
        const {users, channel_uuid, body, sender_id, connectionStatus, created_at, unread_count, connectedUserId, active, onClick} = this.props

        const otherUsers = users.filter(u => users.length == 1 || u.user_id != connectedUserId)
        const title = otherUsers.map(u => u.username).join(', ')
        const lastMsgDate = body ? moment(new Date(created_at)).format('DD/MM/YYYY HH:mm') : ''
        let subTitle = ''
        if(body) {
            if(users.length > 1 && sender_id == connectedUserId)
                subTitle += 'You: '
            else if(users.length > 2)
                subTitle += users.find(u => u.user_id == sender_id).username + ': '
            subTitle += body
        }
        
        setConnectionStatus(channel_uuid, connectionStatus)

        return (
            <li className={`collection-item avatar ${active ? 'active' : ''}`} onClick={() => onClick(channel_uuid, users)}>
                <div className={`badged-circle ${connectionStatus ? 'online' : ''} ${otherUsers.length > 1 ? 'group-picture' : ''}`}>
                    {otherUsers.slice(0, 2).map(u => {
                        const {chatPicture, sex} = u
                        return <img key={chatPicture} className="circle" alt="avatar" src={getChatPicture(chatPicture, sex)} />         
                    })}
                </div>
                <div className="title">{title}</div>
                <div className={`sub-title ${unread_count > 0 ? 'unread' : ''}`}>
                    {stripTags(subTitle)} {unread_count > 0 ? <span className="badge unread-count">{unread_count}</span> : ''}
                </div>
                <div className="last-msg-date">{lastMsgDate}</div>
            </li>
        )
    }
}