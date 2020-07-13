<style>
list-item-content {
    grid-area: label;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: stretch;
    grid-area: content;
    padding: 8px;
}
</style>

<list-item-content>
    <slot />
</list-item-content>
