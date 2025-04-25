
# ESM Modules

To install **ECMAScript Modules (ESM)**, use the <api-link target='install'></api-link> function and specify 
the **<api-link target='InstallInputs.esm'></api-link>** attribute using one of the following:  

- A list of **<api-link target='LightLibraryWithAliasQueryString'></api-link>** – A simple way to specify the modules.  
- **<api-link target='EsmInputs'></api-link>** – Provides additional configuration options.  

---

## **Example: Installing Bootstrap**  

The following example demonstrates how to install the **Bootstrap** module using
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
Having multiple versions of the same API is **not allowed**.  

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

Once installed, Bootstrap can be used in your code as usual:  

<js-cell>  
let innerHTML = `  
<div class="dropdown">  
    <button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">  
        Dropdown button  
    </button>  
    <div class="dropdown-menu" aria-labelledby="dropdownMenuButton">  
        <a class="dropdown-item">Foo</a>  
        <a class="dropdown-item">Bar</a>  
        <a class="dropdown-item">Baz</a>  
    </div>  
</div>`  

display({tag:'div', innerHTML})  
</js-cell>  

---

## **Example: Installing `bootstrap-select`**  

The following example installs **bootstrap-select**, which extends Bootstrap's functionality:  

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
**webpm-client** ensures that consuming modules are correctly linked to the appropriate version.  


<note level='info'>  
Modules can define **aliases** that become available upon installation.  
For example, the **`$`** symbol in the code above is an alias provided when the **`jquery`** module is installed.  
</note>  


The library provide an add on module <api-link target="ViewsModule"></api-link> (that needs to be explicitly installed)
providing a couple of useful views to display the current environment and installation events.

For instance, to monitor the actual runtime environment: 

<js-cell cell-id="monitoring">  
const ViewsMdle = await webpm.installViewsModule()  
display(new ViewsMdle.RuntimeView())  
</js-cell>  

<note level='info'>  
Note that the ESM module `bootstrap` is installed at two versions. 
</note>  

---

## Advanced Usage

When specifying the `esm` attributes, you can leverage <api-link target='EsmInputs'></api-link> to configure additional 
options. In this example, we demonstrate a more complex scenario involving dynamic plugins—often a challenge due 
to dependency resolution issues (e.g., handling `peerDependencies`).
