# Modal
> svelte-doric

Container component for displaying and grouping elements with some style.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `card` | _boolean_ | | If true, the paper will have a border to appear like a card element
| `center` | _boolean_ | | Center the paper element in the regular html layout
| `flat` | _boolean_ | | If true, removes the box shadow
| `footer` | _boolean_ | | If true, adds padding to the bottom of the paper to allow room for a footer in the same layout area
| `scrollable` | _boolean_ | | If true, adds a max-height css property and allows overflow to scroll the area
| `square` | _boolean_ | | If true, removes the border radius
| `width` | _string_ | | Sets the width of the paper, include css units

## Slots
- title
- action

## Usage
```html
<Paper card flat footer scrollable square>
    Content

    <Button slot="action">
        Do Something
    </Button>
</Paper>

<Paper center width="min(100%, 720px)">
    <TitleBar slot="title">
        Title
    </TitleBar>
    Content
</Paper>
```