<script>
    import {vars} from "./style/css.js"

    export let name
    export let outlined = false
    export let size
    export let style = ""

    ;$: iconVars = {
        "icon-font-size": size,
    }
;</script>

<style>
icon {
    font-size: var(--icon-font-size);
    margin: 0px 4px;
}
</style>

<icon
    use:vars={iconVars}
    class:material-icons={!outlined}
    class:material-icons-outlined={outlined}
    {style}
>
    {name}
</icon>
