const siteUrl = 'https://miensol.pl/';
export default {
    url: siteUrl,
    pathPrefix: '/',
    title: 'Piotr Mionskowski',
    subtitle: 'Piotr Mionskowski\'s thoughts on software, technology, architecture, design patterns and programming in general.',
    copyright: '© All rights reserved.',
    disqusShortname: 'miensol',
    postsPerPage: 6,
    googleAnalyticsId: 'UA-49294874-1',
    useKatex: false,
    menu: [
        {
            label: 'Articles',
            path: '/'
        },
        {
          label: 'About me',
          path: '/about-me/'
        },
        // {
        //   label: 'Contact me',
        //   path: '/pages/contacts'
        // }
    ],
    author: {
        name: 'Piotr Mionskowski',
        photo: '/piotr-bright.jpg',
        bio: 'TDD fan eager to learn new things. Always focused, always eager to ask why?',
        contacts: {
            email: 'piotr.mionskowski@gmail.com',
            facebook: '#',
            telegram: '#',
            twitter: 'miensol',
            github: 'miensol',
            stackoverflow: 'users/155213/miensol',
            rss: siteUrl + "feed.xml",
            vkontakte: '',
            linkedin: 'piotr-mionskowski-b2858516',
            instagram: '#',
            line: '',
            gitlab: '',
            weibo: '',
            codepen: '',
            youtube: '',
            soundcloud: '',
        }
    },
    maxWidth: 960
};
