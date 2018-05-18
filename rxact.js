import React from 'react'

import {BehaviorSubject} from 'rxjs'
import {pluck} from 'rxjs/operators'

export default class extends React.Component {
  props$ = new BehaviorSubject(this.props)
  
  go() { return of() }

  prop$(name) {
    return this.props$.pipe(pluck(name))
  }

  componentDidMount() {
    this.componentDidUpdate()
    this.subscription = this.go(this.props$)
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

import {from, combineLatest as latest} from 'rxjs'
import {map} from 'rxjs/operators'
export const latestState = object =>
  latest(
    ...Object.entries(object)
      .map(
        ([k, v]) => from(v).pipe(map(v => ({ [k]: v })))
      )
  ).pipe(
    map(states => Object.assign(...states))
  )