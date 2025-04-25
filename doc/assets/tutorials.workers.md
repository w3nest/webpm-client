# Workers Pool

Web Workers are a **JavaScript feature** that allows scripts to run in **background threads**, separate from the
main UI thread. This prevents long-running or intensive computations from blocking the user interface, 
ensuring a **smooth and responsive experience**.  

<note level="hint" expandable="true" title="Benefits">
**Key Benefits**:  
- **Improved Performance**: Offloads heavy tasks (e.g., data processing, parsing, computations) from the main thread.  
- **Non-blocking UI**: Keeps animations, interactions, and rendering smooth while executing background tasks.  
- **Parallel Execution**: Enables multitasking by running independent scripts concurrently.  
- **Better Resource Utilization**: Distributes workloads across multiple CPU cores.  
- **Secure and Isolated**: Web Workers run in a **separate global scope**, preventing direct DOM manipulation but
  ensuring security.  

They are particularly useful for **real-time applications, data-heavy processing, and computations**, 
such as image processing, AI inference, or simulations in the browser.

</note>

The <api-link target="WorkersPoolModule"></api-link> simplifies the management of Web Workers in complex applications. 
It automates environment setup, task scheduling, resource allocation, and scalability, making worker-based parallel 
processing more efficient.


<note level="warning" >
Each time data is transferred between the main thread and a worker, it must be **serializable** using the 
<ext-link target="structured-clone">structured clone algorithm</ext-link>.
</note>

---

## Setup

The module is an optional add-on and must be explicitly installed using 
<api-link target="installWorkersPoolModule"></api-link>:

<js-cell>
const WPool = await webpm.installWorkersPoolModule()
display(WPool)
</js-cell>

To create a workers pool, instantiate <api-link target="WorkersPool"></api-link> with a **configuration object**
 (<api-link target="WorkersPoolInput"></api-link>) specifying installation requirements and pool settings:

<js-cell>
const workersPool = new WPool.WorkersPool({
    install:{
        pyodide: ["numpy"]
    },
    pool: { startAt: 1, stretchTo: 10 }
})
</js-cell>

**Key Parameters**:
*  **`install`**: Defines the runtime environment, using the <api-link target="InstallInputs"></api-link> structure 
   (covered in a previous tutorial).
*  **`pool`**: Specifies the sizing policy for workers, determining how many should start initially and how many 
   can be dynamically allocated.

Additionally, **global variables or functions** can be copied into the worker environment using 
<api-link target='WorkersPoolInput.globals'></api-link>.

<note level="warning">
Web Workers do not provide the same core APIs as the main thread. **DOM manipulation is not available**.
If an installed module (typically an ESM) calls an unsupported function during setup, installation will fail. 
</note>

Before scheduling tasks, let's set up a **visual progress tracker** for worker creation and module installation:

<js-cell>
const { WorkersPoolView } = await webpm.installViewsModule()
await webpm.install({
    // Those two style-sheets are required by the WorkersPoolView
    css: [
        'bootstrap#^5.3.3~bootstrap.min.css',                
        'fontawesome#5.12.1~css/all.min.css',
    ]
})
const poolView = new WorkersPoolView({ workersPool })

display(poolView)
</js-cell>

Now, let's wait for the worker pool to be ready before executing tasks (optional):

<js-cell>
await workersPool.ready()
</js-cell>

## Task scheduling

To schedule a task in the worker pool, we must first define its entry point. 
The following cell implements a <ext-link target="pi-approx">Monte Carlo approximation of Pi</ext-link>
 using NumPy inside Pyodide:

<js-cell>
const entryPoint = ({args, workerScope}) => {

    const { pyodide } = workerScope
    pyodide.registerJsModule('jsModule', {count: args.count})
    return pyodide.runPython(`
        import numpy as np
        from jsModule import count
        data = np.random.uniform(-0.5, 0.5, size=(count, 2))
        len(np.argwhere(np.linalg.norm(data, axis=1)<0.5)) / count * 4`)
}
</js-cell>

**Explanation:**
*  **`workerScope`**: Represents the worker's global execution context, granting access to installed modules such as 
   pyodide here.
*  **`args`**: Contains input parameters when scheduling a task. Here, `count` determines the number of Monte Carlo 
   samples.
*  **Other parameters**: Additional attributes are available (see <api-link target="EntryPointArguments"></api-link>).

Now, let's schedule a task using <api-link target="WorkersPool.schedule"></api-link> and display the various
<api-link target="Message"></api-link> emitted during execution:

<js-cell>
const { rxjs } = await webpm.install({
    esm:['rxjs#^7.8.1 as rxjs']
})

const message$ = workersPool.schedule({
    title: 'PI approx.', 
    entryPoint, 
    args: {count:1e5}
})
const messagesView = {
    tag:'div',
    children: {
        policy: 'append',
        source$: message$.pipe( rxjs.map((m)=>[m]) ),
        vdomMap: (m) => ({tag: 'div', innerText: JSON.stringify(m)})
    }
}

display("Messages:")
display(messagesView)
const lastMessage = await rxjs.lastValueFrom(message$)
display("Result:")
display(`pi=${lastMessage.data.result}`)

</js-cell>

<note level="hint" title="**Custom Messages**" expandable="true">
The <api-link target="WorkersPool.schedule"></api-link> function returns an 
<ext-link target="Observable">Observable</ext-link> that: 
1.  Begins with a <api-link target="MessageStart"></api-link>. 
2.  Ends with a <api-link target="MessageExit"></api-link>, which contains either the result or an error.
   
You can send custom logs (<api-link target="MessageLog"></api-link>) or data messages 
(<api-link target="MessageData"></api-link>) during execution, for example, to track iteration progress.
This can be done using the <api-link target="WorkerContext"></api-link>,
accessible via <api-link target="EntryPointArguments.context"></api-link>.
</note>


## Up-scaling

Now, let's demonstrate the **scalability** of the worker pool by scheduling **1,000 tasks in parallel**:

<js-cell>
const results$ = new rxjs.Subject()

// this function will be called upon a click on a button define in the next cell
const scheduleThousandTasks = () => {
    for( let i=0; i<1000; i++){
        workersPool.schedule({title: 'PI approx.', entryPoint, args: {count:100000}})
            .pipe(rxjs.last())
            .subscribe(message => results$.next(message.data.result))
    }
}
</js-cell>

The `result$` <ext-link target="Subject">Subject</ext-link> gathers all computed values, emitting results from each 
scheduled task - the last <api-link target="MessageExit"></api-link>. 

This variable is finally used in the next cell to provide various insights on the ongoing computations:

<js-cell>
const { scan, buffer, takeWhile, last, filter, map }   = rxjs
const resultsRate$ = results$.pipe(buffer(rxjs.interval(1000)))
const sumAndCount$ = results$.pipe(scan(({s, c},e)=>({s:s + e, c: c+1}), {s:0, c:0}))    
const workerCount$ = workersPool.workers$.pipe(map( workers => Object.keys(workers).length))

const button = {
    tag: 'button', class:'btn btn-primary fv-pointer', innerText: 'start 1000 runs', 
    onclick: scheduleThousandTasks
}
display({
    tag: 'div', 
    class:'p-5',
    children:[
        {
            source$: workerCount$.pipe( filter((count) => count > 0)),
            vdomMap: () => button,
            untilFirst: ({ innerHTML: '<i>Waiting for first worker readyness...</i>' })
        },
        { tag:'div', innerText: workerCount$.pipe( map( count => 'Workers count: '+ count))},
        { tag:'div', innerText: sumAndCount$.pipe( map(({s, c}) => 'Average: '+ s / c ))},
        { tag:'div', innerText: sumAndCount$.pipe( map(({c}) => 'Simulation count: '+ c ))},
        { tag:'div', innerText: resultsRate$.pipe( map(results=> 'Results /s: '+ results.length))},
        poolView
    ]
})
</js-cell>

In the previous cell, the <api-link target='WorkersPool.workers$'></api-link> variable is an **observable** that 
emits updates whenever a new worker becomes **ready**. It provides a dictionary with:  

- **Key**: The Worker ID.  
- **Value**: An object containing:  
  - `worker`: A <api-link target="WWorkerTrait"></api-link> handler for the worker.  
  - `channel$`: An observable that streams all <api-link target="Message"></api-link> emitted by the worker.  

Additionally, other useful observables are available in <api-link target='WorkersPool'></api-link> to monitor the 
workers pool state, including:  

- <api-link target='WorkersPool.startedWorkers$'></api-link>: Emits the list of worker IDs as soon as their creation 
  starts.  
- <api-link target='WorkersPool.busyWorkers$'></api-link>: Emits the list of worker IDs currently running tasks.  
- <api-link target='WorkersPool.runningTasks$'></api-link>: Emits a list of currently active tasks.  

To terminate all workers and free up resources, use the following button:  

<js-cell>
display({
    tag: 'button', 
    class: 'btn btn-primary fv-pointer', 
    innerText: 'Terminate', 
    onclick: () => workersPool.terminate()
})
</js-cell>


