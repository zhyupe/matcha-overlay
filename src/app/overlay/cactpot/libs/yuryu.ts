/*!
 * Modified from https://github.com/yuryu/ff14-cactpot/blob/master/js/perfect_cactpot.js
 * Copyright (c) 2015 Yuryu, MIT License
 */

import { GameState, GameOption } from '../interface'
import { candidates, makeEmptyOption, makeEmptyState, payouts } from './constant'

const maxRevealedNums = 4
const EPS = 0.00001

const reverse = function (array: number[], begin: number, end: number) {
  var rev = array.slice(begin, end).reverse()
  for (var i = 0; i < rev.length; i++) {
    array[begin + i] = rev[i]
  }
}

const next_permutation = function (array: number[]) {
  let i = array.length - 1
  while (i > 0) {
    let k = i
    i--
    if (array[i] < array[k]) {
      let j = array.length - 1
      while (array[i] >= array[j]) j--
      let tmp = array[j]
      array[j] = array[i]
      array[i] = tmp
      reverse(array, k, array.length)
      return true
    }
  }
  return false
}

// calculate expectation
const calc_expectation = function (
  state: GameState,
  ids: number[],
  unknowns: number[],
  options: GameOption,
  tot_win = [0, 0, 0, 0, 0, 0, 0, 0],
) {
  let permutations = 0

  // Loop over all possible permutations on the unknowns
  do {
    permutations++
    for (let i = 0; i < ids.length; i++) {
      state[ids[i]] = unknowns[i]
    }
    // For each row, cumulatively sum the winnings for picking that row

    for (let i = 0; i < candidates.length; ++i) {
      const [a, b, c] = candidates[i]
      tot_win[i] += payouts[state[a] + state[b] + state[c]]
    }
  } while (next_permutation(unknowns))
  // Restore state for next use
  for (let i = 0; i < ids.length; i++) state[ids[i]] = 0

  for (let i = 0; i < tot_win.length; i++) tot_win[i] /= permutations

  // Find the maximum. Start by assuming option 0 is best.
  let curmax = tot_win[0]
  options[0] = true
  for (let i = 1; i < 8; i++) {
    // If another row yielded a higher expected value:
    if (tot_win[i] > curmax) {
      // Mark all the previous rows as FALSE (not optimal) and the current one as TRUE
      curmax = tot_win[i]
      for (let j = 0; j < i; j++) options[j] = false
      options[i] = true
    } else if (tot_win[i] === curmax) {
      // For a tie, mark the current one as TRUE, and leave the previous ones intact
      options[i] = true
    }
  }

  // The current totals are for a number of possible configurations.
  // Divide by that number to get the actual expected value.
  if (isNaN(curmax)) throw new Error('Something is wrong.')
  return curmax
}

const inspect_state = function (state: GameState) {
  const numbers = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9])
  const ids = []

  for (let i = 0; i < 9; i++) {
    if (state[i]) {
      numbers.delete(state[i])
    } else {
      ids.push(i)
    }
  }

  const unknowns = Array.from(numbers)
  return [ids, unknowns]
}

const solve_any = function (state: GameState, options: GameOption) {
  const [ids, unknowns] = inspect_state(state)
  const num_hidden = unknowns.length

  if (9 - num_hidden >= maxRevealedNums) {
    // We've revealed as many numbers as we can -- time for the final assessment
    return calc_expectation(state, ids, unknowns, options)
  } else {
    // Determine which tile to reveal next.
    // Loop over every unknown tile and every possible value that could appear.
    // Solve the resulting cases with a recursive call to solve_any.
    let tot_win = new Array(num_hidden)
    let dummy_array = makeEmptyOption()
    for (let i = 0; i < num_hidden; i++) tot_win[i] = 0
    for (let i = 0; i < num_hidden; i++) {
      for (let j = 0; j < num_hidden; j++) {
        state[ids[i]] = unknowns[j]
        tot_win[i] += solve_any(state, dummy_array)
        state[ids[i]] = 0
      }
    }
    let curmax = tot_win[0]
    options[ids[0]] = true
    for (let i = 1; i < tot_win.length; i++) {
      if (tot_win[i] > curmax + EPS) {
        curmax = tot_win[i]
        for (let j = 0; j < i; j++) options[ids[j]] = false
        options[ids[i]] = true
      } else if (tot_win[i] > curmax - EPS) {
        options[ids[i]] = true
      }
    }
    // Each tile can be flipped to reveal one of num_hidden values (one number per space).
    // Divide by num_hidden to get the true expected value.
    return curmax / num_hidden
  }
}

function optionToArray(option: GameOption) {
  const arr: number[] = []
  option.forEach((b, i) => {
    if (b) arr.push(i)
  })

  return arr
}

export function solveAny(input: GameState) {
  const option = makeEmptyOption()
  solve_any(input, option)

  return optionToArray(option)
}

export function calcExpection(input: GameState): [GameState, number[]] {
  const [ids, unknowns] = inspect_state(input)
  const option = makeEmptyOption()
  const expection = makeEmptyState()
  calc_expectation(input, ids, unknowns, option, expection)

  return [expection, optionToArray(option)]
}
