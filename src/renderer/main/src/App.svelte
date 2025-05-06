<script lang="ts">
  import Versions from './components/Versions.svelte'
  import electronLogo from './assets/electron.svg'

  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')
  const onTest = (): void => window.electron.ipcRenderer.send('two')
  const real_Test = (): void => window.electron.ipcRenderer.send('three')
</script>

<img alt="logo" class="logo" src={electronLogo} />
<div class="creator">Powered by electron-vite</div>
<div class="text">
  Build an Electron app with
  <span class="svelte">Svelte</span>
  and
  <span class="ts">TypeScript</span>
</div>
<p class="tip">Please <code>F12</code> to open the devTool</p>
<div class="actions">
  <div id="test" class="action2">
    <a target="_blank" rel="noreferrer2" on:click={onTest}>Send IPC</a>
  </div>
  
  <div class="action">
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions a11y-missing-attribute-->
    <a target="_blank" rel="noreferrer" on:click={ipcHandle}>Send IPC2</a>
  </div>
  <div id="test3" class="action3">
    <a target="_blank" rel="noreferrer3" on:click={real_Test}>Send IPC</a>
  </div>
</div>
<Versions />
