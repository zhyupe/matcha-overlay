[![GitHub issues](https://img.shields.io/github/issues/zhyupe/matcha-overlay)](https://github.com/zhyupe/matcha-overlay/issues)
[![GitHub license](https://img.shields.io/github/license/zhyupe/matcha-overlay)](https://github.com/zhyupe/matcha-overlay/blob/master/LICENSE)

An overlay for FFXIV providing market recorder, treasure spot and more function.

### Usage

| Provider     | URL                                      |
| ------------ | ---------------------------------------- |
| Github Pages | https://zhyupe.github.io/matcha-overlay/ |
| FFCafe       | https://matcha-overlay.ffcafe.cn/        |

A proper version of **Cafe.Matcha** plugin is required. At this time, the plugin is only
available to Chinese servers and can be acquired in [CafeACT](https://ffcafe.org/act/)

### Development

Use Node.js 24 and pnpm 11.6.0 (pinned in `package.json`).

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm start
```

Run `pnpm build` to create the production build in `dist/`.

### License

AGPL-3.0 © [zhyupe](https://github.com/zhyupe)
