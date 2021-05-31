<script>
    import vars from "./util/vars.js"

    export let name
    export let outlined = false
    export let size
    let klass
    export {klass as class}

    $: iconVars = {
        "icon-font-size": size,
    }
</script>

<style>
    doric-icon {
        margin: 0px 4px;
    }
</style>

<doric-icon
    use:vars={iconVars}
    class:material-icons={!outlined}
    class:material-icons-outlined={outlined}
    class={klass}
>
    {name}
</doric-icon>
