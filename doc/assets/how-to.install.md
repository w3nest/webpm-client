# Installation Guide

To integrate the **webpm client** into your project, you **must** include it via a `<script>` tag in
your `index.html` file. 
Additionally, for better static analysis and developer experience, you may optionally install it 
via **NPM/Yarn** and configure **externals** of your project.

---

## **Required: Include via Script Tag**

You **must** load **`webpm`** using a `<script>` tag to ensure it is globally available for resource installations:

- **Latest version:**  
  ```html
  <script src="https://w3nest.org/webpm-client.js"></script>
  ```  
- **Specific version (semantic versioning):**  
  ```html
  <script src="https://w3nest.org/webpm/${SEMVER}/webpm-client.js"></script>
  ```  
- **For W3Nest-hosted applications**, you can use a relative path, *e.g.* for the latest version:  
  ```html
  <script src="/webpm-client.js"></script>
  ```  

---

### **2. Optional: Install via NPM/Yarn for Static Analysis**

For **better IDE support, type checking, and static analysis**, you can install `@w3nest/webpm-client` locally:

```sh
npm install @w3nest/webpm-client
# or
yarn add @w3nest/webpm-client
```

This does **not replace** the required `<script>` tag but allows better integration with development tools.

To prevent `@w3nest/webpm-client` from being bundled into your project (not needed because imported via the `script`)
you may need to configure your bundler accordingly.

For instance, if you are using **Webpack** , you can provide in the `webpack.config.ts`:

```js
module.exports = {
    // Other configurations...
    externals: {
        "@w3nest/webpm-client": {
            root: "webpm"
        }
    }
};
```
