# Card
> svelte-doric/core/card

Container component for displaying information that should be contained
separately from the surrounding content.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `class` | _string_ | | Additional CSS classes to apply to the component

## Slots
| Name | Description |
| --- | --- |
| `title` | Title of the card. If not specified or empty, no title will be shown

## Usage
```html
<Card class>
    <svelte:fragment slot="title">
        Card Title
    </svelte:fragment>
    <ActionLayout>
        <div>
            Content
        </div>

        <GridLayout>
            ...actions
        </GridLayout>
    </ActionLayout>
</Card>
```
