// @flow strict
import { ICONS } from '../constants';
import Twitter from "../constants/twitter.svg"
import Github from "../constants/github.svg"
import Stackoverflow from "../constants/stackoverflow.svg"
import Email from "../constants/email.svg"
import Linkedin from "../constants/linkedin.svg"
import Rss from "../constants/rss.svg"

const getIcon = (name: string) => {
    let icon;

    switch (name) {
        case 'twitter':
            icon = Twitter;
            break;
        case 'github':
            icon = Github;
            break;
        case 'stackoverflow':
            icon = Stackoverflow;
            break;
        case 'email':
            icon = Email;
            break;
        case 'linkedin':
            icon = Linkedin;
            break;
        case 'rss':
            icon = Rss;
            break;
        case 'vkontakte':
            icon = ICONS.VKONTAKTE;
            break;
        case 'telegram':
            icon = ICONS.TELEGRAM;
            break;
        case 'instagram':
            icon = ICONS.INSTAGRAM;
            break;
        case 'line':
            icon = ICONS.LINE;
            break;
        case 'facebook':
            icon = ICONS.FACEBOOK;
            break;
        case 'gitlab':
            icon = ICONS.GITLAB;
            break;
        case 'weibo':
            icon = ICONS.WEIBO;
            break;
        case 'codepen':
            icon = ICONS.CODEPEN;
            break;
        case 'youtube':
            icon = ICONS.YOUTUBE;
            break;
        case 'soundcloud':
            icon = ICONS.SOUNDCLOUD;
            break;
        default:
            icon = {};
            break;
    }

    return icon;
};

export default getIcon;
