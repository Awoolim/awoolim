<script>
  import { waitLocale, _ } from 'svelte-i18n'

  let title = []
  let description = []
  let screen = -1

  waitLocale().then(() => {
    title = [$_('setup.permission.title'), $_('setup.welcome.title')]
    description = [$_('setup.permission.description'), $_('setup.welcome.description')]
    window.electron.ipcRenderer.send('get-permission-state')
  })

  const grantPermission = () => {
    window.electron.ipcRenderer.send('ask-permission')
  }

  window.electron.ipcRenderer.on('permission-state', (event, state) => {
    if (state === 'granted') {
      screen = 1
    } else {
      screen = 0
    }
  })
</script>

{#if screen >= 0}
  <div id="app">
    <div id="information">
      <h1>{title[screen]}</h1>
      <span>{description[screen]}</span>
    </div>
    <div id="action">
      {#if screen === 0}
        <button id="next" on:click={grantPermission}>
          {$_('setup.permission.button')}
        </button>
      {/if}
    </div>
  </div>
{:else}
  <p>Loading...</p>
{/if}
