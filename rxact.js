import React from 'react'

import {BehaviorSubject, isObservable} from 'rxjs'
import {pluck} from 'rxjs/operators'

export default class extends React.Component {
  props$ = new BehaviorSubject(this.props)
  
  go() { return of() }

  prop$(name) {
    return this.props$.pipe(pluck(name))
  }

  componentDidMount() {
    this.componentDidUpdate()
    const states = this.go(this.props$)
        , states$ = isObservable(states)
          ? states
          : latestState(states)
    this.subscription = states$
      .subscribe(update => {
        console.log('update:', update)
        this.setState(update)
      }, console.error)
  }

  componentWillUnmount() {
    this.subscription && this.subscription.unsubscribe()
  }

  componentDidUpdate(oldProps, oldState) {
    const {props} = this
    if (props !== oldProps) this.props$.next(props)
  }
}

import {combineLatest as latest, from} from 'rxjs'
import {map, switchMap} from 'rxjs/operators'

const isPromise = x => x && typeof x.then === 'function'

export const asObservable = x =>
  isObservable(x)
    ? x
    :
  isPromise(x)
    ? from(x)
    :
    of(x)

export const latestState = object =>
  Array.isArray(object)
    ? latest(...object)
    :
  latest(
    ...Object.entries(object)
      .map(
        ([k, v]) => asObservable(v).pipe(map(v => ({ [k]: v })))
      )
  ).pipe(
    map(states => Object.assign(...states))
  )

export const rxer = f => (...args) => latest(...args.map(asObservable))
  .pipe(
    switchMap(args => asObservable(f(...args)))
  )
