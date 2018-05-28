import React from 'react'
import ReactBodymovin from './Reactbodymovin'
import * as data from './nebula.json'

const Logo = () => {
    const bodymovinOptions = {
        loop: true,
        autoplay: true,
        prerender: true,
        animationData: data,
    }

    return (
        <div>
            <ReactBodymovin options={bodymovinOptions} />
        </div>
    )
}

export default Logo