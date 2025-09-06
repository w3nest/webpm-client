from shutil import copyfile
from pathlib import Path

from w3nest.ci.ts_frontend import (
    ProjectConfig,
    PackageType,
    Dependencies,
    RunTimeDeps,
    generate_template,
    Bundles,
    MainModule,
    AuxiliaryModule,
)
from w3nest.utils import parse_json

project_folder = Path(__file__).parent.parent

pkg_json = parse_json(project_folder / "package.json")
externals = {
    # `rxjs` is required by the 'workersPool' auxiliary module
    "rxjs": "^7.5.6",
    # `@w3nest/http-primitives` is only used for typing & test, not in dev. dependencies to let consuming packages
    # have it in their `node_modules`.
    "@w3nest/http-clients": "^0.1.5",
    # For the Views module
    "rx-vdom": "^0.1.3",
}
config = ProjectConfig(
    path=project_folder,
    type=PackageType.LIBRARY,
    name=pkg_json["name"],
    version=pkg_json["version"],
    shortDescription=pkg_json["description"],
    author=pkg_json["author"],
    dependencies=Dependencies(
        runTime=RunTimeDeps(externals=externals, includedInBundle={"semver": "^7.3.4"}),
        devTime={
            "brotli": "^1.3.2",
            "@w3nest/http-clients": "^0.1.5",
            "util": "^0.12.5",
            "@jest/test-sequencer": "^29.5.0",
        },
    ),
    testConfig="https://github.com/youwol/integration-tests-conf",
    bundles=Bundles(
        mainModule=MainModule(entryFile="./index.ts", aliases=["webpm"]),
        auxiliaryModules=[
            AuxiliaryModule(
                name="workersPool",
                entryFile="./lib/workers-pool/index.ts",
                loadDependencies=["rxjs"],
            ),
            AuxiliaryModule(
                name="testUtils",
                entryFile="./lib/test-utils/index.ts",
                loadDependencies=[],
            ),
            AuxiliaryModule(
                name="views",
                entryFile="./lib/views/index.ts",
                loadDependencies=["rxjs", "rx-vdom"],
            ),
        ],
    ),
    links={
        "Documentation": f"https://w3nest.org/apps/@webpm-client/doc/{pkg_json['version']}",
        "W3Nest": "https://w3nest.org",
    },
)

template_folder = project_folder / ".w3nest" / ".template"

generate_template(config=config, dst_folder=template_folder)

files = [
    "README.md",
    "package.json",
    ".gitignore",
    "jest.config.ts",
    # "typedoc.js", added entry points & custom readme
    # "tsconfig.json",  added "strictNullChecks" and exclude "./src/tests"
    "webpack.config.ts",
]
for file in files:
    copyfile(src=template_folder / file, dst=project_folder / file)
