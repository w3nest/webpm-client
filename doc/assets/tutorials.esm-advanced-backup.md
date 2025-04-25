
To illustrate, let’s build a low-code application. First, we install the core layers of our low-code engine:

<js-cell>
const {VSF} = await ViewsMdle.installWithUI({
    esm:{ 
        modules:[
            '@youwol/vsf-core#^0.3.3 as VSF', 
        ],
        usingDependencies: [
            'rxjs#^6.0.0'
        ],
        modulesSideEffects: {
            '@youwol/vsf-core#0.3.x': () => display("Side effects VSF core")
        },
        scripts: [
            // Dummy example
            'codemirror#5.52.0~mode/javascript.min.js'
        ],
    },
    display: (view) => display(view)
})
</js-cell>

**Key Points:**

*  **Progress Feedback:**
The <api-link target="installWithUI"></api-link> function is a variant of <api-link target="install"></api-link>
that provides a visual progress indicator via its display parameter. Expand the **Installation successful** box above
to see details of what has been installed.

*  **Dependency Resolution:**
Although the natural resolution for rxjs might select a version in the `7.x` range, using the `usingDependencies` 
attribute forces version `6.5.5`. This should only be done in rare cases, as it might lead to incompatibilities.

*  **Side Effects:**
A side effect callback has been defined—triggered upon installing any module that matches the given semver query. 
Leveraging the <api-link target="ModuleSideEffectCallback"></api-link> signature, you can, for example, await an 
initialization step before proceeding with the rest of the loading graph.

*  **Script Loading:**
The scripts attribute allows you to load additional JavaScript files after all ESM modules have been installed. 
These scripts are not considered during dependency resolution.

Now, let’s construct a low-code application:

<js-cell>
let project = new VSF.Projects.ProjectState()

const flow = 
// Load a geometry
"(of#of)>>(torusKnot#geom)" + 
// Re-mesh it
">>(fromThree#convIn)>>(uniformRemeshing#remesh)>>(toThree#convOut)" +
// Display the remeshed geometry
">>(viewer#viewer)"

project = await project.with({
    toolboxes:["@youwol/vsf-three", '@youwol/vsf-pmp', '@youwol/vsf-rxjs'],
    workflow: {
        branches:[flow],
        configurations:{
            // You can play with edge factor between e.g. 0.1 - 1
            remesh: { edgeFactor: 0.7 }
        }
    }
})
display(
    // viewPortOnly is provided by the Notebook engine: the view is not displayed if not in the view port. 
    Views.Layouts.viewPortOnly({
        content: project.instancePool.inspector().getModule('viewer').html()
    })
)
</js-cell>

<note level="question" title="What is it?" expandable="true">
This low code application generates a <ext-link target="torus-knot">3D torus knot</ext-link>, applies re-meshing using
the <ext-link target="pmp">PMP C++ library</ext-link> (ported to <ext-link target="wasm">WASM</ext-link>), 
and renders the final visualization with <ext-link target="three">three.js</ext-link>.

Run the following cell below to display a 3D view of the flowchart:

<js-cell>
const { Canvas } = await ViewsMdle.installWithUI({
    esm: ['@youwol/vsf-canvas#^0.3.1 as Canvas'],
    display
})
display({ 
    tag: 'div', 
    class: 'w-100',
    style: { height: '300px' }, 
    children: [
        new Canvas.Renderer3DView({
            project$: rxjs.of(project), 
            workflowId: 'main'
        })
    ]
})
</js-cell>

</note>
**Additional Notes:**

Each module (e.g., `of`, `torusKnot`, `fromThree`) comes with its own dependencies, which {{webpm-client}} 
dynamically installs at runtime. 

A typical challenge arises when multiple modules depend on the same resource—such as `vsf-core` in this example—which
is already present in the runtime environment. To handle this, {{webpm-client}} uses intelligent dependency resolution. 
Even if different modules trigger the installation of `vsf-core` at various times, only a single instance is loaded
and linked. 
This approach prevents conflicts, reduces memory overhead, and ensures a **consistent, reliable execution environment**.