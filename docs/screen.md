Element for displaying screens within an application that allows for consistent
layout and interaction across platforms (web, mobile, cordova, etc).

> `Screen` is inteded to be used as the top level for all screens in an
> application (because the components aren't standalone).

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `full` | _boolean_ | `false` | Has all parts of the screen use the full width of the page. Overrides other full options.
| `fullContent` | _boolean_ | `false` | Set the content area to be the full width of the page.
| `fullFooter` | _boolean_ | `false` | Set the footer to be the full width of the page.
| `fullTitle` | _boolean_ | `false` | Set the title to be the full width of the page.
| `width` | _string_ | `"min(720px, 100%)"` | Sets the width of any section that isn't a full-width section. Include CSS units.

## Functions

These functions are available when using `bind:this` on a screen.

### .openStack(Component, props)
Adds a component using `Screen` over the current `Screen` in a stack-like view.
Stacked components will default to being 8px smaller on the top, left, and right
than the parent `Screen`.

### .close(value)
Removes the current component from the view stack and returns the given value
to the parent `Screen`.

### .closeAll(value)
Removes all components but the top component from the view stack and passes the
given value to the topmost `Screen`

## Slots
- title
- footer

## Usage
```svelte
<script>
    let scr = null

    const viewItem = async (item) => {
        console.log(
            await scr.openStack(ItemScreen, { item })
        )
    }
</script>

<Screen bind:this={scr}>
    <AppBar slot="title">
        Title
    </AppBar>

    <Paper>
    </Paper>

    <Footer slot="footer">
    </Footer>
</Screen>
```
