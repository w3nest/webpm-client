# @w3nest/webpm-client


<code-badges version="{{webpm-version}}" npm="@w3nest/webpm-client" github="w3nest/webpm-client" license="mit">
</code-badges>

---

## Overview

{{webpm-client}} is a dynamic package installer and linker designed for web applications. 
It streamlines dynamic installation and management of various resource types, 
offering you enhanced modularity and flexibility for your projects.

It supports the following resource types:

*  **ESM modules:** JavaScript or WASM-based modules executed in the front end.

*  **Pyodide Modules:**  Python modules running in your browser via <ext-link target="pyodide">Pyodide</ext-link>.

*  **Backends:** Backend modules that are installed and deployed on your local PC.
<note level="warning">
Backend components can **only be installed** for applications served from the 
<ext-link target="w3nest">W3Nest</ext-link> server. See comment at the bottom of the page. 
</note>
*  **Standalone Scripts & CSS**


ESM modules, backends, and standalone scripts & CSS are sourced from the <ext-link target="w3nest">W3Nest</ext-link>
CDN's database. Python modules are retrieved from the <ext-link target="pyodide-packages">Pyodide ecosystem</ext-link>.

For details on how to publish packages, refer to the <cross-link target="how-to/publish">Publishing Guide</cross-link>.


<github-link target="webpm-doc">This documentation</github-link> is using {{webpm-client}} to install and link its 
dependencies. Below is displayed its runtime environment:


<js-cell cell-id="monitoring">
const {RuntimeView} = await webpm.installViewsModule()
display(new RuntimeView())
</js-cell>

---

## Getting Started

To begin using {{webpm-client}}, consider the following resources:

*  <cross-link target="tutorials">Tutorials</cross-link>: Ideal for newcomers, offering a step-by-step & 
   interactive introduction.

*  <cross-link target="how-to">How-to</cross-link>: Detailed, task-oriented instructions for specific use cases.

*  <cross-link target="api">API Reference</cross-link>: Comprehensive technical documentation for advanced users.

These sections provide a structured learning path, helping you leverage the full potential of {{webpm-client}}.

---

## W3Nest ? 

{{webpm-client}} reaches its full potential when used with applications served by the  
<ext-link target="w3nest">W3Nest</ext-link> local server.  

W3Nest emulates a cloud environment directly on your desktop, enabling seamless web application development and 
distribution—all without relying on external cloud providers. This approach eliminates concerns about cost, 
availability, and scalability while offering the freedom to create, share, and consume powerful web-based applications.  

### Why Use W3Nest?  

🚀 **Effortless Web Application Sharing**  
Easily distribute web applications, whether they rely on JavaScript (ESM) modules, WebAssembly (WASM), Python via 
Pyodide, or backend services. These applications will run smoothly on any other W3Nest user’s machine.

🌍 **Instant Online Access**  
Frontend-only applications are immediately available via a unique URL:  
`https://w3nest.org/apps/${APPNAME}/${VERSION}`—no extra setup required.  

💾 **Persistent Resource Caching**  
W3Nest acts as a smart local cache, ensuring that essential resources—including the {{webpm-client}} database—are stored 
on your machine for **offline access** and **performance optimization**.  

📢 **Local Publishing & Seamless Development**  
Your ongoing projects can be published locally and served instantly, allowing you to override remote versions
dynamically when calling `webpm.install`.  

🔗 **Optimized Data Sharing & Collaboration**  
W3Nest provides multiple solutions to **create, manage, and share data** directly from your web applications.
Whether keeping data locally for private use or sharing it with the community, W3Nest ensures **transparent access 
and seamless integration**. 

<!--
## W3Nest ?

{{webpm-client}} reaches its full potential when used with applications served by the
<ext-link target="w3nest">W3Nest</ext-link> local server.

W3Nest emulates a cloud environment directly on your desktop, enabling seamless web application development and 
distribution—all without relying on external cloud providers. This approach eliminates concerns about cost, 
availability, and scalability while offering the freedom to create, share, and consume powerful web-based applications.

In particular, it offers several key benefits:

*  **Seamless Web Application Sharing**: Easily distribute web applications, whether they rely on JavaScript
 (ESM) modules, WebAssembly (WASM), Python via Pyodide, or backend services. 
   These applications will run smoothly on any other W3Nest user’s machine.

*  **Instant Online Accessibility**: Applications that don’t depend on backends are directly accessible via URLs
   like https://w3nest.org/apps/${APPNAME}/${VERSION}.

*  **Persistent Resource Caching**: The W3Nest server acts as a local cache, ensuring that all resources—including 
   the {{webpm-client}} database—are copied to your machine and available offline.

*  **Local Publishing**: You can publish and serve your ongoing projects locally, offering a seamless experience by 
   replacing remote versions when calling `webpm.install`.

*  **Enhanced Data Sharing and Consumption**: W3Nest provides multiple solutions to easily share and consume data 
   between applications, facilitating collaboration and improving efficiency.
-->