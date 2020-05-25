import moment from 'moment'

export function getChatPicture(chatPicture, gender) {
    return chatPicture != null && chatPicture != '' 
        ? `img/${chatPicture}` 
        : `default-img/${gender == 'female' ? 'default-female-icon.png' : 'default-icon.png'}`
}

const channelsConnectionStatus = []

export function setConnectionStatus(channel_uuid, connected) {
    const ccs = channelsConnectionStatus.find(c => c.channel_uuid == channel_uuid)
    if(ccs) {
        ccs.connected = connected
    }
    else {
        channelsConnectionStatus.push({
            channel_uuid: channel_uuid,
            connected
        })
    }
}

export function getConnectionStatus(channel_uuid, lastConnection) {
    if(channelsConnectionStatus.find(c => c.channel_uuid == channel_uuid && c.connected)) {
        return 'Currently Online'
    }
    else {
        if(lastConnection) {
            return `Last Connection at ${moment(new Date(lastConnection)).format('DD/MM/YYYY HH:mm')}`
        }
        else {
            return ''
        }
    }
}

export const unReadMessages = []

export function displayDate(dm) {
    const d = moment(new Date())
    // today
    if(d.format('DDMMYYYY') == dm.format('DDMMYYYY')) {
        return dm.format('LT') // 6:46 PM
    }
    // same year
    if(d.format('YYYY') == dm.format('YYYY')) {
        return dm.format('ll, LT') // Nov 16, 2019, 6:47 PM
    }
    // else
    return dm.format('L, LT') // 12/30/2016, 1:27 PM
}

export const prev = {
    user_id: null,
    day: null
}

export function stripTags(str) {
    return str.replace(/(<([^>]+)>)/ig, '')
}