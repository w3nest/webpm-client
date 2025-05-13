# @w3nest/webpm-client


<code-badges version="{{webpm-version}}" npm="@w3nest/webpm-client" github="w3nest/webpm-client" license="mit">
</code-badges>

---

## Overview

{{webpm-client}} is a dynamic package installer and linker designed for web applications. 
It streamlines dynamic installation and management of various resource types, 
offering you enhanced modularity and flexibility for your projects.

To see it in action, try running the following snippet (<kbd>Ctrl</kbd>+<kbd>Enter</kbd> is a shortcut for execution):

<confettiExample></confettiExample>

The installer supports the following resource types:

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


This documentation is itself using {{webpm-client}} to install and link its 
dependencies. You can run the following snippet to display the runtime environment:


<runTimeView></runTimeView>


---

## Getting Started

To begin using {{webpm-client}}, consider the following resources:

*  <cross-link target="tutorials">Tutorials</cross-link>: Ideal for newcomers, offering a step-by-step & 
   interactive introduction.

*  <cross-link target="how-to">How-to</cross-link>: Detailed, task-oriented instructions for specific use cases.

*  <cross-link target="api">API Reference</cross-link>: Comprehensive technical documentation for advanced users.

---

## W3Nest ? 

{{webpm-client}} reaches its full potential when used with applications served by the 
**W3Nest local server**. 
This solution emulates a cloud environment directly on your desktop, enabling seamless web application development and 
distribution. It eliminates concerns about cost, 
availability, and scalability while offering the freedom to create, share, and consume powerful web-based applications.
Find out more <ext-link target="w3nest">here</ext-link>.
