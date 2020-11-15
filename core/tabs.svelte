<script context="module">
    export const tabContext = {}
;</script>

<script>
    import {setContext, onMount} from "svelte"
    import {writable} from "svelte/store"

    export let selectedTab = null

    const currentTab = writable(selectedTab)
    setContext(tabContext, currentTab)

    onMount(
        () => currentTab.subscribe(
            next => selectedTab = next
        )
    )
    ;$: currentTab.set(selectedTab)
;</script>

<slot />
