import $ from 'jquery'
import { Plugin } from './core'
import { Logger } from './logging'

const log = Logger.get('hawtio-core-config')

export const DEFAULT_APP_NAME = 'Hawtio Management Console'
export const DEFAULT_LOGIN_TITLE = 'Log in to your account'

/**
 * The single user-customisable entrypoint for the Hawtio console configurations.
 */
export type Hawtconfig = {
  /**
   * Configuration for branding & styles.
   */
  branding?: BrandingConfig

  /**
   * Configuration for the built-in login page.
   */
  login?: LoginConfig

  /**
   * Configuration for the About modal.
   */
  about?: AboutConfig

  /**
   * The user can explicitly disable plugins by specifying the plugin route paths.
   *
   * This option can be used if some of the built-in plugins are not desirable
   * for the custom installation of Hawtio console.
   */
  disabledRoutes?: DisabledRoutes

  /**
   * Configuration for JMX plugin.
   */
  jmx?: JmxConfig

  /**
   * Configuration for Hawtio Online.
   */
  online?: OnlineConfig
}

/**
 * Branding configuration type.
 */
export type BrandingConfig = {
  appName?: string
  showAppName?: boolean
  appLogoUrl?: string
  css?: string
  favicon?: string
}

/**
 * Login configuration type.
 */
export type LoginConfig = {
  title?: string
  description?: string
  links?: LoginLink[]
}

export type LoginLink = {
  url: string
  text: string
}

/**
 * About configuration type.
 */
export type AboutConfig = {
  title?: string
  description?: string
  imgSrc?: string
  productInfo?: AboutProductInfo[]
  copyright?: string
}

export type AboutProductInfo = {
  name: string
  value: string
}

export type DisabledRoutes = string[]

/**
 * JMX configuration type.
 */
export type JmxConfig = {
  /**
   * This option can either disable workspace completely by setting `false`, or
   * specify an array of MBean paths in the form of
   * `<domain>/<prop1>=<value1>,<prop2>=<value2>,...`
   * to fine-tune which MBeans to load into workspace.
   *
   * Note that disabling workspace should also deactivate all the plugins that
   * depend on MBeans provided by workspace.
   *
   * @see https://github.com/hawtio/hawtio-next/issues/421
   */
  workspace?: boolean | string[]
}

/**
 * Hawtio Online configuration type.
 */
export type OnlineConfig = {
  /**
   * Selector for OpenShift projects or Kubernetes namespaces.
   *
   * @see https://github.com/hawtio/hawtio-online/issues/64
   */
  projectSelector?: string
}

export const HAWTCONFIG_JSON = 'hawtconfig.json'

class ConfigManager {
  private config: Promise<Hawtconfig>
  private brandingApplied: Promise<boolean>

  constructor() {
    this.config = this.loadConfig()
    this.brandingApplied = this.applyBranding()
  }

  private async loadConfig(): Promise<Hawtconfig> {
    log.info('Loading', HAWTCONFIG_JSON)

    try {
      const res = await fetch(HAWTCONFIG_JSON)
      if (!res.ok) {
        log.error('Failed to fetch', HAWTCONFIG_JSON, '-', res.status, res.statusText)
        return {}
      }

      const config = await res.json()
      log.debug(HAWTCONFIG_JSON, '=', config)
      log.info('Loaded', HAWTCONFIG_JSON)
      return config
    } catch (err) {
      log.error('Error fetching', HAWTCONFIG_JSON, '-', err)
      return {}
    }
  }

  private async applyBranding(): Promise<boolean> {
    const config = await this.config

    const branding = config.branding
    if (!branding) {
      return false
    }
    let applied = false
    if (branding.appName) {
      log.info('Updating title -', branding.appName)
      document.title = branding.appName
      applied = true
    }
    if (branding.css) {
      this.updateHref('#branding', branding.css)
      applied = true
    }
    if (branding.favicon) {
      this.updateHref('#favicon', branding.favicon)
      applied = true
    }
    return applied
  }

  private updateHref(id: string, path: string): void {
    log.info('Updating href for', id, '-', path)
    const elm = $(id)
    elm.prop('disabled', true)
    elm.attr({ href: path })
    elm.prop('disabled', false)
  }

  getHawtconfig(): Promise<Hawtconfig> {
    return this.config
  }

  isBrandingApplied(): Promise<boolean> {
    return this.brandingApplied
  }

  async isRouteEnabled(path: string): Promise<boolean> {
    const config = await this.config
    return !config.disabledRoutes || !config.disabledRoutes.includes(path)
  }

  async filterEnabledPlugins(plugins: Plugin[]): Promise<Plugin[]> {
    const enabledPlugins: Plugin[] = []
    for (const plugin of plugins) {
      if (await this.isRouteEnabled(plugin.path)) {
        enabledPlugins.push(plugin)
      } else {
        log.debug(`Plugin "${plugin.id}" disabled by hawtconfig.json`)
      }
    }
    return enabledPlugins
  }

  async addProductInfo(name: string, value: string) {
    const config = await this.config
    config.about?.productInfo?.push({ name, value })
  }
}

export const configManager = new ConfigManager()

// Export non-exported definitions for testing
export const __testing__ = {
  ConfigManager,
}
