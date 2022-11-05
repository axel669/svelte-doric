const onChange = (value) => {
    const initial = value
    return (next) => next !== initial
}

export default onChange
