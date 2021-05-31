const css = (parts, ...values) => {
    const css = parts
        .reduce(
            (cssParts, part, index) => [
                ...cssParts,
                part,
                values[index] ?? ""
            ],
            []
        )
        .join("")
    return `<style>\n${css}\n</style>`
}
css.default = css

module.exports = css
