import React from 'react'
import ReactBodymovin from 'react-bodymovin'
import animation from './nebula.json'

const Logo = () => {
    const bodymovinOptions = {
        loop: true,
        autoplay: true,
        prerender: true,
        animationData: animation
    }

    return (
        <div>
            <ReactBodymovin options={bodymovinOptions} />
        </div>
    )
}

export default Logo