from w3nest.app.environment import Environment
from w3nest.app.projects import (
    IPipelineFactory,
    JsBundle,
    Artifact,
    FileListing,
    Link,
)
from w3nest.ci.ts_frontend import (
    pipeline,
    PipelineConfig,
    TestStepConfig,
    test_result,
    test_coverage,
    PublishConfig,
    BuildStep,
)
from w3nest_client.context import Context

test_html_outputs: Artifact = Artifact(
    id="test-html-outputs",
    files=FileListing(
        include=["src/tests/.html-outputs/*"],
    ),
    links=[Link(name="HTML outputs", url="src/tests/.html-outputs/index.html")],
)

copy_yw_config_cmd = "cp ./yw-backend.config.json ./dist/@youwol/webpm-client.config.json"


class PipelineFactory(IPipelineFactory):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    async def get(self, env: Environment, context: Context):
        config = PipelineConfig(
            target=JsBundle(
                links=[
                    Link(name="doc", url="dist/docs/modules/MainModule.html"),
                    Link(name="coverage", url="coverage/lcov-report/index.html"),
                    Link(name="bundle-analysis", url="dist/bundle-analysis.html"),
                ]
            ),
            testConfig=TestStepConfig(
                artifacts=[test_result, test_coverage, test_html_outputs]
            ),
            publishConfig=PublishConfig(
                packagedArtifacts=["dist", "docs", "test-coverage", "test-html-outputs"]
            ),
            overridenSteps=[
                BuildStep(
                    id=f"build-{flow}",
                    run=f"yarn build:{flow} && {copy_yw_config_cmd}",
                )
                for flow in ["dev", "prod"]
            ],
        )
        return await pipeline(config, context)
