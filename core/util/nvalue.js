export default (value, defValue) => {
    if (value === null || value === undefined) {
        return defValue
    }
    return value
}
