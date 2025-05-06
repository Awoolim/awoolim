<script>
  import { waitLocale, _ } from 'svelte-i18n'

  let isLocaleReady = false

  waitLocale().then(() => {
    isLocaleReady = true
  })
</script>

{#if isLocaleReady}
  <h1>{$_('setup.welcome.title')}</h1>
{:else}
  <p>Loading...</p>
{/if}
