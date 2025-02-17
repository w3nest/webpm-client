# Pyodide


<ext-link target="pyodide">Pyodide</ext-link> allows you to run Python code directly in your web browser.
It provides a full Python runtime compiled to WebAssembly, enabling a wide range of Python functionalities on the 
client side.


Pyodide supports two types of Python modules:
* **Pure Python Wheels from PyPI:** Any pure Python wheels available in the 
  <ext-link target="pypi">PyPI repository</ext-link>.
* **Ported Non-Pure Python Packages:** Pyodide includes a set of non-pure Python packages compiled to WebAssembly. 
You can find the list of supported packages <ext-link target="pyodide-packages">here</ext-link>. 
<note level="warning"> 
For ported packages, it is not possible to install specific versions: each Pyodide run time comes with a single 
given version.
</note>


To install Python modules, use the <api-link target='install'></api-link> function and specify the 
<api-link target='InstallInputs.pyodide'></api-link> attribute with either:

- A list of **<api-link target='PyModule'></api-link>** – Simple module names to install, optionally including 
  versioning query for **pure Python wheels from PyPI**.
- **<api-link target='PyodideInputs'></api-link>** – Allows additional configuration options, such as providing
  an explicit version of Pyodide runtime.

In both cases, the specified Python modules are passed directly to
<ext-link target="micropip">Pyodide’s micropip</ext-link> installer.

---

## Simple Usage

The following example installs numpy using <api-link target="installWithUI"></api-link>,
(a variation of <api-link target="install"></api-link> that displays installation progress, already introduced 
in previous tutorial).

<js-cell>
// `installWithUI` is used instead the usual `install` to display installation progress.
const { installWithUI } = await webpm.installViewsModule()

const { pyodide } = await installWithUI({
    pyodide: ["numpy"],
    // `installWithUI` accepts this `display` attribute, it is called with the generated view.
    display: (view) => display(view)
})
</js-cell>

Once Pyodide is installed, you can run Python code directly in the browser.

The example below:
*  Registers a JavaScript module (`jsModule`) with a count variable.
*  Runs Python code in Pyodide to estimate the value of π using `numpy`.
  
<js-cell>

pyodide.registerJsModule("jsModule", { count: 1000 })
const pi = pyodide.runPython(`
import numpy as np
from jsModule import count

def calc_pi(n):
    data = np.random.uniform(-0.5, 0.5, size=(n, 2))
    norms = np.linalg.norm(data, axis=1)
    return len(np.argwhere(norms<0.5)) / n * 4

calc_pi(count)`
)

display(`pi: ${pi}` )
</js-cell>


<note level="hint"> 
Since Python is commonly used for computational tasks, running Pyodide in a Web Worker helps prevent UI freezing 
by offloading processing to a separate thread.

Additionally, the installation process—including Pyodide itself and its requested modules—can block the main thread 
if executed there. To ensure a smooth user experience, consider using a Web Worker for both installation and execution.

For practical examples of this approach, refer to the <cross-link target="workers">Workers Pool Tutorial</cross-link>.
</note>


<note level="hint" expandable="true" title="Notebook?" mode="stateful">  

This feature of {{webpm-client}} is used by the the project <ext-link target="mkdocs-ts">MkDocs-TS</ext-link>
to interpret python code in notebook pages.

For instance, the following cell binds its execution to the previously installed `pyodide`:  

<py-cell>  
import numpy as np

def calc_pi(n):
    data = np.random.uniform(-0.5, 0.5, size=(int(n), 2))
    norms = np.linalg.norm(data, axis=1)
    return len(np.argwhere(norms<0.5)) / n * 4

display(calc_pi(1000)) 
</py-cell>  

It is then possible to mix python & javascript with *e.g.*:

<js-cell>
const range = new Views.Range({min:2, max:7, emitDrag: false})
const resultView = {
    tag: 'div',
    innerText: {
        source$: range.value$,
        vdomMap: (count) => calc_pi(Math.pow(10,count))
    }
} 
display(range, Views.mx2, resultView)
</js-cell>

For more details, refer to the <ext-link target="mkdocs-ts.notebook-tuto">Notebook Tutorial</ext-link>.  

</note>  


---

## Advanced Usage

This section outlines additional controls for configuring the Pyodide runtime environment 
through **<api-link target='PyodideInputs.version'></api-link>**.


### Pyodide RunTime

<note level="warning">
When using the Python environment, a single `pyodide` runtime instance is created the first time
<api-link target="install"></api-link> is called with a `pyodide` attribute.
Subsequent calls will not initialize a new instance, as only one runtime can be active.
</note>

You can control the initialization of Pyodide using:

*  **<api-link target='PyodideInputs.version'></api-link>**: Specifies the Pyodide runtime version.
*  **<api-link target='PyodideInputs.indexUrl'></api-link>**: Specifies the index URL used to fetch Pyodide and its ported packages.

<note level="hint" title="pyodideIndexUrl">
If <api-link target='PyodideInputs.indexUrl'></api-link> is omitted:
- **When your application is served by the local W3Nest server:**  
  The index URL points to `/python/pyodide/$VERSION`. In this configuration, the W3Nest server acts as a proxy to `jsDelivr`, caching resources locally on the user's hard drive.
- **Otherwise:**  
  A `jsDelivr`-based URL is used, such as `https://cdn.jsdelivr.net/pyodide/v$VERSION/full/`.
</note>


The following cell illustrates these configurations. Note that it serves only as an example, because at this point
a `pyodide` instance has already been initialized.

<js-cell>
const { installWithUI } = await webpm.installViewsModule()

const { pyodide } = await installWithUI({
    pyodide: {
        version: '0.27.2',
        modules: ["jinja2"],
        // '$VERSION' is replaced by the above '0.27.2' specification
        indexUrl: `https://cdn.jsdelivr.net/pyodide/v$VERSION/full/` 
    },
    display
})
</js-cell>



### Micropip

For installing **pure Python wheels from PyPI**, the <ext-link target="micropip">micropip</ext-link> module is used.
Python semantic versioning can be applied to specify the desired version of a package:


<js-cell>
const { installWithUI } = await webpm.installViewsModule()

const { pyodide } = await installWithUI({
    pyodide: {modules: ["snowballstemmer==2.1.0"]},
    display
})
</js-cell>

<note level="hint">
When your application is served by the local W3Nest server, `micropip` is configured to fetch modules from
`/python/pipy`. Similar to Pyodide's ported packages, this proxy caches downloaded modules on the user's hard drive.
</note>
