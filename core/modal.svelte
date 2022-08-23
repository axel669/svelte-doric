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
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.35);
        z-index: 500;
    }
    modal-wrapper.clear {
        background-color: transparent;
    }
</style>

<modal-wrapper use:portal on:tap={close} transition:fade={anim} class:clear>
    <div on:tap|stopPropagation>
        <slot />
    </div>
</modal-wrapper>
