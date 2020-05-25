
import {displayDate} from '../public/js/utility'

export default function ChatDate({dateMoment}) {
    return <div className='chat-date'>{displayDate(dateMoment)}</div>
}