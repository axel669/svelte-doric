<script context="module">
    import Select from "./form/select.svelte"
    import Text from "./form/text.svelte"
    import Toggle from "./form/toggle.svelte"

    const elems = {}

    export const registerFormElement = (type, element, initial) =>
        elems[type] = { element, initial }

    registerFormElement("text", Text, "")
    registerFormElement("select", Select, null)
    registerFormElement("toggle", Toggle, false)
</script>

<script>
    import { writable } from "svelte/store"

    export let items
    export let value

    const formValue = writable(value)

    // $: console.log($formValue)
    $: value = $formValue
</script>

{#each items as item}
    <svelte:component
        this={elems[item.type].element}
        initial={elems[item.type].initial}
        bind:output={$formValue[item.name]}
        props={item.props}
    />
{/each}
