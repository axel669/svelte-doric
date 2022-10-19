# Ripple

Adds a ripple effect to an element.

## Props
This component takes no props.

## Usage
The element that should have the `Ripple` effect must be `position: relative`
or `position: absolute` in CSS.

```svelte
<style>
    container-element {
        position: relative;
    }
</style>

<container-element>
    <Ripple />
</container-element>
```
