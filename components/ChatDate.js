
import {displayDate} from '../public/js/utility'

// import styles from './ChatDate.module.css'

export default function ChatDate({dateMoment}) {
    return <div className='chat-date'>{displayDate(dateMoment)}</div>
}