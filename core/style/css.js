const cssValue = (name, value, unit = "") =>
    (value !== null)
        ? `--${name}: ${value}${unit}`
        : ""

const vars = source => Object.entries(source)
    .map(
        ([key, value]) => {
            if (value === null || value === undefined) {
                return ""
            }
            const args = Array.isArray(value)
                ? value
                : [value]
            return cssValue(key, ...args)
        }
    )
    .filter(v => v !== "")
    .join(";")

export default {vars}
