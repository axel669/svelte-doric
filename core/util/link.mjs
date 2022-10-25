const link = (target) => {
    const [url, type = ""] = target.split("|")
    const anchor = document.createElement("a")
    anchor.href = url

    return (event) => {
        // console.log(event)

        if (event.ctrlKey === true) {
            anchor.target = "_blank"
            anchor.click()
            return
        }

        anchor.target = type
        anchor.click()
    }
}

export default link
