<script>
import {createEventDispatcher} from "svelte"
import {fade} from "svelte/transition"

import Portal from "./portal.svelte"

export let open = false

const dispatch = createEventDispatcher()

const wat = (evt) => {
    dispatch("close")
}
;</script>

<style>
modal-wrapper {
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.35);
    z-index: +100;
}
</style>

<Portal>
    {#if open}
        <modal-wrapper on:click={wat} transition:fade={{duration: 250}}>
            <div on:click|stopPropagation>
                <slot />
            </div>
        </modal-wrapper>
    {/if}
</Portal>
