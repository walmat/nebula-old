import bodymovin from 'bodymovin';
import React from 'react';
const isDOM = typeof window === 'object' && typeof window.document === 'object'

class Bodymovin extends React.Component {
  componentDidMount () {
    if (!isDOM) {
      return
    }
    const options = Object.assign({}, this.props.options)
    options.wrapper = this.wrapper
    options.renderer = 'svg'
    this.animation = bodymovin.loadAnimation(options)
  }

  componentWillUnmount () {
    if (!isDOM) {
      return
    }
    this.animation.destroy()
  }

  shouldComponentUpdate () {
    return false
  }

  render () {
    const storeWrapper = (el) => {
      this.wrapper = el
    }

    return (
      <div className='react-bodymovin-container' ref={storeWrapper}>
        { this.props.children }
      </div>
    )
  }
}

export default Bodymovin;