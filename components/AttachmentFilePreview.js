
import React from 'react'

export default class AttachmentFilePreview extends React.Component {

    constructor(props) {
        super(props)
    }

    render() {
        const {id, originalFileName, onClose, opacity} = this.props
        return (
            <li className="message-attachment-item file-attachment" data-id={id} style={{opacity}}>
                <div className="message-attachment-preview file-preview">
                    <div className="blue">
                        <i className="material-icons">insert_drive_file</i>
                    </div>
                    <div>
                        <h4 className="file-type-preview">{originalFileName.split('.').pop()}</h4>
                        <p className="file-name-preview" title={originalFileName}>{originalFileName}</p>
                    </div>
                    <a href="#" className="close-preview" onClick={() => onClose()}>
                        <i className="material-icons">close</i>
                    </a>
                </div>
            </li>
        )
    }
}