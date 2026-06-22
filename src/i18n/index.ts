// Lightweight i18n (Phase 5). Hebrew is the default and only catalog for now.
// `t` is the Hebrew string tree (type-checked, no runtime key lookup). Label
// helpers map internal English values → Hebrew display labels.
//
// To add English later: create `en.ts` with the same shape as `he`, pick the
// active catalog here behind a setting, and keep the `Strings` type as the contract.

import { he, type Strings } from './he'

export const t: Strings = he
export type { Strings }
export * from './labels'
