
import React from 'react'
import moment from 'moment'
import {getChatPicture, prev} from '../public/js/utility'

export default class Channel extends React.Component {

    constructor(props) {
        super(props)
        this.message = React.createRef()
    }

    componentDidMount() {
        M.Tooltip.init(this.message.current, {})
    }

    render() {
        const {user_id, msg_id, msg, files, chatPicture, sex, created_at, connectedUserId} = this.props
        
        const txtMsgAttr = {}, fileListAttr = {}

        let msgClass = ''
        if(user_id == connectedUserId) {
            msgClass = ' right'
            txtMsgAttr['data-position'] = 'left'
            fileListAttr['data-position'] = 'left'
        }
        else {
            txtMsgAttr['data-position'] = 'right'
            fileListAttr['data-position'] = 'right'
        }

        let imgElem = ''
        if(user_id == prev.user_id) {
            msgClass += ' coalesce'
        }
        else {
            imgElem = <img className='circle' alt="avatar" src={getChatPicture(chatPicture, sex)} />
        }

        prev.user_id = user_id

        return (
            <div className={`chat-message ${msgClass}`} data-msg-id={msg_id}>
                {imgElem}
                {msg !== '' ?
                    (
                        <div className="message tooltipped" {...txtMsgAttr} ref={this.message}
                            data-tooltip={moment(new Date(created_at)).format('MMM D, YYYY [at] HH:mm')}
                            dangerouslySetInnerHTML={{__html: msg}}></div>
                    ) : ''
                }
                {(files && files.length > 0 ?
                (<div className="message-files tooltipped" {...fileListAttr}
                            data-tooltip={moment(new Date(created_at)).format('MMM D, YYYY [at] HH:mm')}>
                    {files.map(file => {
                            if(file) {
                                if(/^image/i.test(file.type)) {
                                    return (
                                        <div className='message'>
                                            <img className="download-image" 
                                                src={'attachments/' + file.fileName} alt={file.originalFileName} />
                                        </div>
                                    ) 
                                }
                                else {
                                    return (
                                        <div className='message'>
                                            <a href={'attachments/' + file.fileName} className="download-file" target="_blank">
                                                {file.originalFileName}
                                            </a>
                                        </div>
                                    )
                                }
                            }
                            return null;
                        })}
                </div>) : '')}
            </div>
        )
    }

}