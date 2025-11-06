# Backend

<note level="warning"> 
On-the-fly backends installation **is not a standard feature of web-browser**. 
The capabilities described here are enabled only for applications served by the **hybrid local/cloud solution
<ext-link target="w3nest">W3Nest</ext-link>**. 
</note>  

Backends are **lightweight microservices** that run locally on your PC and are accessible via HTTP.
They provide **flexibility** by supporting multiple programming languages and technology stacks.
However, communication is limited to **serializable data** due to HTTP constraints.  

These backends typically run inside **containers**, which may expose build configuration options.
When a backend is requested for the **first time**, an initial setup delay occurs as it is installed.
Subsequent requests start the backend **instantly**, ensuring a seamless experience.


To install backends, use the <api-link target='install'></api-link> function and specify the 
<api-link target='InstallInputs.backends'></api-link> attribute with either:

- A list of **<api-link target='LightLibraryWithAliasQueryString'></api-link>** – A simple way to specify the modules. 
- **<api-link target='BackendInputs'></api-link>** – Allows additional configuration options.

The two options are discussed hereafter.

---

## Simple Installation

The following cell installs the demo backend of W3Nest (`w3nest_demo_backend`) using a list of
<api-link target='LightLibraryWithAliasQueryString'></api-link>. 
Because it can take some time to proceed (essentially for the first installation only), the 
<api-link target="installWithUI"></api-link> is used in place of
<api-link target="install"></api-link> to provide progress feedbacks.


<js-cell>
// `installWithUI` is used instead the usual `install` to display installation progress.
const { installWithUI } = await webpm.installViewsModule()

const { demoClient } = await installWithUI({
    backends:['w3nest_demo_backend#^0.1.0 as demoClient'],
    // `installWithUI` accepts this `display` attribute, it is called with the generated view.
    display: (view) => display(view)
})

</js-cell>

Once installed, backends can be accessed via a JavaScript client using the provided alias name 
(`demoClient` in this case). This client uses fetch-like methods to make HTTP requests to the backend, its 
interface is described by <api-link target="BackendClient"></api-link>.

For instance, to call the `/cow-say` endpoint:

<js-cell>

display(new Views.Text(`**Backend's base path:** \`${demoClient.urlBase}\``))

let body = { 
    message: "Hello, I'm T-Rex 🦖",
    character: 'trex'
}

resp = await demoClient.fetchJson(
    '/cow-say', 
    {   method: 'post',
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' }
    })

display({
    tag: 'pre', 
    style:{
        fontSize: '0.7rem',
        lineHeight: '0.7rem'
    },
    innerText: resp
})
</js-cell>

<note level="hint">
Installed backends come with a couple of useful links:
*   Usually the backend API documentation is exposed under `/docs`, you can find it for `w3nest_demo_backend`:
<js-cell>
display({tag:'a', target:'_blank', href: `${demoClient.urlBase}/docs`, innerText:'API doc'})
</js-cell>
*   The **W3Lab** exposes the running backend, the page's path is provided by
    <api-link target="BackendClient.urlW3Lab"></api-link>. 
<js-cell>
display({tag:'a', target:'_blank', href: demoClient.urlW3Lab, innerText:'W3Lab'})
</js-cell>

</note>

---

## Advanced Usage

The `backends` attribute can also be specified using <api-link target='BackendInputs'></api-link>,
which allows for additional installation options.


### Configuration

Some backends provide configurable build options, allowing users to customize certain aspects of their installation.
These options—when available—are backend-specific and documented accordingly.

To illustrate this, let's consider <ext-link target="pyrun_backend">pyrun_backend</ext-link>,
an interpreter capable of running custom Python code. According to its documentation,
the following attributes can be provided at build time:

*  **`python`** – Specifies the Python interpreter version.
*  **`modules`** – A list of Python packages to be pre-installed in the backend's container environment.
*  **`apt`** – System-level dependencies that should also be installed.


The following example installs `pyrun_backend`, configures it to use Python 3.10,
and includes `numpy` as a pre-installed package:

<js-cell>
const { pyRunner } = await installWithUI({
    backends:{
        modules:['pyrun_backend#^0.2.2 as pyRunner'],
        configurations: {
            'pyrun_backend': {
                build: { 
                    python:'3.10',
                    modules:'numpy',
                }
            }
        }
    },
    display
})
</js-cell>


This example configures `pyrun_backend` to use python 3.10 and include `numpy` in its environment, it is 
exposed through the JavaScript variable `pyRunner`.

<note level="hint">
*  You can run multiple versions of the same backend with different configurations by using **partitions**,
as explained in the next section. 
*  For containerized backends (the usual setup), you can override the default `Dockerfile` using the user-provided
`dockerfile` option (see <api-link target="BackendConfig"></api-link>).  
This is particularly useful for interpreter-style backends, such as `pyrun_backend`, where you may want finer
control over the runtime environment.
</note>

Let's now exercise the backend using its client instance `pyRunner`:

<js-cell>
body = {
    cellId: 'tutorials.backend',
    capturedIn: {},
    capturedOut: ['resp'],
    code: `
import numpy
import sys

resp = {
    "python": sys.version,
    "numpy": numpy.__version__
}
`
}

resp = await pyRunner.fetchJson(
    '/run',
    {   method: 'post',
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' }
    }
)
display("Python version:", Views.mx1, resp.capturedOut['resp'].python)
display("Numpy version:", Views.mx1, resp.capturedOut['resp'].numpy)
</js-cell>


<note level="hint" expandable="true" title="Notebook?" mode="stateful">  

The `pyrun_backend` is integrated into <ext-link target="mkdocs-ts">MkDocs-TS</ext-link>,
allowing execution of code cells using a custom interpreter in notebook like pages.

This page is actually an example of it, and the following cell binds its execution to the previously
installed `pyRunner`:  

<interpreter-cell interpreter="pyRunner" language="python" captured-out="pyVersion npVersion">  
import numpy  
import sys  

pyVersion = sys.version  
npVersion = numpy.__version__  
</interpreter-cell>  

The captured variables can then be used in JavaScript cells:  

<js-cell>  
display(pyVersion)  
display(npVersion)  
</js-cell>  

For more details on this feature, refer to the <ext-link target="mkdocs-ts.notebook-tuto">Notebook Tutorial</ext-link>.  

</note>  



### Partitioning  

Backends can be assigned to different **partitions**, ensuring isolated execution environments.
This is especially useful when applications require **stateful backends** or need to run multiple backend instances 
with different configurations.  

<note level="info">  
Backend clients use the `X-Backends-Partition` header to route requests to a specific partition.
Once a request reaches a backend within a partition, all subsequent requests from that backend
will be directed exclusively to other backends within the same partition.
</note>  

**Default Partition**  

By default, partitions are managed automatically. Each browser tab is assigned a **unique partition ID**, 
which is created when the tab loads. Any backends running in that partition will be 
**terminated when the tab is closed**.

To check the current partition ID for this tab:  

<js-cell>  
display(webpm.Client.backendsPartitionId)  
</js-cell>  

**Custom Partitions**

To explicitly assign a backend to a specific partition, use the `partition` attribute during installation:  

<js-cell>  
const { client } = await installWithUI({  
    backends: {   
        modules: ['w3nest_demo_backend as client'],  
        partition: 'Foo'  
    },  
    display  
})  
</js-cell>  


In such case:
- If a backend requires dependencies, those dependencies will also be installed within the same partition.  
- Assigning a **custom partition ID** prevents automatic termination of all backends in that partition  
  when the tab is closed. However, backends **installed by the page** will still be terminated when the tab is closed.  
- The web browser tab that **installs a backend** is considered its **owner** and manages its lifecycle.  

