<script>
    export let control
;</script>

<style>
list-item-content {
    grid-area: content;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: stretch;
    grid-area: content;
    padding: 8px;
}
list-item-content.control {
    padding: 0px;
}
</style>

<list-item-content class:control>
    <slot />
</list-item-content>
