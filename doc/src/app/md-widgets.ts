import LinksDict from './links.json'
import { MdWidgets } from 'mkdocs-ts'

MdWidgets.ApiLink.Mapper = (target: string) => {
    return LinksDict.apiLinks[
        target
    ] as unknown as ReturnType<MdWidgets.LinkMapper>
}
MdWidgets.ExtLink.Mapper = (target: string) => {
    return LinksDict.extLinks[
        target
    ] as unknown as ReturnType<MdWidgets.LinkMapper>
}
MdWidgets.GitHubLink.Mapper = (target: string) => {
    return LinksDict.githubLinks[
        target
    ] as unknown as ReturnType<MdWidgets.LinkMapper>
}
MdWidgets.CrossLink.Mapper = (target: string) => {
    return LinksDict.crossLinks[
        target
    ] as unknown as ReturnType<MdWidgets.LinkMapper>
}
