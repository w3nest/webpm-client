import { AppNav, fromMd, icon } from '../common'

export const navigation: AppNav = {
    name: 'How-To',
    header: {
        icon: icon('fa-file-medical-alt'),
    },
    layout: fromMd('how-to.md'),
    routes: {
        '/install': {
            name: 'Install',
            header: { icon: { tag: 'i', class: 'fas fa-hdd' } },
            layout: fromMd('how-to.install.md'),
        },
        '/publish': {
            name: 'Publish',
            header: { icon: { tag: 'i', class: 'fas fa-upload' } },
            layout: fromMd('how-to.publish.md'),
        },
    },
}
