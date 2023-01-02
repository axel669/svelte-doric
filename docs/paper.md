Container component for displaying and grouping elements with some style.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `borderColor` | _string_ | | Overrides the border color of a `Paper` with the `card` prop set to true
| `card` | _boolean_ | | If true, the paper will have a border to appear like a card element
| `flat` | _boolean_ | | If true, removes the box shadow
| `layout` | _Component_ | `Flex` | A layout component that wll determine how content is laid out in the `Paper`
| `square` | _boolean_ | | If true, removes the border radius

> To pass props into the layout component, use the prop name with "l" in front
> (ex: lscrollable, lcols, ldirection, etc.)

## Slots
- title
- action

## Usage
```svelte
<Paper card flat square lscrollable>
    <div>
        Content
    </div>

    <Button slot="action">
        Do Something
    </Button>
</Paper>

<Paper center layout={Grid}>
    <Titlebar slot="title">
        Title
    </Titlebar>

    ...grid items
</Paper>
```
