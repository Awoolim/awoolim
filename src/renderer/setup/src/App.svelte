<script>
  import { waitLocale, _ } from 'svelte-i18n'
  import { DotLottie } from '@lottiefiles/dotlottie-web'
  import globeIcon from './assets/globe.svg'
  import loadingAnim from './assets/loading.lottie'
  import { onMount } from 'svelte'

  let title = []
  let description = []
  let screen = -1
  let loadingCanvas

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
      // screen = 1
    } else {
      screen = 0
    }
  })

  onMount(() => {
    const dotLottie = new DotLottie({
      autoplay: true,
      loop: true,
      canvas: loadingCanvas,
      src: loadingAnim
    })
  })
</script>

<div id="app">
  {#if screen >= 0}
    <div id="languageDisplay">
      <img src={globeIcon} alt="Language" />
      <span>{$_('language')}</span>
    </div>
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
  {:else}
    <span id="logo">Awoolim</span>
    <span id="phraze">Your tiny desk buddy</span>
    <canvas bind:this={loadingCanvas} width="45" height="5"></canvas>
  {/if}
</div>

<style>
  @media (prefers-color-scheme: dark) {
    :root {
      --windows-background-from: #28292e;
      --windows-background-to: #212226;
      --text-color: 255, 255, 255;
      --background-color: 0, 0, 0;
      --svg-filter: invert(0);
    }
  }

  @media (prefers-color-scheme: light) {
    :root {
      --windows-background-from: #e9ecf4;
      --windows-background-to: #c3c7d8;
      --text-color: 0, 0, 0;
      --background-color: 255, 255, 255;
      --svg-filter: invert(1);
    }
  }

  #app {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    width: 100vw;
    background: linear-gradient(
      to bottom,
      var(--windows-background-from),
      var(--windows-background-to)
    );
    color: rgb(var(--text-color));
    text-align: center;
    font-size: 14px;
  }

  #logo {
    font-size: 48px;
    color: rgb(var(--text-color));
  }

  #phraze {
    font-size: 16px;
    color: rgba(var(--text-color), 0.5);
    margin-bottom: 3em;
  }

  #languageDisplay {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: fixed;
    top: 20px;
    right: 20px;
    font-size: 0.8em;
    color: rgba(var(--text-color), 0.5);
    border: 1px solid rgba(var(--text-color), 0.5);
    height: 34px;
    padding: 0 10px 0 7px;
    border-radius: 17px;
  }

  #languageDisplay img {
    width: 20px;
    height: 20px;
    margin-right: 5px;
    filter: var(--svg-filter);
  }

  #information > h1 {
    font-size: 2.5em;
    margin: 0 0 14px 0;
    font-weight: 400;
  }

  #information > span {
    font-size: 1em;
    color: rgba(var(--text-color), 0.5);
  }
</style>
