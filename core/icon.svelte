<script>
export let name
export let outlined = false
export let size
export let style = ""
;</script>

<style>
icon {
    font-size: var(--icon-font-size);
    margin: 0px 4px;
}
</style>

<icon
    class:material-icons={!outlined}
    class:material-icons-outlined={outlined}
    style="--icon-font-size: {size}; {style}"
>
    {name}
</icon>
