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
            layout: fromMd('how-to.install.md'),
        },
        '/publish': {
            name: 'Publish',
            layout: fromMd('how-to.publish.md'),
        },
        '/py-youwol': {
            name: 'Py YouWol',
            layout: fromMd('how-to.py-youwol.md'),
        },
    },
}
