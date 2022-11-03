const setValues = (node, values) => {
    if (values.area !== undefined) {
        node.style.gridArea = values.area
        return
    }
    node.style.gridColumn = values.col ?? "";
    node.style.gridRow = values.row ?? "";
}

export default (node, values) => {
    setValues(node, values)
    return {
        update: (newValues) => setValues(node, newValues)
    }
}
