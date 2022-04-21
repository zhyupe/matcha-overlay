import './index.css'

/*!
 * Following icons are taken from https://thewakingsands.github.io/ffxiv-axis-font-icons/
 * Copyright (c) SQUARE ENIX CO., LTD.
 */

export function Glamour() {
  return <i className="icon icon-glamour">&#xe03b;</i>
}

export function HQ() {
  return <i className="icon icon-hq">&#xe03c;</i>
}

export function TargetBind() {
  return <i className="icon icon-target-bind">&#xe044;</i>
}

export function Close() {
  return <i className="icon icon-close">&#xe05f;</i>
}

export function Plus() {
  return <i className="icon icon-plus">&#xe04e;</i>
}

export function Target() {
  return <i className="icon icon-target">&#xe05e;</i>
}

export function ILvl() {
  return <i className="icon icon-ilvl">&#xe033;</i>
}

export const InstanceOffset = 0xe0b0

export function Instance1() {
  return <i className="icon icon-instance-1">&#xe0b1;</i>
}

export function Instance2() {
  return <i className="icon icon-instance-2">&#xe0b2;</i>
}

export function Instance3() {
  return <i className="icon icon-instance-3">&#xe0b3;</i>
}

/*!
 * Following icons are taken from https://heroicons.com/
 * MIT License. Copyright (c) 2020 Refactoring UI Inc.
 */

export function LockClosed() {
  return (
    <svg className="icon icon-lock-closed" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function LockOpen() {
  return (
    <svg className="icon icon-lock-open" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
    </svg>
  )
}

export function SwitchHorizontal() {
  return (
    <svg
      className="icon icon-switch-horizontal"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
    </svg>
  )
}

export function Trash() {
  return (
    <svg className="icon icon-trash" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function Edit() {
  return (
    <svg className="icon icon-edit" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
      <path
        fillRule="evenodd"
        d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function Question() {
  return (
    <svg className="icon icon-question" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  )
}
