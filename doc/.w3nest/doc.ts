import { generateApiFiles } from 'mkdocs-ts/src/mkapi-backends/mkapi-typescript'

generateApiFiles({
    projectFolder: `${__dirname}/../../`,
    outputFolder: `${__dirname}/../assets/api`,
    baseNav: '/api',
    externals: {
        rxjs: ({ name }: { name: string }) => {
            const urls = {
                Subject: 'https://www.learnrxjs.io/learn-rxjs/subjects/subject',
                BehaviorSubject:
                    'https://www.learnrxjs.io/learn-rxjs/subjects/subject',
                ReplaySubject:
                    'https://www.learnrxjs.io/learn-rxjs/subjects/replaysubject',
                Observable: 'https://rxjs.dev/guide/observable',
            }
            if (!(name in urls)) {
                console.warn(`Can not find URL for rxjs ${name} symbol`)
            }
            return urls[name]
        },
    },
})
