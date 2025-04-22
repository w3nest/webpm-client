from shutil import copyfile
import subprocess
from pathlib import Path

from w3nest.ci.ts_frontend import (
    ProjectConfig,
    PackageType,
    Dependencies,
    RunTimeDeps,
    DevServer,
    Bundles,
    MainModule,
)
from w3nest.ci.ts_frontend.regular import generate_template
from w3nest.utils import parse_json

project_folder = Path(__file__).parent.parent

pkg_json = parse_json(project_folder / "package.json")
pkg_json_webpm = parse_json(project_folder / ".." / "package.json")
# (cd ./node_modules/@youwol/mkdocs-ts/bin/ && node index.js --project ../../../../.. --nav /api --out ../../../../assets/api)
externals_deps = {
    "mkdocs-ts": "^0.3.0",
    "@w3nest/webpm-client": f"^{pkg_json_webpm['version'].replace('-wip', '')}",
    "rxjs": "^7.5.6",
    "@w3nest/http-clients": "^0.1.5",
    "rx-vdom": "^0.1.3",
}
in_bundle_deps = {}
dev_deps = {}

config = ProjectConfig(
    path=project_folder,
    type=PackageType.APPLICATION,
    name=pkg_json["name"],
    version=pkg_json_webpm["version"],
    shortDescription=pkg_json["description"],
    author=pkg_json["author"],
    dependencies=Dependencies(
        runTime=RunTimeDeps(externals=externals_deps, includedInBundle=in_bundle_deps),
        devTime=dev_deps,
    ),
    bundles=Bundles(
        mainModule=MainModule(
            entryFile="app/main.ts", loadDependencies=list(externals_deps.keys())
        )
    ),
    inPackageJson={
        "scripts": {"doc": "npx tsx .w3nest/doc.ts"},
    },
    userGuide=False,
    devServer=DevServer(port=3029),
)

template_folder = project_folder / ".w3nest" / ".template"

generate_template(config=config, dst_folder=template_folder)

files = [
    "README.md",
    ".gitignore",
    ".npmignore",
    ".prettierignore",
    "package.json",
    "webpack.config.ts",
]
for file in files:
    copyfile(src=template_folder / file, dst=project_folder / file)
