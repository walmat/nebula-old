const React = require('react');
const bodymovin = require('bodymovin/build/player/bodymovin.min');

class ReactBodymovin extends React.Component {
    componentDidMount () {
        const options = Object.assign({}, this.props.options);
        options.wrapper = this.wrapper;
        options.renderer = 'svg';
        this.animation = bodymovin.loadAnimation(options);
    }

    componentWillUnmount () {
        this.animation.destroy()
    }

    shouldComponentUpdate () {
        return false
    }

    render () {
        const storeWrapper = (el) => {
            this.wrapper = el
        };

        return <div className='react-bodymovin-container' ref={storeWrapper} />
    }
}

module.exports = ReactBodymovin;