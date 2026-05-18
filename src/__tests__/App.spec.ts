import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({ isAuthenticated: false })),
}))

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div />' } }],
})

describe('App', () => {
  it('renders without crashing', async () => {
    const App = await import('../App.vue')
    const wrapper = mount(App.default, {
      global: {
        plugins: [router],
        stubs: { RouterView: true },
      },
    })
    expect(wrapper.exists()).toBe(true)
  })
})
