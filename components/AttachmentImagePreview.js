
import React from 'react'

export default class AttachmentImagePreview extends React.Component {

    constructor(props) {
        super(props)
    }

    render() {
        const {id, imageUrl, originalFileName, onClose, opacity} = this.props
        return (
            <li className="message-attachment-item img-attachment" data-id={id} style={{opacity}}>
                <div className="message-attachment-preview">
                    <a href="#" className="close-preview" onClick={() => onClose()}>
                        <i className="material-icons">close</i>
                    </a>
                    <img src={imageUrl} alt={originalFileName} />
                </div>
            </li>
        )
    }
}