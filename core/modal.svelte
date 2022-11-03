<script>
    import {createEventDispatcher} from "svelte"
    import {fade} from "svelte/transition"

    import { portal } from "./portal.svelte"

    export let clear
    export let persistent = false

    const dispatch = createEventDispatcher()
    const anim = {
        duration: 250
    }

    const close = (evt) => {
        if (persistent === true) {
            return
        }

        dispatch("close")
    }
</script>

<style>
    modal-wrapper {
        position: fixed;
        top: 0px;
        left: 0px;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.35);
        z-index: 500;
        overflow: hidden;
    }
    modal-wrapper.clear {
        background-color: transparent;
    }
    div {
        overflow: hidden;
    }
</style>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<modal-wrapper use:portal on:click={close} transition:fade={anim} class:clear>
    <div on:click|stopPropagation>
        <slot />
    </div>
</modal-wrapper>
