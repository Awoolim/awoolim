import { register, init, getLocaleFromNavigator } from 'svelte-i18n'

register('en', () => import('../locale/en.json'))
register('en-US', () => import('../locale/en.json'))
register('ko', () => import('../locale/ko.json'))
register('ko-KR', () => import('../locale/ko.json'))

init({
  fallbackLocale: 'en',
  initialLocale: getLocaleFromNavigator()
})
