/* eslint-disable no-unused-vars */

export interface Marker {
  icon: MapIcon
  x: number
  y: number
  title?: string
}

// https://xivapi.com/docs/Icons?set=icons060000
export enum MapIcon {
  Treasure = '060003', // 060354
  Fate = '060093',
  Flag = '060561',
  MarkerA = '061241',
  MarkerB = '061242',
  MarkerC = '061243',
  MarkerD = '061244',
  Marker1 = '061245',
  Marker2 = '061246',
  Marker3 = '061247',
  Marker4 = '061248',
  Attack1 = '060687',
  Attack2 = '060688',
  Attack3 = '060689',
  Attack4 = '060690',
  Attack5 = '060691',
}
