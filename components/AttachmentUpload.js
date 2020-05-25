
import React from 'react'

export default class AttachmentUpload extends React.Component {

    constructor(props) {
        super(props)
    }

    render() {
        const {fileName, progress, uploadId} = this.props
        return (
            <li className="message-attachment-item">
                <i className="material-icons">insert_drive_file</i>
                <div className="message-attachment-filename" title={fileName}>
                    {fileName}
                </div>
                <div className="progress">
                    <div className="determinate" style={{width: progress + '%'}}></div>
                </div>
            </li>
        )
    }
}