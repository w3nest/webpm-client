# Publish


The **CDN (Content Delivery Network)** for {{webpm-client}} is hosted by **W3Nest** and includes:
* **ESM modules**
* **Web applications**
* **Backend services**

However, **Python packages** used alongside **Pyodide** are **not** hosted on the CDN. 
These packages are fetched directly from the <ext-link target="pyodide-packages">Pyodide ecosystem</ext-link>. 
For guidance on creating and publishing Pyodide packages, refer to the 
<ext-link target="pyodide-publish">Pyodide documentation</ext-link>.

---

## Check Resource Availability

You can check the availability of a specific resource in the CDN by using the following search input:

<search-resource></search-resource>

---

## Publishing a Resource

For **ESM modules available on NPM**, you can easily request the integration of a package into the CDN by submitting 
a request through this link: <github-link target="publish-package">Request NPM Package Integration</github-link>. 
Once integrated, the packages are published in the repository:
<github-link target="webpm-externals">webpm-externals</github-link>.

<note level="hint">
Our goal is to fully automate the process of publishing NPM packages directly to W3Nest's CDN in the near future.
</note>


For other cases, usually your own projects, the regular process for publishing a resource is through 
the **W3Nest Local server**. 
It essentially requires a `.w3nest/webpm.py` file in your project that defines the publication step. 
You can find detailed instructions <ext-link target="w3nest/how-to/publish">here</ext-link>.



<note level="warning" title="Semantic Versioning">
**Semantic versioning** is crucial for {{webpm-client}}: only modules that follow this standard can be managed 
effectively. This means that **API-breaking changes** should be accompanied by an appropriate version upgrade.

Relying on semantic versioning allows for:
- **Robust and fast on-the-fly dependency resolution** 
- Various **optimization benefits**

Adopting semantic versioning is not only essential for {{webpm-client}}, but also for maintaining compatibility 
with **existing tools and systems**.
</note>
