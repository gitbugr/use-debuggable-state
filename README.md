<div align="center">
  <h1>
    <br/>
    <br/>
    🤓
    <br />
    useDebuggableState
    <br />
    <br />
    <br />
    <br />
  </h1>
  <sup>
    <br />
    <br />
    <a href="https://www.npmjs.com/package/use-debuggable-state">
       <img src="https://img.shields.io/npm/v/use-debuggable-state.svg" alt="npm package" />
    </a>
    <a href="https://www.npmjs.com/package/use-debuggable-state">
      <img src="https://img.shields.io/npm/dm/use-debuggable-state.svg" alt="npm downloads" />
    </a>
    <br />
    A <a href="https://reactjs.org/docs/hooks-intro.html">React Hook</a> for debugging state changes.</em>
  </sup>
  <br />
  <br />
  <br />
  <br />
  <pre>npm i <a href="https://www.npmjs.com/package/use-debuggable-state">use-debuggable-state</a></pre>
  <br />
  <br />
  <br />
  <br />
  <br />
<h2>Usage</h2>

Set the flag in the root file of your project.

`window.reactDebugMode = true;`

Replace your usages of `useState` with `useDebuggableState`

In the browser dev console, dump out the stacktrace

`console.log(window.reactDebug.stack)`

</div>
