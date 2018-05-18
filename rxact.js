import React from 'react'

import {Subject} from 'rxjs'

export default class extends React.Component {
  props$ = new Subject
  
  componentDidMount() {
    this.componentDidUpdate()
    this.paint.subscribe(paint => this.setState({paint}))
  }

  componentDidUpdate(oldProps, oldState) {
    const {props, state}
    if (props !== oldProps) this.props$.next(props)
  }

  render() {
    return this.state && this.state.paint
  }
}