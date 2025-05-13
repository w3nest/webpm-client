
# ESM Modules

To install **ECMAScript Modules (ESM)**, use the <api-link target='install'></api-link> function and specify 
the **<api-link target='InstallInputs.esm'></api-link>** attribute.

---

## Simple Install 

The following example demonstrates how to install the <ext-link target="bootstrap">Bootstrap</ext-link> module using
<api-link target='LightLibraryWithAliasQueryString'></api-link>:  

<js-cell>  
const { BS } = await webpm.install({  
    esm: ['bootstrap#^5.3.3 as BS'],  
    css: ['bootstrap#^5.3.3~bootstrap.min.css']  
})  
display(BS)  
</js-cell>  

**Explanation:**  
- Installs the latest compatible version of Bootstrap (`^5.3.3`) along with its dependencies.  
- The module is assigned the alias **`BS`** for easy reference.  
- The Bootstrap stylesheet **`bootstrap.min.css`** is also installed.  

<note level="warning" title="Semantic Versioning">
When specifying a semantic versioning range (e.g., `^5.3.3`) in the attribute `esm`, any valid
<ext-link target="semver">NPM SemVer query</ext-link> can be used. However, it is strongly recommended to use an 
**API-compatible range** (i.e., prefixed with `^`).  

This ensures that only **one version** of a library is installed per API version, where the API version is defined by
the **left-most non-zero digit**.
Having multiple library versions corresponding to the same API version is **not allowed**.  

For example:  
✅ A runtime **can** have `bootstrap` installed in versions `5.x.y` and `4.x'.y'`.  
❌ A runtime **cannot** have `bootstrap` installed in both `5.x.y` and `5.x'.y'`.  

Using `^` helps maintain compatibility while preventing conflicts caused by multiple API versions.  
</note>
 
When installing modules, **webpm-client** checks for previously installed modules and avoids redundant installations.  

<note level='info' title="Loading Graph" mode="stateful" expandable='true'>  
The <api-link target='queryLoadingGraph'></api-link> function allows to query dependency tree information :

<js-cell>  
const graph = await webpm.queryLoadingGraph({modules:['bootstrap#^5.3.3']})  

graph.lock.forEach((m) => {  
    display(new Views.Text(`* Module \`${m.name}\` at version \`${m.version}\``))  
})  
</js-cell>  

Each installation request triggers **graph resolution**: if a compatible version of `@popperjs/core` is published, 
it is automatically used. This ensures seamless updates with minimal maintenance.  

</note>  

Once installed, Bootstrap can be used in your code as usual, *e.g.* to create a 
<ext-link target="bs-dropdown">drop down menu</ext-link>:  

<js-cell>  
let innerHTML = `
<div class="dropdown">
  <button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton1" data-bs-toggle="dropdown" aria-expanded="false">
    Dropdown button
  </button>
  <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton1">
    <li><a class="dropdown-item">Action</a></li>
    <li><a class="dropdown-item">Another action</a></li>
    <li><a class="dropdown-item">Something else here</a></li>
  </ul>
</div>`  

display({tag:'div', innerHTML})  
</js-cell>  

---

## Multiple Versions Support

The runtime managed by {{webpm-client}} can feature multiple versions of a given library.
This is illustrated with the following example installing <ext-link target="bootstrap-select"></ext-link> 
(it extends Bootstrap's functionality):  

<js-cell>  
const { BSelect } = await webpm.install({  
    esm: ['bootstrap-select#^1.13.18 as BSelect'],  
    css: ['bootstrap-select#^1.13.18~bootstrap-select.min.css']  
})  

innerHTML = `  
<select class="selectpicker" id="ex-select-picker">  
  <option>Foo</option>  
  <option>Bar</option>  
  <option>Baz</option>  
</select>`  

display({tag:'div', innerHTML})  
$('.selectpicker').selectpicker();  
</js-cell>  


Since `bootstrap-select` depends on `bootstrap#^4.0.0`, two versions of Bootstrap are now available. 
The library ensures that consuming modules are correctly linked to the appropriate version.  


<note level='info'>  
Modules can define **aliases** that become available upon installation.  
For example, the **`$`** symbol in the code above is an alias provided when the **`jquery`** module is installed.  
</note>  

## Sub-package imports

It is possible to imports selected sub-packages exported by a module, for instance 
<ext-link target="rxjs">RxjS</ext-link> exports additional modules such as `fetch`:

<js-cell>  
const { fetch, rxjs } = await webpm.install({  
    esm: [
        'rxjs#^7.8.2 as rxjs',
        'rxjs/fetch#^7.8.2 as fetch',
    ],  
})  

fetch.fromFetch('../assets/favicon.svg').pipe(
    rxjs.switchMap((resp) => rxjs.from(resp.text()))
).subscribe((svg) => {
    display({
        tag:'div', 
        class:'w-50 mx-auto',
        innerHTML: svg
    })
})
</js-cell> 

## Views

The library provide an add on module <api-link target="ViewsModule"></api-link> (that needs to be explicitly installed)
providing a couple of useful views to display the current environment and installation events.

For instance, to monitor the actual runtime environment: 

<js-cell cell-id="monitoring">  
const ViewsMdle = await webpm.installViewsModule()  
display(new ViewsMdle.RuntimeView())
</js-cell>  

<note level='info'>  
Note that the module `bootstrap` is installed at two versions. 
</note>  

---

## Additional Options

When specifying the `esm` attribute, you can provide advanced configuration through the
<api-link target='EsmInputs'></api-link> interface. This enables fine-grained control over how modules are loaded and 
resolved. Key options include:

* **`aliases`**:
  Define custom aliases for modules—especially useful for referencing indirect dependencies or renaming imports 
  in a more meaningful way.

* **`modulesSideEffects`**:
  Attach callbacks that are triggered when specific modules are loaded. This is useful for performing initialization 
  logic or registering global effects.

* **`scripts`**:
  Specify standalone JavaScript scripts to load after ESM installation. These scripts are not considered part of the
  dependency resolution graph and are loaded directly.

* **`usingDependencies`**:
  Override default dependency resolution by explicitly providing version constraints for specific packages.
  This is useful when you need to ensure compatibility with a particular version of a shared library.
